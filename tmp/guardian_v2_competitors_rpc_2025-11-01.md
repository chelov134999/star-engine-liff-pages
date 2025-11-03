# Guardian V2 Competitors RPC Verification — 2025-11-03

以 `.env.local` 中的 Supabase demo 憑證呼叫遠端 RPC，確認終端 2 前端所需欄位與錯誤訊息行為。

> 請自行從 `.env.local` 讀取 `SUPABASE_REST_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY` 後執行下列 `curl`。

## `api_v2_reports` — 200 OK

```json
{
  "data": [
    {
      "insights": [],
      "planTier": "lite",
      "reportId": "e721213a-e426-41e2-b58e-dfbb926928d0",
      "aiSpendUsd": 0,
      "reportDate": "2025-11-03",
      "accountName": "Guardian Demo Lead",
      "generatedAt": "2025-11-03T15:59:59.672+00:00",
      "coverageScore": 0
    }
  ],
  "meta": {
    "requestId": "0b2c1e10-5ea3-45af-b8b9-a7c4b06b6048",
    "generatedAt": "2025-11-03T16:20:37.559044+00:00"
  },
  "timeline": null,
  "pagination": {
    "cursor": null,
    "hasNext": true
  }
}
```

## `api_v2_competitors_list` — 200 OK

```json
{
  "data": [
    {
      "city": "Taipei",
      "metrics": {},
      "storeId": "00000000-0000-4000-8000-000000000031",
      "website": null,
      "metadata": {
        "city": "Taipei",
        "domain": "demo-competitor.example.com",
        "leadId": "guardian_demo_lead",
        "status": "active",
        "accountId": "00000000-0000-4000-8000-000000000001",
        "monitorType": "organic",
        "statusReason": "curl demo verification",
        "trackingLevel": "full",
        "statusUpdatedAt": "2025-11-01T11:23:16.325362+00:00"
      },
      "storeName": "Demo Competitor",
      "lastSeenAt": "2025-11-01T11:23:16.325362+00:00",
      "sentimentDelta": 0
    },
    {
      "city": "Taipei",
      "metrics": {},
      "storeId": "433b811d-2938-497b-bddf-3b5d2ebf944c",
      "website": "https://demo-bistro.example.com",
      "metadata": {
        "city": "Taipei",
        "domain": "demo-bistro.example.com",
        "leadId": "guardian_demo_lead",
        "source": "api_v2",
        "status": "active",
        "website": "https://demo-bistro.example.com",
        "accountId": "00000000-0000-4000-8000-000000000001",
        "monitorType": "organic",
        "statusReason": "curl demo verification",
        "statusUpdatedAt": "2025-11-03T12:34:14.154779+00:00"
      },
      "storeName": "Demo Bistro",
      "lastSeenAt": "2025-11-03T12:34:14.154779+00:00",
      "sentimentDelta": 0
    },
    {
      "city": "",
      "metrics": {},
      "storeId": "00000000-0000-0000-0000-00000000c001",
      "website": null,
      "metadata": {
        "domain": "demo-competitor.test",
        "leadId": "guardian_demo_lead",
        "accountId": "00000000-0000-4000-8000-000000000001",
        "monitorType": "organic"
      },
      "storeName": "Demo Competitor",
      "lastSeenAt": "2025-11-01T09:17:17.030113+00:00",
      "sentimentDelta": 0
    }
  ],
  "meta": {
    "requestId": "0c23dac5-4993-4a59-8414-3b63a5335a8b",
    "generatedAt": "2025-11-03T16:20:37.832236+00:00"
  }
}
```

## `api_v2_competitors_insert` — 200 OK

```json
{
  "data": {
    "city": "Taipei",
    "metrics": {},
    "storeId": "433b811d-2938-497b-bddf-3b5d2ebf944c",
    "website": "https://demo-bistro.example.com",
    "metadata": {
      "city": "Taipei",
      "domain": "demo-bistro.example.com",
      "leadId": "guardian_demo_lead",
      "source": "api_v2",
      "status": "active",
      "website": "https://demo-bistro.example.com",
      "accountId": "00000000-0000-4000-8000-000000000001",
      "monitorType": "organic",
      "statusReason": "curl demo verification",
      "statusUpdatedAt": "2025-11-03T16:20:38.085849+00:00"
    },
    "storeName": "Demo Bistro",
    "lastSeenAt": "2025-11-03T16:20:38.085849+00:00",
    "sentimentDelta": 0
  },
  "meta": {
    "requestId": "c68b8886-8d47-4dcf-9609-d9ae82728014",
    "generatedAt": "2025-11-03T16:20:38.085849+00:00"
  }
}
```

