// Enregistreur de la console admin pour la vidéo de démo (puppeteer-core).
// Deux modes :
//   node admin-recorder.mjs login <profileDir>
//     → connecte 07000003 (OTP test) et persiste la session dans le profil.
//   node admin-recorder.mjs record <profileDir> <out.webm> <cmdFile> [startPath]
//     → ouvre la console, filme, et exécute les commandes déposées dans
//       <cmdFile> (une par ligne) : goto <chemin> · reload · click <testid>
//       · sleep <ms> · stop. Écrit "<epoch.ms> STARTED" dans <cmdFile>.started
//       dès que la capture tourne (sert d'horodatage recStart au montage).

import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const CHROME = "/usr/bin/google-chrome";
const BASE = "http://localhost:3000";

const [, , mode, profileDir, ...rest] = process.argv;
const log = (m) => console.log(`[admin] ${new Date().toISOString().slice(11, 19)} ${m}`);

async function launch() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    userDataDir: profileDir,
    args: ["--window-size=1296,800", "--no-first-run", "--disable-infobars", "--hide-scrollbars"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  page.on("dialog", (d) => d.accept());
  return { browser, page };
}

async function login() {
  const { browser, page } = await launch();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  if (page.url().includes("/login")) {
    await page.waitForSelector('[data-testid="login-phone"]');
    await page.click('[data-testid="login-phone"]', { clickCount: 3 });
    await page.type('[data-testid="login-phone"]', "07000003");
    await page.click('[data-testid="login-submit"]');
    await page.waitForSelector('[data-testid="login-otp"]');
    await page.type('[data-testid="login-otp"]', "123456");
    await page.click('[data-testid="login-submit"]');
    await page.waitForFunction(() => !window.location.pathname.includes("/login"), {
      timeout: 20000,
    });
  }
  log(`session prête (${page.url()})`);
  await browser.close();
}

async function record() {
  const [out, cmdFile, startPath = "/dashboard"] = rest;
  writeFileSync(cmdFile, "");
  const { browser, page } = await launch();
  await page.goto(`${BASE}${startPath}`, { waitUntil: "networkidle2" });
  const recorder = await page.screencast({ path: out });
  const startedAt = Date.now() / 1000;
  writeFileSync(`${cmdFile}.started`, `${startedAt} STARTED\n`);
  log(`capture démarrée → ${out}`);

  let consumed = 0;
  for (;;) {
    await new Promise((r) => setTimeout(r, 300));
    if (!existsSync(cmdFile)) continue;
    const lines = readFileSync(cmdFile, "utf8").split("\n").filter(Boolean);
    let stop = false;
    for (const line of lines.slice(consumed)) {
      consumed++;
      const [verb, ...args] = line.trim().split(/\s+/);
      const stamp = (Date.now() / 1000).toFixed(2);
      appendFileSync(`${cmdFile}.log`, `${stamp} ${line}\n`);
      log(`cmd: ${line}`);
      try {
        if (verb === "goto") await page.goto(`${BASE}${args[0]}`, { waitUntil: "networkidle2" });
        else if (verb === "reload") await page.reload({ waitUntil: "networkidle2" });
        else if (verb === "click") await page.click(`[data-testid="${args[0]}"]`);
        else if (verb === "sleep") await new Promise((r) => setTimeout(r, Number(args[0])));
        else if (verb === "stop") stop = true;
      } catch (e) {
        log(`cmd KO (${line}) : ${e.message}`);
      }
    }
    if (stop) break;
  }
  await recorder.stop();
  await browser.close();
  log("capture terminée");
}

if (mode === "login") await login();
else if (mode === "record") await record();
else {
  console.error("usage: admin-recorder.mjs login <profil> | record <profil> <out.webm> <cmd> [path]");
  process.exit(1);
}
