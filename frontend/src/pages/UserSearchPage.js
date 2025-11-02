// In src/pages/UserSearchPage.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import UserSearchCard from '../components/UserSearchCard';
import './UserSearchPage.css'; // We'll create this

function UserSearchPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { authTokens, logoutUser } = useAuth();

    // State for search/filter controls
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState(''); // 'CLIENT' or 'FREELANCER'

    // Fetch users function
    const fetchUsers = useCallback(async () => {
        if (!authTokens) return; // Wait for tokens
        setLoading(true);
        setError('');
        try {
            // Build query params
            const params = new URLSearchParams();
            if (searchTerm) {
                params.append('search', searchTerm);
            }
            if (roleFilter) {
                params.append('role', roleFilter);
            }

            const response = await axios.get(`http://127.0.0.1:8000/api/profiles/`, {
                headers: { 'Authorization': `Bearer ${authTokens.access}` },
                params: params
            });
            setUsers(response.data.results || response.data); // Handle pagination
        } catch (err) {
            console.error("Error fetching users:", err);
            setError('Failed to load users.');
            if (err.response && (err.response.status === 401 || err.response.status === 403)) {
                logoutUser();
            }
        } finally {
            setLoading(false);
        }
    }, [authTokens, searchTerm, roleFilter, logoutUser]);

    // Initial fetch
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]); // Run on initial load and when filters change

    // Handle form submit (e.g., if you had a search button)
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        fetchUsers(); // Trigger fetch
    };

    return (
        <div className="user-search-page-container">
            <h1 className="page-title">Find Members</h1>
            
            {/* Search and Filter Bar */}
            <form className="user-filter-controls" onSubmit={handleSearchSubmit}>
                <input
                    type="text"
                    placeholder="Search by name, username, or skill..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="user-search-input"
                />
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="user-role-select"
                >
                    <option value="">All Roles</option>
                    <option value="FREELANCER">Freelancer</option>
                    <option value="CLIENT">Client</option>
                </select>
                <button type="submit" className="user-search-button">Search</button>
            </form>

            {/* Results Grid */}
            {loading && <p className="loading-message">Loading members...</p>}
            {error && <p className="error-message">{error}</p>}
            {!loading && !error && (
                <div className="user-results-grid">
                    {users.length > 0 ? (
                        users.map(user => (
                            <UserSearchCard key={user.id} user={user} />
                        ))
                    ) : (
                        <p className="empty-message">No members match your criteria.</p>
                    )}
                </div>
            )}
            {/* Add Pagination later if needed */}
        </div>
    );
}

export default UserSearchPage;