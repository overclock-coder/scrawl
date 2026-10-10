import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  DAILY_HOUR, DAILY_MINUTE, DAILY_REMINDER_COPY, DAILY_REMINDER_ID,
  batchDoneAt, batchReminderCopy, batchReminderId, wantsBatchReminder,
} from "../logic/reminders";
import { load, save } from "./kv";

/** Local reminders only: nothing here talks to a server, so there is no token and no push service. */
const CHANNEL = "scrawl";
const ASKED_KEY = "notify.asked.v1";

// Reminders are for when the app is closed; while it is open the round screen already says what happened.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
});

let channelReady = false;
async function ensureChannel() {
  if (Platform.OS !== "android" || channelReady) return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: "Rounds and reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: "#C1FF72",
  });
  channelReady = true;
}

/** True if we may post notifications. Asks once, and only when `ask` is set. */
async function allowed(ask: boolean): Promise<boolean> {
  try {
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    if (!ask || !cur.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Schedule "your rounds are settled" for a multi-minute batch. Safe to call and ignore the result. */
export async function scheduleBatchDone(startedAt: number, count: number): Promise<void> {
  if (!wantsBatchReminder(count)) return;
  try {
    if (!(await allowed(true))) return;
    await ensureChannel();
    const when = batchDoneAt(startedAt, count);
    if (when <= Date.now()) return;
    await Notifications.scheduleNotificationAsync({
      identifier: batchReminderId(startedAt),
      content: { ...batchReminderCopy(count), data: { kind: "batch" } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(when), channelId: CHANNEL },
    });
  } catch {
    /* a missing reminder must never get in the way of a round */
  }
}

/** The app saw the batch finish itself, so drop the pending reminder. */
export async function cancelBatchDone(startedAt: number): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(batchReminderId(startedAt));
  } catch {
    /* nothing scheduled */
  }
}

/** Once, after the first finished round: ask for permission and set a repeating evening nudge. */
export async function enableDailyReminder(): Promise<void> {
  try {
    if (await load<boolean>(ASKED_KEY, false)) return;
    await save(ASKED_KEY, true);
    if (!(await allowed(true))) return;
    await ensureChannel();
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: { ...DAILY_REMINDER_COPY, data: { kind: "daily" } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: DAILY_HOUR, minute: DAILY_MINUTE, channelId: CHANNEL },
    });
  } catch {
    /* optional feature */
  }
}
