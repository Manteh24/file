# Design System — املاکبین

> Reference for the Notion/Linear-inspired aesthetic used across the app.
> The settings page (`/settings`) is the canonical reference implementation.

---

## 1. Color Tokens

Defined in `app/globals.css` inside `html:root { ... }` (specificity 0-1-1 beats Neshan SDK's `:root`).

| Token | Value | Use when |
|-------|-------|----------|
| `--background` | `oklch(0.982 0.004 75)` | Warm off-white — app shell background |
| `--card` | `oklch(1 0 0)` | Pure white — elevated surfaces (cards, popovers) |
| `--primary` | `oklch(0.48 0.13 190)` | Deep teal ≈ Tailwind `teal-700` — CTAs, active states, accents |
| `--primary-foreground` | `oklch(1 0 0)` | Text on primary-filled surfaces |
| `--ring` | `oklch(0.6 0.1 190)` | Focus ring — matches teal accent |
| `--radius` | `0.5rem` (8px) | Base border-radius for all components |

**When to use `primary` vs others:**
- `primary` — filled CTA buttons, active tab indicators, tick marks in feature lists, focus rings
- `muted-foreground` — secondary labels, placeholder text, section headers
- `destructive` — error states, dangerous actions only
- Never use `primary` for decorative elements — keep it meaningful

---

## 2. Typography Scale

| Context | Class | Notes |
|---------|-------|-------|
| Form base (mobile) | `text-[15px]` | Applied to `<form>` element; comfortable reading on small screens |
| Body / inputs | `text-sm` (14px) | Default for most content |
| Section headers | `text-[13px] uppercase tracking-widest` | Small-caps label above hairline rule |
| Labels | `text-sm font-medium` | Form field labels |
| Prices / emphasis | `font-semibold` | Plan names, prices |
| Running text | `font-normal` | Descriptions, helper text |

**Rules:**
- No `font-bold` except top-level `<h1>` page titles
- `font-medium` for section labels, nav items, button text
- `font-semibold` for plan names, prices, key numbers only

---

## 3. Spacing Scale

| Context | Value |
|---------|-------|
| Within a form section (field gaps) | `space-y-5` / `gap-5` |
| Within a card / plan card | `space-y-4` |
| Between sections on a page | `space-y-10` |
| Section separator padding | `pb-3 mb-4` |
| Card internal padding | `p-5` |
| Info card padding | `px-4 py-3` |
| Button gap in a row | `gap-3` / `gap-4` |

---

## 4. Component Variants

### Section Header (Notion-style)
```tsx
<div className="mb-4 border-b border-border pb-3">
  <h2 className="text-[13px] font-medium uppercase tracking-widest text-muted-foreground">
    عنوان بخش
  </h2>
</div>
```

### Info Card (summary row)
```tsx
<div className="rounded-md bg-muted/40 border border-border px-4 py-3 flex justify-between items-center gap-3 flex-wrap">
  {/* left: label + badge */}
  {/* right: date or status */}
</div>
```

### Plan Card (default)
```tsx
<div className="bg-card border border-border rounded-md p-5 space-y-4">
  {/* name, price, features, CTA */}
</div>
```

### Plan Card (current/active)
```tsx
<div className="bg-card border border-primary/50 bg-primary/5 rounded-md p-5 space-y-4">
```

### Plan Card (highlighted — TEAM)
```tsx
<div className="bg-card border border-primary/30 bg-primary/5 rounded-md p-5 space-y-4">
```

### Feature List (inside plan card)
```tsx
<ul className="text-sm text-muted-foreground space-y-1.5">
  {features.map((f) => (
    <li key={f} className="flex items-center gap-2">
      <span className="text-primary font-medium">✓</span>
      {f}
    </li>
  ))}
</ul>
```

### Underline Tab Toggle (billing cycle)
```tsx
<div className="flex gap-6 border-b border-border">
  <button className={`pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
    active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
  }`}>
    ماهانه
  </button>
</div>
```

---

## 5. Buttons

- **Minimum height:** `h-11` (44px) everywhere — mandatory for touch targets
- **Border radius:** `rounded-md` (matches `--radius: 0.5rem`)
- **Full-width:** `w-full` inside cards and mobile bars
- **Never** use `rounded-full` for buttons in this app

| Variant | Use case |
|---------|----------|
| `variant="default"` (filled teal) | Primary CTA — upgrade, save, confirm |
| `variant="outline"` | Secondary / renewal — already on plan, cancel-adjacent |
| `variant="ghost"` | Toolbar actions, icon-only buttons |
| `variant="destructive"` | Irreversible destructive actions only |

---

## 6. Forms

- **Label:** above field, `text-sm font-medium`
- **Input height:** `h-11` on all `<Input>` components (44px touch target)
- **Grid:** `grid grid-cols-1 gap-5 sm:grid-cols-2` for 2-column desktop layouts
- **Error messages:** `text-sm text-destructive` below field via `<FormMessage />`
- **Root error:** `text-sm text-destructive` at top of form
- **Font size on form:** `text-[15px]` on the `<form>` element for mobile readability

---

## 7. Mobile Patterns

### Edge-to-edge layout
- Page wrapper: `px-0 md:px-4` — cards bleed to screen edge on mobile, padded on desktop
- This gives a native app feel on phones (agents in the field)

### Sticky bottom bar (for forms with save action)
```tsx
<div className="md:hidden fixed bottom-0 inset-x-0 z-10 border-t border-border bg-background/95 backdrop-blur px-4 py-3 flex items-center gap-3">
  <Button className="h-11 flex-1" ...>ذخیره تغییرات</Button>
  {saved && <p className="text-sm text-emerald-600 whitespace-nowrap">ذخیره شد ✓</p>}
</div>
```

Use a `hidden` `<button type="submit" ref={submitRef} />` inside the `<form>` triggered by both the desktop and mobile bars to avoid duplicating submit logic.

Desktop bar:
```tsx
<div className="hidden md:flex items-center gap-4">
  <Button type="button" onClick={() => submitRef.current?.click()}>ذخیره</Button>
  {saved && <p className="text-sm text-emerald-600">ذخیره شد</p>}
</div>
```

### Touch targets
- All interactive elements: minimum `h-11` (44px) height
- Tap area for icon buttons: wrap in `<button className="p-2">` to get 44px area

---

## 8. RTL Rules

- Root `<html>` always has `dir="rtl" lang="fa"` (set in root layout)
- Use `text-start` on `<th>` — in RTL, `start` = right, `end` = left
- Directional icons (arrows, chevrons): flip with `rtl:scale-x-[-1]`
- Flex direction: `flex-row` is already RTL-aware (start = right in RTL)
- Use logical CSS properties where possible: `ms-` / `me-` instead of `ml-` / `mr-`
- Padding/margin Tailwind shortcuts: `ps-4` = padding-inline-start (right in RTL)
