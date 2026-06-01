"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface SavedRoute {
  id: number;
  from_name: string;
  to_name: string;
  from_lat: number | null;
  from_lng: number | null;
  to_lat: number | null;
  to_lng: number | null;
  created_at: string;
}

export default function SavedRoutesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [routes, setRoutes]   = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/saved-routes")
      .then(r => r.json())
      .then(data => { setRoutes(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [status]);

  async function handleDelete(id: number) {
    setDeleting(id);
    await fetch("/api/saved-routes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setRoutes(prev => prev.filter(r => r.id !== id));
    setDeleting(null);
  }

  function handleSearch(route: SavedRoute) {
    const params = new URLSearchParams();
    params.set("from", route.from_name);
    params.set("to",   route.to_name);
    if (route.from_lat) params.set("fromLat", String(route.from_lat));
    if (route.from_lng) params.set("fromLng", String(route.from_lng));
    if (route.to_lat)   params.set("toLat",   String(route.to_lat));
    if (route.to_lng)   params.set("toLng",   String(route.to_lng));
    router.push(`/?${params.toString()}`);
  }

  if (status === "loading" || loading) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI',sans-serif" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:"32px", marginBottom:"12px" }}>⭐</div>
          <div style={{ fontSize:"14px", color:"#888" }}>Loading saved routes…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#f4f6f9", fontFamily:"'Segoe UI',sans-serif" }}>
      {/* Header */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e8e8e8", padding:"14px 24px", display:"flex", alignItems:"center", gap:"12px" }}>
        <button onClick={() => router.push("/")}
          style={{ background:"none", border:"none", cursor:"pointer", fontSize:"20px", color:"#1565C0", padding:"4px" }}>
          ←
        </button>
        <span style={{ fontSize:"18px", fontWeight:"700", color:"#1a1a1a" }}>⭐ Saved Routes</span>
        <span style={{ fontSize:"12px", color:"#888", marginLeft:"4px" }}>
          {routes.length} route{routes.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={{ maxWidth:"600px", margin:"0 auto", padding:"20px 16px" }}>
        {routes.length === 0 ? (
          <div style={{ background:"#fff", borderRadius:"16px", padding:"48px 24px", textAlign:"center", boxShadow:"0 2px 10px rgba(0,0,0,0.07)" }}>
            <div style={{ fontSize:"52px", marginBottom:"16px" }}>🗺️</div>
            <div style={{ fontSize:"17px", fontWeight:"700", color:"#1a1a1a", marginBottom:"8px" }}>No saved routes yet</div>
            <div style={{ fontSize:"13px", color:"#888", lineHeight:"1.6", marginBottom:"24px" }}>
              Search for a route on the main page, then tap the <strong>Save Route</strong> button to save it here for quick access.
            </div>
            <button onClick={() => router.push("/")}
              style={{ padding:"12px 28px", background:"#1565C0", color:"white", border:"none", borderRadius:"12px", fontSize:"14px", fontWeight:"700", cursor:"pointer" }}>
              🔍 Find a Route
            </button>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
            {routes.map(route => (
              <div key={route.id}
                style={{ background:"#fff", borderRadius:"14px", padding:"16px", boxShadow:"0 2px 8px rgba(0,0,0,0.07)", display:"flex", alignItems:"center", gap:"12px" }}>
                {/* Route info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"4px" }}>
                    <span style={{ fontSize:"11px", background:"#e3f2fd", color:"#1565C0", padding:"2px 8px", borderRadius:"999px", fontWeight:"700", whiteSpace:"nowrap" }}>FROM</span>
                    <span style={{ fontSize:"14px", fontWeight:"600", color:"#1a1a1a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{route.from_name}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                    <span style={{ fontSize:"11px", background:"#fce8e6", color:"#D32F2F", padding:"2px 8px", borderRadius:"999px", fontWeight:"700", whiteSpace:"nowrap" }}>TO</span>
                    <span style={{ fontSize:"14px", fontWeight:"600", color:"#1a1a1a", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{route.to_name}</span>
                  </div>
                  <div style={{ fontSize:"11px", color:"#bbb", marginTop:"6px" }}>
                    Saved {new Date(route.created_at).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display:"flex", flexDirection:"column", gap:"6px", flexShrink:0 }}>
                  <button onClick={() => handleSearch(route)}
                    style={{ padding:"8px 14px", background:"#1565C0", color:"white", border:"none", borderRadius:"8px", fontSize:"12px", fontWeight:"700", cursor:"pointer", whiteSpace:"nowrap" }}>
                    🔍 Search
                  </button>
                  <button onClick={() => handleDelete(route.id)} disabled={deleting === route.id}
                    style={{ padding:"8px 14px", background:"#fff", color:"#EA4335", border:"1.5px solid #EA4335", borderRadius:"8px", fontSize:"12px", fontWeight:"700", cursor:"pointer", opacity: deleting === route.id ? 0.5 : 1 }}>
                    {deleting === route.id ? "…" : "🗑️ Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}