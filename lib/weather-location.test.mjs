import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveWeatherMode,
  shouldRequestGeolocation,
} from "./weather-location.js";

test("scene ready keeps default mode while geolocation is still pending", () => {
  assert.equal(
    resolveWeatherMode({
      sceneReady: true,
      geoStatus: "pending",
      hasGeolocation: true,
      clientCoords: null,
    }),
    "default",
  );
});

test("scene ready falls back to ip only after geolocation failure", () => {
  assert.equal(
    resolveWeatherMode({
      sceneReady: true,
      geoStatus: "failed",
      hasGeolocation: true,
      clientCoords: null,
    }),
    "ip",
  );
});

test("scene ready uses ip when browser geolocation is unavailable", () => {
  assert.equal(
    resolveWeatherMode({
      sceneReady: true,
      geoStatus: "idle",
      hasGeolocation: false,
      clientCoords: null,
    }),
    "ip",
  );
});

test("available client coords always win", () => {
  assert.equal(
    resolveWeatherMode({
      sceneReady: true,
      geoStatus: "succeeded",
      hasGeolocation: true,
      clientCoords: { lat: 31.23, lon: 121.47, tz: "Asia/Shanghai" },
    }),
    "coords",
  );
});

test("geolocation request starts once after scene is ready", () => {
  assert.equal(
    shouldRequestGeolocation({
      sceneReady: true,
      geoStatus: "idle",
      hasGeolocation: true,
      clientCoords: null,
    }),
    true,
  );
});

test("pending geolocation should not request again", () => {
  assert.equal(
    shouldRequestGeolocation({
      sceneReady: true,
      geoStatus: "pending",
      hasGeolocation: true,
      clientCoords: null,
    }),
    false,
  );
});
