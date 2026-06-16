const OPEN_METEO_FORECAST = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_GEOCODE = "https://geocoding-api.open-meteo.com/v1/search";
const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse";
const OVERPASS_API = "https://overpass-api.de/api/interpreter";
const FIELD_SEARCH_RADIUS = 1500;

const DEFAULT_LOCATION = {
  name: "琵琶湖",
  admin1: "滋賀県",
  country: "日本",
  latitude: 35.214,
  longitude: 136.076,
  timezone: "Asia/Tokyo",
};

const FIELD_PRESETS = [
  { name: "琵琶湖", admin1: "滋賀県", country: "日本", latitude: 35.214, longitude: 136.076, timezone: "Asia/Tokyo" },
  { name: "霞ヶ浦", admin1: "茨城県", country: "日本", latitude: 36.058, longitude: 140.427, timezone: "Asia/Tokyo" },
  { name: "北浦", admin1: "茨城県", country: "日本", latitude: 36.041, longitude: 140.567, timezone: "Asia/Tokyo" },
  { name: "河口湖", admin1: "山梨県", country: "日本", latitude: 35.518, longitude: 138.756, timezone: "Asia/Tokyo" },
  { name: "芦ノ湖", admin1: "神奈川県", country: "日本", latitude: 35.207, longitude: 139.001, timezone: "Asia/Tokyo" },
  { name: "相模湖", admin1: "神奈川県", country: "日本", latitude: 35.613, longitude: 139.188, timezone: "Asia/Tokyo" },
  { name: "津久井湖", admin1: "神奈川県", country: "日本", latitude: 35.592, longitude: 139.270, timezone: "Asia/Tokyo" },
  { name: "亀山湖", admin1: "千葉県", country: "日本", latitude: 35.225, longitude: 140.089, timezone: "Asia/Tokyo" },
  { name: "高滝湖", admin1: "千葉県", country: "日本", latitude: 35.349, longitude: 140.150, timezone: "Asia/Tokyo" },
  { name: "印旛沼", admin1: "千葉県", country: "日本", latitude: 35.770, longitude: 140.230, timezone: "Asia/Tokyo" },
  { name: "池原ダム", admin1: "奈良県", country: "日本", latitude: 34.144, longitude: 135.952, timezone: "Asia/Tokyo" },
  { name: "七色ダム", admin1: "奈良県", country: "日本", latitude: 34.084, longitude: 135.895, timezone: "Asia/Tokyo" },
  { name: "青野ダム", admin1: "兵庫県", country: "日本", latitude: 34.926, longitude: 135.202, timezone: "Asia/Tokyo" },
  { name: "遠賀川", admin1: "福岡県", country: "日本", latitude: 33.742, longitude: 130.708, timezone: "Asia/Tokyo" },
];

const state = {
  location: DEFAULT_LOCATION,
  weather: null,
  forecastHours: [],
  map: null,
  mapMarker: null,
  fieldLayer: null,
  selectedMapPoint: {
    latitude: DEFAULT_LOCATION.latitude,
    longitude: DEFAULT_LOCATION.longitude,
  },
  nearbyFields: [],
  reversePlace: null,
  fieldRequestId: 0,
};

const els = {
  form: document.querySelector("#conditionForm"),
  dataStatus: document.querySelector("#dataStatus"),
  locationInput: document.querySelector("#locationInput"),
  searchButton: document.querySelector("#searchButton"),
  refreshButton: document.querySelector("#refreshButton"),
  geoButton: document.querySelector("#geoButton"),
  selectedLocation: document.querySelector("#selectedLocation"),
  locationResults: document.querySelector("#locationResults"),
  fieldMap: document.querySelector("#fieldMap"),
  mapStatus: document.querySelector("#mapStatus"),
  mapCoords: document.querySelector("#mapCoords"),
  useMapPointButton: document.querySelector("#useMapPointButton"),
  fieldInfo: document.querySelector("#fieldInfo"),
  nearbyFields: document.querySelector("#nearbyFields"),
  waterType: document.querySelector("#waterType"),
  waterLevel: document.querySelector("#waterLevel"),
  seasonMode: document.querySelector("#seasonMode"),
  waterTemp: document.querySelector("#waterTemp"),
  clarity: document.querySelector("#clarity"),
  pressure: document.querySelector("#pressure"),
  timeFocus: document.querySelector("#timeFocus"),
  patternTitle: document.querySelector("#patternTitle"),
  patternSummary: document.querySelector("#patternSummary"),
  activityScore: document.querySelector("#activityScore"),
  metricsGrid: document.querySelector("#metricsGrid"),
  depthRange: document.querySelector("#depthRange"),
  lakeVisual: document.querySelector("#lakeVisual"),
  bassMarker: document.querySelector("#bassMarker"),
  locationHypotheses: document.querySelector("#locationHypotheses"),
  lureGrid: document.querySelector("#lureGrid"),
  retrieveSpeed: document.querySelector("#retrieveSpeed"),
  forecastStrip: document.querySelector("#forecastStrip"),
};

const weatherCodeLabels = {
  0: "快晴",
  1: "晴れ",
  2: "一部曇り",
  3: "曇り",
  45: "霧",
  48: "霧氷",
  51: "霧雨",
  53: "霧雨",
  55: "強い霧雨",
  61: "小雨",
  63: "雨",
  65: "強い雨",
  66: "冷たい雨",
  67: "強い冷たい雨",
  71: "小雪",
  73: "雪",
  75: "強い雪",
  80: "にわか雨",
  81: "にわか雨",
  82: "強いにわか雨",
  95: "雷雨",
  96: "雷雨",
  99: "強い雷雨",
};

function formatLocation(location) {
  const parts = [location.name, location.admin1, location.country].filter(Boolean);
  return parts.join(" / ");
}

function setStatus(text, mode = "") {
  els.dataStatus.textContent = text;
  els.dataStatus.className = `data-badge ${mode}`.trim();
}

function debounce(fn, delay = 250) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function getFormValues() {
  return {
    waterType: els.waterType.value,
    waterLevel: els.waterLevel.value,
    seasonMode: els.seasonMode.value,
    waterTemp: Number.parseFloat(els.waterTemp.value),
    clarity: Number(els.clarity.value),
    pressure: Number(els.pressure.value),
    timeFocus: els.timeFocus.value,
  };
}

