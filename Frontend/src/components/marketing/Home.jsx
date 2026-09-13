import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/api';
import { Btn } from '../ui/index';
import Icon from '../ui/Icon';
import { MarketingNav, MarketingFooter } from './MarketingChrome';

// Product renders that live in /Frontend (not /public, not /src) — imported
// directly so Vite bundles them like any other asset without us having to
// move brand imagery into the public/ folder. Swap the files in place
// (same filename) to update the hero art site-wide.
import stationHero from '../../../Background.png';
import chargerHero from '../../../Background2.png';
import networkShot from '../../../Reference2.png';

// Same phrasing as the physical charger signage in our own hero photo below —
// keeps the marketing copy and the product photography telling one story.
const WHY_CARDS = [
  { icon: "bolt",      title: "Ultrafast Charging", desc: "Up to 180kW DC fast charging gets you back on the road in minutes, not hours." },
  { icon: "analytics", title: "Smart Technology",   desc: "Live availability, dynamic time-of-use pricing, and a real-time session timeline — no guessing." },
  { icon: "check",     title: "Safe & Reliable",    desc: "PIN-verified check-in means charging only ever starts once staff confirm you're actually there." },
  { icon: "battery",   title: "Eco Friendly",       desc: "Every session tracked toward your personal carbon footprint, visible right on your dashboard." },
  { icon: "mail",      title: "24/7 Support",       desc: "Role-aware FAQs, a quick-answer assistant, and a real human on the other end when you need one." },
];

