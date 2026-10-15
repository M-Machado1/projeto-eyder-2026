import "./style.css";

type Maybe<T> = T | null | undefined;

interface GeoPlace {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  timezone?: string;
}

interface GeoResponse {
  results?: GeoPlace[];
}

interface ForecastResponse {
  current?: {
    time?: string;
    temperature_2m?: Maybe<number>;
    relative_humidity_2m?: Maybe<number>;
    weather_code?: Maybe<number>;
    wind_speed_10m?: Maybe<number>;
  };
  current_units?: Record<string, string>;
  daily?: {
    time?: string[];
    weather_code?: Maybe<number>[];
    temperature_2m_max?: Maybe<number>[];
    temperature_2m_min?: Maybe<number>[];
    precipitation_probability_max?: Maybe<number>[];
  };
  daily_units?: Record<string, string>;
}

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const FORECAST_DAYS = 5;
const TIMEOUT_MS = 10_000;
const MISSING = "Não disponível";

const WEATHER_CODES: Record<number, string> = {
  0: "Céu limpo",
  1: "Predominantemente limpo",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Neblina",
  48: "Neblina com geada",
  51: "Garoa fraca",
  53: "Garoa moderada",
  55: "Garoa intensa",
  56: "Garoa congelante fraca",
  57: "Garoa congelante intensa",
  61: "Chuva fraca",
  63: "Chuva moderada",
  65: "Chuva forte",
  66: "Chuva congelante fraca",
  67: "Chuva congelante forte",
  71: "Neve fraca",
  73: "Neve moderada",
  75: "Neve forte",
  77: "Grãos de neve",
  80: "Pancadas de chuva fracas",
  81: "Pancadas de chuva moderadas",
  82: "Pancadas de chuva violentas",
  85: "Pancadas de neve fracas",
  86: "Pancadas de neve fortes",
  95: "Trovoada",
  96: "Trovoada com granizo fraco",
  99: "Trovoada com granizo forte",
};


function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Elemento #${id} não encontrado`);
  return element as T;
}

const form = getElement<HTMLFormElement>("search-form");
const input = getElement<HTMLInputElement>("search-input");
const searchButton = getElement<HTMLButtonElement>("search-button");
const fieldError = getElement<HTMLParagraphElement>("search-error");
const statusLine = getElement<HTMLParagraphElement>("status");
const choicesSection = getElement<HTMLElement>("choices-section");
const choicesList = getElement<HTMLUListElement>("choices");
const weatherSection = getElement<HTMLElement>("weather-section");
const currentBox = getElement<HTMLElement>("current");
const forecastList = getElement<HTMLUListElement>("forecast");


interface RequestState {
  id: number;
  signal: AbortSignal;
  timer: number;
}

let lastRequestId = 0;
let activeController: AbortController | null = null;

function startRequest(): RequestState {
  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  return { id: ++lastRequestId, signal: controller.signal, timer };
}

function isStale(req: RequestState): boolean {
  return req.id !== lastRequestId;
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
}

async function searchLocations(
  name: string,
  signal: AbortSignal,
): Promise<GeoPlace[]> {
  const params = new URLSearchParams({
    name,
    count: "8",
    language: "pt",
    format: "json",
  });
  const data = await fetchJson<GeoResponse>(
    `${GEOCODING_URL}?${params}`,
    signal,
  );
  return Array.isArray(data.results) ? data.results : [];
}

function fetchWeather(
  place: GeoPlace,
  signal: AbortSignal,
): Promise<ForecastResponse> {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    forecast_days: String(FORECAST_DAYS),
  });
  return fetchJson<ForecastResponse>(`${FORECAST_URL}?${params}`, signal);
}


