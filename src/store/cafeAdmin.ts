/**
 * Meta Cafe back-office state — the admin overlay for the café console.
 *
 * The café menu seed (data/cafeMenu.ts) is a frozen, require()-backed array, so
 * menu CRUD works like the shop catalog does (data/liveCatalog.ts): the seed is
 * immutable, and this store holds the admin's edits on top of it —
 * price/name/off overrides per item, brand-new custom items, and hidden
 * (deleted) seed ids. data/cafeAdminMenu.ts merges the two for the screens.
 *
 * Pure TS — no react-native, no assets — so it stays Vitest-runnable.
 */
import { createStore } from "./db";
import type { CafeMainId } from "../data/cafeMenu";

/** One selectable choice inside an option group (ราคาเพิ่มจากราคาขาย). */
export type CafeOptionChoice = { name: string; price: number };
/** ตัวเลือกเพิ่มเติม — e.g. ความหวาน / เพิ่มช็อตกาแฟ / นม / ท็อปปิ้ง. */
export type CafeOptionGroup = { name: string; choices: CafeOptionChoice[] };

/**
 * A group in the shared คลังตัวเลือกเพิ่มเติม — set up once, reused by every
 * menu item. Menus reference it by id (see CafeItemOptionRef) instead of
 * carrying their own copy, so editing ความหวาน here updates every drink.
 */
export type CafeOptionLibraryGroup = CafeOptionGroup & {
  id: string;
  /** subId ที่จะเปิดกลุ่มนี้ให้อัตโนมัติเมื่อสร้างเมนูใหม่ในหมวดนั้น. */
  autoFor: string[];
};

/**
 * How one menu item uses one library group: on/off, plus an optional
 * per-item `override` for the case where a menu needs the same heading with
 * different choices (เช่น ชาไทย ไม่มีนมโอ๊ต).
 */
export type CafeItemOptionRef = {
  groupId: string;
  on: boolean;
  /** Replaces the library group for this item only; absent = ใช้ค่าจากคลัง. */
  override?: CafeOptionGroup;
};

/** The starter library — the same three sets the web console ships with. */
export const DEFAULT_CAFE_OPTION_LIBRARY: CafeOptionLibraryGroup[] = [
  {
    id: "opt-sweet",
    name: "ความหวาน",
    autoFor: ["drink-coffee", "drink-milk", "drink-soda", "drink-tea"],
    choices: [
      { name: "0% (ไม่หวาน)", price: 0 },
      { name: "25% (หวานน้อยมาก)", price: 0 },
      { name: "50% (หวานน้อย)", price: 0 },
      { name: "75% (ค่อนข้างหวาน)", price: 0 },
      { name: "100% (ปกติ)", price: 0 },
      { name: "125% (หวานมาก)", price: 0 },
    ],
  },
  {
    id: "opt-shot",
    name: "เพิ่มช็อตกาแฟ",
    autoFor: ["drink-coffee"],
    choices: [
      { name: "+1 ช็อตกาแฟ", price: 15 },
      { name: "+2 ช็อตกาแฟ", price: 25 },
    ],
  },
  {
    id: "opt-milk",
    name: "นม",
    autoFor: ["drink-coffee", "drink-milk", "drink-tea"],
    choices: [
      { name: "นมสด", price: 0 },
      { name: "นมโอ้ต", price: 15 },
      { name: "นมถั่วเหลือง", price: 10 },
    ],
  },
  {
    id: "opt-topping",
    name: "ท็อปปิ้ง",
    autoFor: [],
    choices: [
      { name: "ไข่มุก", price: 10 },
      { name: "วิปครีม", price: 15 },
      { name: "เยลลี่", price: 10 },
    ],
  },
];

/** Display tags the storefront reads (ลดราคา is derived from fullPrice). */
export type CafeItemTag = "recommended" | "bestseller" | "new";

/** The full product record the back office edits — field-for-field parity with
 *  the Metaherb-Cafe web console's เพิ่มรายการสินค้า form. */
