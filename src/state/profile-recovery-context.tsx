import { createContext, useContext } from "react";
import type { Language } from "../data/languages";
import type { ProfileRecoveryKind } from "../lib/legacy-profile-recovery";

export const ProfileRecoveryContext = createContext<{
  ready: boolean;
  recover: (kind: ProfileRecoveryKind, confirmed: boolean, language?: Language) => void;
} | null>(null);
export function useProfileRecovery() {
  return useContext(ProfileRecoveryContext);
}
