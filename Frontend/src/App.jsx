import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';

// ── API ──────────────────────────────────────────────────────
import { api, setToken, getToken, onUnauthorized } from './api/api';

// ── Layout ───────────────────────────────────────────────────
import AnimatedBackground from './components/layout/AnimatedBackground';
import AppHeader          from './components/layout/AppHeader';
import { Spinner }        from './components/ui/index';

// ── Auth ─────────────────────────────────────────────────────
import Login    from './components/auth/Login';
import Register from './components/auth/Register';

// ── Animations ───────────────────────────────────────────────
import WelcomeAnimation from './animations/WelcomeAnimation';

// ── User ─────────────────────────────────────────────────────
import UserDashboard from './components/user/UserDashboard';
import CarSelection  from './components/user/CarSelection';
import BookingsPage  from './components/user/BookingsPage';
import InvoicesPage  from './components/user/InvoicesPage';
import ProfilePage   from './components/user/ProfilePage';

// ── Vehicle ──────────────────────────────────────────────────
import VehicleManager from './components/vehicle/VehicleManager';

// ── Stations ─────────────────────────────────────────────────
import FindStations  from './components/stations/FindStations';
import StationLayout from './components/stations/StationLayout';

// ── Manager ──────────────────────────────────────────────────
import ManagerDashboard from './components/manager/ManagerDashboard';
import ManagerAnalytics from './components/manager/ManagerAnalytics';

// ── Admin ────────────────────────────────────────────────────
import AdminDashboard from './components/admin/AdminDashboard';
import AdminUsers     from './components/admin/AdminUsers';
import AdminStations  from './components/admin/AdminStations';
import AnalyticsView  from './components/admin/AnalyticsView';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Maps the app's internal "view id" vocabulary (used by AppHeader's nav
// and every page's setActiveView calls) to real URLs. Keeping this map
// means none of the leaf page components need to change — only the
// navigation plumbing here does.
const VIEW_TO_PATH = {
  main:          "/dashboard",
  findstations:  "/stations",
  bookings:      "/bookings",
  vehicles:      "/vehicles",
  invoices:      "/invoices",
  profile:       "/profile",
  analytics:     "/analytics",
  adminUsers:    "/admin/users",
  adminStations: "/admin/stations",
};

const pathToView = (pathname) => {
  if (pathname.startsWith("/stations")) return "findstations";
  const found = Object.entries(VIEW_TO_PATH).find(([, path]) => pathname === path);
  return found ? found[0] : "main";
};

// Small wrapper so StationLayout (which takes a stationId prop) can read
// the :stationId URL param and turn "back" into real browser navigation.
function StationDetailRoute({ user, onConfirmBooking, activeBooking }) {
  const { stationId } = useParams();
  const navigate = useNavigate();
  return (
    <StationLayout stationId={stationId} onBack={() => navigate("/stations")}
      user={user} onConfirmBooking={onConfirmBooking} activeBooking={activeBooking} />
  );
}

