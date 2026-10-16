import { createContext, useContext } from "react";
export const Auth = createContext<{ user: { id: string; email: string } } | null>(null);
export const Library = createContext<{
  recoverOlderLibrary: (confirmed: boolean) => number;
} | null>(null);
export const useAuth = () => {
  const value = useContext(Auth);
  if (!value) throw Error("Missing fixture auth");
  return value;
};
export const useLibrary = () => {
  const value = useContext(Library);
  if (!value) throw Error("Missing fixture library");
  return value;
};
