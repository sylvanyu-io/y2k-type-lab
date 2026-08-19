# Y2K Type Lab

一个不依赖框架的 WebGL 2 艺术字材质编辑器，面向固定 1600×900 画布烘焙，并提供响应式中英文操作界面。

## 功能

- VHS Chrome、DOT Glitch、Liquid Chrome 三套材质预设。
- 整画布 merged SDF、body height、shading SDF 与 normal 材质管线。
- Rose Citadel、Ice Citadel、Solar Obsidian、Prism Mercury 与 Neon Monsoon 反射场。
- 逐字移动、旋转、缩放，以及 Semantic ID 调试视图。
- 本地 Tektur 字体、材质封面和反射贴图，不依赖运行时 CDN 资源。

## 目录

- `index.html`：编辑器入口。
- `art-text.js`：WebGL 2 渲染和交互逻辑。
- `art-text-fields.js`：程序化材质场生成。
- `art-text-presets.js`：材质预设状态。
- `art-text.css`：桌面与移动端界面。
- `assets/`：字体、材质封面与反射贴图。
- `artifacts/`：反射投影对比资料。

## 运行

```bash
cd /Users/yu/Desktop/y2k-type-lab
python3 -m http.server 4173
```

浏览器打开 `http://127.0.0.1:4173/`。
