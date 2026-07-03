import { NextResponse } from "next/server";
import { SHANGHAI, skyFromCode } from "@/lib/weather";

// Refresh the real Gossensass / Brenner weather every 10 minutes.
export const revalidate = 600;

const CURRENT_FIELDS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "precipitation",
  "rain",
  "snowfall",
  "weather_code",
  "cloud_cover",
  "pressure_msl",
  "surface_pressure",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
  "is_day",
].join(",");

const HOURLY_FIELDS = [
  "cloud_cover_low",
  "cloud_cover_mid",
  "cloud_cover_high",
  "visibility",
  "wind_speed_10m",
  "wind_direction_10m",
  "wind_gusts_10m",
].join(",");

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function pct(value: unknown, fallback: number): number {
  return Math.max(0, Math.min(1, num(value, fallback * 100) / 100));
}

function currentHourIndex(times: unknown, currentTime: unknown): number {
  if (!Array.isArray(times) || typeof currentTime !== "string") return -1;
  const exact = times.findIndex((t) => t === currentTime.slice(0, 13) + ":00");
  if (exact >= 0) return exact;
  const currentMs = Date.parse(currentTime);
  if (!Number.isFinite(currentMs)) return -1;
  let best = -1;
  let bestDelta = Infinity;
  times.forEach((t, i) => {
    if (typeof t !== "string") return;
    const ms = Date.parse(t);
    const delta = Math.abs(ms - currentMs);
    if (Number.isFinite(delta) && delta < bestDelta) {
      best = i;
      bestDelta = delta;
    }
  });
  return best;
}

function hourlyNum(hourly: Record<string, unknown>, key: string, index: number, fallback: number): number {
  const arr = hourly[key];
  if (!Array.isArray(arr) || index < 0) return fallback;
  return num(arr[index], fallback);
}

function localDateParts(time: unknown): { year: number; month: number; day: number; hour: number } {
  if (typeof time === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})/.exec(time);
    if (match) {
      return {
        year: Number(match[1]),
        month: Number(match[2]) - 1,
        day: Number(match[3]),
        hour: Number(match[4]),
      };
    }
  }
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth(),
    day: now.getDate(),
    hour: now.getHours(),
  };
}

function pickQueryNumber(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pickQueryString(value: string | null, fallback: string): string {
  return value?.trim() ? value.trim() : fallback;
}

function clientIpFromHeaders(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return null;
}

function normalizeLang(lang: string): "zh" | "en" {
  return lang.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function uniqueParts(parts: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of parts) {
    const value = part?.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function hasHanCharacters(value: string): boolean {
  return /[\u3400-\u9fff]/u.test(value);
}

function normalizeCountryName(country: string | undefined, lang: string): string | undefined {
  if (!country) return undefined;
  const value = country.trim();
  if (lang === "zh" && (value === "中华人民共和国" || value === "中国大陆")) return "中国";
  return value;
}

function formatReversePlace(address: Record<string, unknown>, lang: string): string | null {
  const country = normalizeCountryName(
    typeof address.country === "string" ? address.country : undefined,
    lang,
  );
  const state = typeof address.state === "string" ? address.state : undefined;
  const city =
    typeof address.city === "string"
      ? address.city
      : typeof address.town === "string"
        ? address.town
        : typeof address.village === "string"
          ? address.village
          : typeof address.county === "string"
            ? address.county
            : undefined;
  const district =
    typeof address.city_district === "string"
      ? address.city_district
      : typeof address.suburb === "string"
        ? address.suburb
        : typeof address.borough === "string"
          ? address.borough
          : typeof address.county === "string"
            ? address.county
            : undefined;

  if (lang === "zh") {
    const zhCountry = country ?? "中国";
    const zhState = state && state !== city ? state : undefined;
    const zhCity = city;
    const zhDistrict = district && district !== zhCity && district !== zhState ? district : undefined;
    const parts = uniqueParts([zhCountry, zhState, zhCity, zhDistrict]).slice(0, 4);
    return parts.length ? parts.join("") : null;
  }

  const parts = uniqueParts([district, city, state, country]).slice(0, 3);
  return parts.length ? parts.join(", ") : null;
}

function formatPlaceParts(country: string | undefined, state: string | undefined, city: string | undefined, district: string | undefined, lang: string): string | null {
  const normalizedCountry = normalizeCountryName(country, lang);
  if (lang === "zh") {
    const parts = uniqueParts([
      normalizedCountry ?? "中国",
      state && state !== city ? state : undefined,
      city,
      district && district !== city && district !== state ? district : undefined,
    ]).slice(0, 4);
    return parts.length ? parts.join("") : null;
  }

  const parts = uniqueParts([district, city, state, normalizedCountry]).slice(0, 3);
  return parts.length ? parts.join(", ") : null;
}

async function reversePlaceNameFromBigDataCloud(lat: number, lon: number, lang: string): Promise<string | null> {
  const normalized = normalizeLang(lang);
  const url =
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}` +
    `&longitude=${lon}&localityLanguage=${encodeURIComponent(normalized === "zh" ? "zh" : "en")}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ThreeJS_Portfolio/1.0",
    },
    next: { revalidate },
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    city?: string;
    locality?: string;
    principalSubdivision?: string;
    countryName?: string;
    localityInfo?: {
      administrative?: Array<{
        order?: number;
        name?: string;
        isoName?: string;
        description?: string;
      }>;
    };
  };

  const district = data.localityInfo?.administrative
    ?.filter((item) => typeof item.name === "string" && item.name.trim())
    .sort((a, b) => (b.order ?? 0) - (a.order ?? 0))
    .find((item) => item.description === "suburb" || item.description === "city_district" || item.description === "county")?.name;

  return formatPlaceParts(
    typeof data.countryName === "string" ? data.countryName : undefined,
    typeof data.principalSubdivision === "string" ? data.principalSubdivision : undefined,
    typeof data.city === "string"
      ? data.city
      : typeof data.locality === "string"
        ? data.locality
        : undefined,
    district,
    normalized,
  );
}

