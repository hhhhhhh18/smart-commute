import fs from "fs";
import path from "path";
import csv from "csv-parser";

// ── In-memory store (loaded once at startup) ──────────────────
export const stops: Record<string, { name: string; lat: number; lng: number }> = {};
export const routes: Record<string, string> = {};           // route_id → route_short_name
export const tripToRoute: Record<string, string> = {};      // trip_id  → route_id
export const routeToTrips: Record<string, string[]> = {};   // route_id → [trip_ids]
export const stopTimesByTrip: Record<string, { stop_id: string; sequence: number }[]> = {};

let loaded = false;

function readCSV(file: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];
    fs.createReadStream(path.join(process.cwd(), "gtfs", file))
      .pipe(csv())
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

export async function loadGTFS() {
  if (loaded) return;
  loaded = true;

  console.log("[GTFS] Loading...");

  // Load stops
  const stopRows = await readCSV("stops.txt");
  for (const row of stopRows) {
    stops[row.stop_id] = {
      name: row.stop_name,
      lat: parseFloat(row.stop_lat),
      lng: parseFloat(row.stop_lon),
    };
  }

  // Load routes (route_id → short name like "277D")
  const routeRows = await readCSV("routes.txt");
  for (const row of routeRows) {
    routes[row.route_id] = row.route_short_name ?? row.route_long_name ?? row.route_id;
  }

  // Load trips (trip_id → route_id)
  const tripRows = await readCSV("trips.txt");
  for (const row of tripRows) {
    tripToRoute[row.trip_id] = row.route_id;
    if (!routeToTrips[row.route_id]) routeToTrips[row.route_id] = [];
    routeToTrips[row.route_id].push(row.trip_id);
  }

  // Load stop_times
  const stRows = await readCSV("stop_times.txt");
  for (const row of stRows) {
    const tid = row.trip_id;
    if (!stopTimesByTrip[tid]) stopTimesByTrip[tid] = [];
    stopTimesByTrip[tid].push({
      stop_id: row.stop_id,
      sequence: parseInt(row.stop_sequence),
    });
  }

  console.log(`[GTFS] Loaded: ${Object.keys(stops).length} stops, ${Object.keys(routes).length} routes`);
}

// ── Get stop names for a bus number (e.g. "277D") ─────────────
export function getStopsForBusNumber(
  busNumber: string,
  boardingStopName?: string,
  alightingStopName?: string
): string[] {
  // Find route_id that matches bus number
  const matchedRouteId = Object.entries(routes).find(
    ([, shortName]) =>
      shortName?.toLowerCase().trim() === busNumber?.toLowerCase().trim()
  )?.[0];

  if (!matchedRouteId) {
    console.warn("[GTFS] No route found for bus:", busNumber);
    return [];
  }

  // Get first trip for this route
  const tripIds = routeToTrips[matchedRouteId] ?? [];
  if (!tripIds.length) return [];

  const tripId = tripIds[0];
  const times  = (stopTimesByTrip[tripId] ?? [])
    .sort((a, b) => a.sequence - b.sequence);

  const allStopNames = times
    .map(t => stops[t.stop_id]?.name)
    .filter(Boolean) as string[];

  // If boarding/alighting known, slice to relevant portion
  if (boardingStopName && alightingStopName) {
    const boardIdx  = allStopNames.findIndex(n => n.toLowerCase().includes(boardingStopName.toLowerCase().split(" ")[0]));
    const alightIdx = allStopNames.findIndex(n => n.toLowerCase().includes(alightingStopName.toLowerCase().split(" ")[0]));

    if (boardIdx !== -1 && alightIdx !== -1 && alightIdx > boardIdx) {
      return allStopNames.slice(boardIdx, alightIdx + 1);
    }
  }

  return allStopNames;
}