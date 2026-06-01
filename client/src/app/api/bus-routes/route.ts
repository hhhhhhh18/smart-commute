import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// ── GTFS In-Memory Store ──────────────────────────────────────
const gtfsStops:       Record<string, string>                             = {};
const gtfsStopCoords:  Record<string, { lat: number; lng: number }>       = {};
const gtfsRoutes:      Record<string, string>                             = {};
const routeToTrips:    Record<string, { dir0: string[]; dir1: string[] }> = {};
const tripsByBusNo:    Record<string, { dir0: string[]; dir1: string[] }> = {};
const stopTimesByTrip: Record<string, { stop_id: string; sequence: number; dep_time: string }[]> = {};
let gtfsLoaded = false;

// ── CSV parser ────────────────────────────────────────────────
function parseCSV(filePath: string): Record<string, string>[] {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines   = content.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const headerLine = lines[0].replace(/^\uFEFF/, "");
    const headers    = headerLine.split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map(line => {
      const values: Record<string, string> = {};
      const cols: string[] = [];
      let cur = "", inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { inQ = !inQ; }
        else if (c === "," && !inQ) { cols.push(cur); cur = ""; }
        else { cur += c; }
      }
      cols.push(cur);
      headers.forEach((h, i) => { values[h] = (cols[i] ?? "").trim().replace(/^"|"$/g, ""); });
      return values;
    });
  } catch { return []; }
}

// ── Load GTFS once ────────────────────────────────────────────
function loadGTFS() {
  if (gtfsLoaded) return;
  gtfsLoaded = true;

  const gtfsDir = path.join(process.cwd(), "gtfs");
  if (!fs.existsSync(gtfsDir)) { console.warn("[GTFS] gtfs/ folder not found:", gtfsDir); return; }

  for (const row of parseCSV(path.join(gtfsDir, "stops.txt"))) {
    const id = row.stop_id?.trim();
    if (!id) continue;
    if (row.stop_name) gtfsStops[id] = row.stop_name.trim();
    const lat = parseFloat(row.stop_lat ?? "");
    const lng = parseFloat(row.stop_lon ?? "");
    if (!isNaN(lat) && !isNaN(lng)) gtfsStopCoords[id] = { lat, lng };
  }
  console.log(`[GTFS] stops: ${Object.keys(gtfsStops).length}`);

  for (const row of parseCSV(path.join(gtfsDir, "routes.txt"))) {
    const id = row.route_id?.trim();
    if (!id) continue;
    gtfsRoutes[id] = row.route_short_name?.trim() || row.route_long_name?.trim() || id;
  }
  console.log(`[GTFS] routes: ${Object.keys(gtfsRoutes).length}`);

  for (const row of parseCSV(path.join(gtfsDir, "trips.txt"))) {
    const routeId   = row.route_id?.trim();
    const tripId    = row.trip_id?.trim();
    const shortName = row.trip_short_name?.trim() ?? "";
    if (!routeId || !tripId) continue;
    const dir = row.direction_id?.trim();
    if (!routeToTrips[routeId]) routeToTrips[routeId] = { dir0: [], dir1: [] };
    if (dir === "1") routeToTrips[routeId].dir1.push(tripId);
    else             routeToTrips[routeId].dir0.push(tripId);
    const busNoMatch = shortName.match(/^([A-Z0-9]+(?:\/[A-Z0-9]+)?)/i);
    const busNo = busNoMatch?.[1]?.toUpperCase() ?? "";
    if (busNo) {
      if (!tripsByBusNo[busNo]) tripsByBusNo[busNo] = { dir0: [], dir1: [] };
      if (dir === "1") tripsByBusNo[busNo].dir1.push(tripId);
      else             tripsByBusNo[busNo].dir0.push(tripId);
    }
  }
  console.log(`[GTFS] routeToTrips: ${Object.keys(routeToTrips).length} routes`);
  console.log(`[GTFS] tripsByBusNo: ${Object.keys(tripsByBusNo).length} bus numbers`);

  const stFile    = path.join(gtfsDir, "stop_times.txt");
  const stContent = fs.readFileSync(stFile, "utf-8");
  const stLines   = stContent.split(/\r?\n/).filter(Boolean);
  if (stLines.length < 2) { console.warn("[GTFS] stop_times.txt empty"); return; }
  const stHeader  = stLines[0].replace(/^\uFEFF/, "").split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const colTripId = stHeader.indexOf("trip_id");
  const colSeq    = stHeader.indexOf("stop_sequence");
  const colStopId = stHeader.indexOf("stop_id");
  const colDep    = stHeader.indexOf("departure_time");
  const colArr    = stHeader.indexOf("arrival_time");
  if (colTripId === -1 || colStopId === -1) { console.warn("[GTFS] stop_times.txt missing columns"); return; }
  let count = 0;
  for (let i = 1; i < stLines.length; i++) {
    const cols   = stLines[i].split(",");
    const tripId = cols[colTripId]?.trim();
    const stopId = cols[colStopId]?.trim();
    const seq    = parseInt(cols[colSeq]?.trim() ?? "0");
    const depT   = (colDep !== -1 ? cols[colDep] : cols[colArr])?.trim() ?? "";
    if (!tripId || !stopId) continue;
    if (!stopTimesByTrip[tripId]) stopTimesByTrip[tripId] = [];
    stopTimesByTrip[tripId].push({ stop_id: stopId, sequence: seq, dep_time: depT });
    count++;
  }
  console.log(`[GTFS] stop_times: ${count} entries, ${Object.keys(stopTimesByTrip).length} trips`);
}

