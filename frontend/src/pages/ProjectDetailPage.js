// In src/pages/ProjectDetailPage.js
import React, { useState, useEffect, useCallback } from 'react'; // Import useCallback
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios'; // Using basic axios
import { useAuth } from '../context/AuthContext';
import CheckoutForm from '../components/CheckoutForm'; // Import CheckoutForm
import './ProjectDetailPage.css'; // Ensure CSS is updated too

function ProjectDetailPage() {
    const { projectId } = useParams();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user, authTokens, logoutUser } = useAuth();
    const navigate = useNavigate();

    // State for Bid Form
    const [showBidForm, setShowBidForm] = useState(false);
    const [bidAmount, setBidAmount] = useState('');
    const [bidProposal, setBidProposal] = useState('');
    const [bidError, setBidError] = useState('');
    const [isSubmittingBid, setIsSubmittingBid] = useState(false);

    // State for Payment/Funding
    const [clientSecret, setClientSecret] = useState('');
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentError, setPaymentError] = useState('');
    const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);

    // State for Release Payment
    const [isReleasingPayment, setIsReleasingPayment] = useState(false);
    const [releaseError, setReleaseError] = useState('');

    // --- NEW: States for Work Submission ---
    const [submissionNotes, setSubmissionNotes] = useState('');
    const [submissionFile, setSubmissionFile] = useState(null);
    const [isSubmittingWork, setIsSubmittingWork] = useState(false);
    const [submissionError, setSubmissionError] = useState('');

    // --- Wrap fetchProject in useCallback ---
    const fetchProject = useCallback(async () => {
        setLoading(true); setError(null);
        setShowPaymentForm(false);
        setClientSecret('');
        setPaymentError('');
        setReleaseError('');
        setShowBidForm(false);
        setBidError('');
        try {
            const response = await axios.get(`http://127.0.0.1:8000/api/projects/${projectId}/`);
            setProject(response.data);
        } catch (err) {
             console.error("Error fetching project details:", err);
             if (err.response && err.response.status === 404) {
                setError("Project not found.");
             } else {
                setError("Failed to load project details. Please try again later.");
             }
        } finally {
            setLoading(false);
        }
    }, [projectId]); // Depend on projectId
    // --- End useCallback ---

    // Initial fetch
    useEffect(() => {
        fetchProject();
    }, [fetchProject]); // Use fetchProject as dependency

    // Handler to initiate the funding process
    const handleFundProject = async () => {
        if (!authTokens || !user || !project || String(user.user_id) !== String(project.client)) {
            setPaymentError('Only the project owner can fund this project.'); return;
        }
         if (project.status !== 'IN_PROGRESS') {
             setPaymentError('Project must be in progress (freelancer assigned) before funding.'); return;
         }
         if (project.payment_intent_id && !clientSecret) {
            setPaymentError('Funding already initiated. Retrieving payment details...');
            // Attempt to retrieve existing secret
            try {
                const response = await axios.post(
                    `http://127.0.0.1:8000/api/projects/${projectId}/fund/`, {},
                    { headers: { 'Authorization': `Bearer ${authTokens.access}` } }
                );
                setClientSecret(response.data.clientSecret);
                setShowPaymentForm(true); // Show checkout
            } catch (err) {
                 setPaymentError('Could not retrieve payment details. Please refresh.');
            }
            return;
         }

        setPaymentError('');
        setIsInitiatingPayment(true);
        try {
            const response = await axios.post(
                `http://127.0.0.1:8000/api/projects/${projectId}/fund/`,
                {}, { headers: { 'Authorization': `Bearer ${authTokens.access}` } }
            );
            setClientSecret(response.data.clientSecret);
            setShowPaymentForm(true);
        } catch (err) {
             console.error("Error initiating funding:", err.response?.data || err.message);
             const errorMsg = err.response?.data?.error || 'Could not initiate funding. Ensure freelancer has completed Stripe onboarding.';
             setPaymentError(errorMsg);
             if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                 logoutUser(); navigate('/login');
             }
        } finally {
            setIsInitiatingPayment(false);
        }
    };

    // Callback when payment is successfully confirmed
    const handlePaymentSuccess = (paymentIntentId) => {
        setShowPaymentForm(false);
        setClientSecret('');
        alert("Payment successful! Project is funded.");
        fetchProject(); // Re-fetch project data
    };

    // Callback for payment errors
    const handlePaymentError = (errorMessage) => {
        console.error("Payment failed in CheckoutForm:", errorMessage);
        setPaymentError(`Payment failed: ${errorMessage}`);
    };

    // Handler for Bid Submission
    const handleBidSubmit = async (e) => {
        e.preventDefault();
        setBidError(''); setIsSubmittingBid(true);
        if (!authTokens || !user || user.role !== 'FREELANCER') { setBidError('Must be logged in as Freelancer.'); setIsSubmittingBid(false); return; }
        if (!bidAmount || parseFloat(bidAmount) <= 0) { setBidError('Invalid bid amount.'); setIsSubmittingBid(false); return; }
        if (!bidProposal.trim()) { setBidError('Proposal required.'); setIsSubmittingBid(false); return; }

        try {
            await axios.post(
                `http://127.0.0.1:8000/api/projects/${projectId}/bid/`,
                { amount: bidAmount, proposal: bidProposal },
                { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authTokens.access}` } }
            );
            alert('Bid submitted successfully!');
            setShowBidForm(false); setBidAmount(''); setBidProposal('');
        } catch (err) {
            console.error("Error submitting bid:", err.response?.data || err.message);
            let errorMessage = 'Failed to submit bid. Please try again.';
            if (err.response?.data) {
                const responseData = err.response.data;
                if (typeof responseData === 'string') { errorMessage = responseData; }
                else if (responseData.detail) { errorMessage = responseData.detail; }
                else if (responseData.non_field_errors && Array.isArray(responseData.non_field_errors)) { errorMessage = responseData.non_field_errors.join(' '); }
                else if (typeof responseData === 'object') { errorMessage = Object.values(responseData).flat().join(' '); }
            }
            setBidError(errorMessage);
            if (err.response && (err.response.status === 401 || err.response.status === 403)) { logoutUser(); }
        } finally {
            setIsSubmittingBid(false);
        }
    };

    // Handle Release Payment
    const handleReleasePayment = async () => {
        if (!authTokens || !user || !project || String(user.user_id) !== String(project.client)) { setReleaseError('Only owner can release payment.'); return; }
        if (project.status !== 'IN_PROGRESS') { setReleaseError('Project not in progress.'); return; }
        if (!project.payment_intent_id) { setReleaseError('Project has not been funded.'); return; }

        setReleaseError('');
        setIsReleasingPayment(true);
        try {
            const response = await axios.post(
                `http://127.0.0.1:8000/api/projects/${projectId}/release/`,
                {}, { headers: { 'Authorization': `Bearer ${authTokens.access}` } }
            );
            alert(response.data.message || 'Payment released successfully!');
            fetchProject(); // Re-fetch project data
        } catch (err) {
            console.error("Error releasing payment:", err.response?.data || err.message);
            const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Could not release payment.';
            setReleaseError(errorMsg);
             if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                 logoutUser(); navigate('/login');
             }
        } finally {
            setIsReleasingPayment(false);
        }
    };

    const handleWorkSubmit = async (e) => {
        e.preventDefault();
        if (!submissionNotes && !submissionFile) {
            setSubmissionError('You must provide either notes or a file for submission.');
            return;
        }
        
        setIsSubmittingWork(true);
        setSubmissionError('');

        const formData = new FormData();
        formData.append('submission_notes', submissionNotes);
        if (submissionFile) {
            formData.append('submission_file', submissionFile);
        }

        try {
            await axios.patch( // Use PATCH to update
                `http://127.0.0.1:8000/api/projects/${projectId}/submit/`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${authTokens.access}`,
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );
            alert('Work submitted successfully! The client will be notified.');
            fetchProject(); // Refresh project data to show new status
        } catch (err) {
            console.error("Error submitting work:", err.response?.data || err.message);
            const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Could not submit work.';
            setSubmissionError(errorMsg);
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                 logoutUser();
                 navigate('/login');
            }
        } finally {
            setIsSubmittingWork(false);
        }
    };

    // --- Render Logic ---
    if (loading) return <div className="loading-message">Loading project...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!project) return <div className="no-projects-message">Project not found.</div>;

    const formattedBudget = project.budget ? parseFloat(project.budget).toFixed(2) : 'N/A';
    const categoryDisplay = project.category ? project.category.replace(/^\w/, c => c.toUpperCase()) : 'N/A';
    const canBid = user && user.role === 'FREELANCER' && project?.status === 'OPEN' && !project?.freelancer;
    const isOwner = user && String(user.user_id) === String(project?.client);
    const isAssignedFreelancer = user && String(user.user_id) === String(project?.freelancer);
    const canFund = isOwner && project?.status === 'IN_PROGRESS' && !project?.payment_intent_id;
    const isFunded = project?.payment_intent_id && project.status === 'IN_PROGRESS';
    const canRelease = isOwner && project?.status === 'IN_PROGRESS' && project?.payment_intent_id;
    const canSubmitWork = isAssignedFreelancer && project?.status === 'IN_PROGRESS' && project?.payment_intent_id;


     return (
        <div className="project-detail-container">
            <div className="project-detail-card">
                {/* Project Header */}
                <div className="detail-header">
                    <h1>{project.title}</h1>
                    <span className={`detail-status status-${project?.status?.toLowerCase()}`}>
                        {project?.status?.replace('_', ' ') || 'Unknown'}
                    </span>
                </div>
                 {/* Budget Line */}
                 <div className="detail-budget-line">
                     Budget: <span className="detail-budget">${formattedBudget}</span>
                 </div>
                {/* Meta Info */}
                <div className="detail-meta">
                    <span>Category: <span className="meta-value">{categoryDisplay}</span></span>
                    <span>Posted by: <Link to={`/profile/${project.client_username}`} className="meta-value username-link">{project.client_username}</Link></span>
                    <span>Posted on: <span className="meta-value">{new Date(project.created_at).toLocaleDateString()}</span></span>
                </div>
                 {/* Assigned Freelancer Display */}
                 {project?.freelancer_username && project?.status !== 'OPEN' && (
                     <div className="detail-assigned-freelancer">
                          Assigned to:
                          <Link to={`/profile/${project.freelancer_username}`} className="meta-value username-link">
                               {project.freelancer_username}
                          </Link>
                     </div>
                 )}
                 {/* Manage Bids Link */}
                 {isOwner && project?.status === 'OPEN' && (
                     <div className="manage-bids-link-container">
                         <Link to={`/projects/${projectId}/manage-bids`} className="manage-bids-button"> Manage Bids </Link>
                     </div>
                 )}

                 {/* Funding Section */}
                 <div className="funding-section">
                    {paymentError && <p className="error-message">{paymentError}</p>}
                    {canFund && !showPaymentForm && (
                        <button onClick={handleFundProject} className="fund-project-button" disabled={isInitiatingPayment}>
                            {isInitiatingPayment ? 'Initiating...' : 'Fund Project Escrow'}
                        </button>
                    )}
                    {showPaymentForm && clientSecret && project && (
                         <CheckoutForm
                             clientSecret={clientSecret}
                             projectTitle={project.title}
                             amount={parseInt(Number(project.budget || 0) * 100)}
                             onPaymentSuccess={handlePaymentSuccess}
                             onPaymentError={handlePaymentError}
                        />
                    )}
                    {isFunded && (
                        <p className="funding-info-message">✔ Project Escrow Funded. Waiting for completion.</p>
                    )}
                 </div>
                    {/* --- Submit Work Section (for Freelancer) --- */}
                    {canSubmitWork && (
                        <div className="submission-section">
                            <hr className="divider" />
                            <h2>Submit Your Work</h2>
                            <p>The project is funded. Submit your work and notes for the client to review.</p>
                            <form className="submission-form" onSubmit={handleWorkSubmit}>
                                {submissionError && <p className="error-message">{submissionError}</p>}
                                <div className="form-group">
                                    <label htmlFor="submission_notes">Submission Notes (Optional)</label>
                                    <textarea
                                        id="submission_notes"
                                        rows="5"
                                        value={submissionNotes}
                                        onChange={(e) => setSubmissionNotes(e.target.value)}
                                        placeholder="Add any notes for the client, links to live previews, etc."
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="submission_file">Attach File (Optional)</label>
                                    <input
                                        id="submission_file"
                                        type="file"
                                        onChange={(e) => setSubmissionFile(e.target.files[0])}
                                        className="file-input-simple"
                                    />
                                </div>
                                <button type="submit" className="submit-work-button" disabled={isSubmittingWork}>
                                    {isSubmittingWork ? 'Submitting...' : 'Submit Work for Approval'}
                                </button>
                            </form>
                        </div>
                    )}

                 {/* Release Payment Section */}
                 {canRelease && (
                    <div className="release-payment-section">
                         <hr className="divider" />
                         {releaseError && <p className="error-message">{releaseError}</p>}
                         <p className="release-info-text">
                             Once you have reviewed and approved the freelancer's work, you can release the payment held in escrow.
                         </p>
                         <button
                             onClick={handleReleasePayment}
                             className="release-payment-button"
                             disabled={isReleasingPayment}
                         >
                             {isReleasingPayment ? 'Releasing...' : 'Approve & Release Payment'}
                         </button>
                    </div>
                 )}

                <hr className="divider" />

                {/* Description */}
                <div className="detail-description">
                    <h2>Description</h2>
                    <p style={{ whiteSpace: 'pre-wrap' }}>{project.description}</p>
                </div>
                {/* Skills */}
                {project.skills_required && (
                    <div className="detail-skills">
                        <h2>Skills Required</h2>
                        <div className="skills-list">
                            {project.skills_required.split(',').map(skill => skill.trim()).filter(skill => skill).map((skill, index) => (
                                <span key={index} className="skill-tag">{skill}</span>
                            ))}
                        </div>
                    </div>
                 )}

                {/* Bid Section */}
                <div className="bid-section">
                    {canBid && !showBidForm && (
                        <div className="detail-actions">
                            <button className="bid-button-large" onClick={() => setShowBidForm(true)}> Place Bid </button>
                        </div>
                    )}
                    {canBid && showBidForm && (
                         <form className="bid-form" onSubmit={handleBidSubmit}>
                            <h3>Your Proposal</h3>
                             {bidError && <p className="bid-error-message">{bidError}</p>}
                            <div className="form-group">
                                <label htmlFor="bidAmount">Bid Amount ($)</label>
                                <input id="bidAmount" type="number" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} required min="0.01" step="0.01" placeholder="e.g., 450.00" />
                            </div>
                            <div className="form-group">
                                <label htmlFor="bidProposal">Proposal Details</label>
                                <textarea id="bidProposal" value={bidProposal} onChange={(e) => setBidProposal(e.target.value)} required rows="5" placeholder="Explain why you're the best fit..." />
                            </div>
                            <div className="bid-form-actions">
                                <button type="submit" className="submit-bid-button" disabled={isSubmittingBid}> {isSubmittingBid ? 'Submitting...' : 'Submit Bid'} </button>
                                <button type="button" className="cancel-bid-button" onClick={() => setShowBidForm(false)} disabled={isSubmittingBid}> Cancel </button>
                            </div>
                        </form>
                    )}
                    {user && user.role !== 'FREELANCER' && project?.status === 'OPEN' && ( <p className="bid-info-message">Only freelancers can place bids.</p> )}
                    {project?.status !== 'OPEN' && ( <p className="bid-info-message">This project is currently {project?.status?.replace('_',' ')}. Bidding is closed.</p> )}
                </div>

                <Link to="/projects" className="back-link">&larr; Back to Projects</Link>
            </div>
        </div>
    );
}

export default ProjectDetailPage;