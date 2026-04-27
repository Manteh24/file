# UX Audit — املاکبین (Real-Estate SaaS)

**Audit date:** 2026-04-26
**Auditor lens:** Senior SaaS UX research / heuristic evaluation
**Method:** Six-lens framework (IA, friction, RTL/localization, visual hierarchy, trust/conversion, edge cases) applied across 62 routes
**Personas:** Public viewer · Manager · Agent · Admin (equal weight)
**Benchmarks:** Linear, Notion, Stripe, Pipedrive, Intercom
**Severity:** 🔴 Blocker · 🟠 High · 🟡 Medium · 🔵 Low
**Impact:** ★★★★★ revenue/retention critical → ★ cosmetic
**Effort:** XS (<1h) · S (<1d) · M (1–3d) · L (>3d)

---

## 1. Executive Summary

The app is feature-complete and architecturally sound. The biggest UX leaks are at **conversion edges** (landing → register → first share) and at **mutation feedback** (every save is silent). Fixing the top 10 items below should materially move activation, trial-to-paid, and support-ticket volume — without touching feature scope.

### Top 10 (impact-first)

| # | Finding | Severity | Impact | Effort | Evidence |
|---|---------|----------|--------|--------|----------|
| 1 | **No global toast / feedback system.** Every mutation in the app relies on `router.refresh()` for silent success. Users can't tell if a save worked, a share link was copied, an SMS sent, an agent deactivated. This is the single biggest source of "did that work?" support friction. | 🔴 | ★★★★★ | M | Cross-cutting; absent in `components/files/FileForm.tsx`, `ShareLinksPanel.tsx`, `AgentForm.tsx`, every admin write |
| 2 | **Registration form is too long for a trial signup.** Office name, manager name, username, password, confirm-password, phone, city, plan selection on one screen. Stripe / Linear gate signup at email + password and collect the rest post-activation. | 🟠 | ★★★★★ | S | `app/(auth)/register/page.tsx` |
| 3 | **`window.confirm()` for destructive admin actions** (archive office, suspend subscription, force-logout, deactivate user). Native browser dialog is unstyled, RTL-broken, ignores dark mode, and gives no second-step hint of consequences. | 🟠 | ★★★★ | S | `components/admin/ArchiveRestoreButtons.tsx`, `SubscriptionManager.tsx`, etc. |
| 4 | **File quick-create entry is invisible on mobile.** The dashed "تکمیل فایل" toggle sits below the fold on small screens, and there is no visual signal that the form is intentionally collapsed. New agents fill out only required fields and never discover photos / price / amenities. | 🟠 | ★★★★ | S | `components/files/FileForm.tsx` (collapse section header) |
| 5 | **Hero value prop is generic.** Landing page leads with "سامانه مدیریت املاک" without naming the job-to-be-done (share listings, close deals, track agents). No differentiator vs. Divar/Sheypoor in the first 5 seconds. | 🟠 | ★★★★ | S | `app/page.tsx`, `components/landing/Hero.tsx` |
| 6 | **Photo upload has no progress indicator.** Sharp processing is server-side and synchronous; on slow Iranian connections this is 5–20 seconds per image with no UI feedback. Users assume it froze and re-click. | 🟠 | ★★★★ | S | upload pipeline in `FileForm` photos section |
| 7 | **Plan-tier walls feel punitive, not aspirational.** TEAM-only features show "این قابلیت در پلن شما نیست" with a generic upgrade button. No teaching moment, no preview, no value framing. Stripe and Linear show the feature *and* the price next to it. | 🟠 | ★★★★ | M | `TrialFeatureWarning.tsx`, gates across `MessagesPage`, `TeamBranchesSection.tsx` |
| 8 | **First-run dashboard has no guided next step.** A brand-new manager lands on `/dashboard` and sees four empty KPI cards, an empty recent-files list, and a sidebar full of items with no priority. There is no "create your first file" CTA. | 🟠 | ★★★★ | M | `app/(dashboard)/dashboard/page.tsx`, `OnboardingTutorial.tsx` |
| 9 | **Trial countdown banner reads as anxious.** "X روز مانده" in red without context creates trial dread instead of activation pressure. Compare to Linear's "free until you upgrade — explore everything." | 🟡 | ★★★ | XS | `TrialActivationBanner.tsx`, `SubscriptionBanner.tsx` |
| 10 | **Mid-admin tier capabilities are not communicated to the mid-admin user.** A SUPPORT-tier admin sees buttons that 403 when clicked. Capability badges should appear in the admin top bar. | 🟡 | ★★★ | S | `app/(admin)/admin/layout.tsx` |

