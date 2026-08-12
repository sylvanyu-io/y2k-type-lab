(() => {
  "use strict";

  const presets = [
    {
      key: "dot",
      mode: 1,
      label: "DOT//GLITCH",
      ariaLabel: "点阵故障艺术字预览",
      settings: {
        edgeWidth: 4,
        bodyCrown: 8,
        reflection: 34,
        colorField: 76,
        reflectionStyle: "prism",
        reflectionOffsetX: 0,
        reflectionOffsetY: 0,
        liquidWarp: 0,
        dotPitch: 7,
        glitchStrength: 55,
        vhsScanlineSpacing: 11,
        vhsScanlineStrength: 10,
        extrusion: 18,
        glow: 58,
        sceneDetail: 72,
        cyan: "#39f5ff",
        pink: "#ff2bd6",
      },
    },
    {
      key: "liquid",
      mode: 0,
      label: "LIQUID//CHROME",
      ariaLabel: "液态铬艺术字预览",
      settings: {
        edgeWidth: 8,
        bodyCrown: 16,
        reflection: 88,
        colorField: 82,
        reflectionStyle: "prism",
        reflectionOffsetX: 0,
        reflectionOffsetY: 0,
        liquidWarp: 16,
        dotPitch: 7,
        glitchStrength: 55,
        vhsScanlineSpacing: 11,
        vhsScanlineStrength: 10,
        extrusion: 8,
        glow: 20,
        sceneDetail: 68,
        cyan: "#39f5ff",
        pink: "#ff2bd6",
      },
    },
    {
      key: "vhs",
      mode: 2,
      label: "VHS//CHROME",
      ariaLabel: "VHS 镀铬艺术字预览",
      settings: {
        edgeWidth: 6,
        bodyCrown: 10,
        reflection: 72,
        colorField: 64,
        reflectionStyle: "arctic",
        reflectionOffsetX: 0,
        reflectionOffsetY: 0,
        liquidWarp: 5,
        dotPitch: 7,
        glitchStrength: 55,
        vhsScanlineSpacing: 11,
        vhsScanlineStrength: 20,
        extrusion: 13,
        glow: 38,
        sceneDetail: 82,
        cyan: "#44f6ff",
        pink: "#ff38cf",
      },
    },
  ];

  const byKey = Object.freeze(Object.fromEntries(
    presets.map((preset) => [preset.key, Object.freeze({
      ...preset,
      settings: Object.freeze({ ...preset.settings }),
    })]),
  ));

  window.ArtTextPresets = Object.freeze({
    defaultKey: "liquid",
    order: Object.freeze(presets.map((preset) => preset.key)),
    byKey,
  });
})();
