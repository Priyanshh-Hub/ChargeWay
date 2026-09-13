import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { api } from '../../api/api';
import { GlassCard, Btn, Spinner } from '../ui/index';
import Icon from '../ui/Icon';

// FAQs are scoped per role — a rider, a station manager, and an admin are
// doing fundamentally different things in this app, so one shared FAQ list
// meant two-thirds of it was always irrelevant to whoever was reading it.
const FAQS_BY_ROLE = {
  User: [
    { q: "How do I book a charging slot?", a: "Go to \"Book Charger\", search or browse stations, pick an available charger, choose a time slot, and confirm your vehicle details." },
    { q: "Can I cancel a booking?", a: "Yes — go to \"My Bookings\", find the upcoming session, and tap Cancel. If it was already paid, a refund is issued automatically to your original payment method." },
    { q: "How is the cost calculated?", a: "You're charged for the energy delivered (kWh × the station's rate) plus a platform fee, with GST applied on top. Rates can be lower off-peak and higher at busy hours — the app shows which applies when you pick a time slot." },
    { q: "Where do I find my invoices?", a: "The \"Invoices\" section lists every completed session. You can preview, download, print, or share any invoice from there." },
    { q: "How do I add or remove a vehicle?", a: "Go to \"Vehicles\" to add, edit, delete, or set a primary vehicle. You can save up to 6 vehicles on one account." },
    { q: "I forgot my password — what do I do?", a: "On the login screen, tap \"Forgot password?\" and follow the reset link sent to your email." },
    { q: "How do I top up my wallet?", a: "Go to \"Wallet\" and tap \"Add Money\" — pay securely via Razorpay and your balance updates instantly." },
    { q: "What happens if I don't show up for my booking?", a: "The charger stays reserved for your time slot; cancel ahead of time if your plans change so someone else can use it." },
  ],
  "Station Manager": [
    { q: "How do I change my charging rate?", a: "Go to your Dashboard → Settings on your station card, and update the ₹/kWh rate. Changes apply to new bookings immediately." },
    { q: "What is Time-of-Use pricing?", a: "In Station Settings you can turn on peak/off-peak pricing — charge more during your busy morning/evening windows and less at quiet hours, which pulls demand into off-peak times." },
    { q: "How do I mark a charger offline for maintenance?", a: "On your Dashboard, each charger has a status control — set it to Maintenance or Offline and it stops appearing as bookable until you switch it back." },
    { q: "How do I complete a booking once a driver has finished charging?", a: "Find the booking under your station's upcoming sessions and tap Complete — this frees the charger and generates the rider's invoice." },
    { q: "Can I reply to a review on my station?", a: "Yes — open your station's page, find the review, and tap \"Reply as station owner.\" Your reply is shown publicly under their review." },
    { q: "How do I see my station's performance?", a: "The Analytics tab shows revenue, completed sessions, and utilization for each station you manage — switch stations with the tabs at the top if you run more than one." },
  ],
  Admin: [
    { q: "How do I suspend or delete a user?", a: "Go to All Users, use the row actions to suspend (reversible) or delete (permanent — cancels their upcoming bookings). Both actions are recorded in the audit log." },
    { q: "Where can I see platform-wide activity?", a: "The Admin Dashboard gives a live overview; Analytics has the full breakdown with an Excel export." },
    { q: "How do I resolve a support ticket?", a: "Open the \"All Tickets\" panel below — mark any ticket Resolved once you've replied to the user directly by email." },
    { q: "How do I add or remove a station?", a: "Go to All Stations to view every station on the platform; station creation happens when a Station Manager registers with station details." },
    { q: "What actions get logged in the audit trail?", a: "User suspensions/deletions and station status or settings changes are all recorded with who made the change and when." },
  ],
};

// Stopwords stripped before scoring so matching isn't thrown off by
// filler words shared across unrelated questions.
const STOPWORDS = new Set(["the","a","an","is","are","my","how","do","i","to","for","of","in","on","and","or","can","what","where","when"]);
const tokenize = (s) => (s || "").toLowerCase().match(/[a-z0-9]+/g)?.filter(w => w.length > 2 && !STOPWORDS.has(w)) || [];

// Scores every FAQ in the role's list against the user's message by token
// overlap (question tokens weighted higher than answer tokens) — a real,
// if simple, match rather than a canned script. Returns the best match
// and its score so the caller can decide whether it's confident enough.
function matchFaq(message, faqs) {
  const qTokens = new Set(tokenize(message));
  if (qTokens.size === 0) return { best: null, score: 0 };
  let best = null, bestScore = 0;
  for (const f of faqs) {
    const qOverlap = tokenize(f.q).filter(t => qTokens.has(t)).length;
    const aOverlap = tokenize(f.a).filter(t => qTokens.has(t)).length;
    const score = qOverlap * 2 + aOverlap;
    if (score > bestScore) { bestScore = score; best = f; }
  }
  return { best, score: bestScore };
}

