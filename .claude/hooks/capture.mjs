#!/usr/bin/env node
// 8x agent capture hook for Claude Code.
// Wired to UserPromptSubmit (logs the prompt verbatim) and Stop (logs the final
// assistant text for that turn, read from the session transcript).
// Writes one file per session to <repo>/.agent-logs/YYYY-MM-DD_HH-MM-SS_<session-id>.md
// Never blocks Claude: every failure is swallowed and the script exits 0.

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const TOOL = "claude-code";

function readStdin() {
  try { return fs.readFileSync(0, "utf8"); } catch { return ""; }
}

function author(cwd) {
  if (process.env.CAPTURE_AUTHOR) return process.env.CAPTURE_AUTHOR;
  try {
    return execSync("git config user.name", { cwd, stdio: ["ignore", "pipe", "ignore"] })
      .toString().trim() || "unknown";
  } catch { return "unknown"; }
}

function repoRoot(cwd) {
  if (process.env.CLAUDE_PROJECT_DIR) return process.env.CLAUDE_PROJECT_DIR;
  try {
    return execSync("git rev-parse --show-toplevel", { cwd, stdio: ["ignore", "pipe", "ignore"] })
      .toString().trim();
  } catch { return cwd; }
}

// Read the transcript JSONL, tolerating a partially written last line.
function readTranscript(p) {
  if (!p) return [];
  const resolved = p.startsWith("~") ? path.join(process.env.HOME || process.env.USERPROFILE || "", p.slice(1)) : p;
  let raw = "";
  try { raw = fs.readFileSync(resolved, "utf8"); } catch { return []; }
  const out = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* skip partial line */ }
  }
  return out;
}

function lastModel(entries) {
  for (let i = entries.length - 1; i >= 0; i--) {
    const m = entries[i]?.message?.model;
    if (entries[i]?.type === "assistant" && m && m !== "<synthetic>") return m;
  }
  return null;
}

// A "real" user turn is a user entry whose content is text, not a tool_result.
function isRealUserTurn(e) {
  if (e?.type !== "user" || e.isMeta) return false;
  const c = e.message?.content;
  if (typeof c === "string") return true;
  if (Array.isArray(c)) return c.some((b) => b?.type === "text") && !c.some((b) => b?.type === "tool_result");
  return false;
}

// Final response = text blocks of assistant entries after the last tool_result
// (or after the prompt if no tools ran). Intermediate narration is excluded.
function finalResponse(entries) {
  let start = -1;
  for (let i = entries.length - 1; i >= 0; i--) {
    if (isRealUserTurn(entries[i])) { start = i; break; }
  }
  if (start === -1) return null;
  let tail = entries.slice(start + 1);
  let lastTool = -1;
  tail.forEach((e, i) => {
    const c = e?.message?.content;
    if (e?.type === "user" && Array.isArray(c) && c.some((b) => b?.type === "tool_result")) lastTool = i;
  });
  tail = tail.slice(lastTool + 1);
  const texts = [];
  let model = null;
  for (const e of tail) {
    if (e?.type !== "assistant") continue;
    const c = e.message?.content;
    if (e.message?.model && e.message.model !== "<synthetic>") model = e.message.model;
    if (typeof c === "string") texts.push(c);
    else if (Array.isArray(c)) for (const b of c) if (b?.type === "text" && b.text) texts.push(b.text);
  }
  if (!texts.length) return null;
  return { text: texts.join("\n\n"), model };
}

