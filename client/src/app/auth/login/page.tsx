"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// ── 3D City Scene ─────────────────────────────────────────────
function CityScene() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    let animId: number;
    let renderer: any, scene: any, camera: any;

    async function init() {
      const THREE = await import("three");
      const W = mountRef.current!.clientWidth;
      const H = mountRef.current!.clientHeight;

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

      const groundMat = new THREE.MeshStandardMaterial({ color: 0x0d1f3c, roughness: 0.9 });
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);
      scene.add(new THREE.GridHelper(60, 30, 0x1e3a5f, 0x1e3a5f));

      const buildingColors = [0x1565c0, 0x0d47a1, 0x1976d2, 0x1e40af, 0x2563eb, 0x1d4ed8];
      const buildingData = [
        { x:-12,z:-8, w:2.5,h:12,d:2.5 }, { x:-8, z:-10,w:2,  h:18,d:2   },
        { x:-5, z:-8, w:3,  h:10,d:3   }, { x:-2, z:-12,w:2,  h:22,d:2   },
        { x:2,  z:-10,w:2.5,h:15,d:2.5 }, { x:6,  z:-8, w:3,  h:9, d:3   },
        { x:9,  z:-11,w:2,  h:20,d:2   }, { x:12, z:-7, w:2.5,h:13,d:2.5 },
        { x:-14,z:-4, w:2,  h:8, d:2   }, { x:-10,z:-5, w:2,  h:11,d:2   },
        { x:11, z:-4, w:2,  h:7, d:2   }, { x:14, z:-5, w:2,  h:16,d:2   },
      ];

      buildingData.forEach((b, i) => {
        const mat = new THREE.MeshStandardMaterial({
          color: buildingColors[i % buildingColors.length], roughness: 0.3, metalness: 0.6,
          emissive: buildingColors[i % buildingColors.length], emissiveIntensity: 0.15,
        });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat);
        mesh.position.set(b.x, b.h / 2, b.z);
        mesh.castShadow = true;
        scene.add(mesh);
        for (let row = 1; row < Math.floor(b.h / 2); row++) {
          for (let col = -1; col <= 1; col++) {
            if (Math.random() > 0.4) {
              const wMat = new THREE.MeshStandardMaterial({
                color: Math.random() > 0.3 ? 0xffd54f : 0x64b5f6,
                emissive: Math.random() > 0.3 ? 0xffd54f : 0x64b5f6, emissiveIntensity: 1.5,
              });
              const win = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.05), wMat);
              win.position.set(b.x + col * (b.w / 3), row * 1.5, b.z + b.d / 2 + 0.02);
              scene.add(win);
            }
          }
        }
      });

      const roadMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 1 });
      const hRoad = new THREE.Mesh(new THREE.BoxGeometry(60, 0.05, 3), roadMat);
      hRoad.position.set(0, 0.01, 2); scene.add(hRoad);
      const vRoad = new THREE.Mesh(new THREE.BoxGeometry(3, 0.05, 40), roadMat);
      vRoad.position.set(0, 0.01, -5); scene.add(vRoad);
      for (let i = -12; i <= 12; i += 3) {
        const mark = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.2),
          new THREE.MeshStandardMaterial({ color: 0xffd54f, emissive: 0xffd54f, emissiveIntensity: 0.5 }));
        mark.position.set(i, 0.02, 2); scene.add(mark);
      }

      const railMat = new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x60a5fa, emissiveIntensity: 0.4, metalness: 0.8 });
      const rail = new THREE.Mesh(new THREE.BoxGeometry(50, 0.15, 0.4), railMat);
      rail.position.set(0, 6, -6); scene.add(rail);
      for (let x = -12; x <= 12; x += 6) {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 6, 8),
          new THREE.MeshStandardMaterial({ color: 0x334466, metalness: 0.7 }));
        pillar.position.set(x, 3, -6); scene.add(pillar);
      }

      const vehicles: any[] = [];
      function makeBus(color: number) {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 0.9), new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.5 })));
        const roof = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.15, 0.85), new THREE.MeshStandardMaterial({ color, roughness: 0.5 }));
        roof.position.y = 0.5; g.add(roof);
        [-0.5, 0.1, 0.7].forEach(xOff => {
          const w = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.05),
            new THREE.MeshStandardMaterial({ color: 0x93c5fd, emissive: 0x93c5fd, emissiveIntensity: 0.6 }));
          w.position.set(xOff, 0.1, 0.46); g.add(w);
        });
        return g;
      }
      function makeCar(color: number) {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.7), new THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.7 })));
        const cab = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.65), new THREE.MeshStandardMaterial({ color, roughness: 0.2 }));
        cab.position.set(-0.1, 0.4, 0); g.add(cab);
        return g;
      }
      function makeMetro() {
        const g = new THREE.Group();
        [0, 2.4, -2.4].forEach(xOff => {
          const c = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 0.7),
            new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.2, metalness: 0.8, emissive: 0x1d4ed8, emissiveIntensity: 0.2 }));
          c.position.x = xOff; g.add(c);
        });
        return g;
      }

      const bus1 = makeBus(0x1565c0); bus1.position.set(-20, 0.5, 1.2); scene.add(bus1); vehicles.push({ mesh: bus1, dir: 1, speed: 0.06, pos: -20 });
      const bus2 = makeBus(0x2e7d32); bus2.position.set(15, 0.5, 2.8); bus2.rotation.y = Math.PI; scene.add(bus2); vehicles.push({ mesh: bus2, dir: -1, speed: 0.05, pos: 15 });
      const car1 = makeCar(0xe65100); car1.position.set(-10, 0.28, 1.2); scene.add(car1); vehicles.push({ mesh: car1, dir: 1, speed: 0.1, pos: -10 });
      const car2 = makeCar(0x7c3aed); car2.position.set(8, 0.28, 2.8); car2.rotation.y = Math.PI; scene.add(car2); vehicles.push({ mesh: car2, dir: -1, speed: 0.09, pos: 8 });
      const metro = makeMetro(); metro.position.set(-22, 6.4, -6); scene.add(metro); vehicles.push({ mesh: metro, dir: 1, speed: 0.08, pos: -22 });

      const sv: number[] = [];
      for (let i = 0; i < 300; i++) sv.push((Math.random() - 0.5) * 120, Math.random() * 40 + 10, (Math.random() - 0.5) * 120);
      const starsGeo = new THREE.BufferGeometry();
      starsGeo.setAttribute("position", new THREE.Float32BufferAttribute(sv, 3));
      const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.7 }));
      scene.add(stars);

      const ringColors = [0x3b82f6, 0x22c55e, 0xf59e0b, 0x8b5cf6];
      const rings: any[] = [];
      ringColors.forEach((col, i) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.08, 12, 40),
          new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.8, metalness: 0.9 }));
        const angle = (i / ringColors.length) * Math.PI * 2;
        ring.position.set(Math.cos(angle) * 8, 10 + Math.sin(angle) * 2, Math.sin(angle) * 8 - 5);
        ring.userData = { angle, speed: 0.008 + i * 0.002, radius: 8, baseY: 10 + Math.sin(angle) * 2, yOff: i };
        scene.add(ring); rings.push(ring);
      });

      let t = 0;
      function animate() {
        animId = requestAnimationFrame(animate); t += 0.01;
        vehicles.forEach(v => { v.pos += v.dir * v.speed; if (v.pos > 25) v.pos = -25; if (v.pos < -25) v.pos = 25; v.mesh.position.x = v.pos; });
        rings.forEach(ring => {
          ring.userData.angle += ring.userData.speed;
          ring.position.x = Math.cos(ring.userData.angle) * ring.userData.radius;
          ring.position.z = Math.sin(ring.userData.angle) * ring.userData.radius - 5;
          ring.position.y = ring.userData.baseY + Math.sin(t * 0.8 + ring.userData.yOff) * 0.5;
          ring.rotation.x = t * 0.3; ring.rotation.y = t * 0.2;
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
        const w = mountRef.current.clientWidth, h = mountRef.current.clientHeight;
        camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
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

// ─────────────────────────────────────────────────────────────────────────────
// LoginForm
// ─────────────────────────────────────────────────────────────────────────────
function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [remember, setRemember] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) {
      const mapped: Record<string, string> = {
        OAuthAccountNotLinked: "This email is already registered with a different sign-in method.",
        OAuthSignin:           "Google sign-in failed. Please try again.",
        OAuthCallback:         "Google sign-in failed. Please try again.",
        CredentialsSignin:     "Incorrect email or password.",
        SessionRequired:       "Please sign in to continue.",
        Default:               "Something went wrong. Please try again.",
      };
      setError(mapped[urlError] || decodeURIComponent(urlError));
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
  
    setError("");
    setLoading(true);
  
    try {
      const res = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });
  
      console.log("SIGNIN RESPONSE:", res);
  
      if (!res) {
        setError("Unable to sign in.");
        setLoading(false);
        return;
      }
  
      if (res.error) {
        if (res.error.includes("Incorrect password")) {
          setError("Incorrect password.");
        } else if (
          res.error.includes("No account found")
        ) {
          setError("No account found with this email.");
        } else if (
          res.error.includes("Please verify your email")
        ) {
          setError("Please verify your email before logging in.");
        } else if (
          res.error.includes("GOOGLE_ACCOUNT_NO_PASSWORD")
        ) {
          setError(
            "This Google account has no password yet. Use Forgot Password to create one."
          );
        } else {
          setError(res.error);
        }
  
        setLoading(false);
        return;
      }
  
      router.push("/");
      router.refresh();
  
    } catch (err) {
      console.error(err);
      setError("Network error. Please check your connection.");
    }
  
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true);
    setError("");
    await signIn("google", { callbackUrl: "/" });
  }

  const isGoogleAccount =
    error.toLowerCase().includes("google") ||
    error.toLowerCase().includes("oauthaccountnotlinked") ||
    error.toLowerCase().includes("different sign-in method");

  return (
    <div style={{ maxWidth: "460px", width: "100%" }}>
      <h1 style={{ fontSize: "32px", fontWeight: "900", color: "#0f172a", margin: "0 0 6px" }}>Welcome back</h1>
      <p style={{ fontSize: "14px", color: "#64748b", margin: "0 0 28px" }}>Sign in to continue your journey</p>

      <button className="g-btn" onClick={handleGoogle} disabled={loading}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "13px", borderRadius: "12px", border: "1.5px solid #e2e8f0", background: "white", fontSize: "14px", fontWeight: "600", color: "#1a1a1a", cursor: "pointer", marginBottom: "22px", transition: "background .15s" }}>
        <GoogleIcon /> Continue with Google
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "22px" }}>
        <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
        <span style={{ fontSize: "13px", color: "#94a3b8" }}>or</span>
        <div style={{ flex: 1, height: "1px", background: "#e2e8f0" }} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={LS.label}>Email address</label>
          <div style={{ position: "relative" }}>
            <span style={LS.inputIcon}><MailIcon /></span>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              style={{ ...LS.input, paddingLeft: "44px" }} />
          </div>
        </div>

        <div>
          <label style={LS.label}>Password</label>
          <div style={{ position: "relative" }}>
            <span style={LS.inputIcon}><LockIcon /></span>
            <input type={showPw ? "text" : "password"} required value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{ ...LS.input, paddingLeft: "44px", paddingRight: "44px" }} />
            <button type="button" className="eye-btn" onClick={() => setShowPw(v => !v)}
              style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)" }}>
              {showPw ? <EyeOff /> : <EyeOn />}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#475569", cursor: "pointer" }}>
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
              style={{ width: "16px", height: "16px", accentColor: "#1565C0" }} />
            Remember me
          </label>
          <Link href="/auth/forgot-password" style={{ fontSize: "13px", color: "#1565C0", fontWeight: "600", textDecoration: "none" }}>
            Forgot password?
          </Link>
        </div>

        {error && (
          isGoogleAccount ? (
            <div style={{ background: "#FFF3E0", border: "1.5px solid #FFB74D", borderRadius: "10px", padding: "12px 16px", fontSize: "13px", color: "#E65100", lineHeight: "1.6" }}>
              <strong>⚠️ This email uses Google Sign-In.</strong><br />
              Please use the <strong>Continue with Google</strong> button above, or{" "}
              <Link href={`/auth/register?email=${encodeURIComponent(email)}&setPassword=true`}
                style={{ color: "#1565C0", fontWeight: "700", textDecoration: "underline" }}>
                set a password here
              </Link>{" "}
              to enable email login.
            </div>
          ) : (
            <div style={{ background: "#FEF2F2", border: "1px solid #fecaca", color: "#DC2626", borderRadius: "10px", padding: "10px 14px", fontSize: "13px" }}>
              ⚠️ {error}
            </div>
          )
        )}

        <button type="submit" disabled={loading} className="sign-btn"
          style={{ width: "100%", padding: "14px", borderRadius: "12px", background: "#1565C0", color: "white", border: "none", fontSize: "15px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "background .15s" }}>
          <SignInIcon /> {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p style={{ textAlign: "center", fontSize: "14px", color: "#64748b", marginTop: "20px" }}>
        Don&apos;t have an account?{" "}
        <Link href="/auth/register" style={{ color: "#1565C0", fontWeight: "700", textDecoration: "none" }}>Sign up</Link>
      </p>

      <div style={{ marginTop: "20px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <ShieldIcon />
        <div>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>Your data is safe with us</div>
          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px", lineHeight: 1.5 }}>Industry-standard encryption protects your information.</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "linear-gradient(135deg,#eff6ff 0%,#f8fbff 100%)", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; overflow-x: hidden; }
        @media (max-width: 768px) {
          .split-left  { display: none !important; }
          .split-right { width: 100% !important; min-width: 100% !important; max-width: 100% !important; padding: 32px 20px !important; }
          .outer-wrap  { border-radius: 0 !important; box-shadow: none !important; }
        }
        input:focus { border-color: #1565C0 !important; outline: none; box-shadow: 0 0 0 3px rgba(21,101,192,0.12); }
        .g-btn:hover    { background: #f5f5f5 !important; }
        .sign-btn:hover { background: #1255a8 !important; }
        .eye-btn { background: none; border: none; cursor: pointer; color: #9ca3af; padding: 0; display: flex; align-items: center; }
        .eye-btn:hover { color: #555; }
      `}</style>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div className="outer-wrap" style={{ maxWidth: "1400px", width: "100%", borderRadius: "32px", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.15)", display: "flex", minHeight: "700px" }}>

          {/* LEFT: 3D Scene */}
          <div className="split-left" style={{ width: "46%", minWidth: "46%", maxWidth: "46%", background: "#0a1628", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", inset: 0 }}><CityScene /></div>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom,rgba(10,22,40,0.7) 0%,transparent 35%,transparent 65%,rgba(10,22,40,0.85) 100%)", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "36px", pointerEvents: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "linear-gradient(135deg,#1565C0,#0d47a1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", boxShadow: "0 4px 16px rgba(21,101,192,0.5)" }}>🚌</div>
                <div>
                  <div style={{ fontSize: "21px", fontWeight: "800", color: "white", lineHeight: 1 }}>Smart<span style={{ color: "#60a5fa" }}>Commute</span></div>
                  <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", marginTop: "2px" }}>All Routes. One Destination.</div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: "26px", fontWeight: "900", color: "white", lineHeight: 1.2, marginBottom: "10px" }}>
                  Every Route.<br />Every Ride.<br /><span style={{ color: "#60a5fa" }}>Every Day.</span>
                </div>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.65)", lineHeight: 1.7, maxWidth: "280px", margin: "0 0 16px" }}>
                  Real-time routes for Metro, Bus, Bike &amp; Car — all in one place. Hyderabad&apos;s smartest commute companion.
                </p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {[{ icon: "🚇", label: "Metro", col: "#3b82f6" }, { icon: "🚌", label: "Bus", col: "#22c55e" }, { icon: "🛵", label: "Bike", col: "#a855f7" }, { icon: "🚗", label: "Car", col: "#f59e0b" }].map(m => (
                    <div key={m.label} style={{ display: "flex", alignItems: "center", gap: "5px", background: "rgba(255,255,255,0.12)", backdropFilter: "blur(8px)", border: `1px solid ${m.col}55`, borderRadius: "20px", padding: "5px 12px", fontSize: "12px", fontWeight: "700", color: "white" }}>
                      <span>{m.icon}</span> {m.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Login Form */}
          <div className="split-right" style={{ width: "54%", minWidth: "54%", maxWidth: "54%", background: "white", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "40px", overflowY: "auto" }}>
            <Suspense fallback={
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", color: "#94a3b8" }}>
                <div style={{ width: "32px", height: "32px", border: "3px solid #e2e8f0", borderTop: "3px solid #1565C0", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <span style={{ fontSize: "13px" }}>Loading…</span>
                <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
              </div>
            }>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <div style={{ background: "white", borderTop: "1px solid #e2e8f0", flexShrink: 0 }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "18px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "16px", marginBottom: "14px" }}>
          {[
            { icon: "📍", color: "#1565C0", title: "All-in-One Platform",  desc: "Metro, Bus, Bike & Car routes in one place." },
            { icon: "🕐", color: "#2E7D32", title: "Real-time Updates",    desc: "Live timings, delays & service alerts."       },
            { icon: "🗺️", color: "#6A1B9A", title: "Smart Route Planner", desc: "Compare options and find the best route."     },
            { icon: "🛡️", color: "#0891b2", title: "Safe & Secure",        desc: "Your privacy is our priority."                },
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
};

function GoogleIcon()  { return <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>; }
function MailIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>; }
function LockIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }
function EyeOn()       { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; }
function EyeOff()      { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>; }
function ShieldIcon()  { return <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px" }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>; }
function SignInIcon()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>; }