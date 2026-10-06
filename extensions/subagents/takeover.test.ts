import assert from "node:assert/strict";
import test from "node:test";
import {
  reconcileDashboardSelection,
  requestAbortOrDismiss,
  type DashboardSelection,
} from "./src/ui/takeover.ts";

test("dashboard selection follows its subagent id and falls back by row", () => {
  const selection: DashboardSelection = { id: "sa-7", index: 6 };

  reconcileDashboardSelection(selection, [
    { id: "sa-new" },
    ...Array.from({ length: 8 }, (_, index) => ({ id: `sa-${index + 1}` })),
  ]);
  assert.deepEqual(selection, { id: "sa-7", index: 7 });

  reconcileDashboardSelection(selection, [
    ...Array.from({ length: 6 }, (_, index) => ({ id: `sa-${index + 1}` })),
    { id: "sa-8" },
    { id: "sa-9" },
  ]);
  assert.deepEqual(selection, { id: "sa-9", index: 7 });

  reconcileDashboardSelection(selection, [{ id: "sa-1" }, { id: "sa-2" }]);
  assert.deepEqual(selection, { id: "sa-2", index: 1 });

  reconcileDashboardSelection(selection, []);
  assert.deepEqual(selection, { id: undefined, index: 0 });
});

test("dashboard x aborts running subagents and dismisses settled ones", () => {
  const calls: string[] = [];
  const view = {
    requestAbort: (id: string) => calls.push(`abort:${id}`),
    requestDismiss: (id: string) => calls.push(`dismiss:${id}`),
  };

  requestAbortOrDismiss(view, { id: "btw-1", status: "running" });
  requestAbortOrDismiss(view, { id: "btw-2", status: "done" });
  requestAbortOrDismiss(view, { id: "btw-3", status: "error" });

  assert.deepEqual(calls, ["abort:btw-1", "dismiss:btw-2", "dismiss:btw-3"]);
});
