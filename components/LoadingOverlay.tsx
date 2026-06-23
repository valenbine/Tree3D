"use client";

import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";

// Clean, Apple-like loading screen. Tracks 3D asset progress and fades out once
// everything is ready, so the scene only appears when it can run smoothly.
export default function LoadingOverlay() {
  const { progress, active } = useProgress();
  const [hidden, setHidden] = useState(false);
  const ready = !active && progress >= 100;

  useEffect(() => {
    if (ready) {
      const t = setTimeout(() => setHidden(true), 650);
      return () => clearTimeout(t);
    }
  }, [ready]);

  // safety: never block forever
  useEffect(() => {
    const t = setTimeout(() => setHidden(true), 15000);
    return () => clearTimeout(t);
  }, []);

  if (hidden) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#0b1320] transition-opacity duration-700 ease-out"
      style={{ opacity: ready ? 0 : 1 }}
    >
      <div className="flex w-64 flex-col items-center gap-5">
        <div className="anim-rise text-center">
          <div className="text-[15px] font-medium tracking-tight text-white">
            Star Tree
          </div>
          <div className="mt-1 text-[11px] text-white/40">
            Plattnericus/ThreeJS_Portfolio
          </div>
        </div>

        <div className="anim-fade delay-1 h-px w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-white/80 transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(6, progress).toFixed(0)}%` }}
          />
        </div>

        <div className="anim-fade delay-2 text-[11px] tabular-nums text-white/35">
          {progress < 100 ? `${progress.toFixed(0)}%` : "Ready"}
        </div>
      </div>
    </div>
  );
}
