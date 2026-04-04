# Amlakbin Design System
## `amlakbin-design-system.md` — Single source of truth for all UI decisions
## Read this file completely before writing any component, page, or style.

---

## 1. Brand Identity & Vibe

**Product:** Amlakbin (املاک‌بین) — Persian B2B SaaS for Iranian real estate offices.
**Users:** Office managers (desktop-first) and agents (mobile-first).
**Market:** Iran only. Farsi, RTL, Jalali calendar throughout.

**Personality:** Professional confidence with Persian warmth. Not cold enterprise SaaS,
not playful consumer app. A tool that serious real estate professionals trust on day one.

**Default visual direction — Light & Minimal:**
Clean, airy, fast. Warm white surfaces (not clinical pure white), generous
whitespace, teal as the single accent color that pops against the neutral base.
Think a well-designed property brochure — everything in service of the content.
The creativity lives in the details: teal micro-interactions, sharp typography
hierarchy, property photo cards with strong visual presence.

**Dark mode (toggle):** Activated via the topbar toggle. Deep near-black surfaces
with glassmorphism floating panels. Same teal accent. A genuine alternative for
night work, not an afterthought.

**The one constant across both modes:** IranYekanX typeface and teal (`#14B8A6`).

**The one thing users remember:** Teal on warm white — every primary action,
active state, and key metric is crisp teal against a warm neutral background.
Immediately distinctive in a market where every competitor is cold blue/white/gray.

**Design references:**
- App navigation: Linear, Claude.ai sidebar
- RTL patterns: Divar (familiarity baseline for Iranian users)
- Light mode quality: claude.ai, Vercel, Linear
- Component base: shadcn/ui with warm neutral palette on top

---

## 2. Color System

All tokens in `globals.css` under `@layer base`.
**Light mode is the default — no class needed.**
Dark mode via `.dark` on `<html>` (Tailwind `darkMode: 'class'`).

### Default (Light mode)

Warm-tinted neutrals, not cold grays. The subtle warmth makes the interface
feel approachable and premium without being loud.

```css
:root {
  /* Backgrounds */
  --color-base:        #FAFAF9;  /* page bg — warm white, not clinical */
  --color-surface-1:   #FFFFFF;  /* sidebar, primary cards */
  --color-surface-2:   #F4F4F2;  /* inputs, secondary cards */
  --color-surface-3:   #EEEEEC;  /* hover states */
  --color-surface-4:   #E8E8E5;  /* pressed, dividers */

  /* Borders */
  --color-border-subtle:  #EFEFED;  /* default card borders */
  --color-border-default: #E2E2DF;  /* hover, form inputs */
  --color-border-strong:  #CBCBC7;  /* focus base, emphasized */

  /* Text — warm slate */
  --color-text-primary:   #1C1C1A;  /* headings, primary content */
  --color-text-secondary: #5C5C57;  /* body, labels */
  --color-text-tertiary:  #9C9C96;  /* hints, placeholders, disabled */
  --color-text-inverse:   #FFFFFF;  /* text on teal or dark bg */

  /* Teal accent — unchanged across modes */
  --color-teal-300:    #5EEAD4;
  --color-teal-400:    #2DD4BF;
  --color-teal-500:    #14B8A6;   /* default — use this everywhere */
  --color-teal-600:    #0D9488;   /* pressed / darker */
  --color-teal-700:    #0F766E;   /* text on teal-tinted bg */
  --color-teal-50:     #F0FDFA;
  --color-teal-100:    #CCFBF1;
  --color-teal-50-a:   rgba(20, 184, 166, 0.08);
  --color-teal-100-a:  rgba(20, 184, 166, 0.14);
  --color-teal-glow:   rgba(20, 184, 166, 0.20);

  /* Semantic — light mode */
  --color-success:        #16A34A;
  --color-success-bg:     #F0FDF4;
  --color-success-border: #BBF7D0;
  --color-success-text:   #15803D;

  --color-warning:        #D97706;
  --color-warning-bg:     #FFFBEB;
  --color-warning-border: #FDE68A;
  --color-warning-text:   #B45309;

  --color-danger:         #DC2626;
  --color-danger-bg:      #FEF2F2;
  --color-danger-border:  #FECACA;
  --color-danger-text:    #B91C1C;

  --color-info:           #0284C7;
  --color-info-bg:        #F0F9FF;
  --color-info-border:    #BAE6FD;
  --color-info-text:      #0369A1;

  /* Plan badge colors */
  --color-plan-free:         #5C5C57;
  --color-plan-free-bg:      #F4F4F2;
  --color-plan-pro:          #0D9488;
  --color-plan-pro-bg:       #F0FDFA;
  --color-plan-pro-border:   #99F6E4;
  --color-plan-team:         #7C3AED;
  --color-plan-team-bg:      #F5F3FF;
  --color-plan-team-border:  #DDD6FE;

  /* Floating panels — light mode: solid white + shadow */
  --color-overlay-bg:     #FFFFFF;
  --color-overlay-border: #E2E2DF;

  /* Shadows — light mode */
  --shadow-sm:    0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
  --shadow-md:    0 4px 8px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
  --shadow-lg:    0 12px 24px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06);
  --shadow-xl:    0 24px 48px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.06);
  --shadow-teal:  0 0 0 1px rgba(20,184,166,0.25), 0 4px 16px rgba(20,184,166,0.12);
  --shadow-focus: 0 0 0 3px rgba(20,184,166,0.20);
}
```

