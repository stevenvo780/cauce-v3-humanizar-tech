import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const profile = await mkdtemp(join(tmpdir(), "cauce-chrome-"));
const chrome = spawn("google-chrome", [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--remote-debugging-port=0",
  `--user-data-dir=${profile}`,
  "about:blank"
], { stdio: ["ignore", "ignore", "pipe"] });

const browserWsUrl = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("Chrome DevTools endpoint timeout")), 10_000);
  chrome.stderr.setEncoding("utf8");
  chrome.stderr.on("data", (chunk) => {
    const match = chunk.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (match) {
      clearTimeout(timeout);
      resolve(match[1]);
    }
  });
  chrome.once("exit", (code) => reject(new Error(`Chrome exited early with ${code}`)));
});

const socket = new WebSocket(browserWsUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 1;
const pending = new Map();
const pageErrors = [];

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") {
    pageErrors.push(message.params.exceptionDetails.text);
  }
});

function send(method, params = {}, sessionId) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Runtime.enable", {}, sessionId);
await send("Page.enable", {}, sessionId);
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true
}, sessionId);

await send("Page.navigate", {
  url: "file:///workspace/_artifacts/cauce-v3-landing-20260805/index.html"
}, sessionId);
await new Promise((resolve) => setTimeout(resolve, 700));

const { result } = await send("Runtime.evaluate", {
  returnByValue: true,
  awaitPromise: true,
  expression: `(async () => {
    const menu = document.querySelector("#menu-button");
    const nav = document.querySelector("#nav-links");
    menu.click();
    const menuOpened = menu.getAttribute("aria-expanded") === "true" && nav.classList.contains("is-open");
    document.querySelector('#nav-links a[href="#arquitectura"]').click();
    const menuClosed = menu.getAttribute("aria-expanded") === "false" && !nav.classList.contains("is-open");
    const firstDetails = document.querySelector("details");
    firstDetails.querySelector("summary").click();
    document.querySelector("#copy-brief").click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    const flowPath = document.querySelector(".workflow-lines path");
    return {
      title: document.querySelector("h1")?.textContent.trim(),
      menuOpened,
      menuClosed,
      faqOpened: firstDetails.open,
      copyStatus: document.querySelector("#copy-status")?.textContent.trim(),
      sections: document.querySelectorAll("main section").length,
      animatedAgents: document.querySelectorAll(".work-agent").length,
      flowAnimation: getComputedStyle(flowPath).animationName
    };
  })()`
}, sessionId);

const check = result.value;
assert.match(check.title, /Empresas de desarrollo/);
assert.equal(check.menuOpened, true);
assert.equal(check.menuClosed, true);
assert.equal(check.faqOpened, true);
assert.ok(check.copyStatus.length > 0);
assert.equal(check.sections, 14);
assert.equal(check.animatedAgents, 5);
assert.equal(check.flowAnimation, "data-flow");
assert.deepEqual(pageErrors, []);

console.log(JSON.stringify({ status: "pass", ...check, pageErrors }, null, 2));

socket.close();
const chromeExited = chrome.exitCode === null
  ? new Promise((resolve) => chrome.once("exit", resolve))
  : Promise.resolve();
chrome.kill("SIGTERM");
await chromeExited;
await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
