# Guardian V2 LIFF Admin 控台動線

## 導覽流程
1. **搜尋帳號或門市**
   - 輸入條件：帳號 ID、門市名稱或電話。
   - 介面：Autocomplete 列出 `account_id · store_name · city`。
   - 呼叫：`GET /admin/accounts?keyword={keyword}`。
2. **檢視與切換方案**
   - 顯示目前 `plan_code`、`plan_source`、到期日與可切換方案列表。
   - 切換流程：選擇新方案 → 彈出確認框（顯示費率與權限差異）。
   - 呼叫：`POST /admin/accounts/{accountId}/plan`，Body `{ plan_code, reason }`。
3. **觸發 Flow / 報表重製**
   - 提供按鈕：重新產生守護報表、重送通知、同步競品快照。
   - 每個按鈕顯示權限需求（需 `guardian.admin` 或 `guardian.ops`）。
   - 呼叫：
     - `POST /admin/flows/run` body `{ flow: 'guardian_report_refresh', account_id }`
     - `POST /admin/flows/run` body `{ flow: 'guardian_notification_test', account_id }`
     - `POST /admin/flows/run` body `{ flow: 'guardian_competitor_sync', account_id }`

## 畫面元素
- **搜尋區塊**
  - `input#admin-search`：可輸入關鍵字。
  - `button.search-submit`：觸發搜尋，需 debounced。
  - `div.search-results`：呈現帳號／門市列表，支援鍵盤導覽。
- **方案卡片**
  - `select#plan-options`：顯示可切換方案。
  - `button#plan-confirm`：呼叫方案切換 API。
  - `badge.plan-tier`：顯示目前方案顏色（套用 `guardian_v2` 樣式）。
- **Flow 區塊**
  - `button[data-flow=guardian_report_refresh]`、`button[data-flow=guardian_notification_test]`、`button[data-flow=guardian_competitor_sync]`
  - `span.flow-status`：顯示最近觸發結果（成功、失敗、權限不足）。

## 權限檢查
- 所有按鈕需確認登入者具備 `guardian.admin` 或 `guardian.ops`。
- 若權限不足，顯示 `toast`：「需要 guardian.admin 權限才能執行此操作」。
- API 回應 403 時，寫入審計 log `guardian_admin_denied`。

## 後續串接注意
- 終端 1 需提供 `/admin/accounts` 與 `/admin/flows/run` endpoint。
- Flow 執行結果回傳 JSON `{ request_id, status, message }`，前端顯示於 timeline。
- 需整合 `notification_throttle` 資訊，避免過度觸發。
