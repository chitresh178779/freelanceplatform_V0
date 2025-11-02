// In src/pages/MyProjectsPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProjectCard from '../components/ProjectCard'; // Reuse ProjectCard
import './DashboardPages.css'; // Shared CSS for dashboard pages

function MyProjectsPage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { authTokens, user, logoutUser } = useAuth(); // Get user role and logout

    // --- MOVED useEffect hook to the top ---
    useEffect(() => {
        // Only fetch if the user and tokens are available
        if (authTokens && user) {
            const fetchMyProjects = async () => {
                setLoading(true);
                setError('');
                try {
                    const response = await axios.get('http://127.0.0.1:8000/api/dashboard/my-projects/', {
                        headers: {
                            'Authorization': `Bearer ${authTokens.access}`,
                        },
                    });
                    setProjects(response.data.results || response.data); // Handle potential pagination
                } catch (err) {
                    console.error("Error fetching my projects:", err);
                    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                        logoutUser(); // Log out if token is invalid/expired
                    }
                    setError('Failed to load projects. Please try logging in again.');
                } finally {
                    setLoading(false);
                }
            };
            fetchMyProjects();
        } else if (!authTokens) {
            // If there are no tokens, don't fetch and stop loading.
            // The redirect below will handle this case.
            setLoading(false);
        }
    }, [authTokens, user, logoutUser]); // Add user to dependency array
    // --- END MOVED hook ---

    // --- Conditional return is NOW AFTER all hooks ---
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const title = user?.role === 'CLIENT' ? 'My Posted Projects' : 'My Assigned Projects';

    return (
        <div className="dashboard-page-container">
            <h1 className="dashboard-title">{title}</h1>
            
            {loading && <p className="loading-message">Loading...</p>}
            {error && <p className="error-message">{error}</p>}
            
            {!loading && !error && (
                <div className="dashboard-list">
                    {projects.length > 0 ? (
                        projects.map(project => (
                            <ProjectCard key={project.id} project={project} />
                        ))
                    ) : (
                        <p className="empty-message">You have no projects to display here yet.</p>
                    )}
                </div>
            )}
            {/* Add Pagination if API supports it for this endpoint */}
        </div>
    );
}

export default MyProjectsPage;