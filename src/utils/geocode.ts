/**
 * พิกัด → ที่อยู่ (reverse geocoding).
 *
 * Two free OpenStreetMap-backed providers, tried in order:
 *
 *   1. Photon (komoot) — no API key, no User-Agent policy, and it answers with
 *      ถนน/แขวง/เขต/จังหวัด/ไปรษณีย์ already split into fields. Primary because
 *      Nominatim refuses requests whose User-Agent it doesn't like, which a
 *      mobile app cannot always control.
 *   2. Nominatim — the fallback, same data, stricter access rules.
 *
 * Neither returns บ้านเลขที่ in Thailand (OSM barely has house numbers here), so
 * the form keeps a hand-typed line for that. When street-level stops being good
 * enough, swap in Longdo's /services/address — their free tier covers 100k
 * lookups a month and nothing else in the app has to change.
 */
import { POSTAL_CODES } from "../data/thaiPostalCodes";

const PHOTON = "https://photon.komoot.io/reverse";
const PHOTON_SEARCH = "https://photon.komoot.io/api";

/**
 * Longdo Map — the best Thai address data available for free, but it needs a
 * key. Sign up at https://api.longdo.com/console/ (free tier: 100,000 service
 * calls a month, 5,000 a day) and paste the key here; both lookups switch over
 * automatically and fall back to Photon if Longdo is unreachable.
 *
 * Left empty on purpose so the app works with no account at all.
 */
const LONGDO_KEY = "";
const LONGDO_ADDRESS = "https://api.longdo.com/map/services/address";
const LONGDO_SEARCH = "https://search.longdo.com/mapsearch/json/search";
const NOMINATIM = "https://nominatim.openstreetmap.org/reverse";

type NominatimAddress = {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  quarter?: string;
  suburb?: string;
  city_district?: string;
  district?: string;
  town?: string;
  city?: string;
  province?: string;
  state?: string;
  postcode?: string;
};

/** What the address form can fill in from a pin. */
export type GeoAddress = {
  /** ซอย/ถนน — goes in front of whatever the admin typed for the door number. */
  road: string;
  subdistrict: string;
  district: string;
  province: string;
  zip: string;
};

// Nominatim returns the level names with their prefixes ("แขวงราษฎร์บูรณะ"),
// but the form's fields are already labelled ตำบล/แขวง and อำเภอ/เขต.
const strip = (v = ""): string => v.replace(/^(แขวง|ตำบล|เขต|อำเภอ|จังหวัด)\s*/, "").trim();

/**
 * Nominatim often omits the postcode. The app already ships a ตำบล→ไปรษณีย์
 * table for the address form, so fall back to that before giving up.
 */
function zipFor(subdistrict: string, district: string): string {
  const hit = POSTAL_CODES.find(
    (p) => p.subdistrict === subdistrict && (!district || p.district === district),
  ) ?? POSTAL_CODES.find((p) => p.subdistrict === subdistrict);
  return hit?.zip ?? "";
}

/** Longdo answers with the Thai address levels already named. */
async function viaLongdo(lat: number, lng: number): Promise<GeoAddress | null> {
  if (!LONGDO_KEY) return null;
  const res = await fetch(`${LONGDO_ADDRESS}?lon=${lng}&lat=${lat}&key=${LONGDO_KEY}`);
  if (!res.ok) return null;
  const a = (await res.json()) as Record<string, string | undefined>;
  const subdistrict = strip(a.subdistrict ?? "");
  const district = strip(a.district ?? "");
  if (!subdistrict && !district && !a.province) return null;
  return {
    road: (a.road ?? a.aoi ?? "").trim(),
    subdistrict,
    district,
    province: strip(a.province ?? ""),
    zip: (a.postcode ?? "").trim() || zipFor(subdistrict, district),
  };
}

/** Photon returns one GeoJSON feature whose properties are already split. */
async function viaPhoton(lat: number, lng: number): Promise<GeoAddress | null> {
  const res = await fetch(`${PHOTON}?lat=${lat}&lon=${lng}&lang=default`);
  if (!res.ok) return null;
  const json = (await res.json()) as {
    features?: { properties?: Record<string, string> }[];
  };
  const p = json.features?.[0]?.properties;
  if (!p) return null;
  const subdistrict = strip(p.locality ?? p.district ?? "");
  const district = strip(p.district ?? p.city ?? "");
  return {
    road: (p.street ?? (p.osm_key === "highway" ? p.name : "") ?? "").trim(),
    subdistrict,
    district,
    province: strip(p.state ?? p.city ?? ""),
    zip: (p.postcode ?? "").trim() || zipFor(subdistrict, district),
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<GeoAddress | null> {
  try {
    const longdo = await viaLongdo(lat, lng);
    if (longdo) return longdo;
  } catch {
    // fall through to the keyless providers
  }
  try {
    const photon = await viaPhoton(lat, lng);
    if (photon && (photon.subdistrict || photon.district || photon.province)) return photon;
  } catch {
    // fall through to Nominatim
  }
  try {
    const url = `${NOMINATIM}?format=jsonv2&zoom=18&accept-language=th&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, {
      headers: {
        // Nominatim's policy requires an identifying User-Agent; requests
        // without one get refused.
        "User-Agent": "MetaherbMobile/1.0 (admin sales-area picker)",
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { address?: NominatimAddress };
    const a = json.address;
    if (!a) return null;
    const subdistrict = strip(a.neighbourhood ?? a.quarter ?? a.suburb);
    const district = strip(a.city_district ?? a.district ?? a.suburb);
    return {
      road: (a.road ?? "").trim(),
      subdistrict,
      district,
      province: strip(a.province ?? a.state ?? a.city ?? a.town),
      zip: (a.postcode ?? "").trim() || zipFor(subdistrict, district),
    };
  } catch {
    // Offline or rate-limited — the admin can always type the address by hand.
    return null;
  }
}

/**
 * ที่อยู่ → พิกัด. Used to walk the map pin over when the address is typed or
 * picked from the postal list, so the two halves of the form never disagree.
 * `near` biases the search to the pin's current neighbourhood — "ราษฎร์บูรณะ"
 * exists in more than one province.
 */
export async function forwardGeocode(
  query: string,
  near?: { lat: number; lng: number },
): Promise<{ lat: number; lng: number } | null> {
  const q = query.trim();
  if (!q) return null;
  if (LONGDO_KEY) {
    try {
      const res = await fetch(`${LONGDO_SEARCH}?keyword=${encodeURIComponent(q)}&limit=1&key=${LONGDO_KEY}`);
      if (res.ok) {
        const json = (await res.json()) as { data?: { lat?: number; lon?: number }[] };
        const hit = json.data?.[0];
        if (hit && Number.isFinite(hit.lat) && Number.isFinite(hit.lon)) {
          return { lat: hit.lat as number, lng: hit.lon as number };
        }
      }
    } catch {
      // fall through to Photon
    }
  }
  try {
    const bias = near ? `&lat=${near.lat}&lon=${near.lng}` : "";
    const res = await fetch(`${PHOTON_SEARCH}?q=${encodeURIComponent(q)}&limit=1&lang=default${bias}`);
    if (!res.ok) return null;
    const json = (await res.json()) as { features?: { geometry?: { coordinates?: number[] } }[] };
    const c = json.features?.[0]?.geometry?.coordinates;
    if (!c || c.length < 2) return null;
    const [lng, lat] = c;
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  } catch {
    return null;
  }
}
