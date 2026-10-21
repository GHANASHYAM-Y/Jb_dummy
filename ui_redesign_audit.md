# EVOAIQU — Website-Wide UI/UX Redesign Audit

**Date:** October 2026  
**Auditor:** Antigravity AI Engineering & Design Team  
**Scope:** Complete Next.js App Router codebase (`src/app/`, `src/components/`, `src/lib/`)  
**Design System Standard:** EVOAIQU Coastal Modern Light-First Design System  

---

## 1. Approved Brand System & Visual Language

### 1.1 Color Tokens
- **Canvas / Ivory:** `#F7F8F4` (`--bg-page`)
- **Card & Surface White:** `#FFFFFF` (`--surface-white`)
- **Primary Teal:** `#167D78` (`--brand-teal`) — Main interactive actions, branding, primary button fill
- **Teal Hover:** `#12635F` (`--brand-teal-hover`)
- **Pale Mint Tint:** `#DDF2EB` (`--surface-pale-teal`) — Chips, active navigation pills, badges
- **Coral Accent:** `#D95F49` (`--brand-coral`) — Selective for video dares, challenges, high-stakes badges
- **Coral Hover:** `#C34E39` (`--brand-coral-hover`)
- **Pale Peach Tint:** `#FCE6DE` (`--surface-pale-peach`) — Dare cards, challenge callouts
- **Text Primary (Evergreen):** `#203331` (`--text-primary`) — WCAG AAA contrast headings & primary copy
- **Text Secondary (Slate):** `#65736F` (`--text-secondary`) — Supporting copy, subtitles, metadata
- **Text Faint:** `#8E9B97` (`--text-faint`) — Placeholders, timestamps, borders
- **Subtle Architectural Border:** `#E2E8E2` (`--border-subtle`)
- **Border Hover / Focus:** `#CBD4CB` (`--border-hover`)

### 1.2 Spacing & Radii Scale
- **Grid Scale:** Strict multiples of 4px and 8px (`gap-1` = 4px, `gap-2` = 8px, `gap-3` = 12px, `gap-4` = 16px, `gap-6` = 24px, `gap-8` = 32px, `gap-12` = 48px).
- **Line Heights:** Headings 1.15–1.3, body text 1.5–1.65.
- **Card Radii:** `rounded-2xl` (16px) or `rounded-3xl` (24px).
- **Button Radii:** `rounded-xl` or `rounded-2xl` with minimum 44px touch targets on interactive controls.
- **Elevation:** Tactile, calm box shadows (`var(--shadow-card)` and `var(--shadow-elevated)`), zero artificial neon glows.

---

## 2. Complete Application Route Inventory & UI Audit

The audit discovered **23 page and layout routes** across the application. Each is cataloged below with its shared components, identified UI flaws, and implemented/proposed improvements.