function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser,      setCurrentUser]      = useState(null);
  const [restoringSession, setRestoringSession] = useState(true);
  const [showAnim,         setShowAnim]         = useState(false);
  const [animTotals,       setAnimTotals]       = useState(null);
  const [activeBooking,    setActiveBooking]    = useState(null);

  const idleTimerRef = useRef(null);
  const currentUserRef = useRef(null);
  currentUserRef.current = currentUser;

  const needsCarSetup = currentUser?.role === "User" && !currentUser?.car;

  // ── Logout ────────────────────────────────────────────────
  const handleLogout = useCallback((opts = {}) => {
    setToken(null);
    localStorage.removeItem("cw_token");
    setCurrentUser(null);
    setActiveBooking(null);
    navigate("/login", { replace: true });
    if (opts.reason) toast.error(opts.reason, { id: "session-toast" });
  }, [navigate]);

  // ── Global 401 handling ──────────────────────────────────
  useEffect(() => {
    onUnauthorized(() => {
      if (currentUserRef.current) {
        handleLogout({ reason: "Your session has expired. Please sign in again." });
      }
    });
  }, [handleLogout]);

  // ── Idle/session timeout ─────────────────────────────────
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!currentUserRef.current) return;
    idleTimerRef.current = setTimeout(() => {
      handleLogout({ reason: "You were signed out after 30 minutes of inactivity." });
    }, IDLE_TIMEOUT_MS);
  }, [handleLogout]);

  useEffect(() => {
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach(ev => window.addEventListener(ev, resetIdleTimer));
    resetIdleTimer();
    return () => {
      events.forEach(ev => window.removeEventListener(ev, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer, currentUser]);

  // ── Restore session ──────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("cw_token");
    if (!saved) { setRestoringSession(false); return; }

    setToken(saved);
    api.get("/auth/me").then(res => {
      if (res.ok) setCurrentUser(res.data.user);
      else localStorage.removeItem("cw_token");
      setRestoringSession(false);
    });
  }, []);

  // ── Handlers ──────────────────────────────────────────────
  const handleLogin = async (user) => {
    setCurrentUser(user);
    localStorage.setItem("cw_token", getToken());
    if (user.role === "Admin") {
      const res = await api.get("/analytics");
      if (res.ok) setAnimTotals(res.data.totals);
    }
    setShowAnim(true);
  };

  const handleAnimDone = () => {
    setShowAnim(false);
    if (currentUser?.role === "User" && !currentUser?.car) navigate("/car-setup", { replace: true });
    else navigate("/dashboard", { replace: true });
  };

  const handleCarSaved = (updatedUser) => {
    setCurrentUser(updatedUser);
    navigate("/dashboard", { replace: true });
  };

  const handleUserUpdate = (updatedUser) => setCurrentUser(updatedUser);
  const handleConfirmBooking = (booking) => setActiveBooking(booking);
  const handleCancelBooking = async () => {
    if (!activeBooking) return;
    await api.put(`/bookings/${activeBooking._id}/cancel`, {});
    setActiveBooking(null);
  };

  const navTo = (view) => navigate(VIEW_TO_PATH[view] || "/dashboard");
  const goAuth = (view) => navigate(`/${view}`);
  const activeView = pathToView(location.pathname);

  // ── Auth-gated route wrapper ──────────────────────────────
  // allowedRoles=null means "any authenticated role"
  const protectedPage = (element, allowedRoles = null) => {
    if (restoringSession) {
      return <div className="min-h-screen flex items-center justify-center"><Spinner text="Preparing your charging experience..." /></div>;
    }
    if (!currentUser) return <Navigate to="/login" replace />;
    if (needsCarSetup && location.pathname !== "/car-setup") return <Navigate to="/car-setup" replace />;
    if (allowedRoles && !allowedRoles.includes(currentUser.role)) return <Navigate to="/dashboard" replace />;

    return (
      <>
        <AppHeader user={currentUser} onLogout={handleLogout} activeView={activeView} setActiveView={navTo} />
        <main className="pt-16 min-h-screen">
          <div className="container mx-auto px-6 py-8 max-w-7xl">
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                {element}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </>
    );
  };

  const dashboardForRole = () => {
    if (!currentUser) return null;
    if (currentUser.role === "User")            return <UserDashboard user={currentUser} setActiveView={navTo} activeBooking={activeBooking} onCancelBooking={handleCancelBooking} />;
    if (currentUser.role === "Station Manager")  return <ManagerDashboard user={currentUser} setActiveView={navTo} />;
    if (currentUser.role === "Admin")            return <AdminDashboard user={currentUser} setActiveView={navTo} />;
    return null;
  };

  if (restoringSession) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner text="Preparing your charging experience..." /></div>;
  }

  if (showAnim) return <WelcomeAnimation user={currentUser} totals={animTotals} onComplete={handleAnimDone} />;

  return (
    <Routes>
      <Route path="/login" element={
        currentUser ? <Navigate to={needsCarSetup ? "/car-setup" : "/dashboard"} replace /> : <Login onLogin={handleLogin} onNavigate={goAuth} />
      } />
      <Route path="/register" element={
        currentUser ? <Navigate to={needsCarSetup ? "/car-setup" : "/dashboard"} replace /> : <Register onLogin={handleLogin} onNavigate={goAuth} />
      } />

      <Route path="/car-setup" element={
        !currentUser ? <Navigate to="/login" replace /> :
        !needsCarSetup ? <Navigate to="/dashboard" replace /> : (
          <>
            <AppHeader user={currentUser} onLogout={handleLogout} activeView="main" setActiveView={() => {}} />
            <div className="pt-16"><CarSelection user={currentUser} onCarSaved={handleCarSaved} onLogout={handleLogout} /></div>
          </>
        )
      } />

      <Route path="/dashboard"     element={protectedPage(dashboardForRole())} />
      <Route path="/stations"      element={protectedPage(<FindStations activeBooking={activeBooking} onViewStation={s => navigate(`/stations/${s._id}`)} />, ["User"])} />
      <Route path="/stations/:stationId" element={protectedPage(<StationDetailRoute user={currentUser} onConfirmBooking={handleConfirmBooking} activeBooking={activeBooking} />, ["User"])} />
      <Route path="/bookings"      element={protectedPage(<BookingsPage user={currentUser} />, ["User"])} />
      <Route path="/vehicles"      element={protectedPage(<VehicleManager onUserUpdated={handleUserUpdate} />, ["User"])} />
      <Route path="/invoices"      element={protectedPage(<InvoicesPage user={currentUser} />, ["User"])} />
      <Route path="/profile"       element={protectedPage(<ProfilePage user={currentUser} onUserUpdate={handleUserUpdate} setActiveView={navTo} onLogout={handleLogout} />)} />
      <Route path="/analytics"     element={protectedPage(
        currentUser?.role === "Station Manager" ? <ManagerAnalytics user={currentUser} /> : <AnalyticsView isAdmin={currentUser?.role === "Admin"} user={currentUser} />,
        ["Station Manager", "Admin"]
      )} />
      <Route path="/admin/users"    element={protectedPage(<AdminUsers />, ["Admin"])} />
      <Route path="/admin/stations" element={protectedPage(<AdminStations />, ["Admin"])} />

      <Route path="/" element={<Navigate to={currentUser ? "/dashboard" : "/login"} replace />} />
      <Route path="*" element={<Navigate to={currentUser ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="text-white min-h-screen" style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>
        <AnimatedBackground />
        <div className="relative z-10"><AppRoutes /></div>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: "rgba(15,25,45,0.95)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)", fontSize: "14px" },
            success: { iconTheme: { primary: "#00C4FF", secondary: "#0A1628" } },
            error:   { iconTheme: { primary: "#ef4444", secondary: "#0A1628" } },
          }}
        />
        <style>{`
          * { box-sizing: border-box }
          ::-webkit-scrollbar { width: 4px }
          ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02) }
          ::-webkit-scrollbar-thumb { background: rgba(0,196,255,0.25); border-radius: 2px }
          select option { background: #0F1928; color: white }
          .leaflet-popup-content-wrapper, .leaflet-popup-tip { background: transparent !important; box-shadow: none !important }
          .cw-popup .leaflet-popup-content-wrapper { border-radius: 12px }
          input[type=range]::-webkit-slider-thumb { cursor: pointer }
        `}</style>
      </div>
    </BrowserRouter>
  );
}