### Dark mode — `.dark` on `<html>`

```css
.dark {
  /* Backgrounds */
  --color-base:        #0F1923;
  --color-surface-1:   #141F2B;
  --color-surface-2:   #1A2535;
  --color-surface-3:   #1F2D3D;
  --color-surface-4:   #253347;

  /* Borders */
  --color-border-subtle:  rgba(255,255,255,0.06);
  --color-border-default: rgba(255,255,255,0.10);
  --color-border-strong:  rgba(255,255,255,0.18);

  /* Text */
  --color-text-primary:   #F1F5F9;
  --color-text-secondary: #94A3B8;
  --color-text-tertiary:  #64748B;
  --color-text-inverse:   #0F1923;

  /* Teal — same, no override needed */

  /* Semantic — dark mode */
  --color-success:        #22C55E;
  --color-success-bg:     rgba(34,197,94,0.10);
  --color-success-border: rgba(34,197,94,0.20);
  --color-success-text:   #4ADE80;

  --color-warning:        #F59E0B;
  --color-warning-bg:     rgba(245,158,11,0.10);
  --color-warning-border: rgba(245,158,11,0.20);
  --color-warning-text:   #FBB224;

  --color-danger:         #EF4444;
  --color-danger-bg:      rgba(239,68,68,0.10);
  --color-danger-border:  rgba(239,68,68,0.20);
  --color-danger-text:    #F87171;

  --color-info:           #38BDF8;
  --color-info-bg:        rgba(56,189,248,0.10);
  --color-info-border:    rgba(56,189,248,0.20);
  --color-info-text:      #7DD3FC;

  /* Plan colors — dark */
  --color-plan-free:         #94A3B8;
  --color-plan-free-bg:      rgba(148,163,184,0.10);
  --color-plan-pro:          #2DD4BF;
  --color-plan-pro-bg:       rgba(20,184,166,0.10);
  --color-plan-pro-border:   rgba(20,184,166,0.25);
  --color-plan-team:         #A78BFA;
  --color-plan-team-bg:      rgba(139,92,246,0.10);
  --color-plan-team-border:  rgba(139,92,246,0.25);

  /* Floating panels — dark mode: glass with blur */
  --color-overlay-bg:     rgba(20,31,43,0.92);
  --color-overlay-border: rgba(255,255,255,0.10);

  /* Shadows — dark mode */
  --shadow-sm:    0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
  --shadow-md:    0 4px 12px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.2);
  --shadow-lg:    0 12px 32px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.2);
  --shadow-xl:    0 24px 48px rgba(0,0,0,0.5), 0 8px 16px rgba(0,0,0,0.3);
  --shadow-teal:  0 0 0 1px rgba(20,184,166,0.3), 0 0 20px rgba(20,184,166,0.15);
  --shadow-focus: 0 0 0 3px rgba(20,184,166,0.25);
}
```

### Floating panels (modals, dropdowns, popovers, tooltips)

