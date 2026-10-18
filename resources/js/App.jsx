import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppLayout from './components/layout/AppLayout';

// Public & Auth Pages
import LandingPage from './pages/public/LandingPage';
import ContactPage from './pages/public/ContactPage';
import ContributePage from './pages/public/ContributePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSocieties from './pages/admin/AdminSocieties';
import AdminPendingSocieties from './pages/admin/AdminPendingSocieties';
import AdminUsers from './pages/admin/AdminUsers';
import AdminInvitations from './pages/admin/AdminInvitations';
import AdminSettings from './pages/admin/AdminSettings';

// Resident Pages
import ResidentDashboard from './pages/resident/ResidentDashboard';
import ResidentBills from './pages/resident/ResidentBills';
import ResidentReceipts from './pages/resident/ResidentReceipts';
import ResidentMembers from './pages/resident/ResidentMembers';
import ResidentLinkFlat from './pages/resident/ResidentLinkFlat';

// Committee Pages
import CommitteeDashboard from './pages/committee/CommitteeDashboard';
import CommitteeFlats from './pages/committee/CommitteeFlats';

// User & Utility Pages
import ProfilePage from './pages/user/ProfilePage';
import NotificationsPage from './pages/user/NotificationsPage';
import NotFoundPage from './pages/errors/NotFoundPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              {/* Public Routes */}
              <Route index element={<LandingPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="society/contribute" element={<ContributePage />} />

              {/* Authentication Routes */}
              <Route path="login" element={<LoginPage />} />
              <Route path="auth/login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="auth/register" element={<RegisterPage />} />
              <Route path="reset-password" element={<LoginPage />} />

              {/* Admin Portal */}
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="admin/societies" element={<AdminSocieties />} />
              <Route path="admin/societies/pending" element={<AdminPendingSocieties />} />
              <Route path="admin/users" element={<AdminUsers />} />
              <Route path="admin/invitations" element={<AdminInvitations />} />
              <Route path="admin/settings" element={<AdminSettings />} />

              {/* Resident Portal */}
              <Route path="resident" element={<ResidentDashboard />} />
              <Route path="resident/bills" element={<ResidentBills />} />
              <Route path="resident/receipts" element={<ResidentReceipts />} />
              <Route path="resident/members" element={<ResidentMembers />} />
              <Route path="resident/link-flat" element={<ResidentLinkFlat />} />

              {/* Committee Portal */}
              <Route path="committee" element={<CommitteeDashboard />} />
              <Route path="committee/flats" element={<CommitteeFlats />} />
              <Route path="comitee" element={<Navigate to="/committee" replace />} />
              <Route path="comitee/flats" element={<Navigate to="/committee/flats" replace />} />

              {/* User Account Routes */}
              <Route path="profile" element={<ProfilePage />} />
              <Route path="user/profile" element={<ProfilePage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="user/notification" element={<NotificationsPage />} />

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