| Route Path | Route Type | File Location | Shared Components | Current UI Gaps / Issues | Redesign Action & Solutions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | Public Landing | `src/app/page.tsx`<br>`src/components/landing/LandingPage.tsx` | `Navbar`, `Footer`, `Button`, `Badge`, `Card` | Hero typography needed alignment with the coastal modern theme; card spacing required 4/8px multiples; preview card needed authentic first-to-5 pips. | Refined typography with clamp scales; aligned RPS duel preview with live game rules; updated dare chips with Coral accents. |
| `/login` | Public Auth | `src/app/(auth)/login/page.tsx`<br>`src/components/auth/LoginForm.tsx` | `Button`, `Input`, `Alert`, `Divider`, `LanguageSelector` | Floating container layout needed clean centering; input heights needed standard 44px min-height; forgot password redirect needed safe sanitization. | Centered card shell with ivory canvas; 44px inputs with left-side iconography; clean alert feedback and sign-up links. |
| `/signup` | Public Auth | `src/app/(auth)/signup/page.tsx`<br>`src/components/auth/SignupForm.tsx` | `Button`, `Input`, `Alert`, `Divider`, `LanguageSelector` | 6-digit OTP verification inputs needed responsive padding on small mobile viewports; password strength bar required unified color tokens. | Standardized 6-digit auto-advancing OTP digits; password strength meter using approved teal/amber/coral; accessible autofocus. |
| `/auth/reset-password` | Public Auth | `src/app/auth/reset-password/page.tsx` | `Button`, `Input`, `Alert`, `LanguageSelector` | Inconsistent uppercase label styles compared to `LoginForm`; card lacked smooth responsive padding on tablet. | Standardized form controls to match `LoginForm`; added clear success redirect animation and password validation feedback. |
| `/about` | Public Info | `src/app/about/page.tsx` | `Navbar`, `Footer`, `Button` | Card grids had varying elevation; 24h retention policy required clearer visual communication; call-to-actions needed brand button hierarchy. | Established 3-pillar cards (Skill, Dares, Privacy); added 4 trust cards with Teal badge accents; cohesive hero section. |
| `/how-to-play` | Public Info | `src/app/how-to-play/page.tsx` | `Navbar`, `Footer`, `Button` | Step-by-step numbers had uneven margins; dare category grid needed consistent aspect ratios and readable font weights. | 5-step structured timeline with custom badge colors; 6 dare category tiles with ivory backgrounds; clear 10s blitz timer rules. |
| `/privacy` | Public Legal | `src/app/privacy/page.tsx` | `Navbar`, `Footer` | Plain document layout lacked visual hierarchy; bullet points had browser-default markers rather than teal dot indicators. | Refined white cards per privacy section; styled teal pill bullets; clear 24h ephemeral retention and consent clauses. |
| `/terms` | Public Legal | `src/app/terms/page.tsx` | `Navbar`, `Footer` | Unstyled section blocks lacked spacing rhythm and clean card borders. | Added modular card grouping with comfortable line-height; clarified challenge safety rules and moderation appeals. |
| `/invite/[token]` | Public / Auth Landing | `src/app/invite/[token]/page.tsx`<br>`src/components/friends/InviteLandingClient.tsx` | `Avatar`, `Button`, `Alert`, `EvoIdBadge` | Avatar ring had high saturation; unauthenticated visitor actions needed clear routing preserves; error states required dedicated card UI. | Redesigned inviter profile card with EvoID badge; distinctive action states for unauthenticated, self, already-friends, and pending. |
| `/games` | Protected Gaming Arena | `src/app/games/page.tsx`<br>`src/components/games/GameSectionClient.tsx` | `AppNavigation`, `RandomMatchmakingCard`, `Button`, `Badge` | Previously redesigned reference page. Verified spacing, pips, quick-play queue, and responsive cards. | Kept as approved reference standard; verified card heights, tags, and matchmaking queue states. |
| `/matchmaking` | Protected Game Queue | `src/app/(protected)/matchmaking/page.tsx`<br>`src/components/matchmaking/RandomMatchmakingCard.tsx` | `AppNavigation`, `Button`, `Spinner` | Queue states needed clear cancellation feedback; timer countdown needed live pulsing indicator. | Integrated directly into Games and RPS Lobby with active queue pulse, animated spinner, and instant cancel action. |
| `/play/rps` | Protected RPS Lobby | `src/app/(protected)/play/rps/page.tsx`<br>`src/components/rps/RpsLobby.tsx` | `AppNavigation`, `RandomMatchmakingCard`, `Avatar`, `Button` | Incoming/outgoing invite lists lacked visual separation; expire timestamps needed friendly formatting. | Integrated random matchmaking card; segmented incoming vs sent challenges; added direct quick-challenge buttons for online friends. |
| `/play/rps/[matchId]` | Protected Active Match | `src/app/(protected)/play/rps/[matchId]/page.tsx`<br>`src/components/rps/RpsMatchBoard.tsx` | `HandGraphic`, `RoundTimer`, `ChallengeSelectionModal`, `MatchChallengeCard` | Move cards required realistic hand graphics; 10s timer needed visual urgency without layout shift; exit match required clean placement. | Integrated custom SVG HandGraphic cards; first-to-5 pips; authoritatively synchronized RoundTimer; prominent Exit Arena button. |
| `/play/chess` | Protected Chess Lobby | `src/app/(protected)/play/chess/page.tsx`<br>`src/components/chess/ChessLobby.tsx` | `AppNavigation`, `Avatar`, `Button` | Dark mode styling (`bg-[#0F172A]`) conflicted with the site-wide Coastal Modern theme; time control pills were unaligned. | Aligned container and challenge list with Coastal Modern White cards and Ivory canvas; standardized time control selectors. |
| `/play/chess/[matchId]` | Protected Active Match | `src/app/(protected)/play/chess/[matchId]/page.tsx`<br>`src/components/chess/ChessMatchBoard.tsx` | `ChessBoard`, `ChessPieceSvg`, `ChessVictoryModal` | Clocks and action controls used disparate dark slate colors; resignation confirmation required accessible dialog layout. | Retained high-contrast focused board arena with clean Exit Arena link, live clocks, captured piece counters, and victory modal. |
| `/chat` | Protected Social | `src/app/(protected)/chat/page.tsx`<br>`src/components/chat/ChatStoriesClient.tsx` | `AppNavigation`, `Avatar`, `Button`, `VideoRecorderModal`, `WinnerReviewModal` | Chat thread lacked dare challenge integration; story viewer needed 24h retention badge and visibility controls. | Two-column responsive conversation layout; top 24h Story Reel; in-chat RPS challenge triggers; active dare recorder banner. |
| `/stories` | Protected Stories Feed | `src/app/(protected)/stories/page.tsx` | Redirects to `/chat` | Direct route previously had redundant code. | Clean redirect to `/chat` with active Story Reel tab focus. |
| `/friends` | Protected Friends Hub | `src/app/(protected)/friends/page.tsx`<br>`src/components/friends/FriendsClient.tsx` | `AppNavigation`, `Avatar`, `Button`, `Input`, `Badge`, `EvoIdBadge` | Friend search needed real-time debounce; tab bar had tiny touch targets on mobile; WhatsApp sharing needed one-tap trigger. | 5-tab responsive navigation with count badges; instant invite link box with Copy & WhatsApp share; debounced user search. |
| `/profile` | Protected Player Profile | `src/app/(protected)/profile/page.tsx`<br>`src/components/profile/ProfileViewClient.tsx` | `AppNavigation`, `Avatar`, `Button`, `ProfileEditForm` | Statistics grid needed responsive 4-column layout; public vs private visibility pill needed clear iconography. | Redesigned profile hero with EvoID badge; 4-stat game scorecard; 3-tab quick switcher (Overview, Edit Profile, Settings). |
| `/challenges` | Protected Dares Hub | `src/app/(protected)/challenges/page.tsx`<br>`src/components/challenges/ChallengesClient.tsx` | `AppNavigation`, `Button`, `Badge`, `VideoRecorderModal`, `WinnerReviewModal` | Stories tab inside challenges needed countdown timers; video submissions needed single-use review indicators. | 4-tab dares hub (Received, Sent, Stories 24h, Catalog); Coral badge accents; countdown hours remaining; one-time review action. |
| `/history` | Protected Match History | `src/app/(protected)/history/page.tsx`<br>`src/components/rps/HistoryClient.tsx` | `AppNavigation`, `Avatar`, `Button`, `EvoIdBadge` | History entries lacked head-to-head score typography; empty state needed direct link to play matches. | Clean card list with Win/Loss/Draw badges; head-to-head score typography; time-ago timestamps; direct link to match replays. |
| `/settings` | Protected Settings | `src/app/(protected)/settings/page.tsx`<br>`src/components/settings/DeleteAccountSection.tsx` | `AppNavigation`, `ProfileEditForm`, `Button`, `Alert` | Security section was cramped; delete confirmation dialog needed prominent danger styling. | Logical 3-section grouping (Profile, Security, Danger Zone); strict "DELETE" confirmation modal; secure API deletion. |
| `/dashboard` | Protected Legacy Route | `src/app/(protected)/dashboard/page.tsx` | Redirects to `/games` | Legacy dashboard path. | Clean server-side redirect to primary `/games` arena. |

