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

  function createReflectionColorField(width = 512, height = 256) {
    const pixels = new Uint8Array(width * height * 4);
    const clamp01 = (value) => Math.max(0, Math.min(1, value));
    const gaussian = (u, v, centerX, centerY, spreadX, spreadY) => {
      const directX = Math.abs(u - centerX);
      const wrappedX = Math.min(directX, 1 - directX);
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

    for (let y = 0; y < height; y += 1) {
      const v = y / (height - 1);
      for (let x = 0; x < width; x += 1) {
        const u = x / (width - 1);
        const color = [0.055 + v * 0.035, 0.045, 0.105 + (1 - v) * 0.055];
        const whiteDome = gaussian(u, v, 0.52, 0.20, 0.28, 0.12);
        const whiteCeiling = gaussian(u, v, 0.03, 0.055, 0.34, 0.050);
        const cyanWall = gaussian(u, v, 0.17, 0.48, 0.070, 0.28);
        const blueGlass = gaussian(u, v, 0.40, 0.49, 0.052, 0.22);
        const pinkWall = gaussian(u, v, 0.82, 0.45, 0.078, 0.30);
        const goldSlit = gaussian(u, v, 0.285, 0.53, 0.038, 0.18);
        const pinkFloor = gaussian(u, v, 0.58, 0.73, 0.38, 0.095);
        const whiteFloor = gaussian(u, v, 0.62, 0.90, 0.30, 0.060);
        const cyanRibbonCenter = 0.43 + Math.sin((u + 0.08) * Math.PI * 2) * 0.075;
        const cyanRibbon = Math.exp(-Math.pow((v - cyanRibbonCenter) / 0.048, 2));
        const magentaRibbonCenter = 0.67 - Math.sin((u + 0.23) * Math.PI * 2) * 0.055;
        const magentaRibbon = Math.exp(-Math.pow((v - magentaRibbonCenter) / 0.056, 2));

        addColor(color, [1.18, 1.10, 1.32], whiteDome * 0.66);
        addColor(color, [0.74, 0.86, 1.28], whiteCeiling * 0.38);
        addColor(color, [0.04, 1.18, 1.58], cyanWall * 1.72);
        addColor(color, [0.12, 0.34, 1.62], blueGlass * 1.32);
        addColor(color, [1.72, 0.055, 0.92], pinkWall * 1.76);
        addColor(color, [1.52, 0.62, 0.08], goldSlit * 1.12);
        addColor(color, [1.62, 0.075, 0.88], pinkFloor * 1.48);
        addColor(color, [1.12, 0.92, 1.16], whiteFloor * 0.46);
        addColor(color, [0.04, 0.82, 1.40], cyanRibbon * 0.58);
        addColor(color, [1.48, 0.035, 0.72], magentaRibbon * 0.62);

        const darkFlag = gaussian(u, v, 0.55, 0.53, 0.18, 0.055);
        const darkSide = gaussian(u, v, 0.96, 0.48, 0.075, 0.22);
        const shade = 1 - darkFlag * 0.78 - darkSide * 0.40;
        const pixelIndex = (y * width + x) * 4;
        for (let channel = 0; channel < 3; channel += 1) {
          const mapped = 1 - Math.exp(-Math.max(0, color[channel] * shade) * 0.92);
          pixels[pixelIndex + channel] = Math.round(Math.pow(clamp01(mapped), 1 / 2.2) * 255);
        }
        const highlightEnergy = clamp01(whiteDome * 0.58 + whiteCeiling * 0.30 + whiteFloor * 0.36);
        pixels[pixelIndex + 3] = Math.round(highlightEnergy * 255);
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
    const support = radius * passes + 2;

    glyphs.forEach((glyph) => {
      const left = Math.max(0, glyph.cellLeft - support);
      const top = Math.max(0, glyph.cellTop - support);
      const right = Math.min(width, glyph.cellRight + support);
      const bottom = Math.min(height, glyph.cellBottom + support);
      const localWidth = right - left;
      const localHeight = bottom - top;
      let field = new Float32Array(localWidth * localHeight);

      for (let y = glyph.cellTop; y < glyph.cellBottom; y += 1) {
        const localRow = (y - top) * localWidth;
        const globalRow = y * width;
        for (let x = glyph.cellLeft; x < glyph.cellRight; x += 1) {
          field[localRow + x - left] = alphaPixels[(globalRow + x) * 4 + 3] / 255;
        }
      }

      for (let pass = 0; pass < passes; pass += 1) {
        field = boxBlurZero(field, localWidth, localHeight, radius);
      }

      for (let y = glyph.cellTop; y < glyph.cellBottom; y += 1) {
        const localRow = (y - top) * localWidth;
        const globalRow = y * width;
        for (let x = glyph.cellLeft; x < glyph.cellRight; x += 1) {
          const blurred = Math.max(0, Math.min(1, field[localRow + x - left]));
          output[globalRow + x] = 1 - Math.pow(1 - blurred, 1.6);
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
