# Product Requirements Document (PRD)
## املاک‌یار — Real Estate Agent & Office Management SaaS

**Version:** 1.0 (Draft)
**Date:** 2026-02-19
**Author:** Product Owner
**Status:** Pre-Planning

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Target Users](#2-target-users)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Authentication & Security](#4-authentication--security)
5. [Office Profile](#5-office-profile)
6. [Core Feature — Property File Management](#6-core-feature--property-file-management)
7. [File Assignment & Editing](#7-file-assignment--editing)
8. [Share Links & Public Property Page](#8-share-links--public-property-page)
9. [Contract Finalization](#9-contract-finalization)
10. [Agent Profile](#10-agent-profile)
11. [Manager Dashboard](#11-manager-dashboard)
12. [CRM & Customer Management](#12-crm--customer-management)
13. [SMS System](#13-sms-system)
14. [Notifications](#14-notifications)
15. [Subscription & Billing](#15-subscription--billing)
16. [Referral System](#16-referral-system)
17. [Onboarding](#17-onboarding)
18. [Support](#18-support)
19. [Technical Architecture](#19-technical-architecture)
20. [Third-Party Integrations](#20-third-party-integrations)
21. [Non-Functional Requirements](#21-non-functional-requirements)
22. [Out of Scope (v1)](#22-out-of-scope-v1)

---

## 1. Product Overview

### 1.1 Summary
A Persian-language, RTL, PWA-based SaaS platform for Iranian real estate offices. It enables real estate agents (مشاور) and their office managers (مدیر املاک) to create, manage, share, and close property files (فایل ملک) — all from a single, mobile-first web application.

### 1.2 Core Value Proposition
- **Speed:** Agent can create a shareable property file on-site in under 2 minutes
- **Quality:** AI-generated descriptions, processed photos, and branded share pages elevate the presentation standard of every office
- **Control:** Manager has full visibility and control over all files, agents, contracts, and financial data
- **CRM:** Lightweight customer management with targeted SMS outreach built in

### 1.3 Market
- **Geography:** Iran
- **Language:** Persian (Farsi) — RTL
- **Platform:** Progressive Web App (PWA) — works on mobile (agents) and desktop (managers)
- **Currency:** Toman (تومان)
- **Calendar:** Jalali (Shamsi) displayed to users; Gregorian stored internally

---

## 2. Target Users

| User Type | Primary Device | Primary Use |
|-----------|---------------|-------------|
| مشاور (Agent) | Mobile (on-site) | Create files, view assigned files, share with customers |
| مدیر املاک (Office Manager) | Desktop | Manage files, agents, contracts, finances, CRM |
| Super Admin (Developer/Owner) | Desktop | Platform-wide administration |
| Mid Admin (Support Team) | Desktop | Assigned office support |

---

## 3. User Roles & Permissions

### 3.1 Role Hierarchy

```
Super Admin
    └── Mid Admin (assigned to specific offices)
        └── مدیر املاک / Office Manager (subscriber)
            └── مشاور / Agent (created by Manager)
```

### 3.2 Permission Matrix

| Action | Super Admin | Mid Admin | Manager | Agent |
|--------|------------|-----------|---------|-------|
| Create / manage offices | ✅ | ❌ | ❌ | ❌ |
| View all tenants' data | ✅ | Assigned only | ❌ | ❌ |
| Manage subscription & billing | ✅ | ❌ | ✅ (own) | ❌ |
| Create / delete agents | ✅ | ❌ | ✅ | ❌ |
| Create / edit files | ✅ | ❌ | ✅ | ✅ |
| Assign files to agents | ✅ | ❌ | ✅ | ❌ |
| Share files | ✅ | ❌ | ✅ | ✅ |
| Finalize contracts | ✅ | ❌ | ✅ | ❌ |
| View activity log | ✅ | ❌ | ✅ (own office) | ❌ |
| View financial reports | ✅ | ❌ | ✅ (own office) | ❌ |
| Edit office profile | ✅ | ❌ | ✅ | ❌ |
| Manage CRM customers | ✅ | ❌ | ✅ | ✅ |
| Send SMS | ✅ | ❌ | ✅ | ✅ |
| View referral stats | ✅ | ❌ | ❌ | ❌ |

### 3.3 Multi-Tenancy
- Each office is a **completely isolated tenant**
- No cross-office data visibility at manager or agent level
- Super Admin has full cross-tenant access
- Mid Admins access only explicitly assigned offices

---

## 4. Authentication & Security

### 4.1 Login
- Username + password for managers and agents
- Manager accounts created via self-registration
- Agent accounts created by manager (username + password assigned by manager)

### 4.2 Password Reset
- Via email link (v1)
- Phone number reset — future v2

### 4.3 Session Management
- Maximum **2 active sessions per user** (manager or agent)
- Exceeding limit: oldest session is terminated automatically
- Session tokens stored securely (httpOnly cookies)

### 4.4 Activity Log
- All file changes are logged: who, when, what changed
- Visible to **manager only** within their office
- Log entries: create, edit (field-level diff), assignment, status change, contract finalization, share link creation

---

## 5. Office Profile

Managed exclusively by the **office manager**. Used throughout the app for branding.

### 5.1 Fields
| Field | Notes |
|-------|-------|
| Office name | Displayed on share pages and watermarks |
| Logo | Used for photo watermarks and share page header |
| Address | Displayed on share pages |
| Phone number(s) | Displayed on share pages, used in SMS |
| Social media links | Telegram, Instagram, etc. |
| Bio / description | Shown on public share page when user taps office photo |
| Zarinpal payment credentials | For subscription billing |

---

## 6. Core Feature — Property File Management

### 6.1 What is a "File"
Each property is called a **فایل (File)**. A file tracks all information about a property listing from creation to contract closure.

### 6.2 Transaction Types
The transaction type is selected first and determines which fields appear:

| Type | Key Price Fields |
|------|-----------------|
| فروش (Sale) | Total price (تومان) |
| اجاره بلندمدت (Long-term Rent) | Deposit (رهن) + Monthly rent (اجاره) |
| اجاره کوتاه‌مدت (Short-term Rent) | Nightly or weekly rate |
| پیش‌فروش (Pre-sale) | Pre-sale price + payment terms |

### 6.3 Common Fields (All Types)
- Property type (آپارتمان، ویلا، زمین، مغازه، ...)
- Area (متراژ) in square meters
- Floor number / total floors
- Age of building (سن بنا)
- Amenities: elevator, parking, storage, balcony, security system, ...
- Location pin (via Neshan map)
- Contact(s): owner (مالک), tenant (مستاجر) — at least 1 required
- Photos (optional at creation, required for sharing)
- AI-generated description
- Notes (internal, not shown on share page)

### 6.4 Minimum Required to Save a File
1. Transaction type
2. Location pin on map
3. At least 1 contact (owner or tenant) with phone number

Everything else is optional and can be completed later.

### 6.5 File Statuses
| Status | Description |
|--------|-------------|
| فعال (Active) | Live file, fully editable, share links work |
| بایگانی (Archived) | Manually archived, share links deactivated |
| فروخته‌شده (Sold) | Contract finalized as sale |
| اجاره داده‌شده (Rented) | Contract finalized as rent |
| منقضی (Expired) | Auto-set after inactivity threshold (TBD) |

### 6.6 Price History
- Every price change is recorded with timestamp and previous value
- Visible to both manager and agent
- Displayed as a collapsible timeline within the file detail view

### 6.7 Quick File Creation Flow (Mobile)
1. Agent taps FAB (floating action button) from dashboard
2. Selects transaction type
3. Drops pin on Neshan map
4. Adds at least 1 contact
5. Taps "Save Draft" — file is created and visible in manager's panel immediately
6. Agent or manager completes remaining fields later

### 6.8 AI Location Analysis
Triggered automatically when location pin is saved. Uses Neshan POI data:
- Walking time to nearest public transport (metro, BRT, bus)
- Driving time to city airport (if applicable)
- Proximity flags for: schools, prisons, highways, industrial zones, cemeteries
- **Behavior:** Shows only what data is available. Silently skips missing data. No confidence warnings.

### 6.9 AI Description Generation
- Triggered manually by agent/manager (button: "تولید توضیحات")
- Input: all filled file fields + location analysis results
- Provider: AvalAI (primary LLM), pre-built template (fallback if AI fails or is slow)
- User selects tone before generation:
  - **کاملاً صادقانه** — includes negatives (e.g. near highway)
  - **خنثی** — factual, no spin
  - **خوش‌بینانه** — positives emphasized, negatives softened
- Output is editable by both agent and manager
- Can be regenerated with a different tone at any time

### 6.10 Photo Processing
- All processing is **server-side**
- Triggered automatically after upload
- Steps:
  1. Receive raw image from client
  2. Compress and normalize dimensions (standard aspect ratio TBD)
  3. Enhance colors (brightness, contrast, saturation correction)
  4. Apply office logo watermark (bottom-right corner, semi-transparent)
- Photo limits by plan:
  - Small plan: **10 photos per file**
  - Large plan: **20 photos per file**
- No manual file size limit enforced — server handles compression
- Processing happens in background; user sees upload progress then "processing..." state

### 6.11 Contact Information
- Add button (+) allows adding multiple contacts
- Contact types: مالک (owner), مستاجر (tenant), موجر (landlord), خریدار (buyer)
- Fields: name, phone number(s), optional notes
- Stored on the file, visible to assigned agents and manager

---

## 7. File Assignment & Editing

### 7.1 Assignment
- Manager assigns a file to one or more agents
- Assigned agents see the file in their "My Files" list
- Manager can reassign or add/remove agents at any time

### 7.2 Editing Model
- **One shared file** — single source of truth
- **Last edit wins** — no branching or version conflicts
- **Full activity log** tracks all changes with attribution
- Price differences between customers are handled at **share link creation time**, not at file level

### 7.3 Edit Access
| Role | Can Edit | Sees Log |
|------|----------|----------|
| Manager | ✅ All fields | ✅ Full log |
| Assigned Agent | ✅ Most fields | ❌ |
| Non-assigned Agent | ❌ | ❌ |

---

## 8. Share Links & Public Property Page

### 8.1 Creating a Share Link
1. Agent or manager taps "اشتراک‌گذاری" on a file
2. A modal appears asking:
   - Price to show: current file price OR custom price for this recipient
3. System generates a unique share link
4. Each share action creates a **new unique link** with its own price and view counter
5. Link is copied to clipboard and/or sent via WhatsApp/Telegram

### 8.2 Share Link Domain
- Format: `view.[appname].ir/[unique-token]`
- Separate clean domain from main app domain
- Per-office subdomains (e.g. `officename.[appname].ir`) — **future v2 feature**

### 8.3 Public Property Page Content
| Section | Content |
|---------|---------|
| Header | Office logo, office name |
| Photos | Sliding gallery (processed, watermarked) |
| Title | Property type + neighborhood/area |
| Price | Price set at link creation (not file's current price) |
| Description | AI-generated (or manually written) description |
| Details | Transaction type, area, floor, age, amenities |
| Location | Neshan map embed with dropped pin |
| Location analysis | Walking/driving times, proximity flags |
| Agent info | Agent name, profile photo, contact buttons (call / WhatsApp) |
| Office info | Tap office photo → slide-up with office bio, address, social links |
| Reviews | Manager-approved star ratings from past customers (if any) |

### 8.4 Link Validity
- Link remains active as long as file status is **فعال (Active)**
- Link automatically deactivates when file is archived, sold, rented, or expired

### 8.5 Link Analytics
- View count tracked per link
- Visible to manager in file detail view
- Agent can also see view count for links they created

### 8.6 Photo Downloads
- Each processed photo downloadable individually from the file management view (not the public page)
- No ZIP file — individual downloads

---

## 9. Contract Finalization

### 9.1 Who Can Finalize
- **Manager only**

### 9.2 Finalization Flow
1. Manager opens an active file and taps "بستن قرارداد"
2. Fills in:
   - Transaction type confirmation (sale / long-term rent / short-term rent / pre-sale)
   - Final price agreed
   - Commission percentage — buyer/seller side or tenant/landlord side
   - Commission percentage — specific agent's cut
   - Optional: upload photos or text notes for internal archive
3. Confirms — file status changes to فروخته‌شده or اجاره داده‌شده
4. All share links deactivate immediately
5. Financial data is recorded to office and agent stats

### 9.3 Post-Finalization State
- File is archived automatically
- Assigned agents: **read-only access** (can view, cannot edit)
- Manager: full view access to all data including archive attachments
- File appears in agent's "Closed Files" history

### 9.4 Data Recorded
| Metric | Where Visible |
|--------|--------------|
| Deal count | Agent profile, manager dashboard |
| Transaction value | Manager financial report |
| Agent commission amount | Agent profile, manager financial report |
| Office commission amount | Manager financial report |

---

## 10. Agent Profile

### 10.1 Creation
- Created by manager
- Required fields: username, password
- Manager sets initial password; agent can change it later

### 10.2 Agent-Editable Fields
- Display name
- Profile photo

### 10.3 Manager-Only Fields
| Field | Notes |
|-------|-------|
| Birth date | Jalali date picker |
| National ID (کد ملی) | Text, 10 digits |
| Internal bio | Manager's notes about agent — agent cannot see this |
| Manager's private notes | Freeform text |

### 10.4 Agent Stats (Visible to Manager)
- Total files created
- Total files closed (successful deals)
- Total transaction value handled
- Total commission earned
- Average deal close time
- Customer ratings (all ratings, with manager controlling public visibility)

---

## 11. Manager Dashboard

### 11.1 Layout
**Top Section — KPI Cards:**
- Active files count
- Contracts closed this month
- Monthly revenue (office commission total)
- Active agents count

**Bottom Section — Activity Feed (scrollable):**
- New file created (by whom)
- File edited (by whom, which field)
- Contract finalized
- New agent added
- Share link created
- Customer added to CRM

**Separate Sections (via navigation):**
- All Files (with filters)
- All Contracts
- Agent List & Profiles
- Financial Reports
- CRM / Customers
- Settings (office profile, billing)

### 11.2 Financial Reports
- Total office revenue by month / quarter / year
- Per-agent commission breakdown
- Deal type breakdown (sale vs rent)
- All time totals

---

## 12. CRM & Customer Management

### 12.1 Customer Types
- خریدار (Buyer)
- فروشنده (Seller)
- مستاجر (Tenant)
- موجر (Landlord)

### 12.2 Adding a Customer
- Either manager or any assigned agent can add a customer
- Required: phone number
- Optional note fields:
  - Budget range (بودجه)
  - Desired area (متراژ مطلوب)
  - Preferred neighborhood (منطقه مورد نظر)
  - Other needs (freeform text)
- Notes visible to both manager and all agents of the office

### 12.3 Walk-in Customer Flow (مشتری گذری)
1. Agent or manager enters customer phone number
2. System checks if number exists in CRM — if yes, loads their profile; if no, creates new
3. Agent/manager filters the office's active files by criteria matching customer needs
4. Selects one or more files to send
5. System sends SMS with share link(s) to the customer's number

### 12.4 Transaction History
- Each customer record shows all past interactions: files sent, deals closed

### 12.5 Rent Follow-up
- When a rent contract is finalized, the system records the lease end date
- **30 days before lease end:** system prompts manager with option to send follow-up SMS
- Manager writes custom message or uses a template
- SMS is sent to the tenant's number

---

## 13. SMS System

### 13.1 Provider
**KaveNegar (کاوه نگار)**

### 13.2 SMS Types

| SMS Type | Trigger | Sender | Recipient |
|----------|---------|--------|-----------|
| File share | Agent/manager shares file | Agent/manager | Customer |
| Post-deal rating request | Contract finalized | Manager | Customer |
| Rent follow-up | 30 days before lease end | Manager (manual) | Tenant |
| Custom outreach | Manual | Manager/Agent | Customer |

### 13.3 Templates
- Pre-built templates for each SMS type in Persian
- All templates editable by manager before sending
- Template variables: `{customer_name}`, `{agent_name}`, `{office_name}`, `{link}`, `{price}`, `{property_type}`

### 13.4 Rating SMS
- Sent after contract finalization (manager chooses when to send)
- Link goes to a simple internal rating page (not third-party)
- Rating page: 1–5 stars + optional text comment
- Customer participation is optional
- Manager sees all ratings in agent profile
- Manager decides per-rating whether to display it publicly on share pages

---

## 14. Notifications

### 14.1 Notification Types

| Event | Who Gets Notified |
|-------|------------------|
| File assigned to agent | Agent |
| File edited by manager | Assigned agent(s) |
| File edited by agent | Manager |
| New agent added | Manager |
| Subscription expiring (7 days before) | Manager |
| Grace period started | Manager + all agents |
| New customer rating received | Manager |

### 14.2 Delivery Mechanism
- **Background:** PWA push notifications (when app is not open)
- **In-app:** Polling every 30 seconds for new notification events
- **No WebSockets** in v1

### 14.3 Notification Center
- Bell icon in top nav
- List of recent notifications with timestamp
- Mark as read individually or all at once

---

## 15. Subscription & Billing

### 15.1 Trial
- **1-month free trial** upon registration
- Full access to **all Large Plan features** during trial
- No credit card required to start trial
- Renewal reminder notifications start 7 days before trial ends

### 15.2 Plans

| Feature | Small Plan | Large Plan |
|---------|-----------|-----------|
| Agents | TBD | TBD |
| Active files | TBD | TBD |
| Photos per file | 10 | 20 |
| SMS per month | TBD | TBD |
| AI descriptions | TBD | TBD |
| Price | TBD | TBD |

*Exact limits and pricing to be defined in planning phase.*

### 15.3 Payment
- **Provider:** Zarinpal (زرین‌پال)
- Recurring monthly or annual billing
- Manager enters Zarinpal credentials in office settings

### 15.4 Subscription Lifecycle

```
Registration → 1-Month Full Trial
    → Trial ending (7-day warning) → Payment via Zarinpal → Active subscription
    → Expiry → 7-day grace period (full access + persistent banner)
    → After 7 days → Read-only lock (can view, cannot create/edit)
    → Data is NEVER automatically deleted
```

### 15.5 Expired Account Behavior
- Manager and agents can log in
- All data visible and readable
- No new files, edits, contracts, or SMS
- Persistent renewal banner on all screens
- Agents shown a message explaining the account is suspended

### 15.6 Signup Flow
1. Manager visits registration page
2. Fills: name, office name, email, password
3. Optionally enters referral code
4. Account created → 1-month trial starts immediately
5. Onboarding flow begins

---

## 16. Referral System

### 16.1 How It Works
- Each referrer (sales agent / local presenter) has a unique referral code
- Manager enters referral code at registration (optional)
- Code is permanently linked to that office's subscription

### 16.2 Super Admin Tracking
Super Admin dashboard shows per referrer:
- Number of referred offices
- Current tier of each referred office
- Active vs inactive referred offices
- Monthly revenue attributed to each referrer (for commission calculation)

### 16.3 Payouts
- Calculated and paid manually by Super Admin based on dashboard data
- No automated payout in v1

---

## 17. Onboarding

### 17.1 Goal
Get manager to their **first saved file** in under 5 minutes.

### 17.2 Flow
1. Welcome screen with 3-step overview
2. Step 1: Complete office profile (name, logo, phone) — skippable
3. Step 2: Create first agent account — skippable
4. Step 3: Create first file (guided) — strongly encouraged
5. Progress bar shows completion
6. "Skip for now" available at each step
7. Checklist persists in dashboard until all steps are complete

---

## 18. Support

### 18.1 v1
- Email to support address (shown in app)
- Response from Mid Admin or Super Admin

### 18.2 Future
- Ticketing system within the app

---

## 19. Technical Architecture

### 19.1 Platform
- **Type:** Progressive Web App (PWA)
- **Orientation:** Mobile-first for agents, desktop-optimized for managers
- **Language:** Farsi (Persian), RTL
- **Calendar:** Jalali display / Gregorian stored

### 19.2 Hosting
- **All infrastructure on IranServer**
  - Backend: IranServer VPS
  - Database: IranServer managed DB (or self-hosted on VPS)
  - File/image storage: IranServer object storage
  - Domain: IranServer

### 19.3 Tech Stack
*(To be finalized in planning phase — constraints: well-documented, popular, solo-developer-friendly, scalable, low cost)*

Recommended direction:
- **Frontend:** Next.js (PWA via next-pwa) — React-based, excellent documentation, SSR for public share pages
- **Backend:** Next.js API routes or separate Node.js/Express — same language across stack
- **Database:** PostgreSQL — relational, handles multi-tenancy well, excellent tooling
- **ORM:** Prisma — type-safe, great DX for solo developers
- **File Storage:** IranServer S3-compatible object storage
- **Auth:** JWT tokens (httpOnly cookies) + custom session management

### 19.4 Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| File versioning | Single shared file, last-edit-wins | Simplicity. Activity log provides audit trail. |
| Share link pricing | Set at link creation time | Decoupled from file — no file forking needed |
| Real-time | PWA push + 30s polling | No WebSockets in v1. Acceptable UX for this use case. |
| Photo processing | Server-side | Consistent quality. No device dependency. |
| Offline | Local draft (IndexedDB) + auto-sync | Agent can start file with no connection. |
| Multi-tenancy | Row-level isolation (tenant_id on all tables) | Standard SaaS pattern. Simple to implement and reason about. |
| Calendar | Jalali display / ISO 8601 stored | Best of both: correct UX + correct data integrity |

---

## 20. Third-Party Integrations

| Service | Purpose | Notes |
|---------|---------|-------|
| **AvalAI** | LLM for description generation | Persian LLM access via Iranian proxy |
| **Neshan (نشان)** | Maps, location pin, POI analysis, routing | Iranian map provider |
| **KaveNegar** | SMS sending | Leading Iranian SMS gateway |
| **Zarinpal** | Payment / subscription billing | Leading Iranian payment gateway |

---

## 21. Non-Functional Requirements

### 21.1 Performance
- File creation form: interactive within 2 seconds on 3G
- Public share page: loads within 3 seconds on 3G
- Photo upload + processing: completes in background (non-blocking)
- Dashboard: initial load under 3 seconds

### 21.2 Reliability
- Offline draft saving for file creation form (IndexedDB)
- Auto-sync on reconnect
- Graceful degradation when AI or map unavailable

### 21.3 Security
- All data encrypted in transit (HTTPS)
- Password hashing (bcrypt)
- Max 2 concurrent sessions per user
- Tenant data isolation enforced at database query level
- No cross-tenant data leakage possible at API level

### 21.4 Scalability
- Multi-tenant architecture supports any number of offices
- IranServer VPS can be vertically scaled initially
- Object storage for files — scales independently

### 21.5 Accessibility
- Full RTL support
- Minimum contrast ratios met
- Form inputs keyboard-accessible
- Touch targets minimum 44×44px on mobile

---

## 22. Out of Scope (v1)

The following are explicitly **not** in v1 and may be added in future versions:

- Phone number login / OTP authentication
- Per-office custom subdomains on share pages
- Ticket/helpdesk system
- Native iOS or Android app (PWA only)
- Multi-language support (Persian only)
- Automated referral commission payouts
- In-app chat between manager and agent
- AI-powered customer-file matching suggestions
- Integration with Divar or Sheypoor APIs
- Map-based file browsing / search
