// ─────────────────────────────────────────────────────────────────────────────
// routeController.js
// KEY FIX: resolveMetroStationCoords now ALWAYS wins over client-provided coords.
// When a place name resolves to a known metro station, we use our hardcoded
// coords — ignoring whatever lat/lon the frontend geocoder sent.
// This prevents Google Maps returning slightly-off coords (e.g. Victoria Memorial
// area instead of LB Nagar terminus) from breaking metro routing.
// ─────────────────────────────────────────────────────────────────────────────

const axios = require("axios");
const { calculateCost, getStopsList, getBusRouteData, buildMetroInfo } = require("../services/costService");

// ─── Hardcoded metro station coords ──────────────────────────────────────────
// These are the authoritative coordinates for every Hyderabad Metro station.
// They override any coordinates provided by the frontend geocoder.
const METRO_STATION_COORDS = {
  // Red Line
  "Miyapur":                 { lat: 17.4969, lon: 78.3541 },
  "JNTU College":            { lat: 17.4950, lon: 78.3628 },
  "KPHB Colony":             { lat: 17.4924, lon: 78.3726 },
  "Kukatpally":              { lat: 17.4849, lon: 78.3940 },
  "Balanagar":               { lat: 17.4762, lon: 78.4148 },
  "Moosapet":                { lat: 17.4680, lon: 78.4263 },
  "Bharat Nagar":            { lat: 17.4607, lon: 78.4345 },
  "Erragadda":               { lat: 17.4540, lon: 78.4400 },
  "ESI Hospital":            { lat: 17.4476, lon: 78.4433 },
  "SR Nagar":                { lat: 17.4414, lon: 78.4466 },
  "Ameerpet":                { lat: 17.4374, lon: 78.4487 },
  "Punjagutta":              { lat: 17.4318, lon: 78.4496 },
  "Irrum Manzil":            { lat: 17.4261, lon: 78.4502 },
  "Khairatabad":             { lat: 17.4211, lon: 78.4515 },
  "Lakdi-Ka-Pul":            { lat: 17.4160, lon: 78.4540 },
  "Assembly":                { lat: 17.4084, lon: 78.4614 },
  "Nampally":                { lat: 17.4006, lon: 78.4687 },
  "Gandhi Bhavan":           { lat: 17.3950, lon: 78.4728 },
  "Osmania Medical College": { lat: 17.3888, lon: 78.4754 },
  "MG Bus Station":          { lat: 17.3784, lon: 78.4803 },
  "Malakpet":                { lat: 17.3668, lon: 78.4883 },
  "New Market":              { lat: 17.3589, lon: 78.4954 },
  "Musarambagh":             { lat: 17.3503, lon: 78.5014 },
  "Dilsukhnagar":            { lat: 17.3680, lon: 78.5260 },
  "Chaitanyapuri":           { lat: 17.3590, lon: 78.5338 },
  "Victoria Memorial":       { lat: 17.3500, lon: 78.5398 },
  "LB Nagar":                { lat: 17.3463, lon: 78.5538 },
  // Blue Line
  "Nagole":                  { lat: 17.3952, lon: 78.5545 },
  "Uppal":                   { lat: 17.4052, lon: 78.5589 },
  "Stadium":                 { lat: 17.4074, lon: 78.5424 },
  "NGRI":                    { lat: 17.4125, lon: 78.5345 },
  "Habsiguda":               { lat: 17.4182, lon: 78.5302 },
  "Tarnaka":                 { lat: 17.4250, lon: 78.5338 },
  "Mettuguda":               { lat: 17.4275, lon: 78.5230 },
  "Secunderabad East":       { lat: 17.4345, lon: 78.5094 },
  "Parade Ground":           { lat: 17.4380, lon: 78.4991 },
  "Paradise":                { lat: 17.4455, lon: 78.4973 },
  "Rasoolpura":              { lat: 17.4490, lon: 78.4878 },
  "Prakash Nagar":           { lat: 17.4523, lon: 78.4810 },
  "Begumpet":                { lat: 17.4440, lon: 78.4624 },
  "Madhura Nagar":           { lat: 17.4322, lon: 78.4214 },
  "Yusufguda":               { lat: 17.4310, lon: 78.4078 },
  "Banjara Hills Road No.12":{ lat: 17.4248, lon: 78.3991 },
  "Jubilee Hills Road No.5": { lat: 17.4219, lon: 78.3874 },
  "Jubilee Hills Check Post":{ lat: 17.4301, lon: 78.3803 },
  "Peddamma Temple":         { lat: 17.4387, lon: 78.3741 },
  "Madhapur":                { lat: 17.4472, lon: 78.3900 },
  "Durgam Cheruvu":          { lat: 17.4483, lon: 78.3801 },
  "Hi-Tech City":            { lat: 17.4474, lon: 78.3744 },
  "Raidurg":                 { lat: 17.4388, lon: 78.3564 },
  // Green Line
  "JBS Parade Ground":       { lat: 17.4436, lon: 78.4980 },
  "Secunderabad West":       { lat: 17.4380, lon: 78.4896 },
  "Gandhi Hospital":         { lat: 17.4318, lon: 78.4840 },
  "Musheerabad":             { lat: 17.4256, lon: 78.4817 },
  "RTC X Roads":             { lat: 17.4170, lon: 78.4773 },
  "Chikkadpally":            { lat: 17.4047, lon: 78.4973 },
  "Narayanguda":             { lat: 17.3953, lon: 78.4895 },
  "Sultan Bazar":            { lat: 17.3871, lon: 78.4808 },
};

