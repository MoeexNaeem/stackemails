import { Emails } from "./resources/emails.js";
import { Domains } from "./resources/domains.js";
import { Audiences } from "./resources/audiences.js";
import { Broadcasts } from "./resources/broadcasts.js";
import type { ClientOptions } from "./types.js";
/**
 * The NanoSend client.
 *
 * ```ts
 * import { NanoSend } from "nanosend";
 *
 * const ns = new NanoSend("ns_live_...");
 * await ns.emails.send({
 *   from: "Acme <hello@acme.com>",
 *   to: "user@example.com",
 *   subject: "Welcome",
 *   html: "<h1>Hi</h1>",
 * });
 * ```
 */
export declare class NanoSend {
    readonly emails: Emails;
    readonly domains: Domains;
    readonly audiences: Audiences;
    readonly broadcasts: Broadcasts;
    constructor(apiKey: string, options?: ClientOptions);
}
export { NanoSendError } from "./error.js";
export type * from "./types.js";
export default NanoSend;
