import { NextResponse } from "next/server";
import type { Stargazer } from "@/lib/stargazers";

const REPO = process.env.GITHUB_REPO ?? "Plattnericus/ThreeJS_Portfolio";

export const revalidate = 60; // refresh at most once a minute

function ghHeaders(accept = "application/vnd.github+json") {
  const h: Record<string, string> = {
    Accept: accept,
    "User-Agent": "threejs-portfolio",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  // Optional — only used to raise the rate limit; not required.
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

export async function GET() {
  try {
    // 1) repo info → star count + existence
    const repoRes = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: ghHeaders(),
      next: { revalidate },
    });

    if (!repoRes.ok) {
      const demo = Number(process.env.DEMO_STARS ?? 0);
      return NextResponse.json({ repo: REPO, stars: demo, live: false, stargazers: null });
    }
    const repo = await repoRes.json();
    const stars: number = repo.stargazers_count ?? 0;

    // 2) the actual stargazers (login + avatar), earliest first. No token needed.
    const sgRes = await fetch(
      `https://api.github.com/repos/${REPO}/stargazers?per_page=40`,
      { headers: ghHeaders("application/vnd.github.star+json"), next: { revalidate } },
    );

    let stargazers: Stargazer[] | null = null;
    if (sgRes.ok) {
      const arr = await sgRes.json();
      stargazers = (Array.isArray(arr) ? arr : [])
        .map((e: any) => e.user ?? e) // star+json wraps in {starred_at, user}
        .filter((u: any) => u && u.login)
        .map((u: any) => ({
          login: u.login,
          avatarUrl: u.avatar_url,
          profileUrl: u.html_url,
        }));
    }

    return NextResponse.json({ repo: REPO, stars, live: true, stargazers });
  } catch {
    const demo = Number(process.env.DEMO_STARS ?? 0);
    return NextResponse.json({ repo: REPO, stars: demo, live: false, stargazers: null });
  }
}
