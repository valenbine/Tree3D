import { nameForIndex } from "./names";
import { Tier, tierForIndex } from "./rarity";
import type { Stargazer } from "./stargazers";

// Profile per house — real GitHub stargazer when available, else a deterministic
// placeholder so the room always has custom content.

export type Repo = { name: string; stars: number; lang: string };
export type Profile = {
  name: string;
  url: string;
  tier: Tier;
  bio: string;
  repos: Repo[];
  avatarUrl?: string;
};

const REPO_WORDS = [
  "forge",
  "atlas",
  "pixel",
  "nimbus",
  "harbor",
  "echo",
  "canopy",
  "ember",
  "lattice",
  "drift",
];
const LANGS = ["TypeScript", "Rust", "Go", "Python", "Swift", "C++"];

function rand(seed: number) {
  const x = Math.sin(seed * 99.13 + 7.7) * 43758.5453;
  return x - Math.floor(x);
}

export function profileForIndex(i: number, sg?: Stargazer | null): Profile {
  if (sg) {
    return {
      name: sg.login,
      url: sg.profileUrl,
      tier: tierForIndex(i),
      bio: `Stargazer of the Star Tree`,
      avatarUrl: sg.avatarUrl,
      repos: sg.topRepos && sg.topRepos.length ? sg.topRepos : [],
    };
  }

  const name = nameForIndex(i);
  const repos: Repo[] = Array.from({ length: 3 }, (_, k) => {
    const r = rand(i * 7 + k * 13);
    return {
      name: `${REPO_WORDS[(i + k * 3) % REPO_WORDS.length]}-${REPO_WORDS[(i * 2 + k) % REPO_WORDS.length]}`,
      stars: Math.floor(20 + r * 4800),
      lang: LANGS[(i + k) % LANGS.length],
    };
  }).sort((a, b) => b.stars - a.stars);

  return {
    name,
    url: `https://github.com/${name}`,
    tier: tierForIndex(i),
    bio: "Stargazer of the Star Tree.",
    repos,
  };
}
