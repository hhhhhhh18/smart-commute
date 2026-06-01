"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const MODES = [
  { id:"bus",   label:"Bus",   emoji:"🚌" },
  { id:"metro", label:"Metro", emoji:"🚇" },
  { id:"bike",  label:"Bike",  emoji:"🏍️" },
  { id:"car",   label:"Car",   emoji:"🚗" },
];

interface Settings {
  home_name: string; home_lat: string; home_lng: string;
  work_name: string; work_lat: string; work_lng: string;
  default_mode: string;
}

const EMPTY: Settings = {
  home_name:"", home_lat:"", home_lng:"",
  work_name:"", work_lat:"", work_lng:"",
  default_mode:"bus",
};

export default function SettingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [form, setForm]       = useState<Settings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [locating, setLocating] = useState<"home"|"work"|null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        setForm({
          home_name:    data.home_name    ?? "",
          home_lat:     data.home_lat     ? String(data.home_lat) : "",
          home_lng:     data.home_lng     ? String(data.home_lng) : "",
          work_name:    data.work_name    ?? "",
          work_lat:     data.work_lat     ? String(data.work_lat) : "",
          work_lng:     data.work_lng     ? String(data.work_lng) : "",
          default_mode: data.default_mode ?? "bus",
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status]);

  function useGPS(field: "home" | "work") {
    if (!navigator.geolocation) return alert("GPS not available");
    setLocating(field);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        // Reverse geocode via Nominatim
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          const d = await r.json();
          const a = d.address || {};
          const name = a.neighbourhood || a.suburb || a.city_district || a.road || "My Location";
          setForm(prev => ({ ...prev, [`${field}_name`]: name, [`${field}_lat`]: String(lat), [`${field}_lng`]: String(lng) }));
        } catch {
          setForm(prev => ({ ...prev, [`${field}_lat`]: String(lat), [`${field}_lng`]: String(lng) }));
        }
        setLocating(null);
      },
      () => { alert("Could not get location"); setLocating(null); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSave() {
    setSaving(true); setSaved(false);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        home_name: form.home_name || null,
        home_lat:  form.home_lat  ? parseFloat(form.home_lat)  : null,
        home_lng:  form.home_lng  ? parseFloat(form.home_lng)  : null,
        work_name: form.work_name || null,
        work_lat:  form.work_lat  ? parseFloat(form.work_lat)  : null,
        work_lng:  form.work_lng  ? parseFloat(form.work_lng)  : null,
        default_mode: form.default_mode,
      }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI',sans-serif" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:"32px", marginBottom:"12px" }}>⚙️</div>
          <div style={{ fontSize:"14px", color:"#888" }}>Loading settings…</div>
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width:"100%", border:"1.5px solid #e8e8e8", borderRadius:"10px",
    padding:"10px 12px", fontSize:"14px", outline:"none",
    boxSizing:"border-box", color:"#1a1a1a", background:"#fff",
  };
  const labelStyle: React.CSSProperties = {
    fontSize:"12px", fontWeight:"700", color:"#555",
    display:"block", marginBottom:"6px",
  };
  const sectionStyle: React.CSSProperties = {
    background:"#fff", borderRadius:"16px", padding:"20px",
    boxShadow:"0 2px 8px rgba(0,0,0,0.07)", marginBottom:"16px",
  };

  return (
    <div style={{ minHeight:"100vh", background:"#f4f6f9", fontFamily:"'Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e8e8e8", padding:"14px 24px", display:"flex", alignItems:"center", gap:"12px" }}>
        <button onClick={() => router.push("/")}
          style={{ background:"none", border:"none", cursor:"pointer", fontSize:"20px", color:"#1565C0", padding:"4px" }}>
          ←
        </button>
        <span style={{ fontSize:"18px", fontWeight:"700", color:"#1a1a1a" }}>⚙️ Settings</span>
      </div>

      <div style={{ maxWidth:"600px", margin:"0 auto", padding:"20px 16px" }}>

        {/* Home location */}
        <div style={sectionStyle}>
          <div style={{ fontSize:"15px", fontWeight:"700", color:"#1a1a1a", marginBottom:"14px", display:"flex", alignItems:"center", gap:"8px" }}>
            🏠 Home Location
          </div>
          <div style={{ marginBottom:"10px" }}>
            <label style={labelStyle}>Location name</label>
            <div style={{ display:"flex", gap:"8px" }}>
              <input style={{ ...inputStyle, flex:1 }} placeholder="e.g. B.N Reddy Nagar"
                value={form.home_name}
                onChange={e => setForm(p => ({ ...p, home_name: e.target.value }))} />
              <button onClick={() => useGPS("home")} disabled={locating === "home"}
                style={{ padding:"10px 14px", background:"#e3f2fd", color:"#1565C0", border:"none", borderRadius:"10px", cursor:"pointer", fontSize:"16px", flexShrink:0 }}
                title="Use current location">
                {locating === "home" ? "…" : "📍"}
              </button>
            </div>
          </div>
          {form.home_lat && form.home_lng && (
            <div style={{ fontSize:"11px", color:"#34A853", background:"#e8f5e9", padding:"6px 10px", borderRadius:"8px" }}>
              ✓ Coordinates saved: {parseFloat(form.home_lat).toFixed(4)}, {parseFloat(form.home_lng).toFixed(4)}
            </div>
          )}
        </div>

        {/* Work location */}
        <div style={sectionStyle}>
          <div style={{ fontSize:"15px", fontWeight:"700", color:"#1a1a1a", marginBottom:"14px", display:"flex", alignItems:"center", gap:"8px" }}>
            🏢 Work Location
          </div>
          <div style={{ marginBottom:"10px" }}>
            <label style={labelStyle}>Location name</label>
            <div style={{ display:"flex", gap:"8px" }}>
              <input style={{ ...inputStyle, flex:1 }} placeholder="e.g. Hitech City"
                value={form.work_name}
                onChange={e => setForm(p => ({ ...p, work_name: e.target.value }))} />
              <button onClick={() => useGPS("work")} disabled={locating === "work"}
                style={{ padding:"10px 14px", background:"#e3f2fd", color:"#1565C0", border:"none", borderRadius:"10px", cursor:"pointer", fontSize:"16px", flexShrink:0 }}
                title="Use current location">
                {locating === "work" ? "…" : "📍"}
              </button>
            </div>
          </div>
          {form.work_lat && form.work_lng && (
            <div style={{ fontSize:"11px", color:"#34A853", background:"#e8f5e9", padding:"6px 10px", borderRadius:"8px" }}>
              ✓ Coordinates saved: {parseFloat(form.work_lat).toFixed(4)}, {parseFloat(form.work_lng).toFixed(4)}
            </div>
          )}
        </div>

        {/* Default transport mode */}
        <div style={sectionStyle}>
          <div style={{ fontSize:"15px", fontWeight:"700", color:"#1a1a1a", marginBottom:"14px" }}>
            🚀 Default Transport Mode
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
            {MODES.map(m => (
              <button key={m.id} onClick={() => setForm(p => ({ ...p, default_mode: m.id }))}
                style={{ padding:"14px", border: form.default_mode === m.id ? "2px solid #1565C0" : "1.5px solid #e8e8e8", borderRadius:"12px", background: form.default_mode === m.id ? "#e3f2fd" : "#fff", cursor:"pointer", display:"flex", alignItems:"center", gap:"10px", fontSize:"14px", fontWeight:"600", color: form.default_mode === m.id ? "#1565C0" : "#1a1a1a" }}>
                <span style={{ fontSize:"20px" }}>{m.emoji}</span>
                {m.label}
                {form.default_mode === m.id && <span style={{ marginLeft:"auto", fontSize:"16px" }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button onClick={handleSave} disabled={saving}
          style={{ width:"100%", padding:"14px", background: saving ? "#90caf9" : "#1565C0", color:"white", border:"none", borderRadius:"12px", fontSize:"15px", fontWeight:"700", cursor: saving ? "not-allowed" : "pointer", marginBottom:"12px" }}>
          {saving ? "Saving…" : "💾 Save Settings"}
        </button>

        {saved && (
          <div style={{ background:"#e8f5e9", border:"1.5px solid #a5d6a7", borderRadius:"12px", padding:"12px 16px", textAlign:"center", fontSize:"14px", color:"#2E7D32", fontWeight:"600" }}>
            ✅ Settings saved successfully!
          </div>
        )}
      </div>
    </div>
  );
}