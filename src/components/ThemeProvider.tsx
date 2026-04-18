"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setTheme: (t: Theme) => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("gp-theme") : null;
      const initial = saved === "light" || saved === "dark" ? (saved as Theme) : "dark";
      setTheme(initial);
      document.documentElement.classList.toggle("dark", initial === "dark");
    } catch {
      // defensive
    }
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") localStorage.setItem("gp-theme", theme);
      document.documentElement.classList.toggle("dark", theme === "dark");
    } catch {}
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
