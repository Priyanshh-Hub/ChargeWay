import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { api, serverImg } from '../../api/api';
import { GlassCard, Alert, Btn } from '../ui/index';
import Icon from '../ui/Icon';
import BookingModal from './BookingModal';

// Shown once, right after a successful booking, alongside the station
// name and slot — a bit of personality on a screen that's otherwise just
// a confirmation. Late arrivals get a real per-minute fee (see
// routes/bookings.js verify-checkin), so this is a nudge with a purpose,
// not just a joke for its own sake.
const PUNCTUALITY_QUOTES = [
  "Chargers wait for no one — mostly because they're bolted to the ground.",
  "Fashionably late works for parties. Your charger just charges you extra.",
  "Be on time — the charger has no concept of \"Indian Standard Time.\"",
  "Arrive late and the only thing charging faster than your car is your bill.",
  "The charger won't ghost you, but it will start counting.",
  "Punctuality: the one EV habit that actually saves you money.",
];
const pickQuote = () => PUNCTUALITY_QUOTES[Math.floor(Math.random() * PUNCTUALITY_QUOTES.length)];

const StarRating = ({ value, onChange, readonly = false }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map(star => (
      <button key={star} onClick={() => !readonly && onChange && onChange(star)}
        className={`text-2xl transition-transform ${readonly ? "cursor-default" : "hover:scale-110 cursor-pointer"}`}
        style={{ color: star <= value ? "#fbbf24" : "rgba(255,255,255,0.15)" }}>★</button>
    ))}
  </div>
);

// Opens Google Maps turn-by-turn navigation
const navigateToStation = (station) => {
  if (station.lat && station.lng) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}&travelmode=driving`, '_blank');
  } else if (station.address) {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(station.address)}&travelmode=driving`, '_blank');
  }
};

