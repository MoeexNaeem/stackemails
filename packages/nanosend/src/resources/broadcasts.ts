import type { Http } from "../http.js";
import type { SendBroadcastOptions, SendBroadcastResponse } from "../types.js";

export class Broadcasts {
  constructor(private http: Http) {}

  /** Queue an email to every subscribed contact in an audience. */
  async send(options: SendBroadcastOptions): Promise<SendBroadcastResponse> {
    return this.http.request<SendBroadcastResponse>("POST", "/v1/broadcasts", {
      audience_id: options.audienceId,
      from: options.from,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
  }
}
