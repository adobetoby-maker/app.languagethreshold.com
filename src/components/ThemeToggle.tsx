import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  applyDarkMode,
  readDarkModePreference,
  saveDarkModePreference,
} from "@/lib/theme-preference";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const sync = () => {
      const next = readDarkModePreference();
      setDark(next);
      applyDarkMode(next);
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("lt:theme-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("lt:theme-change", sync);
    };
  }, []);

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        const next = !dark;
        setDark(next);
        saveDarkModePreference(next);
      }}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
      <span>{dark ? "Light" : "Dark"}</span>
    </button>
  );
}
