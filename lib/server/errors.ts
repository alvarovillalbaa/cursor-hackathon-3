import "server-only";

// Carries an HTTP status so route handlers can map thrown errors to responses.
// Lives in its own module so both the store and the persistence layer can throw
// it without creating an import cycle.
export class GameError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "GameError";
    this.status = status;
  }
}
