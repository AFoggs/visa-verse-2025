import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layout
import MainLayout from './components/layout/MainLayout';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Companion from './pages/Companion';
import Discover from './pages/Discover';
import Chat from './pages/Chat';
import Friends from './pages/Friends';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import CityDiscovery from './pages/CityDiscovery';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading, profileComplete } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-800">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profileComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

// Onboarding Route (requires auth but not complete profile)
function OnboardingRoute({ children }) {
  const { user, loading, profileComplete } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-800">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profileComplete) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Public Route (redirects if authenticated)
function PublicRoute({ children }) {
  const { user, loading, profileComplete } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-800">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400"></div>
      </div>
    );
  }

  if (user && profileComplete) {
    return <Navigate to="/dashboard" replace />;
  }

  if (user && !profileComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Onboarding Route */}
      <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/companion" element={<Companion />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/chat/:matchId" element={<Chat />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:userId" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/city-discovery" element={<CityDiscovery />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
