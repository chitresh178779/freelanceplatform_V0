import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ProjectCard from '../components/ProjectCard';
import './ProjectListPage.css';

const categoryChoices = [
    { value: '', label: 'All Categories' },
    { value: 'webdev', label: 'Web Development' },
    { value: 'design', label: 'Graphic Design' },
    { value: 'writing', label: 'Writing/Translation' },
    { value: 'marketing', label: 'Digital Marketing' },
    { value: 'other', label: 'Other' },
];

function ProjectListPage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    // REMOVED: const [currentPageUrl, setCurrentPageUrl] = useState('http://127.0.0.1:8000/api/projects/');
    const [nextPageUrl, setNextPageUrl] = useState(null);
    const [prevPageUrl, setPrevPageUrl] = useState(null);
    const [count, setCount] = useState(0);

    const fetchProjects = useCallback(async (url) => {
        setLoading(true);
        try {
            // Build query parameters for search/filter if not already in URL
            const finalUrl = new URL(url);
            if (searchTerm && !finalUrl.searchParams.has('search')) {
                finalUrl.searchParams.append('search', searchTerm);
            }
            if (categoryFilter && !finalUrl.searchParams.has('category')) {
                finalUrl.searchParams.append('category', categoryFilter);
            }
            // Add other parameters like ordering if needed

            const response = await axios.get(finalUrl.toString());

            setProjects(response.data.results);
            setNextPageUrl(response.data.next);
            setPrevPageUrl(response.data.previous);
            setCount(response.data.count);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch projects:', error);
            setLoading(false);
        }
    }, [searchTerm, categoryFilter]); // Dependencies are correct

    // Initial fetch and fetch when search/category changes (debouncing could be added here later)
    useEffect(() => {
        const initialUrl = new URL('http://127.0.0.1:8000/api/projects/');
        if (searchTerm) initialUrl.searchParams.append('search', searchTerm);
        if (categoryFilter) initialUrl.searchParams.append('category', categoryFilter);
        
        fetchProjects(initialUrl.toString());
    }, [fetchProjects, searchTerm, categoryFilter]); // Use fetchProjects in dependency array

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleCategoryChange = (event) => {
        setCategoryFilter(event.target.value);
    };

    const handleNextPage = () => {
        if (nextPageUrl) {
            fetchProjects(nextPageUrl);
        }
    };

    const handlePrevPage = () => {
        if (prevPageUrl) {
            fetchProjects(prevPageUrl);
        }
    };

    return (
        <div className="project-list-page-container">
            <h1 className="list-title">Browse Open Projects</h1>

            <div className="filter-controls">
                <input
                    type="text"
                    placeholder="Search by keyword..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="search-input"
                />
                <select
                    value={categoryFilter}
                    onChange={handleCategoryChange}
                    className="category-select"
                >
                    {categoryChoices.map(choice => (
                        <option key={choice.value} value={choice.value}>
                            {choice.label}
                        </option>
                    ))}
                </select>
            </div>


            {loading ? (
                <p className="loading-message">Loading projects...</p>
            ) : (
                <>
                    <p className="project-count">{count} project{count !== 1 ? 's' : ''} found.</p>
                    <div className="projects-list">
                        {projects.length > 0 ? (
                            projects.map(project => (
                                <ProjectCard key={project.id} project={project} />
                            ))
                        ) : (
                            <p className="no-projects-message">No projects match your criteria.</p>
                        )}
                    </div>

                    <div className="pagination-controls">
                        <button onClick={handlePrevPage} disabled={!prevPageUrl || loading}>
                            &larr; Previous
                        </button>
                        <button onClick={handleNextPage} disabled={!nextPageUrl || loading}>
                            Next &rarr;
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default ProjectListPage;