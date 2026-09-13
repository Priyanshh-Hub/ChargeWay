import React, { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { InputField, Btn, Alert } from '../ui/index';
import Icon from '../ui/Icon';
import { MarketingNav, MarketingFooter } from './MarketingChrome';

// Kept in /Frontend (sibling of src/, not inside it) — see Home.jsx / About.jsx.
import contactHero from '../../../Reference3.png';

const SUBJECTS = ["General question", "Booking or payment issue", "Partner / station application", "Bug report", "Something else"];

const CONTACT_INFO = [
  { icon: "mail",  label: "Email",   value: "hello@chargeway.app", href: "mailto:hello@chargeway.app" },
  { icon: "phone", label: "Phone",   value: "+91 00000 00000",     href: "tel:+910000000000" },
  { icon: "stations", label: "Office", value: "Pune, Maharashtra, India" },
];

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", subject: SUBJECTS[0], message: "" });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const update = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Please tell us your name.";
    if (!form.email.trim()) next.email = "Email is required.";
    else if (!emailRe.test(form.email.trim())) next.email = "Enter a valid email address.";
    if (!form.message.trim()) next.message = "Please add a short message.";
    else if (form.message.trim().length < 10) next.message = "A few more details would help us respond faster.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSending(true);

    // No dedicated /contact API exists on the backend yet (see support.js
    // for the ticket system, which requires a logged-in user). Until a
    // public contact endpoint is added, we hand off to the visitor's own
    // mail client with everything prefilled — real delivery, zero fake
    // "message sent to our servers" pretense.
    const subject = encodeURIComponent(`[ChargeWay] ${form.subject} — from ${form.name}`);
    const body = encodeURIComponent(`${form.message}\n\n— ${form.name} (${form.email})`);
    window.location.href = `mailto:hello@chargeway.app?subject=${subject}&body=${body}`;

    setTimeout(() => {
      setSending(false);
      setSent(true);
      toast.success("Your email app should be open — just hit send.");
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#0A0D14]">
      <MarketingNav />

      {/* ── Hero ── */}
      <section className="relative pt-40 pb-16 overflow-hidden">
        <img src={contactHero} alt="A row of ChargeWay charging stations at night" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,13,20,0.7) 0%, rgba(10,13,20,0.88) 65%, #0A0D14 100%)" }} />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-white font-display font-bold leading-[1.05] mb-4" style={{ fontSize: "clamp(2.25rem, 5vw, 3.25rem)" }}>
              Let's talk
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed max-w-xl mx-auto">
              Question about a booking, interested in a partner station, or found a bug?
              Send us a note — a real person reads every message.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Form + Info ── */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form */}
          <div className="lg:col-span-3 rounded-3xl p-8 border border-white/10" style={{ background: "rgba(255,255,255,0.03)" }}>
            {sent ? (
              <div className="flex flex-col items-center text-center py-10">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(52,211,153,0.12)" }}>
                  <Icon name="check" className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-white font-bold text-lg mb-1">Almost there</h3>
                <p className="text-slate-400 text-sm max-w-xs">
                  We opened your email app with the message prefilled — just hit send and we'll get back to you shortly.
                </p>
                <button onClick={() => setSent(false)} className="text-[#FF8A3D] text-sm font-medium mt-5 hover:underline">
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <h2 className="text-card text-white mb-1">Send us a message</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField id="contact-name" label="Your name" required value={form.name} onChange={update("name")}
                    error={errors.name} placeholder="Jane Doe" autoComplete="name" />
                  <InputField id="contact-email" label="Email" type="email" required value={form.email} onChange={update("email")}
                    error={errors.email} placeholder="you@example.com" autoComplete="email" />
                </div>

                <div>
                  <label htmlFor="contact-subject" className="block text-sm font-medium text-slate-300 mb-1.5">Subject</label>
                  <select id="contact-subject" value={form.subject} onChange={update("subject")}
                    className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all border"
                    style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium text-slate-300 mb-1.5">
                    Message<span className="text-red-400 ml-0.5">*</span>
                  </label>
                  <textarea id="contact-message" rows={5} value={form.message} onChange={update("message")}
                    placeholder="Tell us what's going on..."
                    className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-all border resize-none"
                    style={{ background: "rgba(255,255,255,0.05)", borderColor: errors.message ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.1)" }}
                    onFocus={e => { e.target.style.borderColor = "rgba(255,138,61,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(255,138,61,0.1)"; }}
                    onBlur={e => { e.target.style.borderColor = errors.message ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
                  />
                  {errors.message && <p className="text-red-400 text-xs mt-1">{errors.message}</p>}
                </div>

                <Alert type="info" message="Already have an account? Support tickets from the app get a faster, trackable response — this form opens your email client instead." />

                <Btn type="submit" loading={sending} className="w-full sm:w-auto px-8">Send Message</Btn>
              </form>
            )}
          </div>

          {/* Info */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {CONTACT_INFO.map(c => (
              <div key={c.label} className="rounded-2xl p-5 border border-white/10 flex items-start gap-4" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,138,61,0.12)" }}>
                  <Icon name={c.icon === "phone" ? "info" : c.icon} className="w-5 h-5 text-[#FF8A3D]" />
                </div>
                <div>
                  <p className="text-slate-400 text-xs">{c.label}</p>
                  {c.href ? (
                    <a href={c.href} className="text-white text-sm font-semibold hover:text-[#FF8A3D] transition-colors">{c.value}</a>
                  ) : (
                    <p className="text-white text-sm font-semibold">{c.value}</p>
                  )}
                </div>
              </div>
            ))}
            <div className="rounded-2xl p-5 border border-white/10" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="text-slate-400 text-xs mb-2">Response time</p>
              <p className="text-white text-sm leading-relaxed">
                We're a small beta team — expect a reply within 1–2 business days. Update this section
                with your real support hours and SLA once you have one.
              </p>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default Contact;
