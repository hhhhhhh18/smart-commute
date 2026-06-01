"use client";

import { useState } from "react";

interface RideTicketProps {
  mode: "rapido" | "ola_uber";
  from: string;
  to: string;
  fromCoords: [number, number];
  toCoords: [number, number];
  distanceKm: number;
  durationMin: number;
  trafficDuration: number;
  cost: number;
  onClose: () => void;
}

const RAPIDO_CONFIG = {
  brand:      "RAPIDO",
  label:      "Bike Taxi",
  icon:       "🏍️",
  color:      "#FFCC00",
  textColor:  "#1a1a1a",
  darkColor:  "#E6B800",
  bgGradient: "linear-gradient(135deg, #FFCC00 0%, #FFE066 100%)",
  logoEmoji:  "⚡",
  tagline:    "Fast, Affordable Bike Rides",
  bookLabel:  "Book via Rapido",
  appUrl:     (from: string, to: string, fc: [number,number], tc: [number,number]) =>
    `https://rapido.bike`,
  categories: [
    { id: "bike",    label: "Bike",    icon: "🏍️", mult: 1.0,  eta: 0  },
    { id: "auto",    label: "Auto",    icon: "🛺",  mult: 1.35, eta: 2  },
    { id: "cab",     label: "Cab",     icon: "🚗",  mult: 1.7,  eta: 3  },
  ],
};

const OLA_UBER_CONFIG = {
  brand:      "OLA / UBER",
  label:      "Cab Booking",
  icon:       "🚗",
  color:      "#1A73E8",
  textColor:  "#ffffff",
  darkColor:  "#1557B0",
  bgGradient: "linear-gradient(135deg, #1A73E8 0%, #4A90E2 100%)",
  logoEmoji:  "🚖",
  tagline:    "Comfortable Car Rides",
  bookLabel:  "Book via Ola / Uber",
  appUrl:     (from: string, to: string, fc: [number,number], tc: [number,number]) =>
    `https://book.olacabs.com/?pickup_lat=${fc[0]}&pickup_lng=${fc[1]}&drop_lat=${tc[0]}&drop_lng=${tc[1]}&pickup_name=${encodeURIComponent(from)}&drop_name=${encodeURIComponent(to)}`,
  categories: [
    { id: "mini",    label: "Mini",    icon: "🚗",  mult: 1.0,  eta: 0  },
    { id: "sedan",   label: "Sedan",   icon: "🚙",  mult: 1.3,  eta: 2  },
    { id: "prime",   label: "Prime",   icon: "🚘",  mult: 1.65, eta: 4  },
    { id: "suv",     label: "SUV",     icon: "🚐",  mult: 2.1,  eta: 5  },
  ],
};

