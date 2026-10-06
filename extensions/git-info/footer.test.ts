import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hyperlink,
  truncateToWidth,
  visibleWidth,
} from "@earendil-works/pi-tui";
import { renderGitFooter } from "./src/footer.ts";

const nativeRows = [
  "~/repo (main)",
  "usage                         model • high",
];
const base = {
  render: (width: number) => [
    ...nativeRows.map((line) => truncateToWidth(line, width)),
    "old native status row",
  ],
  invalidate() {},
};

test("right-aligns Git directly below the untouched model row", () => {
  const status = "2 files changed · PR #123";
  const rows = renderGitFooter(base, new Map([["git-info", status]]), 80);
  assert.deepEqual(rows.slice(0, 2), nativeRows);
  assert.equal(rows.length, 3);
  assert.equal(rows[2], " ".repeat(80 - status.length) + status);
});

test("keeps other statuses on the left, sorted and sanitized", () => {
  const rows = renderGitFooter(
    base,
    new Map([
      ["z-last", "last\nline"],
      ["git-info", "1 file changed"],
      ["a-first", "first\t  status"],
    ]),
    80,
  );
  const left = "first status last line";
  const right = "1 file changed";
  assert.equal(
    rows[2],
    left + " ".repeat(80 - left.length - right.length) + right,
  );
});

test("preserves ANSI styling and clickable PRs when aligning", () => {
  const pr = hyperlink("PR #123", "https://github.com/example/repo/pull/123");
  const git = `\x1b[90m3 files changed · ${pr}\x1b[0m`;
  const rows = renderGitFooter(base, new Map([["git-info", git]]), 80);
  assert.equal(rows[2], " ".repeat(80 - visibleWidth(git)) + git);
  assert.equal(visibleWidth(rows[2] ?? ""), 80);
});

test("recomputes alignment on resize and bounds every row on narrow terminals", () => {
  const statuses = new Map([
    ["other", "a very long background status 界界"],
    ["git-info", "12 files changed · PR #123"],
  ]);
  for (const width of [120, 80, 40, 25, 10, 2, 1, 0]) {
    const rows = renderGitFooter(base, statuses, width);
    for (const line of rows) assert.ok(visibleWidth(line) <= width);
    if (width > 0) assert.equal(visibleWidth(rows[2] ?? ""), width);
  }
});

test("uses the native footer unchanged when Git status is absent", () => {
  assert.deepEqual(renderGitFooter(base, new Map(), 80), base.render(80));
});
