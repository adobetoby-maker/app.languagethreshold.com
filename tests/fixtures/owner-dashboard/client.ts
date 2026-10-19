export const supabase = {
  auth: {
    getSession: async () => ({
      data: {
        session: {
          user: { id: "10000000-0000-4000-8000-000000000001" },
          access_token: "local-fictional-fixture",
        },
      },
    }),
  },
};
