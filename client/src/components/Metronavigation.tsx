"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import MetroTicket from "./MetroTicket";

// ─── Hyderabad Metro hardcoded data ──────────────────────────────────────────

interface MetroStation {
  name: string;
  lat: number;
  lon: number;
}

interface MetroLineData {
  color: string;
  displayName: string;
  stations: MetroStation[];
}

const METRO_LINES: Record<string, MetroLineData> = {
  red: {
    color: "#E53935",
    displayName: "Red Line",
    stations: [
      { name: "Miyapur",                 lat: 17.4969, lon: 78.3541 },
      { name: "JNTU College",            lat: 17.4950, lon: 78.3628 },
      { name: "KPHB Colony",             lat: 17.4924, lon: 78.3726 },
      { name: "Kukatpally",              lat: 17.4849, lon: 78.3940 },
      { name: "Balanagar",               lat: 17.4762, lon: 78.4148 },
      { name: "Moosapet",                lat: 17.4680, lon: 78.4263 },
      { name: "Bharat Nagar",            lat: 17.4607, lon: 78.4345 },
      { name: "Erragadda",               lat: 17.4540, lon: 78.4400 },
      { name: "ESI Hospital",            lat: 17.4476, lon: 78.4433 },
      { name: "SR Nagar",                lat: 17.4414, lon: 78.4466 },
      { name: "Ameerpet",                lat: 17.4374, lon: 78.4487 },
      { name: "Punjagutta",              lat: 17.4318, lon: 78.4496 },
      { name: "Irrum Manzil",            lat: 17.4261, lon: 78.4502 },
      { name: "Khairatabad",             lat: 17.4211, lon: 78.4515 },
      { name: "Lakdi-Ka-Pul",            lat: 17.4160, lon: 78.4540 },
      { name: "Assembly",                lat: 17.4084, lon: 78.4614 },
      { name: "Nampally",                lat: 17.4006, lon: 78.4687 },
      { name: "Gandhi Bhavan",           lat: 17.3950, lon: 78.4728 },
      { name: "Osmania Medical College", lat: 17.3888, lon: 78.4754 },
      { name: "MG Bus Station",          lat: 17.3784, lon: 78.4803 },
      { name: "Malakpet",                lat: 17.3668, lon: 78.4883 },
      { name: "New Market",              lat: 17.3589, lon: 78.4954 },
      { name: "Musarambagh",             lat: 17.3503, lon: 78.5014 },
      { name: "Dilsukhnagar",            lat: 17.3680, lon: 78.5260 },
      { name: "Chaitanyapuri",           lat: 17.3590, lon: 78.5338 },
      { name: "Victoria Memorial",       lat: 17.3500, lon: 78.5398 },
      { name: "LB Nagar",                lat: 17.3463, lon: 78.5538 },
    ],
  },
  blue: {
    color: "#1E88E5",
    displayName: "Blue Line",
    stations: [
      { name: "Nagole",                        lat: 17.3952, lon: 78.5545 },
      { name: "Uppal",                         lat: 17.4052, lon: 78.5589 },
      { name: "Stadium",                       lat: 17.4074, lon: 78.5424 },
      { name: "NGRI",                          lat: 17.4125, lon: 78.5345 },
      { name: "Habsiguda",                     lat: 17.4182, lon: 78.5302 },
      { name: "Tarnaka",                       lat: 17.4250, lon: 78.5338 },
      { name: "Mettuguda",                     lat: 17.4275, lon: 78.5230 },
      { name: "Secunderabad East",             lat: 17.4345, lon: 78.5094 },
      { name: "Parade Ground",                 lat: 17.4380, lon: 78.4991 },
      { name: "Paradise",                      lat: 17.4455, lon: 78.4973 },
      { name: "Rasoolpura",                    lat: 17.4490, lon: 78.4878 },
      { name: "Prakash Nagar",                 lat: 17.4523, lon: 78.4810 },
      { name: "Begumpet",                      lat: 17.4440, lon: 78.4624 },
      { name: "Ameerpet",                      lat: 17.4374, lon: 78.4487 },
      { name: "Madhura Nagar",                 lat: 17.4322, lon: 78.4214 },
      { name: "Yusufguda",                     lat: 17.4310, lon: 78.4078 },
      { name: "Banjara Hills Road No.12",      lat: 17.4248, lon: 78.3991 },
      { name: "Jubilee Hills Road No.5",       lat: 17.4219, lon: 78.3874 },
      { name: "Jubilee Hills Check Post",      lat: 17.4301, lon: 78.3803 },
      { name: "Peddamma Temple",               lat: 17.4387, lon: 78.3741 },
      { name: "Madhapur",                      lat: 17.4472, lon: 78.3900 },
      { name: "Durgam Cheruvu",               lat: 17.4483, lon: 78.3801 },
      { name: "Hi-Tech City",                  lat: 17.4474, lon: 78.3744 },
      { name: "Raidurg",                       lat: 17.4388, lon: 78.3564 },
    ],
  },
  green: {
    color: "#43A047",
    displayName: "Green Line",
    stations: [
      { name: "JBS Parade Ground",   lat: 17.4436, lon: 78.4980 },
      { name: "Secunderabad West",   lat: 17.4380, lon: 78.4896 },
      { name: "Gandhi Hospital",     lat: 17.4318, lon: 78.4840 },
      { name: "Musheerabad",         lat: 17.4256, lon: 78.4817 },
      { name: "RTC X Roads",         lat: 17.4170, lon: 78.4773 },
      { name: "Chikkadpally",        lat: 17.4047, lon: 78.4973 },
      { name: "Narayanguda",         lat: 17.3953, lon: 78.4895 },
      { name: "Sultan Bazar",        lat: 17.3871, lon: 78.4808 },
      { name: "MG Bus Station",      lat: 17.3784, lon: 78.4803 },
    ],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findStationObj(name: string): { line: string; station: MetroStation } | null {
  for (const [lineKey, lineData] of Object.entries(METRO_LINES)) {
    const st = lineData.stations.find(s => s.name === name);
    if (st) return { line: lineKey, station: st };
  }
  if (name === "Parade Ground") {
    const st = METRO_LINES.blue.stations.find(s => s.name === "Parade Ground");
    if (st) return { line: "blue", station: st };
  }
  if (name === "JBS Parade Ground") {
    const st = METRO_LINES.green.stations.find(s => s.name === "JBS Parade Ground");
    if (st) return { line: "green", station: st };
  }
  return null;
}

function getStationsBetween(fromName: string, toName: string, lineKey: string): MetroStation[] {
  const line = METRO_LINES[lineKey];
  if (!line) return [];
  const stations = line.stations;
  const fi = stations.findIndex(s => s.name === fromName);
  const ti = stations.findIndex(s => s.name === toName);
  if (fi === -1 || ti === -1) return [];
  const [lo, hi] = fi <= ti ? [fi, ti] : [ti, fi];
  const seg = stations.slice(lo, hi + 1);
  return fi <= ti ? seg : [...seg].reverse();
}

function distanceM(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const sin2 =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(sin2), Math.sqrt(1 - sin2));
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetroInfo {
  fromStation: string;
  toStation: string;
  fromLine: string;
  toLine?: string;
  needsChange: boolean;
  changeAt?: string | null;
  changeToLine?: string | null;
  change2At?: string | null;
  change2ToLine?: string | null;
  stations?: string[];
  stationCount?: number;
  walkToBoard?: string;
  walkFromAlight?: string;
  routeType?: string;
  boardingIsNameMatch?: boolean;
  alightingIsNameMatch?: boolean;
  fare?: number;
  leg1?: { line: string; stations: string[] };
  leg2?: { line: string; stations: string[] };
  leg3?: { line: string; stations: string[] };
}

interface ResolvedRoute {
  fromStation: MetroStation;
  toStation: MetroStation;
  fromLine: string;
  toLine: string;
  needsChange: boolean;
  changeAt: MetroStation | null;
  changeToLine: string | null;
  change2At: MetroStation | null;
  change2ToLine: string | null;
  leg1Stations: MetroStation[];
  leg2Stations: MetroStation[];
  leg3Stations: MetroStation[];
  allStations: MetroStation[];
  stationLeg: number[];
}

interface MetroNavigationProps {
  from: string;
  to: string;
  fromCoords: [number, number];
  toCoords: [number, number];
  metroInfo: MetroInfo | null;
  totalTime: number | string;
  totalDistance: string;
  onClose: () => void;
}

// ─── Core route resolver ──────────────────────────────────────────────────────

function resolveMetroRoute(metroInfo: MetroInfo): ResolvedRoute | null {
  const fromEntry = findStationObj(metroInfo.fromStation);
  const toEntry   = findStationObj(metroInfo.toStation);
  if (!fromEntry || !toEntry) return null;

  const fromLine = metroInfo.fromLine || fromEntry.line;
  const toLine   = metroInfo.toLine   || toEntry.line;

  // ── DOUBLE INTERCHANGE ────────────────────────────────────────────────────
  if (metroInfo.routeType === "double_interchange" && metroInfo.changeAt && metroInfo.change2At) {
    const ic1 = findStationObj(metroInfo.changeAt);
    const ic2 = findStationObj(metroInfo.change2At);
    if (!ic1 || !ic2) return null;

    const changeToLine  = metroInfo.changeToLine  || "red";
    const change2ToLine = metroInfo.change2ToLine || toLine;

    let leg1Stations: MetroStation[];
    let leg2Stations: MetroStation[];
    let leg3Stations: MetroStation[];

    if (metroInfo.leg1?.stations?.length) {
      leg1Stations = metroInfo.leg1.stations.map(n => findStationObj(n)?.station).filter(Boolean) as MetroStation[];
    } else {
      leg1Stations = getStationsBetween(metroInfo.fromStation, metroInfo.changeAt, fromLine);
    }
    if (metroInfo.leg2?.stations?.length) {
      leg2Stations = metroInfo.leg2.stations.map(n => findStationObj(n)?.station).filter(Boolean) as MetroStation[];
    } else {
      leg2Stations = getStationsBetween(metroInfo.changeAt, metroInfo.change2At, changeToLine);
    }
    if (metroInfo.leg3?.stations?.length) {
      leg3Stations = metroInfo.leg3.stations.map(n => findStationObj(n)?.station).filter(Boolean) as MetroStation[];
    } else {
      leg3Stations = getStationsBetween(metroInfo.change2At, metroInfo.toStation, change2ToLine);
    }

    const allStations = [
      ...leg1Stations,
      ...leg2Stations.slice(1),
      ...leg3Stations.slice(1),
    ];
    const stationLeg = [
      ...leg1Stations.map(() => 0),
      ...leg2Stations.slice(1).map(() => 1),
      ...leg3Stations.slice(1).map(() => 2),
    ];

    return {
      fromStation: fromEntry.station, toStation: toEntry.station,
      fromLine, toLine: change2ToLine,
      needsChange: true,
      changeAt: ic1.station, changeToLine,
      change2At: ic2.station, change2ToLine,
      leg1Stations, leg2Stations, leg3Stations,
      allStations, stationLeg,
    };
  }

  // ── SINGLE INTERCHANGE ────────────────────────────────────────────────────
  if (metroInfo.needsChange && metroInfo.changeAt) {
    const changeToLine = metroInfo.changeToLine || toLine;

    let leg1Stations: MetroStation[];
    let leg2Stations: MetroStation[];

    if (metroInfo.leg1?.stations?.length) {
      leg1Stations = metroInfo.leg1.stations.map(n => findStationObj(n)?.station).filter(Boolean) as MetroStation[];
    } else {
      leg1Stations = getStationsBetween(metroInfo.fromStation, metroInfo.changeAt, fromLine);
    }

    if (metroInfo.leg2?.stations?.length) {
      leg2Stations = metroInfo.leg2.stations.map(n => findStationObj(n)?.station).filter(Boolean) as MetroStation[];
    } else {
      const leg2FromName = (fromLine === "blue" && changeToLine === "green")
        ? "JBS Parade Ground"
        : (fromLine === "green" && changeToLine === "blue")
          ? "Parade Ground"
          : metroInfo.changeAt;
      leg2Stations = getStationsBetween(leg2FromName, metroInfo.toStation, changeToLine);
    }

    if (leg1Stations.length === 0 || leg2Stations.length === 0) return null;

    const isCrossNameIC = (
      (fromLine === "blue"  && changeToLine === "green") ||
      (fromLine === "green" && changeToLine === "blue")
    );

    const allStations = isCrossNameIC
      ? [...leg1Stations, ...leg2Stations]
      : [...leg1Stations, ...leg2Stations.slice(1)];

    const stationLeg = isCrossNameIC
      ? [...leg1Stations.map(() => 0), ...leg2Stations.map(() => 1)]
      : [...leg1Stations.map(() => 0), ...leg2Stations.slice(1).map(() => 1)];

    const changeAtStation = leg1Stations[leg1Stations.length - 1];

    return {
      fromStation: fromEntry.station, toStation: toEntry.station,
      fromLine, toLine: changeToLine,
      needsChange: true,
      changeAt: changeAtStation || null,
      changeToLine,
      change2At: null, change2ToLine: null,
      leg1Stations, leg2Stations, leg3Stations: [],
      allStations, stationLeg,
    };
  }

  // ── DIRECT ────────────────────────────────────────────────────────────────
  let leg1Stations: MetroStation[];
  if (metroInfo.leg1?.stations?.length) {
    leg1Stations = metroInfo.leg1.stations.map(n => findStationObj(n)?.station).filter(Boolean) as MetroStation[];
  } else {
    leg1Stations = getStationsBetween(metroInfo.fromStation, metroInfo.toStation, fromLine);
  }
  if (leg1Stations.length === 0) return null;

  return {
    fromStation: fromEntry.station, toStation: toEntry.station,
    fromLine, toLine: fromLine,
    needsChange: false,
    changeAt: null, changeToLine: null,
    change2At: null, change2ToLine: null,
    leg1Stations, leg2Stations: [], leg3Stations: [],
    allStations: leg1Stations,
    stationLeg: leg1Stations.map(() => 0),
  };
}

function legColor(resolved: ResolvedRoute, legIdx: number): string {
  if (legIdx === 0) return METRO_LINES[resolved.fromLine]?.color || "#E53935";
  if (legIdx === 1) {
    const line = resolved.changeToLine || resolved.toLine;
    return METRO_LINES[line]?.color || "#1E88E5";
  }
  if (legIdx === 2) {
    const line = resolved.change2ToLine || resolved.toLine;
    return METRO_LINES[line]?.color || "#43A047";
  }
  return "#888";
}

function legName(resolved: ResolvedRoute, legIdx: number): string {
  if (legIdx === 0) return METRO_LINES[resolved.fromLine]?.displayName || "Metro";
  if (legIdx === 1) {
    const line = resolved.changeToLine || resolved.toLine;
    return METRO_LINES[line]?.displayName || "Metro";
  }
  if (legIdx === 2) {
    const line = resolved.change2ToLine || resolved.toLine;
    return METRO_LINES[line]?.displayName || "Metro";
  }
  return "Metro";
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MetroNavigation({
  from, to, fromCoords, toCoords,
  metroInfo, totalTime, totalDistance, onClose,
}: MetroNavigationProps) {

  // ── NEW: ticket modal state ───────────────────────────────────────────────
  const [showTicket, setShowTicket] = useState(false);

  if (!metroInfo) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ background: "#fff", borderRadius: "16px", padding: "28px 24px", maxWidth: "340px", width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🚇</div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "#1a1a1a", marginBottom: "8px" }}>Metro not available</div>
          <div style={{ fontSize: "13px", color: "#666", marginBottom: "20px" }}>No metro route found between these locations.</div>
          <button onClick={onClose} style={{ padding: "10px 24px", background: "#E53935", color: "white", border: "none", borderRadius: "10px", fontWeight: "700", cursor: "pointer" }}>Close</button>
        </div>
      </div>
    );
  }

  const resolved = resolveMetroRoute(metroInfo);

  if (!resolved) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ background: "#fff", borderRadius: "16px", padding: "28px 24px", maxWidth: "360px", width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "14px" }}>🚇</div>
          <div style={{ fontSize: "17px", fontWeight: "700", color: "#1a1a1a", marginBottom: "8px" }}>Metro Not Available</div>
          <div style={{ fontSize: "13px", color: "#666", lineHeight: "1.7", marginBottom: "20px" }}>
            Sorry, there is no metro route between<br />
            <strong>{from.split(",")[0]}</strong> → <strong>{to.split(",")[0]}</strong>
          </div>
          <button onClick={onClose} style={{ padding: "11px 28px", background: "#E53935", color: "white", border: "none", borderRadius: "10px", fontWeight: "700", cursor: "pointer" }}>Close</button>
        </div>
      </div>
    );
  }

  const totalTimeNum = typeof totalTime === "string" ? parseInt(totalTime) || 42 : totalTime;
  const allStations  = resolved.allStations;
  const fromLineData = METRO_LINES[resolved.fromLine];
  const fromColor    = fromLineData?.color || "#E53935";
  const metroFare    = metroInfo.fare || 35;

  const lines: { line: string; color: string; name: string }[] = [];
  const addLine = (line: string) => {
    if (line && !lines.find(l => l.line === line) && METRO_LINES[line]) {
      lines.push({ line, color: METRO_LINES[line].color, name: METRO_LINES[line].displayName });
    }
  };
  addLine(resolved.fromLine);
  if (resolved.changeToLine)  addLine(resolved.changeToLine);
  if (resolved.change2ToLine) addLine(resolved.change2ToLine);

  const [phase, setPhase]                   = useState<"choice" | "explore">("choice");
  const [tab,   setTab]                     = useState<"map" | "stations">("map");
  const [currentStopIdx, setCurrentStopIdx] = useState(0);
  const [etaMin, setEtaMin]                 = useState(totalTimeNum);
  const [gpsError, setGpsError]             = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<any>(null);
  const initedRef       = useRef(false);
  const allLayersRef    = useRef<any[]>([]);
  const liveDotRef      = useRef<any>(null);
  const watchIdRef      = useRef<number | null>(null);
  const simIntervalRef  = useRef<any>(null);

  const stationCoords: [number, number][] = allStations.map(s => [s.lat, s.lon]);
  const currentLegIdx   = resolved.stationLeg[currentStopIdx] ?? 0;
  const lineColor       = legColor(resolved, currentLegIdx);
  const lineDisplayName = legName(resolved, currentLegIdx);

  const startSimulation = useCallback((stCoords: [number, number][]) => {
    let idx = 0;
    simIntervalRef.current = setInterval(() => {
      if (idx >= stCoords.length - 1) { clearInterval(simIntervalRef.current); return; }
      idx++;
      setCurrentStopIdx(idx);
      const remaining = stCoords.length - idx - 1;
      setEtaMin(Math.round((remaining / Math.max(stCoords.length - 1, 1)) * totalTimeNum));
      if (liveDotRef.current && mapRef.current) {
        liveDotRef.current.setLatLng(stCoords[idx]);
        mapRef.current.setView(stCoords[idx], 14, { animate: true, duration: 1.2 });
      }
    }, 8000);
  }, [totalTimeNum]);

  const startGPS = useCallback((stCoords: [number, number][]) => {
    if (!navigator.geolocation) { setGpsError(true); startSimulation(stCoords); return; }
    const id = navigator.geolocation.watchPosition(
      pos => {
        const userPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setGpsError(false);
        let nearestIdx = 0, nearestDist = Infinity;
        stCoords.forEach((sc, i) => { const d = distanceM(userPos, sc); if (d < nearestDist) { nearestDist = d; nearestIdx = i; } });
        setCurrentStopIdx(prev => Math.max(prev, nearestIdx));
        setEtaMin(Math.round(((stCoords.length - nearestIdx - 1) / Math.max(stCoords.length - 1, 1)) * totalTimeNum));
        if (liveDotRef.current && mapRef.current) {
          liveDotRef.current.setLatLng(stCoords[nearestIdx]);
          mapRef.current.setView(stCoords[nearestIdx], 14, { animate: true, duration: 1 });
        }
      },
      () => { setGpsError(true); startSimulation(stCoords); },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
    watchIdRef.current = id;
  }, [totalTimeNum, startSimulation]);

  useEffect(() => {
    if (phase !== "explore" || tab !== "map") return;
    if (initedRef.current || !mapContainerRef.current) return;
    initedRef.current = true;

    import("leaflet").then(L => {
      if (!mapContainerRef.current || mapRef.current) return;
      const el = mapContainerRef.current as any;
      if (el._leaflet_id) el._leaflet_id = null;

      const map = L.map(mapContainerRef.current, {
        center: [resolved.fromStation.lat, resolved.fromStation.lon],
        zoom: 13, zoomControl: false, attributionControl: false,
      });
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        { subdomains: "abcd", maxZoom: 20 }
      ).addTo(map);
      mapRef.current = map;

      const drawLeg = (stations: MetroStation[], color: string, lineKey: string) => {
        if (stations.length < 2) return;
        const coords: [number, number][] = stations.map(s => [s.lat, s.lon]);
        allLayersRef.current.push(L.polyline(coords, { color, weight: 18, opacity: 0.15 }).addTo(map));
        allLayersRef.current.push(L.polyline(coords, { color, weight: 6, opacity: 1, lineJoin: "round", lineCap: "round" }).addTo(map));
        const mid = coords[Math.floor(coords.length / 2)];
        const badge = L.divIcon({
          className: "",
          html: `<div style="background:${color};color:white;font-size:10px;font-weight:800;padding:3px 10px;border-radius:20px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);white-space:nowrap;">🚇 ${METRO_LINES[lineKey]?.displayName || "Metro"}</div>`,
          iconAnchor: [50, 12],
        });
        allLayersRef.current.push(L.marker(mid, { icon: badge }).addTo(map));
      };

      drawLeg(resolved.leg1Stations, legColor(resolved, 0), resolved.fromLine);
      if (resolved.leg2Stations.length > 1) {
        const l2 = resolved.changeToLine || resolved.toLine;
        drawLeg(resolved.leg2Stations, legColor(resolved, 1), l2);
      }
      if (resolved.leg3Stations.length > 1) {
        const l3 = resolved.change2ToLine || resolved.toLine;
        drawLeg(resolved.leg3Stations, legColor(resolved, 2), l3);
      }

      const walkStyle = { color: "#78909C", weight: 3, dashArray: "6 5", opacity: 0.8 };
      if (fromCoords) {
        const fc: [number, number] = fromCoords;
        const fs: [number, number] = [resolved.fromStation.lat, resolved.fromStation.lon];
        if (distanceM(fc, fs) > 50)
          allLayersRef.current.push(L.polyline([fc, fs], walkStyle).addTo(map));
      }
      if (toCoords) {
        const tc: [number, number] = toCoords;
        const ts: [number, number] = [resolved.toStation.lat, resolved.toStation.lon];
        if (distanceM(tc, ts) > 50)
          allLayersRef.current.push(L.polyline([ts, tc], walkStyle).addTo(map));
      }

      allStations.forEach((station, i) => {
        const isFirst  = i === 0;
        const isLast   = i === allStations.length - 1;
        const isChange = resolved.changeAt?.name === station.name || resolved.change2At?.name === station.name;
        const lIdx     = resolved.stationLeg[i] ?? 0;
        const dotColor = isChange ? "#FFA000" : legColor(resolved, lIdx);
        const dotSize  = isFirst || isLast ? 14 : isChange ? 13 : 9;
        const filled   = isFirst || isLast || isChange;

        const icon = L.divIcon({
          className: "",
          html: `<div style="width:${dotSize}px;height:${dotSize}px;background:${filled ? dotColor : "white"};border:${isFirst || isLast ? "3px" : "2px"} solid ${dotColor};border-radius:50%;box-shadow:${isFirst || isLast ? `0 0 0 4px ${dotColor}25,` : ""}0 1px 5px rgba(0,0,0,0.3);"></div>`,
          iconAnchor: [dotSize / 2, dotSize / 2],
        });

        const showLabel = isFirst || isLast || isChange;
        const marker = L.marker([station.lat, station.lon], { icon })
          .addTo(map)
          .bindTooltip(station.name, { permanent: showLabel, direction: i % 2 === 0 ? "top" : "bottom", offset: [0, -8] });
        allLayersRef.current.push(marker);
      });

      if (resolved.changeAt) {
        const ci = L.divIcon({
          className: "",
          html: `<div style="background:#FFA000;color:white;font-size:10px;font-weight:800;padding:4px 10px;border-radius:20px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap;">🔄 ${resolved.changeAt.name}</div>`,
          iconAnchor: [50, -16],
        });
        allLayersRef.current.push(L.marker([resolved.changeAt.lat, resolved.changeAt.lon], { icon: ci }).addTo(map));
      }
      if (resolved.change2At) {
        const ci2 = L.divIcon({
          className: "",
          html: `<div style="background:#FFA000;color:white;font-size:10px;font-weight:800;padding:4px 10px;border-radius:20px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);white-space:nowrap;">🔄 ${resolved.change2At.name}</div>`,
          iconAnchor: [50, -16],
        });
        allLayersRef.current.push(L.marker([resolved.change2At.lat, resolved.change2At.lon], { icon: ci2 }).addTo(map));
      }

      const dotIcon = L.divIcon({
        className: "",
        html: `<div style="width:22px;height:22px;background:${fromColor};border:3px solid white;border-radius:50%;box-shadow:0 0 0 6px ${fromColor}35,0 2px 10px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:11px;">🚇</div>`,
        iconAnchor: [11, 11],
      });
      liveDotRef.current = L.marker([resolved.fromStation.lat, resolved.fromStation.lon], { icon: dotIcon, zIndexOffset: 1000 }).addTo(map);
      allLayersRef.current.push(liveDotRef.current);

      const allCoords: [number, number][] = [
        ...allStations.map(s => [s.lat, s.lon] as [number, number]),
        fromCoords, toCoords,
      ].filter(Boolean) as [number, number][];
      const bounds = L.latLngBounds(allCoords);
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [70, 70] });

      startGPS(stationCoords);
    });

    return () => {
      if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
      if (simIntervalRef.current)      { clearInterval(simIntervalRef.current); simIntervalRef.current = null; }
      allLayersRef.current.forEach(l => { try { mapRef.current?.removeLayer(l); } catch {} });
      allLayersRef.current = [];
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; initedRef.current = false; }
    };
  }, [phase, tab]);

  useEffect(() => {
    if (!liveDotRef.current || !mapRef.current) return;
    const color = legColor(resolved, currentLegIdx);
    import("leaflet").then(L => {
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:22px;height:22px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 0 0 6px ${color}35,0 2px 10px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:11px;">🚇</div>`,
        iconAnchor: [11, 11],
      });
      liveDotRef.current?.setIcon(icon);
    });
  }, [currentStopIdx]);

  const handleClose = () => {
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
    if (simIntervalRef.current)      { clearInterval(simIntervalRef.current); simIntervalRef.current = null; }
    onClose();
  };

  // ─── CHOICE SCREEN ────────────────────────────────────────────────────────
  if (phase === "choice") {
    return (
      <>
        {/* ── MetroTicket modal — rendered on top when showTicket is true ── */}
        {showTicket && (
          <MetroTicket
            metroInfo={{
              fromStation:    resolved.fromStation.name,
              toStation:      resolved.toStation.name,
              fromLine:       resolved.fromLine,
              toLine:         resolved.toLine,
              needsChange:    resolved.needsChange,
              changeAt:       resolved.changeAt?.name ?? null,
              changeToLine:   resolved.changeToLine ?? null,
              stationCount:   allStations.length,
              walkToBoard:    metroInfo.walkToBoard    ?? "At station",
              walkFromAlight: metroInfo.walkFromAlight ?? "At station",
              fare:           metroFare,
              stations:       allStations.map(s => s.name),
              leg1:           metroInfo.leg1 ?? null,
              leg2:           metroInfo.leg2 ?? null,
            }}
            from={from}
            to={to}
            onClose={() => setShowTicket(false)}
          />
        )}

        <div style={{ position: "fixed", inset: 0, zIndex: 3000, fontFamily: "'Segoe UI', sans-serif", display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(0,0,0,0.55)" }}>
          <div style={{ background: "#fff", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: "520px", boxShadow: "0 -8px 40px rgba(0,0,0,0.2)", overflow: "hidden" }}>

            <div style={{ background: fromColor, padding: "20px 24px 18px" }}>
              <div style={{ width: "36px", height: "4px", background: "rgba(255,255,255,0.4)", borderRadius: "2px", margin: "0 auto 16px" }} />
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "44px", height: "44px", background: "rgba(0,0,0,0.2)", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>🚇</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "17px", fontWeight: "700", color: "white" }}>Metro Route</div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", marginTop: "2px" }}>{from.split(",")[0]} → {to.split(",")[0]}</div>
                </div>
                <button onClick={handleClose} style={{ background: "rgba(0,0,0,0.2)", border: "none", color: "white", width: "32px", height: "32px", borderRadius: "50%", fontSize: "16px", cursor: "pointer", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>

              <div style={{ display: "flex", gap: "20px", marginTop: "14px" }}>
                {[
                  { icon: "⏱️", val: `${totalTimeNum} min`       },
                  { icon: "📍", val: totalDistance                 },
                  { icon: "🚉", val: `${allStations.length} stops` },
                  { icon: "🎫", val: `₹${metroFare} fare`          },
                ].map(s => (
                  <div key={s.val} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "13px" }}>{s.icon}</div>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.9)", fontWeight: "600", marginTop: "2px" }}>{s.val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: "14px 24px 0" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                {lines.map((l) => (
                  <span key={l.line} style={{ background: `${l.color}18`, color: l.color, fontSize: "12px", fontWeight: "700", padding: "4px 12px", borderRadius: "999px", border: `1.5px solid ${l.color}40` }}>
                    ● {l.name}
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px", flexWrap: "wrap" }}>
                <div style={{ fontSize: "12px", color: "#333", fontWeight: "700" }}>{resolved.fromStation.name}</div>
                {resolved.changeAt ? (
                  <>
                    <div style={{ flex: 1, minWidth: "20px", height: "3px", background: `linear-gradient(to right,${legColor(resolved,0)},#FFA000)`, borderRadius: "2px" }} />
                    <div style={{ fontSize: "10px", background: "#FFF3E0", color: "#F57C00", padding: "2px 7px", borderRadius: "8px", fontWeight: "700", whiteSpace: "nowrap" }}>🔄 {resolved.changeAt.name}</div>
                    {resolved.change2At ? (
                      <>
                        <div style={{ flex: 1, minWidth: "20px", height: "3px", background: `linear-gradient(to right,#FFA000,${legColor(resolved,1)})`, borderRadius: "2px" }} />
                        <div style={{ fontSize: "10px", background: "#FFF3E0", color: "#F57C00", padding: "2px 7px", borderRadius: "8px", fontWeight: "700", whiteSpace: "nowrap" }}>🔄 {resolved.change2At.name}</div>
                        <div style={{ flex: 1, minWidth: "20px", height: "3px", background: `linear-gradient(to right,#FFA000,${legColor(resolved,2)})`, borderRadius: "2px" }} />
                      </>
                    ) : (
                      <div style={{ flex: 1, minWidth: "20px", height: "3px", background: `linear-gradient(to right,#FFA000,${legColor(resolved,1)})`, borderRadius: "2px" }} />
                    )}
                  </>
                ) : (
                  <div style={{ flex: 1, minWidth: "20px", height: "3px", background: fromColor, borderRadius: "2px" }} />
                )}
                <div style={{ fontSize: "12px", color: "#333", fontWeight: "700" }}>{resolved.toStation.name}</div>
              </div>

              {(metroInfo.walkToBoard || metroInfo.walkFromAlight) && (
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                  {metroInfo.walkToBoard && metroInfo.walkToBoard !== "At station" && (
                    <span style={{ fontSize: "11px", background: "#f5f5f5", color: "#666", padding: "3px 10px", borderRadius: "999px" }}>
                      🚶 Walk to board: {metroInfo.walkToBoard}
                    </span>
                  )}
                  {metroInfo.walkFromAlight && metroInfo.walkFromAlight !== "At station" && (
                    <span style={{ fontSize: "11px", background: "#f5f5f5", color: "#666", padding: "3px 10px", borderRadius: "999px" }}>
                      🚶 Walk after: {metroInfo.walkFromAlight}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: "0 24px 28px", display: "flex", flexDirection: "column", gap: "12px" }}>

              {/* ── OPTION 1: Book Metro Ticket → opens MetroTicket component ── */}
              <div
                onClick={() => setShowTicket(true)}
                style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", borderRadius: "14px", border: "1.5px solid #e0e0e0", cursor: "pointer", background: "#fafafa" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#f0f4ff")}
                onMouseLeave={e => (e.currentTarget.style.background = "#fafafa")}
              >
                <div style={{ width: "50px", height: "50px", background: "#002970", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", flexShrink: 0 }}>🎫</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "700", fontSize: "15px", color: "#1a1a1a" }}>Book Metro Ticket</div>
                  <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
                    Smart ticket · {resolved.fromStation.name} → {resolved.toStation.name}
                  </div>
                </div>
                <div style={{ background: "#002970", color: "white", fontSize: "11px", fontWeight: "700", padding: "4px 12px", borderRadius: "20px", whiteSpace: "nowrap" }}>Open ›</div>
              </div>

              {/* ── OPTION 2: Explore Metro Route (unchanged) ── */}
              <div
                onClick={() => setPhase("explore")}
                style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", borderRadius: "14px", border: `1.5px solid ${fromColor}50`, cursor: "pointer", background: `${fromColor}08` }}
                onMouseEnter={e => (e.currentTarget.style.background = `${fromColor}18`)}
                onMouseLeave={e => (e.currentTarget.style.background = `${fromColor}08`)}
              >
                <div style={{ width: "50px", height: "50px", background: fromColor, borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", flexShrink: 0 }}>🗺️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "700", fontSize: "15px", color: "#1a1a1a" }}>Explore Metro Route</div>
                  <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>Live map · {allStations.length} stations · Step-by-step</div>
                </div>
                <span style={{ fontSize: "22px", color: fromColor, fontWeight: "700" }}>›</span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ─── EXPLORE SCREEN ───────────────────────────────────────────────────────
  const stopsRemaining = allStations.length - 1 - currentStopIdx;
  const currentStation = allStations[currentStopIdx] ?? resolved.fromStation;
  const nextStation    = allStations[currentStopIdx + 1] ?? resolved.toStation;

  const interchangeNames = new Set([
    resolved.changeAt?.name,
    resolved.change2At?.name,
  ].filter(Boolean) as string[]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, fontFamily: "'Segoe UI', sans-serif", display: "flex", flexDirection: "column", background: "#f4f6f9" }}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      <div style={{ background: lineColor, padding: "44px 16px 0", flexShrink: 0, boxShadow: "0 2px 12px rgba(0,0,0,0.2)", transition: "background 0.5s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <button onClick={handleClose} style={{ background: "rgba(0,0,0,0.2)", border: "none", color: "white", width: "36px", height: "36px", borderRadius: "50%", fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", flexShrink: 0 }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
              {lineDisplayName} · Current station
            </div>
            <div style={{ fontSize: "17px", fontWeight: "700", color: "white" }}>🚇 {currentStation.name}</div>
            {stopsRemaining > 0 && (
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.85)", marginTop: "2px" }}>
                Next: {nextStation.name}
                {interchangeNames.has(nextStation.name) && " 🔄 Change here"}
              </div>
            )}
          </div>
          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "12px", padding: "8px 12px", textAlign: "center", flexShrink: 0 }}>
            <div style={{ fontSize: "20px", fontWeight: "800", color: "white" }}>{etaMin}</div>
            <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.8)" }}>min left</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
          <div style={{ flex: 1, height: "6px", background: "rgba(255,255,255,0.25)", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(currentStopIdx / Math.max(allStations.length - 1, 1)) * 100}%`, background: "white", borderRadius: "3px", transition: "width 1s ease" }} />
          </div>
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap" }}>{currentStopIdx + 1}/{allStations.length}</div>
        </div>

        {gpsError && (
          <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "5px 10px", marginTop: "6px", fontSize: "11px", color: "rgba(255,255,255,0.85)" }}>
            📡 GPS unavailable — simulating movement
          </div>
        )}

        <div style={{ display: "flex", borderBottom: "2px solid rgba(255,255,255,0.2)", marginTop: "10px" }}>
          {(["map", "stations"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "10px", background: "none", border: "none", color: tab === t ? "white" : "rgba(255,255,255,0.6)", fontWeight: tab === t ? "700" : "400", fontSize: "13px", cursor: "pointer", borderBottom: tab === t ? "2px solid white" : "2px solid transparent", marginBottom: "-2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {t === "map" ? "🗺️ Live Map" : "🚉 Stations"}
            </button>
          ))}
        </div>
      </div>

      {tab === "map" && (
        <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
          <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

          <div style={{ position: "absolute", bottom: "80px", left: "12px", right: "12px", zIndex: 500, background: "white", borderRadius: "14px", padding: "12px 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", background: `${lineColor}18`, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>🚇</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#1a1a1a" }}>
                {stopsRemaining > 0 ? `${stopsRemaining} stop${stopsRemaining !== 1 ? "s" : ""} to go` : "🎉 Arriving!"}
              </div>
              <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
                {lines.map(l => l.name).join(" → ")} · {totalDistance}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "18px", fontWeight: "700", color: lineColor }}>{etaMin}</div>
              <div style={{ fontSize: "10px", color: "#888" }}>min</div>
            </div>
          </div>

          <div style={{ position: "absolute", top: "12px", right: "12px", zIndex: 500, background: "white", borderRadius: "10px", padding: "10px 12px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", fontSize: "11px" }}>
            {lines.map(l => (
              <div key={l.line} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <div style={{ width: "20px", height: "4px", background: l.color, borderRadius: "2px" }} />
                <span style={{ color: "#444" }}>{l.name}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <svg width="20" height="5"><line x1="0" y1="2" x2="20" y2="2" stroke="#78909C" strokeWidth="2" strokeDasharray="4 3"/></svg>
              <span style={{ color: "#444" }}>Walk</span>
            </div>
          </div>
        </div>
      )}

      {tab === "stations" && (
        <div style={{ flex: 1, overflowY: "auto", background: "#f8f9fa", paddingBottom: "80px" }}>
          <div style={{ background: "white", padding: "12px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", gap: "12px" }}>
            {[
              { icon: "⏱️", val: `${totalTimeNum} min`,        lbl: "Total"    },
              { icon: "📍", val: totalDistance,                 lbl: "Distance" },
              { icon: "🚉", val: `${allStations.length}`,       lbl: "Stations" },
              { icon: "🎫", val: `₹${metroFare}`,              lbl: "Fare"     },
            ].map(s => (
              <div key={s.lbl} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: "15px" }}>{s.icon}</div>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#1a1a1a" }}>{s.val}</div>
                <div style={{ fontSize: "10px", color: "#888" }}>{s.lbl}</div>
              </div>
            ))}
          </div>

          {resolved.changeAt && (
            <div style={{ margin: "10px 16px 0", padding: "10px 14px", background: "#FFF3E0", borderRadius: "10px", border: "1.5px solid #FFB74D", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "20px" }}>🔄</span>
              <div>
                <div style={{ fontWeight: "700", fontSize: "13px", color: "#E65100" }}>Change at {resolved.changeAt.name}</div>
                <div style={{ fontSize: "11px", color: "#BF360C", marginTop: "2px" }}>
                  {legName(resolved, 0)} → exit → board {legName(resolved, 1)}
                </div>
              </div>
            </div>
          )}
          {resolved.change2At && (
            <div style={{ margin: "8px 16px 0", padding: "10px 14px", background: "#FFF3E0", borderRadius: "10px", border: "1.5px solid #FFB74D", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "20px" }}>🔄</span>
              <div>
                <div style={{ fontWeight: "700", fontSize: "13px", color: "#E65100" }}>Change at {resolved.change2At.name}</div>
                <div style={{ fontSize: "11px", color: "#BF360C", marginTop: "2px" }}>
                  {legName(resolved, 1)} → exit → board {legName(resolved, 2)}
                </div>
              </div>
            </div>
          )}

          <div style={{ padding: "16px", position: "relative" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", paddingBottom: "8px" }}>
              <div style={{ width: "32px", display: "flex", justifyContent: "center" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#B0BEC5" }} />
              </div>
              <div style={{ fontSize: "12px", color: "#78909C", fontStyle: "italic" }}>
                {!metroInfo.boardingIsNameMatch && (
                  <div style={{ padding: "4px 0", color: "#666", fontSize: "13px", fontStyle: "italic" }}>
                    🚶 Walk to {resolved.fromStation.name}
                    {metroInfo.walkToBoard && metroInfo.walkToBoard !== "At station"
                      ? ` · ${metroInfo.walkToBoard}`
                      : " · ~5 min"}
                  </div>
                )}
              </div>
            </div>

            <div style={{
              position: "absolute", left: "23px", top: "44px", bottom: "60px",
              width: "2px",
              background: lines.length > 1
                ? `linear-gradient(to bottom,${lines.map(l => l.color).join(",")})`
                : fromColor,
              opacity: 0.35, borderRadius: "1px"
            }} />

            {allStations.map((station, i) => {
              const isDone      = i < currentStopIdx;
              const isCurrent   = i === currentStopIdx;
              const isFirst     = i === 0;
              const isLast      = i === allStations.length - 1;
              const isChange    = interchangeNames.has(station.name);
              const lIdx        = resolved.stationLeg[i] ?? 0;
              const stColor     = isChange ? "#FFA000" : legColor(resolved, lIdx);
              const dotSize     = isFirst || isLast ? 16 : isCurrent ? 14 : isChange ? 13 : 10;
              const stLineName  = legName(resolved, lIdx);

              return (
                <div key={i} style={{ display: "flex", gap: "12px", alignItems: "center", padding: "7px 0", opacity: isDone ? 0.45 : 1, transition: "opacity 0.4s" }}>
                  <div style={{ width: "32px", display: "flex", justifyContent: "center", flexShrink: 0, zIndex: 1 }}>
                    <div style={{
                      width: `${dotSize}px`, height: `${dotSize}px`,
                      background: isDone || isFirst || isLast || isCurrent || isChange ? stColor : "white",
                      border: `${isFirst || isLast || isCurrent ? "3px" : "2px"} solid ${stColor}`,
                      borderRadius: "50%",
                      boxShadow: isCurrent ? `0 0 0 5px ${stColor}30,0 2px 8px rgba(0,0,0,0.2)` : "none",
                      transition: "all 0.4s",
                    }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: isFirst || isLast ? "14px" : "13px", fontWeight: isCurrent || isFirst || isLast ? "700" : isChange ? "600" : "400", color: isCurrent ? stColor : "#1a1a1a" }}>
                      {isCurrent ? "📍 " : ""}{station.name}{isChange ? " 🔄" : ""}
                    </div>
                    {isFirst  && <div style={{ fontSize: "10px", color: "#888" }}>Board here · {stLineName}</div>}
                    {isLast   && <div style={{ fontSize: "10px", color: "#888" }}>Alight here · {stLineName}</div>}
                    {isChange && i > 0 && i < allStations.length - 1 && (
                      <div style={{ fontSize: "10px", color: "#F57C00", fontWeight: "600" }}>
                        ⬇ Exit {legName(resolved, lIdx - 1 >= 0 ? lIdx - 1 : 0)} · Board {legName(resolved, lIdx)}
                      </div>
                    )}
                  </div>
                  {isCurrent && <div style={{ fontSize: "10px", fontWeight: "700", background: stColor, color: "white", padding: "3px 10px", borderRadius: "999px", whiteSpace: "nowrap" }}>NOW</div>}
                  {isDone    && <div style={{ fontSize: "14px", color: stColor }}>✓</div>}
                </div>
              );
            })}

            <div style={{ display: "flex", gap: "12px", alignItems: "center", paddingTop: "8px" }}>
              <div style={{ width: "32px", display: "flex", justifyContent: "center" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#B0BEC5" }} />
              </div>
              <div style={{ fontSize: "12px", color: "#78909C", fontStyle: "italic" }}>
                🚶 Walk to {to.split(",")[0]}
                {metroInfo.walkFromAlight && metroInfo.walkFromAlight !== "At station"
                  ? ` · ${metroInfo.walkFromAlight}`
                  : " · ~5 min"}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "white", borderTop: "1px solid #f0f0f0", padding: "12px 16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}>
        <div>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#1a1a1a" }}>
            {stopsRemaining > 0 ? `${stopsRemaining} stop${stopsRemaining !== 1 ? "s" : ""} remaining` : "🎉 Arrived!"}
          </div>
          <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>ETA {etaMin} min · {totalDistance}</div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setTab(tab === "map" ? "stations" : "map")} style={{ padding: "10px 14px", background: `${lineColor}15`, border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: "600", color: lineColor, cursor: "pointer" }}>
            {tab === "map" ? "🚉 Stops" : "🗺️ Map"}
          </button>
          <button onClick={handleClose} style={{ padding: "10px 16px", background: "#EA4335", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: "700", color: "white", cursor: "pointer" }}>✕ End</button>
        </div>
      </div>
    </div>
  );
}