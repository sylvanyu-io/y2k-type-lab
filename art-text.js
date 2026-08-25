(() => {
  "use strict";

  const TEXTURE_WIDTH = 1600;
  const TEXTURE_HEIGHT = 900;
  const SDF_SPREAD = 72;
  const SHADING_SDF_SPREAD = 24;
  const VHS_OUTLINE_DISTANCE = 4.5;
  const VHS_OUTLINE_AA = 2.1;
  const BODY_INFLATE = 3.5;
  const FACE_CURVE_REFERENCE_CROWN = 16;
  // BODY and FACE are independent height sources. Give each its own slope
  // budget so one control cannot consume or amplify the other's response.
  const BODY_MAX_SLOPE = 0.45;
  const FACE_MAX_SLOPE = 0.30;
  const DEFAULT_GLYPH_TRANSFORM = Object.freeze({ x: 0, y: 0, rotation: 0, scale: 1 });
  const GLYPH_HANDLE_OFFSET_CSS = 28;
  const GLYPH_HANDLE_RADIUS_CSS = 12;
  const GLYPH_HANDLE_OFFSET_MOBILE_CSS = 34;
  const GLYPH_HANDLE_RADIUS_MOBILE_CSS = 20;
  const GLYPH_HANDLE_HIT_RADIUS_MOBILE_CSS = 22;
  const MOBILE_EDITOR_QUERY = "(max-width: 679px)";
  // Keep final presentation and editor hit-testing on one shared mapping.
  const PERSPECTIVE_MAX = 120;
  const PERSPECTIVE_TOP_SCALE = 0.552;
  const DOT_CONTOUR_PIXEL_PX = 14;
  const DOT_FONT_WEIGHT = 500;
  const MAX_TEXT_LENGTH = 36;
  const MAX_TEXT_LINES = 3;
  const MAX_GLYPHS_PER_LINE = 18;
  const INF = 1e20;
  const DISPLAY_FONT = '"Arial Rounded MT Bold", "Yuanti SC", "Hiragino Maru Gothic ProN", "Avenir Next", "PingFang SC", sans-serif';
  const DOT_FONT_FAMILY = "Tektur DOT";
  const DOT_DISPLAY_FONT = `"${DOT_FONT_FAMILY}", "Arial Black", "Impact", "PingFang SC", sans-serif`;
  const DEBUG_SURFACE = new URLSearchParams(window.location.search).get("debug") || "";
  const LANGUAGE_STORAGE_KEY = "artText.language";
  const DEFAULT_LANGUAGE = "en";
  const I18N = Object.freeze({
    en: Object.freeze({
      "document.title": "Y2K Type Lab",
      "brand.title": "Y2K TYPE LAB",
      "brand.subtitle": "WEBGL ART-TEXT EDITOR",
      "common.reset": "RESET",
      "common.apply": "APPLY",
      "common.loading": "LOADING",
      "common.selected": "SELECTED",
      "common.active": "ACTIVE",
      "common.step1": "STEP 01",
      "common.step2": "STEP 02",
      "aria.renderStatus": "Render status",
      "aria.resetMaterial": "Reset current material settings",
      "aria.canvasRegion": "Art-text canvas",
      "aria.canvasView": "Canvas view",
      "aria.quickPresets": "Quick material preset switcher",
      "aria.compactTools": "Compact editor tools",
      "aria.surfacePanel": "Material presets, reflection fields, and diagnostic textures",
      "aria.inspector": "Art-text controls",
      "aria.presetGroup": "Material presets",
      "aria.presetChoice": "Select {preset} material preset",
      "aria.reflectionChoice": "Select {field} reflection field",
      "aria.canvasPreset": "{preset} art-text preview. Click and drag a character to edit it.",
      "canvas.artboard": "ARTBOARD",
      "canvas.material": "MATERIAL",
      "canvas.semanticId": "SEMANTIC ID",
      "glyph.help": "Click and drag a character. Use the magenta handle to rotate and the cyan handle to scale. Page Up and Page Down switch characters; arrow keys move; Alt plus arrow keys rotate or scale.",
      "glyph.click": "CLICK CHARACTER",
      "glyph.move": "MOVE",
      "glyph.rotate": "ROTATE",
      "glyph.scale": "SCALE",
      "glyph.selected": "SELECTED CHARACTER",
      "glyph.resetOne": "RESET CHARACTER",
      "glyph.resetAll": "RESET ALL LAYOUT",
      "mobile.field": "FIELD",
      "mobile.light": "LIGHT",
      "mobile.type": "TYPE",
      "mobile.text": "TEXT",
      "mobile.material": "MATERIAL",
      "mobile.surface": "SURFACE",
      "mobile.fx": "FX",
      "mobile.effects": "EFFECTS",
      "surface.lab": "MATERIAL LAB",
      "surface.build": "BUILD THE SURFACE",
      "surface.presets": "MATERIAL PRESETS",
      "surface.presetHelp": "CLICK A COVER TO SWITCH THE FULL LOOK",
      "reflection.title": "REFLECTION FIELD",
      "reflection.help": "SECONDARY LIGHTING FOR VHS / LIQUID",
      "reflection.customUrl": "CUSTOM REFLECTION URL",
      "reflection.customOption": "CUSTOM URL…",
      "reflection.unavailable": "THIS PRESET DOES NOT USE A REFLECTION FIELD.",
      "reflection.urlPlaceholder": "https://… / data:image… / blob:…",
      "textures.eyebrow": "TEXTURES",
      "textures.title": "MATERIAL MAPS",
      "textures.help": "SURFACE TEXTURE STACK",
      "textures.flow": "FLOW NOISE",
      "textures.grain": "FILM GRAIN",
      "textures.coverage": "COVERAGE",
      "textures.body": "BODY HEIGHT",
      "textures.clipSdf": "CLIP SDF",
      "textures.shadingSdf": "SHADING SDF",
      "textures.normal": "NORMAL XY",
      "inspector.title": "INSPECTOR",
      "type.title": "TEXT & LAYOUT",
      "type.text": "TEXT CONTENT",
      "type.textHint": "LIVE PREVIEW · ENTER FOR NEW LINE",
      "type.textOverflow": "ONLY THE FIRST 3 LINES · 18 CHARACTERS PER LINE RENDER",
      "type.textMeta": "{count}/{max} CH · {lines}/{maxLines} LN",
      "type.textLimits": "Up to 36 characters, 3 lines, and 18 characters per line.",
      "type.tracking": "TRACKING",
      "type.lineHeight": "LINE HEIGHT",
      "material.title": "MATERIAL",
      "material.edgeRoll": "EDGE ROLL",
      "material.bodyCrown": "BODY CROWN",
      "material.faceCurve": "FACE CURVE",
      "material.envCoverage": "ENV COVERAGE",
      "material.offsetX": "OFFSET X",
      "material.offsetY": "OFFSET Y",
      "material.reflectivity": "REFLECTIVITY",
      "material.fieldStrength": "FIELD STRENGTH",
      "material.roughness": "ROUGHNESS",
      "material.baseColor": "BASE COLOR",
      "material.baseColorHelp": "VISIBLE AT 0% REFLECTIVITY",
      "material.liquidWarp": "LIQUID WARP",
      "material.dotSize": "DOT SIZE",
      "material.outlineThickness": "OUTLINE THICKNESS",
      "material.perspective": "PERSPECTIVE ANGLE",
      "material.glitch": "GLITCH",
      "material.scanlineGap": "SCANLINE GAP",
      "material.scanline": "SCANLINE",
      "material.depth": "DEPTH",
      "fx.title": "FX",
      "fx.edgeGlow": "EDGE GLOW",
      "fx.sceneDetail": "SCENE DETAIL",
      "fx.edge": "EDGE",
      "fx.reflect": "REFLECT",
      "export.title": "EXPORT",
      "export.pending": "Transparent background and 2× PNG will be enabled in the full version.",
      "unit.layers": "{value} LAYERS",
      "unit.glyphs": "{value} GLYPHS",
      "status.webglStarting": "WEBGL · STARTING",
      "status.webglReady": "{renderer} · READY",
      "status.webglUnavailable": "WEBGL · UNAVAILABLE",
      "status.shaderError": "SHADER ERROR",
      "status.waitingGlyphBake": "WAITING FOR GLYPH BAKE",
      "status.normalBakeReady": "NORMAL BAKE READY",
      "status.loadingDotFont": "LOADING DOT FONT",
      "status.buildingSdf": "BUILDING SDF",
      "status.bakeReady": "BAKE READY",
      "status.waitingInput": "WAITING FOR INPUT",
      "status.waitingNormalBake": "WAITING FOR NORMAL BAKE",
      "announce.presetApplied": "Applied {preset}",
      "announce.reflectionApplied": "Applied {field} reflection field",
      "announce.customReflectionApplied": "Applied custom reflection field",
      "announce.glyphSelected": "Selected character {glyph}, {index} of {count}",
      "announce.glyphCleared": "Character selection cleared",
      "announce.glyphTransform": "Character {glyph}: X {x}, Y {y}, rotation {rotation} degrees, scale {scale}%",
      "announce.glyphResetAll": "Reset all character layout",
      "reflection.enterUrl": "Enter an image URL, then select APPLY",
      "reflection.loadingCustom": "Loading and processing the 1024 × 512 reflection field…",
      "reflection.customApplied": "Custom reflection field applied",
      "reflection.restoringCustom": "Restoring custom reflection field…",
      "reflection.customRestored": "Custom reflection field restored",
      "error.urlRequired": "Enter an image URL",
      "error.webglUnavailable": "This browser cannot create a WebGL context.",
      "error.webglTextureSize": "{renderer} supports textures up to {available}px; Y2K Type Lab needs {required}px.",
      "error.webglTextureUnits": "{renderer} exposes {available} texture units; Y2K Type Lab needs {required}.",
      "error.webglHighp": "This WebGL 1 device lacks highp fragment precision.",
      "error.webglDerivatives": "This WebGL 1 device lacks standard shader derivatives.",
      "error.urlTooLarge": "DATA URL is too large (maximum 8 MiB)",
      "error.urlInvalid": "Invalid URL format",
      "error.urlScheme": "Only http(s), data, or blob image URLs are supported",
      "error.mixedContent": "An HTTPS page cannot load an HTTP image",
      "error.dataMime": "DATA URL supports PNG, JPEG, WebP, or AVIF only",
      "error.unknownReflection": "Unknown reflection field",
      "error.imageTimeout": "Image loading timed out",
      "error.imageSizeInvalid": "Invalid image dimensions",
      "error.imageTooLarge": "Image is too large (maximum 8192px / 32MP)",
      "error.customImageLoad": "Image failed to load; public URLs must allow cross-origin access (CORS)",
      "error.builtinImageLoad": "Built-in reflection field failed to load: {field}",
      "error.imageUnreadable": "Image cannot be read; make sure the URL allows cross-origin access (CORS)",
      "error.textureCreate": "Unable to create reflection texture",
      "error.textureUpload": "Reflection texture upload failed ({code})",
      "error.reflectionLoad": "Reflection field failed to load",
      "error.customUnavailable": "Custom reflection field is unavailable",
      "error.reflectionUnavailable": "Reflection field is unavailable",
      "error.fallbackApplied": "{error}; fell back to {field}",
      "error.fallbackFailed": "{error}; fallback failed: {fallback}",
    }),
    zh: Object.freeze({
      "document.title": "Y2K Type Lab",
      "brand.title": "Y2K TYPE LAB",
      "brand.subtitle": "WebGL 艺术字编辑器",
      "common.reset": "重置",
      "common.apply": "应用",
      "common.loading": "加载中",
      "common.selected": "已选择",
      "common.active": "使用中",
      "common.step1": "第 1 步",
      "common.step2": "第 2 步",
      "aria.renderStatus": "渲染状态",
      "aria.resetMaterial": "重置当前材质参数",
      "aria.canvasRegion": "艺术字画布",
      "aria.canvasView": "画布视图",
      "aria.quickPresets": "材质预设快捷切换",
      "aria.compactTools": "紧凑编辑工具",
      "aria.surfacePanel": "材质预设、反射光场与诊断纹理",
      "aria.inspector": "艺术字参数",
      "aria.presetGroup": "材质预设",
      "aria.presetChoice": "选择 {preset} 材质预设",
      "aria.reflectionChoice": "选择 {field} 反射光场",
      "aria.canvasPreset": "{preset} 艺术字预览，可点击字符并拖动编辑",
      "canvas.artboard": "画板",
      "canvas.material": "材质",
      "canvas.semanticId": "语义 ID",
      "glyph.help": "点击并拖动字符。洋红手柄旋转，青色手柄缩放。Page Up 和 Page Down 切换字符；方向键移动；Alt 加方向键旋转或缩放。",
      "glyph.click": "点击字符",
      "glyph.move": "移动",
      "glyph.rotate": "旋转",
      "glyph.scale": "缩放",
      "glyph.selected": "已选字符",
      "glyph.resetOne": "重置字符",
      "glyph.resetAll": "重置全部布局",
      "mobile.field": "光场",
      "mobile.light": "灯光",
      "mobile.type": "文字",
      "mobile.text": "排版",
      "mobile.material": "材质",
      "mobile.surface": "表面",
      "mobile.fx": "效果",
      "mobile.effects": "氛围",
      "surface.lab": "材质实验室",
      "surface.build": "构建整体材质",
      "surface.presets": "材质预设",
      "surface.presetHelp": "点击封面切换整套效果",
      "reflection.title": "反射光场",
      "reflection.help": "用于 VHS / LIQUID 的辅助光照",
      "reflection.customUrl": "自定义反射图片 URL",
      "reflection.customOption": "自定义 URL…",
      "reflection.unavailable": "此预设不使用反射光场。",
      "reflection.urlPlaceholder": "粘贴图片 URL（https://、data:image 或 blob:）",
      "textures.eyebrow": "纹理",
      "textures.title": "材质贴图",
      "textures.help": "表面纹理栈",
      "textures.flow": "流动噪声",
      "textures.grain": "胶片颗粒",
      "textures.coverage": "覆盖度",
      "textures.body": "主体高度",
      "textures.clipSdf": "裁剪 SDF",
      "textures.shadingSdf": "着色 SDF",
      "textures.normal": "法线 XY",
      "inspector.title": "参数面板",
      "type.title": "文字与排版",
      "type.text": "文字内容",
      "type.textHint": "实时预览 · Enter 换行",
      "type.textOverflow": "仅渲染前 3 行 · 每行前 18 个字符",
      "type.textMeta": "{count}/{max} 字 · {lines}/{maxLines} 行",
      "type.textLimits": "最多 36 个字符、3 行，每行 18 个字符。",
      "type.tracking": "字距",
      "type.lineHeight": "行高",
      "material.title": "材质",
      "material.edgeRoll": "边缘圆润度",
      "material.bodyCrown": "字面隆起",
      "material.faceCurve": "字面曲率",
      "material.envCoverage": "环境映射范围",
      "material.offsetX": "X 偏移",
      "material.offsetY": "Y 偏移",
      "material.reflectivity": "反射率",
      "material.fieldStrength": "光场强度",
      "material.roughness": "粗糙度",
      "material.baseColor": "基础颜色",
      "material.baseColorHelp": "反射率为 0% 时显示",
      "material.liquidWarp": "液态扭曲",
      "material.dotSize": "点阵大小",
      "material.outlineThickness": "描边厚度",
      "material.perspective": "透视角度",
      "material.glitch": "故障强度",
      "material.scanlineGap": "扫描线间距",
      "material.scanline": "扫描线强度",
      "material.depth": "挤出深度",
      "fx.title": "效果",
      "fx.edgeGlow": "边缘辉光",
      "fx.sceneDetail": "场景细节",
      "fx.edge": "边缘色",
      "fx.reflect": "反射色",
      "export.title": "导出",
      "export.pending": "透明背景与 2× PNG 将在完整版本启用。",
      "unit.layers": "{value} 层",
      "unit.glyphs": "{value} 个字符",
      "status.webglStarting": "WEBGL · 启动中",
      "status.webglReady": "{renderer} · 就绪",
      "status.webglUnavailable": "WEBGL · 不可用",
      "status.shaderError": "着色器错误",
      "status.waitingGlyphBake": "等待字符烘焙",
      "status.normalBakeReady": "法线烘焙就绪",
      "status.loadingDotFont": "正在加载点阵字体",
      "status.buildingSdf": "正在生成 SDF",
      "status.bakeReady": "烘焙就绪",
      "status.waitingInput": "等待输入",
      "status.waitingNormalBake": "等待法线烘焙",
      "announce.presetApplied": "已应用 {preset}",
      "announce.reflectionApplied": "已应用 {field} 反射光场",
      "announce.customReflectionApplied": "已应用自定义反射光场",
      "announce.glyphSelected": "已选中字符 {glyph}，第 {index} 个，共 {count} 个",
      "announce.glyphCleared": "已取消字符选择",
      "announce.glyphTransform": "字符 {glyph}：X {x}，Y {y}，旋转 {rotation} 度，缩放 {scale}%",
      "announce.glyphResetAll": "已重置全部字符布局",
      "reflection.enterUrl": "输入图片 URL 后点击应用",
      "reflection.loadingCustom": "正在加载并处理 1024 × 512 反射光场…",
      "reflection.customApplied": "自定义反射光场已应用",
      "reflection.restoringCustom": "正在恢复自定义反射光场…",
      "reflection.customRestored": "自定义反射光场已恢复",
      "error.urlRequired": "请输入图片 URL",
      "error.webglUnavailable": "当前浏览器无法创建 WebGL 上下文。",
      "error.webglTextureSize": "{renderer} 最大支持 {available}px 纹理；Y2K Type Lab 需要 {required}px。",
      "error.webglTextureUnits": "{renderer} 提供 {available} 个纹理单元；Y2K Type Lab 需要 {required} 个。",
      "error.webglHighp": "当前 WebGL 1 设备不支持片元着色器 highp 精度。",
      "error.webglDerivatives": "当前 WebGL 1 设备不支持标准着色器导数。",
      "error.urlTooLarge": "DATA URL 过大（最大 8 MiB）",
      "error.urlInvalid": "URL 格式无效",
      "error.urlScheme": "仅支持 http(s)、data 或 blob 图片 URL",
      "error.mixedContent": "HTTPS 页面不能加载 HTTP 图片",
      "error.dataMime": "DATA URL 仅支持 PNG、JPEG、WebP 或 AVIF",
      "error.unknownReflection": "未知反射光场",
      "error.imageTimeout": "图片加载超时",
      "error.imageSizeInvalid": "图片尺寸无效",
      "error.imageTooLarge": "图片尺寸过大（最大 8192px / 32MP）",
      "error.customImageLoad": "图片加载失败；公开 URL 需要允许跨域访问（CORS）",
      "error.builtinImageLoad": "内置反射光场加载失败：{field}",
      "error.imageUnreadable": "图片无法读取；请确认 URL 允许跨域访问（CORS）",
      "error.textureCreate": "无法创建反射纹理",
      "error.textureUpload": "反射纹理上传失败（{code}）",
      "error.reflectionLoad": "反射光场加载失败",
      "error.customUnavailable": "自定义反射光场不可用",
      "error.reflectionUnavailable": "反射光场不可用",
      "error.fallbackApplied": "{error}；已回退 {field}",
      "error.fallbackFailed": "{error}；回退失败：{fallback}",
    }),
  });
  function readStoredLanguage() {
    try {
      const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      return Object.prototype.hasOwnProperty.call(I18N, stored) ? stored : DEFAULT_LANGUAGE;
    } catch {
      return DEFAULT_LANGUAGE;
    }
  }
  let uiLanguage = readStoredLanguage();
  function t(key, params = {}) {
    const template = I18N[uiLanguage]?.[key] ?? I18N[DEFAULT_LANGUAGE]?.[key] ?? key;
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
  }
  function localized(key, params = {}) {
    return { key, params };
  }
  function localizedError(key, params = {}) {
    const error = new Error(t(key, params));
    error.i18nKey = key;
    error.i18nParams = params;
    return error;
  }
  function localizedErrorMessage(error, fallbackKey = "error.reflectionLoad") {
    if (error?.i18nKey) return t(error.i18nKey, error.i18nParams);
    return error?.message || t(fallbackKey);
  }
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
    mobilePanelTabs: [...document.querySelectorAll("[data-mobile-panel-tab]")],
    presetRail: document.querySelector("#surfacePanel"),
    inspector: document.querySelector("#inspectorPanel"),
    typographyControls: document.querySelector("#typographyControls"),
    materialControls: document.querySelector("#materialControls"),
    fxControls: document.querySelector("#fxControls"),
    exportControls: document.querySelector("#exportControls"),
    presetCards: [...document.querySelectorAll("[data-material-preset]")],
    reflectionStyleCards: [...document.querySelectorAll("[data-reflection-style]")],
    generatedAssetCanvases: new Map(
      [...document.querySelectorAll("canvas[data-generated-asset]")]
        .map((canvas) => [canvas.dataset.generatedAsset, canvas]),
    ),
    materialSpecificControls: [...document.querySelectorAll("[data-materials]")],
    languageToggle: document.querySelector("#languageToggle"),
    resetButton: document.querySelector("#resetButton"),
    materialViewButton: document.querySelector("#materialViewButton"),
    idViewButton: document.querySelector("#idViewButton"),
    textInput: document.querySelector("#textInput"),
    textInputHint: document.querySelector("#textInputHint"),
    textInputMeta: document.querySelector("#textInputMeta"),
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
    glyphTransformOverlay: document.querySelector("#glyphTransformOverlay"),
    glyphSelectionBox: document.querySelector("#glyphSelectionBox"),
    glyphRotateStem: document.querySelector("#glyphRotateStem"),
    glyphRotateHitArea: document.querySelector("#glyphRotateHitArea"),
    glyphScaleHitArea: document.querySelector("#glyphScaleHitArea"),
    glyphRotateHandle: document.querySelector("#glyphRotateHandle"),
    glyphScaleHandle: document.querySelector("#glyphScaleHandle"),
    glyphTransformControls: document.querySelector("#glyphTransformControls"),
    glyphInteractionGuide: document.querySelector("#glyphInteractionGuide"),
    selectedGlyphLabel: document.querySelector("#selectedGlyphLabel"),
    glyphOffsetXInput: document.querySelector("#glyphOffsetXInput"),
    glyphOffsetYInput: document.querySelector("#glyphOffsetYInput"),
    glyphRotationInput: document.querySelector("#glyphRotationInput"),
    glyphScaleInput: document.querySelector("#glyphScaleInput"),
    resetGlyphTransformButton: document.querySelector("#resetGlyphTransformButton"),
    resetAllGlyphTransformsButton: document.querySelector("#resetAllGlyphTransformsButton"),
  };
  ui.textInput.maxLength = MAX_TEXT_LENGTH;

  const state = {
    ...DEFAULTS,
    debugId: false,
    glyphs: [],
    selectedGlyphKey: null,
    glyphTransforms: new Map(),
    artworkBounds: [0.5, 0.5, 0.90, 0.78],
  };
  let nextGlyphKey = 1;
  let latestIdPixels = null;
  let dotFontLoadState = "idle";
  let dotFontLoadPromise = null;
  const mobileEditorMedia = window.matchMedia(MOBILE_EDITOR_QUERY);

  function setLocalizedText(element, key, params = {}) {
    if (!element) return;
    element.dataset.i18nDynamic = key;
    element._i18nParams = params;
    element.textContent = t(key, params);
  }

  function clearLocalizedText(element) {
    if (!element) return;
    delete element.dataset.i18nDynamic;
    delete element._i18nParams;
    element.textContent = "";
  }

  function setLocalizedMessage(element, message) {
    if (!message) {
      clearLocalizedText(element);
      return;
    }
    if (typeof message === "object" && message.key) {
      setLocalizedText(element, message.key, message.params);
      return;
    }
    delete element.dataset.i18nDynamic;
    delete element._i18nParams;
    element.textContent = String(message);
  }

  function syncLanguageDependentAria() {
    const preset = activePreset();
    ui.canvas.setAttribute("aria-label", t("aria.canvasPreset", { preset: preset.label }));
    ui.presetCards.forEach((card) => {
      const cardPreset = PRESETS[card.dataset.materialPreset];
      if (cardPreset) card.setAttribute("aria-label", t("aria.presetChoice", { preset: cardPreset.label }));
    });
    document.querySelector(".surface-switcher")?.setAttribute("aria-label", t("aria.presetGroup"));
    ui.reflectionStyleCards.forEach((card) => {
      const field = REFLECTION_STYLES[card.dataset.reflectionStyle];
      if (field) card.setAttribute("aria-label", t("aria.reflectionChoice", { field }));
      if (card._reflectionLoadError) card.title = localizedErrorMessage(card._reflectionLoadError);
    });
  }

  function applyLanguage(language, { persist = true, refresh = true } = {}) {
    uiLanguage = Object.prototype.hasOwnProperty.call(I18N, language) ? language : DEFAULT_LANGUAGE;
    document.documentElement.lang = uiLanguage === "zh" ? "zh-CN" : "en";
    document.documentElement.dataset.language = uiLanguage;
    document.title = t("document.title");
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = t(element.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
    });
    document.querySelectorAll("[data-i18n-dynamic]").forEach((element) => {
      element.textContent = t(element.dataset.i18nDynamic, element._i18nParams);
    });
    ui.customReflectionUrlInput.placeholder = t("reflection.urlPlaceholder");
    const nextLanguageLabel = uiLanguage === "en" ? "Switch to Chinese" : "切换到英文";
    ui.languageToggle.setAttribute("aria-label", nextLanguageLabel);
    ui.languageToggle.title = nextLanguageLabel;
    syncLanguageDependentAria();
    if (!mobileEditorMedia.matches) ui.presetRail.setAttribute("aria-label", t("aria.surfacePanel"));
    if (refresh) syncControls();
    if (persist) {
      try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, uiLanguage);
      } catch {
        // Keep the in-memory language when storage is unavailable.
      }
    }
  }

  setLocalizedText(ui.gpuStatus, "status.webglStarting");
  setLocalizedText(ui.renderStatus, "status.buildingSdf");
  ui.languageToggle.addEventListener("click", () => {
    applyLanguage(uiLanguage === "en" ? "zh" : "en");
  });

  function mobilePanelElements() {
    return {
      surface: ui.presetRail,
      type: ui.typographyControls,
      material: ui.materialControls,
      fx: ui.fxControls,
    };
  }

  function syncMobileEditorLayout() {
    const isMobileEditor = mobileEditorMedia.matches;
    const panels = mobilePanelElements();
    const requestedPanel = document.documentElement.dataset.mobilePanel;
    const activePanel = panels[requestedPanel] ? requestedPanel : "type";
    document.documentElement.dataset.mobilePanel = activePanel;
    document.documentElement.classList.toggle("is-mobile-editor", isMobileEditor);

    ui.mobilePanelTabs.forEach((tab) => {
      const isActive = tab.dataset.mobilePanelTab === activePanel;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });

    if (!isMobileEditor) {
      ui.presetRail.hidden = false;
      ui.inspector.hidden = false;
      ui.presetRail.setAttribute("aria-label", t("aria.surfacePanel"));
      [ui.typographyControls, ui.materialControls, ui.fxControls, ui.exportControls].forEach((panel) => {
        panel.hidden = false;
        panel.removeAttribute("role");
        panel.removeAttribute("aria-labelledby");
        panel.removeAttribute("tabindex");
      });
      ui.presetRail.removeAttribute("role");
      ui.presetRail.removeAttribute("aria-labelledby");
      ui.presetRail.removeAttribute("tabindex");
      return;
    }

    ui.presetRail.removeAttribute("aria-label");
    ui.presetRail.hidden = activePanel !== "surface";
    ui.inspector.hidden = activePanel === "surface";
    ui.typographyControls.hidden = activePanel !== "type";
    ui.materialControls.hidden = activePanel !== "material";
    ui.fxControls.hidden = activePanel !== "fx";
    ui.exportControls.hidden = true;

    Object.entries(panels).forEach(([key, panel]) => {
      const tab = ui.mobilePanelTabs.find((candidate) => candidate.dataset.mobilePanelTab === key);
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);
      panel.tabIndex = 0;
    });
  }

  function selectMobilePanel(panelKey, { focus = false } = {}) {
    if (!mobilePanelElements()[panelKey]) return;
    document.documentElement.dataset.mobilePanel = panelKey;
    syncMobileEditorLayout();
    const tab = ui.mobilePanelTabs.find((candidate) => candidate.dataset.mobilePanelTab === panelKey);
    if (focus) tab?.focus();
    const scroller = panelKey === "surface" ? ui.presetRail : ui.inspector;
    scroller.scrollTop = 0;
    requestAnimationFrame(syncOverlayBounds);
  }

  ui.mobilePanelTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectMobilePanel(tab.dataset.mobilePanelTab));
    tab.addEventListener("keydown", (event) => {
      let nextIndex = index;
      if (event.key === "ArrowRight") nextIndex = (index + 1) % ui.mobilePanelTabs.length;
      else if (event.key === "ArrowLeft") nextIndex = (index - 1 + ui.mobilePanelTabs.length) % ui.mobilePanelTabs.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = ui.mobilePanelTabs.length - 1;
      else return;
      event.preventDefault();
      selectMobilePanel(ui.mobilePanelTabs[nextIndex].dataset.mobilePanelTab, { focus: true });
    });
  });
  function handleMobileEditorMediaChange() {
    const previouslyFocused = document.activeElement;
    const wasFocusedInMobileChrome = previouslyFocused?.closest?.(".mobile-panel-tabs, .mobile-preset-switcher");
    syncMobileEditorLayout();
    if (previouslyFocused?.closest?.("[hidden]")) {
      ui.mobilePanelTabs.find((tab) => tab.getAttribute("aria-selected") === "true")?.focus();
    } else if (!mobileEditorMedia.matches && wasFocusedInMobileChrome) {
      ui.canvas.focus({ preventScroll: true });
    }
    requestAnimationFrame(syncOverlayBounds);
  }

  if (typeof mobileEditorMedia.addEventListener === "function") {
    mobileEditorMedia.addEventListener("change", handleMobileEditorMediaChange);
  } else {
    mobileEditorMedia.addListener(handleMobileEditorMediaChange);
  }
  syncMobileEditorLayout();

  function activePreset() {
    return PRESETS[state.activePreset] || PRESETS[DEFAULT_PRESET_KEY];
  }

  function activeDisplayFont() {
    return activePreset().mode === 1 ? DOT_DISPLAY_FONT : DISPLAY_FONT;
  }

  function activeDisplayFontWeight() {
    return activePreset().mode === 1 ? DOT_FONT_WEIGHT : 900;
  }

  function ensureDotDisplayFont() {
    if (dotFontLoadState !== "idle") return dotFontLoadState;
    if (!document.fonts) {
      dotFontLoadState = "fallback";
      return dotFontLoadState;
    }
    dotFontLoadState = "loading";
    dotFontLoadPromise = document.fonts
      .load(`${DOT_FONT_WEIGHT} 64px "${DOT_FONT_FAMILY}"`, "Y2K CHROME GLITCH 0123456789")
      .then((faces) => {
        dotFontLoadState = faces.length > 0 ? "ready" : "fallback";
        if (activePreset().mode === 1) scheduleRebuild();
        return dotFontLoadState;
      })
      .catch(() => {
        dotFontLoadState = "fallback";
        if (activePreset().mode === 1) scheduleRebuild();
        return dotFontLoadState;
      });
    return dotFontLoadState;
  }

  function syncPresetSelection() {
    const preset = activePreset();
    document.documentElement.dataset.material = preset.key;
    ui.inspectorMaterialName.textContent = preset.label;
    ui.canvas.setAttribute("aria-label", t("aria.canvasPreset", { preset: preset.label }));
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
    setLocalizedText(ui.materialAnnouncement, "announce.presetApplied", { preset: preset.label });
    state.debugId = false;
    ui.materialViewButton.classList.add("is-active");
    ui.idViewButton.classList.remove("is-active");
    ui.materialViewButton.setAttribute("aria-pressed", "true");
    ui.idViewButton.setAttribute("aria-pressed", "false");
    if (preset.mode === 1) ensureDotDisplayFont();
    applyPresetBake();
    if (preset.mode !== 1) loadPresetReflection(key);
  }

  // Keep the editor controls truthful even when WebGL initialization fails.
  syncControls();
  syncPresetSelection();
  applyLanguage(uiLanguage, { persist: false });

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = TEXTURE_WIDTH;
  sourceCanvas.height = TEXTURE_HEIGHT;
  const sourceContext = sourceCanvas.getContext("2d", { alpha: true, willReadFrequently: true });

  const idCanvas = document.createElement("canvas");
  idCanvas.width = TEXTURE_WIDTH;
  idCanvas.height = TEXTURE_HEIGHT;
  const idContext = idCanvas.getContext("2d", { alpha: true, willReadFrequently: true });

  const contextAttributes = {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: true,
    premultipliedAlpha: false,
  };

  let gl = ui.canvas.getContext("webgl2", contextAttributes);
  const isWebGL2 = Boolean(gl);
  if (!gl) {
    gl =
      ui.canvas.getContext("webgl", contextAttributes)
      || ui.canvas.getContext("experimental-webgl", contextAttributes);
  }

  if (!gl) {
    ui.renderError.hidden = false;
    setLocalizedText(ui.renderError, "error.webglUnavailable");
    setLocalizedText(ui.gpuStatus, "status.webglUnavailable");
    return;
  }

  const rendererLabel = isWebGL2 ? "WEBGL 2" : "WEBGL 1";
  const requiredTextureSize = Math.max(TEXTURE_WIDTH, TEXTURE_HEIGHT);
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  if (maxTextureSize < requiredTextureSize) {
    ui.renderError.hidden = false;
    setLocalizedText(ui.renderError, "error.webglTextureSize", {
      renderer: rendererLabel,
      available: maxTextureSize,
      required: requiredTextureSize,
    });
    setLocalizedText(ui.gpuStatus, "status.webglUnavailable");
    return;
  }

  const requiredTextureUnits = 8;
  const textureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
  if (textureUnits < requiredTextureUnits) {
    ui.renderError.hidden = false;
    setLocalizedText(ui.renderError, "error.webglTextureUnits", {
      renderer: rendererLabel,
      available: textureUnits,
      required: requiredTextureUnits,
    });
    setLocalizedText(ui.gpuStatus, "status.webglUnavailable");
    return;
  }

  let shaderTextureLodExtension = null;
  if (!isWebGL2) {
    const highFloat = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    if (!highFloat || highFloat.precision === 0) {
      ui.renderError.hidden = false;
      setLocalizedText(ui.renderError, "error.webglHighp");
      setLocalizedText(ui.gpuStatus, "status.webglUnavailable");
      return;
    }
    if (!gl.getExtension("OES_standard_derivatives")) {
      ui.renderError.hidden = false;
      setLocalizedText(ui.renderError, "error.webglDerivatives");
      setLocalizedText(ui.gpuStatus, "status.webglUnavailable");
      return;
    }
    shaderTextureLodExtension = gl.getExtension("EXT_shader_texture_lod");
  }

  const vertexShaderHeader = isWebGL2
    ? `#version 300 es
layout(location = 0) in vec2 aPosition;
out vec2 vUv;`
    : `attribute vec2 aPosition;
varying vec2 vUv;`;

  const vertexShaderSource = `${vertexShaderHeader}
    void main() {
      vUv = aPosition * 0.5 + 0.5;
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const fragmentShaderHeader = isWebGL2
    ? `#version 300 es