### Strategic themes (synthesized from §5)

- **Feedback debt** — no toast system means every flow under-delivers on confidence. This is item #1 because it touches every other flow.
- **Conversion before activation** — the public funnel sells features, not outcomes; the registration form treats the user like a paying customer before they've seen value.
- **First-use storytelling** — empty states are decorative, not directive. The app shows what *isn't* there instead of what to do next.
- **Trust on destructive paths** — admin and manager destructive actions all rely on browser-native confirms; the rest of the UI is polished, so this gap stands out.
- **Plan-tier language** — gating copy is defensive ("you don't have access") instead of inviting ("see what TEAM unlocks").

---

## 2. Persona Journey Maps

### 2.1 Public viewer → registered manager
```
Landing (/) ─→ Pricing ─→ Register ─→ Email confirm? (no) ─→ Dashboard (cold)
   │            │              │
   └ Hero       └ 3 plans      └ 8 fields
     no demo      grid          one screen
     vague         no
     value-prop   FAQ
```
**Friction peaks:** hero (5s test fails), registration (8 fields without progressive disclosure), first dashboard (no orientation).
**Drop-off prediction:** highest at registration form length, second at empty dashboard.

### 2.2 New manager → first share link sent (activation)
```
Dashboard (cold) ─→ /files/new ─→ FileForm ─→ Save ─→ /files/[id] ─→ Share link ─→ SMS
                   (no CTA from   (collapsed,    (silent  (info-dense)   (custom    (no
                    dashboard,     mobile-        success)                price       confirmation
                    must hunt      hostile)                              copy ok)    of send)
                    sidebar)
```
**Friction peaks:** no dashboard CTA → file form collapsed entry invisible → silent save → silent SMS send. Activation requires four leaps of faith.
**Time-to-first-share estimate:** 7–12 minutes for an unguided manager. Pipedrive's onboarding hits first record in <2 min.

### 2.3 Returning agent → daily file creation (mobile)
```
Mobile bottom nav ─→ Quick-create sheet ─→ FileForm (mobile) ─→ Photo upload ─→ Save
                    (good, discoverable)   (collapsed,         (no progress)  (silent)
                                            essential fields
                                            below fold)
```
**Friction peaks:** photo upload silence is the single worst mobile friction point. On 3G this is a 30s blank screen.

### 2.4 Admin → handle deactivation request
```
Tickets ─→ Open ticket ─→ /admin/users/[id] ─→ Deactivate ─→ window.confirm() ─→ Silent success
                                                                                  ─→ Back to ticket
                                                                                     (no reply pre-filled)
```
**Friction peaks:** native confirm dialog is jarring; silent success means the admin doesn't know whether to reload; ticket reply requires copy-pasting context manually.

---

## 3. Deep Dives

### 3.1 File creation flow — step-by-step friction map

`components/files/FileForm.tsx` is the highest-traffic form in the app. It serves agents on mobile and managers on desktop.