export type CafeItemFields = {
  name?: string;
  desc?: string;
  /** ราคาขาย. */
  price?: number;
  /** ต้นทุน. */
  cost?: number;
  /** ราคาเต็มก่อนลด — set above `price` to mark the item ลดราคา. */
  fullPrice?: number;
  /** ภาษี (%). */
  taxPct?: number;
  /** บาร์โค้ด. */
  barcode?: string;
  /** ควบคุมสินค้าคงคลัง — when true, `stockQty` is live. */
  trackStock?: boolean;
  /** สินค้าในคลัง. */
  stockQty?: number;
  tags?: CafeItemTag[];
  /** ตัวเลือกที่อ้างอิงคลังกลาง — เปิด/ปิด และปรับเฉพาะเมนูนี้ได้. */
  optionRefs?: CafeItemOptionRef[];
  /** กลุ่มตัวเลือกที่ใช้กับเมนูนี้เท่านั้น (ไม่เข้าไปอยู่ในคลัง). */
  extraGroups?: CafeOptionGroup[];
  /** Legacy — per-item copies from before the library existed; still read by
   *  resolveOptionGroups() when an item has no optionRefs. */
  optionGroups?: CafeOptionGroup[];
  /** Admin-picked photo (device uri) — overrides a seed item's bundled image. */
  imageUri?: string;
};

/** Per-item override; applies to seed AND custom items alike. */
export type CafeMenuEdit = CafeItemFields & {
  /** true = ปิดขาย (hidden from the customer menu + POS, kept in admin list). */
  off?: boolean;
};

/** An item the admin created — imageUri if a photo was picked, else rendered
 *  with the sub accent. */
export type CustomCafeItem = CafeItemFields & {
  id: string;
  name: string;
  desc: string;
  price: number;
  mainId: CafeMainId;
  subId: string;
};

// ── store hours & pickup (ตั้งค่าเวลาเปิด/ปิดร้าน + เวลารับสินค้า) ──
export type CafeDayId = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
/** "HH:mm" open/close; enabled=false = ร้านปิดวันนั้น. */
export type CafeDayHours = { open: string; close: string; enabled: boolean };

export const CAFE_DAYS: { id: CafeDayId; label: string }[] = [
  { id: "mon", label: "วันจันทร์" },
  { id: "tue", label: "วันอังคาร" },
  { id: "wed", label: "วันพุธ" },
  { id: "thu", label: "วันพฤหัสบดี" },
  { id: "fri", label: "วันศุกร์" },
  { id: "sat", label: "วันเสาร์" },
  { id: "sun", label: "วันอาทิตย์" },
];

export const DEFAULT_CAFE_HOURS: Record<CafeDayId, CafeDayHours> = {
  mon: { open: "08:00", close: "17:00", enabled: true },
  tue: { open: "08:00", close: "17:00", enabled: true },
  wed: { open: "08:00", close: "17:00", enabled: true },
  thu: { open: "08:00", close: "17:00", enabled: true },
  fri: { open: "08:00", close: "17:00", enabled: true },
  sat: { open: "09:00", close: "16:00", enabled: true },
  sun: { open: "09:00", close: "16:00", enabled: false },
};

/** ร้านรับเงินสดกับพร้อมเพย์เท่านั้น — ไม่มีเครื่องรูดบัตร/วอลเล็ตหน้าร้าน. */
export type CafePayChannelId = "cash" | "promptpay";

export const CAFE_PAY_CHANNELS: { id: CafePayChannelId; label: string; sub: string }[] = [
  { id: "cash", label: "เงินสด", sub: "รับชำระหน้าเคาน์เตอร์" },
  { id: "promptpay", label: "พร้อมเพย์ (QR)", sub: "สแกนจ่ายผ่านแอปธนาคาร" },
];

/**
 * ข้อมูลการเงินของร้าน — everything the POS needs to take money, and nothing
 * more.
 *
 * A PromptPay QR carries only the target id and the amount; which bank account
 * sits behind that id is between the shop and its bank. So no account number is
 * stored here — an unused bank field is a liability, not a feature.
 */
export type CafePayInfo = {
  /** เบอร์พร้อมเพย์ (10 หลัก) หรือเลขประจำตัวผู้เสียภาษี (13 หลัก). */
  promptPayId: string;
  /** ชื่อร้านที่จะโชว์บนแอปธนาคารของลูกค้าตอนสแกน. */
  merchantName: string;
};

export const DEFAULT_CAFE_PAY_INFO: CafePayInfo = {
  promptPayId: "0958896299",
  merchantName: "METAHERB STORE",
};

/** พร้อมเพย์รับได้ทั้งเบอร์มือถือและเลขประจำตัวผู้เสียภาษี — ต่างกันแค่จำนวนหลัก. */
export const isValidPromptPayId = (id: string): boolean => /^(\d{10}|\d{13})$/.test(id.replace(/\D/g, ""));

// ── storefront banners (จัดการ Banner หน้าร้าน) ────────────────
export type CafeBannerSlot = "recommended" | "new" | "general";

