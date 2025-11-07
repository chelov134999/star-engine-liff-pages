# Guardian V2 Competitors RPC Verification — 2025-11-05

以 `.env.local` 中的正式 Supabase 憑證呼叫遠端 RPC，驗證終端 2 介面所需欄位與錯誤訊息。以下範例皆使用：

- Lead UUID `e5c7c9ed-f23e-4aa8-9427-b941e3025103`
- Account UUID `5d71ea12-92bd-4c00-b21a-0e507ebe4a13`

> 請參照 `.env.example_v2` 取得 `V2_SUPABASE_URL`、`V2_SUPABASE_ANON_KEY`、`V2_SUPABASE_SERVICE_KEY` 等設定後再執行 `scripts/curl_guardian_v2_samples.sh`。

## `api_v2_reports` — PGRST203（函式重載尚未統一）

```json
{
  "code": "PGRST203",
  "details": null,
  "hint": "Try renaming the parameters or the function itself in the database so function overloading can be resolved",
  "message": "Could not choose the best candidate function between: public.api_v2_reports(p_lead => text, p_report_type => text, p_date => date, p_mode => text), public.api_v2_reports(p_lead => uuid, p_report_type => text, p_date => date, p_mode => text)"
}
```

> 後端同時存在 text/uuid 版本；請統一函式或明確指定參數型別後再行呼叫。

## `api_v2_competitors_list` — 200 OK（正式帳號目前尚無資料）

```json
{
  "data": [],
  "meta": {
    "requestId": "0f8a6e71-5aee-4f89-a029-d04a5ae393e2",
    "generatedAt": "2025-11-05T08:01:32.982518+00:00"
  }
}
```

## `api_v2_competitors_insert` — 200 OK（新 storeId）

```json
{
  "data": {
    "city": "Taipei",
    "metrics": {},
    "storeId": "8b4c6c60-29de-4e21-9cc5-c97678124166",
    "website": "https://demo-bistro.example.com",
    "metadata": {
      "city": "Taipei",
      "domain": "demo-bistro.example.com",
      "leadId": "e5c7c9ed-f23e-4aa8-9427-b941e3025103",
      "source": "api_v2",
      "website": "https://demo-bistro.example.com",
      "accountId": "5d71ea12-92bd-4c00-b21a-0e507ebe4a13",
      "monitorType": "organic"
    },
    "storeName": "Demo Bistro",
    "lastSeenAt": "2025-11-05T08:01:33.32211+00:00",
    "sentimentDelta": 0
  },
  "meta": {
    "requestId": "1add11b3-98eb-444f-9f55-7d2c00f4b928",
    "generatedAt": "2025-11-05T08:01:33.32211+00:00"
  }
}
```

## `api_v2_competitors_update_status` — P0001（competitor_not_found）

```json
{
  "code": "P0001",
  "details": null,
  "hint": null,
  "message": "competitor_not_found"
}
```

> 正式帳號尚未建立相同 `storeId`，需先建立競品或改用最新的 `storeId=8b4c6c60-29de-4e21-9cc5-c97678124166`。

## `api_v2_guardian_active_leads` — 200 OK

```json
{
  "data": [
    {
      "city": "台北市",
      "route": "忠孝東路",
      "leadId": "e5c7c9ed-f23e-4aa8-9427-b941e3025103",
      "userId": "abf1535b-e411-4e1f-8d6d-89439ed4b647",
      "summary": "正式測試帳號",
      "accountId": "5d71ea12-92bd-4c00-b21a-0e507ebe4a13",
      "lineUserId": "UofficialGuardian001",
      "updated_at": "2025-11-04T05:42:24.157108+00:00"
    },
    {
      "city": null,
      "route": null,
      "leadId": "guardian_demo_lead",
      "userId": "00000000-0000-4000-8000-000000000002",
      "summary": "Guardian demo LINE mapping",
      "accountId": "00000000-0000-4000-8000-000000000001",
      "lineUserId": "guardian_demo_line_user",
      "updated_at": "2025-11-01T07:50:17.525876+00:00"
    }
  ],
  "meta": {
    "requestId": "dbbe86e8-c943-4433-89ea-4d1a58d1920c",
    "generatedAt": "2025-11-05T08:01:33.627885+00:00"
  }
}
```

## Admin RPC

### `api_v2_admin_set_plan` — 200 OK（正式帳號）

```json
{
  "data": {
    "planCode": "guardian_pro",
    "accountId": "5d71ea12-92bd-4c00-b21a-0e507ebe4a13",
    "planSource": "manual",
    "planExpiresAt": null
  },
  "meta": {
    "eventId": "27b8329a-c5e7-47fb-a93f-72917fdbf036",
    "updatedAt": "2025-11-05T08:01:34.238899+00:00"
  }
}
```

### `api_v2_admin_flows_run` — 200 OK（guardian_hourly 範例）

```json
{
  "data": {
    "runId": "c82a2a18-1b92-43ff-99e2-58e2b5068f72",
    "status": "queued",
    "flowCode": "guardian_hourly"
  },
  "meta": {
    "createdAt": "2025-11-05T08:01:34.514125+00:00"
  }
}
```

> 另有測試模式 / 正式模式的 `guardian_report_refresh`，分別回傳 `runId=bfbd845c-…`、`runId=80843760-…`，詳見 `docs/v2/ui-test-plan.md`。
