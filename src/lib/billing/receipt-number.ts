/** Human-friendly receipt number derived from the transaction id (safe for client and server). */
export function receiptNumber(tx: { _id: unknown }): string {
  return `SE-${String(tx._id).slice(-8).toUpperCase()}`;
}