// ─── All canonical names for embedded-name detection ─────────────────────────
const ALL_STATION_NAMES = Object.keys(METRO_STATION_COORDS);

// ─── Alias table ─────────────────────────────────────────────────────────────
const METRO_NAME_ALIASES = {
  // Red Line
  "lb nagar": "LB Nagar", "l.b. nagar": "LB Nagar", "lbnagar": "LB Nagar",
  "l.b nagar": "LB Nagar", "l b nagar": "LB Nagar",
  "lb nagar metro": "LB Nagar", "lb nagar station": "LB Nagar",
  "lb nagar metro station": "LB Nagar", "lbnagar metro station": "LB Nagar",
  "l.b. nagar metro station": "LB Nagar", "l.b nagar metro station": "LB Nagar",
  "l b nagar metro station": "LB Nagar", "lb nagar metro rail station": "LB Nagar",
  "l.b. nagar metro": "LB Nagar", "lb nagar hyderabad metro station": "LB Nagar",
  "victoria memorial": "Victoria Memorial",
  "victoria memorial metro": "Victoria Memorial",
  "victoria memorial metro station": "Victoria Memorial",
  "chaitanyapuri": "Chaitanyapuri", "chaitanyapuri metro station": "Chaitanyapuri",
  "dilsukhnagar": "Dilsukhnagar", "dilsukhnagar metro station": "Dilsukhnagar",
  "musarambagh": "Musarambagh", "musarambagh metro station": "Musarambagh",
  "new market": "New Market", "new market metro station": "New Market",
  "malakpet": "Malakpet", "malakpet metro station": "Malakpet",
  "mg bus station": "MG Bus Station", "mgbs": "MG Bus Station",
  "mg bus station metro station": "MG Bus Station",
  "mahatma gandhi bus station": "MG Bus Station",
  "osmania medical college": "Osmania Medical College", "omc": "Osmania Medical College",
  "osmania medical college metro station": "Osmania Medical College",
  "gandhi bhavan": "Gandhi Bhavan", "gandhi bhavan metro station": "Gandhi Bhavan",
  "nampally": "Nampally", "nampally metro station": "Nampally",
  "assembly": "Assembly", "assembly metro station": "Assembly",
  "lakdi-ka-pul": "Lakdi-Ka-Pul", "lakdikapul": "Lakdi-Ka-Pul",
  "lakdi ka pul": "Lakdi-Ka-Pul", "lakdi-ka-pul metro station": "Lakdi-Ka-Pul",
  "lakdi ka pul metro station": "Lakdi-Ka-Pul",
  "khairatabad": "Khairatabad", "khairatabad metro station": "Khairatabad",
  "irrum manzil": "Irrum Manzil", "irrummanzil": "Irrum Manzil",
  "irrum manzil metro station": "Irrum Manzil",
  "punjagutta": "Punjagutta", "panjagutta": "Punjagutta", "punjaguta": "Punjagutta",
  "punjagutta metro station": "Punjagutta",
  "ameerpet": "Ameerpet", "ameerpet metro station": "Ameerpet",
  "sr nagar": "SR Nagar", "srnagar": "SR Nagar", "sr nagar metro station": "SR Nagar",
  "esi hospital": "ESI Hospital", "esi hospital metro station": "ESI Hospital",
  "erragadda": "Erragadda", "erragadda metro station": "Erragadda",
  "bharat nagar": "Bharat Nagar", "bharat nagar metro station": "Bharat Nagar",
  "moosapet": "Moosapet", "moosapet metro station": "Moosapet",
  "balanagar": "Balanagar", "balanagar metro station": "Balanagar",
  "kukatpally": "Kukatpally", "kukatpally metro station": "Kukatpally",
  "kphb colony": "KPHB Colony", "kphb": "KPHB Colony",
  "kphb colony metro station": "KPHB Colony",
  "jntu college": "JNTU College", "jntu": "JNTU College",
  "jntu college metro station": "JNTU College",
  "miyapur": "Miyapur", "miyapur metro station": "Miyapur",
  // Blue Line
  "nagole": "Nagole", "nagole metro station": "Nagole",
  "uppal": "Uppal", "uppal metro station": "Uppal",
  "stadium": "Stadium", "stadium metro station": "Stadium",
  "ngri": "NGRI", "ngri metro station": "NGRI",
  "habsiguda": "Habsiguda", "habsiguda metro station": "Habsiguda",
  "tarnaka": "Tarnaka", "tarnaka metro station": "Tarnaka",
  "mettuguda": "Mettuguda", "mettuguda metro station": "Mettuguda",
  "secunderabad east": "Secunderabad East",
  "secunderabad east metro station": "Secunderabad East",
  "parade ground": "Parade Ground", "parade ground metro station": "Parade Ground",
  "paradise": "Paradise", "paradise metro station": "Paradise",
  "rasoolpura": "Rasoolpura", "rasoolpura metro station": "Rasoolpura",
  "prakash nagar": "Prakash Nagar", "prakash nagar metro station": "Prakash Nagar",
  "begumpet": "Begumpet", "begumpet metro station": "Begumpet",
  "madhura nagar": "Madhura Nagar", "madhura nagar metro station": "Madhura Nagar",
  "yusufguda": "Yusufguda", "yusufguda metro station": "Yusufguda",
  "banjara hills road no.12": "Banjara Hills Road No.12",
  "banjara hills": "Banjara Hills Road No.12",
  "banjara hills metro station": "Banjara Hills Road No.12",
  "jubilee hills road no.5": "Jubilee Hills Road No.5",
  "jubilee hills road no.5 metro station": "Jubilee Hills Road No.5",
  "jubilee hills check post": "Jubilee Hills Check Post",
  "jubilee hills": "Jubilee Hills Check Post",
  "jubilee hills check post metro station": "Jubilee Hills Check Post",
  "peddamma temple": "Peddamma Temple", "peddamma gudi": "Peddamma Temple",
  "peddamma temple metro station": "Peddamma Temple",
  "madhapur": "Madhapur", "madhapur metro station": "Madhapur",
  "durgam cheruvu": "Durgam Cheruvu", "durgam cheruvu metro station": "Durgam Cheruvu",
  "hi-tech city": "Hi-Tech City", "hitech city": "Hi-Tech City",
  "hitec city": "Hi-Tech City", "hi tech city": "Hi-Tech City",
  "hi-tech city metro station": "Hi-Tech City",
  "hitech city metro station": "Hi-Tech City",
  "hi tech city metro station": "Hi-Tech City",
  "raidurg": "Raidurg", "raidurg metro station": "Raidurg",
  // Green Line
  "jbs parade ground": "JBS Parade Ground", "jbs": "JBS Parade Ground",
  "parade grounds": "JBS Parade Ground",
  "jbs parade ground metro station": "JBS Parade Ground",
  "secunderabad west": "Secunderabad West", "secunderabad": "Secunderabad West",
  "secunderabad west metro station": "Secunderabad West",
  "gandhi hospital": "Gandhi Hospital", "gandhi hospital metro station": "Gandhi Hospital",
  "musheerabad": "Musheerabad", "musheerabad metro station": "Musheerabad",
  "rtc x roads": "RTC X Roads", "rtc crossroads": "RTC X Roads",
  "rtc x road": "RTC X Roads", "rtc x roads metro station": "RTC X Roads",
  "chikkadpally": "Chikkadpally", "chikkadpally metro station": "Chikkadpally",
  "narayanguda": "Narayanguda", "narayanguda metro station": "Narayanguda",
  "sultan bazar": "Sultan Bazar", "sultanbazar": "Sultan Bazar",
  "sultan bazar metro station": "Sultan Bazar",
};

