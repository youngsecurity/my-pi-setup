import { Effect } from "effect";
import { runCommand, type CommandRunner } from "./process.ts";

/**
 * Convert a git remote URL into the `[HOST/]OWNER/REPO` form accepted by `gh --repo`.
 * Returns null when the URL does not look like a GitHub-style remote.
 */
export function parseRemoteRepository(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  let host: string;
  let path: string;

  const scp = /^(?:[\w.-]+@)?([\w.-]+):(?!\/\/)(.+)$/.exec(trimmed);
  if (scp) {
    host = scp[1] ?? "";
    path = scp[2] ?? "";
  } else {
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      return null;
    }
    host =
      parsed.protocol === "http:" || parsed.protocol === "https:"
        ? parsed.host
        : parsed.hostname;
    path = parsed.pathname;
  }

  const segments = path
    .replace(/\.git$/, "")
    .split("/")
    .filter(Boolean);
  if (segments.length !== 2 || !host) return null;
  const [owner, repo] = segments;
  if (!owner || !repo) return null;

  const slug = `${owner}/${repo}`;
  return host.toLowerCase() === "github.com" ? slug : `${host}/${slug}`;
}

/** Read Git's push-remote metadata for the exact branch, defaulting to origin. */
export function pushRemoteName(pushInfo: string, headRef: string) {
  const prefix = `${headRef}\0`;
  const record = pushInfo.split("\n").find((line) => line.startsWith(prefix));
  return record?.slice(prefix.length).trim() || "origin";
}

/** Build `gh pr view` arguments, targeting an explicit repository when known. */
export function pullRequestViewArgs(
  branch: string,
  repository: string | null,
): string[] {
  const target = repository ? ["--repo", repository] : [];
  return [
    "pr",
    "view",
    branch,
    ...target,
    "--json",
    "number,url,state,isDraft",
  ];
}

/**
 * Resolve the repository that owns the branch's pull request.
 *
 * `gh` picks a base repository by remote name priority (upstream before origin),
 * so in a fork checkout with both remotes a PR opened on origin is missed unless
 * `--repo` is passed explicitly. Prefer the branch's push remote, then origin.
 */
export const resolvePullRequestRepository = (
  cwd: string,
  timeout: number,
): Effect.Effect<string | null, never, CommandRunner> =>
  Effect.gen(function* () {
    const head = yield* runCommand(
      "git",
      ["symbolic-ref", "--quiet", "HEAD"],
      cwd,
      timeout,
    );
    let remote = "origin";
    if (head.code === 0 && head.stdout.trim()) {
      const headRef = head.stdout.trim();
      // Let Git resolve pushRemote/pushDefault/upstream configuration. Splitting
      // @{push} on '/' confuses slash-containing remotes with branch prefixes.
      const push = yield* runCommand(
        "git",
        ["for-each-ref", "--format=%(refname)%00%(push:remotename)", headRef],
        cwd,
        timeout,
      );
      if (push.code === 0) remote = pushRemoteName(push.stdout, headRef);
    }

    const url = yield* runCommand(
      "git",
      ["remote", "get-url", remote],
      cwd,
      timeout,
    );
    if (url.code !== 0) return null;
    return parseRemoteRepository(url.stdout);
  });
