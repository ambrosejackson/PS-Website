import type { Database } from "@/lib/database.types";

export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type RsvpRow = Database["public"]["Tables"]["event_rsvps"]["Row"];
export type ReminderRow = Database["public"]["Tables"]["event_reminders"]["Row"];
export type ReminderSendRow = Database["public"]["Tables"]["event_reminder_sends"]["Row"];
export type DispensaryRow = Database["public"]["Tables"]["dispensaries"]["Row"];

export type PlateStatus = "none" | "confirmed" | "waitlisted";

export const REMINDER_AUDIENCES = [
  { value: "all", label: "Everyone confirmed" },
  { value: "budtenders", label: "Budtenders" },
  { value: "plate_holders", label: "Plate-holders" },
  { value: "plate_waitlist", label: "Plate waitlist" },
  { value: "checked_in", label: "Checked in (after the event)" },
  { value: "not_checked_in", label: "Not checked in (after the event)" },
  { value: "opted_in", label: "Marketing opt-ins only" },
] as const;
export type ReminderAudience = (typeof REMINDER_AUDIENCES)[number]["value"];

/** Dispensary option shipped to the RSVP form (public-safe fields only). */
export interface DispensaryOption {
  id: string;
  name: string;
  city: string;
}