function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatValue(value: Maybe<number>, unit: string): string {
  if (!isNumber(value)) return MISSING;
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ${unit}`;
}

function describeWeather(code: Maybe<number>): string {
  return isNumber(code) ? (WEATHER_CODES[code] ?? MISSING) : MISSING;
}

function formatDateTime(iso: string | undefined): string {
  if (!iso) return MISSING;
  const date = new Date(`${iso}:00Z`);
  if (Number.isNaN(date.getTime())) return MISSING;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

function formatDay(isoDate: string | undefined): string {
  if (!isoDate) return MISSING;
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return MISSING;
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function placeLabel(place: GeoPlace): string {
  return [place.name, place.admin1, place.country].filter(Boolean).join(", ");
}


const ITEM_CARD = "rounded-lg border border-slate-300 bg-white p-4";
const FOCUS_RING =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-amber-700";

function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createDataList(
  rows: [label: string, value: string][],
): HTMLDListElement {
  const list = createElement("dl", "space-y-1");
  for (const [label, value] of rows) {
    const row = createElement("div", "flex flex-wrap justify-between gap-x-3");
    row.append(
      createElement("dt", "text-slate-600", label),
      createElement("dd", "ml-auto text-right", value),
    );
    list.append(row);
  }
  return list;
}

function setStatus(message: string, isError = false): void {
  statusLine.textContent = message;
  statusLine.classList.toggle("text-red-700", isError);
  statusLine.classList.toggle("font-semibold", isError);
  statusLine.classList.toggle("text-slate-700", !isError);
}

function setLoading(isLoading: boolean): void {
  searchButton.disabled = isLoading;
  form.setAttribute("aria-busy", String(isLoading));
}

function clearResults(): void {
  choicesList.replaceChildren();
  currentBox.replaceChildren();
  forecastList.replaceChildren();
  choicesSection.hidden = true;
  weatherSection.hidden = true;
}

function showFieldError(message: string): void {
  fieldError.textContent = message;
  fieldError.hidden = false;
  input.setAttribute("aria-invalid", "true");
  input.focus();
}

function clearFieldError(): void {
  fieldError.textContent = "";
  fieldError.hidden = true;
  input.removeAttribute("aria-invalid");
}

function renderChoices(places: GeoPlace[]): void {
  choicesList.replaceChildren();
  for (const place of places) {
    const item = document.createElement("li");
    const button = createElement(
      "button",
      `w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-left
       hover:border-blue-800 ${FOCUS_RING}`,
      placeLabel(place),
    );
    button.type = "button";
    if (place.timezone) {
      button.append(
        createElement(
          "small",
          "block text-slate-600",
          `Fuso horário: ${place.timezone}`,
        ),
      );
    }
    button.addEventListener("click", () => void loadWeather(place));
    item.append(button);
    choicesList.append(item);
  }
  choicesSection.hidden = false;
  choicesList.querySelector("button")?.focus();
}

function renderCurrent(place: GeoPlace, data: ForecastResponse): void {
  const current = data.current ?? {};
  const units = data.current_units ?? {};

  currentBox.replaceChildren(
    createElement("h3", "text-xl font-semibold break-words", placeLabel(place)),
    createElement(
      "p",
      "my-1 text-4xl font-bold",
      formatValue(current.temperature_2m, units["temperature_2m"] ?? "°C"),
    ),
    createElement("p", "mb-3 text-lg", describeWeather(current.weather_code)),
    createDataList([
      [
        "Vento",
        formatValue(current.wind_speed_10m, units["wind_speed_10m"] ?? "km/h"),
      ],
      [
        "Umidade",
        formatValue(
          current.relative_humidity_2m,
          units["relative_humidity_2m"] ?? "%",
        ),
      ],
      ["Atualizado em", formatDateTime(current.time)],
    ]),
  );
}

function renderForecast(data: ForecastResponse): void {
  const daily = data.daily ?? {};
  const units = data.daily_units ?? {};
  const days = daily.time ?? [];

  forecastList.replaceChildren();
  days.forEach((day, i) => {
    const item = createElement("li", ITEM_CARD);
    item.append(
      createElement(
        "h3",
        "font-semibold first-letter:uppercase",
        formatDay(day),
      ),
      createElement(
        "p",
        "mb-2 text-slate-700",
        describeWeather(daily.weather_code?.[i]),
      ),
      createDataList([
        [
          "Mínima",
          formatValue(
            daily.temperature_2m_min?.[i],
            units["temperature_2m_min"] ?? "°C",
          ),
        ],
        [
          "Máxima",
          formatValue(
            daily.temperature_2m_max?.[i],
            units["temperature_2m_max"] ?? "°C",
          ),
        ],
        [
          "Chance de chuva",
          formatValue(
            daily.precipitation_probability_max?.[i],
            units["precipitation_probability_max"] ?? "%",
          ),
        ],
      ]),
    );
    forecastList.append(item);
  });
}


function describeError(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "A consulta demorou demais. Tente novamente.";
  }
  if (error instanceof TypeError) {
    return "Não foi possível conectar. Verifique sua internet e tente novamente.";
  }
  const detail = error instanceof Error ? error.message : "erro desconhecido";
  return `O serviço retornou um erro (${detail}). Tente novamente em instantes.`;
}

async function loadWeather(place: GeoPlace): Promise<void> {
  const req = startRequest();
  clearResults();
  setLoading(true);
  setStatus(`Carregando o tempo em ${place.name}...`);

  try {
    const data = await fetchWeather(place, req.signal);
    if (isStale(req)) return;
    renderCurrent(place, data);
    renderForecast(data);
    weatherSection.hidden = false;
    setStatus(`Mostrando o tempo em ${placeLabel(place)}.`);
  } catch (error) {
    if (isStale(req)) return;
    setStatus(describeError(error), true);
  } finally {
    window.clearTimeout(req.timer);
    if (!isStale(req)) setLoading(false);
  }
}

async function handleSearch(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  clearFieldError();

  const term = input.value.trim();
  if (term.length < 2) {
    showFieldError("Digite pelo menos 2 caracteres.");
    return;
  }

  const req = startRequest();
  clearResults();
  setLoading(true);
  setStatus("Buscando localidades...");

  try {
    const places = await searchLocations(term, req.signal);
    if (isStale(req)) return;

    const [onlyPlace] = places;
    if (places.length === 0) {
      setStatus(
        `Nenhuma localidade encontrada para "${term}". Verifique a grafia.`,
        true,
      );
    } else if (places.length === 1 && onlyPlace) {
      window.clearTimeout(req.timer);
      await loadWeather(onlyPlace);
      return;
    } else {
      renderChoices(places);
      setStatus(`${places.length} localidades encontradas. Escolha uma.`);
    }
  } catch (error) {
    if (isStale(req)) return;
    setStatus(describeError(error), true);
  } finally {
    window.clearTimeout(req.timer);
    if (!isStale(req)) setLoading(false);
  }
}

form.addEventListener("submit", (event) => void handleSearch(event));
