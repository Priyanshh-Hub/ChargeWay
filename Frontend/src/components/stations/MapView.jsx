import React, { useRef, useEffect, useState } from 'react';
import { Spinner } from '../ui/index';

const MapView = ({ stations, onSelectStation }) => {
  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef     = useRef([]);
  const [ready, setReady] = useState(false);

  // Load Leaflet once
  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css"; link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    if (window.L) { setReady(true); return; }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  // Init map once
  useEffect(() => {
    if (!ready || !mapRef.current || mapInstanceRef.current) return;
    const L = window.L;
    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO", subdomains: "abcd", maxZoom: 19,
    }).addTo(map);
    mapInstanceRef.current = map;
  }, [ready]);

  // Update markers whenever stations change (including lat/lng updates)
  useEffect(() => {
    if (!ready || !mapInstanceRef.current) return;
    const L   = window.L;
    const map = mapInstanceRef.current;

    // Remove ALL old markers
    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    // Filter out stations with invalid coordinates
    const validStations = stations.filter(s =>
      s.lat != null && s.lng != null &&
      !isNaN(parseFloat(s.lat)) && !isNaN(parseFloat(s.lng))
    );

    validStations.forEach(s => {
      const lat   = parseFloat(s.lat);
      const lng   = parseFloat(s.lng);
      const color = s.status === "Online" ? "#10b981" : "#ef4444";
      const avail = s.chargers?.filter(c => c.status === "Available").length || 0;

      const icon = L.divIcon({
        html: `<div style="background:${color};width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 0 14px ${color}90;font-weight:bold;color:white;font-size:14px;cursor:pointer">${avail}</div>`,
        className: "", iconSize: [36, 36], iconAnchor: [18, 18],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(map);

      marker.bindPopup(`
        <div style="background:#0F1928;color:white;padding:12px 16px;border-radius:12px;border:1px solid rgba(0,196,255,0.3);min-width:200px">
          <b style="color:#00C4FF;font-size:14px">${s.name}</b>
          <p style="color:#94a3b8;font-size:12px;margin:4px 0">${s.address}</p>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <span style="color:#10b981;font-size:12px">⚡ ${avail} Available</span>
            <b style="color:#00C4FF">₹${s.price_per_kwh}/kWh</b>
          </div>
          <div id="goto-${s._id}" style="background:linear-gradient(135deg,#0066FF,#00C4FF);color:white;text-align:center;padding:7px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">
            View Station →
          </div>
        </div>
      `, { className: "cw-popup", closeButton: false });

      marker.on("click", () => marker.openPopup());

      marker.on("popupopen", () => {
        setTimeout(() => {
          const btn = document.getElementById(`goto-${s._id}`);
          if (btn) btn.onclick = () => { map.closePopup(); onSelectStation(s); };
        }, 50);
      });

      markersRef.current.push(marker);
    });

    // If we have valid stations, fit map to show all markers
    if (validStations.length > 0) {
      try {
        const group = L.featureGroup(markersRef.current);
        map.fitBounds(group.getBounds().pad(0.2), { maxZoom: 13 });
      } catch (e) {
        // fallback — keep current view
      }
    }
  }, [ready, stations, onSelectStation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10" style={{ height: 380 }}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "rgba(15,25,45,0.9)" }}>
          <Spinner text="Loading map..." />
        </div>
      )}
      <div ref={mapRef} className="w-full h-full" />
      <style>{`
        .cw-popup .leaflet-popup-content-wrapper { background: transparent; border: none; box-shadow: none; padding: 0; }
        .cw-popup .leaflet-popup-content { margin: 0; }
        .cw-popup .leaflet-popup-tip-container { display: none; }
      `}</style>
    </div>
  );
};

export default MapView;