import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from './api';
import { useAuth } from './auth';
import { DashboardPage, HabitsPage, LoginPage, ProfilePage, ProgressPage, RegisterPage } from './pages';

function Loading({ label = 'Getting things ready…' }) {
  return <div className="screen-loading"><span className="spinner" />{label}</div>;
}

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

function GuestRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [habits, setHabits] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const refreshData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [habitsResponse, statsResponse] = await Promise.all([
        api.get('/habits'),
        api.get('/progress/stats')
      ]);
      setHabits(habitsResponse.data.habits);
      setStats(statsResponse.data);
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Could not load your tracker data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const logout = () => {
    signOut();
    navigate('/login', { replace: true });
  };

  const pageNames = {
    '/dashboard': 'Your daily overview',
    '/habits': 'Build your routine',
    '/progress': 'Small steps, real progress',
    '/profile': 'Your account'
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/dashboard" aria-label="Daily Habits home">
          <span className="brand-icon">d<span>.</span></span>
          <span>daily<span className="brand-muted">habits</span></span>
        </Link>
        <div className="side-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <NavLink to="/dashboard"><span className="nav-symbol">⌂</span>Overview</NavLink>
          <NavLink to="/habits"><span className="nav-symbol">◷</span>My habits</NavLink>
          <NavLink to="/progress"><span className="nav-symbol">↗</span>Progress</NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="side-label">ACCOUNT</div>
          <NavLink className="account-link" to="/profile"><span className="nav-symbol">◉</span>Profile</NavLink>
          <div className="side-user">
            <div className="avatar">{user?.name?.trim()?.charAt(0)?.toUpperCase() || 'U'}</div>
            <div className="side-user-copy"><strong>{user?.name || 'Your account'}</strong><span>{user?.email}</span></div>
            <button className="icon-button logout-icon" onClick={logout} title="Log out" aria-label="Log out">↗</button>
          </div>
        </div>
      </aside>

      <div className="content-shell">
        <header className="topbar">
          <div>
            <div className="breadcrumb">YOUR SPACE <span>/</span> {pageNames[location.pathname] || 'Daily Habits'}</div>
            <p className="topbar-title">{pageNames[location.pathname] || 'Daily Habits'}</p>
          </div>
          <div className="topbar-right">
            <span className="today-date">{new Intl.DateTimeFormat('en', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date())}</span>
            <Link to="/profile" className="avatar avatar-link" aria-label="View profile">{user?.name?.trim()?.charAt(0)?.toUpperCase() || 'U'}</Link>
          </div>
        </header>
        <main className="main-content">
          {loadError && <div className="notice notice-error" role="alert">{loadError}<button className="text-button" onClick={refreshData}>Try again</button></div>}
          <Outlet context={{ habits, stats, loading, refreshData }} />
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <NavLink to="/dashboard"><span>⌂</span>Home</NavLink>
        <NavLink to="/habits"><span>◷</span>Habits</NavLink>
        <NavLink to="/progress"><span>↗</span>Progress</NavLink>
        <NavLink to="/profile"><span>◉</span>Profile</NavLink>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/habits" element={<HabitsPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
