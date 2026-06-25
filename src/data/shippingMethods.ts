import type { ImageSourcePropType } from "react-native";

export type ShippingMethod = {
  id: string;
  name: string;
  /** Delivery-time line shown under the name. */
  desc: string;
  /** Shipping fee in THB; 0 renders as "ฟรี". */
  price: number;
  /** Real carrier logo — shown when present, else the code/lightning fallback. */
  image?: ImageSourcePropType;
  /** Short brand text shown in the badge box when there's no logo. */
  code?: string;
  /** Express same-day option — renders a lightning badge + "ด่วน" tag. */
  express?: boolean;
  /** Self pickup at the store — renders a store badge, no delivery address. */
  pickup?: boolean;
};

export const SHIPPING_METHODS: ShippingMethod[] = [
  { id: "flash", name: "Flash Express", desc: "ได้รับภายใน 2-3 วันทำการ", price: 0, code: "Flash" },
  { id: "jnt", name: "J&T Express", desc: "ได้รับภายใน 2-3 วันทำการ", price: 0, code: "J&T" },
  { id: "sameday", name: "ส่งด่วนภายในวัน", desc: "ได้รับวันนี้ ภายใน 2-4 ชม.", price: 60, express: true },
  { id: "pickup", name: "รับเองที่ร้านค้า", desc: "รับที่หน้าร้าน METAHERB Store (9:00–18:00)", price: 0, pickup: true },
];

export const DEFAULT_SHIPPING_ID = "jnt";
