import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../api/api';
import { GlassCard, Badge, Btn, Modal, EmptyState } from '../ui/index';
import Icon from '../ui/Icon';

const StarRating = ({ value, onChange, readonly = false }) => (
  <div className="flex gap-1" role={readonly ? undefined : "radiogroup"} aria-label={readonly ? `Rated ${value} out of 5 stars` : "Select a rating"}>
    {[1, 2, 3, 4, 5].map(star => (
      <button key={star}
        onClick={() => !readonly && onChange && onChange(star)}
        role={readonly ? undefined : "radio"}
        aria-checked={readonly ? undefined : star === value}
        aria-label={readonly ? undefined : `${star} star${star > 1 ? "s" : ""}`}
        tabIndex={readonly ? -1 : 0}
        className={`text-xl transition-transform ${readonly ? "cursor-default" : "hover:scale-110 cursor-pointer"}`}
        style={{ color: star <= value ? "#fbbf24" : "rgba(255,255,255,0.15)" }}>★</button>
    ))}
  </div>
);

const ReviewModal = ({ booking, onClose, onSubmitted }) => {
  const [rating,    setRating]    = useState(0);
  const [comment,   setComment]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const stationId = booking.stationId?._id || booking.stationId;

  const submit = async () => {
    if (!rating) return;
    setLoading(true); setError("");
    const res = await api.post(`/reviews/${stationId}`, { rating, comment });
    if (res.ok) { onSubmitted(); onClose(); }
    else setError(res.error || "Failed to submit review");
    setLoading(false);
  };

  return (
    <Modal open onClose={onClose} title="⭐ Rate Your Session">
      <p className="text-slate-400 text-sm mb-4">
        Station: <span className="text-white font-semibold">{booking.stationName || booking.stationId?.name}</span>
      </p>
      <div className="mb-4">
        <p className="text-slate-400 text-xs mb-2">Your Rating</p>
        <StarRating value={rating} onChange={setRating} />
      </div>
      <textarea value={comment} onChange={e => setComment(e.target.value)}
        placeholder="Share your experience... (optional)"
        rows={3} maxLength={500}
        className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none border resize-none mb-1"
        style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }} />
      <p className="text-slate-600 text-xs text-right mb-3">{comment.length}/500</p>
      {error && <p className="text-red-400 text-xs mb-3">❌ {error}</p>}
      <div className="flex gap-2">
        <Btn variant="ghost" onClick={onClose} className="flex-1">Cancel</Btn>
        <Btn onClick={submit} disabled={!rating} loading={loading} className="flex-1">Submit Review</Btn>
      </div>
    </Modal>
  );
};

const QRModal = ({ booking, station, onClose }) => (
  <Modal open onClose={onClose} title="Check-in Code">
    <div className="flex flex-col items-center gap-3 p-4 rounded-xl" style={{ background: "white" }}>
      <QRCodeSVG value={JSON.stringify({ bookingId: booking._id, stationId: booking.stationId?._id || booking.stationId, chargerId: booking.chargerId })} size={160} />
      <p className="text-slate-600 text-xs font-medium text-center">Show this at Charger #{booking.chargerId} to check in</p>
    </div>
    <p className="text-slate-500 text-xs text-center mt-3">{booking.stationName} · {booking.timeSlot}</p>
  </Modal>
);

const BookingSkeleton = () => (
  <GlassCard className="p-5 space-y-3">
    <div className="flex justify-between">
      <div className="h-4 w-40 rounded animate-pulse bg-white/5" />
      <div className="h-4 w-16 rounded animate-pulse bg-white/5" />
    </div>
    <div className="grid grid-cols-4 gap-3">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-10 rounded-lg animate-pulse bg-white/5" />)}
    </div>
  </GlassCard>
);

