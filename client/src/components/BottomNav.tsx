"use client";

import { useRouter, usePathname } from "next/navigation";

const tabs = [
  { icon: "🏠", label: "Home",   href: "/" },
  { icon: "⭐", label: "Saved",  href: "/saved-routes" },
  { icon: "⚙️", label: "Settings", href: "/settings" },
  { icon: "👤", label: "Profile", href: "/profile" },
];

export default function BottomNav() {
  const router   = useRouter();
  const pathname = usePathname();

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
      background: "#fff",
      borderTop: "1px solid #e8e8e8",
      display: "flex",
      height: "60px",
      boxShadow: "0 -2px 12px rgba(0,0,0,0.08)",
    }}>
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <button key={tab.href} onClick={() => router.push(tab.href)}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "2px",
              background: "none", border: "none", cursor: "pointer",
              padding: "6px 0",
            }}>
            <span style={{ fontSize: "20px", lineHeight: 1 }}>{tab.icon}</span>
            <span style={{
              fontSize: "10px", fontWeight: active ? "700" : "500",
              color: active ? "#1565C0" : "#888",
              fontFamily: "'Segoe UI', sans-serif",
            }}>{tab.label}</span>
            {active && (
              <div style={{
                position: "absolute", bottom: 0,
                width: "32px", height: "3px",
                background: "#1565C0", borderRadius: "3px 3px 0 0",
              }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}