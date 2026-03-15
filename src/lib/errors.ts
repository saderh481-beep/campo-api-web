import type { Context } from "hono";

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} no encontrado`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "No autenticado") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Acceso denegado") {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

// Handler global para onError de Hono
export function handleError(err: Error, c: Context) {
  if (err instanceof AppError) {
    return c.json(
      { error: err.message, ...(err.details ? { details: err.details } : {}) },
      err.statusCode as 400 | 401 | 403 | 404 | 409 | 500
    );
  }

  // Error de constraint de PostgreSQL
  if ("code" in err) {
    const pgErr = err as { code: string; detail?: string };
    if (pgErr.code === "23505") {
      return c.json({ error: "El recurso ya existe", details: pgErr.detail }, 409);
    }
    if (pgErr.code === "23503") {
      return c.json({ error: "Referencia inválida", details: pgErr.detail }, 400);
    }
  }

  console.error("[Error no controlado]", err);
  return c.json({ error: "Error interno del servidor" }, 500);
}
