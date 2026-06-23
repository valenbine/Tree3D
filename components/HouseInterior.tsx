"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { profileForIndex } from "@/lib/profile";
import type { StarRepo, Stargazer } from "@/lib/stargazers";
import { TIER_COLOR } from "@/lib/rarity";
import { CloseIcon, StarIcon } from "./Icons";

const ROOM = "/models/tiny_isometric_room.glb";

// The room model, centered at the origin so the camera can sit just inside it.
function Room() {
  const { scene } = useGLTF(ROOM);
  const room = useMemo(() => {
    const r = scene.clone(true);
    const box = new THREE.Box3().setFromObject(r);
    const c = new THREE.Vector3();
    box.getCenter(c);
    r.position.set(-c.x, -c.y, -c.z);
    r.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return r;
  }, [scene]);
  return <primitive object={room} />;
}

export default function HouseInterior({
  index,
  stargazer,
  onClose,
}: {
  index: number;
  stargazer?: Stargazer | null;
  onClose: () => void;
}) {
  const p = useMemo(
    () => profileForIndex(index, stargazer),
    [index, stargazer],
  );

  // For real stargazers, fetch their top repos lazily (one request per open).
  const [repos, setRepos] = useState<StarRepo[] | null>(
    stargazer ? null : p.repos,
  );
  useEffect(() => {
    if (!stargazer) {
      setRepos(p.repos);
      return;
    }
    let alive = true;
    setRepos(null);
    fetch(`/api/user-repos?login=${encodeURIComponent(stargazer.login)}`)
      .then((r) => r.json())
      .then((d) => alive && setRepos(Array.isArray(d.repos) ? d.repos : []))
      .catch(() => alive && setRepos([]));
    return () => {
      alive = false;
    };
  }, [stargazer, p.repos]);

  return (
    <div className="anim-fade absolute inset-0 z-20 grid place-items-center bg-black/55 backdrop-blur-md">
      <div className="anim-rise relative grid h-[70vh] max-h-[560px] w-[88vw] max-w-[920px] grid-cols-1 overflow-hidden rounded-3xl border border-white/10 bg-[#0d141d] shadow-2xl shadow-black/50 md:grid-cols-[1.3fr_1fr]">
        {/* Interior view */}
        <div className="relative bg-[#0a0f16]">
          <Canvas
            shadows
            camera={{ position: [2.6, 1.8, 2.6], fov: 40 }}
            gl={{ antialias: true }}
          >
            <color attach="background" args={["#0a0f16"]} />
            <Suspense fallback={null}>
              <ambientLight intensity={0.7} />
              <directionalLight position={[3, 6, 4]} intensity={1.3} castShadow />
              <Environment preset="apartment" />
              <Room />
            </Suspense>
            {/* stay inside the room — limited orbit, no zooming out */}
            <OrbitControls
              enablePan={false}
              minDistance={2}
              maxDistance={4.5}
              autoRotate
              autoRotateSpeed={0.6}
              maxPolarAngle={Math.PI / 1.9}
            />
          </Canvas>
        </div>

        {/* Info panel */}
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {p.avatarUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.avatarUrl}
                  alt={p.name}
                  className="h-11 w-11 rounded-full border border-white/15"
                />
              )}
              <div>
                <div
                  className="mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                  style={{ background: TIER_COLOR[p.tier] + "33", color: TIER_COLOR[p.tier] }}
                >
                  {p.tier}
                </div>
                <h2 className="text-xl font-semibold text-white">{p.name}</h2>
                <p className="text-[12px] text-white/45">{p.bio}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          <div>
            <div className="mb-2 text-[11px] uppercase tracking-wide text-white/40">
              Top repositories
            </div>
            <ul className="space-y-2">
              {repos === null &&
                [0, 1, 2].map((k) => (
                  <li
                    key={k}
                    className="h-[46px] animate-pulse rounded-lg border border-white/8 bg-white/[0.03]"
                  />
                ))}
              {repos !== null && repos.length === 0 && (
                <li className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-[12px] text-white/40">
                  No public repositories
                </li>
              )}
              {repos?.map((r) => (
                <li
                  key={r.name}
                  className="flex items-center justify-between rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm text-white">{r.name}</div>
                    <div className="text-[11px] text-white/40">{r.lang}</div>
                  </div>
                  <div className="flex items-center gap-1 text-white/60">
                    <StarIcon className="h-3.5 w-3.5" />
                    <span className="tabular-nums text-xs">
                      {r.stars.toLocaleString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto inline-flex items-center justify-center rounded-lg bg-white py-2 text-sm font-medium text-black transition hover:bg-white/90"
          >
            View GitHub profile
          </a>
        </div>
      </div>
    </div>
  );
}

useGLTF.preload(ROOM);
