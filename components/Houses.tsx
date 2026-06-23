"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { TIER_BUILDING, Tier, tierForIndex } from "@/lib/rarity";
import { MAX_HOUSES } from "@/lib/layout";
import { sampleBranchAnchors } from "@/lib/branches";
import { buildLantern } from "@/lib/lantern";

const PACK = "/models/casual_village_buildings_pack.glb";
const TREE = "/models/tree.glb";
const LANTERN = "/models/stylized_lantern.glb";
const LANTERN_ROT = 0; // model is already Y-up; no rotation keeps it standing

function rand(seed: number) {
  const x = Math.sin(seed * 53.17 + 11.3) * 43758.5453;
  return x - Math.floor(x);
}

// Clean round wooden platform with a little railing (the supplied platform model
// is a tall weighted contraption, not a flat deck, so we build one). Deck top at
// y=0 so the house sits on it.
const WOOD = new THREE.MeshStandardMaterial({
  color: "#7a5230",
  roughness: 0.85,
  flatShading: true,
});
const WOOD_DARK = new THREE.MeshStandardMaterial({
  color: "#553820",
  roughness: 0.9,
});

function makePlatform(deckR: number): THREE.Group {
  const g = new THREE.Group();
  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(deckR, deckR * 0.9, 0.28, 20),
    WOOD,
  );
  deck.position.y = -0.14;
  deck.castShadow = true;
  deck.receiveShadow = true;
  g.add(deck);

  const rail = new THREE.Mesh(
    new THREE.TorusGeometry(deckR * 0.97, 0.045, 6, 22),
    WOOD_DARK,
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.y = 0.5;
  g.add(rail);

  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.55, 5),
      WOOD_DARK,
    );
    post.position.set(
      Math.cos(a) * deckR * 0.95,
      0.25,
      Math.sin(a) * deckR * 0.95,
    );
    g.add(post);
  }
  return g;
}

// Smaller treehouse-sized buildings; rarer = a bit bigger.
const TIER_SIZE: Record<Tier, number> = {
  common: 0.95,
  uncommon: 1.2,
  rare: 1.5,
  legendary: 1.85,
};

function useBuildingFactory() {
  const { scene } = useGLTF(PACK);
  return useMemo(() => {
    const geos = new Map<string, { geo: THREE.BufferGeometry; mat: THREE.Material }>();
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh)
        geos.set(o.name, { geo: o.geometry, mat: o.material as THREE.Material });
    });
    return (tier: Tier) => {
      const src = geos.get(TIER_BUILDING[tier]);
      if (!src) return null;
      const mesh = new THREE.Mesh(src.geo.clone(), (src.mat as THREE.Material).clone());
      mesh.castShadow = true;
      mesh.rotation.x = -Math.PI / 2; // Z-up -> Y-up
      mesh.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const s = TIER_SIZE[tier] / Math.max(size.x, size.z);
      const g = new THREE.Group();
      g.add(mesh);
      g.scale.setScalar(s);
      mesh.position.set(-center.x, -box.min.y, -center.z);
      return g;
    };
  }, [scene]);
}

export function Houses({
  stars,
  wind = 1,
  highlight = -1,
  night = 0,
  onSelect,
}: {
  stars: number;
  wind?: number;
  highlight?: number;
  night?: number;
  onSelect?: (i: number) => void;
}) {
  const lightsOn = night > 0.04;
  const makeBuilding = useBuildingFactory();
  const { scene: treeScene } = useGLTF(TREE);
  const { scene: lanternScene } = useGLTF(LANTERN);
  const anchors = useMemo(
    () => sampleBranchAnchors(treeScene, MAX_HOUSES),
    [treeScene],
  );

  const groups = useRef<(THREE.Group | null)[]>([]);
  const active = Math.min(anchors.length, Math.max(0, Math.floor(stars)));

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    for (let i = 0; i < anchors.length; i++) {
      const grp = groups.current[i];
      if (!grp) continue;
      const isHi = i === highlight;
      const target = i < active ? (isHi ? 1.15 : 1) : 0;
      grp.scale.x += (target - grp.scale.x) * 0.12;
      grp.scale.y = grp.scale.z = grp.scale.x;
      grp.visible = grp.scale.x > 0.01;
      // tiny settle bob in place (they're rooted to the branch, not floating)
      grp.position.y =
        anchors[i].pos.y + 0.35 + Math.sin(t * 0.8 + i) * (isHi ? 0.12 : 0.03);
    }
  });

  return (
    <group>
      {anchors.map((a, i) => {
        const tier = tierForIndex(i);
        const size = TIER_SIZE[tier];
        const building = makeBuilding(tier);
        const deckR = size * 1.5;
        const platform = makePlatform(deckR);
        const lantern = buildLantern(
          lanternScene,
          size * 0.8,
          LANTERN_ROT,
          0.2 + night * 2.2,
        );
        // random-ish spot on the deck
        const la = rand(i) * Math.PI * 2;
        const lr = deckR * (0.45 + 0.32 * rand(i + 5));
        const isOn = i < active;
        return (
          <group
            key={i}
            ref={(g) => {
              groups.current[i] = g;
            }}
            position={a.pos}
            rotation={[0, i * 1.7, 0]}
            scale={0}
            onClick={(e) => {
              if (i >= active) return;
              e.stopPropagation();
              onSelect?.(i);
            }}
            onPointerOver={(e) => {
              if (i < active) {
                e.stopPropagation();
                document.body.style.cursor = "pointer";
              }
            }}
            onPointerOut={() => {
              document.body.style.cursor = "auto";
            }}
          >
            {platform && <primitive object={platform} />}
            {building && <primitive object={building} position={[0, 0.04, 0]} />}
            {/* a small upright lantern randomly on the deck */}
            <group position={[Math.cos(la) * lr, 0.04, Math.sin(la) * lr]}>
              <primitive object={lantern} />
              {/* the lantern emits warm light at night (capped for perf) */}
              {isOn && lightsOn && i < 10 && (
                <pointLight
                  color="#ffb765"
                  position={[0, size * 0.45, 0]}
                  intensity={5 * night}
                  distance={size * 4}
                  decay={2}
                />
              )}
            </group>
            {/* warm glow inside the house at night (first few, to bound lights) */}
            {isOn && lightsOn && i < 8 && (
              <pointLight
                color="#ffc27a"
                position={[0, size * 0.55, 0]}
                intensity={7 * night}
                distance={size * 3.5}
                decay={2}
              />
            )}
          </group>
        );
      })}
    </group>
  );
}

useGLTF.preload(PACK);
useGLTF.preload(LANTERN);
