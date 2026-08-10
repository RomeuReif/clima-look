const state = {
  lat: null, lon: null, city: "Sua localização", country: "",
  weather: null, unit: "C"
};

const $ = (id) => document.getElementById(id);

const weatherCodes = {
  0: ["Céu limpo", "☀️"],
  1: ["Principalmente limpo", "🌤️"],
  2: ["Parcialmente nublado", "⛅"],
  3: ["Nublado", "☁️"],
  45: ["Neblina", "🌫️"],
  48: ["Neblina congelante", "🌫️"],
  51: ["Garoa leve", "🌦️"],
  53: ["Garoa moderada", "🌦️"],
  55: ["Garoa intensa", "🌧️"],
  56: ["Garoa congelante", "🌧️"],
  57: ["Garoa congelante intensa", "🌧️"],
  61: ["Chuva leve", "🌦️"],
  63: ["Chuva moderada", "🌧️"],
  65: ["Chuva forte", "🌧️"],
  66: ["Chuva congelante", "🌧️"],
  67: ["Chuva congelante forte", "🌧️"],
  71: ["Neve leve", "🌨️"],
  73: ["Neve moderada", "🌨️"],
  75: ["Neve forte", "❄️"],
  77: ["Granizo de neve", "❄️"],
  80: ["Pancadas leves", "🌦️"],
  81: ["Pancadas moderadas", "🌧️"],
  82: ["Pancadas fortes", "⛈️"],
  85: ["Pancadas de neve", "🌨️"],
  86: ["Pancadas de neve fortes", "❄️"],
  95: ["Trovoada", "⛈️"],
  96: ["Trovoada com granizo", "⛈️"],
  99: ["Trovoada forte com granizo", "⛈️"]
};

function weatherInfo(code) {
  return weatherCodes[code] || ["Condição desconhecida", "🌡️"];
}

function cToF(c) { return c * 9 / 5 + 32; }
function temp(v) {
  const n = state.unit === "C" ? v : cToF(v);
  return `${Math.round(n)}°`;
}
function speed(v) {
  return state.unit === "C" ? `${Math.round(v)} km/h` : `${Math.round(v * 0.621371)} mph`;
}
function setStatus(msg = "") { $("status").textContent = msg; }

function greetingByHour(hour) {
  if (hour >= 5 && hour < 12) return "Bom dia ☀️";
  if (hour >= 12 && hour < 18) return "Boa tarde 🌤️";
  return "Boa noite 🌙";
}

function formatDay(dateString, index) {
  if (index === 0) return "Hoje";
  const d = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
    .format(d).replace(".", "").replace(/^./, x => x.toUpperCase());
}

function formatTime(dateString) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit", minute: "2-digit", hour12: false
  }).format(new Date(dateString));
}

function clothingRecommendation(tempC, rainChance, wind, code, isDay) {
  const raining = rainChance >= 55 || [51,53,55,61,63,65,80,81,82,95,96,99].includes(code);
  let title, text, icon, items, badge;

  if (tempC >= 30) {
    title = "Leve e fresco";
    text = raining ? "Está quente e há chance de chuva. Prefira peças leves e leve um guarda-chuva." :
      "Calor forte. Priorize roupas leves, respiráveis e proteção contra o sol.";
    icon = "🩳"; items = ["Camiseta leve", "Short ou bermuda", "Tênis/sandália", "Boné"];
    badge = "QUENTE";
  } else if (tempC >= 24) {
    title = "Confortável e leve";
    text = raining ? "Temperatura agradável, mas a chuva pede um plano B." :
      "Uma combinação leve deve deixar você confortável durante o dia.";
    icon = "👕"; items = ["Camiseta", "Calça leve ou short", "Tênis", raining ? "Guarda-chuva" : "Óculos de sol"];
    badge = "AGRADÁVEL";
  } else if (tempC >= 18) {
    title = "Camadas leves";
    text = raining ? "Clima ameno com possibilidade de chuva. Uma camada leve é uma boa escolha." :
      "A temperatura está amena. Leve uma camada para o começo ou fim do dia.";
    icon = "🧥"; items = ["Camiseta", "Calça", "Tênis", "Casaco leve"];
    badge = "AMENO";
  } else if (tempC >= 12) {
    title = "Agasalho recomendado";
    text = "Está fresco/frio. Uma jaqueta ou moletom deve ajudar, especialmente se ventar.";
    icon = "🧥"; items = ["Camiseta", "Moletom/jaqueta", "Calça", "Tênis fechado"];
    badge = "FRESCO";
  } else {
    title = "Bem agasalhado";
    text = "Temperatura baixa. Use camadas e proteja especialmente extremidades.";
    icon = "🧣"; items = ["Blusa térmica", "Casaco", "Calça", "Meias", "Calçado fechado"];
    badge = "FRIO";
  }

  if (wind >= 30) {
    items.push("Jaqueta corta-vento");
    text += " O vento está forte, então uma camada corta-vento é recomendada.";
  }
  if (raining && !items.includes("Guarda-chuva")) items.push("Guarda-chuva");
  if (!isDay && tempC < 24) text += " À noite, a sensação pode ficar mais fria.";

  return { title, text, icon, items, badge };
}

