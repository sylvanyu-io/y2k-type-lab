(() => {
  "use strict";

  const TEXTURE_WIDTH = 1600;
  const TEXTURE_HEIGHT = 900;
  const SDF_SPREAD = 72;
  const SHADING_SDF_SPREAD = 24;
  const BODY_INFLATE = 3.5;
  const INF = 1e20;
  const DISPLAY_FONT = '"Arial Rounded MT Bold", "Yuanti SC", "Hiragino Maru Gothic ProN", "Avenir Next", "PingFang SC", sans-serif';
  const DEBUG_SURFACE = new URLSearchParams(window.location.search).get("debug") || "";
  const {
    createGlyphBodyHeight,
    createGlyphShadingDistance,
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
    custom: "CUSTOM URL",
  });
  const REFLECTION_SOURCES = Object.freeze({
    rose: "./assets/reflection-fields/rose-citadel.webp?v=2",
    arctic: "./assets/reflection-fields/ice-citadel.webp?v=3",
    sunset: "./assets/reflection-fields/solar-obsidian.webp?v=3",
    prism: "./assets/reflection-fields/prism-spectrum.webp?v=3",
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

  const state = { ...DEFAULTS, debugId: false, glyphs: [] };

  function activePreset() {
    return PRESETS[state.activePreset] || PRESETS[DEFAULT_PRESET_KEY];
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
    setDebugView(false);
    render();
    if (preset.mode !== 1) loadPresetReflection(key);
  }
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = TEXTURE_WIDTH;
  sourceCanvas.height = TEXTURE_HEIGHT;
  const sourceContext = sourceCanvas.getContext("2d", { alpha: true, willReadFrequently: true });

  const idCanvas = document.createElement("canvas");
  idCanvas.width = TEXTURE_WIDTH;
  idCanvas.height = TEXTURE_HEIGHT;
  const idContext = idCanvas.getContext("2d", { alpha: true });

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
    uniform sampler2D uBoundsTexture;
    uniform sampler2D uNoiseTexture;
    uniform sampler2D uColorFieldTexture;
    uniform sampler2D uNormalTexture;
    uniform vec2 uTextureSize;
    uniform float uSpread;
    uniform float uEdgeWidth;
    uniform float uBodyCrown;
    uniform float uReflection;
    uniform float uColorFieldStrength;
    uniform float uRoughness;
    uniform vec3 uBaseColor;
    uniform float uEnvCoverage;
    uniform vec2 uReflectionOffset;
    uniform float uLiquidWarp;
    uniform float uDotPitch;
    uniform float uGlitchStrength;
    uniform float uExtrusion;
    uniform float uGlow;
    uniform float uSceneDetail;
    uniform vec3 uCyan;
    uniform vec3 uPink;
    uniform float uDebugId;
    uniform float uMaterialMode;

    float unpack16(vec2 bytes) {
      vec2 integerBytes = floor(bytes * 255.0 + 0.5);
      return (integerBytes.x * 256.0 + integerBytes.y) / 65535.0;
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

    vec2 normalTap(vec2 uv) {
      vec4 packedNormal = texture(uNormalTexture, uv);
      vec4 bytes = floor(packedNormal * 255.0 + 0.5);
      vec2 encoded = vec2(
        (bytes.r * 256.0 + bytes.g) / 65535.0,
        (bytes.b * 256.0 + bytes.a) / 65535.0
      );
      return (encoded * 2.0 - 1.0) * 1.25;
    }

    vec2 sampleEdgeGradient16(vec2 uv) {
      vec2 pixel = uv * uTextureSize - 0.5;
      vec2 base = floor(pixel);
      vec2 fraction = fract(pixel);
      vec2 uv00 = (base + vec2(0.5, 0.5)) / uTextureSize;
      vec2 uv10 = (base + vec2(1.5, 0.5)) / uTextureSize;
      vec2 uv01 = (base + vec2(0.5, 1.5)) / uTextureSize;
      vec2 uv11 = (base + vec2(1.5, 1.5)) / uTextureSize;
      return mix(
        mix(normalTap(uv00), normalTap(uv10), fraction.x),
        mix(normalTap(uv01), normalTap(uv11), fraction.x),
        fraction.y
      );
    }

    float sampleCoverage(vec2 uv) {
      return sampleShapeData16(uv).y;
    }

    vec4 boundsForId(float id) {
      float idByte = floor(id * 255.0 + 0.5);
      float x = (idByte + 0.5) / 256.0;
      vec4 centerBytes = texture(uBoundsTexture, vec2(x, 0.25));
      vec4 sizeSeed = texture(uBoundsTexture, vec2(x, 0.75));
      return vec4(
        unpack16(centerBytes.rg),
        unpack16(centerBytes.ba),
        sizeSeed.r,
        sizeSeed.g
      );
    }

    float signedDistance(vec2 uv) {
      float encoded = sampleDistancePair16(uv).x;
      return (encoded * 2.0 - 1.0) * uSpread;
    }

    float insideTexture(vec2 uv) {
      vec2 minimum = step(vec2(0.0), uv);
      vec2 maximum = step(uv, vec2(1.0));
      return minimum.x * minimum.y * maximum.x * maximum.y;
    }

    float sameGlyphAt(vec2 uv, float expectedId) {
      float sampledId = texture(uIdTexture, uv).r;
      float sameId = 1.0 - step(0.5 / 255.0, abs(sampledId - expectedId));
      return insideTexture(uv) * sameId;
    }

    float gatedRawDistanceTap(vec2 uv, float expectedId) {
      float encoded = distanceTap(uv).x;
      float distancePx = (encoded * 2.0 - 1.0) * uSpread;
      return mix(-uSpread, distancePx, sameGlyphAt(uv, expectedId));
    }

    float safeRawDistancePx(vec2 uv, float expectedId) {
      vec2 pixel = uv * uTextureSize - 0.5;
      vec2 base = floor(pixel);
      vec2 fraction = fract(pixel);
      vec2 uv00 = (base + vec2(0.5, 0.5)) / uTextureSize;
      vec2 uv10 = (base + vec2(1.5, 0.5)) / uTextureSize;
      vec2 uv01 = (base + vec2(0.5, 1.5)) / uTextureSize;
      vec2 uv11 = (base + vec2(1.5, 1.5)) / uTextureSize;
      return mix(
        mix(
          gatedRawDistanceTap(uv00, expectedId),
          gatedRawDistanceTap(uv10, expectedId),
          fraction.x
        ),
        mix(
          gatedRawDistanceTap(uv01, expectedId),
          gatedRawDistanceTap(uv11, expectedId),
          fraction.x
        ),
        fraction.y
      );
    }

    float safeFillAt(vec2 uv, float expectedId, float aa) {
      float distancePx = safeRawDistancePx(uv, expectedId) + ${BODY_INFLATE.toFixed(1)};
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
      return vec2(
        0.50 + direction.x * 0.48,
        0.50 + direction.y * 0.48
      );
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
        vec3 base = mix(vec3(0.002, 0.008, 0.020), vec3(0.035, 0.002, 0.060), uv.y);
        float cyanHalo = exp(-dot((uv - vec2(0.24, 0.38)) * vec2(1.3, 1.8), (uv - vec2(0.24, 0.38)) * vec2(1.3, 1.8)) * 5.0);
        float pinkHalo = exp(-dot((uv - vec2(0.78, 0.64)) * vec2(1.5, 1.7), (uv - vec2(0.78, 0.64)) * vec2(1.5, 1.7)) * 6.0);
        base += uCyan * cyanHalo * 0.045 * uSceneDetail;
        base += uPink * pinkHalo * 0.055 * uSceneDetail;
        float gridX = exp(-1400.0 * abs(fract(uv.x * 16.0) - 0.5));
        float gridY = exp(-1400.0 * abs(fract(uv.y * 9.0) - 0.5));
        base += vec3(0.08, 0.13, 0.19) * (gridX + gridY) * 0.18 * uSceneDetail;
        return base;
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

    vec4 dotGlitchMaterial(
      vec2 uv,
      float id,
      vec2 localPx,
      float aa
    ) {
      float idByte = floor(id * 255.0 + 0.5);
      float strength = uGlitchStrength;
      float pitch = max(5.0, uDotPitch);

      // Sparse, taller slices read as intentional signal tears instead of a
      // fine per-row wobble. The glyph id keeps every split deterministic.
      float sliceHeight = mix(26.0, 12.0, strength);
      float sliceRow = floor((localPx.y + 4096.0) / sliceHeight);
      float sliceNoise = hash21(vec2(idByte * 1.17, sliceRow));
      float tearGate = step(mix(0.992, 0.82, strength), sliceNoise);
      float tearDirection = hash21(vec2(sliceRow, idByte * 2.31)) * 2.0 - 1.0;
      float tearPx = tearDirection * mix(5.0, 32.0, strength) * tearGate;

      // Most dropped rows only remove the cyan face, revealing the persistent
      // magenta underprint. A few hard drops expose the background entirely.
      float lineHeight = max(2.2, pitch * 0.38);
      float lineRow = floor((localPx.y + 2048.0) / lineHeight);
      float lineNoise = hash21(vec2(idByte * 4.13, lineRow));
      float frontDrop = step(mix(0.998, 0.925, strength), lineNoise);
      float hardDrop = step(
        mix(0.9995, 0.978, strength),
        hash21(vec2(idByte * 7.91, lineRow + 31.0))
      );

      vec2 sourceUv = uv - vec2(tearPx / uTextureSize.x, 0.0);
      float tornFill = safeFillAt(sourceUv, id, aa);

      vec2 dotCell = fract((localPx - vec2(tearPx, 0.0)) / pitch) - 0.5;
      float dots = 1.0 - smoothstep(0.31, 0.45, length(dotCell));
      float core = tornFill * dots * (1.0 - frontDrop) * (1.0 - hardDrop);

      float cyanMisregister = safeFillAt(
        uv - vec2(mix(2.0, 5.5, strength), -1.0) / uTextureSize,
        id,
        aa
      ) * dots * (1.0 - hardDrop);

      float pinkTear = safeFillAt(
        uv - vec2((tearPx + mix(6.0, 11.0, strength)) / uTextureSize.x, 0.0),
        id,
        aa
      ) * dots * tearGate * (1.0 - hardDrop);

      vec2 underprintOffset = vec2(-0.62, -1.0) * max(10.0, uExtrusion);
      float underprintFill = safeFillAt(
        uv + underprintOffset / uTextureSize,
        id,
        aa
      ) * (1.0 - hardDrop);
      float underprint = underprintFill * mix(0.66, 1.0, dots);

      // A second, deeper ID-gated plate makes the magenta offset read as an
      // extrusion rather than a soft glow. It can only occupy this glyph's
      // padded cell because every displaced tap is checked by safeFillAt.
      float deepUnderprintFill = safeFillAt(
        uv + underprintOffset * 1.58 / uTextureSize,
        id,
        aa
      ) * (1.0 - hardDrop);
      float deepUnderprint = deepUnderprintFill * mix(0.52, 0.84, dots);

      // Independent sparse carrier rows create long signal trails. Four
      // ID-safe taps bridge a displaced slice into a broken horizontal streak
      // while padding prevents it from ever borrowing a neighbouring glyph.
      float carrierHeight = mix(4.2, 2.6, strength);
      float carrierRow = floor((uv.y * uTextureSize.y + 8192.0) / carrierHeight);
      float carrierSeed = hash21(vec2(carrierRow * 0.731, 17.0));
      float carrierGate = step(mix(0.998, 0.905, strength), carrierSeed);
      float carrierDirection = step(
        0.5,
        hash21(vec2(carrierRow * 1.91, 53.0))
      ) * 2.0 - 1.0;
      float carrierLength = carrierDirection
        * mix(18.0, 68.0, strength)
        * mix(0.72, 1.0, hash21(vec2(carrierRow + 9.0, 31.0)));
      float carrierA = safeFillAt(
        uv - vec2(carrierLength * 0.25 / uTextureSize.x, 0.0),
        id,
        aa
      );
      float carrierB = safeFillAt(
        uv - vec2(carrierLength * 0.50 / uTextureSize.x, 0.0),
        id,
        aa
      );
      float carrierC = safeFillAt(
        uv - vec2(carrierLength * 0.75 / uTextureSize.x, 0.0),
        id,
        aa
      );
      float carrierD = safeFillAt(
        uv - vec2(carrierLength / uTextureSize.x, 0.0),
        id,
        aa
      );
      float carrierFill = max(max(carrierA, carrierB), max(carrierC, carrierD));
      float carrierDash = mix(
        0.38,
        1.0,
        step(0.32, hash21(vec2(floor(uv.x * uTextureSize.x / 8.0), carrierRow)))
      );
      float signalTrail = carrierFill * carrierGate * carrierDash * (1.0 - hardDrop);
      float signalHead = carrierD * carrierGate * (1.0 - hardDrop);

      float microCell = hash21(vec2(
        idByte + floor(localPx.x / pitch),
        floor(localPx.y / pitch)
      ));
      vec3 coreColor = mix(uCyan, vec3(0.94, 1.0, 1.0), step(0.91, microCell) * 0.28);

      float alpha = deepUnderprint * 0.52;
      vec3 premultiplied = mix(vec3(0.28, 0.0, 0.52), uPink, 0.72) * alpha;
      float underprintAlpha = underprint * 0.88;
      premultiplied = uPink * underprintAlpha + premultiplied * (1.0 - underprintAlpha);
      alpha = underprintAlpha + alpha * (1.0 - underprintAlpha);
      float cyanAlpha = cyanMisregister * 0.24;
      premultiplied = uCyan * cyanAlpha + premultiplied * (1.0 - cyanAlpha);
      alpha = cyanAlpha + alpha * (1.0 - cyanAlpha);
      float tearAlpha = pinkTear * 0.66;
      premultiplied = uPink * tearAlpha + premultiplied * (1.0 - tearAlpha);
      alpha = tearAlpha + alpha * (1.0 - tearAlpha);

      float pinkTrailAlpha = signalTrail * mix(0.18, 0.48, strength);
      premultiplied = uPink * pinkTrailAlpha + premultiplied * (1.0 - pinkTrailAlpha);
      alpha = pinkTrailAlpha + alpha * (1.0 - pinkTrailAlpha);
      float cyanTrailAlpha = signalHead * mix(0.12, 0.38, strength);
      premultiplied = uCyan * cyanTrailAlpha + premultiplied * (1.0 - cyanTrailAlpha);
      alpha = cyanTrailAlpha + alpha * (1.0 - cyanTrailAlpha);

      premultiplied = coreColor * core + premultiplied * (1.0 - core);
      alpha = core + alpha * (1.0 - core);

      float slicePhase = fract((localPx.y + 4096.0) / sliceHeight);
      float distanceToSliceEdge = min(slicePhase, 1.0 - slicePhase) * sliceHeight;
      float tearEdge = (1.0 - smoothstep(0.35, 1.35, distanceToSliceEdge)) * tearGate * tornFill;
      float edgeAlpha = clamp(tearEdge * 0.42, 0.0, 1.0);
      vec3 edgeColor = mix(uPink, uCyan, 0.34);
      premultiplied = edgeColor * edgeAlpha + premultiplied * (1.0 - edgeAlpha);
      alpha = edgeAlpha + alpha * (1.0 - edgeAlpha);
      return vec4(premultiplied, alpha);
    }

    vec4 vhsChromeMaterial(
      vec2 uv,
      float id,
      vec2 localPx,
      float surfaceD,
      float fill,
      float aa,
      vec3 chrome
    ) {
      float idByte = floor(id * 255.0 + 0.5);
      float glyphSeed = fract(idByte * 0.6180339);
      float line = floor((localPx.y + 2048.0) / 3.0);
      float lineNoise = hash21(vec2(idByte * 1.37, line));
      float dropout = step(0.93, lineNoise);
      float offsetPx = (lineNoise * 2.0 - 1.0) * mix(1.4, 4.2, dropout);
      float redGhost = safeFillAt(
        uv + vec2(offsetPx / uTextureSize.x, 0.0),
        id,
        aa
      );
      float cyanGhost = safeFillAt(
        uv - vec2(offsetPx / uTextureSize.x, 0.0),
        id,
        aa
      );

      float expanded = smoothstep(-4.5 - aa, -4.5 + aa, surfaceD);
      float outerRing = max(expanded - fill, 0.0);
      float chromeLuma = dot(chrome, vec3(0.2126, 0.7152, 0.0722));
      vec3 posterChrome = mix(vec3(chromeLuma), chrome, 1.28);
      posterChrome *= mix(1.0, 0.66, dropout);
      posterChrome += uCyan * band(localPx.y / 170.0 + glyphSeed, 0.32, 0.16) * 0.14;
      posterChrome += uPink * band(localPx.y / 180.0 - glyphSeed, -0.18, 0.18) * 0.16;

      vec3 premultiplied = posterChrome * fill;
      premultiplied += vec3(1.0, 0.08, 0.48) * redGhost * dropout * 0.34;
      premultiplied += vec3(0.04, 0.92, 1.0) * cyanGhost * dropout * 0.38;
      premultiplied += mix(uPink, uCyan, glyphSeed) * outerRing * 0.72;
      float alpha = clamp(max(expanded, max(redGhost, cyanGhost) * dropout), 0.0, 1.0);
      return vec4(premultiplied, alpha);
    }

    void main() {
      vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
      float id = texture(uIdTexture, uv).r;
      float hasCell = step(0.002, id);
      vec3 background = backgroundColor(uv);

      if (uDebugId > 0.5) {
        float inkId = texture(uIdTexture, uv).g;
        float coverage = sampleCoverage(uv);
        vec3 debugColor = mix(vec3(0.008, 0.009, 0.014), idPalette(inkId), coverage);
        fragColor = vec4(debugColor, 1.0);
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

      // The body crown and edge roll are intentionally separate. Body height
      // comes from per-glyph blurred coverage, so strong curvature stays near
      // the silhouette and never inherits the glyph's medial axis.
      // both come from one smooth shading SDF, while raw SDF only clips shape.
      float bodyStepPx = 5.0;
      vec2 bodyStep = vec2(bodyStepPx) / uTextureSize;
      float bodyLeft = sampleShapeData16(uv - vec2(bodyStep.x, 0.0)).x;
      float bodyRight = sampleShapeData16(uv + vec2(bodyStep.x, 0.0)).x;
      float bodyTop = sampleShapeData16(uv - vec2(0.0, bodyStep.y)).x;
      float bodyBottom = sampleShapeData16(uv + vec2(0.0, bodyStep.y)).x;
      vec2 bodyGradient = vec2(bodyRight - bodyLeft, bodyBottom - bodyTop) / (bodyStepPx * 2.0);
      // BODY HEIGHT is normalized; convert it to a virtual balloon height in
      // source pixels. The previous 1x scale left the whole face nearly flat.
      vec2 rawBodyNormal = -bodyGradient * uBodyCrown * 1.3;
      float rawBodyLength = length(rawBodyNormal);
      float bodySlope = 0.64 * (1.0 - exp(-rawBodyLength / 0.64));
      vec2 bodyNormalXY = rawBodyNormal * bodySlope / max(rawBodyLength, 0.001);

      vec2 edgeGradient = sampleEdgeGradient16(uv);
      float edgeGradientLength = length(edgeGradient);
      float edgeConfidence = smoothstep(0.08, 0.32, edgeGradientLength);
      vec2 edgeDirection = edgeGradient / max(edgeGradientLength, 0.0001);
      ${DEBUG_SURFACE === "edge" ? `
        fragColor = vec4(edgeGradient * 0.38 + 0.5, edgeConfidence, 1.0);
        return;
      ` : ""}
      float effectiveEdgeWidth = max(uEdgeWidth, aa * 1.5);
      float edgeX = clamp(shadingSurfaceD / effectiveEdgeWidth, 0.0, 1.0);
      float rawEdgeSlope = (1.0 - edgeX) / sqrt(max(2.0 * edgeX - edgeX * edgeX, 0.018));
      float maxEdgeSlope = 2.4;
      float edgeSlope = maxEdgeSlope * (1.0 - exp(-rawEdgeSlope / maxEdgeSlope));
      float edgeMix = (1.0 - smoothstep(effectiveEdgeWidth * 0.62, effectiveEdgeWidth, shadingSurfaceD)) * edgeConfidence;
      vec2 edgeNormalXY = -edgeDirection * edgeSlope;
      vec2 normalXY = mix(bodyNormalXY, edgeNormalXY, edgeMix);

      vec4 glyphBounds = boundsForId(id);
      vec2 glyphSize = max(glyphBounds.zw, vec2(0.02));
      vec2 glyphLocal = clamp((uv - glyphBounds.xy) / glyphSize, vec2(-0.75), vec2(0.75));
      // A very shallow analytic crown keeps the broad face alive without
      // following individual strokes or creating a centre-line discontinuity.
      normalXY += glyphLocal * vec2(0.0024, 0.0017) * uBodyCrown * hasCell;

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
      float glyphSeed = fract(floor(id * 255.0 + 0.5) * 0.6180339);
      // Preserve a low-frequency per-glyph bias without turning the reflection
      // into a flat vertical decal. Surface normal remains the primary lookup.
      fieldUv += glyphLocal * vec2(0.020, 0.12);
      // Scale around the lookup centre so a broad, nearly flat glyph face can
      // traverse more of the environment without distorting its normal. Keep
      // Y expansion conservative so the field retains a stable horizon.
      vec2 coverageScale = vec2(
        uEnvCoverage,
        1.0 + (uEnvCoverage - 1.0) * 0.35
      );
      fieldUv = vec2(0.5) + (fieldUv - vec2(0.5)) * coverageScale;
      fieldUv.x += (glyphSeed - 0.5) * 0.028;
      fieldUv += uReflectionOffset;
      fieldUv.y = clamp(fieldUv.y, 0.002, 0.998);

      // The reflection field owns the detail. Roughness only selects a softer
      // mip level, so it never wrinkles the glyph normal or dirties a clear
      // mirror at zero.
      vec4 fieldSample = texture(uColorFieldTexture, fieldUv, uRoughness * 5.5);
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
      vec3 chrome = linearToSrgb(acesApprox(chromeLinear * 0.98));
      if (uMaterialMode < 0.5) {
        chrome = gradeLiquidChrome(chrome);
      }

      vec2 extrusionOffset = vec2(-0.68, -1.0) * uExtrusion / uTextureSize;
      float backD = signedDistance(uv + extrusionOffset) + 3.5;
      float sweptD = smoothMax(surfaceD, backD, max(0.05, uExtrusion * 0.32));
      float extrusionAA = edgeAA(sweptD) * 1.35;
      float extrusion = smoothstep(-extrusionAA, extrusionAA, sweptD) * (1.0 - fill);

      vec2 shadowOffset = vec2(-0.68, -1.0) * (uExtrusion + 10.0) / uTextureSize;
      float shadowD = signedDistance(uv + shadowOffset) + 3.5;
      float shadowMask = smoothstep(-14.0, 2.0, shadowD) * (1.0 - fill);
      float shadow = shadowMask * 0.22 * smoothstep(0.0, 2.0, uExtrusion);

      vec3 color = background;
      color = mix(color, vec3(0.18, 0.055, 0.22), shadow);
      // DOT owns an ID-gated magenta underprint; do not stack the generic
      // shifted SDF extrusion underneath it.
      float genericExtrusion = extrusion * (1.0 - step(0.5, uMaterialMode) * (1.0 - step(1.5, uMaterialMode)));
      float extrusionOpacity = mix(0.84, 0.88, step(1.5, uMaterialMode));
      color = mix(color, vec3(0.18, 0.055, 0.22) + uPink * 0.08, genericExtrusion * extrusionOpacity);
      color += mix(uPink, uCyan, uv.x) * glow * 0.28;
      if (uMaterialMode > 0.5 && uMaterialMode < 1.5) {
        vec2 localPx = (uv - glyphBounds.xy) * uTextureSize;
        vec4 dotMaterial = dotGlitchMaterial(uv, id, localPx, aa);
        color = color * (1.0 - dotMaterial.a) + dotMaterial.rgb;
        fragColor = vec4(color, 1.0);
        return;
      }
      if (uMaterialMode > 1.5) {
        vec2 localPx = (uv - glyphBounds.xy) * uTextureSize;
        vec4 vhsMaterial = vhsChromeMaterial(
          uv,
          id,
          localPx,
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
  try {
    program = createProgram();
    crtProgram = createProgram(crtFragmentShaderSource);
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
    boundsTexture: gl.getUniformLocation(program, "uBoundsTexture"),
    noiseTexture: gl.getUniformLocation(program, "uNoiseTexture"),
    colorFieldTexture: gl.getUniformLocation(program, "uColorFieldTexture"),
    normalTexture: gl.getUniformLocation(program, "uNormalTexture"),
    textureSize: gl.getUniformLocation(program, "uTextureSize"),
    spread: gl.getUniformLocation(program, "uSpread"),
    edgeWidth: gl.getUniformLocation(program, "uEdgeWidth"),
    bodyCrown: gl.getUniformLocation(program, "uBodyCrown"),
    reflection: gl.getUniformLocation(program, "uReflection"),
    colorFieldStrength: gl.getUniformLocation(program, "uColorFieldStrength"),
    roughness: gl.getUniformLocation(program, "uRoughness"),
    baseColor: gl.getUniformLocation(program, "uBaseColor"),
    envCoverage: gl.getUniformLocation(program, "uEnvCoverage"),
    reflectionOffset: gl.getUniformLocation(program, "uReflectionOffset"),
    liquidWarp: gl.getUniformLocation(program, "uLiquidWarp"),
    dotPitch: gl.getUniformLocation(program, "uDotPitch"),
    glitchStrength: gl.getUniformLocation(program, "uGlitchStrength"),
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
  const boundsTexture = createTexture(gl.TEXTURE2, gl.NEAREST);
  const noiseTexture = createTexture(gl.TEXTURE3, gl.LINEAR, gl.REPEAT);
  const distanceTexture = createTexture(gl.TEXTURE4, gl.NEAREST);
  let colorFieldTexture = createTexture(gl.TEXTURE5, gl.LINEAR);
  const normalTexture = createTexture(gl.TEXTURE6, gl.NEAREST);
  const sceneTexture = createTexture(gl.TEXTURE7, gl.LINEAR);
  const sceneFramebuffer = gl.createFramebuffer();
  let sceneTargetWidth = 0;
  let sceneTargetHeight = 0;

  gl.activeTexture(gl.TEXTURE5);
  gl.bindTexture(gl.TEXTURE_2D, colorFieldTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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

  function updateGlyphAssetPreviews(shapePixels, distancePixels, normalPixels, idPixels, boundsPixels) {
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
      const x = (unpackPixels16(normalPixels, sourceIndex, 0, 1) * 2 - 1) * 1.25;
      const y = (unpackPixels16(normalPixels, sourceIndex, 2, 3) * 2 - 1) * 1.25;
      const z = Math.sqrt(Math.max(0, 1 - Math.min(1, x * x + y * y)));
      writeRgb(output, index, (x * 0.5 + 0.5) * 255, (y * 0.5 + 0.5) * 255, z * 255);
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

    const boundsCanvas = ui.generatedAssetCanvases.get("bounds-lut");
    if (boundsCanvas) {
      const context = boundsCanvas.getContext("2d", { alpha: false });
      context.fillStyle = "#050407";
      context.fillRect(0, 0, boundsCanvas.width, boundsCanvas.height);
      context.strokeStyle = "rgba(183,166,255,.16)";
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(0, Math.floor(boundsCanvas.height * 0.5) + 0.5);
      context.lineTo(boundsCanvas.width, Math.floor(boundsCanvas.height * 0.5) + 0.5);
      context.stroke();
      state.glyphs.forEach((glyph) => {
        const centerOffset = glyph.idByte * 4;
        const sizeOffset = (256 + glyph.idByte) * 4;
        const centerX = unpackPixels16(boundsPixels, centerOffset, 0, 1);
        const centerY = unpackPixels16(boundsPixels, centerOffset, 2, 3);
        const width = boundsPixels[sizeOffset] / 255;
        const height = boundsPixels[sizeOffset + 1] / 255;
        const x = ((glyph.idByte + 0.5) / 256) * boundsCanvas.width;
        const topY = (0.08 + centerY * 0.34) * boundsCanvas.height;
        const bottomY = (0.58 + height * 0.30) * boundsCanvas.height;
        const color = idPreviewColor(glyph.idByte);
        context.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        context.fillRect(Math.floor(x) - 2, topY - 3, 5, 6);
        context.fillRect(Math.floor(x) - 2, bottomY - 3, 5, 6);
        context.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, .66)`;
        context.beginPath();
        context.moveTo(x, topY);
        context.lineTo(x, bottomY);
        context.stroke();
        context.fillStyle = "rgba(255,255,255,.68)";
        context.fillRect(x - Math.max(1, width * 9), bottomY + 7, Math.max(2, width * 18), 1);
        context.fillRect(x + 7, bottomY - Math.max(1, height * 9), 1, Math.max(2, height * 18));
        context.fillStyle = "rgba(255,255,255,.42)";
        context.fillRect(centerX * boundsCanvas.width - 1, topY - 1, 2, 2);
      });
    }
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
      .then((image) => ({ ...descriptor, canvas: normalizeReflectionImage(image) }))
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
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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
    sourceContext.font = `900 ${fontSize}px ${DISPLAY_FONT}`;
    return glyphs.reduce(
      (total, glyph, index) => total + sourceContext.measureText(glyph).width + (index ? state.tracking : 0),
      0,
    );
  }

  function distributeCellEdges(records, minPadding) {
    if (records.length === 0) return;
    records[0].cellLeft = records[0].inkLeft - minPadding;
    for (let index = 0; index < records.length - 1; index += 1) {
      const current = records[index];
      const next = records[index + 1];
      const gap = next.inkLeft - current.inkRight;
      if (gap >= minPadding * 2) {
        current.cellRight = current.inkRight + minPadding;
        next.cellLeft = next.inkLeft - minPadding;
      } else {
        const boundary = (current.inkRight + next.inkLeft) * 0.5;
        current.cellRight = boundary;
        next.cellLeft = boundary;
      }
    }
    records[records.length - 1].cellRight = records[records.length - 1].inkRight + minPadding;
  }

  function fitLayout(lines) {
    let fontSize = 620;
    const maxWidth = TEXTURE_WIDTH * 0.90;
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

  function encodeSigned16(value, range) {
    const normalized = Math.max(-1, Math.min(1, value / range));
    const packed = Math.round((normalized * 0.5 + 0.5) * 65535);
    return [packed >> 8, packed & 255];
  }

  function writeGlyphEdgeGradient(glyph, shadingField, normalPixels, width, height) {
    const left = Math.max(1, Math.floor(glyph.cellLeft));
    const right = Math.min(width - 1, Math.ceil(glyph.cellRight));
    const top = Math.max(1, Math.floor(glyph.cellTop));
    const bottom = Math.min(height - 1, Math.ceil(glyph.cellBottom));
    const sample = (x, y) => {
      const clampedX = Math.max(glyph.cellLeft, Math.min(glyph.cellRight - 1, x));
      const clampedY = Math.max(glyph.cellTop, Math.min(glyph.cellBottom - 1, y));
      return shadingField[clampedY * width + clampedX];
    };

    for (let y = top; y < bottom; y += 1) {
      for (let x = left; x < right; x += 1) {
        const surfaceDistance = shadingField[y * width + x] + BODY_INFLATE;
        if (surfaceDistance < -4 || surfaceDistance > 19) continue;

        const gradientX = (sample(x + 1, y) - sample(x - 1, y)) / 2;
        const gradientY = (sample(x, y + 1) - sample(x, y - 1)) / 2;
        const encodedX = encodeSigned16(gradientX, 1.25);
        const encodedY = encodeSigned16(gradientY, 1.25);
        const output = (y * width + x) * 4;
        normalPixels[output] = encodedX[0];
        normalPixels[output + 1] = encodedX[1];
        normalPixels[output + 2] = encodedY[0];
        normalPixels[output + 3] = encodedY[1];
      }
    }
  }
  function rebuildTextures() {
    const startedAt = performance.now();
    ui.renderStatus.textContent = "BUILDING SDF";
    const rawLines = state.text.replace(/\r/g, "").split("\n").slice(0, 3);
    const lines = rawLines.map((line) => segmentText(line).slice(0, 18));
    const layout = fitLayout(lines);
    const lineHeightPx = layout.fontSize * state.lineHeight;
    const firstBaseline = (TEXTURE_HEIGHT - layout.totalHeight) * 0.5 + layout.fontSize * 0.80;

    sourceContext.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
    idContext.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
    sourceContext.font = `900 ${layout.fontSize}px ${DISPLAY_FONT}`;
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
    recordsByLine.forEach((records) => distributeCellEdges(records, 6));
    const verticalCenters = lines.map((_, lineIndex) => firstBaseline + lineIndex * lineHeightPx - layout.fontSize * 0.35);
    state.glyphs.forEach((record) => {
      const records = recordsByLine[record.lineIndex];
      const position = records.indexOf(record);
      const previous = records[position - 1];
      const next = records[position + 1];
      const left = Number.isFinite(record.cellLeft)
        ? record.cellLeft
        : previous ? (previous.inkRight + record.inkLeft) * 0.5 : record.inkLeft - SDF_SPREAD * 1.25;
      const right = Number.isFinite(record.cellRight)
        ? record.cellRight
        : next ? (record.inkRight + next.inkLeft) * 0.5 : record.inkRight + SDF_SPREAD * 1.25;
      const previousCenter = verticalCenters[record.lineIndex - 1];
      const nextCenter = verticalCenters[record.lineIndex + 1];
      const center = verticalCenters[record.lineIndex];
      const top = previousCenter === undefined ? record.inkTop - SDF_SPREAD * 1.1 : (previousCenter + center) * 0.5;
      const bottom = nextCenter === undefined ? record.inkBottom + SDF_SPREAD * 1.1 : (center + nextCenter) * 0.5;
      record.cellLeft = Math.max(0, Math.floor(left));
      record.cellRight = Math.min(TEXTURE_WIDTH, Math.ceil(right));
      record.cellTop = Math.max(0, Math.floor(top));
      record.cellBottom = Math.min(TEXTURE_HEIGHT, Math.ceil(bottom));
      record.centerX = (record.inkLeft + record.inkRight) * 0.5 / TEXTURE_WIDTH;
      record.centerY = (record.inkTop + record.inkBottom) * 0.5 / TEXTURE_HEIGHT;
      idContext.fillStyle = `rgb(${record.idByte}, 0, 0)`;
      idContext.fillRect(
        record.cellLeft,
        record.cellTop,
        record.cellRight - record.cellLeft,
        record.cellBottom - record.cellTop,
      );
    });

    const alphaPixels = sourceContext.getImageData(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT).data;
    const shapePixels = new Uint8Array(TEXTURE_WIDTH * TEXTURE_HEIGHT * 4);
    const distancePixels = new Uint8Array(TEXTURE_WIDTH * TEXTURE_HEIGHT * 4);
    const normalPixels = new Uint8Array(TEXTURE_WIDTH * TEXTURE_HEIGHT * 4);
    for (let index = 0; index < shapePixels.length; index += 4) {
      shapePixels[index] = 0;
      shapePixels[index + 1] = 0;
      shapePixels[index + 2] = alphaPixels[index + 3];
      shapePixels[index + 3] = 255;
      normalPixels[index] = 128;
      normalPixels[index + 1] = 0;
      normalPixels[index + 2] = 128;
      normalPixels[index + 3] = 0;
    }

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
      const smoothHeight = createGlyphBodyHeight(
        alphaPixels,
        width,
        height,
        state.glyphs,
        bodySigma,
      );
      const shadingField = createGlyphShadingDistance(
        signedField,
        width,
        height,
        state.glyphs,
        SHADING_SDF_SPREAD,
      );
      state.glyphs.forEach((glyph) => writeGlyphEdgeGradient(glyph, shadingField, normalPixels, width, height));

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
    }

    const idSource = idContext.getImageData(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT).data;
    const idPixels = new Uint8Array(TEXTURE_WIDTH * TEXTURE_HEIGHT * 4);
    for (let index = 0; index < idPixels.length; index += 4) {
      idPixels[index] = idSource[index];
      idPixels[index + 1] = alphaPixels[index + 3] > 0 ? idSource[index] : 0;
      idPixels[index + 3] = 255;
    }

    const boundsPixels = new Uint8Array(256 * 2 * 4);
    state.glyphs.forEach((record) => {
      const centerOffset = record.idByte * 4;
      const sizeOffset = (256 + record.idByte) * 4;
      const centerXBytes = encodeNormalized16(record.centerX);
      const centerYBytes = encodeNormalized16(record.centerY);
      boundsPixels[centerOffset] = centerXBytes[0];
      boundsPixels[centerOffset + 1] = centerXBytes[1];
      boundsPixels[centerOffset + 2] = centerYBytes[0];
      boundsPixels[centerOffset + 3] = centerYBytes[1];
      boundsPixels[sizeOffset] = Math.round(((record.inkRight - record.inkLeft) / TEXTURE_WIDTH) * 255);
      boundsPixels[sizeOffset + 1] = Math.round(((record.inkBottom - record.inkTop) / TEXTURE_HEIGHT) * 255);
      boundsPixels[sizeOffset + 2] = record.idByte;
      boundsPixels[sizeOffset + 3] = 255;
    });

    updateGlyphAssetPreviews(shapePixels, distancePixels, normalPixels, idPixels, boundsPixels);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, shapeTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TEXTURE_WIDTH, TEXTURE_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, shapePixels);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, idTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TEXTURE_WIDTH, TEXTURE_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, idPixels);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, boundsTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, boundsPixels);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, distanceTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TEXTURE_WIDTH, TEXTURE_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, distancePixels);
    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, normalTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, TEXTURE_WIDTH, TEXTURE_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, normalPixels);

    ui.glyphReadout.textContent = `${String(state.glyphs.length).padStart(2, "0")} GLYPHS`;
    ui.buildTime.textContent = `${Math.round(performance.now() - startedAt)} MS`;
    ui.renderStatus.textContent = "SDF READY";
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
    let useCrt = activePreset().mode > 1.5 && !state.debugId;
    if (useCrt) {
      // Keep the CRT raster tied to the 1600×900 artboard instead of browser
      // DPR. This caps the FBO at 5.5 MiB and makes scanline spacing stable.
      useCrt = ensureSceneTarget(TEXTURE_WIDTH, TEXTURE_HEIGHT);
    }
    if (useCrt) {
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
    [shapeTexture, idTexture, boundsTexture, noiseTexture, distanceTexture, colorFieldTexture, normalTexture].forEach((texture, index) => {
      gl.activeTexture(gl.TEXTURE0 + index);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    });
    gl.uniform1i(locations.shapeTexture, 0);
    gl.uniform1i(locations.idTexture, 1);
    gl.uniform1i(locations.boundsTexture, 2);
    gl.uniform1i(locations.noiseTexture, 3);
    gl.uniform1i(locations.distanceTexture, 4);
    gl.uniform1i(locations.colorFieldTexture, 5);
    gl.uniform1i(locations.normalTexture, 6);
    gl.uniform2f(locations.textureSize, TEXTURE_WIDTH, TEXTURE_HEIGHT);
    gl.uniform1f(locations.spread, SDF_SPREAD);
    gl.uniform1f(locations.edgeWidth, state.edgeWidth);
    gl.uniform1f(locations.bodyCrown, state.bodyCrown);
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
    gl.uniform1f(locations.glitchStrength, state.glitchStrength / 100);
    gl.uniform1f(locations.extrusion, state.extrusion);
    gl.uniform1f(locations.glow, state.glow / 100);
    gl.uniform1f(locations.sceneDetail, state.sceneDetail / 100);
    gl.uniform3fv(locations.cyan, hexToRgb(state.cyan));
    gl.uniform3fv(locations.pink, hexToRgb(state.pink));
    gl.uniform1f(locations.debugId, state.debugId ? 1 : 0);
    gl.uniform1f(locations.materialMode, activePreset().mode);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    if (!useCrt) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, ui.canvas.width, ui.canvas.height);
    gl.useProgram(crtProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(crtLocations.position);
    gl.vertexAttribPointer(crtLocations.position, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, sceneTexture);
    gl.uniform1i(crtLocations.sceneTexture, 7);
    gl.uniform2f(crtLocations.sceneSize, TEXTURE_WIDTH, TEXTURE_HEIGHT);
    gl.uniform1f(crtLocations.scanlineSpacing, state.vhsScanlineSpacing);
    gl.uniform1f(crtLocations.scanlineStrength, state.vhsScanlineStrength / 100);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  let rebuildTimer = 0;
  function scheduleRebuild() {
    window.clearTimeout(rebuildTimer);
    ui.renderStatus.textContent = "WAITING FOR INPUT";
    rebuildTimer = window.setTimeout(rebuildTextures, 140);
  }

  function setDebugView(debugId) {
    state.debugId = debugId;
    ui.materialViewButton.classList.toggle("is-active", !debugId);
    ui.idViewButton.classList.toggle("is-active", debugId);
    render();
  }

  function syncControls() {
    ui.textInput.value = state.text;
    ui.trackingInput.value = String(state.tracking);
    ui.lineHeightInput.value = String(state.lineHeight);
    ui.edgeWidthInput.value = String(state.edgeWidth);
    ui.bodyCrownInput.value = String(state.bodyCrown);
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
    ui.glitchStrengthInput.value = String(state.glitchStrength);
    ui.vhsScanlineSpacingInput.value = String(state.vhsScanlineSpacing);
    ui.vhsScanlineStrengthInput.value = String(state.vhsScanlineStrength);
    ui.extrusionInput.value = String(state.extrusion);
    ui.glowInput.value = String(state.glow);
    ui.sceneDetailInput.value = String(state.sceneDetail);
    ui.cyanInput.value = state.cyan;
    ui.pinkInput.value = state.pink;
    ui.trackingValue.value = `${state.tracking} PX`;
    ui.lineHeightValue.value = `${state.lineHeight.toFixed(2)}×`;
    ui.edgeWidthValue.value = `${state.edgeWidth} PX`;
    ui.bodyCrownValue.value = String(state.bodyCrown);
    ui.reflectionValue.value = `${state.reflection}%`;
    ui.colorFieldValue.value = `${state.colorField}%`;
    ui.roughnessValue.value = `${state.roughness}%`;
    ui.envCoverageValue.value = `${state.envCoverage}%`;
    ui.reflectionOffsetXValue.value = `${state.reflectionOffsetX > 0 ? "+" : ""}${state.reflectionOffsetX}%`;
    ui.reflectionOffsetYValue.value = `${state.reflectionOffsetY > 0 ? "+" : ""}${state.reflectionOffsetY}%`;
    ui.liquidWarpValue.value = `${state.liquidWarp}%`;
    ui.dotPitchValue.value = `${state.dotPitch} PX`;
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
    state.tracking = Number(event.currentTarget.value);
    ui.trackingValue.value = `${state.tracking} PX`;
    scheduleRebuild();
  });
  ui.lineHeightInput.addEventListener("input", (event) => {
    state.lineHeight = Number(event.currentTarget.value);
    ui.lineHeightValue.value = `${state.lineHeight.toFixed(2)}×`;
    scheduleRebuild();
  });
  [
    [ui.edgeWidthInput, "edgeWidth", ui.edgeWidthValue, (value) => `${value} PX`],
    [ui.bodyCrownInput, "bodyCrown", ui.bodyCrownValue, (value) => String(value)],
    [ui.reflectionInput, "reflection", ui.reflectionValue, (value) => `${value}%`],
    [ui.colorFieldInput, "colorField", ui.colorFieldValue, (value) => `${value}%`],
    [ui.roughnessInput, "roughness", ui.roughnessValue, (value) => `${value}%`],
    [ui.envCoverageInput, "envCoverage", ui.envCoverageValue, (value) => `${value}%`],
    [ui.reflectionOffsetXInput, "reflectionOffsetX", ui.reflectionOffsetXValue, (value) => `${value > 0 ? "+" : ""}${value}%`],
    [ui.reflectionOffsetYInput, "reflectionOffsetY", ui.reflectionOffsetYValue, (value) => `${value > 0 ? "+" : ""}${value}%`],
    [ui.liquidWarpInput, "liquidWarp", ui.liquidWarpValue, (value) => `${value}%`],
    [ui.dotPitchInput, "dotPitch", ui.dotPitchValue, (value) => `${value} PX`],
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
      render();
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
    setDebugView(false);
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
