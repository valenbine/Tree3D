export function resolveWeatherMode({ sceneReady, geoStatus, hasGeolocation, clientCoords }) {
  if (clientCoords) return "coords";
  if (!sceneReady) return "default";
  if (!hasGeolocation) return "ip";
  if (geoStatus === "failed") return "ip";
  return "default";
}

export function shouldRequestGeolocation({ sceneReady, geoStatus, hasGeolocation, clientCoords }) {
  return Boolean(sceneReady && hasGeolocation && geoStatus === "idle" && !clientCoords);
}
