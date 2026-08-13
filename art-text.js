(() => {
  "use strict";

  const TEXTURE_WIDTH = 1600;
  const TEXTURE_HEIGHT = 900;
  const SDF_SPREAD = 72;
  const SHADING_SDF_SPREAD = 24;
  const BODY_INFLATE = 3.5;
  const FACE_CURVE_REFERENCE_CROWN = 16;
  // BODY and FACE are independent height sources. Give each its own slope
  // budget so one control cannot consume or amplify the other's response.
  const BODY_MAX_SLOPE = 0.45;
  const FACE_MAX_SLOPE = 0.30;
  const INF = 1e20;
  const DISPLAY_FONT = '"Arial Rounded MT Bold", "Yuanti SC", "Hiragino Maru Gothic ProN", "Avenir Next", "PingFang SC", sans-serif';
  const DOT_DISPLAY_FONT = '"Arial Black", "Impact", "Arial Narrow Bold", "PingFang SC", sans-serif';
  const DEBUG_SURFACE = new URLSearchParams(window.location.search).get("debug") || "";
  const {
    createArtworkBodyHeight,
    createArtworkShadingDistance,
    createNoiseField,
  } = window.ArtTextFields;
  const {
    defaultKey: DEFAULT_PRESET_KEY,
    order: PRESET_ORDER,
    byKey: PRESETS,
  } = window.ArtTextPresets;
  const REFLECTION_STYLES = Object.freeze({
    rose: "ROSE CITADEL",
    arctic: "ICE CITADEL",
    sunset: "SOLAR OBSIDIAN",
    prism: "PRISM MERCURY",
    neon: "NEON MONSOON",
    custom: "CUSTOM URL",
  });
  const REFLECTION_SOURCES = Object.freeze({
    rose: "./assets/reflection-fields/rose-citadel.webp?v=2",
    arctic: "./assets/reflection-fields/ice-citadel.webp?v=3",
    sunset: "./assets/reflection-fields/solar-obsidian.webp?v=3",
    prism: "./assets/reflection-fields/prism-spectrum-balanced.webp?v=1",
    neon: "./assets/reflection-fields/neon-monsoon.webp?v=2",
  });
  const PRESET_SETTING_KEYS = Object.freeze([...new Set(
    PRESET_ORDER.flatMap((key) => Object.keys(PRESETS[key].settings)),
  )]);
  const settingsByPreset = Object.fromEntries(PRESET_ORDER.map((key) => [
    key,
    { ...PRESETS[key].settings },
  ]));

  const DEFAULTS = Object.freeze({
    text: "Y2K\nCHROME",
    tracking: 4,
    lineHeight: 0.88,
    activePreset: DEFAULT_PRESET_KEY,
    ...PRESETS[DEFAULT_PRESET_KEY].settings,
  });
  const ui = {
    canvas: document.querySelector("#artCanvas"),
    gpuStatus: document.querySelector("#gpuStatus"),
    renderError: document.querySelector("#renderError"),
    renderStatus: document.querySelector("#renderStatus"),
    buildTime: document.querySelector("#buildTime"),
    glyphReadout: document.querySelector("#glyphReadout"),
    inspectorMaterialName: document.querySelector("#inspectorMaterialName"),
    materialAnnouncement: document.querySelector("#materialAnnouncement"),
    presetCards: [...document.querySelectorAll("[data-material-preset]")],
    reflectionStyleCards: [...document.querySelectorAll("[data-reflection-style]")],
    generatedAssetCanvases: new Map(
      [...document.querySelectorAll("canvas[data-generated-asset]")]
        .map((canvas) => [canvas.dataset.generatedAsset, canvas]),
    ),
    materialSpecificControls: [...document.querySelectorAll("[data-materials]")],
    resetButton: document.querySelector("#resetButton"),
    materialViewButton: document.querySelector("#materialViewButton"),
    idViewButton: document.querySelector("#idViewButton"),
    textInput: document.querySelector("#textInput"),
    trackingInput: document.querySelector("#trackingInput"),
    trackingValue: document.querySelector("#trackingValue"),
    lineHeightInput: document.querySelector("#lineHeightInput"),
    lineHeightValue: document.querySelector("#lineHeightValue"),
    edgeWidthInput: document.querySelector("#edgeWidthInput"),
    edgeWidthValue: document.querySelector("#edgeWidthValue"),
    bodyCrownInput: document.querySelector("#bodyCrownInput"),
    bodyCrownValue: document.querySelector("#bodyCrownValue"),
    faceCurveInput: document.querySelector("#faceCurveInput"),
    faceCurveValue: document.querySelector("#faceCurveValue"),
    reflectionInput: document.querySelector("#reflectionInput"),
    reflectionValue: document.querySelector("#reflectionValue"),
    colorFieldInput: document.querySelector("#colorFieldInput"),
    colorFieldValue: document.querySelector("#colorFieldValue"),
    roughnessInput: document.querySelector("#roughnessInput"),
    roughnessValue: document.querySelector("#roughnessValue"),
    baseColorInput: document.querySelector("#baseColorInput"),
    envCoverageInput: document.querySelector("#envCoverageInput"),
    envCoverageValue: document.querySelector("#envCoverageValue"),
    reflectionStyleSelect: document.querySelector("#reflectionStyleSelect"),
    customReflectionUrlInput: document.querySelector("#customReflectionUrlInput"),
    applyReflectionUrlButton: document.querySelector("#applyReflectionUrlButton"),
    customReflectionStatus: document.querySelector("#customReflectionStatus"),
    reflectionOffsetXInput: document.querySelector("#reflectionOffsetXInput"),
    reflectionOffsetXValue: document.querySelector("#reflectionOffsetXValue"),
    reflectionOffsetYInput: document.querySelector("#reflectionOffsetYInput"),
    reflectionOffsetYValue: document.querySelector("#reflectionOffsetYValue"),
    liquidWarpInput: document.querySelector("#liquidWarpInput"),
    liquidWarpValue: document.querySelector("#liquidWarpValue"),
    dotPitchInput: document.querySelector("#dotPitchInput"),
    dotPitchValue: document.querySelector("#dotPitchValue"),
    dotOutlineLayersInput: document.querySelector("#dotOutlineLayersInput"),
    dotOutlineLayersValue: document.querySelector("#dotOutlineLayersValue"),
    perspectiveAngleInput: document.querySelector("#perspectiveAngleInput"),
    perspectiveAngleValue: document.querySelector("#perspectiveAngleValue"),
    glitchStrengthInput: document.querySelector("#glitchStrengthInput"),
    glitchStrengthValue: document.querySelector("#glitchStrengthValue"),
    vhsScanlineSpacingInput: document.querySelector("#vhsScanlineSpacingInput"),
    vhsScanlineSpacingValue: document.querySelector("#vhsScanlineSpacingValue"),
    vhsScanlineStrengthInput: document.querySelector("#vhsScanlineStrengthInput"),
    vhsScanlineStrengthValue: document.querySelector("#vhsScanlineStrengthValue"),
    extrusionInput: document.querySelector("#extrusionInput"),
    extrusionValue: document.querySelector("#extrusionValue"),
    glowInput: document.querySelector("#glowInput"),
    glowValue: document.querySelector("#glowValue"),
    sceneDetailInput: document.querySelector("#sceneDetailInput"),
    sceneDetailValue: document.querySelector("#sceneDetailValue"),
    cyanInput: document.querySelector("#cyanInput"),
    pinkInput: document.querySelector("#pinkInput"),
  };

  const state = {
    ...DEFAULTS,
    debugId: false,
    glyphs: [],
    artworkBounds: [0.5, 0.5, 0.90, 0.78],
  };

  function activePreset() {
    return PRESETS[state.activePreset] || PRESETS[DEFAULT_PRESET_KEY];
  }

  function activeDisplayFont() {
    return activePreset().mode === 1 ? DOT_DISPLAY_FONT : DISPLAY_FONT;
  }

  function syncPresetSelection() {
    const preset = activePreset();
    document.documentElement.dataset.material = preset.key;
    ui.inspectorMaterialName.textContent = preset.label;
    ui.canvas.setAttribute("aria-label", preset.ariaLabel);
    ui.presetCards.forEach((card) => {
      const isActive = card.dataset.materialPreset === preset.key;
      card.classList.toggle("is-active", isActive);
      card.setAttribute("aria-pressed", String(isActive));
    });
    ui.materialSpecificControls.forEach((control) => {
      const visible = control.dataset.materials.split(/\s+/).includes(preset.key);
      control.hidden = !visible;
      control.querySelectorAll("input, button, select, textarea").forEach((element) => {
        element.disabled = !visible;
      });
    });
    syncReflectionSelection();
  }

  function writePresetSetting(key, value) {
    state[key] = value;
    if (settingsByPreset[state.activePreset] && PRESET_SETTING_KEYS.includes(key)) {
      settingsByPreset[state.activePreset][key] = value;
    }
  }

  function selectPreset(key) {
    const preset = PRESETS[key];
    if (!preset) return;
    invalidateReflectionRequest();
    state.activePreset = key;
    Object.assign(state, settingsByPreset[key]);
    syncControls();
    syncPresetSelection();
    ui.materialAnnouncement.textContent = `已应用 ${preset.label}`;
    state.debugId = false;
    ui.materialViewButton.classList.add("is-active");
    ui.idViewButton.classList.remove("is-active");
    applyPresetBake();
    if (preset.mode !== 1) loadPresetReflection(key);
  }
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = TEXTURE_WIDTH;
  sourceCanvas.height = TEXTURE_HEIGHT;
  const sourceContext = sourceCanvas.getContext("2d", { alpha: true, willReadFrequently: true });

  const idCanvas = document.createElement("canvas");
  idCanvas.width = TEXTURE_WIDTH;
  idCanvas.height = TEXTURE_HEIGHT;
  const idContext = idCanvas.getContext("2d", { alpha: true, willReadFrequently: true });

  const gl = ui.canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: true,
    premultipliedAlpha: false,
  });

  if (!gl) {
    ui.renderError.hidden = false;
    ui.renderError.textContent = "WEBGL 2 CONTEXT UNAVAILABLE";
    ui.gpuStatus.textContent = "WEBGL 2 UNAVAILABLE";
    return;
  }

  const vertexShaderSource = `#version 300 es
    layout(location = 0) in vec2 aPosition;
    out vec2 vUv;
    void main() {
      vUv = aPosition * 0.5 + 0.5;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const fragmentShaderSource = `#version 300 es
    precision highp float;

    in vec2 vUv;
    layout(location = 0) out vec4 fragColor;
    uniform sampler2D uShapeTexture;
    uniform sampler2D uDistanceTexture;
    uniform sampler2D uIdTexture;
    uniform sampler2D uGlyphMetadataTexture;
    uniform sampler2D uNoiseTexture;
    uniform sampler2D uColorFieldTexture;
    uniform sampler2D uNormalTexture;
    uniform vec2 uTextureSize;
    uniform float uSpread;
    uniform float uEdgeWidth;
    uniform float uReflection;
    uniform float uColorFieldStrength;
    uniform float uRoughness;
    uniform vec3 uBaseColor;
    uniform float uEnvCoverage;
    uniform vec2 uReflectionOffset;
    uniform float uLiquidWarp;
    uniform float uDotPitch;
    uniform float uDotOutlineLayers;
    uniform float uGlitchStrength;
    uniform vec4 uArtworkBounds;
    uniform float uExtrusion;
    uniform float uGlow;
    uniform float uSceneDetail;
    uniform vec3 uCyan;
    uniform vec3 uPink;
    uniform float uDebugId;
    uniform float uMaterialMode;

    float unpackMetadata16(vec2 bytes) {
      vec2 integerBytes = floor(bytes * 255.0 + 0.5);
      return (integerBytes.x * 256.0 + integerBytes.y) / 65535.0;
    }

    vec4 glyphMetadataForId(float id) {
      float idByte = floor(id * 255.0 + 0.5);
      float lookupX = (idByte + 0.5) / 256.0;
      vec4 centerBytes = texture(uGlyphMetadataTexture, vec2(lookupX, 0.25));
      vec4 sizeBytes = texture(uGlyphMetadataTexture, vec2(lookupX, 0.75));
      return vec4(
        unpackMetadata16(centerBytes.rg),
        unpackMetadata16(centerBytes.ba),
        unpackMetadata16(sizeBytes.rg),
        unpackMetadata16(sizeBytes.ba)
      );
    }

    vec2 distanceTap(vec2 uv) {
      vec4 surfaceTexel = texture(uDistanceTexture, uv);
      vec4 distanceBytes = floor(surfaceTexel * 255.0 + 0.5);
      return vec2(
        (distanceBytes.r * 256.0 + distanceBytes.g) / 65535.0,
        (distanceBytes.b * 256.0 + distanceBytes.a) / 65535.0
      );
    }

    vec2 sampleDistancePair16(vec2 uv) {
      vec2 pixel = uv * uTextureSize - 0.5;
      vec2 base = floor(pixel);
      vec2 fraction = fract(pixel);
      vec2 uv00 = (base + vec2(0.5, 0.5)) / uTextureSize;
      vec2 uv10 = (base + vec2(1.5, 0.5)) / uTextureSize;
      vec2 uv01 = (base + vec2(0.5, 1.5)) / uTextureSize;
      vec2 uv11 = (base + vec2(1.5, 1.5)) / uTextureSize;
      return mix(
        mix(distanceTap(uv00), distanceTap(uv10), fraction.x),
        mix(distanceTap(uv01), distanceTap(uv11), fraction.x),
        fraction.y
      );
    }

    vec2 shapeTap(vec2 uv) {
      vec4 packedShape = texture(uShapeTexture, uv);
      vec2 heightBytes = floor(packedShape.rg * 255.0 + 0.5);
      float bodyHeight = (heightBytes.x * 256.0 + heightBytes.y) / 65535.0;
      return vec2(bodyHeight, packedShape.b);
    }

    vec2 sampleShapeData16(vec2 uv) {
      vec2 pixel = uv * uTextureSize - 0.5;
      vec2 base = floor(pixel);
      vec2 fraction = fract(pixel);
      vec2 uv00 = (base + vec2(0.5, 0.5)) / uTextureSize;
      vec2 uv10 = (base + vec2(1.5, 0.5)) / uTextureSize;
      vec2 uv01 = (base + vec2(0.5, 1.5)) / uTextureSize;
      vec2 uv11 = (base + vec2(1.5, 1.5)) / uTextureSize;
      return mix(
        mix(shapeTap(uv00), shapeTap(uv10), fraction.x),
        mix(shapeTap(uv01), shapeTap(uv11), fraction.x),
        fraction.y
      );
    }

    vec3 sampleNormalMap(vec2 uv) {
      vec3 encoded = texture(uNormalTexture, uv).rgb * 2.0 - 1.0;
      // Normal assets use the conventional +Y-up green channel. Material UVs
      // use the canvas-oriented +Y-down space, so convert once after sampling.
      return normalize(vec3(encoded.x, -encoded.y, max(encoded.z, 1.0 / 255.0)));
    }

    float sampleCoverage(vec2 uv) {
      return sampleShapeData16(uv).y;
    }

    float insideTexture(vec2 uv) {
      vec2 minimum = step(vec2(0.0), uv);
      vec2 maximum = step(uv, vec2(1.0));
      return minimum.x * minimum.y * maximum.x * maximum.y;
    }

    float mergedRawDistancePx(vec2 uv) {
      float encoded = sampleDistancePair16(clamp(uv, vec2(0.0), vec2(1.0))).x;
      float distancePx = (encoded * 2.0 - 1.0) * uSpread;
      return mix(-uSpread, distancePx, insideTexture(uv));
    }

    float mergedFillAt(vec2 uv) {
      float distancePx = mergedRawDistancePx(uv) + ${BODY_INFLATE.toFixed(1)};
      float aa = max(1.65, fwidth(distancePx) * 1.35);
      return smoothstep(-aa, aa, distancePx);
    }

    float band(float value, float center, float width) {
      float distanceValue = (value - center) / width;
      return exp(-distanceValue * distanceValue);
    }

    float hash21(vec2 value) {
      return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453);
    }

    vec3 srgbToLinear(vec3 color) {
      return pow(max(color, 0.0), vec3(2.2));
    }

    vec3 linearToSrgb(vec3 color) {
      return pow(max(color, 0.0), vec3(1.0 / 2.2));
    }

    vec3 acesApprox(vec3 color) {
      return clamp(
        (color * (2.51 * color + 0.03)) /
        (color * (2.43 * color + 0.59) + 0.14),
        0.0,
        1.0
      );
    }

    vec3 gradeLiquidChrome(vec3 color) {
      vec3 lumaWeights = vec3(0.2126, 0.7152, 0.0722);
      float luma = dot(color, lumaWeights);
      float midtoneMask = 4.0 * luma * (1.0 - luma);
      float targetLuma = clamp(
        luma + (luma - 0.5) * 0.10 * midtoneMask,
        0.0,
        1.0
      );
      return clamp(targetLuma + (color - luma) * 1.10, 0.0, 1.0);
    }

    vec2 colorFieldUv(vec3 direction) {
      direction = normalize(direction);
      // Half-angle radius is monotonic over the full reflected hemisphere.
      float planarLength = length(direction.xy);
      vec2 orientation = direction.xy / max(planarLength, 0.0001);
      float halfAngleRadius = sqrt(max(0.0, (1.0 - direction.z) * 0.5));
      // A monotonic expansion restores broad face traversal that pure
      // half-angle compresses, without ever returning to reflected.xy.
      float expandedRadius = 1.0 - (1.0 - halfAngleRadius) * (1.0 - halfAngleRadius);
      float projectedRadius = mix(halfAngleRadius, expandedRadius, 0.68);
      return vec2(0.50) + orientation * projectedRadius * 0.48;
    }

    float boundedCoverage(float value, float coverage) {
      float magnitude = abs(value);
      return sign(value) * coverage * magnitude
        / max(1.0 + (coverage - 1.0) * magnitude, 0.0001);
    }

    float softBox(vec2 point, vec2 center, vec2 halfSize, float feather) {
      vec2 delta = abs(point - center);
      delta.x = min(delta.x, 1.0 - delta.x);
      vec2 outside = max(delta - halfSize, 0.0);
      return 1.0 - smoothstep(0.0, feather, length(outside));
    }

    float starBurst(vec2 uv, vec2 center, float size) {
      vec2 point = (uv - center) * vec2(1.7777778, 1.0) / size;
      vec2 absolutePoint = abs(point);
      float core = exp(-dot(point, point) * 16.0);
      float cross = exp(-absolutePoint.x * 52.0 - absolutePoint.y * 0.92)
        + exp(-absolutePoint.y * 52.0 - absolutePoint.x * 0.92);
      vec2 diagonal = abs(vec2(point.x + point.y, point.x - point.y));
      float diagonalRays = exp(-diagonal.x * 28.0 - diagonal.y * 1.55)
        + exp(-diagonal.y * 28.0 - diagonal.x * 1.55);
      return core + cross * 0.62 + diagonalRays * 0.22;
    }

    vec4 metalOrb(vec2 uv, vec2 center, float radius, vec3 tint) {
      vec2 point = (uv - center) * vec2(1.7777778, 1.0) / radius;
      float radial = length(point);
      float mask = 1.0 - smoothstep(0.82, 1.0, radial);
      float dome = sqrt(max(0.0, 1.0 - radial * radial));
      float highlight = exp(-dot(point - vec2(-0.34, -0.42), point - vec2(-0.34, -0.42)) * 18.0);
      float horizon = band(point.y, 0.16, 0.24);
      vec3 color = mix(vec3(0.16, 0.12, 0.24), vec3(0.88, 0.91, 1.0), dome);
      color += tint * horizon * 0.52 + vec3(highlight * 0.84);
      return vec4(color, mask);
    }

    float smoothMax(float a, float b, float radius) {
      float h = clamp(0.5 + 0.5 * (a - b) / radius, 0.0, 1.0);
      return mix(b, a, h) + radius * h * (1.0 - h);
    }

    float edgeAA(float value) {
      return max(2.1, fwidth(value) * 1.35);
    }

    vec3 idPalette(float id) {
      float idByte = floor(id * 255.0 + 0.5);
      float paletteSeed = fract(idByte * 0.6180339);
      return 0.55 + 0.45 * cos(
        6.2831853 * (vec3(0.00, 0.33, 0.67) + paletteSeed)
      );
    }

    vec3 backgroundColor(vec2 uv) {
      vec2 centered = uv - 0.5;
      if (uMaterialMode > 0.5 && uMaterialMode < 1.5) {
        vec3 base = mix(vec3(0.001, 0.004, 0.012), vec3(0.007, 0.001, 0.016), uv.y);
        float cyanHalo = exp(-dot((uv - vec2(0.24, 0.38)) * vec2(1.3, 1.8), (uv - vec2(0.24, 0.38)) * vec2(1.3, 1.8)) * 5.0);
        float pinkHalo = exp(-dot((uv - vec2(0.78, 0.64)) * vec2(1.5, 1.7), (uv - vec2(0.78, 0.64)) * vec2(1.5, 1.7)) * 6.0);
        base += uCyan * cyanHalo * 0.012 * uSceneDetail;
        base += uPink * pinkHalo * 0.016 * uSceneDetail;
        float gridX = exp(-1400.0 * abs(fract(uv.x * 16.0) - 0.5));
        float gridY = exp(-1400.0 * abs(fract(uv.y * 9.0) - 0.5));
        base += vec3(0.025, 0.045, 0.085) * (gridX + gridY) * 0.08 * uSceneDetail;
        float vignette = 1.0 - smoothstep(0.22, 0.72, length(centered * vec2(0.82, 1.0)));
        return base * mix(0.68, 1.0, vignette);
      }
      if (uMaterialMode > 1.5) {
        vec3 top = vec3(0.10, 0.12, 0.34);
        vec3 middle = vec3(0.34, 0.23, 0.56);
        vec3 bottom = vec3(0.08, 0.04, 0.19);
        vec3 base = mix(top, middle, smoothstep(0.0, 0.48, uv.y));
        base = mix(base, bottom, smoothstep(0.48, 1.0, uv.y));
        float centerLight = exp(-dot(centered * vec2(0.72, 1.22), centered * vec2(0.72, 1.22)) * 3.4);
        base += vec3(0.34, 0.22, 0.43) * centerLight;
        float leftBeam = band(uv.x + uv.y * 0.22, 0.22, 0.055);
        float rightBeam = band(uv.x - uv.y * 0.18, 0.81, 0.060);
        base += uCyan * leftBeam * 0.075 * uSceneDetail;
        base += uPink * rightBeam * 0.085 * uSceneDetail;
        float noise = texture(uNoiseTexture, uv * vec2(5.0, 2.8125)).b - 0.5;
        base += vec3(noise * 0.030 * uSceneDetail);
        float horizon = exp(-260.0 * abs(uv.y - 0.76));
        base += mix(uPink, uCyan, uv.x) * horizon * 0.16 * uSceneDetail;
        return base;
      }
      vec3 top = vec3(0.66, 0.65, 0.97);
      vec3 middle = vec3(0.95, 0.72, 0.93);
      vec3 bottom = vec3(1.00, 0.66, 0.82);
      vec3 color = mix(top, middle, smoothstep(0.0, 0.54, uv.y));
      color = mix(color, bottom, smoothstep(0.52, 1.0, uv.y));
      float halo = exp(-3.7 * dot(centered * vec2(0.82, 1.18), centered * vec2(0.82, 1.18)));
      color += vec3(0.19, 0.16, 0.26) * halo;

      vec2 orbitPoint = centered * vec2(0.77, 1.88);
      float orbitAngle = atan(orbitPoint.y, orbitPoint.x);
      float orbitGate = smoothstep(-0.28, 0.14, sin(orbitAngle * 2.0 + 0.7));
      float mainOrbit = exp(-310.0 * abs(length(orbitPoint) - 0.38)) * orbitGate;
      vec2 secondPoint = (uv - vec2(0.47, 0.53)) * vec2(0.92, 2.42);
      float secondAngle = atan(secondPoint.y, secondPoint.x);
      float secondGate = smoothstep(-0.18, 0.28, -cos(secondAngle * 2.0 - 0.9));
      float secondOrbit = exp(-390.0 * abs(length(secondPoint) - 0.35)) * secondGate;
      color += mix(uPink, vec3(1.0), smoothstep(0.18, 0.58, uv.x)) * mainOrbit * 0.25 * uSceneDetail;
      color += mix(vec3(1.0), uCyan, smoothstep(0.45, 0.88, uv.x)) * secondOrbit * 0.12 * uSceneDetail;

      float sparkles = starBurst(uv, vec2(0.17, 0.18), 0.036) * 0.75;
      sparkles += starBurst(uv, vec2(0.77, 0.17), 0.031) * 0.84;
      sparkles += starBurst(uv, vec2(0.88, 0.72), 0.025) * 0.62;
      color += vec3(sparkles * uSceneDetail);

      vec4 orbA = metalOrb(uv, vec2(0.11, 0.69), 0.017, uCyan);
      vec4 orbB = metalOrb(uv, vec2(0.82, 0.26), 0.012, uPink);
      vec4 orbC = metalOrb(uv, vec2(0.91, 0.43), 0.009, uCyan);
      color = mix(color, orbA.rgb, orbA.a * 0.72 * uSceneDetail);
      color = mix(color, orbB.rgb, orbB.a * 0.78 * uSceneDetail);
      color = mix(color, orbC.rgb, orbC.a * 0.66 * uSceneDetail);

      vec2 grid = abs(fract(uv * vec2(20.0, 11.25)) - 0.5);
      float gridLine = smoothstep(0.492, 0.5, max(grid.x, grid.y)) * 0.010;
      color += vec3(gridLine);
      float floorLine = exp(-780.0 * abs(uv.y - 0.78));
      color += mix(uPink, vec3(1.0), uv.x) * floorLine * 0.10 * uSceneDetail;
      vec2 floorPoint = (uv - vec2(0.5, 0.72)) * vec2(2.1, 11.0);
      color -= vec3(0.11, 0.045, 0.13) * exp(-dot(floorPoint, floorPoint)) * (0.75 + uSceneDetail * 0.25);
      float grain = texture(uNoiseTexture, uv * vec2(4.0, 2.25)).b - 0.5;
      color += vec3(grain * 0.012 * uSceneDetail);
      float vignette = 1.0 - smoothstep(0.24, 0.86, length(centered));
      return color * mix(0.88, 1.04, vignette);
    }

    vec2 dotMaterialSourceUv(vec2 destinationUv) {
      // DOT is baked front-on at 1600x900. Perspective belongs to the final
      // screen pass so dots, extrusion, glitches and background share one
      // coherent camera transform.
      return destinationUv;
    }

    vec4 dotGlitchMaterial(vec2 uv) {
      float strength = uGlitchStrength;
      float glitchFade = smoothstep(0.0, 0.08, strength);
      float pitch = max(5.0, uDotPitch);
      vec2 artworkSizePx = max(uArtworkBounds.zw * uTextureSize, vec2(1.0));
      vec2 artworkLocalPx = (uv - uArtworkBounds.xy) * uTextureSize;
      float artworkRow = clamp(
        artworkLocalPx.y / artworkSizePx.y + 0.5,
        0.0,
        1.0
      );

      // A shared 2D signal field replaces the old fixed rows. The chunks are
      // full-artwork blocks, not glyph-owner cells: each gets an independent
      // width, height, displacement and dropout while remaining continuous
      // across nearby letterforms.
      float sliceBandPx = 18.0;
      float sliceBandCoord = (artworkLocalPx.y + 4096.0) / sliceBandPx;
      float sliceRow = floor(sliceBandCoord);
      float sliceLocalY = fract(sliceBandCoord);
      float chunkCellPx = 112.0;
      float rowOffsetPx = (hash21(vec2(sliceRow, 11.0)) - 0.5) * chunkCellPx;
      float chunkCoord = (artworkLocalPx.x + rowOffsetPx + 4096.0) / chunkCellPx;
      float chunkColumn = floor(chunkCoord);
      float chunkLocalX = fract(chunkCoord);
      vec2 chunkSeed = vec2(chunkColumn, sliceRow);
      float chunkWidth = mix(0.18, 0.78, hash21(chunkSeed + vec2(17.0, 3.0)));
      float chunkHeight = mix(0.20, 0.90, hash21(chunkSeed + vec2(5.0, 29.0)));
      vec2 chunkCenter = vec2(
        mix(
          chunkWidth * 0.5,
          1.0 - chunkWidth * 0.5,
          hash21(chunkSeed + vec2(41.0, 7.0))
        ),
        mix(
          chunkHeight * 0.5,
          1.0 - chunkHeight * 0.5,
          hash21(chunkSeed + vec2(73.0, 13.0))
        )
      );
      vec2 chunkDistance = vec2(chunkWidth, chunkHeight) * 0.5
        - abs(vec2(chunkLocalX, sliceLocalY) - chunkCenter);
      vec2 chunkAA = max(
        fwidth(vec2(chunkLocalX, sliceLocalY)) * 1.35,
        vec2(0.002)
      );
      float chunkRect = smoothstep(-chunkAA.x, chunkAA.x, chunkDistance.x)
        * smoothstep(-chunkAA.y, chunkAA.y, chunkDistance.y);
      float chunkEnabled = step(
        mix(0.965, 0.40, strength),
        hash21(chunkSeed + vec2(101.0, 37.0))
      );
      float activeRow = step(
        mix(0.995, 0.25, strength),
        hash21(vec2(sliceRow, 263.0))
      );
      float heroRow = step(
        mix(0.999, 0.84, strength),
        hash21(vec2(sliceRow, 233.0))
      ) * smoothstep(0.50, 0.86, strength);
      float heroFragment = step(
        0.52,
        hash21(chunkSeed + vec2(239.0, 107.0))
      );
      float tearGate = chunkRect * max(
        chunkEnabled * activeRow,
        heroRow * heroFragment
      ) * glitchFade;
      float tearDirection = hash21(chunkSeed + vec2(131.0, 47.0)) * 2.0 - 1.0;
      float tearPx = tearDirection
        * mix(7.0, 58.0, strength)
        * mix(0.30, 1.0, hash21(chunkSeed + vec2(151.0, 59.0)))
        * tearGate;
      float frontDrop = tearGate * step(
        mix(0.997, 0.62, strength),
        hash21(chunkSeed + vec2(181.0, 83.0))
      );
      float hardDrop = tearGate * step(
        mix(0.9995, 0.80, strength),
        hash21(chunkSeed + vec2(211.0, 97.0))
      );

      vec2 sourceUv = dotMaterialSourceUv(
        uv - vec2(tearPx / uTextureSize.x, 0.0)
      );
      // Keep the displaced face distance available for the dot mask. The
      // magenta separator is built from actual extrusion plates below, not an
      // isotropic SDF outline around this face.
      float tornDistance = mergedRawDistancePx(sourceUv) + ${BODY_INFLATE.toFixed(1)};
      float tornAA = max(1.65, fwidth(tornDistance) * 1.35);
      float tornFill = smoothstep(-tornAA, tornAA, tornDistance);

      vec2 materialLocalPx = (sourceUv - uArtworkBounds.xy) * uTextureSize;
      vec2 dotCell = fract(materialLocalPx / pitch) - 0.5;
      float dotDistance = length(dotCell);
      float dotRadius = 0.40;
      float dotAA = max(fwidth(dotDistance) * 1.20, 0.035);
      float dots = 1.0 - smoothstep(dotRadius - dotAA, dotRadius + dotAA, dotDistance);
      float dotHalo = 1.0 - smoothstep(dotRadius + 0.01, 0.58, dotDistance);
      float core = tornFill * dots * (1.0 - frontDrop) * (1.0 - hardDrop);
      float coreHalo = tornFill * dotHalo * (1.0 - frontDrop) * (1.0 - hardDrop);

      float cyanMisregister = mergedFillAt(
        dotMaterialSourceUv(
          uv - vec2(mix(2.0, 5.5, strength), -1.0) / uTextureSize
        )
      ) * dots * (1.0 - hardDrop);

      float blueTear = mergedFillAt(
        dotMaterialSourceUv(
          uv - vec2(
            (tearPx - tearDirection * mix(9.0, 21.0, strength)) / uTextureSize.x,
            0.0
          )
        )
      ) * tearGate * (1.0 - hardDrop);

      // Ten full-frame plates form one continuous baked volume. They may pass
      // freely through the old glyph-cell boundaries but still stop at the
      // actual 1600×900 artboard edge.
      vec2 depthVectorPx = vec2(mix(0.12, 0.24, strength), 1.0) * uExtrusion;
      float depthEnabled = smoothstep(0.0, 1.0, uExtrusion);
      float depthRidge = pow(
        0.5 + 0.5 * cos(
          6.2831853 * (uv.y * uTextureSize.y / max(5.0, pitch * 0.62) + 0.071)
        ),
        3.0
      );
      float alpha = 0.0;
      vec3 premultiplied = vec3(0.0);
      for (int layer = 10; layer >= 1; layer -= 1) {
        float depthAmount = float(layer) / 10.0;
        // Preserve a shared tear direction, then add a bounded layer-local
        // offset so the stack breaks into plates instead of one synchronized
        // vertical cut. The same event seed keeps the offsets coherent.
        vec2 layerGlitchSeed = chunkSeed + vec2(
          float(layer) * 37.0,
          float(layer) * 17.0
        );
        float layerGlitchGate = tearGate * step(
          mix(0.98, 0.30, strength),
          hash21(layerGlitchSeed + vec2(271.0, 113.0))
        );
        float layerJitterPx = (
          hash21(layerGlitchSeed + vec2(313.0, 127.0)) * 2.0 - 1.0
        ) * mix(4.0, 12.0, depthAmount) * strength * layerGlitchGate;
        float layerTearPx = tearPx * mix(0.76, 1.0, 1.0 - depthAmount)
          + layerJitterPx;
        vec2 layerDestinationUv = uv
          - (depthVectorPx * depthAmount + vec2(layerTearPx, 0.0)) / uTextureSize;
        vec2 layerSourceUv = dotMaterialSourceUv(layerDestinationUv);
        float layerHardDrop = hardDrop * step(
          0.42,
          hash21(layerGlitchSeed + vec2(347.0, 191.0))
        );
        float layerFill = mergedFillAt(layerSourceUv) * (1.0 - layerHardDrop);
        float layerPulse = mod(float(layer), 2.0);
        // A layer-local dropout produces black voids inside the volume instead
        // of cutting every depth plate with the same vertical column.
        vec2 depthChunk = vec2(
          floor((artworkLocalPx.x + float(layer) * 23.0) / 64.0),
          sliceRow + float(layer) * 19.0
        );
        float depthChunkDark = step(
          mix(0.985, 0.885, strength),
          hash21(depthChunk + vec2(503.0, 149.0))
        ) * glitchFade;
        float depthDarkness = mix(
          0.82,
          0.98,
          hash21(depthChunk + vec2(541.0, 173.0))
        );

        // Keep the far underside dark cobalt and bring violet forward toward
        // the face. The former ordering put the brightest violet on the most
        // exposed rear plate, turning the whole base into one flat purple slab.
        vec3 deepBlue = vec3(0.006, 0.004, 0.40) + uCyan * 0.004;
        vec3 violet = vec3(0.18, 0.008, 0.70);
        float farPlate = smoothstep(0.54, 1.0, depthAmount);
        vec3 plateBody = mix(violet, deepBlue, farPlate);

        // Dark troughs separate the plates. A narrow silhouette lip then
        // restores the electric-blue/violet edge without another SDF lookup.
        plateBody *= mix(0.38, 1.10, depthRidge);
        float plateLip = clamp(4.0 * layerFill * (1.0 - layerFill), 0.0, 1.0);
        vec3 lipColor = mix(
          vec3(0.018, 0.050, 0.94),
          vec3(0.30, 0.010, 0.92),
          layerPulse
        );
        vec3 deepLayerColor = mix(plateBody, lipColor, plateLip * 0.92);
        // OUTLINE THICKNESS selects actual front extrusion plates. The first
        // one is the emissive cap; additional plates step down toward dark
        // magenta instead of becoming an isotropic 2D SDF outline.
        float outlineLayers = clamp(floor(uDotOutlineLayers + 0.5), 0.0, 6.0);
        float magentaPlate = 1.0 - step(outlineLayers + 0.5, float(layer));
        float magentaFrontness = 1.0 - clamp(
          (float(layer) - 1.0) / max(outlineLayers - 1.0, 1.0),
          0.0,
          1.0
        );
        vec3 magentaPlateColor = uPink * mix(0.58, 1.0, magentaFrontness);
        magentaPlateColor *= mix(0.84, 1.08, depthRidge);
        vec3 layerColor = mix(deepLayerColor, magentaPlateColor, magentaPlate);
        // Deep plates take the full black corruption; front magenta plates
        // keep the same glitch blocks as dark pink rather than turning black.
        float darkChunkStrength = depthChunkDark
          * mix(0.34, 1.0, 1.0 - magentaPlate);
        layerColor = mix(
          layerColor,
          vec3(0.0004, 0.0001, 0.006),
          darkChunkStrength * depthDarkness
        );
        float layerAlpha = layerFill
          * depthEnabled
          * mix(0.58, 0.82, depthRidge)
          * mix(0.92, 1.0, layerPulse);
        float magentaAlpha = mix(0.86, 0.94, magentaFrontness);
        layerAlpha = mix(
          layerAlpha,
          layerFill * depthEnabled * magentaAlpha,
          magentaPlate
        );
        layerAlpha = mix(
          layerAlpha,
          layerFill * depthEnabled * 0.92,
          darkChunkStrength * 0.88
        );
        premultiplied = layerColor * layerAlpha
          + premultiplied * (1.0 - layerAlpha);
        alpha = layerAlpha + alpha * (1.0 - layerAlpha);
      }

      float carrierBandPx = 3.0;
      float carrierBandCoord = (uv.y * uTextureSize.y + 8192.0) / carrierBandPx;
      float carrierRow = floor(carrierBandCoord);
      float carrierLocalY = fract(carrierBandCoord);
      float carrierCellPx = 128.0;
      float carrierRowOffset = (hash21(vec2(carrierRow, 307.0)) - 0.5)
        * carrierCellPx;
      float carrierCoord = (
        uv.x * uTextureSize.x + carrierRowOffset + 8192.0
      ) / carrierCellPx;
      float carrierColumn = floor(carrierCoord);
      float carrierLocalX = fract(carrierCoord);
      vec2 carrierCell = vec2(carrierColumn, carrierRow);
      float carrierSeed = hash21(carrierCell + vec2(17.0, 311.0));
      float carrierGate = step(mix(0.995, 0.76, strength), carrierSeed);
      float segmentWidth = mix(
        0.14,
        0.88,
        hash21(carrierCell + vec2(29.0, 331.0))
      );
      float segmentCenter = mix(
        segmentWidth * 0.5,
        1.0 - segmentWidth * 0.5,
        hash21(carrierCell + vec2(43.0, 347.0))
      );
      float segmentDistance = segmentWidth * 0.5
        - abs(carrierLocalX - segmentCenter);
      float segmentAA = max(fwidth(carrierLocalX) * 1.35, 0.002);
      float segmentMask = smoothstep(-segmentAA, segmentAA, segmentDistance);
      float carrierThickness = mix(
        0.30,
        0.88,
        hash21(carrierCell + vec2(59.0, 359.0))
      );
      float carrierY = 1.0 - smoothstep(
        carrierThickness * 0.5,
        carrierThickness * 0.5 + max(fwidth(carrierLocalY) * 1.35, 0.01),
        abs(carrierLocalY - 0.5)
      );
      float longCarrier = step(
        0.88,
        hash21(carrierCell + vec2(71.0, 373.0))
      );
      float carrierMagnitude = mix(
        mix(14.0, 76.0, hash21(carrierCell + vec2(83.0, 389.0))),
        mix(140.0, 310.0, hash21(carrierCell + vec2(97.0, 401.0))),
        longCarrier
      );
      float carrierDirection = step(
        0.5,
        hash21(carrierCell + vec2(109.0, 419.0))
      ) * 2.0 - 1.0;
      float carrierLength = carrierDirection * carrierMagnitude * strength;
      float carrierA = mergedFillAt(dotMaterialSourceUv(
        uv - vec2(carrierLength * 0.25 / uTextureSize.x, 0.0)
      ));
      float carrierB = mergedFillAt(dotMaterialSourceUv(
        uv - vec2(carrierLength * 0.50 / uTextureSize.x, 0.0)
      ));
      float carrierC = mergedFillAt(dotMaterialSourceUv(
        uv - vec2(carrierLength * 0.75 / uTextureSize.x, 0.0)
      ));
      float carrierD = mergedFillAt(dotMaterialSourceUv(
        uv - vec2(carrierLength / uTextureSize.x, 0.0)
      ));
      float carrierFill = max(max(carrierA, carrierB), max(carrierC, carrierD));
      float carrierMask = carrierGate * segmentMask * carrierY * glitchFade;
      float signalTrail = carrierFill * carrierMask * (1.0 - hardDrop);
      float signalHead = carrierD * carrierMask * (1.0 - hardDrop);

      float microCell = hash21(floor(materialLocalPx / pitch));
      vec3 coreColor = min(
        uCyan * 1.04 + vec3(0.075, 0.010, 0.0),
        vec3(1.0)
      ) * mix(1.02, 1.08, step(0.94, microCell));

      float pinkTrailAlpha = signalTrail * mix(0.26, 0.72, strength);
      premultiplied = uPink * pinkTrailAlpha + premultiplied * (1.0 - pinkTrailAlpha);
      alpha = pinkTrailAlpha + alpha * (1.0 - pinkTrailAlpha);
      float cyanTrailAlpha = signalHead * mix(0.16, 0.50, strength);
      premultiplied = uCyan * cyanTrailAlpha + premultiplied * (1.0 - cyanTrailAlpha);
      alpha = cyanTrailAlpha + alpha * (1.0 - cyanTrailAlpha);

      float blueTearAlpha = blueTear * 0.56;
      vec3 blueTearColor = vec3(0.018, 0.055, 0.96);
      premultiplied = blueTearColor * blueTearAlpha
        + premultiplied * (1.0 - blueTearAlpha);
      alpha = blueTearAlpha + alpha * (1.0 - blueTearAlpha);

      float facePlate = tornFill * (1.0 - frontDrop) * (1.0 - hardDrop);
      float facePlateAlpha = facePlate * 0.95;
      vec3 facePlateColor = mix(
        vec3(0.002, 0.010, 0.050),
        uCyan * vec3(0.045, 0.12, 0.18),
        artworkRow
      );
      premultiplied = facePlateColor * facePlateAlpha
        + premultiplied * (1.0 - facePlateAlpha);
      alpha = facePlateAlpha + alpha * (1.0 - facePlateAlpha);

      float cyanAlpha = cyanMisregister * 0.54 * glitchFade;
      premultiplied = uCyan * cyanAlpha + premultiplied * (1.0 - cyanAlpha);
      alpha = cyanAlpha + alpha * (1.0 - cyanAlpha);

      vec3 coreHaloColor = min(uCyan * 0.94 + vec3(0.012, 0.008, 0.0), vec3(1.0));
      float coreHaloAlpha = coreHalo * 0.68;
      premultiplied = coreHaloColor * coreHaloAlpha
        + premultiplied * (1.0 - coreHaloAlpha);
      alpha = coreHaloAlpha + alpha * (1.0 - coreHaloAlpha);

      premultiplied = coreColor * core + premultiplied * (1.0 - core);
      alpha = core + alpha * (1.0 - core);

      return vec4(premultiplied, alpha);
    }

    vec4 vhsChromeMaterial(
      vec2 uv,
      vec2 signalLocalPx,
      float signalSeed,
      float surfaceD,
      float fill,
      float aa,
      vec3 chrome
    ) {
      float line = floor((signalLocalPx.y + 2048.0) / 3.0);
      float lineNoise = hash21(vec2(line * 1.37, 37.0));
      float dropout = step(0.93, lineNoise);
      float offsetPx = (lineNoise * 2.0 - 1.0) * mix(1.4, 4.2, dropout);
      float redGhost = mergedFillAt(
        uv + vec2(offsetPx / uTextureSize.x, 0.0)
      );
      float cyanGhost = mergedFillAt(
        uv - vec2(offsetPx / uTextureSize.x, 0.0)
      );

      float expanded = smoothstep(-4.5 - aa, -4.5 + aa, surfaceD);
      float outerRing = max(expanded - fill, 0.0);
      float chromeLuma = dot(chrome, vec3(0.2126, 0.7152, 0.0722));
      vec3 posterChrome = mix(vec3(chromeLuma), chrome, 1.28);
      posterChrome *= mix(1.0, 0.66, dropout);
      posterChrome += uCyan * band(signalLocalPx.y / 170.0 + signalSeed, 0.32, 0.16) * 0.14;
      posterChrome += uPink * band(signalLocalPx.y / 180.0 - signalSeed, -0.18, 0.18) * 0.16;

      vec3 premultiplied = posterChrome * fill;
      premultiplied += vec3(1.0, 0.08, 0.48) * redGhost * dropout * 0.34;
      premultiplied += vec3(0.04, 0.92, 1.0) * cyanGhost * dropout * 0.38;
      premultiplied += mix(uPink, uCyan, signalSeed) * outerRing * 0.72;
      float alpha = clamp(max(expanded, max(redGhost, cyanGhost) * dropout), 0.0, 1.0);
      return vec4(premultiplied, alpha);
    }

    void main() {
      vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
      vec3 background = backgroundColor(uv);

      if (uDebugId > 0.5) {
        float inkId = texture(uIdTexture, uv).g;
        float coverage = sampleCoverage(uv);
        vec3 debugColor = mix(vec3(0.008, 0.009, 0.014), idPalette(inkId), coverage);
        fragColor = vec4(debugColor, 1.0);
        return;
      }

      if (uMaterialMode > 0.5 && uMaterialMode < 1.5) {
        vec4 dotMaterial = dotGlitchMaterial(uv);
        vec2 dotFaceUv = dotMaterialSourceUv(uv);
        float dotFaceD = mergedRawDistancePx(dotFaceUv) + ${BODY_INFLATE.toFixed(1)};
        float dotFaceAA = max(1.65, fwidth(dotFaceD) * 1.35);
        float dotFaceFill = smoothstep(-dotFaceAA, dotFaceAA, dotFaceD);
        float blueRimFill = smoothstep(-4.0 - dotFaceAA, -4.0 + dotFaceAA, dotFaceD);
        float navyRimFill = smoothstep(-10.0 - dotFaceAA, -10.0 + dotFaceAA, dotFaceD);
        float blueRim = max(blueRimFill - dotFaceFill, 0.0);
        float navyRim = max(navyRimFill - blueRimFill, 0.0);
        float dotGlow = exp(-max(-dotFaceD, 0.0) / 16.0)
          * (1.0 - dotFaceFill)
          * uGlow;
        vec3 dotBackground = background
          + uCyan * dotGlow * 0.24
          + uPink * dotGlow * 0.045;
        vec3 outlinedBackground = mix(dotBackground, vec3(0.006, 0.001, 0.024), navyRim * 0.98);
        // The front magenta plates provide the visible separator; this subtle
        // dark-purple backstop only prevents gaps from glowing like an outline.
        outlinedBackground = mix(
          outlinedBackground,
          vec3(0.030, 0.002, 0.14),
          blueRim * 0.52
        );
        fragColor = vec4(
          outlinedBackground * (1.0 - dotMaterial.a) + dotMaterial.rgb,
          1.0
        );
        return;
      }

      if (uMaterialMode < 0.5 && uv.y > 0.78 && uSceneDetail > 0.001) {
        float reflectedY = 0.78 - (uv.y - 0.78) / 0.42;
        vec2 reflectedUv = vec2(uv.x, reflectedY);
        vec2 blurStep = vec2(0.0, 4.0 / uTextureSize.y);
        float reflectedAlpha = sampleCoverage(reflectedUv - blurStep) * 0.25;
        reflectedAlpha += sampleCoverage(reflectedUv) * 0.50;
        reflectedAlpha += sampleCoverage(reflectedUv + blurStep) * 0.25;
        float reflectionFade = exp(-(uv.y - 0.78) * 11.0)
          * (1.0 - smoothstep(0.78, 0.98, uv.y));
        vec3 reflectedColor = mix(uPink * 0.58, uCyan * 0.34 + vec3(0.38), uv.x);
        background = mix(background, reflectedColor, reflectedAlpha * reflectionFade * 0.16 * uSceneDetail);
      }

      vec2 distancePair = sampleDistancePair16(uv);
      float surfaceD = (distancePair.x * 2.0 - 1.0) * uSpread + ${BODY_INFLATE.toFixed(1)};
      float shadingSurfaceD = (distancePair.y * 2.0 - 1.0) * ${SHADING_SDF_SPREAD.toFixed(1)} + ${BODY_INFLATE.toFixed(1)};
      float aa = edgeAA(surfaceD);
      float fill = smoothstep(-aa, aa, surfaceD);
      float glow = exp(-max(-surfaceD, 0.0) / 22.0) * (1.0 - fill) * uGlow;
      if (uMaterialMode < 0.5) {
        float liquidNear = exp(-max(-surfaceD, 0.0) / 14.0) * (1.0 - fill);
        background *= 1.0 - liquidNear * 0.045;
      }
      ${DEBUG_SURFACE === "fill" ? `
        fragColor = vec4(vec3(fill), 1.0);
        return;
      ` : ""}
      ${DEBUG_SURFACE === "shading" ? `
        float shadingRamp = clamp(shadingSurfaceD / max(uEdgeWidth, 0.001), 0.0, 1.0);
        fragColor = vec4(vec3(shadingRamp), 1.0);
        return;
      ` : ""}

      vec2 centerShape = sampleShapeData16(uv);
      // The complete crown + continuous face curve + edge roll is baked into
      // one normal texture. Runtime cost stays at one filtered normal lookup.
      vec3 bakedNormal = sampleNormalMap(uv);
      ${DEBUG_SURFACE === "edge" ? `
        fragColor = vec4(bakedNormal * 0.5 + 0.5, 1.0);
        return;
      ` : ""}

      vec2 artworkSize = max(uArtworkBounds.zw, vec2(1.0) / uTextureSize);
      vec2 artworkLocal = clamp(
        (uv - uArtworkBounds.xy) / artworkSize,
        vec2(-0.75),
        vec2(0.75)
      );
      float semanticId = texture(uIdTexture, uv).g;
      float hasSemanticId = step(0.5 / 255.0, semanticId);
      float semanticWeight = hasSemanticId
        * smoothstep(0.55, 0.90, centerShape.y);
      vec4 glyphMetadata = glyphMetadataForId(semanticId);
      vec2 glyphSize = max(glyphMetadata.zw, vec2(1.0) / uTextureSize);
      vec2 glyphLocal = clamp(
        (uv - glyphMetadata.xy) / glyphSize,
        vec2(-0.75),
        vec2(0.75)
      );
      // Semantic ID restores each glyph's local lighting coordinates, but it
      // never gates geometry. Inflated/AA edges blend smoothly back to the
      // artwork coordinate field instead of creating an owner-cell seam.
      vec2 materialLocal = mix(artworkLocal, glyphLocal, semanticWeight);
      vec2 normalXY = bakedNormal.xy / max(bakedNormal.z, 0.001);
      vec2 noiseUv = uv * vec2(1.35, 1.85) + vec2(2.7, -1.9);
      vec2 liquid = texture(uNoiseTexture, noiseUv).rg - 0.5;
      normalXY += liquid * uLiquidWarp;
      vec3 normal = normalize(vec3(normalXY, 1.0));
      ${DEBUG_SURFACE === "normal" ? `
        fragColor = vec4(normal * 0.5 + 0.5, 1.0);
        return;
      ` : ""}

      vec3 reflected = reflect(vec3(0.0, 0.0, -1.0), normal);
      vec2 fieldUv = colorFieldUv(reflected);
      float fieldRadius = length((fieldUv - vec2(0.5)) / 0.48);
      float rimInterior = 1.0 - smoothstep(0.78, 0.98, fieldRadius);
      // Surface normal remains the primary lookup. Local semantic coordinates
      // spread highlights across the face, then fade before the grazing rim so
      // local offsets cannot push the rounded edge into a texture boundary.
      fieldUv += materialLocal * vec2(0.020, 0.12) * rimInterior;
      // Coverage expands the middle of the reflection while fixing the sphere
      // poles in place. Unlike a linear scale, this cannot overshoot or fold.
      vec2 coverageScale = vec2(
        uEnvCoverage,
        1.0 + (uEnvCoverage - 1.0) * 0.35
      );
      vec2 fieldDirection = (fieldUv - vec2(0.5)) / 0.48;
      fieldDirection = vec2(
        boundedCoverage(fieldDirection.x, coverageScale.x),
        boundedCoverage(fieldDirection.y, coverageScale.y)
      );
      fieldUv = vec2(0.5) + fieldDirection * 0.48;
      float glyphSeed = fract(floor(semanticId * 255.0 + 0.5) * 0.6180339);
      fieldUv.x += mix(-0.0033, (glyphSeed - 0.5) * 0.028, semanticWeight) * rimInterior;
      fieldUv += uReflectionOffset;

      // The reflection field owns the detail. One hardware-filtered lookup
      // uses mirrored wrapping so non-seamless library assets never stretch a
      // clamped terminal row across the rounded rim.
      float fieldFootprint = exp2(uRoughness * 5.5);
      vec4 fieldSample = textureGrad(
        uColorFieldTexture,
        fieldUv,
        dFdx(fieldUv) * fieldFootprint,
        dFdy(fieldUv) * fieldFootprint
      );
      vec3 sampledField = srgbToLinear(fieldSample.rgb);
      float sampledLuma = dot(sampledField, vec3(0.2126, 0.7152, 0.0722));
      sampledField = max(vec3(0.0), mix(vec3(sampledLuma), sampledField, 1.58));

      vec3 fieldLinear = sampledField * mix(0.58, 1.08, uColorFieldStrength);
      fieldLinear += vec3(fieldSample.a * 0.075 * uColorFieldStrength);

      float fresnel = pow(1.0 - clamp(normal.z, 0.0, 1.0), 2.45);
      float areaLight = pow(max(dot(normal, normalize(vec3(-0.38, -0.48, 0.79))), 0.0), 16.0);
      vec3 edgeTint = mix(uPink, uCyan, clamp(normal.x * 0.5 + 0.5, 0.0, 1.0));
      // Reflectivity now blends between a lit base material and the selected
      // reflection field. Lower values no longer behave like exposure loss.
      vec3 baseLinear = srgbToLinear(uBaseColor) * mix(0.76, 1.04, normal.z);
      vec3 chromeLinear = mix(baseLinear, fieldLinear, uReflection);
      chromeLinear += vec3(areaLight * mix(0.10, 0.38, uReflection) * mix(0.72, 1.0, uColorFieldStrength));
      chromeLinear += srgbToLinear(edgeTint) * fresnel * mix(0.12, 0.56, uReflection);
      chromeLinear *= 0.94 + normal.z * 0.08;
      // Full-artwork fields produce a broader, calmer normal distribution than
      // the former per-glyph cells. Preserve highlight detail before ACES
      // instead of letting that concentrated reflection plateau near white.
      vec3 chrome = linearToSrgb(acesApprox(chromeLinear * 0.90));
      if (uMaterialMode < 0.5) {
        chrome = gradeLiquidChrome(chrome);
      }

      vec2 extrusionOffset = vec2(-0.68, -1.0) * uExtrusion / uTextureSize;
      float backD = mergedRawDistancePx(uv + extrusionOffset) + 3.5;
      float sweptD = smoothMax(surfaceD, backD, max(0.05, uExtrusion * 0.32));
      float extrusionAA = edgeAA(sweptD) * 1.35;
      float extrusion = smoothstep(-extrusionAA, extrusionAA, sweptD) * (1.0 - fill);

      vec2 shadowOffset = vec2(-0.68, -1.0) * (uExtrusion + 10.0) / uTextureSize;
      float shadowD = mergedRawDistancePx(uv + shadowOffset) + 3.5;
      float shadowMask = smoothstep(-14.0, 2.0, shadowD) * (1.0 - fill);
      float shadow = shadowMask * 0.22 * smoothstep(0.0, 2.0, uExtrusion);

      vec3 color = background;
      color = mix(color, vec3(0.18, 0.055, 0.22), shadow);
      float extrusionOpacity = mix(0.84, 0.88, step(1.5, uMaterialMode));
      color = mix(color, vec3(0.18, 0.055, 0.22) + uPink * 0.08, extrusion * extrusionOpacity);
      color += mix(uPink, uCyan, uv.x) * glow * 0.28;
      if (uMaterialMode > 1.5) {
        vec2 artworkLocalPx = artworkLocal * artworkSize * uTextureSize;
        vec2 glyphLocalPx = (uv - glyphMetadata.xy) * uTextureSize;
        vec2 signalLocalPx = mix(artworkLocalPx, glyphLocalPx, semanticWeight);
        float signalSeed = mix(0.381966, glyphSeed, semanticWeight);
        vec4 vhsMaterial = vhsChromeMaterial(
          uv,
          signalLocalPx,
          signalSeed,
          surfaceD,
          fill,
          aa,
          chrome
        );
        color = color * (1.0 - vhsMaterial.a) + vhsMaterial.rgb;
        fragColor = vec4(color, 1.0);
        return;
      }
      float liquidSpecular = smoothstep(
        0.72,
        0.92,
        dot(chrome, vec3(0.2126, 0.7152, 0.0722))
      );
      float liquidHalo = exp(-max(-surfaceD, 0.0) / 5.0) * (1.0 - fill);
      color += mix(chrome, vec3(1.0), 0.12) * liquidSpecular * liquidHalo * 0.075;
      color = mix(color, chrome, fill);
      fragColor = vec4(color, 1.0);
    }
  `;

  const crtFragmentShaderSource = `#version 300 es
    precision highp float;

    in vec2 vUv;
    layout(location = 0) out vec4 fragColor;
    uniform sampler2D uSceneTexture;
    uniform vec2 uSceneSize;
    uniform float uScanlineSpacing;
    uniform float uScanlineStrength;

    vec3 toLinear(vec3 color) {
      return pow(max(color, 0.0), vec3(2.2));
    }

    vec3 toSrgb(vec3 color) {
      return pow(max(color, 0.0), vec3(1.0 / 2.2));
    }

    float luma(vec3 color) {
      return dot(color, vec3(0.2126, 0.7152, 0.0722));
    }

    vec3 highlightAt(vec2 uv) {
      vec3 color = toLinear(texture(uSceneTexture, uv).rgb);
      return color * smoothstep(0.22, 0.72, luma(color));
    }

    void main() {
      vec3 scene = toLinear(texture(uSceneTexture, vUv).rgb);
      float brightness = luma(scene);
      float sourceY = vUv.y * uSceneSize.y;
      float pitch = max(5.0, uScanlineSpacing);
      float phase = abs(fract(sourceY / pitch) - 0.5) * 2.0;
      float beamWidth = mix(0.30, 0.68, sqrt(clamp(brightness, 0.0, 1.0)));
      float beam = exp2(-2.0 * pow(phase / beamWidth, 2.0));
      float emissiveGate = smoothstep(0.025, 0.46, brightness);
      float rowGain = mix(
        1.0,
        mix(1.0 - uScanlineStrength, 1.055, beam),
        emissiveGate
      );

      vec2 px = 1.0 / uSceneSize;
      vec3 bloom = highlightAt(vUv) * 0.34;
      bloom += highlightAt(vUv + vec2(px.x * 2.0, 0.0)) * 0.24;
      bloom += highlightAt(vUv - vec2(px.x * 2.0, 0.0)) * 0.24;
      bloom += highlightAt(vUv + vec2(px.x * 6.0, 0.0)) * 0.09;
      bloom += highlightAt(vUv - vec2(px.x * 6.0, 0.0)) * 0.09;

      vec3 color = scene * rowGain;
      color += bloom * 0.22 * mix(0.52, 1.0, beam);

      float sourceX = vUv.x * uSceneSize.x;
      vec3 phosphor = 1.0 + 0.045 * cos(
        6.2831853 * (sourceX / 6.0 + vec3(0.0, 0.3333333, 0.6666667))
      );
      color *= mix(vec3(1.0), phosphor, smoothstep(0.06, 0.54, brightness));

      vec2 centered = (vUv - 0.5) * vec2(1.0, 0.86);
      float edgeFade = 1.0 - smoothstep(0.22, 0.60, length(centered));
      color *= mix(0.86, 1.0, edgeFade);
      fragColor = vec4(toSrgb(color), 1.0);
    }
  `;

  const copyFragmentShaderSource = `#version 300 es
    precision highp float;

    in vec2 vUv;
    layout(location = 0) out vec4 fragColor;
    uniform sampler2D uSceneTexture;

    void main() {
      fragColor = texture(uSceneTexture, vUv);
    }
  `;

  const dotPresentFragmentShaderSource = `#version 300 es
    precision highp float;

    in vec2 vUv;
    layout(location = 0) out vec4 fragColor;
    uniform sampler2D uSceneTexture;
    uniform vec2 uSceneSize;
    uniform float uPerspectiveAngle;
    uniform float uGlow;

    float dotPresentLuma(vec3 color) {
      return dot(color, vec3(0.2126, 0.7152, 0.0722));
    }

    vec3 dotHighlightAt(vec2 uv) {
      vec3 color = texture(uSceneTexture, clamp(uv, vec2(0.0), vec2(1.0))).rgb;
      float peak = max(max(color.r, color.g), color.b);
      float emission = max(dotPresentLuma(color), peak * 0.72);
      return color * smoothstep(0.20, 0.68, emission);
    }

    void main() {
      float perspective = clamp(uPerspectiveAngle / 75.0, 0.0, 1.0);
      // The complete 1600x900 DOT bake is projected once here. vUv.y is zero
      // at the visual bottom, so the upper edge narrows while the bottom stays
      // anchored at full width.
      float topScale = mix(1.0, 0.72, perspective);
      float perspectiveRow = clamp((vUv.y - 0.05) / 0.90, 0.0, 1.0);
      float rowScale = mix(1.0, topScale, perspectiveRow);
      float sourceX = 0.5 + (vUv.x - 0.5) / max(rowScale, 0.01);
      vec2 sourceUv = vec2(sourceX, vUv.y);

      float edgeDistance = 0.5 * rowScale - abs(vUv.x - 0.5);
      float edgeAA = max(fwidth(edgeDistance), 1.0 / uSceneSize.x);
      float inside = perspective < 0.0001
        ? 1.0
        : smoothstep(-edgeAA, edgeAA, edgeDistance);

      vec3 scene = texture(uSceneTexture, clamp(sourceUv, vec2(0.0), vec2(1.0))).rgb;
      float sourcePixelX = 1.0 / (uSceneSize.x * max(rowScale, 0.01));
      float sourcePixelY = 1.0 / uSceneSize.y;
      vec3 bloom = dotHighlightAt(sourceUv) * 0.24;
      bloom += dotHighlightAt(sourceUv + vec2(sourcePixelX * 2.0, 0.0)) * 0.15;
      bloom += dotHighlightAt(sourceUv - vec2(sourcePixelX * 2.0, 0.0)) * 0.15;
      bloom += dotHighlightAt(sourceUv + vec2(sourcePixelX * 7.0, 0.0)) * 0.08;
      bloom += dotHighlightAt(sourceUv - vec2(sourcePixelX * 7.0, 0.0)) * 0.08;
      bloom += dotHighlightAt(sourceUv + vec2(0.0, sourcePixelY * 2.0)) * 0.12;
      bloom += dotHighlightAt(sourceUv - vec2(0.0, sourcePixelY * 2.0)) * 0.12;
      bloom += dotHighlightAt(sourceUv + vec2(0.0, sourcePixelY * 5.0)) * 0.03;
      bloom += dotHighlightAt(sourceUv - vec2(0.0, sourcePixelY * 5.0)) * 0.03;
      scene += bloom * uGlow * 0.96;

      vec3 outside = mix(vec3(0.001, 0.003, 0.010), vec3(0.005, 0.001, 0.012), vUv.y);
      fragColor = vec4(mix(outside, scene, inside), 1.0);
    }
  `;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) || "SHADER COMPILE ERROR";
      gl.deleteShader(shader);
      throw new Error(message);
    }
    return shader;
  }

  function createProgram(fragmentSource = fragmentShaderSource) {
    const vertex = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragment = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    const nextProgram = gl.createProgram();
    gl.attachShader(nextProgram, vertex);
    gl.attachShader(nextProgram, fragment);
    gl.linkProgram(nextProgram);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(nextProgram, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(nextProgram) || "PROGRAM LINK ERROR";
      gl.deleteProgram(nextProgram);
      throw new Error(message);
    }
    return nextProgram;
  }

  let program;
  let crtProgram;
  let copyProgram;
  let dotPresentProgram;
  try {
    program = createProgram();
    crtProgram = createProgram(crtFragmentShaderSource);
    copyProgram = createProgram(copyFragmentShaderSource);
    dotPresentProgram = createProgram(dotPresentFragmentShaderSource);
  } catch (error) {
    ui.renderError.hidden = false;
    ui.renderError.textContent = error.message;
    ui.gpuStatus.textContent = "SHADER ERROR";
    return;
  }

  const locations = {
    position: gl.getAttribLocation(program, "aPosition"),
    shapeTexture: gl.getUniformLocation(program, "uShapeTexture"),
    distanceTexture: gl.getUniformLocation(program, "uDistanceTexture"),
    idTexture: gl.getUniformLocation(program, "uIdTexture"),
    glyphMetadataTexture: gl.getUniformLocation(program, "uGlyphMetadataTexture"),
    noiseTexture: gl.getUniformLocation(program, "uNoiseTexture"),
    colorFieldTexture: gl.getUniformLocation(program, "uColorFieldTexture"),
    normalTexture: gl.getUniformLocation(program, "uNormalTexture"),
    textureSize: gl.getUniformLocation(program, "uTextureSize"),
    spread: gl.getUniformLocation(program, "uSpread"),
    edgeWidth: gl.getUniformLocation(program, "uEdgeWidth"),
    reflection: gl.getUniformLocation(program, "uReflection"),
    colorFieldStrength: gl.getUniformLocation(program, "uColorFieldStrength"),
    roughness: gl.getUniformLocation(program, "uRoughness"),
    baseColor: gl.getUniformLocation(program, "uBaseColor"),
    envCoverage: gl.getUniformLocation(program, "uEnvCoverage"),
    reflectionOffset: gl.getUniformLocation(program, "uReflectionOffset"),
    liquidWarp: gl.getUniformLocation(program, "uLiquidWarp"),
    dotPitch: gl.getUniformLocation(program, "uDotPitch"),
    dotOutlineLayers: gl.getUniformLocation(program, "uDotOutlineLayers"),
    glitchStrength: gl.getUniformLocation(program, "uGlitchStrength"),
    artworkBounds: gl.getUniformLocation(program, "uArtworkBounds"),
    extrusion: gl.getUniformLocation(program, "uExtrusion"),
    glow: gl.getUniformLocation(program, "uGlow"),
    sceneDetail: gl.getUniformLocation(program, "uSceneDetail"),
    cyan: gl.getUniformLocation(program, "uCyan"),
    pink: gl.getUniformLocation(program, "uPink"),
    debugId: gl.getUniformLocation(program, "uDebugId"),
    materialMode: gl.getUniformLocation(program, "uMaterialMode"),
  };
  const crtLocations = {
    position: gl.getAttribLocation(crtProgram, "aPosition"),
    sceneTexture: gl.getUniformLocation(crtProgram, "uSceneTexture"),
    sceneSize: gl.getUniformLocation(crtProgram, "uSceneSize"),
    scanlineSpacing: gl.getUniformLocation(crtProgram, "uScanlineSpacing"),
    scanlineStrength: gl.getUniformLocation(crtProgram, "uScanlineStrength"),
  };
  const copyLocations = {
    position: gl.getAttribLocation(copyProgram, "aPosition"),
    sceneTexture: gl.getUniformLocation(copyProgram, "uSceneTexture"),
  };
  const dotPresentLocations = {
    position: gl.getAttribLocation(dotPresentProgram, "aPosition"),
    sceneTexture: gl.getUniformLocation(dotPresentProgram, "uSceneTexture"),
    sceneSize: gl.getUniformLocation(dotPresentProgram, "uSceneSize"),
    perspectiveAngle: gl.getUniformLocation(dotPresentProgram, "uPerspectiveAngle"),
    glow: gl.getUniformLocation(dotPresentProgram, "uGlow"),
  };

  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );

  function createTexture(unit, filter, wrap = gl.CLAMP_TO_EDGE) {
    const texture = gl.createTexture();
    gl.activeTexture(unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    return texture;
  }

  const shapeTexture = createTexture(gl.TEXTURE0, gl.NEAREST);
  const idTexture = createTexture(gl.TEXTURE1, gl.NEAREST);
  const glyphMetadataTexture = createTexture(gl.TEXTURE2, gl.NEAREST);
  const noiseTexture = createTexture(gl.TEXTURE3, gl.LINEAR, gl.REPEAT);
  const distanceTexture = createTexture(gl.TEXTURE4, gl.NEAREST);
  let colorFieldTexture = createTexture(gl.TEXTURE5, gl.LINEAR);
  const normalTexture = createTexture(gl.TEXTURE6, gl.LINEAR);
  const sceneTexture = createTexture(gl.TEXTURE7, gl.LINEAR);
  const sceneFramebuffer = gl.createFramebuffer();
  let sceneTargetWidth = 0;
  let sceneTargetHeight = 0;

  gl.activeTexture(gl.TEXTURE5);
  gl.bindTexture(gl.TEXTURE_2D, colorFieldTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([118, 124, 146, 255]),
  );

  function drawAssetCanvas(canvas, sourceWidth, sourceHeight, writePixel) {
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    const image = context.createImageData(canvas.width, canvas.height);
    const scale = Math.min(canvas.width / sourceWidth, canvas.height / sourceHeight);
    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;
    const offsetX = (canvas.width - drawWidth) * 0.5;
    const offsetY = (canvas.height - drawHeight) * 0.5;
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const outputIndex = (y * canvas.width + x) * 4;
        if (x + 0.5 < offsetX || x + 0.5 >= offsetX + drawWidth
          || y + 0.5 < offsetY || y + 0.5 >= offsetY + drawHeight) {
          writeRgb(image.data, outputIndex, 5, 4, 8);
          image.data[outputIndex + 3] = 255;
          continue;
        }
        const sourceX = Math.min(
          sourceWidth - 1,
          Math.floor(((x + 0.5 - offsetX) / drawWidth) * sourceWidth),
        );
        const sourceY = Math.min(
          sourceHeight - 1,
          Math.floor(((y + 0.5 - offsetY) / drawHeight) * sourceHeight),
        );
        const sourceIndex = (sourceY * sourceWidth + sourceX) * 4;
        writePixel(image.data, outputIndex, sourceIndex, sourceX, sourceY);
        image.data[outputIndex + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
  }

  function drawGeneratedAsset(key, sourceWidth, sourceHeight, writePixel) {
    drawAssetCanvas(ui.generatedAssetCanvases.get(key), sourceWidth, sourceHeight, writePixel);
  }

  function writeRgb(output, index, red, green, blue) {
    output[index] = Math.max(0, Math.min(255, Math.round(red)));
    output[index + 1] = Math.max(0, Math.min(255, Math.round(green)));
    output[index + 2] = Math.max(0, Math.min(255, Math.round(blue)));
  }

  function unpackPixels16(pixels, index, highChannel, lowChannel) {
    return (pixels[index + highChannel] * 256 + pixels[index + lowChannel]) / 65535;
  }

  function writeSdfPreview(output, index, encoded, spread) {
    const distance = (encoded * 2 - 1) * spread;
    const magnitude = Math.min(1, Math.abs(distance) / 16);
    const zeroContour = Math.exp(-Math.abs(distance) * 0.72);
    const outside = [32 + magnitude * 42, 10 + magnitude * 12, 54 + magnitude * 66];
    const inside = [10 + magnitude * 25, 54 + magnitude * 150, 72 + magnitude * 174];
    const color = distance >= 0 ? inside : outside;
    writeRgb(
      output,
      index,
      color[0] + zeroContour * 220,
      color[1] + zeroContour * 210,
      color[2] + zeroContour * 188,
    );
  }

  function idPreviewColor(idByte) {
    const phase = (idByte * 0.6180339) % 1;
    return [0, 1 / 3, 2 / 3].map((offset) => (
      140 + 100 * Math.cos(Math.PI * 2 * (phase + offset))
    ));
  }

  function updateGlyphAssetPreviews(shapePixels, distancePixels, normalPixels, idPixels) {
    drawGeneratedAsset("coverage", TEXTURE_WIDTH, TEXTURE_HEIGHT, (output, index, sourceIndex) => {
      const coverage = shapePixels[sourceIndex + 2];
      writeRgb(output, index, coverage, coverage, coverage);
    });
    drawGeneratedAsset("body", TEXTURE_WIDTH, TEXTURE_HEIGHT, (output, index, sourceIndex) => {
      const height = unpackPixels16(shapePixels, sourceIndex, 0, 1);
      const coverage = shapePixels[sourceIndex + 2] / 255;
      writeRgb(
        output,
        index,
        10 + height * 218 * coverage,
        7 + height * 134 * coverage,
        18 + height * 238 * coverage,
      );
    });
    drawGeneratedAsset("clip-sdf", TEXTURE_WIDTH, TEXTURE_HEIGHT, (output, index, sourceIndex) => {
      writeSdfPreview(output, index, unpackPixels16(distancePixels, sourceIndex, 0, 1), SDF_SPREAD);
    });
    drawGeneratedAsset("shading-sdf", TEXTURE_WIDTH, TEXTURE_HEIGHT, (output, index, sourceIndex) => {
      writeSdfPreview(
        output,
        index,
        unpackPixels16(distancePixels, sourceIndex, 2, 3),
        SHADING_SDF_SPREAD,
      );
    });
    drawGeneratedAsset("normal", TEXTURE_WIDTH, TEXTURE_HEIGHT, (output, index, sourceIndex) => {
      const normalX = normalPixels[sourceIndex] / 255 * 2 - 1;
      const normalY = normalPixels[sourceIndex + 1] / 255 * 2 - 1;
      const normalZ = normalPixels[sourceIndex + 2] / 255 * 2 - 1;
      writeRgb(output, index, (normalX * 0.5 + 0.5) * 255, (normalY * 0.5 + 0.5) * 255, normalZ * 255);
    });
    drawGeneratedAsset("glyph-id", TEXTURE_WIDTH, TEXTURE_HEIGHT, (output, index, sourceIndex) => {
      const idByte = idPixels[sourceIndex + 1];
      if (idByte === 0) {
        writeRgb(output, index, 5, 4, 8);
        return;
      }
      const color = idPreviewColor(idByte);
      const coverage = shapePixels[sourceIndex + 2] / 255;
      writeRgb(output, index, color[0] * coverage, color[1] * coverage, color[2] * coverage);
    });
  }

  const REFLECTION_FIELD_WIDTH = 512;
  const REFLECTION_FIELD_HEIGHT = 512;
  const CUSTOM_REFLECTION_CACHE_LIMIT = 4;
  const MAX_CUSTOM_URL_LENGTH = 8 * 1024 * 1024;
  const MAX_REFLECTION_IMAGE_PIXELS = 32 * 1024 * 1024;
  const reflectionFieldCache = new Map();
  let reflectionRequestId = 0;

  function setCustomReflectionStatus(message = "", status = "") {
    ui.customReflectionStatus.textContent = message;
    if (status) ui.customReflectionStatus.dataset.state = status;
    else delete ui.customReflectionStatus.dataset.state;
  }

  function setReflectionRequestBusy(busy) {
    const control = ui.applyReflectionUrlButton.closest(".reflection-url-control");
    control.setAttribute("aria-busy", String(busy));
    ui.applyReflectionUrlButton.textContent = busy ? "LOADING" : "APPLY";
  }

  function invalidateReflectionRequest() {
    reflectionRequestId += 1;
    setReflectionRequestBusy(false);
    setCustomReflectionStatus();
  }

  function normalizeCustomReflectionUrl(rawUrl) {
    const trimmed = rawUrl.trim();
    if (!trimmed) throw new Error("请输入图片 URL");
    if (trimmed.length > MAX_CUSTOM_URL_LENGTH) throw new Error("DATA URL 过大（最大 8 MiB）");
    let parsed;
    try {
      parsed = new URL(trimmed, window.location.href);
    } catch {
      throw new Error("URL 格式无效");
    }
    if (!["http:", "https:", "data:", "blob:"].includes(parsed.protocol)) {
      throw new Error("仅支持 http(s)、data 或 blob 图片 URL");
    }
    if (window.location.protocol === "https:" && parsed.protocol === "http:") {
      throw new Error("HTTPS 页面不能加载 HTTP 图片");
    }
    if (parsed.protocol === "data:"
      && !/^data:image\/(?:png|jpe?g|webp|avif)(?:;[^,]*)?,/i.test(parsed.href)) {
      throw new Error("DATA URL 仅支持 PNG、JPEG、WebP 或 AVIF");
    }
    return parsed.href;
  }

  function reflectionDescriptor(styleKey, customUrl = state.customReflectionUrl) {
    if (styleKey === "custom") {
      const url = normalizeCustomReflectionUrl(customUrl || "");
      return {
        key: "custom",
        label: REFLECTION_STYLES.custom,
        url,
        signature: `custom:${url}`,
        custom: true,
      };
    }
    if (!REFLECTION_SOURCES[styleKey]) throw new Error("未知反射场");
    const url = new URL(REFLECTION_SOURCES[styleKey], window.location.href).href;
    return {
      key: styleKey,
      label: REFLECTION_STYLES[styleKey],
      url,
      signature: `builtin:${styleKey}:${url}`,
      custom: false,
    };
  }

  function loadReflectionImage(descriptor) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        image.onload = null;
        image.onerror = null;
        callback(value);
      };
      const timeoutId = window.setTimeout(() => {
        finish(reject, new Error("图片加载超时"));
        image.src = "";
      }, 15000);
      image.decoding = "async";
      if (descriptor.custom && /^https?:/i.test(descriptor.url)) {
        image.crossOrigin = "anonymous";
        image.referrerPolicy = "no-referrer";
      }
      image.onload = () => {
        const width = image.naturalWidth;
        const height = image.naturalHeight;
        if (!width || !height) {
          finish(reject, new Error("图片尺寸无效"));
          return;
        }
        if (width > 8192 || height > 8192 || width * height > MAX_REFLECTION_IMAGE_PIXELS) {
          finish(reject, new Error("图片尺寸过大（最大 8192px / 32MP）"));
          return;
        }
        finish(resolve, image);
      };
      image.onerror = () => finish(
        reject,
        new Error(descriptor.custom
          ? "图片加载失败；公开 URL 需要允许跨域访问（CORS）"
          : `内置反射场加载失败：${descriptor.label}`),
      );
      image.src = descriptor.url;
    });
  }

  function normalizeReflectionImage(image) {
    const canvas = document.createElement("canvas");
    canvas.width = REFLECTION_FIELD_WIDTH;
    canvas.height = REFLECTION_FIELD_HEIGHT;
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#000";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    context.drawImage(image, (canvas.width - width) * 0.5, (canvas.height - height) * 0.5, width, height);
    try {
      context.getImageData(0, 0, 1, 1);
    } catch {
      throw new Error("图片无法读取；请确认 URL 允许跨域访问（CORS）");
    }
    return canvas;
  }

  function trimCustomReflectionCache() {
    const customKeys = [...reflectionFieldCache.keys()].filter((key) => key.startsWith("custom:"));
    while (customKeys.length > CUSTOM_REFLECTION_CACHE_LIMIT) {
      reflectionFieldCache.delete(customKeys.shift());
    }
  }

  function loadReflectionField(descriptor) {
    if (reflectionFieldCache.has(descriptor.signature)) {
      const cached = reflectionFieldCache.get(descriptor.signature);
      if (descriptor.custom) {
        reflectionFieldCache.delete(descriptor.signature);
        reflectionFieldCache.set(descriptor.signature, cached);
      }
      return cached;
    }
    let pending;
    pending = loadReflectionImage(descriptor)
      .then((image) => ({
        ...descriptor,
        canvas: normalizeReflectionImage(image),
      }))
      .catch((error) => {
        if (reflectionFieldCache.get(descriptor.signature) === pending) {
          reflectionFieldCache.delete(descriptor.signature);
        }
        throw error;
      });
    reflectionFieldCache.set(descriptor.signature, pending);
    if (descriptor.custom) trimCustomReflectionCache();
    return pending;
  }

  function createReflectionTexture(canvas) {
    const nextTexture = gl.createTexture();
    if (!nextTexture) throw new Error("无法创建反射纹理");
    try {
      for (let index = 0; index < 8 && gl.getError() !== gl.NO_ERROR; index += 1) {
        // Clear errors left by unrelated optional paths before checking upload.
      }
      gl.activeTexture(gl.TEXTURE5);
      gl.bindTexture(gl.TEXTURE_2D, nextTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.generateMipmap(gl.TEXTURE_2D);
      const error = gl.getError();
      if (error !== gl.NO_ERROR) throw new Error(`反射纹理上传失败（0x${error.toString(16)}）`);
      return nextTexture;
    } catch (error) {
      gl.deleteTexture(nextTexture);
      throw error;
    }
  }

  function swapReflectionTexture(nextTexture) {
    const previousTexture = colorFieldTexture;
    colorFieldTexture = nextTexture;
    gl.deleteTexture(previousTexture);
  }

  function drawReflectionPreview(canvas, source) {
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
  }

  async function buildReflectionGallery() {
    const results = await Promise.allSettled(ui.reflectionStyleCards.map(async (card) => {
      const descriptor = reflectionDescriptor(card.dataset.reflectionStyle);
      const asset = await loadReflectionField(descriptor);
      drawReflectionPreview(card.querySelector("canvas"), asset.canvas);
      return card;
    }));
    results.forEach((result, index) => {
      const card = ui.reflectionStyleCards[index];
      const failed = result.status === "rejected";
      card.toggleAttribute("data-load-error", failed);
      if (failed) card.title = result.reason?.message || "反射场加载失败";
    });
  }

  async function requestReflection(descriptor, {
    commit,
    announce = "",
    loadingMessage = "",
    successMessage = "",
    preserveStatus = false,
  } = {}) {
    const requestId = ++reflectionRequestId;
    if (loadingMessage) {
      setReflectionRequestBusy(true);
      setCustomReflectionStatus(loadingMessage);
    } else {
      setReflectionRequestBusy(false);
      if (!preserveStatus) setCustomReflectionStatus();
    }
    try {
      const asset = await loadReflectionField(descriptor);
      if (requestId !== reflectionRequestId) return { status: "stale" };
      const nextTexture = createReflectionTexture(asset.canvas);
      if (requestId !== reflectionRequestId) {
        gl.deleteTexture(nextTexture);
        return { status: "stale" };
      }
      if (commit) commit(asset);
      swapReflectionTexture(nextTexture);
      setReflectionRequestBusy(false);
      if (successMessage) setCustomReflectionStatus(successMessage, "success");
      else if (!preserveStatus) setCustomReflectionStatus();
      syncReflectionSelection();
      if (announce) ui.materialAnnouncement.textContent = announce;
      render();
      return { status: "applied", asset };
    } catch (error) {
      if (requestId !== reflectionRequestId) return { status: "stale" };
      setReflectionRequestBusy(false);
      setCustomReflectionStatus(error.message || "反射场加载失败", "error");
      syncReflectionSelection();
      render();
      return { status: "failed", error };
    }
  }

  function syncReflectionSelection() {
    const firstBuiltinStyle = Object.keys(REFLECTION_SOURCES)[0] || "";
    const safeStyle = state.reflectionStyle === "custom" || REFLECTION_SOURCES[state.reflectionStyle]
      ? state.reflectionStyle
      : firstBuiltinStyle;
    const chromeActive = activePreset().mode !== 1;
    ui.reflectionStyleSelect.value = safeStyle;
    ui.reflectionStyleCards.forEach((card) => {
      const active = card.dataset.reflectionStyle === safeStyle;
      card.classList.toggle("is-active", active);
      card.setAttribute("aria-pressed", String(active));
      card.disabled = !chromeActive;
      card.setAttribute("aria-disabled", String(!chromeActive));
    });
  }

  function getPresetFallbackReflectionStyle() {
    // Liquid's canonical fallback is ROSE CITADEL. Other chrome presets keep
    // their own built-in default when it still exists. This deliberately does
    // not assume any retired reflection field remains registered.
    if (state.activePreset === "liquid" && REFLECTION_SOURCES.rose) return "rose";
    const presetDefault = activePreset().settings.reflectionStyle;
    if (REFLECTION_SOURCES[presetDefault]) return presetDefault;
    return REFLECTION_SOURCES.rose ? "rose" : (Object.keys(REFLECTION_SOURCES)[0] || "");
  }

  async function selectReflectionStyle(styleKey) {
    if (styleKey === "custom") {
      invalidateReflectionRequest();
      syncReflectionSelection();
      setCustomReflectionStatus("输入图片 URL 后点击 APPLY");
      ui.customReflectionUrlInput.focus();
      return;
    }
    if (!REFLECTION_SOURCES[styleKey]) return;
    // The native select has already changed visually. Keep the committed
    // style selected until the candidate image has loaded and uploaded.
    syncReflectionSelection();
    const descriptor = reflectionDescriptor(styleKey);
    await requestReflection(descriptor, {
      commit: () => writePresetSetting("reflectionStyle", styleKey),
      announce: `已应用 ${REFLECTION_STYLES[styleKey]} 反射场`,
    });
  }

  async function applyCustomReflectionUrl() {
    // A rejected APPLY is still the newest user intent and must supersede an
    // older in-flight request before validation starts.
    invalidateReflectionRequest();
    let descriptor;
    try {
      descriptor = reflectionDescriptor("custom", ui.customReflectionUrlInput.value);
    } catch (error) {
      setCustomReflectionStatus(error.message, "error");
      syncReflectionSelection();
      return;
    }
    await requestReflection(descriptor, {
      loadingMessage: "正在加载并处理 1024 × 512 反射场…",
      successMessage: "自定义反射场已应用",
      announce: "已应用自定义反射场",
      commit: (asset) => {
        writePresetSetting("customReflectionUrl", asset.url);
        writePresetSetting("reflectionStyle", "custom");
        ui.customReflectionUrlInput.value = asset.url;
      },
    });
  }

  async function loadPresetReflection(presetKey) {
    if (state.activePreset !== presetKey || activePreset().mode === 1) return;
    let descriptor;
    try {
      descriptor = reflectionDescriptor(state.reflectionStyle, state.customReflectionUrl);
    } catch (error) {
      setCustomReflectionStatus(error.message, "error");
      syncReflectionSelection();
      return;
    }
    const result = await requestReflection(descriptor, {
      loadingMessage: descriptor.custom ? "正在恢复自定义反射场…" : "",
      successMessage: descriptor.custom ? "自定义反射场已恢复" : "",
    });
    if (result.status !== "failed"
      || !descriptor.custom
      || state.activePreset !== presetKey
      || state.reflectionStyle !== "custom") return;

    const originalError = result.error?.message || "自定义反射场不可用";
    const fallbackStyle = getPresetFallbackReflectionStyle();
    if (!fallbackStyle) return;
    const fallback = await requestReflection(reflectionDescriptor(fallbackStyle), {
      preserveStatus: true,
      commit: () => writePresetSetting("reflectionStyle", fallbackStyle),
    });
    if (fallback.status === "applied") {
      syncControls();
      syncReflectionSelection();
      setCustomReflectionStatus(
        `${originalError}；已回退 ${REFLECTION_STYLES[fallbackStyle]}`,
        "error",
      );
    } else if (fallback.status === "failed") {
      setCustomReflectionStatus(
        `${originalError}；回退失败：${fallback.error?.message || "反射场不可用"}`,
        "error",
      );
    }
  }

  let cachedNormalBake = null;
  let bakedDisplayFont = "";
  let bakedTracking = NaN;
  function buildNoiseTexture() {
    const size = 64;
    const pixels = createNoiseField(size, 8);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    drawGeneratedAsset("flow", size, size, (output, index, sourceIndex) => {
      const flowX = pixels[sourceIndex] / 255;
      const flowY = pixels[sourceIndex + 1] / 255;
      writeRgb(
        output,
        index,
        10 + flowX * 34 + flowY * 190,
        8 + flowX * 208 + flowY * 35,
        24 + flowX * 220 + flowY * 170,
      );
    });
    drawGeneratedAsset("grain", size, size, (output, index, sourceIndex) => {
      const grain = pixels[sourceIndex + 2];
      writeRgb(output, index, grain, grain, grain);
    });
  }

  function segmentText(value) {
    if ("Segmenter" in Intl) {
      const segmenter = new Intl.Segmenter("zh-CN", { granularity: "grapheme" });
      return [...segmenter.segment(value)].map((item) => item.segment);
    }
    return Array.from(value);
  }

  function measureLine(glyphs, fontSize) {
    sourceContext.font = `900 ${fontSize}px ${activeDisplayFont()}`;
    return glyphs.reduce(
      (total, glyph, index) => total + sourceContext.measureText(glyph).width + (index ? state.tracking : 0),
      0,
    );
  }

  function fitLayout(lines) {
    let fontSize = 620;
    const maxWidth = TEXTURE_WIDTH * (activePreset().mode === 1 ? 0.96 : 0.90);
    const maxHeight = TEXTURE_HEIGHT * 0.78;
    while (fontSize > 80) {
      const widths = lines.map((line) => measureLine(line, fontSize));
      const totalHeight = lines.length * fontSize * state.lineHeight;
      if (Math.max(...widths, 0) <= maxWidth && totalHeight <= maxHeight) {
        return { fontSize, widths, totalHeight };
      }
      fontSize -= 6;
    }
    const widths = lines.map((line) => measureLine(line, fontSize));
    return { fontSize, widths, totalHeight: lines.length * fontSize * state.lineHeight };
  }

  function edt1d(f, d, v, z, length) {
    let firstSite = -1;
    for (let index = 0; index < length; index += 1) {
      if (f[index] < INF * 0.5) {
        firstSite = index;
        break;
      }
    }
    if (firstSite < 0) {
      d.fill(INF, 0, length);
      return;
    }

    let k = 0;
    v[0] = firstSite;
    z[0] = -INF;
    z[1] = INF;
    for (let q = firstSite + 1; q < length; q += 1) {
      if (f[q] >= INF * 0.5) continue;
      let s;
      while (true) {
        const p = v[k];
        s = ((f[q] + q * q) - (f[p] + p * p)) / (2 * q - 2 * p);
        if (k === 0 || s > z[k]) break;
        k -= 1;
      }
      k += 1;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    const lastEnvelope = k;
    k = 0;
    for (let q = 0; q < length; q += 1) {
      while (k < lastEnvelope && z[k + 1] < q) k += 1;
      const delta = q - v[k];
      d[q] = delta * delta + f[v[k]];
    }
  }

  function edt2d(data, width, height) {
    const maxLength = Math.max(width, height);
    const f = new Float64Array(maxLength);
    const d = new Float64Array(maxLength);
    const v = new Int32Array(maxLength);
    const z = new Float64Array(maxLength + 1);

    for (let x = 0; x < width; x += 1) {
      for (let y = 0; y < height; y += 1) f[y] = data[y * width + x];
      edt1d(f, d, v, z, height);
      for (let y = 0; y < height; y += 1) data[y * width + x] = d[y];
    }
    for (let y = 0; y < height; y += 1) {
      const row = y * width;
      for (let x = 0; x < width; x += 1) f[x] = data[row + x];
      edt1d(f, d, v, z, width);
      for (let x = 0; x < width; x += 1) data[row + x] = d[x];
    }
  }

  function encodeNormalized16(value) {
    const packed = Math.round(Math.max(0, Math.min(1, value)) * 65535);
    return [packed >> 8, packed & 255];
  }

  function writeArtworkNormalMap(
    bodyHeight,
    faceHeight,
    shadingField,
    normalPixels,
    width,
    height,
  ) {
    const sample = (x, y) => (
      x < 0 || x >= width || y < 0 || y >= height
        ? -SHADING_SDF_SPREAD
        : shadingField[y * width + x]
    );
    const sampleHeight = (field, x, y) => (
      x < 0 || x >= width || y < 0 || y >= height
        ? 0
        : field[y * width + x]
    );
    const sampleStep = 5;
    const bodyScale = state.bodyCrown * 1.3;
    // FACE CURVE uses its own fixed amplitude reference. BODY CROWN no longer
    // multiplies it, so the controls remain independent normal sources.
    const faceScale = state.faceCurve / 100
      * FACE_CURVE_REFERENCE_CROWN * 1.3;
    const edgeWidth = Math.max(state.edgeWidth, 3);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const surfaceDistance = shadingField[y * width + x] + BODY_INFLATE;
        if (surfaceDistance < -4) continue;

        const bodyGradientX = (
          sampleHeight(bodyHeight, x + sampleStep, y)
          - sampleHeight(bodyHeight, x - sampleStep, y)
        ) / (sampleStep * 2);
        const bodyGradientY = (
          sampleHeight(bodyHeight, x, y + sampleStep)
          - sampleHeight(bodyHeight, x, y - sampleStep)
        ) / (sampleStep * 2);
        const faceGradientX = (
          sampleHeight(faceHeight, x + sampleStep, y)
          - sampleHeight(faceHeight, x - sampleStep, y)
        ) / (sampleStep * 2);
        const faceGradientY = (
          sampleHeight(faceHeight, x, y + sampleStep)
          - sampleHeight(faceHeight, x, y - sampleStep)
        ) / (sampleStep * 2);
        const bodyRawX = -bodyGradientX * bodyScale;
        const bodyRawY = -bodyGradientY * bodyScale;
        const bodyRawLength = Math.hypot(bodyRawX, bodyRawY);
        const bodySlope = BODY_MAX_SLOPE
          * (1 - Math.exp(-bodyRawLength / BODY_MAX_SLOPE));
        let normalX = bodyRawLength > 0.0001 ? bodyRawX * bodySlope / bodyRawLength : 0;
        let normalY = bodyRawLength > 0.0001 ? bodyRawY * bodySlope / bodyRawLength : 0;
        const faceRawX = -faceGradientX * faceScale;
        const faceRawY = -faceGradientY * faceScale;
        const faceRawLength = Math.hypot(faceRawX, faceRawY);
        const faceSlope = FACE_MAX_SLOPE
          * (1 - Math.exp(-faceRawLength / FACE_MAX_SLOPE));
        if (faceRawLength > 0.0001) {
          normalX += faceRawX * faceSlope / faceRawLength;
          normalY += faceRawY * faceSlope / faceRawLength;
        }

        const edgeGradientX = (sample(x + 1, y) - sample(x - 1, y)) / 2;
        const edgeGradientY = (sample(x, y + 1) - sample(x, y - 1)) / 2;
        const edgeGradientLength = Math.hypot(edgeGradientX, edgeGradientY);
        const confidenceT = Math.max(0, Math.min(1, (edgeGradientLength - 0.08) / 0.24));
        const edgeConfidence = confidenceT * confidenceT * (3 - 2 * confidenceT);
        if (edgeConfidence > 0.0001) {
          const edgeX = Math.max(0, Math.min(1, surfaceDistance / edgeWidth));
          const rawEdgeSlope = (1 - edgeX) / Math.sqrt(Math.max(2 * edgeX - edgeX * edgeX, 0.018));
          const edgeSlope = 2.4 * (1 - Math.exp(-rawEdgeSlope / 2.4));
          const edgeFadeT = Math.max(0, Math.min(1, (edgeX - 0.62) / 0.38));
          const edgeFadeSmooth = edgeFadeT * edgeFadeT * (3 - 2 * edgeFadeT);
          const edgeWeight = (1 - edgeFadeSmooth) * edgeConfidence;
          const edgeNormalX = -edgeGradientX / edgeGradientLength * edgeSlope;
          const edgeNormalY = -edgeGradientY / edgeGradientLength * edgeSlope;
          // Add the bevel gradient to the body surface instead of replacing the
          // body normal inside a narrow handoff band. Replacement made strong
          // crowns dip and rise at the join, exposing a reflection boundary.
          normalX += edgeNormalX * edgeWeight;
          normalY += edgeNormalY * edgeWeight;
        }

        const inverseLength = 1 / Math.sqrt(normalX * normalX + normalY * normalY + 1);
        const output = (y * width + x) * 4;
        normalPixels[output] = Math.round((normalX * inverseLength * 0.5 + 0.5) * 255);
        // Store a conventional +Y-up tangent normal even though the CPU fields
        // are indexed in canvas coordinates where rows increase downward.
        normalPixels[output + 1] = Math.round((-normalY * inverseLength * 0.5 + 0.5) * 255);
        normalPixels[output + 2] = Math.round((inverseLength * 0.5 + 0.5) * 255);
        normalPixels[output + 3] = 255;
      }
    }
  }

  function uploadNormalMap(normalPixels) {
    drawGeneratedAsset("normal", TEXTURE_WIDTH, TEXTURE_HEIGHT, (output, index, sourceIndex) => {
      const normalX = normalPixels[sourceIndex] / 255 * 2 - 1;
      const normalY = normalPixels[sourceIndex + 1] / 255 * 2 - 1;
      const normalZ = normalPixels[sourceIndex + 2] / 255 * 2 - 1;
      writeRgb(
        output,
        index,
        (normalX * 0.5 + 0.5) * 255,
        (normalY * 0.5 + 0.5) * 255,
        normalZ * 255,
      );
    });
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, normalTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      TEXTURE_WIDTH,
      TEXTURE_HEIGHT,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      normalPixels,
    );
  }

  function rebuildNormalTexture() {
    if (!cachedNormalBake) {
      rebuildTextures();
      return;
    }
    const startedAt = performance.now();
    const normalPixels = new Uint8Array(TEXTURE_WIDTH * TEXTURE_HEIGHT * 4);
    for (let index = 0; index < normalPixels.length; index += 4) {
      normalPixels[index] = 128;
      normalPixels[index + 1] = 128;
      normalPixels[index + 2] = 255;
      normalPixels[index + 3] = 255;
    }
    writeArtworkNormalMap(
      cachedNormalBake.smoothHeight,
      cachedNormalBake.faceHeight,
      cachedNormalBake.shadingField,
      normalPixels,
      TEXTURE_WIDTH,
      TEXTURE_HEIGHT,
    );
    uploadNormalMap(normalPixels);
    ui.buildTime.textContent = `${Math.round(performance.now() - startedAt)} MS`;
    ui.renderStatus.textContent = "NORMAL BAKE READY";
    render();
  }

  function createSemanticIdPixels(alphaPixels, glyphs) {
    const pixelCount = TEXTURE_WIDTH * TEXTURE_HEIGHT;
    const ownerCoverage = new Uint8Array(pixelCount);
    const semanticIds = new Uint8Array(pixelCount);
    idContext.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
    idContext.font = sourceContext.font;
    idContext.textBaseline = "alphabetic";
    idContext.fillStyle = "#ffffff";

    glyphs.forEach((record) => {
      const left = Math.max(0, Math.floor(record.inkLeft) - 8);
      const top = Math.max(0, Math.floor(record.inkTop) - 8);
      const right = Math.min(TEXTURE_WIDTH, Math.ceil(record.inkRight) + 8);
      const bottom = Math.min(TEXTURE_HEIGHT, Math.ceil(record.inkBottom) + 8);
      const width = right - left;
      const height = bottom - top;
      if (width <= 0 || height <= 0) return;

      idContext.clearRect(left, top, width, height);
      idContext.fillText(record.glyph, record.x, record.baseline);
      const mask = idContext.getImageData(left, top, width, height).data;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const maskAlpha = mask[(y * width + x) * 4 + 3];
          if (maskAlpha === 0) continue;
          const pixel = (top + y) * TEXTURE_WIDTH + left + x;
          // Maximum local coverage gives overlapping glyphs one deterministic,
          // valid ID without ever blending two integer labels together.
          if (maskAlpha >= ownerCoverage[pixel]) {
            ownerCoverage[pixel] = maskAlpha;
            semanticIds[pixel] = record.idByte;
          }
        }
      }
    });

    const idPixels = new Uint8Array(pixelCount * 4);
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const output = pixel * 4;
      const idByte = alphaPixels[output + 3] > 0 ? semanticIds[pixel] : 0;
      idPixels[output] = idByte;
      idPixels[output + 1] = idByte;
      idPixels[output + 3] = 255;
    }
    return idPixels;
  }

  function createGlyphMetadataPixels(glyphs) {
    const pixels = new Uint8Array(256 * 2 * 4);
    glyphs.forEach((record) => {
      const centerX = (record.inkLeft + record.inkRight) * 0.5 / TEXTURE_WIDTH;
      const centerY = (record.inkTop + record.inkBottom) * 0.5 / TEXTURE_HEIGHT;
      const width = Math.max(1, record.inkRight - record.inkLeft) / TEXTURE_WIDTH;
      const height = Math.max(1, record.inkBottom - record.inkTop) / TEXTURE_HEIGHT;
      const centerXBytes = encodeNormalized16(centerX);
      const centerYBytes = encodeNormalized16(centerY);
      const widthBytes = encodeNormalized16(width);
      const heightBytes = encodeNormalized16(height);
      const centerOffset = record.idByte * 4;
      const sizeOffset = (256 + record.idByte) * 4;
      pixels[centerOffset] = centerXBytes[0];
      pixels[centerOffset + 1] = centerXBytes[1];
      pixels[centerOffset + 2] = centerYBytes[0];
      pixels[centerOffset + 3] = centerYBytes[1];
      pixels[sizeOffset] = widthBytes[0];
      pixels[sizeOffset + 1] = widthBytes[1];
      pixels[sizeOffset + 2] = heightBytes[0];
      pixels[sizeOffset + 3] = heightBytes[1];
    });
    return pixels;
  }
  function rebuildTextures() {
    const startedAt = performance.now();
    cachedNormalBake = null;
    bakedDisplayFont = activeDisplayFont();
    bakedTracking = state.tracking;
    ui.renderStatus.textContent = "BUILDING SDF";
    const rawLines = state.text.replace(/\r/g, "").split("\n").slice(0, 3);
    const lines = rawLines.map((line) => segmentText(line).slice(0, 18));
    const layout = fitLayout(lines);
    const lineHeightPx = layout.fontSize * state.lineHeight;
    const firstBaseline = (TEXTURE_HEIGHT - layout.totalHeight) * 0.5 + layout.fontSize * 0.80;

    sourceContext.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
    idContext.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
    sourceContext.font = `900 ${layout.fontSize}px ${bakedDisplayFont}`;
    sourceContext.textBaseline = "alphabetic";
    sourceContext.fillStyle = "#ffffff";

    const recordsByLine = [];
    const visibleGlyphs = lines.flat().filter((glyph) => glyph.trim() !== "");
    let glyphIndex = 0;

    lines.forEach((glyphs, lineIndex) => {
      const baseline = firstBaseline + lineIndex * lineHeightPx;
      let x = (TEXTURE_WIDTH - layout.widths[lineIndex]) * 0.5;
      const records = [];
      glyphs.forEach((glyph, index) => {
        const metrics = sourceContext.measureText(glyph);
        const width = metrics.width;
        if (glyph.trim() !== "") {
          const idByte = visibleGlyphs.length === 1
            ? 127
            : Math.round(1 + (glyphIndex * 253) / Math.max(visibleGlyphs.length - 1, 1));
          const inkLeft = x - (metrics.actualBoundingBoxLeft || 0);
          const inkRight = x + (metrics.actualBoundingBoxRight || width);
          const inkTop = baseline - (metrics.actualBoundingBoxAscent || layout.fontSize * 0.78);
          const inkBottom = baseline + (metrics.actualBoundingBoxDescent || layout.fontSize * 0.20);
          sourceContext.fillText(glyph, x, baseline);
          records.push({
            glyph,
            idByte,
            x,
            width,
            inkLeft,
            inkRight,
            inkTop,
            inkBottom,
            baseline,
            lineIndex,
            index,
          });
          glyphIndex += 1;
        }
        x += width + (index < glyphs.length - 1 ? state.tracking : 0);
      });
      recordsByLine.push(records);
    });

    state.glyphs = recordsByLine.flat();

    const alphaPixels = sourceContext.getImageData(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT).data;
    let artworkLeft = TEXTURE_WIDTH;
    let artworkRight = -1;
    let artworkTop = TEXTURE_HEIGHT;
    let artworkBottom = -1;
    const shapePixels = new Uint8Array(TEXTURE_WIDTH * TEXTURE_HEIGHT * 4);
    const distancePixels = new Uint8Array(TEXTURE_WIDTH * TEXTURE_HEIGHT * 4);
    const normalPixels = new Uint8Array(TEXTURE_WIDTH * TEXTURE_HEIGHT * 4);
    for (let index = 0; index < shapePixels.length; index += 4) {
      if (alphaPixels[index + 3] > 0) {
        const pixel = index / 4;
        const x = pixel % TEXTURE_WIDTH;
        const y = Math.floor(pixel / TEXTURE_WIDTH);
        artworkLeft = Math.min(artworkLeft, x);
        artworkRight = Math.max(artworkRight, x + 1);
        artworkTop = Math.min(artworkTop, y);
        artworkBottom = Math.max(artworkBottom, y + 1);
      }
      shapePixels[index] = 0;
      shapePixels[index + 1] = 0;
      shapePixels[index + 2] = alphaPixels[index + 3];
      shapePixels[index + 3] = 255;
      normalPixels[index] = 128;
      normalPixels[index + 1] = 128;
      normalPixels[index + 2] = 255;
      normalPixels[index + 3] = 255;
    }
    state.artworkBounds = artworkRight > artworkLeft && artworkBottom > artworkTop
      ? [
        (artworkLeft + artworkRight) * 0.5 / TEXTURE_WIDTH,
        (artworkTop + artworkBottom) * 0.5 / TEXTURE_HEIGHT,
        (artworkRight - artworkLeft) / TEXTURE_WIDTH,
        (artworkBottom - artworkTop) / TEXTURE_HEIGHT,
      ]
      : [0.5, 0.5, 0.90, 0.78];
    const idPixels = createSemanticIdPixels(alphaPixels, state.glyphs);
    const glyphMetadataPixels = createGlyphMetadataPixels(state.glyphs);

    if (state.glyphs.length > 0) {
      const width = TEXTURE_WIDTH;
      const height = TEXTURE_HEIGHT;
      const length = width * height;
      const outer = new Float64Array(length);
      const inner = new Float64Array(length);
      for (let pixel = 0; pixel < length; pixel += 1) {
          const alpha = alphaPixels[pixel * 4 + 3] / 255;
          if (alpha >= 1) {
            outer[pixel] = 0;
            inner[pixel] = INF;
          } else if (alpha <= 0) {
            outer[pixel] = INF;
            inner[pixel] = 0;
          } else {
            outer[pixel] = Math.pow(Math.max(0, 0.5 - alpha), 2);
            inner[pixel] = Math.pow(Math.max(0, alpha - 0.5), 2);
          }
      }
      edt2d(outer, width, height);
      edt2d(inner, width, height);
      const signedField = new Float32Array(length);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const localIndex = y * width + x;
          const signed = Math.sqrt(inner[localIndex]) - Math.sqrt(outer[localIndex]);
          signedField[localIndex] = signed;
        }
      }

      // Screened/blurred coverage creates a wide shallow face whose stronger
      // curvature is confined to the edge band.
      const bodySigma = Math.max(7, Math.min(14, layout.fontSize * 0.018));
      const smoothHeight = createArtworkBodyHeight(
        alphaPixels,
        width,
        height,
        bodySigma,
      );
      // A broader artwork-wide pressure field supplies the face curvature.
      // Unlike a nearest-edge / propagated-radius tube, this scalar field is
      // smooth through medial axes and multi-stroke joins, so Y/K/M junctions
      // cannot bake a skeleton-shaped crease into the normal map.
      const faceSigma = bodySigma * 2.25;
      const faceHeight = createArtworkBodyHeight(
        alphaPixels,
        width,
        height,
        faceSigma,
      );
      const shadingField = createArtworkShadingDistance(
        signedField,
        width,
        height,
        SHADING_SDF_SPREAD,
      );
      writeArtworkNormalMap(
        smoothHeight,
        faceHeight,
        shadingField,
        normalPixels,
        width,
        height,
      );
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const localIndex = y * width + x;
          const signed = signedField[localIndex];
          const encoded = Math.max(0, Math.min(1, 0.5 + signed / (2 * SDF_SPREAD)));
          const outputIndex = localIndex * 4;
          const distance16 = Math.round(encoded * 65535);
          const bodyHeight16 = Math.round(Math.max(0, Math.min(1, smoothHeight[localIndex])) * 65535);
          const shadingEncoded = Math.max(
            0,
            Math.min(1, 0.5 + shadingField[localIndex] / (2 * SHADING_SDF_SPREAD)),
          );
          const shadingDistance16 = Math.round(shadingEncoded * 65535);
          distancePixels[outputIndex] = distance16 >> 8;
          distancePixels[outputIndex + 1] = distance16 & 255;
          distancePixels[outputIndex + 2] = shadingDistance16 >> 8;
          distancePixels[outputIndex + 3] = shadingDistance16 & 255;
          shapePixels[outputIndex] = bodyHeight16 >> 8;
          shapePixels[outputIndex + 1] = bodyHeight16 & 255;
        }
      }
      cachedNormalBake = {
        smoothHeight,
        faceHeight,
        shadingField,
      };
    }

    updateGlyphAssetPreviews(shapePixels, distancePixels, normalPixels, idPixels);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, shapeTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TEXTURE_WIDTH, TEXTURE_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, shapePixels);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, idTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TEXTURE_WIDTH, TEXTURE_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, idPixels);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, glyphMetadataTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, glyphMetadataPixels);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, distanceTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TEXTURE_WIDTH, TEXTURE_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, distancePixels);
    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, normalTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TEXTURE_WIDTH, TEXTURE_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, normalPixels);

    ui.glyphReadout.textContent = `${String(state.glyphs.length).padStart(2, "0")} GLYPHS`;
    ui.buildTime.textContent = `${Math.round(performance.now() - startedAt)} MS`;
    ui.renderStatus.textContent = "BAKE READY";
    render();
  }

  function hexToRgb(hex) {
    const value = Number.parseInt(hex.slice(1), 16);
    return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
  }

  function resizeCanvas() {
    const rect = ui.canvas.getBoundingClientRect();
    const dpr = Math.min((window.devicePixelRatio || 1) * 1.5, 3);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (ui.canvas.width !== width || ui.canvas.height !== height) {
      ui.canvas.width = width;
      ui.canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
  }

  function ensureSceneTarget(width, height) {
    if (sceneTargetWidth === width && sceneTargetHeight === height) return true;
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFramebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      sceneTexture,
      0,
    );
    const framebufferStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (framebufferStatus !== gl.FRAMEBUFFER_COMPLETE) {
      sceneTargetWidth = 0;
      sceneTargetHeight = 0;
      return false;
    }
    sceneTargetWidth = width;
    sceneTargetHeight = height;
    return true;
  }

  function render() {
    resizeCanvas();
    // Every material is baked to the canonical artboard first. The responsive
    // canvas is only a presentation surface. A future exporter must run the
    // same DOT/CRT/copy present pass into its final 1600x900 target.
    const bakeReady = ensureSceneTarget(TEXTURE_WIDTH, TEXTURE_HEIGHT);
    if (bakeReady) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFramebuffer);
      gl.viewport(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, ui.canvas.width, ui.canvas.height);
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(locations.position);
    gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);
    [
      [0, shapeTexture],
      [1, idTexture],
      [2, glyphMetadataTexture],
      [3, noiseTexture],
      [4, distanceTexture],
      [5, colorFieldTexture],
      [6, normalTexture],
    ].forEach(([unit, texture]) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    });
    gl.uniform1i(locations.shapeTexture, 0);
    gl.uniform1i(locations.idTexture, 1);
    gl.uniform1i(locations.glyphMetadataTexture, 2);
    gl.uniform1i(locations.noiseTexture, 3);
    gl.uniform1i(locations.distanceTexture, 4);
    gl.uniform1i(locations.colorFieldTexture, 5);
    gl.uniform1i(locations.normalTexture, 6);
    gl.uniform2f(locations.textureSize, TEXTURE_WIDTH, TEXTURE_HEIGHT);
    gl.uniform1f(locations.spread, SDF_SPREAD);
    gl.uniform1f(locations.edgeWidth, state.edgeWidth);
    gl.uniform1f(locations.reflection, state.reflection / 100);
    gl.uniform1f(locations.colorFieldStrength, state.colorField / 100);
    gl.uniform1f(locations.roughness, state.roughness / 100);
    gl.uniform3fv(locations.baseColor, hexToRgb(state.baseColor));
    gl.uniform1f(locations.envCoverage, state.envCoverage / 100);
    gl.uniform2f(
      locations.reflectionOffset,
      state.reflectionOffsetX / 100,
      state.reflectionOffsetY / 100,
    );
    gl.uniform1f(locations.liquidWarp, state.liquidWarp / 1000);
    gl.uniform1f(locations.dotPitch, state.dotPitch);
    gl.uniform1f(locations.dotOutlineLayers, state.dotOutlineLayers);
    gl.uniform1f(locations.glitchStrength, state.glitchStrength / 100);
    gl.uniform4fv(locations.artworkBounds, state.artworkBounds);
    gl.uniform1f(locations.extrusion, state.extrusion);
    gl.uniform1f(locations.glow, state.glow / 100);
    gl.uniform1f(locations.sceneDetail, state.sceneDetail / 100);
    gl.uniform3fv(locations.cyan, hexToRgb(state.cyan));
    gl.uniform3fv(locations.pink, hexToRgb(state.pink));
    gl.uniform1f(locations.debugId, state.debugId ? 1 : 0);
    gl.uniform1f(locations.materialMode, activePreset().mode);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (!bakeReady) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, ui.canvas.width, ui.canvas.height);
    const useDotPresent = activePreset().mode === 1 && !state.debugId;
    const useCrt = activePreset().mode > 1.5 && !state.debugId;
    const presentProgram = useDotPresent
      ? dotPresentProgram
      : (useCrt ? crtProgram : copyProgram);
    const presentLocations = useDotPresent
      ? dotPresentLocations
      : (useCrt ? crtLocations : copyLocations);
    gl.useProgram(presentProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(presentLocations.position);
    gl.vertexAttribPointer(presentLocations.position, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.uniform1i(presentLocations.sceneTexture, 7);
    if (useDotPresent) {
      gl.uniform2f(dotPresentLocations.sceneSize, TEXTURE_WIDTH, TEXTURE_HEIGHT);
      gl.uniform1f(dotPresentLocations.perspectiveAngle, state.perspectiveAngle);
      gl.uniform1f(dotPresentLocations.glow, state.glow / 100);
    } else if (useCrt) {
      gl.uniform2f(crtLocations.sceneSize, TEXTURE_WIDTH, TEXTURE_HEIGHT);
      gl.uniform1f(crtLocations.scanlineSpacing, state.vhsScanlineSpacing);
      gl.uniform1f(crtLocations.scanlineStrength, state.vhsScanlineStrength / 100);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  let rebuildTimer = 0;
  let normalBakeTimer = 0;
  let geometryRebuildPending = false;
  function scheduleRebuild() {
    window.clearTimeout(rebuildTimer);
    window.clearTimeout(normalBakeTimer);
    ui.renderStatus.textContent = "WAITING FOR INPUT";
    geometryRebuildPending = true;
    rebuildTimer = window.setTimeout(() => {
      geometryRebuildPending = false;
      rebuildTextures();
    }, 140);
  }

  function scheduleNormalBake() {
    if (geometryRebuildPending) return;
    window.clearTimeout(normalBakeTimer);
    ui.renderStatus.textContent = "WAITING FOR NORMAL BAKE";
    normalBakeTimer = window.setTimeout(rebuildNormalTexture, 80);
  }

  function setDebugView(debugId) {
    state.debugId = debugId;
    ui.materialViewButton.classList.toggle("is-active", !debugId);
    ui.idViewButton.classList.toggle("is-active", debugId);
    render();
  }

  function applyPresetBake() {
    if (bakedDisplayFont !== activeDisplayFont() || bakedTracking !== state.tracking) {
      scheduleRebuild();
      return;
    }
    if (activePreset().mode === 1) {
      window.clearTimeout(normalBakeTimer);
      render();
      return;
    }
    scheduleNormalBake();
  }

  function syncControls() {
    ui.textInput.value = state.text;
    ui.trackingInput.value = String(state.tracking);
    ui.lineHeightInput.value = String(state.lineHeight);
    ui.edgeWidthInput.value = String(state.edgeWidth);
    ui.bodyCrownInput.value = String(state.bodyCrown);
    ui.faceCurveInput.value = String(state.faceCurve);
    ui.reflectionInput.value = String(state.reflection);
    ui.colorFieldInput.value = String(state.colorField);
    ui.roughnessInput.value = String(state.roughness);
    ui.baseColorInput.value = state.baseColor;
    ui.envCoverageInput.value = String(state.envCoverage);
    ui.reflectionStyleSelect.value = state.reflectionStyle;
    ui.customReflectionUrlInput.value = state.customReflectionUrl || "";
    ui.reflectionOffsetXInput.value = String(state.reflectionOffsetX);
    ui.reflectionOffsetYInput.value = String(state.reflectionOffsetY);
    ui.liquidWarpInput.value = String(state.liquidWarp);
    ui.dotPitchInput.value = String(state.dotPitch);
    ui.dotOutlineLayersInput.value = String(state.dotOutlineLayers);
    ui.perspectiveAngleInput.value = String(state.perspectiveAngle);
    ui.glitchStrengthInput.value = String(state.glitchStrength);
    ui.vhsScanlineSpacingInput.value = String(state.vhsScanlineSpacing);
    ui.vhsScanlineStrengthInput.value = String(state.vhsScanlineStrength);
    ui.extrusionInput.max = activePreset().mode === 1 ? "80" : "24";
    ui.extrusionInput.value = String(state.extrusion);
    ui.glowInput.value = String(state.glow);
    ui.sceneDetailInput.value = String(state.sceneDetail);
    ui.cyanInput.value = state.cyan;
    ui.pinkInput.value = state.pink;
    ui.trackingValue.value = `${state.tracking} PX`;
    ui.lineHeightValue.value = `${state.lineHeight.toFixed(2)}×`;
    ui.edgeWidthValue.value = `${state.edgeWidth} PX`;
    ui.bodyCrownValue.value = String(state.bodyCrown);
    ui.faceCurveValue.value = `${state.faceCurve}%`;
    ui.reflectionValue.value = `${state.reflection}%`;
    ui.colorFieldValue.value = `${state.colorField}%`;
    ui.roughnessValue.value = `${state.roughness}%`;
    ui.envCoverageValue.value = `${state.envCoverage}%`;
    ui.reflectionOffsetXValue.value = `${state.reflectionOffsetX > 0 ? "+" : ""}${state.reflectionOffsetX}%`;
    ui.reflectionOffsetYValue.value = `${state.reflectionOffsetY > 0 ? "+" : ""}${state.reflectionOffsetY}%`;
    ui.liquidWarpValue.value = `${state.liquidWarp}%`;
    ui.dotPitchValue.value = `${state.dotPitch} PX`;
    ui.dotOutlineLayersValue.value = `${state.dotOutlineLayers} LAYERS`;
    ui.perspectiveAngleValue.value = `${state.perspectiveAngle}°`;
    ui.glitchStrengthValue.value = `${state.glitchStrength}%`;
    ui.vhsScanlineSpacingValue.value = `${state.vhsScanlineSpacing} PX`;
    ui.vhsScanlineStrengthValue.value = `${state.vhsScanlineStrength}%`;
    ui.extrusionValue.value = `${state.extrusion} PX`;
    ui.glowValue.value = `${state.glow}%`;
    ui.sceneDetailValue.value = `${state.sceneDetail}%`;
  }

  ui.textInput.addEventListener("input", (event) => {
    state.text = event.currentTarget.value;
    scheduleRebuild();
  });
  ui.trackingInput.addEventListener("input", (event) => {
    writePresetSetting("tracking", Number(event.currentTarget.value));
    ui.trackingValue.value = `${state.tracking} PX`;
    scheduleRebuild();
  });
  ui.lineHeightInput.addEventListener("input", (event) => {
    state.lineHeight = Number(event.currentTarget.value);
    ui.lineHeightValue.value = `${state.lineHeight.toFixed(2)}×`;
    scheduleRebuild();
  });
  const normalBakeKeys = new Set(["edgeWidth", "bodyCrown", "faceCurve"]);
  [
    [ui.edgeWidthInput, "edgeWidth", ui.edgeWidthValue, (value) => `${value} PX`],
    [ui.bodyCrownInput, "bodyCrown", ui.bodyCrownValue, (value) => String(value)],
    [ui.faceCurveInput, "faceCurve", ui.faceCurveValue, (value) => `${value}%`],
    [ui.reflectionInput, "reflection", ui.reflectionValue, (value) => `${value}%`],
    [ui.colorFieldInput, "colorField", ui.colorFieldValue, (value) => `${value}%`],
    [ui.roughnessInput, "roughness", ui.roughnessValue, (value) => `${value}%`],
    [ui.envCoverageInput, "envCoverage", ui.envCoverageValue, (value) => `${value}%`],
    [ui.reflectionOffsetXInput, "reflectionOffsetX", ui.reflectionOffsetXValue, (value) => `${value > 0 ? "+" : ""}${value}%`],
    [ui.reflectionOffsetYInput, "reflectionOffsetY", ui.reflectionOffsetYValue, (value) => `${value > 0 ? "+" : ""}${value}%`],
    [ui.liquidWarpInput, "liquidWarp", ui.liquidWarpValue, (value) => `${value}%`],
    [ui.dotPitchInput, "dotPitch", ui.dotPitchValue, (value) => `${value} PX`],
    [ui.dotOutlineLayersInput, "dotOutlineLayers", ui.dotOutlineLayersValue, (value) => `${value} LAYERS`],
    [ui.perspectiveAngleInput, "perspectiveAngle", ui.perspectiveAngleValue, (value) => `${value}°`],
    [ui.glitchStrengthInput, "glitchStrength", ui.glitchStrengthValue, (value) => `${value}%`],
    [ui.vhsScanlineSpacingInput, "vhsScanlineSpacing", ui.vhsScanlineSpacingValue, (value) => `${value} PX`],
    [ui.vhsScanlineStrengthInput, "vhsScanlineStrength", ui.vhsScanlineStrengthValue, (value) => `${value}%`],
    [ui.extrusionInput, "extrusion", ui.extrusionValue, (value) => `${value} PX`],
    [ui.glowInput, "glow", ui.glowValue, (value) => `${value}%`],
    [ui.sceneDetailInput, "sceneDetail", ui.sceneDetailValue, (value) => `${value}%`],
  ].forEach(([input, key, output, format]) => {
    input.addEventListener("input", (event) => {
      writePresetSetting(key, Number(event.currentTarget.value));
      output.value = format(state[key]);
      if (normalBakeKeys.has(key)) scheduleNormalBake();
      else render();
    });
  });
  ui.reflectionStyleSelect.addEventListener("change", (event) => {
    selectReflectionStyle(event.currentTarget.value);
  });
  ui.applyReflectionUrlButton.addEventListener("click", applyCustomReflectionUrl);
  ui.customReflectionUrlInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    applyCustomReflectionUrl();
  });
  ui.reflectionStyleCards.forEach((card) => {
    card.addEventListener("click", () => selectReflectionStyle(card.dataset.reflectionStyle));
  });
  ui.cyanInput.addEventListener("input", (event) => {
    writePresetSetting("cyan", event.currentTarget.value);
    render();
  });
  ui.pinkInput.addEventListener("input", (event) => {
    writePresetSetting("pink", event.currentTarget.value);
    render();
  });
  ui.baseColorInput.addEventListener("input", (event) => {
    writePresetSetting("baseColor", event.currentTarget.value);
    render();
  });
  ui.materialViewButton.addEventListener("click", () => setDebugView(false));
  ui.idViewButton.addEventListener("click", () => setDebugView(true));
  ui.presetCards.forEach((card) => {
    card.addEventListener("click", () => {
      selectPreset(card.dataset.materialPreset);
    });
  });
  ui.resetButton.addEventListener("click", () => {
    invalidateReflectionRequest();
    settingsByPreset[state.activePreset] = { ...activePreset().settings };
    Object.assign(state, settingsByPreset[state.activePreset], { debugId: false });
    syncControls();
    syncPresetSelection();
    state.debugId = false;
    ui.materialViewButton.classList.add("is-active");
    ui.idViewButton.classList.remove("is-active");
    applyPresetBake();
    if (activePreset().mode !== 1) loadPresetReflection(state.activePreset);
  });
  window.addEventListener("resize", render, { passive: true });

  const rendererInfo = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = rendererInfo
    ? gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL)
    : gl.getParameter(gl.RENDERER);
  ui.gpuStatus.textContent = `WEBGL 2 · ${renderer}`;
  buildNoiseTexture();
  buildReflectionGallery().catch((error) => {
    ui.renderError.hidden = false;
    ui.renderError.textContent = error.message;
  });
  syncControls();
  syncPresetSelection();
  loadPresetReflection(state.activePreset);
  document.fonts.ready.then(rebuildTextures);
})();
