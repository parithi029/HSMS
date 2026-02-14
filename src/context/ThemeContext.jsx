import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) return savedTheme;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    const [showFluid, setShowFluid] = useState(() => {
        const saved = localStorage.getItem('showFluid');
        return saved === null ? true : saved === 'true';
    });

    useEffect(() => {
        localStorage.setItem('theme', theme);
        localStorage.setItem('showFluid', showFluid);

        const root = window.document.documentElement;
        root.setAttribute('data-theme', theme);
        root.classList.remove('dark');
        window.document.body.classList.remove('dark');
    }, [theme, showFluid]);

    const toggleTheme = () => {
        setTheme(prev => {
            const newTheme = prev === 'light' ? 'dark' : 'light';
            // Automatically sync fluid with theme: Dark = Vivid, Light = Static
            setShowFluid(newTheme === 'dark');
            return newTheme;
        });
    };

    const toggleFluid = () => {
        setShowFluid(prev => !prev);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, showFluid, toggleFluid }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