async function reversePlaceName(lat: number, lon: number, lang: string): Promise<string | null> {
  const normalized = normalizeLang(lang);
  const bigDataCloudPlace = await reversePlaceNameFromBigDataCloud(lat, lon, normalized).catch(() => null);
  if (bigDataCloudPlace && (normalized !== "zh" || hasHanCharacters(bigDataCloudPlace))) return bigDataCloudPlace;

  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=12&addressdetails=1` +
    `&lat=${lat}&lon=${lon}&accept-language=${encodeURIComponent(normalized === "zh" ? "zh-CN" : "en")}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "ThreeJS_Portfolio/1.0",
        Accept: "application/json",
      },
      next: { revalidate },
    });

    if (!res.ok) return bigDataCloudPlace;
    const data = (await res.json()) as { address?: Record<string, unknown>; name?: string; display_name?: string };
    if (data.address) {
      const formatted = formatReversePlace(data.address, normalized);
      if (formatted && (normalized !== "zh" || hasHanCharacters(formatted))) return formatted;
    }
    if (typeof data.name === "string" && data.name.trim()) {
      const trimmed = data.name.trim();
      if (normalized !== "zh" || hasHanCharacters(trimmed)) return trimmed;
    }
    if (typeof data.display_name === "string" && data.display_name.trim()) {
      const display = data.display_name.split(",").slice(0, 3).join(", ").trim();
      if (normalized !== "zh" || hasHanCharacters(display)) return display;
    }
  } catch {
    return bigDataCloudPlace;
  }
  return bigDataCloudPlace;
}

type LocationTarget = {
  lat: number;
  lon: number;
  tz: string;
  place: string;
};

