"use client";

import { useState, useRef, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Step = "form" | "otp" | "success";

const RULES = [
  { id: "len",     label: "At least 8 characters",  test: (p: string) => p.length >= 8 },
  { id: "upper",   label: "One uppercase letter",    test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower",   label: "One lowercase letter",    test: (p: string) => /[a-z]/.test(p) },
  { id: "num",     label: "One number",              test: (p: string) => /[0-9]/.test(p) },
  { id: "special", label: "One special character",   test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

// ── Shared 3D City Scene (same as login page) ─────────────────
function CityScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    let animId: number;
    let renderer: any, scene: any, camera: any;

    async function init() {
      const THREE = await import("three");
      const W = mountRef.current!.clientWidth || 600;
      const H = mountRef.current!.clientHeight || 700;

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      mountRef.current!.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x0a1628, 0.035);
      camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 200);
      camera.position.set(0, 14, 28);
      camera.lookAt(0, 0, 0);

      scene.add(new THREE.AmbientLight(0x334466, 1.2));
      const dir = new THREE.DirectionalLight(0xffffff, 1.5);
      dir.position.set(10, 20, 10);
      dir.castShadow = true;
      scene.add(dir);
      const cityGlow = new THREE.PointLight(0x3b82f6, 3, 40);
      cityGlow.position.set(0, 5, 0);
      scene.add(cityGlow);
      const pinkGlow = new THREE.PointLight(0x6366f1, 2, 30);
      pinkGlow.position.set(-8, 3, -5);
      scene.add(pinkGlow);

      // Ground + grid
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(80, 80),
        new THREE.MeshStandardMaterial({ color: 0x0d1f3c, roughness: 0.9 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);
      scene.add(new THREE.GridHelper(60, 30, 0x1e3a5f, 0x1e3a5f));

      // Buildings
      const buildingColors = [0x1565c0, 0x0d47a1, 0x1976d2, 0x1e40af, 0x2563eb];
      const bData = [
        { x:-12,z:-8,  w:2.5,h:12,d:2.5 }, { x:-8, z:-10, w:2,  h:18,d:2   },
        { x:-5, z:-8,  w:3,  h:10,d:3   }, { x:-2, z:-12, w:2,  h:22,d:2   },
        { x:2,  z:-10, w:2.5,h:15,d:2.5 }, { x:6,  z:-8,  w:3,  h:9, d:3   },
        { x:9,  z:-11, w:2,  h:20,d:2   }, { x:12, z:-7,  w:2.5,h:13,d:2.5 },
        { x:-14,z:-4,  w:2,  h:8, d:2   }, { x:-10,z:-5,  w:2,  h:11,d:2   },
        { x:11, z:-4,  w:2,  h:7, d:2   }, { x:14, z:-5,  w:2,  h:16,d:2   },
      ];
      bData.forEach((b, i) => {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(b.w, b.h, b.d),
          new THREE.MeshStandardMaterial({ color: buildingColors[i % buildingColors.length], roughness: 0.3, metalness: 0.6, emissive: buildingColors[i % buildingColors.length], emissiveIntensity: 0.15 })
        );
        mesh.position.set(b.x, b.h / 2, b.z);
        mesh.castShadow = true;
        scene.add(mesh);
        for (let row = 1; row < Math.floor(b.h / 2); row++) {
          for (let col = -1; col <= 1; col++) {
            if (Math.random() > 0.4) {
              const win = new THREE.Mesh(
                new THREE.BoxGeometry(0.25, 0.25, 0.05),
                new THREE.MeshStandardMaterial({ color: Math.random() > 0.3 ? 0xffd54f : 0x64b5f6, emissive: Math.random() > 0.3 ? 0xffd54f : 0x64b5f6, emissiveIntensity: 1.5 })
              );
              win.position.set(b.x + col * (b.w / 3), row * 1.5, b.z + b.d / 2 + 0.02);
              scene.add(win);
            }
          }
        }
      });

      // Roads
      const roadMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 1 });
      const hRoad = new THREE.Mesh(new THREE.BoxGeometry(60, 0.05, 3), roadMat);
      hRoad.position.set(0, 0.01, 2);
      scene.add(hRoad);
      const vRoad = new THREE.Mesh(new THREE.BoxGeometry(3, 0.05, 40), roadMat);
      vRoad.position.set(0, 0.01, -5);
      scene.add(vRoad);
      for (let i = -12; i <= 12; i += 3) {
        const mark = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.2), new THREE.MeshStandardMaterial({ color: 0xffd54f, emissive: 0xffd54f, emissiveIntensity: 0.5 }));
        mark.position.set(i, 0.02, 2);
        scene.add(mark);
      }

      // Metro rail
      const rail = new THREE.Mesh(new THREE.BoxGeometry(50, 0.15, 0.4), new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x60a5fa, emissiveIntensity: 0.4, metalness: 0.8 }));
      rail.position.set(0, 6, -6);
      scene.add(rail);
      for (let x = -12; x <= 12; x += 6) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 6, 8), new THREE.MeshStandardMaterial({ color: 0x334466, metalness: 0.7 }));
        pillar.position.set(x, 3, -6);
        scene.add(pillar);
      }

      // Vehicles
      const vehicles: any[] = [];
      function makeVehicle(color: number, type: "bus" | "car" | "metro") {
        const g = new THREE.Group();
        if (type === "bus") {
          const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 0.9), new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.5 }));
          g.add(body);
          [-0.5, 0.1, 0.7].forEach(xOff => {
            const w = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.05), new THREE.MeshStandardMaterial({ color: 0x93c5fd, emissive: 0x93c5fd, emissiveIntensity: 0.6 }));
            w.position.set(xOff, 0.1, 0.46);
            g.add(w);
          });
        } else if (type === "car") {
          const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.7), new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.7 }));
          g.add(body);
          const cab = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.65), new THREE.MeshStandardMaterial({ color, roughness: 0.2 }));
          cab.position.set(-0.1, 0.4, 0);
          g.add(cab);
        } else {
          [0, 2.4, -2.4].forEach(xOff => {
            const car = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 0.7), new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.2, metalness: 0.8, emissive: 0x1d4ed8, emissiveIntensity: 0.2 }));
            car.position.x = xOff;
            g.add(car);
          });
        }
        return g;
      }

      const bus1 = makeVehicle(0x1565c0, "bus"); bus1.position.set(-20, 0.5, 1.2); scene.add(bus1);
      vehicles.push({ mesh: bus1, dir: 1, speed: 0.06, pos: -20, y: 0.5, z: 1.2, range: 25 });
      const bus2 = makeVehicle(0x2e7d32, "bus"); bus2.position.set(15, 0.5, 2.8); bus2.rotation.y = Math.PI; scene.add(bus2);
      vehicles.push({ mesh: bus2, dir: -1, speed: 0.05, pos: 15, y: 0.5, z: 2.8, range: 25 });
      const car1 = makeVehicle(0xe65100, "car"); car1.position.set(-10, 0.28, 1.2); scene.add(car1);
      vehicles.push({ mesh: car1, dir: 1, speed: 0.1, pos: -10, y: 0.28, z: 1.2, range: 25 });
      const car2 = makeVehicle(0x7c3aed, "car"); car2.position.set(8, 0.28, 2.8); car2.rotation.y = Math.PI; scene.add(car2);
      vehicles.push({ mesh: car2, dir: -1, speed: 0.09, pos: 8, y: 0.28, z: 2.8, range: 25 });
      const metro = makeVehicle(0x3b82f6, "metro"); metro.position.set(-22, 6.4, -6); scene.add(metro);
      vehicles.push({ mesh: metro, dir: 1, speed: 0.08, pos: -22, y: 6.4, z: -6, range: 25 });

      // Stars
      const starsGeo = new THREE.BufferGeometry();
      const sv: number[] = [];
      for (let i = 0; i < 300; i++) sv.push((Math.random()-0.5)*120, Math.random()*40+10, (Math.random()-0.5)*120);
      starsGeo.setAttribute("position", new THREE.Float32BufferAttribute(sv, 3));
      const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.7 }));
      scene.add(stars);

      // Floating rings
      const ringColors = [0x3b82f6, 0x22c55e, 0xf59e0b, 0x8b5cf6];
      const rings: any[] = [];
      ringColors.forEach((col, i) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 12, 40), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8, metalness: 0.9 }));
        const angle = (i / ringColors.length) * Math.PI * 2;
        ring.position.set(Math.cos(angle) * 8, 10 + Math.sin(angle) * 2, Math.sin(angle) * 8 - 5);
        ring.userData = { angle, speed: 0.008 + i * 0.002, radius: 8, baseY: 10 + Math.sin(angle) * 2, yOff: i };
        scene.add(ring);
        rings.push(ring);
      });

      let t = 0;
      function animate() {
        animId = requestAnimationFrame(animate);
        t += 0.01;
        vehicles.forEach(v => {
          v.pos += v.dir * v.speed;
          if (v.pos > v.range) v.pos = -v.range;
          if (v.pos < -v.range) v.pos = v.range;
          v.mesh.position.x = v.pos;
        });
        rings.forEach(ring => {
          ring.userData.angle += ring.userData.speed;
          ring.position.x = Math.cos(ring.userData.angle) * ring.userData.radius;
          ring.position.z = Math.sin(ring.userData.angle) * ring.userData.radius - 5;
          ring.position.y = ring.userData.baseY + Math.sin(t * 0.8 + ring.userData.yOff) * 0.5;
          ring.rotation.x = t * 0.3;
          ring.rotation.y = t * 0.2;
        });
        camera.position.x = Math.sin(t * 0.1) * 2;
        camera.position.y = 14 + Math.sin(t * 0.07) * 1;
        camera.lookAt(0, 2, 0);
        cityGlow.intensity = 2.5 + Math.sin(t * 1.5) * 0.5;
        stars.rotation.y = t * 0.005;
        renderer.render(scene, camera);
      }
      animate();

      const onResize = () => {
        if (!mountRef.current) return;
        const w = mountRef.current.clientWidth;
        const h = mountRef.current.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }
    init();
    return () => {
      cancelAnimationFrame(animId);
      if (renderer) {
        renderer.dispose();
        try { if (mountRef.current && renderer.domElement.parentNode === mountRef.current) mountRef.current.removeChild(renderer.domElement); } catch {}
      }
    };
  }, []);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}

