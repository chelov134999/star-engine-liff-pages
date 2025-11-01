# Guardian V2 Admin Console

`/admin` 控台主要流程：
1. **搜尋帳號**：輸入店家名稱或帳號 ID，自動完成列出匹配結果。
2. **切換方案 Plan**：顯示目前方案與升降級選項，確認後呼叫 API 更新。
3. **觸發 Flow**：提供按鈕啟動報表重製、守護任務同步等流程。

## 初版頁面骨架

```
src/
  pages/
    index.tsx   # React 入口，渲染搜尋、方案切換與 Flow 觸發 placeholder
```

- 欄位與按鈕對應 `docs/v2/liff-admin.md` 描述。
- 權限檢查留待串接階段整合認證模組。

## 開發指引

1. 根目錄複製 `.env.example_v2` 為 `.env.local`，供這個 app 與其他 V2 頁面共用。
2. 進入 `apps/v2-admin/` 後執行 `pnpm install`、`pnpm dev` 啟動開發伺服器（同樣需要 `sass` 支援）。
3. 串接 Supabase RPC：
   - `api_v2_admin_set_plan`：方案切換（body：`{p_account, p_plan_code, p_plan_source, p_expires_at?, p_notes?}`）。前端透過 service key / JWT 驗證，成功後會回傳 `eventId` 與最新 `planSource`。
   - `api_v2_admin_flows_run`：排入後台流程（body：`{p_flow_code, p_payload}`），回傳 `runId` 與排程狀態。
   - 呼叫前需檢查登入者是否具備 `guardian.admin` 或 `guardian.ops` 權限（等待 LIFF / Supabase Auth 串接）。
4. `.env.local` 需提供 `V2_SUPABASE_URL`、`V2_SUPABASE_ANON_KEY`、`V2_SUPABASE_SERVICE_KEY|JWT`。可透過 `V2_HAS_ADMIN_ROLE=false` 模擬 viewer 角色。`V2_ADMIN_PLAN_REASON` 與 `V2_ADMIN_PLAN_SOURCE` 可自訂變更原因與來源標記。

## 常見錯誤碼
- `401`：缺少 token，介面會顯示「需要 admin 權限」，請更新 `V2_SUPABASE_JWT` 或導入正規登入流程。
- `403`：後端拒絕權限；可透過 `V2_HAS_ADMIN_ROLE=false` 模擬，此時按鈕會提示需要 admin 權限。
- `404`：Supabase 尚未部署 `api_v2_admin_*` 函式；請確認終端 1 是否套用 20251104000000 migration。
- 其他錯誤：alert 會顯示 API `message`，請同步給終端 1 排查。

## 驗證筆記（2025-11-01）
- `api_v2_admin_set_plan`：`acct-guardian-demo` 從 PRO 切換至 Lite 成功，回傳 `eventId=e0d2b16b-...`；UI 提示「方案已更新為 LITE（來源 manual） · 事件 e0d2b16b」。
- `api_v2_admin_flows_run`：觸發 `guardian_report_refresh` 回傳 `runId=4e5dce21-...`，頁面顯示 `已送出流程 guardian_report_refresh · run 4e5dce21`。
- 權限測試：將 `V2_HAS_ADMIN_ROLE=false` 時，所有按鈕顯示「需要 admin 權限」且未送出 RPC。
