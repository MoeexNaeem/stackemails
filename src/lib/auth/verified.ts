/**
 * Whether a user has proven they own their email address. Plain module (no
 * "server-only") so scripts and the worker can import it too.
 *
 * There is no exemption for older accounts: they keep the domains they already
 * have, and only need to confirm (one click from the dashboard banner) before
 * adding another domain or inviting someone.
 */
export function isEmailVerified(user: { emailVerifiedAt?: Date | null; googleId?: string | null; platformRole?: string | null }): boolean {
  return Boolean(user.emailVerifiedAt || user.googleId || user.platformRole === "admin");
}

/**
 * Whether the account may add sending domains. Spam bots pass email
 * confirmation with real Outlook/Hotmail inboxes, so new accounts are reviewed
 * by a person (Admin > Review) first. Paying for a plan also approves the account.
 * Set ACCOUNT_REVIEW=off to turn the review off.
 */
export function isApprovedSender(user: { sendingApprovedAt?: Date | null; platformRole?: string | null }): boolean {
  if (process.env.ACCOUNT_REVIEW === "off") return true;
  return Boolean(user.sendingApprovedAt || user.platformRole === "admin");
}
