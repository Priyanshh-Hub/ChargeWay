import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/api';
import { Btn } from '../ui/index';
import Icon from '../ui/Icon';
import { MarketingNav, MarketingFooter } from './MarketingChrome';

// Renders/photography kept in /Frontend (sibling of src/, not inside it, and
// not in /public) — see the same pattern in Home.jsx. Swap any of these
// files in place (same filename, same folder) to update the page.
import aboutHero from '../../../Reference1.png';
import ctaImage  from '../../../Reference5.png';
import promiseLogo from '../../../Logo.png';

// ── Founder / Co-Founder photos ─────────────────────────────────
// Placeholders live at Frontend/Founder.jpg and Frontend/CoFounder.jpg.
// Drop in the real headshots later using those exact filenames/paths and
// this page picks them up automatically — no code changes needed.
import founderPhoto   from '../../../Founder.jpg';
import cofounderPhoto from '../../../CoFounder.jpg';

const VALUES = [
  { icon: "bolt",     title: "Move fast, stay honest",   desc: "We'd rather ship a working beta and tell you exactly what it is than fake a feature to look finished." },
  { icon: "shield",   title: "Correctness over novelty",  desc: "State machines, ledgers, and audit trails come before visual polish — a charging platform has to be right first." },
  { icon: "users",    title: "Built with real operators", desc: "Every workflow — booking, faults, settlements — is shaped by conversations with the station managers who actually run this stuff." },
  { icon: "battery",  title: "Sustainability by default", desc: "Every session rolls up into a footprint number on your dashboard, not a marketing footnote." },
];

const TEAM = [
  {
    photo: founderPhoto,
    photoHint: "Founder.jpg",
    name: "Priyansh Patel",
    role: "Founder & CEO",
    bio: "Designed and built ChargeWay end to end — product, backend architecture, and the booking/payment state machines. Came to EV charging after one too many trips to a \"working\" charger that wasn't, and decided the fix was a platform that's honest about what it does and doesn't know.",
  },
  {
    photo: cofounderPhoto,
    photoHint: "CoFounder.jpg",
    name: "Co-Founder Name",
    role: "Co-Founder & CTO",
    bio: "Leads engineering and architecture — the state machines, ledger, and simulator behind ChargeWay. Replace this bio with your own background.",
  },
];

