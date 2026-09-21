import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { AgUiStateManager, applyJsonPatch } from "../lib/ag-ui-state";

describe("AG-UI shared state and durable recovery", () => {
  it("applies RFC 6902 object and array operations immutably", () => {
    const original = { title: "Draft", items: [{ title: "Labor" }] };
    const updated = applyJsonPatch(original, [
      { op: "replace", path: "/title", value: "Kitchen" },
      { op: "add", path: "/items/-", value: { title: "Tile" } },
      { op: "remove", path: "/items/0" },
    ]);

    assert.deepEqual(original, { title: "Draft", items: [{ title: "Labor" }] });
    assert.deepEqual(updated, { title: "Kitchen", items: [{ title: "Tile" }] });
  });

  it("reports a revision gap with the run identity needed for recovery", () => {
    const manager = new AgUiStateManager();
    const recovery: any[] = [];
    manager.subscribeRecovery((event) => recovery.push(event));
    manager.applySnapshot({ quote: { title: "Draft" } }, 1, "thread-1", "run-1");

    const applied = manager.applyDelta({
      revision: 3,
      runId: "run-1",
      threadId: "thread-1",
      entityType: "quote",
      delta: [{ op: "replace", path: "/title", value: "Skipped" }],
    });

    assert.equal(applied, false);
    assert.equal(recovery.length, 1);
    assert.equal(recovery[0].runId, "run-1");
    assert.equal(recovery[0].expectedRevision, 2);
  });

  it("rebuilds from the latest snapshot and accepts snake-case recovery payloads", () => {
    const manager = new AgUiStateManager();
    const applied = manager.applyRecoveryEvents(
      [
        {
          event_type: "STATE_SNAPSHOT",
          revision: 4,
          payload: { snapshot: { quote: { title: "Old", items: [] } } },
        },
        {
          event_type: "STATE_DELTA",
          revision: 5,
          payload: {
            entity_type: "quote",
            delta: [{ op: "replace", path: "/title", value: "Recovered" }],
          },
        },
      ],
      { runId: "run-2", threadId: "thread-2" },
    );

    assert.equal(applied, true);
    assert.equal(manager.getRevision(), 5);
    assert.equal(manager.getState().quote.title, "Recovered");
  });

  it("replays a delta-only run from revision zero", () => {
    const manager = new AgUiStateManager();
    assert.equal(
      manager.applyRecoveryEvents([
        {
          event_type: "STATE_DELTA",
          revision: 1,
          payload: {
            entity_type: "project",
            delta: [{ op: "add", path: "/title", value: "Recovered project" }],
          },
        },
      ]),
      true,
    );
    assert.deepEqual(manager.getState(), {
      project: { title: "Recovered project" },
    });
  });
});
