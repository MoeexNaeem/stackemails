import { Http } from "./http.js";
import { Emails } from "./resources/emails.js";
import { Domains } from "./resources/domains.js";
import { Audiences, Contacts, Segments, Topics } from "./resources/audiences.js";
import { Broadcasts, Events } from "./resources/broadcasts.js";
import type { ClientOptions } from "./types.js";

/**
 * The Stack Emails client.
 *
 * ```ts
 * import { StackEmails } from "stackemails";
 *
 * const stack = new StackEmails("se_live_...");
 * await stack.emails.send({
 *   from: "Acme <hello@acme.com>",
 *   to: "user@example.com",
 *   subject: "Welcome",
 *   html: "<h1>Hi</h1>",
 * });
 * ```
 */
export class StackEmails {
  readonly emails: Emails;
  readonly domains: Domains;
  readonly contacts: Contacts;
  readonly segments: Segments;
  readonly topics: Topics;
  readonly broadcasts: Broadcasts;
  readonly events: Events;
  /** @deprecated Use `segments` + `contacts`. */
  readonly audiences: Audiences;

  constructor(apiKey?: string, options: ClientOptions = {}) {
    const http = new Http(apiKey ?? "", options);
    this.emails = new Emails(http);
    this.domains = new Domains(http);
    this.contacts = new Contacts(http);
    this.segments = new Segments(http);
    this.topics = new Topics(http);
    this.broadcasts = new Broadcasts(http);
    this.events = new Events(http);
    this.audiences = new Audiences(http);
  }
}

export { StackEmailsError } from "./error.js";
export { verifyWebhook } from "./webhooks.js";
export { VERSION } from "./http.js";
export type * from "./types.js";
export default StackEmails;
