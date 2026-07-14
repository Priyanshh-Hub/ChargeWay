import React from 'react';
import { motion } from 'framer-motion';
import { GlassCard, Badge } from '../ui/index';
import Icon from '../ui/Icon';
import VehicleVisual from './VehicleVisual';

const healthColor = (pct) => pct >= 80 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444";

const VehicleCard = ({ vehicle, onEdit, onDelete, onFavorite, busy }) => {
  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
      <GlassCard className={`p-0 overflow-hidden relative ${vehicle.isFavorite ? "ring-1" : ""}`} style={vehicle.isFavorite ? { boxShadow: "0 0 0 1px rgba(0,196,255,0.4)" } : {}}>
        <div className="h-36 relative bg-slate-900/60">
          <VehicleVisual color={vehicle.color} connectorType={vehicle.connectorType} size="sm" />
          <button onClick={() => onFavorite(vehicle._id)} disabled={busy || vehicle.isFavorite}
            title={vehicle.isFavorite ? "Primary vehicle" : "Set as primary vehicle"}
            aria-label={vehicle.isFavorite ? "Primary vehicle" : "Set as primary vehicle"}
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
            style={{ background: "rgba(2,6,15,0.6)", backdropFilter: "blur(4px)" }}>
            <Icon name={vehicle.isFavorite ? "starFilled" : "star"} className="w-4 h-4" style={{ color: vehicle.isFavorite ? "#facc15" : "#94a3b8" }} />
          </button>
          {vehicle.isFavorite && <div className="absolute top-2.5 left-2.5"><Badge color="blue">Primary</Badge></div>}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-white leading-tight">{vehicle.nickname || `${vehicle.brand} ${vehicle.model}`}</h3>
              {vehicle.nickname && <p className="text-xs text-slate-500">{vehicle.brand} {vehicle.model}</p>}
            </div>
            <Badge color="purple"><Icon name="plug" className="w-3 h-3 inline mr-0.5" />{vehicle.connectorType || "CCS2"}</Badge>
          </div>

          <p className="font-mono text-cyan-400 text-sm mt-2">{vehicle.vehicleNumber}</p>

          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500 flex items-center gap-1"><Icon name="battery" className="w-3.5 h-3.5" /> Battery Health</span>
              <span className="font-semibold" style={{ color: healthColor(vehicle.batteryHealth ?? 100) }}>{vehicle.batteryHealth ?? 100}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${vehicle.batteryHealth ?? 100}%`, background: healthColor(vehicle.batteryHealth ?? 100) }} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            {[{ v: `${vehicle.range_km || 0} km`, l: "Range" }, { v: `${vehicle.battery_kwh || 0} kWh`, l: "Capacity" }, { v: vehicle.color || "—", l: "Color" }].map(item => (
              <div key={item.l} className="p-1.5 rounded-lg" style={{ background: "rgba(0,196,255,0.05)" }}>
                <p className="text-xs font-bold text-cyan-400">{item.v}</p>
                <p className="text-xs text-slate-500">{item.l}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={() => onEdit(vehicle)} disabled={busy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border border-white/10 text-slate-300 hover:border-cyan-400/40 hover:text-cyan-400 transition-all">
              <Icon name="edit" className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={() => onDelete(vehicle)} disabled={busy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border border-white/10 text-slate-300 hover:border-red-400/40 hover:text-red-400 transition-all">
              <Icon name="trash" className="w-3.5 h-3.5" /> Remove
            </button>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
};

export default VehicleCard;
