const { spawn } = require("child_process");
const path = require("path");

const serverPath = path.join(__dirname, "server.js");
const appUrl = "http://localhost:4173";

const openCommand =
  process.platform === "darwin"
    ? "open"
    : process.platform === "win32"
      ? "start"
      : "xdg-open";

const server = spawn(process.execPath, [serverPath], {
  cwd: __dirname,
  stdio: ["inherit", "pipe", "pipe"],
});

let browserOpened = false;

function openBrowser() {
  if (browserOpened) {
    return;
  }

  browserOpened = true;

  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", appUrl], { stdio: "ignore", detached: true });
    return;
  }

  spawn(openCommand, [appUrl], { stdio: "ignore", detached: true });
}

server.stdout.on("data", (chunk) => {
  const text = chunk.toString();
  process.stdout.write(text);

  if (text.includes("OWNER running at")) {
    openBrowser();
  }
});

server.stderr.on("data", (chunk) => {
  process.stderr.write(chunk.toString());
});

function shutdown(signal) {
  if (!server.killed) {
    server.kill(signal);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

server.on("exit", (code) => {
  process.exit(code ?? 0);
});
