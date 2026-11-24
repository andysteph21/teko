import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

// Conserver les noms d’origine : le worker importe le module partagé par un chemin relatif.
const files = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return files.map((file) => ({ file }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!files.includes(file)) return new Response(null, { status: 404 });

  const resolve = createRequire(join(process.cwd(), "package.json")).resolve;
  const script = await readFile(resolve(`maplibre-gl/dist/${file}`), "utf8");
  return new Response(script, {
    headers: { "content-type": "text/javascript; charset=utf-8" },
  });
}