export const CAFE_BANNER_SLOTS: { id: CafeBannerSlot; label: string }[] = [
  { id: "recommended", label: "เมนูแนะนำวันนี้" },
  { id: "new", label: "เมนูมาใหม่" },
  { id: "general", label: "เมนูทั่วไป / เมนูลดราคา" },
];

export type CafeBanner = {
  id: string;
  /** ชื่อ Banner. */
  title: string;
  slot: CafeBannerSlot;
  /** ภาพประกอบ (device uri). */
  imageUri?: string;
  /** สถานะการใช้งาน. */
  enabled: boolean;
};

// ── พื้นที่ขาย (17.9) ──────────────────────────────────────────
/**
 * The shop's catchment: a circle on the map, plus the rules for when a customer
 * standing inside it gets the (already-built, fixed-copy) Meta Cafe banner.
 * One branch today — kept as a single object rather than a list, because a fake
 * array would only invite half-built multi-branch code.
 */
export type CafeArea = {
  name: string;
  /** จุดศูนย์กลางที่ใช้วัดระยะ. */
  lat: number;
  lng: number;
  /** รัศมีที่ถือว่า "อยู่ในพื้นที่" (เมตร) — a mall needs a wider ring than a kiosk. */
  radiusM: number;
  /**
   * ที่อยู่แบบเดียวกับฟอร์มเพิ่มที่อยู่ของลูกค้า (AddAddressScreen): a free-text
   * line for the door number, then the four administrative fields. Structured
   * rather than one string because ตำบล/อำเภอ/จังหวัด/ไปรษณีย์ have to match
   * each other, and the postal picker fills all four at once.
   *
   * The house-number line stays hand-typed — no Thai reverse-geocoder returns
   * it reliably, so the pin owns the coordinates and a person owns the door.
   */
  addressLine: string;
  subdistrict: string;
  district: string;
  province: string;
  zip: string;
  enabled: boolean;
  /** "shop" = only while the café is open (เวลาเปิด-ปิดร้าน); "always" = ตลอดเวลา. */
  activeHours: "shop" | "always";
};

export const DEFAULT_CAFE_AREA: CafeArea = {
  name: "Meta Cafe สาขาราษฎร์บูรณะ",
  lat: 13.6717,
  lng: 100.5043,
  radiusM: 500,
  addressLine: "เลขที่ 2 ชั้น 2 ซอยสุขสวัสดิ์ 33",
  subdistrict: "ราษฎร์บูรณะ",
  district: "ราษฎร์บูรณะ",
  province: "กรุงเทพมหานคร",
  zip: "10140",
  enabled: true,
  activeHours: "shop",
};

export type CafeAdminState = {
  edits: Record<string, CafeMenuEdit>;
  custom: CustomCafeItem[];
  /** Seed item ids the admin deleted. */
  hidden: string[];
  pay: Record<CafePayChannelId, boolean>;
  /** เวลาเปิด/ปิดร้าน รายวัน. */
  hours: Record<CafeDayId, CafeDayHours>;
  banners: CafeBanner[];
  /** คลังตัวเลือกเพิ่มเติม — ตั้งครั้งเดียว ใช้ได้ทุกเมนู. */
  optionLibrary: CafeOptionLibraryGroup[];
  /** ข้อมูลบัญชีรับเงิน. */
  payInfo: CafePayInfo;
  /** พื้นที่ขาย. */
  area: CafeArea;
};

const INITIAL: CafeAdminState = {
  edits: {},
  custom: [],
  hidden: [],
  pay: { cash: true, promptpay: true },
  payInfo: DEFAULT_CAFE_PAY_INFO,
  hours: DEFAULT_CAFE_HOURS,
  banners: [],
  optionLibrary: DEFAULT_CAFE_OPTION_LIBRARY,
  area: DEFAULT_CAFE_AREA,
};

/** Same-day persistence from an older shape may lack the newer keys — read
 *  hours/banners/optionLibrary through these instead of the raw state. */
export const cafeHours = (s: CafeAdminState = cafeAdminStore.get()): Record<CafeDayId, CafeDayHours> =>
  s.hours ?? DEFAULT_CAFE_HOURS;
export const cafeBanners = (s: CafeAdminState = cafeAdminStore.get()): CafeBanner[] => s.banners ?? [];
export const cafeOptionLibrary = (s: CafeAdminState = cafeAdminStore.get()): CafeOptionLibraryGroup[] =>
  s.optionLibrary ?? DEFAULT_CAFE_OPTION_LIBRARY;
