# ADR-001: Mobile Design System Implementation

- **Status:** Accepted
- **Date:** 2025-11-06

## Context

GreenBro mobile clients must deliver a cohesive, brand-locked experience on iOS and Android. We are using React Native with Expo (TypeScript) to share business logic across platforms while maintaining platform idioms (large titles, back swipe, Android medium titles). The brand mandates primary `#39B54A`, neutral `#414042`, and on-primary `#FFFFFF`, native system fonts, and full accessibility.

## Options

1. **Custom tokens + lightweight component kit (Chosen)**  
   Build JSON tokens, a theme provider, and a small suite of GB components to enforce brand control.
2. **Adopt third-party UI kit (e.g., NativeBase, Paper)**  
   Faster bootstrap but conflicts with strict color/typography constraints and increases bundle size.
3. **Reuse web-styled RN components**  
   Share design language with the web dashboard but risks breaking native idioms and adds CSS-in-JS overhead.

## Decision

Adopt option 1. Maintain shared tokens (`shared/theme/greenbro.tokens.json`) and expose a `GBThemeProvider` plus minimal component kit. Keep dependencies lean and align with Prompt Bible guidance for reusable architecture and tests.

## Consequences

- **Positive**
  - Total control over brand colors, motion, and spacings.
  - Lean bundle size and faster runtime compared to third-party kits.
  - Clear path to extend tokens to web/frontend using the shared JSON.
- **Negative**
  - Requires ongoing maintenance and documentation of custom components.
  - Feature velocity depends on internal bandwidth (no drop-in widgets).
  - Must implement our own visual regression checks for theming drift.

## Related Decisions

- ADR-002 (pending): Navigation architecture using React Navigation stack + tabs.
- ADR-003 (pending): Icon and illustration strategy using `react-native-svg`.