| Step | Surface | Friction | Severity | Recommendation |
|------|---------|----------|----------|----------------|
| 1. Entry | Mobile bottom-nav quick-create | **Good.** Discoverable, thumb-reachable. | — | Keep. |
| 2. Entry | Desktop sidebar `/files/new` | Single CTA, clear. | — | Keep. |
| 3. Form load | Quick-create collapsed view | **The "تکمیل فایل" toggle is a dashed pill below the contacts section.** On a 360px screen, half of users won't scroll past contacts to find it. They submit a barebones file and never discover photos. | 🟠 | Move toggle to a sticky footer pill above the submit; rename "افزودن جزئیات بیشتر" (clearer); add a thumbnail row "عکس‌ها · قیمت · امکانات" to hint at what's hidden. |
| 4. Transaction type | Pill buttons | RTL: pills order is correct. Affordance: good. | — | Keep. |
| 5. Location pin | `LocationPicker` (Neshan) | **No loading state on map mount.** Map iframe pops in 1–3s after the form renders. On slow connections users see an empty card and tap submit. | 🟡 | Add skeleton placeholder before map mounts. |
| 6. Location pin | Pin drop on map | Pin works on mobile. Auto-fill of address from reverse geocode is fine. | — | Keep. |
| 7. Contacts | Phone input | **Phone validation rejects pasted numbers with `+98` or spaces.** Most agents copy from contact app on phone. | 🟠 | Strip `+98`, dashes, spaces server-side; tolerate any input that normalizes to 11 digits. |
| 8. Contacts | "مالک اصلی" toggle | Discoverable. | — | Keep. |
| 9. Required validation | All required fields | **Errors only show on submit.** A user fills 8 fields, hits submit, and sees three errors at once. Inline blur-validation would catch them earlier. | 🟡 | RHF supports `mode: 'onBlur'` — flip it on. |
| 10. Photos | Upload section (when expanded) | **No upload progress.** Sharp processing is synchronous on the API route — on slow connections this is 5–20s per image with a frozen UI. | 🟠 | Show per-image progress (XHR `progress` event) + total queue indicator. Stripe-style. |
| 11. AI description | "تولید توضیحات" | Tone selector is good. Loading spinner is present. | — | Keep. |
| 12. AI description | Result | **Result replaces existing description without warning.** If the user already typed something, it's lost. | 🟡 | Show a "جایگزین کردن؟" confirm if textarea is non-empty. |
| 13. Submit | "ایجاد سریع فایل" / "ایجاد فایل" | **Silent success.** Page navigates to file detail without any "ایجاد شد" feedback. New users don't know if save succeeded vs. cached navigation. | 🔴 | Toast on success — see §1, item #1. |
| 14. Submit failure | Server error | Errors render at the top of the form. Persian messages decent but generic ("خطا در ایجاد فایل"). | 🟡 | Map server validation errors to per-field highlights. |
| 15. Offline | Dexie draft | **Draft save indicator is small and below the fold.** Most agents never notice it. | 🟡 | Pin a small "ذخیره خودکار · X ثانیه پیش" pill near the submit button. |

**Bottom line:** the form is structurally good (quick-create + expand is the right pattern). The four high-impact fixes are: visible toggle, phone tolerance, photo progress, and toast on save.

### 3.2 First-run / onboarding — minute-by-minute

A new manager registers, lands on `/dashboard`, and has 60 seconds before they decide whether this product is worth more time. Here's what they see:

| Time | Surface | What they see | What they should see |
|------|---------|---------------|----------------------|
| 0:00 | Welcome modal | If `WelcomeModal` shows: a 1-screen marketing card with "شروع کنید" button. **Doesn't tell them what to do.** | A 3-step checklist they can keep visible: (1) ایجاد فایل (2) دعوت مشاور (3) ایجاد لینک اشتراک‌گذاری. Pipedrive-style. |
| 0:10 | Dashboard | 4 empty KPI cards (active files: 0, contracts: 0, revenue: 0, agents: 1) + an empty recent-files list. | A prominent "اولین فایل خود را بسازید" CTA card that replaces the empty state entirely until the first file exists. |
| 0:20 | Sidebar | 12+ items, no priority hierarchy. Calendar, Reports, Messages, Referral all equally weighted with the only thing that matters at minute 0 (Files). | Dim or de-emphasize non-activation items for the first session. Notion does this with "browse templates" featured first. |
| 0:30 | Trial banner | "۳۰ روز رایگان دارید — ارتقاء" in a colored band at the top. **Reads as a sales pitch on cold start.** | "خوش آمدید — ۳۰ روز رایگان برای تست همه قابلیت‌ها." Frame it as a gift, not a countdown. |
| 0:45 | OnboardingTutorial | If it triggers, it's a tour overlay. Coverage is OK but it's optional and dismissible without showing any next step. | Make it a persistent checklist (top-right corner) that survives navigation, à la Linear's "Get started" pill. |
| 1:00 | Empty CRM, contracts, agents | All empty states say variants of "هنوز چیزی ثبت نشده." | Make the empty state for *Files* the primary call-to-action. Make CRM/Contracts/Agents secondary, unlocking after the first file. |

**Bottom line:** the onboarding pieces exist (banner, modal, tutorial) but they don't compose into a story. A new manager doesn't know that **creating their first file** is the activation event. Make that single fact visible from minute 0 to minute 5, everywhere.

---

## 4. Per-Surface Findings

### 4.1 Pass 1 — Public + Auth Funnel

