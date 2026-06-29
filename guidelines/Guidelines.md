# UX Guidelines

A reusable design reference distilled from **[Laws of UX](https://lawsofux.com/)** by Jon Yablonski. Use it as a project-agnostic checklist when designing or reviewing screens. Each law has its core principle and a practical "how to apply" tip — adapt the examples to your product.

> **How to use this file**
> - Fork it into a new project's `/guidelines/` folder.
> - When in doubt about a UI decision, scan the relevant section and pick the simplest fix that satisfies the law.
> - Reference a law in design/code review to make the reasoning explicit ("Moved this button by Fitts's Law").
> - Read the full law at `https://lawsofux.com/<slug>` when designing something new.

---

## 1. Cognitive Load & Memory

### Cognitive Load
The amount of mental resources needed to understand and interact with an interface.
- Strip extraneous detail from each screen. Keep one primary action visible.
- Defer secondary options behind disclosure (modals, accordions, "more" menus).
- Avoid asking the user to learn jargon — use words from their world, not yours.

### Miller's Law
A person can only keep **7 ± 2 items** in working memory at once.
- Bottom tab bar ≤ 5 tabs. Toolbars ≤ 7 actions.
- Long forms → split into steps. Long lists → paginate or chunk.
- Multi-digit numbers (phone, card, ID) → format with separators.

### Working Memory
A cognitive system that temporarily holds and manipulates information needed to complete tasks.
- Never make the user remember a value from a previous screen — repeat it on the current screen.
- Persist field values when the user navigates back; don't reset state mid-task.
- Show selections in a summary before a destructive or final action.

### Chunking
Break information into meaningful groups.
- Group related fields with whitespace or a divider, not a line every row.
- Format identifiers in chunks: phone numbers, credit cards, postal codes.
- In dashboards, cluster metrics by topic, not in a flat grid.

### Cognitive Bias
A systematic thinking error that influences judgment.
- Avoid dark patterns: fake anchored prices, manufactured urgency, hidden opt-outs.
- Honest defaults beat tricky ones; users notice and lose trust.
- Be skeptical of your own assumptions — test with real users.

### Mental Model
A compressed model of how a system works that users carry in their head.
- Use platform conventions (back button position, share icon, menu hamburger).
- When something behaves differently than expected, label it clearly.
- Onboarding should reinforce existing models, not introduce new ones.

---

## 2. Decision-Making

### Hick's Law
Decision time grows with the number and complexity of choices.
- Limit primary CTAs per screen to 1; secondary ≤ 2.
- Show the top N options; hide the rest behind "more" / "see all".
- For settings, group related options under categories rather than one flat list.

### Choice Overload
Too many options cause paralysis or abandonment.
- Curate a "recommended" subset before showing the full catalog.
- Filter chips: show the 5–6 most-used; hide the rest.
- A guided wizard often outperforms a free-form form with 30 fields.

### Occam's Razor
Pick the simplest solution that works.
- Shortest copy. Fewest steps. Smallest component.
- Three repeated lines is better than a premature abstraction.
- Remove a feature before adding a setting to hide it.

### Pareto Principle (80/20)
80% of effects come from 20% of causes.
- Polish the 20% of screens users hit daily before refining edge cases.
- The hero flow (sign in, primary task, exit) deserves disproportionate attention.
- Triage bugs by the percentage of users affected, not how loud the report is.

### Selective Attention
Users focus on a subset of stimuli in their environment.
- Reserve a single accent color for primary actions; everything else neutral.
- Reserve a separate alert color strictly for urgency/errors.
- Don't compete with motion. One animated element at a time per viewport.

---

## 3. Visual Perception (Gestalt)

### Law of Proximity
Items near each other are perceived as grouped.
- Tighten spacing within a group; widen spacing between groups.
- A label sits closer to its input than to the next field.
- Use the ratio of internal-vs-external gap to express hierarchy without lines.

### Law of Similarity
Visually similar elements feel related.
- All cards in a list share the same shape, padding, and typographic rhythm.
- Color = meaning. The same color twice should mean the same thing twice.
- Mixing icon styles (filled vs outlined, two-tone vs flat) breaks the group.

### Law of Common Region
Items inside a clearly bounded area are perceived as one group.
- Wrap a related set in a card, panel, or shaded background.
- A subtle background tint is often a better group cue than a hard border.
- Don't bound things that aren't actually related — it implies meaning.

### Law of Uniform Connectedness
Visually connected items feel more related than nearby items.
- A connecting line, divider, or shared background is a stronger group signal than mere proximity.
- Step indicators connected by a line read as one process, not five chips.

### Law of Prägnanz
People perceive ambiguous shapes as the simplest form possible.
- Use clear geometric primitives: rectangles, circles, rounded rects.
- Icons should be recognizable at 16px without squinting.
- Decorative complexity that doesn't add meaning is noise.

### Von Restorff Effect (Isolation Effect)
The element that differs stands out and is remembered.
- One primary button per view. Everything else neutral.
- The active state in a tab bar is colored; inactive states are gray.
- Don't let everything compete to be "the special one" — nothing wins.

---

## 4. Interaction & Performance

### Fitts's Law
Time to acquire a target is a function of its distance and size.
- Tap targets ≥ 44×44 dp (iOS HIG) / 48×48 dp (Material).
- Use `hitSlop` (RN) or padding (web) to extend touch area without bloating visuals.
- Place primary CTAs where the thumb naturally rests (bottom-center on mobile).
- Distant targets need to be bigger; corner targets are easier than centered ones on a desktop.

### Doherty Threshold
Productivity soars when system response is **< 400 ms**.
- Show optimistic UI immediately on tap; reconcile with the server later.
- Use skeleton loaders if a fetch will exceed 400 ms.
- Animate state transitions with ~150–300 ms; longer feels sluggish.

### Animation Timing — กฎ 100 / 300 / 500 ms
หลักคุม "ความเร็ว" ของ animation + micro-interaction ให้ตรงกับการรับรู้ของสมอง
(เร็วไป = หลอกตา/ไม่ทันเห็น, ช้าไป = รู้สึกอืด/รอ). เลือกช่วงเวลาตาม **ขนาดของการเปลี่ยนแปลง**:

- **~100 ms — Immediate Feedback** (การตอบสนองทันทีต่อการกระทำ)
  - ใช้กับ: กดปุ่ม (press/active state), ติ๊ก checkbox, toggle switch, ripple/scale-on-press.
  - ทำไม: สมองรับรู้ว่า "ทันที" + รู้สึกควบคุมระบบได้. < 100 ms มองไม่ทัน, > 100 ms เริ่มรู้สึกหน่วง (lag).
- **~300 ms — Transitions** (การเปลี่ยนผ่าน / การเคลื่อนที่ของออบเจกต์)
  - ใช้กับ: เปิด/ปิด modal · bottom sheet · dropdown, expand/collapse การ์ด, slide รูป/แท็บ, การ์ดเลื่อนเข้า.
  - ทำไม: เป็นช่วงที่ตา "เห็นการเคลื่อนไหวพอดี" — ไม่กะพริบหาย และไม่ช้าจนรู้สึกรอ. นี่คือ default ของ UI ส่วนใหญ่.
- **≥ 500 ms — Major Transitions** (การเปลี่ยนแปลงใหญ่ / งานที่ใช้เวลาจริง)
  - ใช้กับ: เปลี่ยนหน้าเต็มจอที่ต้องดึงความสนใจ, โหลดข้อมูลก้อนใหญ่, กระบวนการที่ระบบประมวลผลจริง (พร้อม loader).
  - ทำไม: เกินครึ่งวินาทีสมองเริ่มรู้สึกว่า "กำลังรอ" → **อย่าใช้กับปุ่ม/interaction ทั่วไป**, ใช้เฉพาะตอนต้องการสื่อว่าระบบกำลังทำงานสำคัญ.

**How to apply (โค้ดในโปรเจกต์นี้):**
- Press feedback: `active:opacity-*` / `Animated.spring(scale)` สั้น ๆ (~100 ms).
- Expand/collapse, sheet, tab slide: ~250–350 ms (เช่น `LayoutAnimation` duration ~300, `BottomSheet` spring). ยึด 300 ms เป็นค่ากลาง.
- หลีกเลี่ยง animation > 500 ms บน interaction ที่ผู้ใช้กดบ่อย (รู้สึกอืด).
- spring ที่ "เด้งช้า" อาจกินเวลารวม > 400 ms — ตั้ง damping/tension ให้จบไวพอ ถ้าไม่ใช่ major transition.

### Postel's Law
Be liberal in what you accept, conservative in what you send.
- Trim whitespace on inputs. Accept email case-insensitively.
- Phone numbers: accept with or without dashes / spaces; normalize before sending.
- Date inputs: parse multiple formats and display in one canonical format.
- Output should always be the cleanest, most-validated form.

### Tesler's Law (Law of Conservation of Complexity)
Every system has irreducible complexity — someone has to absorb it.
- Hide complexity from the user; absorb it in code or product decisions.
- Don't push edge cases onto the user form ("enter the BBAN if your bank uses one").
- Auto-derive what you can (country from IP, address from postal code, weight unit from locale).

---

## 5. Behavior & Motivation

### Aesthetic-Usability Effect
Beautiful designs feel more usable, even when usability is identical.
- Polish typography (line-height, weight, contrast) and spacing before adding features.
- Consistent radii, shadow, and alignment cost little but raise perceived quality.
- A small "delight" detail (a smooth transition, a satisfying tick) builds trust.

### Flow
The mental state of full immersion in an activity.
- Don't interrupt with modals during a multi-step task.
- Keep navigation predictable; back always works.
- Defer non-critical notifications until the user reaches a stopping point.

### Goal-Gradient Effect
Motivation increases as the user nears the goal.
- Show progress: "Step 2 of 3", progress bar, completion count.
- Front-load easy steps; the user gains momentum before the hard ones.
- Make the finish visible early — a checkout summary in the header.

### Zeigarnik Effect
Incomplete tasks are remembered better than completed ones.
- Surface unfinished work on a "home" or dashboard view ("Resume your draft").
- Save abandoned forms so the user can return.
- A non-blocking "almost done" banner is more powerful than a popup.

### Paradox of the Active User
Users never read manuals; they start using the software immediately.
- The first screen must be self-explanatory.
- Empty states should teach by example, not by paragraphs.
- Tooltips are a last resort, not a primary teaching tool.

---

## 6. Memory & Experience

### Peak-End Rule
People judge an experience by its peak and its end.
- Make the final step delightful — a confirmation animation, a clear "what's next".
- Recover gracefully from errors; a great recovery beats a great happy path.
- The "thank you" screen is more memorable than the form-filling.

### Serial Position Effect
First and last items in a series are remembered best.
- Put the most important menu items at the start and end of a list.
- In a tab bar, anchor "home" and "profile" at the ends.
- Buried-in-the-middle items get the least attention — don't hide critical actions there.

### Parkinson's Law
A task expands to fill the time allowed.
- Time-box decisions: countdowns, scheduled cutoffs, or short trial windows.
- Limit form fields to what you truly need today.
- Default to "good enough now" over "perfect later".

### Jakob's Law
Users prefer your site to work like the sites they already know.
- Don't reinvent universal conventions: heart for favorite, bag for cart, magnifier for search.
- Match patterns from the dominant apps in your category — users have trained on them.
- Innovation should be reserved for the parts users will gain from, not where they expect convention.

---

## 7. Implementation Consistency

### Component Reuse Principle

**Rule (revised):** ถ้า UI component หนึ่งใช้งาน **≥ 3 ที่** + **look + behavior เหมือนกันจริง ๆ** → extract เป็น **shared component** แล้ว `import` ไปใช้

> Sandi Metz: *"Duplication is far cheaper than the wrong abstraction."* — ถ้า extract ผิด แก้ยากกว่า copy/paste

**Why extract (เมื่อทำถูกที่):**
- UI + behavior ต้องเหมือนกันทุกที่ที่ใช้ (Jakob's Law + Consistency Heuristic) → ผู้ใช้เรียนรู้ครั้งเดียวใช้ได้ทุกที่
- ลด visual drift — แก้ที่ source เดียวเปลี่ยนทุกที่อัตโนมัติ
- ลด code duplication → bug surface น้อยลง → maintenance ง่าย

**Decision Checklist (เช็คก่อน extract):**
1. ⬜ ใช้งานจริง **≥ 3 ที่** หรือเปล่า? (Rule of Three — รอจน pattern ชัด)
2. ⬜ Behavior **เหมือนกัน 100%** ไหม? (ไม่ใช่แค่ดูคล้ายกัน)
3. ⬜ ออกแบบ props ได้ **≤ 7 ตัว** ไหม? (ถ้าเกิน = abstraction ผิด)
4. ⬜ ถ้าอนาคต variant แตกต่างมาก สามารถ **inline กลับได้** ไหมโดยไม่ใหญ่โต?

ตอบ "ไม่" ข้อใดข้อหนึ่ง → **ยังอย่า extract** เก็บ duplicate ไว้ก่อน

**How to apply:**
1. **ก่อน**เขียน component ใหม่ → search `src/components/` (หรือ design system folder ของโปรเจค) ก่อนว่ามีของเดิมใช้ได้ไหม
2. ผ่าน checklist → extract เข้า shared component folder
3. หน้า 2 ต้องการ variant ต่างจากของเดิมเล็กน้อย → **เพิ่ม prop** ให้ของเดิม ไม่ fork สร้างใหม่ (แต่ถ้า prop เริ่มเกิน 7 ตัว → คิดใหม่ อาจเป็น 2 component คนละตัวจริง ๆ)
4. ตรวจ shared component เป็นระยะ — ถ้า variant ห่างกันมากเรื่อย ๆ → กล้า split กลับ

**Common candidates (UI ที่มักใช้หลายที่):**
Button, Input, Card (Product/Order/etc.), Modal/BottomSheet, Toast, Avatar, Badge, Pill, Icon button, Tab pill, Filter chip, List row, Empty state, Loader/Skeleton

**Anti-patterns ห้ามทำ:**
- ❌ Copy/paste component จากหน้าหนึ่งไปอีกหน้าหนึ่ง (ครบ 3 ที่ค่อย extract)
- ❌ Extract ตอน 2 instance แรก โดยไม่รู้ว่า variant จริง ๆ จะมีกี่แบบ → premature abstraction
- ❌ ใส่ prop เพื่อ accommodate ทุก variant — เมื่อ **props > 7 ตัว** = สัญญาณว่า abstraction ผิด ให้ split
- ❌ Force share เมื่อ behavior ต่างกัน (เช่น "ดูเหมือน button" แต่ตัวหนึ่งเปิด modal ตัวหนึ่ง navigate)
- ❌ สร้าง `LocalButton` ในหน้า A และ `MyButton` ในหน้า B ที่เกือบเหมือนกัน
- ❌ Hardcode style/color/padding ซ้ำในหลายไฟล์ (ใช้ design token แทน — token ไม่ต้อง ≥ 3)
- ❌ Refactor ครึ่งทาง — เหลือของเดิม + ของใหม่อยู่ในโปรเจคพร้อมกัน (ต้องลบ legacy ทันที)

**When NOT to extract:**
- Component < 20 บรรทัด + ใช้ ≤ 2 ที่ → duplicate ถูกกว่า
- Visual ดูคล้ายกัน แต่ semantic ต่าง (เช่น "card" สำหรับ product vs notification)
- Variant อาจแตกต่างกันในอนาคตที่คาดเดาไม่ได้

**Tokens vs Components:**
- ค่าพื้นฐาน (color, spacing, radius, font size) → **design token** (ไม่ต้องรอ rule of three)
- โครงสร้างประกอบ (button, card, header) → **component** (รอ rule of three)

**Scope:** กฎนี้ใช้กับ**ทุกโปรเจค** (web / mobile / native) — ไม่ปรับตาม project

---

## 8. Accessibility — Color Contrast (WCAG)

### Rule
สีของ **content ที่ผู้ใช้ต้องอ่าน/ใช้งานจริง** ต้องผ่าน **WCAG 2.1 Level AA**:
- Normal text (< 18pt) : contrast ratio **≥ 4.5:1**
- Large text (≥ 18pt / ≥ 14pt bold) : **≥ 3:1**
- UI components / icons / borders : **≥ 3:1** กับ bg

### Apply to (บังคับใช้)
- Body text, label, placeholder, helper text
- Button text + icon
- Form input (border, text, label, error message)
- Navigation items (tab, menu, breadcrumb)
- Interactive icons (back, cart, heart, search, ฯลฯ)
- Status indicators (badge count, dot, chip)
- Link text
- Focus indicator (outline / ring)

### Exemptions (ยกเว้น — ตาม WCAG 1.4.3 + brand policy)
- **Brand colors ที่ใช้เพื่อ identity เท่านั้น** — เช่น banner bg, hero section, splash screen
- **Logo** — ห้ามบังคับเปลี่ยนสีแบรนด์
- **Pure decoration** — watermark, ลายพื้นหลัง, gradient ตกแต่ง
- **Disabled state** — WCAG ไม่บังคับ disabled elements
- **Inactive UI** ที่ผู้ใช้ไม่ต้อง interact
- **Marketing content** ที่ผู้ใช้ดูผ่าน ๆ ไม่ต้องอ่านเนื้อหา

### When brand color conflicts with WCAG (priority order)
1. **คงสีแบรนด์ — ปรับ foreground:** เช่น brand-color bg → ใส่ text สีขาว/ดำที่ ratio ผ่าน
2. **เพิ่ม non-color affordance:** ใส่ icon + label + pattern → ผู้ใช้ที่ตาบอดสีก็เข้าใจได้
3. **สร้าง variant สำหรับ accessible context:** เช่น `BRAND` (decorative) + `BRAND_AA` (text/critical UI)
4. **Document exception:** ถ้าจำเป็นต้องคง brand สีในตำแหน่งที่ไม่ผ่าน → comment + เหตุผลใน code

### Don't rely on color alone (WCAG 1.4.1)
ข้อมูลทุกอย่างที่บอกผ่านสี ต้องบอกด้วยช่องทางอื่น **อย่างน้อย 1 ช่อง** เพิ่ม:
- Icon + label
- Pattern / texture
- Text status
- Position / shape

### Color blindness check
- Test pair `red/green` เป็นพิเศษ (8% ของผู้ชาย, 0.5% ของผู้หญิง affected)
- ใช้ Sim Daltonism, Stark plugin (Figma), Chrome DevTools rendering tab

### Tools
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Stark plugin (Figma)
- Chrome DevTools → Lighthouse Accessibility
- macOS Accessibility Inspector

### Decision flow (ก่อน design / dev)
1. ⬜ Element นี้ผู้ใช้ต้องอ่าน/กด/รับ info ไหม → ใช่ = บังคับ WCAG AA
2. ⬜ ใช่ brand color บังคับใช้ไหม → ใช่ = ปรับ foreground หรือเพิ่ม affordance
3. ⬜ Decorative อย่างเดียวไหม → ใช่ = exempt (แต่ยังต้องคิด context)
4. ⬜ Info พึ่งสีอย่างเดียวไหม → ใช่ = เพิ่ม icon/label/pattern อีก 1 ช่อง

**Scope:** กฎนี้ใช้กับ**ทุกโปรเจค** (web/mobile/native) — เนื้อหาที่ผู้ใช้ต้องใช้งานต้องผ่าน AA, ตกแต่ง/แบรนด์ identity ยกเว้น

---

## Quick Reference Cheatsheet

| Need to... | Reach for... |
|---|---|
| Reduce options on screen | Hick's Law, Choice Overload |
| Make tap target reliable | Fitts's Law |
| Make app feel responsive | Doherty Threshold, Aesthetic-Usability |
| Pick an animation duration | Animation Timing — 100 ms (feedback) / 300 ms (transition) / 500 ms+ (major) |
| Group related content | Proximity, Common Region, Uniform Connectedness |
| Highlight a single action | Von Restorff, Selective Attention |
| Help user finish a multi-step task | Goal-Gradient, Flow, Zeigarnik |
| Make form forgiving | Postel's Law, Tesler's Law |
| Land on a positive note | Peak-End Rule |
| Stay within memory limits | Miller's Law, Chunking, Working Memory |
| Use familiar patterns | Jakob's Law, Mental Model |

---

## METAHERB — Project-Specific Rules

> The sections below override or extend the universal laws above. Distilled by auditing the existing web build so the mobile port (and any other surface) stays visually and behaviorally consistent.

### Brand & Color Palette

**Primary green (brand)**
| Use | Hex |
|---|---|
| Primary CTA / active state | `#319754` |
| CTA hover / active darker | `#008c45` → `#007a3b` |
| Price text (non-discounted) | `#226a3b` |
| Link / underline accent | `#297a4e` |

**Urgency red (Flash Sale only — reserved)**
| Use | Hex |
|---|---|
| Discount price text | `#e62e05` |
| Countdown digit bg / mini countdown | `#bc1b06` |
| Discount badge fill on cards | `#ee4d2d` |

**Neutrals**
| Use | Hex |
|---|---|
| Page background | `#fafafa` |
| Banner cream background | `#faf8f5` |
| Card border | `#d4d4d4` |
| Muted text / placeholder | `#a3a3a3` |
| Secondary text | `#525252` / `#737373` |
| Primary text | `#0a0a0a` / black |

**Accent (semantic)**
| Use | Hex |
|---|---|
| Coupon icon / "คูปอง" tag | `#DF9723` / dark amber `#947005`, `#af6f08` |
| Star rating (filled) | `#F7C42B` (preferred) / `#f7931d` (legacy) |
| Heart / wishlist active | `#ff383c` |

> ❗ **Never use red `#e62e05` outside of Flash Sale / discount context** — it loses urgency meaning (Selective Attention).

### Typography

- **Primary family**: `IBM Plex Sans Thai Looped` (web) → fallback `System` / `Sans-Serif` on RN.
- **Scale (px)**: 10 · 11 · 12 · 13 · 14 · 16 · 18 · 20.
- **Section heading**: 20 / weight 500 / color black.
- **Card name**: 14 / weight 500 / truncate single line.
- **Price**: 14 / weight 600 / color = `#e62e05` if discounted else `#226a3b`.
- **Meta text** (rating, sold, original price): 10–11 / regular.
- **Mini countdown digit**: 10 / weight 700 / white on red box.
- **Body text on light bg**: 12–14 / weight 400.

Always set `lineHeight` ~1.2× of `fontSize` on RN Text + `includeFontPadding: false` on Android — without it Thai vowels and tone marks add extra vertical space and break pill/badge centering.

### Border Radius Scale

| Token | px | Used for |
|---|---|---|
| `sm` | 4 | Mini countdown digit, badge corners |
| `md` | 6 | Small pill (countdown) |
| `lg` | 8 | Demo info box, secondary buttons |
| `xl` | 12 | Flash Sale badge top-right corner |
| `2xl` | 16 | Section cards, product cards, banner |
| `pill` | 9999 | Discount pill, CTA button, input, social button |

### Spacing & Layout

- **Section horizontal padding**: 16px (mobile) / 24 (sm) / 48 (lg).
- **Section vertical padding**: bottom 24 (`pb-6`).
- **Between sections**: 12–16px margin or background-color break.
- **Inside section card**: 16px padding all sides, 16px header→content gap.
- **Inside product card**: 10px padding, 4px gap between info rows.
- **Grid gap (products 2-col)**: 12px column gap.
- **Header to grid gap inside section**: 16px (`mb-4`).
- **Card grid breakpoints** (web reference): mobile 2 / sm 3 / md 4 / lg 6.

### Layout Patterns (web → mobile mapping)

| Web pattern | Mobile equivalent | Notes |
|---|---|---|
| Top bar w/ logo + search + cart | Top bar w/ logo + search + 🔔 + 🛒 | Search must be ≥ 44px tall (Fitts). |
| Side banner grid 2-col below hero | 2-col flex-row, same height as hero | Side banner aspect derived from hero height. |
| Categories paginated 4/6/9 | Categories grid 4-per-row | 40px circle, 11px label, `gap: 6`. |
| Section card `bg-white rounded-[16px] p-[16px]` | Full-bleed `bg-white py-4` + `paddingHorizontal: 16` on children | Edge-to-edge on mobile reads cleaner. |
| Horizontal product carousel | **Paged 2-per-page snap scroll** + animated dots | More finger-friendly than free scroll. |
| Bottom-right Wishlist heart on card | (Removed in current mobile mockup; re-add when wishlist exists.) | |
| Hover state | `active:opacity-90` + `active:scale-95` | RN/web `:hover` doesn't apply on touch. |

### Component Patterns

#### Button
- **Primary**: bg `#008c45` (hover `#007a3b`), white text, height 49px, `rounded-full`, 14px font-medium.
- **Outline / Social**: border `#d4d4d4`, gray-700 text, height 40, `rounded-full`, 11–12px font-medium.
- **Chip / Pill button**: bg `${primary}/10`, primary text, px-4 py-1.5, 12px font.

#### Input
- Height 48 (form input) / 44 (search bar).
- bg `#fafafa`, `rounded-full`, px-6, 14px text.
- Focus: ring-2 of `${primary}/30`.
- Trim + lowercase email on submit (Postel's Law).

#### Card (Product)
- Height 259 (regular) / 290 (flash sale with progress bar).
- bg white, border `#d4d4d4`, `rounded-[16px]`, shadow-sm.
- Image area: `flex-1` → `bg-gray-100` placeholder, image `resizeMode: "cover"`.
- Info area: 10px padding, 4px gap rows.
- Pressed state: `active:opacity-90 active:scale-95`.

#### Badge / Pill
- **Discount/Recommended pill** (top-right of card): `paddingHorizontal: 6, paddingVertical: 3, borderRadius: 9999`, 10px font-semibold white, colored shadow matching fill.
- **Flash Sale badge** (bottom-left of card): bg `rgba(230,46,5,0.8)`, `paddingHorizontal: 10, paddingVertical: 6, borderTopRightRadius: 12` + MiniCountdown.
- **Coupon icon**: 14×15px SVG, fill `#DF9723`, sits inline next to price.

#### Modal / Sheet
- Web: centered `max-w-[500px]`, `rounded-2xl`, white card on overlay.
- Mobile: prefer full-screen sheet or bottom sheet — modals are easier to dismiss with a swipe.

#### Toast / Feedback
- Position: top-center (web — sonner).
- Mobile: brief in-button state change before navigating (Peak-End) — see Login success pattern.

### Domain-Specific (E-commerce)

- **Price display**: always show current price; if discounted, show `originalPrice` line-through next to it + discount pill on image.
- **Free shipping / Coupon flags**: tiny inline badge or icon next to price, not a separate row.
- **Flash sale priority**: tag hierarchy is `flashsale > discount > recommended` — only show the top-most.
- **Rating format**: `X/5` with single star icon (yellow `#F7C42B`).
- **Sold count format**: "ขายได้ XXX+" (Thai with `+` suffix above 50).
- **Categories**: stick to the 9 web categories — สมุนไพร, อาหาร, ยา, เครื่องหอม, ความสวย, ชุดของขวัญ, ชาสมุนไพร, อาหารเสริม, น้ำมันสกัด.

### Bottom Tab Bar (Mobile)

- **Limit**: 4 tabs (Miller's Law / Serial Position).
- **Order**: หน้าแรก · ผลิตภัณฑ์ · สาระความรู้ · บัญชี.
- Active = primary green icon + label; inactive = `#9ca3af`.
- Unimplemented tabs show "**กำลังพัฒนา**" sublabel in amber `#f59e0b` 8px — set expectations honestly (Mental Model).

### Iconography

- Library: `lucide-react` (web) / `@expo/vector-icons` Ionicons (mobile).
- Stroke width 2 default; bold 2.4 for primary actions.
- Icon size scale: 12 (inline) / 14 (badge) / 16–18 (buttons) / 22–24 (top bar / tabs).

### Copy & Voice

- Language: Thai primary, English supplementary (product names mix both is OK).
- Numbers: use Western digits, format currency as `฿ 199.00` with space.
- Dates (display): `วันที่ 15 กุมภาพันธ์ 2569` or `15 ก.พ. 2569 - 14:50 น.`.
- Call-to-actions: short verb + noun, e.g. "เข้าสู่ระบบ", "ลงทะเบียน", "ดูทั้งหมด".
- Empty state: friendly + give a next step — never "ไม่มีข้อมูล" alone.

### Forbidden Patterns

- ❌ FAB (floating action button) on top of bottom tab — too crowded.
- ❌ Dropdown when options ≤ 2 — use toggle / radio.
- ❌ Auto-playing video with sound.
- ❌ Modal in the middle of a checkout — interrupt only with critical info (Flow).
- ❌ Red `#e62e05` outside flash sale context (dilutes urgency).
- ❌ Generic "ไม่สำเร็จ" toast — always say WHY and what to do next.

### Mobile Adaptation Notes

- **Container width**: cap viewport at 430px on web preview (Expo Go width simulation) so layout matches mobile rendering.
- **Image**: prefer `require("./local/path.png")` for product/banner stills; remote `{ uri: "..." }` only when content is dynamic.
- **`SafeAreaView`** with `edges=["top"]` for top inset, `["bottom"]` for tab bar — explicit edges avoid wasted padding inside.
- **Animated dots indicator**: drive via `Animated.Value` bound to scrollX + `interpolate()` — gives smooth in-between widths and color blending instead of stepped changes.
- **Snap pager**: use `FlatList horizontal pagingEnabled` with each page = `SCREEN_WIDTH` for clean 2-per-page navigation.

### WCAG Color — METAHERB Specifics

Extends Section 8 of the universal rules. METAHERB-specific guidance for the brand palette:

**Brand color audit (against white `#ffffff`)**
| Color | Hex | Ratio | Verdict |
|---|---|---|---|
| Primary green | `#319754` | ≈ 3.96:1 | ⚠️ AA large text only — OK for buttons (white text on it = 4.5:1 ✅), **not OK** for body text on white bg |
| Primary green dark | `#267a43` | ≈ 5.4:1 | ✅ AA normal text |
| Discount red | `#e62e05` | ≈ 3.6:1 | ⚠️ AA large text only — use on bg with shadow or larger weight |
| Badge red | `#ee4d2d` | ≈ 3.7:1 | ⚠️ AA large text only — fine as bg with white text on it |
| Star amber | `#f59e0b` | ≈ 2.3:1 | ❌ FAIL — for rating display (decorative number+star pattern), pair with star icon shape, not as text on white |
| Body text | `#0a0a0a` | ≈ 19:1 | ✅ AAA |
| Secondary text | `#525252` | ≈ 8:1 | ✅ AAA |
| Muted text | `#737373` | ≈ 5.5:1 | ✅ AA |
| Disabled text | `#a3a3a3` | ≈ 3.1:1 | ⚠️ For disabled state only (exempt) |

**Rules of thumb for the green brand:**
- `#319754` on **white text** → 4.5:1 ✅ — use as button bg
- `#319754` as **text** on white → ⚠️ use only for headings/large or non-critical
- Body links on white → use `#267a43` (dark green) not `#319754`

**Non-color affordances ที่ใช้แล้วในแอป:**
- Unread notification: bold + green-tint bg + dot + section label (4 channels) ✅
- Cart selected: green-filled checkbox + check icon (2 channels) ✅
- Active tab: green pill + white text + bold weight (3 channels) ✅
- Following state: red heart fill + border + tint bg + toast (4 channels) ✅

**Documented exceptions:**
- Banner green block (Shop, Login splash) — decorative identity, exempt
- Watermark herb leaves — decorative, exempt
- Disabled qty button (opacity 0.4) — disabled state, exempt

### Lessons Learned (rolling log)

> Append a dated note when a UX issue surfaces or a pattern is validated.

- _(none yet — add as the mobile port matures)_

---

> Sources: [Laws of UX](https://lawsofux.com/) by [Jon Yablonski](https://jon-yablonski.com/). Content adapted under fair use as a project reference. METAHERB-specific rules derived from the existing web build for design parity across surfaces.
