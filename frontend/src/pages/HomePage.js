// In frontend/src/pages/HomePage.js
import React from 'react';
import Hero from '../components/Hero';
import HowItWorks from '../components/HowItWorks';

function HomePage() {
    return (
        // We use a Fragment (<>) to return multiple components
        <> 
            <Hero />
            <HowItWorks />
        </>
    );
}

export default HomePage;