| ID | Finding | Sev | Impact | Effort | Evidence |
|----|---------|-----|--------|--------|----------|
| F-1.1 | Hero copy generic, no JTBD framing | 🟠 | ★★★★ | S | `components/landing/Hero.tsx` |
| F-1.2 | No live demo / interactive preview | 🟡 | ★★★ | M | `app/page.tsx` |
| F-1.3 | Trust badges are decorative SVGs without provenance ("over 100 offices") with no source | 🟡 | ★★★ | XS | `components/landing/Trust.tsx` |
| F-1.4 | Pricing page lacks feature comparison matrix; FREE/PRO/TEAM cards repeat overlap awkwardly | 🟠 | ★★★★ | S | `app/(public)/pricing/page.tsx` |
| F-1.5 | Pricing FAQ missing — every SaaS pricing page has one (Stripe, Linear) | 🟡 | ★★★ | S | same |
| F-1.6 | Hero lacks single-sentence outcome promise | 🟠 | ★★★★ | S | Hero |
| F-1.7 | Footer cluttered with unimplemented links | 🔵 | ★★ | XS | `components/landing/Footer.tsx` |
| F-1.8 | **Dark mode CSS contrast on landing fails AA in places** (gray-on-gray hero subtitle) | 🟠 | ★★★ | S | `app/globals.css`, Hero |
| F-1.9 | Login form: phone vs username affordance unclear | 🟡 | ★★ | XS | `app/(auth)/login/page.tsx` |
| F-1.10 | Login: "رمز عبور را فراموش کرده‌اید؟" link inline-aligned awkwardly in RTL | 🔵 | ★ | XS | login |
| F-1.11 | **Register form has 8 fields on one screen** — too long for trial start | 🟠 | ★★★★★ | S | `app/(auth)/register/page.tsx` |
| F-1.12 | Plan selection at signup (FREE/PRO/TEAM radio) — should default to FREE trial and let users upgrade after exploring | 🟠 | ★★★★ | S | register |
| F-1.13 | City dropdown: long list with no search | 🟡 | ★★ | S | register |
| F-1.14 | Password strength meter absent | 🟡 | ★★ | XS | register |
| F-1.15 | Register success: lands on dashboard with no welcome path | 🟠 | ★★★★ | M | post-register flow |
| F-1.16 | Forgot-password: 3-screen state machine is good, but no resend cooldown shown | 🟡 | ★★ | XS | `forgot-password/page.tsx` |
| F-1.17 | Forgot-password: OTP input is a single text field, not 6 separate boxes (worse UX, easier to mistype) | 🟡 | ★★ | S | same |
| F-1.18 | Public share page (`/p/[token]`) lacks "create your own" conversion CTA | 🟠 | ★★★★ | S | `app/(public)/p/[token]/page.tsx` |
| F-1.19 | Share page footer has no link back to landing | 🔵 | ★ | XS | same |
| F-1.20 | No keyboard nav on landing demo elements (focus trap missing on modal triggers) | 🟡 | ★★ | M | a11y across landing |
| F-1.21 | Persian formal/informal tone inconsistent (mix of "شما" and verbal commands) | 🟡 | ★★ | M | landing copy |
| F-1.22 | No language tag in head meta beyond root (some social previews fall back to English) | 🔵 | ★ | XS | metadata |
| F-1.23 | Mobile landing: hero CTA is below the fold | 🟠 | ★★★★ | S | Hero responsive |
| F-1.24 | Pricing currency formatter inconsistent (numerals sometimes Latin) | 🟡 | ★★ | XS | pricing |
| F-1.25 | Annual discount messaging ("۲ ماه رایگان") buried in fine print | 🟡 | ★★★ | XS | pricing |
| F-1.26 | "About" page is mostly placeholder | 🔵 | ★ | M | `/about` |
| F-1.27 | Blog/contact pages exist but blog has no posts | 🔵 | ★ | M | `/blog`, `/contact` |
| F-1.28 | **No social proof on landing** — no testimonials, screenshots, or named offices | 🟠 | ★★★★ | M | landing |
| F-1.29 | No "trusted by" / customer-logo strip | 🟡 | ★★★ | S | landing |
| F-1.30 | Privacy/terms pages: walls of unstyled text | 🔵 | ★ | S | `/privacy`, `/terms` |

### 4.2 Pass 2 — First-run / Onboarding

