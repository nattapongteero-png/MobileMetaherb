import type { ProductImage } from "../types/Product";

export type VariantItem = {
  id: string;
  label: string;
  /** Override fields for the variant (e.g. flavour image/name); synthetic ids
   *  inherit the rest from the group's primary product. */
  custom?: {
    name?: string;
    price?: number;
    originalPrice?: number;
    discountPercent?: number;
    image?: ProductImage;
  };
};

export type VariantGroup = {
  /** Generic name shown on the merged card + the default detail state. */
  name: string;
  /** Optional distinct cover photo; else the first (cheapest) variant's photo is used. */
  cover?: ProductImage;
  /** Variant SKUs, cheapest first — the first id represents the merged card. */
  items: VariantItem[];
  /** Extra product ids to hide from lists (consolidated but not shown as an option). */
  hide?: string[];
};

const COFFEE_COVER = require("../../assets/products/catalog/coffe.png") as ProductImage;
const JUICE_COVER = require("../../assets/products/catalog/juice-cover.png") as ProductImage;
const JUICE_FRESH = require("../../assets/products/catalog/juice-fresh.png") as ProductImage;
const JUICE_KALE = require("../../assets/products/catalog/juice-kale.png") as ProductImage;
const JUICE_BEETROOT = require("../../assets/products/catalog/juice-beetroot.png") as ProductImage;
const JUICE_BERRY = require("../../assets/products/catalog/juice-berry.png") as ProductImage;
const REED_GIFTBOX = require("../../assets/products/catalog/reed-giftbox.png") as ProductImage;
const REED_BOTANICAL = require("../../assets/products/catalog/reed-botanical.png") as ProductImage;
const REED_DUO = require("../../assets/products/catalog/reed-duo.png") as ProductImage;
const AROMATIC_BLUE = require("../../assets/products/catalog/meta-herb-blue-balm.png") as ProductImage;
const AROMATIC_ORANGE = require("../../assets/products/catalog/meta-serum-product.png") as ProductImage;
const AROMATIC_DUO = require("../../assets/products/catalog/metaherb-duo-jars.png") as ProductImage;
const ESSENCE_COVER = require("../../assets/products/catalog/miss-herb-fragrance-duo.png") as ProductImage;
const GIFT_COVER = require("../../assets/products/catalog/holiday-gift-set.png") as ProductImage;
const GIFT_RED = require("../../assets/products/catalog/metaherb-gift-box-and-pouch.png") as ProductImage;
const GIFT_GREEN = require("../../assets/products/catalog/metaherb-packaging-set.png") as ProductImage;
const HONEY_COVER = require("../../assets/products/catalog/honey-lemon-lineup.png") as ProductImage;
const HONEY_250 = require("../../assets/products/catalog/honey-lemon-product-shot.png") as ProductImage;
const HONEY_350 = require("../../assets/products/catalog/honey-lemon-jar-product.png") as ProductImage;
const HONEY_550 = require("../../assets/products/catalog/honey-lemon-jar-550ml.png") as ProductImage;
const CINNAMON_TIN = require("../../assets/products/catalog/mint-tin-cinnamon.png") as ProductImage;
const CINNAMON_TINS = require("../../assets/products/catalog/cinnamon-tins.png") as ProductImage;
const CINNAMON_POWDER = require("../../assets/products/catalog/cinnamon-powder.png") as ProductImage;
const GIFT20_COVER = require("../../assets/products/catalog/gift20-3.png") as ProductImage;
const GIFT20_RED = require("../../assets/products/catalog/gift20-1.png") as ProductImage;
const GIFT20_GREEN = require("../../assets/products/catalog/gift20-2.png") as ProductImage;
const GIFT_JUSTFORYOU = require("../../assets/products/catalog/product-gift-hamper.png") as ProductImage;
const GIFT25_COVER = require("../../assets/products/catalog/giftset-cover.png") as ProductImage;
const GIFT25_A = require("../../assets/products/catalog/giftset-a.png") as ProductImage;
const GIFT25_B = require("../../assets/products/catalog/giftset-b.png") as ProductImage;
const OOLONG_1 = require("../../assets/products/catalog/oolong-tea-1.png") as ProductImage;
const OOLONG_2 = require("../../assets/products/catalog/oolong-tea-2.png") as ProductImage;
const AMERICANO_1 = require("../../assets/products/catalog/americano-iced-1.png") as ProductImage;
const AMERICANO_2 = require("../../assets/products/catalog/americano-iced-2.png") as ProductImage;

