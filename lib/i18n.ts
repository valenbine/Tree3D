import type { GraphicsQuality } from "@/components/SettingsMenu";
import type { Sky } from "@/lib/weather";

export type Language = "zh" | "en";

type Dictionary = {
  page: {
    flyAround: string;
    exitFlyMode: string;
    flyHint: string;
    languageLabel: string;
  };
  search: {
    placeholder: string;
    houseLabel: string;
    contributor: string;
    keyboardHint: string;
    empty: string;
  };
  settings: {
    open: string;
    close: string;
    loading: string;
    live: string;
    manual: string;
    graphics: string;
    autoWithQuality: (quality: string) => string;
    weatherSummary: (tempC: number, sky: string, humidity: number) => string;
    windSummary: (windKmh: number, windDir: string, gustKmh: number) => string;
    day: string;
    month: string;
    year: string;
    hour: string;
    season: string;
    conditions: string;
    stargazers: string;
    synced: (value: string) => string;
    syncing: string;
    refreshing: string;
    next: (value: string) => string;
  };
  loader: {
    ariaLabel: string;
    title: string;
    loadingStargazers: string;
    loadingWeather: string;
    loadingAssets: string;
    preparingModels: string;
    buildingScene: string;
    startingRenderer: string;
    openingScene: string;
    assetDetail: (loaded: number, total: number, itemName: string) => string;
    assetsDetail: (loaded: number, total: number) => string;
    fetchingVillage: string;
    fetchingWeather: string;
    preparingRenderer: string;
  };
  houseInterior: {
    close: string;
    viewGitHubProfile: string;
    followers: string;
    following: string;
    rateLimitedShort: string;
    rateLimitedFull: string;
    retry: string;
    noPublicData: string;
    overview: string;
    repositories: string;
    pinned: string;
    popularRepositories: string;
    nothingYet: string;
    noPublicRepositories: string;
  };
};

export const SKY_LABELS: Record<Language, Record<Sky, string>> = {
  zh: {
    clear: "晴朗",
    clouds: "多云",
    fog: "雾",
    rain: "雨",
    snow: "雪",
    storm: "风暴",
  },
  en: {
    clear: "Clear",
    clouds: "Clouds",
    fog: "Fog",
    rain: "Rain",
    snow: "Snow",
    storm: "Storm",
  },
};

export const SEASON_LABELS: Record<Language, Record<string, string>> = {
  zh: {
    spring: "春季",
    summer: "夏季",
    autumn: "秋季",
    winter: "冬季",
  },
  en: {
    spring: "Spring",
    summer: "Summer",
    autumn: "Autumn",
    winter: "Winter",
  },
};

export const GRAPHICS_LABELS: Record<Language, Record<GraphicsQuality, string>> = {
  zh: {
    auto: "自动",
    low: "低",
    medium: "中",
    high: "高",
  },
  en: {
    auto: "Auto",
    low: "Low",
    medium: "Medium",
    high: "High",
  },
};

export const TIER_LABELS: Record<Language, Record<string, string>> = {
  zh: {
    common: "普通",
    uncommon: "少见",
    rare: "稀有",
    epic: "史诗",
    legendary: "传说",
  },
  en: {
    common: "Common",
    uncommon: "Uncommon",
    rare: "Rare",
    epic: "Epic",
    legendary: "Legendary",
  },
};

