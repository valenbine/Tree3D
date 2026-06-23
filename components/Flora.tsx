"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const TMP = new THREE.Object3D();
const FLOWER_COLORS = ["#e8546b", "#f2c14e", "#ffffff", "#d98cc4", "#7aa6ff"];

// Scatter helper on the island plateau (disc with a slight dome).
function scatter(
  i: number,
  radius: number,
  topY: number,
  rng: () => number,
): THREE.Vector3 {
  const r = radius * Math.sqrt(rng());
  const a = rng() * Math.PI * 2;
  const x = Math.cos(a) * r;
  const z = Math.sin(a) * r;
  const y = topY - Math.pow(r / radius, 2) * 1.6;
  return new THREE.Vector3(x, y, z);
}

// Seeded RNG so the meadow is stable across reloads.
function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Low-poly bushes + colorful flowers scattered over the island grass. */
export function Flora({
  radius = 10,
  topY = 6.7,
}: {
  radius?: number;
  topY?: number;
}) {
  const bushGeo = useMemo(() => new THREE.IcosahedronGeometry(0.5, 0), []);
  const bushMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#3f6b2c",
        roughness: 1,
        flatShading: true,
      }),
    [],
  );
  // a flower = two crossed quads (billboard-ish) on a short stem
  const flowerGeo = useMemo(() => {
    const a = new THREE.PlaneGeometry(0.28, 0.28);
    const b = a.clone();
    b.rotateY(Math.PI / 2);
    a.translate(0, 0.25, 0);
    b.translate(0, 0.25, 0);
    return mergeTwo(a, b);
  }, []);
  const flowerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.8,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const bushRef = useRef<THREE.InstancedMesh>(null);
  const flowerRef = useRef<THREE.InstancedMesh>(null);
  const BUSHES = 140;
  const FLOWERS = 600;

  useEffect(() => {
    const bush = bushRef.current;
    if (bush) {
      const rng = mulberry(7);
      const col = new THREE.Color();
      for (let i = 0; i < BUSHES; i++) {
        const p = scatter(i, radius - 0.5, topY, rng);
        TMP.position.copy(p);
        TMP.position.y += 0.2;
        TMP.rotation.set(0, rng() * Math.PI, 0);
        const s = 0.6 + rng() * 0.9;
        TMP.scale.set(s, s * (0.7 + rng() * 0.4), s);
        TMP.updateMatrix();
        bush.setMatrixAt(i, TMP.matrix);
        col.setHSL(0.28 + rng() * 0.05, 0.45, 0.25 + rng() * 0.1);
        bush.setColorAt(i, col);
      }
      bush.instanceMatrix.needsUpdate = true;
      if (bush.instanceColor) bush.instanceColor.needsUpdate = true;
    }
    const flower = flowerRef.current;
    if (flower) {
      const rng = mulberry(99);
      const col = new THREE.Color();
      for (let i = 0; i < FLOWERS; i++) {
        const p = scatter(i, radius, topY, rng);
        TMP.position.copy(p);
        TMP.rotation.set(0, rng() * Math.PI, 0);
        const s = 0.8 + rng() * 0.6;
        TMP.scale.set(s, s, s);
        TMP.updateMatrix();
        flower.setMatrixAt(i, TMP.matrix);
        col.set(FLOWER_COLORS[(Math.random() * FLOWER_COLORS.length) | 0]);
        flower.setColorAt(i, col);
      }
      flower.instanceMatrix.needsUpdate = true;
      if (flower.instanceColor) flower.instanceColor.needsUpdate = true;
    }
  }, [radius, topY]);

  return (
    <group>
      <instancedMesh ref={bushRef} args={[bushGeo, bushMat, BUSHES]} castShadow receiveShadow />
      <instancedMesh ref={flowerRef} args={[flowerGeo, flowerMat, FLOWERS]} />
    </group>
  );
}

// Merge two plane geometries into one (with a white vertex-color attribute so
// instanceColor tints them).
function mergeTwo(a: THREE.BufferGeometry, b: THREE.BufferGeometry) {
  const ap = a.getAttribute("position").array as Float32Array;
  const bp = b.getAttribute("position").array as Float32Array;
  const ai = a.getIndex()!.array as ArrayLike<number>;
  const bi = b.getIndex()!.array as ArrayLike<number>;
  const positions = new Float32Array(ap.length + bp.length);
  positions.set(ap, 0);
  positions.set(bp, ap.length);
  const offset = ap.length / 3;
  const index: number[] = [];
  for (let i = 0; i < ai.length; i++) index.push(ai[i]);
  for (let i = 0; i < bi.length; i++) index.push(bi[i] + offset);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}
