import { createContext, useContext } from "react";
/** Course policy, separate from a learner's saved voice preference. */
export const HdAudioPolicy = createContext(false);
export const useHdAudioPolicy = () => useContext(HdAudioPolicy);
