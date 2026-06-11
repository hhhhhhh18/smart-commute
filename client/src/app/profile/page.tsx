"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div
      style={{
        maxWidth: "700px",
        margin: "0 auto",
        padding: "20px",
        minHeight: "100vh",
        background: "#f8fafc",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#1565C0",
          color: "white",
          padding: "20px",
          borderRadius: "16px",
          marginBottom: "20px",
        }}
      >
        <div style={{ fontSize: "48px", marginBottom: "8px" }}>👤</div>

        <div
          style={{
            fontSize: "22px",
            fontWeight: "700",
            marginBottom: "4px",
          }}
        >
          {session?.user?.name || "Smart Commute User"}
        </div>

        <div
          style={{
            fontSize: "14px",
            opacity: 0.9,
          }}
        >
          {session?.user?.email}
        </div>
      </div>

      {/* Quick Actions */}
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          padding: "10px",
          marginBottom: "16px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        }}
      >
        <ProfileButton
          icon="⭐"
          title="Saved Routes"
          subtitle="View your favourite routes"
          onClick={() => router.push("/saved-routes")}
        />

       

        <ProfileButton
          icon="⚙️"
          title="Preferences"
          subtitle="Manage app settings"
          onClick={() => router.push("/settings")}
        />

        <ProfileButton
          icon="💡"
          title="Send Feedback"
          subtitle="Help improve Smart Commute"
          onClick={() => router.push("/")}
        />
      </div>

      {/* App Info */}
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          padding: "16px",
          marginBottom: "16px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            fontWeight: "700",
            marginBottom: "10px",
          }}
        >
          About
        </div>

        <div style={{ color: "#555", fontSize: "14px" }}>
          Smart Commute Hyderabad
        </div>

        <div style={{ color: "#888", fontSize: "13px" }}>
          Version 1.0.0
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={() => signOut({ callbackUrl: "/auth/login" })}
        style={{
          width: "100%",
          background: "#ef4444",
          color: "white",
          border: "none",
          padding: "14px",
          borderRadius: "12px",
          fontWeight: "700",
          fontSize: "15px",
          cursor: "pointer",
        }}
      >
        🚪 Logout
      </button>
    </div>
  );
}

function ProfileButton({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        background: "none",
        border: "none",
        padding: "14px",
        borderBottom: "1px solid #f1f5f9",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <div style={{ fontSize: "24px" }}>{icon}</div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            fontWeight: "600",
            color: "#1a1a1a",
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: "12px",
            color: "#888",
          }}
        >
          {subtitle}
        </div>
      </div>

      <div style={{ color: "#999" }}>›</div>
    </button>
  );
}