// A couple of intents answerable from live data instead of static FAQ text
// — genuinely useful in a real charging context, not decoration.
async function tryLiveIntent(message) {
  const m = message.toLowerCase();
  if (/(booking|session|charging).*(status|where|active|current)|status.*(booking|session)/.test(m)) {
    const res = await api.get("/bookings");
    if (!res.ok) return null;
    const active = res.data.bookings.find(b => b.status === "Upcoming");
    if (!active) return "You don't have an active booking right now. Head to Find Stations to book a charger.";
    if (active.chargingStartedAt) return `You're currently charging at ${active.stationName}, charger #${active.chargerId}. Check Live Session for live numbers.`;
    return `You have a reserved slot at ${active.stationName} (charger #${active.chargerId}, ${active.timeSlot}) — not checked in yet. Your PIN is ${active.checkInOtp}.`;
  }
  return null;
}

const SupportChatbot = ({ role, faqs }) => {
  const [messages, setMessages] = useState([
    { from: "bot", text: `Hi! Ask me anything about ${role === "Admin" ? "managing the platform" : role === "Station Manager" ? "running your station" : "booking and charging"} — I'll search the FAQs, or connect you to a human if I can't help.` },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setMessages(prev => [...prev, { from: "user", text }]);
    setInput("");
    setThinking(true);

    const liveAnswer = await tryLiveIntent(text).catch(() => null);
    if (liveAnswer) {
      setMessages(prev => [...prev, { from: "bot", text: liveAnswer }]);
      setThinking(false);
      return;
    }

    const { best, score } = matchFaq(text, faqs);
    if (best && score >= 2) {
      setMessages(prev => [...prev, { from: "bot", text: best.a, matchedQ: best.q }]);
    } else {
      setMessages(prev => [...prev, {
        from: "bot",
        text: "I couldn't find a solid match for that. Try rephrasing, or use the contact form below to reach a person directly.",
      }]);
    }
    setThinking(false);
  };

  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#5B47E0,#FF8A3D)" }}>
          <Icon name="mail" className="w-4 h-4 text-white" />
        </div>
        <p className="font-bold text-white text-sm">Quick Answers</p>
      </div>
      <div className="max-h-72 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[85%] px-3.5 py-2 rounded-2xl text-sm"
              style={m.from === "user"
                ? { background: "linear-gradient(135deg,#5B47E0,#FF8A3D)", color: "#fff" }
                : { background: "rgba(255,255,255,0.05)", color: "#e2e8f0" }}>
              {m.text}
            </div>
          </div>
        ))}
        {thinking && <p className="text-xs text-slate-500">Searching...</p>}
      </div>
      <form onSubmit={send} className="flex gap-2 px-5 py-3 border-t border-white/5">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask a question..."
          className="flex-1 rounded-xl px-3.5 py-2 text-sm text-white outline-none border"
          style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} />
        <Btn type="submit" disabled={!input.trim()} className="text-sm px-4">Send</Btn>
      </form>
    </GlassCard>
  );
};

