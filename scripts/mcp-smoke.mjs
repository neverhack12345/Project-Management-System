import { spawn } from "node:child_process";
import path from "node:path";

const serverPath = path.join(process.cwd(), "src", "mcp-server.js");
const child = spawn("node", [serverPath], { cwd: process.cwd(), stdio: ["pipe", "pipe", "pipe"] });

function send(msg) {
  child.stdin.write(`${JSON.stringify(msg)}\n`);
}

let sawTools = false;
let sawResources = false;
let buffered = "";

child.stdout.on("data", (chunk) => {
  buffered += chunk.toString();
  const lines = buffered.split("\n");
  buffered = lines.pop() || "";
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.result?.tools) sawTools = true;
      if (msg.result?.resources) sawResources = true;
      if (sawTools && sawResources) {
        console.log("MCP smoke test passed.");
        child.kill();
      }
    } catch {}
  }
});

child.stderr.on("data", (chunk) => {
  const text = chunk.toString();
  if (text.trim()) console.error(text.trim());
});

send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "smoke", version: "0.1.0" } } });
send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
send({ jsonrpc: "2.0", id: 3, method: "resources/list", params: {} });

setTimeout(() => {
  if (!sawTools || !sawResources) {
    console.error("MCP smoke test failed.");
    child.kill();
    process.exit(1);
  }
}, 4000);
