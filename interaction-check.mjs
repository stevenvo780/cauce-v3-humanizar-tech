import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const profile = await mkdtemp(join(tmpdir(), "cauce-chrome-"));
const chrome = spawn("google-chrome", [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=0",
  `--user-data-dir=${profile}`, "about:blank"
], { stdio: ["ignore", "ignore", "pipe"] });

const browserWsUrl = await new Promise((resolveWs, reject) => {
  const timeout = setTimeout(() => reject(new Error("Chrome DevTools endpoint timeout")), 10_000);
  chrome.stderr.setEncoding("utf8");
  chrome.stderr.on("data", (chunk) => {
    const match = chunk.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (match) { clearTimeout(timeout); resolveWs(match[1]); }
  });
  chrome.once("exit", (code) => reject(new Error(`Chrome exited early with ${code}`)));
});

const socket = new WebSocket(browserWsUrl);
await new Promise((resolveOpen, reject) => {
  socket.addEventListener("open", resolveOpen, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 1;
const pending = new Map();
const pageErrors = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const callback = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) callback.reject(new Error(message.error.message));
    else callback.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") pageErrors.push(message.params.exceptionDetails.text);
});
function send(method, params = {}, sessionId) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  return new Promise((resolveSend, reject) => pending.set(id, { resolve: resolveSend, reject }));
}

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Runtime.enable", {}, sessionId);
await send("Page.enable", {}, sessionId);
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, sessionId);
await send("Page.navigate", { url: pathToFileURL(resolve(dirname(fileURLToPath(import.meta.url)), "index.html")).href }, sessionId);
await new Promise((resolveWait) => setTimeout(resolveWait, 500));

const { result } = await send("Runtime.evaluate", {
  returnByValue: true,
  awaitPromise: true,
  expression: `(async () => {
    const theme = document.querySelector('#themeBtn');
    theme.click();
    const themeChanged = document.documentElement.dataset.theme === 'light';
    document.querySelectorAll('.dot')[12].click();
    await new Promise((resolve) => setTimeout(resolve, 3000));
    document.querySelector('#copy-brief').click();
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      title: document.title,
      slides: document.querySelectorAll('.slide').length,
      dots: document.querySelectorAll('.dot').length,
      themeChanged,
      copyStatus: document.querySelector('#copy-status').textContent.trim(),
      contactLinks: document.querySelectorAll('#contacto a.action-link').length,
      architectureHasPull: document.querySelector('#arquitectura').textContent.includes('WebSocket') && /reclama.*(WebSocket|por WebSocket|solo|s\u00f3lo)/i.test(document.querySelector('#arquitectura').textContent),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      activeSlide: document.querySelector('#contacto').getBoundingClientRect().top,
      contactVisible: (() => { const r = document.querySelector('#contacto').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; })()
    };
  })()`
}, sessionId);

const check = result.value;
assert.match(check.title, /Cauce V3/);
assert.equal(check.slides, 13);
assert.equal(check.dots, 13);
assert.equal(check.themeChanged, true);
assert.match(check.copyStatus, /[Bb]rief (copiado|quedó seleccionado)/);
assert.ok(check.contactLinks >= 3, `expected at least 3 contact links, got ${check.contactLinks}`);
assert.equal(check.architectureHasPull, true);
assert.equal(check.horizontalOverflow, false);
assert.ok(check.contactVisible, `contact slide did not navigate into view: top=${check.activeSlide}`);
assert.deepEqual(pageErrors, []);

console.log(JSON.stringify({ status: "pass", ...check, pageErrors }, null, 2));
socket.close();
const chromeExited = chrome.exitCode === null ? new Promise((resolveExit) => chrome.once("exit", resolveExit)) : Promise.resolve();
chrome.kill("SIGTERM");
await chromeExited;
await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
