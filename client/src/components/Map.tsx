"use client";

import { useEffect, useRef } from "react";

interface RouteConfig {
  drawKey: number;
  activeMode: string;
  trafficLevel: "low" | "medium" | "high" | null;
  busStops: string[];
  metroInfo: any;
  allRoutes: any[];
  fromCoords: [number, number] | null;
  toCoords: [number, number] | null;
}

interface MapProps {
  fromCoords: [number, number] | null;
  toCoords: [number, number] | null;
  routeConfig: RouteConfig;
  selectedRouteIdx: number;
  onRouteSelect?: (index: number) => void;
}

const METRO_LINE_COLORS: Record<string, string> = {
  red:   "#E53935",
  blue:  "#1E88E5",
  green: "#43A047",
};

export default function Map({ fromCoords, toCoords, routeConfig, selectedRouteIdx, onRouteSelect }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const layersRef    = useRef<any[]>([]);
  const locationRef  = useRef<any>(null);
  const watchIdRef   = useRef<number | null>(null);
  const initedRef    = useRef(false);

  // ── Init map once ─────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      initedRef.current = false;
    }
    if (initedRef.current) return;
    initedRef.current = true;

    import("leaflet").then((L) => {
      if (!containerRef.current || mapRef.current) return;
      const el = containerRef.current as any;
      if (el._leaflet_id) el._leaflet_id = null;

      const map = L.map(containerRef.current, { center: [17.4, 78.48], zoom: 12 });
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        { attribution: "© OpenStreetMap © CARTO", subdomains: "abcd", maxZoom: 20 }
      ).addTo(map);
      mapRef.current = map;

      // Live location tracking
      if (navigator.geolocation) {
        const id = navigator.geolocation.watchPosition(
          (pos) => {
            import("leaflet").then((L2) => {
              if (!mapRef.current) return;
              if (locationRef.current) mapRef.current.removeLayer(locationRef.current);
              const icon = L2.divIcon({
                className: "",
                html: `<div style="
                  width:16px;height:16px;
                  background:#4285F4;
                  border:3px solid white;
                  border-radius:50%;
                  box-shadow:0 0 0 6px rgba(66,133,244,0.25);
                "></div>`,
                iconAnchor: [8, 8],
              });
              locationRef.current = L2.marker(
                [pos.coords.latitude, pos.coords.longitude],
                { icon }
              ).addTo(mapRef.current);
            });
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 5000 }
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

  // ── Draw route whenever config changes ────────────────────────
  useEffect(() => {
    if (routeConfig.drawKey === 0 || !fromCoords || !toCoords) return;

    function clearLayers() {
      layersRef.current.forEach((l) => { try { mapRef.current?.removeLayer(l); } catch {} });
      layersRef.current = [];
      try { mapRef.current?.closePopup(); } catch {}
    }

    function addPins(L: any, map: any) {
      const startIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:14px;height:14px;
          background:#4285F4;
          border:3px solid white;
          border-radius:50%;
          box-shadow:0 2px 6px rgba(0,0,0,0.5);
        "></div>`,
        iconAnchor: [7, 7],
      });
      const endIcon = L.divIcon({
        className: "",
        html: `<div style="width:14px;height:30px;display:flex;flex-direction:column;align-items:center;">
          <div style="width:14px;height:14px;background:#EA4335;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.5);"></div>
          <div style="width:3px;flex:1;background:#EA4335;opacity:0.8;"></div>
        </div>`,
        iconAnchor: [7, 30],
      });
      layersRef.current.push(
        L.marker(fromCoords!, { icon: startIcon }).addTo(map),
        L.marker(toCoords!,   { icon: endIcon   }).addTo(map)
      );
    }

    function draw() {
      import("leaflet").then((L) => {
        const map = mapRef.current;
        if (!map) return;

        clearLayers();

        const { activeMode, trafficLevel, busStops, metroInfo, allRoutes } = routeConfig;
        const baseMode   = activeMode.startsWith("self_") ? activeMode.replace("self_", "") : activeMode;
        const routeColor = baseMode === "metro" ? "#E53935" : "#1A73E8"; // always blue except metro
        const bounds     = L.latLngBounds([]);

        // ── Fallback if no allRoutes ──────────────────────────
        if (!allRoutes?.length) {
          const url =
            `https://router.project-osrm.org/route/v1/driving/` +
            `${fromCoords[1]},${fromCoords[0]};${toCoords[1]},${toCoords[0]}` +
            `?overview=full&geometries=geojson&alternatives=true`;

          fetch(url).then(r => r.json()).then(data => {
            if (data.code !== "Ok") return;
            data.routes.forEach((route: any, idx: number) => {
              const latLngs = route.geometry.coordinates.map((c: number[]) => [c[1], c[0]]);
              const poly = L.polyline(latLngs, {
                color:     idx === 0 ? routeColor : "#BDBDBD",
                weight:    idx === 0 ? 6 : 4,
                opacity:   idx === 0 ? 1 : 0.45,
                dashArray: idx === 0 ? undefined : "10 8",
              }).addTo(map);
              layersRef.current.push(poly);
              bounds.extend(poly.getBounds());
            });
            addPins(L, map);
            if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50] });
          });
          return;
        }

        // ── Draw all routes ───────────────────────────────────
        allRoutes.forEach((route: any, idx: number) => {
          const isPrimary = idx === selectedRouteIdx;
          const coords    = route.geometry.coordinates;
          const latLngs   = coords.map((c: number[]) => [c[1], c[0]]);

          if (!isPrimary) {
            // Alternative route — grey dashed, clickable
            const altPoly = L.polyline(latLngs, {
              color: "#BDBDBD", weight: 5, opacity: 0.5, dashArray: "10 8",
            }).addTo(map);
            altPoly.on("click", () => { if (onRouteSelect) onRouteSelect(idx); });
            bounds.extend(altPoly.getBounds());

            // Time pill on alternative
            const altMid  = coords[Math.floor(coords.length * 0.5)];
            const altIcon = L.divIcon({
              className: "",
              html: `<div style="
                background:white;color:#444;
                font-size:11px;font-weight:600;
                padding:3px 10px;border-radius:20px;
                border:1.5px solid #BDBDBD;cursor:pointer;
                white-space:nowrap;
                box-shadow:0 1px 4px rgba(0,0,0,0.15);
              ">${route.trafficDuration ?? route.durationMin} min</div>`,
              iconAnchor: [30, 10],
            });
            const altM = L.marker([altMid[1], altMid[0]], { icon: altIcon }).addTo(map);
            altM.on("click", () => { if (onRouteSelect) onRouteSelect(idx); });
            layersRef.current.push(altPoly, altM);
            return;
          }

          // ── Primary route ─────────────────────────────────

          // 1. Full blue base line
          const basePoly = L.polyline(latLngs, {
            color: routeColor, weight: 6, opacity: 1,
          }).addTo(map);
          layersRef.current.push(basePoly);
          bounds.extend(basePoly.getBounds());

          // 2. Traffic overlay — yellow/red segments on top of blue
          if (trafficLevel && trafficLevel !== "low") {
            const trafficColor = trafficLevel === "high" ? "#EA4335" : "#F9A825";

            // First congestion zone (38–52% of route)
            const s1   = Math.floor(coords.length * 0.38);
            const e1   = Math.floor(coords.length * 0.52);
            const seg1 = coords.slice(s1, e1).map((c: number[]) => [c[1], c[0]]);
            if (seg1.length > 1) {
              const tp1 = L.polyline(seg1, { color: trafficColor, weight: 7, opacity: 0.9 }).addTo(map);
              layersRef.current.push(tp1);
            }

            // Second zone for heavy traffic (65–75%)
            if (trafficLevel === "high") {
              const s2   = Math.floor(coords.length * 0.65);
              const e2   = Math.floor(coords.length * 0.75);
              const seg2 = coords.slice(s2, e2).map((c: number[]) => [c[1], c[0]]);
              if (seg2.length > 1) {
                const tp2 = L.polyline(seg2, { color: trafficColor, weight: 7, opacity: 0.9 }).addTo(map);
                layersRef.current.push(tp2);
              }
            }
          }

          // 3. Time pill label (Google Maps style)
          const midCoord = coords[Math.floor(coords.length * 0.5)];
          const timeMin  = route.trafficDuration ?? route.durationMin;
          const timeIcon = L.divIcon({
            className: "",
            html: `<div style="
              background:#1A73E8;color:white;
              font-size:12px;font-weight:700;
              padding:5px 12px;border-radius:20px;
              white-space:nowrap;
              box-shadow:0 2px 6px rgba(0,0,0,0.25);
            ">${timeMin} min · ${route.distanceKm} km</div>`,
            iconAnchor: [50, 10],
          });
          layersRef.current.push(
            L.marker([midCoord[1], midCoord[0]], { icon: timeIcon }).addTo(map)
          );

          // 4. Bus stops
          if (baseMode === "bus" && busStops.length > 0) {
            const step = Math.floor(coords.length / (busStops.length + 1));
            busStops.forEach((stop: string, i: number) => {
              const c = coords[Math.min(step * (i + 1), coords.length - 1)];
              if (!c) return;
              const icon = L.divIcon({
                className: "",
                html: `<div style="
                  width:12px;height:12px;
                  background:#1565C0;
                  border:3px solid white;
                  border-radius:50%;
                  box-shadow:0 2px 5px rgba(0,0,0,0.5);
                "></div>`,
                iconAnchor: [6, 6],
              });
              const m = L.marker([c[1], c[0]], { icon })
                .addTo(map)
                .bindTooltip(`🚌 ${stop}`, { permanent: true, direction: "top", offset: [0, -8] });
              layersRef.current.push(m);
            });
          }

          // 5. Metro stations
          if (baseMode === "metro" && metroInfo) {
            const fromC = METRO_LINE_COLORS[metroInfo.fromLine] || "#E53935";
            const toC   = METRO_LINE_COLORS[metroInfo.toLine]   || fromC;

            // Restyle line with metro color
            basePoly.setStyle({ color: fromC, weight: 7 });

            const stations: { coord: number[]; label: string; bg: string; big: boolean }[] = [
              { coord: coords[0], label: `🚇 ${metroInfo.fromStation}`, bg: fromC, big: true },
            ];

            // Intermediate stations
            if (metroInfo.intermediateStations?.length > 0) {
              const step2 = Math.floor(coords.length / (metroInfo.intermediateStations.length + 1));
              metroInfo.intermediateStations.forEach((st: string, i: number) => {
                const c2 = coords[Math.min(step2 * (i + 1), coords.length - 1)];
                stations.push({ coord: c2, label: st, bg: fromC, big: false });
              });
            }

            if (metroInfo.needsChange) {
              stations.push({
                coord: coords[Math.floor(coords.length / 2)],
                label: `🔄 ${metroInfo.changeAt}`,
                bg: "#FFA000",
                big: true,
              });
            }

            stations.push({
              coord: coords[coords.length - 1],
              label: `🚇 ${metroInfo.toStation}`,
              bg: toC,
              big: true,
            });

            stations.forEach((s) => {
              const icon = L.divIcon({
                className: "",
                html: s.big
                  ? `<div style="background:${s.bg};color:white;font-size:10px;font-weight:700;padding:3px 8px;border-radius:8px;white-space:nowrap;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);">${s.label}</div>`
                  : `<div style="width:10px;height:10px;background:${s.bg};border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,
                iconAnchor: s.big ? [0, 10] : [5, 5],
              });
              const m = L.marker([s.coord[1], s.coord[0]], { icon }).addTo(map);
              if (!s.big) m.bindTooltip(s.label, { direction: "top" });
              layersRef.current.push(m);
            });
          }
        });

        addPins(L, map);
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50] });
      });
    }

    if (!mapRef.current) {
      const t = setInterval(() => {
        if (mapRef.current) { clearInterval(t); draw(); }
      }, 100);
      return;
    }

    draw();
  }, [routeConfig, fromCoords, toCoords, selectedRouteIdx]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={containerRef} style={{ width: "100%", height: "450px", borderRadius: "12px" }} />
    </>
  );
}