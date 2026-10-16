export const fixtureUser = "local-speech-ui-fixture";
export const useAuth = () => ({
  user: { id: fixtureUser },
  isCurrentUser: (id: string) => id === fixtureUser,
});
