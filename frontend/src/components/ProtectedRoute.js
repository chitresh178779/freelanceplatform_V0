

// In src/components/ProtectedRoute.js
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute() {
    const { user } = useAuth(); // Get the current user state

    // If user is logged in, render the child route (using Outlet)
    // Otherwise, redirect to the login page
    return user ? <Outlet /> : <Navigate to="/login" replace />;
    // 'replace' prevents the login page from being added to history
    // when redirecting from a protected route
}

export default ProtectedRoute;