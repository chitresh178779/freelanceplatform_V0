import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// --- Import Feather Icons ---
import { FileText, Grid, Tag, DollarSign, BookOpen } from 'react-feather';
// --- End Import ---
import './PostProjectPage.css'; // We'll update this CSS

const categoryChoices = [
    // Add a placeholder option
    { value: '', label: 'Select a category' },
    { value: 'webdev', label: 'Web Development' },
    { value: 'design', label: 'Graphic Design' },
    { value: 'writing', label: 'Writing/Translation' },
    { value: 'marketing', label: 'Digital Marketing' },
    { value: 'other', label: 'Other' },
];

function PostProjectPage() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [budget, setBudget] = useState('');
    // --- Default category to the placeholder ---
    const [category, setCategory] = useState(''); // Default to placeholder
    const [skillsRequired, setSkillsRequired] = useState('');

    const { authTokens } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        // --- Add validation for category selection ---
        if (!category) {
            alert('Please select a project category.');
            return;
        }
        // --- End validation ---
        if (!authTokens) {
            alert('You must be logged in to post a project.');
            navigate('/login');
            return;
        }
        try {
            await axios.post(
                'http://127.0.0.1:8000/api/projects/',
                { title, description, budget, category, skills_required: skillsRequired },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authTokens.access}`,
                    },
                }
            );
            alert('Project posted successfully!');
            navigate('/projects');
        } catch (error) {
            console.error('Failed to post project:', error.response?.data || error.message);
            if (error.response && error.response.status === 403) {
                alert('Only Clients can post projects. Please check your account type.');
            } else {
                alert('An error occurred. Please try again.');
            }
        }
    };

    return (
        <div className="post-project-page-container">
            <div className="post-project-form-container">
                <form className="post-project-form" onSubmit={handleSubmit}>
                    <h2 className="form-title">Create a New Project</h2>
                    <p className="form-subtitle">Tell us what you need done.</p>

                    {/* --- Updated Form Groups with Icons --- */}
                    <div className="form-group">
                        <label htmlFor="title">
                            <BookOpen size={16} className="label-icon" /> Project Title
                        </label>
                        <input
                            id="title" type="text" value={title}
                            onChange={(e) => setTitle(e.target.value)} required
                            placeholder="e.g., Build a responsive e-commerce website"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="category">
                            <Grid size={16} className="label-icon" /> Category
                        </label>
                        <select
                            id="category" value={category}
                            onChange={(e) => setCategory(e.target.value)} required
                            // Add class to style placeholder if needed
                            className={category === '' ? 'select-placeholder' : ''}
                        >
                            {categoryChoices.map(choice => (
                                <option key={choice.value} value={choice.value} disabled={choice.value === ''}>
                                    {choice.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">
                             <FileText size={16} className="label-icon" /> Description
                        </label>
                        <textarea
                            id="description" value={description}
                            onChange={(e) => setDescription(e.target.value)} required
                            rows="5"
                            placeholder="Provide details like project goals, scope, and deliverables..."
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group half-width">
                            <label htmlFor="skills">
                                <Tag size={16} className="label-icon" /> Skills Required
                            </label>
                            <input
                                id="skills" type="text" value={skillsRequired}
                                onChange={(e) => setSkillsRequired(e.target.value)}
                                placeholder="e.g., React, Node.js, API Design"
                            />
                        </div>

                        <div className="form-group half-width">
                            <label htmlFor="budget">
                                <DollarSign size={16} className="label-icon" /> Budget ($)
                            </label>
                            <input
                                id="budget" type="number" value={budget}
                                onChange={(e) => setBudget(e.target.value)} required
                                min="0" step="0.01"
                                placeholder="e.g., 500.00"
                            />
                        </div>
                    </div>
                    {/* --- End Updated Form Groups --- */}

                    <button type="submit" className="submit-button">Post Project</button>
                </form>
            </div>
        </div>
    );
}

export default PostProjectPage;