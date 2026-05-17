---
version: alpha
name: ArkScore
description: "Institutional Avalanche credit oracle design system: dark fintech trust, Wavy traceability, and on-chain proof clarity."
colors:
  background: "#07110F"
  foreground: "#F4FBF8"
  panel: "#0D1B18"
  panelRaised: "#11241F"
  panelSoft: "#EAF5F0"
  muted: "#D8E7E0"
  mutedForeground: "#7F9990"
  border: "#224239"
  borderStrong: "#365E52"
  primary: "#2DE2A6"
  primaryDeep: "#0F766E"
  primarySoft: "#B9FCE5"
  avalanche: "#E84142"
  avalancheDeep: "#A51C24"
  wavy: "#7C3AED"
  bank: "#60A5FA"
  gold: "#F5B84B"
  success: "#22C55E"
  warning: "#F59E0B"
  danger: "#EF4444"
  white: "#FFFFFF"
  black: "#020807"
typography:
  display:
    fontFamily: Geist
    fontSize: 4.5rem
    fontWeight: 650
    lineHeight: 0.94
    letterSpacing: "-0.07em"
  h1:
    fontFamily: Geist
    fontSize: 3.5rem
    fontWeight: 650
    lineHeight: 1
    letterSpacing: "-0.055em"
  h2:
    fontFamily: Geist
    fontSize: 2rem
    fontWeight: 620
    lineHeight: 1.1
    letterSpacing: "-0.035em"
  h3:
    fontFamily: Geist
    fontSize: 1.125rem
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  body:
    fontFamily: Geist
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "-0.01em"
  body-sm:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "-0.005em"
  label:
    fontFamily: Geist Mono
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.08em"
  mono:
    fontFamily: Geist Mono
    fontSize: 0.8125rem
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "-0.015em"
rounded:
  xs: 6px
  sm: 10px
  md: 14px
  lg: 22px
  xl: 32px
  full: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 72px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.black}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: 14px
  button-primary-hover:
    backgroundColor: "{colors.primarySoft}"
    textColor: "{colors.black}"
  button-secondary:
    backgroundColor: "{colors.panelRaised}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: 14px
  card-dark:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: 24px
  card-light:
    backgroundColor: "{colors.panelSoft}"
    textColor: "{colors.black}"
    rounded: "{rounded.lg}"
    padding: 24px
  badge-live:
    backgroundColor: "{colors.primarySoft}"
    textColor: "{colors.black}"
    rounded: "{rounded.full}"
    padding: 8px
  badge-avalanche:
    backgroundColor: "{colors.avalancheDeep}"
    textColor: "{colors.white}"
    rounded: "{rounded.full}"
    padding: 8px
  input-default:
    backgroundColor: "{colors.panelRaised}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: 14px
---

## Overview

ArkScore should feel like an institutional fintech terminal, not a generic hackathon dashboard. The visual language combines Avalanche energy, bank-grade trust, and cryptographic proof. The interface must make three things immediately legible: the institution workflow, the Wavy risk signal, and the Avalanche on-chain evidence.

The target aesthetic is dark, premium, and precise: deep green-black surfaces, luminous mint proof accents, sharp red Avalanche moments, and dense but readable data cards. Use glassy panels and subtle grid/radial backgrounds sparingly to suggest networks and audit trails without turning the product into crypto noise.

## Colors

- **Background (#07110F):** Primary canvas. Deep green-black creates contrast and institutional seriousness.
- **Foreground (#F4FBF8):** Main text on dark surfaces.
- **Panel (#0D1B18) and Panel Raised (#11241F):** Layered dashboard cards.
- **Primary (#2DE2A6):** ArkScore proof accent. Use for primary actions, evidence match, live Wavy state, and positive scores.
- **Avalanche (#E84142):** Use sparingly for Avalanche/Fuji badges, chain moments, and calls to on-chain proof.
- **Wavy (#7C3AED):** Risk intelligence/provider accent.
- **Bank (#60A5FA):** Bankaool/institutional finance accent.
- **Gold (#F5B84B):** Review/warning state and score thresholds.

Avoid large fields of bright red or purple. The page should be predominantly dark neutral with mint highlights and small red Avalanche anchors.

## Typography

Use Geist for product UI and Geist Mono for hashes, chain ids, score labels, and proof metadata. Headlines should be tight and editorial with negative tracking. Data should be compact but never tiny enough to make hashes or scores feel decorative.

- Display/H1: large, tight, confident, used for the hero value proposition.
- Labels: uppercase mono for chain, provider, and audit metadata.
- Body: calm, readable, and direct. Avoid marketing fluff; judges should understand the product in one scan.
- Hashes: mono, truncatable, copy-friendly, and visually separated from prose.

## Layout

Use a hero-first landing/dashboard hybrid:

1. Hero: left-aligned value proposition; right-side live proof card with risk, score, decision, and evidence hash preview.
2. Criteria strip: three to five cards mapping directly to hackathon judging criteria.
3. Product workflow: Wallet → Wavy risk → ArkScore decision → Fuji registry.
4. Interactive dashboard: existing score intake and on-chain readback.
5. Evidence/footer: repo, OpenAPI, contract, proof transaction.

Spacing should be generous around sections and tighter inside proof cards. Use `max-width: 1280px`, responsive two-column grids, and sticky/visible primary actions where possible.

## Elevation & Depth

Depth comes from borders, gradients, and inner highlights rather than heavy shadows. Recommended effects:

- `box-shadow: 0 24px 80px rgba(45, 226, 166, 0.10)` for hero proof cards.
- `border: 1px solid rgba(185, 252, 229, 0.12)` for dark cards.
- Radial mint glow behind the hero and faint red glow behind Avalanche badges.
- Subtle grid background at 5-8% opacity.

Avoid opaque drop shadows that make the product feel like a generic SaaS template.

## Shapes

Cards use large radii (`22px` or `32px`) to feel modern and polished. Buttons and badges use full pills. Inputs use medium radii and strong focus rings in mint. Keep contract/evidence mini-cards rectangular enough to feel technical.

## Components

- **Primary button:** Mint pill with black text. Use only for scoring or submission actions.
- **Secondary button:** Raised dark pill for institution toggles and links.
- **Proof card:** Dark raised panel with top mono label, large score number, supporting metadata rows, and evidence hash.
- **Criteria card:** Alternating dark/light cards. Each card should name the evaluation criterion explicitly.
- **Badge:** Small pill with direct status text: `Live Wavy Node`, `Fuji`, `Evidence match`, `Built during hackathon`.
- **Input:** Dark raised input with mono wallet text and strong mint focus ring.
- **Metric:** Large number, small mono label, and one-line explanation.

## Do's and Don'ts

Do:

- Lead with the actual institutional value proposition.
- Make Avalanche/Fuji and Wavy Node visible above the fold.
- Show hashes and evidence as proof, not decoration.
- Use clear status labels for live vs mock/fallback modes.
- Keep the page judge-friendly: every section should map to a criterion or demo step.

Don't:

- Overuse crypto gradients, token imagery, or vague Web3 language.
- Hide the contract proof below the fold without a visible link.
- Put long paragraphs inside cards that should be scannable.
- Use low-contrast gray text on dark surfaces.
- Let raw wallet addresses dominate; emphasize privacy-preserving subject hashes and evidence hashes.
