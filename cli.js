#!/usr/bin/env node
const { execFile } = require("node:child_process");

const API_BASE = (process.env.SNIP_API || "http://localhost:3000").replace(/\/+$/, "");

function usage() {
  console.log(`Usage:
  snip add <url>    Create a short link
  snip ls           List all links
  snip open <code>  Open a short link in your browser`);
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}

async function request(path, options) {
  try {
    return await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new Error(`Unable to reach backend at ${API_BASE}.`);
  }
}

function openBrowser(target) {
  const command = process.platform === "win32" ? "start"
    : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["", target] : [target];
  execFile(command, args, (error) => {
    if (error) console.error(`Could not open browser: ${error.message}`);
  });
}

async function add(url) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
  } catch {
    throw new Error("URL must use http:// or https://.");
  }

  const response = await request("/api/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Backend returned ${response.status}.`);
  console.log(data.shortUrl);
}

async function list() {
  const response = await request("/api/links");
  const data = await response.json().catch(() => []);
  if (!response.ok) throw new Error(data.error || `Backend returned ${response.status}.`);
  if (!data.length) {
    console.log("No links yet.");
    return;
  }

  const codeWidth = Math.max(4, ...data.map((link) => link.code.length));
  const hitsWidth = Math.max(4, ...data.map((link) => String(link.hits).length));
  console.log(`${"CODE".padEnd(codeWidth)}  ${"HITS".padStart(hitsWidth)}  URL`);
  for (const link of data) {
    console.log(`${link.code.padEnd(codeWidth)}  ${String(link.hits).padStart(hitsWidth)}  ${link.url}`);
  }
}

async function open(code) {
  if (!code || code.includes("/")) throw new Error("Code is required.");
  const response = await request(`/${encodeURIComponent(code)}`, { redirect: "manual" });
  if (response.status !== 302) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Backend returned ${response.status}.`);
  }
  const target = response.headers.get("location");
  if (!target) throw new Error("Backend returned no redirect target.");
  console.log(`Opening ${target}`);
  openBrowser(target);
}

async function main() {
  const [command, argument] = process.argv.slice(2);
  if (!command || command === "help" || command === "--help" || command === "-h") {
    usage();
    return;
  }
  if (command === "add" && argument) return add(argument);
  if (command === "ls" && !argument) return list();
  if (command === "open" && argument) return open(argument);
  usage();
  process.exitCode = 1;
}

main().catch((error) => fail(error.message));
