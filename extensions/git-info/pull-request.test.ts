import assert from "node:assert/strict";
import { test } from "node:test";
import { Effect, Layer } from "effect";
import { CommandRunner, type CommandResult } from "./src/process.ts";
import {
  parseRemoteRepository,
  pullRequestViewArgs,
  pushRemoteName,
  resolvePullRequestRepository,
} from "./src/pull-request.ts";

const ok = (stdout: string): CommandResult => ({ code: 0, stderr: "", stdout });
const fail = (stderr = ""): CommandResult => ({
  code: 128,
  stderr,
  stdout: "",
});

function fakeRunner(responses: Record<string, CommandResult>) {
  const calls: string[] = [];
  const layer = Layer.succeed(
    CommandRunner,
    CommandRunner.of({
      run: (command, args) =>
        Effect.sync(() => {
          const key = [command, ...args].join(" ");
          calls.push(key);
          return responses[key] ?? fail(`unexpected command: ${key}`);
        }),
    }),
  );
  return { calls, layer };
}

test("parses https, ssh and GHES remotes into gh --repo targets", () => {
  assert.equal(
    parseRemoteRepository("https://github.com/youngsecurity/collie.git\n"),
    "youngsecurity/collie",
  );
  assert.equal(
    parseRemoteRepository("git@github.com:youngsecurity/collie.git"),
    "youngsecurity/collie",
  );
  assert.equal(
    parseRemoteRepository("ssh://git@github.com/youngsecurity/collie"),
    "youngsecurity/collie",
  );
  assert.equal(
    parseRemoteRepository("https://ghe.example.com/team/repo.git"),
    "ghe.example.com/team/repo",
  );
  assert.equal(
    parseRemoteRepository("https://ghe.example.com:8443/team/repo.git"),
    "ghe.example.com:8443/team/repo",
  );
  assert.equal(
    parseRemoteRepository("http://ghe.example.com:8080/team/repo.git"),
    "ghe.example.com:8080/team/repo",
  );
  assert.equal(
    parseRemoteRepository("ssh://git@ghe.example.com:2222/team/repo.git"),
    "ghe.example.com/team/repo",
  );
  assert.equal(parseRemoteRepository("/srv/git/repo.git"), null);
  assert.equal(parseRemoteRepository("https://github.com/only-owner"), null);
  assert.equal(parseRemoteRepository(""), null);
});

test("push remote metadata preserves slash-containing remote names", () => {
  const head = "refs/heads/feature/x";
  assert.equal(pushRemoteName(`${head}\0origin\n`, head), "origin");
  assert.equal(pushRemoteName(`${head}\0team/origin\n`, head), "team/origin");
  assert.equal(pushRemoteName(`${head}\0\n`, head), "origin");
  assert.equal(pushRemoteName("", head), "origin");
  assert.equal(
    pushRemoteName(`${head}/child\0upstream\n${head}\0team/origin\n`, head),
    "team/origin",
  );
});

test("gh pr view targets the repository explicitly when known", () => {
  assert.deepEqual(pullRequestViewArgs("dev-joe", "youngsecurity/collie"), [
    "pr",
    "view",
    "dev-joe",
    "--repo",
    "youngsecurity/collie",
    "--json",
    "number,url,state,isDraft",
  ]);
  assert.deepEqual(pullRequestViewArgs("dev-joe", null), [
    "pr",
    "view",
    "dev-joe",
    "--json",
    "number,url,state,isDraft",
  ]);
});

test("a fork with origin and upstream resolves to the branch's push remote", async () => {
  const runner = fakeRunner({
    "git symbolic-ref --quiet HEAD": ok("refs/heads/dev-joe\n"),
    "git for-each-ref --format=%(refname)%00%(push:remotename) refs/heads/dev-joe":
      ok("refs/heads/dev-joe\0origin\n"),
    "git remote get-url origin": ok(
      "https://github.com/youngsecurity/collie.git\n",
    ),
    "git remote get-url upstream": ok("https://github.com/AltanS/collie.git\n"),
  });

  const repository = await Effect.runPromise(
    resolvePullRequestRepository("/repo", 1_000).pipe(
      Effect.provide(runner.layer),
    ),
  );

  assert.equal(repository, "youngsecurity/collie");
});

test("falls back to origin when no push target is configured", async () => {
  const runner = fakeRunner({
    "git symbolic-ref --quiet HEAD": ok("refs/heads/dev-joe\n"),
    "git for-each-ref --format=%(refname)%00%(push:remotename) refs/heads/dev-joe":
      ok("refs/heads/dev-joe\0\n"),
    "git remote get-url origin": ok(
      "git@github.com:youngsecurity/dotagents.git\n",
    ),
  });

  const repository = await Effect.runPromise(
    resolvePullRequestRepository("/repo", 1_000).pipe(
      Effect.provide(runner.layer),
    ),
  );

  assert.equal(repository, "youngsecurity/dotagents");
});

test("resolves a slash-containing push remote without guessing ref prefixes", async () => {
  const runner = fakeRunner({
    "git symbolic-ref --quiet HEAD": ok("refs/heads/main\n"),
    "git for-each-ref --format=%(refname)%00%(push:remotename) refs/heads/main":
      ok("refs/heads/main\0team/origin\nrefs/heads/main/child\0upstream\n"),
    "git remote get-url team/origin": ok("https://github.com/team/fork.git\n"),
  });
  const repository = await Effect.runPromise(
    resolvePullRequestRepository("/repo", 1_000).pipe(
      Effect.provide(runner.layer),
    ),
  );
  assert.equal(repository, "team/fork");
  assert.ok(!runner.calls.includes("git remote get-url team"));
});

test("lets gh choose when no usable remote exists", async () => {
  const runner = fakeRunner({
    "git symbolic-ref --quiet HEAD": fail(),
    "git remote get-url origin": fail("error: No such remote 'origin'"),
  });

  const repository = await Effect.runPromise(
    resolvePullRequestRepository("/repo", 1_000).pipe(
      Effect.provide(runner.layer),
    ),
  );

  assert.equal(repository, null);
});
