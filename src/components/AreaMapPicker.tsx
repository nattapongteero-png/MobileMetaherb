import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Platform } from "react-native";
import type WebViewType from "react-native-webview";
import { getWebView } from "../utils/webView";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import { MAP_PIN_LOGO as LOGO_URI } from "./mapPinLogo";

/**
 * แผนที่เลือกจุดร้าน — MapLibre GL JS inside a WebView.
 *
 * Why the JS build rather than @maplibre/maplibre-react-native: the native
 * package needs a prebuild + pod install, which takes the app out of Expo Go
 * and pulls in the config-plugin path this project avoids (see AGENTS.md).
 * The JS build runs from a CDN inside a WebView, so it works in Expo Go today
 * and on the web export with one code path.
 *
 * Tiles come from OpenFreeMap — MapLibre-compatible vector tiles, free, no API
 * key and no account. Swap STYLE_URL for MapTiler/Stadia if a paid SLA is ever
 * needed; nothing else changes.
 *
 * The radius is drawn as a 64-point GeoJSON polygon rather than a circle layer,
 * because MapLibre's circle-radius is in SCREEN pixels — a pixel circle would
 * shrink as you zoom out and stop meaning "500 metres".
 */
const STYLE_URL = "https://tiles.openfreemap.org/styles/bright";
const MAPLIBRE_JS = "https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.js";
const MAPLIBRE_CSS = "https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.css";

