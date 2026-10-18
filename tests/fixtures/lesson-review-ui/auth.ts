export function useAuth() {
  return {
    user: { id: "fictional-local-owner" },
    isCurrentUser: (id: string) => id === "fictional-local-owner",
  };
}
