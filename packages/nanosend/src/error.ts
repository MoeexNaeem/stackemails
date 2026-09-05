/** Error thrown for any non-2xx API response. */
export class NanoSendError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "NanoSendError";
    this.status = status;
    this.code = code;
  }
}
