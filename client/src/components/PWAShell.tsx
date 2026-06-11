
"use client";

import { useEffect, useState } from "react";
import BottomNav from "./BottomNav";

export default function PWAShell({ children }: { children: React.ReactNode }) {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const check = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
    };

    // defer to after first paint — avoids synchronous setState warning
    const raf = requestAnimationFrame(check);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <div style={{ paddingBottom: isStandalone ? "60px" : "0px" }}>
        {children}
      </div>
      {isStandalone && <BottomNav />}
    </>
  );
}
