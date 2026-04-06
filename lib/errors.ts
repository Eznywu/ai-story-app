type ErrorLike = {
  message?: unknown;
  status?: unknown;
};

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as ErrorLike).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export function getErrorStatus(error: unknown, fallback = 500) {
  if (typeof error === "object" && error && "status" in error) {
    const status = (error as ErrorLike).status;
    if (typeof status === "number" && Number.isFinite(status)) return status;
  }
  return fallback;
}

export function createError(message: string, status: number) {
  const err = new Error(message) as Error & { status?: number };
  err.status = status;
  return err;
}