async function searchLocations() {
  const query = els.locationInput.value.trim();
  if (!query || query.length < 2) {
    els.locationResults.innerHTML = `<p class="muted">2文字以上で検索してください。</p>`;
    return;
  }

  setStatus("地点検索中...");
  els.searchButton.disabled = true;

  try {
    const [weatherLocations, osmLocations] = await Promise.allSettled([
      fetchOpenMeteoLocations(query),
      fetchOsmSearchLocations(query),
    ]);
    const externalResults = [weatherLocations, osmLocations]
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value);
    const results = mergeLocationResults(findFieldPresets(query), externalResults);

    if (!results.length) {
      els.locationResults.innerHTML = `<p class="muted">候補が見つかりませんでした。</p>`;
      setStatus("地点候補なし", "is-error");
      return;
    }

    els.locationResults.innerHTML = results.map(renderLocationOption).join("");
    els.locationResults.querySelectorAll("button").forEach((button, index) => {
      button.addEventListener("click", () => {
        selectLocation(results[index]);
      });
    });
    setStatus("地点候補を取得", "is-live");
  } catch (error) {
    console.error(error);
    setStatus("地点検索エラー", "is-error");
    els.locationResults.innerHTML = `<p class="muted">地点データを取得できませんでした。通信状況を確認してください。</p>`;
  } finally {
    els.searchButton.disabled = false;
  }
}

async function fetchOpenMeteoLocations(query) {
  const url = new URL(OPEN_METEO_GEOCODE);
  url.searchParams.set("name", query);
  url.searchParams.set("count", "6");
  url.searchParams.set("language", "ja");
  url.searchParams.set("format", "json");

  const response = await fetch(url);
  if (!response.ok) throw new Error("地点検索に失敗しました");
  const data = await response.json();
  return data.results || [];
}

async function fetchOsmSearchLocations(query) {
  const url = new URL(NOMINATIM_SEARCH);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("extratags", "1");
  url.searchParams.set("accept-language", "ja");
  url.searchParams.set("countrycodes", "jp");
  url.searchParams.set("layer", "address,natural");
  url.searchParams.set("limit", "6");

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("OSM地点検索に失敗しました");
  const data = await response.json();
  return data
    .filter(isUsefulOsmSearchResult)
    .map((result) => {
      const latitude = Number(result.lat);
      const longitude = Number(result.lon);
      const tags = {
        ...(result.extratags || {}),
        category: result.category,
        type: result.type,
      };
      return {
        name: result.name || shortDisplayName(result.display_name) || "OSM地点",
        admin1: result.address?.state || result.address?.province || result.address?.county || "",
        country: result.address?.country || "日本",
        latitude,
        longitude,
        timezone: "Asia/Tokyo",
        fieldType: classifyFieldType(tags),
        osmTags: tags,
        source: "osm",
      };
    })
    .filter((location) => Number.isFinite(location.latitude) && Number.isFinite(location.longitude));
}

function isUsefulOsmSearchResult(result) {
  const text = `${result.display_name || ""} ${result.name || ""}`;
  const type = `${result.category || ""}:${result.type || ""}`;
  if (/湖|池|沼|川|河|水路|用水|ダム|pond|lake|river|stream|canal|reservoir/i.test(text)) return true;
  return /natural:(water|river|stream|canal|bay)|waterway:/.test(type);
}

function findFieldPresets(query) {
  const normalized = normalizeText(query);
  return FIELD_PRESETS.filter((field) => normalizeText(field.name).includes(normalized));
}

