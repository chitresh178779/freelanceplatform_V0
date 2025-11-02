// In src/components/Navbar.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import './Navbar.css';

function Navbar() {
    const { user, logoutUser } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false); // State for DESKTOP dropdown
    const location = useLocation();

    // Toggle mobile menu
    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    // Close mobile menu on navigation
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location]);

    // Handlers to close mobile menu
    const handleMobileLinkClick = () => {
        setIsMobileMenuOpen(false);
    };
    const handleMobileLogout = () => {
        logoutUser();
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="navbar-container">
            <nav className="navbar">
                <Link to="/" className="navbar-brand" onClick={() => setIsMobileMenuOpen(false)}>
                    Dev<span className="navbar-brand-highlight">Port</span>
                </Link>

                {/* Hamburger Button */}
                <button
                    className={`hamburger-button ${isMobileMenuOpen ? 'active' : ''}`}
                    onClick={toggleMobileMenu}
                    aria-label="Toggle navigation menu"
                    aria-expanded={isMobileMenuOpen}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                {/* --- Desktop Navigation Links --- */}
                <div className="navbar-links desktop-links">
                    <Link to="/projects" className="navbar-link">Find Work</Link>
                    <Link to="/profiles" className="navbar-link">Find Members</Link>
                    <Link to="/post" className="navbar-link">Post Project</Link>
                    {user ? (
                        <>
                            {/* --- DESKTOP USER DROPDOWN --- */}
                            <div
                                className="user-menu-container"
                                onMouseEnter={() => setIsDropdownOpen(true)}
                                onMouseLeave={() => setIsDropdownOpen(false)}
                            >
                                <Link to={`/profile/${user.username}`} className="navbar-link navbar-greeting">
                                    Hello, {user.username}!
                                    <span className="dropdown-arrow"> &#9662;</span>
                                </Link>
                                {isDropdownOpen && (
                                    <div className="user-dropdown">
                                        <Link to={`/profile/${user.username}`} className="dropdown-link">View Profile</Link>
                                        <Link to="/profile/edit" className="dropdown-link">Edit Profile</Link>
                                        <Link to="/dashboard/my-projects" className="dropdown-link">My Projects</Link>
                                        {user.role === 'FREELANCER' && (
                                            <Link to="/dashboard/my-bids" className="dropdown-link">My Bids</Link>
                                        )}
                                        <Link to="/chat" className="dropdown-link">Messages</Link>
                                        <button onClick={logoutUser} className="dropdown-link logout-dropdown-btn">Logout</button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="navbar-link login-btn">Login</Link>
                            <Link to="/register" className="navbar-link register-btn">Sign Up</Link>
                        </>
                    )}
                    <ThemeToggle />
                </div>
            </nav>

            {/* --- Mobile Menu --- */}
            <div className={`mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
                 <Link to="/projects" className="navbar-link" onClick={handleMobileLinkClick}>Find Work</Link>
                 <Link to="/profiles" className="navbar-link" onClick={handleMobileLinkClick}>Find Members</Link>
                 <Link to="/post" className="navbar-link" onClick={handleMobileLinkClick}>Post Project</Link>
                 {user ? (
                     <>
                         <Link to={`/profile/${user.username}`} className="navbar-link" onClick={handleMobileLinkClick}>View Profile</Link>
                         <Link to="/profile/edit" className="navbar-link" onClick={handleMobileLinkClick}>Edit Profile</Link>
                         <Link to="/dashboard/my-projects" className="navbar-link" onClick={handleMobileLinkClick}>My Projects</Link>
                         {user.role === 'FREELANCER' && (
                             <Link to="/dashboard/my-bids" className="navbar-link" onClick={handleMobileLinkClick}>My Bids</Link>
                         )}
                         <Link to="/chat" className="navbar-link" onClick={handleMobileLinkClick}>Messages</Link>
                         <button onClick={handleMobileLogout} className="navbar-link logout-btn">Logout</button>
                     </>
                 ) : (
                     <>
                         <Link to="/login" className="navbar-link login-btn" onClick={handleMobileLinkClick}>Login</Link>
                         <Link to="/register" className="navbar-link register-btn" onClick={handleMobileLinkClick}>Sign Up</Link>
                     </>
                 )}
                 <div className="mobile-theme-toggle">
                     <ThemeToggle />
                 </div>
             </div>
        </div>
    );
}

export default Navbar;