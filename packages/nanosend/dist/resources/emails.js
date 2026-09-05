function asArray(v) {
    if (v === undefined)
        return undefined;
    return Array.isArray(v) ? v : [v];
}
export class Emails {
    constructor(http) {
        this.http = http;
    }
    /**
     * Send an email. Provide `html`, `text`, and/or a `react` element (rendered
     * to HTML via @react-email/render, which must be installed to use `react`).
     */
    async send(options) {
        let html = options.html;
        if (options.react) {
            html = await renderReact(options.react);
        }
        const headers = {};
        if (options.idempotencyKey)
            headers["idempotency-key"] = options.idempotencyKey;
        return this.http.request("POST", "/v1/emails", {
            from: options.from,
            to: asArray(options.to),
            cc: asArray(options.cc),
            bcc: asArray(options.bcc),
            reply_to: asArray(options.replyTo),
            subject: options.subject,
            html,
            text: options.text,
        }, headers);
    }
    /** Retrieve a single email by id. */
    async get(id) {
        return this.http.request("GET", `/v1/emails/${id}`);
    }
    /** List recent emails. */
    async list(params) {
        const q = params?.limit ? `?limit=${params.limit}` : "";
        return this.http.request("GET", `/v1/emails${q}`);
    }
}
async function renderReact(element) {
    try {
        const mod = await import("@react-email/render");
        return await mod.render(element);
    }
    catch {
        throw new Error("NanoSend: `react` content requires the optional peer dependency " +
            "`@react-email/render`. Install it, or pass `html` instead.");
    }
}
