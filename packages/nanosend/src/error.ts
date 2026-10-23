/** Error thrown for any non-2xx API response (or a network failure, status 0). */
export class StackEmailsError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;

  constructor(status: number, code: string, message: string, requestId?: string) {
    super(message);
    this.name = "StackEmailsError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}
