# Synchronization with dotagents

## Repository ownership

- [youngsecurity/dotagents](https://github.com/youngsecurity/dotagents) owns the installed global skills and extensions through its managed symlinks.
- [youngsecurity/my-pi-setup](https://github.com/youngsecurity/my-pi-setup) is the publishing fork for the components below.
- [davis7dotsh/my-pi-setup](https://github.com/davis7dotsh/my-pi-setup) is the original upstream.

These are separate Git repositories. Committing or pushing dotagents does not update this fork. Updating this fork does not change the installed copies in dotagents.

## Synchronized scope

| Kind | Repository paths |
| --- | --- |
| Skills | `skills/background-terminals/`, `skills/subagents/` |
| Extensions | `extensions/ask-user/`, `extensions/background-terminals/`, `extensions/copy-all/`, `extensions/file-search/`, `extensions/git-info/`, `extensions/model-info/`, `extensions/subagents/`, `extensions/workflows/` |
| Shared helpers and tests | `extensions/shared/` |

The initial reverse synchronization uses dotagents commit `6a8a5175a2cf9a6f4d508982e174dbfa764dfab0`, against this fork's upstream baseline `5a0863f442402aa35cb0830805d67639957c7172`.

The two skills and shared helpers already match at these revisions. Unchanged files remain tracked without artificial edits. The `mp-*` skills, other dotagents extensions, global settings, credentials, sessions, and downloaded binaries are not part of this scope.

## Portable changes

- `/copy-all` includes stored thinking, tool arguments, tool-result output, and metadata. It does not redact sensitive data; see its [README](../extensions/copy-all/README.md).
- Git status can appear in Pi's native footer, with changed-file counts and clickable pull requests. Pull-request lookup explicitly targets the push repository rather than allowing `gh` to prefer the upstream remote. Review during this synchronization also hardened the fork's lookup to use Git's push-remote metadata, preserving remote names that contain `/`, and retain custom HTTP(S) ports in repository targets without treating SSH ports as web ports. Those follow-up fixes have not been applied to the installed dotagents copy.
- The subagent dashboard can dismiss settled runs while retaining cancellation for running ones.
- File-search dependency wiring and typed download errors match the newer Effect release used by dotagents.
- Regression tests travel with their implementations.

## PR-targeting limitation

The synchronized Git footer deliberately queries the branch's push repository,
falling back to `origin`. This preserves dotagents' policy for pull requests hosted
in the fork rather than allowing `gh` to prefer an `upstream` remote implicitly.
It does not separately discover the base repository of a pull request opened from
a fork into its upstream. Such pull requests may not appear in the footer.

Review identified this as a major limitation. Automatic cross-repository PR
selection is deferred rather than silently changing the synchronized policy.
Supporting both cases needs an explicit base-repository selection or fallback
policy and a fork-to-upstream integration test.

## Intentional packaging differences

Dotagents uses Bun catalogs and one root Bun lockfile. This fork retains npm, with the eight synchronized extensions declared as root workspaces and one root npm lockfile for them. Catalog references become explicit dependency versions. Pi-provided imports are declared as extension peer dependencies; root Pi packages provide the pinned development and test environment.

The root override also pins transitive `@effect/platform-node-shared` to `4.0.0-rc.110`. Its upstream caret range otherwise admits stable versions that import Effect module paths absent from the pinned prerelease. Keep this override aligned when deliberately upgrading the Effect family.

The imported `copy-all` test command uses Node's built-in test runner here, not a Bun-only command. Historical design and implementation documents under the extension directories are retained instead of importing dotagents-specific workspace instructions. For current installation and verification, follow [SETUP.md](../SETUP.md).

Existing extensions outside the synchronized set are retained, not replaced or enrolled in this synchronization. Their separate manifests and lockfiles are not the dependency authority for the synchronized workspaces.

## Future synchronization

1. Check both working trees and verify their remotes before editing. Do not include unrelated uncommitted changes.
2. Compare tracked files only within the scope above against the last synchronized source revision. Review changes in both directions before copying.
3. Carry portable implementation changes, tests, and supporting files together. Preserve this fork's npm packaging and translate catalog references explicitly.
4. Use the skills CLI for future skill installations or refreshes. Do not overwrite locally customized skills with a blanket reinstall.
5. Run `npm ci`, `npm run check`, `npm run format:check`, and `npm test` in this fork. Live harness tests are a separate, potentially billable opt-in command.
6. Review the complete diff, including lockfile changes, then commit and push to this fork's `origin`. Do not push to the original upstream unless separately authorized.
7. Record the new dotagents source revision here. Treat publishing and installing as separate operations; do not replace dotagents' managed symlinks.
