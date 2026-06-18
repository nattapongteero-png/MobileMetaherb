// Small sample of Thai postal codes for the address-form autocomplete (mock —
// not exhaustive). Typing a code suggests its subdistrict/district/province.
export type PostalEntry = {
  zip: string;
  subdistrict: string; // ตำบล/แขวง
  district: string; // อำเภอ/เขต
  province: string; // จังหวัด
};

export const POSTAL_CODES: PostalEntry[] = [
  // กรุงเทพมหานคร
  { zip: "10110", subdistrict: "คลองเตยเหนือ", district: "วัฒนา", province: "กรุงเทพมหานคร" },
  { zip: "10110", subdistrict: "คลองเตย", district: "คลองเตย", province: "กรุงเทพมหานคร" },
  { zip: "10120", subdistrict: "ทุ่งวัดดอน", district: "สาทร", province: "กรุงเทพมหานคร" },
  { zip: "10120", subdistrict: "ช่องนนทรี", district: "ยานนาวา", province: "กรุงเทพมหานคร" },
  { zip: "10140", subdistrict: "ราษฎร์บูรณะ", district: "ราษฎร์บูรณะ", province: "กรุงเทพมหานคร" },
  { zip: "10140", subdistrict: "บางปะกอก", district: "ราษฎร์บูรณะ", province: "กรุงเทพมหานคร" },
  { zip: "10140", subdistrict: "ทุ่งครุ", district: "ทุ่งครุ", province: "กรุงเทพมหานคร" },
  { zip: "10140", subdistrict: "บางมด", district: "ทุ่งครุ", province: "กรุงเทพมหานคร" },
  { zip: "10150", subdistrict: "แสมดำ", district: "บางขุนเทียน", province: "กรุงเทพมหานคร" },
  { zip: "10160", subdistrict: "บางหว้า", district: "ภาษีเจริญ", province: "กรุงเทพมหานคร" },
  { zip: "10160", subdistrict: "บางแค", district: "บางแค", province: "กรุงเทพมหานคร" },
  { zip: "10200", subdistrict: "พระบรมมหาราชวัง", district: "พระนคร", province: "กรุงเทพมหานคร" },
  { zip: "10210", subdistrict: "ทุ่งสองห้อง", district: "หลักสี่", province: "กรุงเทพมหานคร" },
  { zip: "10210", subdistrict: "สีกัน", district: "ดอนเมือง", province: "กรุงเทพมหานคร" },
  { zip: "10220", subdistrict: "อนุสาวรีย์", district: "บางเขน", province: "กรุงเทพมหานคร" },
  { zip: "10220", subdistrict: "สายไหม", district: "สายไหม", province: "กรุงเทพมหานคร" },
  { zip: "10230", subdistrict: "คลองจั่น", district: "บางกะปิ", province: "กรุงเทพมหานคร" },
  { zip: "10230", subdistrict: "ลาดพร้าว", district: "ลาดพร้าว", province: "กรุงเทพมหานคร" },
  { zip: "10230", subdistrict: "คลองกุ่ม", district: "บึงกุ่ม", province: "กรุงเทพมหานคร" },
  { zip: "10240", subdistrict: "ประเวศ", district: "ประเวศ", province: "กรุงเทพมหานคร" },
  { zip: "10250", subdistrict: "บางนาเหนือ", district: "บางนา", province: "กรุงเทพมหานคร" },
  { zip: "10300", subdistrict: "ดุสิต", district: "ดุสิต", province: "กรุงเทพมหานคร" },
  { zip: "10310", subdistrict: "ห้วยขวาง", district: "ห้วยขวาง", province: "กรุงเทพมหานคร" },
  { zip: "10400", subdistrict: "ทุ่งพญาไท", district: "ราชเทวี", province: "กรุงเทพมหานคร" },
  { zip: "10400", subdistrict: "สามเสนใน", district: "พญาไท", province: "กรุงเทพมหานคร" },
  { zip: "10330", subdistrict: "ลุมพินี", district: "ปทุมวัน", province: "กรุงเทพมหานคร" },
  { zip: "10500", subdistrict: "สีลม", district: "บางรัก", province: "กรุงเทพมหานคร" },
  { zip: "10510", subdistrict: "มีนบุรี", district: "มีนบุรี", province: "กรุงเทพมหานคร" },
  { zip: "10520", subdistrict: "ลาดกระบัง", district: "ลาดกระบัง", province: "กรุงเทพมหานคร" },
  { zip: "10600", subdistrict: "คลองสาน", district: "คลองสาน", province: "กรุงเทพมหานคร" },
  { zip: "10700", subdistrict: "ศิริราช", district: "บางกอกน้อย", province: "กรุงเทพมหานคร" },
  { zip: "10800", subdistrict: "บางซื่อ", district: "บางซื่อ", province: "กรุงเทพมหานคร" },
  { zip: "10900", subdistrict: "ลาดยาว", district: "จตุจักร", province: "กรุงเทพมหานคร" },
  // นนทบุรี
  { zip: "11000", subdistrict: "สวนใหญ่", district: "เมืองนนทบุรี", province: "นนทบุรี" },
  { zip: "11000", subdistrict: "บางกระสอ", district: "เมืองนนทบุรี", province: "นนทบุรี" },
  { zip: "11120", subdistrict: "ปากเกร็ด", district: "ปากเกร็ด", province: "นนทบุรี" },
  { zip: "11120", subdistrict: "บางพูด", district: "ปากเกร็ด", province: "นนทบุรี" },
  { zip: "11130", subdistrict: "โสนลอย", district: "บางบัวทอง", province: "นนทบุรี" },
  { zip: "11140", subdistrict: "บางม่วง", district: "บางใหญ่", province: "นนทบุรี" },
  // ปทุมธานี
  { zip: "12000", subdistrict: "บางปรอก", district: "เมืองปทุมธานี", province: "ปทุมธานี" },
  { zip: "12120", subdistrict: "คลองหนึ่ง", district: "คลองหลวง", province: "ปทุมธานี" },
  { zip: "12130", subdistrict: "ประชาธิปัตย์", district: "ธัญบุรี", province: "ปทุมธานี" },
  { zip: "12150", subdistrict: "คูคต", district: "ลำลูกกา", province: "ปทุมธานี" },
  // สมุทรปราการ
  { zip: "10270", subdistrict: "ปากน้ำ", district: "เมืองสมุทรปราการ", province: "สมุทรปราการ" },
  { zip: "10280", subdistrict: "ตลาด", district: "พระประแดง", province: "สมุทรปราการ" },
  { zip: "10540", subdistrict: "บางพลีใหญ่", district: "บางพลี", province: "สมุทรปราการ" },
  // เชียงใหม่
  { zip: "50200", subdistrict: "ศรีภูมิ", district: "เมืองเชียงใหม่", province: "เชียงใหม่" },
  { zip: "50200", subdistrict: "พระสิงห์", district: "เมืองเชียงใหม่", province: "เชียงใหม่" },
  { zip: "50100", subdistrict: "สุเทพ", district: "เมืองเชียงใหม่", province: "เชียงใหม่" },
  { zip: "50130", subdistrict: "หนองหาร", district: "สันทราย", province: "เชียงใหม่" },
  // เชียงราย
  { zip: "57000", subdistrict: "เวียง", district: "เมืองเชียงราย", province: "เชียงราย" },
  // ชลบุรี
  { zip: "20000", subdistrict: "บางปลาสร้อย", district: "เมืองชลบุรี", province: "ชลบุรี" },
  { zip: "20110", subdistrict: "ศรีราชา", district: "ศรีราชา", province: "ชลบุรี" },
  { zip: "20150", subdistrict: "หนองปรือ", district: "บางละมุง", province: "ชลบุรี" },
  // ระยอง
  { zip: "21000", subdistrict: "ท่าประดู่", district: "เมืองระยอง", province: "ระยอง" },
  // ภูเก็ต
  { zip: "83000", subdistrict: "ตลาดใหญ่", district: "เมืองภูเก็ต", province: "ภูเก็ต" },
  { zip: "83110", subdistrict: "เชิงทะเล", district: "ถลาง", province: "ภูเก็ต" },
  { zip: "83150", subdistrict: "ป่าตอง", district: "กะทู้", province: "ภูเก็ต" },
  // สงขลา
  { zip: "90000", subdistrict: "บ่อยาง", district: "เมืองสงขลา", province: "สงขลา" },
  { zip: "90110", subdistrict: "หาดใหญ่", district: "หาดใหญ่", province: "สงขลา" },
  { zip: "90110", subdistrict: "คอหงส์", district: "หาดใหญ่", province: "สงขลา" },
  // นครราชสีมา
  { zip: "30000", subdistrict: "ในเมือง", district: "เมืองนครราชสีมา", province: "นครราชสีมา" },
  { zip: "30000", subdistrict: "หัวทะเล", district: "เมืองนครราชสีมา", province: "นครราชสีมา" },
  // ขอนแก่น
  { zip: "40000", subdistrict: "ในเมือง", district: "เมืองขอนแก่น", province: "ขอนแก่น" },
  { zip: "40000", subdistrict: "ศิลา", district: "เมืองขอนแก่น", province: "ขอนแก่น" },
  // อุดรธานี
  { zip: "41000", subdistrict: "หมากแข้ง", district: "เมืองอุดรธานี", province: "อุดรธานี" },
  // นครปฐม
  { zip: "73000", subdistrict: "พระปฐมเจดีย์", district: "เมืองนครปฐม", province: "นครปฐม" },
  // ประจวบคีรีขันธ์
  { zip: "77110", subdistrict: "หัวหิน", district: "หัวหิน", province: "ประจวบคีรีขันธ์" },
  // สุราษฎร์ธานี
  { zip: "84000", subdistrict: "ตลาด", district: "เมืองสุราษฎร์ธานี", province: "สุราษฎร์ธานี" },
];

export const PROVINCES: string[] = [
  "กรุงเทพมหานคร",
  "นนทบุรี",
  "ปทุมธานี",
  "สมุทรปราการ",
  "เชียงใหม่",
  "ชลบุรี",
  "ภูเก็ต",
  "ขอนแก่น",
  "นครราชสีมา",
  "สงขลา",
];

/** Postal entries whose code starts with the typed digits (max 6). */
export function suggestPostal(zip: string): PostalEntry[] {
  if (zip.length < 2) return [];
  return POSTAL_CODES.filter((p) => p.zip.startsWith(zip)).slice(0, 6);
}
