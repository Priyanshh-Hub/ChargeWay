import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../ui/Icon';
import Logo from '../ui/Logo';
import { api } from '../../api/api';

const NAV = {
  User: [
    { id: "main",         label: "Dashboard",     icon: "bolt"      },
    { id: "findstations", label: "Book Charger",  icon: "stations"  },
    { id: "livesession",  label: "Live Sessions", icon: "battery"   },
    { id: "bookings",     label: "My Bookings",   icon: "booking"   },
    { id: "vehicles",     label: "Vehicles",      icon: "car"       },
    { id: "invoices",     label: "Invoices",      icon: "invoices"  },
    { id: "wallet",       label: "Wallet",        icon: "wallet"    },
  ],
  "Station Manager": [
    { id: "main",      label: "Dashboard", icon: "bolt"      },
    { id: "analytics", label: "Analytics", icon: "analytics" },
  ],
  Admin: [
    { id: "main",              label: "Overview",  icon: "bolt"      },
    { id: "analytics",         label: "Analytics", icon: "analytics" },
    { id: "adminStations",     label: "Stations",  icon: "stations"  },
    { id: "adminUsers",        label: "Users",     icon: "users"     },
    { id: "platformSettings",  label: "Pricing",   icon: "wallet"    },
  ],
};
const FOOTER_NAV = [
  { id: "profile", label: "Profile", icon: "user" },
  { id: "support", label: "Support", icon: "shield" },
];

const AppSidebar = ({ user, onLogout, activeView, setActiveView, children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Real notifications, polled every 20s so the bell reflects booking
  // confirmations, cancellations, refunds, and review replies without a
  // full page reload (lightweight stand-in for a websocket push).
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    const res = await api.get("/notifications");
    if (res.ok) {
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    }
  };
  useEffect(() => {
    loadNotifications();
    const id = setInterval(loadNotifications, 20000);
    return () => clearInterval(id);
  }, []);

  const markRead = async (n) => {
    if (n.read) return;
    setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
    setUnreadCount(c => Math.max(0, c - 1));
    await api.put(`/notifications/${n._id}/read`, {});
  };
  const markAllRead = async () => {
    setNotifications(prev => prev.map(x => ({ ...x, read: true })));
    setUnreadCount(0);
    await api.put("/notifications/read-all", {});
  };

  const timeAgo = (date) => {
    const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (secs < 60) return "just now";
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return `${Math.floor(secs / 86400)}d ago`;
  };

  const NOTIF_ICON = {
    booking_confirmed: "booking", booking_cancelled: "x", session_complete: "battery",
    refund_issued: "wallet", review_reply: "star", support_reply: "mail", station_status: "stations",
  };

  const items = NAV[user?.role] || [];

  useEffect(() => {
    const onClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (id) => { setActiveView(id); setMobileOpen(false); };

  const NavButton = ({ item }) => {
    const active = activeView === item.id;
    return (
      <button onClick={() => go(item.id)}
        className={`relative flex items-center gap-3 pl-4 pr-3.5 py-2.5 rounded-xl text-sm font-medium w-full transition-all overflow-hidden ${active ? "text-white" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
        style={active ? { background: "rgba(124,106,232,0.12)" } : {}}>
        {active && (
          <>
            {/* Current flowing along the active item's left edge */}
            <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full"
              style={{ background: "linear-gradient(180deg, #FF8A3D, #5B47E0)" }} />
            <span className="absolute left-[1px] w-1.5 h-1.5 rounded-full bg-[#FF8A3D] cw-pulse-dot"
              style={{ top: "50%", marginTop: "-3px" }} />
          </>
        )}
        <Icon name={item.icon} className="w-4.5 h-4.5 flex-shrink-0" style={{ width: 18, height: 18, color: active ? "#FF8A3D" : undefined }} />
        <span>{item.label}</span>
      </button>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-5 py-5">
        <Logo size="sm" />
      </div>
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {items.map(item => <NavButton key={item.id} item={item} />)}
        <div className="pt-3 mt-3 border-t border-white/5 space-y-1">
          {FOOTER_NAV.map(item => <NavButton key={item.id} item={item} />)}
        </div>
      </nav>
      <div className="p-3 border-t border-white/5">
        <button onClick={onLogout}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium w-full text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-all">
          <Icon name="logout" className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0 fixed top-0 left-0 bottom-0 border-r border-white/5"
        style={{ background: "rgba(5,13,26,0.95)", backdropFilter: "blur(20px)" }}>
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 lg:hidden" style={{ background: "rgba(0,0,0,0.6)" }} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: "tween", duration: 0.2 }}
              className="fixed top-0 left-0 bottom-0 w-64 z-50 lg:hidden border-r border-white/5"
              style={{ background: "rgba(5,13,26,0.98)", backdropFilter: "blur(20px)" }}>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex-1 lg:pl-64 min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-white/5"
          style={{ background: "rgba(5,13,26,0.85)", backdropFilter: "blur(20px)" }}>
          <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileOpen(true)}
                className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                aria-label="Open menu">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <div className="lg:hidden"><Logo size="sm" /></div>
            </div>

            <div className="flex items-center gap-2">
              {/* Notification bell */}
              <div className="relative" ref={notifRef}>
                <button onClick={() => setNotifOpen(o => !o)}
                  className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                  aria-label="Notifications">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#FF8A3D] text-[9px] font-black text-black flex items-center justify-center cw-figure">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {notifOpen && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/10 overflow-hidden z-50"
                      style={{ background: "rgba(15,25,45,0.98)", backdropFilter: "blur(20px)", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
                      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                        <p className="text-sm font-bold text-white">Notifications</p>
                        {unreadCount > 0 && (
                          <button onClick={markAllRead} className="text-xs text-[#FF8A3D] hover:text-[#FFAB70] font-medium">Mark all read</button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="text-slate-500 text-sm text-center py-8">You're all caught up.</p>
                        ) : notifications.map(n => (
                          <button key={n._id} onClick={() => markRead(n)}
                            className="w-full text-left px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-all flex items-start gap-2.5">
                            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A3D] mt-1.5 flex-shrink-0" />}
                            <div className={n.read ? "opacity-60" : ""}>
                              <p className="text-sm text-white leading-snug">{n.message}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{timeAgo(n.createdAt)}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Profile menu */}
              <div className="relative" ref={profileRef}>
                <button onClick={() => setProfileOpen(o => !o)}
                  className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-all">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#5B47E0,#FF8A3D)" }}>
                    {(user?.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-semibold text-white">{user?.name?.split(" ")[0]}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-500 hidden sm:block"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      className="absolute right-0 mt-2 w-52 rounded-2xl border border-white/10 overflow-hidden z-50"
                      style={{ background: "rgba(15,25,45,0.98)", backdropFilter: "blur(20px)", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
                      <div className="px-4 py-3 border-b border-white/5">
                        <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                        <p className="text-xs text-[#FF8A3D]">{user?.role}</p>
                      </div>
                      <button onClick={() => { setProfileOpen(false); go("profile"); }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 transition-all">
                        <Icon name="user" className="w-4 h-4" /> My Profile
                      </button>
                      <button onClick={() => { setProfileOpen(false); onLogout(); }}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10 transition-all">
                        <Icon name="logout" className="w-4 h-4" /> Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <main>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppSidebar;
