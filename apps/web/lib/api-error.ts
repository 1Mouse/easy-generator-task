/**
 * The API's global exception filter returns a consistent envelope:
 * `{ statusCode, message, code?, error, path, timestamp }` where `message` is
 * either a string or, for validation failures, an array of strings.
 */
export interface ApiErrorBody {
  statusCode?: number
  message?: string | string[]
  code?: string
  error?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code?: string

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isForbidden(): boolean {
    return this.status === 403
  }

  get isNotFound(): boolean {
    return this.status === 404
  }
}

function messageFrom(body: ApiErrorBody | null, fallback: string): string {
  if (!body?.message) return fallback
  // Validation errors arrive as an array — surface the first, which is the one
  // the user can act on.
  return Array.isArray(body.message)
    ? (body.message[0] ?? fallback)
    : body.message
}

export async function toApiError(response: Response): Promise<ApiError> {
  const body = await response
    .json()
    .then((value: unknown) => value as ApiErrorBody)
    .catch(() => null)

  return new ApiError(
    response.status,
    messageFrom(body, "Something went wrong. Please try again."),
    body?.code
  )
}

/** Narrows anything thrown by a fetch wrapper into a displayable message. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return "Something went wrong. Please try again."
}
