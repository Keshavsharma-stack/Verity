/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicLayout } from './layouts/PublicLayout';
import { AppLayout } from './layouts/AppLayout';

import { Landing } from './pages/public/Landing';
import { Pricing } from './pages/public/Pricing';
import { Login } from './pages/public/Login';
import { Signup } from './pages/public/Signup';
import { ForgotPassword } from './pages/public/ForgotPassword';
import { ResetPassword } from './pages/public/ResetPassword';

import { Dashboard } from './pages/app/Dashboard';
import { Contractors } from './pages/app/Contractors';
import { ContractorDetail } from './pages/app/ContractorDetail';
import { AddContractor } from './pages/app/AddContractor';
import { EditContractor } from './pages/app/EditContractor';
import { Documents } from './pages/app/Documents';
import { Expirations } from './pages/app/Expirations';
import { Compliance } from './pages/app/Compliance';
import { Settings, SettingsCompany, SettingsTeam, SettingsBilling } from './pages/app/Settings';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>

          {/* Authenticated Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/contractors" element={<Contractors />} />
              <Route path="/contractors/new" element={<AddContractor />} />
              <Route path="/contractors/:id" element={<ContractorDetail />} />
              <Route path="/contractors/:id/edit" element={<EditContractor />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/expirations" element={<Expirations />} />
              <Route path="/compliance" element={<Compliance />} />
              <Route path="/settings" element={<Settings />}>
                <Route path="company" element={<SettingsCompany />} />
                <Route path="team" element={<SettingsTeam />} />
                <Route path="billing" element={<SettingsBilling />} />
              </Route>
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