export const UI_TEXT: Record<Language, Dictionary> = {
  zh: {
    page: {
      flyAround: "自由飞行",
      exitFlyMode: "退出飞行",
      flyHint: "点击场景锁定视角 · WASD / 方向键移动 · R / F 升降 · Esc 退出",
      languageLabel: "语言",
    },
    search: {
      placeholder: "搜索房屋",
      houseLabel: "房屋",
      contributor: "贡献者",
      keyboardHint: "Tab 切换 · Enter 选中",
      empty: "没有找到房屋",
    },
    settings: {
      open: "设置",
      close: "关闭",
      loading: "加载中",
      live: "实时",
      manual: "手动",
      graphics: "画质",
      autoWithQuality: (quality) => `自动 · ${quality}`,
      weatherSummary: (tempC, sky, humidity) => `${Math.round(tempC)}°C · ${sky} · 湿度 ${Math.round(humidity)}%`,
      windSummary: (windKmh, windDir, gustKmh) => `${Math.round(windKmh)} km/h ${windDir} · 阵风 ${Math.round(gustKmh)}`,
      day: "日",
      month: "月",
      year: "年",
      hour: "时",
      season: "季节",
      conditions: "天气",
      stargazers: "星标用户",
      synced: (value) => `同步于 ${value}`,
      syncing: "同步中...",
      refreshing: "刷新中",
      next: (value) => `下次 ${value}`,
    },
    loader: {
      ariaLabel: "正在加载 Star Tree",
      title: "Star Tree",
      loadingStargazers: "正在加载星标用户",
      loadingWeather: "正在加载天气",
      loadingAssets: "正在加载资源",
      preparingModels: "正在准备模型",
      buildingScene: "正在构建场景",
      startingRenderer: "正在启动渲染器",
      openingScene: "正在打开场景",
      assetDetail: (loaded, total, itemName) => `资源 ${loaded}/${total}: ${itemName}`,
      assetsDetail: (loaded, total) => `资源 ${loaded}/${total}`,
      fetchingVillage: "正在获取实时村落数据",
      fetchingWeather: "正在获取山地天气",
      preparingRenderer: "正在准备渲染器",
    },
    houseInterior: {
      close: "关闭",
      viewGitHubProfile: "查看 GitHub 主页",
      followers: "关注者",
      following: "正在关注",
      rateLimitedShort: "GitHub 触发了频率限制，暂时无法加载实时资料。完整资料仍可在 GitHub 查看。",
      rateLimitedFull: "GitHub 触发了频率限制，暂时无法实时加载这个资料卡。请稍后再试。",
      retry: "重试",
      noPublicData: "这个房屋暂时没有可用的公开 GitHub 数据。",
      overview: "概览",
      repositories: "仓库",
      pinned: "置顶",
      popularRepositories: "热门仓库",
      nothingYet: "这里暂时还没有内容。",
      noPublicRepositories: "没有公开仓库。",
    },
  },
  en: {
    page: {
      flyAround: "Fly around",
      exitFlyMode: "Exit fly mode",
      flyHint: "Click scene to lock look · WASD / arrows move · R / F up & down · Esc releases",
      languageLabel: "Language",
    },
    search: {
      placeholder: "Search a house",
      houseLabel: "House",
      contributor: "Contributor",
      keyboardHint: "Tab cycles · Enter selects",
      empty: "No houses found",
    },
    settings: {
      open: "Settings",
      close: "Close",
      loading: "Loading",
      live: "Live",
      manual: "Manual",
      graphics: "Graphics",
      autoWithQuality: (quality) => `Auto · ${quality}`,
      weatherSummary: (tempC, sky, humidity) => `${Math.round(tempC)}°C · ${sky} · ${Math.round(humidity)}% RH`,
      windSummary: (windKmh, windDir, gustKmh) => `${Math.round(windKmh)} km/h ${windDir} · ${Math.round(gustKmh)} gust`,
      day: "Day",
      month: "Month",
      year: "Year",
      hour: "Hour",
      season: "Season",
      conditions: "Conditions",
      stargazers: "Stargazers",
      synced: (value) => `synced ${value}`,
      syncing: "syncing...",
      refreshing: "refreshing",
      next: (value) => `next ${value}`,
    },
    loader: {
      ariaLabel: "Loading Star Tree",
      title: "Star Tree",
      loadingStargazers: "Loading stargazers",
      loadingWeather: "Loading weather",
      loadingAssets: "Loading assets",
      preparingModels: "Preparing models",
      buildingScene: "Building scene",
      startingRenderer: "Starting renderer",
      openingScene: "Opening scene",
      assetDetail: (loaded, total, itemName) => `Asset ${loaded} of ${total}: ${itemName}`,
      assetsDetail: (loaded, total) => `Assets ${loaded} of ${total}`,
      fetchingVillage: "Fetching the live village",
      fetchingWeather: "Fetching mountain weather",
      preparingRenderer: "Preparing the renderer",
    },
    houseInterior: {
      close: "Close",
      viewGitHubProfile: "View GitHub profile",
      followers: "followers",
      following: "following",
      rateLimitedShort: "GitHub's rate limit was hit, so the live profile couldn't load right now. The full profile is on GitHub.",
      rateLimitedFull: "GitHub's rate limit was reached, so this profile couldn't be loaded live. Try again in a moment.",
      retry: "Retry",
      noPublicData: "No public GitHub data for this house yet.",
      overview: "Overview",
      repositories: "Repositories",
      pinned: "Pinned",
      popularRepositories: "Popular repositories",
      nothingYet: "Nothing to show here yet.",
      noPublicRepositories: "No public repositories.",
    },
  },
};

export function labelTier(language: Language, tier?: string): string | undefined {
  if (!tier) return undefined;
  return TIER_LABELS[language][tier.toLowerCase()] ?? tier;
}
