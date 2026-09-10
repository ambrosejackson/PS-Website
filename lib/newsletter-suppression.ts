/**
 * One place for the 15%-merch newsletter popup's suppression state (client
 * only — localStorage). Rules:
 *  - a successful signup ANYWHERE (popup, footer section, TK JOIN THE COURT)
 *    marks the browser subscribed → the popup never shows again;
 *  - closing the popup with [X] suppresses it for DISMISS_DAYS;
 *  - NewsletterPopup.tsx still adds its own once-per-session gate on top.
 * Per-browser state: the same person on another device sees the popup once.
 */
const SUBSCRIBED_KEY = "ps_subscribed";
const DISMISSED_AT_KEY = "ps_nl_popup_dismissed_at";
export const DISMISS_DAYS = 21;

/** Call on any confirmed newsletter signup. */
export function markSubscribed(): void {
  try {
    localStorage.setItem(SUBSCRIBED_KEY, "1");
  } catch {
    /* storage unavailable (private mode etc.) — popup rules just stay lax */
  }
}

/** Call when the visitor closes the popup without subscribing. */
export function markPopupDismissed(): void {
  try {
    localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** True while the popup must not be shown (subscribed, or dismissed recently). */
export function popupSuppressed(): boolean {
  try {
    if (localStorage.getItem(SUBSCRIBED_KEY) === "1") return true;
    const at = Number(localStorage.getItem(DISMISSED_AT_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}
