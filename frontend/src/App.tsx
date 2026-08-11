import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { MarketingLayout } from "./components/layout/MarketingLayout";
import { ProtectedRoute, GuestRoute } from "./components/ProtectedRoute";

// Pages
import { Landing } from "./pages/Landing";
import { SignIn } from "./pages/SignIn";
import { SignUp } from "./pages/SignUp";
import { Dashboard } from "./pages/Dashboard";
import { IncidentList } from "./pages/IncidentList";
import { IncidentDetail } from "./pages/IncidentDetail";
import { Repository } from "./pages/Repository";
import { RepositoryVisualizer } from "./pages/RepositoryVisualizer";
import { PRReview } from "./pages/PRReview";
import { CodeHealth } from "./pages/CodeHealth";

import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Marketing Routes */}
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<Landing />} />
        </Route>

        {/* Guest-only Authentication Routes (Redirects authenticated users to /dashboard) */}
        <Route element={<GuestRoute />}>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
        </Route>

        {/* Protected Application Dashboard & Feature Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/incidents" element={<IncidentList />} />
            <Route path="/incidents/:id" element={<IncidentDetail />} />
            <Route path="/repository" element={<Repository />} />
            <Route path="/repositories" element={<Repository />} />
            <Route path="/repository/:id" element={<Repository />} />
            <Route path="/repository/:id/visualizer" element={<RepositoryVisualizer />} />
            <Route path="/repository/visualizer" element={<RepositoryVisualizer />} />
            <Route path="/repo" element={<Repository />} />
            
            {/* PR Review Routes & Aliases */}
            <Route path="/repository/:repoId/pr/:prNumber" element={<PRReview />} />
            <Route path="/repository/:repoId/pull/:prNumber" element={<PRReview />} />
            <Route path="/pr/:prNumber" element={<PRReview />} />
            <Route path="/pr/:id" element={<PRReview />} />
            <Route path="/pr-review" element={<PRReview />} />
            <Route path="/pr" element={<PRReview />} />
            <Route path="/review" element={<PRReview />} />

            <Route path="/code-health" element={<CodeHealth />} />
            <Route path="/health" element={<CodeHealth />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
