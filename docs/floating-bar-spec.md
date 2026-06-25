# Floating action bar (bar ลอย) — spec

## มาตรฐาน (Liquid Glass floating bar)
โครงสร้าง bar ลอยปกติ (เช่น ProductDetail / Payment / SellerRegister):

| ชั้น | ค่า |
|---|---|
| **ตัวครอบลอย** (container) | `position: absolute · left/right: 0 · bottom: 0` · `paddingHorizontal: 16` · `paddingBottom: 18` (ลอยสูงจากขอบล่าง 18) |
| **ชั้นเงา** (shadow wrapper) | `borderRadius: 34` · shadowColor `#0a3d22` · offset `{0, 9}` · opacity `0.18` · **shadowRadius `16`** · elevation `14` |
| **GlassView** | `borderRadius: 34` · `overflow: hidden` · **`padding: 9`** |
| **ปุ่มข้างใน** | `height: 50` · `borderRadius: 999` |

→ **ความสูง bar รวม ≈ 9 + 50 + 9 = 68px** · ลอยจากขอบล่างจอ 18px · กว้าง = เต็มจอ − (paddingHorizontal 16 × 2)

มี fade ไล่สีขาวด้านบน bar (`height: 24`) ให้เนื้อหา dissolve

## ความสูงปุ่ม/บาร์ ต่อหน้า
| หน้า | โครง | ปุ่ม/ฟิลด์ | สูงรวม bar |
|---|---|---|---|
| ProductDetail | กระจก | 50 | ~68 |
| HerbalMarketDetail | กระจก | 50 | ~68 |
| Payment | กระจก | 50 | ~68 |
| SellerRegister | กระจก | 50 | ~68 |
| TrialApply | กระจก | 50 | ~68 |
| TrialDetail | กระจก | 50 | ~68 |
| TrialRequestDetail | กระจก | 50 | ~68 |
| TrialEval | กระจก | 50 | ~68 |
| ReportProblem | กระจก | 50 | ~68 |
| B2BDocDetail | กระจก | 50 | ~68 |
| ComplaintForm | พิลล์ตัน | 48 | 48 |
| Address | พิลล์ตัน | 48 | 48 |
| OrderReview | พิลล์ตัน | 48 | 48 |
| HerbalMarketQuote | กระจก | 48 | ~66 |
| HerbalMarketPR | กระจก | 48 | ~66 |
| **Chat** (composer) | กระจก | ฟิลด์ `minHeight: 44` | ~62 |
| **AI (เมต้า)** (composer) | กระจก | ฟิลด์ `minHeight: 44` + ปุ่มกลม 44 | ~62 |

## หมายเหตุ
- **ค่ามาตรฐานที่ใช้บ่อยสุด:** `paddingHorizontal: 16` · `paddingBottom: 18` · `borderRadius: 34` · GlassView `padding: 9` · ปุ่ม `height: 50`
- **2 แบบ:** *กระจก* = GlassView(padding 9) + ปุ่มข้างใน (สูงรวม = 9+ปุ่ม+9) · *พิลล์ตัน* = ปุ่มเดี่ยว radius 34 (สูง = ปุ่มล้วน)
- บาร์ composer (Chat/AI) ปุ่ม/ฟิลด์ `minHeight 44` + ปุ่มกลมส่ง/ไมค์ `44×44`
- HerbalMarketPR/Quote มีแถบ segmented ด้านบนแยก (`paddingBottom: 24`, ปุ่ม `height: 52`) คนละตัวกับ bar ลอย
