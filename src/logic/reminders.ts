import { WINDOW } from "./types";

/** Settlement lands a few seconds after the last window closes; notify just after that. */
export const BATCH_GRACE_MS = 8_000;
export const DAILY_HOUR = 19;
export const DAILY_MINUTE = 0;

/** When a batch of `count` back-to-back positions that started at `startedAt` should be settled. */
export const batchDoneAt = (startedAt: number, count: number) => startedAt + count * WINDOW * 1000 + BATCH_GRACE_MS;

/** A one-minute round is over before anyone leaves the app, so only longer batches get a reminder. */
export const wantsBatchReminder = (count: number) => count > 1;

export const batchReminderId = (startedAt: number) => `batch-${startedAt}`;

export const batchReminderCopy = (count: number) => ({
  title: "Your rounds are settled",
  body: `${count} positions have closed. Open Scrawl to see how your line did.`,
});

export const DAILY_REMINDER_ID = "daily-bonus";
export const DAILY_REMINDER_COPY = {
  title: "Today's bonus is waiting",
  body: "Draw a line to keep your streak going.",
};
