import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { LoginPage } from './auth/LoginPage';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { Layout } from './components/Layout';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { TropelsPage } from './features/tropels/TropelsPage';
import { SignalsFeedPage } from './features/signals/SignalsFeedPage';
import { SignalDetailPage } from './features/signals/SignalDetailPage';
import { SectorsPage } from './features/sectors/SectorsPage';
import { SectorStoryPage } from './features/sectors/SectorStoryPage';
import { NotFoundPage } from './components/NotFoundPage';

export default function App(): ReactNode {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tropels" element={<TropelsPage />} />
        <Route path="/signals" element={<SignalsFeedPage />} />
        <Route path="/signals/:id" element={<SignalDetailPage />} />
        <Route path="/sectors" element={<SectorsPage />} />
        <Route path="/sectors/:id/story" element={<SectorStoryPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