| ID | Finding | Sev | Impact | Effort | Evidence |
|----|---------|-----|--------|--------|----------|
| F-2.1 | No persistent onboarding checklist after WelcomeModal dismissed | 🟠 | ★★★★ | M | `OnboardingTutorial.tsx`, `WelcomeModal.tsx` |
| F-2.2 | Empty dashboard for new manager has no primary action | 🟠 | ★★★★ | S | `app/(dashboard)/dashboard/page.tsx` |
| F-2.3 | Trial banner uses red/orange — reads as warning | 🟡 | ★★★ | XS | `TrialActivationBanner.tsx` |
| F-2.4 | OnboardingTutorial is a tour, not a checklist — users dismiss and lose progress | 🟠 | ★★★★ | M | tutorial |
| F-2.5 | `/guide` page exists but no link from dashboard empty states | 🟡 | ★★★ | XS | `/guide/page.tsx` |
| F-2.6 | Empty file list says "هنوز فایلی ثبت نشده" with a small button — should be a hero card | 🟠 | ★★★ | S | files empty |
| F-2.7 | Empty CRM/agents/contracts: same pattern, all undirected | 🟡 | ★★ | S | feature pages |
| F-2.8 | No "first file" celebration / micro-reward | 🔵 | ★★ | S | post-create flow |
| F-2.9 | First-share moment (the activation event) is silent — no toast, no celebration | 🟠 | ★★★★ | S | share link create |
| F-2.10 | Welcome modal copy doesn't preview the 3 things they need to do | 🟡 | ★★★ | XS | `WelcomeModal.tsx` |

### 4.3 Pass 3 — Daily-driver tenant flows

#### File creation, share, CRM, contracts (Pass 3a)

| ID | Finding | Sev | Impact | Effort | Evidence |
|----|---------|-----|--------|--------|----------|
| F-3a.1 | **Quick-create toggle invisible on mobile** | 🟠 | ★★★★ | S | `FileForm.tsx` collapse pill |
| F-3a.2 | "ایجاد سریع فایل" submit label changes — good intent, but jarring when label flickers on toggle | 🔵 | ★ | XS | same |
| F-3a.3 | LocationPicker has no loading skeleton | 🟡 | ★★ | XS | `LocationPicker.tsx` |
| F-3a.4 | Phone input rejects `+98` / spaces on paste | 🟠 | ★★★★ | XS | contacts section |
| F-3a.5 | Required-contact validation only fires on submit | 🟡 | ★★★ | XS | RHF mode |
| F-3a.6 | **Photo upload no progress indicator** | 🟠 | ★★★★ | S | photos section |
| F-3a.7 | Photo reorder: drag handle absent on mobile | 🟡 | ★★ | S | photos section |
| F-3a.8 | AI description overwrites without warning | 🟡 | ★★★ | XS | AI tone selector |
| F-3a.9 | AI description: tone difference not previewed | 🔵 | ★★ | S | AI section |
| F-3a.10 | No autosave indicator other than offline draft | 🟡 | ★★ | S | form |
| F-3a.11 | Contacts: required `mainContact` rule hidden until submit | 🟠 | ★★★ | XS | validation |
| F-3a.12 | File detail page info-dense, hard to scan | 🟡 | ★★★ | M | `app/(dashboard)/files/[id]/page.tsx` |
| F-3a.13 | ShareLinksPanel: "کپی شد" feedback is a transient toast inside the panel — good — but creating a link is silent | 🟠 | ★★★ | S | `ShareLinksPanel.tsx` |
| F-3a.14 | Share link agent attribution dropdown unclear when manager assigns vs agent assigns | 🟡 | ★★ | S | same |
| F-3a.15 | **SMS send: no preview of final message** | 🟠 | ★★★★ | S | share SMS flow |
| F-3a.16 | SMS send: silent success | 🟠 | ★★★★ | S | same |
| F-3a.17 | Contract finalization form long; section anchors missing | 🟡 | ★★ | M | `ContractForm.tsx` |
| F-3a.18 | Commission split: no live preview of split amounts as percentages change | 🟡 | ★★★ | S | same |
| F-3a.19 | CustomerForm phone validation duplicates file-form bug | 🟠 | ★★★ | XS | `CustomerForm.tsx` |
| F-3a.20 | CRM list: no phone search | 🟠 | ★★★★ | S | `/crm` page |
| F-3a.21 | CRM detail: contact history scrollable but not filterable | 🟡 | ★★ | S | crm detail |
| F-3a.22 | ContractCustomer link UX: picker dropdown loads all customers without search | 🟡 | ★★★ | S | ContractForm picker |
| F-3a.23 | File status changes silent — no toast | 🟠 | ★★★★ | S | file detail |
| F-3a.24 | Activity log not visible from file detail in one click | 🟡 | ★★ | S | file detail |
| F-3a.25 | Price history chart uses LTR axis labels in some charts | 🟡 | ★★ | S | reports/price |

