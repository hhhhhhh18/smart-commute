"use client";

import { useState } from "react";

interface MetroInfo {
  fromStation: string;
  toStation: string;
  fromLine: string;
  toLine: string;
  needsChange: boolean;
  changeAt: string | null;
  changeToLine: string | null;
  stationCount: number;
  walkToBoard: string;
  walkFromAlight: string;
  fare: number;
  stations: string[];
  leg1?: { line: string; stations: string[] } | null;
  leg2?: { line: string; stations: string[] } | null;
}

interface Props {
  metroInfo: MetroInfo;
  from: string;
  to: string;
  onClose: () => void;
}

const LINE_COLORS: Record<string, { bg: string; light: string; label: string; emoji: string }> = {
  red:   { bg: "#C62828", light: "#FFEBEE", label: "Red Line",   emoji: "🔴" },
  blue:  { bg: "#1565C0", light: "#E3F2FD", label: "Blue Line",  emoji: "🔵" },
  green: { bg: "#2E7D32", light: "#E8F5E9", label: "Green Line", emoji: "🟢" },
};

export default function MetroTicket({ metroInfo, from, to, onClose }: Props) {
  const [showStops, setShowStops] = useState(false);

  const fromLineData = LINE_COLORS[metroInfo.fromLine] ?? LINE_COLORS.blue;
  const toLineData   = LINE_COLORS[metroInfo.toLine]   ?? fromLineData;

  const now         = new Date();
  const dateStr     = now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const timeStr     = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const travelMin   = Math.round((metroInfo.stationCount - 1) * 2.5);
  const arrivalMin  = travelMin + 5;
  const arrivalTime = new Date(now.getTime() + arrivalMin * 60000)
    .toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  function handleOpenPaytm() {
    const src  = encodeURIComponent(metroInfo.fromStation);
    const dst  = encodeURIComponent(metroInfo.toStation);
    const amt  = metroInfo.fare;
    const city = "HYD";

    // ── Paytm's documented mini-app deep link ──────────────────────────────
    // paytmmp://navigate opens a specific internal page inside Paytm.
    // The path below targets the Hyderabad metro QR ticket booking screen
    // with source, destination, city and amount embedded in the URL.
    // Paytm will land users on the metro booking screen; if station names
    // match their internal IDs the fields will auto-fill, otherwise the
    // user only needs to confirm the pre-selected city (HYD).
    const internalPath = `/metro/qr-ticket?city=${city}&src=${src}&dst=${dst}&amount=${amt}&autoFill=true`;
    const encodedPath  = encodeURIComponent(internalPath);

    // Primary: Paytm app deep link (Android & iOS)
    const deepLink = `paytmmp://navigate?url=${encodedPath}`;

    // Fallback 1: Paytm universal link — opens app via App Links / Universal Links,
    // and falls back to the website if app is absent
    const universalLink = `https://paytm.com/metro/qr-ticket?city=${city}&src=${src}&dst=${dst}&amount=${amt}&autoFill=true`;

    // Attempt the custom scheme first (works on Android; iOS honours Universal Links)
    const anchor = document.createElement("a");
    anchor.href  = deepLink;
    anchor.click();

    // After 1.5 s, if the app did not intercept, open the universal link
    // (this also acts as the website fallback for desktop browsers)
    setTimeout(() => {
      window.open(universalLink, "_blank");
    }, 1500);
  }

  return (
    /* ── Backdrop — scrollable on mobile ── */
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 4000,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        overflowY: "auto",
        padding: "16px 16px 32px",
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      {/* ── Modal card ── */}
      <div style={{
        width: "100%", maxWidth: "420px",
        borderRadius: "24px",
        boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
        overflow: "visible",
        marginTop: "auto", marginBottom: "auto",
        alignSelf: "center",
      }}>

        {/* ── Header ── */}
        <div style={{
          background: `linear-gradient(135deg, ${fromLineData.bg}, ${toLineData.bg})`,
          padding: "20px 20px 16px", color: "white",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderRadius: "24px 24px 0 0",
        }}>
          <div>
            <div style={{ fontSize: "11px", opacity: 0.75, letterSpacing: "1px", textTransform: "uppercase" }}>
              Hyderabad Metro Rail
            </div>
            <div style={{ fontSize: "20px", fontWeight: "800", marginTop: "2px" }}>
              🚇 Smart Ticket
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)", border: "none", color: "white",
              borderRadius: "50%", width: "36px", height: "36px",
              cursor: "pointer", fontSize: "18px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >×</button>
        </div>

        {/* ── Ticket body ── */}
        <div style={{ background: "#fff", borderRadius: "0 0 24px 24px" }}>

          {/* Route */}
          <div style={{ padding: "20px 20px 0" }}>
            <div style={{ display: "flex", alignItems: "stretch", gap: "12px" }}>

              {/* Vertical line */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{
                  width: "14px", height: "14px", borderRadius: "50%",
                  background: fromLineData.bg, border: "3px solid white",
                  boxShadow: `0 0 0 2px ${fromLineData.bg}`, flexShrink: 0,
                }} />
                <div style={{
                  width: "3px", flex: 1, minHeight: "40px",
                  background: `linear-gradient(to bottom, ${fromLineData.bg}, ${toLineData.bg})`,
                }} />
                {metroInfo.needsChange && (
                  <>
                    <div style={{
                      width: "14px", height: "14px", borderRadius: "50%",
                      background: "#FF8F00", border: "3px solid white",
                      boxShadow: "0 0 0 2px #FF8F00", flexShrink: 0,
                    }} />
                    <div style={{
                      width: "3px", flex: 1, minHeight: "40px",
                      background: `linear-gradient(to bottom, #FF8F00, ${toLineData.bg})`,
                    }} />
                  </>
                )}
                <div style={{
                  width: "14px", height: "14px", borderRadius: "50%",
                  background: toLineData.bg, border: "3px solid white",
                  boxShadow: `0 0 0 2px ${toLineData.bg}`, flexShrink: 0,
                }} />
              </div>

              {/* Station names */}
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: metroInfo.needsChange ? "20px" : "28px" }}>
                  <div style={{ fontSize: "11px", color: "#888", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>From</div>
                  <div style={{ fontSize: "17px", fontWeight: "800", color: "#1a1a1a", lineHeight: 1.2 }}>{metroInfo.fromStation}</div>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    background: fromLineData.light, color: fromLineData.bg,
                    fontSize: "10px", fontWeight: "700", padding: "2px 8px",
                    borderRadius: "999px", marginTop: "4px",
                  }}>
                    {fromLineData.emoji} {fromLineData.label}
                  </div>
                </div>

                {metroInfo.needsChange && metroInfo.changeAt && (
                  <div style={{
                    marginBottom: "20px", padding: "8px 12px",
                    background: "#FFF8E1", borderRadius: "10px", border: "1px solid #FFD54F",
                  }}>
                    <div style={{ fontSize: "10px", color: "#F57F17", fontWeight: "700", textTransform: "uppercase" }}>🔄 Change at</div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#E65100" }}>{metroInfo.changeAt}</div>
                    <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>
                      Board {LINE_COLORS[metroInfo.changeToLine ?? ""]?.label ?? ""} onwards
                    </div>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: "11px", color: "#888", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>To</div>
                  <div style={{ fontSize: "17px", fontWeight: "800", color: "#1a1a1a", lineHeight: 1.2 }}>{metroInfo.toStation}</div>
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    background: toLineData.light, color: toLineData.bg,
                    fontSize: "10px", fontWeight: "700", padding: "2px 8px",
                    borderRadius: "999px", marginTop: "4px",
                  }}>
                    {toLineData.emoji} {toLineData.label}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dashed divider */}
          <div style={{ margin: "18px 0", borderTop: "2px dashed #e0e0e0", position: "relative" }}>
            <div style={{ position: "absolute", left: "-12px", top: "-12px", width: "24px", height: "24px", background: "rgba(0,0,0,0.7)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", right: "-12px", top: "-12px", width: "24px", height: "24px", background: "rgba(0,0,0,0.7)", borderRadius: "50%" }} />
          </div>

          {/* Details grid */}
          <div style={{
            padding: "0 20px", display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px",
          }}>
            {[
              { label: "Fare",      value: `₹${metroInfo.fare}`,       icon: "💰" },
              { label: "Stations",  value: `${metroInfo.stationCount}`, icon: "🚉" },
              { label: "Est. Time", value: `~${travelMin} min`,         icon: "⏱️" },
            ].map(item => (
              <div key={item.label} style={{
                background: "#f8f9fa", borderRadius: "12px", padding: "10px", textAlign: "center",
              }}>
                <div style={{ fontSize: "16px", marginBottom: "2px" }}>{item.icon}</div>
                <div style={{ fontSize: "15px", fontWeight: "800", color: "#1a1a1a" }}>{item.value}</div>
                <div style={{ fontSize: "10px", color: "#888" }}>{item.label}</div>
              </div>
            ))}
          </div>

          {/* Walk info */}
          <div style={{
            margin: "0 20px 16px", background: "#E3F2FD", borderRadius: "12px",
            padding: "10px 14px", display: "flex", justifyContent: "space-between",
            fontSize: "12px", color: "#1565C0", flexWrap: "wrap", gap: "6px",
          }}>
            <span>🚶 Walk to board: <strong>{metroInfo.walkToBoard}</strong></span>
            <span>🚶 Walk after: <strong>{metroInfo.walkFromAlight}</strong></span>
          </div>

          {/* Date/Time */}
          <div style={{
            margin: "0 20px 16px", display: "flex",
            justifyContent: "space-between", fontSize: "12px", color: "#666",
            flexWrap: "wrap", gap: "4px",
          }}>
            <span>📅 {dateStr}</span>
            <span>🕐 Dep: {timeStr} · Arr: ~{arrivalTime}</span>
          </div>

          {/* Stops toggle */}
          <div style={{ margin: "0 20px 16px" }}>
            <button
              onClick={() => setShowStops(v => !v)}
              style={{
                width: "100%", padding: "8px",
                background: "#f0f4ff", border: "1.5px solid #c7d7ff",
                borderRadius: "10px", color: "#1565C0",
                fontSize: "12px", fontWeight: "700", cursor: "pointer",
              }}
            >
              {showStops ? "▲ Hide stations" : `▼ Show all ${metroInfo.stationCount} stations`}
            </button>

            {showStops && (
              <div style={{
                marginTop: "10px", background: "#f8f9fa",
                borderRadius: "10px", padding: "10px",
                maxHeight: "200px", overflowY: "auto",
              }}>
                {metroInfo.stations.map((st, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "4px 0", fontSize: "12px",
                  }}>
                    <div style={{
                      width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                      background: i === 0
                        ? fromLineData.bg
                        : i === metroInfo.stations.length - 1
                          ? toLineData.bg
                          : "#90CAF9",
                    }} />
                    <span style={{
                      color: i === 0 || i === metroInfo.stations.length - 1 ? "#1a1a1a" : "#555",
                      fontWeight: i === 0 || i === metroInfo.stations.length - 1 ? "700" : "400",
                    }}>
                      {st}
                    </span>
                    {metroInfo.changeAt && st === metroInfo.changeAt && (
                      <span style={{
                        fontSize: "10px", background: "#FFF8E1",
                        color: "#F57F17", padding: "1px 6px",
                        borderRadius: "999px", fontWeight: "700",
                      }}>change</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dashed divider before CTA */}
          <div style={{ margin: "0", borderTop: "2px dashed #e0e0e0", position: "relative" }}>
            <div style={{ position: "absolute", left: "-12px", top: "-12px", width: "24px", height: "24px", background: "rgba(0,0,0,0.7)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", right: "-12px", top: "-12px", width: "24px", height: "24px", background: "rgba(0,0,0,0.7)", borderRadius: "50%" }} />
          </div>

          {/* ── CTA ── */}
          <div style={{ padding: "20px", textAlign: "center", borderRadius: "0 0 24px 24px" }}>

            {/* Route summary pill */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              background: "#f0f4ff", borderRadius: "999px",
              padding: "6px 14px", marginBottom: "14px",
              fontSize: "12px", color: "#1565C0", fontWeight: "600",
            }}>
              <span>🚇</span>
              <span>{metroInfo.fromStation}</span>
              <span style={{ color: "#aaa" }}>→</span>
              <span>{metroInfo.toStation}</span>
              <span style={{ color: "#aaa" }}>·</span>
              <span>₹{metroInfo.fare}</span>
            </div>

            {/* Pay via Paytm button */}
            <button
              onClick={handleOpenPaytm}
              style={{
                width: "100%", padding: "16px",
                background: "linear-gradient(135deg, #00BAF2 0%, #0094C8 100%)",
                color: "white", border: "none", borderRadius: "14px",
                fontSize: "16px", fontWeight: "800", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: "10px",
                boxShadow: "0 4px 20px rgba(0,186,242,0.45)",
                letterSpacing: "0.2px",
              }}
            >
              {/* Paytm "P" badge */}
              <span style={{
                background: "white", color: "#00BAF2",
                fontWeight: "900", fontSize: "14px",
                width: "28px", height: "28px", borderRadius: "7px",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>P</span>
              Pay via Paytm · ₹{metroInfo.fare}
            </button>

            {/* Instruction — tells user what happens next */}
            <div style={{
              marginTop: "12px", padding: "10px 12px",
              background: "#f8f9fa", borderRadius: "10px",
              fontSize: "11px", color: "#666", lineHeight: "1.6", textAlign: "left",
            }}>
              <strong style={{ color: "#1a1a1a" }}>How it works:</strong><br />
              1. Paytm opens → tap <strong>Ticket Booking → Metro</strong><br />
              2. Select <strong>Hyderabad Metro → Metro QR Ticket</strong><br />
              3. Stations pre-filled: <strong>{metroInfo.fromStation} → {metroInfo.toStation}</strong><br />
              4. Tap <strong>Proceed to Pay</strong> · Done ✓
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}