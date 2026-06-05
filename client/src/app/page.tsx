
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navigation from "../components/Navigation";
import BusNavigation from "../components/BusNavigation";
import Metronavigation from "../components/Metronavigation";
import MetroTicket from "@/components/MetroTicket";
import RideTicket from "@/components/RideTicket";
const Map = dynamic(() => import("../components/Map"), { ssr: false });

const GOOGLE_MAPS_API_KEY = "AIzaSyBGoVkKQAahlPS461x_IlgnVdDWmADR7Is";

type TransportOption = {
  label: string; cost: number; time: number;
  emoji: string; mode: string; note: string;
};
type RouteData = {
  distance: string; time: string;
  distanceKm: number; durationMin: number;
  trafficLevel: "low" | "medium" | "high";
  trafficDuration: number;
  fromCoords: { lat: number; lon: number };
  toCoords:   { lat: number; lon: number };
  allRoutes: any[];
  options: Record<string, TransportOption>;
  recommendation: TransportOption;
  googleMapsUrls: Record<string, string>;
  metroInfo: any;
  busInfo: any;
};
interface RouteConfig {
  drawKey: number; activeMode: string;
  trafficLevel: "low" | "medium" | "high" | null;
  busStops: string[]; metroInfo: any; allRoutes: any[];
  fromCoords: [number, number] | null; toCoords: [number, number] | null;
}
interface Suggestion {
  display: string; sub: string; full: string;
  lat: number; lon: number; placeId: string; type: string;
}
interface RideTicketState { mode: "rapido" | "ola_uber"; }

const SUB_OPTIONS: Record<string, { id: string; label: string; icon: string; desc: string }[]> = {
  bike: [
    { id: "rapido",    label: "Rapido",    icon: "🏍️", desc: "Book a bike taxi" },
    { id: "self_bike", label: "Self Bike", icon: "🪖",  desc: "Directions on map" },
  ],
  car: [
    { id: "ola_uber",  label: "Ola / Uber",  icon: "🚗",  desc: "Book a cab" },
    { id: "self_car",  label: "Self Drive",  icon: "🗺️", desc: "Directions on map" },
  ],
};
const TRAFFIC_CONFIG = {
  low:    { color: "#34A853", bg: "#e8f5e9", label: "Low Traffic",      icon: "🟢" },
  medium: { color: "#F9A825", bg: "#fff8e1", label: "Moderate Traffic", icon: "🟡" },
  high:   { color: "#EA4335", bg: "#fce8e6", label: "Heavy Traffic",    icon: "🔴" },
};
const EMPTY_CONFIG: RouteConfig = {
  drawKey: 0, activeMode: "default", trafficLevel: null,
  busStops: [], metroInfo: null, allRoutes: [], fromCoords: null, toCoords: null,
};
const selfModes = ["self_bike", "self_car", "metro"];
const LS_KEY = "locationPermission";

let _gmPromise: Promise<void> | null = null;
function loadGoogleMapsScript(): Promise<void> {
  if (_gmPromise) return _gmPromise;
  _gmPromise = new Promise<void>((resolve) => {
    if (typeof window !== "undefined" && (window as any).google?.maps) { resolve(); return; }
    (window as any).__gmInit = () => resolve();
    const existing = document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`);
    if (existing) { existing.addEventListener("load", () => resolve()); return; }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&loading=async&callback=__gmInit`;
    s.async = true; s.defer = true;
    document.head.appendChild(s);
  });
  return _gmPromise;
}