const html = (lat: number, lng: number, radiusM: number) => `<!doctype html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<link href="${MAPLIBRE_CSS}" rel="stylesheet" />
<style>
  html,body,#map{margin:0;height:100%;background:#eef1ee}
  .maplibregl-ctrl-attrib{font-size:9px}
  /* Teardrop pin drawn as SVG so it stays crisp at any density and its tip is
     exactly at the bottom of the box — anchor:"bottom" then lands the tip on
     the coordinate. The drop shadow lifts it off the map tiles. */
  /* The shop pin sits above the blue dot: MapLibre stacks markers in the order
     they're added, and the dot is added later, so it needs saying explicitly. */
  .pin{cursor:grab;filter:drop-shadow(0 4px 5px rgba(0,0,0,.35));transition:transform .12s ease-out;z-index:3}
  .pin:active{cursor:grabbing;transform:scale(1.06)}
  /* "คุณอยู่ตรงนี้" — the platform-standard blue dot with a soft accuracy halo,
     deliberately different in shape from the shop pin so the two never read as
     the same thing. */
  .me{width:12px;height:12px;border-radius:50%;background:#007aff;border:2.5px solid #fff;box-sizing:border-box;
    box-shadow:0 0 0 5px rgba(0,122,255,.16), 0 1px 3px rgba(0,0,0,.3);z-index:1}
</style>
</head><body>
<div id="map"></div>
<script src="${MAPLIBRE_JS}"></script>
<script>
  function post(o) { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  // Anything thrown inside the page would otherwise be invisible from RN.
  window.onerror = function (m) { post({ type: "error", message: String(m) }); };
  if (!window.maplibregl) post({ type: "error", message: "โหลดไลบรารีแผนที่ไม่สำเร็จ" });

  var LAT = ${lat}, LNG = ${lng}, R = ${radiusM};
  var map = new maplibregl.Map({ container: "map", style: "${STYLE_URL}", center: [LNG, LAT], zoom: 14, attributionControl: { compact: true } });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  map.on("error", function (e) { post({ type: "error", message: (e && e.error && e.error.message) || "แผนที่โหลดไม่สำเร็จ" }); });

  // Metre-accurate circle: 64 points around the centre, corrected for latitude.
  function ring(lng, lat, metres) {
    var pts = [], km = metres / 1000;
    var dx = km / (111.320 * Math.cos(lat * Math.PI / 180)), dy = km / 110.574;
    for (var i = 0; i < 64; i++) {
      var t = (i / 64) * 2 * Math.PI;
      pts.push([lng + dx * Math.cos(t), lat + dy * Math.sin(t)]);
    }
    pts.push(pts[0]);
    return { type: "Feature", geometry: { type: "Polygon", coordinates: [pts] } };
  }

  var marker;
  map.on("load", function () {
    map.addSource("ring", { type: "geojson", data: ring(LNG, LAT, R) });
    map.addLayer({ id: "ring-fill", type: "fill", source: "ring", paint: { "fill-color": "${BRAND_GREEN}", "fill-opacity": 0.14 } });
    map.addLayer({ id: "ring-line", type: "line", source: "ring", paint: { "line-color": "${BRAND_GREEN}", "line-width": 2 } });

    var el = document.createElement("div");
    el.className = "pin";
    el.innerHTML =
      '<svg width="46" height="58" viewBox="0 0 46 58" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' +
        '<defs>' +
          '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="#1a7a4c"/><stop offset="100%" stop-color="#0b3d2e"/>' +
          '</linearGradient>' +
          '<clipPath id="c"><circle cx="23" cy="22" r="13.5"/></clipPath>' +
        '</defs>' +
        // Body: a circle that tapers into a point at (23, 57).
        '<path d="M23 57C23 57 4 34.5 4 22a19 19 0 1 1 38 0c0 12.5-19 35-19 35z" fill="url(#g)" stroke="#ffffff" stroke-width="2.5"/>' +
        '<circle cx="23" cy="22" r="13.5" fill="#ffffff"/>' +
        '<image href="${LOGO_URI}" xlink:href="${LOGO_URI}" x="9.5" y="8.5" width="27" height="27" clip-path="url(#c)" preserveAspectRatio="xMidYMid meet"/>' +
      '</svg>';
    marker = new maplibregl.Marker({ element: el, anchor: "bottom", draggable: true }).setLngLat([LNG, LAT]).addTo(map);
    post({ type: "ready" });
    marker.on("drag", function () { var p = marker.getLngLat(); map.getSource("ring").setData(ring(p.lng, p.lat, R)); });
    marker.on("dragend", send);
  });

  // Tapping the map moves the pin too — dragging a 40px pin across a phone
  // screen is slow when the destination is already visible.
  map.on("click", function (e) {
    if (!marker) return;
    marker.setLngLat(e.lngLat);
    map.getSource("ring").setData(ring(e.lngLat.lng, e.lngLat.lat, R));
    send();
  });

  function send() {
    var p = marker.getLngLat();
    post({ type: "move", lat: p.lat, lng: p.lng });
  }

  // Called from RN when the radius chips change — no reload, no lost pan/zoom.
  window.setRadius = function (metres) {
    R = metres;
    var p = marker.getLngLat();
    map.getSource("ring").setData(ring(p.lng, p.lat, R));
  };
  var meMarker = null;
  window.setMe = function (lat, lng) {
    if (lat == null || lng == null) return;
    if (!meMarker) {
      var me = document.createElement("div");
      me.className = "me";
      meMarker = new maplibregl.Marker({ element: me }).setLngLat([lng, lat]).addTo(map);
    } else {
      meMarker.setLngLat([lng, lat]);
    }
  };
  window.setCenter = function (lat, lng) {
    marker.setLngLat([lng, lat]);
    map.getSource("ring").setData(ring(lng, lat, R));
    map.easeTo({ center: [lng, lat] });
  };
</script>
</body></html>`;

