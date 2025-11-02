// In src/pages/EditProfilePage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, FileText, Image, CheckSquare, Briefcase, Link as LinkIcon, Clock, DollarSign } from 'react-feather';
import './EditProfilePage.css';

// Define Availability Choices (Match Backend)
const availabilityChoices = [
    { value: 'available', label: 'Available for Hire' },
    { value: 'busy', label: 'Currently Busy' },
    { value: 'not_available', label: 'Not Available' },
];

function EditProfilePage() {
    const { authTokens, user, logoutUser } = useAuth();
    const navigate = useNavigate();

    const [profileData, setProfileData] = useState({
        name: '',
        bio: '',
        skills: [], // Store selected skill IDs
        profile_picture: null,
        availability: 'available',
        hourly_rate: '',
        company_name: '',
        company_website: '',
    });
    const [currentPictureUrl, setCurrentPictureUrl] = useState('');
    const [allSkills, setAllSkills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch available skills
    useEffect(() => {
        const fetchAllSkills = async () => {
            try {
                const response = await axios.get('http://127.0.0.1:8000/api/skills/');
                setAllSkills(response.data.results || response.data);
            } catch (err) {
                console.error("Error fetching skills list:", err);
                setError(prev => (prev ? prev + "\n" : "") + "Failed to load available skills.");
                setAllSkills([]);
            }
        };
        fetchAllSkills();
    }, []);

    // Fetch current profile data
    useEffect(() => {
        const fetchCurrentProfile = async () => {
             if (!authTokens) { navigate('/login'); return; }
             setLoading(true); setError('');
             try {
                 const response = await axios.get('http://127.0.0.1:8000/api/profile/', {
                     headers: { 'Authorization': `Bearer ${authTokens.access}` },
                 });
                 setProfileData({
                    name: response.data.name || '',
                    bio: response.data.bio || '',
                    skills: Array.isArray(response.data.skills) ? response.data.skills : [],
                    profile_picture: null,
                    availability: response.data.availability || availabilityChoices[0].value,
                    hourly_rate: response.data.hourly_rate || '',
                    company_name: response.data.company_name || '',
                    company_website: response.data.company_website || '',
                 });
                 setCurrentPictureUrl(response.data.profile_picture_url || '/default_avatar.png');
             } catch (err) {
                 console.error("Error fetching profile:", err);
                 if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                     logoutUser();
                     navigate('/login');
                 } else {
                     setError('Failed to load profile data.');
                 }
             }
             finally { setLoading(false); }
        };
        fetchCurrentProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authTokens, navigate]); // Removed logoutUser dependency

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setProfileData(prev => ({ ...prev, profile_picture: e.target.files[0] }));
            setCurrentPictureUrl(URL.createObjectURL(e.target.files[0]));
        }
    };

    // Handler for skill checkbox changes
    const handleSkillChange = (e) => {
        const skillId = parseInt(e.target.value);
        const isChecked = e.target.checked;
        setProfileData(prev => {
            const currentSkills = prev.skills || [];
            if (isChecked) {
                if (!currentSkills.includes(skillId)) {
                    return { ...prev, skills: [...currentSkills, skillId] };
                }
            } else {
                return { ...prev, skills: currentSkills.filter(id => id !== skillId) };
            }
            return prev;
        });
    };

    // Handler for form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!authTokens) return;
        setIsSubmitting(true);
        setError('');
        const formDataToSend = new FormData();
        formDataToSend.append('name', profileData.name);
        formDataToSend.append('bio', profileData.bio);
        (profileData.skills || []).forEach(skillId => {
            formDataToSend.append('skills', skillId);
        });
        if (profileData.profile_picture instanceof File) {
            formDataToSend.append('profile_picture', profileData.profile_picture);
        }
        if (user?.role === 'FREELANCER') {
            formDataToSend.append('availability', profileData.availability);
             if (profileData.hourly_rate !== '' && !isNaN(parseFloat(profileData.hourly_rate))) {
                 formDataToSend.append('hourly_rate', parseFloat(profileData.hourly_rate).toFixed(2));
             } else {
                 formDataToSend.append('hourly_rate', ''); 
             }
        } else if (user?.role === 'CLIENT') {
            formDataToSend.append('company_name', profileData.company_name);
            formDataToSend.append('company_website', profileData.company_website);
        }
        try {
            const response = await axios.patch('http://127.0.0.1:8000/api/profile/', formDataToSend, {
                 headers: { 'Authorization': `Bearer ${authTokens.access}` },
             });
            alert('Profile updated successfully!');
             if (response.data.profile_picture_url) {
                setCurrentPictureUrl(response.data.profile_picture_url);
             }
             setProfileData(prev => ({ ...prev, profile_picture: null }));
            navigate(`/profile/${user.username}`);
        } catch (err) {
             console.error("Error updating profile:", err.response?.data || err.message);
             let errorMsg = 'Failed to update profile. Please check your input.';
             if (err.response?.data && typeof err.response.data === 'object') {
                 errorMsg = Object.entries(err.response.data).map(([key, value]) =>
                     `${key}: ${Array.isArray(value) ? value.join(', ') : value}`
                 ).join('\n');
             }
             setError(errorMsg);
             if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                 logoutUser();
                 navigate('/login');
             }
         }
        finally { setIsSubmitting(false); }
    };

    if (loading) return <div className="loading-message">Loading profile editor...</div>;

    return (
        <div className="edit-profile-page-container">
            <div className="edit-profile-form-container">
                <form className="edit-profile-form" onSubmit={handleSubmit}>
                    <h1 className="form-title">Edit Your Profile</h1>
                    {error && <p className="error-message" style={{ whiteSpace: 'pre-wrap' }}>{error}</p>}

                    <div className="form-group profile-pic-group">
                         <label htmlFor="profile_picture">
                             <Image size={18} className="label-icon" /> Profile Picture
                         </label>
                         <div className="profile-pic-input">
                            <img
                                src={currentPictureUrl}
                                alt="Profile preview"
                                className="profile-pic-preview"
                                onError={(e) => { e.target.onerror = null; e.target.src="/default_avatar.png"}}
                            />
                            <input id="profile_picture" type="file" accept="image/*" onChange={handleFileChange} className="file-input" />
                            <label htmlFor="profile_picture" className="file-input-label">Change Picture</label>
                         </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="name">
                            <User size={18} className="label-icon" /> Full Name
                        </label>
                        <input id="name" type="text" name="name" value={profileData.name} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="bio">
                            <FileText size={18} className="label-icon" /> Bio
                        </label>
                        <textarea id="bio" name="bio" value={profileData.bio} onChange={handleChange} rows="5" placeholder="Tell everyone a bit about yourself..." />
                    </div>
                    {user?.role === 'FREELANCER' && (
                        <>
                            <div className="form-group">
                                <label htmlFor="availability">
                                    <Clock size={18} className="label-icon" /> Availability
                                </label>
                                <select id="availability" name="availability" value={profileData.availability} onChange={handleChange} >
                                    {availabilityChoices.map(choice => (
                                        <option key={choice.value} value={choice.value}>
                                            {choice.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="hourly_rate">
                                    <DollarSign size={18} className="label-icon" /> Hourly Rate ($) (Optional)
                                </label>
                                <input id="hourly_rate" type="number" name="hourly_rate" value={profileData.hourly_rate} onChange={handleChange} min="0" step="0.01" placeholder="e.g., 50.00" />
                            </div>
                            <div className="form-group">
                                <label>
                                    <CheckSquare size={18} className="label-icon" /> Skills
                                </label>
                                <div className="skills-checkbox-list">
                                     {allSkills.length > 0 ? (
                                        allSkills.map(skill => (
                                            <div key={skill.id} className="skill-checkbox-item">
                                                <input type="checkbox" id={`skill-${skill.id}`} value={skill.id} checked={(profileData.skills || []).includes(skill.id)} onChange={handleSkillChange} />
                                                <label htmlFor={`skill-${skill.id}`}>{skill.name}</label>
                                            </div>
                                        ))
                                     ) : (
                                         <p className="no-skills-text">{ error.includes("skills") ? "Error loading skills." : "Loading skills..."}</p>
                                     )}
                                 </div>
                            </div>
                        </>
                    )}
                    {user?.role === 'CLIENT' && (
                        <>
                            <div className="form-group">
                                <label htmlFor="company_name">
                                    <Briefcase size={18} className="label-icon" /> Company Name (Optional)
                                </label>
                                <input id="company_name" type="text" name="company_name" value={profileData.company_name} onChange={handleChange} placeholder="Your Company Inc." />
                            </div>
                            <div className="form-group">
                                <label htmlFor="company_website">
                                    <LinkIcon size={18} className="label-icon" /> Company Website (Optional)
                                </label>
                                <input id="company_website" type="url" name="company_website" value={profileData.company_website} onChange={handleChange} placeholder="https://yourcompany.com" />
                            </div>
                        </>
                    )}
                    <button type="submit" className="submit-button" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default EditProfilePage;