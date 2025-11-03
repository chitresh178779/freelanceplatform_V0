// In src/pages/UserProfilePage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Link as LinkIcon, Clock, DollarSign, MessageCircle } from 'react-feather';
import './UserProfilePage.css';

function UserProfilePage() {
    const { username } = useParams();
    const { user, authTokens, logoutUser } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [isProcessingFollow, setIsProcessingFollow] = useState(false);

    // Fetch profile data
    const fetchProfile = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const headers = authTokens ? { 'Authorization': `Bearer ${authTokens.access}` } : {};
            const response = await axios.get(`http://127.0.0.1:8000/api/profiles/${username}/`, { headers });
            setProfile(response.data);
            setIsFollowing(response.data.is_following);
            setFollowersCount(response.data.followers_count);
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
    }, [username, authTokens]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    // Handle Follow/Unfollow
    const handleFollowToggle = async () => {
        if (!user) { alert("Please log in to follow users."); return; }
        if (isProcessingFollow) return;
        setIsProcessingFollow(true);
        const headers = { 'Authorization': `Bearer ${authTokens.access}` };
        const url = `http://127.0.0.1:8000/api/profiles/${username}/follow/`;
        try {
            if (isFollowing) {
                await axios.delete(url, { headers });
                setIsFollowing(false); setFollowersCount(prev => prev - 1);
            } else {
                await axios.post(url, {}, { headers });
                setIsFollowing(true); setFollowersCount(prev => prev + 1);
            }
        } catch (err) {
            console.error("Follow/Unfollow error:", err.response?.data || err.message);
            alert("An error occurred. Please try again.");
             if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                 logoutUser();
             }
        } finally {
            setIsProcessingFollow(false);
        }
    };

    // Handle Start Chat
    const handleStartChat = async () => {
        if (!user || !profile) {
            alert("Please log in to start a chat.");
            return;
        }
        try {
            const response = await axios.post(
                `http://127.0.0.1:8000/api/chats/start/`,
                { username: profile.username }, // Send the username of the profile owner
                { headers: { 'Authorization': `Bearer ${authTokens.access}` } }
            );
            const room = response.data;
            navigate(`/chat/${room.id}`); // Redirect to the chat room
        } catch (err) {
            console.error("Error starting chat:", err.response?.data || err.message);
            alert("Could not start chat. Please try again later.");
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                 logoutUser();
            }
        }
    };

    if (loading) return <div className="loading-message">Loading profile...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!profile) return <div className="no-projects-message">Profile data unavailable.</div>;

    const projects = profile.role === 'CLIENT' ? profile.projects_as_client : profile.projects_as_freelancer;
    const projectListTitle = profile.role === 'CLIENT' ? "Active Projects" : "Work History";
    const profilePicture = profile.profile_picture_url || '/default_avatar.png';
    const isOwnProfile = user && user.username === profile.username;

    return (
        <div className="profile-page-container">
            <div className="profile-grid">
                {/* --- Left Column: Main Info --- */}
                <div className="profile-main">
                    <div className="profile-card profile-summary-card">
                        <div className="profile-header">
                            <img src={profilePicture} alt={`${profile.username}'s profile`} className="profile-picture" onError={(e)=>{ e.target.onerror = null; e.target.src="/default_avatar.png"}}/>
                            <div className="profile-info">
                                <h1>{profile.name}</h1>
                                <p className="profile-username">@{profile.username}</p>
                                <span className={`profile-role role-${profile.role?.toLowerCase()}`}>{profile.role}</span>
                                <p className="profile-joined">Joined: {new Date(profile.date_joined).toLocaleDateString()}</p>
                                
                                {/* --- UPDATED Action Buttons --- */}
                                <div className="profile-action-buttons">
                                    {isOwnProfile ? (
                                        // If it's YOUR profile, show "Edit Profile"
                                        <Link to="/profile/edit" className="profile-btn edit-profile-btn">Edit Profile</Link>
                                    ) : (
                                        // If it's SOMEONE ELSE'S profile, show "Follow" and "Message"
                                        <>
                                            <button 
                                                onClick={handleFollowToggle} 
                                                className={`profile-btn follow-btn ${isFollowing ? 'following' : 'not-following'}`}
                                                disabled={isProcessingFollow}
                                            >
                                                {isFollowing ? 'Following' : 'Follow'}
                                            </button>
                                            <button onClick={handleStartChat} className="profile-btn message-btn">
                                                <MessageCircle size={16} /> Message
                                            </button>
                                        </>
                                    )}
                                </div>
                                {/* --- END Buttons --- */}
                            </div>
                        </div>

                        {/* --- Follow Stats --- */}
                        <div className="profile-stats">
                            <div className="stat-item">
                                <strong>{followersCount}</strong>
                                <span>Followers</span>
                            </div>
                            <div className="stat-item">
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