precision highp float;
in vec2 vUv;
layout(location = 0) out vec4 fragColor;`
    : `#extension GL_OES_standard_derivatives : enable
${shaderTextureLodExtension ? "#extension GL_EXT_shader_texture_lod : enable" : ""}
precision highp float;
varying vec2 vUv;
#define texture texture2D
${shaderTextureLodExtension
    ? "#define SAMPLE_TEXTURE_GRAD(textureSampler, textureUv, textureDx, textureDy, textureBias) texture2DGradEXT(textureSampler, textureUv, textureDx, textureDy)"
    : "#define SAMPLE_TEXTURE_GRAD(textureSampler, textureUv, textureDx, textureDy, textureBias) texture2D(textureSampler, textureUv, textureBias)"}
#define fragColor gl_FragColor`;

  const textureGradCompatibility = isWebGL2
    ? "#define SAMPLE_TEXTURE_GRAD(textureSampler, textureUv, textureDx, textureDy, textureBias) textureGrad(textureSampler, textureUv, textureDx, textureDy)"
    : "";

  const fragmentShaderSource = `${fragmentShaderHeader}
    ${textureGradCompatibility}
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
        unpackMetadata16(centerBytes.rg) * 3.0 - 1.0,
        unpackMetadata16(centerBytes.ba) * 3.0 - 1.0,
        unpackMetadata16(sizeBytes.rg) * 3.0,
        unpackMetadata16(sizeBytes.ba) * 3.0
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

    vec3 shapeTap(vec2 uv) {
      vec4 packedShape = texture(uShapeTexture, uv);
      vec2 heightBytes = floor(packedShape.rg * 255.0 + 0.5);
      float bodyHeight = (heightBytes.x * 256.0 + heightBytes.y) / 65535.0;
      return vec3(bodyHeight, packedShape.b, packedShape.a);
    }

    vec3 sampleShapeData16(vec2 uv) {
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

    vec2 dotContourUv(vec2 sourceUv) {
      // Pixelate only the DOT silhouette lookup. Keeping the unquantized UV
      // for dotCell below preserves the circular dots and their even pitch.
      float blockPx = ${DOT_CONTOUR_PIXEL_PX.toFixed(1)};
      vec2 localPx = (sourceUv - uArtworkBounds.xy) * uTextureSize;
      vec2 snappedPx = (floor(localPx / blockPx) + 0.5) * blockPx;
      return uArtworkBounds.xy + snappedPx / uTextureSize;
    }

    float dotContourDistancePx(vec2 sourceUv) {
      return mergedRawDistancePx(dotContourUv(sourceUv));
    }

    float dotContourFillAt(vec2 sourceUv) {
      float distancePx = dotContourDistancePx(sourceUv) + ${BODY_INFLATE.toFixed(1)};
      return smoothstep(-1.15, 1.15, distancePx);
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
      float tornDistance = dotContourDistancePx(sourceUv) + ${BODY_INFLATE.toFixed(1)};
      float tornAA = 1.15;
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

      float cyanMisregister = dotContourFillAt(
        dotMaterialSourceUv(
          uv - vec2(mix(2.0, 5.5, strength), -1.0) / uTextureSize
        )
      ) * dots * (1.0 - hardDrop);

      float blueTear = dotContourFillAt(
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
        float layerFill = dotContourFillAt(layerSourceUv) * (1.0 - layerHardDrop);
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
        vec3 deepBlue = vec3(0.008, 0.006, 0.44) + uCyan * 0.004;
        vec3 violet = vec3(0.20, 0.010, 0.77);
        float farPlate = smoothstep(0.54, 1.0, depthAmount);
        vec3 plateBody = mix(violet, deepBlue, farPlate);

        // Dark troughs separate the plates. A narrow silhouette lip then
        // restores the electric-blue/violet edge without another SDF lookup.
        plateBody *= mix(0.40, 1.18, depthRidge);
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
      float carrierA = dotContourFillAt(dotMaterialSourceUv(
        uv - vec2(carrierLength * 0.25 / uTextureSize.x, 0.0)
      ));
      float carrierB = dotContourFillAt(dotMaterialSourceUv(
        uv - vec2(carrierLength * 0.50 / uTextureSize.x, 0.0)
      ));
      float carrierC = dotContourFillAt(dotMaterialSourceUv(
        uv - vec2(carrierLength * 0.75 / uTextureSize.x, 0.0)
      ));
      float carrierD = dotContourFillAt(dotMaterialSourceUv(
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
      float glyphOutline,
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
      // Outside the merged union, preserve the original SDF ring exactly.
      // The baked painter-order mask is only needed where an earlier glyph's
      // face would otherwise erase the later glyph's internal overlap edge.
      float mergedOuterRing = max(expanded - fill, 0.0);
      float overlapOuterRing = glyphOutline * fill;
      float internalOnlyRing = max(overlapOuterRing - mergedOuterRing, 0.0);
      float chromeLuma = dot(chrome, vec3(0.2126, 0.7152, 0.0722));
      vec3 posterChrome = mix(vec3(chromeLuma), chrome, 1.28);
      posterChrome *= mix(1.0, 0.66, dropout);
      posterChrome += uCyan * band(signalLocalPx.y / 170.0 + signalSeed, 0.32, 0.16) * 0.14;
      posterChrome += uPink * band(signalLocalPx.y / 180.0 - signalSeed, -0.18, 0.18) * 0.16;

      vec3 premultiplied = posterChrome * max(fill - internalOnlyRing, 0.0);
      premultiplied += vec3(1.0, 0.08, 0.48) * redGhost * dropout * 0.34;
      premultiplied += vec3(0.04, 0.92, 1.0) * cyanGhost * dropout * 0.38;
      premultiplied += mix(uPink, uCyan, signalSeed) * mergedOuterRing * 0.72;
      premultiplied += mix(uPink, uCyan, 0.381966) * internalOnlyRing * 0.72;
      float alpha = clamp(max(expanded, max(redGhost, cyanGhost) * dropout), 0.0, 1.0);
      return vec4(premultiplied, alpha);
    }

    vec2 inverseRotate(vec2 value, vec2 axis) {
      return vec2(
        dot(value, axis),
        dot(value, vec2(-axis.y, axis.x))
      );
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
        float dotFaceD = dotContourDistancePx(dotFaceUv) + ${BODY_INFLATE.toFixed(1)};
        float dotFaceAA = 1.15;
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

      vec3 centerShape = sampleShapeData16(uv);
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
      vec4 semanticSample = texture(uIdTexture, uv);
      float semanticId = semanticSample.g;
      float hasSemanticId = step(0.5 / 255.0, semanticId);
      float semanticWeight = hasSemanticId
        * smoothstep(0.55, 0.90, centerShape.y);
      vec4 glyphMetadata = glyphMetadataForId(semanticId);
      vec2 glyphAxis = normalize(
        (semanticSample.rb * 255.0 - 128.0) / 127.0 + vec2(0.00001, 0.0)
      );
      vec2 glyphSize = max(glyphMetadata.zw, vec2(1.0) / uTextureSize);
      vec2 glyphLocal = clamp(
        inverseRotate(uv - glyphMetadata.xy, glyphAxis) / glyphSize,
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
      vec4 fieldSample = SAMPLE_TEXTURE_GRAD(
        uColorFieldTexture,
        fieldUv,
        dFdx(fieldUv) * fieldFootprint,
        dFdy(fieldUv) * fieldFootprint,
        uRoughness * 5.5
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
        vec2 glyphLocalPx = inverseRotate(uv - glyphMetadata.xy, glyphAxis) * uTextureSize;
        vec2 signalLocalPx = mix(artworkLocalPx, glyphLocalPx, semanticWeight);
        float signalSeed = mix(0.381966, glyphSeed, semanticWeight);
        vec4 vhsMaterial = vhsChromeMaterial(
          uv,
          signalLocalPx,
          signalSeed,
          surfaceD,
          fill,
          aa,
          centerShape.z,
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

  const perspectiveShaderFunctions = `
    float perspectiveRowScale(float visualY) {
      float perspective = clamp(uPerspectiveAngle / ${PERSPECTIVE_MAX.toFixed(1)}, 0.0, 1.0);
      float topScale = mix(1.0, ${PERSPECTIVE_TOP_SCALE.toFixed(3)}, perspective);
      float perspectiveRow = clamp((visualY - 0.05) / 0.90, 0.0, 1.0);
      return mix(1.0, topScale, perspectiveRow);
    }

    vec2 perspectiveSourceUv(vec2 destinationUv, out float inside, out float rowScale) {
      float perspective = clamp(uPerspectiveAngle / ${PERSPECTIVE_MAX.toFixed(1)}, 0.0, 1.0);
      rowScale = perspectiveRowScale(destinationUv.y);
      float sourceX = 0.5 + (destinationUv.x - 0.5) / max(rowScale, 0.01);
      float edgeDistance = 0.5 * rowScale - abs(destinationUv.x - 0.5);
      float edgeAA = max(fwidth(edgeDistance), 1.0 / uSceneSize.x);
      inside = perspective < 0.0001
        ? 1.0
        : smoothstep(-edgeAA, edgeAA, edgeDistance);
      return vec2(sourceX, destinationUv.y);
    }

    vec3 perspectiveBackdrop(vec2 destinationUv) {
      float inset = 2.0 / uSceneSize.x;
      vec3 leftEdge = texture(uSceneTexture, vec2(inset, destinationUv.y)).rgb;
      vec3 rightEdge = texture(uSceneTexture, vec2(1.0 - inset, destinationUv.y)).rgb;
      return mix(leftEdge, rightEdge, destinationUv.x);
    }
  `;

  const crtFragmentShaderSource = `${fragmentShaderHeader}
    uniform sampler2D uSceneTexture;
    uniform vec2 uSceneSize;
    uniform float uPerspectiveAngle;
    uniform float uScanlineSpacing;
    uniform float uScanlineStrength;

    ${perspectiveShaderFunctions}

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
      vec3 color = toLinear(texture(uSceneTexture, clamp(uv, vec2(0.0), vec2(1.0))).rgb);
      return color * smoothstep(0.22, 0.72, luma(color));
    }

    void main() {
      float inside;
      float rowScale;
      vec2 sourceUv = perspectiveSourceUv(vUv, inside, rowScale);
      vec2 clampedSourceUv = clamp(sourceUv, vec2(0.0), vec2(1.0));
      vec3 projectedScene = texture(uSceneTexture, clampedSourceUv).rgb;
      vec3 scene = toLinear(mix(perspectiveBackdrop(vUv), projectedScene, inside));
      float brightness = luma(scene);
      float sourceY = sourceUv.y * uSceneSize.y;
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

      vec2 px = vec2(1.0 / (uSceneSize.x * max(rowScale, 0.01)), 1.0 / uSceneSize.y);
      vec3 bloom = highlightAt(sourceUv) * 0.34;
      bloom += highlightAt(sourceUv + vec2(px.x * 2.0, 0.0)) * 0.24;
      bloom += highlightAt(sourceUv - vec2(px.x * 2.0, 0.0)) * 0.24;
      bloom += highlightAt(sourceUv + vec2(px.x * 6.0, 0.0)) * 0.09;
      bloom += highlightAt(sourceUv - vec2(px.x * 6.0, 0.0)) * 0.09;

      vec3 color = scene * rowGain;
      color += bloom * inside * 0.22 * mix(0.52, 1.0, beam);

      float sourceX = sourceUv.x * uSceneSize.x;
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

  const copyFragmentShaderSource = `${fragmentShaderHeader}
    uniform sampler2D uSceneTexture;
    uniform vec2 uSceneSize;
    uniform float uPerspectiveAngle;

    ${perspectiveShaderFunctions}

    void main() {
      if (uPerspectiveAngle < 0.0001) {
        fragColor = texture(uSceneTexture, vUv);
        return;
      }
      float inside;
      float rowScale;
      vec2 sourceUv = perspectiveSourceUv(vUv, inside, rowScale);
      vec3 scene = texture(uSceneTexture, clamp(sourceUv, vec2(0.0), vec2(1.0))).rgb;
      fragColor = vec4(mix(perspectiveBackdrop(vUv), scene, inside), 1.0);
    }
  `;

  const dotPresentFragmentShaderSource = `${fragmentShaderHeader}
    uniform sampler2D uSceneTexture;
    uniform vec2 uSceneSize;
    uniform float uPerspectiveAngle;
    uniform float uGlow;

    ${perspectiveShaderFunctions}

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
      // The complete 1600x900 bake is projected once here. vUv.y is zero at
      // the visual bottom, so the upper edge narrows while the bottom remains
      // anchored at full width.
      float inside;
      float rowScale;
      vec2 sourceUv = perspectiveSourceUv(vUv, inside, rowScale);

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
    setLocalizedText(ui.gpuStatus, "status.shaderError");
    return;
  }
  ui.canvas.dataset.renderer = isWebGL2 ? "webgl2" : "webgl1";

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
    perspectiveAngle: gl.getUniformLocation(crtProgram, "uPerspectiveAngle"),
    scanlineSpacing: gl.getUniformLocation(crtProgram, "uScanlineSpacing"),
    scanlineStrength: gl.getUniformLocation(crtProgram, "uScanlineStrength"),
  };
  const copyLocations = {
    position: gl.getAttribLocation(copyProgram, "aPosition"),
    sceneTexture: gl.getUniformLocation(copyProgram, "uSceneTexture"),
    sceneSize: gl.getUniformLocation(copyProgram, "uSceneSize"),
    perspectiveAngle: gl.getUniformLocation(copyProgram, "uPerspectiveAngle"),
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
    setLocalizedMessage(ui.customReflectionStatus, message);
    if (status) ui.customReflectionStatus.dataset.state = status;
    else delete ui.customReflectionStatus.dataset.state;
  }

  function setReflectionRequestBusy(busy) {
    const control = ui.applyReflectionUrlButton.closest(".reflection-url-control");
    control.setAttribute("aria-busy", String(busy));
    setLocalizedText(ui.applyReflectionUrlButton, busy ? "common.loading" : "common.apply");
  }

  function invalidateReflectionRequest() {
    reflectionRequestId += 1;
    setReflectionRequestBusy(false);
    setCustomReflectionStatus();
  }

  function normalizeCustomReflectionUrl(rawUrl) {
    const trimmed = rawUrl.trim();
    if (!trimmed) throw localizedError("error.urlRequired");
    if (trimmed.length > MAX_CUSTOM_URL_LENGTH) throw localizedError("error.urlTooLarge");
    let parsed;
    try {
      parsed = new URL(trimmed, window.location.href);
    } catch {
      throw localizedError("error.urlInvalid");
    }
    if (!["http:", "https:", "data:", "blob:"].includes(parsed.protocol)) {
      throw localizedError("error.urlScheme");
    }
    if (window.location.protocol === "https:" && parsed.protocol === "http:") {
      throw localizedError("error.mixedContent");
    }
    if (parsed.protocol === "data:"
      && !/^data:image\/(?:png|jpe?g|webp|avif)(?:;[^,]*)?,/i.test(parsed.href)) {
      throw localizedError("error.dataMime");
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
    if (!REFLECTION_SOURCES[styleKey]) throw localizedError("error.unknownReflection");
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
        finish(reject, localizedError("error.imageTimeout"));
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
          finish(reject, localizedError("error.imageSizeInvalid"));
          return;
        }
        if (width > 8192 || height > 8192 || width * height > MAX_REFLECTION_IMAGE_PIXELS) {
          finish(reject, localizedError("error.imageTooLarge"));
          return;
        }
        finish(resolve, image);
      };
      image.onerror = () => finish(
        reject,
        descriptor.custom
          ? localizedError("error.customImageLoad")
          : localizedError("error.builtinImageLoad", { field: descriptor.label }),
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
      throw localizedError("error.imageUnreadable");
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
    if (!nextTexture) throw localizedError("error.textureCreate");
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
      if (error !== gl.NO_ERROR) throw localizedError("error.textureUpload", { code: `0x${error.toString(16)}` });
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
      card._reflectionLoadError = failed ? result.reason : null;
      if (failed) card.title = localizedErrorMessage(result.reason);
      else card.removeAttribute("title");
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
      if (announce) setLocalizedMessage(ui.materialAnnouncement, announce);
      render();
      return { status: "applied", asset };
    } catch (error) {
      if (requestId !== reflectionRequestId) return { status: "stale" };
      setReflectionRequestBusy(false);
      setCustomReflectionStatus(error?.i18nKey
        ? localized(error.i18nKey, error.i18nParams)
        : localizedErrorMessage(error), "error");
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
      setCustomReflectionStatus(localized("reflection.enterUrl"));
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
      announce: localized("announce.reflectionApplied", { field: REFLECTION_STYLES[styleKey] }),
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
      setCustomReflectionStatus(error?.i18nKey
        ? localized(error.i18nKey, error.i18nParams)
        : localizedErrorMessage(error), "error");
      syncReflectionSelection();
      return;
    }
    await requestReflection(descriptor, {
      loadingMessage: localized("reflection.loadingCustom"),
      successMessage: localized("reflection.customApplied"),
      announce: localized("announce.customReflectionApplied"),
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
      setCustomReflectionStatus(error?.i18nKey
        ? localized(error.i18nKey, error.i18nParams)
        : localizedErrorMessage(error), "error");
      syncReflectionSelection();
      return;
    }
    const result = await requestReflection(descriptor, {
      loadingMessage: descriptor.custom ? localized("reflection.restoringCustom") : "",
      successMessage: descriptor.custom ? localized("reflection.customRestored") : "",
    });
    if (result.status !== "failed"
      || !descriptor.custom
      || state.activePreset !== presetKey
      || state.reflectionStyle !== "custom") return;

    const originalError = localizedErrorMessage(result.error, "error.customUnavailable");
    const fallbackStyle = getPresetFallbackReflectionStyle();
    if (!fallbackStyle) return;
    const fallback = await requestReflection(reflectionDescriptor(fallbackStyle), {
      preserveStatus: true,
      commit: () => writePresetSetting("reflectionStyle", fallbackStyle),
    });
    if (fallback.status === "applied") {
      syncControls();
      syncReflectionSelection();
      setCustomReflectionStatus(localized("error.fallbackApplied", {
        error: originalError,
        field: REFLECTION_STYLES[fallbackStyle],
      }), "error");
    } else if (fallback.status === "failed") {
      setCustomReflectionStatus(localized("error.fallbackFailed", {
        error: originalError,
        fallback: localizedErrorMessage(fallback.error, "error.reflectionUnavailable"),
      }), "error");
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

  function glyphTransformForKey(key) {
    return state.glyphTransforms.get(key) || DEFAULT_GLYPH_TRANSFORM;
  }

  function transformsEqual(a, b) {
    return Math.abs(a.x - b.x) < 0.001
      && Math.abs(a.y - b.y) < 0.001
      && Math.abs(a.rotation - b.rotation) < 0.001
      && Math.abs(a.scale - b.scale) < 0.0001;
  }

  function writeGlyphTransform(key, nextTransform) {
    const normalized = {
      x: Number.isFinite(nextTransform.x) ? nextTransform.x : 0,
      y: Number.isFinite(nextTransform.y) ? nextTransform.y : 0,
      rotation: Number.isFinite(nextTransform.rotation) ? ((nextTransform.rotation + 180) % 360 + 360) % 360 - 180 : 0,
      scale: Number.isFinite(nextTransform.scale) ? Math.max(0.2, Math.min(3, nextTransform.scale)) : 1,
    };
    if (transformsEqual(normalized, DEFAULT_GLYPH_TRANSFORM)) state.glyphTransforms.delete(key);
    else state.glyphTransforms.set(key, normalized);
    return normalized;
  }

  function lcsCellIndex(row, column, columnCount) {
    return row * columnCount + column;
  }

  function assignGlyphKeys(lines) {
    const previous = state.glyphs.map((record) => ({
      glyph: record.glyph,
      lineIndex: record.lineIndex,
      key: record.key,
    }));
    const nextGlyphs = [];
    lines.forEach((line, lineIndex) => {
      line.forEach((glyph) => {
        if (glyph.trim() !== "") nextGlyphs.push({ glyph, lineIndex });
      });
    });
    const sameGlyph = (oldGlyph, newGlyph) => (
      oldGlyph.glyph === newGlyph.glyph && oldGlyph.lineIndex === newGlyph.lineIndex
    );
    const previousLength = previous.length;
    const nextLength = nextGlyphs.length;
    const columnCount = nextLength + 1;
    const table = new Uint16Array((previousLength + 1) * columnCount);
    for (let oldIndex = previousLength - 1; oldIndex >= 0; oldIndex -= 1) {
      for (let newIndex = nextLength - 1; newIndex >= 0; newIndex -= 1) {
        const cell = lcsCellIndex(oldIndex, newIndex, columnCount);
        table[cell] = sameGlyph(previous[oldIndex], nextGlyphs[newIndex])
          ? table[lcsCellIndex(oldIndex + 1, newIndex + 1, columnCount)] + 1
          : Math.max(
            table[lcsCellIndex(oldIndex + 1, newIndex, columnCount)],
            table[lcsCellIndex(oldIndex, newIndex + 1, columnCount)],
          );
      }
    }
    const keys = new Array(nextLength).fill(null);
    let oldIndex = 0;
    let newIndex = 0;
    while (oldIndex < previousLength && newIndex < nextLength) {
      if (sameGlyph(previous[oldIndex], nextGlyphs[newIndex])) {
        keys[newIndex] = previous[oldIndex].key;
        oldIndex += 1;
        newIndex += 1;
      } else if (
        table[lcsCellIndex(oldIndex + 1, newIndex, columnCount)]
        >= table[lcsCellIndex(oldIndex, newIndex + 1, columnCount)]
      ) {
        oldIndex += 1;
      } else {
        newIndex += 1;
      }
    }
    keys.forEach((key, index) => {
      if (!key) keys[index] = `glyph-${nextGlyphKey++}`;
    });
    const liveKeys = new Set(keys);
    [...state.glyphTransforms.keys()].forEach((key) => {
      if (!liveKeys.has(key)) state.glyphTransforms.delete(key);
    });
    if (state.selectedGlyphKey && !liveKeys.has(state.selectedGlyphKey)) state.selectedGlyphKey = null;
    return keys;
  }

  function glyphBaseCorners(record) {
    return [
      { x: record.baseInkLeft, y: record.baseInkTop },
      { x: record.baseInkRight, y: record.baseInkTop },
      { x: record.baseInkRight, y: record.baseInkBottom },
      { x: record.baseInkLeft, y: record.baseInkBottom },
    ];
  }

  function transformPoint(point, record, transform = record.transform) {
    const radians = transform.rotation * Math.PI / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    const localX = (point.x - record.baseCenterX) * transform.scale;
    const localY = (point.y - record.baseCenterY) * transform.scale;
    return {
      x: record.baseCenterX + transform.x + localX * cosine - localY * sine,
      y: record.baseCenterY + transform.y + localX * sine + localY * cosine,
    };
  }

  function glyphCornersForTransform(record, transform) {
    return glyphBaseCorners(record).map((point) => transformPoint(point, record, transform));
  }

  function perspectiveRowScaleForBakeY(bakeY) {
    if (state.debugId) return 1;
    const perspective = Math.max(0, Math.min(1, state.perspectiveAngle / PERSPECTIVE_MAX));
    const topScale = 1 + (PERSPECTIVE_TOP_SCALE - 1) * perspective;
    const visualY = 1 - bakeY / TEXTURE_HEIGHT;
    const row = Math.max(0, Math.min(1, (visualY - 0.05) / 0.90));
    return 1 + (topScale - 1) * row;
  }

  function projectBakePoint(point) {
    const rowScale = perspectiveRowScaleForBakeY(point.y);
    return { x: TEXTURE_WIDTH * 0.5 + (point.x - TEXTURE_WIDTH * 0.5) * rowScale, y: point.y };
  }

  function unprojectDisplayPoint(point, rejectOutside = false) {
    const rowScale = perspectiveRowScaleForBakeY(point.y);
    const normalizedX = point.x / TEXTURE_WIDTH;
    if (rejectOutside && !state.debugId
      && Math.abs(normalizedX - 0.5) > rowScale * 0.5) return null;
    return { x: TEXTURE_WIDTH * 0.5 + (point.x - TEXTURE_WIDTH * 0.5) / rowScale, y: point.y };
  }

  function canvasClientToDisplayPoint(clientX, clientY) {
    const rect = ui.canvas.getBoundingClientRect();
    const width = ui.canvas.clientWidth;
    const height = ui.canvas.clientHeight;
    if (width <= 0 || height <= 0) return null;
    return {
      x: (clientX - rect.left - ui.canvas.clientLeft) / width * TEXTURE_WIDTH,
      y: (clientY - rect.top - ui.canvas.clientTop) / height * TEXTURE_HEIGHT,
    };
  }

  function canvasClientToBakePoint(clientX, clientY, rejectOutside = false) {
    const displayPoint = canvasClientToDisplayPoint(clientX, clientY);
    return displayPoint ? unprojectDisplayPoint(displayPoint, rejectOutside) : null;
  }

  function updateGlyphGeometry(record) {
    record.transform = glyphTransformForKey(record.key);
    record.corners = glyphBaseCorners(record).map((point) => transformPoint(point, record));
    record.centerX = record.baseCenterX + record.transform.x;
    record.centerY = record.baseCenterY + record.transform.y;
    record.inkLeft = Math.min(...record.corners.map((point) => point.x));
    record.inkRight = Math.max(...record.corners.map((point) => point.x));
    record.inkTop = Math.min(...record.corners.map((point) => point.y));
    record.inkBottom = Math.max(...record.corners.map((point) => point.y));
  }

  function selectedGlyphRecord() {
    return state.glyphs.find((record) => record.key === state.selectedGlyphKey) || null;
  }

  function syncOverlayBounds() {
    const canvasRect = ui.canvas.getBoundingClientRect();
    const frameRect = ui.canvas.parentElement.getBoundingClientRect();
    ui.glyphTransformOverlay.style.left = `${canvasRect.left - frameRect.left + ui.canvas.clientLeft}px`;
    ui.glyphTransformOverlay.style.top = `${canvasRect.top - frameRect.top + ui.canvas.clientTop}px`;
    ui.glyphTransformOverlay.style.width = `${ui.canvas.clientWidth}px`;
    ui.glyphTransformOverlay.style.height = `${ui.canvas.clientHeight}px`;
  }

  function pointsAttribute(points) {
    return points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  }

  function syncGlyphTransformUi(draftTransform = null) {
    syncOverlayBounds();
    const record = selectedGlyphRecord();
    ui.glyphTransformControls.hidden = !record;
    ui.glyphTransformOverlay.toggleAttribute("hidden", !record);
    ui.glyphInteractionGuide.classList.toggle("is-active", Boolean(record));
    if (!record) return;
    const transform = draftTransform || glyphTransformForKey(record.key);
    const corners = glyphCornersForTransform(record, transform).map(projectBakePoint);
    const topCenter = {
      x: (corners[0].x + corners[1].x) * 0.5,
      y: (corners[0].y + corners[1].y) * 0.5,
    };
    const center = projectBakePoint({
      x: record.baseCenterX + transform.x,
      y: record.baseCenterY + transform.y,
    });
    const stemVector = { x: topCenter.x - center.x, y: topCenter.y - center.y };
    const stemLength = Math.hypot(stemVector.x, stemVector.y) || 1;
    const handleUnitScale = Math.max(
      TEXTURE_WIDTH / Math.max(1, ui.canvas.clientWidth),
      TEXTURE_HEIGHT / Math.max(1, ui.canvas.clientHeight),
    );
    const handleOffsetCss = mobileEditorMedia.matches ? GLYPH_HANDLE_OFFSET_MOBILE_CSS : GLYPH_HANDLE_OFFSET_CSS;
    const handleRadiusCss = mobileEditorMedia.matches ? GLYPH_HANDLE_RADIUS_MOBILE_CSS : GLYPH_HANDLE_RADIUS_CSS;
    const handleHitRadiusCss = mobileEditorMedia.matches ? GLYPH_HANDLE_HIT_RADIUS_MOBILE_CSS : GLYPH_HANDLE_RADIUS_CSS;
    const handleOffset = handleOffsetCss * handleUnitScale;
    const handleRadius = handleRadiusCss * handleUnitScale;
    const handleHitRadius = handleHitRadiusCss * handleUnitScale;
    const rotateHandle = {
      x: topCenter.x + stemVector.x / stemLength * handleOffset,
      y: topCenter.y + stemVector.y / stemLength * handleOffset,
    };
    const scaleHandle = corners[2];
    ui.glyphSelectionBox.setAttribute("points", pointsAttribute(corners));
    ui.glyphRotateStem.setAttribute("x1", topCenter.x);
    ui.glyphRotateStem.setAttribute("y1", topCenter.y);
    ui.glyphRotateStem.setAttribute("x2", rotateHandle.x);
    ui.glyphRotateStem.setAttribute("y2", rotateHandle.y);
    ui.glyphRotateHitArea.setAttribute("cx", rotateHandle.x);
    ui.glyphRotateHitArea.setAttribute("cy", rotateHandle.y);
    ui.glyphRotateHitArea.setAttribute("r", handleHitRadius);
    ui.glyphScaleHitArea.setAttribute("cx", scaleHandle.x);
    ui.glyphScaleHitArea.setAttribute("cy", scaleHandle.y);
    ui.glyphScaleHitArea.setAttribute("r", handleHitRadius);
    ui.glyphRotateHandle.setAttribute("cx", rotateHandle.x);
    ui.glyphRotateHandle.setAttribute("cy", rotateHandle.y);
    ui.glyphRotateHandle.setAttribute("r", handleRadius);
    ui.glyphScaleHandle.setAttribute("cx", scaleHandle.x);
    ui.glyphScaleHandle.setAttribute("cy", scaleHandle.y);
    ui.glyphScaleHandle.setAttribute("r", handleRadius);
    ui.selectedGlyphLabel.textContent = record.glyph;
    const transformInputs = [
      [ui.glyphOffsetXInput, Math.round(transform.x)],
      [ui.glyphOffsetYInput, Math.round(transform.y)],
      [ui.glyphRotationInput, Math.round(transform.rotation)],
      [ui.glyphScaleInput, Math.round(transform.scale * 100)],
    ];
    transformInputs.forEach(([input, value]) => {
      if (document.activeElement !== input) input.value = String(value);
    });
  }

  function selectGlyph(key) {
    state.selectedGlyphKey = key || null;
    syncGlyphTransformUi();
    const record = selectedGlyphRecord();
    if (record) {
      setLocalizedText(ui.materialAnnouncement, "announce.glyphSelected", {
        glyph: record.glyph,
        index: state.glyphs.indexOf(record) + 1,
        count: state.glyphs.length,
      });
    } else {
      setLocalizedText(ui.materialAnnouncement, "announce.glyphCleared");
    }
    ui.canvas.focus({ preventScroll: true });
  }

  function announceGlyphTransform(record) {
    if (!record) return;
    const transform = glyphTransformForKey(record.key);
    setLocalizedText(ui.materialAnnouncement, "announce.glyphTransform", {
      glyph: record.glyph,
      x: Math.round(transform.x),
      y: Math.round(transform.y),
      rotation: Math.round(transform.rotation),
      scale: Math.round(transform.scale * 100),
    });
  }

  function activeGestureTransform(record) {
    return glyphGesture && glyphGesture.key === record.key
      ? glyphTransformForKey(record.key)
      : record.transform;
  }

  function idByteAtBakePoint(point) {
    if (!latestIdPixels || !point) return 0;
    const x = Math.max(0, Math.min(TEXTURE_WIDTH - 1, Math.floor(point.x)));
    const y = Math.max(0, Math.min(TEXTURE_HEIGHT - 1, Math.floor(point.y)));
    return latestIdPixels[(y * TEXTURE_WIDTH + x) * 4 + 1];
  }

  function recordAtBakePoint(point) {
    const idByte = idByteAtBakePoint(point);
    return idByte ? state.glyphs.find((record) => record.idByte === idByte) || null : null;
  }

  let glyphGesture = null;
  let gestureBakeTimer = 0;
  function scheduleGestureBake() {
    window.clearTimeout(gestureBakeTimer);
    setLocalizedText(ui.renderStatus, "status.waitingGlyphBake");
    gestureBakeTimer = window.setTimeout(() => {
      gestureBakeTimer = 0;
      if (!glyphGesture || glyphGesture.revision === glyphGesture.bakedRevision) return;
      scheduleFinalGestureBake();
    }, 80);
  }

  function scheduleFinalGestureBake() {
    window.clearTimeout(rebuildTimer);
    window.clearTimeout(normalBakeTimer);
    rebuildTimer = 0;
    normalBakeTimer = 0;
    geometryRebuildPending = true;
    rebuildTimer = window.setTimeout(() => {
      rebuildTimer = 0;
      geometryRebuildPending = false;
      rebuildTextures();
    }, 0);
  }

  function finishGlyphGesture(event = null) {
    if (!glyphGesture) return;
    if (event && event.pointerId !== undefined && event.pointerId !== glyphGesture.pointerId) return;
    const completedGesture = glyphGesture;
    if (gestureBakeTimer) window.clearTimeout(gestureBakeTimer);
    gestureBakeTimer = 0;
    glyphGesture = null;
    if (completedGesture.captureTarget
      && typeof completedGesture.captureTarget.hasPointerCapture === "function"
      && completedGesture.captureTarget.hasPointerCapture(completedGesture.pointerId)
      && typeof completedGesture.captureTarget.releasePointerCapture === "function") {
      completedGesture.captureTarget.releasePointerCapture(completedGesture.pointerId);
    }
    if (completedGesture.revision !== completedGesture.bakedRevision) {
      scheduleFinalGestureBake();
    }
    announceGlyphTransform(state.glyphs.find((record) => record.key === completedGesture.key));
  }

  function beginGlyphGesture(event, mode, record) {
    const point = canvasClientToBakePoint(event.clientX, event.clientY);
    if (!point) return;
    const transform = { ...glyphTransformForKey(record.key) };
    const pivot = { x: record.baseCenterX + transform.x, y: record.baseCenterY + transform.y };
    glyphGesture = {
      pointerId: event.pointerId,
      mode,
      key: record.key,
      startPoint: point,
      startTransform: transform,
      pivot,
      startAngle: Math.atan2(point.y - pivot.y, point.x - pivot.x),
      startDistance: Math.max(1, Math.hypot(point.x - pivot.x, point.y - pivot.y)),
      captureTarget: event.currentTarget,
      revision: 0,
      bakedRevision: 0,
    };
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (typeof event.currentTarget.addEventListener === "function") {
      event.currentTarget.addEventListener("lostpointercapture", finishGlyphGesture, { once: true });
    }
    event.preventDefault();
  }

  function updateGlyphGesture(event) {
    if (!glyphGesture || glyphGesture.pointerId !== event.pointerId) return;
    const point = canvasClientToBakePoint(event.clientX, event.clientY);
    const record = state.glyphs.find((item) => item.key === glyphGesture.key);
    if (!point || !record) return;
    const next = { ...glyphGesture.startTransform };
    if (glyphGesture.mode === "move") {
      next.x += point.x - glyphGesture.startPoint.x;
      next.y += point.y - glyphGesture.startPoint.y;
    } else if (glyphGesture.mode === "rotate") {
      let rotationDelta = (Math.atan2(point.y - glyphGesture.pivot.y, point.x - glyphGesture.pivot.x) - glyphGesture.startAngle) * 180 / Math.PI;
      if (event.shiftKey) rotationDelta = Math.round(rotationDelta / 15) * 15;
      next.rotation += rotationDelta;
    } else if (glyphGesture.mode === "scale") {
      const distance = Math.hypot(point.x - glyphGesture.pivot.x, point.y - glyphGesture.pivot.y);
      next.scale *= distance / glyphGesture.startDistance;
    }
    const previousTransform = glyphTransformForKey(record.key);
    const normalized = writeGlyphTransform(record.key, next);
    syncGlyphTransformUi(normalized);
    if (!transformsEqual(previousTransform, normalized)) {
      glyphGesture.revision += 1;
      scheduleGestureBake();
    }
    event.preventDefault();
  }

  function drawGlyphRecord(context, record) {
    const transform = activeGestureTransform(record) || glyphTransformForKey(record.key);
    context.save();
    context.translate(record.baseCenterX + transform.x, record.baseCenterY + transform.y);
    context.rotate(transform.rotation * Math.PI / 180);
    context.scale(transform.scale, transform.scale);
    context.translate(-record.baseCenterX, -record.baseCenterY);
    context.fillText(record.glyph, record.x, record.baseline);
    context.restore();
  }

  function measureLine(glyphs, fontSize) {
    sourceContext.font = `${activeDisplayFontWeight()} ${fontSize}px ${activeDisplayFont()}`;
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

  function createSignedDistanceField(alphaPixels, width, height) {
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
    for (let pixel = 0; pixel < length; pixel += 1) {
      signedField[pixel] = Math.sqrt(inner[pixel]) - Math.sqrt(outer[pixel]);
    }
    return signedField;
  }

  function bodyHeightBlurSupport(sigma) {
    const passes = 3;
    const idealWidth = Math.sqrt((12 * sigma * sigma) / passes + 1);
    const radius = Math.max(1, Math.round((idealWidth - 1) * 0.5));
    return radius * passes;
  }

  function encodeNormalized16(value) {
    const packed = Math.round(Math.max(0, Math.min(1, value)) * 65535);
    return [packed >> 8, packed & 255];
  }

  function encodeGlyphMetadataCenter(value) {
    return encodeNormalized16((value + 1) / 3);
  }

  function encodeGlyphMetadataSize(value) {
    return encodeNormalized16(value / 3);
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

  function writeGlyphNormalLayers(layers, ownerIds, normalPixels) {
    layers.forEach((layer) => {
      const layerNormals = new Uint8Array(layer.width * layer.height * 4);
      for (let index = 0; index < layerNormals.length; index += 4) {
        layerNormals[index] = 128;
        layerNormals[index + 1] = 128;
        layerNormals[index + 2] = 255;
        layerNormals[index + 3] = 255;
      }
      writeArtworkNormalMap(
        layer.smoothHeight,
        layer.faceHeight,
        layer.shadingField,
        layerNormals,
        layer.width,
        layer.height,
      );
      for (let y = 0; y < layer.height; y += 1) {
        for (let x = 0; x < layer.width; x += 1) {
          const globalX = layer.left + x;
          const globalY = layer.top + y;
          const globalPixel = globalY * TEXTURE_WIDTH + globalX;
          if (ownerIds[globalPixel] !== layer.idByte) continue;
          const source = (y * layer.width + x) * 4;
          const output = globalPixel * 4;
          normalPixels[output] = layerNormals[source];
          normalPixels[output + 1] = layerNormals[source + 1];
          normalPixels[output + 2] = layerNormals[source + 2];
          normalPixels[output + 3] = 255;
        }
      }
    });
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
    writeGlyphNormalLayers(
      cachedNormalBake.layers,
      cachedNormalBake.ownerIds,
      normalPixels,
    );
    uploadNormalMap(normalPixels);
    ui.buildTime.textContent = `${Math.round(performance.now() - startedAt)} MS`;
    setLocalizedText(ui.renderStatus, "status.normalBakeReady");
    render();
  }

  function createGlyphNormalBake(glyphs, bodySigma, faceSigma) {
    const pixelCount = TEXTURE_WIDTH * TEXTURE_HEIGHT;
    const ownerIds = new Uint8Array(pixelCount);
    const outlinePixels = new Uint8Array(pixelCount);
    const ownerIsSurface = new Uint8Array(pixelCount);
    const ownerDistance = new Float32Array(pixelCount);
    ownerDistance.fill(-Infinity);
    const layers = [];
    const padding = Math.ceil(Math.max(
      bodyHeightBlurSupport(faceSigma) + 6,
      SHADING_SDF_SPREAD + 8,
    ));
    idContext.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
    idContext.font = sourceContext.font;
    idContext.textBaseline = "alphabetic";
    idContext.fillStyle = "#ffffff";

    glyphs.forEach((record) => {
      const left = Math.max(0, Math.floor(record.inkLeft) - padding);
      const top = Math.max(0, Math.floor(record.inkTop) - padding);
      const right = Math.min(TEXTURE_WIDTH, Math.ceil(record.inkRight) + padding);
      const bottom = Math.min(TEXTURE_HEIGHT, Math.ceil(record.inkBottom) + padding);
      const width = right - left;
      const height = bottom - top;
      if (width <= 0 || height <= 0) return;

      idContext.clearRect(left, top, width, height);
      drawGlyphRecord(idContext, record);
      const maskPixels = idContext.getImageData(left, top, width, height).data;
      const signedField = createSignedDistanceField(maskPixels, width, height);
      const smoothHeight = createArtworkBodyHeight(maskPixels, width, height, bodySigma);
      const faceHeight = createArtworkBodyHeight(maskPixels, width, height, faceSigma);
      const shadingField = createArtworkShadingDistance(
        signedField,
        width,
        height,
        SHADING_SDF_SPREAD,
      );
      layers.push({
        idByte: record.idByte,
        left,
        top,
        width,
        height,
        smoothHeight,
        faceHeight,
        shadingField,
      });

      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const localPixel = y * width + x;
          const surfaceDistance = signedField[localPixel] + BODY_INFLATE;
          if (surfaceDistance < -(VHS_OUTLINE_DISTANCE + VHS_OUTLINE_AA)) continue;
          const pixel = (top + y) * TEXTURE_WIDTH + left + x;
          const expandedT = Math.max(0, Math.min(
            1,
            (surfaceDistance + VHS_OUTLINE_DISTANCE + VHS_OUTLINE_AA) / (2 * VHS_OUTLINE_AA),
          ));
          const fillT = Math.max(
            0,
            Math.min(1, (surfaceDistance + VHS_OUTLINE_AA) / (2 * VHS_OUTLINE_AA)),
          );
          const expanded = expandedT * expandedT * (3 - 2 * expandedT);
          const localFill = fillT * fillT * (3 - 2 * fillT);
          const outline = Math.max(expanded - localFill, 0);
          // Alpha-over the later glyph's ring while its expanded coverage
          // occludes earlier rings. This preserves AA intersections and makes
          // a solid foreground face clear every outline behind it.
          const previousOutline = outlinePixels[pixel] / 255;
          outlinePixels[pixel] = Math.round(
            Math.min(1, outline + previousOutline * (1 - expanded)) * 255,
          );
          if (surfaceDistance < -4) continue;
          if (surfaceDistance >= 0) {
            // Canvas painter order defines the visible surface: a later glyph
            // replaces an earlier glyph only where its own inflated face exists.
            ownerIds[pixel] = record.idByte;
            ownerIsSurface[pixel] = 1;
            ownerDistance[pixel] = surfaceDistance;
          } else if (!ownerIsSurface[pixel] && surfaceDistance >= ownerDistance[pixel]) {
            // Outside every real surface, retain the nearest four-pixel halo so
            // LINEAR normal filtering reaches the silhouette without a flat seam.
            ownerIds[pixel] = record.idByte;
            ownerDistance[pixel] = surfaceDistance;
          }
        }
      }
    });

    return { layers, ownerIds, outlinePixels };
  }

  function createSemanticIdPixels(alphaPixels, glyphs, ownerIds) {
    const pixelCount = TEXTURE_WIDTH * TEXTURE_HEIGHT;

    const rotationRById = new Uint8Array(256);
    const rotationBById = new Uint8Array(256);
    rotationRById.fill(255);
    rotationBById.fill(128);
    glyphs.forEach((record) => {
      const transform = activeGestureTransform(record) || DEFAULT_GLYPH_TRANSFORM;
      const radians = transform.rotation * Math.PI / 180;
      rotationRById[record.idByte] = Math.round(Math.cos(radians) * 127 + 128);
      rotationBById[record.idByte] = Math.round(Math.sin(radians) * 127 + 128);
    });
    const idPixels = new Uint8Array(pixelCount * 4);
    for (let pixel = 0; pixel < pixelCount; pixel += 1) {
      const output = pixel * 4;
      const idByte = alphaPixels[output + 3] > 0 ? ownerIds[pixel] : 0;
      // G remains the discrete semantic ID. R/B carry the owning glyph's
      // local rotation so the existing ID lookup also rotates local material
      // coordinates without adding another runtime texture fetch.
      idPixels[output] = rotationRById[idByte];
      idPixels[output + 1] = idByte;
      idPixels[output + 2] = rotationBById[idByte];
      idPixels[output + 3] = 255;
    }
    return idPixels;
  }

  function createGlyphMetadataPixels(glyphs) {
    const pixels = new Uint8Array(256 * 2 * 4);
    glyphs.forEach((record) => {
      const transform = activeGestureTransform(record) || DEFAULT_GLYPH_TRANSFORM;
      const centerX = (record.baseCenterX + transform.x) / TEXTURE_WIDTH;
      const centerY = (record.baseCenterY + transform.y) / TEXTURE_HEIGHT;
      const width = Math.max(1, record.baseInkRight - record.baseInkLeft) * transform.scale / TEXTURE_WIDTH;
      const height = Math.max(1, record.baseInkBottom - record.baseInkTop) * transform.scale / TEXTURE_HEIGHT;
      const centerXBytes = encodeGlyphMetadataCenter(centerX);
      const centerYBytes = encodeGlyphMetadataCenter(centerY);
      const widthBytes = encodeGlyphMetadataSize(width);
      const heightBytes = encodeGlyphMetadataSize(height);
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
    if (activePreset().mode === 1 && ensureDotDisplayFont() === "loading") {
      setLocalizedText(ui.renderStatus, "status.loadingDotFont");
      return;
    }
    const startedAt = performance.now();
    cachedNormalBake = null;
    bakedDisplayFont = activeDisplayFont();
    bakedTracking = state.tracking;
    setLocalizedText(ui.renderStatus, "status.buildingSdf");
    const rawLines = state.text.replace(/\r/g, "").split("\n").slice(0, MAX_TEXT_LINES);
    const lines = rawLines.map((line) => segmentText(line).slice(0, MAX_GLYPHS_PER_LINE));
    const glyphKeys = assignGlyphKeys(lines);
    const layout = fitLayout(lines);
    const lineHeightPx = layout.fontSize * state.lineHeight;
    const firstBaseline = (TEXTURE_HEIGHT - layout.totalHeight) * 0.5 + layout.fontSize * 0.80;

    sourceContext.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
    idContext.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
    sourceContext.font = `${activeDisplayFontWeight()} ${layout.fontSize}px ${bakedDisplayFont}`;
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
          const record = {
            glyph,
            key: glyphKeys[glyphIndex],
            idByte,
            x,
            width,
            baseInkLeft: inkLeft,
            baseInkRight: inkRight,
            baseInkTop: inkTop,
            baseInkBottom: inkBottom,
            baseCenterX: (inkLeft + inkRight) * 0.5,
            baseCenterY: (inkTop + inkBottom) * 0.5,
            baseline,
            lineIndex,
            index,
          };
          updateGlyphGeometry(record);
          drawGlyphRecord(sourceContext, record);
          records.push(record);
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
      shapePixels[index + 3] = 0;
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
    const bodySigma = Math.max(7, Math.min(14, layout.fontSize * 0.018));
    const faceSigma = bodySigma * 2.25;
    const glyphNormalBake = state.glyphs.length > 0
      ? createGlyphNormalBake(state.glyphs, bodySigma, faceSigma)
      : {
        layers: [],
        ownerIds: new Uint8Array(TEXTURE_WIDTH * TEXTURE_HEIGHT),
        outlinePixels: new Uint8Array(TEXTURE_WIDTH * TEXTURE_HEIGHT),
      };
    // Outline alpha is uploaded with the shape texture and is not needed by
    // BODY/FACE/EDGE normal-only rebakes, so keep it out of the long-lived cache.
    cachedNormalBake = {
      layers: glyphNormalBake.layers,
      ownerIds: glyphNormalBake.ownerIds,
    };
    const idPixels = createSemanticIdPixels(
      alphaPixels,
      state.glyphs,
      glyphNormalBake.ownerIds,
    );
    latestIdPixels = idPixels;
    const glyphMetadataPixels = createGlyphMetadataPixels(state.glyphs);

    if (state.glyphs.length > 0) {
      const width = TEXTURE_WIDTH;
      const height = TEXTURE_HEIGHT;
      const length = width * height;
      const signedField = createSignedDistanceField(alphaPixels, width, height);

      // Keep the merged body-height asset for the final single-quad texture
      // set. Surface normals are composited from independent glyph ROI bakes
      // below so overlapping letters do not become one fused balloon.
      const smoothHeight = createArtworkBodyHeight(
        alphaPixels,
        width,
        height,
        bodySigma,
      );
      const shadingField = createArtworkShadingDistance(
        signedField,
        width,
        height,
        SHADING_SDF_SPREAD,
      );
      writeGlyphNormalLayers(
        glyphNormalBake.layers,
        glyphNormalBake.ownerIds,
        normalPixels,
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
          shapePixels[outputIndex + 3] = glyphNormalBake.outlinePixels[localIndex];
        }
      }
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

    setLocalizedText(ui.glyphReadout, "unit.glyphs", {
      value: String(state.glyphs.length).padStart(2, "0"),
    });
    ui.buildTime.textContent = `${Math.round(performance.now() - startedAt)} MS`;
    setLocalizedText(ui.renderStatus, "status.bakeReady");
    if (glyphGesture) glyphGesture.bakedRevision = glyphGesture.revision;
    syncGlyphTransformUi();
    render();
  }

  function hexToRgb(hex) {
    const value = Number.parseInt(hex.slice(1), 16);
    return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
  }

  function resizeCanvas() {
    const dpr = Math.min((window.devicePixelRatio || 1) * 1.5, 3);
    const width = Math.max(1, Math.round(ui.canvas.clientWidth * dpr));
    const height = Math.max(1, Math.round(ui.canvas.clientHeight * dpr));
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
    syncOverlayBounds();
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

    if (!bakeReady) {
      syncGlyphTransformUi();
      return;
    }
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
      gl.uniform1f(crtLocations.perspectiveAngle, state.perspectiveAngle);
      gl.uniform1f(crtLocations.scanlineSpacing, state.vhsScanlineSpacing);
      gl.uniform1f(crtLocations.scanlineStrength, state.vhsScanlineStrength / 100);
    } else {
      gl.uniform2f(copyLocations.sceneSize, TEXTURE_WIDTH, TEXTURE_HEIGHT);
      gl.uniform1f(copyLocations.perspectiveAngle, state.debugId ? 0 : state.perspectiveAngle);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    syncGlyphTransformUi();
  }

  let rebuildTimer = 0;
  let normalBakeTimer = 0;
  let geometryRebuildPending = false;
  function scheduleRebuild() {
    window.clearTimeout(rebuildTimer);
    window.clearTimeout(normalBakeTimer);
    normalBakeTimer = 0;
    setLocalizedText(ui.renderStatus, "status.waitingInput");
    geometryRebuildPending = true;
    rebuildTimer = window.setTimeout(() => {
      rebuildTimer = 0;
      geometryRebuildPending = false;
      rebuildTextures();
    }, 140);
  }

  function scheduleNormalBake() {
    if (geometryRebuildPending) return;
    window.clearTimeout(normalBakeTimer);
    setLocalizedText(ui.renderStatus, "status.waitingNormalBake");
    normalBakeTimer = window.setTimeout(() => {
      normalBakeTimer = 0;
      rebuildNormalTexture();
    }, 80);
  }

  function setDebugView(debugId) {
    state.debugId = debugId;
    ui.materialViewButton.classList.toggle("is-active", !debugId);
    ui.idViewButton.classList.toggle("is-active", debugId);
    ui.materialViewButton.setAttribute("aria-pressed", String(!debugId));
    ui.idViewButton.setAttribute("aria-pressed", String(debugId));
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
    syncTextInputMeta();
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
    ui.dotOutlineLayersValue.value = t("unit.layers", { value: state.dotOutlineLayers });
    ui.perspectiveAngleValue.value = `${state.perspectiveAngle}°`;
    ui.glitchStrengthValue.value = `${state.glitchStrength}%`;
    ui.vhsScanlineSpacingValue.value = `${state.vhsScanlineSpacing} PX`;
    ui.vhsScanlineStrengthValue.value = `${state.vhsScanlineStrength}%`;
    ui.extrusionValue.value = `${state.extrusion} PX`;
    ui.glowValue.value = `${state.glow}%`;
    ui.sceneDetailValue.value = `${state.sceneDetail}%`;
  }

  function syncTextInputMeta() {
    const value = ui.textInput.value;
    const lines = value.replace(/\r/g, "").split("\n");
    const hasOverflow = lines.length > MAX_TEXT_LINES
      || lines.some((line) => segmentText(line).length > MAX_GLYPHS_PER_LINE);
    setLocalizedText(ui.textInputMeta, "type.textMeta", {
      count: value.length,
      max: MAX_TEXT_LENGTH,
      lines: value ? lines.length : 0,
      maxLines: MAX_TEXT_LINES,
    });
    setLocalizedText(ui.textInputHint, hasOverflow ? "type.textOverflow" : "type.textHint");
    ui.textInput.setAttribute("aria-invalid", String(hasOverflow));
    ui.textInput.closest(".text-control-primary")?.classList.toggle("has-text-overflow", hasOverflow);
  }

  ui.textInput.addEventListener("input", (event) => {
    state.text = event.currentTarget.value;
    syncTextInputMeta();
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
    [ui.dotOutlineLayersInput, "dotOutlineLayers", ui.dotOutlineLayersValue, (value) => t("unit.layers", { value })],
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
  ui.canvas.addEventListener("pointerdown", (event) => {
    const point = canvasClientToBakePoint(event.clientX, event.clientY, true);
    const record = recordAtBakePoint(point);
    if (!record) {
      selectGlyph(null);
      return;
    }
    selectGlyph(record.key);
    beginGlyphGesture(event, "move", record);
  });
  ui.glyphRotateHandle.addEventListener("pointerdown", (event) => {
    const record = selectedGlyphRecord();
    if (record) beginGlyphGesture(event, "rotate", record);
  });
  ui.glyphRotateHitArea.addEventListener("pointerdown", (event) => {
    const record = selectedGlyphRecord();
    if (record) beginGlyphGesture(event, "rotate", record);
  });
  ui.glyphScaleHandle.addEventListener("pointerdown", (event) => {
    const record = selectedGlyphRecord();
    if (record) beginGlyphGesture(event, "scale", record);
  });
  ui.glyphScaleHitArea.addEventListener("pointerdown", (event) => {
    const record = selectedGlyphRecord();
    if (record) beginGlyphGesture(event, "scale", record);
  });
  window.addEventListener("pointermove", updateGlyphGesture);
  window.addEventListener("pointerup", finishGlyphGesture);
  window.addEventListener("pointercancel", finishGlyphGesture);

  function applySelectedGlyphInput() {
    const record = selectedGlyphRecord();
    if (!record) return;
    writeGlyphTransform(record.key, {
      x: Number(ui.glyphOffsetXInput.value),
      y: Number(ui.glyphOffsetYInput.value),
      rotation: Number(ui.glyphRotationInput.value),
      scale: Number(ui.glyphScaleInput.value) / 100,
    });
    syncGlyphTransformUi();
    scheduleRebuild();
  }
  [
    ui.glyphOffsetXInput,
    ui.glyphOffsetYInput,
    ui.glyphRotationInput,
    ui.glyphScaleInput,
  ].forEach((input) => input.addEventListener("change", applySelectedGlyphInput));
  ui.resetGlyphTransformButton.addEventListener("click", () => {
    const record = selectedGlyphRecord();
    if (!record) return;
    state.glyphTransforms.delete(record.key);
    syncGlyphTransformUi();
    scheduleRebuild();
    announceGlyphTransform(record);
  });
  ui.resetAllGlyphTransformsButton.addEventListener("click", () => {
    state.glyphTransforms.clear();
    syncGlyphTransformUi();
    scheduleRebuild();
    setLocalizedText(ui.materialAnnouncement, "announce.glyphResetAll");
  });
  ui.canvas.addEventListener("keydown", (event) => {
    if (event.key === "PageDown" || event.key === "PageUp" || event.key === "]" || event.key === "[") {
      if (state.glyphs.length === 0) return;
      const direction = event.key === "PageDown" || event.key === "]" ? 1 : -1;
      const currentIndex = state.glyphs.findIndex((record) => record.key === state.selectedGlyphKey);
      const nextIndex = currentIndex < 0
        ? (direction > 0 ? 0 : state.glyphs.length - 1)
        : (currentIndex + direction + state.glyphs.length) % state.glyphs.length;
      selectGlyph(state.glyphs[nextIndex].key);
      event.preventDefault();
      return;
    }
    const record = selectedGlyphRecord();
    if (!record) return;
    const next = { ...glyphTransformForKey(record.key) };
    const step = event.shiftKey ? 10 : 1;
    let handled = true;
    if (event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      next.rotation += (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 15 : 1);
    } else if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      next.scale += (event.key === "ArrowUp" ? 1 : -1) * (event.shiftKey ? 0.1 : 0.01);
    } else if (event.key === "ArrowLeft") next.x -= step;
    else if (event.key === "ArrowRight") next.x += step;
    else if (event.key === "ArrowUp") next.y -= step;
    else if (event.key === "ArrowDown") next.y += step;
    else if (event.key === "Escape") {
      selectGlyph(null);
      event.preventDefault();
      return;
    } else handled = false;
    if (!handled) return;
    writeGlyphTransform(record.key, next);
    syncGlyphTransformUi();
    scheduleRebuild();
    announceGlyphTransform(record);
    event.preventDefault();
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
    ui.materialViewButton.setAttribute("aria-pressed", "true");
    ui.idViewButton.setAttribute("aria-pressed", "false");
    applyPresetBake();
    if (activePreset().mode !== 1) loadPresetReflection(state.activePreset);
  });
  window.addEventListener("resize", render, { passive: true });

  setLocalizedText(ui.gpuStatus, "status.webglReady", { renderer: rendererLabel });
  buildNoiseTexture();
  buildReflectionGallery().catch((error) => {
    ui.renderError.hidden = false;
    if (error?.i18nKey) setLocalizedText(ui.renderError, error.i18nKey, error.i18nParams);
    else setLocalizedMessage(ui.renderError, localizedErrorMessage(error));
  });
  syncControls();
  syncPresetSelection();
  loadPresetReflection(state.activePreset);
  document.fonts.ready.then(rebuildTextures);
})();
