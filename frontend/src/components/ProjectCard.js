// In src/components/ProjectCard.js
import React from 'react';
import { Link } from 'react-router-dom';
import './ProjectCard.css'; // Make sure this CSS file exists

function ProjectCard({ project }) {
    if (!project) {
        return null; // Or a placeholder if project data is missing
    }

    // Format budget for display
    const formattedBudget = project.budget ? parseFloat(project.budget).toFixed(2) : 'N/A';

    return (
        // --- Make the entire card a Link ---
        <Link to={`/projects/${project.id}`} className="project-card-link">
            <div className="project-card">
                <div className="card-header">
                    <h3 className="card-title">{project.title}</h3>
                    <span className="card-budget">${formattedBudget}</span>
                </div>
                <p className="card-description">{project.description}</p>
                <div className="card-footer">
                    <span className="card-meta">Posted by: {project.client_username}</span>
                    
                    {/* --- Replace 'Bid Now' with Status Indicator --- */}
                    <span className={`project-status status-${project.status.toLowerCase()}`}>
                        {project.status.replace('_', ' ')}
                    </span>
                    {/* --- End Replacement --- */}

                </div>
            </div>
        </Link>
        // --- End Link ---
    );
}

export default ProjectCard;