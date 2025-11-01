# Guardian V2 UI Smoke Test Plan

## RPC 驗證（2025-11-01）
- `api_v2_reports`
  ```json
  {
    "data": [
      {
        "reportId": "00000000-0000-4000-8000-000000000021",
        "reportDate": "2025-10-31",
        "generatedAt": "2025-11-01T07:50:17.525876+00:00",
        "accountName": "Guardian Demo Lead",
        "planTier": "lite",
        "coverageScore": 0,
        "aiSpendUsd": 0,
        "insights": []
      }
    ],
    "meta": {
      "generatedAt": "2025-11-01T09:13:23.227942+00:00",
      "requestId": "a0377ebe-b0da-488a-9452-bbd57df8b0d0"
    }
  }
  ```
- `api_v2_competitors_list`
  ```json
  {
    "data": [
      {
        "storeId": "00000000-0000-4000-8000-000000000031",
        "storeName": "Demo Competitor",
        "city": "Taipei",
        "sentimentDelta": 0,
        "metadata": {
          "leadId": "guardian_demo_lead",
          "accountId": "00000000-0000-4000-8000-000000000001",
          "monitorType": "organic"
        }
      }
    ],
    "meta": {
      "generatedAt": "2025-11-01T09:03:14.69356+00:00",
      "requestId": "c7d077e7-6755-4248-be11-b8b45aba2721"
    }
  }
  ```
- `api_v2_competitors_update_status`
  ```json
  {
    "code": "PGRST202",
    "message": "Could not find the function public.api_v2_competitors_update_status(p_lead, p_reason, p_status, p_store_id) in the schema cache"
  }
  ```
  > 仍待終端 1 部署更新函式；前端保留錯誤提示以利追蹤。

## 1. Reports (/apps/v2-reports)
- **Mock/實際切換**：清空 `V2_SUPABASE_SERVICE_KEY` / `V2_SUPABASE_JWT` 後載入頁面應呈現 mock 資料；填入有效 token 後重新整理，應呼叫 `api_v2_reports` 並顯示回傳內容。
- **設定範例**：`V2_SUPABASE_SERVICE_KEY=<service_role_key>`、`V2_DEFAULT_LEAD_ID=guardian_demo_lead` 對應 demo seed。
- **Error State**：將 RPC 名稱改為錯誤值或使用過期 JWT，確認頁面顯示 `message` 內容（`guardian-alert--critical` 區塊），同時保留搜尋區塊。
- **Mode A/B**：切換 A/B 時需重新呼叫 API 並渲染對應卡片；若 `insights.actions` 為空，須顯示「暫無建議」。
- **缺權限**：將 `V2_SUPABASE_JWT` 清空、僅保留 service key 時，應顯示 mock 並提示「Supabase 環境未設定」；若後端回傳 403，alert 需顯示 `needs admin permission` 類訊息。

## 2. Competitors (/apps/v2-competitors)
- **列表載入**：缺憑證時顯示 mock 清單；有 token 時呼叫 `api_v2_competitors_list`，於 Network 面板確認 `rest/v1/rpc` request。
- **資料結構**：Supabase RPC 目前回傳 `{ data: [...], meta: {...} }`（尚未含 account/trends），頁面會自動以 `data` 填入卡片與矩陣；若欄位缺失，Hero 卡須改顯示預設文字。
- **新增競品**：填寫 `storeName/city/placeId`（選填網址）送出，呼叫 `api_v2_competitors_insert`；成功後提示「已建立競品」並即時加入列表。
- **暫停/恢復/移除**：點擊列表內按鈕呼叫 `api_v2_competitors_update_status`，按鈕進入 loading；錯誤時顯示紅色訊息並保留原狀態。
- **錯誤碼測試**：將 token 設為失效字串檢查 401 提示；設定 `V2_HAS_ADMIN_ROLE=false` 後確保所有呼叫在前端阻擋。
- **函式缺失**：若出現 `PGRST202 Could not find the function public.api_v2_competitors_update_status`，需回報終端 1 部署該 RPC。

## 3. Admin (/apps/v2-admin)
- **搜尋**：輸入關鍵字後按「搜尋」，列表更新且顯示 info 訊息。
- **方案切換**：填入 service key 後按任一方案按鈕，Network 應出現 `rest/v1/rpc/api_v2_admin_set_plan` 並回傳 `eventId`；錯誤時顯示紅色警示。
- **流程觸發**：三個流程按鈕依序測試，Network 須出現 `rest/v1/rpc/api_v2_admin_flows_run`，成功時訊息包含 `runId`。
- **缺權限**：將 `V2_HAS_ADMIN_ROLE=false`，確認按鈕顯示「需要 admin 權限」且不發出 request。
- **函式缺失**：若 RPC 回覆 `Not Found` 或 `PGRST202`，需通知終端 1 補上對應函式。

> 建議於本機 `.env.local` 動態調整 token/URL，並搭配 `scripts/dev_guardian_v2.sh` 啟動所有 app 進行 Smoke Test。

補充：如需先確認 RPC 回傳，可執行 `scripts/curl_guardian_v2_samples.sh all` 檢視 Supabase 回應與錯誤訊息。