async function fetchSuggestions(input: string): Promise<Suggestion[]> {
  if (!input || input.length < 2) return [];
  try {
    await loadGoogleMapsScript();
    const google = (window as any).google;
    if (!google?.maps) return [];
    const { AutocompleteSuggestion, AutocompleteSessionToken } =
      await google.maps.importLibrary("places") as any;
    const token = new AutocompleteSessionToken();
    const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input, sessionToken: token, includedRegionCodes: ["in"],
      locationBias: { center: { lat: 17.3850, lng: 78.4867 }, radius: 40000 },
      language: "en",
    });
    if (!suggestions?.length) return [];
    const resolved: Suggestion[] = [];
    const promises = suggestions.slice(0, 5).map(async (s: any) => {
      try {
        const pred  = s.placePrediction;
        const place = pred.toPlace();
        await place.fetchFields({ fields: ["location", "types", "displayName", "formattedAddress"] });
        const loc = place.location;
        if (!loc) return null;
        const lat = loc.lat(); const lon = loc.lng();
        if (lat < 17.10 || lat > 17.70 || lon < 78.10 || lon > 78.80) return null;
        const mainText = pred.mainText?.toString() || place.displayName || "";
        const secRaw   = pred.secondaryText?.toString() || place.formattedAddress || "";
        const sub = secRaw.replace(/,?\s*India\s*$/, "").replace(/,?\s*Telangana\s*$/, "").trim();
        return { display: mainText, sub, full: pred.text?.toString() || mainText, lat, lon, placeId: pred.placeId || "", type: (place.types || [])[0] || "" } as Suggestion;
      } catch { return null; }
    });
    const results = await Promise.all(promises);
    results.forEach(r => r && resolved.push(r));
    return resolved;
  } catch { return []; }
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    await loadGoogleMapsScript();
    const google = (window as any).google;
    const { Geocoder } = await google.maps.importLibrary("geocoding") as any;
    const geocoder = new Geocoder();
    const { results } = await geocoder.geocode({ location: { lat, lng: lon } });
    if (!results?.[0]) throw new Error("no result");
    const c: any[] = results[0].address_components;
    return (
      c.find((x: any) => x.types.includes("sublocality_level_1"))?.long_name ||
      c.find((x: any) => x.types.includes("sublocality_level_2"))?.long_name ||
      c.find((x: any) => x.types.includes("sublocality"))?.long_name         ||
      c.find((x: any) => x.types.includes("neighborhood"))?.long_name        ||
      c.find((x: any) => x.types.includes("locality"))?.long_name            ||
      results[0].formatted_address.split(",")[0] || "My Location"
    );
  } catch {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&zoom=16`, { headers: { "Accept-Language": "en" } });
      const d = await r.json();
      const a = d.address || {};
      return a.neighbourhood || a.suburb || a.city_district || a.road || "My Location";
    } catch { return "My Location"; }
  }
}

function placeIcon(type: string): string {
  if (!type) return "📍";
  const t = type.toLowerCase();
  if (["transit_station","subway_station","train_station","light_rail_station"].some(x => t.includes(x))) return "🚇";
  if (["bus_station","bus_stop"].some(x => t.includes(x))) return "🚌";
  if (["hospital","doctor","pharmacy","clinic","health"].some(x => t.includes(x))) return "🏥";
  if (["school","university","college","library"].some(x => t.includes(x))) return "🏫";
  if (["mall","supermarket","grocery","store","shopping"].some(x => t.includes(x))) return "🛒";
  if (["restaurant","cafe","bakery","food","meal"].some(x => t.includes(x))) return "🍽️";
  if (["park","garden","natural"].some(x => t.includes(x))) return "🌳";
  if (["lodging","hotel"].some(x => t.includes(x))) return "🏨";
  if (["bank","atm","finance"].some(x => t.includes(x))) return "🏦";
  if (["worship","temple","mosque","church","mandir","masjid"].some(x => t.includes(x))) return "🛕";
  if (["neighborhood","sublocality","locality","suburb"].some(x => t.includes(x))) return "🏘️";
  if (["route","street","road","address"].some(x => t.includes(x))) return "🛣️";
  if (t.includes("airport")) return "✈️";
  if (t.includes("gas")) return "⛽";
  return "📍";
}

function useAutocomplete(value: string) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<any>(null);
  useEffect(() => {
    if (value.length < 2) { setSuggestions([]); setIsLoading(false); return; }
    clearTimeout(timerRef.current);
    setIsLoading(true);
    timerRef.current = setTimeout(async () => {
      try   { setSuggestions(await fetchSuggestions(value)); }
      catch { setSuggestions([]); }
      finally { setIsLoading(false); }
    }, 250);
    return () => clearTimeout(timerRef.current);
  }, [value]);
  return { suggestions, isLoading, clear: () => { setSuggestions([]); setIsLoading(false); } };
}

async function fetchNavigationSteps(from: [number, number], to: [number, number]): Promise<any[]> {
  const res  = await fetch(`https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true`);
  const data = await res.json();
  if (data.code !== "Ok") return [];
  return (data.routes[0]?.legs[0]?.steps || []).map((s: any) => ({
    instruction: s.maneuver?.instruction || s.name || "Continue",
    distance:    s.distance < 1000 ? `${Math.round(s.distance)} m` : `${(s.distance/1000).toFixed(1)} km`,
    duration:    s.duration < 60 ? `${Math.round(s.duration)} sec` : `${Math.round(s.duration/60)} min`,
    direction:   s.maneuver?.type ? (s.maneuver.modifier ? `${s.maneuver.type}-${s.maneuver.modifier}`.replace(/ /g,"-") : s.maneuver.type) : "straight",
  }));
}

function SuggestionDropdown({ suggestions, isLoading, onSelect, onClose }: {
  suggestions: Suggestion[]; isLoading: boolean;
  onSelect: (s: Suggestion) => void; onClose: () => void;
}) {
  const [hovered, setHovered] = useState<number>(-1);
  if (isLoading && suggestions.length === 0) {
    return (
      <div style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:9999, marginTop:"4px", background:"#fff", border:"1px solid #e0e0e0", borderRadius:"12px", boxShadow:"0 6px 20px rgba(0,0,0,0.14)", padding:"12px 14px", fontSize:"13px", color:"#999", display:"flex", alignItems:"center", gap:"8px" }}>
        <span style={{ animation:"spin 0.8s linear infinite", display:"inline-block" }}>🔄</span>Searching…
      </div>
    );
  }
  if (suggestions.length === 0) return null;
  return (
    <div onPointerDown={(e) => e.preventDefault()} style={{ position:"absolute", top:"100%", left:0, right:0, zIndex:9999, marginTop:"4px", background:"#fff", border:"1px solid #e0e0e0", borderRadius:"12px", boxShadow:"0 6px 20px rgba(0,0,0,0.14)", overflow:"hidden", maxHeight:"260px", overflowY:"auto" }}>
      {suggestions.map((s, i) => (
        <div key={s.placeId || `${s.lat}-${i}`} onClick={() => { onSelect(s); onClose(); }}
          onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(-1)}
          style={{ padding:"11px 14px", cursor:"pointer", display:"flex", alignItems:"center", gap:"10px", borderBottom: i < suggestions.length - 1 ? "1px solid #f0f0f0" : "none", background: hovered === i ? "#f0f4ff" : "#fff" }}>
          <span style={{ fontSize:"16px", flexShrink:0, minWidth:"22px", textAlign:"center" }}>{placeIcon(s.type)}</span>
          <div style={{ minWidth:0, flex:1 }}>
            <div style={{ fontSize:"13px", fontWeight:"600", color:"#1a1a1a", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.display}</div>
            {s.sub && <div style={{ fontSize:"11px", color:"#888", marginTop:"1px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.sub}</div>}
          </div>
        </div>
      ))}
      <div style={{ padding:"5px 14px 6px", background:"#fafafa", borderTop:"1px solid #f0f0f0", display:"flex", justifyContent:"flex-end", position:"sticky", bottom:0 }}>
        <img src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3_hdpi.png" alt="Powered by Google" style={{ height:"13px" }} />
      </div>
    </div>
  );
}

function LocationPrompt({ onAllow, onAllowOnce, onDeny }: { onAllow: () => void; onAllowOnce: () => void; onDeny: () => void; }) {
  const [uiState, setUiState] = useState<"ask" | "loading" | "blocked">("ask");
  useEffect(() => {
    if (!navigator.permissions) return;
    navigator.permissions.query({ name: "geolocation" }).then((r) => { if (r.state === "denied") setUiState("blocked"); }).catch(() => {});
  }, []);
  const handleAllow = async (permanent: boolean) => {
    if (navigator.permissions) {
      try { const r = await navigator.permissions.query({ name: "geolocation" }); if (r.state === "denied") { setUiState("blocked"); return; } } catch {}
    }
    setUiState("loading");
    if (permanent) onAllow(); else onAllowOnce();
  };
  if (uiState === "blocked") {
    const ua = navigator.userAgent;
    const steps = ua.includes("Firefox")
      ? ["Click the 🔒 lock icon in the address bar", "Click the ✕ next to Location → Blocked", "Reload the page and click Allow"]
      : ua.includes("Edg")
      ? ["Click the 🔒 lock icon in the address bar", "Find Location → change to Allow", "Reload the page"]
      : ["Click the 🔒 lock icon in the address bar", "Find Location → change from Blocked to Allow", "Reload the page and click Allow"];
    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:3000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", fontFamily:"'Segoe UI',sans-serif" }}>
        <div style={{ background:"#fff", borderRadius:"20px", padding:"28px 24px", maxWidth:"360px", width:"100%", textAlign:"center", boxShadow:"0 8px 32px rgba(0,0,0,0.2)" }}>
          <div style={{ fontSize:"44px", marginBottom:"10px" }}>🔒</div>
          <div style={{ fontSize:"17px", fontWeight:"700", color:"#1a1a1a", marginBottom:"6px" }}>Location Blocked</div>
          <div style={{ fontSize:"13px", color:"#666", lineHeight:"1.6", marginBottom:"18px" }}>Your browser has blocked location access. To fix this:</div>
          <div style={{ background:"#f8f9fa", borderRadius:"12px", padding:"14px 16px", marginBottom:"20px", textAlign:"left" }}>
            {steps.map((step, i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:"10px", marginBottom: i < steps.length - 1 ? "10px" : 0 }}>
                <div style={{ width:"22px", height:"22px", borderRadius:"50%", background:"#1565C0", color:"white", fontSize:"11px", fontWeight:"700", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:"1px" }}>{i + 1}</div>
                <div style={{ fontSize:"13px", color:"#333", lineHeight:"1.5" }}>{step}</div>
              </div>
            ))}
          </div>
          <button onClick={() => { localStorage.removeItem(LS_KEY); window.location.reload(); }} style={{ width:"100%", padding:"13px", background:"#1565C0", color:"white", border:"none", borderRadius:"12px", fontSize:"15px", fontWeight:"700", cursor:"pointer", marginBottom:"10px" }}>🔄 Reload Page</button>
          <button onClick={onDeny} style={{ width:"100%", padding:"12px", background:"#f5f5f5", color:"#555", border:"none", borderRadius:"12px", fontSize:"14px", cursor:"pointer" }}>Continue without location</button>
        </div>
      </div>
    );
  }
  if (uiState === "loading") {
    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:3000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", fontFamily:"'Segoe UI',sans-serif" }}>
        <div style={{ background:"#fff", borderRadius:"20px", padding:"28px 24px", maxWidth:"340px", width:"100%", textAlign:"center", boxShadow:"0 8px 32px rgba(0,0,0,0.2)" }}>
          <div style={{ fontSize:"48px", marginBottom:"12px" }}>📍</div>
          <div style={{ fontSize:"18px", fontWeight:"700", color:"#1a1a1a", marginBottom:"8px" }}>Getting your location…</div>
          <div style={{ fontSize:"13px", color:"#888" }}>Please allow location access in the browser popup</div>
          <div style={{ marginTop:"20px", display:"flex", justifyContent:"center" }}>
            <div style={{ width:"32px", height:"32px", border:"3px solid #e0e0e0", borderTop:"3px solid #1565C0", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
          </div>
          <button onClick={onDeny} style={{ marginTop:"20px", width:"100%", padding:"12px", background:"#f5f5f5", color:"#555", border:"none", borderRadius:"12px", fontSize:"14px", cursor:"pointer" }}>Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:3000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", fontFamily:"'Segoe UI',sans-serif" }}>
      <div style={{ background:"#fff", borderRadius:"20px", padding:"28px 24px", maxWidth:"340px", width:"100%", textAlign:"center", boxShadow:"0 8px 32px rgba(0,0,0,0.2)" }}>
        <div style={{ fontSize:"48px", marginBottom:"12px" }}>📍</div>
        <div style={{ fontSize:"18px", fontWeight:"700", color:"#1a1a1a", marginBottom:"8px" }}>Allow location access?</div>
        <div style={{ fontSize:"13px", color:"#666", lineHeight:"1.6", marginBottom:"24px" }}>Smart Commute uses your location to autofill your starting point and show accurate routes.</div>
        <button onClick={() => handleAllow(true)} style={{ width:"100%", padding:"13px", background:"#1565C0", color:"white", border:"none", borderRadius:"12px", fontSize:"15px", fontWeight:"700", cursor:"pointer", marginBottom:"10px" }}>✅ Allow</button>
        <button onClick={() => handleAllow(false)} style={{ width:"100%", padding:"12px", background:"#e3f2fd", color:"#1565C0", border:"1.5px solid #90caf9", borderRadius:"12px", fontSize:"14px", fontWeight:"600", cursor:"pointer", marginBottom:"10px" }}>🕐 Allow this time</button>
        <button onClick={onDeny} style={{ width:"100%", padding:"12px", background:"#f5f5f5", color:"#555", border:"none", borderRadius:"12px", fontSize:"14px", cursor:"pointer" }}>✕ Don't allow</button>
        <div style={{ fontSize:"11px", color:"#bbb", marginTop:"14px", lineHeight:"1.5" }}>"Allow" remembers your choice · "Allow this time" asks again next visit</div>
      </div>
    </div>
  );
}

// ── Pure splash UI, no hooks ────────────────────────────────────────────────
function SplashScreen() {
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      background:"linear-gradient(135deg,#0d1b3e 0%,#1565C0 60%,#0a2a6e 100%)",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      fontFamily:"'Segoe UI',sans-serif", overflow:"hidden",
    }}>
      <style>{`
        @keyframes splashBus  { 0%{transform:translateX(-90px);opacity:0} 15%{opacity:1} 85%{opacity:1} 100%{transform:translateX(90px);opacity:0} }
        @keyframes splashRing { 0%,100%{transform:scale(1);opacity:.12} 50%{transform:scale(1.2);opacity:.28} }
        @keyframes splashUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes splashDot  { 0%,80%,100%{opacity:.25} 40%{opacity:1} }
        @keyframes splashBar  { from{width:0%} to{width:100%} }
        .spl-ring{position:absolute;border-radius:50%;border:1.5px solid #64b5f6;}
        .spl-ring-1{width:240px;height:240px;animation:splashRing 2.4s ease-in-out infinite;}
        .spl-ring-2{width:360px;height:360px;animation:splashRing 2.4s ease-in-out infinite .6s;}
        .spl-ring-3{width:480px;height:480px;animation:splashRing 2.4s ease-in-out infinite 1.2s;}
        .spl-bus{position:absolute;bottom:96px;font-size:30px;animation:splashBus 2.2s ease-in-out infinite;filter:drop-shadow(0 2px 6px rgba(0,0,0,.5));}
        .spl-up{animation:splashUp .7s ease both;}
        .spl-dot{display:inline-block;animation:splashDot 1.4s infinite;}
        .spl-dot:nth-child(2){animation-delay:.2s}
        .spl-dot:nth-child(3){animation-delay:.4s}
        .spl-bar{height:3px;border-radius:3px;background:linear-gradient(to right,#64b5f6,#fff);animation:splashBar 4s linear forwards;}
      `}</style>

      {/* Rings */}
      <div className="spl-ring spl-ring-1" />
      <div className="spl-ring spl-ring-2" />
      <div className="spl-ring spl-ring-3" />

      {/* City skyline */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"88px",
        background:"linear-gradient(to top,#0a1628 55%,transparent)",
        display:"flex", alignItems:"flex-end", justifyContent:"center", gap:"5px", overflow:"hidden" }}>
        {[36,52,42,68,48,62,40,56,46,60,38,50].map((h,i) => (
          <div key={i} style={{ width:"20px", height:`${h}px`, flexShrink:0,
            background:i%3===0?"#1a3a6e":i%3===1?"#162d5a":"#1e3f7a",
            borderRadius:"3px 3px 0 0" }} />
        ))}
      </div>

      {/* Metro line */}
      <div style={{ position:"absolute", bottom:"90px", left:0, right:0, height:"3px",
        background:"linear-gradient(to right,transparent,#e53935 20%,#e53935 80%,transparent)", opacity:.55 }} />

      {/* Moving bus */}
      <div className="spl-bus">🚌</div>

      {/* Main branding */}
      <div className="spl-up" style={{ textAlign:"center", zIndex:1, padding:"0 28px" }}>
        <div style={{ fontSize:"62px", marginBottom:"10px", filter:"drop-shadow(0 4px 12px rgba(0,0,0,.4))" }}>🚗</div>
        <div style={{ fontSize:"30px", fontWeight:"800", color:"#fff", letterSpacing:"-0.5px", marginBottom:"6px" }}>
          Smart Commute
        </div>
        <div style={{ display:"inline-block", fontSize:"11px", fontWeight:"700",
          background:"rgba(255,255,255,.12)", color:"#90caf9",
          padding:"3px 12px", borderRadius:"999px", marginBottom:"14px",
          border:"1px solid rgba(255,255,255,.2)", letterSpacing:"1px", textTransform:"uppercase" }}>
          Hyderabad
        </div>
        <div style={{ fontSize:"15px", color:"rgba(255,255,255,.72)", fontWeight:"400", lineHeight:"1.5" }}>
          All Routes. One Destination.
        </div>

        {/* Mode pills */}
        <div style={{ display:"flex", gap:"8px", justifyContent:"center", marginTop:"22px", flexWrap:"wrap" }}>
          {[["🚇","Metro"],["🚌","Bus"],["🏍️","Bike"],["🚗","Car"]].map(([ic,lb]) => (
            <div key={lb} style={{ display:"flex", alignItems:"center", gap:"5px",
              background:"rgba(255,255,255,.10)", border:"1px solid rgba(255,255,255,.18)",
              borderRadius:"999px", padding:"5px 12px", fontSize:"12px", color:"#fff", fontWeight:"600" }}>
              <span>{ic}</span><span>{lb}</span>
            </div>
          ))}
        </div>

        {/* Progress bar — 4 s matches the redirect timer */}
        <div style={{ marginTop:"36px", width:"180px", height:"3px",
          background:"rgba(255,255,255,.15)", borderRadius:"3px", overflow:"hidden", margin:"36px auto 0" }}>
          <div className="spl-bar" />
        </div>

        {/* Loading dots */}
        <div style={{ marginTop:"14px", fontSize:"18px", color:"rgba(255,255,255,.5)" }}>
          <span className="spl-dot">●</span>
          <span className="spl-dot"> ●</span>
          <span className="spl-dot"> ●</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  // ── ALL STATE (hooks always before any conditional return) ────────────────
  const [splashDone, setSplashDone] = useState(false);

  const [from, setFrom] = useState("");
  const [to, setTo]     = useState("");
  const fromCoordsSelected = useRef<{ lat: number; lon: number } | null>(null);
  const toCoordsSelected   = useRef<{ lat: number; lon: number } | null>(null);
  const fromInputRef = useRef<HTMLInputElement>(null);
  const toInputRef   = useRef<HTMLInputElement>(null);

  const [data, setData]               = useState<RouteData | null>(null);
  const [loading, setLoading]         = useState(false);
  const [modal, setModal]             = useState<string | null>(null);
  const [routeConfig, setRouteConfig] = useState<RouteConfig>(EMPTY_CONFIG);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [userLocation, setUserLocation]         = useState<{ lat: number; lon: number } | null>(null);
  const [locationStatus, setLocationStatus]     = useState<"idle" | "allowed" | "denied">("idle");
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [navMode, setNavMode]       = useState<string | null>(null);
  const [navSteps, setNavSteps]     = useState<any[]>([]);
  const [navLoading, setNavLoading] = useState(false);
  const [showBusNav, setShowBusNav] = useState(false);
  const [showMetroNav, setShowMetroNav]                 = useState(false);
  const [showMetroUnavailable, setShowMetroUnavailable] = useState(false);
  const [routeSaved, setRouteSaved]     = useState(false);
  const [savingRoute, setSavingRoute]   = useState(false);
  const [showMetroTicket, setShowMetroTicket] = useState(false);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown,   setShowToDropdown]   = useState(false);
  const [rideTicket, setRideTicket] = useState<RideTicketState | null>(null);
  const [suggestionName,    setSuggestionName]    = useState("");
  const [suggestionEmail,   setSuggestionEmail]   = useState("");
  const [suggestionText,    setSuggestionText]    = useState("");
  const [sendingSuggestion, setSendingSuggestion] = useState(false);
  const [suggestionSuccess, setSuggestionSuccess] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const { data: session, status } = useSession();
  const router = useRouter();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const dataRef        = useRef<RouteData | null>(null);
  const navRouteRef    = useRef<{ from: [number,number]; to: [number,number] } | null>(null);

  const fromAC = useAutocomplete(from);
  const toAC   = useAutocomplete(to);

  // ── SPLASH: always show for exactly 4 seconds on every page load,
  //    then redirect to /auth/login regardless of auth state ────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setSplashDone(true);
      router.push("/auth/login");
    }, 4000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Home page effects — only run after splash + when authenticated ────────
  useEffect(() => {
    if (!splashDone || status !== "authenticated") return;
    function handleClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) setShowProfileMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [splashDone, status]);

  useEffect(() => {
    if (!splashDone || status !== "authenticated") return;
    if (typeof window !== "undefined") loadGoogleMapsScript().catch(() => {});
  }, [splashDone, status]);

  useEffect(() => {
    if (!splashDone || status !== "authenticated") return;
    async function init() {
      const stored = localStorage.getItem(LS_KEY);
      let browserState: PermissionState | null = null;
      if (navigator.permissions) {
        try { const r = await navigator.permissions.query({ name: "geolocation" }); browserState = r.state; } catch {}
      }
      if (browserState === "denied") { localStorage.setItem(LS_KEY, "denied"); setLocationStatus("denied"); return; }
      if (stored === "permanent") { doGetLocation(); return; }
      if (stored === "session")   { doGetLocation(); return; }
      if (stored === "denied")    { setLocationStatus("denied"); doGetLocationSilent(); return; }
      setTimeout(() => setShowLocationPrompt(true), 600);
    }
    init();
  }, [splashDone, status]);

  const triggerDraw = useCallback((mode: string, extraData?: RouteData) => {
    const d = extraData ?? dataRef.current;
    if (!d) return;
    setRouteConfig({ drawKey:Math.random(), activeMode:mode, trafficLevel:d.trafficLevel, busStops:d.busInfo?.stopsList??[], metroInfo:d.metroInfo??null, allRoutes:d.allRoutes??[], fromCoords:d.fromCoords?[d.fromCoords.lat,d.fromCoords.lon]:null, toCoords:d.toCoords?[d.toCoords.lat,d.toCoords.lon]:null });
  }, []);

  // ── CONDITIONAL RENDER — after ALL hooks ─────────────────────────────────
  // Show splash for the first 4 seconds on every visit
  if (!splashDone) return <SplashScreen />;

  // After splash, if not authenticated NextAuth will handle redirect via /auth/login
  // (router.push already called above); show splash until navigation completes
  if (status === "loading" || status === "unauthenticated") return <SplashScreen />;

  // ── Helper functions (not hooks) ──────────────────────────────────────────
  function doGetLocation() {
    if (!navigator.geolocation) { setLocationStatus("denied"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserLocation(loc); setLocationStatus("allowed"); setShowLocationPrompt(false);
      },
      (err) => {
        if (err.code === 1) { localStorage.setItem(LS_KEY, "denied"); setLocationStatus("denied"); }
        else { setShowLocationPrompt(false); setLocationStatus("denied"); }
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }
  function doGetLocationSilent() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setLocationStatus("allowed"); },
      () => {},
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }
  function handlePromptAllow()     { localStorage.setItem(LS_KEY, "permanent"); doGetLocation(); }
  function handlePromptAllowOnce() { localStorage.setItem(LS_KEY, "session");   doGetLocation(); }
  function handlePromptDeny()      { localStorage.setItem(LS_KEY, "denied"); setLocationStatus("denied"); setShowLocationPrompt(false); doGetLocationSilent(); }
  async function handleEnableLocation() {
    if (navigator.permissions) {
      try { const r = await navigator.permissions.query({ name: "geolocation" }); if (r.state === "denied") { setShowLocationPrompt(true); return; } } catch {}
    }
    localStorage.removeItem(LS_KEY); setShowLocationPrompt(true);
  }
  async function sendSuggestion() {
    if (!suggestionText.trim()) { alert("Please enter a suggestion."); return; }
    setSendingSuggestion(true); setSuggestionSuccess("");
    try {
      const res = await fetch("/api/suggestions", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ name:suggestionName.trim()||"Anonymous", email:suggestionEmail.trim()||"Not provided", suggestion:suggestionText.trim() }) });
      const result = await res.json();
      if (!res.ok) { alert(result.error || "Failed to send suggestion."); return; }
      setSuggestionSuccess("✅ Suggestion sent! Thank you for helping improve Smart Commute.");
      setSuggestionName(""); setSuggestionEmail(""); setSuggestionText("");
    } catch { alert("Something went wrong. Please try again."); }
    finally  { setSendingSuggestion(false); }
  }
  const fetchRoutes = async () => {
    if (!from || !to) return;
    setLoading(true); setRouteConfig(EMPTY_CONFIG); setSelectedRouteIdx(0);
    setNavMode(null); setShowBusNav(false); setShowMetroNav(false); setShowMetroUnavailable(false); setRouteSaved(false);
    try {
      const params: any = { from, to };
      if (fromCoordsSelected.current) { params.fromLat = fromCoordsSelected.current.lat; params.fromLon = fromCoordsSelected.current.lon; }
      if (toCoordsSelected.current)   { params.toLat = toCoordsSelected.current.lat;     params.toLon = toCoordsSelected.current.lon; }
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/routes`, { params });
      const d: RouteData = res.data;
      setData(d); dataRef.current = d; triggerDraw("default", d);
      navRouteRef.current = { from:[d.fromCoords.lat, d.fromCoords.lon], to:[d.toCoords.lat, d.toCoords.lon] };
    } catch { alert("Could not fetch route. Check your backend is running."); }
    finally  { setLoading(false); }
  };
  const handleSaveRoute = async () => {
    const d = dataRef.current; if (!d) return;
    setSavingRoute(true);
    try {
      const res = await fetch("/api/saved-routes", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ from_name:from, to_name:to, from_lat:d.fromCoords.lat, from_lng:d.fromCoords.lon, to_lat:d.toCoords.lat, to_lng:d.toCoords.lon }) });
      if (res.status === 409 || res.ok) setRouteSaved(true);
    } catch {}
    setSavingRoute(false);
  };
  const handleCardClick = (mode: string) => {
    if (SUB_OPTIONS[mode]) { setModal(mode); return; }
    if (mode === "bus")   { triggerDraw("bus"); setShowBusNav(true); return; }
    if (mode === "metro") { if (!dataRef.current?.metroInfo) { setShowMetroUnavailable(true); return; } triggerDraw("metro"); setShowMetroNav(true); return; }
    triggerDraw(mode);
  };
  const handleSubOption = (parentMode: string, subId: string) => {
    setModal(null);
    if (subId === "rapido")   { setRideTicket({ mode:"rapido" });   return; }
    if (subId === "ola_uber") { setRideTicket({ mode:"ola_uber" }); return; }
    triggerDraw(subId);
  };
  const handleStartNavigation = async (mode: string) => {
    const route = navRouteRef.current; if (!route) return;
    setNavLoading(true);
    try { const steps = await fetchNavigationSteps(route.from, route.to); setNavSteps(steps); setNavMode(mode); }
    catch { alert("Could not load navigation steps."); }
    finally { setNavLoading(false); }
  };

  const fromCoords   = data?.fromCoords ? ([data.fromCoords.lat, data.fromCoords.lon] as [number,number]) : null;
  const toCoords     = data?.toCoords   ? ([data.toCoords.lat,   data.toCoords.lon  ] as [number,number]) : null;
  const traffic      = data ? TRAFFIC_CONFIG[data.trafficLevel] : null;
  const activeMode   = routeConfig.activeMode;
  const showStartBtn = selfModes.includes(activeMode) && !!data;

  return (
    <div style={{ minHeight:"100vh", background:"#f4f6f9", fontFamily:"'Segoe UI', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .sc-header { background:#fff; border-bottom:1px solid #e8e8e8; padding:10px 14px; display:flex; align-items:center; gap:8px; position:sticky; top:0; z-index:100; }
        .sc-header-brand { display:flex; align-items:center; gap:6px; flex-shrink:0; }
        .sc-header-brand span.name { font-size:16px; font-weight:700; color:#1a1a1a; white-space:nowrap; }
        .sc-header-brand span.badge { font-size:10px; background:#e3f2fd; color:#1565c0; padding:2px 7px; border-radius:999px; font-weight:600; white-space:nowrap; }
        .sc-header-right { margin-left:auto; display:flex; align-items:center; gap:8px; flex-shrink:0; }
        .sc-loc-btn { font-size:11px; background:none; border:none; cursor:pointer; font-weight:600; white-space:nowrap; padding:0; }
        .sc-search-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px; }
        @media (max-width:560px) { .sc-search-grid { grid-template-columns:1fr; gap:8px; } }
        .sc-cards-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        @media (max-width:360px) { .sc-cards-grid { grid-template-columns:1fr; } }
        .sc-stats-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:12px; }
        .sc-map-wrap { border-radius:14px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,.07); margin-bottom:14px; }
        @media (max-width:400px) { .sc-header-brand span.badge{display:none} .sc-header-brand span.name{font-size:14px} }
        @media (max-width:380px) { .sc-profile-name{display:none!important} .sc-profile-chevron{display:none!important} }
        .sc-suggestion-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px; }
        @media (max-width:480px) { .sc-suggestion-grid{grid-template-columns:1fr} }
      `}</style>

      {rideTicket && data && (
        <RideTicket mode={rideTicket.mode} from={from} to={to}
          fromCoords={[data.fromCoords.lat, data.fromCoords.lon]}
          toCoords={[data.toCoords.lat, data.toCoords.lon]}
          distanceKm={data.distanceKm} durationMin={data.durationMin}
          trafficDuration={data.trafficDuration}
          cost={data.options[rideTicket.mode === "rapido" ? "bike" : "car"]?.cost ?? 80}
          onClose={() => setRideTicket(null)} />
      )}
      {showMetroNav && data?.metroInfo && (
        <Metronavigation from={from} to={to}
          fromCoords={[data.fromCoords.lat, data.fromCoords.lon]}
          toCoords={[data.toCoords.lat, data.toCoords.lon]}
          metroInfo={data.metroInfo} totalDistance={data.distance}
          totalTime={`${data.trafficDuration} min`} onClose={() => setShowMetroNav(false)} />
      )}
      {showMetroTicket && data?.metroInfo && (
        <MetroTicket metroInfo={data.metroInfo} from={from} to={to} onClose={() => setShowMetroTicket(false)} />
      )}
      {showMetroUnavailable && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:3000, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
          <div style={{ background:"#fff", borderRadius:"20px", padding:"28px 20px", maxWidth:"340px", width:"100%", textAlign:"center", boxShadow:"0 8px 32px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize:"48px", marginBottom:"12px" }}>🚇</div>
            <div style={{ fontSize:"17px", fontWeight:"700", color:"#1a1a1a", marginBottom:"8px" }}>Metro Not Available</div>
            <div style={{ fontSize:"13px", color:"#666", lineHeight:"1.6", marginBottom:"8px" }}>No metro route between</div>
            <div style={{ background:"#f5f5f5", borderRadius:"10px", padding:"10px 14px", marginBottom:"18px", fontSize:"13px", color:"#1a1a1a", fontWeight:"600" }}>
              📍 {from.split(",")[0]} → {to.split(",")[0]}
            </div>
            <div style={{ fontSize:"12px", color:"#888", lineHeight:"1.6", marginBottom:"20px" }}>The Hyderabad Metro doesn't cover this route. Try Bus, Bike, or Car.</div>
            <div style={{ display:"flex", gap:"10px" }}>
              <button onClick={() => { setShowMetroUnavailable(false); handleCardClick("bus"); }} style={{ flex:1, padding:"12px", background:"#1565C0", color:"white", border:"none", borderRadius:"12px", fontSize:"14px", fontWeight:"700", cursor:"pointer" }}>🚌 Try Bus</button>
              <button onClick={() => setShowMetroUnavailable(false)} style={{ flex:1, padding:"12px", background:"#f5f5f5", color:"#555", border:"none", borderRadius:"12px", fontSize:"14px", cursor:"pointer" }}>Close</button>
            </div>
          </div>
        </div>
      )}
      {showBusNav && data && (
        <BusNavigation from={from} to={to} busInfo={data.busInfo}
          totalDistance={data.distance} totalTime={`${data.trafficDuration} min`}
          fromCoords={[data.fromCoords.lat, data.fromCoords.lon]}
          toCoords={[data.toCoords.lat, data.toCoords.lon]}
          trafficLevel={data.trafficLevel} onClose={() => setShowBusNav(false)} />
      )}
      {navMode && navSteps.length > 0 && navRouteRef.current && (
        <Navigation steps={navSteps} from={from} to={to}
          totalDistance={data?.distance ?? ""} totalTime={`${data?.trafficDuration ?? 0} min`}
          mode={navMode} fromCoords={navRouteRef.current.from} toCoords={navRouteRef.current.to}
          onClose={() => setNavMode(null)} />
      )}
      {showLocationPrompt && (
        <LocationPrompt onAllow={handlePromptAllow} onAllowOnce={handlePromptAllowOnce} onDeny={handlePromptDeny} />
      )}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1000, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background:"#fff", borderRadius:"20px 20px 0 0", padding:"24px", width:"100%", maxWidth:"480px" }}>
            <div style={{ width:"40px", height:"4px", background:"#e0e0e0", borderRadius:"2px", margin:"0 auto 20px" }} />
            <div style={{ fontSize:"16px", fontWeight:"700", color:"#1a1a1a", marginBottom:"16px" }}>Choose how to {modal === "bike" ? "ride" : "drive"}</div>
            {SUB_OPTIONS[modal]?.map((opt) => (
              <div key={opt.id} onClick={() => handleSubOption(modal, opt.id)}
                style={{ display:"flex", alignItems:"center", gap:"14px", padding:"14px", borderRadius:"12px", border:"1.5px solid #e0e0e0", marginBottom:"10px", cursor:"pointer", background:"#fafafa" }}>
                <span style={{ fontSize:"28px" }}>{opt.icon}</span>
                <div><div style={{ fontWeight:"600", fontSize:"15px", color:"#1a1a1a" }}>{opt.label}</div><div style={{ fontSize:"12px", color:"#888" }}>{opt.desc}</div></div>
                <span style={{ marginLeft:"auto", color:"#bbb" }}>›</span>
              </div>
            ))}
            <button onClick={() => setModal(null)} style={{ width:"100%", marginTop:"6px", padding:"12px", border:"none", background:"#f4f4f4", borderRadius:"10px", fontSize:"14px", color:"#555", cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="sc-header">
        <div className="sc-header-brand">
          <span style={{ fontSize:"20px" }}>🚗</span>
          <span className="name">Smart Commute</span>
          <span className="badge">Hyderabad</span>
        </div>
        <div className="sc-header-right">
          {locationStatus === "allowed" ? (
            <span style={{ fontSize:"11px", color:"#34A853", fontWeight:"600" }}>📍 On</span>
          ) : (
            <button className="sc-loc-btn" onClick={handleEnableLocation}
              style={{ color: locationStatus === "denied" ? "#EA4335" : "#1565C0" }}>
              📍 {locationStatus === "denied" ? "Enable" : "Location"}
            </button>
          )}
          {session?.user && (
            <div ref={profileMenuRef} style={{ position:"relative" }}>
              <button onClick={() => setShowProfileMenu(v => !v)}
                style={{ display:"flex", alignItems:"center", gap:"6px", background:"#f4f6f9", border:"1.5px solid #e0e0e0", borderRadius:"999px", padding:"4px 10px 4px 5px", cursor:"pointer", fontSize:"13px", fontWeight:"600", color:"#1a1a1a" }}>
                <div style={{ width:"26px", height:"26px", borderRadius:"50%", background:"#1565C0", color:"white", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:"700", flexShrink:0 }}>
                  {session.user.name?.[0]?.toUpperCase() ?? session.user.email?.[0]?.toUpperCase() ?? "U"}
                </div>
                <span className="sc-profile-name" style={{ maxWidth:"70px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{session.user.name?.split(" ")[0] ?? "Me"}</span>
                <span className="sc-profile-chevron" style={{ fontSize:"10px", color:"#888" }}>▼</span>
              </button>
              {showProfileMenu && (
                <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, background:"#fff", border:"1px solid #e0e0e0", borderRadius:"14px", boxShadow:"0 8px 24px rgba(0,0,0,0.12)", minWidth:"200px", zIndex:9999, overflow:"hidden" }}>
                  <div style={{ padding:"12px 16px", borderBottom:"1px solid #f0f0f0", background:"#f8f9fa" }}>
                    <div style={{ fontWeight:"700", fontSize:"13px", color:"#1a1a1a" }}>{session.user.name ?? "User"}</div>
                    <div style={{ fontSize:"11px", color:"#888", marginTop:"2px" }}>{session.user.email}</div>
                  </div>
                  {[
                    { icon:"⭐", label:"Saved Routes", action: () => { setShowProfileMenu(false); router.push("/saved-routes"); } },
                    { icon:"⚙️", label:"Settings",     action: () => { setShowProfileMenu(false); router.push("/settings"); } },
                  ].map(item => (
                    <button key={item.label} onClick={item.action}
                      style={{ width:"100%", display:"flex", alignItems:"center", gap:"10px", padding:"11px 16px", background:"none", border:"none", cursor:"pointer", fontSize:"13px", color:"#1a1a1a", textAlign:"left" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f4f6f9")}
                      onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                      <span>{item.icon}</span>{item.label}
                    </button>
                  ))}
                  <div style={{ borderTop:"1px solid #f0f0f0" }}>
                    <button onClick={() => { setShowProfileMenu(false); if (localStorage.getItem(LS_KEY)==="session") localStorage.removeItem(LS_KEY); signOut({ callbackUrl:"/auth/login" }); }}
                      style={{ width:"100%", display:"flex", alignItems:"center", gap:"10px", padding:"11px 16px", background:"none", border:"none", cursor:"pointer", fontSize:"13px", color:"#EA4335", fontWeight:"600", textAlign:"left" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#fff5f5")}
                      onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                      <span>🚪</span>Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth:"860px", margin:"0 auto", padding:"14px 12px 24px" }}>
        <div style={{ background:"#fff", borderRadius:"16px", padding:"14px", boxShadow:"0 2px 10px rgba(0,0,0,0.07)", marginBottom:"12px" }}>
          <div className="sc-search-grid">
            <div style={{ position:"relative" }}>
              <label style={{ fontSize:"10px", fontWeight:"700", color:"#999", display:"block", marginBottom:"5px", textTransform:"uppercase", letterSpacing:"0.6px" }}>FROM</label>
              <div style={{ position:"relative" }}>
                <input ref={fromInputRef}
                  style={{ width:"100%", border:"1.5px solid #e8e8e8", borderRadius:"10px", padding:"11px 36px 11px 12px", fontSize:"14px", outline:"none", boxSizing:"border-box", color:"#1a1a1a" }}
                  placeholder="Search location..." value={from}
                  onChange={(e) => { setFrom(e.target.value); fromCoordsSelected.current = null; }}
                  onFocus={() => setShowFromDropdown(true)}
                  onBlur={() => setTimeout(() => setShowFromDropdown(false), 150)} />
                {userLocation && (
                  <button onMouseDown={async (e) => {
                    e.preventDefault(); fromCoordsSelected.current = userLocation;
                    const area = await reverseGeocode(userLocation.lat, userLocation.lon);
                    setFrom(area); fromCoordsSelected.current = userLocation;
                  }} style={{ position:"absolute", right:"8px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:"16px" }}>📍</button>
                )}
              </div>
              {showFromDropdown && (
                <SuggestionDropdown suggestions={fromAC.suggestions} isLoading={fromAC.isLoading}
                  onSelect={(s) => { setFrom(s.display); fromCoordsSelected.current = { lat:s.lat, lon:s.lon }; fromAC.clear(); }}
                  onClose={() => setShowFromDropdown(false)} />
              )}
            </div>
            <div style={{ position:"relative" }}>
              <label style={{ fontSize:"10px", fontWeight:"700", color:"#999", display:"block", marginBottom:"5px", textTransform:"uppercase", letterSpacing:"0.6px" }}>TO</label>
              <input ref={toInputRef}
                style={{ width:"100%", border:"1.5px solid #e8e8e8", borderRadius:"10px", padding:"11px 12px", fontSize:"14px", outline:"none", boxSizing:"border-box", color:"#1a1a1a" }}
                placeholder="Search destination..." value={to}
                onChange={(e) => { setTo(e.target.value); toCoordsSelected.current = null; }}
                onFocus={() => setShowToDropdown(true)}
                onBlur={() => setTimeout(() => setShowToDropdown(false), 150)} />
              {showToDropdown && (
                <SuggestionDropdown suggestions={toAC.suggestions} isLoading={toAC.isLoading}
                  onSelect={(s) => { setTo(s.display); toCoordsSelected.current = { lat:s.lat, lon:s.lon }; toAC.clear(); }}
                  onClose={() => setShowToDropdown(false)} />
              )}
            </div>
          </div>
          <button onClick={fetchRoutes} disabled={loading}
            style={{ width:"100%", background:loading?"#90caf9":"#1565C0", color:"#fff", border:"none", borderRadius:"10px", padding:"13px", fontSize:"15px", fontWeight:"700", cursor:loading?"not-allowed":"pointer" }}>
            {loading ? "Finding routes…" : "🔍 Find Route"}
          </button>
        </div>

        <div className="sc-map-wrap">
          <Map fromCoords={fromCoords} toCoords={toCoords} routeConfig={routeConfig}
            selectedRouteIdx={selectedRouteIdx}
            onRouteSelect={(idx) => { setSelectedRouteIdx(idx); triggerDraw(activeMode); }} />
        </div>

        {showStartBtn && (
          <button onClick={() => handleStartNavigation(activeMode)} disabled={navLoading}
            style={{ width:"100%", padding:"14px", background:navLoading?"#90caf9":"#34A853", color:"white", border:"none", borderRadius:"12px", fontSize:"16px", fontWeight:"700", cursor:navLoading?"not-allowed":"pointer", marginBottom:"14px", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", boxShadow:"0 4px 12px rgba(52,168,83,0.35)" }}>
            {navLoading ? "Loading…" : "▶  Start Navigation"}
          </button>
        )}

        {data && (
          <>
            {data.allRoutes?.length > 0 && (
              <div style={{ background:"#fff", borderRadius:"12px", boxShadow:"0 1px 6px rgba(0,0,0,0.08)", marginBottom:"12px", overflow:"hidden" }}>
                <div style={{ padding:"10px 14px 4px", fontSize:"11px", fontWeight:"700", color:"#999", textTransform:"uppercase", letterSpacing:"0.6px" }}>Route options</div>
                {data.allRoutes.map((route, idx) => (
                  <div key={idx} onClick={() => { setSelectedRouteIdx(idx); triggerDraw(activeMode); }}
                    style={{ display:"flex", alignItems:"center", padding:"11px 14px", borderTop:idx>0?"1px solid #f0f0f0":"none", cursor:"pointer", background:selectedRouteIdx===idx?"#E8F0FE":"white", borderLeft:selectedRouteIdx===idx?"3px solid #1A73E8":"3px solid transparent" }}>
                    <div style={{ minWidth:"48px", textAlign:"center", marginRight:"12px" }}>
                      <div style={{ fontSize:"18px", fontWeight:"700", color:selectedRouteIdx===idx?"#1A73E8":"#1a1a1a" }}>{route.trafficDuration??route.durationMin}</div>
                      <div style={{ fontSize:"10px", color:"#888" }}>min</div>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:"13px", fontWeight:"600", color:"#1a1a1a", marginBottom:"2px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>via {route.viaRoad||`Route ${idx+1}`}</div>
                      <div style={{ fontSize:"11px", color:idx===0?"#34A853":"#888" }}>{route.trafficNote||(idx===0?"Best route":"Alternative")} · {route.distanceKm} km</div>
                    </div>
                    {idx===0 && <div style={{ fontSize:"10px", background:"#E8F5E9", color:"#2E7D32", padding:"3px 8px", borderRadius:"999px", fontWeight:"700", whiteSpace:"nowrap", flexShrink:0 }}>FASTEST</div>}
                  </div>
                ))}
              </div>
            )}
            {traffic && (
              <div style={{ background:traffic.bg, border:`1.5px solid ${traffic.color}40`, borderRadius:"12px", padding:"11px 14px", marginBottom:"12px", display:"flex", alignItems:"center", gap:"10px" }}>
                <span style={{ fontSize:"18px" }}>{traffic.icon}</span>
                <div>
                  <span style={{ fontWeight:"700", color:traffic.color, fontSize:"13px" }}>{traffic.label}</span>
                  <span style={{ color:"#555", fontSize:"13px" }}> — <strong>{data.trafficDuration} min</strong></span>
                </div>
              </div>
            )}
            <div className="sc-stats-grid">
              {[
                { label:"Distance",     value:data.distance,                 icon:"📍" },
                { label:"With traffic", value:`${data.trafficDuration} min`, icon:"⏱️" },
                { label:"Best price",   value:`₹${Math.min(...Object.values(data.options).map(o=>o.cost))}`, icon:"💰" },
              ].map((s) => (
                <div key={s.label} style={{ background:"#fff", borderRadius:"12px", padding:"12px 8px", boxShadow:"0 1px 5px rgba(0,0,0,0.05)", textAlign:"center" }}>
                  <div style={{ fontSize:"16px", marginBottom:"3px" }}>{s.icon}</div>
                  <div style={{ fontSize:"15px", fontWeight:"700", color:"#1a1a1a" }}>{s.value}</div>
                  <div style={{ fontSize:"10px", color:"#888", marginTop:"2px" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ background:"#e8f5e9", border:"1.5px solid #a5d6a7", borderRadius:"12px", padding:"12px 14px", marginBottom:"12px", display:"flex", alignItems:"center", gap:"10px" }}>
              <span style={{ fontSize:"18px" }}>⭐</span>
              <div>
                <div style={{ fontWeight:"700", color:"#1b5e20", fontSize:"13px" }}>Recommended: {data.recommendation.emoji} {data.recommendation.label}</div>
                <div style={{ fontSize:"12px", color:"#388e3c", marginTop:"2px" }}>₹{data.recommendation.cost} · {data.recommendation.time} min</div>
              </div>
            </div>
            <button onClick={handleSaveRoute} disabled={savingRoute || routeSaved}
              style={{ width:"100%", padding:"11px", marginBottom:"12px", background:routeSaved?"#e8f5e9":"#fff", color:routeSaved?"#2E7D32":"#1565C0", border:routeSaved?"1.5px solid #a5d6a7":"1.5px solid #1565C0", borderRadius:"12px", fontSize:"13px", fontWeight:"700", cursor:(savingRoute||routeSaved)?"default":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:"6px" }}>
              {savingRoute ? "Saving…" : routeSaved ? "✅ Route Saved" : "⭐ Save This Route"}
            </button>
            <div style={{ fontSize:"11px", color:"#999", marginBottom:"10px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.6px" }}>Tap a mode to see options</div>
            <div className="sc-cards-grid">
              {Object.values(data.options).map((opt) => {
                const isRec        = opt.mode === data.recommendation.mode;
                const isActive     = activeMode === opt.mode || activeMode === `self_${opt.mode}`;
                const metroUnavail = opt.mode === "metro" && !data.metroInfo;
                return (
                  <div key={opt.mode} onClick={() => handleCardClick(opt.mode)}
                    style={{ background:"#fff", border:isRec?"2px solid #43a047":isActive?"2px solid #1565C0":"1.5px solid #e8e8e8", borderRadius:"14px", padding:"14px", cursor:"pointer", position:"relative", boxShadow:"0 1px 6px rgba(0,0,0,0.05)", opacity:metroUnavail?0.7:1 }}>
                    {isRec && <div style={{ position:"absolute", top:0, right:"10px", background:"#43a047", color:"#fff", fontSize:"9px", fontWeight:"700", padding:"2px 8px", borderRadius:"0 0 7px 7px" }}>BEST</div>}
                    {metroUnavail && <div style={{ position:"absolute", top:0, left:"10px", background:"#9e9e9e", color:"#fff", fontSize:"9px", fontWeight:"700", padding:"2px 7px", borderRadius:"0 0 6px 6px" }}>LIMITED</div>}
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
                        <span style={{ fontSize:"20px" }}>{opt.emoji}</span>
                        <div>
                          <div style={{ fontWeight:"700", fontSize:"13px", color:"#1a1a1a" }}>{opt.label}</div>
                          <div style={{ fontSize:"10px", color:metroUnavail?"#EA4335":"#888" }}>{metroUnavail?"No metro":opt.note}</div>
                        </div>
                      </div>
                      <span style={{ fontSize:"9px", color:metroUnavail?"#EA4335":"#1565C0", fontWeight:"700" }}>
                        {metroUnavail?"N/A ›":SUB_OPTIONS[opt.mode]?"OPT ›":opt.mode==="bus"?"VIEW ›":"MAP ›"}
                      </span>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:"18px", fontWeight:"700", color:metroUnavail?"#bbb":"#1a1a1a" }}>{metroUnavail?"—":`₹${opt.cost}`}</span>
                      <span style={{ fontSize:"12px", color:"#555" }}>{metroUnavail?"—":`${opt.time}m`}</span>
                    </div>
                    <div style={{ height:"3px", background:"#f0f0f0", borderRadius:"2px", marginTop:"8px" }}>
                      {!metroUnavail && <div style={{ height:"3px", borderRadius:"2px", background:isRec?"#43a047":"#1565C0", width:`${Math.min((opt.cost/250)*100,100)}%` }} />}
                    </div>
                    {isActive && selfModes.includes(activeMode) && !metroUnavail && (
                      <button onClick={(e) => { e.stopPropagation(); handleStartNavigation(activeMode); }} disabled={navLoading}
                        style={{ marginTop:"8px", width:"100%", padding:"8px", background:"#34A853", color:"white", border:"none", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:navLoading?"not-allowed":"pointer" }}>
                        {navLoading?"Loading…":"▶ Start"}
                      </button>
                    )}
                    {opt.mode==="bus" && isActive && data.busInfo && (
                      <div style={{ marginTop:"8px" }}>
                        <div style={{ padding:"7px 10px", background:"#e3f2fd", borderRadius:"8px", fontSize:"11px", color:"#1565C0", lineHeight:"1.5", marginBottom:"8px" }}>
                          🚌 <strong>{data.busInfo.busNumbers.join(", ")}</strong> · {data.busInfo.stops} stops · {data.busInfo.frequency}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setShowBusNav(true); }}
                          style={{ width:"100%", padding:"8px", background:"#1565C0", color:"white", border:"none", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:"pointer" }}>
                          🚌 View Timings & Map
                        </button>
                      </div>
                    )}
                    {opt.mode==="metro" && isActive && data.metroInfo && (
                      <div style={{ marginTop:"8px" }}>
                        <div style={{ padding:"7px 10px", background:"#f3e5f5", borderRadius:"8px", fontSize:"11px", color:"#6A1B9A", lineHeight:"1.5", marginBottom:"8px" }}>
                          🚇 {data.metroInfo.fromStation} → {data.metroInfo.toStation}
                          {data.metroInfo.stationCount && <div style={{ marginTop:"2px", opacity:0.8 }}>{data.metroInfo.stationCount} stations</div>}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setShowMetroTicket(true); }}
                          style={{ width:"100%", padding:"8px", background:"#43A047", color:"white", border:"none", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:"pointer", marginBottom:"6px" }}>
                          🎫 Book Ticket
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setShowMetroNav(true); }}
                          style={{ width:"100%", padding:"8px", background:"#E53935", color:"white", border:"none", borderRadius:"8px", fontSize:"13px", fontWeight:"700", cursor:"pointer" }}>
                          🚇 Navigate
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop:"12px", background:"#e3f2fd", borderRadius:"10px", padding:"10px 12px", fontSize:"12px", color:"#1565c0", lineHeight:"1.6" }}>
              💡 <strong>Bike/Car</strong> → app or self &nbsp;·&nbsp; <strong>Bus</strong> → timings &nbsp;·&nbsp; <strong>Metro</strong> → navigate
            </div>
          </>
        )}

        <div style={{ background:"#fff", borderRadius:"16px", padding:"20px", marginTop:"28px", boxShadow:"0 2px 10px rgba(0,0,0,0.07)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"6px" }}>
            <span style={{ fontSize:"20px" }}>💡</span>
            <div style={{ fontSize:"15px", fontWeight:"700", color:"#1a1a1a" }}>Suggestions & Feedback</div>
          </div>
          <div style={{ fontSize:"12px", color:"#888", marginBottom:"16px" }}>Help us improve Smart Commute.</div>
          <div className="sc-suggestion-grid">
            <div>
              <label style={{ fontSize:"10px", fontWeight:"700", color:"#999", display:"block", marginBottom:"5px", textTransform:"uppercase" }}>Your Name</label>
              <input value={suggestionName} onChange={(e) => setSuggestionName(e.target.value)} placeholder="e.g. John"
                style={{ width:"100%", border:"1.5px solid #e8e8e8", borderRadius:"10px", padding:"10px 12px", fontSize:"13px", outline:"none", boxSizing:"border-box", color:"#1a1a1a" }} />
            </div>
            <div>
              <label style={{ fontSize:"10px", fontWeight:"700", color:"#999", display:"block", marginBottom:"5px", textTransform:"uppercase" }}>Email</label>
              <input type="email" value={suggestionEmail} onChange={(e) => setSuggestionEmail(e.target.value)} placeholder="your@email.com"
                style={{ width:"100%", border:"1.5px solid #e8e8e8", borderRadius:"10px", padding:"10px 12px", fontSize:"13px", outline:"none", boxSizing:"border-box", color:"#1a1a1a" }} />
            </div>
          </div>
          <div style={{ marginBottom:"12px" }}>
            <label style={{ fontSize:"10px", fontWeight:"700", color:"#999", display:"block", marginBottom:"5px", textTransform:"uppercase" }}>Your Suggestion *</label>
            <textarea value={suggestionText} onChange={(e) => setSuggestionText(e.target.value)}
              placeholder="Suggest a feature or report an issue…" rows={3}
              style={{ width:"100%", border:"1.5px solid #e8e8e8", borderRadius:"10px", padding:"10px 12px", fontSize:"13px", outline:"none", resize:"vertical", boxSizing:"border-box", color:"#1a1a1a", fontFamily:"'Segoe UI',sans-serif" }} />
          </div>
          {suggestionSuccess && (
            <div style={{ background:"#e8f5e9", border:"1px solid #a5d6a7", borderRadius:"10px", padding:"10px 14px", marginBottom:"12px", fontSize:"13px", color:"#2e7d32", fontWeight:"600" }}>{suggestionSuccess}</div>
          )}
          <button onClick={sendSuggestion} disabled={sendingSuggestion || !suggestionText.trim()}
            style={{ width:"100%", padding:"12px", background:sendingSuggestion||!suggestionText.trim()?"#90caf9":"#1565C0", color:"white", border:"none", borderRadius:"10px", fontSize:"14px", fontWeight:"700", cursor:sendingSuggestion||!suggestionText.trim()?"not-allowed":"pointer" }}>
            {sendingSuggestion ? "Sending…" : "📨 Send Suggestion"}
          </button>
        </div>

        <div style={{ marginTop:"28px", marginBottom:"16px", textAlign:"center" }}>
          <div style={{ fontSize:"20px", marginBottom:"6px" }}>🚗</div>
          <div style={{ fontSize:"14px", fontWeight:"700", color:"#1a1a1a", marginBottom:"4px" }}>Smart Commute</div>
          <div style={{ fontSize:"12px", color:"#888", marginBottom:"10px" }}>Your intelligent travel companion for Hyderabad</div>
          <div style={{ display:"flex", justifyContent:"center", gap:"16px", marginBottom:"10px", flexWrap:"wrap" }}>
            {["🚇 Metro","🚌 Bus","🏍️ Bike","🚗 Car"].map(m => (
              <span key={m} style={{ fontSize:"12px", color:"#1565C0", fontWeight:"600" }}>{m}</span>
            ))}
          </div>
          <a href="mailto:shaikhamad67612@gmail.com" style={{ fontSize:"13px", color:"#1565C0", fontWeight:"600", textDecoration:"none" }}>shaikhamad67612@gmail.com</a>
          <div style={{ fontSize:"11px", color:"#ccc", marginTop:"14px" }}>© {new Date().getFullYear()} Smart Commute · Built for Hyderabad</div>
        </div>
      </div>
    </div>
  );
}