// Photo gallery — a large hero image with a thumbnail strip for the rest.
const StationGallery = ({ images, name }) => {
  const [active, setActive] = useState(0);
  return (
    <div>
      <img src={serverImg(images[active])} alt={`${name} — photo ${active + 1}`}
        className="w-full h-64 object-cover rounded-2xl"
        onError={e => { e.target.style.display = "none"; }} />
      {images.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button key={i} onClick={() => setActive(i)}
              className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all"
              style={{ borderColor: i === active ? "#FF8A3D" : "transparent", opacity: i === active ? 1 : 0.6 }}>
              <img src={serverImg(img)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Popular Times — real histogram computed server-side from completed
// bookings at this station (see GET /stations/:id/popular-times).
const PopularTimes = ({ data }) => {
  if (!data || data.sampleSize === 0) return null;
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Popular Times</p>
        <p className="text-xs text-slate-600 cw-figure">{data.sampleSize} sessions</p>
      </div>
      <div className="flex items-end gap-2 h-24">
        {data.buckets.map(b => (
          <div key={b.label} className="flex-1 flex flex-col items-center justify-end gap-1.5 group">
            <div className="w-full rounded-t-md transition-all"
              style={{ height: `${Math.max(4, b.pct)}%`, background: b.pct > 60 ? "#FF8A3D" : "rgba(255,138,61,0.35)" }}
              title={`${b.label}: ${b.count} sessions`} />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        {data.buckets.map(b => (
          <p key={b.label} className="flex-1 text-center text-[10px] text-slate-500 leading-tight">{b.label.split(" ")[0]}</p>
        ))}
      </div>
    </GlassCard>
  );
};

// A single review, plus the station's reply if there is one, plus a reply
// form for the station's own manager (or an admin) to respond.
const ReviewCard = ({ review, station, user, onReplied }) => {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canReply =
    user && (user.role === "Admin" ||
      (user.role === "Station Manager" && String(station.managerId?._id || station.managerId) === String(user._id)));

  const submitReply = async () => {
    if (!replyText.trim()) return;
    setSaving(true); setError("");
    const res = await api.put(`/reviews/${review._id}/reply`, { text: replyText.trim() });
    if (res.ok) { onReplied(res.data.review); setReplying(false); setReplyText(""); }
    else setError(res.error || "Couldn't post reply");
    setSaving(false);
  };

  return (
    <div className="p-4 rounded-xl border border-white/10" style={{ background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
            style={{ background: "linear-gradient(135deg,#5B47E0,#FF8A3D)" }}>
            {(review.userId?.name || "U")[0]}
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{review.userId?.name || "User"}</p>
            <p className="text-slate-500 text-xs">{new Date(review.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <StarRating value={review.rating} readonly />
      </div>
      {review.comment && <p className="text-slate-300 text-sm ml-10 mb-2">{review.comment}</p>}

      {review.ownerReply?.text && (
        <div className="ml-10 mt-2 p-3 rounded-lg border-l-2" style={{ background: "rgba(255,138,61,0.05)", borderColor: "#FF8A3D" }}>
          <p className="text-[#FF8A3D] text-xs font-bold mb-1">Response from {station.name}</p>
          <p className="text-slate-300 text-sm">{review.ownerReply.text}</p>
        </div>
      )}

      {canReply && !review.ownerReply?.text && (
        <div className="ml-10 mt-2">
          {!replying ? (
            <button onClick={() => setReplying(true)} className="text-xs font-semibold text-[#FF8A3D] hover:text-[#FFAB70]">
              Reply as station owner
            </button>
          ) : (
            <div className="space-y-2">
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={2} maxLength={500}
                placeholder="Write a public reply..."
                className="w-full rounded-lg px-3 py-2 text-white text-sm outline-none border resize-none"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} />
              <div className="flex gap-2">
                <Btn onClick={submitReply} loading={saving} disabled={!replyText.trim()} className="text-xs py-1.5 px-3">Post Reply</Btn>
                <Btn variant="ghost" onClick={() => { setReplying(false); setReplyText(""); }} className="text-xs py-1.5 px-3">Cancel</Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StationLayout = ({ stationId, onBack, user, onConfirmBooking, activeBooking }) => {
  const navigate = useNavigate();
  const [station,           setStation]          = useState(null);
  const [selectedCharger,   setSelectedCharger]  = useState(null);
  const [loading,           setLoading]          = useState(true);
  const [reviews,           setReviews]          = useState([]);
  const [avgRating,         setAvgRating]        = useState(0);
  const [totalReviews,      setTotalReviews]     = useState(0);
  const [myRating,          setMyRating]         = useState(0);
  const [myComment,         setMyComment]        = useState("");
  const [submitting,        setSubmitting]       = useState(false);
  const [reviewError,       setReviewError]      = useState("");
  const [reviewSuccess,     setReviewSuccess]    = useState("");
  const [myReview,          setMyReview]         = useState(null);
  const [hasCompletedVisit, setHasCompletedVisit]= useState(false);

  const loadReviews = async (id) => {
    const res = await api.get(`/reviews/${id}`);
    if (res.ok) {
      setReviews(res.data.reviews);
      setAvgRating(res.data.averageRating);
      setTotalReviews(res.data.totalReviews);
      const mine = res.data.reviews.find(r =>
        r.userId?._id === user?._id || r.userId === user?._id
      );
      setMyReview(null);
      setMyRating(0);
      setMyComment("");
      if (mine) {
        setMyReview(mine);
        setMyRating(mine.rating);
        setMyComment(mine.comment || "");
      }
    }
  };

  const [popularTimes, setPopularTimes] = useState(null);

  useEffect(() => {
    setStation(null);
    setReviews([]);
    setAvgRating(0);
    setTotalReviews(0);
    setMyRating(0);
    setMyComment("");
    setMyReview(null);
    setReviewError("");
    setReviewSuccess("");
    setHasCompletedVisit(false);
    setPopularTimes(null);
    setLoading(true);

    (async () => {
      const [stRes, bkRes, ptRes] = await Promise.all([
        api.get(`/stations/${stationId}`),
        api.get("/bookings"),
        api.get(`/stations/${stationId}/popular-times`),
      ]);
      if (stRes.ok) setStation(stRes.data.station);
      if (ptRes.ok) setPopularTimes(ptRes.data);
      if (bkRes.ok) {
        const completed = bkRes.data.bookings.filter(b =>
          b.status === "Completed" &&
          (b.stationId === stationId || b.stationId?._id === stationId)
        );
        setHasCompletedVisit(completed.length > 0);
      }
      await loadReviews(stationId);
      setLoading(false);
    })();
  }, [stationId]);

  const submitReview = async () => {
    if (!myRating) return;
    setSubmitting(true); setReviewError(""); setReviewSuccess("");
    const res = await api.post(`/reviews/${stationId}`, { rating: myRating, comment: myComment });
    if (res.ok) { setReviewSuccess("Review submitted successfully!"); await loadReviews(stationId); }
    else setReviewError(res.error || "Failed to submit review");
    setSubmitting(false);
  };

  const deleteReview = async () => {
    const res = await api.delete(`/reviews/${stationId}`);
    if (res.ok) {
      setMyReview(null); setMyRating(0); setMyComment(""); setReviewSuccess("");
      await loadReviews(stationId);
    }
  };

  if (loading) return (
    <div className="space-y-6">
      <div className="h-5 w-32 rounded animate-pulse bg-white/5" />
      <div className="h-8 w-72 rounded-lg animate-pulse bg-white/5" />
      <div className="h-48 rounded-2xl animate-pulse bg-white/5" />
      <div className="h-40 rounded-2xl animate-pulse bg-white/5" />
    </div>
  );
  if (!station) return <div className="text-slate-400 text-center py-12">Station not found.</div>;

  const isOffline = station.status === "Offline";
  const statusCfg = {
    Available:   { bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.5)",  text: "#10b981" },
    Charging:    { bg: "rgba(59,130,246,0.1)",   border: "rgba(59,130,246,0.4)",  text: "#7C6AE8" },
    Maintenance: { bg: "rgba(245,158,11,0.1)",   border: "rgba(245,158,11,0.4)",  text: "#fbbf24" },
  };
  const avail = station.chargers?.filter(c => c.status === "Available").length || 0;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-[#FF8A3D] text-sm hover:text-[#FFAB70]">← Back to Stations</button>

      {/* Station Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-card text-white">{station.name}</h2>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isOffline ? "text-red-400 bg-red-400/15" : "text-green-400 bg-green-400/15"}`}>
              {isOffline ? "🔴 Offline" : "🟢 Online"}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{
                color: station.networkType === "Partner" ? "#a78bfa" : "#FF8A3D",
                background: station.networkType === "Partner" ? "rgba(167,139,250,0.15)" : "rgba(255,138,61,0.15)",
              }}
              title={station.networkType === "Partner" ? "Independently owned & operated — listed on ChargeWay" : "Owned and operated by ChargeWay"}>
              {station.networkType === "Partner" ? "🤝 Partner station" : "⚡ ChargeWay network"}
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">{station.address} · {avail} chargers available</p>
          {totalReviews > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-yellow-400 font-bold">★ {avgRating}</span>
              <span className="text-slate-500 text-xs">({totalReviews} review{totalReviews !== 1 ? "s" : ""})</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-xl font-black text-[#FF8A3D]">₹{station.price_per_kwh}<span className="text-sm font-normal text-slate-400">/kWh</span></p>
          {/* Navigate Button */}
          <button
            onClick={() => navigateToStation(station)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ background: "linear-gradient(135deg,#5B47E0,#FF8A3D)", color: "#fff", boxShadow: "0 0 16px rgba(91,71,224,0.35)", border: "none", cursor: "pointer" }}>
            🗺️ Navigate
          </button>
        </div>
      </div>

      {(() => {
        const gallery = station.images?.length > 0 ? station.images : (station.image ? [station.image] : []);
        if (gallery.length === 0) return null;
        return <StationGallery images={gallery} name={station.name} />;
      })()}

      {/* Active Booking Banner — shows Navigate prominently */}
      {activeBooking && (activeBooking.stationId === stationId || activeBooking.stationId?._id === stationId) && (
        <div className="p-5 rounded-2xl border border-[#FF8A3D]/30 flex items-center justify-between flex-wrap gap-4"
          style={{ background: "linear-gradient(135deg,rgba(91,71,224,0.12),rgba(255,138,61,0.08))" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: "rgba(255,138,61,0.15)", border: "1px solid rgba(255,138,61,0.3)" }}>⚡</div>
            <div>
              <p className="text-[#FF8A3D] font-bold">Active Booking at this Station!</p>
              <p className="text-slate-400 text-sm">Charger #{activeBooking.chargerId} · {activeBooking.timeSlot}</p>
            </div>
          </div>
          <button
            onClick={() => navigateToStation(station)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: "linear-gradient(135deg,#5B47E0,#FF8A3D)", color: "#fff", boxShadow: "0 0 20px rgba(91,71,224,0.4)", border: "none", cursor: "pointer" }}>
            🗺️ Get Directions
          </button>
        </div>
      )}

      {isOffline && (
        <div className="p-4 rounded-2xl border border-red-400/30 flex items-center gap-3" style={{ background: "rgba(239,68,68,0.08)" }}>
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-red-400 font-bold">Station is Currently Offline</p>
            <p className="text-slate-400 text-sm">Not accepting bookings right now.</p>
          </div>
        </div>
      )}

      {/* Facilities + Popular Times */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {station.facilities?.length > 0 && (
          <GlassCard className="p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Facilities & Amenities</p>
            <div className="flex flex-wrap gap-2">
              {station.facilities.map(f => (
                <span key={f} className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(255,138,61,0.08)", border: "1px solid rgba(255,138,61,0.2)", color: "#FF8A3D" }}>
                  {f}
                </span>
              ))}
            </div>
          </GlassCard>
        )}
        <PopularTimes data={popularTimes} />
      </div>

      {/* Map + Navigate */}
      {(station.lat && station.lng) && (
        <GlassCard className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
            <p className="text-sm font-semibold text-slate-300">📍 Station Location</p>
            <button onClick={() => navigateToStation(station)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
              style={{ background: "rgba(255,138,61,0.1)", border: "1px solid rgba(255,138,61,0.3)", color: "#FF8A3D", cursor: "pointer" }}>
              🗺️ Open in Google Maps
            </button>
          </div>
          <iframe
            title="Station Location"
            width="100%" height="220"
            style={{ border: 0, display: "block" }}
            loading="lazy"
            src={`https://www.google.com/maps?q=${station.lat},${station.lng}&z=15&output=embed`}
          />
        </GlassCard>
      )}

      {/* Charger Bay */}
      <GlassCard className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-300">Charger Bay</h3>
          <div className="flex gap-4 text-xs">
            {Object.entries(statusCfg).map(([s, c]) => (
              <span key={s} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: c.text }} />
                <span className="text-slate-400">{s}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 justify-center">
          {station.chargers?.map(charger => {
            const cfg     = statusCfg[charger.status] || statusCfg.Maintenance;
            const canBook = charger.status === "Available" && !activeBooking && !isOffline;
            return (
              <motion.div key={charger.id} whileHover={canBook ? { scale: 1.06 } : {}}
                onClick={() => canBook && setSelectedCharger(charger)}
                className="w-28 h-40 rounded-2xl flex flex-col items-center justify-center gap-2"
                style={{ background: isOffline ? "rgba(255,255,255,0.02)" : cfg.bg, border: `2px solid ${isOffline ? "rgba(255,255,255,0.06)" : cfg.border}`, cursor: canBook ? "pointer" : "not-allowed", opacity: isOffline ? 0.5 : 1, boxShadow: charger.status === "Available" && !isOffline ? `0 0 18px ${cfg.border}` : "none" }}>
                <Icon name="bolt" className="w-6 h-6" style={{ color: isOffline ? "#475569" : cfg.text }} />
                <p className="font-black text-white text-xl">#{charger.id}</p>
                <p className="text-xs font-semibold" style={{ color: isOffline ? "#475569" : cfg.text }}>{isOffline ? "Offline" : charger.status}</p>
                <p className="text-xs text-slate-400">{charger.power}kW</p>
                <p className="text-xs text-slate-500 text-center px-1">{charger.type}</p>
              </motion.div>
            );
          })}
        </div>
      </GlassCard>

      {activeBooking && !isOffline && !(activeBooking.stationId === stationId || activeBooking.stationId?._id === stationId) && (
        <Alert type="info" message="You already have an active booking at another station. Cancel it to book here." />
      )}

      {/* Reviews Section */}
      {user?.role === "User" && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-white text-lg">⭐ Reviews & Ratings</h3>
            {totalReviews > 0 && (
              <div className="text-center">
                <p className="text-3xl font-black text-yellow-400">{avgRating}</p>
                <StarRating value={Math.round(avgRating)} readonly />
                <p className="text-slate-500 text-xs mt-1">{totalReviews} reviews</p>
              </div>
            )}
          </div>

          {hasCompletedVisit ? (
            <div className="p-5 rounded-2xl border border-white/10 mb-6" style={{ background: "rgba(255,138,61,0.03)" }}>
              <p className="text-sm font-semibold text-slate-300 mb-3">
                {myReview ? "✏️ Update Your Review" : "✍️ Write a Review"}
              </p>
              <StarRating value={myRating} onChange={setMyRating} />
              <textarea value={myComment} onChange={e => setMyComment(e.target.value)}
                placeholder="Share your experience... (optional)"
                rows={3} maxLength={500}
                className="w-full mt-3 rounded-xl px-4 py-3 text-white text-sm outline-none border resize-none"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} />
              <p className="text-slate-600 text-xs text-right mt-1">{myComment.length}/500</p>
              {reviewError   && <p className="text-red-400   text-xs mt-2">❌ {reviewError}</p>}
              {reviewSuccess && <p className="text-green-400 text-xs mt-2">✓ {reviewSuccess}</p>}
              <div className="flex gap-2 mt-3">
                <Btn onClick={submitReview} disabled={!myRating} loading={submitting} className="flex-1">
                  {myReview ? "Update Review" : "Submit Review"}
                </Btn>
                {myReview && <Btn variant="danger" onClick={deleteReview} className="px-4">Delete</Btn>}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl mb-6 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-slate-400 text-sm">📋 Complete a charging session here to leave a review</p>
            </div>
          )}

          {reviews.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-3xl mb-2">⭐</p>
              <p className="text-slate-400 text-sm">No reviews yet. Be the first!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map(r => (
                <ReviewCard key={r._id} review={r} station={station} user={user}
                  onReplied={updated => setReviews(prev => prev.map(rv => rv._id === updated._id ? updated : rv))} />
              ))}
            </div>
          )}
        </GlassCard>
      )}

      <AnimatePresence>
        {selectedCharger && (
          <BookingModal station={station} charger={selectedCharger} car={user?.car} user={user}
            onClose={() => setSelectedCharger(null)}
            onConfirmBooking={async (b) => { await onConfirmBooking(b); setSelectedCharger(null); }}
            onDone={() => {
              setSelectedCharger(null);
              toast.success(
                (t) => (
                  <div>
                    <p className="font-semibold">You're booked at {station.name}! 🔌</p>
                    <p className="text-xs mt-1 opacity-90">Be on time — {pickQuote()}</p>
                  </div>
                ),
                { duration: 6000 }
              );
              navigate("/dashboard");
            }} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default StationLayout;