const BookingsPage = ({ user }) => {
  const [bookings,     setBookings]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState("All");
  const [cancelling,   setCancelling]   = useState(null);
  const [reviewBooking,setReviewBooking]= useState(null);
  const [qrBooking,    setQrBooking]    = useState(null);
  const [confirmCancel,setConfirmCancel]= useState(null);
  const [myReviews,    setMyReviews]    = useState({});

  const load = async () => {
    const res = await api.get("/bookings");
    if (res.ok) {
      const bks = res.data.bookings;
      setBookings(bks);
      const completed = bks.filter(b => b.status === "Completed");
      const reviewMap = {};
      await Promise.all(completed.map(async b => {
        const sid = b.stationId?._id || b.stationId;
        if (!sid || reviewMap[sid]) return;
        const r = await api.get(`/reviews/${sid}`);
        if (r.ok) {
          const mine = r.data.reviews.find(rv => rv.userId?._id === user?._id || rv.userId === user?._id);
          if (mine) reviewMap[sid] = mine;
        }
      }));
      setMyReviews(reviewMap);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const cancel = async () => {
    if (!confirmCancel) return;
    const id = confirmCancel._id;
    setCancelling(id);
    const res = await api.put(`/bookings/${id}/cancel`, {});
    if (res.ok) { await load(); toast.success("Booking cancelled"); }
    else toast.error(res.error || "Couldn't cancel booking");
    setCancelling(null);
    setConfirmCancel(null);
  };

  const filtered    = filter === "All" ? bookings : bookings.filter(b => b.status === filter);
  const statusColor = { Completed: "green", Upcoming: "blue", Cancelled: "red" };

  return (
    <div className="space-y-6">
      {reviewBooking && <ReviewModal booking={reviewBooking} onClose={() => setReviewBooking(null)} onSubmitted={load} />}
      {qrBooking && <QRModal booking={qrBooking} onClose={() => setQrBooking(null)} />}

      <Modal open={!!confirmCancel} onClose={() => setConfirmCancel(null)} title="Cancel this booking?">
        <p className="text-sm text-slate-400 mb-1">
          {confirmCancel?.stationName} · Charger #{confirmCancel?.chargerId} · {confirmCancel?.timeSlot}
        </p>
        <p className="text-sm text-slate-500 mb-5">This slot will be released back to other drivers. This can't be undone.</p>
        <div className="flex gap-3">
          <Btn variant="ghost" onClick={() => setConfirmCancel(null)} className="flex-1">Keep Booking</Btn>
          <Btn variant="danger" onClick={cancel} loading={cancelling === confirmCancel?._id} className="flex-1">Yes, Cancel</Btn>
        </div>
      </Modal>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-page text-white">Charging Sessions</h2>
        <div className="flex gap-2 flex-wrap">
          {["All", "Upcoming", "Completed", "Cancelled"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter === f ? "border-cyan-400/50 text-cyan-400 bg-cyan-400/10" : "border-white/10 text-slate-400 hover:border-white/20"}`}>
              {f}
            </button>
          ))}
          <button onClick={load} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-slate-400 hover:border-white/20">
            <Icon name="refresh" className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <BookingSkeleton key={i} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="booking" title={filter === "All" ? "No bookings yet" : `No ${filter.toLowerCase()} bookings`}
          subtitle="Find a station and reserve a charger to see it here." />
      ) : (
        <div className="space-y-3">
          {filtered.map(b => {
            const sid      = b.stationId?._id || b.stationId;
            const myReview = myReviews[sid];
            return (
              <GlassCard key={b._id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-white">{b.stationName || b.stationId?.name}</h3>
                      <Badge color={statusColor[b.status] || "blue"}>{b.status}</Badge>
                    </div>
                    <p className="text-slate-500 text-xs">Charger #{b.chargerId} · {b.vehicleNumber}</p>
                  </div>
                  <p className="text-cyan-400 font-black">₹{b.totalCost}</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  {[
                    { l: "Date",     v: b.date },
                    { l: "Time",     v: b.timeSlot },
                    { l: "Duration", v: `~${b.duration} min` },
                    { l: "Energy",   v: `${b.energyKwh} kWh` },
                  ].map(item => (
                    <div key={item.l} className="p-2 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.03)" }}>
                      <p className="text-slate-500">{item.l}</p>
                      <p className="text-white font-semibold mt-0.5">{item.v}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5 flex-wrap gap-2">
                  <span className="text-slate-500 text-xs">{b.paymentMethod}</span>

                  <div className="flex items-center gap-2 flex-wrap">
                    {b.status === "Completed" && (
                      myReview ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-yellow-400/20 text-xs"
                          style={{ background: "rgba(251,191,36,0.05)" }}>
                          <StarRating value={myReview.rating} readonly />
                          <span className="text-yellow-400 font-medium ml-1">Reviewed</span>
                        </div>
                      ) : (
                        <Btn variant="outline" onClick={() => setReviewBooking(b)} className="text-xs py-1.5 px-3 gap-1">
                          ⭐ Rate Station
                        </Btn>
                      )
                    )}

                    {b.status === "Upcoming" && (
                      <>
                        <Btn variant="outline" onClick={() => setQrBooking(b)} className="text-xs py-1.5 px-3 gap-1">
                          <Icon name="search" className="w-3.5 h-3.5 inline mr-1" />QR Code
                        </Btn>
                        <Btn variant="danger" onClick={() => setConfirmCancel(b)} className="text-xs py-1.5 px-3">
                          Cancel
                        </Btn>
                      </>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BookingsPage;