// "Same product, different SKU" groups — merged into one card + one detail page
// with selectable options. Items are ordered cheapest first so the card /
// default state shows the lowest price.
export const VARIANT_GROUPS: VariantGroup[] = [
  {
    name: "กาแฟดริป Signature Blend",
    cover: COFFEE_COVER,
    items: [
      { id: "3", label: "Medium Roast" },
      { id: "4", label: "Dark Roast" },
    ],
  },
  {
    // น้ำผึ้งมะนาว — one product, three jar sizes (id 1/2/18).
    name: "น้ำผึ้งมะนาว Honey Lemon",
    cover: HONEY_COVER,
    items: [
      { id: "1", label: "250 ml", custom: { name: "น้ำผึ้งมะนาว Honey Lemon 250 ml", image: HONEY_250 } },
      { id: "2", label: "350 ml", custom: { name: "น้ำผึ้งมะนาว Honey Lemon 350 ml", image: HONEY_350 } },
      { id: "18", label: "550 ml", custom: { name: "น้ำผึ้งมะนาว Honey Lemon 550 ml", image: HONEY_550 } },
    ],
  },
  {
    // ยาดมสมุนไพรหอม — blue (original) jar, orange jar, and a duo set.
    name: "เมต้าเฮิร์บ สมุนไพรหอม (ยาดม)",
    cover: AROMATIC_DUO,
    items: [
      { id: "11", label: "กลิ่นส้ม (Orange)", custom: { image: AROMATIC_ORANGE } },
      { id: "10", label: "กลิ่นต้นตำรับ", custom: { image: AROMATIC_BLUE } },
      {
        id: "aromatic-duo",
        label: "เซ็ตคู่ (2 กลิ่น)",
        custom: { name: "เมต้าเฮิร์บ สมุนไพรหอม เซ็ตคู่ (2 กลิ่น)", price: 449, originalPrice: 548, discountPercent: 18, image: AROMATIC_DUO },
      },
    ],
    hide: ["5"], // เมต้าเฮิร์บ สมุนไพรหอม พิมเสนน้ำ — near-duplicate jar, removed from the list
  },
  {
    // น้ำผักผลไม้สด — one product, four cold-pressed flavours (id 9 is the carrier).
    name: "น้ำผักผลไม้สด Cold-Pressed",
    cover: JUICE_COVER,
    items: [
      { id: "9", label: "ผักผลไม้รวม", custom: { name: "น้ำผักผลไม้สด (ผักผลไม้รวม)", image: JUICE_FRESH } },
      { id: "juice-kale", label: "เคล & ผัก", custom: { name: "น้ำเคล & ผักสด", image: JUICE_KALE } },
      { id: "juice-beetroot", label: "บีทรูท", custom: { name: "น้ำบีทรูท & ผัก", image: JUICE_BEETROOT } },
      { id: "juice-berry", label: "มิกซ์เบอร์รี่", custom: { name: "น้ำมิกซ์เบอร์รี่", image: JUICE_BERRY } },
    ],
  },
  {
    // น้ำหอมพิมเสนน้ำ — sold as a red (Rose) bottle, a blue (พิมเสนน้ำ) bottle, and a duo set.
    name: "Meta Herb Essence พิมเสนน้ำ",
    cover: ESSENCE_COVER,
    items: [
      { id: "33", label: "กลิ่นโรส (Rose)" },
      { id: "29", label: "กลิ่นพิมเสนน้ำ" },
      { id: "43", label: "เซ็ตคู่ (2 กลิ่น)" },
    ],
    hide: ["22"], // the other duo SKU — consolidated into the set option
  },
  {
    // Reed Diffuser — one product, two scents + a duo set (id 42 is the carrier).
    name: "Reed Diffuser ก้านไม้กระจายกลิ่น",
    cover: REED_DUO,
    items: [
      { id: "42", label: "กลิ่นโรส & วานิลลา", custom: { image: REED_GIFTBOX } },
      { id: "reed-botanical", label: "Botanical (กลิ่นสมุนไพร)", custom: { name: "Reed Diffuser Botanical", image: REED_BOTANICAL } },
      {
        id: "reed-duo",
        label: "เซ็ตคู่ (2 กลิ่น)",
        custom: { name: "Reed Diffuser เซ็ตคู่ (2 กลิ่น)", price: 649, originalPrice: 990, discountPercent: 34, image: REED_DUO },
      },
    ],
  },
  {
    // ชุดของขวัญ กาแฟ + ถุงหอม (Happy New Year) — same set in a red or green tone.
    name: "ชุดของขวัญ Happy New Year (กาแฟ + ถุงหอม)",
    cover: GIFT20_COVER,
    items: [
      { id: "20", label: "โทนแดง", custom: { image: GIFT20_RED } },
      { id: "gift20-green", label: "โทนเขียว", custom: { name: "ชุดของขวัญ Happy New Year (กาแฟ + ถุงหอม) โทนเขียว", image: GIFT20_GREEN } },
    ],
    hide: ["21"], // Happy New Year (Premium) — duplicate Happy New Year basket
  },
  {
    // ชุดของขวัญ + ถุงผ้าหอม METAHERB — same set in a red or green tone.
    name: "ชุดของขวัญ ถุงหอม METAHERB",
    cover: GIFT_COVER,
    items: [
      { id: "24", label: "กลิ่นกุหลาบ (Rose)", custom: { image: GIFT_RED } },
      { id: "giftpouch-green", label: "กลิ่นตะไคร้หอม (Lemongrass)", custom: { name: "ชุดของขวัญ ถุงหอม METAHERB (กลิ่นตะไคร้หอม)", image: GIFT_GREEN } },
    ],
    hide: ["19"], // Bloom Essence Gift Set — duplicate of the scented-pouch set
  },
  {
    // ชุดของขวัญ กาแฟ + Butter Cookies — Set A (coffee+cookies) or Set B (+oolong tea).
    name: "ชุดของขวัญกาแฟดริป + Butter Cookies",
    cover: GIFT25_COVER,
    items: [
      { id: "25", label: "เซ็ต A (กาแฟ + คุกกี้)", custom: { image: GIFT25_A } },
      {
        id: "26", // id 26 (Happy New Year Premium) consolidated as เซ็ต B
        label: "เซ็ต B (กาแฟ + คุกกี้ + ชาอู๋หลง)",
        custom: { name: "ชุดของขวัญ เซ็ต B (กาแฟ + คุกกี้ + ชาอู๋หลง)", price: 195, originalPrice: 260, discountPercent: 25, image: GIFT25_B },
      },
    ],
    hide: ["41"], // เซตของขวัญ Butter Cookies คู่ — duplicate cookies gift set
  },
];

