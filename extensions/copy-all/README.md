# Copy all

Run `/copy-all` to copy the current session branch to the clipboard using Pi's clipboard helper. The command waits for the agent to become idle before collecting messages.

The transcript includes:

- User and assistant text, plus stored assistant thinking.
- Tool names, call IDs, and complete JSON arguments.
- Tool-result output, matching call IDs, and the recorded success/error status.
- Tool-result details as JSON, including exit codes or truncation metadata when provided by the tool.
- Image placeholders rather than binary image data.

Messages remain in branch order. The copied-message count includes tool results, even those without output, but excludes empty user/assistant messages.

## Scope and sensitive data

Review the clipboard contents before sharing. Arguments, results, details, and stored thinking can contain credentials or other sensitive data. This command does not redact them.

This is a transcript of stored user, assistant, and tool-result messages, not a complete session archive. It excludes alternate branches, session metadata, custom messages, and user-entered `!`/`!!` shell executions. It does not reconstruct missing or truncated output, read referenced output files, or infer an exit code when one was not recorded. The success/error label reflects the tool result's `isError` flag.

The sole entry point is `extensions/copy-all/index.ts`. Do not add a sibling `extensions/copy-all.ts`, because Pi would discover both and register duplicate commands.

## Validation

From the repository root:

```sh
npm run check --workspace copy-all
npm run test --workspace copy-all
```