// ── Haversine (metres) ────────────────────────────────────────
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000, d1 = (lat2 - lat1) * Math.PI / 180, d2 = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(d1 / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(d2 / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Walk info ─────────────────────────────────────────────────
const AT_STOP_THRESHOLD_M = 350;
function walkInfo(metres: number): { metres: number; minutes: number; label: string; isAtStop: boolean } {
  const isAtStop = metres < AT_STOP_THRESHOLD_M;
  const minutes  = Math.round(metres / 80);
  const label    = isAtStop ? "At your stop" : minutes <= 1 ? "1 min walk" : `${minutes} min walk`;
  return { metres: Math.round(metres), minutes, label, isAtStop };
}

// ── Normalize stop name for fuzzy matching ────────────────────
// Used to check if user's source/destination exists in the GTFS schedule.
// More aggressive than normStop — strips bus/stop/road noise too.
function normalizeStop(s: string): string {
  return s.toLowerCase()
    .replace(/\./g, "")
    .replace(/\b(bus|stop|stand|x\s*road|xroad|xrds|cross|road|nagar|colony|circle|junction|jn|complex|depot|phase|township)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

// ── Geocode a place name → coords ────────────────────────────
async function geocodePlace(name: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url  = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(name + ", Hyderabad, Telangana, India")}&key=${apiKey}`;
    const data = await (await fetch(url)).json();
    if (data.status !== "OK" || !data.results?.[0]) return null;
    const loc = data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng };
  } catch { return null; }
}

// ── Parse raw GTFS "HH:MM:SS" → total minutes (NO modulo) ────
function gtfsRawToMinutes(t: string): number | null {
  if (!t || !t.includes(":")) return null;
  const parts = t.split(":").map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return parts[0] * 60 + parts[1];
}

// ── Parse Google "10:19 AM" / "06:20 PM" → minutes (0–1439) ──
function parseTimeToMinutes(t: string): number | null {
  if (!t) return null;
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1]), min = parseInt(m[2]);
  const period = m[3].toUpperCase();
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

function minutesToTimeStr(totalMin: number): string {
  const norm = ((totalMin % 1440) + 1440) % 1440;
  const h    = Math.floor(norm / 60);
  const m    = norm % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12  = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function fmtGtfsTime(t: string): string {
  const min = gtfsRawToMinutes(t);
  if (min === null) return "—";
  return minutesToTimeStr(min);
}

function calcFare(km: number): number {
  if (km <= 4) return 10; if (km <= 8) return 15; if (km <= 12) return 20;
  if (km <= 16) return 25; if (km <= 20) return 30; if (km <= 25) return 35;
  if (km <= 30) return 40; if (km <= 35) return 45; if (km <= 40) return 50;
  return Math.round(50 + (km - 40) * 1.2);
}

function normStop(s: string): string {
  return s.toLowerCase()
    .replace(/\b(bus|stop|stand|x\s*road|xroad|cross|road|nagar|colony|circle|junction|jn|complex|depot|phase|township)\b/g, "")
    .replace(/[^a-z0-9]/g, "").trim();
}

function findNearestStopName(lat: number, lng: number, maxM: number): string | null {
  let best: string | null = null, bestD = maxM;
  for (const [id, c] of Object.entries(gtfsStopCoords)) {
    const d = haversineM(lat, lng, c.lat, c.lng);
    if (d < bestD) { bestD = d; best = gtfsStops[id] ?? null; }
  }
  return best;
}

function findRouteIds(busNo: string): string[] {
  const seen = new Set<string>();
  const add  = (id: string) => { if (id && !seen.has(id)) seen.add(id); };
  const candidates = [busNo];
  if (busNo.includes("/")) busNo.split("/").map(p => p.trim()).filter(Boolean).forEach(p => candidates.push(p));
  for (const candidate of candidates) {
    const cL = candidate.toLowerCase();
    for (const id of Object.keys(gtfsRoutes)) { if (id.toLowerCase() === cL) add(id); }
    for (const id of Object.keys(gtfsRoutes)) { const idL = id.toLowerCase(); if (idL.startsWith(cL) || cL.startsWith(idL)) add(id); }
    for (const id of Object.keys(gtfsRoutes)) { const idL = id.toLowerCase(); if (idL.includes(cL) || cL.includes(idL)) add(id); }
  }
  return Array.from(seen).sort((a, b) => {
    const aE = a.toLowerCase() === busNo.toLowerCase() ? 0 : 1;
    const bE = b.toLowerCase() === busNo.toLowerCase() ? 0 : 1;
    if (aE !== bE) return aE - bE;
    return a.length - b.length;
  });
}

interface StopEntry { name: string; time: string; }
interface GtfsResult { fullSchedule: StopEntry[]; boardingIdx: number; alightingIdx: number; }

function nameScore(gtfsN: string, query: string): number {
  if (!gtfsN || !query) return 0;
  if (gtfsN === query) return 100;
  if (query.length >= 4 && gtfsN.includes(query)) return 85;
  if (gtfsN.length >= 4 && query.includes(gtfsN)) return 75;
  const tg: string[] = gtfsN.match(/.{3}/g) ?? [];
const tq: string[] = query.match(/.{3}/g) ?? [];
  return tg.filter(t => tq.includes(t)).length * 12;
}

function tryMatchTrip(
  raw: { stop_id: string; sequence: number; dep_time: string }[],
  boardLat: number, boardLng: number,
  alightLat: number, alightLng: number,
  boardKey: string, alightKey: string,
  hasCoords: boolean,
): { boardIdx: number; alightIdx: number; score: number } | null {
  let boardIdx = -1, alightIdx = -1, score = 0;
  if (hasCoords) {
    let minB = Infinity, minA = Infinity, bI = -1, aI = -1;
    for (let i = 0; i < raw.length; i++) {
      const c = gtfsStopCoords[raw[i].stop_id];
      if (!c) continue;
      const db = haversineM(boardLat, boardLng, c.lat, c.lng);
      const da = haversineM(alightLat, alightLng, c.lat, c.lng);
      if (db < minB) { minB = db; bI = i; }
      if (da < minA) { minA = da; aI = i; }
    }
    if (bI !== -1 && aI !== -1 && bI < aI && minB < 800 && minA < 800) {
      boardIdx = bI; alightIdx = aI; score = 1000 - Math.round(minB + minA);
    }
  }
  if (boardIdx === -1 || alightIdx === -1) {
    const names = raw.map(r => normStop(gtfsStops[r.stop_id] ?? ""));
    let bBest = 0, aBest = 0, bIdx2 = -1, aIdx2 = -1;
    for (let i = 0; i < names.length; i++) {
      const bs  = nameScore(names[i], boardKey);
      const as_ = nameScore(names[i], alightKey);
      if (bs > bBest)  { bBest = bs;  bIdx2 = i; }
      if (as_ > aBest) { aBest = as_; aIdx2 = i; }
    }
    if (bIdx2 !== -1 && aIdx2 !== -1 && bIdx2 < aIdx2 && bBest >= 30 && aBest >= 30) {
      boardIdx = bIdx2; alightIdx = aIdx2; score = bBest + aBest;
    }
  }
  if (boardIdx === -1 || alightIdx === -1 || boardIdx >= alightIdx) return null;
  return { boardIdx, alightIdx, score };
}

function getTripsForBus(busNo: string): { dir0: string[]; dir1: string[] } {
  const upper = busNo.toUpperCase();
  if (tripsByBusNo[upper]) { console.log(`[GTFS] tripsByBusNo exact: "${upper}"`); return tripsByBusNo[upper]; }
  const matches = Object.keys(tripsByBusNo)
    .filter(k => k === upper || k.startsWith(upper) || upper.startsWith(k))
    .sort((a, b) => (a === upper ? -1 : b === upper ? 1 : a.length - b.length));
  if (matches.length > 0) {
    console.log(`[GTFS] tripsByBusNo prefix for "${upper}": [${matches.slice(0, 5).join(", ")}]`);
    const dir0: string[] = [], dir1: string[] = [];
    for (const k of matches) { dir0.push(...(tripsByBusNo[k]?.dir0 ?? [])); dir1.push(...(tripsByBusNo[k]?.dir1 ?? [])); }
    return { dir0, dir1 };
  }
  console.warn(`[GTFS] no tripsByBusNo for "${upper}", falling back to routeToTrips`);
  const dir0: string[] = [], dir1: string[] = [];
  for (const rid of findRouteIds(busNo)) { dir0.push(...(routeToTrips[rid]?.dir0 ?? [])); dir1.push(...(routeToTrips[rid]?.dir1 ?? [])); }
  return { dir0, dir1 };
}

const MAX_PRE_BOARD_OFFSET_MIN   = 180;
const MAX_POST_ALIGHT_OFFSET_MIN = 180;

function buildGtfsSchedule(
  busNo: string,
  boardLat: number, boardLng: number,
  alightLat: number, alightLng: number,
  googleBoardName: string, googleAlightName: string,
  googleDepTime: string, googleArrTime: string,
): GtfsResult | null {
  const { dir0: dir0Trips, dir1: dir1Trips } = getTripsForBus(busNo);
  if (!dir0Trips.length && !dir1Trips.length) { console.warn(`[GTFS] No trips for "${busNo}"`); return null; }

  const boardKey  = normStop(googleBoardName);
  const alightKey = normStop(googleAlightName);
  const hasCoords = !isNaN(boardLat) && !isNaN(alightLat) && boardLat !== 0 && alightLat !== 0;
  const googleDepMin = parseTimeToMinutes(googleDepTime);
  const googleArrMin = parseTimeToMinutes(googleArrTime);

  let bestResult: GtfsResult | null = null;
  let bestTimeDiff  = Infinity;
  let bestStopScore = -1;

  for (const tripId of [...dir0Trips.slice(0, 50), ...dir1Trips.slice(0, 50)]) {
    const raw = (stopTimesByTrip[tripId] ?? []).sort((a, b) => a.sequence - b.sequence);
    if (raw.length < 2) continue;
    const match = tryMatchTrip(raw, boardLat, boardLng, alightLat, alightLng, boardKey, alightKey, hasCoords);
    if (!match) continue;

    const gtfsBoardRaw = gtfsRawToMinutes(raw[match.boardIdx]?.dep_time ?? "");
    let timeDiff = 720;
    if (googleDepMin !== null && gtfsBoardRaw !== null)
      timeDiff = Math.abs(googleDepMin - (gtfsBoardRaw % 1440));

    const isBetter = timeDiff < bestTimeDiff || (timeDiff === bestTimeDiff && match.score > bestStopScore);
    if (!isBetter) continue;
    bestTimeDiff = timeDiff; bestStopScore = match.score;

    const boardSeq  = match.boardIdx;
    const alightSeq = match.alightIdx;
    const spanStops = alightSeq - boardSeq;
    const gtfsBoardRawMin  = gtfsRawToMinutes(raw[boardSeq]?.dep_time  ?? "");
    const gtfsAlightRawMin = gtfsRawToMinutes(raw[alightSeq]?.dep_time ?? "");

    const fullSchedule: StopEntry[] = raw.map((r, i) => {
      const stopName    = gtfsStops[r.stop_id] ?? r.stop_id;
      const gtfsThisRaw = gtfsRawToMinutes(r.dep_time);
      if (i === boardSeq)  return { name: stopName, time: googleDepTime };
      if (i === alightSeq) return { name: stopName, time: googleArrTime };
      if (i > boardSeq && i < alightSeq && googleDepMin !== null && googleArrMin !== null && spanStops > 0) {
        const interpMin = Math.round(googleDepMin + ((i - boardSeq) / spanStops) * (googleArrMin - googleDepMin));
        return { name: stopName, time: minutesToTimeStr(interpMin) };
      }
      if (i < boardSeq && gtfsBoardRawMin !== null && gtfsThisRaw !== null && googleDepMin !== null) {
        const offsetMin = gtfsThisRaw - gtfsBoardRawMin;
        if (Math.abs(offsetMin) > MAX_PRE_BOARD_OFFSET_MIN) return { name: stopName, time: "—" };
        return { name: stopName, time: minutesToTimeStr(googleDepMin + offsetMin) };
      }
      if (i > alightSeq && gtfsAlightRawMin !== null && gtfsThisRaw !== null && googleArrMin !== null) {
        const offsetMin = gtfsThisRaw - gtfsAlightRawMin;
        if (offsetMin > MAX_POST_ALIGHT_OFFSET_MIN || offsetMin < 0) return { name: stopName, time: "—" };
        return { name: stopName, time: minutesToTimeStr(googleArrMin + offsetMin) };
      }
      return { name: stopName, time: fmtGtfsTime(r.dep_time) };
    });

    bestResult = { fullSchedule, boardingIdx: boardSeq, alightingIdx: alightSeq };
  }

  if (bestResult) {
    const s = bestResult.fullSchedule[0];
    const b = bestResult.fullSchedule[bestResult.boardingIdx];
    const a = bestResult.fullSchedule[bestResult.alightingIdx];
    const e = bestResult.fullSchedule[bestResult.fullSchedule.length - 1];
    console.log(`[GTFS] ✓ "${busNo}" timeDiff=${bestTimeDiff}min: start="${s.name}"(${s.time}) board="${b.name}"(${b.time}) alight="${a.name}"(${a.time}) end="${e.name}"(${e.time})`);
  } else {
    console.warn(`[GTFS] ✗ "${busNo}": no matching trip`);
  }
  return bestResult;
}

function resolveIntermediateStops(googleRawMid: any[]): string[] {
  return googleRawMid.map((s: any) => {
    const lat = s.location?.lat, lng = s.location?.lng;
    if (lat != null && lng != null) { const nearest = findNearestStopName(lat, lng, 400); if (nearest) return nearest; }
    return s.name ?? null;
  }).filter(Boolean);
}

function interpolateFallbackStops(names: string[], depTime: string, arrTime: string): StopEntry[] {
  const depMin = parseTimeToMinutes(depTime);
  const arrMin = parseTimeToMinutes(arrTime);
  const total  = names.length + 1;
  return names.map((n, i) => {
    if (depMin !== null && arrMin !== null)
      return { name: n, time: minutesToTimeStr(Math.round(depMin + ((i + 1) / total) * (arrMin - depMin))) };
    return { name: n, time: "—" };
  });
}

// ── Override Google boarding/alighting with GTFS schedule ─────
// Google picks the "best" transit stop which may differ from the
// user's actual location. If the user's source/destination exists
// in the GTFS stop schedule, we use that stop directly — no walk.
//
// e.g. Google says: "Walk to Sagar Complex, board 279U"
//      But BN Reddy Nagar IS on the 279U schedule as "Bn Reddy Nagar"
//      So we override: board at BN Reddy Nagar, isAtBoardStop = true
function overrideBoardingFromSchedule(
  stopSchedule: StopEntry[],
  googleBoardingIdx: number,
  googleAlightingIdx: number,
  userFrom: string,
  userTo: string,
): { boardingIdx: number; alightingIdx: number; } {
  const fromKey = normalizeStop(userFrom);
  const toKey   = normalizeStop(userTo);

  // Find user's source in the schedule (must be BEFORE google alighting idx)
  let newBoardIdx = -1;
  for (let i = 0; i < googleAlightingIdx; i++) {
    const stopKey = normalizeStop(stopSchedule[i].name);
    if (!stopKey || !fromKey) continue;
    if (stopKey.includes(fromKey) || fromKey.includes(stopKey)) {
      // Only override if it's meaningfully before the alighting stop
      // and the match string is at least 4 chars (avoids false positives)
      const matchLen = Math.min(stopKey.length, fromKey.length);
      if (matchLen >= 4) { newBoardIdx = i; break; }
    }
  }

  // Find user's destination in the schedule (must be AFTER boarding)
  const searchFromIdx = newBoardIdx !== -1 ? newBoardIdx + 1 : googleBoardingIdx + 1;
  let newAlightIdx = -1;
  for (let i = searchFromIdx; i < stopSchedule.length; i++) {
    const stopKey = normalizeStop(stopSchedule[i].name);
    if (!stopKey || !toKey) continue;
    if (stopKey.includes(toKey) || toKey.includes(stopKey)) {
      const matchLen = Math.min(stopKey.length, toKey.length);
      if (matchLen >= 4) { newAlightIdx = i; break; }
    }
  }

  return {
    boardingIdx:  newBoardIdx  !== -1 ? newBoardIdx  : googleBoardingIdx,
    alightingIdx: newAlightIdx !== -1 ? newAlightIdx : googleAlightingIdx,
  };
}

// ── GET handler ───────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "GOOGLE_MAPS_API_KEY not set" }, { status: 500 });
  const { searchParams } = new URL(req.url);
  const origin = searchParams.get("origin"), destination = searchParams.get("destination");
  if (!origin || !destination) return NextResponse.json({ error: "Missing params" }, { status: 400 });
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=transit&transit_mode=bus&key=${apiKey}`);
    return NextResponse.json(await res.json());
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

// ── POST handler ──────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return NextResponse.json({ type: "error", error: { message: "GOOGLE_MAPS_API_KEY not set" } }, { status: 500 });

  loadGTFS();

  try {
    const { from, to } = await req.json();
    if (!from || !to) return NextResponse.json({ type: "error", error: { message: "Missing from or to" } }, { status: 400 });

    console.log("[bus-routes]", from, "→", to);

    const [fromCoords, toCoords] = await Promise.all([
      geocodePlace(from, apiKey),
      geocodePlace(to,   apiKey),
    ]);
    console.log(`[bus-routes] fromCoords=${JSON.stringify(fromCoords)} toCoords=${JSON.stringify(toCoords)}`);

    const suffix = ", Hyderabad, Telangana, India";
    const url =
      `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${encodeURIComponent(from + suffix)}` +
      `&destination=${encodeURIComponent(to + suffix)}` +
      `&mode=transit&transit_mode=bus&alternatives=true&key=${apiKey}`;

    const gData = await (await fetch(url)).json();
    console.log("[bus-routes] Google status:", gData.status);

    if (gData.status !== "OK" && gData.status !== "ZERO_RESULTS")
      return NextResponse.json({ type: "error", error: { message: `Google: ${gData.status}` } });

    if (!gData.routes?.length)
      return NextResponse.json({ content: [{ type: "text", text: JSON.stringify(emptyBusInfo(from, to)) }] });

    const directBuses: any[]    = [];
    const transferRoutes: any[] = [];

    for (const route of gData.routes) {
      const legs     = route.legs ?? [];
      const allSteps = legs.flatMap((l: any) => l.steps ?? []);
      const busSteps = allSteps.filter((s: any) => s.travel_mode === "TRANSIT");
      if (!busSteps.length) continue;

      const totalMin = Math.round((legs[0]?.duration?.value ?? 0) / 60);
      const totalKm  = (legs[0]?.distance?.value ?? 0) / 1000;
      const fare     = calcFare(totalKm);

      if (busSteps.length === 1) {
        const step = busSteps[0];
        const td   = step.transit_details;
        const busNo = td?.line?.short_name ?? td?.line?.name ?? "Unknown";
        const depTime    = td?.departure_time?.text ?? "—";
        const arrTime    = td?.arrival_time?.text   ?? "—";
        const numStops   = td?.num_stops ?? 0;
        // Google's suggested boarding/alighting stops
        let boardStop  = td?.departure_stop?.name ?? from.split(",")[0];
        let alightStop = td?.arrival_stop?.name   ?? to.split(",")[0];
        const boardLat = td?.departure_stop?.location?.lat ?? NaN;
        const boardLng = td?.departure_stop?.location?.lng ?? NaN;
        const alightLat = td?.arrival_stop?.location?.lat ?? NaN;
        const alightLng = td?.arrival_stop?.location?.lng ?? NaN;

        const gtfs = buildGtfsSchedule(busNo, boardLat, boardLng, alightLat, alightLng, boardStop, alightStop, depTime, arrTime);

        let stopSchedule: StopEntry[];
        let boardingIdx: number, alightingIdx: number;
        let busStartStop: string | null = null, busEndStop: string | null = null;

        if (gtfs && gtfs.fullSchedule.length >= 2) {
          stopSchedule = gtfs.fullSchedule;
          boardingIdx  = gtfs.boardingIdx;
          alightingIdx = gtfs.alightingIdx;
        } else {
          console.warn(`[bus-routes] GTFS fallback for "${busNo}"`);
          const mid = resolveIntermediateStops(td?.intermediate_stops ?? []);
          stopSchedule = [
            { name: boardStop, time: depTime },
            ...interpolateFallbackStops(mid, depTime, arrTime),
            { name: alightStop, time: arrTime },
          ];
          boardingIdx  = 0;
          alightingIdx = stopSchedule.length - 1;
        }

        // ── Override Google's boarding/alighting with GTFS ──
        // If user's source/destination is directly on the GTFS schedule,
        // use that stop — avoids unnecessary "walk to Sagar Complex" etc.
        const override = overrideBoardingFromSchedule(
          stopSchedule, boardingIdx, alightingIdx, from, to,
        );
        const didOverrideBoard  = override.boardingIdx  !== boardingIdx;
        const didOverrideAlight = override.alightingIdx !== alightingIdx;
        if (didOverrideBoard || didOverrideAlight) {
          boardingIdx  = override.boardingIdx;
          alightingIdx = override.alightingIdx;
          boardStop    = stopSchedule[boardingIdx]?.name  ?? boardStop;
          alightStop   = stopSchedule[alightingIdx]?.name ?? alightStop;
          console.log(`[bus-routes] Override: board="${boardStop}"@${boardingIdx} alight="${alightStop}"@${alightingIdx}`);
        }

        busStartStop = boardingIdx > 0 ? stopSchedule[0].name : null;
        busEndStop   = alightingIdx < stopSchedule.length - 1 ? stopSchedule[stopSchedule.length - 1].name : null;

        // ── Walk distance calculation ──
        // If we overrode the boarding stop (user IS on the route), distance = 0.
        // Otherwise use real haversine distance from geocoded coords.
        let boardWalk: ReturnType<typeof walkInfo>;
        if (didOverrideBoard) {
          boardWalk = { metres: 0, minutes: 0, label: "At your stop", isAtStop: true };
        } else {
          boardWalk = fromCoords && !isNaN(boardLat)
            ? walkInfo(haversineM(fromCoords.lat, fromCoords.lng, boardLat, boardLng))
            : { metres: 400, minutes: 5, label: "5 min walk", isAtStop: false };
        }

        let alightWalk: ReturnType<typeof walkInfo>;
        if (didOverrideAlight) {
          alightWalk = { metres: 0, minutes: 0, label: "At your stop", isAtStop: true };
        } else {
          alightWalk = toCoords && !isNaN(alightLat)
            ? walkInfo(haversineM(toCoords.lat, toCoords.lng, alightLat, alightLng))
            : { metres: 400, minutes: 5, label: "5 min walk", isAtStop: false };
        }

        console.log(`[bus-routes] Direct "${busNo}": board="${boardStop}" dep=${depTime} alight="${alightStop}" arr=${arrTime} boardWalk=${boardWalk.metres}m isAtBoard=${boardWalk.isAtStop} alightWalk=${alightWalk.metres}m isAtAlight=${alightWalk.isAtStop}`);

        directBuses.push({
          busNo, via: route.summary ?? "",
          departure: depTime, arrival: arrTime,
          duration: `${totalMin} min`, durationMin: totalMin,
          boardingStop: boardStop, alightingStop: alightStop,
          boardingIdx, alightingIdx, busStartStop, busEndStop,
          totalStops: numStops, stopCount: stopSchedule.length,
          frequency: "Every 15–20 min", fare,
          walkToStop:      boardWalk.minutes,
          walkToStopLabel: boardWalk.label,
          walkToStopM:     boardWalk.metres,
          isAtBoardStop:   boardWalk.isAtStop,
          walkFromStop:      alightWalk.minutes,
          walkFromStopLabel: alightWalk.label,
          walkFromStopM:     alightWalk.metres,
          isAtAlightStop:    alightWalk.isAtStop,
          stops: stopSchedule.map(s => s.name), stopSchedule,
        });

      } else {
        const parsedLegs = busSteps.map((step: any, li: number) => {
          const td       = step.transit_details;
          const busNo    = td?.line?.short_name ?? td?.line?.name ?? "Unknown";
          const depTime  = td?.departure_time?.text ?? "—";
          const arrTime  = td?.arrival_time?.text   ?? "—";
          let fromStop   = td?.departure_stop?.name ?? "—";
          let toStop     = td?.arrival_stop?.name   ?? "—";
          const bLat = td?.departure_stop?.location?.lat ?? NaN;
          const bLng = td?.departure_stop?.location?.lng ?? NaN;
          const aLat = td?.arrival_stop?.location?.lat  ?? NaN;
          const aLng = td?.arrival_stop?.location?.lng  ?? NaN;
          const durMin = Math.round((step.duration?.value ?? 0) / 60);

          const isFirst = li === 0;
          const isLast  = li === busSteps.length - 1;

          const gtfs = buildGtfsSchedule(busNo, bLat, bLng, aLat, aLng, fromStop, toStop, depTime, arrTime);

          let stopSchedule: StopEntry[];
          let boardingIdx: number, alightingIdx: number;

          if (gtfs && gtfs.fullSchedule.length >= 2) {
            stopSchedule = gtfs.fullSchedule;
            boardingIdx  = gtfs.boardingIdx;
            alightingIdx = gtfs.alightingIdx;
          } else {
            const mid = resolveIntermediateStops(td?.intermediate_stops ?? []);
            stopSchedule = [
              { name: fromStop, time: depTime },
              ...interpolateFallbackStops(mid, depTime, arrTime),
              { name: toStop,   time: arrTime },
            ];
            boardingIdx  = 0;
            alightingIdx = stopSchedule.length - 1;
          }

          // Override boarding for first leg, alighting for last leg
          const override = overrideBoardingFromSchedule(
            stopSchedule, boardingIdx, alightingIdx,
            isFirst ? from : fromStop,
            isLast  ? to   : toStop,
          );
          const didOverrideBoard  = isFirst && override.boardingIdx  !== boardingIdx;
          const didOverrideAlight = isLast  && override.alightingIdx !== alightingIdx;
          if (didOverrideBoard)  { boardingIdx  = override.boardingIdx;  fromStop = stopSchedule[boardingIdx]?.name  ?? fromStop; }
          if (didOverrideAlight) { alightingIdx = override.alightingIdx; toStop   = stopSchedule[alightingIdx]?.name ?? toStop;   }

          const boardWalk: ReturnType<typeof walkInfo> = didOverrideBoard
            ? { metres: 0, minutes: 0, label: "At your stop", isAtStop: true }
            : isFirst && fromCoords && !isNaN(bLat)
              ? walkInfo(haversineM(fromCoords.lat, fromCoords.lng, bLat, bLng))
              : { minutes: 5, label: "5 min walk", metres: 400, isAtStop: false };

          const alightWalk: ReturnType<typeof walkInfo> = didOverrideAlight
            ? { metres: 0, minutes: 0, label: "At your stop", isAtStop: true }
            : isLast && toCoords && !isNaN(aLat)
              ? walkInfo(haversineM(toCoords.lat, toCoords.lng, aLat, aLng))
              : { minutes: 3, label: "3 min walk", metres: 240, isAtStop: false };

          return {
            busNo, from: fromStop, to: toStop,
            stops: stopSchedule.map(s => s.name),
            stopSchedule, boardingIdx, alightingIdx,
            stopCount: stopSchedule.length,
            duration: `${durMin} min`, durationMin: durMin,
            frequency: "Every 15–20 min",
            changeAt: li < busSteps.length - 1 ? toStop : null,
            depTime, arrTime,
            isAtBoardStop:  boardWalk.isAtStop,
            isAtAlightStop: alightWalk.isAtStop,
            walkToStopM:    boardWalk.metres,
            walkFromStopM:  alightWalk.metres,
          };
        });

        transferRoutes.push({
          description: `${parsedLegs.length} bus${parsedLegs.length > 1 ? "es" : ""} via ${route.summary ?? "transfer"}`,
          legs: parsedLegs, totalTime: `${totalMin} min`, totalMinutes: totalMin,
          fare, arrival: parsedLegs[parsedLegs.length - 1]?.arrTime ?? "—",
        });
      }
    }

    const busInfo = {
      directBuses, transferRoutes,
      stops:          directBuses[0]?.stopCount    ?? 0,
      stopsList:      directBuses[0]?.stops         ?? [],
      busNumbers: [
        ...directBuses.map((b: any) => b.busNo),
        ...transferRoutes.flatMap((t: any) => t.legs.map((l: any) => l.busNo)),
      ],
      frequency:      "Every 15–20 min",
      boardingPoint:  directBuses[0]?.boardingStop  ?? from.split(",")[0],
      alightingPoint: directBuses[0]?.alightingStop ?? to.split(",")[0],
      fare:           directBuses[0]?.fare           ?? transferRoutes[0]?.fare ?? 20,
      duration:       directBuses[0]?.durationMin    ?? transferRoutes[0]?.totalMinutes ?? 45,
      walkToStop:   directBuses[0]?.walkToStop   ?? 5,
      walkFromStop: directBuses[0]?.walkFromStop ?? 3,
      note: null,
    };

    return NextResponse.json({ content: [{ type: "text", text: JSON.stringify(busInfo) }] });

  } catch (err: any) {
    console.error("[bus-routes] Failed:", err?.message ?? err);
    return NextResponse.json({ type: "error", error: { message: err?.message ?? "Failed" } }, { status: 500 });
  }
}

function emptyBusInfo(from: string, to: string) {
  return {
    directBuses: [], transferRoutes: [],
    stops: 0, stopsList: [], busNumbers: [],
    frequency: "Unknown", boardingPoint: from.split(",")[0], alightingPoint: to.split(",")[0],
    fare: 20, duration: 45, walkToStop: 5, walkFromStop: 3,
    note: "No bus routes found. Try the TSRTC Gamyam app for local routes.",
  };
}