function stamp(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}_${p(d.getUTCHours())}-${p(d.getUTCMinutes())}-${p(d.getUTCSeconds())}`;
}

function findLog(dir, sessionId) {
  try {
    const f = fs.readdirSync(dir).find((n) => n.endsWith(`_${sessionId}.md`));
    return f ? path.join(dir, f) : null;
  } catch { return null; }
}

function countEntries(body, type) {
  return (body.match(new RegExp(`^\\[LOG_ENTRY type=${type} `, "gm")) || []).length;
}

function rewriteHeader(file, meta) {
  const raw = fs.readFileSync(file, "utf8");
  // Front matter is "---\n...\n---\n"; the first "\n---\n" closes it
  // (search from 0 so an empty front matter "---\n---\n" also resolves).
  const idx = raw.startsWith("---\n") ? raw.indexOf("\n---\n", 0) : -1;
  const body = idx === -1 ? raw : raw.slice(idx + 5);
  const promptTimes = [...body.matchAll(/^\[LOG_ENTRY type=PROMPT [^\]]*\]\ntimestamp: (\S+)/gm)].map((m) => m[1]);
  const header = [
    "---",
    `session_id: ${meta.sessionId}`,
    `date: ${meta.date}`,
    `author: ${meta.author}`,
    `model: ${meta.model}`,
    `tool: ${TOOL}`,
    `project: ${meta.project}`,
    `total_exchanges: ${countEntries(body, "PROMPT")}`,
    `first_prompt_time: ${promptTimes[0] || ""}`,
    `last_prompt_time: ${promptTimes[promptTimes.length - 1] || ""}`,
    "---",
    "",
  ].join("\n");
  fs.writeFileSync(file, header + body);
}

// Model-name memory. The first prompt of a session has no transcript yet, so the
// prompt hook can't read the model from it. We remember the model from SessionStart
// (if Claude Code provides it) and from every Stop, per session and globally.
import os from "node:os";
const STATE = path.join(os.tmpdir(), "8x-capture-state.json");
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE, "utf8")); } catch { return { sessions: {}, last: null }; }
}
function saveModel(sessionId, model) {
  if (!model || model === "unknown") return;
  const s = loadState();
  s.sessions = s.sessions || {};
  s.sessions[sessionId] = model;
  s.last = model;
  try { fs.writeFileSync(STATE, JSON.stringify(s)); } catch {}
}
function configuredModel() {
  if (process.env.ANTHROPIC_MODEL) return process.env.ANTHROPIC_MODEL;
  const home = process.env.HOME || process.env.USERPROFILE || "";
  try { return JSON.parse(fs.readFileSync(path.join(home, ".claude", "settings.json"), "utf8")).model || null; } catch { return null; }
}

async function main() {
  const input = JSON.parse(readStdin() || "{}");
  const event = input.hook_event_name;
  if (event === "SessionStart") {
    const m = typeof input.model === "string" ? input.model : input.model?.id;
    saveModel(input.session_id || "unknown-session", m);
    return;
  }
  if (event !== "UserPromptSubmit" && event !== "Stop") return;
  if (event === "Stop" && input.stop_hook_active) return;

  const cwd = input.cwd || process.cwd();
  const root = repoRoot(cwd);
  const dir = path.join(root, ".agent-logs");
  fs.mkdirSync(dir, { recursive: true });

  const sessionId = input.session_id || "unknown-session";
  const short = sessionId.slice(0, 8);
  const now = new Date();
  const ts = now.toISOString();
  const project = process.env.CAPTURE_PROJECT || path.basename(root);
  const who = author(root);

  let entries = readTranscript(input.transcript_path);
  const state = loadState();
  let model = lastModel(entries) || state.sessions?.[sessionId] || configuredModel() || state.last || "unknown";

  let file = findLog(dir, sessionId);
  if (!file) {
    file = path.join(dir, `${stamp(now)}_${sessionId}.md`);
    const date = ts.slice(0, 10);
    fs.writeFileSync(file,
      `---\n---\n\n# Session Log - ${date}\n\n` +
      `Session: \`${short}\` | Project: \`${project}\` | Author: \`${who}\`\n\n---\n\n`);
  }
  const date = path.basename(file).slice(0, 10);

  if (event === "UserPromptSubmit") {
    const n = countEntries(fs.readFileSync(file, "utf8"), "PROMPT") + 1;
    fs.appendFileSync(file,
      `[LOG_ENTRY type=PROMPT num=${n} session=${short}]\ntimestamp: ${ts}\nmodel: ${model}\n\n${input.prompt ?? ""}\n\n\n`);
  } else {
    // The transcript can lag the Stop event by a moment; retry briefly.
    let resp = finalResponse(entries);
    for (let i = 0; i < 10 && !resp; i++) {
      await new Promise((r) => setTimeout(r, 300));
      entries = readTranscript(input.transcript_path);
      resp = finalResponse(entries);
    }
    if (typeof input.last_assistant_message === "string" && input.last_assistant_message.trim()) {
      resp = { text: input.last_assistant_message, model: resp?.model || model };
    }
    if (resp?.model) model = resp.model;
    saveModel(sessionId, model);
    const n = countEntries(fs.readFileSync(file, "utf8"), "PROMPT");
    fs.appendFileSync(file,
      `[LOG_ENTRY type=RESPONSE num=${n} session=${short}]\ntimestamp: ${ts}\nmodel: ${model}\n\n` +
      `${resp ? resp.text : "(no final text response found in transcript for this turn)"}\n\n\n`);
  }

  rewriteHeader(file, { sessionId, date, author: who, model, project });
}

main().catch((e) => {
  try { process.stderr.write(`capture hook error: ${e?.message || e}\n`); } catch {}
}).finally(() => process.exit(0));