// ── Success Screen ─────────────────────────────────────────────
function SuccessScreen({ userName, onDone }: { userName: string; onDone: () => void }) {
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");
  const [countdown, setCountdown] = useState(5);
  const [checkAnim, setCheckAnim] = useState(false);
  const [textAnim,  setTextAnim]  = useState(false);
  const [badgeAnim, setBadgeAnim] = useState(false);

  useEffect(() => {
    // Staggered entrance animations
    setTimeout(() => setPhase("show"),    50);
    setTimeout(() => setCheckAnim(true),  400);
    setTimeout(() => setTextAnim(true),   900);
    setTimeout(() => setBadgeAnim(true),  1300);

    // Countdown
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(interval); return 0; }
        return c - 1;
      });
    }, 1000);

    // Auto redirect
    const timeout = setTimeout(() => {
      setPhase("exit");
      setTimeout(onDone, 600);
    }, 5200);

    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [onDone]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      opacity: phase === "enter" ? 0 : phase === "exit" ? 0 : 1,
      transition: "opacity 0.6s ease",
    }}>
      {/* 3D City as fullscreen background */}
      <div style={{ position: "absolute", inset: 0 }}>
        <CityScene />
      </div>

      {/* Dark overlay with gradient */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(135deg, rgba(10,22,40,0.82) 0%, rgba(13,71,161,0.75) 50%, rgba(10,22,40,0.85) 100%)",
      }} />

      {/* Content */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}>

        {/* Glowing ring behind checkmark */}
        <div style={{
          position: "relative", marginBottom: "32px",
          opacity: checkAnim ? 1 : 0,
          transform: checkAnim ? "scale(1)" : "scale(0.3)",
          transition: "opacity 0.6s cubic-bezier(0.34,1.56,0.64,1), transform 0.6s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          {/* Outer pulse rings */}
          <div style={{
            position: "absolute", inset: "-20px",
            borderRadius: "50%", border: "2px solid rgba(34,197,94,0.3)",
            animation: "pulse1 2s ease-out infinite",
          }} />
          <div style={{
            position: "absolute", inset: "-36px",
            borderRadius: "50%", border: "2px solid rgba(34,197,94,0.15)",
            animation: "pulse2 2s ease-out infinite 0.4s",
          }} />
          <div style={{
            position: "absolute", inset: "-52px",
            borderRadius: "50%", border: "1px solid rgba(34,197,94,0.08)",
            animation: "pulse3 2s ease-out infinite 0.8s",
          }} />

          {/* Main circle */}
          <div style={{
            width: "110px", height: "110px", borderRadius: "50%",
            background: "linear-gradient(135deg, #16a34a, #22c55e)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 40px rgba(34,197,94,0.6), 0 0 80px rgba(34,197,94,0.3)",
            position: "relative", zIndex: 1,
          }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
              <polyline
                points="4,12 9,17 20,6"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  strokeDasharray: 30,
                  strokeDashoffset: checkAnim ? 0 : 30,
                  transition: "stroke-dashoffset 0.6s ease 0.3s",
                }}
              />
            </svg>
          </div>
        </div>

        {/* Text content */}
        <div style={{
          textAlign: "center",
          opacity: textAnim ? 1 : 0,
          transform: textAnim ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
          marginBottom: "32px",
        }}>
          <div style={{
            fontSize: "13px", fontWeight: "700", letterSpacing: "3px",
            color: "#22c55e", textTransform: "uppercase", marginBottom: "10px",
          }}>
            ✦ Account Created Successfully ✦
          </div>
          <h1 style={{
            fontSize: "clamp(28px, 5vw, 48px)", fontWeight: "900",
            color: "white", margin: "0 0 10px", lineHeight: 1.1,
          }}>
            Welcome aboard,<br />
            <span style={{
              background: "linear-gradient(90deg, #60a5fa, #a78bfa, #60a5fa)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "shimmer 2.5s linear infinite",
            }}>
              {userName.split(" ")[0]}!
            </span>
          </h1>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.6 }}>
            Your smart commute journey begins now.
          </p>
        </div>

        {/* Transport badges */}
        <div style={{
          display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center",
          marginBottom: "40px",
          opacity: badgeAnim ? 1 : 0,
          transform: badgeAnim ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}>
          {[
            { icon: "🚇", label: "Metro",  col: "#3b82f6", delay: "0ms"   },
            { icon: "🚌", label: "Bus",    col: "#22c55e", delay: "80ms"  },
            { icon: "🛵", label: "Bike",   col: "#a855f7", delay: "160ms" },
            { icon: "🚗", label: "Car",    col: "#f59e0b", delay: "240ms" },
          ].map((m) => (
            <div key={m.label} style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(12px)",
              border: `1.5px solid ${m.col}60`,
              borderRadius: "999px", padding: "8px 16px",
              fontSize: "13px", fontWeight: "700", color: "white",
              boxShadow: `0 0 16px ${m.col}30`,
              animation: `floatBadge 3s ease-in-out infinite`,
              animationDelay: m.delay,
            }}>
              <span style={{ fontSize: "16px" }}>{m.icon}</span>
              {m.label}
            </div>
          ))}
        </div>

        {/* Redirect countdown */}
        <div style={{
          opacity: badgeAnim ? 1 : 0,
          transition: "opacity 0.5s ease 0.3s",
          display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
        }}>
          {/* Progress bar */}
          <div style={{
            width: "200px", height: "3px",
            background: "rgba(255,255,255,0.15)", borderRadius: "2px", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", background: "linear-gradient(90deg, #3b82f6, #22c55e)",
              borderRadius: "2px",
              animation: "progressBar 5s linear forwards",
            }} />
          </div>
          <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>
            Redirecting to sign in in <span style={{ color: "#60a5fa", fontWeight: "700" }}>{countdown}s</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse1 { 0%{transform:scale(1);opacity:1} 100%{transform:scale(1.8);opacity:0} }
        @keyframes pulse2 { 0%{transform:scale(1);opacity:1} 100%{transform:scale(1.6);opacity:0} }
        @keyframes pulse3 { 0%{transform:scale(1);opacity:1} 100%{transform:scale(1.4);opacity:0} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes floatBadge { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes progressBar { 0%{width:0%} 100%{width:100%} }
      `}</style>
    </div>
  );
}

// ── Register Page ─────────────────────────────────────────────
export default function RegisterPage() {
  const router  = useRouter();
  const [step,     setStep]     = useState<Step>("form");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [showCPw,  setShowCPw]  = useState(false);
  const [agreed,   setAgreed]   = useState(false);
  const [otp,      setOtp]      = useState("");
  const [error,    setError]    = useState("");
  const [info,     setInfo]     = useState("");
  const [loading,  setLoading]  = useState(false);

  const allRulesPassed = RULES.every(r => r.test(password));
  const passwordsMatch = password === confirm && confirm.length > 0;

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!allRulesPassed) { setError("Please meet all password requirements."); return; }
    if (!passwordsMatch) { setError("Passwords do not match."); return; }
    if (!agreed)         { setError("Please agree to the Terms of Service and Privacy Policy."); return; }
    setLoading(true);
    const regRes = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const regData = await regRes.json();
    if (!regRes.ok) { setError(regData.error); setLoading(false); return; }
    const otpRes = await fetch("/api/auth/send-otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const otpData = await otpRes.json();
    if (!otpRes.ok) { setError(otpData.error); setLoading(false); return; }
    setLoading(false);
    setInfo(`A 6-digit code was sent to ${email}`);
    setStep("otp");
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: otp }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }

    // Auto sign-in attempt
    await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    // Show 3D success animation regardless of sign-in result
    setStep("success");
  }

  async function handleResend() {
    setError(""); setInfo(""); setLoading(true);
    const res = await fetch("/api/auth/send-otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) setError(data.error);
    else setInfo("A new code was sent.");
  }

  async function handleGoogle() {
    setLoading(true);
    await signIn("google", { callbackUrl: "/" });
  }

  // ── Success screen ────────────────────────────────────────
  if (step === "success") {
    return (
      <SuccessScreen
        userName={name || "User"}
        onDone={() => router.replace("/auth/login")}
      />
    );
  }

  // ── OTP step ──────────────────────────────────────────────
  if (step === "otp") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg,#eff6ff 0%,#f8fbff 100%)",
        fontFamily: "'Segoe UI',system-ui,sans-serif", padding: "24px",
      }}>
        <div style={{ background: "white", borderRadius: "20px", padding: "44px 40px", width: "100%", maxWidth: "440px", boxShadow: "0 8px 40px rgba(0,0,0,0.10)" }}>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>📧</div>
            <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#0f172a", margin: "0 0 6px" }}>Check your email</h1>
            <p style={{ fontSize: "14px", color: "#64748b", margin: 0, lineHeight: 1.6 }}>
              {info || "We sent a 6-digit verification code to"}<br />
              <strong style={{ color: "#1565C0" }}>{email}</strong>
            </p>
          </div>
          <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <input
              type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
              placeholder="000000" required value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
              style={{ ...LS.input, textAlign: "center", fontSize: "32px", fontWeight: "700", letterSpacing: "14px", padding: "16px" }}
            />
            {error && <ErrorBox msg={error} />}
            <button type="submit" disabled={loading || otp.length < 6}
              style={{ ...LS.submitBtn, opacity: otp.length < 6 ? 0.6 : 1 }}>
              {loading ? "Verifying…" : "Verify & Continue →"}
            </button>
          </form>
          <p style={{ textAlign: "center", fontSize: "13px", color: "#64748b", marginTop: "16px" }}>
            Didn&apos;t receive it?{" "}
            <button onClick={handleResend} disabled={loading}
              style={{ background: "none", border: "none", color: "#1565C0", fontWeight: "700", cursor: "pointer", fontSize: "13px", padding: 0 }}>
              Resend code
            </button>
          </p>
          <p style={{ textAlign: "center", fontSize: "13px", color: "#94a3b8", marginTop: "8px" }}>
            <button onClick={() => { setStep("form"); setOtp(""); setError(""); setInfo(""); }}
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "13px", textDecoration: "underline" }}>
              ← Change email
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ── Main register form ────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      background: "linear-gradient(135deg,#eff6ff 0%,#f8fbff 100%)",
      fontFamily: "'Segoe UI',system-ui,sans-serif",
    }}>
      <style>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; overflow-x: hidden; }
        @media (max-width: 768px) {
          .split-left  { display: none !important; }
          .split-right { width: 100% !important; min-width: 100% !important; max-width: 100% !important; padding: 28px 20px !important; }
          .outer-wrap  { border-radius: 0 !important; box-shadow: none !important; }
        }
        input:focus  { border-color: #1565C0 !important; outline: none; box-shadow: 0 0 0 3px rgba(21,101,192,0.12); }
        .g-btn:hover      { background: #f5f5f5 !important; }
        .create-btn:hover { background: #1255a8 !important; }
        .eye-btn { background: none; border: none; cursor: pointer; color: #9ca3af; padding: 0; display: flex; align-items: center; }
        .eye-btn:hover { color: #555; }
      `}</style>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div className="outer-wrap" style={{
          maxWidth: "1400px", width: "100%",
          borderRadius: "32px", overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          display: "flex", minHeight: "700px",
        }}>

          {/* ── LEFT: 3D Scene ── */}
          <div className="split-left" style={{
            width: "46%", minWidth: "46%", maxWidth: "46%",
            background: "#0a1628",
            overflow: "hidden", position: "relative",
          }}>
            <div style={{ position: "absolute", inset: 0 }}>
              <CityScene />
            </div>
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to bottom, rgba(10,22,40,0.7) 0%, transparent 35%, transparent 65%, rgba(10,22,40,0.85) 100%)",
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              padding: "36px", pointerEvents: "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "linear-gradient(135deg,#1565C0,#0d47a1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", boxShadow: "0 4px 16px rgba(21,101,192,0.5)" }}>🚌</div>
                <div>
                  <div style={{ fontSize: "21px", fontWeight: "800", color: "white", lineHeight: 1 }}>Smart<span style={{ color: "#60a5fa" }}>Commute</span></div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", marginTop: "2px" }}>All Routes. One Destination.</div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: "26px", fontWeight: "900", color: "white", lineHeight: 1.2, marginBottom: "10px" }}>
                  One Account.<br /><span style={{ color: "#60a5fa" }}>All Possibilities.</span>
                </div>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)", lineHeight: 1.7, maxWidth: "280px", margin: "0 0 16px" }}>
                  Create your account and explore the best Metro, Bus, Bike &amp; Car routes tailored just for you.
                </p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {[
                    { icon: "🚇", label: "Metro", col: "#3b82f6" },
                    { icon: "🚌", label: "Bus",   col: "#22c55e" },
                    { icon: "🛵", label: "Bike",  col: "#a855f7" },
                    { icon: "🚗", label: "Car",   col: "#f59e0b" },
                  ].map(m => (
                    <div key={m.label} style={{ display: "flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: `1px solid ${m.col}55`, borderRadius: "20px", padding: "5px 12px", fontSize: "12px", fontWeight: "700", color: "white" }}>
                      <span>{m.icon}</span> {m.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Form ── */}
          <div className="split-right" style={{
            width: "54%", minWidth: "54%", maxWidth: "54%",
            background: "white", display: "flex", flexDirection: "column",
            justifyContent: "center", alignItems: "center",
            padding: "32px 40px", overflowY: "auto",
          }}>
            <div style={{ maxWidth: "460px", width: "100%" }}>

              <h1 style={{ fontSize: "30px", fontWeight: "900", color: "#0f172a", margin: "0 0 4px" }}>Create your account</h1>
              <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 20px" }}>Join SmartCommute and start your smarter journey today.</p>

              <button className="g-btn" onClick={handleGoogle} disabled={loading}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "13px", borderRadius: "12px", border: "1.5px solid #e2e8f0", background: "white", fontSize: "14px", fontWeight: "600", color: "#1a1a1a", cursor: "pointer", marginBottom: "18px", transition: "background .15s" }}>
                <GoogleIcon /> Continue with Google
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
                <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
                <span style={{ fontSize: "13px", color: "#94a3b8" }}>or</span>
                <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
              </div>

              <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
                {/* Full name */}
                <div>
                  <label style={LS.label}>Full name</label>
                  <div style={{ position: "relative" }}>
                    <span style={LS.inputIcon}><UserIcon /></span>
                    <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name" style={{ ...LS.input, paddingLeft: "44px" }} />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label style={LS.label}>Email address</label>
                  <div style={{ position: "relative" }}>
                    <span style={LS.inputIcon}><MailIcon /></span>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" style={{ ...LS.input, paddingLeft: "44px" }} />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label style={LS.label}>Password</label>
                  <div style={{ position: "relative" }}>
                    <span style={LS.inputIcon}><LockIcon /></span>
                    <input type={showPw ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password" style={{ ...LS.input, paddingLeft: "44px", paddingRight: "44px" }} />
                    <button type="button" className="eye-btn" onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)" }}>
                      {showPw ? <EyeOff /> : <EyeOn />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div style={{ marginTop: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 14px" }}>
                      <div style={{ fontSize: "11px", fontWeight: "700", color: "#374151", marginBottom: "7px" }}>Password must contain:</div>
                      {RULES.map(rule => {
                        const ok = rule.test(password);
                        return (
                          <div key={rule.id} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <div style={{ width: "14px", height: "14px", borderRadius: "50%", border: ok ? "none" : "1.5px solid #cbd5e1", background: ok ? "#22c55e" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .2s" }}>
                              {ok && <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                            <span style={{ fontSize: "11px", color: ok ? "#16a34a" : "#64748b", fontWeight: ok ? "600" : "400", transition: "color .2s" }}>{rule.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label style={LS.label}>Confirm password</label>
                  <div style={{ position: "relative" }}>
                    <span style={LS.inputIcon}><LockIcon /></span>
                    <input type={showCPw ? "text" : "password"} required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm your password"
                      style={{ ...LS.input, paddingLeft: "44px", paddingRight: "44px", borderColor: confirm.length > 0 ? (passwordsMatch ? "#22c55e" : "#ef4444") : "#e2e8f0" }} />
                    <button type="button" className="eye-btn" onClick={() => setShowCPw(v => !v)} style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)" }}>
                      {showCPw ? <EyeOff /> : <EyeOn />}
                    </button>
                  </div>
                  {confirm.length > 0 && !passwordsMatch && (
                    <p style={{ fontSize: "12px", color: "#ef4444", margin: "4px 0 0" }}>Passwords do not match</p>
                  )}
                </div>

                {/* Terms */}
                <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ width: "16px", height: "16px", marginTop: "2px", accentColor: "#1565C0", flexShrink: 0 }} />
                  <span style={{ fontSize: "13px", color: "#475569", lineHeight: 1.5 }}>
                    I agree to the{" "}
                    <a href="#" style={{ color: "#1565C0", fontWeight: "600", textDecoration: "none" }}>Terms of Service</a>
                    {" "}and{" "}
                    <a href="#" style={{ color: "#1565C0", fontWeight: "600", textDecoration: "none" }}>Privacy Policy</a>
                  </span>
                </label>

                {error && <ErrorBox msg={error} />}

                <button type="submit" disabled={loading || !allRulesPassed || !passwordsMatch || !agreed} className="create-btn"
                  style={{ ...LS.submitBtn, opacity: (!allRulesPassed || !passwordsMatch || !agreed) ? 0.6 : 1, cursor: (!allRulesPassed || !passwordsMatch || !agreed) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "background .15s" }}>
                  <CreateIcon />
                  {loading ? "Creating account…" : "Create account"}
                </button>
              </form>

              <p style={{ textAlign: "center", fontSize: "14px", color: "#64748b", marginTop: "16px" }}>
                Already have an account?{" "}
                <Link href="/auth/login" style={{ color: "#1565C0", fontWeight: "700", textDecoration: "none" }}>Sign in</Link>
              </p>

              <div style={{ marginTop: "14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <ShieldIcon />
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>Your data is safe with us</div>
                  <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px", lineHeight: 1.5 }}>Industry-standard encryption protects your information.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{ background: "#FEF2F2", border: "1px solid #fecaca", color: "#DC2626", borderRadius: "10px", padding: "10px 14px", fontSize: "13px" }}>⚠️ {msg}</div>
  );
}

function Footer() {
  return (
    <div style={{ background: "white", borderTop: "1px solid #e2e8f0", flexShrink: 0 }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "18px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "16px", marginBottom: "14px" }}>
          {[
            { icon: "📍", color: "#1565C0", title: "All-in-One Platform",  desc: "Metro, Bus, Bike & Car routes in one place." },
            { icon: "🕐", color: "#2E7D32", title: "Real-time Updates",    desc: "Live timings, delays & service alerts." },
            { icon: "🗺️", color: "#6A1B9A", title: "Smart Route Planner", desc: "Compare options and find the best route." },
            { icon: "🛡️", color: "#0891b2", title: "Safe & Secure",        desc: "Your privacy is our priority." },
          ].map(f => (
            <div key={f.title} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "16px" }}>{f.icon}</span>
                <span style={{ fontSize: "12px", fontWeight: "700", color: f.color }}>{f.title}</span>
              </div>
              <span style={{ fontSize: "11px", color: "#64748b", lineHeight: 1.5 }}>{f.desc}</span>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px", textAlign: "center", fontSize: "12px", color: "#94a3b8" }}>
          © 2026 SmartCommute. All rights reserved.
        </div>
      </div>
    </div>
  );
}

const LS: Record<string, React.CSSProperties> = {
  label:     { display: "block", fontSize: "13px", fontWeight: "700", color: "#374151", marginBottom: "7px" },
  input:     { width: "100%", padding: "11px 14px", borderRadius: "10px", border: "1.5px solid #e2e8f0", fontSize: "14px", color: "#1a1a1a", background: "white", transition: "border-color .15s, box-shadow .15s" },
  inputIcon: { position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", display: "flex", alignItems: "center" },
  submitBtn: { width: "100%", padding: "14px", borderRadius: "12px", background: "#1565C0", color: "white", border: "none", fontSize: "15px", fontWeight: "700", cursor: "pointer" },
};

function GoogleIcon() { return <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>; }
function MailIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>; }
function LockIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }
function UserIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function EyeOn()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; }
function EyeOff()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>; }
function ShieldIcon() { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function CreateIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>; }