function mergeLocationResults(...groups) {
  const merged = [];
  const seen = new Set();
  groups.flat().forEach((location) => {
    const key = `${location.name}-${Number(location.latitude).toFixed(3)}-${Number(location.longitude).toFixed(3)}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(location);
  });
  return merged.slice(0, 6);
}

function normalizeText(value) {
  return String(value).toLowerCase().replace(/\s+/g, "");
}

function renderLocationOption(location) {
  const label = formatLocation(location);
  const type = location.fieldType ? ` / ${fieldTypeLabel(location.fieldType)}` : "";
  const detail = `${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)} / ${location.timezone || "timezone auto"}${type}`;
  return `
    <button type="button" class="location-option">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(detail)}</span>
    </button>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function selectLocation(location, options = {}) {
  if (location.fieldType) {
    els.waterType.value = location.fieldType;
  }

  state.location = {
    name: location.name || "現在地",
    admin1: location.admin1 || location.admin2 || "",
    country: location.country || "",
    latitude: location.latitude,
    longitude: location.longitude,
    timezone: location.timezone || "auto",
    source: location.source || "",
    fieldType: location.fieldType || "",
  };
  els.selectedLocation.textContent = formatLocation(state.location);
  if (options.updateInput !== false) {
    els.locationInput.value = state.location.name;
  }
  els.locationResults.innerHTML = "";
  if (options.syncMap !== false) {
    updateMapPoint(state.location.latitude, state.location.longitude, { moveMap: true });
    void loadMapContext(state.location.latitude, state.location.longitude);
  }
  await fetchWeather();
}

async function fetchWeather() {
  setStatus("天気データ取得中...");
  els.refreshButton.disabled = true;

  try {
    const url = new URL(OPEN_METEO_FORECAST);
    url.searchParams.set("latitude", state.location.latitude);
    url.searchParams.set("longitude", state.location.longitude);
    url.searchParams.set("timezone", state.location.timezone || "auto");
    url.searchParams.set("past_days", "2");
    url.searchParams.set("forecast_days", "3");
    url.searchParams.set(
      "current",
      [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "is_day",
        "precipitation",
        "rain",
        "showers",
        "weather_code",
        "cloud_cover",
        "pressure_msl",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
      ].join(","),
    );
    url.searchParams.set(
      "hourly",
      [
        "temperature_2m",
        "precipitation_probability",
        "precipitation",
        "rain",
        "weather_code",
        "pressure_msl",
        "cloud_cover",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
        "shortwave_radiation",
        "uv_index",
        "is_day",
      ].join(","),
    );
    url.searchParams.set(
      "daily",
      [
        "sunrise",
        "sunset",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "precipitation_probability_max",
        "uv_index_max",
        "wind_speed_10m_max",
        "shortwave_radiation_sum",
      ].join(","),
    );

    const response = await fetch(url);
    if (!response.ok) throw new Error("天気データの取得に失敗しました");
    const data = await response.json();
    state.weather = data;
    state.forecastHours = buildForecastHours(data);
    setStatus(`Live: ${formatLocation(state.location)}`, "is-live");
    analyzeAndRender();
  } catch (error) {
    console.error(error);
    setStatus("天気取得エラー", "is-error");
    renderErrorState();
  } finally {
    els.refreshButton.disabled = false;
  }
}

function buildForecastHours(data) {
  const hourly = data.hourly || {};
  return (hourly.time || []).map((time, index) => ({
    time,
    date: new Date(time),
    temperature: hourly.temperature_2m?.[index],
    precipitationProbability: hourly.precipitation_probability?.[index],
    precipitation: hourly.precipitation?.[index],
    rain: hourly.rain?.[index],
    weatherCode: hourly.weather_code?.[index],
    pressure: hourly.pressure_msl?.[index],
    cloudCover: hourly.cloud_cover?.[index],
    windSpeed: hourly.wind_speed_10m?.[index],
    windDirection: hourly.wind_direction_10m?.[index],
    windGusts: hourly.wind_gusts_10m?.[index],
    radiation: hourly.shortwave_radiation?.[index],
    uvIndex: hourly.uv_index?.[index],
    isDay: hourly.is_day?.[index],
  }));
}

function renderErrorState() {
  els.patternTitle.textContent = "データ取得に失敗しました";
  els.patternSummary.textContent =
    "ブラウザが外部APIへ接続できない場合、通信環境やCORS設定を確認してください。入力条件だけでは予測の精度が大きく落ちます。";
  els.activityScore.textContent = "--";
}

function analyzeAndRender() {
  if (!state.weather) return;

  const form = getFormValues();
  const context = buildWeatherContext(state.weather, form);
  const analysis = buildBassAnalysis(context, form);

  renderHero(analysis, context);
  renderMetrics(analysis, context);
  renderLake(analysis);
  renderLocations(analysis);
  renderLures(analysis);
  renderForecastStrip(context);
}

function buildWeatherContext(data, form) {
  const current = data.current || {};
  const now = new Date(current.time || Date.now());
  const hours = state.forecastHours;
  const nearestIndex = findNearestHourIndex(hours, now);
  const previousSix = hours.slice(Math.max(0, nearestIndex - 6), nearestIndex + 1);
  const nextSix = hours.slice(nearestIndex, Math.min(hours.length, nearestIndex + 7));
  const previousDay = hours.slice(Math.max(0, nearestIndex - 24), nearestIndex + 1);

  const currentHour = hours[nearestIndex] || {};
  const pressureNow = current.pressure_msl ?? currentHour.pressure;
  const pressurePast = previousSix[0]?.pressure ?? pressureNow;
  const pressureTrend = Number.isFinite(pressureNow) && Number.isFinite(pressurePast)
    ? pressureNow - pressurePast
    : 0;
  const tempMean24 = average(previousDay.map((hour) => hour.temperature));
  const nextRain = average(nextSix.map((hour) => hour.precipitationProbability)) || 0;
  const cloudCover = current.cloud_cover ?? currentHour.cloudCover ?? 0;
  const windSpeed = current.wind_speed_10m ?? currentHour.windSpeed ?? 0;
  const windGusts = current.wind_gusts_10m ?? currentHour.windGusts ?? windSpeed;
  const rain = current.precipitation ?? current.rain ?? current.showers ?? currentHour.precipitation ?? 0;
  const airTemp = current.temperature_2m ?? currentHour.temperature ?? tempMean24 ?? 20;
  const estimatedWaterTemp = Number.isFinite(form.waterTemp)
    ? form.waterTemp
    : estimateWaterTemperature(airTemp, tempMean24, cloudCover, data.daily);

  return {
    now,
    hours,
    current,
    currentHour,
    airTemp,
    apparentTemp: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    weatherCode: current.weather_code ?? currentHour.weatherCode,
    weatherLabel: weatherCodeLabels[current.weather_code ?? currentHour.weatherCode] || "天気不明",
    cloudCover,
    windSpeed,
    windGusts,
    windDirection: current.wind_direction_10m ?? currentHour.windDirection,
    pressureNow,
    pressureTrend,
    rain,
    nextRain,
    estimatedWaterTemp,
    isWaterTempManual: Number.isFinite(form.waterTemp),
    daily: data.daily || {},
    timezone: data.timezone || state.location.timezone || "auto",
  };
}

function findNearestHourIndex(hours, targetDate) {
  if (!hours.length) return -1;
  let bestIndex = 0;
  let bestDiff = Infinity;
  hours.forEach((hour, index) => {
    const diff = Math.abs(hour.date.getTime() - targetDate.getTime());
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function estimateWaterTemperature(airTemp, tempMean24, cloudCover, daily) {
  const maxToday = daily?.temperature_2m_max?.[Math.min(2, (daily?.time || []).length - 1)];
  const minToday = daily?.temperature_2m_min?.[Math.min(2, (daily?.time || []).length - 1)];
  const dailyMean = Number.isFinite(maxToday) && Number.isFinite(minToday) ? (maxToday + minToday) / 2 : null;
  const base = average([tempMean24, dailyMean, airTemp]) ?? airTemp;
  const solarAdjustment = cloudCover < 35 ? 0.8 : cloudCover > 75 ? -0.4 : 0.2;
  return clamp(base + solarAdjustment - 0.7, 2, 35);
}

function buildBassAnalysis(context, form) {
  const season = resolveSeason(context.estimatedWaterTemp, form.seasonMode, context.now);
  const light = resolveLightWindow(context, form.timeFocus);
  const activity = scoreActivity(context, form, season, light);
  const position = resolvePosition(context, form, season, light, activity.score);
  const lures = resolveLures(context, form, season, light, activity.score, position);
  const speed = resolveRetrieveSpeed(activity.score, context.estimatedWaterTemp, context.windSpeed);

  return {
    season,
    light,
    activity,
    position,
    lures,
    speed,
    title: buildPatternTitle(activity.score, season, position),
    summary: buildPatternSummary(context, form, season, light, activity, position),
  };
}

function resolveSeason(waterTemp, mode, date) {
  if (mode !== "auto") {
    const labels = {
      spring: "春パターン",
      summer: "夏パターン",
      fall: "秋パターン",
      winter: "冬パターン",
    };
    return {
      key: mode,
      phase: labels[mode],
      reason: "手動指定",
    };
  }

  const month = date.getMonth() + 1;
  if (waterTemp <= 8) return { key: "winter", phase: "冬の低水温", reason: "水温が低い" };
  if (waterTemp <= 13) return { key: "spring", phase: "プリスポーン", reason: "水温上昇期" };
  if (waterTemp <= 18 && month <= 6) return { key: "spring", phase: "スポーニング絡み", reason: "産卵期の水温帯" };
  if (waterTemp <= 23 && month <= 7) return { key: "spring", phase: "ポストスポーン", reason: "産卵後の回復期" };
  if (waterTemp >= 27) return { key: "summer", phase: "夏の高水温", reason: "水温が高い" };
  if (month >= 9 && month <= 11) return { key: "fall", phase: "秋のベイト追い", reason: "季節が秋" };
  if (month === 12 || month <= 2) return { key: "winter", phase: "冬パターン", reason: "季節が冬" };
  if (month >= 6 && month <= 8) return { key: "summer", phase: "夏パターン", reason: "季節が夏" };
  return { key: "fall", phase: "安定水温期", reason: "水温が適温" };
}

function resolveLightWindow(context, timeFocus) {
  if (timeFocus !== "now") {
    const labels = {
      morning: "朝まずめ",
      day: "日中",
      evening: "夕まずめ",
      night: "夜",
    };
    return {
      key: timeFocus,
      label: labels[timeFocus],
      lowLight: timeFocus === "morning" || timeFocus === "evening" || timeFocus === "night",
    };
  }

  const hour = context.now.getHours();
  if (hour >= 4 && hour <= 7) return { key: "morning", label: "朝まずめ", lowLight: true };
  if (hour >= 17 && hour <= 20) return { key: "evening", label: "夕まずめ", lowLight: true };
  if (hour >= 21 || hour <= 3) return { key: "night", label: "夜", lowLight: true };
  return { key: "day", label: "日中", lowLight: false };
}

function scoreActivity(context, form, season, light) {
  let score = 48;
  const reasons = [];

  const temp = context.estimatedWaterTemp;
  if (temp >= 18 && temp <= 26) {
    score += 17;
    reasons.push("水温がバスの行動範囲に入りやすい");
  } else if ((temp >= 12 && temp < 18) || (temp > 26 && temp <= 29)) {
    score += 6;
    reasons.push("水温は中程度で、タイミング次第");
  } else if (temp < 8 || temp > 31) {
    score -= 18;
    reasons.push("水温が極端で動きが鈍りやすい");
  } else {
    score -= 7;
  }

  if (context.pressureTrend <= -1.4) {
    score += 10;
    reasons.push("気圧低下でフィーディングに寄りやすい");
  } else if (context.pressureTrend >= 1.4) {
    score -= 9;
    reasons.push("気圧上昇でタフになりやすい");
  }

  if (context.cloudCover >= 55 && context.cloudCover <= 92) {
    score += 8;
    reasons.push("ローライトで浅いレンジに差しやすい");
  } else if (context.cloudCover < 20 && light.key === "day") {
    score -= 7;
    reasons.push("日中の強い光でカバーや深場に入りやすい");
  }

  if (context.windSpeed >= 5 && context.windSpeed <= 20) {
    score += 8;
    reasons.push("風でベイトが寄り、横の釣りが効きやすい");
  } else if (context.windSpeed < 3 && light.key === "day") {
    score -= 5;
  } else if (context.windSpeed > 30 || context.windGusts > 42) {
    score -= 10;
    reasons.push("風が強すぎて定位しにくい");
  }

  if (context.rain > 0 && context.rain <= 2.5) {
    score += 7;
    reasons.push("小雨で警戒心が下がりやすい");
  } else if (context.rain > 8) {
    score -= 10;
    reasons.push("雨量が多く水質変化が大きい");
  }

  if (light.lowLight) {
    score += 8;
    reasons.push(`${light.label}で捕食レンジが上がりやすい`);
  }

  if (form.pressure >= 70) {
    score -= 10;
    reasons.push("人的プレッシャーが高く、食わせの精度が必要");
  } else if (form.pressure <= 30) {
    score += 4;
  }

  if (form.waterLevel === "rising") {
    score += 5;
    reasons.push("増水で岸際のカバーが使われやすい");
  } else if (form.waterLevel === "falling") {
    score -= 4;
    reasons.push("減水で一段深い側へ落ちやすい");
  }

  if (season.phase.includes("スポーニング")) {
    score -= 4;
    reasons.push("産卵絡みは食性より威嚇反応が中心");
  }

  return {
    score: Math.round(clamp(score, 8, 96)),
    reasons: reasons.slice(0, 5),
  };
}

function resolvePosition(context, form, season, light, score) {
  let depth = "ミドル";
  let depthRange = "1.5-4 m";
  let marker = { x: 48, y: 54, label: "Mid" };
  const places = [];
  const temp = context.estimatedWaterTemp;
  const isClear = form.clarity >= 68;
  const isMuddy = form.clarity <= 34;
  const windy = context.windSpeed >= 6;
  const lowLight = light.lowLight || context.cloudCover >= 60;

  if (season.key === "winter" || temp < 10) {
    depth = "ディープ寄り";
    depthRange = "4-9 m";
    marker = { x: 70, y: 76, label: "Deep" };
    places.push(
      place("越冬場の近く", "ディープ隣接のブレイク、沈み物、ハードボトムをゆっくり探る。"),
      place("日当たりのよい急深", "午後に水温が少し上がる面だけ浅く差す可能性。"),
      place("ベイトの縦移動ライン", "魚探がない場合は岬や橋脚など水深変化が明確な場所。"),
    );
  } else if (season.phase.includes("プリ")) {
    depth = "シャロー手前";
    depthRange = "1.5-4 m";
    marker = { x: 48, y: 50, label: "Pre" };
    places.push(
      place("産卵場手前のブレイク", "ワンド入口、岬、ハードボトムの切れ目で待ち伏せしやすい。"),
      place("風の当たる岸", "濁りが入りすぎない面でベイトが寄るラインを流す。"),
      place("縦ストラクチャー", "杭、立木、護岸の角など一時停止できる場所。"),
    );
  } else if (season.phase.includes("スポーニング")) {
    depth = "シャロー";
    depthRange = "0.5-2 m";
    marker = { x: 30, y: 37, label: "Bed" };
    places.push(
      place("ハードボトムの浅場", "砂利、岩、護岸のフラット。食性より威嚇反応を意識。"),
      place("風裏のポケット", "濁りと波を避けられる小場所で目視できる魚を探す。"),
      place("一段落ちる逃げ場", "強い光や人の気配で下がる隣接ブレイク。"),
    );
  } else if (season.key === "summer" && temp >= 27 && light.key === "day") {
    depth = "シェードかディープ";
    depthRange = "2-7 m";
    marker = { x: 64, y: 64, label: "Shade" };
    places.push(
      place("濃いシェード", "桟橋、浮き物、オーバーハングの奥をタイトに撃つ。"),
      place("水通しの良い岬", "風、流れ、ベイトが絡む沖の張り出しを探る。"),
      place("ウィード外側", "酸素とベイトが残るアウトサイドエッジ。"),
    );
  } else if (score >= 68 && (lowLight || windy)) {
    depth = "シャローからミドル";
    depthRange = "0.8-3 m";
    marker = { x: 38, y: 43, label: "Feed" };
    places.push(
      place("風下・風表の岸", "ベイトが寄る濁りの境目をテンポよく巻く。"),
      place("シャローカバー外側", "バスが差してくる通り道を広く探る。"),
      place("流入・アウトレット", "雨後や増水時は水の動きがある場所を優先。"),
    );
  } else if (isClear || form.pressure >= 70) {
    depth = "一段深いミドル";
    depthRange = "2-5 m";
    marker = { x: 58, y: 58, label: "Cautious" };
    places.push(
      place("ブレイク下", "見えすぎる水では岸から少し離したレンジが安定。"),
      place("カバーの影側", "ライトリグを入れて長めに見せる。"),
      place("沖のベイト周辺", "小魚の群れが見えるなら下か横に付く魚を狙う。"),
    );
  } else if (isMuddy) {
    depth = "岸際タイト";
    depthRange = "0.5-2.5 m";
    marker = { x: 32, y: 45, label: "Tight" };
    places.push(
      place("濁りの当たるカバー", "音と波動を出し、目の前を通す距離を短くする。"),
      place("流れのヨレ", "強い流れの外側で待ち伏せできる反転流。"),
      place("硬いものの際", "石、護岸、杭などバスが位置を合わせやすい物。"),
    );
  } else {
    places.push(
      place("ブレイクとカバーの接点", "浅い餌場と深い待機場所が近いライン。"),
      place("ベイトが見える岸", "小魚の向きと風を見て、同じレンジを通す。"),
      place("ハードボトム", "砂利、岩、沈み物の変化で止めを入れる。"),
    );
  }

  if (form.waterType === "river") {
    places[0] = place("反転流と流れの境目", "本流の圧を避けられるヨレ、橋脚裏、インサイドベンド。");
  } else if (form.waterType === "reservoir" && depth !== "シャロー") {
    places[0] = place("岬とチャンネル絡み", "水位変化に合わせて縦に動ける張り出しを優先。");
  } else if (form.waterType === "pond") {
    places[0] = place("最も濃いカバー", "小場所では日陰、流入、沈み物のどれかが強い一点を狙う。");
  }

  return { depth, depthRange, marker, places };
}

function place(title, description) {
  return { title, description };
}

function resolveLures(context, form, season, light, score, position) {
  const lures = [];
  const temp = context.estimatedWaterTemp;
  const isClear = form.clarity >= 68;
  const isMuddy = form.clarity <= 34;
  const windy = context.windSpeed >= 6;
  const lowLight = light.lowLight || context.cloudCover >= 60;
  const highPressure = form.pressure >= 70 || context.pressureTrend >= 1.2;
  const color = isMuddy
    ? "ブラックブルー / チャート"
    : isClear
      ? "ワカサギ / グリパン"
      : "ナチュラルシャッド / ホワイト";

  if (temp >= 18 && lowLight) {
    lures.push(lure("トップウォーター", "水面まで上がる魚を広く探る。出切らない時はポーズを長めに。", color, ["朝夕", "ローライト"]));
  }

  if ((windy || isMuddy || context.cloudCover >= 55) && score >= 48) {
    lures.push(lure("スピナーベイト", "風と濁りで存在感を出し、カバー外側を速めに通す。", color, ["風", "濁り", "サーチ"]));
    lures.push(lure("チャターベイト", "濁りの境目やウィード上を一定速度で引く。", color, ["波動", "横の釣り"]));
  }

  if (season.phase.includes("プリ") || (temp >= 9 && temp <= 16 && isClear)) {
    lures.push(lure("ジャークベイト", "ブレイク上で止めを入れ、追うけれど食い切らない魚に合わせる。", color, ["低水温", "クリア"]));
  }

  if (score >= 62 && temp >= 15) {
    const crankDepth = position.depthRange.includes("5") || position.depthRange.includes("7") ? "ミドルクランク" : "シャロークランク";
    lures.push(lure(crankDepth, "岩、護岸、ウィードに当ててリアクションを作る。", color, ["テンポ", "リアクション"]));
  }

  if (highPressure || score < 52 || isClear) {
    lures.push(lure("ネコリグ / ワッキー", "カバーの影やブレイク下で移動距離を抑えて食わせる。", "グリパン / スモーク", ["食わせ", "高プレッシャー"]));
    lures.push(lure("ダウンショット", "ベイト下やディープ寄りの魚を細かく誘う。", "クリア系 / シナモン", ["ミドル", "スロー"]));
  }

  if (position.depth.includes("シェード") || form.waterType === "pond" || form.waterLevel === "rising") {
    lures.push(lure("ラバージグ / テキサス", "濃いカバーへタイトに入れ、フォールと着底後の間を作る。", isMuddy ? "ブラックブルー" : "グリパン", ["カバー", "ボトム"]));
  }

  if (season.key === "fall" || score >= 70) {
    lures.push(lure("スイムジグ", "ベイトを追う魚に、ウィードやカバーを抜ける横の釣りで合わせる。", color, ["ベイト", "秋"]));
  }

  if (!lures.length) {
    lures.push(lure("ジグヘッドワッキー", "まずは岸際とブレイクを丁寧に探る基準ルアー。", "グリパン", ["基準", "食わせ"]));
  }

  return uniqueLures(lures).slice(0, 4);
}

function lure(name, description, color, tags) {
  return { name, description, color, tags };
}

function uniqueLures(lures) {
  const seen = new Set();
  return lures.filter((item) => {
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  });
}

function resolveRetrieveSpeed(score, waterTemp, windSpeed) {
  if (waterTemp < 10 || score < 42) return "かなりスロー";
  if (score < 58) return "スローから普通";
  if (windSpeed >= 8 || score >= 72) return "普通から速め";
  return "普通";
}

function buildPatternTitle(score, season, position) {
  if (score >= 75) return `${season.phase}: ${position.depth}で強めに追う`;
  if (score >= 58) return `${season.phase}: ${position.depth}でタイミング待ち`;
  if (score >= 42) return `${season.phase}: ${position.depth}を丁寧に`;
  return `${season.phase}: 食わせ優先のタフコンディション`;
}

function buildPatternSummary(context, form, season, light, activity, position) {
  const pressureText = context.pressureTrend < -1
    ? "気圧は下がり気味"
    : context.pressureTrend > 1
      ? "気圧は上がり気味"
      : "気圧は安定";
  const clarityText = form.clarity >= 68 ? "水はクリア寄り" : form.clarity <= 34 ? "水は濁り気味" : "水色は中間";
  const tempText = `${context.estimatedWaterTemp.toFixed(1)}℃${context.isWaterTempManual ? "" : "推定"}`;
  return `${light.label}、${context.weatherLabel}、${pressureText}。水温は${tempText}で${season.reason}、${clarityText}です。バスは${position.depthRange}の${position.depth}に寄りやすく、${activity.reasons[0] || "現地の変化を見て調整"}のが主な根拠です。`;
}

function renderHero(analysis) {
  els.patternTitle.textContent = analysis.title;
  els.patternSummary.textContent = analysis.summary;
  els.activityScore.textContent = analysis.activity.score;
  const ring = document.querySelector(".score-ring");
  const hue = analysis.activity.score >= 68 ? "#a7e5d9" : analysis.activity.score >= 48 ? "#f2c37c" : "#ef9b8f";
  ring.style.borderTopColor = hue;
}

function renderMetrics(analysis, context) {
  const pressure = `${context.pressureNow?.toFixed?.(0) || "--"} hPa / ${context.pressureTrend >= 0 ? "+" : ""}${context.pressureTrend.toFixed(1)}`;
  const wind = `${Math.round(context.windSpeed)} km/h`;
  const waterTemp = `${context.estimatedWaterTemp.toFixed(1)}℃${context.isWaterTempManual ? "" : " 推定"}`;
  const metrics = [
    ["天気", `${context.weatherLabel} / 雲${Math.round(context.cloudCover)}%`],
    ["気圧傾向", pressure],
    ["水温", waterTemp],
    ["風", wind],
  ];
  els.metricsGrid.innerHTML = metrics
    .map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`)
    .join("");
}

function renderLake(analysis) {
  els.depthRange.textContent = analysis.position.depthRange;
  els.retrieveSpeed.textContent = `巻き速度: ${analysis.speed}`;
  els.lakeVisual.style.setProperty("--marker-x", `${analysis.position.marker.x}%`);
  els.lakeVisual.style.setProperty("--marker-y", `${analysis.position.marker.y}%`);
  els.bassMarker.querySelector("span").textContent = analysis.position.marker.label;
}

function renderLocations(analysis) {
  els.locationHypotheses.innerHTML = analysis.position.places
    .map(
      (item, index) => `
        <article class="location-item">
          <span>Priority ${index + 1}</span>
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.description)}</p>
        </article>
      `,
    )
    .join("");
}

function renderLures(analysis) {
  els.lureGrid.innerHTML = analysis.lures
    .map(
      (item) => `
        <article class="lure-card">
          <span>${escapeHtml(item.color)}</span>
          <strong>${escapeHtml(item.name)}</strong>
          <p>${escapeHtml(item.description)}</p>
          <div class="tag-row">${item.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
        </article>
      `,
    )
    .join("");
}

function renderForecastStrip(context) {
  const futureHours = context.hours
    .filter((hour) => hour.date >= context.now)
    .filter((_, index) => index % 3 === 0)
    .slice(0, 6);

  els.forecastStrip.innerHTML = futureHours
    .map((hour) => {
      const time = new Intl.DateTimeFormat("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(hour.date);
      const rain = Number.isFinite(hour.precipitationProbability) ? `${Math.round(hour.precipitationProbability)}%` : "--";
      const temp = Number.isFinite(hour.temperature) ? `${hour.temperature.toFixed(1)}℃` : "--";
      const wind = Number.isFinite(hour.windSpeed) ? `${Math.round(hour.windSpeed)}km/h` : "--";
      return `
        <article class="forecast-item">
          <span>${time}</span>
          <strong>${escapeHtml(weatherCodeLabels[hour.weatherCode] || "予報")}</strong>
          <p>${temp} / 雨${rain} / 風${wind}</p>
        </article>
      `;
    })
    .join("");
}

function initMap() {
  if (!els.fieldMap) return;

  updateMapPoint(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude);

  if (!window.L) {
    setMapStatus("地図未読込", "is-error");
    renderFieldInfo(null, [], null);
    return;
  }

  state.map = L.map(els.fieldMap, {
    zoomControl: true,
    scrollWheelZoom: true,
  }).setView([DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude], 13);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(state.map);

  state.fieldLayer = L.layerGroup().addTo(state.map);
  state.mapMarker = L.marker([DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude], {
    draggable: true,
    autoPan: true,
  }).addTo(state.map);

  state.mapMarker.on("dragend", () => {
    const point = state.mapMarker.getLatLng();
    void handleMapSelection(point.lat, point.lng);
  });
  state.map.on("click", (event) => {
    void handleMapSelection(event.latlng.lat, event.latlng.lng);
  });

  setMapStatus("OSM", "is-live");
  setTimeout(() => state.map?.invalidateSize(), 0);
  void loadMapContext(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude);
}

function setMapStatus(text, mode = "") {
  if (!els.mapStatus) return;
  els.mapStatus.textContent = text;
  els.mapStatus.className = `pill compact-pill ${mode}`.trim();
}

function updateMapPoint(latitude, longitude, options = {}) {
  state.selectedMapPoint = { latitude, longitude };
  if (els.mapCoords) {
    els.mapCoords.textContent = formatCoords(latitude, longitude);
  }
  if (state.mapMarker) {
    state.mapMarker.setLatLng([latitude, longitude]);
  }
  if (state.map && options.moveMap) {
    state.map.setView([latitude, longitude], Math.max(state.map.getZoom(), 14));
  }
}

async function handleMapSelection(latitude, longitude) {
  updateMapPoint(latitude, longitude);
  void loadMapContext(latitude, longitude);
  await selectLocation(
    {
      name: "地図選択地点",
      admin1: "",
      country: "",
      latitude,
      longitude,
      timezone: "auto",
      source: "map-point",
    },
    { syncMap: false },
  );
}

async function selectCurrentMapPoint() {
  const { latitude, longitude } = state.selectedMapPoint;
  await handleMapSelection(latitude, longitude);
}

async function loadMapContext(latitude, longitude) {
  if (!els.fieldInfo || !els.nearbyFields) return;

  const requestId = ++state.fieldRequestId;
  setMapStatus("周辺取得中...");

  const [fieldsResult, reverseResult] = await Promise.allSettled([
    fetchNearbyFields(latitude, longitude),
    fetchReversePlace(latitude, longitude),
  ]);

  if (requestId !== state.fieldRequestId) return;

  state.nearbyFields = fieldsResult.status === "fulfilled" ? fieldsResult.value : [];
  state.reversePlace = reverseResult.status === "fulfilled" ? reverseResult.value : null;

  renderFieldInfo(state.reversePlace, state.nearbyFields, null);
  renderNearbyFields(state.nearbyFields);
  renderMapFeatures(state.nearbyFields);
  maybeUpdateMapPointName(latitude, longitude, state.reversePlace);

  if (state.nearbyFields.length) {
    setMapStatus(`${state.nearbyFields.length}件`, "is-live");
  } else {
    setMapStatus("候補なし", fieldsResult.status === "rejected" ? "is-error" : "");
  }
}

async function fetchNearbyFields(latitude, longitude) {
  const query = buildOverpassQuery(latitude, longitude);
  const url = `${OVERPASS_API}?data=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("周辺水域の取得に失敗しました");
  const data = await response.json();
  return normalizeOverpassElements(data.elements || [], latitude, longitude);
}

function buildOverpassQuery(latitude, longitude) {
  const around = `(around:${FIELD_SEARCH_RADIUS},${latitude},${longitude})`;
  return `
[out:json][timeout:12];
(
  node${around}["waterway"~"^(river|stream|canal|ditch|drain)$"];
  way${around}["waterway"~"^(river|stream|canal|ditch|drain)$"];
  relation${around}["waterway"~"^(river|stream|canal)$"];
  way${around}["natural"="water"];
  relation${around}["natural"="water"];
  way${around}["landuse"="reservoir"];
  relation${around}["landuse"="reservoir"];
  node${around}["leisure"="fishing"];
  way${around}["leisure"="fishing"];
  relation${around}["leisure"="fishing"];
);
out center 40;
`;
}

async function fetchReversePlace(latitude, longitude) {
  const url = new URL(NOMINATIM_REVERSE);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", latitude);
  url.searchParams.set("lon", longitude);
  url.searchParams.set("zoom", "17");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "ja");

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("住所情報の取得に失敗しました");
  return response.json();
}

function normalizeOverpassElements(elements, baseLatitude, baseLongitude) {
  const seen = new Set();
  return elements
    .map((element) => overpassElementToField(element, baseLatitude, baseLongitude))
    .filter(Boolean)
    .filter((field) => {
      if (seen.has(field.id)) return false;
      seen.add(field.id);
      return true;
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 8);
}

function overpassElementToField(element, baseLatitude, baseLongitude) {
  const point = element.center || { lat: element.lat, lon: element.lon };
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) return null;

  const tags = element.tags || {};
  const fieldType = classifyFieldType(tags) || "natural";
  return {
    id: `${element.type}-${element.id}`,
    osmType: element.type,
    osmId: element.id,
    name: tags["name:ja"] || tags.name || genericFieldName(tags, fieldType),
    latitude: point.lat,
    longitude: point.lon,
    fieldType,
    tags,
    distance: haversineDistance(baseLatitude, baseLongitude, point.lat, point.lon),
  };
}

function renderFieldInfo(reversePlace, fields, selectedField) {
  if (!els.fieldInfo) return;
  const placeName = selectedField?.name || shortDisplayName(reversePlace?.display_name) || "地図選択地点";
  const nearest = selectedField || fields[0];
  const nearestText = nearest
    ? `${nearest.name} / ${fieldTypeLabel(nearest.fieldType)} / ${formatDistance(nearest.distance)}`
    : "周辺水域データなし";
  const detail = nearest
    ? fieldDescription(nearest)
    : "地図上の座標をもとに天気予測を取得します。周辺水域がOpenStreetMapに登録されていれば候補として表示されます。";

  els.fieldInfo.innerHTML = `
    <div class="field-summary">
      <strong>${escapeHtml(placeName)}</strong>
      <p>${escapeHtml(nearestText)}</p>
      <p>${escapeHtml(detail)}</p>
    </div>
  `;
}

function renderNearbyFields(fields) {
  if (!els.nearbyFields) return;
  if (!fields.length) {
    els.nearbyFields.innerHTML = `<p class="muted">周辺の水域候補はありません。</p>`;
    return;
  }

  els.nearbyFields.innerHTML = fields
    .map(
      (field, index) => `
        <button type="button" class="field-option" data-field-index="${index}">
          <strong>${escapeHtml(field.name)}</strong>
          <span>${escapeHtml(fieldTypeLabel(field.fieldType))} / ${escapeHtml(formatDistance(field.distance))}</span>
          <small>${escapeHtml(fieldDescription(field))}</small>
        </button>
      `,
    )
    .join("");

  els.nearbyFields.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const field = fields[Number(button.dataset.fieldIndex)];
      void selectNearbyField(field);
    });
  });
}

