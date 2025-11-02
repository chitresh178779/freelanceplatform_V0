// In frontend/src/components/Hero.js
import React from 'react';
import { Link } from 'react-router-dom';
import './Hero.css';

function Hero() {
    return (
        <div className="hero-container">
            <h1 className="hero-title">Find Your Expert. Secure Your Project.</h1>
            <p className="hero-subtitle">
                The only freelance platform that protects you with a secure, transparent escrow system from start to finish.
            </p>
            <div className="hero-buttons">
                <Link to="/projects" className="hero-btn primary">Find Work</Link>
                <Link to="/post" className="hero-btn secondary">Post a Project</Link>
            </div>
        </div>
    );
}

export default Hero;