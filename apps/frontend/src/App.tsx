import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "@/pages/home/HomePage";
import { DocsPage } from "@/pages/docs/DocsPage";
import { CodebotPage } from "@/pages/codebot/CodebotPage";
import { NeroLayout } from "@/pages/nero/NeroLayout";
import { DashboardOverviewPage } from "@/pages/nero/DashboardOverviewPage";
import { RepositoriesPage } from "@/pages/nero/RepositoriesPage";
import { AnalyticsPage } from "@/pages/nero/AnalyticsPage";
import { MemoryPage } from "@/pages/nero/MemoryPage";
import { PRReviewsPage } from "@/pages/nero/PRReviewsPage";
import { SettingsPage } from "@/pages/nero/SettingsPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<HomePage />} />

        {/* Documentation Hub */}
        <Route path="/docs" element={<DocsPage />} />

        {/* Codebot Interactive Chat & Workspace */}
        <Route path="/codebot" element={<CodebotPage />} />

        {/* Main Product / Dashboard Suite */}
        <Route path="/dashboard" element={<NeroLayout />}>
          <Route index element={<DashboardOverviewPage />} />
          <Route path="repositories" element={<RepositoriesPage />} />
          <Route path="pr-reviews" element={<PRReviewsPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="memory" element={<MemoryPage />} />
        </Route>

        {/* Typo & Legacy Route Aliases -> Automatically redirect to /dashboard */}
        <Route path="/dashbord" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashbord/*" element={<Navigate to="/dashboard" replace />} />
        <Route path="/nero" element={<Navigate to="/dashboard" replace />} />
        <Route path="/nero/*" element={<Navigate to="/dashboard" replace />} />

        {/* Auth Pages */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
