/** Error thrown for any non-2xx API response (or a network failure, status 0). */
export class StackEmailsError extends Error {
    constructor(status, code, message, requestId) {
        super(message);
        this.name = "StackEmailsError";
        this.status = status;
        this.code = code;
        this.requestId = requestId;
    }
}
