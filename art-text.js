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
    createReflectionColorField,
  } = window.ArtTextFields;
  const {
    defaultKey: DEFAULT_PRESET_KEY,
    order: PRESET_ORDER,
    byKey: PRESETS,
  } = window.ArtTextPresets;

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
    presetCards: [...document.querySelectorAll(".preset-card[data-material]")],
    previewCanvases: new Map(
      [...document.querySelectorAll("canvas[data-material-preview]")]
        .map((canvas) => [canvas.dataset.materialPreview, canvas]),
    ),
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
      const isActive = card.dataset.material === preset.key;
      card.classList.toggle("is-active", isActive);
      card.setAttribute("aria-pressed", String(isActive));
      const status = card.querySelector(".preset-meta em");
      if (status && !card.disabled) status.textContent = isActive ? "ACTIVE" : "SELECT";
    });
  }

  function selectPreset(key, { applyDefaults = true } = {}) {
    const preset = PRESETS[key];
    if (!preset) return;
    state.activePreset = key;
    if (applyDefaults) Object.assign(state, preset.settings);
    syncControls();
    syncPresetSelection();
    setDebugView(false);
    render();
  }
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = TEXTURE_WIDTH;
  sourceCanvas.height = TEXTURE_HEIGHT;
  const sourceContext = sourceCanvas.getContext("2d", { alpha: true, willReadFrequently: true });

  const idCanvas = document.createElement("canvas");
  idCanvas.width = TEXTURE_WIDTH;
  idCanvas.height = TEXTURE_HEIGHT;
  const idContext = idCanvas.getContext("2d", { alpha: true });

  const gl = ui.canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: true,
    premultipliedAlpha: false,
  });

  if (!gl) {
    ui.renderError.hidden = false;
    ui.renderError.textContent = "WEBGL CONTEXT UNAVAILABLE";
    ui.gpuStatus.textContent = "WEBGL UNAVAILABLE";
    return;
  }

  const standardDerivatives = gl.getExtension("OES_standard_derivatives");

  const vertexShaderSource = `
    attribute vec2 aPosition;
    varying vec2 vUv;
    void main() {
      vUv = aPosition * 0.5 + 0.5;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const fragmentShaderSource = `
    ${standardDerivatives ? "#extension GL_OES_standard_derivatives : enable" : ""}
    precision highp float;

    varying vec2 vUv;
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
      vec4 surfaceTexel = texture2D(uDistanceTexture, uv);
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
      vec4 packedShape = texture2D(uShapeTexture, uv);
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
      vec4 packedNormal = texture2D(uNormalTexture, uv);
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
      vec4 centerBytes = texture2D(uBoundsTexture, vec2(x, 0.25));
      vec4 sizeSeed = texture2D(uBoundsTexture, vec2(x, 0.75));
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
      float sampledId = texture2D(uIdTexture, uv).r;
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

    vec2 colorFieldUv(vec3 direction) {
      direction = normalize(direction);
      return vec2(
        clamp(0.50 + direction.x * 0.48, 0.002, 0.998),
        clamp(0.50 + direction.y * 0.48, 0.002, 0.998)
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
      ${standardDerivatives ? "return max(2.1, fwidth(value) * 1.35);" : "return 2.4;"}
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
        float scanline = 0.5 + 0.5 * sin(uv.y * uTextureSize.y * 3.14159265);
        base *= 0.92 + scanline * 0.08;
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
        float scanline = 0.5 + 0.5 * sin(uv.y * uTextureSize.y * 3.14159265);
        base *= 0.86 + scanline * 0.14;
        float noise = texture2D(uNoiseTexture, uv * vec2(5.0, 2.8125)).b - 0.5;
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
      float grain = texture2D(uNoiseTexture, uv * vec2(4.0, 2.25)).b - 0.5;
      color += vec3(grain * 0.012 * uSceneDetail);
      float vignette = smoothstep(0.86, 0.24, length(centered));
      return color * mix(0.88, 1.04, vignette);
    }

    vec4 dotGlitchMaterial(
      vec2 uv,
      float id,
      vec2 localPx,
      float aa
    ) {
      float idByte = floor(id * 255.0 + 0.5);
      float row = floor((localPx.y + 2048.0) / 7.0);
      float rowNoise = hash21(vec2(idByte * 1.13, row));
      float tearGate = step(0.72, rowNoise);
      float tearPx = (rowNoise * 2.0 - 1.0) * 5.5 * tearGate;
      vec2 sourceUv = uv - vec2(tearPx / uTextureSize.x, 0.0);
      float tornFill = safeFillAt(sourceUv, id, aa);

      vec2 dotCell = fract((localPx + vec2(tearPx, 0.0)) / 7.0) - 0.5;
      float dots = 1.0 - smoothstep(0.30, 0.45, length(dotCell));
      float core = tornFill * dots;

      float cyanGhost = safeFillAt(
        uv - vec2(3.5 / uTextureSize.x, 0.0),
        id,
        aa
      ) * dots * tearGate;
      float pinkGhost = safeFillAt(
        uv + vec2(3.5 / uTextureSize.x, 0.0),
        id,
        aa
      ) * dots * tearGate;

      float microCell = hash21(vec2(idByte + floor(localPx.x / 7.0), row));
      vec3 coreColor = mix(uCyan, vec3(0.92, 0.99, 1.0), step(0.68, microCell) * 0.72);
      vec3 premultiplied = coreColor * core;
      premultiplied += uCyan * cyanGhost * 0.38;
      premultiplied += uPink * pinkGhost * 0.62;
      float alpha = clamp(max(core, max(cyanGhost, pinkGhost)), 0.0, 1.0);
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
      float scanline = 0.86 + 0.14 * (0.5 + 0.5 * sin(localPx.y * 3.14159265));
      float chromeLuma = dot(chrome, vec3(0.2126, 0.7152, 0.0722));
      vec3 posterChrome = mix(vec3(chromeLuma), chrome, 1.28);
      posterChrome *= scanline * mix(1.0, 0.66, dropout);
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
      float id = texture2D(uIdTexture, uv).r;
      float hasCell = step(0.002, id);
      vec3 background = backgroundColor(uv);

      if (uDebugId > 0.5) {
        vec3 debugColor = mix(vec3(0.025), idPalette(id), hasCell);
        debugColor += vec3(sampleCoverage(uv) * 0.30);
        gl_FragColor = vec4(debugColor, 1.0);
        return;
      }

      if (uMaterialMode < 0.5 && uv.y > 0.78 && uSceneDetail > 0.001) {
        float reflectedY = 0.78 - (uv.y - 0.78) / 0.42;
        vec2 reflectedUv = vec2(uv.x, reflectedY);
        vec2 blurStep = vec2(0.0, 4.0 / uTextureSize.y);
        float reflectedAlpha = sampleCoverage(reflectedUv - blurStep) * 0.25;
        reflectedAlpha += sampleCoverage(reflectedUv) * 0.50;
        reflectedAlpha += sampleCoverage(reflectedUv + blurStep) * 0.25;
        float reflectionFade = exp(-(uv.y - 0.78) * 11.0) * smoothstep(0.98, 0.78, uv.y);
        vec3 reflectedColor = mix(uPink * 0.58, uCyan * 0.34 + vec3(0.38), uv.x);
        background = mix(background, reflectedColor, reflectedAlpha * reflectionFade * 0.16 * uSceneDetail);
      }

      vec2 distancePair = sampleDistancePair16(uv);
      float surfaceD = (distancePair.x * 2.0 - 1.0) * uSpread + ${BODY_INFLATE.toFixed(1)};
      float shadingSurfaceD = (distancePair.y * 2.0 - 1.0) * ${SHADING_SDF_SPREAD.toFixed(1)} + ${BODY_INFLATE.toFixed(1)};
      float aa = edgeAA(surfaceD);
      float fill = smoothstep(-aa, aa, surfaceD);
      float glow = exp(-max(-surfaceD, 0.0) / 22.0) * (1.0 - fill) * uGlow;
      ${DEBUG_SURFACE === "fill" ? `
        gl_FragColor = vec4(vec3(fill), 1.0);
        return;
      ` : ""}
      ${DEBUG_SURFACE === "shading" ? `
        float shadingRamp = clamp(shadingSurfaceD / max(uEdgeWidth, 0.001), 0.0, 1.0);
        gl_FragColor = vec4(vec3(shadingRamp), 1.0);
        return;
      ` : ""}

      // The body crown and edge roll are intentionally separate. Body height
      // comes from broad blurred coverage; the rim direction and coordinate
      // both come from one smooth shading SDF, while raw SDF only clips shape.
      float bodyStepPx = 5.0;
      vec2 bodyStep = vec2(bodyStepPx) / uTextureSize;
      float bodyLeft = sampleShapeData16(uv - vec2(bodyStep.x, 0.0)).x;
      float bodyRight = sampleShapeData16(uv + vec2(bodyStep.x, 0.0)).x;
      float bodyTop = sampleShapeData16(uv - vec2(0.0, bodyStep.y)).x;
      float bodyBottom = sampleShapeData16(uv + vec2(0.0, bodyStep.y)).x;
      vec2 bodyGradient = vec2(bodyRight - bodyLeft, bodyBottom - bodyTop) / (bodyStepPx * 2.0);
      vec2 bodyNormalXY = -bodyGradient * uBodyCrown;
      float bodyLength = length(bodyNormalXY);
      bodyNormalXY *= min(1.0, 0.52 / max(bodyLength, 0.001));

      vec2 edgeGradient = sampleEdgeGradient16(uv);
      float edgeGradientLength = length(edgeGradient);
      float edgeConfidence = smoothstep(0.08, 0.32, edgeGradientLength);
      vec2 edgeDirection = edgeGradient / max(edgeGradientLength, 0.0001);
      ${DEBUG_SURFACE === "edge" ? `
        gl_FragColor = vec4(edgeGradient * 0.38 + 0.5, edgeConfidence, 1.0);
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
      normalXY += glyphLocal * vec2(0.022, 0.014) * hasCell;

      vec2 noiseUv = uv * vec2(1.35, 1.85) + vec2(2.7, -1.9);
      vec2 liquid = texture2D(uNoiseTexture, noiseUv).rg - 0.5;
      normalXY += liquid * 0.016;
      vec3 normal = normalize(vec3(normalXY, 1.0));
      ${DEBUG_SURFACE === "normal" ? `
        gl_FragColor = vec4(normal * 0.5 + 0.5, 1.0);
        return;
      ` : ""}

      vec3 reflected = reflect(vec3(0.0, 0.0, -1.0), normal);
      reflected = normalize(vec3(reflected.xy * 1.34, reflected.z));
      vec2 fieldUv = colorFieldUv(reflected);
      float glyphSeed = fract(floor(id * 255.0 + 0.5) * 0.6180339);
      fieldUv.x = clamp(fieldUv.x + (glyphSeed - 0.5) * 0.028, 0.002, 0.998);

      vec4 fieldSample = texture2D(uColorFieldTexture, fieldUv);
      vec3 sampledField = srgbToLinear(fieldSample.rgb);
      float sampledLuma = dot(sampledField, vec3(0.2126, 0.7152, 0.0722));
      sampledField = max(vec3(0.0), mix(vec3(sampledLuma), sampledField, 1.58));

      float whitePatch = softBox(fieldUv, vec2(0.28, 0.26), vec2(0.16, 0.16), 0.085);
      float cyanStrip = softBox(fieldUv, vec2(0.82, 0.43), vec2(0.042, 0.28), 0.050);
      float pinkRibbon = band(fieldUv.y + fieldUv.x * 0.13, 0.77, 0.10);
      float darkRibbon = softBox(fieldUv, vec2(0.56, 0.53), vec2(0.22, 0.055), 0.060);
      vec3 fieldLinear = sampledField * mix(0.68, 0.98, uColorFieldStrength);
      fieldLinear += vec3(fieldSample.a * 0.12 * uColorFieldStrength);
      fieldLinear += vec3(1.0, 0.98, 1.0) * whitePatch * 0.14 * uColorFieldStrength;
      fieldLinear += srgbToLinear(uCyan) * cyanStrip * 0.58 * uColorFieldStrength;
      fieldLinear += srgbToLinear(uPink) * pinkRibbon * 0.48 * uColorFieldStrength;
      fieldLinear *= 1.0 - darkRibbon * 0.46 * uColorFieldStrength;

      float fresnel = pow(1.0 - clamp(normal.z, 0.0, 1.0), 2.45);
      float areaLight = pow(max(dot(normal, normalize(vec3(-0.38, -0.48, 0.79))), 0.0), 10.5);
      vec3 edgeTint = mix(uPink, uCyan, clamp(normal.x * 0.5 + 0.5, 0.0, 1.0));
      vec3 chromeLinear = mix(
        srgbToLinear(vec3(0.60, 0.62, 0.68)),
        fieldLinear,
        0.24 + uReflection * 0.76
      );
      chromeLinear += vec3(areaLight * mix(0.30, 0.58, uColorFieldStrength));
      chromeLinear += srgbToLinear(edgeTint) * fresnel * 0.56;
      chromeLinear *= 0.94 + normal.z * 0.08;
      vec3 chrome = linearToSrgb(acesApprox(chromeLinear * 0.98));

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
      color = mix(color, vec3(0.18, 0.055, 0.22) + uPink * 0.08, extrusion * 0.88);
      color += mix(uPink, uCyan, uv.x) * glow * 0.28;
      if (uMaterialMode > 0.5 && uMaterialMode < 1.5) {
        vec2 localPx = (uv - glyphBounds.xy) * uTextureSize;
        vec4 dotMaterial = dotGlitchMaterial(uv, id, localPx, aa);
        color = color * (1.0 - dotMaterial.a) + dotMaterial.rgb;
        gl_FragColor = vec4(color, 1.0);
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
        gl_FragColor = vec4(color, 1.0);
        return;
      }
      color = mix(color, chrome, fill);
      gl_FragColor = vec4(color, 1.0);
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

  function createProgram() {
    const vertex = compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragment = compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
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
  try {
    program = createProgram();
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
    extrusion: gl.getUniformLocation(program, "uExtrusion"),
    glow: gl.getUniformLocation(program, "uGlow"),
    sceneDetail: gl.getUniformLocation(program, "uSceneDetail"),
    cyan: gl.getUniformLocation(program, "uCyan"),
    pink: gl.getUniformLocation(program, "uPink"),
    debugId: gl.getUniformLocation(program, "uDebugId"),
    materialMode: gl.getUniformLocation(program, "uMaterialMode"),
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
  const colorFieldTexture = createTexture(gl.TEXTURE5, gl.LINEAR);
  const normalTexture = createTexture(gl.TEXTURE6, gl.NEAREST);

  gl.activeTexture(gl.TEXTURE5);
  gl.bindTexture(gl.TEXTURE_2D, colorFieldTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
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

  function buildReflectionColorField() {
    const width = 512;
    const height = 256;
    const pixels = createReflectionColorField(width, height);
    gl.activeTexture(gl.TEXTURE5);
    gl.bindTexture(gl.TEXTURE_2D, colorFieldTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  function buildNoiseTexture() {
    const size = 64;
    const pixels = createNoiseField(size, 8);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
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

      // The broad face crown is built from blurred coverage per glyph cell.
      // It deliberately does not use raw SDF gradients, which are undefined at
      // stroke medial axes and previously produced seams in complex characters.
      const bodySigma = Math.max(12, Math.min(46, layout.fontSize * 0.068));
      const smoothHeight = createGlyphBodyHeight(alphaPixels, width, height, state.glyphs, bodySigma);
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

  function render() {
    resizeCanvas();
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
    gl.uniform1f(locations.extrusion, state.extrusion);
    gl.uniform1f(locations.glow, state.glow / 100);
    gl.uniform1f(locations.sceneDetail, state.sceneDetail / 100);
    gl.uniform3fv(locations.cyan, hexToRgb(state.cyan));
    gl.uniform3fv(locations.pink, hexToRgb(state.pink));
    gl.uniform1f(locations.debugId, state.debugId ? 1 : 0);
    gl.uniform1f(locations.materialMode, activePreset().mode);
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
    [ui.extrusionInput, "extrusion", ui.extrusionValue, (value) => `${value} PX`],
    [ui.glowInput, "glow", ui.glowValue, (value) => `${value}%`],
    [ui.sceneDetailInput, "sceneDetail", ui.sceneDetailValue, (value) => `${value}%`],
  ].forEach(([input, key, output, format]) => {
    input.addEventListener("input", (event) => {
      state[key] = Number(event.currentTarget.value);
      output.value = format(state[key]);
      render();
    });
  });
  ui.cyanInput.addEventListener("input", (event) => {
    state.cyan = event.currentTarget.value;
    render();
  });
  ui.pinkInput.addEventListener("input", (event) => {
    state.pink = event.currentTarget.value;
    render();
  });
  ui.materialViewButton.addEventListener("click", () => setDebugView(false));
  ui.idViewButton.addEventListener("click", () => setDebugView(true));
  ui.presetCards.forEach((card) => {
    card.addEventListener("click", () => {
      if (!card.disabled) selectPreset(card.dataset.material);
    });
  });
  ui.resetButton.addEventListener("click", () => {
    Object.assign(state, activePreset().settings, { debugId: false });
    syncControls();
    setDebugView(false);
    syncPresetSelection();
    render();
  });
  window.addEventListener("resize", render, { passive: true });

  const rendererInfo = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = rendererInfo
    ? gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL)
    : gl.getParameter(gl.RENDERER);
  ui.gpuStatus.textContent = `WEBGL 1 · ${renderer}`;
  buildNoiseTexture();
  buildReflectionColorField();
  syncControls();
  syncPresetSelection();
  document.fonts.ready.then(rebuildTextures);
})();
