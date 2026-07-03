"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import SettingsMenu, {
  type GraphicsQuality,
  type ManualDate,
} from "@/components/SettingsMenu";
import type { ResolvedGraphicsQuality } from "@/components/Experience";
import SearchBar from "@/components/SearchBar";
import HouseInterior from "@/components/HouseInterior";
import MemorialSecret from "@/components/MemorialSecret";
import LoadingOverlay from "@/components/LoadingOverlay";
import { FlyIcon } from "@/components/Icons";
import { UI_TEXT, type Language } from "@/lib/i18n";
import { nameForHouse, type Stargazer } from "@/lib/stargazers";
import { resolveTier } from "@/lib/rarity";
import { resolveWeatherMode, shouldRequestGeolocation } from "@/lib/weather-location";

import {
  manualWeather,
  sceneFromWeather,
  weatherFromApiPayload,
  type Sky,
  type Weather,
} from "@/lib/weather";

const Experience = dynamic(() => import("@/components/Experience"), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#0b1320]" />,
});

const STARGAZER_REFRESH_MS = 5 * 60 * 1000;
const WEATHER_REFRESH_MS = 10 * 60 * 1000;
const LOADER_INTRO_MS = 900;
const GRAPHICS_STORAGE_KEY = "star-tree-graphics-quality";
const LANGUAGE_STORAGE_KEY = "star-tree-language";

type ClientCoords = {
  lat: number;
  lon: number;
  tz: string;
};

function weatherQuery(
  mode: "default" | "ip" | "coords",
  coords: ClientCoords | null,
  language: Language,
): string {
  if (mode === "coords" && coords) {
    return new URLSearchParams({
      lat: String(coords.lat),
      lon: String(coords.lon),
      tz: coords.tz,
      lang: language,
    }).toString();
  }

  if (mode === "ip") {
    return new URLSearchParams({ locate: "ip", lang: language }).toString();
  }

  if (!coords) {
    return new URLSearchParams({
      lat: "31.2304",
      lon: "121.4737",
      tz: "Asia/Shanghai",
      place: language === "zh" ? "中国上海市" : "Shanghai, China",
      lang: language,
    }).toString();
  }

  return new URLSearchParams({
    lat: String(coords.lat),
    lon: String(coords.lon),
    tz: coords.tz,
    lang: language,
  }).toString();
}

function isGraphicsQuality(value: string | null): value is GraphicsQuality {
  return value === "auto" || value === "low" || value === "medium" || value === "high";
}

function detectGraphicsQuality(): ResolvedGraphicsQuality {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "medium";
  const nav = navigator as Navigator & { deviceMemory?: number };
  const narrow = Math.min(window.innerWidth, window.innerHeight) < 820;
  const touchFirst = navigator.maxTouchPoints > 1 && narrow;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = nav.deviceMemory ?? (touchFirst ? 4 : 8);
  const dpr = window.devicePixelRatio || 1;

  if (touchFirst || cores <= 4 || memory <= 4) return "low";
  if (cores >= 8 && memory >= 8 && dpr >= 1.5) return "high";
  return "medium";
}