#### Agents, settings, reports, messages, calendar (Pass 3b)

| ID | Finding | Sev | Impact | Effort | Evidence |
|----|---------|-----|--------|--------|----------|
| F-3b.1 | AgentForm permission matrix is collapsible but unintuitively labeled | 🟡 | ★★★ | S | `PermissionMatrix.tsx` |
| F-3b.2 | Permission preset dropdown labels not aligned with checkbox state | 🟡 | ★★ | XS | same |
| F-3b.3 | Branch dropdown only appears with multi-branch enabled — good — but no help text explaining HQ vs branch | 🟡 | ★★ | XS | AgentForm branch |
| F-3b.4 | DeactivateAgentButton uses `window.confirm()` (now noun-aware, but still native) | 🟠 | ★★★★ | S | `DeactivateAgentButton.tsx` |
| F-3b.5 | Settings → Team & Branches: enable multi-branch is a one-way action without explicit warning | 🟠 | ★★★★ | S | `TeamBranchesSection.tsx` |
| F-3b.6 | Branch switcher: ?branchId appears in URL but no clear indicator user is in scoped view | 🟡 | ★★★ | S | `BranchSwitcher.tsx` |
| F-3b.7 | Settings sub-tabs: scroll on mobile collapses tabs without sticky header | 🟡 | ★★ | S | settings layout |
| F-3b.8 | Reports page: 3 tabs but no period state preserved across tab switches | 🟡 | ★★★ | S | `app/(dashboard)/reports/page.tsx` |
| F-3b.9 | Reports charts: tooltip text overflows in RTL | 🟡 | ★★ | S | charts |
| F-3b.10 | Reports: no export to CSV/PDF (managers want this for tax) | 🟠 | ★★★★ | M | reports |
| F-3b.11 | MessagesPage: bulk SMS gating UI doesn't show projected SMS count | 🟠 | ★★★ | S | `app/(dashboard)/messages/page.tsx` |
| F-3b.12 | MessagesPage: no preview of merged template | 🟠 | ★★★★ | S | same |
| F-3b.13 | MessagesPage: history pagination missing | 🟡 | ★★ | S | same |
| F-3b.14 | Calendar: chevrons backward in RTL (next month / prev month flipped) | 🟠 | ★★★ | XS | `CalendarPageClient.tsx` |
| F-3b.15 | Calendar event create: time picker uses LTR | 🟡 | ★★ | S | calendar event form |
| F-3b.16 | Calendar reminder: silent vs sound choice not previewable | 🔵 | ★★ | XS | event form |
| F-3b.17 | Support ticket detail: replies don't auto-scroll to newest | 🟡 | ★★ | XS | support detail |
| F-3b.18 | Support ticket: no draft preservation on accidental refresh | 🟡 | ★★ | S | support detail |
| F-3b.19 | Profile page: no "your data export" option (compliance) | 🔵 | ★★ | M | `/profile` |
| F-3b.20 | Referral page: code copy works, but referral tree visualization absent | 🟡 | ★★★ | M | `/referral` |
| F-3b.21 | Referral: trial-to-paid bonus eligibility opaque to user | 🟠 | ★★★ | S | referral copy |

### 4.4 Pass 4 — Admin Operator Flows

