---
name: mobile-utility-design-system
description: "Trigger: mobile UI, mobile utility design, redesign, anti-ai slop, Apple Maps style. Apply high-fidelity minimal mobile utility design system."
license: Apache-2.0
metadata:
  author: "gentleman-programming"
  version: "1.0"
---

## Activation Contract

Apply this skill whenever designing, modifying, or auditing mobile interfaces in this application, specifically:
- Styling screens, modals, cards, headers, bottom sheets, navigation bars, and inputs.
- Eliminating generic AI-generated aesthetics ("AI slop": unnecessary card-in-card nesting, generic purple/blue gradients, glow effects, thick colored borders, tinted square icon containers, and sparkles icons).
- Ensuring parity between dark mode (pure OLED grays) and light mode (clean neutral whites and zinc grays).

## Hard Rules

- **Palette & Contrast:**
  - Never use blue or slate tinted grays (`#0f172a`, `#1e293b`, `#334155`). Use true neutral zinc/neutral grays.
  - Dark Mode: Background `#000000` (pure black/OLED), surface `#121214`, inputs/subtle surfaces `#1C1C1F`, dividers `#27272A`, main text `#FAFAFA`, muted text `#A1A1AA`.
  - Light Mode: Background `#F4F4F5`, surface `#FFFFFF`, subtle surfaces `#ECECEE`, dividers `#E4E4E7`, main text `#09090B`, muted text `#71717A`.
  - Primary CTA: High-contrast monochrome (Dark CTA on Light mode `#09090B`; Light CTA on Dark mode `#FAFAFA`).
  - Accent Green (`#16A34A` light / `#22C55E` dark): Strictly reserved for semantic financial savings, lowest price indicator, and active refuel triggers.
- **Layout & Structure:**
  - No "card-in-card" nesting. Use flat surfaces with subtle dividers (`1px solid var(--border-color)`).
  - Modals must be bottom sheets on mobile: `rounded-t-3xl`, top drag handle (`w-9 h-1 rounded-full bg-zinc-400/40`), solid non-translucent surface.
  - Tabular Numbers: All prices, distances, and quantities must use `font-variant-numeric: tabular-nums`.
  - Icons: Direct stroke icons only (Lucide). Never place icons inside colored square boxes or rounded badge containers unless it is a functional tap target.
  - Visual Noise: No glow effects (`box-shadow` with colored opacity), no `Sparkles` icon, no decorative badges.
- **Microcopy:**
  - Spanish from Spain, direct and functional: "Selecciona", "Completa", "Controla", "Configura", "No tienes repostajes registrados".

## Decision Gates

| Component | Allowed Pattern | Prohibited Pattern |
|---|---|---|
| Card Lists | Clean flat rows separated by dividers | Nested cards inside cards, thick colored left borders |
| Modals | Bottom sheet with handle indicator | Floating dialogs, translucent glassmorphism |
| CTAs | Monochrome high-contrast or semantic green | Gradient buttons, glowing shadows |
| Numbers | `tabular-nums` monospace alignment | Proportional fluctuating typography |
| Icons | Direct stroke on background | Boxed icons with tinted pastel backgrounds |

## Execution Steps

1. Configure design tokens in `_tokens.scss` with OLED dark mode and neutral light mode values.
2. Refactor layouts to use bottom-sheet drawers with drag handles.
3. Clean lists of nested cards and replace with divider-separated flat item rows.
4. Replace proportional numerical typography with tabular figures.
5. Review microcopy to ensure concise Spanish from Spain.

## Output Contract

- Cohesive Apple Maps / Revolut / Uber style utility interface.
- Complete visual harmony between dark and light themes.
- Zero AI-slop visual artifacts.

## References

- `apps/client/src/styles/_tokens.scss`
- `apps/client/src/styles/main.scss`