async function reverseGeocode(lat, lon) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`;
    const r = await fetch(url);
    if (!r.ok) throw new Error();
    const d = await r.json();
    return d.city || d.locality || d.principalSubdivision || "Sua localização";
  } catch {
    return "Sua localização";
  }
}

async function searchCities(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=6&language=pt&format=json`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("Não foi possível pesquisar a cidade.");
  const d = await r.json();
  return d.results || [];
}

async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat, longitude: lon,
    timezone: "auto",
    forecast_days: "7",
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,sunrise,sunset,uv_index_max"
  });
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!r.ok) throw new Error("Não foi possível carregar a previsão.");
  return r.json();
}

function render(data) {
  state.weather = data;
  const c = data.current, d = data.daily;
  const [desc, icon] = weatherInfo(c.weather_code);

  $("greeting").textContent = greetingByHour(new Date().getHours());
  $("weatherIcon").textContent = icon;
  $("weatherDescription").textContent = desc;
  $("temperature").textContent = Math.round(state.unit === "C" ? c.temperature_2m : cToF(c.temperature_2m));
  $("feelsLike").textContent = temp(c.apparent_temperature);
  $("humidity").textContent = `${Math.round(c.relative_humidity_2m)}%`;
  $("wind").textContent = speed(c.wind_speed_10m);
  $("rain").textContent = `${Math.round(d.precipitation_probability_max[0])}%`;
  $("precipitation").textContent = `${Number(d.precipitation_sum[0]).toFixed(1)} mm`;
  $("uv").textContent = Number(d.uv_index_max[0]).toFixed(1);
  $("sunrise").textContent = formatTime(d.sunrise[0]);
  $("sunset").textContent = formatTime(d.sunset[0]);
  $("localTime").textContent = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: data.timezone
  }).format(new Date());

  const rec = clothingRecommendation(
    c.temperature_2m, d.precipitation_probability_max[0],
    c.wind_speed_10m, c.weather_code, c.is_day
  );
  $("outfitIcon").textContent = rec.icon;
  $("outfitTitle").textContent = rec.title;
  $("outfitText").textContent = rec.text;
  $("comfortBadge").textContent = rec.badge;
  $("outfitItems").innerHTML = rec.items.map(x => `<li>${x}</li>`).join("");

  $("forecast").innerHTML = d.time.map((date, i) => {
    const [wd, wi] = weatherInfo(d.weather_code[i]);
    return `
      <article class="forecast-day ${i === 0 ? "today" : ""}">
        <div class="day">${formatDay(date, i)}</div>
        <div class="icon" title="${wd}">${wi}</div>
        <div class="temps">${temp(d.temperature_2m_max[i])} / ${temp(d.temperature_2m_min[i])}</div>
        <div class="rain">💧 ${Math.round(d.precipitation_probability_max[i])}%</div>
      </article>`;
  }).join("");

  setStatus(`Atualizado agora • ${data.timezone}`);
}

async function loadLocation(lat, lon, city = null) {
  try {
    setStatus("Buscando previsão...");
    state.lat = lat; state.lon = lon;
    if (!city) city = await reverseGeocode(lat, lon);
    state.city = city;
    $("locationName").textContent = city;
    const data = await fetchWeather(lat, lon);
    render(data);
  } catch (e) {
    setStatus(e.message || "Erro ao carregar o clima.");
  }
}

$("locationBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    setStatus("Seu navegador não oferece geolocalização. Pesquise sua cidade.");
    return;
  }
  setStatus("Solicitando sua localização...");
  navigator.geolocation.getCurrentPosition(
    p => loadLocation(p.coords.latitude, p.coords.longitude),
    () => setStatus("Não foi possível acessar sua localização. Pesquise uma cidade manualmente."),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
});

$("searchForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("cityInput").value.trim();
  if (name.length < 2) return;
  try {
    setStatus("Pesquisando cidades...");
    const results = await searchCities(name);
    const box = $("searchResults");
    if (!results.length) {
      box.hidden = false; box.innerHTML = `<div class="search-result">Nenhuma cidade encontrada.</div>`;
      return;
    }
    box.hidden = false;
    box.innerHTML = results.map((x, i) => `
      <button class="search-result" data-index="${i}">
        <strong>${x.name}</strong><br>
        <small>${x.admin1 || ""}${x.country ? ` • ${x.country}` : ""}</small>
      </button>`).join("");
    box.querySelectorAll("[data-index]").forEach(btn => {
      btn.addEventListener("click", () => {
        const x = results[Number(btn.dataset.index)];
        box.hidden = true;
        $("cityInput").value = "";
        loadLocation(x.latitude, x.longitude, `${x.name}${x.country ? `, ${x.country}` : ""}`);
      });
    });
    setStatus("Escolha uma cidade.");
  } catch (e) {
    setStatus(e.message);
  }
});

$("refreshBtn").addEventListener("click", () => {
  if (state.lat !== null) loadLocation(state.lat, state.lon, state.city);
  else requestInitialLocation();
});

$("unitBtn").addEventListener("click", () => {
  state.unit = state.unit === "C" ? "F" : "C";
  $("unitBtn").textContent = `°${state.unit}`;
  if (state.weather) render(state.weather);
});

function requestInitialLocation() {
  if (!navigator.geolocation) {
    setStatus("Pesquise sua cidade para começar.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    p => loadLocation(p.coords.latitude, p.coords.longitude),
    () => {
      setStatus("Localização bloqueada. Pesquise sua cidade acima.");
      $("locationName").textContent = "Escolha sua cidade";
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
  );
}

requestInitialLocation();