export const cafePayInfo = (s: CafeAdminState = cafeAdminStore.get()): CafePayInfo => s.payInfo ?? DEFAULT_CAFE_PAY_INFO;
export const cafeArea = (s: CafeAdminState = cafeAdminStore.get()): CafeArea => s.area ?? DEFAULT_CAFE_AREA;
/** The one line a rider or customer reads. */
export const cafeAreaFullAddress = (a: CafeArea = cafeArea()): string =>
  [
    a.addressLine?.trim(),
    a.subdistrict ? `แขวง/ตำบล${a.subdistrict}` : "",
    a.district ? `เขต/อำเภอ${a.district}` : "",
    a.province?.trim(),
    a.zip?.trim(),
  ]
    .filter(Boolean)
    .join(" ");

export const cafeAdminStore = createStore<CafeAdminState>(INITIAL, { persistKey: "mh.cafeAdmin" });

// ── menu writes ────────────────────────────────────────────────
export function editCafeMenuItem(id: string, patch: CafeMenuEdit): void {
  cafeAdminStore.set((s) => ({ ...s, edits: { ...s.edits, [id]: { ...s.edits[id], ...patch } } }));
}

export const setCafeItemOff = (id: string, off: boolean): void => editCafeMenuItem(id, { off });

let customSeq = 0;
export function addCafeMenuItem(input: Omit<CustomCafeItem, "id">): CustomCafeItem {
  customSeq += 1;
  const item: CustomCafeItem = { ...input, id: `custom-${Date.now()}-${customSeq}` };
  cafeAdminStore.set((s) => ({ ...s, custom: [item, ...s.custom] }));
  return item;
}

/** Custom items are removed outright; seed items can only be hidden. */
export function deleteCafeMenuItem(id: string): void {
  cafeAdminStore.set((s) => {
    const edits = { ...s.edits };
    delete edits[id];
    return s.custom.some((c) => c.id === id)
      ? { ...s, edits, custom: s.custom.filter((c) => c.id !== id) }
      : { ...s, edits, hidden: s.hidden.includes(id) ? s.hidden : [...s.hidden, id] };
  });
}

// ── option resolution (คลัง + สวิตช์รายเมนู) ─────────────────────
/**
 * ตัวเลือกเพิ่มเติมของเมนูหนึ่ง = คลังตัวเลือก + สวิตช์รายเมนู.
 *
 * The admin sets each group up once in the library, and a menu only records
 * which of them are on (`optionRefs`) — so a menu created today inherits
 * ความหวาน/นม for its category with no setup, and editing the library later
 * flows into every menu that didn't override it.
 *
 * Returns one ref per library group, in library order, merged with whatever the
 * item has saved; a group the item has never seen falls back to `autoFor`.
 */
export function itemOptionRefs(
  item: { subId: string; optionRefs?: CafeItemOptionRef[] },
  library: CafeOptionLibraryGroup[] = cafeOptionLibrary(),
): CafeItemOptionRef[] {
  const saved = new Map((item.optionRefs ?? []).map((r) => [r.groupId, r]));
  return library.map((g) => saved.get(g.id) ?? { groupId: g.id, on: g.autoFor.includes(item.subId) });
}

/** The groups this menu actually shows the customer: library + menu-only ones. */
export function resolveOptionGroups(
  item: { subId: string; optionRefs?: CafeItemOptionRef[]; extraGroups?: CafeOptionGroup[]; optionGroups?: CafeOptionGroup[] },
  library: CafeOptionLibraryGroup[] = cafeOptionLibrary(),
): CafeOptionGroup[] {
  // Items saved before the library existed kept their own copies — honour those.
  if (!item.optionRefs && item.optionGroups) return item.optionGroups;
  const fromLibrary = itemOptionRefs(item, library)
    .filter((r) => r.on)
    .map((r) => r.override ?? library.find((g) => g.id === r.groupId))
    .filter((g): g is CafeOptionGroup => !!g)
    .map((g) => ({ name: g.name, choices: g.choices }));
  return [...fromLibrary, ...(item.extraGroups ?? [])];
}

// ── option-library writes (คลังตัวเลือกเพิ่มเติม) ────────────────
let optionSeq = 0;
export function addCafeOptionGroup(input: Omit<CafeOptionLibraryGroup, "id">): CafeOptionLibraryGroup {
  optionSeq += 1;
  const group: CafeOptionLibraryGroup = { ...input, id: `opt-${Date.now()}-${optionSeq}` };
  cafeAdminStore.set((s) => ({ ...s, optionLibrary: [...cafeOptionLibrary(s), group] }));
  return group;
}