function fmt12(date: Date) {
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function RideTicket({
  mode, from, to, fromCoords, toCoords,
  distanceKm, durationMin, trafficDuration, cost, onClose,
}: RideTicketProps) {
  const cfg = mode === "rapido" ? RAPIDO_CONFIG : OLA_UBER_CONFIG;
  const [selectedCat, setSelectedCat] = useState(0);

  const cat         = cfg.categories[selectedCat];
  const catCost     = Math.round(cost * cat.mult);
  const catDuration = trafficDuration + cat.eta;
  const now         = new Date();
  const arrivalTime = new Date(now.getTime() + catDuration * 60000);
  const pickupEta   = new Date(now.getTime() + (3 + cat.eta) * 60000);

  const isRapido = mode === "rapido";

  function handleBook() {
    const url = cfg.appUrl(from, to, fromCoords, toCoords);
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    // Try deep link first for mobile
    iframe.src = isRapido
      ? `rapido://book?pickup_lat=${fromCoords[0]}&pickup_lng=${fromCoords[1]}&drop_lat=${toCoords[0]}&drop_lng=${toCoords[1]}`
      : `olacabs://book?pickup_lat=${fromCoords[0]}&pickup_lng=${fromCoords[1]}&drop_lat=${toCoords[0]}&drop_lng=${toCoords[1]}`;
    setTimeout(() => {
      document.body.removeChild(iframe);
      window.open(url, "_blank");
    }, 1000);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 4000,
      background: "rgba(0,0,0,0.65)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
      fontFamily: "'Segoe UI', sans-serif",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: "24px",
        width: "100%",
        maxWidth: "420px",
        overflow: "hidden",
        boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
        animation: "slideUp 0.25s ease",
      }}>
        <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }`}</style>

        {/* ── Header ── */}
        <div style={{
          background: cfg.bgGradient,
          padding: "20px 20px 18px",
          position: "relative",
        }}>
          <button onClick={onClose} style={{
            position: "absolute", top: "14px", right: "14px",
            width: "30px", height: "30px",
            background: "rgba(0,0,0,0.15)", border: "none",
            borderRadius: "50%", cursor: "pointer",
            fontSize: "15px", color: cfg.textColor,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "700",
          }}>✕</button>

          <div style={{ fontSize: "10px", fontWeight: "800", letterSpacing: "2px", color: cfg.textColor, opacity: 0.7, marginBottom: "4px" }}>
            {cfg.logoEmoji} {cfg.brand}
          </div>
          <div style={{ fontSize: "22px", fontWeight: "800", color: cfg.textColor, marginBottom: "2px" }}>
            Smart Booking
          </div>
          <div style={{ fontSize: "11px", color: cfg.textColor, opacity: 0.75 }}>{cfg.tagline}</div>
        </div>

        {/* ── Route ── */}
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ display: "flex", alignItems: "stretch", gap: "12px" }}>
            {/* Timeline dots */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "3px" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: cfg.color, border: "3px solid #fff", boxShadow: `0 0 0 2px ${cfg.color}` }} />
              <div style={{ width: "2px", flex: 1, background: "#e0e0e0", margin: "4px 0" }} />
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#EA4335", border: "3px solid #fff", boxShadow: "0 0 0 2px #EA4335" }} />
            </div>
            {/* Labels */}
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "10px", color: "#999", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>PICKUP</div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#1a1a1a", marginTop: "1px" }}>{from.split(",")[0]}</div>
                <div style={{ fontSize: "11px", color: "#888" }}>ETA: {fmt12(pickupEta)}</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "#999", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>DROP</div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#1a1a1a", marginTop: "1px" }}>{to.split(",")[0]}</div>
                <div style={{ fontSize: "11px", color: "#888" }}>Arr: ~{fmt12(arrivalTime)}</div>
              </div>
            </div>
            {/* Stats */}
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "center", gap: "6px" }}>
              <div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "#1a1a1a" }}>₹{catCost}</div>
                <div style={{ fontSize: "10px", color: "#888" }}>Est. fare</div>
              </div>
              <div>
                <div style={{ fontSize: "15px", fontWeight: "700", color: "#555" }}>{catDuration} min</div>
                <div style={{ fontSize: "10px", color: "#888" }}>{distanceKm.toFixed(1)} km</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Category selector ── */}
        <div style={{ padding: "14px 20px 10px" }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
            Choose ride type
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cfg.categories.length}, 1fr)`, gap: "8px" }}>
            {cfg.categories.map((c, i) => {
              const cCost = Math.round(cost * c.mult);
              const isSelected = i === selectedCat;
              return (
                <div key={c.id} onClick={() => setSelectedCat(i)} style={{
                  border: isSelected ? `2px solid ${cfg.color}` : "1.5px solid #e8e8e8",
                  borderRadius: "12px",
                  padding: "10px 8px",
                  cursor: "pointer",
                  background: isSelected ? `${cfg.color}15` : "#fafafa",
                  textAlign: "center",
                  transition: "all 0.15s",
                  position: "relative",
                }}>
                  {isSelected && (
                    <div style={{
                      position: "absolute", top: "-8px", left: "50%", transform: "translateX(-50%)",
                      background: cfg.color, color: cfg.textColor,
                      fontSize: "8px", fontWeight: "800", padding: "2px 6px",
                      borderRadius: "999px", whiteSpace: "nowrap",
                    }}>SELECTED</div>
                  )}
                  <div style={{ fontSize: "20px", marginBottom: "4px" }}>{c.icon}</div>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#1a1a1a" }}>{c.label}</div>
                  <div style={{ fontSize: "12px", fontWeight: "800", color: isSelected ? cfg.darkColor : "#555", marginTop: "2px" }}>₹{cCost}</div>
                  {c.eta > 0 && <div style={{ fontSize: "9px", color: "#999", marginTop: "1px" }}>+{c.eta} min</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Info strip ── */}
        <div style={{ margin: "0 20px 14px", padding: "10px 14px", background: "#f8f9fa", borderRadius: "10px", display: "flex", gap: "16px" }}>
          {[
            { icon: "🗓️", label: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
            { icon: "⏱️", label: `~${catDuration} min ride` },
            { icon: "📍", label: `${distanceKm.toFixed(1)} km` },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: "#555" }}>
              <span>{s.icon}</span><span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── Fare note ── */}
        <div style={{ margin: "0 20px 16px", fontSize: "11px", color: "#888", textAlign: "center" }}>
          💡 Final fare may vary based on traffic & surge pricing
        </div>

        {/* ── Book button ── */}
        <div style={{ padding: "0 20px 24px" }}>
          <button onClick={handleBook} style={{
            width: "100%",
            padding: "15px",
            background: cfg.bgGradient,
            color: cfg.textColor,
            border: "none",
            borderRadius: "14px",
            fontSize: "15px",
            fontWeight: "800",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            boxShadow: `0 6px 20px ${cfg.color}50`,
            letterSpacing: "0.3px",
          }}>
            <span style={{ fontSize: "18px" }}>{cfg.icon}</span>
            {cfg.bookLabel} · ₹{catCost}
          </button>
        </div>
      </div>
    </div>
  );
}