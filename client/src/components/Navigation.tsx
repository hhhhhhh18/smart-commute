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
  self_bike: { color: "#FF6D00", icon: "🏍️", label: "Bike"  },
  self_auto: { color: "#7B1FA2", icon: "🛺",  label: "Auto"  },
  self_car:  { color: "#1A73E8", icon: "🚗",  label: "Car"   },
  bus:       { color: "#1565C0", icon: "🚌",  label: "Bus"   },
  metro:     { color: "#E53935", icon: "🚇",  label: "Metro" },
  default:   { color: "#1A73E8", icon: "🚗",  label: "Drive" },
};

// SVG arrow definitions: path + rotation angle
const DIRECTION_ARROWS: Record<string, { path: string; rotate: number }> = {
  "straight":          { path: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z", rotate: 0   },
  "new name":          { path: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z", rotate: 0   },
  "depart":            { path: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z", rotate: 0   },
  "turn-right":        { path: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z", rotate: 90  },
  "turn-left":         { path: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z", rotate: -90 },
  "turn-slight-right": { path: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z", rotate: 45  },
  "turn-slight-left":  { path: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z", rotate: -45 },
  "turn-sharp-right":  { path: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z", rotate: 135 },
  "turn-sharp-left":   { path: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z", rotate: -135},
  "uturn-left":        { path: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z", rotate: 180 },
  "uturn-right":       { path: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z", rotate: 180 },
  "roundabout-left":   { path: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z", rotate: -90 },
  "roundabout-right":  { path: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z", rotate: 90  },
  "arrive":            { path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z", rotate: 0 },
  "default":           { path: "M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z", rotate: 0   },
};

function DirectionArrow({
  direction,
  size = 28,
  color = "white",
}: {
  direction: string;
  size?: number;
  color?: string;
}) {
  const key   = direction?.toLowerCase() || "default";
  const arrow = DIRECTION_ARROWS[key] || DIRECTION_ARROWS["default"];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      style={{ transform: `rotate(${arrow.rotate}deg)`, transition: "transform 0.35s ease", display: "block", flexShrink: 0 }}
    >
      <path d={arrow.path} />
    </svg>
  );
}

// Haversine distance in metres between two [lat,lon] points
function distanceM(a: [number, number], b: [number, number]): number {
  const R    = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) *
    Math.cos((b[0] * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Bearing in degrees (0 = North, 90 = East) from point a to point b
function bearingDeg(a: [number, number], b: [number, number]): number {
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Build the SVG HTML string for the directional arrow marker on the map
function buildArrowMarkerHtml(color: string, bearing: number, vehicleIcon: string): string {
  return `
    <div style="
      position:relative;
      width:64px;height:64px;
      display:flex;align-items:center;justify-content:center;
    ">
      <!-- pulsing accuracy ring -->
      <div style="
        position:absolute;
        width:64px;height:64px;
        border-radius:50%;
        background:${color}28;
        border:2px solid ${color}55;
        animation:navPulse 2s ease-in-out infinite;
      "></div>

      <!-- vehicle icon circle (static, always upright) -->
      <div style="
        position:absolute;
        width:36px;height:36px;
        border-radius:50%;
        background:white;
        border:2.5px solid ${color};
        box-shadow:0 2px 8px rgba(0,0,0,0.22);
        display:flex;align-items:center;justify-content:center;
        font-size:18px;
        z-index:1;
      ">${vehicleIcon}</div>

      <!-- directional arrow — rotates with bearing, sits on top -->
      <svg
        width="64" height="64"
        viewBox="0 0 64 64"
        style="position:absolute;top:0;left:0;transform:rotate(${bearing}deg);transition:transform 0.4s ease;z-index:2;pointer-events:none;"
      >
        <polygon
          points="32,4 40,28 32,23 24,28"
          fill="${color}"
          stroke="white"
          stroke-width="2"
          stroke-linejoin="round"
        />
      </svg>
    </div>
  `;
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
  const routeCoordsRef  = useRef<[number, number][]>([]);
  const prevPosRef      = useRef<[number, number] | null>(null);  // for bearing calc
  const bearingRef      = useRef<number>(bearingDeg(fromCoords, toCoords)); // initial bearing toward dest
  const [mapBearing, setMapBearing] = useState(0); // tracks map rotation for compass button

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [showAllSteps,   setShowAllSteps]    = useState(false);

  const cfg         = MODE_CONFIG[mode] || MODE_CONFIG.default;
  const currentStep = steps[currentStepIdx] || steps[0];

  // ── Build map once ────────────────────────────────────────────────────────
  useEffect(() => {
    if (initedRef.current || !mapContainerRef.current) return;
    initedRef.current = true;

    // Load leaflet-rotate plugin (enables two-finger rotate on touch devices)
    const loadRotatePlugin = (): Promise<void> => new Promise((resolve) => {
      if ((window as any)._leafletRotateLoaded) { resolve(); return; }
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet-rotate@0.2.8/dist/leaflet-rotate-src.css";
      document.head.appendChild(css);
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet-rotate@0.2.8/dist/leaflet-rotate-src.js";
      script.onload = () => { (window as any)._leafletRotateLoaded = true; resolve(); };
      script.onerror = () => resolve(); // graceful fallback if CDN fails
      document.head.appendChild(script);
    });

    import("leaflet").then(async (L) => {
      await loadRotatePlugin();
      if (!mapContainerRef.current || mapRef.current) return;
      const el = mapContainerRef.current as any;
      if (el._leaflet_id) el._leaflet_id = null;

      const mapOptions = {
        center: fromCoords, zoom: 15,
        zoomControl: false, attributionControl: false,
        rotate: true,           // leaflet-rotate: enable rotation
        touchRotate: true,      // leaflet-rotate: two-finger twist gesture
        rotateControl: false,   // we add our own compass button
        bearing: 0,
      } as any; // cast needed: leaflet-rotate adds options not in @types/leaflet
      const map = L.map(mapContainerRef.current, mapOptions);

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        { subdomains: "abcd", maxZoom: 20 }
      ).addTo(map);
      mapRef.current = map;

      // Track map bearing so compass button appears when map is rotated
      map.on("rotate", () => {
        const b = map.getBearing ? Math.round(map.getBearing()) : 0;
        setMapBearing(b);
      });

      // Inject pulse keyframe once
      if (!document.getElementById("nav-arrow-style")) {
        const style = document.createElement("style");
        style.id = "nav-arrow-style";
        style.textContent = `
          @keyframes navPulse {
            0%   { transform: scale(1);   opacity: 0.8; }
            50%  { transform: scale(1.5); opacity: 0.3; }
            100% { transform: scale(1);   opacity: 0.8; }
          }
        `;
        document.head.appendChild(style);
      }

      // ── Fetch & draw route ──────────────────────────────────────────────
      fetch(
        `https://router.project-osrm.org/route/v1/driving/` +
        `${fromCoords[1]},${fromCoords[0]};${toCoords[1]},${toCoords[0]}` +
        `?overview=full&geometries=geojson`
      )
        .then(r => r.json())
        .then(data => {
          if (data.code !== "Ok" || !mapRef.current) return;
          const coords  = data.routes[0].geometry.coordinates;
          const latLngs = coords.map((c: number[]) => [c[1], c[0]] as [number, number]);

          routeCoordsRef.current = latLngs;

          // Refine initial bearing using actual first route segment (more accurate than straight-line)
          if (latLngs.length >= 2) {
            // Use the 5th point or last available to get a stable initial direction
            const sampleIdx = Math.min(4, latLngs.length - 1);
            const refinedBearing = bearingDeg(latLngs[0], latLngs[sampleIdx]);
            bearingRef.current = refinedBearing;
            // Update the already-placed arrow to point along the actual road
            if (locationRef.current?._icon) {
              const svg = locationRef.current._icon.querySelector("svg");
              if (svg) svg.style.transform = `rotate(${refinedBearing}deg)`;
            }
          }

          // FROM label above start marker
          const fromLabelIcon = L.divIcon({
            className: "",
            html: `<div style="background:#34A853;color:white;font-size:10px;font-weight:700;padding:3px 8px;border-radius:12px;border:1.5px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.25);white-space:nowrap;">🚦 ${from}</div>`,
            iconAnchor: [40, 28],
          });
          layersRef.current.push(L.marker(fromCoords, { icon: fromLabelIcon }).addTo(map));

          const baseLine = L.polyline(latLngs, {
            color: cfg.color, weight: 7, opacity: 1,
            lineJoin: "round", lineCap: "round",
          }).addTo(map);
          layersRef.current.push(baseLine);

          // Traffic simulation overlays
          const total = coords.length;
          const yS = Math.floor(total * 0.35), yE = Math.floor(total * 0.55);
          const rS = Math.floor(total * 0.72), rE = Math.floor(total * 0.82);
          const yellowLL = coords.slice(yS, yE).map((c: number[]) => [c[1], c[0]]);
          const redLL    = coords.slice(rS, rE).map((c: number[]) => [c[1], c[0]]);
          if (yellowLL.length > 1)
            layersRef.current.push(L.polyline(yellowLL, { color: "#F9A825", weight: 8, opacity: 0.9 }).addTo(map));
          if (redLL.length > 1)
            layersRef.current.push(L.polyline(redLL, { color: "#EA4335", weight: 8, opacity: 0.9 }).addTo(map));

          const destIcon = L.divIcon({
            className: "",
            html: `<div style="display:flex;flex-direction:column;align-items:center;">
              <div style="background:#EA4335;color:white;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap;">📍 ${to}</div>
              <div style="width:2px;height:10px;background:#EA4335;"></div>
            </div>`,
            iconAnchor: [40, 0],
          });
          layersRef.current.push(L.marker(toCoords, { icon: destIcon }).addTo(map));

          map.fitBounds(baseLine.getBounds(), { padding: [80, 80] });
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.setView(fromCoords, 16, { animate: true, duration: 1.2 });
            }
          }, 1800);
        })
        .catch(console.error);

      // Directional arrow marker at route start — points toward destination
      const initialBearing = bearingRef.current;
      const arrowIcon = L.divIcon({
        className: "",
        html: buildArrowMarkerHtml(cfg.color, initialBearing, cfg.icon),
        iconAnchor: [32, 32],
        iconSize: [64, 64],
      });
      locationRef.current = L.marker(fromCoords, { icon: arrowIcon }).addTo(map);

      // ── GPS tracking ─────────────────────────────────────────────────────
      if (navigator.geolocation) {
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];

            // Calculate new bearing from movement or from GPS heading
            let newBearing = bearingRef.current;
            if (pos.coords.heading != null && !isNaN(pos.coords.heading)) {
              // Use GPS heading if available (most accurate)
              newBearing = pos.coords.heading;
            } else if (prevPosRef.current) {
              // Fallback: compute bearing from previous → current position
              const moved = distanceM(prevPosRef.current, newPos);
              if (moved > 5) { // only update if moved >5m to avoid jitter
                newBearing = bearingDeg(prevPosRef.current, newPos);
              }
            }
            bearingRef.current = newBearing;
            prevPosRef.current = newPos;

            // Update marker position AND re-render arrow with new bearing
            if (locationRef.current) {
              locationRef.current.setLatLng(newPos);
              // Update the icon HTML to rotate to new bearing
              const L2 = (window as any).L || locationRef.current._map?._leaflet_events;
              if (locationRef.current._icon) {
                // Directly update the SVG transform inside the existing icon
                const svg = locationRef.current._icon.querySelector("svg");
                if (svg) {
                  svg.style.transform = `rotate(${newBearing}deg)`;
                }
              }
            }

            if (routeCoordsRef.current.length > 0 && steps.length > 1) {
              setCurrentStepIdx(prev => {
                if (prev >= steps.length - 1) return prev;
                const nextStepFraction = (prev + 1) / steps.length;
                const nextWaypointIdx  = Math.floor(nextStepFraction * routeCoordsRef.current.length);
                const nextWaypoint     = routeCoordsRef.current[Math.min(nextWaypointIdx, routeCoordsRef.current.length - 1)];
                const dist = distanceM(newPos, nextWaypoint);
                return dist < 80 ? prev + 1 : prev;
              });
            }
          },
          (err) => console.warn("GPS error:", err),
          { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
        );
        watchIdRef.current = id;
      }
    });

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        initedRef.current = false;
      }
    };
  }, []);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:3000, fontFamily:"'Segoe UI',sans-serif", display:"flex", flexDirection:"column", background:"#000" }}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      {/* Full-screen map */}
      <div ref={mapContainerRef} style={{ position:"absolute", inset:0, zIndex:0 }} />

      {/* TOP: Turn instruction */}
      <div style={{ position:"absolute", top:0, left:0, right:0, zIndex:10, background:cfg.color, padding:"44px 20px 16px", display:"flex", alignItems:"center", gap:"14px", boxShadow:"0 4px 20px rgba(0,0,0,0.3)" }}>
        <button onClick={onClose} style={{ position:"absolute", top:"12px", left:"16px", background:"rgba(0,0,0,0.25)", border:"none", color:"white", borderRadius:"50%", width:"36px", height:"36px", cursor:"pointer", fontSize:"18px", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:"700" }}>←</button>

        {/* Direction arrow box — SVG arrow, not emoji */}
        <div style={{ width:"54px", height:"54px", background:"rgba(0,0,0,0.2)", borderRadius:"14px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <DirectionArrow direction={currentStep?.direction || "default"} size={32} color="white" />
        </div>

        <div style={{ flex:1 }}>
          <div style={{ color:"white", fontWeight:"700", fontSize:currentStep?.instruction?.length > 35 ? "13px" : "16px", lineHeight:"1.3", marginBottom:"4px" }}>
            {currentStep?.instruction || `Navigate to ${to}`}
          </div>
          <div style={{ color:"rgba(255,255,255,0.8)", fontSize:"13px" }}>
            {currentStep?.distance}{currentStep?.distance && currentStep?.duration ? " · " : ""}{currentStep?.duration}
          </div>
        </div>

        <div style={{ position:"absolute", top:"12px", right:"16px", background:"rgba(0,0,0,0.2)", borderRadius:"20px", padding:"3px 10px", display:"flex", alignItems:"center", gap:"4px" }}>
          <span style={{ fontSize:"14px" }}>{cfg.icon}</span>
          <span style={{ color:"white", fontSize:"11px", fontWeight:"600" }}>{cfg.label}</span>
        </div>
      </div>

      {/* Step progress bar */}
      {steps.length > 1 && (
        <div style={{ position:"absolute", top:"130px", left:"16px", right:"16px", zIndex:10, display:"flex", gap:"4px" }}>
          {steps.slice(0, Math.min(steps.length, 10)).map((_, i) => (
            <div key={i} style={{ flex: i === currentStepIdx ? 3 : 1, height:"4px", borderRadius:"2px", background: i <= currentStepIdx ? "white" : "rgba(255,255,255,0.3)", transition:"flex 0.3s, background 0.3s" }} />
          ))}
        </div>
      )}

      {/* Traffic legend + compass reset */}
      <div style={{ position:"absolute", top:"150px", right:"12px", zIndex:10, display:"flex", flexDirection:"column", gap:"6px" }}>
        <div style={{ background:"white", borderRadius:"8px", padding:"6px 10px", fontSize:"10px", boxShadow:"0 2px 8px rgba(0,0,0,0.2)" }}>
          {[["#1A73E8","Clear"],["#F9A825","Slow"],["#EA4335","Heavy"]].map(([col,lbl]) => (
            <div key={lbl} style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom: lbl === "Heavy" ? 0 : "3px" }}>
              <div style={{ width:"20px", height:"4px", background:col, borderRadius:"2px" }} />
              <span style={{ color:"#555" }}>{lbl}</span>
            </div>
          ))}
        </div>
        {/* Compass — rotates to show current map bearing; tap to snap back to north */}
        {mapBearing !== 0 && (
          <button
            onClick={() => { if (mapRef.current?.setBearing) { mapRef.current.setBearing(0); setMapBearing(0); } }}
            title="Reset to North"
            style={{ background:"white", border:"none", borderRadius:"8px", width:"36px", height:"36px", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 8px rgba(0,0,0,0.2)", cursor:"pointer", padding:0 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" style={{ transform: `rotate(${-mapBearing}deg)`, transition:"transform 0.3s" }}>
              <polygon points="12,2 14.5,10 12,8.5 9.5,10" fill="#EA4335"/>
              <polygon points="12,22 14.5,14 12,15.5 9.5,14" fill="#888"/>
              <circle cx="12" cy="12" r="2" fill="#333"/>
            </svg>
          </button>
        )}
      </div>

      {/* BOTTOM: ETA + controls */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:10, background:"white", borderRadius:"20px 20px 0 0", padding:"16px 20px 24px", boxShadow:"0 -4px 24px rgba(0,0,0,0.15)" }}>
        <div style={{ width:"40px", height:"4px", background:"#e0e0e0", borderRadius:"2px", margin:"0 auto 14px" }} />

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px" }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:"8px" }}>
            <span style={{ fontSize:"28px", fontWeight:"700", color:"#1a1a1a" }}>{totalTime}</span>
            <span style={{ fontSize:"14px", color:"#888" }}>{totalDistance}</span>
          </div>
          <div style={{ display:"flex", gap:"8px" }}>
            <button onClick={() => setShowAllSteps(!showAllSteps)} style={{ background:"#f5f5f5", border:"none", borderRadius:"10px", padding:"8px 14px", fontSize:"12px", fontWeight:"600", color:"#1a1a1a", cursor:"pointer" }}>
              {showAllSteps ? "Hide" : "Steps"}
            </button>
            <button onClick={onClose} style={{ background:"#EA4335", border:"none", borderRadius:"10px", padding:"8px 14px", fontSize:"12px", fontWeight:"700", color:"white", cursor:"pointer" }}>End</button>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 12px", background:"#f8f9fa", borderRadius:"10px", marginBottom: showAllSteps ? "12px" : "0" }}>
          <span style={{ fontSize:"16px" }}>📍</span>
          <div>
            <div style={{ fontSize:"12px", color:"#888" }}>Destination</div>
            <div style={{ fontSize:"14px", fontWeight:"600", color:"#1a1a1a" }}>{to}</div>
          </div>
          <div style={{ marginLeft:"auto", textAlign:"right" }}>
            <div style={{ fontSize:"12px", color:"#888" }}>Step</div>
            <div style={{ fontSize:"13px", fontWeight:"600", color:cfg.color }}>{currentStepIdx + 1}/{steps.length}</div>
          </div>
        </div>

        {showAllSteps && (
          <div style={{ maxHeight:"220px", overflowY:"auto", borderTop:"1px solid #f0f0f0", paddingTop:"8px" }}>
            {steps.map((step, i) => (
              <div key={i} onClick={() => setCurrentStepIdx(i)}
                style={{ display:"flex", alignItems:"center", gap:"12px", padding:"8px", borderRadius:"10px", background: i === currentStepIdx ? `${cfg.color}15` : "transparent", cursor:"pointer", marginBottom:"2px", borderLeft: i === currentStepIdx ? `3px solid ${cfg.color}` : "3px solid transparent" }}>
                <div style={{ width:"32px", height:"32px", background: i === currentStepIdx ? cfg.color : "#f0f0f0", borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <DirectionArrow
                    direction={step.direction}
                    size={18}
                    color={i === currentStepIdx ? "white" : "#555"}
                  />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:"13px", color:"#1a1a1a", fontWeight: i === currentStepIdx ? "600" : "400" }}>{step.instruction}</div>
                  <div style={{ fontSize:"11px", color:"#888", marginTop:"2px" }}>{step.distance} · {step.duration}</div>
                </div>
                {i === currentStepIdx && <div style={{ width:"8px", height:"8px", borderRadius:"50%", background:cfg.color, flexShrink:0 }} />}
              </div>
            ))}
            <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"8px" }}>
              <div style={{ width:"32px", height:"32px", background:"#EA4335", borderRadius:"8px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"16px", flexShrink:0 }}>🏁</div>
              <div style={{ fontSize:"13px", fontWeight:"600", color:"#1a1a1a" }}>Arrive at {to}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}