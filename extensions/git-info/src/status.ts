import { getCapabilities, hyperlink } from "@earendil-works/pi-tui";
import type { GitInfoState } from "../../shared/dashboard-state.ts";

/** Supplement Pi's built-in path and branch without replacing its footer. */
export function formatGitStatus(
  state: GitInfoState,
  hyperlinks = getCapabilities().hyperlinks,
): string | undefined {
  if (!state.isRepository) return undefined;

  const fileLabel = state.changedFiles === 1 ? "file" : "files";
  let status = `${state.changedFiles} ${fileLabel} changed`;
  if (state.pullRequest) {
    const label = `PR #${state.pullRequest.number}`;
    const pr = hyperlinks ? hyperlink(label, state.pullRequest.url) : label;
    status += ` · ${pr}`;
  }
  return status;
}
