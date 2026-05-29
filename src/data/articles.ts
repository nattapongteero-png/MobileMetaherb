// Ported from the MetaHerb website blog (src/app/pages/BlogPage.tsx).
// Remote images are the same Unsplash sources used on the web.

export type Article = {
  id: number;
  image: string;
  category: string;
  title: string;
  desc: string;
  date: string;
  views: number;
};

export type VideoItem = {
  id: number;
  image: string;
  views: string;
  title: string;
};

const IMG = {
  herbalTea: "https://images.unsplash.com/photo-1610643625267-aee6dae3ca22?w=600&q=80",
  coffeeDrip: "https://images.unsplash.com/photo-1599639932525-213272ff954b?w=600&q=80",
  honey: "https://images.unsplash.com/photo-1645693091199-77a764e1ea16?w=600&q=80",
  turmeric: "https://images.unsplash.com/photo-1740592754365-2117f5977528?w=600&q=80",
  coconutOil: "https://images.unsplash.com/photo-1591282017732-207fbba7dfd4?w=600&q=80",
  driedHerbs: "https://images.unsplash.com/photo-1759064716219-ba8c60a7ce07?w=600&q=80",
  jam: "https://images.unsplash.com/photo-1558429773-0d5084b445aa?w=600&q=80",
  aloe: "https://images.unsplash.com/photo-1748390359572-8e7a47bf5cb5?w=600&q=80",
  oliveOil: "https://images.unsplash.com/photo-1765850257647-811b8d3c20ca?w=600&q=80",
  essentialOil: "https://images.unsplash.com/photo-1624454002302-36b824d7bd0a?w=600&q=80",
  amla: "https://images.unsplash.com/photo-1644061923948-f5b918b524c7?w=600&q=80",
};

