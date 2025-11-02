// In src/pages/LoginPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import Link and useNavigate
import { useAuth } from '../context/AuthContext';
import { User, Lock } from 'react-feather'; // Import icons
import './AuthPage.css'; // Re-use the same shared styles

function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState(''); // State for errors
    const { loginUser } = useAuth(); // Get the login function from context
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoginError(''); // Clear previous errors
        try {
            // Call loginUser from context
            await loginUser(username, password); 
            // On success, AuthContext handles navigation, but we can add a fallback
            // navigate('/'); // AuthContext already does this
        } catch (error) {
            console.error("Login failed:", error);
            // AuthContext's loginUser already shows alerts, 
            // but we can set a state error if we prefer
            setLoginError('Invalid username or password. Please try again.');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                
                {/* --- ADDED Branding Section --- */}
                <div className="auth-branding">
                    <h2>Welcome Back!</h2>
                    <p>Log in to manage your projects and connect with talent.</p>
                </div>
                {/* --- END Branding Section --- */}
                
                {/* --- Form Section --- */}
                <div className="auth-form-container">
                    <form className="auth-form" onSubmit={handleSubmit}>
                        <h3>Log In to Your Account</h3>
                        {/* Show login error if it exists */}
                        {loginError && <p className="auth-error-message">{loginError}</p>}
                        
                        <div className="input-group">
                            <label htmlFor="username">
                                <User size={16} className="label-icon" /> Username
                            </label>
                            <input 
                                id="username"
                                type="text" 
                                name="username" 
                                required 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                            />
                        </div>
                        <div className="input-group">
                            <label htmlFor="password">
                                <Lock size={16} className="label-icon" /> Password
                            </label>
                            <input 
                                id="password"
                                type="password" 
                                name="password" 
                                required 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                            />
                        </div>
                        <button type="submit" className="auth-button">Login</button>
                        <p className="auth-switch">
                            Don't have an account? <Link to="/register">Sign Up</Link>
                        </p>
                    </form>
                </div>
                {/* --- END Form Section --- */}

            </div>
        </div>
    );
}

export default LoginPage;