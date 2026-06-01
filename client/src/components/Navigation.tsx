"use client";

import { useEffect, useRef, useState } from "react";

interface Step {
  instruction: string;
  distance: string;
  duration: string;
  direction: string;
}

interface NavigationProps {
  steps: Step[];
  from: string;
  to: string;
  totalDistance: string;
  totalTime: string;
  mode: string;
  fromCoords: [number, number];
  toCoords: [number, number];
  onClose: () => void;
}

const MODE_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  self_bike: { color: "#FF6D00", icon: "🏍️", label: "Bike" },
  self_auto: { color: "#7B1FA2", icon: "🛺",  label: "Auto" },
  self_car:  { color: "#1A73E8", icon: "🚗",  label: "Car"  },
  bus:       { color: "#1565C0", icon: "🚌",  label: "Bus"  },
  metro:     { color: "#E53935", icon: "🚇",  label: "Metro"},
  default:   { color: "#1A73E8", icon: "🚗",  label: "Drive"},
};

const DIRECTION_ICONS: Record<string, string> = {
  "turn-left":          "↰",
  "turn-right":         "↱",
  "turn-slight-left":   "↖",
  "turn-slight-right":  "↗",
  "turn-sharp-left":    "⬅",
  "turn-sharp-right":   "➡",
  "uturn-left":         "↩",
  "uturn-right":        "↪",
  "roundabout-left":    "↺",
  "roundabout-right":   "↻",
  "straight":           "↑",
  "new name":           "↑",
  "arrive":             "🏁",
  "depart":             "🚦",
  "default":            "↑",
};

function getDirectionIcon(direction: string): string {
  return DIRECTION_ICONS[direction] || DIRECTION_ICONS["default"];
}

