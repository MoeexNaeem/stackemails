/** A typed, HTTP-aware error. Thrown anywhere in a route and turned into a
 *  consistent JSON envelope by `withApi`. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export const ApiErrors = {
  badRequest: (m = "Bad request.") => new ApiError(400, "bad_request", m),
  invalidJson: () => new ApiError(400, "invalid_json", "Request body must be valid JSON."),
  unauthorized: (m = "Invalid API key.") => new ApiError(401, "unauthorized", m),
  forbidden: (code: string, m: string) => new ApiError(403, code, m),
  notFound: (m = "Not found.") => new ApiError(404, "not_found", m),
  conflict: (code: string, m: string) => new ApiError(409, code, m),
  validation: (m: string) => new ApiError(422, "validation_error", m),
  rateLimited: (m = "Too many requests. Slow down.") => new ApiError(429, "rate_limited", m),
  quotaExceeded: (m: string) => new ApiError(429, "quota_exceeded", m),
  server: (m = "Something went wrong.") => new ApiError(500, "server_error", m),
};
