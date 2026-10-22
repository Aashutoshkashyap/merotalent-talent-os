# MeroTalent brand and UI system

Canonical spelling: **MeroTalent**. The existing orange people/connection mark in
`public/logo.png` is official and retained unchanged. `src/lib/brand.ts` owns the
default name, mark path, title, canonical origin and browser theme color. CMS
overrides remain legitimate display configuration, not a second brand.

## Tokens and components

- `src/index.css` owns semantic HSL colors, surfaces, success/warning/error,
  border, focus ring and dark-mode variables. `tailwind.config.ts` exposes them.
- Preserve existing deep-orange brand primary, navy action controls, white/slate
  surfaces and existing blue discovery accent. Use semantic tokens before adding
  more hex values. Do not recolor the logo or invent a replacement palette.
- Inter is body/UI; Outfit is display, loaded through existing `next/font`.
  Global root type remains 16px; `text-xs` is 14px and `text-sm` is 16px. Do not
  shrink the whole page to make a badge fit.
- `components/ui` is the sole shared primitive library (Radix + Tailwind/CVA).
  Buttons, inputs, dialogs, cards, tables, badges and notifications should reuse
  it; domain fields and public/admin shells retain functional differences.
- Badge labels wrap within available width. Icons do not shrink; controls have
  accessible names, keyboard focus and disabled/error states. Never encode
  payment/approval state through color alone.
- Use existing spacing scale, radius tokens and responsive shell breakpoints.
  Sticky/fixed headers must not obscure content or focus targets. Dialogs scroll
  internally on small screens; avoid forced page-width tables.
- Loading/error/empty/unavailable are distinct states. No fake success, placeholder
  contact data, fabricated ratings or falsely verified/payed badges.

## Metadata and assets

Root title/OG identity, Navbar, HeaderNav and Footer share the canonical brand
constants; AuthShell, onboarding, AdminSidebar and DashboardSidebar reuse the
official mark through `components/brand/BrandMark.tsx` instead of a sparkle logo.
Favicon metadata points to the real mark. Public record metadata
still comes from known visible records. Transactional templates must use the
same spelling and configured sender; do not alter provider-owned Auth templates
without separately verifying the control-plane configuration.

## Remaining standardization

Many public/admin pages still have explicit slate/navy/blue/orange styles. Their
full conversion and dark-theme acceptance are not complete. Make scoped changes
with visual/keyboard tests; do not run an unreviewed global color replacement.
Authenticated College manual-grant labels distinguish approved listing, paid
verification and access entitlement—those concepts must not collapse into one badge.
