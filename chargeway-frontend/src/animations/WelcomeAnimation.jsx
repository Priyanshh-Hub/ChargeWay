import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import { serverImg } from '../api/api';
import Icon from '../components/ui/Icon';

const AnimatedNumber = ({ to }) => {
  const count   = useMotionValue(0);
  const rounded = useTransform(count, v => Math.round(v).toLocaleString());
  useEffect(() => { const c = animate(count, to, { duration: 1.5 }); return c.stop; }, [to]);
  return <motion.span>{rounded}</motion.span>;
};

const WelcomeAnimation = ({ user, totals, onComplete }) => {
  const [phase, setPhase] = useState("loading");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("welcome"), 1200);
    const t2 = setTimeout(onComplete, 3500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onComplete]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "#050D1A" }}>

      <AnimatePresence mode="wait">

        {phase === "loading" && (
          <motion.div key="loader"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center gap-6">

            <div className="relative w-24 h-24">
              {[0, 1, 2].map(i => (
                <motion.div key={i}
                  className="absolute inset-0 rounded-full border border-cyan-400/30"
                  animate={{ scale: [1, 2], opacity: [0.6, 0] }}
                  transition={{ delay: i * 0.4, duration: 1.5, repeat: Infinity }} />
              ))}
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-cyan-400 border-r-blue-500 animate-spin" />
              <div className="absolute inset-3 rounded-full border border-cyan-400/20 animate-pulse"
                style={{ background: "rgba(0,196,255,0.05)" }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl">⚡</span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-white font-black text-xl tracking-wide">ChargeWay</p>
              <p className="text-slate-500 text-sm mt-1">Loading your dashboard...</p>
            </div>

            <div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <motion.div className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg,#0066FF,#00C4FF)" }}
                initial={{ width: "0%" }} animate={{ width: "100%" }}
                transition={{ duration: 1.1, ease: "easeInOut" }} />
            </div>
          </motion.div>
        )}

        {phase === "welcome" && (
          <motion.div key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-white space-y-6 px-6 max-w-md">

            {user?.role === "User" && (
              <>
                {user.car?.image ? (
                  <motion.img src={serverImg(user.car.image)} alt="car"
                    className="h-44 mx-auto object-contain drop-shadow-2xl"
                    initial={{ x: -200, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 60 }}
                    onError={e => { e.target.style.display = "none"; }} />
                ) : (
                  <motion.div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#0066FF,#00C4FF)" }}
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                    <span className="text-4xl">⚡</span>
                  </motion.div>
                )}
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                  <p className="text-slate-400 text-sm mb-1">Welcome back</p>
                  <h1 className="text-4xl font-black">{user.name.split(" ")[0]}! ⚡</h1>
                  {user.car && <p className="text-cyan-400 mt-2 font-medium">{user.car.brand} {user.car.model}</p>}
                </motion.div>
              </>
            )}

            {user?.role === "Station Manager" && (
              <>
                <div className="relative w-28 h-28 mx-auto">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="absolute inset-0 rounded-full border-2 border-cyan-400"
                      animate={{ scale: [1, 2.5], opacity: [0.8, 0] }}
                      transition={{ delay: i * 0.4, duration: 1.5, repeat: Infinity }} />
                  ))}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon name="bolt" className="w-14 h-14 text-cyan-400" />
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Welcome back</p>
                  <h1 className="text-3xl font-black mt-1">{user.name.split(" ")[0]}</h1>
                  <p className="text-cyan-400 mt-1">Station Control Active</p>
                </div>
              </>
            )}

            {user?.role === "Admin" && (
              <>
                <motion.div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg,#0066FF,#00C4FF)" }}
                  initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                  <Icon name="analytics" className="w-10 h-10 text-white" />
                </motion.div>
                <div>
                  <p className="text-slate-400 text-sm">Welcome back</p>
                  <h1 className="text-2xl font-black mt-1">{user.name.split(" ")[0]}</h1>
                  <p className="text-cyan-400 text-sm mt-1">System Overview</p>
                </div>
                <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                  {[
                    { l: "Users",    v: totals?.users    || 0 },
                    { l: "Stations", v: totals?.stations || 0 },
                    { l: "Bookings", v: totals?.bookings || 0 },
                    { l: "Revenue",  v: totals?.revenue  || 0 },
                  ].map(item => (
                    <div key={item.l} className="p-4 rounded-2xl border border-white/10" style={{ background: "rgba(0,196,255,0.05)" }}>
                      <p className="text-xs text-slate-400">{item.l}</p>
                      <p className="text-2xl font-black text-cyan-400"><AnimatedNumber to={item.v} /></p>
                    </div>
                  ))}
                </div>
              </>
            )}

            <motion.div className="w-40 h-1 mx-auto rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#0066FF,#00C4FF)" }}
                initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 2.2 }} />
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  );
};

export default WelcomeAnimation;