```css
.overlay {
  background: var(--color-overlay-bg);
  border: 1px solid var(--color-overlay-border);
  border-radius: 16px;
  box-shadow: var(--shadow-xl);
}

/* Blur ONLY in dark mode, gated by @supports for mobile performance */
@supports (backdrop-filter: blur(1px)) {
  .dark .overlay {
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
}
```

Light mode panels: solid white + shadow. No blur. Clean and fast.
Dark mode panels: glass + blur. Glassmorphism is a dark-mode-only feature.

### Tailwind aliases (in `tailwind.config.ts`)

```ts
colors: {
  base:           'var(--color-base)',
  surface:        'var(--color-surface-1)',
  elevated:       'var(--color-surface-2)',
  'surface-hover':'var(--color-surface-3)',
  accent:         'var(--color-teal-500)',
  'accent-light': 'var(--color-teal-400)',
  'accent-dark':  'var(--color-teal-600)',
  'text-main':    'var(--color-text-primary)',
  'text-muted':   'var(--color-text-secondary)',
  'text-hint':    'var(--color-text-tertiary)',
  'border-subtle':'var(--color-border-subtle)',
  'border-mid':   'var(--color-border-default)',
}
```

---

## 3. Typography

**Primary font: IranYekanX** — variable font, weights 100–900.
Loaded via `next/font/local` in root layout. Applied globally to `<html>`.

فارسی کردن اعداد انگلیسی و عربی
Stylistic alternates (ss02)
با فعال کردن استایلستیک سری ss02 اعداد انگلیسی بصورت فارسی نمایش داده می‌شود. در مثال زیر ردیف اول اعداد فارسی است و ردیف دوم اعداد انگلیسی است که فارسی شده است.


.ss02 {
    -moz-font-feature-settings: "ss02";
    -webkit-font-feature-settings: "ss02";
    font-feature-settings: "ss02";
}

هم عرض(monospace) کردن اعداد
Stylistic alternates (ss03)
با فعال کردن استایلستیک سری ss03 اعداد بصورت منو اسپیس تایپ می‌شود یعنی عرض همه اعداد برابر است و مناسب استفاده در لیست‌ها و جداول اطلاعات.


.ss03 {
    -moz-font-feature-settings: "ss03";
    -webkit-font-feature-settings: "ss03";
    font-feature-settings: "ss03";
}

**Never use:** Inter, Roboto, Arial, or any non-Persian-optimized font anywhere —
including chart labels, Recharts tooltips, and injected SVG elements.
IranYekanX is the only font in the entire product.

### Type scale

```css
--text-xs:    12px / 1.5    /* badges, captions, micro labels */
--text-sm:    13px / 1.6    /* secondary body, table cells */
--text-base:  14px / 1.7    /* default body */
--text-md:    15px / 1.6    /* slightly prominent body */
--text-lg:    17px / 1.5    /* card titles, section labels */
--text-xl:    20px / 1.4    /* page titles */
--text-2xl:   24px / 1.35   /* section headings */
--text-3xl:   30px / 1.3    /* large headings */
--text-4xl:   38px / 1.2    /* landing section titles */
--text-5xl:   52px / 1.15   /* landing hero display */
```

### Weights

```
400 — body, table cells, descriptions
500 — card titles, labels, buttons, nav items, form labels
600 — page titles, section headings, KPI numbers
```

**Max weight is 600.** 700+ is too heavy with IranYekanX at UI sizes.

### Hierarchy table

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Hero display (landing) | 5xl/52px | 600 | text-primary |
| Section title (landing) | 4xl/38px | 600 | text-primary |
| Page title (app) | xl/20px | 600 | text-primary |
| Section heading (app) | lg/17px | 600 | text-primary |
| Card title | base/14px | 500 | text-primary |
| Body text | base/14px | 400 | text-secondary |
| Table cell | sm/13px | 400 | text-secondary |
| Form label | sm/13px | 500 | text-primary |
| Caption / helper | xs/12px | 400 | text-tertiary |
| Badge | xs/12px | 500 | per badge color |

---

## 4. Spacing System

Base unit: 4px.

```
4px   — icon-text gap, inline separation
8px   — badge padding, tight list items
12px  — compact card padding
16px  — standard component gap, list item padding
20px  — section internal padding
24px  — standard card padding
32px  — major section gap within page
48px  — section separator (landing)
64px  — major section divider (landing)
96px  — top-level section padding (landing)
```

