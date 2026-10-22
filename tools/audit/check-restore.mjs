// Exercice de restauration SQL + fichiers, borné au seul conteneur du banc.
// Les ordonnanceurs ne sont pas activés dans la copie restaurée.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const container = "supabase_db_teko-alpha-audit";
const storage = "supabase_storage_teko-alpha-audit";
const database = "teko_alpha_restore_check";
const directory = "/tmp/teko-alpha-restore";
mkdirSync(directory, { recursive: true });
chmodSync(directory, 0o700);
const docker = (args, input) =>
  execFileSync("docker", args, {
    input,
    stdio: ["pipe", "pipe", "pipe"],
    maxBuffer: 128 * 1024 * 1024,
  });
const sql = (db, statement) =>
  docker(
    [
      "exec",
      "-i",
      container,
      "psql",
      "-X",
      "-U",
      "supabase_admin",
      "-d",
      db,
      "-At",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    statement,
  )
    .toString()
    .trim();
const manifest = `select n.nspname||'.'||c.relname||':'||(xpath('/row/n/text()',query_to_xml(format('select count(*) n from %I.%I',n.nspname,c.relname),false,true,'')))[1]::text
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','private','auth','storage') and c.relkind='r' order by 1;`;
function files(root, prefix = "") {
  return readdirSync(join(root, prefix), { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(prefix, entry.name);
      return entry.isDirectory()
        ? files(root, path)
        : [
            {
              path,
              hash: createHash("sha256")
                .update(readFileSync(join(root, path)))
                .digest("hex"),
            },
          ];
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}
let created = false;
try {
  // Arrêter les suites de test avant cet exercice pour un instantané cohérent.
  const before = sql("postgres", manifest);
  const archive = docker([
    "exec",
    container,
    "pg_dump",
    "-U",
    "supabase_admin",
    "-d",
    "postgres",
    "-Fc",
    "--exclude-extension=pg_cron",
    "--exclude-schema=cron",
    "--no-publications",
    "--no-subscriptions",
  ]);
  writeFileSync(join(directory, "database.dump"), archive, { mode: 0o600 });
  const jobs = sql(
    "postgres",
    "select coalesce(jsonb_agg(jsonb_build_object('name',jobname,'schedule',schedule,'command',command,'active',active)),'[]') from cron.job",
  );
  writeFileSync(join(directory, "schedules.json"), jobs, { mode: 0o600 });
  const assets = docker(["exec", storage, "tar", "-C", "/mnt", "-cf", "-", "."]);
  writeFileSync(join(directory, "storage.tar"), assets, { mode: 0o600 });
  sql("postgres", `create database ${database} template template0;`);
  created = true;
  docker(
    [
      "exec",
      "-i",
      container,
      "pg_restore",
      "-U",
      "supabase_admin",
      "-d",
      database,
      "--exit-on-error",
    ],
    archive,
  );
  if (sql(database, manifest) !== before)
    throw new Error("Les comptages restaurés diffèrent de l'instantané SQL");
  const tables = sql(
    database,
    "select count(*) from pg_tables where schemaname in ('public','private') and rowsecurity",
  );
  const revoked = sql(
    database,
    "select has_function_privilege('authenticated','public._driver_transition(uuid,public.ride_status[],public.ride_status,text)','EXECUTE')",
  );
  if (revoked !== "f") throw new Error("La restauration a perdu une ACL de sécurité");
  const protectedFunctions = [
    "public.prepare_manual_receipt(uuid,text,numeric,text,text,text,uuid)",
    "public.revise_manual_receipt(uuid,numeric,text,text)",
    "public.approve_manual_receipt(uuid)",
    "public.commission_amount(numeric)",
    "private.round_cash_amount(numeric)",
    "public.cancellation_driver_share(numeric,jsonb)",
    "public.cancel_ride(uuid,text,public.ride_status)",
    "public._driver_transition(uuid,public.ride_status[],public.ride_status,text)",
  ];
  for (const signature of protectedFunctions) {
    const fingerprint = `select md5(pg_get_functiondef(oid)||coalesce(proacl::text,''))
      from pg_proc where oid='${signature}'::regprocedure`;
    if (sql(database, fingerprint) !== sql("postgres", fingerprint))
      throw new Error(`Corps ou ACL non préservé après restauration : ${signature}`);
  }
  for (const folder of ["storage-source", "storage-restored"]) {
    rmSync(join(directory, folder), { recursive: true, force: true });
    mkdirSync(join(directory, folder));
  }
  execFileSync("tar", [
    "-xf",
    join(directory, "storage.tar"),
    "-C",
    join(directory, "storage-restored"),
  ]);
  docker(["cp", `${storage}:/mnt/.`, join(directory, "storage-source")]);
  const restored = files(join(directory, "storage-restored"));
  if (
    !restored.length ||
    JSON.stringify(restored) !== JSON.stringify(files(join(directory, "storage-source")))
  ) {
    throw new Error("Les fichiers restaurés diffèrent du Storage source");
  }
  const result = {
    database: "restauration réussie dans une base distincte",
    rowSecurityTables: Number(tables),
    storageFiles: restored.length,
    storageHashesMatch: true,
    aclPreserved: true,
    protectedFunctionsVerified: protectedFunctions.length,
    schedulerJobsCaptured: JSON.parse(jobs).length,
    limits:
      "Ordonnanceurs capturés mais non démarrés ; redéploiement des services et restauration HTTP sur un nouvel hôte restent à éprouver.",
  };
  writeFileSync(join(directory, "result.json"), JSON.stringify(result, null, 2), { mode: 0o600 });
  console.info(JSON.stringify(result));
} finally {
  if (created) sql("postgres", `drop database ${database} with (force);`);
}
