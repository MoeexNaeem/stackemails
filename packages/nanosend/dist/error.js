/** Error thrown for any non-2xx API response. */
export class NanoSendError extends Error {
    constructor(status, code, message) {
        super(message);
        this.name = "NanoSendError";
        this.status = status;
        this.code = code;
    }
}
