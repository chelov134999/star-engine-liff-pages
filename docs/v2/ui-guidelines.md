# Guardian V2 UI Guidelines

## 色票
- `--guardian-color-primary-navy` `#1F2A44`：頁首、主要文字顏色。
- `--guardian-color-accent-coral` `#F9624D`：主要 CTA、警示強調。
- `--guardian-color-guardian-teal` `#35B4A5`：active pills、成功狀態。
- `--guardian-color-soft-slate` `#8A94A6`：次要文字、邊框。
- `--guardian-color-canvas-gray` `#F5F7FA`：背景。

## 字級與字體
- 標題：`SF Pro Display`（fallback `Noto Sans TC`），weight 600，`32 / 24 / 20px`。
- 內文：`SF Pro Text`，base `16px`，行距 `1.5`。
- 註解：`13px`，字距 `0.2px`。

## 版面格局
- 最大寬度 1200px，左右 gutter 24px，段落上下 48px。
- 卡片圓角 16px，padding 20px，陰影 `0 10px 30px rgba(31,42,68,0.08)`。
- 按鈕高度 44px，pills 半徑 999px。

## 互動元件
- Pills：active 填 Guardian Teal，inactive 為 ghost + Soft Slate 邊框。
- Autocomplete：`input + datalist` 初版，項目最多 6 筆，hover 背景 Canvas Gray。
- A/B 模式切換：Segmented Control 48px 高，active 以 Accent Coral 表示。

## 無障礙
- 觸控目標 ≥ 44px。
- 文字對比 ≥ 4.5:1；若背景過淡改用 Primary Navy。
- Keyboard focus outline `2px` Guardian Teal。

## 插圖
- 守護吉祥物僅放置於 Reports Hero 卡片。
- Icons 採 1.5px 線條，保持一致風格。
