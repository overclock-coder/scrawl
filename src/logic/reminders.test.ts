import { describe, expect, it } from "vitest";
import { BATCH_GRACE_MS, batchDoneAt, batchReminderCopy, batchReminderId, wantsBatchReminder } from "./reminders";

describe("reminders", () => {
  it("a batch is done count*60s after it starts, plus the settlement grace", () => {
    expect(batchDoneAt(1_000_000, 3)).toBe(1_000_000 + 180_000 + BATCH_GRACE_MS);
    expect(batchDoneAt(0, 1)).toBe(60_000 + BATCH_GRACE_MS);
  });
  it("only multi-minute batches get a reminder", () => {
    expect(wantsBatchReminder(1)).toBe(false);
    expect(wantsBatchReminder(2)).toBe(true);
    expect(wantsBatchReminder(5)).toBe(true);
  });
  it("ids are stable per batch and the copy names the count", () => {
    expect(batchReminderId(42)).toBe("batch-42");
    expect(batchReminderCopy(4).body).toContain("4 positions");
  });
});
