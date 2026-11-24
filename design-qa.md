# Stoic Widgets web funnel design QA

final result: passed

## Scope

- Branch: `codex/web-funnel-onboarding-polish`
- Funnel: all 22 existing screens, result, and paywall
- Source of truth: the existing funnel contract, app-owned WidgetApp assets and onboarding captures, the user-supplied study outcomes, and observed Letterly hierarchy and interaction behavior
- Guardrails: existing storage key, screen order, analytics event names, email capture, checkout API behavior, and backend subscription behavior remain unchanged

## Letterly reference truth

The current public Letterly Android onboarding was recorded and reviewed at the same time as this implementation:

- Current-flow recording: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f657d-bcb5-7a33-8f09-f9cf3efe82a4/web-funnel-letterly-v3/source/letterly-android-onboarding-current.mp4`
- Current-flow contact sheet: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f657d-bcb5-7a33-8f09-f9cf3efe82a4/web-funnel-letterly-v3/source/letterly-android-onboarding-current-contact.png`
- Current question screen: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f657d-bcb5-7a33-8f09-f9cf3efe82a4/web-funnel-letterly-v3/source/letterly-android-onboarding-02.png`
- Official homepage proof card: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f657d-bcb5-7a33-8f09-f9cf3efe82a4/web-funnel-letterly-v3/source/letterly-stat-card-mobile-390x844.png`

The current public Letterly flow does not contain a graph or a percentage-based plan loader. The Stoic Widgets graph and loader are therefore original adaptations grounded in Letterly's observed hierarchy: one bold sans-serif family, one dominant fact, stable option geometry, localized selected states, restrained entrance motion, and one clear CTA. They are not represented as exact Letterly clones.

## Implementation evidence

Settled 390 × 844 captures:

- Study graph: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f657d-bcb5-7a33-8f09-f9cf3efe82a4/web-funnel-letterly-v3/implementation/study-graph-390x844-final.png`
- Widget picker: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f657d-bcb5-7a33-8f09-f9cf3efe82a4/web-funnel-letterly-v3/implementation/widget-picker-390x844-v2.png`
- Retro Memento Mori: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f657d-bcb5-7a33-8f09-f9cf3efe82a4/web-funnel-letterly-v3/implementation/widget-retro-390x844-v2.png`
- Four-font picker: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f657d-bcb5-7a33-8f09-f9cf3efe82a4/web-funnel-letterly-v3/implementation/font-picker-390x844.png`
- Loading composition: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f657d-bcb5-7a33-8f09-f9cf3efe82a4/web-funnel-letterly-v3/implementation/loading-390x844-v2.png`
- App-native Home Screen: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f6637-85c3-7600-9d16-7a81734e6a55/four-screen-redesign/web-step13-home.png`
- Accurate two-point graph: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f6637-85c3-7600-9d16-7a81734e6a55/four-screen-redesign/web-step17-graph.png`
- Aurelius ratings composition: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f6637-85c3-7600-9d16-7a81734e6a55/four-screen-redesign/web-step18-rating.png`
- Three loading stages: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f6637-85c3-7600-9d16-7a81734e6a55/four-screen-redesign/web-step19-stage1.png`, `web-step19-stage2.png`, and `web-step19-stage3.png`
- Letterly-language graph refinement: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f6637-85c3-7600-9d16-7a81734e6a55/graph-letterly-refresh/graph-390x844.png`

Full-view source/implementation comparisons:

- Letterly proof card beside the study graph: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f657d-bcb5-7a33-8f09-f9cf3efe82a4/web-funnel-letterly-v3/comparison/letterly-proof-vs-study-graph-final.png`
- Letterly question state beside the widget picker: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f657d-bcb5-7a33-8f09-f9cf3efe82a4/web-funnel-letterly-v3/comparison/letterly-question-vs-widget-picker-v2.png`
- Mobile onboarding beside the new Home Screen: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f6637-85c3-7600-9d16-7a81734e6a55/four-screen-redesign/compare-home.png`
- Mobile onboarding beside the new ratings composition: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f6637-85c3-7600-9d16-7a81734e6a55/four-screen-redesign/compare-rating.png`
- Mobile loading source beside the new sequential loader: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f6637-85c3-7600-9d16-7a81734e6a55/four-screen-redesign/compare-loading.png`
- Letterly curved-connector language beside the refined Stoic graph: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f6637-85c3-7600-9d16-7a81734e6a55/graph-letterly-refresh/letterly-language-vs-stoic-graph.png`

Focused crops were not required: the relevant headline, selected state, content card, and CTA all fit in each full-height 390 × 844 comparison.

## Visual evaluation

