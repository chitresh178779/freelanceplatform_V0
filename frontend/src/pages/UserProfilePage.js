// In src/pages/UserProfilePage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios'; // Using basic axios
import { useAuth } from '../context/AuthContext'; // Import useAuth
// Import icons
import { Briefcase, Link as LinkIcon, Clock, DollarSign, MessageCircle } from 'react-feather';
import './UserProfilePage.css'; // We'll create this CSS next

function UserProfilePage() {
    const { username } = useParams(); // Get username from URL
    const { user, authTokens, logoutUser } = useAuth(); // Get logged-in user
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // --- State for Follow logic ---
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [isProcessingFollow, setIsProcessingFollow] = useState(false); // Prevent double clicks
    // --- End Follow State ---

    // Fetch profile data (wrapped in useCallback)
    const fetchProfile = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Must send auth token for the API to know "who is asking"
            // This allows 'is_following' to be calculated
            const headers = authTokens 
                ? { 'Authorization': `Bearer ${authTokens.access}` } 
                : {};
                
            const response = await axios.get(`http://127.0.0.1:8000/api/profiles/${username}/`, { headers });
            setProfile(response.data);
            
            // --- Set initial follow state from API response ---
            setIsFollowing(response.data.is_following);
            setFollowersCount(response.data.followers_count);
            // --- End ---
            
        } catch (err) {
            console.error("Error fetching profile:", err);
            if (err.response && err.response.status === 404) {
                setError("User profile not found.");
            } else {
                setError("Failed to load profile. Please try again later.");
            }
        } finally {
            setLoading(false);
        }
    }, [username, authTokens]); // Depend on username and authTokens

    // Initial fetch on component mount or when username changes
    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    // --- Follow/Unfollow Handlers ---
    const handleFollowToggle = async () => {
        if (!user) {
            alert("Please log in to follow users.");
            return;
        }
        if (isProcessingFollow) return; // Prevent multiple clicks

        setIsProcessingFollow(true);
        const headers = { 'Authorization': `Bearer ${authTokens.access}` };
        const url = `http://127.0.0.1:8000/api/profiles/${username}/follow/`;

        try {
            if (isFollowing) {
                // --- UNFOLLOW (DELETE) ---
                await axios.delete(url, { headers });
                setIsFollowing(false); // Update UI instantly
                setFollowersCount(prev => prev - 1); // Update UI instantly
            } else {
                // --- FOLLOW (POST) ---
                await axios.post(url, {}, { headers }); // Empty object as data
                setIsFollowing(true); // Update UI instantly
                setFollowersCount(prev => prev + 1); // Update UI instantly
            }
        } catch (err) {
            console.error("Follow/Unfollow error:", err.response?.data || err.message);
            alert("An error occurred. Please try again.");
            // Handle auth error
             if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                 logoutUser();
             }
        } finally {
            setIsProcessingFollow(false); // Re-enable button
        }
    };
    // --- End Handlers ---


    // --- Render states ---
    if (loading) return <div className="loading-message">Loading profile...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!profile) return <div className="no-projects-message">Profile data unavailable.</div>;

    // Determine project list based on role
    const projects = profile.role === 'CLIENT' ? profile.projects_as_client : profile.projects_as_freelancer;
    const projectListTitle = profile.role === 'CLIENT' ? "Active Projects" : "Work History";

    const profilePicture = profile.profile_picture_url || '/default_avatar.png'; 
    
    // Check if the viewed profile is the logged-in user's own profile
    const isOwnProfile = user && user.username === profile.username;

    return (
        <div className="profile-page-container">
            <div className="profile-grid">
                {/* --- Left Column: Main Info --- */}
                <div className="profile-main">
                    <div className="profile-card profile-summary-card">
                        {/* Profile Header */}
                        <div className="profile-header">
                            <img
                                src={profilePicture}
                                alt={`${profile.username}'s profile`}
                                className="profile-picture"
                                onError={(e) => { e.target.onerror = null; e.target.src="/default_avatar.png"}}
                            />
                            <div className="profile-info">
                                <h1>{profile.name}</h1>
                                <p className="profile-username">@{profile.username}</p>
                                <span className={`profile-role role-${profile.role?.toLowerCase()}`}>
                                    {profile.role}
                                </span>
                                <p className="profile-joined">Joined: {new Date(profile.date_joined).toLocaleDateString()}</p>
                                
                                {/* --- Follow/Edit Button --- */}
                                <div className="profile-action-button">
                                    {isOwnProfile ? (
                                        <Link to="/profile/edit" className="edit-profile-btn">Edit Profile</Link>
                                    ) : (
                                        <button 
                                            onClick={handleFollowToggle} 
                                            className={`follow-btn ${isFollowing ? 'following' : 'not-following'}`}
                                            disabled={isProcessingFollow} // Disable button while processing
                                        >
                                            {isFollowing ? 'Following' : 'Follow'}
                                        </button>
                                    )}
                                </div>
                                {/* --- End Button --- */}
                            </div>
                        </div>

                        {/* --- Follow Stats --- */}
                        <div className="profile-stats">
                            <div className="stat-item">
                                <strong>{followersCount}</strong>
                                <span>Followers</span>
                            </div>
                            <div className="stat-item">
                                {/* Use the count from the profile data */}
                                <strong>{profile.following_count}</strong> 
                                <span>Following</span>
                            </div>
                        </div>
                        {/* --- End Stats --- */}

                        {/* --- Role Specific Details --- */}
                        {profile.role === 'FREELANCER' && (
                            <div className="profile-freelancer-details profile-section">
                                {profile.availability_display && (
                                    <p className="detail-item"><Clock size={16} className="detail-icon"/> Status: <strong>{profile.availability_display}</strong></p>
                                )}
                                {profile.hourly_rate && (
                                    <p className="detail-item"><DollarSign size={16} className="detail-icon"/> Rate: <strong>${parseFloat(profile.hourly_rate).toFixed(2)} / hr</strong></p>
                                )}
                            </div>
                        )}
                        {profile.role === 'CLIENT' && (
                             <div className="profile-client-details profile-section">
                                 {profile.company_name && (
                                     <p className="detail-item"><Briefcase size={16} className="detail-icon"/> Company: <strong>{profile.company_name}</strong></p>
                                 )}
                                 {profile.company_website && (
                                     <p className="detail-item"><LinkIcon size={16} className="detail-icon"/> Website: <a href={profile.company_website.startsWith('http') ? profile.company_website : `https://${profile.company_website}`} target="_blank" rel="noopener noreferrer">{profile.company_website}</a></p>
                                 )}
                             </div>
                         )}
                         {/* --- End Role Specific Details --- */}


                        {/* Bio Section */}
                        {profile.bio && (
                            <div className="profile-section profile-bio-section">
                                <h2>About</h2>
                                <p className="profile-bio">{profile.bio}</p>
                            </div>
                        )}

                         {/* Skills Section */}
                         {profile.skills && profile.skills.length > 0 && (
                            <div className="profile-section">
                                <h2>Skills</h2>
                                <div className="skills-list profile-skills-list">
                                    {profile.skills.map(skill => (
                                        <span key={skill.id} className="skill-tag">{skill.name}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div> {/* End Left Column */}

                 {/* --- Right Column: Project History --- */}
                 <div className="profile-sidebar">
                      {projects && projects.length > 0 ? (
                        <div className="profile-card profile-projects-card">
                             <div className="profile-section">
                                <h2>{projectListTitle} ({projects.length})</h2>
                                <ul className="profile-projects-list">
                                    {projects.map(project => (
                                        <li key={project.id}>
                                            <Link to={`/projects/${project.id}`}>{project.title}</Link>
                                            <span className={`project-status status-${project.status?.toLowerCase()}`}>
                                                {project.status?.replace('_', ' ')}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ) : (
                         <div className="profile-card profile-projects-card">
                            <div className="profile-section">
                                <h2>{projectListTitle}</h2>
                                <p className="no-projects-message">No projects to display yet.</p>
                            </div>
                         </div>
                    )}
                     <Link to="/" className="back-link profile-back-link">&larr; Back to Home</Link>
                 </div> {/* End Right Column */}

            </div> {/* End Profile Grid */}
        </div>
    );
}

export default UserProfilePage;