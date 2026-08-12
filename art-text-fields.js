(() => {
  "use strict";

  function createNoiseField(size = 64, gridSize = 8) {
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
    return pixels;
  }

  function createReflectionColorField(width = 512, height = 256, styleKey = "prism") {
    const pixels = new Uint8Array(width * height * 4);
    const clamp01 = (value) => Math.max(0, Math.min(1, value));
    const smoothstep = (edge0, edge1, value) => {
      const amount = clamp01((value - edge0) / Math.max(edge1 - edge0, 0.0001));
      return amount * amount * (3 - 2 * amount);
    };
    const wrappedDelta = (value, center) => {
      const delta = value - center;
      return delta - Math.round(delta);
    };
    const gaussian = (u, v, centerX, centerY, spreadX, spreadY) => {
      const wrappedX = wrappedDelta(u, centerX);
      const deltaY = v - centerY;
      return Math.exp(-0.5 * (
        (wrappedX * wrappedX) / (spreadX * spreadX)
        + (deltaY * deltaY) / (spreadY * spreadY)
      ));
    };
    const addColor = (color, source, intensity) => {
      color[0] += source[0] * intensity;
      color[1] += source[1] * intensity;
      color[2] += source[2] * intensity;
    };
    const band = (value, center, spread) => Math.exp(-0.5 * Math.pow((value - center) / spread, 2));
    const softBox = (u, v, centerX, centerY, halfWidth, halfHeight, feather) => {
      const outsideX = Math.max(Math.abs(wrappedDelta(u, centerX)) - halfWidth, 0);
      const outsideY = Math.max(Math.abs(v - centerY) - halfHeight, 0);
      return 1 - smoothstep(0, feather, Math.hypot(outsideX, outsideY));
    };

    const renderers = {
      prism(u, v) {
        const color = [0.012, 0.006, 0.038];
        const violetSky = band(v, 0.18, 0.20);
        const silverMist = band(v, 0.34, 0.105);
        const magentaFloor = band(v, 0.76, 0.17);
        const whitePanel = gaussian(u, v, 0.24, 0.30, 0.125, 0.115);
        const pearlPanel = gaussian(u, v, 0.68, 0.27, 0.095, 0.10);
        const cyanPanel = gaussian(u, v, 0.08, 0.45, 0.050, 0.32);
        const bluePanel = gaussian(u, v, 0.43, 0.43, 0.060, 0.28);
        const pinkPanel = gaussian(u, v, 0.84, 0.56, 0.075, 0.33);
        const goldPanel = gaussian(u, v, 0.55, 0.47, 0.024, 0.21);
        const whiteSlit = band(v, 0.235 + Math.sin((u + 0.11) * Math.PI * 2) * 0.050, 0.019);
        const cyanRibbon = band(v, 0.42 + Math.sin((u + 0.08) * Math.PI * 2) * 0.065, 0.030);
        const prismRibbon = band(v, 0.52 + Math.sin((u * 2.0 + 0.31) * Math.PI * 2) * 0.055, 0.027);
        const darkHorizon = band(v, 0.585 + Math.sin((u + 0.37) * Math.PI * 2) * 0.035, 0.043);
        const pinkRibbon = band(v, 0.73 - Math.sin((u + 0.23) * Math.PI * 2) * 0.055, 0.040);
        const diagonalPink = band(v + (u - 0.5) * 0.26, 0.74, 0.075);
        const darkSide = gaussian(u, v, 0.98, 0.47, 0.055, 0.30);

        addColor(color, [0.12, 0.16, 0.70], violetSky * 0.58);
        addColor(color, [1.45, 1.62, 2.10], silverMist * 0.08);
        addColor(color, [3.5, 3.6, 4.8], whitePanel * 0.55);
        addColor(color, [2.4, 2.2, 3.5], pearlPanel * 0.38);
        addColor(color, [0.00, 3.4, 5.5], cyanPanel * 0.82);
        addColor(color, [0.02, 0.48, 4.8], bluePanel * 0.78);
        addColor(color, [5.3, 0.015, 2.45], pinkPanel * 0.82);
        addColor(color, [4.9, 1.45, 0.08], goldPanel * 0.74);
        addColor(color, [4.8, 4.5, 5.5], whiteSlit * 0.92);
        addColor(color, [0.00, 3.0, 5.4], cyanRibbon * 0.66);
        addColor(color, [1.0, 0.10, 4.8], prismRibbon * 0.58);
        addColor(color, [4.8, 0.01, 1.95], pinkRibbon * 0.68);
        addColor(color, [4.2, 0.02, 2.0], diagonalPink * 0.58);
        addColor(color, [4.1, 0.025, 1.75], magentaFloor * 0.64);
        const shade = Math.max(0.035, 1 - darkHorizon * 0.94 - darkSide * 0.62);
        for (let channel = 0; channel < 3; channel += 1) color[channel] *= shade;
        return {
          color,
          highlight: whiteSlit * 0.82 + whitePanel * 0.46 + pearlPanel * 0.28 + goldPanel * 0.16,
          darkMix: darkHorizon * 0.90 + darkSide * 0.56,
          darkTarget: [0.005, 0.001, 0.020],
        };
      },

      silk(u, v) {
        const color = [0.024, 0.014, 0.060];
        const whiteCloud = gaussian(u, v, 0.34, 0.24, 0.23, 0.17);
        const cyanCloud = gaussian(u, v, 0.08, 0.50, 0.17, 0.36);
        const lilacCloud = gaussian(u, v, 0.57, 0.45, 0.27, 0.27);
        const pinkCloud = gaussian(u, v, 0.84, 0.70, 0.25, 0.29);
        const warmCloud = gaussian(u, v, 0.31, 0.72, 0.13, 0.18);
        const darkBasin = gaussian(u, v, 0.50, 0.61, 0.32, 0.10);
        addColor(color, [2.7, 2.8, 3.5], whiteCloud * 0.64);
        addColor(color, [0.00, 2.8, 4.2], cyanCloud * 0.58);
        addColor(color, [0.82, 0.20, 3.5], lilacCloud * 0.48);
        addColor(color, [4.0, 0.035, 1.7], pinkCloud * 0.62);
        addColor(color, [3.2, 0.72, 0.14], warmCloud * 0.27);
        return {
          color,
          highlight: whiteCloud * 0.68 + lilacCloud * 0.12,
          darkMix: darkBasin * 0.74,
          darkTarget: [0.010, 0.004, 0.032],
        };
      },

      arctic(u, v) {
        const color = [0.004, 0.012, 0.050];
        const cyanColumn = gaussian(u, v, 0.08, 0.50, 0.032, 0.38);
        const blueColumn = gaussian(u, v, 0.38, 0.47, 0.048, 0.33);
        const iceColumn = gaussian(u, v, 0.72, 0.42, 0.024, 0.30);
        const polarMist = gaussian(u, v, 0.55, 0.18, 0.24, 0.13);
        const scanner = band(v + 0.20 * Math.sin((u + 0.12) * Math.PI * 2), 0.34, 0.016);
        const darkHorizon = band(v, 0.63, 0.052);
        addColor(color, [0.00, 3.8, 5.8], cyanColumn * 0.88);
        addColor(color, [0.00, 0.38, 5.2], blueColumn * 0.86);
        addColor(color, [2.2, 4.2, 5.4], iceColumn * 0.78);
        addColor(color, [1.1, 1.5, 2.8], polarMist * 0.44);
        addColor(color, [4.2, 5.2, 6.0], scanner * 0.82);
        return {
          color,
          highlight: scanner * 0.84 + iceColumn * 0.22,
          darkMix: darkHorizon * 0.88,
          darkTarget: [0.001, 0.006, 0.034],
        };
      },

      magenta(u, v) {
        const color = [0.020, 0.002, 0.028];
        const whiteBox = softBox(u, v, 0.24, 0.22, 0.13, 0.060, 0.012);
        const pinkBox = softBox(u, v, 0.82, 0.53, 0.060, 0.31, 0.016);
        const violetBox = softBox(u, v, 0.08, 0.48, 0.042, 0.28, 0.015);
        const goldSlit = softBox(u, v, 0.53, 0.43, 0.018, 0.19, 0.008);
        const hotFloor = band(v, 0.79, 0.15);
        const blackGutter = softBox(u, v, 0.54, 0.60, 0.24, 0.035, 0.012);
        addColor(color, [4.5, 3.8, 5.0], whiteBox * 0.78);
        addColor(color, [6.0, 0.005, 2.1], pinkBox * 0.92);
        addColor(color, [1.5, 0.02, 5.2], violetBox * 0.84);
        addColor(color, [5.2, 1.2, 0.04], goldSlit * 0.82);
        addColor(color, [5.0, 0.005, 1.7], hotFloor * 0.68);
        return {
          color,
          highlight: whiteBox * 0.76 + goldSlit * 0.42,
          darkMix: blackGutter * 0.96,
          darkTarget: [0.014, 0.001, 0.022],
        };
      },

      sunset(u, v) {
        const color = [0.028, 0.008, 0.024];
        const sun = gaussian(u, v, 0.56, 0.30, 0.15, 0.16);
        const horizon = band(v + 0.022 * Math.sin(u * Math.PI * 2), 0.54, 0.018);
        const amberFloor = band(v, 0.77, 0.16);
        const copperSide = gaussian(u, v, 0.87, 0.53, 0.078, 0.31);
        const peachPanel = gaussian(u, v, 0.18, 0.42, 0.10, 0.25);
        const darkBand = band(v, 0.65, 0.054);
        addColor(color, [4.8, 3.0, 0.72], sun * 0.74);
        addColor(color, [6.0, 2.1, 0.12], horizon * 0.88);
        addColor(color, [4.1, 0.36, 0.05], amberFloor * 0.68);
        addColor(color, [4.6, 0.14, 0.06], copperSide * 0.72);
        addColor(color, [3.4, 1.3, 1.1], peachPanel * 0.52);
        return {
          color,
          highlight: horizon * 0.82 + sun * 0.42,
          darkMix: darkBand * 0.90,
          darkTarget: [0.024, 0.004, 0.012],
        };
      },

      tunnel(u, v) {
        const color = [0.004, 0.002, 0.018];
        const deltaX = wrappedDelta(u, 0.50);
        const deltaY = v - 0.52;
        const radius = Math.hypot(deltaX * 1.35, deltaY * 0.82);
        const cyanRings = band(radius, 0.14, 0.012) + band(radius, 0.37, 0.018);
        const pinkRings = band(radius, 0.245, 0.015) + band(radius, 0.48, 0.022);
        const violetMist = band(radius, 0.31, 0.075);
        const portal = gaussian(u, v, 0.50, 0.52, 0.065, 0.10);
        addColor(color, [0.00, 4.0, 5.8], cyanRings * 0.84);
        addColor(color, [5.8, 0.005, 2.4], pinkRings * 0.82);
        addColor(color, [0.42, 0.03, 2.4], violetMist * 0.22);
        addColor(color, [4.4, 4.8, 5.4], portal * 0.82);
        return {
          color,
          highlight: portal * 0.72 + cyanRings * 0.18,
          darkMix: 0,
          darkTarget: [0.003, 0.001, 0.012],
        };
      },
    };
    const render = renderers[styleKey] || renderers.prism;

    for (let y = 0; y < height; y += 1) {
      const v = y / (height - 1);
      for (let x = 0; x < width; x += 1) {
        const u = x / (width - 1);
        const sample = render(u, v);
        const pixelIndex = (y * width + x) * 4;
        for (let channel = 0; channel < 3; channel += 1) {
          const radiance = Math.max(0, sample.color[channel]);
          const brightMapped = radiance / (1 + radiance);
          const darkMix = clamp01(sample.darkMix);
          const mapped = brightMapped * (1 - darkMix) + sample.darkTarget[channel] * darkMix;
          pixels[pixelIndex + channel] = Math.round(Math.pow(clamp01(mapped), 1 / 2.2) * 255);
        }
        pixels[pixelIndex + 3] = Math.round(clamp01(sample.highlight) * 255);
      }
    }
    return pixels;
  }

  function boxBlurZero(source, width, height, radius) {
    const span = radius * 2 + 1;
    const horizontal = new Float32Array(source.length);
    const output = new Float32Array(source.length);

    for (let y = 0; y < height; y += 1) {
      const row = y * width;
      let sum = 0;
      for (let x = 0; x <= radius && x < width; x += 1) sum += source[row + x];
      for (let x = 0; x < width; x += 1) {
        horizontal[row + x] = sum / span;
        const removeX = x - radius;
        const addX = x + radius + 1;
        if (removeX >= 0) sum -= source[row + removeX];
        if (addX < width) sum += source[row + addX];
      }
    }

    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let y = 0; y <= radius && y < height; y += 1) sum += horizontal[y * width + x];
      for (let y = 0; y < height; y += 1) {
        output[y * width + x] = sum / span;
        const removeY = y - radius;
        const addY = y + radius + 1;
        if (removeY >= 0) sum -= horizontal[removeY * width + x];
        if (addY < height) sum += horizontal[addY * width + x];
      }
    }
    return output;
  }

  function createGlyphBodyHeight(alphaPixels, width, height, glyphs, sigma) {
    const output = new Float32Array(width * height);
    const passes = 3;
    const idealWidth = Math.sqrt((12 * sigma * sigma) / passes + 1);
    const radius = Math.max(1, Math.round((idealWidth - 1) * 0.5));

    glyphs.forEach((glyph) => {
      const left = Math.max(0, glyph.cellLeft);
      const top = Math.max(0, glyph.cellTop);
      const right = Math.min(width, glyph.cellRight);
      const bottom = Math.min(height, glyph.cellBottom);
      const localWidth = right - left;
      const localHeight = bottom - top;
      let field = new Float32Array(localWidth * localHeight);

      // A blurred coverage field bends the face only near its silhouettes.
      // Unlike positive distance, it contains no medial-axis topology, so
      // branched glyphs such as M cannot expose a centre-line seam.
      for (let y = top; y < bottom; y += 1) {
        const localRow = (y - top) * localWidth;
        const globalRow = y * width;
        for (let x = left; x < right; x += 1) {
          const sourceIndex = globalRow + x;
          field[localRow + x - left] = alphaPixels[sourceIndex * 4 + 3] / 255;
        }
      }

      for (let pass = 0; pass < passes; pass += 1) {
        field = boxBlurZero(field, localWidth, localHeight, radius);
      }

      for (let y = top; y < bottom; y += 1) {
        const localRow = (y - top) * localWidth;
        const globalRow = y * width;
        for (let x = left; x < right; x += 1) {
          const sourceIndex = globalRow + x;
          const blurred = Math.max(0, Math.min(1, field[localRow + x - left]));
          output[sourceIndex] = 1 - Math.pow(1 - blurred, 1.15);
        }
      }
    });
    return output;
  }

  function createGlyphShadingDistance(signedField, width, height, glyphs, spread = 24) {
    const output = new Float32Array(width * height);
    output.fill(-spread);
    const kernel = [
      1 / 256, 8 / 256, 28 / 256, 56 / 256, 70 / 256,
      56 / 256, 28 / 256, 8 / 256, 1 / 256,
    ];
    const radius = 4;

    glyphs.forEach((glyph) => {
      const left = Math.max(0, Math.floor(glyph.cellLeft));
      const top = Math.max(0, Math.floor(glyph.cellTop));
      const right = Math.min(width, Math.ceil(glyph.cellRight));
      const bottom = Math.min(height, Math.ceil(glyph.cellBottom));
      const localWidth = right - left;
      const localHeight = bottom - top;
      const field = new Float32Array(localWidth * localHeight);
      const horizontal = new Float32Array(field.length);

      for (let y = 0; y < localHeight; y += 1) {
        for (let x = 0; x < localWidth; x += 1) {
          const distance = signedField[(y + top) * width + x + left];
          field[y * localWidth + x] = Math.max(-spread, Math.min(spread, distance));
        }
      }

      for (let y = 0; y < localHeight; y += 1) {
        for (let x = 0; x < localWidth; x += 1) {
          let value = 0;
          for (let offset = -radius; offset <= radius; offset += 1) {
            const sampleX = x + offset;
            const sample = sampleX < 0 || sampleX >= localWidth
              ? -spread
              : field[y * localWidth + sampleX];
            value += sample * kernel[offset + radius];
          }
          horizontal[y * localWidth + x] = value;
        }
      }

      for (let y = 0; y < localHeight; y += 1) {
        for (let x = 0; x < localWidth; x += 1) {
          let value = 0;
          for (let offset = -radius; offset <= radius; offset += 1) {
            const sampleY = y + offset;
            const sample = sampleY < 0 || sampleY >= localHeight
              ? -spread
              : horizontal[sampleY * localWidth + x];
            value += sample * kernel[offset + radius];
          }
          output[(y + top) * width + x + left] = value;
        }
      }
    });
    return output;
  }

  window.ArtTextFields = Object.freeze({
    createGlyphBodyHeight,
    createGlyphShadingDistance,
    createNoiseField,
    createReflectionColorField,
  });
})();
