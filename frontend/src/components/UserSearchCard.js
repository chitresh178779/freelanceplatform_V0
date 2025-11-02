// In src/components/UserSearchCard.js
import React from 'react';
import { Link } from 'react-router-dom';
import './UserSearchCard.css'; // We'll create this

function UserSearchCard({ user }) {
    if (!user) return null;

    // Fallback for profile picture
    const profilePicture = user.profile_picture_url || '/default_avatar.png';

    return (
        <div className="user-search-card">
            <img
                src={profilePicture}
                alt={user.username}
                className="user-card-picture"
                onError={(e) => { e.target.onerror = null; e.target.src="/default_avatar.png"}}
            />
            <div className="user-card-info">
                <h3 className="user-card-name">{user.name || user.username}</h3>
                <p className="user-card-username">@{user.username}</p>
                <span className={`user-card-role role-${user.role?.toLowerCase()}`}>
                    {user.role}
                </span>
            </div>
            {/* Display a few top skills */}
            {user.skills && user.skills.length > 0 && (
                <div className="user-card-skills">
                    {user.skills.slice(0, 3).map(skill => ( // Show first 3 skills
                        <span key={skill.id} className="user-card-skill-tag">{skill.name}</span>
                    ))}
                    {user.skills.length > 3 && (
                         <span className="user-card-skill-tag">+{user.skills.length - 3} more</span>
                    )}
                </div>
            )}
            <Link to={`/profile/${user.username}`} className="user-card-button">
                View Profile
            </Link>
        </div>
    );
}

export default UserSearchCard;