function renderMapFeatures(fields) {
  if (!state.fieldLayer || !window.L) return;
  state.fieldLayer.clearLayers();

  fields.forEach((field) => {
    const marker = L.circleMarker([field.latitude, field.longitude], {
      radius: field.fieldType === "river" ? 5 : 7,
      color: field.fieldType === "river" ? "#0f4d5a" : "#167a72",
      fillColor: field.fieldType === "river" ? "#8ed2df" : "#a7e5d9",
      fillOpacity: 0.78,
      weight: 2,
    }).addTo(state.fieldLayer);
    marker.bindTooltip(escapeHtml(field.name));
    marker.on("click", () => {
      void selectNearbyField(field);
    });
  });
}

async function selectNearbyField(field) {
  if (!field) return;
  updateMapPoint(field.latitude, field.longitude, { moveMap: true });
  renderFieldInfo(state.reversePlace, state.nearbyFields, field);
  els.waterType.value = field.fieldType || els.waterType.value;

  await selectLocation(
    {
      name: field.name,
      admin1: state.reversePlace?.address?.state || state.reversePlace?.address?.province || "",
      country: state.reversePlace?.address?.country || "日本",
      latitude: field.latitude,
      longitude: field.longitude,
      timezone: "auto",
      fieldType: field.fieldType,
      source: "osm-field",
      osmTags: field.tags,
    },
    { syncMap: false },
  );
}

