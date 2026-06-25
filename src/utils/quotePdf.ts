import { Share } from "react-native";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import * as FileSystem from "expo-file-system/legacy";

// Pure-JS PDF generation (no native module) so it works in Expo Go: pdf-lib draws
// the A4 quotation, Sarabun fonts are fetched from a CDN, the bytes are written to
// the cache via expo-file-system, then handed to the share sheet via expo-sharing.

const FONT_REG = "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/sarabun/Sarabun-Regular.ttf";
const FONT_BOLD = "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/sarabun/Sarabun-Bold.ttf";

export type QuotePdfArgs = {
  docs: { supplier: string; rfqNumber: string; rows: { name: string; qty: number; unit: string; price: number }[] }[];
  isBulk: boolean;
  companyName: string; taxId: string; companyAddress: string;
  contactName: string; position: string; email: string; phone: string; poReference: string;
  todayStr: string; note: string; certPref: string; requiredBy: string;
};

let regBytes: ArrayBuffer | null = null;
let boldBytes: ArrayBuffer | null = null;
const loadFont = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`font ${res.status}`);
  return res.arrayBuffer();
};

function thaiBahtText(amount: number): string {
  if (!isFinite(amount) || amount === 0) return "ศูนย์บาทถ้วน";
  const d = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const p = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];
  const chunk = (numStr: string): string => {
    let s = "";
    const len = numStr.length;
    for (let i = 0; i < len; i++) {
      const n = parseInt(numStr.charAt(i), 10);
      const pos = len - i - 1;
      if (n === 0) continue;
      if (pos === 0 && n === 1 && len > 1) s += "เอ็ด";
      else if (pos === 1 && n === 2) s += "ยี่" + p[pos];
      else if (pos === 1 && n === 1) s += p[pos];
      else s += d[n] + p[pos];
    }
    return s;
  };
  const r = Math.round(amount * 100) / 100;
  const baht = Math.floor(r);
  const satang = Math.round((r - baht) * 100);
  let out = "";
  if (baht >= 1000000) {
    out += chunk(String(Math.floor(baht / 1000000))) + "ล้าน";
    const rest = baht % 1000000;
    if (rest > 0) out += chunk(String(rest).padStart(6, "0").replace(/^0+/, ""));
  } else out += chunk(String(baht));
  out += "บาท";
  out += satang === 0 ? "ถ้วน" : chunk(String(satang)) + "สตางค์";
  return out;
}

