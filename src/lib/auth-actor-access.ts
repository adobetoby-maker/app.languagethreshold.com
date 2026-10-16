/** Identity reads remain valid until auth actually changes; Reader writes also pause for sign-out. */
export function createAuthActorAccess(
  currentActor: () => string | null,
  signingOutActor: () => string | null,
) {
  const isCurrentUser = (actor: string) => currentActor() === actor;
  return {
    isCurrentUser,
    canUseReader: (actor: string) => isCurrentUser(actor) && signingOutActor() !== actor,
  };
}
