"use client";

import { useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────
interface StopEntry { name: string; time: string; }

interface DirectBus {
  busNo: string; via: string;
  departure: string; arrival: string;
  duration: string; durationMin: number;
  boardingStop: string; alightingStop: string;
  boardingIdx: number; alightingIdx: number;
  busStartStop: string | null;
  busEndStop:   string | null;
  totalStops: number; frequency: string;
  fare: number;
  walkToStop: number; walkToStopLabel: string; walkToStopM: number;
  isAtBoardStop: boolean;   // true = user is within 200m of boarding stop
  walkFromStop: number; walkFromStopLabel: string; walkFromStopM: number;
  isAtAlightStop: boolean;  // true = destination is within 200m of alighting stop
  stops: string[]; stopCount: number;
  stopSchedule: StopEntry[];
}

interface TransferLeg {
  busNo: string; from: string; to: string;
  stops: string[]; stopSchedule: StopEntry[];
  boardingIdx: number; alightingIdx: number;
  stopCount: number; duration: string; durationMin: number;
  frequency: string; changeAt: string | null;
  depTime: string; arrTime: string;
  isAtBoardStop: boolean; isAtAlightStop: boolean;
  walkToStopM: number; walkFromStopM: number;
}

interface TransferRoute {
  description: string; legs: TransferLeg[];
  totalTime: string; totalMinutes: number; fare: number; arrival: string;
}

interface BusInfo {
  directBuses: DirectBus[];
  transferRoutes: TransferRoute[];
  stops: number; stopsList: string[];
  busNumbers: string[]; frequency: string;
  boardingPoint: string; alightingPoint: string;
  fare: number; duration: number;
  walkToStop: number; walkFromStop: number;
  note?: string | null;
}

interface Props {
  from: string; to: string; busInfo: BusInfo;
  totalDistance: string; totalTime: string;
  fromCoords: [number, number]; toCoords: [number, number];
  trafficLevel: string; onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────
function calcFare(km: number): number {
  if (km <= 4)  return 10; if (km <= 8)  return 15; if (km <= 12) return 20;
  if (km <= 16) return 25; if (km <= 20) return 30; if (km <= 25) return 35;
  if (km <= 30) return 40; if (km <= 35) return 45; if (km <= 40) return 50;
  return Math.round(50 + (km - 40) * 1.2);
}

function extractJSON(text: string): string {
  let c = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  const f = c.indexOf("{"), l = c.lastIndexOf("}");
  if (f !== -1 && l > f) c = c.slice(f, l + 1);
  return c;
}

function makeFallback(from: string, to: string, km: number, note?: string): BusInfo {
  return {
    directBuses: [], transferRoutes: [],
    stops: 0, stopsList: [], busNumbers: [], frequency: "Unknown",
    boardingPoint: from.split(",")[0], alightingPoint: to.split(",")[0],
    fare: calcFare(km), duration: Math.round((km / 18) * 60),
    walkToStop: 5, walkFromStop: 3,
    note: note ?? `Could not fetch routes. Estimated fare: ₹${calcFare(km)}. Check TSRTC Gamyam app.`,
  };
}

async function fetchBusRoutes(from: string, to: string, km: number): Promise<BusInfo> {
  try {
    const res = await fetch("/api/bus-routes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to }),
    });
    if (!res.ok) return makeFallback(from, to, km, `Server error (${res.status}).`);
    const data = await res.json();
    if (data.type === "error" || data.error)
      return makeFallback(from, to, km, `⚠️ ${data.error?.message ?? "API error"}`);
    const block = data.content?.find((c: any) => c.type === "text");
    if (!block?.text) return makeFallback(from, to, km, "Unexpected response.");
    return JSON.parse(extractJSON(block.text)) as BusInfo;
  } catch (err: any) {
    return makeFallback(from, to, km, `Network error: ${err?.message ?? "unknown"}`);
  }
}

const DOT = {
  busOrigin: "#9E9E9E",
  source:    "#2E7D32",
  boarding:  "#1565C0",
  journey:   "#1565C0",
  dest:      "#D32F2F",
};

// ── BusBadge ──────────────────────────────────────────────────
function BusBadge({ busNo, label }: { busNo: string; label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px" }}>
      <span style={{ background: "#1565C0", color: "white", fontSize: "12px", fontWeight: "700", padding: "3px 10px", borderRadius: "6px" }}>
        🚌 {busNo}
      </span>
      <span style={{ fontSize: "12px", color: "#666" }}>{label ?? "Board here"}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function BusNavigation({
  from, to, busInfo: init, totalDistance, totalTime,
  fromCoords, toCoords, trafficLevel, onClose,
}: Props) {
  const mapRef        = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const initedRef     = useRef(false);

  const [view, setView]       = useState<"list" | "detail" | "transfer" | "map">("list");
  const [selBus, setSelBus]   = useState<DirectBus | null>(null);
  const [selTr,  setSelTr]    = useState<TransferRoute | null>(null);
  const [busInfo, setBusInfo] = useState<BusInfo>(init);
  const [loading, setLoading] = useState(true);

  const km       = parseFloat(totalDistance?.replace(/[^0-9.]/g, "") || "10");
  const fromName = from.split(",")[0];
  const toName   = to.split(",")[0];
  const tc       = ({ low: "#34A853", medium: "#F9A825", high: "#EA4335" } as any)[trafficLevel] ?? "#34A853";

  useEffect(() => {
    setLoading(true);
    fetchBusRoutes(from, to, km)
      .then(r  => { setBusInfo(r); setLoading(false); })
      .catch(() => { setBusInfo(makeFallback(from, to, km)); setLoading(false); });
  }, [from, to]);

  const hasDirect   = (busInfo.directBuses?.length   ?? 0) > 0;
  const hasTransfer = (busInfo.transferRoutes?.length ?? 0) > 0;
  const noBus       = !hasDirect && !hasTransfer;

  // ── Map ───────────────────────────────────────────────────────
  useEffect(() => {
    if (view !== "map" || initedRef.current || !mapRef.current) return;
    initedRef.current = true;
    import("leaflet").then(L => {
      if (!mapRef.current || leafletMapRef.current) return;
      const el = mapRef.current as any;
      if (el._leaflet_id) el._leaflet_id = null;
      const map = L.map(mapRef.current, { center: fromCoords, zoom: 13, zoomControl: true, attributionControl: false });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 20 }).addTo(map);
      leafletMapRef.current = map;
      fetch(`https://router.project-osrm.org/route/v1/driving/${fromCoords[1]},${fromCoords[0]};${toCoords[1]},${toCoords[0]}?overview=full&geometries=geojson`)
        .then(r => r.json()).then(d => {
          if (d.code !== "Ok" || !leafletMapRef.current) return;
          const latLngs = d.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
          L.polyline(latLngs, { color: "#1565C0", weight: 6 }).addTo(map);
          L.marker(fromCoords, { icon: L.divIcon({ className: "", html: `<div style="width:14px;height:14px;background:#2E7D32;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`, iconAnchor: [7, 7] }) }).addTo(map);
          L.marker(toCoords,   { icon: L.divIcon({ className: "", html: `<div style="background:#D32F2F;color:white;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;border:2px solid white;white-space:nowrap;">📍 ${toName}</div>`, iconAnchor: [0, 10] }) }).addTo(map);
          map.fitBounds(L.polyline(latLngs).getBounds(), { padding: [60, 60] });
        });
    });
    return () => {
      if (leafletMapRef.current) { leafletMapRef.current.remove(); leafletMapRef.current = null; initedRef.current = false; }
    };
  }, [view]);

  // ── Header ────────────────────────────────────────────────────
  const Header = () => (
    <div style={{ background: "#1565C0", padding: "44px 16px 14px", position: "relative", flexShrink: 0 }}>
      <button onClick={() => view === "list" ? onClose() : setView("list")}
        style={{ position: "absolute", top: "12px", left: "14px", background: "rgba(0,0,0,0.25)", border: "none", color: "white", borderRadius: "50%", width: "36px", height: "36px", cursor: "pointer", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700" }}>←</button>
      <div style={{ color: "white", fontWeight: "700", fontSize: "15px", marginBottom: "4px" }}>🚌 {fromName} → {toName}</div>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "12px" }}>📍 {totalDistance}</span>
        <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "12px" }}>₹{busInfo.fare || calcFare(km)} onwards</span>
        <span style={{ background: `${tc}30`, color: "white", fontSize: "11px", padding: "2px 8px", borderRadius: "999px", border: `1px solid ${tc}` }}>
          {trafficLevel === "high" ? "🔴" : trafficLevel === "medium" ? "🟡" : "🟢"} {trafficLevel} traffic
        </span>
      </div>
      {view !== "map" && (
        <button onClick={() => setView("map")}
          style={{ position: "absolute", top: "12px", right: "14px", background: "rgba(255,255,255,0.2)", border: "none", color: "white", borderRadius: "8px", padding: "4px 10px", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}>
          🗺 Map
        </button>
      )}
    </div>
  );

  const LegendBar = () => (
    <div style={{ background: "#F8F9FA", borderBottom: "1px solid #e0e0e0", padding: "6px 16px", display: "flex", gap: "14px", flexWrap: "wrap", flexShrink: 0 }}>
      {([
        [DOT.source,    "Your source"],
        [DOT.journey,   "Journey stops"],
        [DOT.dest,      "Your destination"],
        [DOT.busOrigin, "Rest of route"],
      ] as [string, string][]).map(([color, label]) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "9px", height: "9px", borderRadius: "50%", background: color }} />
          <span style={{ fontSize: "10px", color: "#666" }}>{label}</span>
        </div>
      ))}
    </div>
  );

  function TLRow({ time, dotColor, dotSize, lineColor, title, titleColor, subtitle, bold, children }: {
    time: string; dotColor: string; dotSize: number; lineColor: string;
    title: string; titleColor?: string; subtitle?: string; bold?: boolean; children?: React.ReactNode;
  }) {
    return (
      <div style={{ display: "flex", gap: "12px", padding: "10px 0" }}>
        <div style={{ width: "58px", textAlign: "right", fontSize: "11px", color: bold ? "#333" : "#999", fontWeight: bold ? "600" : "400", paddingTop: "2px", flexShrink: 0, lineHeight: "1.3" }}>{time}</div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
          <div style={{ width: `${dotSize}px`, height: `${dotSize}px`, borderRadius: "50%", background: dotColor, border: "2.5px solid white", boxShadow: `0 0 0 2px ${dotColor}`, flexShrink: 0, marginTop: "1px" }} />
          {lineColor !== "none" && <div style={{ width: "2px", flex: 1, minHeight: "18px", background: lineColor }} />}
        </div>
        <div style={{ flex: 1, paddingBottom: "2px" }}>
          <div style={{ fontWeight: bold ? "700" : "500", fontSize: bold ? "14px" : "13px", color: titleColor ?? "#1a1a1a", lineHeight: "1.3" }}>{title}</div>
          {subtitle && <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>{subtitle}</div>}
          {children}
        </div>
      </div>
    );
  }

  const LoadingView = () => (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", padding: "48px 24px" }}>
      <div style={{ fontSize: "36px", animation: "spin 1.5s linear infinite" }}>🔍</div>
      <div style={{ fontSize: "15px", fontWeight: "700", color: "#1565C0" }}>Finding TSRTC routes...</div>
      <div style={{ fontSize: "12px", color: "#888", textAlign: "center" }}>Checking buses from {fromName} to {toName}</div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const ListView = () => (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {!hasDirect && busInfo.note && (
        <div style={{ background: "#FFF8E1", borderBottom: "1px solid #FFE082", padding: "10px 16px", fontSize: "12px", color: "#F57F17", lineHeight: "1.5" }}>ℹ️ {busInfo.note}</div>
      )}
      {hasDirect && (
        <>
          <div style={{ padding: "10px 16px 4px", fontSize: "11px", fontWeight: "700", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px" }}>Direct Buses</div>
          {busInfo.directBuses.map((bus, i) => (
            <div key={i} onClick={() => { setSelBus(bus); setView("detail"); }}
              style={{ borderBottom: "1px solid #f0f0f0", padding: "14px 16px", cursor: "pointer", background: "white" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f8f9fa")}
              onMouseLeave={e => (e.currentTarget.style.background = "white")}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <div style={{ fontSize: "16px", fontWeight: "700" }}>{bus.departure} — {bus.arrival}</div>
                <div style={{ fontSize: "15px", fontWeight: "700" }}>{bus.duration}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "6px", flexWrap: "wrap" }}>
                <span>🚶</span><span style={{ color: "#ccc" }}>›</span>
                <span style={{ background: "#1565C0", color: "white", fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "4px" }}>🚌 {bus.busNo}</span>
                <span style={{ fontSize: "11px", color: "#666" }}>{bus.via}</span>
                <span style={{ color: "#ccc" }}>›</span><span>🚶</span>
              </div>
              <div style={{ fontSize: "12px", color: "#888", marginBottom: "2px" }}>
                Board: <strong>{bus.boardingStop}</strong> · Alight: <strong>{bus.alightingStop}</strong>
              </div>
              <div style={{ display: "flex", gap: "14px", fontSize: "12px", color: "#888" }}>
                <span>₹{bus.fare}</span>
                <span>🚶 {bus.isAtBoardStop ? "At your stop" : bus.walkToStopLabel}</span>
                <span>{bus.frequency}</span>
              </div>
            </div>
          ))}
        </>
      )}
      {hasTransfer && (
        <>
          <div style={{ padding: "10px 16px 4px", fontSize: "11px", fontWeight: "700", color: "#999", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {hasDirect ? "With Transfer" : "Routes (Transfer Required)"}
          </div>
          {busInfo.transferRoutes.map((tr, i) => (
            <div key={i} onClick={() => { setSelTr(tr); setView("transfer"); }}
              style={{ borderBottom: "1px solid #f0f0f0", padding: "14px 16px", cursor: "pointer", background: "white" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f8f9fa")}
              onMouseLeave={e => (e.currentTarget.style.background = "white")}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <div style={{ fontSize: "16px", fontWeight: "700" }}>{tr.legs[0]?.depTime} — {tr.arrival}</div>
                <div style={{ fontSize: "15px", fontWeight: "700" }}>{tr.totalTime}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap", marginBottom: "4px" }}>
                <span>🚶</span><span style={{ color: "#ccc" }}>›</span>
                {tr.legs.map((leg, li) => (
                  <span key={li} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span style={{ background: "#1565C0", color: "white", fontSize: "11px", fontWeight: "700", padding: "2px 8px", borderRadius: "4px" }}>🚌 {leg.busNo}</span>
                    {li < tr.legs.length - 1 && <span style={{ color: "#ccc" }}>›</span>}
                  </span>
                ))}
                <span style={{ color: "#ccc" }}>›</span><span>🚶</span>
              </div>
              <div style={{ fontSize: "12px", color: "#888" }}>₹{tr.fare} · {tr.description}</div>
            </div>
          ))}
        </>
      )}
      {noBus && (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "#888" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🚌</div>
          <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px" }}>No TSRTC bus routes found</div>
          <div style={{ fontSize: "12px", lineHeight: "1.6", marginBottom: "16px" }}>{busInfo.note || "Try nearby major stops like MGBS, Dilsukhnagar, or LB Nagar."}</div>
          <div style={{ background: "#E3F2FD", borderRadius: "10px", padding: "12px 16px", textAlign: "left" }}>
            <div style={{ fontSize: "12px", fontWeight: "700", color: "#1565C0", marginBottom: "4px" }}>💡 Tips:</div>
            <div style={{ fontSize: "12px", color: "#555", lineHeight: "1.7" }}>
              • Use TSRTC Gamyam app for live tracking<br />
              • Try a nearby major stop as source/destination<br />
              • Estimated fare: ₹{calcFare(km)} for {totalDistance}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Detail View ───────────────────────────────────────────────
  const DetailView = ({ bus }: { bus: DirectBus }) => {
    const all  = bus.stopSchedule ?? [];
    const bIdx = Math.max(0, Math.min(bus.boardingIdx  ?? 0, all.length - 1));
    const aIdx = Math.max(bIdx + 1, Math.min(bus.alightingIdx ?? all.length - 1, all.length - 1));

    const preStops    = all.slice(0, bIdx);
    const sourceStop  = all[bIdx];
    const middleStops = all.slice(bIdx + 1, aIdx);
    const destStop    = all[aIdx];
    const postStops   = all.slice(aIdx + 1);

    const busOriginName = bus.busStartStop ?? (preStops.length > 0 ? preStops[0].name : null);
    const busTermName   = bus.busEndStop   ?? (postStops.length > 0 ? postStops[postStops.length - 1].name : null);
    const preChips      = preStops.slice(1);
    const postChips     = postStops.slice(0, postStops.length - 1);

    const [preExpanded,  setPreExpanded]  = useState(false);
    const [postExpanded, setPostExpanded] = useState(false);

    const boardStopName  = sourceStop?.name ?? bus.boardingStop;
    const alightStopName = destStop?.name   ?? bus.alightingStop;

    // ── KEY LOGIC ─────────────────────────────────────────────
    // Use isAtBoardStop (from real coord distance) instead of name matching.
    // isAtBoardStop = true  → user is within 200m of boarding stop
    //                         → show ONE combined source+boarding row
    // isAtBoardStop = false → user needs to walk to a different stop
    //                         → show separate source row + boarding row
    const isAtBoard  = bus.isAtBoardStop  ?? false;
    const isAtAlight = bus.isAtAlightStop ?? false;

    return (
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ padding: "12px 16px", background: "#f8f9fa", borderBottom: "1px solid #f0f0f0" }}>
          <div style={{ fontSize: "18px", fontWeight: "700" }}>{bus.departure} – {bus.arrival}</div>
          <div style={{ fontSize: "13px", color: "#888", marginBottom: "6px" }}>
            {bus.duration} · {aIdx - bIdx} stops on your journey · {all.length} total on route
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
            <span style={{ background: "#1565C0", color: "white", fontSize: "12px", fontWeight: "700", padding: "3px 10px", borderRadius: "6px" }}>🚌 {bus.busNo}</span>
            <span style={{ fontSize: "12px", color: "#666" }}>{bus.via}</span>
          </div>
          <div style={{ display: "flex", gap: "14px", fontSize: "12px", color: "#888" }}>
            <span>{bus.frequency}</span>
            <span>🚶 {isAtBoard ? "At your stop" : bus.walkToStopLabel}</span>
          </div>
          <div style={{ marginTop: "8px", padding: "5px 10px", background: "#E8F5E9", borderRadius: "6px", fontSize: "11px", color: "#2E7D32" }}>
            💰 Fare: ₹{bus.fare} · TSRTC official slab for {totalDistance}
          </div>
        </div>

        <div style={{ padding: "0 16px" }}>

          {/* Bus Origin Terminal */}
          {busOriginName && bIdx > 0 && (
            <TLRow time={preStops[0]?.time ?? ""} title={busOriginName} subtitle="🚌 Bus starts here (origin terminal)"
              dotColor={DOT.busOrigin} dotSize={12} lineColor="#BDBDBD">
              {preChips.length > 0 && (
                <div style={{ marginTop: "6px" }}>
                  <button onClick={() => setPreExpanded(e => !e)}
                    style={{ fontSize: "11px", color: "#1565C0", background: "#E3F2FD", border: "none", borderRadius: "20px", padding: "3px 10px", cursor: "pointer", marginBottom: "6px" }}>
                    {preExpanded ? "▲ Hide" : `▼ ${preChips.length} stop${preChips.length > 1 ? "s" : ""} before your stop`}
                  </button>
                  {preExpanded && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {preChips.map((s, i) => (
                        <span key={i} style={{ fontSize: "10px", color: "#888", background: "#F5F5F5", borderRadius: "4px", padding: "2px 7px", border: "1px solid #e0e0e0" }}>
                          {s.time !== "—" ? `${s.time} · ` : ""}{s.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TLRow>
          )}

          {/* ── SOURCE + BOARDING ─────────────────────────────────
              isAtBoard = true  → ONE row: green dot, user's name, bus badge
              isAtBoard = false → TWO rows: green source + blue boarding with badge

              Using isAtBoardStop (real coord distance < 200m) means:
              "BN Reddy Nagar" (user) and "Sagar X Road" (GTFS stop name)
              at coords 17.341, 78.548 will correctly show as ONE row
              because they're the same physical location, just different names.
          ── */}
          {isAtBoard ? (
            // User is AT the boarding stop — single combined row
            <TLRow
              time={sourceStop?.time ?? bus.departure}
              title={fromName}
              subtitle={`📍 Your source · ${boardStopName}`}
              dotColor={DOT.source} dotSize={18} lineColor={DOT.journey}
              titleColor={DOT.source} bold>
              <BusBadge busNo={bus.busNo} label="Board here" />
            </TLRow>
          ) : (
            // User needs to walk — two separate rows
            <>
              <TLRow
                time="" title={fromName}
                subtitle={`🚶 Walk ~${bus.walkToStop} min to ${boardStopName}`}
                dotColor={DOT.source} dotSize={18} lineColor="#BDBDBD"
                titleColor={DOT.source} bold />
              <TLRow
                time={sourceStop?.time ?? bus.departure}
                title={boardStopName}
                subtitle={`📍 Your source · ${fromName}`}
                dotColor={DOT.boarding} dotSize={14} lineColor={DOT.journey}
                titleColor="#1565C0" bold>
                <BusBadge busNo={bus.busNo} label="Board here" />
              </TLRow>
            </>
          )}

          {/* Intermediate stops */}
          {middleStops.map((s, i) => (
            <TLRow key={i} time={s.time !== "—" ? s.time : ""} title={s.name}
              dotColor={DOT.journey} dotSize={11} lineColor={DOT.journey} />
          ))}

          {/* Alighting / Destination stop */}
          <TLRow
            time={destStop?.time ?? bus.arrival}
            title={alightStopName}
            subtitle={isAtAlight ? `🏁 Alight here · ${toName}` : `🏁 Alight here · nearest stop to ${toName}`}
            dotColor={DOT.dest} dotSize={18}
            lineColor={postStops.length > 0 ? "#BDBDBD" : "none"}
            titleColor={DOT.dest} bold>
            <div style={{ marginTop: "8px", padding: "7px 12px", background: "#FFEBEE", borderRadius: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span>🚶</span>
              <span style={{ fontSize: "12px", color: "#555" }}>
                {isAtAlight
                  ? `You have arrived at ${toName}`
                  : `Walk ~${bus.walkFromStop} min to ${toName}`}
              </span>
            </div>
          </TLRow>

          {/* User's destination pin if alighting differs */}
          {!isAtAlight && (
            <TLRow time="" title={toName} subtitle="📍 Your destination"
              dotColor={DOT.source} dotSize={14} lineColor="none" titleColor={DOT.source} />
          )}

          {/* Bus Terminus */}
          {busTermName && postStops.length > 0 && (
            <TLRow time={postStops[postStops.length - 1]?.time ?? ""} title={busTermName}
              subtitle="🔚 Bus ends here (terminus)"
              dotColor={DOT.busOrigin} dotSize={12} lineColor="none">
              {postChips.length > 0 && (
                <div style={{ marginTop: "6px" }}>
                  <button onClick={() => setPostExpanded(e => !e)}
                    style={{ fontSize: "11px", color: "#666", background: "#F5F5F5", border: "none", borderRadius: "20px", padding: "3px 10px", cursor: "pointer", marginBottom: "6px" }}>
                    {postExpanded ? "▲ Hide" : `▼ ${postChips.length} stop${postChips.length > 1 ? "s" : ""} after your destination`}
                  </button>
                  {postExpanded && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {postChips.map((s, i) => (
                        <span key={i} style={{ fontSize: "10px", color: "#888", background: "#F5F5F5", borderRadius: "4px", padding: "2px 7px", border: "1px solid #e0e0e0" }}>
                          {s.time !== "—" ? `${s.time} · ` : ""}{s.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TLRow>
          )}

          <div style={{ height: "20px" }} />
        </div>
      </div>
    );
  };

  // ── Transfer View ─────────────────────────────────────────────
  const TransferView = ({ tr }: { tr: TransferRoute }) => (
    <div style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ padding: "12px 16px", background: "#f8f9fa", borderBottom: "1px solid #f0f0f0" }}>
        <div style={{ fontSize: "17px", fontWeight: "700" }}>{tr.legs[0]?.depTime} – {tr.arrival}</div>
        <div style={{ fontSize: "13px", color: "#888" }}>{tr.totalTime} · {tr.description}</div>
        <div style={{ fontSize: "12px", color: "#2E7D32", marginTop: "2px" }}>₹{tr.fare} total fare</div>
      </div>
      <div style={{ padding: "0 16px" }}>

        {/* User's source */}
        {(() => {
          const leg0       = tr.legs[0];
          const isAtBoard  = leg0?.isAtBoardStop ?? false;
          const boardStop  = leg0?.stopSchedule?.[leg0?.boardingIdx ?? 0]?.name ?? leg0?.from ?? "";
          return (
            <TLRow time="" title={fromName}
              subtitle={isAtBoard ? `📍 Your source · ${boardStop}` : `🚶 Walk to ${boardStop}`}
              dotColor={DOT.source} dotSize={18}
              lineColor={isAtBoard ? DOT.journey : "#BDBDBD"}
              titleColor={DOT.source} bold>
              {isAtBoard && <BusBadge busNo={leg0?.busNo ?? ""} label={`Board here · ${leg0?.frequency ?? ""}`} />}
            </TLRow>
          );
        })()}

        {tr.legs.map((leg, li) => {
          const all  = leg.stopSchedule ?? [];
          const bIdx = Math.max(0, Math.min(leg.boardingIdx  ?? 0, all.length - 1));
          const aIdx = Math.max(bIdx + 1, Math.min(leg.alightingIdx ?? all.length - 1, all.length - 1));
          const src  = all[bIdx];
          const mid  = all.slice(bIdx + 1, aIdx);
          const dst  = all[aIdx];
          const isLast   = li === tr.legs.length - 1;
          const isFirst  = li === 0;
          const isAtBoard  = isFirst ? (leg.isAtBoardStop ?? false) : false;
          const isAtAlight = isLast  ? (leg.isAtAlightStop ?? false) : false;
          const boardName  = src?.name ?? leg.from;
          const alightName = dst?.name ?? leg.to;

          return (
            <div key={li}>
              {/* Boarding row: skip for first leg when user is already at stop */}
              {(!isFirst || !isAtBoard) && (
                <TLRow
                  time={src?.time ?? leg.depTime}
                  title={boardName}
                  subtitle={isFirst ? `📍 Your source · nearest stop to ${fromName}` : "🔄 Transfer stop"}
                  dotColor={isFirst ? DOT.boarding : "#FF8F00"}
                  dotSize={14} lineColor={DOT.journey}
                  titleColor={isFirst ? "#1565C0" : "#E65100"} bold={isFirst}>
                  <BusBadge busNo={leg.busNo} label={isFirst ? "Board here" : `Board · ${leg.frequency}`} />
                </TLRow>
              )}

              {mid.map((s, si) => (
                <TLRow key={si} time={s.time !== "—" ? s.time : ""} title={s.name}
                  dotColor={DOT.journey} dotSize={10} lineColor={DOT.journey} />
              ))}

              <TLRow
                time={dst?.time ?? leg.arrTime}
                title={alightName}
                subtitle={
                  isLast
                    ? isAtAlight ? `🏁 Alight here · ${toName}` : `🏁 Alight here · nearest stop to ${toName}`
                    : `🔄 Change bus at ${leg.changeAt}`
                }
                dotColor={isLast ? DOT.dest : "#FF8F00"}
                dotSize={16} lineColor={isLast ? "none" : "#e0e0e0"}
                titleColor={isLast ? DOT.dest : "#E65100"} bold={isLast}>
                {isLast && (
                  <div style={{ marginTop: "8px", padding: "7px 12px", background: "#FFEBEE", borderRadius: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>🚶</span>
                    <span style={{ fontSize: "12px", color: "#555" }}>
                      {isAtAlight ? `You have arrived at ${toName}` : `Walk ~${Math.round((leg.walkFromStopM ?? 400) / 80)} min to ${toName}`}
                    </span>
                  </div>
                )}
                {!isLast && leg.changeAt && (
                  <div style={{ marginTop: "8px", padding: "8px 12px", background: "#FFF8E1", borderRadius: "8px", border: "1px solid #FFD54F", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>🔄</span>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: "700", color: "#F57F17" }}>Change at {leg.changeAt}</div>
                      <div style={{ fontSize: "11px", color: "#888" }}>Board {tr.legs[li + 1]?.busNo} · wait ~7 min</div>
                    </div>
                  </div>
                )}
              </TLRow>

              {isLast && !isAtAlight && (
                <TLRow time="" title={toName} subtitle="📍 Your destination"
                  dotColor={DOT.source} dotSize={14} lineColor="none" titleColor={DOT.source} />
              )}
            </div>
          );
        })}

        <div style={{ height: "20px" }} />
      </div>
    </div>
  );

  // ── Bottom bar ────────────────────────────────────────────────
  const BottomBar = () => (
    <div style={{ background: "#fff", padding: "12px 16px", boxShadow: "0 -2px 12px rgba(0,0,0,0.08)", display: "flex", gap: "10px", flexShrink: 0 }}>
      {hasDirect ? (
        <div style={{ flex: 1, background: "#E3F2FD", borderRadius: "10px", padding: "10px 14px" }}>
          <div style={{ fontSize: "11px", color: "#888" }}>Next direct bus</div>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#1565C0" }}>{busInfo.directBuses[0]?.busNo} at {busInfo.directBuses[0]?.departure}</div>
        </div>
      ) : hasTransfer ? (
        <div style={{ flex: 1, background: "#FFF8E1", borderRadius: "10px", padding: "10px 14px" }}>
          <div style={{ fontSize: "11px", color: "#888" }}>Next route</div>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#F57F17" }}>{busInfo.transferRoutes[0]?.legs[0]?.busNo} at {busInfo.transferRoutes[0]?.legs[0]?.depTime}</div>
        </div>
      ) : null}
      <div style={{ flex: 1, background: "#E8F5E9", borderRadius: "10px", padding: "10px 14px" }}>
        <div style={{ fontSize: "11px", color: "#888" }}>Fare from</div>
        <div style={{ fontSize: "13px", fontWeight: "700", color: "#2E7D32" }}>₹{busInfo.fare || calcFare(km)}</div>
      </div>
      <button onClick={onClose} style={{ padding: "10px 18px", background: "#EA4335", color: "white", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>Close</button>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, fontFamily: "'Segoe UI',sans-serif", background: "#fff", display: "flex", flexDirection: "column" }}>
      <Header />
      {!loading && (view === "list" || view === "detail" || view === "transfer") && <LegendBar />}
      {loading  && <LoadingView />}
      {!loading && view === "list"     && <ListView />}
      {!loading && view === "detail"   && selBus && <DetailView bus={selBus} />}
      {!loading && view === "transfer" && selTr  && <TransferView tr={selTr} />}
      {view === "map" && (
        <div style={{ flex: 1, position: "relative" }}>
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
          <button onClick={() => setView("list")} style={{ position: "absolute", top: "12px", left: "12px", background: "white", border: "none", borderRadius: "8px", padding: "8px 12px", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", zIndex: 1000, cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>← Routes</button>
        </div>
      )}
      {view !== "map" && !loading && <BottomBar />}
    </div>
  );
}