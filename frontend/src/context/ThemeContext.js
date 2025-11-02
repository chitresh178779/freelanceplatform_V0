// src/context/ThemeContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
    return useContext(ThemeContext);
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() =>
        localStorage.getItem('theme') || 'light'
    );

    useEffect(() => {
        // Apply theme class to the body
        document.body.className = ''; // Clear existing classes
        document.body.classList.add(theme); // Add 'light' or 'dark'

        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const value = {
        theme,
        toggleTheme,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};