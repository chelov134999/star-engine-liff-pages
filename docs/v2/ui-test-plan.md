# Guardian V2 UI Smoke Test Plan

## RPC 驗證（2025-11-03）
- `api_v2_reports`
  ```json
  {
    "data": [
      {
        "insights": [],
        "planTier": "lite",
        "reportId": "e721213a-e426-41e2-b58e-dfbb926928d0",
        "reportDate": "2025-11-03",
        "generatedAt": "2025-11-03T15:59:59.672+00:00",
        "accountName": "Guardian Demo Lead",
        "coverageScore": 0,
        "aiSpendUsd": 0
      }
    ],
    "meta": {
      "generatedAt": "2025-11-03T16:20:37.559044+00:00",
      "requestId": "0b2c1e10-5ea3-45af-b8b9-a7c4b06b6048"
    },
    "timeline": null,
    "pagination": {
      "cursor": null,
      "hasNext": true
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
          "monitorType": "organic",
          "status": "active",
          "statusReason": "curl demo verification",
          "statusUpdatedAt": "2025-11-01T11:23:16.325362+00:00"
        }
      },
      {
        "storeId": "433b811d-2938-497b-bddf-3b5d2ebf944c",
        "storeName": "Demo Bistro",
        "city": "Taipei",
        "sentimentDelta": 0,
        "metadata": {
          "leadId": "guardian_demo_lead",
          "accountId": "00000000-0000-4000-8000-000000000001",
          "monitorType": "organic",
          "status": "active",
          "statusReason": "curl demo verification",
          "statusUpdatedAt": "2025-11-03T12:34:14.154779+00:00"
        }
      }
    ],
    "meta": {
      "generatedAt": "2025-11-03T16:20:37.832236+00:00",
      "requestId": "0c23dac5-4993-4a59-8414-3b63a5335a8b"
    }
  }
  ```
- `api_v2_competitors_update_status`
  ```json
  {
    "data": {
      "storeId": "433b811d-2938-497b-bddf-3b5d2ebf944c",
      "status": "active",
      "metadata": {
        "statusReason": "curl demo verification",
        "statusUpdatedAt": "2025-11-03T16:20:38.603746+00:00"
      }
    },
    "meta": {
      "requestId": "fb2c30ba-dab9-41f8-9188-829edfd61aae",
      "generatedAt": "2025-11-03T16:20:38.603746+00:00"
    }
  }
  ```
- `api_v2_guardian_active_leads`
  ```json
  {
    "data": [
      {
        "leadId": "guardian_demo_lead",
        "accountId": "00000000-0000-4000-8000-000000000001",
        "lineUserId": "guardian_demo_line_user",
        "updated_at": "2025-11-01T07:50:17.525876+00:00"
      }
    ],
    "meta": {
      "generatedAt": "2025-11-03T16:20:38.326738+00:00",
      "requestId": "f2f20292-c1f9-47d2-9344-687ac9d94f73"
    }
  }
  ```

## 1. Reports (/apps/v2-reports)
- **Mock/實際切換**：清空 `V2_SUPABASE_SERVICE_KEY`/`V2_SUPABASE_JWT` 後載入頁面應呈現 mock；填入有效 token 後重新整理，確認改呼叫 `api_v2_reports`。
- **Error State**：將 RPC 名稱改成錯誤值或使用過期 JWT，alert 需顯示後端 `message` 並保留搜尋區塊。
- **Mode A/B**：切換 A/B 時重新呼叫 API；若 `insights.actions` 為空須顯示「暫無建議」。

## 2. Competitors (/apps/v2-competitors)
- **列表載入**：缺憑證時顯示 mock 清單；有 token 時應送出 `api_v2_competitors_list` request。
- **新增競品**：填寫 `storeName/city/placeId`（或網站）後送出，確認呼叫 `api_v2_competitors_insert`，成功後立即刷新列表。
- **暫停/恢復/移除**：按鈕會呼叫 `api_v2_competitors_update_status`，並依回傳更新卡片狀態；錯誤時保留原狀並顯示紅色訊息。

## 3. Admin (/apps/v2-admin)
- **搜尋**：輸入關鍵字後按「搜尋」，更新列表並顯示 info 訊息。
- **方案切換**：呼叫 `api_v2_admin_set_plan`，成功時顯示 `LINE 推播已排程` 並列出 eventId（2025-11-03 實測 `eventId=2f90196a-…`）。
- **流程觸發**：
  - 測試模式勾選時，`guardian_report_refresh` 回傳 `runId=bfbd845c-…`（`status=queued`），推播僅送至 `line_test_user_id` 並於資料庫記錄 `linePushStatus=SENT`。
  - 取消勾選時，回傳 `runId=80843760-…`，推播送至 `line_admin_user_id`；SLO 可於 `public.guardian_workflow_status` 查到最新一筆。
  - 若收到 4xx/5xx，alert 需顯示 `message` 原文；`V2_HAS_ADMIN_ROLE=false` 應阻擋呼叫並顯示權限提示。

## 4. SLO / 佇列確認
- 成功觸發後，可透過 `/rest/v1/guardian_workflow_status` 查詢 `guardian_report_refresh`、`guardian_hourly` 的最新 run（本輪 `runId=7f163d3e-…` 已寫入）。
- Competitor Daily 佇列可在 `public.firecrawl_queue` 檢視 `firecrawlNote=QUEUED_FIRECRAWL`。

## Build 狀態（2025-11-03）
- 使用 pnpm v10.20.0 於 `apps/v2-{reports,competitors,admin}` 依序執行 `pnpm install && pnpm build` 均成功，僅出現 `Ignored build scripts: @parcel/watcher, esbuild` 與 Sass legacy JS API deprecation 警告。
- build 產生 `dist/index.html` 與 CSS/JS bundle，確認內容可供部署。

> 建議於 Smoke Test 後，更新 `tmp/guardian_v2_competitors_rpc_2025-11-01.md` 並在 README 記錄最新 runId/eventId，方便後續追蹤。