const About = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/stations").then(res => {
      if (!res.ok) return;
      const stations = res.data.stations || [];
      const chargers = stations.flatMap(s => s.chargers || []);
      setStats({
        stations: stations.length,
        chargers: chargers.length,
        cities: new Set(stations.map(s => s.address?.split(",").slice(-1)[0]?.trim()).filter(Boolean)).size,
      });
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0D14]">
      <MarketingNav />

      {/* ── Hero ── */}
      <section className="relative pt-40 pb-20 overflow-hidden">
        <img src={aboutHero} alt="Close-up of a ChargeWay ultrafast charging connector plugged into a vehicle at night"
          className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,13,20,0.65) 0%, rgba(10,13,20,0.85) 60%, #0A0D14 100%)" }} />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-slate-300 border border-white/15 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Beta — built in public
            </div>
            <h1 className="text-white font-display font-bold leading-[1.05] mb-5" style={{ fontSize: "clamp(2.25rem, 5vw, 3.5rem)" }}>
              We're building the charging
              network <span style={{ background: "linear-gradient(90deg,#FF8A3D,#7C6AE8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>India's EVs deserve</span>
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed max-w-2xl mx-auto">
              ChargeWay started as a simple question: why does finding a working, honestly-priced charger
              still feel like guesswork? We're a small team building the marketplace and the simulator
              that answers it — one properly integrated feature at a time.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ── */}
      {stats && (
        <section className="max-w-5xl mx-auto px-6 -mt-6 mb-20 relative z-10">
          <div className="grid grid-cols-3 gap-4">
            {[
              { v: stats.stations, l: "Stations live" },
              { v: stats.chargers, l: "Chargers" },
              { v: stats.cities,   l: "Cities" },
            ].map(s => (
              <div key={s.l} className="rounded-2xl px-4 py-5 text-center border border-white/10" style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)" }}>
                <p className="text-white text-3xl font-black cw-figure">{s.v}</p>
                <p className="text-slate-400 text-xs mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Story ── */}
      <section className="max-w-4xl mx-auto px-6 py-4 mb-20">
        <h2 className="text-page text-white mb-5">Our story</h2>
        <div className="space-y-4 text-slate-300 leading-relaxed">
          <p>
            ChargeWay is currently a beta EV charging marketplace and simulator — not yet a
            production OCPP-connected network. That's a deliberate choice: it lets us get the
            booking, payment, and charging-session logic genuinely right — proper state machines,
            an immutable wallet ledger, real authorization — before we plug in physical hardware.
          </p>
          <p>
            Replace this paragraph with the real founding story: what problem you personally ran
            into, why "beta simulator first" was the right call, and what the first version of
            ChargeWay looked like.
          </p>
          <p>
            The plan from here is straightforward: keep the architecture honest enough that the
            simulator can be swapped for real OCPP charger adapters later without a rewrite, and
            keep shipping the features drivers and station partners actually asked for.
          </p>
        </div>
      </section>

      {/* ── Our promise (with the actual ChargeWay artwork) ── */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center rounded-3xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
          <img src={promiseLogo} alt="ChargeWay illustrated brand artwork — an EV plugged into a charger beside the ChargeWay wordmark" className="w-full h-full object-cover" />
          <div className="p-8 sm:p-10">
            <h2 className="text-card text-white mb-3">One promise, everywhere in the app</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              If a number is on your screen — a price, a charge level, a timer — it either came from
              something that actually happened (a completed booking, a verified check-in, elapsed real
              time), or it's clearly labeled as something you entered yourself. Nothing is dressed up to
              look like a live sensor reading when it isn't one.
            </p>
          </div>
        </div>
      </section>

      {/* ── What we do ── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-page text-white text-center mb-3">What ChargeWay actually does</h2>
        <p className="text-slate-400 text-center max-w-2xl mx-auto mb-14">
          Three jobs, done properly, rather than ten done halfway.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { icon: "search", title: "Find a charger that's actually free",
              desc: "Real-time charger status per station — Available, Charging, or in Maintenance — not a pin on a map that might be occupied, broken, or gone." },
            { icon: "booking", title: "Book it, don't just show up and hope",
              desc: "Reserve a specific charger for a specific slot. The reservation is atomic — two people can't claim the same charger by both tapping at once." },
            { icon: "shield", title: "Prove you actually showed up",
              desc: "A 4-digit PIN, read aloud to station staff, is what actually starts your charging session — not a timer that starts the moment you tap \"book.\"" },
          ].map(c => (
            <div key={c.title} className="rounded-2xl p-6 border border-white/10" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(124,106,232,0.12)" }}>
                <Icon name={c.icon} className="w-5 h-5 text-[#7C6AE8]" />
              </div>
              <h3 className="text-white font-bold text-sm mb-2">{c.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How we're different ── */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-page text-white text-center mb-3">Where we fit in</h2>
        <p className="text-slate-400 text-center max-w-2xl mx-auto mb-10">
          India's charging market already has large, established players — Tata Power EZ Charge,
          Statiq, ChargeZone, Jio-bp Pulse, and Ather Grid among them — running thousands of chargers
          between them. We're not trying to out-build their hardware footprint. We're building the
          specific mechanics we think matter most and haven't seen done the way we'd want, as a small
          team that can move faster on them than a large network can:
        </p>
        <div className="space-y-4">
          {[
            { t: "A reservation that's actually a reservation", d: "Booking a charger atomically claims it — it can't be double-booked by two people who both check availability a second apart." },
            { t: "Charging starts on proof, not on a timer", d: "A PIN check-in ties the start of your session to an actual human confirmation that you're there, not to whenever you tapped \"book.\"" },
            { t: "Partner economics you can see", d: "If a station is a third-party partner rather than ours, our commission on that booking is a config value an admin sets — not a black box." },
            { t: "Every partner station is reviewed before it's public", d: "A self-listed station starts hidden and unbookable until we approve it — so what you see in search is what we've actually vetted, not just whatever anyone submitted." },
          ].map(item => (
            <div key={item.t} className="flex items-start gap-3 p-4 rounded-xl border border-white/10" style={{ background: "rgba(255,255,255,0.03)" }}>
              <Icon name="check" className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-sm font-semibold">{item.t}</p>
                <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{item.d}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-slate-500 text-xs text-center mt-8 max-w-xl mx-auto">
          We're a beta / simulator today, not yet connected to physical OCPP hardware — see the note on
          this below. Being small and early is exactly why we can hold these details to a higher bar
          before we scale.
        </p>
      </section>

      {/* ── Partner Program: who controls what ── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-page text-white text-center mb-3">The Partner Program, in full</h2>
        <p className="text-slate-400 text-center max-w-2xl mx-auto mb-12">
          If you're a third-party station owner, here's exactly who controls what — no part of this is
          left to guesswork on either side.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl p-6 border border-white/10" style={{ background: "rgba(255,138,61,0.05)" }}>
            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs" style={{ background: "rgba(255,138,61,0.15)" }}>⚡</span>
              What ChargeWay (Admin) controls
            </h3>
            <ul className="space-y-2.5">
              {[
                "Reviews and approves or rejects every new partner application before it's ever visible to riders",
                "Sets the commission percentage ChargeWay takes on partner energy revenue (shown to you before you apply)",
                "Can reclassify a station between Owned and Partner if its status changes",
                "Sets platform-wide policies — the platform fee riders pay, late-arrival fee rate, prepaid discount rate",
                "Can suspend a listing if it violates the terms both sides agreed to at approval",
              ].map(t => (
                <li key={t} className="flex items-start gap-2 text-slate-300 text-xs leading-relaxed">
                  <Icon name="check" className="w-3.5 h-3.5 text-[#FF8A3D] flex-shrink-0 mt-0.5" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl p-6 border border-white/10" style={{ background: "rgba(124,106,232,0.05)" }}>
            <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs" style={{ background: "rgba(124,106,232,0.15)" }}>🤝</span>
              What you (the Partner) control
            </h3>
            <ul className="space-y-2.5">
              {[
                "Your per-kWh price, station name, address, and coordinates",
                "Which facilities you offer — parking, WiFi, restrooms, and so on",
                "Each charger's hardware spec (type and power) and whether it's Available or under Maintenance",
                "Whether your station is Online or Offline day to day, once approved",
                "Verifying riders' check-in PINs at your location and replying to reviews",
              ].map(t => (
                <li key={t} className="flex items-start gap-2 text-slate-300 text-xs leading-relaxed">
                  <Icon name="check" className="w-3.5 h-3.5 text-[#7C6AE8] flex-shrink-0 mt-0.5" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-slate-500 text-xs text-center mt-6">
          Reserved and Charging charger states are never set manually by either side — those follow
          real bookings automatically, so what riders see always matches what's actually happening.
        </p>
      </section>

      {/* ── Values ── */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-page text-white text-center mb-3">What we believe</h2>
        <p className="text-slate-400 text-center max-w-xl mx-auto mb-14">
          The principles behind every state machine, ledger entry, and pixel.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {VALUES.map(v => (
            <div key={v.title} className="rounded-2xl p-6 border border-white/10" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(255,138,61,0.12)" }}>
                <Icon name={v.icon} className="w-5 h-5 text-[#FF8A3D]" />
              </div>
              <h3 className="text-white font-bold text-sm mb-2">{v.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Founder / Co-Founder ── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-page text-white text-center mb-3">Who's behind ChargeWay</h2>
        <p className="text-slate-400 text-center max-w-xl mx-auto mb-14">
          A small founding team building the whole stack — product, engineering, and the
          relationships with the station partners we run on.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {TEAM.map(person => (
            <div key={person.name} className="rounded-3xl p-8 border border-white/10 text-center"
              style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="w-32 h-32 rounded-full mx-auto mb-5 overflow-hidden border-2"
                style={{ borderColor: "rgba(255,138,61,0.4)" }}>
                <img src={person.photo} alt={`${person.name}, ${person.role}`} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-white font-bold text-lg">{person.name}</h3>
              <p className="text-[#FF8A3D] text-sm font-semibold mb-3">{person.role}</p>
              <p className="text-slate-400 text-sm leading-relaxed">{person.bio}</p>
            </div>
          ))}
        </div>
        <p className="text-slate-600 text-xs text-center mt-8">
          To use real photos: replace <code className="text-slate-400">Frontend/Founder.jpg</code> and{" "}
          <code className="text-slate-400">Frontend/CoFounder.jpg</code> with your own images — same
          filenames, same folder — and update the names/roles/bios above in <code className="text-slate-400">About.jsx</code>.
        </p>
      </section>

      {/* ── CTA ── */}
      <section className="relative overflow-hidden mx-6 mb-16 rounded-3xl">
        <img src={ctaImage} alt="A ChargeWay ultrafast charger" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(10,13,20,0.92) 40%, rgba(10,13,20,0.5) 100%)" }} />
        <div className="relative px-8 py-16 sm:px-16 max-w-xl">
          <h2 className="text-hero text-white mb-4">Want to build this with us?</h2>
          <p className="text-slate-300 mb-8">Whether you're a driver, a station partner, or just curious — get in touch.</p>
          <div className="flex flex-wrap gap-3">
            <Btn onClick={() => navigate("/contact")} className="text-base px-7 py-3">Contact Us</Btn>
            <button onClick={() => navigate("/register")}
              className="px-7 py-3 rounded-xl text-base font-semibold text-white border border-white/20 hover:bg-white/5 transition-all">
              Get Started
            </button>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default About;