- Typography: funnel UI now uses one Hanken Grotesk hierarchy. Serif, handwritten, and typewriter faces appear only inside intentional widget/font specimens. The prior serif-heading/sans-subtitle split is gone. Remote fonts use optional display behavior to avoid a late layout-changing swap, and upcoming widget fonts are prewarmed before the picker.
- Color: cream screens and black personalization screens keep the established Stoic Widgets palette. Each screen uses one selected surface and gold as the single dark-mode accent.
- Spacing: content and CTA remain in normal flow. Short screens scroll naturally; tall screens settle the CTA near the bottom. Header slots are fixed, so the centered brand does not move when Back appears.
- Images: benefit screens use app-owned artwork with reserved dimensions. Step 13 now ports the app's Home Screen composition with the selected theme as wallpaper and the selected live widget inside the phone. Step 18 uses optimized transparent exports from the app-owned Aurelius and star/laurel masters. Lazy loading is used for offscreen theme images while live previews are eager.
- Copy: every screen now follows an eyebrow → title → content hierarchy with no repeated header subtitle. Necessary guidance lives beside the relevant control or disclosure instead: the widget carousel says choices can be added or switched, study methodology stays in the evidence card, and email/billing requirements remain near their forms.
- Motion: navigation gets one restrained opacity fade that never changes geometry. Same-screen selection updates do not remount the screen, replay the entrance, reset scroll, pulse previously selected cards, or shrink the live preview. Theme bundles keep all panel nodes stable and only change visibility. The study line draws once. The loader fills three independent bars for 3.2 seconds each, holds for 0.4 seconds, then advances at 10 seconds. Reduced motion preserves the same stage sequence with discrete boundaries.

## Study-claim integrity

- Exposure graph: `Without a widget — 1×` versus `With Stoic Widgets — 15×`, with a true 1:15 bar ratio and an accessible text alternative.
- Claim wording: participants `encountered` 15× more Stoic quotes, stories, and philosophy. It does not claim retained learning.
- Mindfulness: `+35%` is labeled self-reported.
- The mindfulness graph plots only the supplied indices `100` and `135` on a zero-based scale, with no interpolated or invented observations.
- Its visible path is a presentation-only cubic Bézier curve inspired by Letterly's soft connector language; the accessible series and the only two represented observations remain `100` and `135`.
- Distraction: remains qualitative because no percentage was supplied.
- Both modules disclose `Based on a Stoic Widgets user study.` No sample size, study date, methodology, or additional statistic was invented.

## Responsive and behavior matrix

| Engine | Viewports | Assertions |
| --- | --- | --- |
| Chromium | 320×568, 375×667, 390×844, 393×852, 430×932, 360×640, 360×800, 412×915 | No horizontal overflow, clipped header, CTA/content intersection, or obscured final option across key states |
| WebKit | 320×568, 375×667, 390×844, 393×852, 430×932, 360×640, 360×800, 412×915 | Same iOS-Safari-engine layout assertions |

Behavior coverage includes all 22 screens, single and multi-select rules, back navigation, refresh persistence, stable same-screen DOM identity, theme tabs, all five widget renderers, four font updates, loading completion/cancellation, reduced motion, email validation and API recovery, plan switching, checkout errors, keyboard-native controls, legacy state migration, and unchanged analytics event names.

The final app-native matrix also captures steps 13, 17, 18, and 19 at 320×568, 390×844, and 430×932 in both engines. The 390×844 run includes all three loading stages. Contact sheets are stored at:

- `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f6637-85c3-7600-9d16-7a81734e6a55/four-screen-redesign/chromium-390-contact.png`
- `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f6637-85c3-7600-9d16-7a81734e6a55/four-screen-redesign/webkit-390-contact.png`
- `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f6637-85c3-7600-9d16-7a81734e6a55/four-screen-redesign/chromium-430-contact.png`
- `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f6637-85c3-7600-9d16-7a81734e6a55/four-screen-redesign/webkit-430-contact.png`

## Resolved findings

- P1: option/widget/theme/font/plan selections rebuilt or force-refreshed parts of the screen, causing flicker, position changes, duplicate view events, lost focus, image decoding, and carousel resets. Those interactions now patch only attributes/styles; theme panels remain mounted and selections do not trigger scale/fade replays.
- P1: transformed screen containers changed the containing block for the CTA and allowed options to slide underneath it. Motion is now limited to heading/content layers and the action area remains in normal flow.
- P1: graph and proof screens previously used weak phone imagery or illustrative glance counts. They now use only the supplied 15× and +35% outcomes with disclosure.
- P2: the widget picker implied a permanent single choice. Its title, subtitle, swipe note, and CTA now describe a starting point that can be changed or expanded in the app.
- P2: nine font choices created a noisy screen. The visible set is now four stark native categories: Classic, Clean, Typewriter, and Handwritten. Legacy values migrate to the closest category without changing the storage key.
- P2: fixed-style widgets misleadingly displayed selected quote-theme metadata as though it changed their native renderer. Theme, preview, font, and result copy now distinguish the starting widget from quote-widget personalization.
- P2: Retro Memento Mori was visually unlike the iOS widget. It now uses the app-owned Space Mono files, native geometry, 25-segment rows, live interval calculations, correct classic palette, and restrained 1px glow.
- P2: loading had multiple competing signals and premature `Ready` labels. It now exposes exactly three independent, sequential 3.2-second bars, a 400ms completed hold, stage-only live-region announcements, reduced-motion boundaries, and cancellation on Back.