async function locateByIp(headers: Headers, lang: string): Promise<LocationTarget | null> {
  const ip = clientIpFromHeaders(headers);
  if (!ip) return null;
  const normalized = normalizeLang(lang);
  const url = `https://ipwho.is/${encodeURIComponent(ip)}?lang=${normalized}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ThreeJS_Portfolio/1.0",
    },
    next: { revalidate },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    success?: boolean;
    latitude?: number;
    longitude?: number;
    city?: string;
    region?: string;
    country?: string;
    timezone?: { id?: string };
  };
  if (!data.success) return null;
  if (typeof data.latitude !== "number" || typeof data.longitude !== "number") return null;
  const city = typeof data.city === "string" ? data.city.trim() : "";
  const region = typeof data.region === "string" ? data.region.trim() : "";
  const country = typeof data.country === "string" ? data.country.trim() : "";
  const place =
    normalized === "zh"
      ? uniqueParts([country, region, city]).join("")
      : uniqueParts([city, region, country]).join(", ");
  const reversePlace = await reversePlaceName(data.latitude, data.longitude, normalized).catch(() => null);
  return {
    lat: data.latitude,
    lon: data.longitude,
    tz: typeof data.timezone?.id === "string" && data.timezone.id.trim() ? data.timezone.id : SHANGHAI.tz,
    place: reversePlace || place || SHANGHAI.place,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = pickQueryString(searchParams.get("lang"), "en");
  const manualPlace = searchParams.get("place");
  const locate = searchParams.get("locate");

  let target: LocationTarget = {
    lat: pickQueryNumber(searchParams.get("lat"), SHANGHAI.lat),
    lon: pickQueryNumber(searchParams.get("lon"), SHANGHAI.lon),
    tz: pickQueryString(searchParams.get("tz"), SHANGHAI.tz),
    place: pickQueryString(manualPlace, SHANGHAI.place),
  };

  if (locate === "ip") {
    try {
      target = (await locateByIp(request.headers, lang)) ?? target;
    } catch {
      target = target;
    }
  } else if (!manualPlace) {
    try {
      target.place = (await reversePlaceName(target.lat, target.lon, lang)) ?? target.place;
    } catch {
      target.place = target.place;
    }
  }
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${target.lat}` +
    `&longitude=${target.lon}` +
    `&current=${CURRENT_FIELDS}` +
    `&hourly=${HOURLY_FIELDS}` +
    `&forecast_days=1` +
    `&timezone=${encodeURIComponent(target.tz)}`;

  try {
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) throw new Error(`open-meteo ${res.status}`);
    const data = await res.json();
    const c = data.current ?? {};
    const hourly = data.hourly ?? {};
    const hourIndex = currentHourIndex(hourly.time, c.time);
    const date = localDateParts(c.time);

    return NextResponse.json({
      live: true,
      place: target.place,
      tempC: num(c.temperature_2m, 12),
      apparentTempC: num(c.apparent_temperature, num(c.temperature_2m, 12)),
      humidity: num(c.relative_humidity_2m, 55),
      pressureHpa: num(c.pressure_msl, 1016),
      surfacePressureHpa: num(c.surface_pressure, 905),
      precipMm: num(c.precipitation, 0),
      rainMm: num(c.rain, 0),
      snowfallCm: num(c.snowfall, 0),
      windKmh: num(c.wind_speed_10m, hourlyNum(hourly, "wind_speed_10m", hourIndex, 6)),
      gustKmh: num(c.wind_gusts_10m, hourlyNum(hourly, "wind_gusts_10m", hourIndex, 8)),
      windDeg: num(c.wind_direction_10m, hourlyNum(hourly, "wind_direction_10m", hourIndex, 235)),
      cloud: pct(c.cloud_cover, 0.3),
      cloudLow: pct(hourlyNum(hourly, "cloud_cover_low", hourIndex, 0), 0),
      cloudMid: pct(hourlyNum(hourly, "cloud_cover_mid", hourIndex, 30), 0.3),
      cloudHigh: pct(hourlyNum(hourly, "cloud_cover_high", hourIndex, 20), 0.2),
      visibilityM: hourlyNum(hourly, "visibility", hourIndex, 40000),
      hour: date.hour,
      day: date.day,
      month: date.month,
      year: date.year,
      sky: skyFromCode(num(c.weather_code, 0)),
    });
  } catch {
    const date = localDateParts(null);
    // Fallback so the scene still has sensible mountain weather offline.
    return NextResponse.json({
      live: false,
      place: target.place,
      tempC: 14,
      apparentTempC: 14,
      humidity: 62,
      pressureHpa: 1017,
      surfacePressureHpa: 905,
      precipMm: 0,
      rainMm: 0,
      snowfallCm: 0,
      windKmh: 8,
      gustKmh: 14,
      windDeg: 235,
      cloud: 0.35,
      cloudLow: 0.05,
      cloudMid: 0.35,
      cloudHigh: 0.25,
      visibilityM: 40000,
      hour: date.hour,
      day: date.day,
      month: date.month,
      year: date.year,
      sky: "clouds",
    });
  }
}
