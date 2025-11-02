// In src/pages/ManageBidsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './ManageBidsPage.css';

function ManageBidsPage() {
    const { projectId } = useParams();
    const [bids, setBids] = useState([]);
    const [projectTitle, setProjectTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');
    const { user, authTokens, logoutUser } = useAuth();
    const navigate = useNavigate();

    const fetchBids = useCallback(async () => {
        if (!authTokens || !user || user.role !== 'CLIENT') {
            setError('Access denied. Only the project owner can manage bids.');
            setLoading(false);
            return;
        }
        setLoading(true); setError(''); setActionError('');
        try {
            const authHeader = { headers: { 'Authorization': `Bearer ${authTokens.access}` } };
            const projectResponse = await axios.get(`http://127.0.0.1:8000/api/projects/${projectId}/`, authHeader);
            if (String(projectResponse.data.client) !== String(user.user_id)) {
                 setError('Access denied. You do not own this project.');
                 setLoading(false);
                 return;
            }
            setProjectTitle(projectResponse.data.title);
            const bidsResponse = await axios.get(`http://127.0.0.1:8000/api/projects/${projectId}/bids/`, authHeader);
            setBids(bidsResponse.data.results || bidsResponse.data);
        } catch (err) {
             console.error("Error fetching bids:", err);
             if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                 setError('Authentication error. Please log in again.');
                 logoutUser();
             } else if (err.response && err.response.status === 404) {
                  setError('Project not found.');
             } else {
                 setError('Failed to load bids. Please try again.');
             }
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId, authTokens, user]);

    useEffect(() => {
        fetchBids();
    }, [fetchBids]);

    const handleBidAction = async (bidId, action) => {
        setActionError('');
        const newStatus = action === 'accept' ? 'accepted' : 'rejected';
        try {
            await axios.patch(
                `http://127.0.0.1:8000/api/bids/${bidId}/`,
                { status: newStatus },
                { headers: { 'Authorization': `Bearer ${authTokens.access}` } }
            );
            fetchBids(); // Refresh list
            if (newStatus === 'accepted') {
                navigate(`/projects/${projectId}`); // Navigate back on acceptance
            }
        } catch (err) {
            console.error(`Error ${action}ing bid:`, err.response?.data || err.message);
            let errorMsg = `Failed to ${action} bid.`;
            if (err.response?.data?.detail) { errorMsg += ` ${err.response.data.detail}`; }
            setActionError(errorMsg);
             if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                 logoutUser();
             }
        }
    };

    if (loading) return <div className="loading-message">Loading bids...</div>;
    if (error) return <div className="error-message">{error}</div>;

    const pendingBids = bids.filter(bid => bid.status === 'pending');
    const otherBids = bids.filter(bid => bid.status !== 'pending');

    return (
        <div className="manage-bids-container">
            <h1 className="page-title">Manage Bids for "{projectTitle}"</h1>
            {actionError && <p className="action-error-message">{actionError}</p>}
            {bids.length === 0 && !loading && (
                 <p className="empty-message">No bids have been placed on this project yet.</p>
            )}
            {pendingBids.length > 0 && <h2>Pending Bids</h2>}
            <div className="bid-list">
                {pendingBids.map(bid => (
                    <div key={bid.id} className="manage-bid-card pending">
                         <div className="bid-card-main">
                             <div className="bidder-info">
                                 <Link to={`/profile/${bid.freelancer_username}`} className="freelancer-link">
                                     {bid.freelancer_username}
                                 </Link>
                                 <span className="bid-date">
                                     {new Date(bid.created_at).toLocaleString()}
                                 </span>
                             </div>
                             <p className="bid-proposal-text">{bid.proposal}</p>
                         </div>
                         <div className="bid-card-aside">
                             <span className="manage-bid-amount">${parseFloat(bid.amount).toFixed(2)}</span>
                             <div className="bid-actions">
                                 <button onClick={() => handleBidAction(bid.id, 'accept')} className="action-button accept-button"> Accept </button>
                                 <button onClick={() => handleBidAction(bid.id, 'reject')} className="action-button reject-button"> Reject </button>
                             </div>
                         </div>
                    </div>
                ))}
            </div>
            {otherBids.length > 0 && <h2 className="other-bids-title">Other Bids</h2>}
             <div className="bid-list">
                 {otherBids.map(bid => (
                    <div key={bid.id} className={`manage-bid-card ${bid.status}`}>
                         <div className="bid-card-main">
                             <div className="bidder-info">
                                 <Link to={`/profile/${bid.freelancer_username}`} className="freelancer-link">
                                     {bid.freelancer_username}
                                 </Link>
                                 <span className="bid-date">
                                     {new Date(bid.created_at).toLocaleString()}
                                 </span>
                             </div>
                             <p className="bid-proposal-text">{bid.proposal}</p>
                         </div>
                         <div className="bid-card-aside">
                             <span className="manage-bid-amount">${parseFloat(bid.amount).toFixed(2)}</span>
                             <span className={`bid-final-status status-${bid.status}`}>
                                 {bid.status}
                            </span>
                         </div>
                    </div>
                ))}
            </div>
            <Link to={`/projects/${projectId}`} className="back-link">&larr; Back to Project Details</Link>
        </div>
    );
}

export default ManageBidsPage;