export function editCafeOptionGroup(id: string, patch: Partial<Omit<CafeOptionLibraryGroup, "id">>): void {
  cafeAdminStore.set((s) => ({
    ...s,
    optionLibrary: cafeOptionLibrary(s).map((g) => (g.id === id ? { ...g, ...patch } : g)),
  }));
}

/**
 * Removing a library group also drops it from every menu that referenced it —
 * items keep only refs the library still has, so a deleted heading can't linger
 * on the storefront.
 */
export function deleteCafeOptionGroup(id: string): void {
  cafeAdminStore.set((s) => {
    const edits: Record<string, CafeMenuEdit> = {};
    for (const [itemId, e] of Object.entries(s.edits)) {
      edits[itemId] = e.optionRefs ? { ...e, optionRefs: e.optionRefs.filter((r) => r.groupId !== id) } : e;
    }
    return {
      ...s,
      edits,
      custom: s.custom.map((c) =>
        c.optionRefs ? { ...c, optionRefs: c.optionRefs.filter((r) => r.groupId !== id) } : c,
      ),
      optionLibrary: cafeOptionLibrary(s).filter((g) => g.id !== id),
    };
  });
}

// ── พื้นที่ขาย ─────────────────────────────────────────────────
export function setCafeArea(patch: Partial<CafeArea>): void {
  cafeAdminStore.set((s) => ({ ...s, area: { ...cafeArea(s), ...patch } }));
}

/**
 * ลูกค้าอยู่ในรัศมีร้านไหม — haversine, metres. Pure so the customer side can
 * feed it a GPS reading and the rule stays testable without a device.
 */
export function isInsideCafeArea(lat: number, lng: number, a: CafeArea = cafeArea()): boolean {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat - a.lat);
  const dLng = rad(lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h)) <= a.radiusM;
}

/**
 * Should the Meta Cafe banner sit on the customer's home screen right now?
 *
 * It's a card in the page, not a popup, so there is nothing to rate-limit: a
 * customer inside the ring simply sees the shop. Pure, so the rule is testable.
 */
export function cafeAreaBannerVisible(
  s: CafeAdminState = cafeAdminStore.get(),
  now = Date.now(),
  /** Whether the customer is standing inside the ring — see isInsideCafeArea. */
  inside = false,
): boolean {
  const a = cafeArea(s);
  if (!a.enabled || !inside) return false;
  if (a.activeHours !== "shop") return true;

  const days: CafeDayId[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const d = new Date(now);
  const h = cafeHours(s)[days[d.getDay()]];
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return h.enabled && hm >= h.open && hm < h.close;
}

// ── payment-channel writes ─────────────────────────────────────
export function setCafePayInfo(patch: Partial<CafePayInfo>): void {
  cafeAdminStore.set((s) => ({ ...s, payInfo: { ...cafePayInfo(s), ...patch } }));
}

/** Returns false (and leaves state alone) if this would disable every channel. */
export function setCafePayChannel(id: CafePayChannelId, on: boolean): boolean {
  const s = cafeAdminStore.get();
  if (!on && Object.entries(s.pay).filter(([k, v]) => v && k !== id).length === 0) return false;
  cafeAdminStore.set((prev) => ({ ...prev, pay: { ...prev.pay, [id]: on } }));
  return true;
}

// ── banner writes ──────────────────────────────────────────────
let bannerSeq = 0;
export function addCafeBanner(input: Omit<CafeBanner, "id">): CafeBanner {
  bannerSeq += 1;
  const banner: CafeBanner = { ...input, id: `banner-${Date.now()}-${bannerSeq}` };
  cafeAdminStore.set((s) => ({ ...s, banners: [banner, ...cafeBanners(s)] }));
  return banner;
}

export function editCafeBanner(id: string, patch: Partial<Omit<CafeBanner, "id">>): void {
  cafeAdminStore.set((s) => ({
    ...s,
    banners: cafeBanners(s).map((b) => (b.id === id ? { ...b, ...patch } : b)),
  }));
}

export function deleteCafeBanner(id: string): void {
  cafeAdminStore.set((s) => ({ ...s, banners: cafeBanners(s).filter((b) => b.id !== id) }));
}

// ── store-hours writes ─────────────────────────────────────────
export function setCafeDayHours(day: CafeDayId, patch: Partial<CafeDayHours>): void {
  cafeAdminStore.set((s) => {
    const hours = s.hours ?? DEFAULT_CAFE_HOURS;
    return { ...s, hours: { ...hours, [day]: { ...hours[day], ...patch } } };
  });
}

/** Test helper. */
export function __resetCafeAdmin(): void {
  cafeAdminStore.reset(INITIAL);
}
