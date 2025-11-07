# Guardian V2 Reports

## Wireframe 概述

```
+-------------------------------------------------------------+
| LOGO      | [今日洞察] [歷史走勢] [自訂報表]    Mode: [A|B] |
+-------------------------------------------------------------+
| Hero Metrics Card                                           |
|  - KPI: 守護分數 89   Δ +6 vs 上週                         |
|  - CTA: 查看完整報表  | 下載 PDF                             |
+-------------------------------------------------------------+
| Insight Pills                                               |
|  [餐段異常]  [菜品警示]  [競品事件]                         |
+-------------------------------------------------------------+
| Insight Cards (3-columns)                                   |
|  ┌---------------------┐  ┌---------------------┐            |
|  | 🍽 晚餐評論暴增      |  | 🥢 麻婆豆腐負評上升 |            |
|  | Z-Score +3.2        |  | TF-IDF 2.1          |            |
|  | 強調摘要 + CTA       |  | 強調摘要 + CTA       |            |
|  └---------------------┘  └---------------------┘            |
+-------------------------------------------------------------+
| Timeline & Tasks                                            |
|  - 時間軸列出最近觸發事件                                  |
|  - 快速按鈕：安排守護任務、通知店長                         |
+-------------------------------------------------------------+
| Footer: 城市 / 店名 Autocomplete → 檢視其他門市             |
+-------------------------------------------------------------+
```

### 互動流程
- LOGO 置左；右側為主選單 pills 與 A/B 模式切換 segmented control。
- CTA 區域固定於 Hero 卡底部，提供「查看完整報表」與「下載 PDF」。
- 城市 / 店名 Autocomplete：輸入城市後濾出門市，選擇門市即重新載入報表。

## 初版頁面架構

```
src/
  pages/
    index.tsx        # React/Vite 預設進入點，渲染報表骨架
  types/
    api.ts           # OpenAPI 草稿型別定義
  api/
    mock.ts          # 以範例資料實作的 mock API
  components/        # 後續共用元件擺放位置
```

- 共用樣式引用 `../../shared/guardian_v2/styles.scss`（需安裝 `sass`，見下方開發指引）。
- 真實 API 串接將由終端 1 提供 endpoint，現階段以 mock 資料模擬。

## 開發指引

1. 於 repo 根目錄複製 `.env.example_v2` 為 `.env.local`，填入 `V2_API_BASE_URL`、`V2_LIFF_ID`、`V2_SUPABASE_URL`、`V2_SUPABASE_ANON_KEY`，並設定 `V2_DEFAULT_LEAD_ID=e5c7c9ed-f23e-4aa8-9427-b941e3025103`（正式帳 `guardian_official_demo`）。若需要測試用 token，請額外設定 `V2_SUPABASE_SERVICE_KEY` 或 `V2_SUPABASE_JWT`：
   ```bash
   supabase projects tokens create --project-ref <project-ref> --name guardian-v2-demo --role service_role
   ```
   > 或參考終端 1 提供的 `scripts/request_guardian_token.sh` 範例（若有），以 service key 兌換短期 JWT。若缺少 `V2_SUPABASE_SERVICE_KEY` / `V2_SUPABASE_JWT`，前端會自動回退使用 mock 資料。
2. 進入 `apps/v2-reports/` 後執行：
   ```bash
   pnpm install
   pnpm dev           # 對應 package.json 的 start script
   ```
   > 若尚未安裝 Sass，請執行 `pnpm install -D sass`（已在 package.json 宣告 devDependency）。
3. 正式切換至終端 1 API 時，`src/api/client.ts` 會以 `POST ${V2_SUPABASE_URL}/rest/v1/rpc/api_v2_reports` 形式呼叫 Supabase RPC，並附上 `Authorization: Bearer <V2_SUPABASE_JWT|SERVICE_KEY>`、`apikey: <V2_SUPABASE_ANON_KEY>`；錯誤回應會顯示 `message` 欄位內容。
4. `A/B` Mode 目前僅切換 mock 視圖，待 API 提供拆分後再補強 pills 篩選與 insight 顯示。
5. 若需先確認 RPC 可用，可執行 `scripts/curl_guardian_v2_samples.sh reports`。

## 常見錯誤碼
- `401`：token 遺失或已失效，請確認 `.env.local` 內 `V2_SUPABASE_JWT` 是否為最新，或改用 service key（僅限測試環境）。
- `403`：帳號無對應資料或權限不足，需確認 Supabase RLS 是否允許該 JWT 查詢。
- `404`：`api_v2_reports` 尚未部署或函式名稱不符，請與終端 1 核對 RPC 名稱。
- 其他錯誤會顯示 `message` 字串，建議同步至終端 1 以確認欄位需求。
