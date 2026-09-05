import { Http } from "./http.js";
import { Emails } from "./resources/emails.js";
import { Domains } from "./resources/domains.js";
import { Audiences } from "./resources/audiences.js";
import { Broadcasts } from "./resources/broadcasts.js";
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
export class NanoSend {
    constructor(apiKey, options = {}) {
        const http = new Http(apiKey, options);
        this.emails = new Emails(http);
        this.domains = new Domains(http);
        this.audiences = new Audiences(http);
        this.broadcasts = new Broadcasts(http);
    }
}
export { NanoSendError } from "./error.js";
export default NanoSend;
