# Guardian V2 UI Smoke Test Plan

## RPC 驗證（2025-11-05）
- `api_v2_reports`
  ```json
  {
    "code": "PGRST203",
    "message": "Could not choose the best candidate function between: public.api_v2_reports(p_lead => text, p_report_type => text, p_date => date, p_mode => text), public.api_v2_reports(p_lead => uuid, p_report_type => text, p_date => date, p_mode => text)"
  }
  ```
  > 正式 lead UUID 目前同時命中 text/uuid 版本函式；等待終端 1 移除 text 版或調整參數後再改測。
- `api_v2_competitors_list`
  ```json
  {
    "data": [],
    "meta": {
      "generatedAt": "2025-11-05T08:01:32.982518+00:00",
      "requestId": "0f8a6e71-5aee-4f89-a029-d04a5ae393e2"
    }
  }
  ```
- `api_v2_competitors_update_status`
  ```json
  {
    "code": "P0001",
    "message": "competitor_not_found"
  }
  ```
  > 正式帳號尚未建立對應 `storeId`，需先呼叫 insert 後再更新狀態。
- `api_v2_guardian_active_leads`
  ```json
  {
    "data": [
      {
        "leadId": "e5c7c9ed-f23e-4aa8-9427-b941e3025103",
        "accountId": "5d71ea12-92bd-4c00-b21a-0e507ebe4a13",
        "lineUserId": "UofficialGuardian001",
        "updated_at": "2025-11-04T05:42:24.157108+00:00"
      }
    ],
    "meta": {
      "generatedAt": "2025-11-05T08:01:33.627885+00:00",
      "requestId": "dbbe86e8-c943-4433-89ea-4d1a58d1920c"
    }
  }
  ```

## 1. Reports (/apps/v2-reports)
- **Mock/實際切換**：清空 `V2_SUPABASE_SERVICE_KEY`/`V2_SUPABASE_JWT` 後載入頁面應呈現 mock；填入有效 token 後重新整理，確認改呼叫 `api_v2_reports`。若仍出現 PGRST203，請與終端 1 對齊函式。
- **Error State**：將 RPC 名稱改成錯誤值或使用過期 JWT，alert 需顯示後端 `message` 並保留搜尋區塊。
- **Mode A/B**：切換 A/B 時重新呼叫 API；若 `insights.actions` 為空須顯示「暫無建議」。

## 2. Competitors (/apps/v2-competitors)
- **列表載入**：缺憑證時顯示 mock 清單；有 token 時應送出 `api_v2_competitors_list` request，若後端尚未建立競品，列表會為空。
- **新增競品**：填寫 `storeName/city/placeId`（或網站）後送出，確認呼叫 `api_v2_competitors_insert`，成功後立即刷新列表。
- **暫停/恢復/移除**：按鈕會呼叫 `api_v2_competitors_update_status`，並依回傳更新卡片狀態；錯誤時保留原狀並顯示紅色訊息。

## 3. Admin (/apps/v2-admin)
- **搜尋**：輸入關鍵字後按「搜尋」，更新列表並顯示 info 訊息。
- **方案切換**：呼叫 `api_v2_admin_set_plan`，成功時顯示 `LINE 推播已排程` 並列出 eventId（2025-11-05 最新 `eventId=27b8329a-…`）。
- **流程觸發**：
  - 測試模式勾選時，`guardian_report_refresh` 回傳 `runId=bfbd845c-…`（`status=queued`），推播僅送至 `line_test_user_id` 並於資料庫記錄 `linePushStatus=SENT`。
  - 取消勾選時，回傳 `runId=80843760-…`，推播送至 `line_admin_user_id`；SLO 可於 `public.guardian_workflow_status` 查到最新一筆。
  - 若收到 4xx/5xx，alert 需顯示 `message` 原文；`V2_HAS_ADMIN_ROLE=false` 應阻擋呼叫並顯示權限提示。

## 4. SLO / 佇列確認
- 成功觸發後，可透過 `/rest/v1/guardian_workflow_status` 查詢 `guardian_report_refresh`、`guardian_hourly` 的最新 run（2025-11-05 手動 webhook `guardian_hourly` 回傳 `runId=c82a2a18-…`；排程則可觀察 `executionMode=trigger` 紀錄）。
- Competitor Daily 佇列可在 `public.firecrawl_queue` 檢視 `firecrawlStatus=QUEUED_PROXY`。

## Build 狀態（2025-11-05）
- 使用 pnpm v10.20.0 於 `apps/v2-{reports,competitors,admin}` 依序執行 `pnpm install && pnpm build` 均成功，僅出現 `Ignored build scripts: @parcel/watcher, esbuild` 與 Sass legacy JS API deprecation 警告。
- build 產生 `dist/index.html` 與 CSS/JS bundle，確認內容可供部署。

> 完成正式 LIFF Smoke Test 後，請將對應 reportId / runId / requestId 追加於本文件並同步更新 quicklog。

## 5. S7 守護接力（LIFF）
- **CTA 文案**：主按鈕需為「看分析結果」，次按鈕為「啟動每日監控 🔍」。若出現舊文案（與守護專家聊聊 / 升級到監控版），表示頁面 cache 尚未更新。
- **導流**：點擊「看分析結果」應開啟 ChatKit 連結；完成後守護專家會貼出 LIFF 升級超連結。若使用手動升級流程，按下「啟動每日監控 🔍」需導向 `https://chelov134999.github.io/star-engine-liff-v2/apps/v2-admin/` 並顯示正式帳號資料。
- **Smoke Test 記錄**：請於此處填入最新一次正式測試的 `reportId`、`runId`、`eventId`、Rich Menu 截圖 URL 及時間戳，例如：
  ```
  2025-11-07 Smoke Test（正式帳）：
    - reportId=0f4915e3-d9ec-4a5f-91b7-f3215ff82fe1
    - guardian_report_refresh runId=TODO（請填實際值）
    - guardian_plan_events eventId=TODO
    - Rich Menu 截圖：<link>
  ```
  若尚未取得正式數值，請標註 TODO 並於 quicklog 補上說明。
- **2025-11-12 更新**：`guardian-cta-upgrade` / `main` 已同步 `.lead-actions` 與 `.s7-cta` 等寬置中、S7 Launch 提示卡與 `activate.html` padding；GitHub Pages 尚未 rebuild，LIFF S0 入口仍引用舊 artifact（回首頁後 3 秒跳 404 / Flax 卡未顯示）。完成 push 後須重新執行 S0→S7→啟動 smoke test，並補上 runId / eventId / Rich Menu 截圖。
