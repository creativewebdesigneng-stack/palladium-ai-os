import "server-only";

export type CommuteTravelMode = "DRIVE" | "WALK" | "BICYCLE" | "TRANSIT";

export type CommuteRoute = {
  durationSeconds: number;
  staticDurationSeconds: number | null;
  distanceMeters: number;
  distanceText: string;
  durationText: string;
  trafficDelaySeconds: number | null;
  trafficDelayText: string | null;
  encodedPolyline: string | null;
};

export type CommuteRouteResult = {
  origin: string;
  destination: string;
  travelMode: CommuteTravelMode;
  routes: CommuteRoute[];
  mapsUrl: string;
};

function parseDuration(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^([0-9]+(?:\.[0-9]+)?)s$/);
  return match ? Math.round(Number(match[1])) : null;
}

function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} hr ${remainder} min` : `${hours} hr`;
}

function formatDistance(meters: number): string {
  const miles = meters / 1609.344;
  return miles < 0.1 ? `${Math.round(meters)} m` : `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
}

export function parseCommuteRequest(request: string): { origin: string; destination: string; travelMode: CommuteTravelMode } | null {
  if (!/(commute|route|directions|drive|driving|walk|walking|cycle|cycling|transit|train|travel from)/i.test(request)) return null;
  const match = request.match(/\bfrom\s+(.+?)\s+to\s+(.+?)(?:[,.!?]|\s+(?:by|via|at|for|leaving|arriving)\b|$)/i);
  if (!match) return null;
  const origin = match[1]?.trim();
  const destination = match[2]?.trim();
  if (!origin || !destination) return null;
  const travelMode: CommuteTravelMode = /walk/i.test(request)
    ? "WALK"
    : /cycl|bike/i.test(request)
      ? "BICYCLE"
      : /transit|train|bus|tube/i.test(request)
        ? "TRANSIT"
        : "DRIVE";
  return { origin, destination, travelMode };
}

function mapsUrl(origin: string, destination: string, travelMode: CommuteTravelMode): string {
  const mode = travelMode === "WALK" ? "walking" : travelMode === "BICYCLE" ? "bicycling" : travelMode === "TRANSIT" ? "transit" : "driving";
  const params = new URLSearchParams({ api: "1", origin, destination, travelmode: mode });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export async function computeCommuteRoutes(request: string): Promise<CommuteRouteResult | null> {
  const parsed = parseCommuteRequest(request);
  if (!parsed) return null;

  const apiKey = process.env["GOOGLE_MAPS_API_KEY"]?.trim();
  if (!apiKey) return null;

  const body: Record<string, unknown> = {
    origin: { address: parsed.origin },
    destination: { address: parsed.destination },
    travelMode: parsed.travelMode,
    computeAlternativeRoutes: parsed.travelMode !== "TRANSIT",
    languageCode: "en-GB",
    units: "IMPERIAL",
  };
  if (parsed.travelMode === "DRIVE") {
    body["routingPreference"] = "TRAFFIC_AWARE";
  }

  const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`Google Routes request failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }

  const payload = (await response.json()) as { routes?: Array<Record<string, any>> };
  const routes = (payload.routes ?? []).slice(0, 3).map((route) => {
    const durationSeconds = parseDuration(route.duration) ?? 0;
    const staticDurationSeconds = parseDuration(route.staticDuration);
    const trafficDelaySeconds = staticDurationSeconds === null ? null : Math.max(0, durationSeconds - staticDurationSeconds);
    const distanceMeters = Number(route.distanceMeters ?? 0);
    return {
      durationSeconds,
      staticDurationSeconds,
      distanceMeters,
      distanceText: formatDistance(distanceMeters),
      durationText: formatDuration(durationSeconds),
      trafficDelaySeconds,
      trafficDelayText: trafficDelaySeconds && trafficDelaySeconds >= 60 ? `+${formatDuration(trafficDelaySeconds)} traffic` : null,
      encodedPolyline: typeof route.polyline?.encodedPolyline === "string" ? route.polyline.encodedPolyline : null,
    } satisfies CommuteRoute;
  }).filter((route) => route.durationSeconds > 0 && route.distanceMeters > 0);

  return {
    ...parsed,
    routes,
    mapsUrl: mapsUrl(parsed.origin, parsed.destination, parsed.travelMode),
  };
}
