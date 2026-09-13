import React, { useState, useEffect } from 'react';
import { api } from '../../api/api';
import { GlassCard, Btn, EmptyState, CardSkeleton, Modal } from '../ui/index';
import VehicleVisual from '../vehicle/VehicleVisual';

const LiveSessionPage = ({ user, onCancelBooking, setActiveView }) => {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await api.get("/bookings");
      // Only "Upcoming" AND checked-in counts as an active/live session.
      // A reserved-but-not-checked-in booking is a real row too, but it
      // belongs in "you have an upcoming booking, here's your PIN" state,
      // not a running charging timer — see the checkedIn branch below.
      if (res.ok) setBooking(res.data.bookings.find(b => b.status === "Upcoming") || null);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    // The timer must start from the moment charging actually started
    // (chargingStartedAt, set by a manager verifying the rider's PIN at
    // the station), never from booking.createdAt. Before this fix, the
    // clock started counting the instant you booked — so opening this
    // page showed a session already "in progress" for however long ago
    // you booked, even if you hadn't arrived, checked in, or plugged in
    // at all yet.
    if (!booking?.checkedIn || !booking.chargingStartedAt) { setElapsed(0); return; }
    const start = new Date(booking.chargingStartedAt).getTime();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [booking]);

  const fmt = (secs) => {
    const h = String(Math.floor(secs / 3600)).padStart(2, "0");
    const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
    const s = String(secs % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // Progress through the booked session (0–1) — drives the live energy
  // and cost numbers below so they grow with elapsed time instead of
  // showing the final booked totals from second one. This is a fair
  // simulation of what the CHARGER is delivering (a roughly constant
  // kWh/min rate) — it is NOT reading anything from the vehicle itself.
  // There used to be a third number here, "Battery: X%", interpolated
  // between the currentBattery/targetBattery the rider typed in at
  // booking time. That's a different claim entirely — it implies reading
  // the car's own state of charge, which ChargeWay has no way to do.
  // Removed rather than relabeled, per repeated direction: no number that
  // looks like a live vehicle reading anywhere in this app.
  const durationSecs = Math.max(1, (booking?.duration || 0) * 60);
  const progress = booking ? Math.min(1, elapsed / durationSecs) : 0;
  const liveEnergy = booking ? (booking.energyKwh * progress) : 0;
  const liveCost   = booking ? (booking.totalCost * progress) : 0;
  const isComplete = progress >= 1;

  const handleEnd = async () => {
    setEnding(true);
    await onCancelBooking();
    setEnding(false);
    setConfirmEnd(false);
    setBooking(null);
  };

  if (loading) return <CardSkeleton />;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-page text-white mb-6">Live Sessions</h1>

      {!booking ? (
        <EmptyState icon="battery" title="No active charging session"
          subtitle="When you start a charging session, you'll be able to track it live here — energy delivered, time elapsed, and running cost."
          action={<Btn onClick={() => setActiveView("findstations")}>Find a Charger →</Btn>} />
      ) : !booking.checkedIn ? (
        <GlassCard className="p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(255,138,61,0.08)" }}>
            <span className="text-2xl">🔑</span>
          </div>
          <h2 className="text-card text-white mb-1">You're booked — not checked in yet</h2>
          <p className="text-slate-400 text-sm max-w-sm mx-auto mb-5">
            Charging hasn't started. Show this code to station staff (or read it out) when you arrive
            at <span className="text-white font-semibold">{booking.stationName}</span>, charger #{booking.chargerId},
            for your {booking.timeSlot} slot.
          </p>
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl mb-2" style={{ background: "rgba(255,138,61,0.1)", border: "1px solid rgba(255,138,61,0.25)" }}>
            <span className="text-4xl font-black text-[#FF8A3D] tracking-widest cw-figure">{booking.checkInOtp}</span>
          </div>
          <p className="text-slate-500 text-xs mt-3">
            Arriving late? A small per-minute fee applies once you're more than a few minutes past your
            slot's start time — measured from when a staff member verifies this code, not GPS, so
            check in the moment you arrive to keep it accurate.
          </p>
        </GlassCard>
      ) : (
        <GlassCard className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-card text-white">{booking.stationName || booking.stationId?.name}</h2>
              <p className="text-slate-500 text-sm mt-0.5">Charger #{booking.chargerId} · {booking.vehicleNumber}</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ color: isComplete ? "#FF8A3D" : "#4ade80", background: isComplete ? "rgba(255,138,61,0.1)" : "rgba(34,197,94,0.1)" }}>
              <span className={`w-1.5 h-1.5 rounded-full ${isComplete ? "bg-[#FF8A3D]" : "bg-green-400 animate-pulse"}`} />
              {isComplete ? "READY TO END" : "ACTIVE"}
            </span>
          </div>

          {/* Charging progress */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>Session progress</span>
              <span className="cw-figure">{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${progress * 100}%`, background: isComplete ? "linear-gradient(90deg,#10b981,#06b6d4)" : "linear-gradient(90deg,#FF8A3D,#5B47E0)" }} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-48 rounded-2xl overflow-hidden" style={{ background: "rgba(255,138,61,0.04)" }}>
              <VehicleVisual color={user?.car?.color} connectorType={user?.car?.connectorType} size="lg" charging={!isComplete} />
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-slate-500 text-xs mb-1">Charging Time</p>
                <p className="text-3xl font-black text-white cw-figure">{fmt(elapsed)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-500 text-xs mb-1">Energy Delivered</p>
                  <p className="text-xl font-bold text-[#FF8A3D] cw-figure">{liveEnergy.toFixed(1)} kWh</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-1">Running Cost</p>
                  <p className="text-xl font-bold text-white cw-figure">₹{liveCost.toFixed(0)}</p>
                  {booking.lateFee > 0 && (
                    <p className="text-[10px] text-amber-400 mt-0.5">+₹{booking.lateFee} late fee ({booking.minutesLate}m)</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Btn variant={isComplete ? "success" : "danger"} onClick={() => setConfirmEnd(true)} className="w-full mt-8">
            {isComplete ? "Complete & End Session" : "End Session"}
          </Btn>
        </GlassCard>
      )}

      <Modal open={confirmEnd} onClose={() => setConfirmEnd(false)} title="End this session?">
        <p className="text-sm text-slate-400 mb-5">This will stop your charging session and release the charger for other drivers.</p>
        <div className="flex gap-3">
          <Btn variant="ghost" onClick={() => setConfirmEnd(false)} className="flex-1">Keep Charging</Btn>
          <Btn variant="danger" onClick={handleEnd} loading={ending} className="flex-1">End Session</Btn>
        </div>
      </Modal>
    </div>
  );
};

export default LiveSessionPage;
