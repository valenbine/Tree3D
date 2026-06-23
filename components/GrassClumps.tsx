"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const GRASS = "/models/grass.glb";

// The detailed grass model is heavy (~216k verts), so we scatter a modest number
// of clumps as accents over the plateau — the cheap blade Grass handles density.
export function GrassClumps({
  count = 10,
  radius = 8,
  topY = 5.2,
}: {
  count?: number;
  radius?: number;
  topY?: number;
}) {
  const { scene } = useGLTF(GRASS);

  const clumps = useMemo(() => {
    const out: { obj: THREE.Object3D; key: number }[] = [];
    for (let i = 0; i < count; i++) {
      const rng = (n: number) => {
        const x = Math.sin((i + 1) * 12.9 + n * 78.2) * 43758.5;
        return x - Math.floor(x);
      };
      const r = radius * Math.sqrt(rng(1));
      const a = rng(2) * Math.PI * 2;
      const obj = scene.clone(true);
      obj.traverse((o) => {
        if (o instanceof THREE.Mesh) o.castShadow = false;
      });
      const s = 0.7 + rng(3) * 0.8;
      obj.position.set(
        Math.cos(a) * r,
        topY - Math.pow(r / radius, 2) * 1.6 - 0.05,
        Math.sin(a) * r,
      );
      obj.rotation.y = rng(4) * Math.PI * 2;
      obj.scale.setScalar(s);
      out.push({ obj, key: i });
    }
    return out;
  }, [scene, count, radius, topY]);

  return (
    <group>
      {clumps.map((c) => (
        <primitive key={c.key} object={c.obj} />
      ))}
    </group>
  );
}

useGLTF.preload(GRASS);
