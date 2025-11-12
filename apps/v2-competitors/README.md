# Guardian V2 Competitors

## Wireframe 概述

```
+---------------------------------------------------------------+
| LOGO | [市場脈動] [競品比較] [設定]    Mode: [A|B]             |
+---------------------------------------------------------------+
| Market Pulse Hero                                             |
|  - 競品指標趨勢折線圖 placeholder                             |
|  - CTA：建立競品警報、下載比較報表                             |
+---------------------------------------------------------------+
| Filter Bar                                                    |
|  城市 Autocomplete | 店名 Autocomplete | 指標選擇              |
+---------------------------------------------------------------+
| Competitor Comparison Matrix                                  |
|  ┌------------------┬------------------┬-------------------┐   |
|  | 自家指標         | 競品 A            | 競品 B             |   |
|  | 曝光 1.2k ▼5%    | 曝光 1.8k ▲12%   | 曝光 950 ▲3%       |   |
|  └------------------┴------------------┴-------------------┘   |
+---------------------------------------------------------------+
| Alert Timeline + Actions                                      |
|  - 競品事件列表（時間、影響、建議行動）                         |
|  - 快速 CTA：加入監控、指派守護任務                             |
+---------------------------------------------------------------+
| 新增競品表單 Placeholder                                      |
|  [輸入競品名稱] [網址] [商圈] [建立]                            |
+---------------------------------------------------------------+
```

### 互動流程
- LOGO 置左；右側 pills 控制畫面區塊，A/B 模式切換不同 KPI 欄位。
- Autocomplete 遵循 reports 頁面同樣樣式，支援 datalist placeholder。
- 競品新增表單提供基本欄位，後續接資料驗證與 API。

## 初版頁面架構

```
src/
  pages/
    index.tsx        # React/Vite 入口，包含監控列表與新增表單
  types/
    api.ts           # 競品 API 型別
  api/
    mock.ts          # 假資料來源
```

- 共用樣式同樣引用 `../../shared/guardian_v2/styles.scss`，需安裝 `sass`。
- Autocomplete 先使用 `<input + datalist>`，未來再導入實際元件。

## 開發指引

1. 於 repo 根目錄複製 `.env.example_v2` 為 `.env.local`，填入 `V2_API_BASE_URL`、`V2_LIFF_ID`、`V2_SUPABASE_URL`、`V2_SUPABASE_ANON_KEY`，以及 `V2_DEFAULT_LEAD_ID=guardian_demo_lead`。同時設定 `V2_SUPABASE_SERVICE_KEY` 或 `V2_SUPABASE_JWT`（缺少時會回退 mock）：
   ```bash
   supabase projects tokens create --project-ref <project-ref> --name guardian-v2-demo --role service_role
   ```
   亦可參考終端 1 的 token 產生腳本，取得短期 JWT 後填入 `V2_SUPABASE_JWT`，以便模擬正式授權流程。
2. 在 `apps/v2-competitors/` 執行：
   ```bash
   pnpm install
   pnpm dev           # start script 代理 `vite dev`
   ```
   > 若未全域安裝 Sass，請執行 `pnpm install -D sass`。
3. `src/api/client.ts` 會以 `POST ${V2_SUPABASE_URL}/rest/v1/rpc/api_v2_competitors_list|insert|update_status` 呼叫 RPC，並附上 `Authorization: Bearer <V2_SUPABASE_JWT|SERVICE_KEY>`、`apikey: <V2_SUPABASE_ANON_KEY>`；錯誤回應會直接回拋 UI。`api_v2_competitors_list` 目前回傳 `{ data, meta }` 結構，`data[].metrics` 會帶入 `analytics.guardian_competitor_metrics` 的彙總欄位（`reviewCount`、`avgSentiment`、`avgRating`、`lastReviewedAt`），頁面已針對缺少欄位或空值顯示預設文案。
4. 新增競品表單 payload 對應 `{ storeName, city, placeId, website?, igUrl?, fbUrl? }`；URL 目前僅檢查是否以 http/https 開頭（TODO: 補強格式驗證）。
5. 若要檢查 RPC，可以使用 `scripts/curl_guardian_v2_samples.sh competitors-list` 或 `competitors-insert`。

## 常見錯誤碼
- `401`：缺少 JWT／service key，會在頁面顯示「建立競品失敗」或「更新競品狀態失敗」，請更新 `.env.local`。
- `403`：目前帳號無該競品資料權限，需確認 Supabase RLS 設定或 token scope。
- `409`：競品已存在（Supabase RPC 會回傳此錯誤碼），請提示使用者改用暫停功能。
- 其他錯誤會顯示 RPC `message`，請記錄並回報終端 1 核對欄位需求。
- `PGRST202 Could not find the function public.api_v2_competitors_update_status`：後端尚未部署該 RPC，前端會提醒「尚未部署...」並保留原狀態（2025-11-01 實測）。
- 趨勢圖與 A/B 模式仍為 placeholder，待 API 提供分段數據再補完互動。
