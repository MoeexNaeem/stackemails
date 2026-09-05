/** Error thrown for any non-2xx API response. */
export declare class NanoSendError extends Error {
    readonly status: number;
    readonly code: string;
    constructor(status: number, code: string, message: string);
}