### Layout constants

```
Sidebar expanded:      260px
Sidebar collapsed:      64px
Topbar height:          56px
Content max-width:    1280px
Page content padding:   24px desktop / 16px mobile

Card radius:            12px  (rounded-xl)
Button radius:           8px  (rounded-lg)
Input radius:            8px
Badge radius:            6px  (rounded-md)
Modal radius:           16px  (rounded-2xl)
Pill:                  999px
```

---

## 5. Motion & Animation

Animate only to communicate state change. Never decorative.

```css
--duration-instant:  80ms
--duration-fast:    120ms
--duration-normal:  180ms
--duration-medium:  220ms
--duration-slow:    320ms

--ease-standard: cubic-bezier(0.4, 0, 0.2, 1)
--ease-enter:    cubic-bezier(0.0, 0, 0.2, 1)
--ease-exit:     cubic-bezier(0.4, 0, 1.0, 1)
--ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1)
```

All keyframe animations inside:
```css
@media (prefers-reduced-motion: no-preference) { ... }
```

### Patterns

- **Sidebar collapse:** width 220ms `ease-standard`. Labels fade out (80ms) before
  width starts shrinking.
- **Quick view panel:** `translateX(-100%)` → `0`, 320ms `ease-enter`.
  Overlay fades in separately at 200ms.
- **Dropdown/popover:** scale `0.95→1` + opacity `0→1`, 180ms `ease-enter`.
- **Bottom sheet:** `translateY(100%)` → `0`, 320ms `ease-enter`.
- **Card hover:** `translateY(-2px)` + border/shadow change, 150ms `ease-standard`.
- **KPI update:** scale `1→1.04→1` on number, 200ms. Shows value changed.
- **Theme switch:** 150ms on `background-color` + `color` across all elements.

---

## 6. Component Library

### Buttons

```
Primary:   bg teal-500, text white, hover: teal-400 + shadow-teal
Secondary: bg surface-2, border border-mid, text-main, hover: surface-3
Ghost:     transparent, no border, text-muted, hover: surface-2 text-main
Danger:    danger-bg, danger-border, danger-text, hover: slightly stronger
```

Sizes:
```
sm:  h-32px, px-14px, text-sm,  rounded-md
md:  h-40px, px-20px, text-base, rounded-lg  ← default
lg:  h-48px, px-24px, text-md,  rounded-lg
```

States: hover → active `scale(0.98)` 80ms → disabled `opacity-40` →
loading (spinner replaces label, width locked).

### Cards

```
Default:   bg surface-1, border 1px border-subtle, rounded-xl, padding 20-24px
Elevated:  bg surface-1, border 1px border-default, rounded-xl, shadow-sm
Stat/KPI:  bg surface-2, border 1px border-subtle, rounded-xl, padding 16px
Accent:    bg teal-50, border 1px teal-100, rounded-xl
```

Interactive cards hover: `translateY(-2px)` + `shadow-md` + `border-mid`, 150ms.

### Inputs

```
height:    40px
bg:        surface-2
border:    1px border-default
radius:    8px
padding:   0 12px
font:      14px IranYekanX 400
```

States:
- Hover: border-strong
- Focus: border teal-500, box-shadow shadow-focus
- Error: border danger, box-shadow `0 0 0 3px danger-bg`
- Disabled: opacity-50

Label: `text-sm` weight 500, 6px below.
Error: `text-xs` danger-text, 4px gap.
Helper: `text-xs` text-hint, 4px gap.

### Badges / Status chips

```
min-height: 22px
padding:    4px 10px
radius:     6px
font:       text-xs (12px) weight 500
```

```
ACTIVE        → success-bg + success-text + success-border
ARCHIVED      → surface-3 + text-tertiary + border-subtle
SOLD          → info-bg + info-text + info-border
RENTED        → info-bg + info-text + info-border
EXPIRED       → warning-bg + warning-text + warning-border
GRACE         → warning-bg + warning-text
LOCKED        → danger-bg + danger-text + danger-border

Plan FREE     → plan-free-bg + plan-free
Plan PRO      → plan-pro-bg + plan-pro + plan-pro-border
Plan TEAM     → plan-team-bg + plan-team + plan-team-border
Trial         → warning-bg + warning-text, prefix "آزمایشی "
```

