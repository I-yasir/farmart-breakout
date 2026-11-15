# Farmart "Breakout" – guerrilla event animation

The page loads normally. About 2.5 s later cracks spread from the middle of the screen. The page tears open like paper, with peeled flaps and a glowing torn edge. Behind it is a dawn-over-the-farm scene. Fruit, leaves and paper shards fly out toward the visitor, and a 3D event card slams in with an impact flash and shake.

Everything is procedural (canvas + CSS 3D). There are **no images, video or libraries**, so there is nothing external to host or license.

## Files

| File | Purpose |
|---|---|
| `src/farmart-breakout.css` | Card and button styles → **Custom CSS** |
| `src/farmart-breakout.js` | The animation → **Custom JS** |
| `src/footer-config.html` | Event text (title, discount, code, link) → **Custom HTML (Footer)** |
| `preview/preview.html` | Playable preview using the source files (serve over http) |
| `dist/preview-standalone.html` | Same preview as a single file – double-click to open |

## Install (Botble admin)

1. **Admin → Appearance → Custom CSS** – paste all of `farmart-breakout.css`. Save.
2. **Admin → Appearance → Custom JS** – paste all of `farmart-breakout.js` (no `<script>` tags). Save.
3. **Admin → Appearance → Custom HTML → Footer** – paste `footer-config.html` after editing the text. Save.
4. Clear the cache (Admin → Platform → Cache management) and reload the site.

Menu names vary slightly between Botble versions. If a field wants `<script>` tags, wrap the JS in them.

## Editing

- **Event text, code, link, delay:** `footer-config.html` (or the `DEFAULTS` block at the top of the JS).
- **Colours:** card gradients in the CSS (`.fmb-face`); scene colours in `drawVoid()` in the JS.
- **Timing:** the `TL` object at the top of the JS (milliseconds).
- **Fruit and shard counts:** `buildStatic()`.
- **End the event:** empty all three fields.

## Behaviour

- The close button is top-right (44 px touch target), and Esc also closes it. Once closed, it stays hidden for `hideHours` (default 24 h) via localStorage.
- Add `?fmb=1` to any URL to force it to show while testing. Run `FarmartBreakout.play()` in the console to replay it.
- Mobile gets fewer particles and a lower pixel ratio. `prefers-reduced-motion` skips the animation and shows the finished card.
- Page scroll is locked while it's open and restored on close.

## Notes

- Tested in Chromium (desktop and 375 px mobile emulation) with no console errors. I have not tested it on your live Farmart theme. Check that the card's z-index (`2147483000`) sits above any chat widget.
