export class ExamRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
let firstBody = "",
  calls = 0;
export async function examContentRequest(body: Record<string, unknown>) {
  if (body.action !== "bind_lessons" || body.confirmDraftSnapshot !== true)
    throw new Error("Only the local draft-freeze fixture is supported.");
  const serialized = JSON.stringify(body);
  if (!calls++) {
    firstBody = serialized;
    throw new Error("Simulated connection loss. Retry the same local draft snapshot.");
  }
  if (serialized !== firstBody) throw new Error("Retry changed its request or payload.");
  return { fingerprint: body.fingerprint, localOnly: true };
}
