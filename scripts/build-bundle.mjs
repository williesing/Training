import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const bundle = resolve(root, "bundle");
const push = process.argv.includes("--push");

function git(args, cwd = root) {
  execFileSync("git", args, { cwd, stdio: "inherit" });
}

function run(command, args, cwd) {
  execFileSync(command, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
}

git(["submodule", "update", "--init", "--remote", "backend", "frontend", "cli"]);
run("npm", ["install"], resolve(root, "frontend"));
run("npx", ["ng", "build"], resolve(root, "frontend"));

const frontendIndex = resolve(root, "frontend", "dist", "snip-frontend", "browser", "index.html");
if (!existsSync(frontendIndex)) {
  throw new Error(`Frontend build output is missing: ${frontendIndex}`);
}

for (const entry of readdirSync(bundle)) {
  if (entry !== ".git") rmSync(resolve(bundle, entry), { recursive: true, force: true });
}
mkdirSync(resolve(bundle, "public"), { recursive: true });
cpSync(resolve(root, "backend", "server.js"), resolve(bundle, "server.js"));
cpSync(resolve(root, "cli", "cli.js"), resolve(bundle, "cli.js"));
cpSync(resolve(root, "frontend", "dist", "snip-frontend", "browser"), resolve(bundle, "public"), { recursive: true });
writeFileSync(resolve(bundle, ".env"), "PUBLIC_DIR=./public\n");
writeFileSync(resolve(bundle, "package.json"), JSON.stringify({
  name: "snip-bundle",
  private: true,
  scripts: { start: "bun server.js" },
}, null, 2) + "\n");
writeFileSync(resolve(bundle, "Dockerfile"), [
  "FROM oven/bun:1-alpine",
  "COPY . .",
  "ENV PORT=3000",
  "EXPOSE 3000",
  "CMD bun server.js",
  "",
].join("\n"));
writeFileSync(resolve(bundle, ".dockerignore"), "node_modules\n.git\n");
writeFileSync(resolve(bundle, "railway.json"), JSON.stringify({
  "$schema": "https://railway.app/railway.schema.json",
  build: { builder: "DOCKERFILE" },
}, null, 2) + "\n");

git(["add", "-A"], bundle);
let bundleChanged = true;
try {
  git(["diff", "--cached", "--quiet"], bundle);
  bundleChanged = false;
} catch {
  bundleChanged = true;
}
if (bundleChanged) {
  git(["commit", "-m", "Build generated bundle"], bundle);
  if (push) git(["push", "origin", "HEAD:bundle"], bundle);
} else {
  console.log("bundle: unchanged");
}

git(["add", "bundle"]);
let superprojectChanged = true;
try {
  git(["diff", "--cached", "--quiet"]);
  superprojectChanged = false;
} catch {
  superprojectChanged = true;
}
if (superprojectChanged) {
  git(["commit", "-m", "Bump bundle submodule"]);
  if (push) git(["push", "origin", "main"]);
} else {
  console.log("main: unchanged");
}
