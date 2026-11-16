import { env } from "@/lib/env";

/** Bank-transfer payments are offered only once the account details are configured on the server. */
export function manualPayEnabled(): boolean {
  return Boolean(env.manualPay.accountNumber && env.manualPay.beneficiary);
}

export type BankDetails = { label: string; value: string }[];

/** The bank details customers see (only rows that are set). */
export function bankDetails(): BankDetails {
  const m = env.manualPay;
  return [
    { label: "Beneficiary name", value: m.beneficiary },
    { label: "Bank name", value: m.bankName },
    { label: "Account number", value: m.accountNumber },
    { label: "Routing number (ACH / ABA)", value: m.routingNumber },
    { label: "Account type", value: m.accountType },
    { label: "Beneficiary address", value: m.address },
  ].filter((r) => r.value);
}

/** Stable code the customer writes in the transfer memo, so the deposit can be matched to the team. */
export function paymentReference(workspaceId: unknown): string {
  return `SE-${String(workspaceId).slice(-6).toUpperCase()}`;
}

export const PROOF_MAX_BYTES = 5 * 1024 * 1024;

/** Identify the proof file by its first bytes, never by the name or browser-supplied type. */
export function sniffProofType(buf: Buffer): "image/png" | "image/jpeg" | "image/webp" | "application/pdf" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  return null;
}