## `api_v2_competitors_update_status` — 200 OK

```json
{
  "data": {
    "city": "Taipei",
    "status": "active",
    "metrics": {},
    "placeId": null,
    "storeId": "433b811d-2938-497b-bddf-3b5d2ebf944c",
    "website": "https://demo-bistro.example.com",
    "metadata": {
      "city": "Taipei",
      "domain": "demo-bistro.example.com",
      "leadId": "guardian_demo_lead",
      "source": "api_v2",
      "status": "active",
      "website": "https://demo-bistro.example.com",
      "accountId": "00000000-0000-4000-8000-000000000001",
      "monitorType": "organic",
      "statusReason": "curl demo verification",
      "statusUpdatedAt": "2025-11-03T16:20:38.603746+00:00"
    },
    "storeName": "Demo Bistro",
    "lastSeenAt": "2025-11-03T16:20:38.603746+00:00",
    "sentimentDelta": 0
  },
  "meta": {
    "requestId": "fb2c30ba-dab9-41f8-9188-829edfd61aae",
    "generatedAt": "2025-11-03T16:20:38.603746+00:00"
  }
}
```

> 已由終端 1 部署 `api_v2_competitors_update_status`，本次成功回傳 200 並更新狀態。

## `api_v2_guardian_active_leads` — 200 OK

```json
{
  "data": [
    {
      "city": null,
      "route": null,
      "leadId": "guardian_demo_lead",
      "userId": "00000000-0000-4000-8000-000000000002",
      "lead_id": "guardian_demo_lead",
      "summary": "Guardian demo LINE mapping",
      "user_id": "00000000-0000-4000-8000-000000000002",
      "accountId": "00000000-0000-4000-8000-000000000001",
      "account_id": "00000000-0000-4000-8000-000000000001",
      "lineUserId": "guardian_demo_line_user",
      "updated_at": "2025-11-01T07:50:17.525876+00:00",
      "line_user_id": "guardian_demo_line_user"
    }
  ],
  "meta": {
    "requestId": "f2f20292-c1f9-47d2-9344-687ac9d94f73",
    "generatedAt": "2025-11-03T16:20:38.326738+00:00"
  }
}
```

## Admin RPC

### `api_v2_admin_set_plan` — 200 OK

```json
{
  "data": {
    "planCode": "guardian_pro",
    "accountId": "00000000-0000-4000-8000-000000000001",
    "planSource": "manual",
    "planExpiresAt": null
  },
  "meta": {
    "eventId": "2f90196a-6bf7-4f32-afd2-a5b56be9a6eb",
    "updatedAt": "2025-11-03T16:20:38.852832+00:00"
  }
}
```

### `api_v2_admin_flows_run` — 200 OK（測試模式）

```json
{
  "data": {
    "runId": "bfbd845c-33d0-460c-8303-98db10258eb2",
    "status": "queued",
    "flowCode": "guardian_report_refresh"
  },
  "meta": {
    "createdAt": "2025-11-03T16:20:45.539376+00:00"
  }
}
```

> 測試模式：推播僅發送至 `line_test_user_id`，同時記錄 `linePushStatus=SENT`。

### `api_v2_admin_flows_run` — 200 OK（正式模式）

```json
{
  "data": {
    "runId": "80843760-2f45-4774-9fb5-044d786c95d5",
    "status": "queued",
    "flowCode": "guardian_report_refresh"
  },
  "meta": {
    "createdAt": "2025-11-03T16:20:54.855922+00:00"
  }
}
```

> 正式模式：推播送至 `line_admin_user_id`，流程完成後可在 `public.guardian_workflow_status` 查到對應 SLO。

### `api_v2_admin_flows_run` — 200 OK（guardian_hourly 範例）

```json
{
  "data": {
    "runId": "7f163d3e-2d53-4750-9f57-bbcd80c178f3",
    "status": "queued",
    "flowCode": "guardian_hourly"
  },
  "meta": {
    "createdAt": "2025-11-03T16:20:39.106281+00:00"
  }
}
```
```
