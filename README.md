# Y2K Type Lab

**English** · [简体中文](./README.zh-CN.md)

A browser-based WebGL 2 editor for chrome, liquid, and glitch lettering.

![Y2K Type Lab editor showing VHS Chrome with Dot Glitch and Liquid Chrome material studies](./assets/readme/hero.png)

Y2K Type Lab turns short text into shader-driven artwork on a fixed 1600 × 900 canvas. Pick a material, choose a reflection field, tune the surface, then position individual characters directly on the artboard.

The editor is built with plain HTML, CSS, and JavaScript. It runs from static files with no package install, framework, or build step.

## What you can do

- Work with three independent material presets: VHS Chrome, Dot Glitch, and Liquid Chrome.
- Set up short compositions with tracking, line-height, and multiline controls.
- Move, rotate, and scale individual characters without breaking the material effect.
- Light VHS Chrome and Liquid Chrome with five bundled reflection fields or a custom image URL.
- Tune depth, highlights, distortion, glow, outlines, dots, scanlines, and other material-specific controls.
- Inspect the Semantic ID buffer and eight intermediate material maps while adjusting a design.
- Use the editor in English or Simplified Chinese, on either the full desktop layout or the compact interface.

## Materials

| Preset | Character |
| --- | --- |
| VHS Chrome | Reflective chrome with scanlines, color breakup, depth, and edge glow. |
| Dot Glitch | A dotted Tektur face with layered outlines, perspective depth, and signal distortion. |
| Liquid Chrome | Warped reflections with extrusion, curvature, roughness, and glow controls. |

The bundled reflection fields are Rose Citadel, Ice Citadel, Solar Obsidian, Prism Mercury, and Neon Monsoon. Reflection fields apply to VHS Chrome and Liquid Chrome; Dot Glitch has its own procedural surface.

## The editor

![Actual Y2K Type Lab browser interface with the VHS Chrome preset selected](./assets/readme/app-screenshot.png)

The left panel holds presets and reflection fields. The center is the 1600 × 900 artboard. The inspector on the right contains text, layout, glyph, surface, and effect controls. On smaller screens, the same controls are grouped into Type, Field, Material, and FX tabs.

## Quick start

```bash
git clone https://github.com/sylvanyu-io/y2k-type-lab.git
cd y2k-type-lab
python3 -m http.server 4173
```

Open [http://127.0.0.1:4173/](http://127.0.0.1:4173/) in a current WebGL 2 browser. A local HTTP server is required; opening `index.html` directly is not supported.

## Using the editor

1. Choose a material preset from the left panel.
2. Enter one to three lines of text in **Text & Layout**.
3. Adjust tracking and line height.
4. For VHS Chrome or Liquid Chrome, choose a reflection field or paste an image URL allowed by CORS.
5. Tune the material and FX controls while watching the artboard update.
6. Select a character on the artboard. Drag the character itself to move it; use the magenta and cyan handles to rotate or scale it. The keyboard works too.
7. Switch to **Semantic ID** or open the material-map previews when you need to inspect the render data.

**Reset** restores the current material and view settings. It does not replace the text or clear per-character transforms.

### Keyboard controls

| Keys | Action |
| --- | --- |
| `Page Up` / `Page Down` or `[` / `]` | Select the previous or next character. |
| Arrow keys | Move the selected character by 1 px. |
| `Shift` + arrow keys | Move it by 10 px. |
| `Alt` / `Option` + `←` / `→` | Rotate it by 1°. Add `Shift` for 15°. |
| `Alt` / `Option` + `↑` / `↓` | Scale it by 1%. Add `Shift` for 10%. |
| `Shift` while dragging the rotate handle | Snap rotation to 15° increments. |
| `Escape` | Clear the character selection. |

## How rendering works

```text
Canvas 2D text
    → CPU distance and normal maps
    → glyph metadata
    → WebGL 2 material pass
    → presentation pass
```

Text is first rasterized with Canvas 2D at the canonical 1600 × 900 resolution. A two-dimensional Euclidean distance transform builds a merged signed-distance field for the complete silhouette, together with body-height and shading fields.

Each character also gets its own region of interest. Its normal and shading data are generated separately, then composited in painter order. Overlapping characters therefore keep usable local surface information instead of becoming one inflated shape.

A semantic-ID texture stores the character ID and local rotation axes. A 256 × 2 metadata texture stores each character's center and size. The chrome material path uses both textures to recover glyph-local coordinates, so reflections and VHS signal effects remain aligned after a character is moved, rotated, or scaled. Shape-dependent effects, including Dot Glitch, follow the transformed outline through rebuilt distance fields.

WebGL 2 shades a single full-screen quad from the shape, distance, normal, noise, and reflection-field textures. The result is rendered into a fixed 1600 × 900 framebuffer, then passed through the selected copy, CRT, or dot presentation effect for responsive display.

## Project layout

| Path | Purpose |
| --- | --- |
| `index.html` | Editor markup and script loading. |
| `art-text.css` | Desktop and compact interface styles. |
| `art-text.js` | Canvas processing, WebGL shaders and renderer, controls, and language strings. |
| `art-text-presets.js` | Default state for the three material presets. |
| `art-text-fields.js` | CPU helpers for noise, body-height, and shading-distance fields. |
| `assets/fonts/tektur/` | Local Tektur font files and license. |
| `assets/material-previews/` | Preset thumbnails and source metadata. |
| `assets/reflection-fields/` | Bundled reflection images. |
| `artifacts/` | Reference captures used while comparing reflection projections. |

## Browser requirements

- A current browser with WebGL 2, Canvas 2D, the Font Loading API, Pointer Events, and modern JavaScript support.
- There is no WebGL 1 fallback.
- Dot Glitch uses the bundled Tektur font. VHS Chrome and Liquid Chrome use a system font stack, so their letterforms can vary by platform.
- A custom reflection can use an `http:` or `https:` URL, a PNG/JPEG/WebP/AVIF data URL, or a `blob:` URL. Remote servers must allow cross-origin image access; images larger than 8,192 px on either axis or 32 megapixels are rejected.

## Current limitations

- The render surface is fixed at 1600 × 900. The interface is responsive, but the canonical artwork resolution is not configurable.
- Text input is capped at 36 UTF-16 code units. Rendering uses at most three lines and 18 graphemes per line.
- Image export is not enabled yet.
- Material settings and glyph transforms are not saved between sessions; only the interface language persists locally.
- There is no undo history, custom-font import, layer system, or animation timeline.
- Text-surface buffers are generated on the CPU, so rebuilding text costs more than changing shader-only controls.

## License and font

A project-wide code license has not been added yet. The bundled [Tektur font](./assets/fonts/tektur/README.md) is distributed under the [SIL Open Font License](./assets/fonts/tektur/OFL.txt).
