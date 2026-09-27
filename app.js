// Weather Dash — uses the free Open-Meteo APIs (no API key needed).

const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

// WMO weather codes -> [emoji, description]
const WEATHER_CODES = {
  0: ["☀️", "Clear sky"],
  1: ["🌤️", "Mainly clear"],
  2: ["⛅", "Partly cloudy"],
  3: ["☁️", "Overcast"],
  45: ["🌫️", "Fog"],
  48: ["🌫️", "Rime fog"],
  51: ["🌦️", "Light drizzle"],
  53: ["🌦️", "Drizzle"],
  55: ["🌧️", "Dense drizzle"],
  61: ["🌦️", "Light rain"],
  63: ["🌧️", "Rain"],
  65: ["🌧️", "Heavy rain"],
  71: ["🌨️", "Light snow"],
  73: ["🌨️", "Snow"],
  75: ["❄️", "Heavy snow"],
  80: ["🌦️", "Rain showers"],
  81: ["🌧️", "Heavy showers"],
  82: ["⛈️", "Violent showers"],
  95: ["⛈️", "Thunderstorm"],
  96: ["⛈️", "Thunderstorm with hail"],
  99: ["⛈️", "Severe thunderstorm"],
};

const STORAGE_KEY = "weather-dash:last-city";

const $ = (id) => document.getElementById(id);
const describe = (code) => WEATHER_CODES[code] ?? ["🌡️", "Unknown"];

async function getJSON(url, params) {
  const res = await fetch(`${url}?${new URLSearchParams(params)}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

async function findCity(name) {
  const data = await getJSON(GEO_URL, { name, count: 1, language: "en", format: "json" });
  if (!data.results?.length) throw new Error(`No city found for "${name}"`);
  return data.results[0];
}

async function getWeather(lat, lon) {
  return getJSON(WEATHER_URL, {
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
  });
}

function render(place, weather) {
  const c = weather.current;
  const [icon, desc] = describe(c.weather_code);
  $("place").textContent = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
  $("now-icon").textContent = icon;
  $("now-temp").textContent = `${Math.round(c.temperature_2m)}°C`;
  $("now-desc").textContent = desc;
  $("now-feels").textContent = `${Math.round(c.apparent_temperature)}°C`;
  $("now-hum").textContent = `${c.relative_humidity_2m}%`;
  $("now-wind").textContent = `${Math.round(c.wind_speed_10m)} km/h`;

  const d = weather.daily;
  $("days").replaceChildren(
    ...d.time.map((date, i) => {
      const [dIcon, dDesc] = describe(d.weather_code[i]);
      const li = document.createElement("li");
      const day = new Date(`${date}T12:00`).toLocaleDateString("en", { weekday: "short" });
      li.innerHTML = `<span></span><span></span><span></span><span class="range"></span>`;
      li.children[0].textContent = i === 0 ? "Today" : day;
      li.children[1].textContent = dIcon;
      li.children[2].textContent = dDesc;
      li.children[3].innerHTML = `${Math.round(d.temperature_2m_max[i])}°<span class="lo">${Math.round(d.temperature_2m_min[i])}°</span>`;
      return li;
    }),
  );

  $("current").hidden = false;
  $("forecast").hidden = false;
}

async function search(name) {
  $("status").textContent = "Loading…";
  try {
    const place = await findCity(name);
    const weather = await getWeather(place.latitude, place.longitude);
    render(place, weather);
    $("status").textContent = "";
    try {
      localStorage.setItem(STORAGE_KEY, place.name);
    } catch {
      // storage can be unavailable (private mode); that's fine
    }
  } catch (err) {
    $("status").textContent = err.message;
  }
}

$("search").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("city").value.trim();
  if (name) search(name);
});

function lastCity() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

search(lastCity() || "London");
