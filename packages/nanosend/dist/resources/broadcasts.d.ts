import type { Http } from "../http.js";
import type { SendBroadcastOptions, SendBroadcastResponse } from "../types.js";
export declare class Broadcasts {
    private http;
    constructor(http: Http);
    /** Queue an email to every subscribed contact in an audience. */
    send(options: SendBroadcastOptions): Promise<SendBroadcastResponse>;
}
