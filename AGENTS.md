# MobileMetaherb-RN — Agent Instructions

A React Native / Expo port of the METAHERB e-commerce web app, in mobile mockup phase.

## Environment

- **Expo SDK 54** (was 56 in the initial scaffold, downgraded to match Expo Go in App Store).
- React Native 0.81.x, React 19.1, TypeScript ~5.9.
- Use Expo's versioned docs: https://docs.expo.dev/versions/v54.0.0/
- Node 24 → run any `expo` command with `NODE_OPTIONS="--no-experimental-strip-types"` to avoid the `.ts` type-stripping crash in `node_modules`.

## Stack

- **Navigation**: `@react-navigation/native` + native-stack (no expo-router).
- **Styling**: NativeWind v4 (Tailwind classes) + inline `style` for cases NativeWind misses on web (notably `Image` width/height).
- **Web target**: `expo export --platform web` with `output: "single"`, `experiments.baseUrl: "/MobileMetaherb"` for GitHub Pages. Web viewport is constrained to a 430px phone frame in `App.tsx`.
- **Assets**: `assets/banner/*.jpg`, `assets/products/*.png`. Use `require()` not URL strings for local images.

## Reference Materials

> **Read [guidelines/Guidelines.md](./guidelines/Guidelines.md) before making UX/design decisions.**
>
> It is the single source of truth for:
> - All 30 Laws of UX (apply when designing or reviewing screens)
> - METAHERB brand palette (primary green `#319754`, urgency red `#e62e05`, neutrals, accents)
> - Typography scale, border radius scale, spacing
> - Component patterns (Button, Input, Card, Pill, Modal, Toast)
> - Mobile adaptation notes (full-bleed sections, paged 2-per-page lists, animated dots)
> - Forbidden patterns

Whenever a UI change is requested, cite the relevant law/section ("Increased hitSlop by Fitts's Law", "Trimmed email per Postel's Law") so the reasoning stays explicit.

## Web ↔ Mobile Parity

- The web source lives at `../MobileMetaherb/src/app/`. When in doubt about a design detail, open the matching web file (e.g. `pages/HomePage.tsx`) and port the spec — colors, spacing, radii are all already tuned.
- Web uses Tailwind utilities; mobile uses NativeWind. The class names mostly translate 1:1.
- `Image` on react-native-web renders as a `<div>` with `background-image` — set width/height via inline `style`, not className.

## Project Conventions Snapshot

- Bottom tab limit: 4 (Home / Products / Knowledge / Account).
- Unimplemented tabs show "กำลังพัฒนา" sub-label in amber `#f59e0b` 8px.
- Section card: full-bleed `bg-white py-4` with `paddingHorizontal: 16` on inner content (not `p-4` on outer).
- Product cards: 259px (regular) / 290px (flash sale with progress bar).
- `cardWidth = Math.floor((SCREEN_WIDTH - 32 - 12) / 2)` — always floor to prevent flex-wrap from breaking the 2-col grid.
- Paged sections (แนะนำ / Flash Sale): each page is `SCREEN_WIDTH`-wide with 2 cards inside.
- Indicator dots animate via `Animated.Value` bound to `scrollX` + `interpolate`.

## Don't

- Don't pull `expo-image` — it broke build under Node 24 type-stripping. Use plain `react-native` `Image`.
- Don't add config plugins to `app.json` unless absolutely needed (same Node 24 issue).
- Don't reach for `expo-router` — navigation is `@react-navigation` and `output: "single"` SPA for web.
- Don't use red `#e62e05` outside flash-sale / discount context (per Guidelines).
