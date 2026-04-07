import React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── API ──────────────────────────────────────────────────────
import { api, setToken, getToken } from './api/api';

// ── Layout ───────────────────────────────────────────────────
import AnimatedBackground from './components/layout/AnimatedBackground';
import AppHeader          from './components/layout/AppHeader';

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

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [currentUser,       setCurrentUser]       = useState(null);
  const [authView,          setAuthView]          = useState("login");
  const [appState,          setAppState]          = useState("auth");
  const [activeView,        setActiveView]        = useState("main");
  const [showAnim,          setShowAnim]          = useState(false);
  const [animTotals,        setAnimTotals]        = useState(null);
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [activeBooking,     setActiveBooking]     = useState(null);

  // ── Restore session ──────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("cw_token");
    if (saved) {
      setToken(saved);
      api.get("/auth/me").then(res => {
        if (res.ok) {
          setCurrentUser(res.data.user);
          setAppState(res.data.user.car
            ? "dashboard"
            : res.data.user.role === "User" ? "carSetup" : "dashboard"
          );
        } else {
          localStorage.removeItem("cw_token");
        }
      });
    }
  }, []);

  // ── Handlers ────────────────────────────────────────────────
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
    if (currentUser?.role === "User" && !currentUser?.car) setAppState("carSetup");
    else { setAppState("dashboard"); setActiveView("main"); }
  };

  const handleCarSaved = (updatedUser) => {
    setCurrentUser(updatedUser);
    setAppState("dashboard");
    setActiveView("main");
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem("cw_token");
    setCurrentUser(null);
    setAppState("auth");
    setAuthView("login");
    setActiveView("main");
    setActiveBooking(null);
  };

  // Called from ProfilePage when user saves name/phone
  const handleUserUpdate = (updatedUser) => {
    setCurrentUser(updatedUser);
  };

  const handleConfirmBooking = (booking) => setActiveBooking(booking);

  const handleCancelBooking = async () => {
    if (!activeBooking) return;
    await api.put(`/bookings/${activeBooking._id}/cancel`, {});
    setActiveBooking(null);
  };

  const navTo = (view) => {
    setActiveView(view);
    if (view !== "findstations") setSelectedStationId(null);
  };

  // ── View Router ──────────────────────────────────────────────
  const renderDashboard = () => {
    if (!currentUser) return null;
    const { role } = currentUser;

    if (activeView === "findstations") {
      if (selectedStationId) return (
        <StationLayout stationId={selectedStationId} onBack={() => setSelectedStationId(null)}
          user={currentUser} onConfirmBooking={handleConfirmBooking} activeBooking={activeBooking} />
      );
      return <FindStations activeBooking={activeBooking} onViewStation={s => setSelectedStationId(s._id)} />;
    }

    if (activeView === "bookings")      return <BookingsPage user={currentUser} />;
    if (activeView === "invoices")      return <InvoicesPage user={currentUser} />;
    if (activeView === "profile")       return <ProfilePage user={currentUser} onUserUpdate={handleUserUpdate} />;
    if (activeView === "analytics")     return role === "Station Manager"
      ? <ManagerAnalytics user={currentUser} />
      : <AnalyticsView isAdmin={role === "Admin"} user={currentUser} />;
    if (activeView === "adminUsers")    return <AdminUsers />;
    if (activeView === "adminStations") return <AdminStations />;

    if (role === "User")            return <UserDashboard user={currentUser} setActiveView={navTo} activeBooking={activeBooking} onCancelBooking={handleCancelBooking} />;
    if (role === "Station Manager") return <ManagerDashboard user={currentUser} setActiveView={navTo} />;
    if (role === "Admin")           return <AdminDashboard user={currentUser} setActiveView={navTo} />;
    return null;
  };

  // ── Content Router ───────────────────────────────────────────
  const renderContent = () => {
    if (showAnim) return <WelcomeAnimation user={currentUser} totals={animTotals} onComplete={handleAnimDone} />;

    if (appState === "auth") {
      return authView === "register"
        ? <Register onLogin={handleLogin} onNavigate={setAuthView} />
        : <Login    onLogin={handleLogin} onNavigate={setAuthView} />;
    }

    if (appState === "carSetup") return (
      <>
        <AppHeader user={currentUser} onLogout={handleLogout} activeView="main" setActiveView={() => {}} />
        <div className="pt-16"><CarSelection user={currentUser} onCarSaved={handleCarSaved} onLogout={handleLogout} /></div>
      </>
    );

    return (
      <>
        <AppHeader user={currentUser} onLogout={handleLogout} activeView={activeView} setActiveView={navTo} />
        <main className="pt-16 min-h-screen">
          <div className="container mx-auto px-6 py-8 max-w-7xl">
            <AnimatePresence mode="wait">
              <motion.div key={activeView} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                {renderDashboard()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </>
    );
  };

  return (
    <div className="text-white min-h-screen" style={{ fontFamily: "system-ui,-apple-system,sans-serif" }}>
      <AnimatedBackground />
      <div className="relative z-10">{renderContent()}</div>
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
  );
}