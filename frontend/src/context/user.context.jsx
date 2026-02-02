import React, { createContext, useState, useEffect } from 'react';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const storedUser = localStorage.getItem('user');
            const token = localStorage.getItem('token');

            // Simple validation - if one exists, both should exist
            if ((storedUser && !token) || (!storedUser && token)) {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                return null;
            }

            return storedUser ? JSON.parse(storedUser) : null;
        } catch (error) {
            // Silent cleanup of corrupted data
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            return null;
        }
    });

    const [isLoading, setIsLoading] = useState(false);

    // No cross-tab sync to prevent conflicts
    useEffect(() => {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        }
    }, [user]);

    const login = (userData, token) => {
        // Set user first, then localStorage will be updated by useEffect
        setUser(userData);
        if (token) {
            localStorage.setItem('token', token);
        }
    };

    const logout = () => {
        // Clear everything immediately
        setUser(null);
        localStorage.clear(); // Clear all localStorage to prevent any conflicts
    };

    return (
        <UserContext.Provider value={{
            user,
            setUser,
            login,
            logout,
            isLoading,
            setIsLoading
        }}>
            {children}
        </UserContext.Provider>
    );
};