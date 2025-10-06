// context/ThemeContext.tsx
import React, { createContext, useContext, useState } from "react";
import { Colors } from "@/constants/theme";

export type ThemeName = keyof typeof Colors;

type ThemeContextType = {
    theme: typeof Colors.light; // the theme shape matches Colors.light/dark
    setTheme: (name: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextType>({
    theme: Colors.dark, // default theme
    setTheme: () => { },
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [themeName, setThemeName] = useState<ThemeName>("blue");

    const setTheme = (name: ThemeName) => setThemeName(name);

    return (
        <ThemeContext.Provider value={{ theme: Colors[themeName], setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
