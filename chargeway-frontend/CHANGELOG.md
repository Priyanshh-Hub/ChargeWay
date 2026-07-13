# ChargeWay — Changelog

## Round 4: Visual Redesign — Logo, Background, Copy, Invoice

**Scope note:** the design-review doc covered ~15 pages of feedback across every screen. This round covers what was explicitly asked for this message (logo/title, background, copy, invoice) plus the login/register visual rework since it was the doc's top item. Deeper redesigns for Station Detail, Dashboard hero, Booking review-flow, and Admin/Manager tables from the doc are not done yet — flagged below, not silently skipped.

### Logo & browser tab
- New brand mark: a hexagonal badge with a bolt (nods to both "charge" and a battery-cell shape) instead of the old plain rounded-square icon. Pure SVG, reused everywhere (header, login, register) and as the favicon — zero image dependency.
- Browser tab now shows "ChargeWay — Smart EV Charging" with a proper favicon and meta description (previously just "ChargeWay" with no icon).

### Animated background
- Replaced the static gradient+pattern background with 4 genuinely animated layers: a slow-drifting gradient wash, two independently-pulsing glow orbs, a fine grid (masked so it fades toward the edges), and ~22 slow-floating particles drifting upward — the Linear/Vercel/Stripe look the doc referenced. All CSS-driven (no per-frame JS), and respects `prefers-reduced-motion` (already wired up from Round 3).

### Login & Register redesign
- Login is now a split-screen layout: left panel pitches the product (tagline, 4 benefit bullets) with the new logo; right panel keeps the polished form. Previously it was just a centered card with no context about what ChargeWay does.
- Copy pass: "Welcome Back" → "Welcome back" + "Sign in to continue to your dashboard"; submit button now reads "Continue to Dashboard →" (or "Signing you in..." while loading, replacing the bare spinner); "No account? Register" → "Don't have an account? Sign up".
- Register: added live green checkmarks next to Name/Email/Phone once validated (was error-only before); tagline changed to "Start your EV charging journey."; success screen rewritten to "🎉 Welcome to ChargeWay / Your account has been created" with a simpler "Continue →".
- Welcome animation: the loading screen now tells a real sequence ("Connecting..." → "Loading your charging history..." → "Preparing your dashboard...") instead of one static line; the post-login greeting now reads "Ready to Charge ⚡" per the reviewed copy.

### Wording pass (developer language → product language)
- Nav: "Bookings" → "Sessions". Page headings: "My Bookings" → "Charging Sessions", "Charging Stations" → "Find a Charging Station", "My Spending History" → "Charging Expenses".
- Vehicle setup: "Vehicle Setup" → "Let's Connect Your EV", "Confirm Selection" → "Save Vehicle".
- "Restoring your session..." → "Preparing your charging experience..." on app load.
- Invoice empty state now matches the doc's suggested copy exactly ("No invoices yet. Book your first charging session to see it here.").
- Note: the doc's "Analytics → Energy Insights" rename applies to a user-facing Analytics view that doesn't exist yet (only Managers/Admins have Analytics currently) — nothing to rename there yet.

