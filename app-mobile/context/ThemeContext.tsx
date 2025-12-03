// context/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from "@/constants/theme";

export type ThemeName = keyof typeof Colors;

type ThemeContextType = {
    theme: typeof Colors.light; // the theme shape matches Colors.light/dark
    themeName: ThemeName;
    setTheme: (name: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextType>({
    theme: Colors.dark, // default theme
    themeName: 'blue',
    setTheme: () => { },
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
    const [themeName, setThemeName] = useState<ThemeName>("blue");

    useEffect(() => {
        (async () => {
            try {
                const stored = await AsyncStorage.getItem('@app:theme');
                if (stored && (Object.keys(Colors) as string[]).includes(stored)) {
                    setThemeName(stored as ThemeName);
                }
            } catch (e) {
                // ignore read errors
            }
        })();
    }, []);

    const setTheme = async (name: ThemeName) => {
        setThemeName(name);
        try {
            await AsyncStorage.setItem('@app:theme', name);
        } catch (e) {
            // ignore write errors
        }
    };

    return (
        <ThemeContext.Provider value={{ theme: Colors[themeName], themeName, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
