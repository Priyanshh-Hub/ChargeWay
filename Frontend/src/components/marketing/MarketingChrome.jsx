import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Btn } from '../ui/index';
import Icon from '../ui/Icon';
import Logo from '../ui/Logo';

// Single source of truth for the public marketing nav links — Home, About
// and Contact all render the exact same header/footer via this file so
// adding/renaming a marketing page never means editing three components.
export const MARKETING_LINKS = [
  { label: "Home",    path: "/" },
  { label: "About",   path: "/about" },
  { label: "Contact", path: "/contact" },
];

export const MarketingNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl border-b border-white/5" style={{ background: "rgba(10,13,20,0.7)" }}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate("/")} className="focus:outline-none" aria-label="ChargeWay home">
          <Logo size="md" />
        </button>

        <nav className="hidden md:flex items-center gap-1" aria-label="Marketing">
          {MARKETING_LINKS.map(l => {
            const active = location.pathname === l.path;
            return (
              <button key={l.path} onClick={() => navigate(l.path)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? "text-white" : "text-slate-400 hover:text-white"}`}
                style={active ? { background: "rgba(255,138,61,0.12)" } : undefined}
                aria-current={active ? "page" : undefined}>
                {l.label}
              </button>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <button onClick={() => navigate("/login")} className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-4 py-2">
            Log In
          </button>
          <Btn onClick={() => navigate("/register")} className="text-sm px-5">Get Started</Btn>
        </div>

        <button onClick={() => setMobileOpen(o => !o)}
          className="md:hidden w-10 h-10 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/5"
          aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen}>
          {mobileOpen ? (
            <Icon name="x" className="w-5 h-5" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t border-white/5" style={{ background: "rgba(10,13,20,0.95)" }}>
            <div className="px-6 py-4 flex flex-col gap-1">
              {MARKETING_LINKS.map(l => (
                <button key={l.path} onClick={() => { navigate(l.path); setMobileOpen(false); }}
                  className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5">
                  {l.label}
                </button>
              ))}
              <div className="flex gap-3 mt-2 pt-3 border-t border-white/5">
                <button onClick={() => { navigate("/login"); setMobileOpen(false); }}
                  className="flex-1 text-sm font-medium text-slate-300 hover:text-white transition-colors px-4 py-2.5 rounded-lg border border-white/10">
                  Log In
                </button>
                <Btn onClick={() => { navigate("/register"); setMobileOpen(false); }} className="flex-1 text-sm">Get Started</Btn>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export const MarketingFooter = () => {
  const navigate = useNavigate();
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="max-w-7xl mx-auto px-6 flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <Logo size="sm" />
            <p className="text-slate-500 text-xs mt-3 max-w-xs">
              Find, book, and pay for EV charging in seconds — on ChargeWay-owned stations and partner networks.
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Footer">
            {MARKETING_LINKS.map(l => (
              <button key={l.path} onClick={() => navigate(l.path)} className="text-sm text-slate-400 hover:text-white transition-colors">
                {l.label}
              </button>
            ))}
            <a href="mailto:hello@chargeway.app" className="text-sm text-slate-400 hover:text-white transition-colors">
              hello@chargeway.app
            </a>
          </nav>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/5">
          <p className="text-slate-500 text-xs">© {new Date().getFullYear()} ChargeWay. All rights reserved.</p>
          <p className="text-slate-600 text-xs">Beta — a charging marketplace &amp; simulator.</p>
        </div>
      </div>
    </footer>
  );
};
