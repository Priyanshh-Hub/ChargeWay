import React from 'react';
const AnimatedBackground = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden"
    style={{ background: "linear-gradient(135deg, #050D1A 0%, #0A1628 40%, #061020 100%)" }}>
    <div className="absolute inset-0"
      style={{ backgroundImage: "radial-gradient(circle at 20% 80%, rgba(0,200,255,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(100,0,255,0.04) 0%, transparent 50%)" }} />
    <div className="absolute inset-0 opacity-20"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%230066aa' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")` }} />
  </div>
);

export default AnimatedBackground;