export default function Home() {
  const [stars, setStars] = useState(0);
  const [starsLive, setStarsLive] = useState(false);
  const [stargazers, setStargazers] = useState<Stargazer[] | null>(null);
  // When the stargazer feed was last successfully pulled — surfaced quietly in
  // the settings panel so you can tell how fresh the village is.
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [nextSync, setNextSync] = useState<number | null>(null);
  const [starsReady, setStarsReady] = useState(false);
  const [weatherReady, setWeatherReady] = useState(false);

  // Weather: live reading from Gossensass / Brenner, plus a manual override mode.
  const [liveWeather, setLiveWeather] = useState<Weather | null>(null);
  const [mode, setMode] = useState<"live" | "manual">("live");
  const [manualSky, setManualSky] = useState<Sky>("clear");
  const [search, setSearch] = useState("");
  const [searchActive, setSearchActive] = useState(-1);
  const [fly, setFly] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [secretOpen, setSecretOpen] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  // Let the loader draw first; mount WebGL only after live data is ready.
  const [loaderIntroDone, setLoaderIntroDone] = useState(false);
  const [mountScene, setMountScene] = useState(false);
  const [graphicsQuality, setGraphicsQuality] = useState<GraphicsQuality>("auto");
  const [resolvedGraphicsQuality, setResolvedGraphicsQuality] =
    useState<ResolvedGraphicsQuality>("medium");
  const [language, setLanguage] = useState<Language>("zh");
  const [weatherMode, setWeatherMode] = useState<"default" | "ip" | "coords">("default");
  const [clientCoords, setClientCoords] = useState<ClientCoords | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "pending" | "succeeded" | "failed">("idle");
  const now = new Date();
  const [date, setDate] = useState<ManualDate>({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: 13,
  });

  useEffect(() => {
    const id = window.setTimeout(() => setLoaderIntroDone(true), LOADER_INTRO_MS);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem(GRAPHICS_STORAGE_KEY);
    if (isGraphicsQuality(saved)) setGraphicsQuality(saved);
    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage === "zh" || savedLanguage === "en") setLanguage(savedLanguage);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(GRAPHICS_STORAGE_KEY, graphicsQuality);
    setResolvedGraphicsQuality(
      graphicsQuality === "auto" ? detectGraphicsQuality() : graphicsQuality,
    );
  }, [graphicsQuality]);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  const initialDataReady = starsReady && weatherReady;

  useEffect(() => {
    if (loaderIntroDone && initialDataReady) setMountScene(true);
  }, [initialDataReady, loaderIntroDone]);

  useEffect(() => {
    const nextMode = resolveWeatherMode({
      sceneReady,
      geoStatus,
      hasGeolocation: typeof navigator !== "undefined" && Boolean(navigator.geolocation),
      clientCoords,
    });
    setWeatherMode((currentMode) => (currentMode === nextMode ? currentMode : nextMode));
  }, [clientCoords, geoStatus, sceneReady]);

  useEffect(() => {
    if (
      !shouldRequestGeolocation({
        sceneReady,
        geoStatus,
        hasGeolocation: typeof navigator !== "undefined" && Boolean(navigator.geolocation),
        clientCoords,
      }) ||
      typeof navigator === "undefined" ||
      !navigator.geolocation
    ) {
      return;
    }
    setGeoStatus("pending");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai";
        setClientCoords({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          tz,
        });
        setGeoStatus("succeeded");
      },
      () => setGeoStatus("failed"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5 * 60 * 1000 },
    );
  }, [clientCoords, geoStatus, sceneReady]);

  useEffect(() => {
    // Refresh stargazers every 5 minutes so new stars grow the tree live.
    // `no-store` keeps the browser from reusing an old response on startup.
    const loadStars = () =>
      fetch("/api/stargazers", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (typeof d.stars === "number") setStars(d.stars);
          setStarsLive(Boolean(d.live));
          setStargazers(Array.isArray(d.stargazers) ? d.stargazers : null);
          const syncedAt = typeof d.fetchedAt === "number" ? d.fetchedAt : Date.now();
          setLastSync(syncedAt);
          setNextSync(Date.now() + STARGAZER_REFRESH_MS);
          setStarsReady(true);
        })
        .catch(() => {
          setStarsReady(true);
        });

    const loadWeather = (query: string) =>
      fetch(`/api/weather?${query}`)
        .then((r) => r.json())
        .then((d) => {
          setLiveWeather(weatherFromApiPayload(d));
          setWeatherReady(true);
        })
        .catch(() => {
          setLiveWeather(manualWeather(13, new Date().getMonth(), "clouds"));
          setWeatherReady(true);
        });

    loadStars();
    loadWeather(weatherQuery(weatherMode, clientCoords, language));
    // Refresh the live village every 5 minutes while the site is open.
    const starId = setInterval(loadStars, STARGAZER_REFRESH_MS);
    const weatherId = setInterval(
      () => loadWeather(weatherQuery(weatherMode, clientCoords, language)),
      // Keep the same source mode during refreshes.
      WEATHER_REFRESH_MS,
    );
    return () => {
      clearInterval(starId);
      clearInterval(weatherId);
    };
  }, [clientCoords, language, weatherMode]);

  const weather: Weather | null =
    mode === "manual"
      ? manualWeather(
          date.hour,
          Math.min(11, Math.max(0, date.month - 1)),
          manualSky,
          date.year,
          date.day,
        )
      : liveWeather;

  const params = useMemo(
    () =>
      sceneFromWeather(
        weather ?? manualWeather(13, new Date().getMonth(), "clouds"),
      ),
    [weather],
  );

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    const count = Math.max(0, Math.floor(stars));
    const all = Array.from({ length: count }, (_, i) => {
      const gazer = stargazers?.[i] ?? null;
      return {
        index: i,
        name: nameForHouse(i, stargazers),
        tier: resolveTier(i, stargazers),
        contributor: Boolean(gazer?.contributor),
      };
    });
    if (!q) return all;
    return all.filter((result) => result.name.toLowerCase().includes(q));
  }, [search, stargazers, stars]);

  useEffect(() => {
    if (searchResults.length === 0) {
      setSearchActive(-1);
      return;
    }
    if (
      searchActive >= 0 &&
      !searchResults.some((result) => result.index === searchActive)
    ) {
      setSearchActive(searchResults[0].index);
    }
  }, [searchActive, searchResults]);

  const highlight = searchActive;
  const copy = UI_TEXT[language];

  return (
    <main className="relative h-full w-full overflow-hidden">
      <div
        className={`absolute inset-0 transition duration-1000 ease-out ${
          sceneReady ? "scale-100 opacity-100 blur-0" : "scale-[1.015] opacity-0 blur-[2px]"
        }`}
      >
        {mountScene && (
          <Experience
            stars={stars}
            params={params}
            highlight={highlight}
            fly={fly}
            stargazers={stargazers}
            graphicsQuality={resolvedGraphicsQuality}
            onSelectHouse={setSelected}
            onFindDove={() => setSecretOpen(true)}
            onReady={() => setSceneReady(true)}
          />
        )}
      </div>
      <LoadingOverlay
        sceneReady={sceneReady}
        dataReady={initialDataReady}
        starsReady={starsReady}
        weatherReady={weatherReady}
        language={language}
      />
      {secretOpen && <MemorialSecret onClose={() => setSecretOpen(false)} />}

      <div
        className={`transition duration-700 ease-out ${
          sceneReady ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <SearchBar
          query={search}
          onQuery={setSearch}
          results={searchResults}
          activeIndex={highlight}
          language={language}
          onActive={setSearchActive}
          onSelect={(result) => {
            setSearch(result.name);
            setSearchActive(result.index);
            setSelected(result.index);
          }}
        />

        <div className="anim-rise-x absolute right-16 top-5 z-40 flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-1 py-1 text-[11px] font-semibold text-white/75 backdrop-blur-xl">
          <span className="px-2 text-white/38">{copy.page.languageLabel}</span>
          {(["zh", "en"] as const).map((lang) => {
            const active = language === lang;
            return (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`rounded-full px-2.5 py-1 transition ${
                  active
                    ? "bg-[#9fd272] text-[#0a100d]"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                }`}
                aria-pressed={active}
              >
                {lang === "zh" ? "中" : "EN"}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setFly((f) => !f)}
          className={`anim-rise-x absolute bottom-20 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border px-4 py-2 text-xs backdrop-blur-xl transition active:scale-95 sm:bottom-6 ${
            fly
              ? "border-white/25 bg-white/15 text-white"
              : "border-white/10 bg-white/[0.06] text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <FlyIcon className="h-3.5 w-3.5" />
          {fly ? copy.page.exitFlyMode : copy.page.flyAround}
        </button>
        {fly && (
          <div className="pointer-events-none absolute bottom-32 left-1/2 -translate-x-1/2 text-center text-[11px] text-white/45 sm:bottom-16">
            {copy.page.flyHint}
          </div>
        )}

        {selected !== null && (
          <HouseInterior
            index={selected}
            stargazer={stargazers?.[selected] ?? null}
            onClose={() => setSelected(null)}
            language={language}
          />
        )}
        <SettingsMenu
          language={language}
          weather={weather}
          mode={mode}
          date={date}
          manualSky={manualSky}
          starsLive={starsLive}
          lastSync={lastSync}
          nextSync={nextSync}
          graphicsQuality={graphicsQuality}
          resolvedGraphicsQuality={resolvedGraphicsQuality}
          onMode={setMode}
          onDate={setDate}
          onSky={setManualSky}
          onGraphicsQuality={setGraphicsQuality}
        />
      </div>
    </main>
  );
}