export function AreaMapPicker({ lat, lng, radiusM, onChange, me, height = 240 }: {
  lat: number;
  lng: number;
  radiusM: number;
  onChange: (lat: number, lng: number) => void;
  /** ตำแหน่งของเครื่อง — drawn as the blue dot; absent until it's been read. */
  me?: { lat: number; lng: number } | null;
  height?: number;
}) {
  const ref = useRef<WebViewType>(null);
  // Missing on a dev build that predates the package — the map degrades to the
  // coordinate fields instead of taking the app down at startup.
  const rnWebView = getWebView();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorText, setErrorText] = useState("");
  // The document is built ONCE — re-rendering it on every drag would reload the
  // map and throw away the user's pan/zoom. Later changes go in via injected JS.
  const source = useMemo(
    () => ({ html: html(lat, lng, radiusM), baseUrl: "https://tiles.openfreemap.org/" }),
    [],
  );

  // Radius chips push into the live map instead of rebuilding it.
  const lastRadius = useRef(radiusM);
  useEffect(() => {
    if (lastRadius.current === radiusM) return;
    lastRadius.current = radiusM;
    ref.current?.injectJavaScript(`window.setRadius && window.setRadius(${radiusM}); true;`);
  }, [radiusM]);

  // The device's own position — only after the map reports ready, since the
  // marker can't be added to a map that hasn't loaded its style yet.
  useEffect(() => {
    if (!me || status !== "ready") return;
    ref.current?.injectJavaScript(`window.setMe && window.setMe(${me.lat}, ${me.lng}); true;`);
  }, [me, status]);

  // Coordinates that arrive from OUTSIDE the map (address typed, postal code
  // picked) walk the pin over. Coordinates the map itself just reported are
  // recorded first, so they can't bounce back and fight the drag.
  const lastPin = useRef({ lat, lng });
  useEffect(() => {
    const moved = Math.abs(lastPin.current.lat - lat) > 1e-7 || Math.abs(lastPin.current.lng - lng) > 1e-7;
    if (!moved) return;
    lastPin.current = { lat, lng };
    ref.current?.injectJavaScript(`window.setCenter && window.setCenter(${lat}, ${lng}); true;`);
  }, [lat, lng]);

  if (Platform.OS === "web" || !rnWebView) {
    return (
      <View style={{ height, borderRadius: 18, backgroundColor: "#f1f3f1", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: TEXT_MUTED }}>
          {Platform.OS === "web" ? "แผนที่ใช้ได้บนมือถือ" : "แผนที่ยังไม่พร้อมใช้บนแอปตัวนี้"}
        </Text>
        <Text style={{ fontSize: 11.5, color: "#a3a3a3", textAlign: "center", lineHeight: 17 }}>
          {Platform.OS === "web" ? "บนเว็บให้กรอกพิกัดด้านล่างแทน" : "เปิดผ่าน Expo Go หรือ build ใหม่จาก Xcode แล้วแผนที่จะขึ้น · ระหว่างนี้กรอกพิกัดด้านล่างได้"}
        </Text>
      </View>
    );
  }

  const WebView = rnWebView.WebView;
  return (
    <View style={{ height, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: "#ececec" }}>
      <WebView
        ref={ref}
        source={source}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        // The map owns its gestures; the page itself must never scroll.
        scrollEnabled={false}
        onError={() => { setStatus("error"); setErrorText("เปิดหน้าแผนที่ไม่ได้"); }}
        onHttpError={(e) => { setStatus("error"); setErrorText(`โหลดแผนที่ไม่สำเร็จ (${e.nativeEvent.statusCode})`); }}
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === "ready") { setStatus("ready"); return; }
            if (msg.type === "error") { setStatus("error"); setErrorText(msg.message ?? ""); return; }
            if (msg.type === "move" && Number.isFinite(msg.lat) && Number.isFinite(msg.lng)) {
              lastPin.current = { lat: msg.lat, lng: msg.lng };
              onChange(msg.lat, msg.lng);
            }
          } catch {
            /* ignore anything that isn't ours */
          }
        }}
      />
      {status !== "ready" ? (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.55)", paddingVertical: 6, paddingHorizontal: 10 }}>
          <Text style={{ fontSize: 11, color: "#fff", textAlign: "center" }}>
            {status === "loading" ? "กำลังโหลดแผนที่…" : `แผนที่มีปัญหา: ${errorText}`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
