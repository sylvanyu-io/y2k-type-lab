(() => {
  "use strict";

  const TEXTURE_WIDTH = 1600;
  const TEXTURE_HEIGHT = 900;
  const SDF_SPREAD = 72;
  const BODY_INFLATE = 3.5;
  const BODY_RADIUS = 16;
  const BODY_BLUR_RADIUS = 6;
  const INF = 1e20;
  const DISPLAY_FONT = '"Arial Rounded MT Bold", "Yuanti SC", "Hiragino Maru Gothic ProN", "Avenir Next", "PingFang SC", sans-serif';

  const DEFAULTS = Object.freeze({
    text: "Y2K\nCHROME",
    tracking: 4,
    lineHeight: 0.88,
    bevel: 14,
    reflection: 78,
    extrusion: 9,
    glow: 28,
    cyan: "#39f5ff",
    pink: "#ff2bd6",
  });

  const ui = {
    canvas: document.querySelector("#artCanvas"),
    gpuStatus: document.querySelector("#gpuStatus"),
    renderError: document.querySelector("#renderError"),
    renderStatus: document.querySelector("#renderStatus"),
    buildTime: document.querySelector("#buildTime"),
    glyphReadout: document.querySelector("#glyphReadout"),
    resetButton: document.querySelector("#resetButton"),
    materialViewButton: document.querySelector("#materialViewButton"),
    idViewButton: document.querySelector("#idViewButton"),
    textInput: document.querySelector("#textInput"),
    trackingInput: document.querySelector("#trackingInput"),
    trackingValue: document.querySelector("#trackingValue"),
    lineHeightInput: document.querySelector("#lineHeightInput"),
    lineHeightValue: document.querySelector("#lineHeightValue"),
    bevelInput: document.querySelector("#bevelInput"),
    bevelValue: document.querySelector("#bevelValue"),
    reflectionInput: document.querySelector("#reflectionInput"),
    reflectionValue: document.querySelector("#reflectionValue"),
    extrusionInput: document.querySelector("#extrusionInput"),
    extrusionValue: document.querySelector("#extrusionValue"),
    glowInput: document.querySelector("#glowInput"),
    glowValue: document.querySelector("#glowValue"),
    cyanInput: document.querySelector("#cyanInput"),
    pinkInput: document.querySelector("#pinkInput"),
  };

  const state = { ...DEFAULTS, debugId: false, glyphs: [] };
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
    uniform vec2 uTextureSize;
    uniform float uSpread;
    uniform float uBevel;
    uniform float uReflection;
    uniform float uExtrusion;
    uniform float uGlow;
    uniform vec3 uCyan;
    uniform vec3 uPink;
    uniform float uDebugId;

    float unpack16(vec2 bytes) {
      vec2 integerBytes = floor(bytes * 255.0 + 0.5);
      return (integerBytes.x * 256.0 + integerBytes.y) / 65535.0;
    }

    float distanceTap(vec2 uv) {
      vec2 encodedBytes = texture2D(uDistanceTexture, uv).rg;
      vec2 bytes = floor(encodedBytes * 255.0 + 0.5);
      return (bytes.x * 256.0 + bytes.y) / 65535.0;
    }

    float heightTap(vec2 uv) {
      vec2 encodedBytes = texture2D(uDistanceTexture, uv).ba;
      vec2 bytes = floor(encodedBytes * 255.0 + 0.5);
      return (bytes.x * 256.0 + bytes.y) / 65535.0;
    }

    float sampleDistance16(vec2 uv) {
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

    float sampleHeight16(vec2 uv) {
      vec2 pixel = uv * uTextureSize - 0.5;
      vec2 base = floor(pixel);
      vec2 fraction = fract(pixel);
      vec2 uv00 = (base + vec2(0.5, 0.5)) / uTextureSize;
      vec2 uv10 = (base + vec2(1.5, 0.5)) / uTextureSize;
      vec2 uv01 = (base + vec2(0.5, 1.5)) / uTextureSize;
      vec2 uv11 = (base + vec2(1.5, 1.5)) / uTextureSize;
      return mix(
        mix(heightTap(uv00), heightTap(uv10), fraction.x),
        mix(heightTap(uv01), heightTap(uv11), fraction.x),
        fraction.y
      );
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
      float encoded = sampleDistance16(uv);
      return (encoded * 2.0 - 1.0) * uSpread;
    }

    float band(float value, float center, float width) {
      float distanceValue = (value - center) / width;
      return exp(-distanceValue * distanceValue);
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
      vec3 top = vec3(0.69, 0.63, 0.98);
      vec3 bottom = vec3(1.00, 0.70, 0.91);
      vec3 color = mix(top, bottom, smoothstep(0.0, 1.0, uv.y));
      float halo = exp(-4.2 * dot(centered * vec2(0.88, 1.25), centered * vec2(0.88, 1.25)));
      color += vec3(0.17, 0.13, 0.25) * halo;
      float orbit = exp(-235.0 * abs(length(centered * vec2(0.78, 1.85)) - 0.38));
      color += mix(uPink, uCyan, uv.x) * orbit * 0.16;
      vec2 grid = abs(fract(uv * vec2(20.0, 11.25)) - 0.5);
      float gridLine = smoothstep(0.485, 0.5, max(grid.x, grid.y)) * 0.018;
      color += vec3(gridLine);
      vec2 floorPoint = (uv - vec2(0.5, 0.68)) * vec2(2.3, 10.0);
      color -= vec3(0.11, 0.045, 0.13) * exp(-dot(floorPoint, floorPoint));
      float vignette = smoothstep(0.86, 0.24, length(centered));
      return color * mix(0.88, 1.04, vignette);
    }

    void main() {
      vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
      float id = texture2D(uIdTexture, uv).r;
      float hasCell = step(0.002, id);
      vec3 background = backgroundColor(uv);

      if (uDebugId > 0.5) {
        vec3 debugColor = mix(vec3(0.025), idPalette(id), hasCell);
        float alpha = texture2D(uShapeTexture, uv).g;
        debugColor += vec3(alpha * 0.30);
        gl_FragColor = vec4(debugColor, 1.0);
        return;
      }

      float surfaceD = signedDistance(uv) + 3.5;
      float aa = edgeAA(surfaceD);
      float fill = smoothstep(-aa, aa, surfaceD);
      float glow = exp(-max(-surfaceD, 0.0) / 22.0) * (1.0 - fill) * uGlow;

      // B stores a blurred body-height field. Deriving its gradient over a
      // wider footprint keeps highlights continuous after canvas scaling and
      // avoids quantizing a precomputed normal into two 8-bit channels.
      vec2 normalStep = vec2(3.0) / uTextureSize;
      float heightLeft = sampleHeight16(uv - vec2(normalStep.x, 0.0));
      float heightRight = sampleHeight16(uv + vec2(normalStep.x, 0.0));
      float heightTop = sampleHeight16(uv - vec2(0.0, normalStep.y));
      float heightBottom = sampleHeight16(uv + vec2(0.0, normalStep.y));
      vec2 bodyGradient = vec2(heightRight - heightLeft, heightBottom - heightTop) * 0.5;
      float roundness = mix(1.20, 2.80, clamp((uBevel - 4.0) / 24.0, 0.0, 1.0));
      vec2 normalXY = -bodyGradient * roundness;

      vec2 noiseUv = uv * vec2(1.35, 1.85) + vec2(2.7, -1.9);
      vec2 liquid = texture2D(uNoiseTexture, noiseUv).rg - 0.5;
      normalXY += liquid * 0.045;
      vec3 normal = normalize(vec3(normalXY, 1.0));

      vec3 reflected = reflect(vec3(0.0, 0.0, -1.0), normal);
      float envY = clamp(reflected.y * 0.5 + 0.5 + liquid.x * 0.035, 0.0, 1.0);
      vec3 env = vec3(0.31, 0.32, 0.39);
      env += mix(uCyan, vec3(0.72, 0.92, 1.00), 0.42) * band(envY, 0.17, 0.20) * 0.68;
      env += vec3(1.00, 0.99, 1.00) * band(envY, 0.34, 0.135) * 0.92;
      env -= vec3(0.18, 0.16, 0.22) * band(envY, 0.52, 0.13) * 0.72;
      env += (uPink * 0.62 + vec3(0.19)) * band(envY, 0.70, 0.18) * 0.82;
      env += vec3(0.92, 0.95, 1.00) * band(envY, 0.88, 0.105) * 0.70;

      float fresnel = pow(1.0 - clamp(normal.z, 0.0, 1.0), 2.45);
      float areaLight = pow(max(dot(normal, normalize(vec3(-0.38, -0.48, 0.79))), 0.0), 10.5);
      vec3 edgeTint = mix(uPink, uCyan, clamp(normal.x * 0.5 + 0.5, 0.0, 1.0));
      vec3 chrome = mix(vec3(0.66, 0.68, 0.73), env, 0.38 + uReflection * 0.62);
      chrome += vec3(areaLight * 0.76);
      chrome += edgeTint * fresnel * 0.42;
      chrome *= 0.92 + normal.z * 0.08;

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
    textureSize: gl.getUniformLocation(program, "uTextureSize"),
    spread: gl.getUniformLocation(program, "uSpread"),
    bevel: gl.getUniformLocation(program, "uBevel"),
    reflection: gl.getUniformLocation(program, "uReflection"),
    extrusion: gl.getUniformLocation(program, "uExtrusion"),
    glow: gl.getUniformLocation(program, "uGlow"),
    cyan: gl.getUniformLocation(program, "uCyan"),
    pink: gl.getUniformLocation(program, "uPink"),
    debugId: gl.getUniformLocation(program, "uDebugId"),
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

  const shapeTexture = createTexture(gl.TEXTURE0, gl.LINEAR);
  const idTexture = createTexture(gl.TEXTURE1, gl.NEAREST);
  const boundsTexture = createTexture(gl.TEXTURE2, gl.NEAREST);
  const noiseTexture = createTexture(gl.TEXTURE3, gl.LINEAR, gl.REPEAT);
  const distanceTexture = createTexture(gl.TEXTURE4, gl.NEAREST);

  function buildNoiseTexture() {
    const size = 64;
    const gridSize = 8;
    const pixels = new Uint8Array(size * size * 4);
    let seed = 0x2f6e2b1;
    const random = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 4294967295;
    };
    const gridR = Float32Array.from({ length: gridSize * gridSize }, random);
    const gridG = Float32Array.from({ length: gridSize * gridSize }, random);
    const smooth = (value) => value * value * (3 - 2 * value);
    const sampleGrid = (grid, x, y) => {
      const wrappedX = (x + gridSize) % gridSize;
      const wrappedY = (y + gridSize) % gridSize;
      return grid[wrappedY * gridSize + wrappedX];
    };
    for (let y = 0; y < size; y += 1) {
      const gridY = (y / size) * gridSize;
      const iy = Math.floor(gridY);
      const fy = smooth(gridY - iy);
      for (let x = 0; x < size; x += 1) {
        const gridX = (x / size) * gridSize;
        const ix = Math.floor(gridX);
        const fx = smooth(gridX - ix);
        const pixelIndex = (y * size + x) * 4;
        [gridR, gridG].forEach((grid, channel) => {
          const top = sampleGrid(grid, ix, iy) * (1 - fx) + sampleGrid(grid, ix + 1, iy) * fx;
          const bottom = sampleGrid(grid, ix, iy + 1) * (1 - fx) + sampleGrid(grid, ix + 1, iy + 1) * fx;
          pixels[pixelIndex + channel] = Math.round((top * (1 - fy) + bottom * fy) * 255);
        });
        pixels[pixelIndex + 2] = Math.floor(random() * 255);
        pixels[pixelIndex + 3] = 255;
      }
    }
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

  function blurScalarField(source, width, height, radius) {
    const sigma = Math.max(1, radius * 0.58);
    const weights = new Float32Array(radius + 1);
    let weightSum = 0;
    for (let offset = 0; offset <= radius; offset += 1) {
      const weight = Math.exp(-(offset * offset) / (2 * sigma * sigma));
      weights[offset] = weight;
      weightSum += offset === 0 ? weight : weight * 2;
    }
    for (let offset = 0; offset <= radius; offset += 1) weights[offset] /= weightSum;

    const horizontal = new Float32Array(source.length);
    const output = new Float32Array(source.length);
    for (let y = 0; y < height; y += 1) {
      const row = y * width;
      for (let x = 0; x < width; x += 1) {
        let value = source[row + x] * weights[0];
        for (let offset = 1; offset <= radius; offset += 1) {
          value += source[row + Math.max(0, x - offset)] * weights[offset];
          value += source[row + Math.min(width - 1, x + offset)] * weights[offset];
        }
        horizontal[row + x] = value;
      }
    }
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        let value = horizontal[y * width + x] * weights[0];
        for (let offset = 1; offset <= radius; offset += 1) {
          value += horizontal[Math.max(0, y - offset) * width + x] * weights[offset];
          value += horizontal[Math.min(height - 1, y + offset) * width + x] * weights[offset];
        }
        output[y * width + x] = value;
      }
    }
    return output;
  }

  function encodeNormalized16(value) {
    const packed = Math.round(Math.max(0, Math.min(1, value)) * 65535);
    return [packed >> 8, packed & 255];
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
    for (let index = 0; index < shapePixels.length; index += 4) {
      shapePixels[index + 3] = 255;
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
      const heightField = new Float32Array(length);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const localIndex = y * width + x;
          const signed = Math.sqrt(inner[localIndex]) - Math.sqrt(outer[localIndex]);
          signedField[localIndex] = signed;
          const bodyT = Math.max(0, Math.min(1, (signed + BODY_INFLATE) / BODY_RADIUS));
          heightField[localIndex] = bodyT * bodyT * (3 - 2 * bodyT);
        }
      }
      const smoothHeight = blurScalarField(heightField, width, height, BODY_BLUR_RADIUS);
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const localIndex = y * width + x;
          const signed = signedField[localIndex];
          const encoded = Math.max(0, Math.min(1, 0.5 + signed / (2 * SDF_SPREAD)));
          const outputIndex = localIndex * 4;
          const distance16 = Math.round(encoded * 65535);
          const height16 = Math.round(smoothHeight[localIndex] * 65535);
          shapePixels[outputIndex] = Math.round(encoded * 255);
          shapePixels[outputIndex + 1] = alphaPixels[outputIndex + 3];
          shapePixels[outputIndex + 2] = Math.round(smoothHeight[localIndex] * 255);
          shapePixels[outputIndex + 3] = 255;
          distancePixels[outputIndex] = distance16 >> 8;
          distancePixels[outputIndex + 1] = distance16 & 255;
          distancePixels[outputIndex + 2] = height16 >> 8;
          distancePixels[outputIndex + 3] = height16 & 255;
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
    [shapeTexture, idTexture, boundsTexture, noiseTexture, distanceTexture].forEach((texture, index) => {
      gl.activeTexture(gl.TEXTURE0 + index);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    });
    gl.uniform1i(locations.shapeTexture, 0);
    gl.uniform1i(locations.idTexture, 1);
    gl.uniform1i(locations.boundsTexture, 2);
    gl.uniform1i(locations.noiseTexture, 3);
    gl.uniform1i(locations.distanceTexture, 4);
    gl.uniform2f(locations.textureSize, TEXTURE_WIDTH, TEXTURE_HEIGHT);
    gl.uniform1f(locations.spread, SDF_SPREAD);
    gl.uniform1f(locations.bevel, state.bevel);
    gl.uniform1f(locations.reflection, state.reflection / 100);
    gl.uniform1f(locations.extrusion, state.extrusion);
    gl.uniform1f(locations.glow, state.glow / 100);
    gl.uniform3fv(locations.cyan, hexToRgb(state.cyan));
    gl.uniform3fv(locations.pink, hexToRgb(state.pink));
    gl.uniform1f(locations.debugId, state.debugId ? 1 : 0);
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
    ui.bevelInput.value = String(state.bevel);
    ui.reflectionInput.value = String(state.reflection);
    ui.extrusionInput.value = String(state.extrusion);
    ui.glowInput.value = String(state.glow);
    ui.cyanInput.value = state.cyan;
    ui.pinkInput.value = state.pink;
    ui.trackingValue.value = `${state.tracking} PX`;
    ui.lineHeightValue.value = `${state.lineHeight.toFixed(2)}×`;
    ui.bevelValue.value = `${state.bevel} PX`;
    ui.reflectionValue.value = `${state.reflection}%`;
    ui.extrusionValue.value = `${state.extrusion} PX`;
    ui.glowValue.value = `${state.glow}%`;
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
    [ui.bevelInput, "bevel", ui.bevelValue, (value) => `${value} PX`],
    [ui.reflectionInput, "reflection", ui.reflectionValue, (value) => `${value}%`],
    [ui.extrusionInput, "extrusion", ui.extrusionValue, (value) => `${value} PX`],
    [ui.glowInput, "glow", ui.glowValue, (value) => `${value}%`],
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
  ui.resetButton.addEventListener("click", () => {
    Object.assign(state, DEFAULTS, { debugId: false });
    syncControls();
    setDebugView(false);
    rebuildTextures();
  });
  window.addEventListener("resize", render, { passive: true });

  const rendererInfo = gl.getExtension("WEBGL_debug_renderer_info");
  const renderer = rendererInfo
    ? gl.getParameter(rendererInfo.UNMASKED_RENDERER_WEBGL)
    : gl.getParameter(gl.RENDERER);
  ui.gpuStatus.textContent = `WEBGL 1 · ${renderer}`;
  buildNoiseTexture();
  syncControls();
  document.fonts.ready.then(rebuildTextures);
})();
