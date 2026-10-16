/** Identity reads remain valid until auth actually changes; Reader writes also pause for sign-out. */
export function createAuthActorAccess(
  currentActor: () => string | null,
  signingOutActor: () => string | null,
  identity?: { version: number; current: () => number },
) {
  const isCurrentUser = (actor: string) =>
    currentActor() === actor && (!identity || identity.version === identity.current());
  return {
    isCurrentUser,
    canUseReader: (actor: string) => isCurrentUser(actor) && signingOutActor() !== actor,
  };
}