## Final checks and evidence limits

- `npm test`: 17 passed, 0 failed.
- No P0, P1, or P2 findings remain in the tested states.
- Browser console error check: no application errors in the final local preview.
- Physical iPhone Safari and Android Chrome were not controlled; Playwright WebKit and Chromium provide engine-level coverage at the requested dimensions.
- The app-native redesign was checked directly against the existing mobile onboarding captures for the Home Screen, Aurelius ratings, and loading compositions. No mobile source was changed.
- The study outcomes came from the user and were not independently verified in this pass.
- External Razorpay completion was intentionally not exercised; tests stubbed external endpoints while existing checkout helpers remained covered.

## Opening, Phone Preview, and Loading Percentage QA

### Evidence

- User-reported phone issue: `/var/folders/t4/lt542snd2xn7kcsv7x1nkh0h0000gn/T/codex-clipboard-f1633c76-8268-40c5-a3f5-b8d467efd8fc.png`
- Letterly visual-language source: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f657d-bcb5-7a33-8f09-f9cf3efe82a4/web-funnel-letterly-v3/source/letterly-android-onboarding-01.png`
- Earlier plan-builder source: `/var/folders/t4/lt542snd2xn7kcsv7x1nkh0h0000gn/T/codex-clipboard-2db35938-5c0f-42a2-871a-0e6c6989be67.png`
- Implementation captures at 390×844: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f6637-85c3-7600-9d16-7a81734e6a55/funnel-intro-phone-loading/intro-390x844.png`, `phone-preview-390x844.png`, and `loading-stage2-390x844.png`
- Full comparison inputs: `/Users/aaryangusain/.codex/visualizations/2026/07/15/019f6637-85c3-7600-9d16-7a81734e6a55/funnel-intro-phone-loading/compare-letterly-intro.png`, `compare-phone-before-after.png`, and `compare-loading-before-after.png`
- States: fresh-session intro, step 13 Retro Memento Mori with White Marble, and step 19 while the second bar is loading

### Findings

No actionable P0, P1, or P2 findings remain.

- Fonts and typography: the intro inherits the established Hanken Grotesk hierarchy, with Letterly's direct, oversized promise structure translated into Stoic Widgets copy. Loading percentages use tabular figures so their width remains stable.
- Spacing and layout rhythm: the phone widget, icon row, Search pill, and dock now fit inside the fixed frame. All four top-row icons share equal dimensions and center spacing; the full dock clears the bottom mask.
- Colors and tokens: the intro uses the existing paper, ink, brown, and gold tokens. Phone and loading surfaces preserve the established dark palette.
- Image quality and asset fidelity: all eight app icons and the app mark remain the existing raster assets. No product UI or icons were generated or redrawn.
- Copy and content: the intro promise is Stoic-specific and remains outside the numbered journey. Step 1 still displays `1 / 22`; all 22 existing screens and their copy remain intact.
- Motion and accessibility: the intro auto-continues after 2.6 seconds, uses a real progress affordance, records view and completion analytics, and shortens under reduced motion. The three plan bars retain their 3.2-second sequence and 0.4-second hold while updating their own visible percentages with frame-synced transforms. Live-region announcements remain stage-based rather than reading every percentage.
- Responsiveness and runtime: Chromium and WebKit pass the existing mobile matrix from 320×568 through 430×932. Browser console checks returned no application errors.

### Comparison History

- Earlier P1: the app icons and dock overflowed the phone's bottom mask. The widget and icon geometry were rebalanced and the dock now remains fully visible.
- Earlier P2: the funnel began abruptly at step 1. A short Letterly-inspired promise screen now establishes the benefit and transitions into the unchanged journey.
- Earlier P2: the plan builder communicated only `Working`, `Waiting`, and `Ready`. Each bar now exposes a stable live percentage while future bars remain at 0% and completed bars remain at 100%.
- Post-fix result: 17 automated tests pass with 0 failures, including the fresh intro, exact phone-chrome fit, sequential loading, reduced motion, cancellation, and both responsive engines.

final result: passed