| ID | Finding | Sev | Impact | Effort | Evidence |
|----|---------|-----|--------|--------|----------|
| F-4.1 | **`window.confirm()` on every destructive admin action** | 🟠 | ★★★★ | S | archive, suspend, deactivate buttons |
| F-4.2 | **No toast queue on admin mutations** | 🔴 | ★★★★★ | M | every admin write |
| F-4.3 | Office detail page is information-dense; no sticky sub-nav | 🟡 | ★★★ | M | `app/(admin)/admin/offices/[id]/page.tsx` |
| F-4.4 | Mid-admin tier capabilities not visible in admin UI; user finds out via 403 | 🟡 | ★★★ | S | admin layout topbar |
| F-4.5 | AccessRulesEditor: no preview of "this rule matches X offices right now" | 🟠 | ★★★★ | M | `AccessRulesEditor.tsx` |
| F-4.6 | AccessRulesEditor: union with explicit assignments not visualized | 🟡 | ★★★ | M | same |
| F-4.7 | Office archive: no "type the office name to confirm" step | 🟡 | ★★★ | S | archive flow |
| F-4.8 | Office view-as: returning to admin requires manual nav | 🟡 | ★★ | XS | office detail |
| F-4.9 | Subscription manager: extend trial uses date picker without quick presets (+7d, +30d) | 🟡 | ★★ | XS | `SubscriptionManager.tsx` |
| F-4.10 | Payment list: no filter by status (PENDING/VERIFIED/FAILED) shown by default | 🟡 | ★★ | XS | `/admin/payments` |
| F-4.11 | Action log: no permalink to a specific entry | 🔵 | ★★ | S | `/admin/audit-log` |
| F-4.12 | Action log: filter by admin user missing | 🟡 | ★★ | XS | same |
| F-4.13 | Broadcast: no "preview as office X" step | 🟠 | ★★★ | S | `/admin/broadcast` |
| F-4.14 | **Broadcast: no recipient count or preview** | 🟠 | ★★★★ | S | same |
| F-4.15 | Broadcast: send is irrevocable with no scheduled-send option | 🟡 | ★★★ | M | same |
| F-4.16 | Settings (PlatformSetting): no "what does this do?" inline help | 🟡 | ★★★ | XS | `/admin/settings` |
| F-4.17 | Settings: changing FREE_MAX_FILES has no warning about offices already over the new limit | 🟠 | ★★★★ | S | same |
| F-4.18 | Mid-admin login history table: no IP geolocation | 🔵 | ★★ | M | mid-admin detail |
| F-4.19 | Support detail (admin side): no quick-reply templates | 🟡 | ★★★ | S | support admin |
| F-4.20 | Admin dashboard KPIs: no period selector | 🟡 | ★★ | S | `/admin/dashboard` |

---

## 5. Cross-Cutting Themes

### 5.1 Toast / feedback system (highest priority cross-cut)
The single biggest UX gap. Every save, send, deactivate, copy, share, and reply across all panels uses `router.refresh()` for silent success. Recommend a single global toast provider (sonner-style) with three states: success (green pill), error (red pill), info (neutral). Every mutation in the app gets one line: `toast.success("ذخیره شد")`. **Effort:** M to add provider + ~3h per surface to wire it up; do it incrementally starting with FileForm save → share link create → SMS send → admin destructive actions.

### 5.2 Dark mode parity
Admin panel has explicit toggle. Dashboard uses base theme without explicit toggle, but most components honor `dark:` variants. Landing page has dark-mode contrast bugs (F-1.8). Spot checks show: landing hero subtitle, pricing card borders, and admin office detail metadata table all fail AA in dark mode. **Effort:** S audit pass with axe DevTools.

### 5.3 RTL consistency
Strong overall — most layouts mirror correctly. Three persistent gaps:
- Calendar chevrons (F-3b.14) — month nav is flipped
- Chart axis labels (F-3a.25, F-3b.9) — Recharts/Apex defaults to LTR
- Time pickers (F-3b.15) — native input doesn't mirror

Recommend a single `RTLChart` wrapper that flips axis order, and a Jalali time picker.

### 5.4 Plan-tier gating language
Current pattern: "این قابلیت در پلن شما نیست" + generic "ارتقاء" button. This is defensive language. Recommend the **show-the-feature-greyed-out** pattern (Linear, Notion):
- Render the UI greyed out
- Hover/tap shows a tooltip naming the unlocking plan and its price
- A single "ارتقاء به TEAM — ۲۹۰,۰۰۰ تومان/ماه" button inline

This converts blockers into nudges and makes the plan ladder visible while users are *in flow*.

### 5.5 Accessibility
Never explicitly tested. Quick wins:
- Add `aria-label` to all icon-only buttons (notification bell, search, theme toggle, branch switcher)
- Focus order on modals (WelcomeModal, ConfirmDialog if added)
- Skip-to-content link in dashboard layout
- Color-only state signals (active/archived files, ticket status) — add icons or text
- Reduced-motion respect for the calendar reminder ding sound and any animations

**Effort:** S for the quick wins; M for a full a11y pass.

### 5.6 Mobile vs. desktop affordance gaps
- Mobile bottom-nav is good; desktop sidebar is good; but **transitional states** (tablet 768–1024) collapse the sidebar without the bottom nav appearing — leaving the user without primary nav.
- Quick-create sheet on mobile is great; desktop has no equivalent quick-create — managers must navigate to `/files/new`.
- Search dialog is keyboard-first (⌘K) without a visible button on mobile — invisible to mobile users.