function maybeUpdateMapPointName(latitude, longitude, reversePlace) {
  if (!reversePlace || state.location.source !== "map-point") return;
  const samePoint =
    Math.abs(state.location.latitude - latitude) < 0.0005 &&
    Math.abs(state.location.longitude - longitude) < 0.0005;
  if (!samePoint) return;

  state.location.name = shortDisplayName(reversePlace.display_name) || "地図選択地点";
  state.location.admin1 = reversePlace.address?.state || reversePlace.address?.province || "";
  state.location.country = reversePlace.address?.country || "";
  els.selectedLocation.textContent = formatLocation(state.location);
  els.locationInput.value = state.location.name;
}

function classifyFieldType(tags = {}) {
  const water = String(tags.water || tags.type || "").toLowerCase();
  const waterway = String(tags.waterway || "").toLowerCase();
  const landuse = String(tags.landuse || "").toLowerCase();
  const natural = String(tags.natural || tags.category || "").toLowerCase();

  if (/^(river|stream|canal|ditch|drain)$/.test(waterway) || /^(river|stream|canal)$/.test(water)) {
    return "river";
  }
  if (landuse === "reservoir" || water === "reservoir") {
    return "reservoir";
  }
  if (/^(pond|fishpond|basin|retention|oxbow)$/.test(water)) {
    return "pond";
  }
  if (water === "lake" || natural === "water") {
    return "natural";
  }
  return "";
}

