import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../api/api';
import { GlassCard, Spinner } from '../ui/index';

const InvoicesPage = ({ user }) => {
  const [bookings, setBookings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [preview,  setPreview]  = useState(null);

  useEffect(() => {
    (async () => {
      const res = await api.get("/bookings");
      if (res.ok) setBookings(res.data.bookings.filter(b => b.status === "Completed"));
      setLoading(false);
    })();
  }, []);

  const getSerial = (b, index) => {
    if (b.invoiceNo) return b.invoiceNo;
    const year = new Date(b.createdAt || b.date).getFullYear();
    return `CW-${year}-${String(index + 1).padStart(4, "0")}`;
  };

  const carbonSaved = (kwh) => ((kwh || 0) * 0.82).toFixed(2); // 0.82 kg CO2 saved per kWh vs petrol

  const downloadInvoice = (b, index) => {
    const serialNo = getSerial(b, index);
    const html = buildInvoiceHTML(b, serialNo, user);
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ChargeWay_Invoice_${serialNo}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) return <Spinner text="Loading invoices..." />;

  const totalSpend  = bookings.reduce((s, b) => s + (b.totalCost  || 0), 0);
  const totalEnergy = bookings.reduce((s, b) => s + (b.energyKwh || 0), 0);
  const totalCarbon = bookings.reduce((s, b) => s + parseFloat(carbonSaved(b.energyKwh)), 0);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Invoices</h2>
          <p className="text-slate-500 text-sm mt-1">{bookings.length} completed session{bookings.length !== 1 ? 's' : ''}</p>
        </div>
        {bookings.length > 0 && (
          <div className="flex gap-5 text-right">
            <div>
              <p className="text-2xl font-black text-cyan-400">₹{totalSpend.toFixed(0)}</p>
              <p className="text-xs text-slate-500">Total Spent</p>
            </div>
            <div>
              <p className="text-2xl font-black text-green-400">{totalEnergy.toFixed(1)}</p>
              <p className="text-xs text-slate-500">kWh Used</p>
            </div>
            <div>
              <p className="text-2xl font-black text-emerald-400">{totalCarbon.toFixed(1)}</p>
              <p className="text-xs text-slate-500">kg CO₂ Saved</p>
            </div>
          </div>
        )}
      </div>

      {bookings.length === 0 ? (
        <GlassCard className="p-16 text-center">
          <div className="text-6xl mb-4">🧾</div>
          <p className="text-slate-400 font-medium">No completed sessions yet.</p>
          <p className="text-slate-600 text-sm mt-1">Your invoices will appear here after charging.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {bookings.map((b, index) => {
            const serialNo = getSerial(b, index);
            const carbon   = carbonSaved(b.energyKwh);
            return (
              <motion.div key={b._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}>
                <GlassCard className="p-0 overflow-hidden hover:border-cyan-500/20 transition-all cursor-pointer"
                  onClick={() => setPreview({ b, index })}>
                  <div className="flex items-stretch">
                    {/* Accent bar */}
                    <div className="w-1 shrink-0" style={{ background: "linear-gradient(180deg,#0066FF,#00C4FF,#10b981)" }} />

                    <div className="flex-1 p-5 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4">
                        {/* Glowing icon */}
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 relative"
                          style={{ background: "linear-gradient(135deg,#0066FF,#00C4FF)", boxShadow: "0 0 16px rgba(0,196,255,0.3)" }}>
                          <span className="text-lg">⚡</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white font-bold text-sm">{b.stationName || b.stationId?.name}</p>
                            <span className="font-mono text-xs px-2 py-0.5 rounded-md font-bold"
                              style={{ background: "rgba(0,196,255,0.12)", color: "#00C4FF", border: "1px solid rgba(0,196,255,0.25)" }}>
                              {serialNo}
                            </span>
                          </div>
                          <p className="text-slate-400 text-xs mt-1">{b.date} · {b.timeSlot} · Charger #{b.chargerId}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-slate-500">{b.energyKwh} kWh · {b.duration} min</span>
                            <span className="text-xs text-emerald-400 font-semibold">🌿 {carbon} kg CO₂ saved</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-5 shrink-0">
                        <div className="text-right">
                          <p className="text-2xl font-black text-white">₹{b.totalCost}</p>
                          <p className="text-xs text-green-400 font-semibold">✓ Paid · {b.paymentMethod}</p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={e => { e.stopPropagation(); setPreview({ b, index }); }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                            style={{ background: "rgba(0,196,255,0.1)", border: "1px solid rgba(0,196,255,0.3)", color: "#00C4FF" }}>
                            Preview
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); downloadInvoice(b, index); }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>
                            ↓ Save
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {preview && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(12px)" }}
            onClick={() => setPreview(null)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1,   opacity: 1, y: 0  }}
              exit={{    scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl"
              style={{ background: "#070f1a", border: "1px solid rgba(0,196,255,0.2)", boxShadow: "0 0 60px rgba(0,102,255,0.3)" }}>
              <DarkInvoiceCard
                b={preview.b} index={preview.index} user={user}
                getSerial={getSerial} carbonSaved={carbonSaved}
                onClose={() => setPreview(null)}
                onDownload={() => { downloadInvoice(preview.b, preview.index); setPreview(null); }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Dark Invoice Preview Card ── */
const DarkInvoiceCard = ({ b, index, user, getSerial, carbonSaved, onClose, onDownload }) => {
  const serialNo   = getSerial(b, index);
  const chargeCost = (b.energyKwh * b.costPerKwh).toFixed(2);
  const carbon     = carbonSaved(b.energyKwh);
  const issueDate  = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const Row = ({ label, value, highlight, mono }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <span style={{ color: "#64748b", fontSize: 13 }}>{label}</span>
      <span style={{ color: highlight || "#e2e8f0", fontWeight: 600, fontSize: 13, fontFamily: mono ? "monospace" : "inherit" }}>{value}</span>
    </div>
  );

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#e2e8f0", background: "#070f1a" }}>

      {/* Header */}
      <div style={{ position: "relative", padding: "28px 28px 24px", overflow: "hidden", borderBottom: "1px solid rgba(0,196,255,0.15)" }}>
        {/* BG glow */}
        <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle,rgba(0,102,255,0.25),transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -20, left: -20, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle,rgba(0,196,255,0.12),transparent 70%)", pointerEvents: "none" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#0066FF,#00C4FF)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 0 12px rgba(0,196,255,0.4)" }}>⚡</div>
              <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5, color: "#fff" }}>ChargeWay</span>
            </div>
            <div style={{ display: "inline-block", padding: "2px 10px", borderRadius: 4, fontSize: 9, fontWeight: 800, letterSpacing: 2.5, background: "rgba(0,196,255,0.12)", border: "1px solid rgba(0,196,255,0.3)", color: "#00C4FF" }}>
              TAX INVOICE
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: "#475569", letterSpacing: 1.5, marginBottom: 4 }}>INVOICE NUMBER</div>
            <div style={{ fontSize: 16, fontWeight: 900, fontFamily: "monospace", color: "#00C4FF", letterSpacing: 1 }}>{serialNo}</div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>{issueDate}</div>
          </div>
        </div>
      </div>

      {/* Billed To + Vehicle */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "20px 28px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ padding: "14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 9, color: "#475569", letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>BILLED TO</div>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#fff", marginBottom: 3 }}>{user?.name || "Customer"}</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>{user?.email || ""}</div>
          {user?.phone && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{user.phone}</div>}
        </div>
        <div style={{ padding: "14px", borderRadius: 10, background: "rgba(0,196,255,0.04)", border: "1px solid rgba(0,196,255,0.12)" }}>
          <div style={{ fontSize: 9, color: "#475569", letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>VEHICLE</div>
          <div style={{ fontWeight: 900, fontSize: 15, color: "#00C4FF", fontFamily: "monospace", letterSpacing: 1 }}>{b.vehicleNumber}</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{b.stationName || b.stationId?.name || "—"}</div>
        </div>
      </div>

      {/* Session Details */}
      <div style={{ padding: "20px 28px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ fontSize: 9, color: "#475569", letterSpacing: 1.5, fontWeight: 700, marginBottom: 12 }}>CHARGING SESSION</div>
        <Row label="Session Date"      value={b.date} />
        <Row label="Time Slot"         value={b.timeSlot} />
        <Row label="Charger"           value={`#${b.chargerId}`} />
        <Row label="Duration"          value={`~${b.duration} minutes`} />
        <Row label="Energy Dispensed"  value={`${b.energyKwh} kWh`}  highlight="#00C4FF" />
        <Row label="Rate"              value={`₹${b.costPerKwh}/kWh`} />
        <Row label="Payment Method"    value={b.paymentMethod} />
      </div>

      {/* Carbon footprint */}
      <div style={{ margin: "0 28px", padding: "14px 16px", borderRadius: 10, background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🌿</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>Green Impact</div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>CO₂ saved vs petrol vehicle</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#10b981" }}>{carbon} kg</div>
            <div style={{ fontSize: 10, color: "#64748b" }}>CO₂ offset</div>
          </div>
        </div>
      </div>

      {/* Payment Breakdown */}
      <div style={{ padding: "20px 28px 0" }}>
        <div style={{ fontSize: 9, color: "#475569", letterSpacing: 1.5, fontWeight: 700, marginBottom: 12 }}>PAYMENT BREAKDOWN</div>
        <Row label={`Charging (${b.energyKwh} kWh × ₹${b.costPerKwh})`} value={`₹${chargeCost}`} />
        <Row label="Platform Service Fee" value={`₹${b.platformFee}`} />
      </div>

      {/* Total */}
      <div style={{ margin: "16px 28px", padding: "18px 20px", borderRadius: 12, background: "linear-gradient(135deg,rgba(0,102,255,0.2),rgba(0,196,255,0.1))", border: "1px solid rgba(0,196,255,0.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: 1 }}>TOTAL AMOUNT PAID</div>
            <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>All charges inclusive</div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, color: "#00C4FF", textShadow: "0 0 20px rgba(0,196,255,0.4)" }}>₹{b.totalCost}</div>
        </div>
      </div>

      {/* Paid stamp */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 18px", borderRadius: 20, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", fontSize: 12, fontWeight: 800 }}>
          ✓ PAYMENT CONFIRMED
        </span>
      </div>

      {/* Footer */}
      <div style={{ padding: "16px 28px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.2)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "#334155", lineHeight: 1.8 }}>
          <span style={{ color: "#00C4FF", fontWeight: 700 }}>⚡ ChargeWay</span> · support@chargeway.com · www.chargeway.in<br />
          GSTIN: 24XXXXX1234X1ZX · Computer-generated invoice
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10, padding: "16px 28px 24px" }}>
        <button onClick={onDownload}
          style={{ flex: 1, background: "linear-gradient(135deg,#0066FF,#00C4FF)", color: "#fff", border: "none", borderRadius: 10, padding: 13, fontSize: 13, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,102,255,0.35)", letterSpacing: 0.3 }}>
          ↓ Download Invoice
        </button>
        <button onClick={onClose}
          style={{ flex: 1, background: "rgba(255,255,255,0.04)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 13, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Close
        </button>
      </div>
    </div>
  );
};

/* ── Dark HTML Invoice for download ── */
function buildInvoiceHTML(b, serialNo, user) {
  const chargeCost = (b.energyKwh * b.costPerKwh).toFixed(2);
  const carbon     = ((b.energyKwh || 0) * 0.82).toFixed(2);
  const issueDate  = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${serialNo} — ChargeWay</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Sora',system-ui,sans-serif;background:#030a13;color:#e2e8f0;min-height:100vh;display:flex;align-items:flex-start;justify-content:center;padding:40px 20px}
  .wrap{width:100%;max-width:600px;background:#070f1a;border-radius:20px;overflow:hidden;border:1px solid rgba(0,196,255,0.18);box-shadow:0 0 80px rgba(0,102,255,0.2)}
  .header{position:relative;padding:32px 36px 28px;border-bottom:1px solid rgba(0,196,255,0.12);overflow:hidden}
  .header::before{content:'';position:absolute;top:-50px;right:-50px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(0,102,255,0.2),transparent 70%);pointer-events:none}
  .logo-row{display:flex;align-items:center;gap:10px;margin-bottom:10px}
  .logo-icon{width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#0066FF,#00C4FF);display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 0 14px rgba(0,196,255,0.4)}
  .logo-text{font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px}
  .tax-badge{display:inline-block;padding:2px 10px;border-radius:4px;font-size:9px;font-weight:800;letter-spacing:2.5px;background:rgba(0,196,255,0.12);border:1px solid rgba(0,196,255,0.3);color:#00C4FF}
  .inv-meta{text-align:right}
  .inv-label{font-size:9px;color:#475569;letter-spacing:1.5px;font-weight:700;margin-bottom:4px}
  .inv-num{font-size:17px;font-weight:900;font-family:monospace;color:#00C4FF;letter-spacing:1px}
  .inv-date{font-size:10px;color:#475569;margin-top:5px}
  .header-inner{display:flex;justify-content:space-between;align-items:flex-start;position:relative}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:20px 36px;border-bottom:1px solid rgba(255,255,255,0.05)}
  .info-box{padding:14px;border-radius:10px}
  .info-box.dark{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07)}
  .info-box.cyan{background:rgba(0,196,255,0.04);border:1px solid rgba(0,196,255,0.14)}
  .box-label{font-size:9px;color:#475569;letter-spacing:1.5px;font-weight:700;margin-bottom:8px}
  .box-name{font-weight:800;font-size:14px;color:#fff;margin-bottom:3px}
  .box-detail{font-size:11px;color:#64748b;margin-top:2px}
  .vehicle-no{font-weight:900;font-size:16px;color:#00C4FF;font-family:monospace;letter-spacing:1px}
  .section{padding:20px 36px;border-bottom:1px solid rgba(255,255,255,0.05)}
  .section-title{font-size:9px;color:#475569;letter-spacing:1.5px;font-weight:700;margin-bottom:12px}
  .row{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04)}
  .row:last-child{border-bottom:none}
  .row-label{color:#64748b;font-size:13px}
  .row-value{color:#e2e8f0;font-weight:600;font-size:13px}
  .row-value.cyan{color:#00C4FF}
  .green-box{margin:0 36px;padding:14px 16px;border-radius:10px;background:rgba(16,185,129,0.07);border:1px solid rgba(16,185,129,0.2);display:flex;justify-content:space-between;align-items:center}
  .green-left{display:flex;align-items:center;gap:10px}
  .green-icon{font-size:22px}
  .green-title{font-size:12px;font-weight:700;color:#10b981;margin-bottom:2px}
  .green-sub{font-size:10px;color:#64748b}
  .green-amt{font-size:22px;font-weight:900;color:#10b981}
  .green-sub2{font-size:10px;color:#64748b;text-align:right}
  .total-box{margin:16px 36px;padding:18px 22px;border-radius:12px;background:linear-gradient(135deg,rgba(0,102,255,0.2),rgba(0,196,255,0.1));border:1px solid rgba(0,196,255,0.3);display:flex;justify-content:space-between;align-items:center}
  .total-label{font-size:10px;color:#94a3b8;font-weight:700;letter-spacing:1px;margin-bottom:3px}
  .total-sub{font-size:10px;color:#475569}
  .total-amt{font-size:36px;font-weight:900;color:#00C4FF;text-shadow:0 0 20px rgba(0,196,255,0.4)}
  .paid-badge{text-align:center;margin:0 0 16px}
  .paid-badge span{display:inline-flex;align-items:center;gap:6px;padding:6px 20px;border-radius:20px;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);color:#10b981;font-size:12px;font-weight:800;letter-spacing:0.5px}
  .footer{padding:18px 36px;border-top:1px solid rgba(255,255,255,0.05);background:rgba(0,0,0,0.25);text-align:center;font-size:10px;color:#334155;line-height:1.9}
  .footer strong{color:#00C4FF}
</style>
</head>
<body><div class="wrap">

  <div class="header">
    <div class="header-inner">
      <div>
        <div class="logo-row">
          <div class="logo-icon">⚡</div>
          <span class="logo-text">ChargeWay</span>
        </div>
        <div class="tax-badge">TAX INVOICE</div>
      </div>
      <div class="inv-meta">
        <div class="inv-label">INVOICE NUMBER</div>
        <div class="inv-num">${serialNo}</div>
        <div class="inv-date">${issueDate}</div>
      </div>
    </div>
  </div>

  <div class="grid2">
    <div class="info-box dark">
      <div class="box-label">BILLED TO</div>
      <div class="box-name">${user?.name || "Customer"}</div>
      <div class="box-detail">${user?.email || ""}</div>
      ${user?.phone ? `<div class="box-detail">${user.phone}</div>` : ""}
    </div>
    <div class="info-box cyan">
      <div class="box-label">VEHICLE</div>
      <div class="vehicle-no">${b.vehicleNumber}</div>
      <div class="box-detail" style="margin-top:6px">${b.stationName || b.stationId?.name || "—"}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">CHARGING SESSION</div>
    <div class="row"><span class="row-label">Session Date</span><span class="row-value">${b.date}</span></div>
    <div class="row"><span class="row-label">Time Slot</span><span class="row-value">${b.timeSlot}</span></div>
    <div class="row"><span class="row-label">Charger Number</span><span class="row-value">#${b.chargerId}</span></div>
    <div class="row"><span class="row-label">Duration</span><span class="row-value">~${b.duration} minutes</span></div>
    <div class="row"><span class="row-label">Energy Dispensed</span><span class="row-value cyan">${b.energyKwh} kWh</span></div>
    <div class="row"><span class="row-label">Rate</span><span class="row-value">₹${b.costPerKwh}/kWh</span></div>
    <div class="row"><span class="row-label">Payment Method</span><span class="row-value">${b.paymentMethod}</span></div>
  </div>

  <div class="section">
    <div class="section-title">PAYMENT BREAKDOWN</div>
    <div class="row"><span class="row-label">Charging (${b.energyKwh} kWh × ₹${b.costPerKwh})</span><span class="row-value">₹${chargeCost}</span></div>
    <div class="row"><span class="row-label">Platform Service Fee</span><span class="row-value">₹${b.platformFee}</span></div>
  </div>

  <div class="section" style="border-bottom:none;padding-bottom:0">
    <div class="green-box">
      <div class="green-left">
        <div class="green-icon">🌿</div>
        <div>
          <div class="green-title">Green Impact</div>
          <div class="green-sub">CO₂ saved vs petrol vehicle</div>
        </div>
      </div>
      <div>
        <div class="green-amt">${carbon} kg</div>
        <div class="green-sub2">CO₂ offset</div>
      </div>
    </div>
  </div>

  <div class="total-box">
    <div>
      <div class="total-label">TOTAL AMOUNT PAID</div>
      <div class="total-sub">All charges inclusive</div>
    </div>
    <div class="total-amt">₹${b.totalCost}</div>
  </div>

  <div class="paid-badge">
    <span>✓ PAYMENT CONFIRMED</span>
  </div>

  <div class="footer">
    <strong>⚡ ChargeWay</strong> — Green Energy for Every Journey<br>
    support@chargeway.com · www.chargeway.in · GSTIN: 24XXXXX1234X1ZX<br>
    Computer-generated invoice · No physical signature required
  </div>

</div></body></html>`;
}

export default InvoicesPage;