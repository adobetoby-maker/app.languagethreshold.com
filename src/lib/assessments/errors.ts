export class AssessmentAccessError extends Error {
  constructor(
    message: string,
    readonly status = 403,
  ) {
    super(message);
  }
}
