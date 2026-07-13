import { Share } from "react-native";
import * as Print from "expo-print";
import * as FileSystem from "expo-file-system/legacy";

/**
 * Sales-report export — matches the web owner dashboard's "ส่งออก" popover
 * (Excel / PDF). PDF is rendered from HTML via expo-print (system WebView →
 * perfect Thai), Excel is a UTF-8 CSV (BOM so Excel reads Thai). Both are
 * written to the cache and handed to the iOS share sheet (Save to Files /
 * AirDrop) via RN's core Share — the same flow quotePdf.ts uses.
 */

export type ReportExportLine = { name: string; qty: number; sales: number; cost: number; profit: number; margin: number };
export type ReportExportGroup = { title: string; sales: number; profit: number; lines: ReportExportLine[] };
export type ReportExportData = { scope: string; catLabel: string; groups: ReportExportGroup[] };

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const fmtBaht = (n: number) => "฿" + fmt(n);
const escHtml = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));

export async function exportSalesReportPDF(d: ReportExportData): Promise<void> {
  const body = d.groups
    .map(
      (g) => `
      <tr class="grp"><td colspan="6">${escHtml(g.title)} · ยอดขาย ${fmtBaht(g.sales)} · กำไร ${fmtBaht(g.profit)}</td></tr>
      ${g.lines
        .map(
          (l) => `<tr>
          <td></td>
          <td>${escHtml(l.name)}</td>
          <td class="num">${fmt(l.qty)}</td>
          <td class="num">${fmtBaht(l.sales)}</td>
          <td class="num">${fmtBaht(l.cost)}</td>
          <td class="num">${fmtBaht(l.profit)} (${l.margin.toFixed(1)}%)</td>
        </tr>`,
        )
        .join("")}`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      * { font-family: 'Sarabun', -apple-system, 'Helvetica Neue', sans-serif; }
      body { margin: 0; padding: 28px; color: #1a1a1a; }
      h1 { font-size: 19px; margin: 0 0 3px; }
      .sub { color: #6b7280; font-size: 12px; margin-bottom: 18px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { background: #319754; color: #fff; padding: 9px 7px; text-align: left; font-weight: 600; }
      th.num, td.num { text-align: right; white-space: nowrap; }
      td { padding: 7px; border-bottom: 1px solid #eee; }
      tr.grp td { background: #eef6f0; font-weight: 700; color: #287745; }
    </style></head><body>
    <h1>รายงานการขายสินค้า</h1>
    <div class="sub">${escHtml(d.catLabel)} · ${escHtml(d.scope)}</div>
    <table>
      <thead><tr>
        <th></th><th>สินค้า</th><th class="num">จำนวน</th>
        <th class="num">ยอดขาย</th><th class="num">ต้นทุน</th><th class="num">กำไร</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table>
  </body></html>`;
  const { uri } = await Print.printToFileAsync({ html });
  await Share.share({ url: uri, title: "รายงานยอดขาย" });
}

export async function exportSalesReportExcel(d: ReportExportData): Promise<void> {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows: string[] = [["กลุ่ม", "สินค้า", "จำนวน", "ยอดขาย", "ต้นทุน", "กำไร", "มาร์จิ้น(%)"].join(",")];
  for (const g of d.groups) {
    for (const l of g.lines) {
      rows.push(
        [cell(g.title), cell(l.name), l.qty, Math.round(l.sales), Math.round(l.cost), Math.round(l.profit), l.margin.toFixed(1)].join(","),
      );
    }
  }
  // Leading BOM so Excel decodes the Thai as UTF-8 instead of mojibake.
  const csv = "﻿" + rows.join("\r\n");
  const uri = `${FileSystem.cacheDirectory}sales-report.csv`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await Share.share({ url: uri, title: "รายงานยอดขาย (Excel)" });
}

/* ---------- Customer report — same two writers, customer columns ---------- */

export type CustomerExportRow = { name: string; email: string; orders: number; total: number; lastBuy: string; fav: string };
export type CustomerExportGroup = { title: string; total: number; orders: number; rows: CustomerExportRow[] };
export type CustomerExportData = { scope: string; groups: CustomerExportGroup[] };

export async function exportCustomerReportPDF(d: CustomerExportData): Promise<void> {
  const body = d.groups
    .map(
      (g) => `
      <tr class="grp"><td colspan="6">${escHtml(g.title)} · ${g.rows.length} ราย · ยอดซื้อ ${fmtBaht(g.total)} · ${fmt(g.orders)} ออเดอร์</td></tr>
      ${g.rows
        .map(
          (c) => `<tr>
          <td></td>
          <td>${escHtml(c.name)}</td>
          <td>${escHtml(c.email)}</td>
          <td class="num">${fmt(c.orders)}</td>
          <td class="num">${fmtBaht(c.total)}</td>
          <td>${escHtml(c.lastBuy)}</td>
        </tr>`,
        )
        .join("")}`,
    )
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      * { font-family: 'Sarabun', -apple-system, 'Helvetica Neue', sans-serif; }
      body { margin: 0; padding: 28px; color: #1a1a1a; }
      h1 { font-size: 19px; margin: 0 0 3px; }
      .sub { color: #6b7280; font-size: 12px; margin-bottom: 18px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { background: #319754; color: #fff; padding: 9px 7px; text-align: left; font-weight: 600; }
      th.num, td.num { text-align: right; white-space: nowrap; }
      td { padding: 7px; border-bottom: 1px solid #eee; }
      tr.grp td { background: #eef6f0; font-weight: 700; color: #287745; }
    </style></head><body>
    <h1>รายงานข้อมูลลูกค้า</h1>
    <div class="sub">${escHtml(d.scope)}</div>
    <table>
      <thead><tr>
        <th></th><th>ลูกค้า</th><th>อีเมล</th>
        <th class="num">ออเดอร์</th><th class="num">ยอดซื้อ</th><th>ซื้อล่าสุด</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table>
  </body></html>`;
  const { uri } = await Print.printToFileAsync({ html });
  await Share.share({ url: uri, title: "รายงานข้อมูลลูกค้า" });
}

export async function exportCustomerReportExcel(d: CustomerExportData): Promise<void> {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows: string[] = [["กลุ่ม", "ลูกค้า", "อีเมล", "ออเดอร์", "ยอดซื้อ", "ซื้อล่าสุด", "สินค้าที่ซื้อบ่อย"].join(",")];
  for (const g of d.groups) {
    for (const c of g.rows) {
      rows.push([cell(g.title), cell(c.name), cell(c.email), c.orders, Math.round(c.total), cell(c.lastBuy), cell(c.fav)].join(","));
    }
  }
  const csv = "﻿" + rows.join("\r\n");
  const uri = `${FileSystem.cacheDirectory}customer-report.csv`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await Share.share({ url: uri, title: "รายงานข้อมูลลูกค้า (Excel)" });
}
