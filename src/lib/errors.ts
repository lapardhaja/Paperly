export class PaperlyError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PaperlyError";
    this.status = status;
  }
}
