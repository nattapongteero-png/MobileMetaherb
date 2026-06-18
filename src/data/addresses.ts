export type Address = {
  id: string;
  name: string;
  phone: string;
  /** House number / soi line. */
  detail: string;
  /** Subdistrict / district / province / postcode line. */
  area: string;
  isDefault?: boolean;
};

export const INITIAL_ADDRESSES: Address[] = [
  {
    id: "addr-1",
    name: "ณัฐพงษ์ ธีโรภาส",
    phone: "061-421-3111",
    detail: "เลขที่ 2 ชั้น 2 ซอยสุขสวัสดิ์ 33",
    area: "แขวงราษฎร์บูรณะ เขตราษฎร์บูรณะ กรุงเทพมหานคร 10140",
    isDefault: true,
  },
  {
    id: "addr-2",
    name: "คุณแม่",
    phone: "081-234-5678",
    detail: "99/5 หมู่บ้านเมืองทอง ถ.แจ้งวัฒนะ",
    area: "ปากเกร็ด นนทบุรี 11120",
  },
  {
    id: "addr-3",
    name: "ที่ทำงาน",
    phone: "02-111-2222",
    detail: "45/12 ซอยลาดพร้าว 71",
    area: "ลาดพร้าว กรุงเทพมหานคร 10230",
  },
];
