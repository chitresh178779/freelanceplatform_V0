// src/App.js
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';
import './pages/AuthPage.css';

import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import ProjectListPage from './pages/ProjectListPage';
import PostProjectPage from './pages/PostProjectPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
// REMOVED: import { ThemeProvider } from './context/ThemeContext'; // <-- This was causing the error
import EditProfilePage from './pages/EditProfilePage';
import UserProfilePage from './pages/UserProfilePage';
import MyProjectsPage from './pages/MyProjectsPage'; 
import MyBidsPage from './pages/MyBidsPage';
import ManageBidsPage from './pages/ManageBidsPage';
import ChatPage from './pages/ChatPage';
import UserSearchPage from './pages/UserSearchPage';

// --- Stripe Imports ---
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

function App() {
  return (
    <div className="App">
      <Navbar />
      <main className="main-content">
        <Elements stripe={stripePromise}>
          <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/projects" element={<ProjectListPage />} />
              <Route path="/projects/:projectId" element={<ProjectDetailPage />} />

              <Route path="/profiles" element={<UserSearchPage />} />
              <Route path="/profile/:username" element={<UserProfilePage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/post" element={<PostProjectPage />} />
              <Route path="/profile/edit" element={<EditProfilePage />} />
              <Route path="/dashboard/my-projects" element={<MyProjectsPage />} />
              <Route path="/dashboard/my-bids" element={<MyBidsPage />} />
              <Route path="/projects/:projectId/manage-bids" element={<ManageBidsPage />} />
              <Route path="/chat/" element={<ChatPage />} />
              <Route path="/chat/:roomId" element={<ChatPage />} />
            </Route>
            
            {/* <Route path="*" element={<NotFoundPage />} /> */}
          </Routes>
        </Elements>
      </main>
    </div>
  );
}

export default App;