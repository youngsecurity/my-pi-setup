import {
  copyToClipboard,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { formatTranscript } from "./src/transcript.ts";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("copy-all", {
    description:
      "Copy this thread's messages, thinking, tool arguments, and tool results to the clipboard",
    handler: async (_args, ctx) => {
      await ctx.waitForIdle();

      const { text, messageCount } = formatTranscript(
        ctx.sessionManager.getBranch(),
      );
      if (messageCount === 0) {
        ctx.ui.notify("No messages to copy", "info");
        return;
      }

      await copyToClipboard(text);
      ctx.ui.notify(`Copied ${messageCount} messages to clipboard`, "info");
    },
  });
}
