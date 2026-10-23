/** Error thrown for any non-2xx API response (or a network failure, status 0). */
export declare class StackEmailsError extends Error {
    readonly status: number;
    readonly code: string;
    readonly requestId?: string;
    constructor(status: number, code: string, message: string, requestId?: string);
}
