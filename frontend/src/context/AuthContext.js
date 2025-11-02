// In frontend/src/context/AuthContext.js
import React, { createContext, useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    // Check localStorage for existing tokens on app load
    const [authTokens, setAuthTokens] = useState(() => 
        localStorage.getItem('authTokens') 
        ? JSON.parse(localStorage.getItem('authTokens')) 
        : null
    );
    const [user, setUser] = useState(() => 
        localStorage.getItem('authTokens') 
        ? parseJwt(JSON.parse(localStorage.getItem('authTokens')).access) 
        : null
    );

    const navigate = useNavigate();

    const loginUser = async (username, password) => {
        try {
            const response = await axios.post('http://127.0.0.1:8000/api/token/', {
                username,
                password
            });
            
            if (response.status === 200) {
                const data = response.data;
                setAuthTokens(data);
                setUser(parseJwt(data.access));
                
                // Store tokens securely in localStorage
                localStorage.setItem('authTokens', JSON.stringify(data));
                
                navigate('/'); // Redirect to homepage on successful login
            }
        } catch (error) {
            console.error('Login failed!', error);
            if (error.response && error.response.status === 401) {
                alert('Invalid username or password.');
            } else {
                alert('Login failed. Please try again later.');
            }
        }
    };

    const logoutUser = () => {
        setAuthTokens(null);
        setUser(null);
        localStorage.removeItem('authTokens');
        navigate('/login'); // Redirect to login page on logout
    };

    const contextData = {
        user: user,
        authTokens: authTokens,
        loginUser: loginUser,
        logoutUser: logoutUser,
    };

    return (
        <AuthContext.Provider value={contextData}>
            {children}
        </AuthContext.Provider>
    );
};

// Helper function to parse JWT and get user info
const parseJwt = (token) => {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
        return null;
    }
};

export default AuthContext;