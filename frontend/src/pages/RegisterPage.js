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
    const [errors, setErrors] = useState({}); // State to hold validation errors
    const navigate = useNavigate();
    const { user } = useAuth(); // Check if user is already logged in

    // Redirect if user is already logged in
    if (user) {
        navigate('/'); // Redirect to home if already logged in
    }

    // --- Validation Function ---
    const validateForm = () => {
        const newErrors = {};
        let isValid = true;

        // 1. Name Validation (Only alphabets and spaces)
        if (!/^[a-zA-Z\s]+$/.test(formData.name)) {
            newErrors.name = 'Name must contain only alphabets and spaces.';
            isValid = false;
        }

        // 2. Email Validation (Basic format)
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address.';
            isValid = false;
        }

        // 3. Password Validation (Strong password)
        // Min 8 characters, at least one uppercase, one lowercase, one number
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/.test(formData.password)) {
            newErrors.password = 'Password must be 8+ characters, with at least one uppercase letter, one lowercase letter, and one number.';
            isValid = false;
        }
        
        // 4. Username validation (basic)
        if (formData.username.length < 3) {
             newErrors.username = 'Username must be at least 3 characters long.';
             isValid = false;
        }

        setErrors(newErrors); // Update the errors state
        return isValid;
    };
    // --- End Validation ---


    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // Clear error for the field being edited
        if (errors[e.target.name]) {
            setErrors(prev => ({ ...prev, [e.target.name]: null }));
        }
        // Clear backend error when user starts typing again
        if (errors.backend) {
             setErrors(prev => ({ ...prev, backend: null }));
        }
    };

    // Specific handler for Name to prevent numbers
    const handleNameChange = (e) => {
        const value = e.target.value;
        // Only update state if the value is alphabetic/space or empty
        if (/^[a-zA-Z\s]*$/.test(value)) {
            setFormData({ ...formData, name: value });
        }
        if (errors.name) {
            setErrors(prev => ({ ...prev, name: null }));
        }
    };

    const handleRoleSelect = (selectedRole) => {
        setFormData({ ...formData, role: selectedRole });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({}); // Clear all previous errors
        
        // --- Run validation before submitting ---
        if (!validateForm()) {
            console.log("Form validation failed.");
            return; // Stop submission if validation fails
        }
        // --- End Validation Check ---

        try {
            // Send only relevant data
            const { username, name, email, password, role } = formData;
            const response = await axios.post('http://127.0.0.1:8000/api/register/', {
                username, name, email, password, role
            });
            
            console.log(response.data);
            alert('Registration successful! Please log in.');
            navigate('/login'); // Redirect to login page on success

        } catch (error) {
            console.error('Registration failed!', error);
            if (error.response?.data) {
                // Handle backend errors (e.g., "username already exists")
                const backendErrors = error.response.data;
                const errorMsg = Object.entries(backendErrors).map(([key, value]) => 
                    // Format error nicely: "Username: This username already exists."
                    `${key.charAt(0).toUpperCase() + key.slice(1)}: ${Array.isArray(value) ? value.join(' ') : value}`
                ).join('\n');
                // Set a general backend error to display
                setErrors(prev => ({ ...prev, backend: errorMsg })); 
            } else if (error.request) {
                 setErrors(prev => ({ ...prev, backend: 'No response from server. Is it running?' }));
            } else {
                 setErrors(prev => ({ ...prev, backend: `An error occurred: ${error.message}` }));
            }
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                
                {/* --- Branding Section (Left Side) --- */}
                <div className="auth-branding">
                    <h2>Join DevPort</h2>
                    <p>Find your next project or connect with expert talent securely.</p>
                </div>
                {/* --- END Branding Section --- */}

                {/* --- Form Section (Right Side) --- */}
                <div className="auth-form-container">
                    <form className="auth-form" onSubmit={handleSubmit}>
                        <h3>Create Your Account</h3>
                        
                        {/* Display general/backend errors */}
                        {errors.backend && <p className="auth-error-message" style={{ whiteSpace: 'pre-wrap' }}>{errors.backend}</p>}

                        <div className="input-group">
                            <label htmlFor="username">Username</label>
                            <input 
                                id="username" 
                                type="text" 
                                name="username" 
                                value={formData.username} 
                                onChange={handleChange} 
                                required 
                            />
                            {errors.username && <p className="form-error-text">{errors.username}</p>}
                        </div>
                        <div className="input-group">
                            <label htmlFor="name">Full Name</label>
                            <input 
                                id="name" 
                                type="text" 
                                name="name" 
                                value={formData.name} 
                                onChange={handleNameChange} // Use custom handler
                                required 
                            />
                            {errors.name && <p className="form-error-text">{errors.name}</p>}
                        </div>
                        <div className="input-group">
                            <label htmlFor="email">Email</label>
                            <input 
                                id="email" 
                                type="email" 
                                name="email" 
                                value={formData.email} 
                                onChange={handleChange} 
                                required 
                            />
                            {errors.email && <p className="form-error-text">{errors.email}</p>}
                        </div>
                        <div className="input-group">
                            <label htmlFor="password">Password</label>
                            <input 
                                id="password" 
                                type="password" 
                                name="password" 
                                value={formData.password} 
                                onChange={handleChange} 
                                required 
                            />
                            {errors.password && <p className="form-error-text">{errors.password}</p>}
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