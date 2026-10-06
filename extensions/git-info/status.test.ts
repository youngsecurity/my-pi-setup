import assert from "node:assert/strict";
import { test } from "node:test";
import { hyperlink, visibleWidth } from "@earendil-works/pi-tui";
import {
  emptyGitInfoState,
  type GitInfoState,
} from "../shared/dashboard-state.ts";
import { formatGitStatus } from "./src/status.ts";

const repository: GitInfoState = {
  isRepository: true,
  branch: "main",
  changedFiles: 0,
  pullRequest: null,
};

const pullRequest = {
  number: 123,
  url: "https://github.com/example/repo/pull/123",
  isDraft: false,
};

test("clears the status outside a repository", () => {
  assert.equal(formatGitStatus(emptyGitInfoState(), false), undefined);
});

test("shows zero, singular and plural changed-file counts without duplicating the branch", () => {
  for (const [changedFiles, expected] of [
    [0, "0 files changed"],
    [1, "1 file changed"],
    [7, "7 files changed"],
  ] as const) {
    assert.equal(
      formatGitStatus({ ...repository, changedFiles }, false),
      expected,
    );
  }
});

test("shows PR text without terminal hyperlink support", () => {
  assert.equal(
    formatGitStatus({ ...repository, changedFiles: 2, pullRequest }, false),
    "2 files changed · PR #123",
  );
});

test("links the PR when supported", () => {
  const status = formatGitStatus({ ...repository, pullRequest }, true);
  assert.equal(
    status,
    `0 files changed · ${hyperlink("PR #123", pullRequest.url)}`,
  );
  assert.equal(visibleWidth(status ?? ""), "0 files changed · PR #123".length);
});

test("keeps the count for detached HEAD and omits absent PRs", () => {
  assert.equal(
    formatGitStatus(
      { ...repository, branch: "detached@abc123", changedFiles: 1 },
      false,
    ),
    "1 file changed",
  );
});