const SupportPage = ({ user }) => {
  const role = user?.role || "User";
  const [open, setOpen] = useState(null);
  const [faqSearch, setFaqSearch] = useState("");

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // Admin-only: every ticket across every user
  const [allTickets, setAllTickets] = useState([]);
  const [loadingAll, setLoadingAll] = useState(role === "Admin");
  const [resolving, setResolving] = useState(null);
  const [ticketFilter, setTicketFilter] = useState("open");

  const loadTickets = async () => {
    const res = await api.get("/support/mine");
    if (res.ok) setTickets(res.data.tickets || []);
    setLoadingTickets(false);
  };
  const loadAllTickets = async () => {
    const res = await api.get("/support");
    if (res.ok) setAllTickets(res.data.tickets || []);
    setLoadingAll(false);
  };
  useEffect(() => {
    loadTickets();
    if (role === "Admin") loadAllTickets();
  }, [role]);

  const resolveTicket = async (id, status) => {
    setResolving(id);
    const res = await api.put(`/support/${id}/status`, { status });
    if (res.ok) {
      setAllTickets(prev => prev.map(t => t._id === id ? { ...t, status } : t));
      toast.success(status === "closed" ? "Marked resolved" : "Reopened");
    } else toast.error(res.error || "Couldn't update ticket");
    setResolving(null);
  };

  const faqs = FAQS_BY_ROLE[role] || FAQS_BY_ROLE.User;
  const filteredFaqs = faqs.filter(f =>
    !faqSearch.trim() ||
    f.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
    f.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  const submitTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSending(true);
    const res = await api.post("/support", { subject: subject.trim(), message: message.trim() });
    if (res.ok) {
      toast.success("Message sent — we'll get back to you soon.");
      setSubject(""); setMessage("");
      loadTickets();
      if (role === "Admin") loadAllTickets();
    } else {
      toast.error(res.error || "Couldn't send your message. Try again.");
    }
    setSending(false);
  };

  const visibleAllTickets = allTickets.filter(t => ticketFilter === "all" || t.status === ticketFilter);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-page text-white mb-2">Support</h1>
        <p className="text-slate-400 text-sm">
          {role === "Admin" ? "Manage support tickets and browse admin FAQs." :
           role === "Station Manager" ? "Answers for running your station, or send us a message." :
           "Search common questions, or send us a message directly."}
        </p>
      </div>

      {/* ── Admin: all tickets inbox ── */}
      {role === "Admin" && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="font-bold text-white">All Support Tickets</p>
            <div className="flex gap-2">
              {["open", "closed", "all"].map(f => (
                <button key={f} onClick={() => setTicketFilter(f)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold border transition-all"
                  style={{
                    background:  ticketFilter === f ? "rgba(255,138,61,0.15)" : "rgba(255,255,255,0.03)",
                    borderColor: ticketFilter === f ? "rgba(255,138,61,0.4)" : "rgba(255,255,255,0.08)",
                    color:       ticketFilter === f ? "#FF8A3D" : "#94a3b8",
                  }}>
                  {f === "open" ? "Open" : f === "closed" ? "Resolved" : "All"}
                </button>
              ))}
            </div>
          </div>
          {loadingAll ? <Spinner /> : visibleAllTickets.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No {ticketFilter !== "all" ? ticketFilter : ""} tickets.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {visibleAllTickets.map(t => (
                <div key={t._id} className="p-3 rounded-xl border border-white/5" style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-white font-semibold truncate">{t.subject}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t.userId?.name || "Unknown"} · {t.userId?.email} · {new Date(t.createdAt).toLocaleDateString()}</p>
                      <p className="text-sm text-slate-400 mt-1.5">{t.message}</p>
                    </div>
                    <button onClick={() => resolveTicket(t._id, t.status === "open" ? "closed" : "open")}
                      disabled={resolving === t._id}
                      className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                      style={{ color: t.status === "open" ? "#FF8A3D" : "#10b981", background: t.status === "open" ? "rgba(255,138,61,0.1)" : "rgba(16,185,129,0.1)" }}>
                      {resolving === t._id ? "..." : t.status === "open" ? "Mark Resolved" : "Reopen"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* ── Quick-answer chatbot ── */}
      <SupportChatbot role={role} faqs={faqs} />

      {/* ── Contact form ── */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,138,61,0.1)" }}>
            <Icon name="mail" className="w-5 h-5 text-[#FF8A3D]" />
          </div>
          <div>
            <p className="font-bold text-white">Contact us</p>
            <p className="text-slate-500 text-sm">We typically reply within 24 hours.</p>
          </div>
        </div>
        <form onSubmit={submitTicket} className="space-y-3">
          <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={150} placeholder="Subject"
            className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none border"
            style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} />
          <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={2000} rows={4}
            placeholder="Tell us what's going on..."
            className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none border resize-none"
            style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} />
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600 cw-figure">{message.length}/2000</p>
            <div className="flex gap-2">
              <Btn type="button" variant="ghost" onClick={() => window.location.href = "mailto:support@chargeway.com"}>Email Instead</Btn>
              <Btn type="submit" disabled={!subject.trim() || !message.trim()} loading={sending}>Send Message</Btn>
            </div>
          </div>
        </form>
      </GlassCard>

      {/* ── Your own ticket history (everyone, including Admin's own messages) ── */}
      {!loadingTickets && tickets.length > 0 && (
        <GlassCard className="p-6">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Your Messages</p>
          <div className="space-y-2">
            {tickets.slice(0, 5).map(t => (
              <div key={t._id} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm text-white font-medium truncate">{t.subject}</p>
                  <p className="text-xs text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ color: t.status === "open" ? "#FF8A3D" : "#10b981", background: t.status === "open" ? "rgba(255,138,61,0.1)" : "rgba(16,185,129,0.1)" }}>
                  {t.status === "open" ? "Open" : "Resolved"}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ── Role-scoped FAQ ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            {role === "Admin" ? "Admin FAQ" : role === "Station Manager" ? "Station Manager FAQ" : "Rider FAQ"}
          </p>
        </div>
        <div className="relative mb-3">
          <Icon name="search" className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={faqSearch} onChange={e => setFaqSearch(e.target.value)} placeholder="Search FAQs..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF8A3D]/50" />
        </div>
        <GlassCard className="p-2">
          {filteredFaqs.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-6">No FAQs match "{faqSearch}"</p>
          ) : filteredFaqs.map((f, i) => (
            <div key={f.q} className={i < filteredFaqs.length - 1 ? "border-b border-white/5" : ""}>
              <button onClick={() => setOpen(open === f.q ? null : f.q)}
                className="w-full flex items-center justify-between px-4 py-4 text-left">
                <span className="text-sm font-semibold text-white">{f.q}</span>
                <motion.span animate={{ rotate: open === f.q ? 180 : 0 }} className="text-slate-500 flex-shrink-0 ml-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
                </motion.span>
              </button>
              {open === f.q && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="px-4 pb-4 text-sm text-slate-400 leading-relaxed">
                  {f.a}
                </motion.p>
              )}
            </div>
          ))}
        </GlassCard>
      </div>
    </div>
  );
};

export default SupportPage;