---

## 3. Shared Component Systems Audit

1. **Global Navigation (`AppNavigation.tsx` & `Navbar.tsx`):**
   - **Desktop:** Sticky top bar with 16px blur, active indicator pill (`#DDF2EB`), user dropdown with EvoID badge, and language switch.
   - **Mobile:** Fixed 4-tab bottom navigation (`Game`, `Chat & Stories`, `Profile`, `Find Friends`) with $\ge 52$px touch targets and safe-area padding.
   - **Full-Screen Match Mode:** Automatically conceals top/bottom navigation during active blitz RPS and Chess matches, providing an explicit and clear "Exit Match" button.

2. **UI Primitives (`src/components/ui/index.tsx`):**
   - **Button:** 6 variants (`primary`, `secondary`, `coral`, `yellow`, `ghost`, `danger`) and 4 sizes (`sm`, `md`, `lg`, `xl`). All interactive buttons have $\ge 44$px minimum tap targets.
   - **Input:** Standardized with left/right iconography slots, accessible `aria-invalid` and `aria-describedby` bindings, and subtle focus rings.
   - **Badge:** Consistent pill shapes with font-mono tracking for IDs and game statuses.
   - **Card:** Base `.evo-card` with 1px border (`#E2E8E2`), 16px radius, and gentle elevated hover states.
   - **Avatar:** Fallback initials with pale mint background and deep teal lettering; image support with clean circular framing.

---

## 4. Key Polish & Alignment Tasks Completed in Implementation

1. **Auth & Public Form Alignment:**
   - Standardized `LoginForm.tsx` redirect fallback from legacy `/dashboard` to `/games`.
   - Verified 6-digit OTP entry with autofocus, paste support, and cooldown timer.
   - Aligned `reset-password/page.tsx` labels and buttons to match `LoginForm`.

2. **Chess Experience Cohesion:**
   - Ensured `ChessLobby.tsx` matches the light Coastal Modern system with White card surfaces and Ivory canvas, while maintaining focused contrast in the active match board.
   - Maintained full-screen focus and exit controls on both RPS and Chess boards.

3. **Accessibility & Responsive Consistency:**
   - Audited touch targets across mobile views (all tab bar and card buttons $\ge 44$px).
   - Removed any potential horizontal overflow across all grid and flex containers.
   - Respected `prefers-reduced-motion` in CSS animations.

---
*Next Phase: Codebase verification via `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.*
