import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import {
  SessionManager,
  type SessionMessageEntry,
} from "@earendil-works/pi-coding-agent";
import { formatTranscript } from "./transcript.ts";

type AssistantMessage = Extract<
  SessionMessageEntry["message"],
  { role: "assistant" }
>;

function assistant(content: AssistantMessage["content"]): AssistantMessage {
  return {
    role: "assistant",
    content,
    api: "anthropic-messages",
    provider: "anthropic",
    model: "test-model",
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
    stopReason: "stop",
    timestamp: 0,
  };
}

test("copies a full tool exchange in branch order with arguments and metadata", () => {
  const session = SessionManager.inMemory();
  session.appendMessage({ role: "user", content: "Run tests.", timestamp: 0 });
  const args = {
    command: "bun test\nprintf 'héllo'",
    timeout: 30,
    nested: { enabled: false, values: [null, 0, 'quoted "text"'] },
  };
  session.appendMessage(
    assistant([
      { type: "text", text: "Running tests." },
      { type: "toolCall", id: "call-1", name: "bash", arguments: args },
    ]),
  );
  session.appendMessage({
    role: "toolResult",
    toolName: "bash",
    toolCallId: "call-1",
    content: [{ type: "text", text: "  12 passed, 0 failed\n" }],
    details: { exitCode: 0, truncated: true, fullOutputPath: "/not/read/log" },
    isError: false,
    timestamp: 0,
  });
  session.appendMessage(assistant([{ type: "text", text: "Tests passed." }]));

  const result = formatTranscript(session.getBranch());
  assert.equal(result.messageCount, 4);
  assert.equal(
    result.text,
    [
      "USER:\nRun tests.",
      `ASSISTANT:\nRunning tests.\nTOOL CALL: bash\nCall ID: call-1\nArguments:\n${JSON.stringify(args, null, 2)}`,
      'TOOL RESULT: bash\nCall ID: call-1\nStatus: success\nOutput:\n  12 passed, 0 failed\n\nDetails:\n{\n  "exitCode": 0,\n  "truncated": true,\n  "fullOutputPath": "/not/read/log"\n}',
      "ASSISTANT:\nTests passed.",
    ].join("\n\n---\n\n"),
  );
});

test("distinguishes repeated tool names by ID and preserves error results", () => {
  const session = SessionManager.inMemory();
  session.appendMessage(
    assistant([
      { type: "toolCall", id: "a", name: "read", arguments: { path: "a" } },
      { type: "toolCall", id: "b", name: "read", arguments: { path: "b" } },
    ]),
  );
  session.appendMessage({
    role: "toolResult",
    toolName: "read",
    toolCallId: "b",
    content: [{ type: "text", text: "File not found" }],
    isError: true,
    timestamp: 0,
  });
  session.appendMessage({
    role: "toolResult",
    toolName: "read",
    toolCallId: "a",
    content: [],
    isError: false,
    timestamp: 0,
  });
  const result = formatTranscript(session.getBranch());
  assert.equal(result.messageCount, 3);
  assert.match(
    result.text,
    /Call ID: b\nStatus: error\nOutput:\nFile not found/,
  );
  assert.ok(
    result.text.endsWith("TOOL RESULT: read\nCall ID: a\nStatus: success"),
  );
  assert.equal(result.text.match(/TOOL CALL: read/g)?.length, 2);
});

test("preserves stored thinking and image placeholders without image data", () => {
  const session = SessionManager.inMemory();
  session.appendMessage({
    role: "user",
    content: [
      { type: "image", data: "secret-image-data", mimeType: "image/png" },
    ],
    timestamp: 0,
  });
  session.appendMessage(
    assistant([
      { type: "thinking", thinking: "Stored reasoning" },
      { type: "text", text: "Answer" },
    ]),
  );
  session.appendMessage({
    role: "toolResult",
    toolName: "read",
    toolCallId: "image-call",
    content: [
      { type: "image", data: "secret-image-data", mimeType: "image/png" },
    ],
    isError: false,
    timestamp: 0,
  });
  const result = formatTranscript(session.getBranch());
  assert.equal(result.messageCount, 3);
  assert.match(result.text, /USER:\n\[image\]/);
  assert.match(
    result.text,
    /ASSISTANT:\n\[thinking\]\nStored reasoning\nAnswer/,
  );
  assert.match(result.text, /Output:\n\[image\]/);
  assert.ok(!result.text.includes("secret-image-data"));
});

test("copies only the current branch and ignores non-message entries", () => {
  const session = SessionManager.inMemory();
  const root = session.appendMessage({
    role: "user",
    content: "Hello",
    timestamp: 0,
  });
  session.appendMessage(
    assistant([{ type: "text", text: "Abandoned answer" }]),
  );
  session.branch(root);
  session.appendCustomEntry("private-state", {
    value: "Not transcript content",
  });
  session.appendMessage(assistant([{ type: "text", text: "Current answer" }]));
  const result = formatTranscript(session.getBranch());
  assert.deepEqual(result, {
    text: "USER:\nHello\n\n---\n\nASSISTANT:\nCurrent answer",
    messageCount: 2,
  });
});

test("skips empty user and assistant messages and reports an empty transcript", () => {
  const session = SessionManager.inMemory();
  assert.deepEqual(formatTranscript(session.getBranch()), {
    text: "",
    messageCount: 0,
  });
  session.appendMessage({ role: "user", content: "  \n", timestamp: 0 });
  session.appendMessage(assistant([]));
  session.appendMessage(assistant([{ type: "thinking", thinking: "" }]));
  assert.deepEqual(formatTranscript(session.getBranch()), {
    text: "",
    messageCount: 0,
  });
});

test("includes orphan results and metadata even without output", () => {
  const session = SessionManager.inMemory();
  session.appendMessage({
    role: "toolResult",
    toolName: "bash",
    toolCallId: "orphan",
    content: [],
    details: { exitCode: 1 },
    isError: true,
    timestamp: 0,
  });
  const result = formatTranscript(session.getBranch());
  assert.equal(result.messageCount, 1);
  assert.equal(
    result.text,
    'TOOL RESULT: bash\nCall ID: orphan\nStatus: error\nDetails:\n{\n  "exitCode": 1\n}',
  );
});

test("has only the directory-based copy-all entry point", () => {
  assert.ok(
    !readdirSync(new URL("../../", import.meta.url)).includes("copy-all.ts"),
  );
  assert.match(
    readFileSync(new URL("../index.ts", import.meta.url), "utf8"),
    /registerCommand\("copy-all"/,
  );
});