### Toasts

Position: bottom-center mobile / bottom-LEFT desktop (left = visual end in RTL).
Width: 320px. Background: `overlay-bg`. `rounded-xl`. `shadow-lg`.
Auto-dismiss 4s with progress bar. Left border 3px per type.
Stack max 3, FIFO.

---

## 7. Layout Architecture

```html
<html dir="rtl" lang="fa">
  <body class="bg-base">
    <!-- Sidebar: fixed RIGHT edge -->
    <Sidebar />

    <!-- Content: to the LEFT of sidebar -->
    <div class="mr-[260px] transition-[margin] duration-220">
      <Topbar />               <!-- fixed top, 56px -->
      <main class="pt-[56px] min-h-screen p-6">
        {children}
      </main>
    </div>
  </body>
</html>
```

Sidebar collapsed: `mr-[260px]` → `mr-[64px]`, 220ms.
Read localStorage `sidebarState` in a `<script>` before React hydrates to
prevent layout flash on page load.

---

## 8. Sidebar

**Position:** Fixed RIGHT edge (`right: 0`).
In RTL, right = START of reading flow — natural home for navigation.

**Width:** 260px / 64px collapsed. Transition 220ms `ease-standard`.

**Light mode:** bg `surface-1` (#FFFFFF), left border `1px border-subtle`.
**Dark mode:** bg `surface-1` (#141F2B), left border `1px border-subtle`.
No blur on static sidebar in either mode.

### Structure

```
┌─────────────────────────┐
│  [Logo] اسم  [◁ toggle] │
├─────────────────────────┤
│  — اصلی —               │
│    داشبورد              │
│    فایل‌ها              │
│    مشتریان              │
├─────────────────────────┤
│  — مدیریت —             │  manager only
│    مشاوران              │
│    قراردادها            │
│    گزارش‌ها             │
├─────────────────────────┤
│  — ابزار —              │
│    لینک‌های کاربردی     │
├─────────────────────────┤
│  [spacer]               │
├─────────────────────────┤
│  [Trial button]         │  FREE only
├─────────────────────────┤
│  [Office info card]     │
└─────────────────────────┘
```

### Nav item states

**Active — light mode:**
```css
border-right: 4px solid var(--color-teal-500);
background: var(--color-teal-50-a);
color: var(--color-teal-700);
font-weight: 500;
```

**Active — dark mode:**
```css
border-right: 4px solid var(--color-teal-500);
background: var(--color-teal-50-a);
color: var(--color-teal-400);
```

`border-right` = physical right = visual RIGHT = RTL start edge = correct.

**Hover:** `bg: surface-3`, `color: text-primary`.

**Group labels:** `text-xs` weight 500 letter-spacing 0.06em `text-hint`.
Expanded: visible. Collapsed: hidden.

### Collapsed state

- Icon only 24px, 44×44px touch target, centered
- Tooltip opens LEFT (into content area)
  Style: `.overlay`, `text-sm`, label + keyboard shortcut
- Logo hover → expand icon overlay

### Office info card (bottom)

**Expanded:**
```
[36px logo rounded-lg]  Office Name      [↕]
                         [plan badge] · X مشاور
```
Logo fallback: initials on `teal-50` bg, `teal-700` text.

**Collapsed:** 40px logo. FREE: small teal up-arrow badge overlaid.

**Click → popover opens UPWARD** (`.overlay` class, 220px wide, `rounded-2xl`):

Manager:
```
[Name — text-sm 500]  [phone — text-xs text-hint]
──────────────────────────────────
✦  ارتقا اشتراک          ← teal, FREE/trial only
◈  کسب درآمد و کد معرف  ← manager only
──────────────────────────────────
⚙  تنظیمات
?  راهنما و پشتیبانی     [ticket badge]
──────────────────────────────────
↩  خروج از حساب
```

Agent (no upgrade, no referral):
```
[Name] / [phone]
──────────────────
⚙  تنظیمات
?  راهنما و پشتیبانی
──────────────────
↩  خروج از حساب
```

### Trial activation button (FREE users, above office card)

**Expanded:** full-width secondary button with teal border:
`"۳۰ روز آزمایش رایگان پرو ←"`
Calls `activateProTrial()` on click.
Success: `router.refresh()`.
`phone_used` error: `text-xs danger-text` inline below button.

**Collapsed:** `ArrowUp` icon 24px teal, centered.
Tooltip: `"فعال‌سازی آزمایشی رایگان پرو"`.

This is the canonical trial activation entry point. No separate top banner.

---

## 9. Topbar

**Position:** Fixed top of content area (not behind sidebar).
Width: `calc(100vw - 260px)` expanded / `calc(100vw - 64px)` collapsed. Height: 56px.
**Light mode:** `bg: surface-1`, `border-bottom: 1px border-subtle`.
**Dark mode:** `bg: surface-1`, `border-bottom: 1px border-subtle`.

### RTL item order (right → left across bar)

```
RIGHT (reading start): [Page title / breadcrumb]
CENTER:                [flex spacer]
LEFT  (reading end):   [Theme toggle]  [Notifications]  [Avatar]
```

Avatar is the leftmost element — the visual END of the topbar in RTL.
This matches Divar, Snapp, Digikala, Tapsi — the Iranian app convention.

**Avatar (far left):**
32px circle. Initials fallback: `teal-50` bg, `teal-700` text, weight 500.
Click → opens same popover as office info card.
Primary popover trigger on mobile.

**Notifications:**
`Bell` 20px. Unread badge: 16px teal circle, white count, max "۹+".
Click → `.overlay` dropdown, 360px wide, 400px max-height scrollable.
Header: "اعلان‌ها" + "خواندن همه". Last 15 items. Jalali relative time.

**Theme toggle:**
`Sun`/`Moon` 20px. Saves to localStorage `theme`.
Adds/removes `.dark` on `<html>`. 150ms transition on switch.
Tooltip: "حالت تاریک / روشن".

---

## 10. File List — Views & Interactions

### Filter tabs with live counts

`همه` | `فعال` | `آرشیو` | `فروخته‌شده` | `اجاره‌داده‌شده` | `منقضی`
Format: `فعال (۱۲)` — Persian numerals.
Counts from same DB query as list. No separate request.
Active: `color: teal-700` (light) / `teal-400` (dark), `border-bottom: 2px teal-500`.
Zero count: visible but `text-hint`, dimmed.
Mobile: `overflow-x: auto`, hidden scrollbar, no wrap.

### View toggle

localStorage key `fileListView: "gallery" | "table"`.
Icon buttons top-right. Active: `teal-50` chip.
**Mobile: always single-column gallery. Toggle hidden.**

### Gallery view (default)

Grid: `grid-cols-3` (≥1024px) / `grid-cols-2` (tablet) / `grid-cols-1` (mobile).
Gap: 16px.

```
┌──────────────────────────┐
│  [Photo 16:9 object-cover]│  [status badge] top-start corner
│                           │  [watermark] bottom-center (FREE plan only)
├──────────────────────────┤
│  فروش · ۱۲۰ متر مربع     │  text-sm text-muted
│  ۲,۵۰۰,۰۰۰,۰۰۰ تومان    │  text-lg weight-600 text-main
│  نیاوران، تهران          │  text-xs text-hint
├──────────────────────────┤
│  [avatar 24px] نام مشاور │  [⎘ share] [✎ edit] [👁 quick view]
└──────────────────────────┘
```

Hover: `translateY(-2px)` + `shadow-md` + `border-mid`. 150ms.
Action icons: hover-only on desktop. Always visible on mobile.
All numbers: `toLocaleString('fa-IR')`.

### Table view

```
Columns (RTL — rightmost = first logical column):
[عکس 48px] | [نوع] | [متراژ] | [قیمت] | [وضعیت] | [مشاور] | [تاریخ] | [عملیات]
```

`table-layout: fixed`. Sticky `<thead>`. Row height 56px.
All `<th>`: `text-align: start`. NEVER `end`.
Row hover: `bg: surface-3`. Row click → quick view.

### Quick view drawer

**Spatial rule:** Sidebar is on the RIGHT. Quick view opens from the LEFT.
Overlays content area only. Sidebar stays fully visible at all times.

**Desktop:**
```css
position: fixed;
left: 0;
top: 56px;
height: calc(100vh - 56px);
width: 480px;
background: var(--color-surface-1);
border-right: 1px solid var(--color-border-subtle);
box-shadow: var(--shadow-xl);
z-index: 40;
```
Overlay (behind panel): `rgba(0,0,0,0.15)` light / `rgba(0,0,0,0.4)` dark.
Click overlay to close.
Enter: `translateX(-100%)` → `translateX(0)`, 320ms `ease-enter`.
Exit: `translateX(-100%)`, 220ms `ease-exit`.

**Mobile (< 768px): bottom sheet**
```css
position: fixed;
bottom: 0; left: 0; right: 0;
max-height: 85vh;
border-radius: 20px 20px 0 0;
background: var(--color-surface-1);
```
Drag handle: `48×4px` centered at top, `border-subtle` bg.
Swipe down > 35% height → close. Otherwise spring back.
Enter: `translateY(100%)` → `0`, 320ms `ease-enter`.

**Contents:**
```
[Photo carousel — swipeable]
[Type + area — text-md 500]
[Status badge]  [Price — text-xl 600]
──────────────────────────────────
[Details grid: location · floor · bedrooms · amenities]
[Assigned agents + avatars]
[Last 3 activity log entries]
──────────────────────────────────
[ویرایش]  [اشتراک‌گذاری]  [آرشیو]
[مشاهده صفحه کامل ←]  ← full-width primary
```

---

## 11. Dashboard Home

Fixed layout — not customizable in v1.

```
Row 1: KPI × 4  [فایل فعال | قرارداد این ماه | درآمد کل | مشتریان]
Row 2: [File pipeline donut — 2/3 width]  [Jalali deal summary — 1/3]
Row 3: [Recent activity — 1/2]  [Files expiring soon — 1/2]
```

KPI cards: `bg: surface-2`, `text-2xl` weight 600 Persian numeral,
`text-sm text-muted` label below, `↑/↓` trend in success/danger color.

---

## 12. RTL Implementation Rules (Non-Negotiable)

Check every new component against this list.

**Root:** `<html dir="rtl" lang="fa">` — never overridden.

**Spatial positions:**
- Sidebar: RIGHT (`right: 0`)
- Content area: LEFT of sidebar (`margin-right: 260px`)
- Quick view: LEFT (`left: 0`) — into content area
- Topbar avatar: far LEFT — visual end of bar
- Reading flow: right → left

**Active sidebar border:**
```css
border-right: 4px solid var(--color-teal-500);
/* Physical right = visual right = RTL start = correct */
```

**Table headers:** `text-align: start` always. Never `end`.

**Directional icons:**
```jsx
<ChevronLeft className="rtl:scale-x-[-1]" />
```

**Progress bars:**
```css
.progress-fill { direction: ltr; }
/* Fills left-to-right visually even in RTL document */
```

**Recharts tooltips** (injected outside RTL context):
```jsx
<Tooltip contentStyle={{ direction: 'rtl', fontFamily: 'IranYekanX' }} />
```

**Animation directions:**
- Sidebar exits: `translateX(100%)` (exits right)
- Quick view enters: `translateX(-100%)` → `0` (enters from left)
- Bottom sheet: `translateY(100%)` → `0` (neutral)

**Data:**
- Numbers: `toLocaleString('fa-IR')` — Persian numerals always
- Dates: `date-fns-jalali` — Jalali always, never Gregorian to users
- Currency: `formatToman()` from `lib/utils.ts`

---

## 13. Landing Page

Light mode only. No toggle. Uses `app/(marketing)/layout.tsx`.
Ensure `.dark` class is never applied on marketing pages.

Slightly more spacious than app shell — larger type, more padding.
The app is dense (productive tool). Landing is editorial (conversion tool).

**Navbar (RTL):**
```
RIGHT: [Logo 32px] [اسم weight-600]
CENTER: ویژگی‌ها | قیمت‌ها | درباره ما | تماس
LEFT:  [تماس با ما ghost] [شروع رایگان primary]
```
Sticky. Scroll: `bg-white/90 backdrop-blur-sm border-b border-subtle shadow-sm`.
Mobile: hamburger RIGHT, full-screen overlay.

**Hero (two-column RTL):**
Right 55%: display headline (52px 600) + subline + auth widget.
Left 45%: interactive demo panel.

Auth widget: single input (email/phone) + inline button.
Below: `"با ادامه، شرایط استفاده و حریم خصوصی را می‌پذیرید"` `text-xs text-hint`.

**Interactive demo (6 tiles, 2×3 grid):**
All visual — no real API calls.
Hover: inactive tiles `blur(4px) opacity-40`. Active: `scale(1.02)` + animated mockup.
Features: نقشه | توضیحات AI | پیامک | لینک | گزارش | تصویر.

**Video section:** `autoPlay muted loop playsInline`. Lazy load via IntersectionObserver.
Placeholder until real video exists.

**Pricing:** Import from `lib/subscription.ts`. Never hardcode.
PRO: `border-2 border-teal-500` + "پیشنهادی" badge.
Annual toggle: "۲ ماه رایگان" badge.

---

## 14. Useful Links (استعلام و خدمات)

Sidebar item → modal. Available to managers and agents.

| عنوان | آدرس | کاربرد |
|-------|------|--------|
| سازمان ثبت اسناد و املاک | ssaa.ir | تصدیق اصالت سند، استعلام پلاک ثبتی |
| ثبت من | my.ssaa.ir | خدمات الکترونیک ثبت، اسناد رسمی |
| سامانه ثبت معاملات ملکی | iranamlaak.ir | ثبت قرارداد، کد رهگیری |
| تهران من | my.tehran.ir | طرح تفصیلی، عوارض، کاربری |
| وزارت راه و شهرسازی | amlak.mrud.ir | سامانه ملی اطلاعات ساختمان |
| پیگیری صدور سند | abtasnad.post.ir | وضعیت صدور سند تک‌برگی |
| منابع طبیعی | frw.ir | استعلام اراضی ملی |

Modal (`.overlay` class). Each row: icon + title 500 + `text-xs text-hint` + "باز کردن ←".
New tab. Footer: `"این لینک‌ها متعلق به سامانه‌های دولتی هستند"`.

---

## 15. Accessibility

- WCAG AA contrast minimum everywhere
- Focus: `box-shadow: shadow-focus` — teal ring, visible in both modes
- Icon-only buttons: `aria-label` Persian
- Toasts: `role="status"` + `aria-live="polite"`
- Modals/drawers: `role="dialog"` + `aria-modal="true"` + focus trap
- Skip-to-content: first focusable element, visually hidden until focused
- Touch targets: 44×44px minimum on mobile
- Animations: all keyframes inside `prefers-reduced-motion: no-preference`
- Form errors: `aria-describedby` input → error
- Loading: `aria-busy="true"` on containers

---

## 16. Do Not Do

| ❌ Don't | ✅ Do instead |
|---------|-------------|
| Default to dark mode | Light mode is default — dark is the toggle |
| Use pure `#FFFFFF` for page bg | Use `#FAFAF9` — warmer, not clinical |
| Use cold blue-gray (#6B7280) for text | Warm-tinted gray `#5C5C57` |
| Use blur/glass in light mode | Blur only in dark mode floating panels |
| Use Inter, Roboto, system fonts | IranYekanX everywhere including charts |
| Avatar on the right in RTL | Avatar far LEFT (visual end of topbar) |
| Quick view from the right | Open from LEFT — sidebar owns the right |
| `text-align: end` on `<th>` | `text-align: start` always |
| `border-left` for active nav | `border-right` (RTL start edge) |
| Animate for decoration | Animate only to communicate state change |
| Hardcode plan features | Import from `lib/subscription.ts` |
| Show Gregorian dates | Jalali via `date-fns-jalali` always |
| Raw numbers without locale | `toLocaleString('fa-IR')` always |
| Multiple top banners | One max — urgent subscription state only |
| Referral in agent panel | Manager-only, in sidebar popover |
| Side drawer on mobile | Bottom sheet on mobile always |
| `backdrop-filter` always | Gate with `@supports`, solid fallback |
| Font weight 700+ | Max 600 semibold |
| Generic purple/gradient on white | Teal on warm white — our distinctive identity |