function fieldTypeLabel(type) {
  const labels = {
    natural: "自然湖・水域",
    reservoir: "リザーバー",
    river: "河川・水路",
    pond: "野池・小規模池",
  };
  return labels[type] || "水域";
}

function genericFieldName(tags, fieldType) {
  if (tags.waterway) return `${fieldTypeLabel("river")}候補`;
  if (tags.leisure === "fishing") return "釣り場候補";
  return `${fieldTypeLabel(fieldType)}候補`;
}

function fieldDescription(field) {
  if (field.fieldType === "river") {
    return "流れのヨレ、反転流、橋脚や護岸際の変化を優先。雨後は濁りの境目を見る。";
  }
  if (field.fieldType === "pond") {
    return "小場所は日陰、流入、最深部、岸際カバーのどれかが強い一点になりやすい。";
  }
  if (field.fieldType === "reservoir") {
    return "水位変化に強い岬、チャンネル、縦ストラクチャーを軸に組み立てる。";
  }
  return "風の当たる岸、ブレイク、ウィードやハードボトムの変化を優先。";
}

function shortDisplayName(displayName = "") {
  const parts = displayName
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.find((part) => !/^\d+$/.test(part)) || parts[0] || "";
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000;
  const toRad = (degree) => (degree * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(distance) {
  if (!Number.isFinite(distance)) return "--";
  if (distance >= 1000) return `${(distance / 1000).toFixed(1)} km`;
  return `${Math.round(distance)} m`;
}

function formatCoords(latitude, longitude) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

async function useCurrentLocation() {
  if (!navigator.geolocation) {
    setStatus("現在地非対応", "is-error");
    return;
  }

  setStatus("現在地を取得中...");
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      await selectLocation({
        name: "現在地",
        admin1: "",
        country: "",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timezone: "auto",
      });
    },
    () => {
      setStatus("現在地を取得できません", "is-error");
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 1000 * 60 * 20,
    },
  );
}

function wireEvents() {
  els.searchButton.addEventListener("click", searchLocations);
  els.refreshButton.addEventListener("click", fetchWeather);
  els.geoButton.addEventListener("click", useCurrentLocation);
  els.useMapPointButton.addEventListener("click", selectCurrentMapPoint);
  els.locationInput.addEventListener(
    "input",
    debounce(() => {
      if (els.locationInput.value.trim().length >= 3) searchLocations();
    }, 500),
  );
  els.locationInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchLocations();
    }
  });
  els.form.addEventListener("input", analyzeAndRender);
  els.form.addEventListener("change", analyzeAndRender);
}

function registerServiceWorker() {
  const canRegister =
    "serviceWorker" in navigator &&
    (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1");

  if (!canRegister) return;

  navigator.serviceWorker.register("./sw.js").catch((error) => {
    console.warn("Service worker registration failed", error);
  });
}

async function init() {
  registerServiceWorker();
  wireEvents();
  els.selectedLocation.textContent = formatLocation(DEFAULT_LOCATION);
  initMap();
  await fetchWeather();
}

init();