const Home = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/stations").then(res => {
      if (!res.ok) return;
      const stations = res.data.stations || [];
      const chargers = stations.flatMap(s => s.chargers || []);
      const available = chargers.filter(c => c.status === "Available").length;
      const locations = new Set(stations.map(s => s.address?.split(",").slice(-1)[0]?.trim()).filter(Boolean));
      setStats({
        stations: stations.length,
        chargers: chargers.length,
        available,
        locations: locations.size,
      });
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0D14]">
      <MarketingNav />

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        <img src={stationHero} alt="A ChargeWay ultrafast charging bay at night, an EV plugged in under the station canopy" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,13,20,0.55) 0%, rgba(10,13,20,0.75) 55%, #0A0D14 100%)" }} />

        <div className="relative max-w-7xl mx-auto px-6 w-full">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-slate-300 border border-white/15 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live network — book in seconds
            </div>
            <h1 className="text-white font-display font-bold leading-[1.05] mb-5" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}>
              Plug in.<br />
              <span style={{ background: "linear-gradient(90deg,#FF8A3D,#7C6AE8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Power on.
              </span>
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed mb-8 max-w-lg">
              Find a charger, book a slot, and start charging with a PIN-verified check-in —
              on ChargeWay-owned stations and partner networks, all in one app.
            </p>
            <div className="flex flex-wrap gap-3 mb-14">
              <Btn onClick={() => navigate("/register")} className="text-base px-7 py-3">Get Started — It's Free</Btn>
              <button onClick={() => navigate("/login")}
                className="px-7 py-3 rounded-xl text-base font-semibold text-white border border-white/20 hover:bg-white/5 transition-all">
                Log In
              </button>
            </div>
          </motion.div>

          {/* Live stat cards — real numbers from the network, not placeholders */}
          {stats && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
              {[
                { v: stats.stations, l: "Stations" },
                { v: stats.chargers, l: "Chargers" },
                { v: stats.available, l: "Available Now" },
                { v: stats.locations, l: "Locations" },
              ].map(s => (
                <div key={s.l} className="rounded-2xl px-4 py-3 border border-white/10" style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)" }}>
                  <p className="text-white text-2xl font-black cw-figure">{s.v}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{s.l}</p>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Why ChargeWay ── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}>
          <h2 className="text-page text-white text-center mb-3">
            Why <span style={{ color: "#FF8A3D" }}>ChargeWay</span>
          </h2>
          <p className="text-slate-400 text-center max-w-xl mx-auto mb-14">
            Built the way real charging works — not just a map with pins on it.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {WHY_CARDS.map((c, i) => (
            <motion.div key={c.title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              whileHover={{ y: -4, borderColor: "rgba(255,138,61,0.35)" }}
              className="rounded-2xl p-6 border border-white/10 transition-colors" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(255,138,61,0.12)" }}>
                <Icon name={c.icon} className="w-5 h-5 text-[#FF8A3D]" />
              </div>
              <h3 className="text-white font-bold text-sm mb-2">{c.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Network: Owned + Partner ── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <motion.div initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}
          className="relative rounded-3xl overflow-hidden mb-6 h-56 sm:h-64">
          <img src={networkShot} alt="A row of ChargeWay charging stations at night with an EV parked at one" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,13,20,0.2) 0%, rgba(10,13,20,0.85) 100%)" }} />
          <div className="relative h-full flex flex-col items-center justify-end text-center px-6 pb-6">
            <h2 className="text-page text-white">One app, two kinds of stations</h2>
            <p className="text-slate-300 text-sm mt-1 max-w-md">Booked the same way, checked into the same way — you shouldn't have to think about who owns the hardware.</p>
          </div>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5 }}
            className="rounded-3xl p-8 border border-white/10" style={{ background: "linear-gradient(135deg, rgba(255,138,61,0.08), rgba(255,138,61,0.02))" }}>
            <span className="text-xs font-bold px-3 py-1 rounded-full text-[#FF8A3D]" style={{ background: "rgba(255,138,61,0.15)" }}>⚡ Owned Network</span>
            <h3 className="text-card text-white mt-4 mb-2">ChargeWay-run stations</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Built, maintained, and priced by us — with the full prepaid discount and consistent
              time-of-use pricing across every location.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5 }}
            className="rounded-3xl p-8 border border-white/10" style={{ background: "linear-gradient(135deg, rgba(124,106,232,0.08), rgba(124,106,232,0.02))" }}>
            <span className="text-xs font-bold px-3 py-1 rounded-full text-[#7C6AE8]" style={{ background: "rgba(124,106,232,0.15)" }}>🤝 Partner Network</span>
            <h3 className="text-card text-white mt-4 mb-2">Third-party chargers</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Independent operators on our platform — book them the same way, through the same app,
              with the same PIN check-in.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Partner With Us ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}
          className="rounded-3xl border border-white/10 overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(124,106,232,0.1), rgba(255,138,61,0.04))" }}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
            <div className="lg:col-span-3 p-8 sm:p-12">
              <span className="text-xs font-bold px-3 py-1 rounded-full text-[#7C6AE8]" style={{ background: "rgba(124,106,232,0.15)" }}>
                🤝 For charger owners
              </span>
              <h2 className="text-page text-white mt-4 mb-4">Own a charger? Partner with us.</h2>
              <p className="text-slate-300 text-sm leading-relaxed mb-6 max-w-lg">
                List your charging station on ChargeWay and reach drivers already looking for a place to
                plug in — without building your own booking app, payment flow, or support desk. We handle
                discovery, bookings, PIN-verified check-in, and payment collection; you keep running the
                hardware.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                {[
                  { icon: "users",   text: "Reach ChargeWay's rider base without your own app" },
                  { icon: "invoices", text: "You keep the majority of energy revenue — we take a transparent commission, shown up front" },
                  { icon: "shield",  text: "PIN check-in means no-shows and disputes are minimized" },
                  { icon: "analytics", text: "A manager dashboard for pricing, chargers, and payouts" },
                ].map(f => (
                  <div key={f.text} className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(124,106,232,0.15)" }}>
                      <Icon name={f.icon} className="w-3.5 h-3.5 text-[#7C6AE8]" />
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed pt-1">{f.text}</p>
                  </div>
                ))}
              </div>

              <Btn onClick={() => navigate("/register?role=partner")} className="text-base px-7 py-3">
                Apply to Become a Partner
              </Btn>
              <p className="text-slate-500 text-xs mt-3">
                Free to apply. Every application is reviewed by our team before your station goes live —
                usually within a couple of days.
              </p>
            </div>

            <div className="lg:col-span-2 p-8 sm:p-12 border-t lg:border-t-0 lg:border-l border-white/10" style={{ background: "rgba(0,0,0,0.15)" }}>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-5">How it works</p>
              <div className="space-y-5">
                {[
                  { n: "1", t: "Apply", d: "Tell us about your station — location, chargers, and your pricing." },
                  { n: "2", t: "We review", d: "Our team checks the details. Most applications hear back within days." },
                  { n: "3", t: "Go live", d: "Once approved, your station appears in search, bookable like any other." },
                  { n: "4", t: "Get paid", d: "Riders pay in-app. Your share settles to you, minus our commission." },
                ].map(s => (
                  <div key={s.n} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ background: "linear-gradient(135deg,#7C6AE8,#5B47E0)" }}>
                      {s.n}
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">{s.t}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{s.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── CTA ── */}
      <motion.section initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.5 }}
        className="relative overflow-hidden mx-6 mb-16 rounded-3xl">
        <img src={chargerHero} alt="Close-up of a ChargeWay 180kW ultrafast charger with a vehicle plugged in" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(10,13,20,0.92) 40%, rgba(10,13,20,0.5) 100%)" }} />
        <div className="relative px-8 py-16 sm:px-16 max-w-xl">
          <h2 className="text-hero text-white mb-4">Ready to plug in?</h2>
          <p className="text-slate-300 mb-8">Create an account and book your first charging session in under a minute.</p>
          <Btn onClick={() => navigate("/register")} className="text-base px-7 py-3">Get Started — It's Free</Btn>
        </div>
      </motion.section>

      <MarketingFooter />
    </div>
  );
};

export default Home;
