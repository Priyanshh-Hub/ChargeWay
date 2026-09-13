import React, { Suspense, lazy } from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';

// ── API ──────────────────────────────────────────────────────
import { api, setToken, getToken, onUnauthorized } from './api/api';

// ── Layout ───────────────────────────────────────────────────
import AnimatedBackground from './components/layout/AnimatedBackground';
import AppSidebar         from './components/layout/AppSidebar';
import { Spinner }        from './components/ui/index';

// ── Auth (kept eager — needed immediately on first load, before login) ──
import Login    from './components/auth/Login';
import Register from './components/auth/Register';
import Home     from './components/marketing/Home';
import About    from './components/marketing/About';
import Contact  from './components/marketing/Contact';

// ── Animations ───────────────────────────────────────────────
import WelcomeAnimation from './animations/WelcomeAnimation';

// ── User (lazy — only fetched once a session exists) ───────────
const UserDashboard   = lazy(() => import('./components/user/UserDashboard'));
const CarSelection    = lazy(() => import('./components/user/CarSelection'));
const BookingsPage    = lazy(() => import('./components/user/BookingsPage'));
const InvoicesPage    = lazy(() => import('./components/user/InvoicesPage'));
const ProfilePage     = lazy(() => import('./components/user/ProfilePage'));
const LiveSessionPage = lazy(() => import('./components/user/LiveSessionPage'));
const WalletPage      = lazy(() => import('./components/user/WalletPage'));
const SupportPage     = lazy(() => import('./components/user/SupportPage'));

// ── Vehicle ──────────────────────────────────────────────────
const VehicleManager = lazy(() => import('./components/vehicle/VehicleManager'));

// ── Stations ─────────────────────────────────────────────────
const FindStations  = lazy(() => import('./components/stations/FindStations'));
const StationLayout = lazy(() => import('./components/stations/StationLayout'));

// ── Manager ──────────────────────────────────────────────────
const ManagerDashboard = lazy(() => import('./components/manager/ManagerDashboard'));
const ManagerAnalytics = lazy(() => import('./components/manager/ManagerAnalytics'));

// ── Admin ────────────────────────────────────────────────────
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const AdminUsers     = lazy(() => import('./components/admin/AdminUsers'));
const AdminStations  = lazy(() => import('./components/admin/AdminStations'));
const AdminPlatformSettings = lazy(() => import('./components/admin/AdminPlatformSettings'));
const AnalyticsView  = lazy(() => import('./components/admin/AnalyticsView'));

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// Maps the app's internal "view id" vocabulary (used by AppSidebar's nav
// and every page's setActiveView calls) to real URLs. Keeping this map
// means none of the leaf page components need to change — only the
// navigation plumbing here does.
const VIEW_TO_PATH = {
  main:          "/dashboard",
  findstations:  "/stations",
  livesession:   "/live-session",
  bookings:      "/bookings",
  vehicles:      "/vehicles",
  invoices:      "/invoices",
  wallet:        "/wallet",
  profile:       "/profile",
  support:       "/support",
  analytics:     "/analytics",
  adminUsers:    "/admin/users",
  adminStations: "/admin/stations",
  platformSettings: "/admin/platform-settings",
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
  const [recentBookings,   setRecentBookings]   = useState([]);

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

  // ── Notification bell data — real recent activity, not fake data ──
  useEffect(() => {
    if (!currentUser || currentUser.role !== "User") return;
    api.get("/bookings").then(res => {
      if (res.ok) {
        const items = res.data.bookings.slice(0, 5).map(b => ({
          title: `${b.status === "Upcoming" ? "Booking confirmed" : b.status === "Completed" ? "Session completed" : "Booking cancelled"} — ${b.stationName || b.stationId?.name || "Station"}`,
          sub: `${b.date} · ₹${b.totalCost}`,
        }));
        setRecentBookings(items);
      }
    });
  }, [currentUser]);

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
      <AppSidebar user={currentUser} onLogout={handleLogout} activeView={activeView} setActiveView={navTo}>
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
            {element}
          </motion.div>
        </AnimatePresence>
      </AppSidebar>
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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Spinner text="Loading..." /></div>}>
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
          <CarSelection user={currentUser} onCarSaved={handleCarSaved} onLogout={handleLogout} />
        )
      } />

      <Route path="/dashboard"     element={protectedPage(dashboardForRole())} />
      <Route path="/stations"      element={protectedPage(<FindStations activeBooking={activeBooking} onViewStation={s => navigate(`/stations/${s._id}`)} />, ["User"])} />
      <Route path="/stations/:stationId" element={protectedPage(<StationDetailRoute user={currentUser} onConfirmBooking={handleConfirmBooking} activeBooking={activeBooking} />, ["User"])} />
      <Route path="/live-session"  element={protectedPage(<LiveSessionPage user={currentUser} onCancelBooking={handleCancelBooking} setActiveView={navTo} />, ["User"])} />
      <Route path="/bookings"      element={protectedPage(<BookingsPage user={currentUser} />, ["User"])} />
      <Route path="/vehicles"      element={protectedPage(<VehicleManager onUserUpdated={handleUserUpdate} />, ["User"])} />
      <Route path="/invoices"      element={protectedPage(<InvoicesPage user={currentUser} />, ["User"])} />
      <Route path="/wallet"        element={protectedPage(<WalletPage user={currentUser} onUserUpdate={handleUserUpdate} />, ["User"])} />
      <Route path="/support"       element={protectedPage(<SupportPage user={currentUser} />)} />
      <Route path="/profile"       element={protectedPage(<ProfilePage user={currentUser} onUserUpdate={handleUserUpdate} setActiveView={navTo} onLogout={handleLogout} />)} />
      <Route path="/analytics"     element={protectedPage(
        currentUser?.role === "Station Manager" ? <ManagerAnalytics user={currentUser} /> : <AnalyticsView isAdmin={currentUser?.role === "Admin"} user={currentUser} />,
        ["Station Manager", "Admin"]
      )} />
      <Route path="/admin/users"    element={protectedPage(<AdminUsers />, ["Admin"])} />
      <Route path="/admin/stations" element={protectedPage(<AdminStations />, ["Admin"])} />
      <Route path="/admin/platform-settings" element={protectedPage(<AdminPlatformSettings />, ["Admin"])} />

      <Route path="/" element={currentUser ? <Navigate to="/dashboard" replace /> : <Home />} />
      <Route path="/about"   element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="*" element={<Navigate to={currentUser ? "/dashboard" : "/login"} replace />} />
    </Routes>
    </Suspense>
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
            success: { iconTheme: { primary: "#FF8A3D", secondary: "#0A1628" } },
            error:   { iconTheme: { primary: "#ef4444", secondary: "#0A1628" } },
          }}
        />
        <style>{`
          * { box-sizing: border-box }
          ::-webkit-scrollbar { width: 4px }
          ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02) }
          ::-webkit-scrollbar-thumb { background: rgba(255,138,61,0.25); border-radius: 2px }
          select option { background: #0F1928; color: white }
          .leaflet-popup-content-wrapper, .leaflet-popup-tip { background: transparent !important; box-shadow: none !important }
          .cw-popup .leaflet-popup-content-wrapper { border-radius: 12px }
          input[type=range]::-webkit-slider-thumb { cursor: pointer }
        `}</style>
      </div>
    </BrowserRouter>
  );
}
