// Per-product usage classification for the เมต้า assistant — prevents it from
// telling a customer to EAT something that is inhale/topical only (aroma oils,
// พิมเสน, การบูร, Reed Diffuser). Drafted + adversarially safety-verified by an
// LLM panel (see product-edibility-classify workflow). SAFETY-CRITICAL: a wrong
// "eat" could tell someone to ingest camphor — do not loosen these by hand.
//
//   eat      = ทานได้ (กิน/ดื่ม/ปรุงอาหาร)
//   external = ใช้ภายนอกเท่านั้น (สูดดม/ทา/กระจายกลิ่น) ห้ามรับประทาน
//   mixed    = ชุด/เซตที่มีทั้งของทานได้และของใช้ภายนอกปนกัน

export type ProductUsage = "eat" | "external" | "mixed";

export const PRODUCT_USAGE: Record<string, { usage: ProductUsage; note: string }> = {
  "1": { usage: "eat", note: "น้ำผึ้งมะนาว ชงกับน้ำอุ่น/น้ำเย็นดื่มได้" },
  "2": { usage: "eat", note: "น้ำผึ้งมะนาวพรีเมียม ชงดื่มได้" },
  "3": { usage: "eat", note: "กาแฟดริป Medium Roast ชงดื่มได้" },
  "4": { usage: "eat", note: "กาแฟดริป Dark Roast ชงดื่มได้" },
  "5": { usage: "external", note: "พิมเสนน้ำ ใช้สูดดม/ทาภายนอกเท่านั้น ห้ามรับประทาน" },
  "6": { usage: "eat", note: "กระวานแห้งแท้ ใช้ปรุงอาหาร/ชงดื่มได้" },
  "7": { usage: "eat", note: "อบเชยแท่ง Alba ใช้ปรุงอาหาร/ชงดื่มได้" },
  "8": { usage: "eat", note: "ผงอบเชย ใช้ปรุงอาหาร/ชงดื่มได้" },
  "9": { usage: "eat", note: "น้ำผักผลไม้สด ดื่มได้" },
  "10": { usage: "external", note: "สมุนไพรหอม Aromatic ใช้สูดดม/แขวนหอม ห้ามรับประทาน" },
  "11": { usage: "external", note: "สมุนไพรหอม Aromatic (Orange) ใช้สูดดม/แขวนหอม ห้ามรับประทาน" },
  "12": { usage: "eat", note: "ครอฟเฟิล ทานได้" },
  "13": { usage: "eat", note: "โดนัท ทานได้" },
  "14": { usage: "eat", note: "มัฟฟินช็อกโกแลต ทานได้" },
  "15": { usage: "eat", note: "ทาร์ตไข่ ทานได้" },
  "16": { usage: "eat", note: "วุ้นมะพร้าวอัญชัน ทานได้" },
  "17": { usage: "eat", note: "บราวนี่ช็อกโกแลต ทานได้" },
  "18": { usage: "eat", note: "น้ำผึ้งมะนาวโถใหญ่ ชงดื่มได้" },
  "19": { usage: "external", note: "เซตของหอม Essence/ถุงหอม ใช้สูดดม/วางกระจายกลิ่น ห้ามรับประทาน" },
  "20": { usage: "mixed", note: "เซตผสม: กาแฟทานได้ ส่วนถุงหอม/Essence ใช้ภายนอกเท่านั้น แยกใช้ให้ถูก" },
  "21": { usage: "mixed", note: "เซตของขวัญ Premium มีทั้งกาแฟ (ทานได้) และของหอม (ใช้ภายนอก) แยกใช้ให้ถูก" },
  "22": { usage: "external", note: "Essence Rose + พิมเสนน้ำ ใช้สูดดม/ทาภายนอก ห้ามรับประทาน" },
  "23": { usage: "mixed", note: "เซตของขวัญไม่ระบุเนื้อหาชัด อาจมีของใช้ภายนอกปน โปรดตรวจก่อนรับประทาน" },
  "24": { usage: "mixed", note: "เซตของขวัญไม่ระบุเนื้อหาชัด อาจมีของใช้ภายนอกปน โปรดตรวจก่อนรับประทาน" },
  "25": { usage: "eat", note: "เซตกาแฟ + Butter Cookies (บางเซ็ตมีชาอู๋หลง) ทานได้ทั้งหมด" },
  "26": { usage: "mixed", note: "เซตของขวัญ Premium 3 ชิ้น มีทั้งของทานได้และของหอมใช้ภายนอก แยกใช้ให้ถูก" },
  "27": { usage: "eat", note: "อเมริกาโน่มะพร้าว ดื่มได้" },
  "28": { usage: "eat", note: "โดนัทกล้วยช็อกโกแลต ทานได้" },
  "29": { usage: "external", note: "น้ำหอมพิมเสนน้ำ Essence ใช้สูดดม/ทาภายนอก ห้ามรับประทาน" },
  "31": { usage: "eat", note: "ผงอบเชยเซต 2 กล่อง ใช้ปรุงอาหาร/ชงดื่มได้" },
  "33": { usage: "external", note: "Essence กลิ่นดอกไม้ ใช้สูดดม/ทาภายนอก ห้ามรับประทาน" },
  "34": { usage: "eat", note: "ดอกกานพลู เครื่องเทศ ใช้ปรุงอาหาร/ชงดื่มได้" },
  "35": { usage: "eat", note: "ลูกจันทน์เทศ Nutmeg เครื่องเทศ ใช้ปรุงอาหารได้" },
  "36": { usage: "eat", note: "สมุลเว้ง เครื่องเทศตระกูลอบเชย ใช้ปรุงอาหารได้" },
  "37": { usage: "eat", note: "อบเชยเทศ Alba ใช้ปรุงอาหาร/ชงดื่มได้" },
  "38": { usage: "external", note: "เป็นการบูร (Camphor) ใช้สูดดม/ทาภายนอกเท่านั้น ห้ามรับประทานเด็ดขาด" },
  "39": { usage: "eat", note: "ดอกจันทน์เทศ Mace เครื่องเทศ ใช้ปรุงอาหารได้" },
  "40": { usage: "eat", note: "น้ำผึ้งมะนาวพร้อมดื่ม ดื่มได้ทันที" },
  "41": { usage: "eat", note: "เซตคุกกี้เนยคู่ ทานได้" },
  "42": { usage: "external", note: "ก้านไม้กระจายกลิ่น Reed Diffuser วางกระจายกลิ่น ห้ามรับประทาน" },
  "43": { usage: "external", note: "Essence Duo Set ใช้สูดดม/ทาภายนอก ห้ามรับประทาน" },
  "44": { usage: "eat", note: "ชาอู๋หลงดอกหอมหมื่นลี้ ชงดื่มได้" },
  "45": { usage: "eat", note: "กาแฟอเมริกาโนเย็น ดื่มได้" },
};

/** Short Thai tag for the catalog string the LLM sees. */
export function usageTag(id: string): string {
  const u = PRODUCT_USAGE[id]?.usage;
  return u === "external" ? "ใช้ภายนอกห้ามกิน" : u === "mixed" ? "ชุดผสม(มีของห้ามกิน)" : "ทานได้";
}

/** Full usage note (how to use it correctly). */
export function usageNote(id: string): string | undefined {
  return PRODUCT_USAGE[id]?.note;
}

/** True when the product must NOT be eaten/drunk (external-only). */
export function isExternalOnly(id: string): boolean {
  return PRODUCT_USAGE[id]?.usage === "external";
}
