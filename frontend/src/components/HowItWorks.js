// In frontend/src/components/HowItWorks.js
import React from 'react';
import './HowItWorks.css';

function HowItWorks() {
    return (
        <section className="how-it-works-section">
            <h2 className="section-title">How It Works</h2>
            <div className="steps-container">
                <div className="step-card">
                    <div className="step-icon">1</div>
                    <h3>Post Your Project</h3>
                    <p>Clients describe their project, and freelancers bid for the job.</p>
                </div>
                <div className="step-card">
                    <div className="step-icon">2</div>
                    <h3>Fund the Escrow</h3>
                    <p>The client deposits the project funds into our secure escrow account.</p>
                </div>
                <div className="step-card">
                    <div className="step-icon">3</div>
                    <h3>Work with Confidence</h3>
                    <p>The freelancer completes the work, knowing the payment is secure.</p>
                </div>
                <div className="step-card">
                    <div className="step-icon">4</div>
                    <h3>Release the Funds</h3>
                    <p>Once satisfied, the client approves and releases the payment to the freelancer.</p>
                </div>
            </div>
        </section>
    );
}

export default HowItWorks;