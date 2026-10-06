import type {
  SessionEntry,
  SessionMessageEntry,
} from "@earendil-works/pi-coding-agent";

type TranscriptMessage = Extract<
  SessionMessageEntry["message"],
  { role: "user" | "assistant" | "toolResult" }
>;

function textFromContent(content: TranscriptMessage["content"]): string {
  if (typeof content === "string") return content;

  return content
    .map((block) => {
      switch (block.type) {
        case "text":
          return block.text;
        case "image":
          return "[image]";
        case "thinking":
          return block.thinking ? `[thinking]\n${block.thinking}` : "";
        case "toolCall":
          return [
            `TOOL CALL: ${block.name}`,
            `Call ID: ${block.id}`,
            `Arguments:\n${JSON.stringify(block.arguments, null, 2)}`,
          ].join("\n");
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("\n");
}

/** Format only messages on the supplied branch, without reading output files. */
export function formatTranscript(entries: readonly SessionEntry[]) {
  const sections: string[] = [];

  for (const entry of entries) {
    if (entry.type !== "message") continue;
    const message = entry.message;
    if (
      message.role !== "user" &&
      message.role !== "assistant" &&
      message.role !== "toolResult"
    ) {
      continue;
    }

    const content = textFromContent(message.content);
    if (message.role === "toolResult") {
      const lines = [
        `TOOL RESULT: ${message.toolName}`,
        `Call ID: ${message.toolCallId}`,
        `Status: ${message.isError ? "error" : "success"}`,
      ];
      if (content) lines.push(`Output:\n${content}`);
      if (message.details !== undefined) {
        lines.push(`Details:\n${JSON.stringify(message.details, null, 2)}`);
      }
      sections.push(lines.join("\n"));
    } else if (content.trim()) {
      sections.push(`${message.role.toUpperCase()}:\n${content}`);
    }
  }

  return { text: sections.join("\n\n---\n\n"), messageCount: sections.length };
}
