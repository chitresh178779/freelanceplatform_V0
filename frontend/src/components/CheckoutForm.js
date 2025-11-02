// src/components/CheckoutForm.js
import React, { useState, useMemo } from 'react'; // Import useMemo
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useTheme } from '../context/ThemeContext'; // Import the theme hook
import './CheckoutForm.css';

const CheckoutForm = ({ clientSecret, projectTitle, amount, onPaymentSuccess, onPaymentError }) => {
    const stripe = useStripe();
    const elements = useElements();
    const { theme } = useTheme(); // Get the current theme
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // --- Define CardElement options dynamically based on theme ---
    // Use useMemo to prevent re-creating this object on every render
    const cardElementOptions = useMemo(() => {
        const isDark = theme === 'dark';
        
        return {
            style: {
                base: {
                    // --- THE FIX ---
                    color: isDark ? '#E2E8F0' : '#2c3e50', // Light text for dark, dark text for light
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                    fontSmoothing: 'antialiased',
                    fontSize: '16px',
                    '::placeholder': {
                        color: isDark ? '#718096' : '#aab2c0', // Dark placeholder for dark, light for light
                    },
                },
                invalid: {
                    color: '#e53e3e', // Error color (same for both)
                    iconColor: '#e53e3e',
                },
            },
            hidePostalCode: true,
        };
    }, [theme]); // Re-calculate options when theme changes
    // --- END DYNAMIC OPTIONS ---


    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrorMessage('');

        if (!stripe || !elements || !clientSecret) {
            setErrorMessage('Stripe is not ready. Please wait a moment and try again.');
            return;
        }

        setIsProcessing(true);

        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
             setErrorMessage('Card details element not found.');
             setIsProcessing(false);
             return;
        }

        // Confirm the Payment
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: cardElement,
                // billing_details: { name: 'Jenny Rosen' }, // Optional
            },
        });

        if (error) {
            console.error('[stripe error]', error);
            setErrorMessage(error.message || 'An unexpected error occurred.');
            if (onPaymentError) onPaymentError(error.message);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            console.log('[PaymentIntent succeeded]', paymentIntent);
            alert(`Payment of $${(amount / 100).toFixed(2)} for "${projectTitle}" succeeded!`);
             if (onPaymentSuccess) onPaymentSuccess(paymentIntent.id);
        } else if (paymentIntent && paymentIntent.status === 'requires_capture') {
             console.log('[PaymentIntent requires capture]', paymentIntent);
             alert(`Payment authorized for $${(amount / 100).toFixed(2)}. Funds will be released upon project completion.`);
             if (onPaymentSuccess) onPaymentSuccess(paymentIntent.id);
        }
         else {
             const status = paymentIntent?.status ?? 'Unknown';
             setErrorMessage(`Payment status: ${status}. Please try again.`);
             if (onPaymentError) onPaymentError(`Payment status: ${status}`);
         }

        setIsProcessing(false);
    };


    return (
        <form onSubmit={handleSubmit} className="checkout-form">
            <h3 className="checkout-title">Confirm Payment for "{projectTitle}"</h3>
            <p className="checkout-amount">Amount: ${(amount / 100).toFixed(2)}</p>

            <div className="card-element-container">
                 <label htmlFor='card-element'>Card Details</label>
                 {/* Pass the dynamic options to CardElement */}
                 <CardElement id="card-element" options={cardElementOptions} />
            </div>

            {errorMessage && <div className="payment-error">{errorMessage}</div>}

            <button type="submit" disabled={!stripe || isProcessing} className="pay-button">
                {isProcessing ? 'Processing...' : 'Pay Now'}
            </button>
        </form>
    );
};

export default CheckoutForm;