### Invoice redesign
- **Real GST breakdown**: previously showed a flat "Platform Service Fee" with no tax line. Now shows Taxable Value + CGST @ 9% + SGST @ 9%, backed out from the total (standard practice for GST-inclusive B2C pricing in India).
- **Booking ID** now shown on every invoice (previously missing entirely).
- **QR code** added to both the in-app preview and the downloaded HTML file, encoding invoice number/booking ID/amount for quick verification.
- **Print** and **Share** actions added (previously only Download existed). Print opens a print-ready version in a new tab; Share uses the native Web Share API where available, falling back to copying a summary to the clipboard.
- Swapped the ⚡ emoji logo for the real SVG brand mark in both the preview and the downloaded file.
- The GSTIN shown (`24XXXXX1234X1ZX`) is a **placeholder** — flagged in a code comment for whoever deploys this to swap in the real registered GSTIN before going live.
- Trade-off worth knowing: generating the QR as static markup for the downloadable HTML file pulls in `react-dom/server`, which added ~25KB (gzipped) to the bundle. Reasonable for now; worth revisiting if bundle size becomes a priority (see Round 3's code-splitting note).

### Typography system
- Added a real type scale to `tailwind.config.cjs` (`text-hero` 48px / `text-page` 32px / `text-card` 20px / `text-section` 16px / `text-caption` 12px) to replace the inconsistent `text-2xl font-black` used almost everywhere, per the doc's specific callout.
- Applied to the pages touched this round (Login, Register, Find a Charging Station, Invoices, Charging Sessions) as a working example. **Not yet applied app-wide** — Dashboard, Station Detail, Profile, Admin, and Manager screens still use the old ad-hoc sizing. Straightforward but mechanical work — say the word and I'll sweep the rest.

### ⏭️ Still open from the design doc
- Dashboard hero redesign (Good Morning greeting, battery %, nearest station, today's recommendation) — Round 2 added a Green Impact stat and Vehicles quick-action, but not the full hero rebuild.
- Station Detail page additions (photo gallery, popular times, nearby amenities).
- Booking flow review-page redesign (multi-step Station→Time→Charger→Cost→Vehicle→Confirm).
- Admin table improvements (better pagination UI, bulk actions).
- Header additions: notification bell, profile dropdown menu, mobile drawer, breadcrumbs.
- App-wide typography scale rollout (see above).
- Consistent spacing/padding/shadow audit across every component — the doc's "Overall UI Consistency" section.

## Round 3: Routing, Security Hardening, Accessibility

### Client-side routing (react-router)
- Replaced `useState`-driven navigation with real URLs: `/login`, `/register`, `/car-setup`, `/dashboard`, `/stations`, `/stations/:stationId`, `/bookings`, `/vehicles`, `/invoices`, `/profile`, `/analytics`, `/admin/users`, `/admin/stations`.
- Browser back/forward now works correctly; station pages are shareable/deep-linkable.
- Route guards: unauthenticated users are redirected to `/login`; role-restricted routes (e.g. `/admin/*`) redirect non-matching roles back to `/dashboard`; Users without a vehicle are redirected to `/car-setup` until they add one.
- Added `vercel.json` and `public/_redirects` (Netlify) so refreshing a deep link like `/stations/abc123` doesn't 404 on static hosting — this is a standard requirement once client-side routing is added and is easy to miss.
- Removed more leftover Next.js placeholder assets (`public/*.svg`) not used by this Vite app.

### Security hardening
- **Fixed a real stored-XSS risk**: the downloadable invoice `.html` file embedded the user's name, email, phone, vehicle number, and station name directly into raw HTML with no escaping. A name like `<img src=x onerror=...>` would execute the moment that invoice file was opened. Added an `escapeHtml()` helper and applied it to every user-controlled field in the invoice template.
- **Seed route hardened**: `/api/seed` previously had no authentication beyond a `NODE_ENV` check — anyone who found the URL on a reachable dev/staging server could wipe the database. Now requires a `SEED_SECRET` (set in `.env`) passed via header.
- **Review submission validation**: rating and comment were completely unvalidated server-side (client-side checks are trivially bypassed by calling the API directly). Now enforces rating is an integer 1–5 and comment is capped at 1000 characters.
- **File upload hardening**: image uploads were only checked by MIME type, which is client-supplied and spoofable. Now checked against both MIME type *and* file extension allow-lists.
- **CORS made configurable**: origins were hardcoded to `localhost` dev ports, which would either break in production or silently accept requests from unintended origins depending on how it's deployed. Now reads from `ALLOWED_ORIGINS` env var.
- Reduced the JSON body size limit from 10MB to 1MB — the old limit was unnecessarily generous for an app with no JSON-embedded file data, and was an easy request-flooding vector.
- Ran `npm audit fix` — resolved 7 of 10 flagged dependency vulnerabilities. Two remain: a moderate esbuild/Vite dev-server issue (only exploitable against your local dev server, not production) that requires a breaking Vite major-version upgrade to fully resolve, and a high-severity `xlsx` (SheetJS) prototype-pollution issue with **no fix currently available upstream** — worth knowing about since `xlsx` is used for Excel export features; flagging rather than silently leaving it.

### Accessibility
- `Modal`: dialog role/`aria-modal`/`aria-labelledby` now correctly placed on the actual dialog content (was on the overlay); focus now moves into the dialog on open and returns to the triggering element on close — previously focus was left wherever it was, which is a real problem for keyboard/screen-reader users.
- `Btn`: now forwards `aria-*` props, sets `aria-busy`/`aria-disabled` while loading, and gives the loading spinner a screen-reader-only "Loading" label instead of being a silent decorative element.
- Added missing `aria-label`s to icon-only buttons (favorite-station toggles, favorite-vehicle toggle).
- Star ratings now use proper `radiogroup`/`radio` roles with per-star labels instead of being unlabeled clickable text.
- (Round 1 already added focus-visible rings and `prefers-reduced-motion` support globally.)

### ⏭️ Still open
- Full accessibility audit is not complete — this round covered the most-used interactive components (Modal, Btn, star ratings, favorite toggles), but a systematic pass over every screen (especially forms and the map view) hasn't been done.
- Bundle is still one ~550KB chunk — no code-splitting/lazy-loading yet.
- Deeper Admin/Manager/Analytics feature work (audit logs, bulk ops, richer reporting) — unchanged this round.
- Real transactional email and OAuth social login — still stubbed, need external provider credentials from you before I can build them.

## Round 2: Vehicle Image Bug Fix + Broad Module Pass

**Scope note:** This round covers real, working improvements across every remaining module, prioritizing bug fixes, missing core functionality, and the highest-impact items from your list — not a literal line-by-line implementation of all ~400 remaining bullets (that's not achievable at production quality in one pass). Everything below is tested (frontend builds clean, backend boots clean with all routes mounted).

### 🐛 Bug fix: car image not loading
Root cause: the app depended on hotlinked external photos (Wikimedia URLs, generic placeholder boxes) that are unreliable, slow, and not something we have rights to redistribute long-term.

**Fix:** built a custom `VehicleVisual` component — a zero-dependency, brand-colored SVG car illustration (no network request, no broken links, no copyright concerns) with a glowing charge-port animation when a session is active. Replaces the old `<img>` everywhere a vehicle photo was shown: User Dashboard, My Vehicles cards, vehicle setup/add flows, and the welcome animation.

### Station Module
- **Favorite stations** — full feature, previously entirely missing. Star icon on every station card, "Favorites" filter toggle, new backend endpoints.
- **Sorting** — price low/high, most available.
- Fixed a real bug: station images used a hardcoded `http://localhost:5000/...` URL that would silently break in any non-local deployment. Now uses the shared `serverImg()` helper.
- Skeleton loading state instead of a blank spinner; `EmptyState` component for no-results.

### Booking Module
- **Fixed a real bug:** the Cancel button on My Bookings had *no confirmation step* — one misclick cancelled a reservation instantly. Added a proper confirmation modal.
- **QR check-in code** on the booking confirmation screen and on each upcoming booking (the `qrcode.react` dependency was already installed but unused).
- Skeleton loading + `EmptyState` for the bookings list.

### Invoice Module
- Search (by station name or invoice #), date-range filter, and sort (newest/oldest, amount high/low) — previously you could only scroll.

### Profile Module
- **Notification preferences** (email / SMS / promotions toggles) — new backend field + endpoint, previously nonexistent.
- **Delete Account** — real, password-confirmed self-service deletion. Previously only Admins could delete a user; there was no way for a user to delete their own account.
- **My Vehicles** quick-link card.
- Password change now uses the same `PasswordInput` component as Login/Register (show/hide, caps-lock warning, live strength meter) instead of a separate, weaker inline implementation. Minimum length aligned to 8 characters to match the rest of the app.

### User Dashboard
- Fixed the car image bug (see above) — this was the most visible issue on this page.
- Added a Green Impact stat (kg CO₂ saved) next to spending totals.
- Added "My Vehicles" to Quick Actions.

### Admin Module
- Replaced jarring native `alert()` popups (on delete/suspend/report-download failures) with proper toast notifications, consistent with the rest of the app.

### ⏭️ Still not covered (being upfront, not silently skipping)
- Deeper Admin/Manager/Analytics work (audit logs, bulk operations, permissions, deeper reporting/export, maintenance tracking) — these files are already functional but weren't reworked this round.
- Performance: code-splitting/lazy-loading, React Query, bundle-size reduction (the built JS bundle is ~527KB — a `manualChunks` pass would help).
- Full accessibility audit (screen reader labeling, comprehensive ARIA pass) — only focus rings and reduced-motion support are in place so far.
- Security hardening beyond what Round 1 covered (XSS/CSRF, file-upload validation, input sanitization).
- Product/growth strategy — the "what's the wow factor / what's v2" thinking from your list #16.

Happy to go deeper on any single one of these next — just say which.


## ✅ Authentication

**Login**
- Real-time field validation (email format, required fields) with inline errors
- Remember Me — persists email locally and issues a longer-lived (30-day) session token
- Forgot Password flow (modal: request → email sent → reset → done)
- Show/hide password toggle
- Caps Lock warning while typing your password
- Friendly, specific error messages instead of raw API errors
- Rate-limit UI — after repeated failed attempts, the button shows a live cooldown countdown
- "Restoring session…" spinner instead of a blank screen on reload
- Social login buttons are present but disabled ("Coming soon") — no OAuth backend wired up yet, flagged rather than faked

**Register**
- Live password strength meter with rule checklist (length, upper/lower case, number, symbol)
- Confirm password with live match validation
- Live per-field validation on blur (name, email, phone, password)
- Required Terms & Conditions checkbox with a real (placeholder-copy) terms modal
- Duplicate email is now caught with a specific inline message + link back to sign in
- New success screen after registration (not just a redirect) that explains email verification and lets you continue immediately

**Email verification & password reset (backend, simulated)**
- No SMTP/email provider is connected yet. In development, verification and reset links are logged to the server console and returned in the API response so the flow is fully testable end-to-end.
- To go live: plug a provider (e.g. Nodemailer + SendGrid/SES) into `routes/auth.js` where the `devVerifyUrl` / `devResetUrl` values are generated, and stop returning them in the response.

**Security**
- Fixed: suspended (`isActive: false`) accounts could previously still log in — now blocked with a clear message.
- Server-side password policy (min 8 chars, letters + numbers) added, on top of client-side strength meter.
- Simple in-memory rate limiter on `/auth/login` and `/auth/forgot-password` (8 / 5 attempts per 15 min). Fine for a single-process deployment; swap for Redis-backed limiting if you scale horizontally.
- Global 401 handling on the frontend — an expired/invalid token now cleanly logs the user out with a toast, instead of leaving broken screens.
- 30-minute idle timeout auto-logs the user out.

## ✅ Vehicle Module

- **Multiple vehicles per account** (up to 6), each with its own nickname, vehicle number, connector type, and battery health.
- **New "My Vehicles" page** (nav item added) — add, edit, delete, and set a primary/favorite vehicle.
- **Favorite vehicle** — the dashboard's "primary" vehicle stays in sync automatically.
- Brand + model **search** on both the first-time vehicle setup screen and the "Add Vehicle" flow.
- **Connector type** shown per model/vehicle (CCS2 / Type 2 / etc.) for compatibility awareness.
- **Battery health** tracking (editable), separate from live charge %.
- First-time vehicle setup (`CarSelection`) now posts to the new multi-vehicle API instead of overwriting a single `car` field.

## 🧩 Shared UI Library (benefits every future module)
- `PasswordInput` (show/hide, caps-lock, strength meter)
- `Checkbox`, `Modal`, `Skeleton` / `CardSkeleton`, `EmptyState`
- `Alert` now supports a `warning` type
- New icons: eye/eye-off, star, edit, trash, plug, shield, mail, lock, search, warning, battery
- Reduced-motion support and visible keyboard focus rings added globally (first accessibility pass)

## 🧹 Cleanup
- Removed dead Next.js scaffold (`next.config.mjs`, `src/app/`) — the app runs on Vite only.
- `dist/` added to `.gitignore` (was missing; only `/build` was ignored).
- API base URL now reads from `VITE_API_URL` env var instead of being hardcoded to `localhost:5000`. See `.env.example`.

## ⏭️ Deferred (flagged, not silently skipped)
- Real OAuth social login (Google/Apple) — needs provider credentials + backend OAuth flow.
- Real transactional email (verification/reset) — needs an email provider.
- Redis-backed rate limiting for multi-instance deployments.
- Everything outside Authentication + Vehicle modules (Dashboard, Stations, Booking, Invoices, Profile, Analytics, Admin, Manager, routing/React Query/code-splitting, full accessibility audit) — next rounds, per your module list.