// ─────────────────────────────────────────────────────────────────────────────
// normalizeForMetro
// Strips all metro/station suffixes (longest-first via regex, not endsWith loop).
// ─────────────────────────────────────────────────────────────────────────────
function normalizeForMetro(raw) {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .trim()
    .replace(/,.*$/, "")              // strip ", Hyderabad" etc
    .trim()
    .replace(/\s+(hyderabad|telangana|india)\s*$/i, "")
    .trim()
    .replace(/\s+/g, " ")
    // Strip suffixes — longest first to avoid partial matches
    .replace(
      /\s*(hyderabad\s+metro\s+rail\s+station|hyderabad\s+metro\s+station|metro\s+rail\s+station|metro\s+train\s+station|metro\s+station|metro\s+stop|metro\s+rail|metro\s+train|railway\s+station|bus\s+station|bus\s+stop|metro|station|stop)\s*$/i,
      ""
    )
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// resolveMetroStationCoords
//
// Returns hardcoded coords for a metro station name, or null if not a station.
//
// Multi-step resolution:
//  0. Strip comma-suffix, then scan for embedded canonical station names
//     (handles "LB Nagar Metro Station, Chaitanyapuri, Hyderabad")
//  1. Normalize + alias table lookup
//  2. Exact case-insensitive match on canonical names
//  3. Starts-with / contains match
// ─────────────────────────────────────────────────────────────────────────────
function resolveMetroStationCoords(placeName) {
  if (!placeName) return null;

  // Step 0: Embedded canonical name scan (strip comma-suffix first)
  const rawStripped = placeName.toLowerCase().trim().replace(/,.*$/, "").trim();
  // Sort longest-first so "Secunderabad East" beats "Secunderabad"
  const sortedNames = [...ALL_STATION_NAMES].sort((a, b) => b.length - a.length);
  for (const stName of sortedNames) {
    if (rawStripped.includes(stName.toLowerCase()) && METRO_STATION_COORDS[stName]) {
      return METRO_STATION_COORDS[stName];
    }
  }

  // Step 1: Normalize + alias lookup
  const normKey = normalizeForMetro(placeName);
  const rawKey  = placeName.toLowerCase().trim().replace(/,.*$/, "").trim().replace(/\s+/g, " ");

  const targetName = METRO_NAME_ALIASES[normKey] || METRO_NAME_ALIASES[rawKey];
  if (targetName && METRO_STATION_COORDS[targetName]) {
    return METRO_STATION_COORDS[targetName];
  }

  // Step 2: Exact case-insensitive match
  for (const stName of ALL_STATION_NAMES) {
    if (stName.toLowerCase() === normKey || stName.toLowerCase() === rawKey) {
      return METRO_STATION_COORDS[stName];
    }
  }

  // Step 3: Starts-with / contains
  for (const stName of sortedNames) {
    const sl = stName.toLowerCase();
    if (sl.startsWith(normKey) || normKey.startsWith(sl) ||
        sl.includes(normKey)   || normKey.includes(sl)) {
      return METRO_STATION_COORDS[stName];
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// snapToMetroStation
//
// NEW: Even when resolveMetroStationCoords fails by name, if the client-provided
// coords are within 500 m of a known metro station AND the place name contains
// the word "metro", snap to that station's hardcoded coords.
// This handles the edge case where Google returns slightly-off coords and a
// name format we don't recognise.
// ─────────────────────────────────────────────────────────────────────────────
function haversineKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) *
    Math.cos(b.lat * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function snapToMetroStation(placeName, clientCoords) {
  if (!clientCoords) return null;
  const isMetroQuery = /metro|station/i.test(placeName || "");
  if (!isMetroQuery) return null;

  let nearest = null;
  let nearestDist = Infinity;
  for (const [stName, coords] of Object.entries(METRO_STATION_COORDS)) {
    const d = haversineKm(clientCoords, coords);
    if (d < nearestDist) { nearestDist = d; nearest = { stName, coords }; }
  }
  // Snap if within 1.5 km (Google geocoder can be off by up to ~1 km for metro stations)
  if (nearest && nearestDist <= 1.5) {
    console.log(`  [snap] "${placeName}" → snapped to "${nearest.stName}" (${nearestDist.toFixed(3)} km away)`);
    return nearest.coords;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// getRoutes — main handler
// ─────────────────────────────────────────────────────────────────────────────
async function getRoutes(req, res) {
  try {
    const { from, to, fromLat, fromLon, toLat, toLon } = req.query;
    if (!from || !to) return res.status(400).json({ error: "from and to are required" });

    console.log("\n========== ROUTE REQUEST ==========");
    console.log("from:", JSON.stringify(from));
    console.log("to:  ", JSON.stringify(to));
    console.log("client fromLat/Lon:", fromLat, fromLon);
    console.log("client toLat/Lon:  ", toLat, toLon);

    // ── 1. Resolve FROM coords ────────────────────────────────────────────────
    // Priority: (1) hardcoded metro name match, (2) snap if metro query + close,
    //           (3) client-provided coords, (4) Nominatim geocode
    let fromCoords;
    const fromMetroCoords = resolveMetroStationCoords(from);
    if (fromMetroCoords) {
      fromCoords = fromMetroCoords;
      console.log("FROM → hardcoded metro coords:", fromCoords);
    } else {
      // Get client/geocoded coords first, then maybe snap
      let rawFromCoords;
      if (fromLat && fromLon) {
        rawFromCoords = { lat: parseFloat(fromLat), lon: parseFloat(fromLon) };
      } else {
        rawFromCoords = await geocode(from);
      }
      // Try snapping to nearest metro station if the query looks metro-related
      const snapped = snapToMetroStation(from, rawFromCoords);
      fromCoords = snapped || rawFromCoords;
      console.log("FROM → coords:", fromCoords, snapped ? "(snapped)" : "(raw)");
    }

    // ── 2. Resolve TO coords ──────────────────────────────────────────────────
    let toCoords;
    const toMetroCoords = resolveMetroStationCoords(to);
    if (toMetroCoords) {
      toCoords = toMetroCoords;
      console.log("TO   → hardcoded metro coords:", toCoords);
    } else {
      let rawToCoords;
      if (toLat && toLon) {
        rawToCoords = { lat: parseFloat(toLat), lon: parseFloat(toLon) };
      } else {
        rawToCoords = await geocode(to);
      }
      const snapped = snapToMetroStation(to, rawToCoords);
      toCoords = snapped || rawToCoords;
      console.log("TO   → coords:", toCoords, snapped ? "(snapped)" : "(raw)");
    }

    // ── 3. OSRM driving route ─────────────────────────────────────────────────
    const osrmUrl =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${fromCoords.lon},${fromCoords.lat};${toCoords.lon},${toCoords.lat}` +
      `?overview=full&geometries=geojson&alternatives=true`;

    const osrmRes  = await axios.get(osrmUrl);
    const osrmData = osrmRes.data;
    if (!osrmData || osrmData.code !== "Ok") {
      return res.status(500).json({ error: "Could not get route" });
    }

    const primary     = osrmData.routes[0];
    const distanceKm  = primary.distance / 1000;
    const durationMin = Math.round(primary.duration / 60);

    // ── 4. Traffic ────────────────────────────────────────────────────────────
    const hour            = new Date().getHours();
    const isPeak          = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);
    const trafficLevel    = isPeak ? "high" : (hour >= 11 && hour <= 16) ? "medium" : "low";
    const trafficMult     = trafficLevel === "high" ? 1.6 : trafficLevel === "medium" ? 1.25 : 1.0;
    const trafficDuration = Math.round(durationMin * trafficMult);

    // ── 5. All routes ─────────────────────────────────────────────────────────
    const allRoutes = osrmData.routes.map((route, idx) => {
      const distKm  = route.distance / 1000;
      const durMin  = Math.round(route.duration / 60);
      const steps   = route.legs?.[0]?.steps || [];
      const viaRoad = steps.find(s => s.name && s.name.length > 2)?.name || `Route ${idx + 1}`;
      return {
        idx,
        distanceKm:      parseFloat(distKm.toFixed(1)),
        durationMin:     durMin,
        trafficDuration: Math.round(durMin * trafficMult),
        viaRoad,
        trafficNote:     idx === 0 ? "Best route now" : "Alternative",
        geometry:        route.geometry,
      };
    });

    // ── 6. Cost options ───────────────────────────────────────────────────────
    const options = calculateCost(distanceKm, durationMin, from, to);

    // ── 7. Bus info ───────────────────────────────────────────────────────────
    const busInfo = getBusRouteData(from, to, fromCoords, toCoords, distanceKm, durationMin);

    // ── 8. Metro info ─────────────────────────────────────────────────────────
    let metroInfo = null;
    try {
      if (typeof buildMetroInfo === "function") {
        metroInfo = buildMetroInfo(from, to, fromCoords, toCoords);
        console.log("metroInfo.fromStation:", metroInfo?.fromStation);
        console.log("metroInfo.walkToBoard:", metroInfo?.walkToBoard);
      }
    } catch (e) {
      console.warn("Metro info error:", e.message);
    }
    console.log("====================================\n");

    // ── 9. Recommendation ─────────────────────────────────────────────────────
    const optionArray    = Object.values(options);
    const recommendation = optionArray.reduce((best, opt) => {
      const score = opt.cost * 0.4 + opt.time * 0.6;
      return score < best.score ? { ...opt, score } : best;
    }, { ...optionArray[0], score: Infinity });

    return res.json({
      distance:        `${distanceKm.toFixed(1)} km`,
      time:            `${durationMin} min`,
      distanceKm:      parseFloat(distanceKm.toFixed(1)),
      durationMin,
      trafficLevel,
      trafficDuration,
      fromCoords,
      toCoords,
      allRoutes,
      options,
      recommendation,
      metroInfo,
      busInfo,
    });

  } catch (err) {
    console.error("Route error:", err);
    return res.status(500).json({ error: "Internal server error", detail: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// geocode — Nominatim fallback
// ─────────────────────────────────────────────────────────────────────────────
async function geocode(place) {
  const query = encodeURIComponent(place + ", Hyderabad, Telangana, India");
  const url   = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&countrycodes=IN`;
  try {
    const response = await axios.get(url, { headers: { "User-Agent": "SmartCommute/1.0" } });
    const data     = response.data;
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
  } catch (e) {
    console.warn("Geocode failed for:", place, e.message);
  }
  return { lat: 17.3850, lon: 78.4867 }; // Hyderabad center fallback
}

module.exports = { getRoutes };