/** id → its variant group (for every variant id in every group). */
export const GROUP_BY_ID: Record<string, VariantGroup> = {};
for (const g of VARIANT_GROUPS) {
  for (const it of g.items) GROUP_BY_ID[it.id] = g;
}

/** Ids merged into a group's card and hidden from lists (non-primary items + `hide`). */
/** Ready-to-eat / ready-to-drink café items removed from the catalog. */
export const REMOVED_IDS = ["6", "7", "12", "13", "14", "15", "16", "17", "27", "28", "40"];

export const MERGED_AWAY_IDS = new Set<string>([
  ...VARIANT_GROUPS.flatMap((g) => g.items.slice(1).map((it) => it.id)),
  ...VARIANT_GROUPS.flatMap((g) => g.hide ?? []),
  "31", // ผงอบเชย เซต 2 กล่อง — รวมเป็นสินค้าผงอบเชยตัวเดียว (id 8)
  ...REMOVED_IDS,
]);

/** Swap a product's catalog photo without making it a variant (card image). */
export const IMAGE_OVERRIDE: Record<string, ProductImage> = {
  "8": CINNAMON_TINS, // ผงอบเชย — cover = 3 jars
  "23": GIFT_JUSTFORYOU, // ชุดของขวัญ Just For You
  "44": OOLONG_1, // ชาอู๋หลงผสมดอกหอมหมื่นลี้
  "45": AMERICANO_1, // กาแฟดริป Signature อเมริกาโนเย็น
};

/** Extra gallery photos for a no-variant product (multiple shots, no option pills). */
export const GALLERY_OVERRIDE: Record<string, ProductImage[]> = {
  "8": [CINNAMON_TINS, CINNAMON_TIN, CINNAMON_POWDER],
  "44": [OOLONG_1, OOLONG_2],
  "45": [AMERICANO_1, AMERICANO_2],
};

/** Products sold at a single price — no option picker at all. */
export const NO_OPTIONS = new Set<string>(["8", "23"]);