export const ARTICLES: Article[] = [
  { id: 1, image: IMG.turmeric, category: "สรรพคุณสมุนไพร", title: "ขมิ้นชัน — ราชาแห่งสมุนไพรไทย ลดอักเสบช่วยตับ", desc: "รวมงานวิจัยล่าสุดเรื่องสาร Curcumin ในขมิ้นชันที่ช่วยลดการอักเสบและฟื้นฟูตับ พร้อมวิธีบริโภคให้ได้ประโยชน์สูงสุด", date: "3 พ.ค. 2569", views: 1248 },
  { id: 2, image: IMG.driedHerbs, category: "สรรพคุณสมุนไพร", title: "ฟ้าทะลายโจร ทางเลือกธรรมชาติเสริมภูมิต้านทาน", desc: "เปิดข้อมูลทางเภสัชกรรมเรื่อง Andrographolide กับการลดไข้ บรรเทาหวัด พร้อมข้อควรระวังเมื่อทานต่อเนื่อง", date: "30 เม.ย. 2569", views: 892 },
  { id: 3, image: IMG.herbalTea, category: "ชาสมุนไพร", title: "ชาเก๊กฮวยกับการบำรุงสายตาและลดความร้อนในร่างกาย", desc: "วิธีชงชาเก๊กฮวยให้หอม ดื่มในช่วงเวลาที่เหมาะ และคู่กับสมุนไพรอื่นเพื่อสุขภาพตา-ตับที่ดียิ่งขึ้น", date: "28 เม.ย. 2569", views: 654 },
  { id: 4, image: IMG.aloe, category: "เคล็ดลับการปลูก", title: "ปลูกสมุนไพรสวนหลังบ้าน เริ่มได้ใน 7 ขั้นตอน", desc: "คู่มือเริ่มต้นปลูกใบบัวบก ตะไคร้ กระเพรา โหระพา ในกระถางหลังบ้าน เลือกดิน รดน้ำ ใส่ปุ๋ยอย่างไรให้งอกงาม", date: "26 เม.ย. 2569", views: 1573 },
  { id: 5, image: IMG.amla, category: "การเก็บเกี่ยว", title: "ช่วงเวลาทองของการเก็บเกี่ยวสมุนไพร 12 ชนิด", desc: "เก็บใบเช้า รากเย็น ผลตามฤดู — ตารางช่วงเวลาที่เหมาะสมสำหรับสมุนไพรไทยยอดนิยม เพื่อสารสำคัญสูงสุด", date: "24 เม.ย. 2569", views: 421 },
  { id: 6, image: IMG.essentialOil, category: "อโรมาเธอราพี", title: "น้ำมันหอมระเหยจากตะไคร้ ลาเวนเดอร์ ยูคาลิปตัส ใช้อย่างไร", desc: "Aromatherapy 101 — สูตรผสมน้ำมันสำหรับนวด คลายเครียด ขับยุง ที่ปลอดภัยและทำเองได้", date: "22 เม.ย. 2569", views: 987 },
  { id: 7, image: IMG.coconutOil, category: "อาหารสุขภาพ", title: "5 สูตรน้ำสมุนไพรลดน้ำหนัก ดื่มต่อเนื่องเห็นผล", desc: "น้ำตะไคร้ใบเตย น้ำขิงมะนาว น้ำมะตูม สูตรชงง่าย แคลอรีต่ำ ช่วยขับสารพิษ เร่งเผาผลาญ", date: "20 เม.ย. 2569", views: 2106 },
  { id: 8, image: IMG.honey, category: "ผลิตภัณฑ์ออร์แกนิก", title: "น้ำผึ้งดิบ vs น้ำผึ้งผ่านความร้อน ต่างกันอย่างไร", desc: "เจาะลึกความแตกต่างของกระบวนการผลิต คุณค่าเอนไซม์ที่หายไป และวิธีเลือกซื้อน้ำผึ้งคุณภาพ", date: "18 เม.ย. 2569", views: 768 },
  { id: 9, image: IMG.jam, category: "ความเชื่อ-ภูมิปัญญา", title: "ตำรับยาสมุนไพรไทยโบราณ — ภูมิปัญญาที่กำลังจะหายไป", desc: "ย้อนรอยตำรายาเก่าแก่ ตำรับยาเขียวเล็กของหลวงปู่ ขับลม แก้ไข้ ที่ส่งต่อกันมาในชุมชน", date: "15 เม.ย. 2569", views: 543 },
  { id: 10, image: IMG.oliveOil, category: "ดูแลผิว", title: "ขมิ้นกับว่านหางจระเข้ — สูตรมาส์กหน้าจากครัวคุณยาย", desc: "ส่วนผสมง่ายๆ ที่หาได้ในครัว ผสมเองได้ใน 5 นาที ลดสิว ลดรอย ผิวกระจ่างใสตามธรรมชาติ", date: "12 เม.ย. 2569", views: 1834 },
  { id: 11, image: IMG.coffeeDrip, category: "การดูแลสุขภาพ", title: "สมุนไพรช่วยนอนหลับ — คาโมมายล์ วาเลเรียน ใบบัวบก", desc: "นอนไม่หลับเรื้อรัง? ลองสมุนไพรเหล่านี้ก่อนพึ่งยา พร้อมวิธีชงและขนาดที่เหมาะสมในแต่ละวัน", date: "10 เม.ย. 2569", views: 1129 },
  { id: 12, image: IMG.driedHerbs, category: "งานวิจัย", title: "งานวิจัยล่าสุด เห็ดหลินจือกับการเสริมภูมิคุ้มกัน", desc: "สรุปงานวิจัย 5 ปีย้อนหลังเกี่ยวกับสาร Polysaccharide ในเห็ดหลินจือกับการต้านอนุมูลอิสระและภูมิคุ้มกัน", date: "8 เม.ย. 2569", views: 612 },
];

export const VIDEOS: VideoItem[] = [
  { id: 1, image: IMG.essentialOil, views: "12K", title: "ทำน้ำมันสมุนไพรทาแก้ปวดเมื่อย" },
  { id: 2, image: IMG.honey, views: "15K", title: "เปิดสวนน้ำผึ้งดอกลำไย จ.ลำพูน" },
  { id: 3, image: IMG.coconutOil, views: "9K", title: "วิธีคั้นน้ำขิงสด บรรเทาหวัด" },
  { id: 4, image: IMG.herbalTea, views: "120K", title: "ชาคาโมมายล์ ผ่อนคลาย หลับสนิท" },
  { id: 5, image: IMG.amla, views: "25K", title: "5 สูตรน้ำสมุนไพรผิวใส" },
  { id: 6, image: IMG.turmeric, views: "99K", title: "ตำรับยาสมุนไพรไทยโบราณ" },
];
