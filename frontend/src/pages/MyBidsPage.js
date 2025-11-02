// In src/pages/MyBidsPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './DashboardPages.css'; 
import './MyBidsPage.css'; // Specific CSS

function MyBidsPage() {
    const [bids, setBids] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { authTokens, user, logoutUser } = useAuth();

    // Hooks must be called at the top
    useEffect(() => {
        // Only fetch if user is logged in and is a freelancer
        if (user && user.role === 'FREELANCER' && authTokens) {
            const fetchMyBids = async () => {
                setLoading(true);
                setError('');
                try {
                    const response = await axios.get('http://127.0.0.1:8000/api/dashboard/my-bids/', {
                        headers: { 'Authorization': `Bearer ${authTokens.access}` },
                    });
                    setBids(response.data.results || response.data);
                } catch (err) {
                    console.error("Error fetching my bids:", err);
                     if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                         logoutUser(); 
                     }
                    setError('Failed to load your bids. Please try again.');
                } finally {
                    setLoading(false);
                }
            };
            fetchMyBids();
        } else if (user && user.role !== 'FREELANCER') {
            // Don't fetch, just stop loading (redirect handles display)
             setLoading(false);
        } else if (!user) {
             // Don't fetch, just stop loading (redirect handles display)
             setLoading(false);
        }
    }, [authTokens, user, logoutUser]);

    // Conditional returns *after* hooks
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    if (user.role !== 'FREELANCER') {
        return <Navigate to="/" replace />; // Redirect non-freelancers to home
    }

    return (
        <div className="dashboard-page-container my-bids-page">
            <h1 className="dashboard-title">My Bids</h1>
            {loading && <p className="loading-message">Loading bids...</p>}
            {error && <p className="error-message">{error}</p>}
            {!loading && !error && (
                <div className="dashboard-list bid-list">
                    {bids.length > 0 ? (
                        bids.map(bid => (
                            <div key={bid.id} className="bid-card">
                                <div className="bid-card-header">
                                    <Link to={`/projects/${bid.project}`} className="bid-project-title">
                                        View Project
                                    </Link>
                                    <span className="bid-amount">${parseFloat(bid.amount).toFixed(2)}</span>
                                </div>
                                <p className="bid-proposal">{bid.proposal}</p>
                                <div className="bid-card-footer">
                                    <span className={`bid-status status-${bid.status}`}>
                                        Status: {bid.status}
                                    </span>
                                    <span className="bid-date">
                                        Submitted: {new Date(bid.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="empty-message">You haven't placed any bids yet.</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default MyBidsPage;