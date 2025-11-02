// In src/pages/RegisterPage.js
import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import { useAuth } from '../context/AuthContext'; // Import useAuth
import './AuthPage.css'; // Shared CSS

function RegisterPage() {
    const [formData, setFormData] = useState({
        username: '',
        name: '',
        email: '',
        password: '',
        role: 'FREELANCER', // Default role
    });
    const navigate = useNavigate(); // Hook for navigation

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Specific handler for role selection
    const handleRoleSelect = (selectedRole) => {
        setFormData({ ...formData, role: selectedRole });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://127.0.0.1:8000/api/register/', formData);
            console.log(response.data);
            alert('Registration successful! Please log in.');
            navigate('/login'); // Redirect to login page on success
        } catch (error) {
            console.error('Registration failed!', error);
            if (error.response?.data) {
                // Format error message from backend
                const errorMsg = Object.values(error.response.data).flat().join(' ');
                alert('Error: ' + errorMsg);
            } else if (error.request) {
                alert('Error: No response from server. Is the backend running?');
            } else {
                alert('Error: ' + error.message);
            }
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                
                {/* --- ADDED Branding Section --- */}
                <div className="auth-branding">
                    <h2>Join DevPort</h2>
                    <p>Find your next project or connect with expert talent securely.</p>
                </div>
                {/* --- END Branding Section --- */}

                {/* --- Form Section --- */}
                <div className="auth-form-container">
                    <form className="auth-form" onSubmit={handleSubmit}>
                        <h3>Create Your Account</h3>
                        {/* Input Groups remain the same */}
                        <div className="input-group">
                            <label htmlFor="username">Username</label>
                            <input id="username" type="text" name="username" value={formData.username} onChange={handleChange} required />
                        </div>
                        <div className="input-group">
                            <label htmlFor="name">Full Name</label>
                            <input id="name" type="text" name="name" value={formData.name} onChange={handleChange} required />
                        </div>
                        <div className="input-group">
                            <label htmlFor="email">Email</label>
                            <input id="email" type="email" name="email" value={formData.email} onChange={handleChange} required />
                        </div>
                        <div className="input-group">
                            <label htmlFor="password">Password</label>
                            <input id="password" type="password" name="password" value={formData.password} onChange={handleChange} required />
                        </div>

                        {/* --- Role Selection --- */}
                        <div className="input-group role-selection-group">
                            <label>I want to:</label>
                            <div className="role-options">
                                <div
                                    className={`role-option ${formData.role === 'FREELANCER' ? 'active' : ''}`}
                                    onClick={() => handleRoleSelect('FREELANCER')}
                                    role="button" 
                                    tabIndex="0" 
                                    onKeyDown={(e) => e.key === 'Enter' && handleRoleSelect('FREELANCER')}
                                >
                                    <span className="role-title">Find Work</span>
                                    <span className="role-subtitle">Freelancer</span>
                                </div>
                                <div
                                    className={`role-option ${formData.role === 'CLIENT' ? 'active' : ''}`}
                                    onClick={() => handleRoleSelect('CLIENT')}
                                    role="button"
                                    tabIndex="0"
                                    onKeyDown={(e) => e.key === 'Enter' && handleRoleSelect('CLIENT')}
                                >
                                    <span className="role-title">Hire Talent</span>
                                    <span className="role-subtitle">Client</span>
                                </div>
                            </div>
                        </div>
                        {/* --- END Role Selection --- */}

                        <button type="submit" className="auth-button">Sign Up</button>
                        <p className="auth-switch">
                            Already have an account? <Link to="/login">Log In</Link>
                        </p>
                    </form>
                </div>
                {/* --- END Form Section --- */}

            </div>
        </div>
    );
}

export default RegisterPage;