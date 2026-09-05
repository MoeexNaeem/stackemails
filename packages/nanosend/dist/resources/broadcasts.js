export class Broadcasts {
    constructor(http) {
        this.http = http;
    }
    /** Queue an email to every subscribed contact in an audience. */
    async send(options) {
        return this.http.request("POST", "/v1/broadcasts", {
            audience_id: options.audienceId,
            from: options.from,
            subject: options.subject,
            html: options.html,
            text: options.text,
        });
    }
}