### 5.7 Empty / loading / error parity
CLAUDE.md mandates all three states. Spot-check coverage:
- Files list: ✅ all three
- CRM list: ✅ all three
- Reports: ⚠️ loading is a spinner, no empty state for "no contracts yet"
- Messages history: ⚠️ no empty state
- Admin office list: ✅ all three
- Admin support: ⚠️ error state is a generic 500 page

### 5.8 Destructive-action confirmation pattern
Currently every destructive action across admin (archive office, suspend, force-logout, deactivate user) and dashboard (deactivate agent, delete file) uses `window.confirm()`. Recommend a single `ConfirmDialog` component (shadcn AlertDialog) with:
- Title naming the action ("غیرفعال‌سازی این مشاور؟")
- Body listing the consequence ("این مشاور دیگر نمی‌تواند وارد شود. فایل‌های اختصاص داده شده دست نخورده باقی می‌مانند.")
- For high-stakes actions (archive office, delete data): require typing the entity name to confirm (Stripe / GitHub pattern)
- Primary button color matches severity (red for destructive)

---

## 6. Benchmarks Referenced

| Pattern | Benchmark | Used in finding(s) |
|---------|-----------|--------------------|
| Email-only signup, expand later | Linear, Stripe | F-1.11 |
| 3-step persistent onboarding checklist | Pipedrive, Intercom | F-2.1, F-2.4 |
| First-record celebration | Notion ("first page!"), Pipedrive | F-2.8, F-2.9 |
| Plan upgrade in-flow with grayed feature + tooltip | Linear, Notion | §5.4 |
| Type-to-confirm destructive | Stripe, GitHub | F-4.7, §5.8 |
| Toast on every mutation | Linear, Vercel dashboard | §5.1 |
| Photo upload progress per-file | Stripe Connect onboarding, Notion | F-3a.6 |
| Recipient count + preview before broadcast | Intercom messages | F-4.13, F-4.14 |
| Sticky in-context onboarding pill | Linear "Get started" | F-2.4 |
| Pricing FAQ + comparison matrix | Stripe Pricing | F-1.4, F-1.5 |
| Capability badge in admin top bar | AWS IAM "current role" | F-4.4 |

---

## 7. Open Questions

These need product input before I can recommend a direction:

1. **Trial length and tier defaults.** Current is 30 days full-feature. Should the trial be tier-specific (FREE → no trial, PRO → 14 days, TEAM → 30 days)? Affects F-1.12 and §5.4.
2. **Mobile-first vs. desktop-first manager?** CLAUDE.md says agents on mobile + managers on desktop, but the dashboard shell is shared. Should manager-only flows (reports, settings, broadcast) be desktop-optimized only?
3. **Activation metric.** Is it (a) first file created, (b) first share link sent, or (c) first SMS to a customer? This drives onboarding design (§3.2).
4. **Onboarding source of truth.** Should the OnboardingTutorial tour be replaced wholesale with a checklist, or coexist? (F-2.4)
5. **Plan-tier copy strategy.** Defensive ("not available") vs. inviting ("upgrade to unlock") vs. teaching ("here's what TEAM does") — which voice does product want?
6. **Destructive-action threshold.** Which actions warrant type-to-confirm vs. simple AlertDialog? Recommend: type-to-confirm for archive office, delete office data, force-logout-all; simple confirm for the rest.
7. **Reports export.** Managers want CSV/PDF for tax (F-3b.10). Is there a data-export plan that includes this?
8. **Support reply-templates.** Admin wants quick-reply templates (F-4.19); is there a backlog for this or is it new?
9. **Social proof on landing.** Are there real customers we can cite (logos, testimonials)? Without them, F-1.28 stays vague.
10. **Accessibility commitment.** Is AA compliance a goal? If yes, this becomes a milestone with its own plan.

---

## Verification

This audit is **not prescriptive**. Each finding is a starting point. Recommended next step: walk through §1 Executive Summary together, decide which top-10 items to greenlight, and start a separate plan-mode session per cluster:
- **Cluster A** (Conversion): F-1.6, F-1.11, F-1.28 + landing dark-mode pass
- **Cluster B** (Activation): F-2.1, F-2.2, F-3a.1 + onboarding checklist
- **Cluster C** (Feedback): toast system rollout (§5.1)
- **Cluster D** (Destructive trust): ConfirmDialog rollout (§5.8) + admin quick wins
- **Cluster E** (File-form polish): F-3a.4, F-3a.6, F-3a.11, F-3a.15, F-3a.16

Each cluster is 1–3 days of work. Total to clear the top-10 + cross-cuts: ~2 weeks.