export default function Navigation({
  steps, from, to, totalDistance, totalTime,
  mode, fromCoords, toCoords, onClose,
}: NavigationProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<any>(null);
  const layersRef       = useRef<any[]>([]);
  const locationRef     = useRef<any>(null);
  const watchIdRef      = useRef<number | null>(null);
  const initedRef       = useRef(false);

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [showAllSteps, setShowAllSteps]      = useState(false);
  const [locationReady, setLocationReady]    = useState(false);

  const cfg         = MODE_CONFIG[mode] || MODE_CONFIG.default;
  const currentStep = steps[currentStepIdx] || steps[0];

  // ── Build map once ──────────────────────────────────────────
  useEffect(() => {
    if (initedRef.current || !mapContainerRef.current) return;
    initedRef.current = true;

    import("leaflet").then((L) => {
      if (!mapContainerRef.current || mapRef.current) return;
      const el = mapContainerRef.current as any;
      if (el._leaflet_id) el._leaflet_id = null;

      const map = L.map(mapContainerRef.current, {
        center: fromCoords,
        zoom:   16,
        zoomControl:       false,
        attributionControl: false,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        { subdomains: "abcd", maxZoom: 20 }
      ).addTo(map);

      mapRef.current = map;

      // ── Fetch route + draw ──────────────────────────────
      fetch(
        `https://router.project-osrm.org/route/v1/driving/` +
        `${fromCoords[1]},${fromCoords[0]};${toCoords[1]},${toCoords[0]}` +
        `?overview=full&geometries=geojson`
      )
        .then(r => r.json())
        .then(data => {
          if (data.code !== "Ok" || !mapRef.current) return;
          const coords  = data.routes[0].geometry.coordinates;
          const latLngs = coords.map((c: number[]) => [c[1], c[0]]);
          const total   = coords.length;

          // Blue base route
          const baseLine = L.polyline(latLngs, {
            color: cfg.color, weight: 7, opacity: 1,
            lineJoin: "round", lineCap: "round",
          }).addTo(map);
          layersRef.current.push(baseLine);

          // Traffic simulation — yellow in middle 30%, red in last 15%
          const yellowStart = Math.floor(total * 0.35);
          const yellowEnd   = Math.floor(total * 0.55);
          const redStart    = Math.floor(total * 0.72);
          const redEnd      = Math.floor(total * 0.82);

          const yellowCoords = coords.slice(yellowStart, yellowEnd).map((c: number[]) => [c[1], c[0]]);
          const redCoords    = coords.slice(redStart,    redEnd   ).map((c: number[]) => [c[1], c[0]]);

          if (yellowCoords.length > 1) {
            layersRef.current.push(
              L.polyline(yellowCoords, { color: "#F9A825", weight: 8, opacity: 0.9 }).addTo(map)
            );
          }
          if (redCoords.length > 1) {
            layersRef.current.push(
              L.polyline(redCoords, { color: "#EA4335", weight: 8, opacity: 0.9 }).addTo(map)
            );
          }

          // Destination pin
          const destIcon = L.divIcon({
            className: "",
            html: `<div style="
              display:flex;flex-direction:column;align-items:center;
            ">
              <div style="
                background:#EA4335;color:white;
                font-size:11px;font-weight:700;
                padding:4px 10px;border-radius:20px;
                border:2px solid white;
                box-shadow:0 2px 8px rgba(0,0,0,0.3);
                white-space:nowrap;
              ">📍 ${to}</div>
              <div style="width:2px;height:10px;background:#EA4335;"></div>
            </div>`,
            iconAnchor: [40, 0],
          });
          layersRef.current.push(
            L.marker(toCoords, { icon: destIcon }).addTo(map)
          );

          // Fit route then zoom to start
          map.fitBounds(baseLine.getBounds(), { padding: [80, 80] });
          setTimeout(() => {
            if (mapRef.current) mapRef.current.setView(fromCoords, 17, { animate: true });
          }, 1800);
        })
        .catch(console.error);

      // ── Vehicle icon at start ───────────────────────────
      const vehicleIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:40px;height:40px;
          background:${cfg.color};
          border:3px solid white;
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-size:20px;
          box-shadow:0 0 0 6px ${cfg.color}40,0 3px 10px rgba(0,0,0,0.3);
        ">${cfg.icon}</div>`,
        iconAnchor: [20, 20],
      });
      locationRef.current = L.marker(fromCoords, { icon: vehicleIcon }).addTo(map);
      setLocationReady(true);

      // ── Live GPS tracking ───────────────────────────────
      if (navigator.geolocation) {
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];

            import("leaflet").then((L2) => {
              if (!mapRef.current) return;

              // Update vehicle marker position
              if (locationRef.current) {
                locationRef.current.setLatLng(newPos);
              } else {
                const icon = L2.divIcon({
                  className: "",
                  html: `<div style="
                    width:40px;height:40px;
                    background:${cfg.color};
                    border:3px solid white;border-radius:50%;
                    display:flex;align-items:center;justify-content:center;
                    font-size:20px;
                    box-shadow:0 0 0 6px ${cfg.color}40,0 3px 10px rgba(0,0,0,0.3);
                  ">${cfg.icon}</div>`,
                  iconAnchor: [20, 20],
                });
                locationRef.current = L2.marker(newPos, { icon }).addTo(mapRef.current);
              }

              // Keep map centered on vehicle
              mapRef.current.setView(newPos, 17, { animate: true, duration: 1 });

              // Auto advance steps
              setCurrentStepIdx(prev =>
                prev < steps.length - 1 ? prev + 1 : prev
              );
            });
          },
          (err) => console.warn("GPS error:", err),
          { enableHighAccuracy: true, maximumAge: 2000, timeout: 8000 }
        );
        watchIdRef.current = id;
      }
    });

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        initedRef.current = false;
      }
    };
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3000,
      fontFamily: "'Segoe UI', sans-serif",
      display: "flex", flexDirection: "column",
      background: "#000",
    }}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {/* ── Full screen map ───────────────────────────────── */}
      <div
        ref={mapContainerRef}
        style={{ position: "absolute", inset: 0, zIndex: 0 }}
      />

      {/* ── TOP: Turn instruction panel ───────────────────── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        zIndex: 10,
        background: cfg.color,
        padding: "44px 20px 16px",
        display: "flex", alignItems: "center", gap: "14px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
      }}>
        {/* Back button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: "12px", left: "16px",
            background: "rgba(0,0,0,0.25)", border: "none",
            color: "white", borderRadius: "50%",
            width: "36px", height: "36px",
            cursor: "pointer", fontSize: "18px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "700",
          }}>
          ←
        </button>

        {/* Mode icon */}
        <div style={{
          width: "54px", height: "54px",
          background: "rgba(0,0,0,0.2)",
          borderRadius: "14px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "28px", flexShrink: 0,
        }}>
          {currentStep ? getDirectionIcon(currentStep.direction) : "↑"}
        </div>

        {/* Instruction text */}
        <div style={{ flex: 1 }}>
          <div style={{
            color: "white", fontWeight: "700",
            fontSize: currentStep?.instruction?.length > 35 ? "13px" : "16px",
            lineHeight: "1.3", marginBottom: "4px",
          }}>
            {currentStep?.instruction || `Navigate to ${to}`}
          </div>
          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px" }}>
            {currentStep?.distance}
            {currentStep?.distance && currentStep?.duration ? " · " : ""}
            {currentStep?.duration}
          </div>
        </div>

        {/* Vehicle label top-right */}
        <div style={{
          position: "absolute", top: "12px", right: "16px",
          background: "rgba(0,0,0,0.2)",
          borderRadius: "20px", padding: "3px 10px",
          display: "flex", alignItems: "center", gap: "4px",
        }}>
          <span style={{ fontSize: "14px" }}>{cfg.icon}</span>
          <span style={{ color: "white", fontSize: "11px", fontWeight: "600" }}>{cfg.label}</span>
        </div>
      </div>

      {/* ── Step progress bar ─────────────────────────────── */}
      {steps.length > 1 && (
        <div style={{
          position: "absolute", top: "130px", left: "16px", right: "16px",
          zIndex: 10,
          display: "flex", gap: "4px",
        }}>
          {steps.slice(0, Math.min(steps.length, 10)).map((_, i) => (
            <div key={i} style={{
              flex: i === currentStepIdx ? 3 : 1,
              height: "4px",
              borderRadius: "2px",
              background: i < currentStepIdx
                ? "white"
                : i === currentStepIdx
                ? "white"
                : "rgba(255,255,255,0.3)",
              transition: "flex 0.3s, background 0.3s",
            }} />
          ))}
        </div>
      )}

      {/* ── Traffic legend ────────────────────────────────── */}
      <div style={{
        position: "absolute", top: "150px", right: "12px",
        zIndex: 10,
        display: "flex", flexDirection: "column", gap: "6px",
      }}>
        <div style={{
          background: "white", borderRadius: "8px",
          padding: "6px 10px", fontSize: "10px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
            <div style={{ width: "20px", height: "4px", background: "#1A73E8", borderRadius: "2px" }} />
            <span style={{ color: "#555" }}>Clear</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
            <div style={{ width: "20px", height: "4px", background: "#F9A825", borderRadius: "2px" }} />
            <span style={{ color: "#555" }}>Slow</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "20px", height: "4px", background: "#EA4335", borderRadius: "2px" }} />
            <span style={{ color: "#555" }}>Heavy</span>
          </div>
        </div>
      </div>

      {/* ── BOTTOM: ETA + controls ────────────────────────── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        zIndex: 10,
        background: "white",
        borderRadius: "20px 20px 0 0",
        padding: "16px 20px 24px",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.15)",
      }}>
        {/* Drag handle */}
        <div style={{ width: "40px", height: "4px", background: "#e0e0e0", borderRadius: "2px", margin: "0 auto 14px" }} />

        {/* ETA row */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: "14px",
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "28px", fontWeight: "700", color: "#1a1a1a" }}>
              {totalTime}
            </span>
            <span style={{ fontSize: "14px", color: "#888" }}>
              {totalDistance}
            </span>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            {/* Steps toggle */}
            <button
              onClick={() => setShowAllSteps(!showAllSteps)}
              style={{
                background: "#f5f5f5", border: "none",
                borderRadius: "10px", padding: "8px 14px",
                fontSize: "12px", fontWeight: "600",
                color: "#1a1a1a", cursor: "pointer",
              }}>
              {showAllSteps ? "Hide" : "Steps"}
            </button>

            {/* End navigation */}
            <button
              onClick={onClose}
              style={{
                background: "#EA4335", border: "none",
                borderRadius: "10px", padding: "8px 14px",
                fontSize: "12px", fontWeight: "700",
                color: "white", cursor: "pointer",
              }}>
              End
            </button>
          </div>
        </div>

        {/* Destination row */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          padding: "10px 12px",
          background: "#f8f9fa", borderRadius: "10px",
          marginBottom: showAllSteps ? "12px" : "0",
        }}>
          <span style={{ fontSize: "16px" }}>📍</span>
          <div>
            <div style={{ fontSize: "12px", color: "#888" }}>Destination</div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: "#1a1a1a" }}>{to}</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: "12px", color: "#888" }}>Step</div>
            <div style={{ fontSize: "13px", fontWeight: "600", color: cfg.color }}>
              {currentStepIdx + 1}/{steps.length}
            </div>
          </div>
        </div>

        {/* All steps list */}
        {showAllSteps && (
          <div style={{
            maxHeight: "220px", overflowY: "auto",
            borderTop: "1px solid #f0f0f0",
            paddingTop: "8px",
          }}>
            {steps.map((step, i) => (
              <div
                key={i}
                onClick={() => setCurrentStepIdx(i)}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "8px",
                  borderRadius: "10px",
                  background: i === currentStepIdx ? `${cfg.color}15` : "transparent",
                  cursor: "pointer",
                  marginBottom: "2px",
                  borderLeft: i === currentStepIdx ? `3px solid ${cfg.color}` : "3px solid transparent",
                }}>
                <div style={{
                  width: "32px", height: "32px",
                  background: i === currentStepIdx ? cfg.color : "#f0f0f0",
                  borderRadius: "8px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "16px", flexShrink: 0,
                  color: i === currentStepIdx ? "white" : "#555",
                }}>
                  {getDirectionIcon(step.direction)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: "13px", color: "#1a1a1a",
                    fontWeight: i === currentStepIdx ? "600" : "400",
                  }}>
                    {step.instruction}
                  </div>
                  <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
                    {step.distance} · {step.duration}
                  </div>
                </div>
                {i === currentStepIdx && (
                  <div style={{
                    width: "8px", height: "8px",
                    borderRadius: "50%", background: cfg.color,
                    flexShrink: 0,
                  }} />
                )}
              </div>
            ))}

            {/* Final destination row */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px" }}>
              <div style={{ width: "32px", height: "32px", background: "#EA4335", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>
                🏁
              </div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a" }}>
                Arrive at {to}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}