export async function makeQuotePdf(args: QuotePdfArgs): Promise<void> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  regBytes = regBytes ?? (await loadFont(FONT_REG));
  boldBytes = boldBytes ?? (await loadFont(FONT_BOLD));
  const reg = await pdf.embedFont(regBytes);
  const bold = await pdf.embedFont(boldBytes);

  const f = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const W = 595.28, H = 841.89, M = 40, CW = W - 2 * M;
  const BLACK = rgb(0, 0, 0);

  for (let di = 0; di < args.docs.length; di++) {
    const doc = args.docs[di];
    const page = pdf.addPage([W, H]);
    let y = H - M;
    const txt = (s: string, x: number, yy: number, size: number, fnt: PDFFont) => page.drawText(s, { x, y: yy, size, font: fnt, color: BLACK });
    const wid = (s: string, size: number, fnt: PDFFont) => fnt.widthOfTextAtSize(s, size);
    const rightAt = (s: string, xR: number, yy: number, size: number, fnt: PDFFont) => txt(s, xR - wid(s, size, fnt), yy, size, fnt);
    const centerIn = (s: string, x0: number, x1: number, yy: number, size: number, fnt: PDFFont) => txt(s, x0 + (x1 - x0 - wid(s, size, fnt)) / 2, yy, size, fnt);
    const clip = (s: string, size: number, fnt: PDFFont, maxW: number) => {
      if (wid(s, size, fnt) <= maxW) return s;
      let t = s;
      while (t.length > 1 && wid(t + "…", size, fnt) > maxW) t = t.slice(0, -1);
      return t + "…";
    };

    // Header (right aligned)
    rightAt("บริษัท เมต้าเฮิร์บ จำกัด", W - M, y - 12, 13, bold);
    rightAt("เลขที่ 459/153 ถนนสุขสวัสดิ์ แขวงราษฎร์บูรณะ เขตราษฎร์บูรณะ กรุงเทพมหานคร 10140", W - M, y - 25, 8, reg);
    rightAt("โทรศัพท์ 061-4213111", W - M, y - 36, 8, reg);
    rightAt("เลขประจำตัวผู้เสียภาษี: 0105565148242", W - M, y - 47, 8, reg);
    y -= 66;
    centerIn("ใบเสนอราคา/Quotation", M, W - M, y, 14, bold); y -= 17;
    if (args.isBulk && args.docs.length > 1) { centerIn(`ใบที่ ${di + 1} / ${args.docs.length} · จาก Supplier: ${doc.supplier}`, M, W - M, y, 9, reg); y -= 13; }

    // Meta grid
    const lx = M, vx = M + 52, lx2 = 332, vx2 = 432;
    const meta = (k1: string, v1: string, k2: string, v2: string, v1b = false) => {
      txt(k1, lx, y, 10, bold); txt(clip(v1, 10, v1b ? bold : reg, lx2 - vx - 8), vx, y, 10, v1b ? bold : reg);
      txt(k2, lx2, y, 9, bold); txt(v2, vx2, y, 10, reg); y -= 14;
    };
    meta("เรียน :", args.companyName || "—", "เลขที่ :", doc.rfqNumber, true);
    meta("ที่อยู่ :", args.companyAddress || "—", "วันที่ :", args.todayStr);
    if (args.taxId) { txt("เลขประจำตัวผู้เสียภาษี: " + args.taxId, vx, y, 8, reg); y -= 12; }
    meta("ผู้ติดต่อ:", `${args.contactName}${args.position ? ` (${args.position})` : ""}`, "อ้างถึง :", args.poReference || "30");
    meta("อีเมล์:", args.email, "กำหนดยื่นราคา(วัน) :", "30");
    txt("โทรศัพท์:", lx, y, 10, bold); txt(args.phone, vx, y, 10, reg); y -= 18;

    centerIn(`ทาง ${doc.supplier} (ผ่านแพลตฟอร์ม Metaherb) มีความยินดีขอเสนอราคาดังรายการต่อไปนี้`, M, W - M, y, 9, reg); y -= 16;

    // Items table
    const fr = [0.08, 0.45, 0.09, 0.11, 0.13, 0.14];
    const cx: number[] = []; let a = M; for (const c of fr) { cx.push(a); a += c * CW; } cx.push(M + CW);
    const rowH = 17;
    const cell = (s: string, ci: number, yy: number, size: number, fnt: PDFFont, align: "l" | "c" | "r") => {
      const x0 = cx[ci], x1 = cx[ci + 1], ty = yy - 12;
      if (align === "l") txt(clip(s, size, fnt, x1 - x0 - 6), x0 + 3, ty, size, fnt);
      else if (align === "r") rightAt(s, x1 - 4, ty, size, fnt);
      else centerIn(s, x0, x1, ty, size, fnt);
    };
    const rowBorders = (yy: number) => {
      page.drawRectangle({ x: M, y: yy - rowH, width: CW, height: rowH, borderColor: BLACK, borderWidth: 0.6 });
      for (let i = 1; i < cx.length - 1; i++) page.drawLine({ start: { x: cx[i], y: yy }, end: { x: cx[i], y: yy - rowH }, thickness: 0.6, color: BLACK });
    };
    rowBorders(y);
    const hd = ["ลำดับ", "รายการ", "จำนวน", "หน่วยนับ", "ราคาต่อหน่วย", "ราคารวม(บาท)"];
    hd.forEach((h, i) => cell(h, i, y, 9, bold, "c")); y -= rowH;
    const lineRows = [
      ...doc.rows.map((r, i) => [String(i + 1), r.name, String(r.qty), r.unit, f(r.price), f(r.qty * r.price)]),
      ...Array.from({ length: Math.max(0, 7 - doc.rows.length) }, () => ["", "", "", "", "", ""]),
    ];
    for (const r of lineRows) {
      rowBorders(y);
      cell(r[0], 0, y, 9, reg, "c"); cell(r[1], 1, y, 9, reg, "l"); cell(r[2], 2, y, 9, reg, "c");
      cell(r[3], 3, y, 9, reg, "c"); cell(r[4], 4, y, 9, reg, "r"); cell(r[5], 5, y, 9, reg, "r");
      y -= rowH;
    }
    y -= 8;

    // Notes (left) + Totals box (right)
    const sum = doc.rows.reduce((s, r) => s + r.qty * r.price, 0);
    const totX = M + CW - 200, totW = 200;
    const notesW = totX - M - 10;
    let ny = y;
    txt("หมายเหตุ :", M, ny, 9, bold); ny -= 12;
    if (args.note) { txt(clip(args.note, 8.5, reg, notesW), M, ny, 8.5, reg); ny -= 12; }
    const terms = "เงื่อนไขการชำระเงิน: เช็คสั่งจ่าย หรือ การโอน บัญชีธนาคารกรุงไทย ชื่อบัญชีบริษัท เมต้าเฮิร์บ จำกัด เลขที่บัญชี 173-074649-7 โปรดชำระในวันรับสินค้าหรือชำระก่อนวันรับสินค้า";
    for (const ln of wrap(terms, 8.5, reg, notesW, wid)) { txt(ln, M, ny, 8.5, reg); ny -= 11; }
    if (args.certPref !== "ทั่วไป" || args.requiredBy) {
      const c = `${args.certPref !== "ทั่วไป" ? `เกรด/Certificate: ${args.certPref}` : ""}${args.certPref !== "ทั่วไป" && args.requiredBy ? " · " : ""}${args.requiredBy ? `ต้องการภายใน: ${args.requiredBy}` : ""}`;
      ny -= 2; for (const ln of wrap(c, 8.5, reg, notesW, wid)) { txt(ln, M, ny, 8.5, reg); ny -= 11; }
    }
    // totals box
    const tr = [["ยอดรวม", f(sum)], ["ราคาก่อนภาษีมูลค่าเพิ่ม 7%", f((sum * 100) / 107)], ["ภาษีมูลค่าเพิ่ม 7%", f((sum * 7) / 107)], ["รวมราคาสินค้าหลังหักส่วนลด", f(sum)]];
    let ty = y; const trh = 14;
    tr.forEach(([k, v]) => {
      page.drawRectangle({ x: totX, y: ty - trh, width: totW, height: trh, borderColor: BLACK, borderWidth: 0.6 });
      txt(k, totX + 4, ty - 10, 8.5, bold); rightAt(v, totX + totW - 4, ty - 10, 8.5, reg); ty -= trh;
    });
    page.drawRectangle({ x: totX, y: ty - 16, width: totW, height: 16, borderColor: BLACK, borderWidth: 0.6 });
    centerIn(thaiBahtText(sum), totX, totX + totW, ty - 11, 8, reg); ty -= 16;
    y = Math.min(ny, ty) - 12;

    // Legal note
    for (const ln of wrap("*หากท่านลงนามหรือประทับตราหน่วยบริการตามที่บริษัท เมต้าเฮิร์บ จำกัด ได้นำเสนอในใบเสนอราคาฉบับนี้แล้ว ทางบริษัทจะนับใบเสนอราคาฉบับนี้คือเอกสารยืนยันการสั่งซื้อ โดยทันที", 8.5, reg, CW, wid)) { txt(ln, M, y, 8.5, reg); y -= 11; }
    y -= 6;

    // Signature blocks
    const sbH = 96, halfW = CW / 2;
    page.drawRectangle({ x: M, y: y - sbH, width: halfW, height: sbH, borderColor: BLACK, borderWidth: 0.6 });
    page.drawRectangle({ x: M + halfW, y: y - sbH, width: halfW, height: sbH, borderColor: BLACK, borderWidth: 0.6 });
    centerIn("สำหรับ ลูกค้า", M, M + halfW, y - 12, 9, bold);
    centerIn("กรุณาลงนามและประทับตราหน่วยบริการเพื่อยืนยันการสั่งซื้อ", M, M + halfW, y - 24, 7.5, reg);
    txt("ลงนาม: .....................................", M + 8, y - 44, 8.5, reg);
    txt("ตำแหน่ง : ................................", M + 8, y - 60, 8.5, reg);
    txt("วันที่ ........ / ........ / ............", M + 8, y - 76, 8.5, reg);
    centerIn("จึงเรียนมาเพื่อโปรดพิจารณา", M + halfW, W - M, y - 12, 9, bold);
    centerIn(".................................................", M + halfW, W - M, y - 64, 8.5, reg);
    centerIn("(นายอรรถพล อุทัยเรือง)", M + halfW, W - M, y - 76, 8.5, reg);
    centerIn("ผู้เสนอราคา", M + halfW, W - M, y - 88, 8.5, reg);
    y -= sbH + 10;
    txt("** กรุณาลงลายมือชื่อเพื่อยืนยันใบเสนอราคาดังกล่าวและ Email : mataherb.herb@gmail.com", M, y, 8, reg);
  }

  const base64 = await pdf.saveAsBase64();
  const uri = `${FileSystem.cacheDirectory}quotation.pdf`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  // RN's built-in Share is core (no native module to miss in Expo Go); on iOS a
  // file:// url opens the share sheet with "Save to Files" / AirDrop.
  await Share.share({ url: uri, title: "ใบเสนอราคา / Quotation" });
}

// Greedy char-based wrap (Thai has no word spaces) to a max pixel width.
function wrap(s: string, size: number, font: PDFFont, maxW: number, wid: (s: string, size: number, f: PDFFont) => number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const ch of s) {
    if (wid(cur + ch, size, font) > maxW && cur) { lines.push(cur); cur = ch; }
    else cur += ch;
  }
  if (cur) lines.push(cur);
  return lines;
}
