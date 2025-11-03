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
      "reportId": "00000000-0000-4000-8000-000000000021",
      "aiSpendUsd": 0,
      "reportDate": "2025-10-31",
      "accountName": "Guardian Demo Lead",
      "generatedAt": "2025-11-01T07:50:17.525876+00:00",
      "coverageScore": 0
    }
  ],
  "meta": {
    "requestId": "cfeddc46-c1e7-4a87-bea8-46e6861f7e8e",
    "generatedAt": "2025-11-03T12:34:13.202582+00:00"
  },
  "timeline": null,
  "pagination": {
    "cursor": null,
    "hasNext": false
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
        "statusUpdatedAt": "2025-11-03T12:34:03.130395+00:00"
      },
      "storeName": "Demo Bistro",
      "lastSeenAt": "2025-11-03T12:34:03.130395+00:00",
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
    "requestId": "bbad2125-1ffc-4ae3-a79e-e4eb82e586bc",
    "generatedAt": "2025-11-03T12:34:13.438992+00:00"
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
      "statusUpdatedAt": "2025-11-03T12:34:13.683992+00:00"
    },
    "storeName": "Demo Bistro",
    "lastSeenAt": "2025-11-03T12:34:13.683992+00:00",
    "sentimentDelta": 0
  },
  "meta": {
    "requestId": "e949fe01-0e8d-473e-9a2e-f49e957f183d",
    "generatedAt": "2025-11-03T12:34:13.683992+00:00"
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
      "statusUpdatedAt": "2025-11-03T12:34:14.154779+00:00"
    },
    "storeName": "Demo Bistro",
    "lastSeenAt": "2025-11-03T12:34:14.154779+00:00",
    "sentimentDelta": 0
  },
  "meta": {
    "requestId": "087fc984-12a5-4f02-bd9a-eb59cbc12187",
    "generatedAt": "2025-11-03T12:34:14.154779+00:00"
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
    "requestId": "6a188044-764e-4e0e-b328-341a6ca8e737",
    "generatedAt": "2025-11-03T12:34:13.910903+00:00"
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
    "eventId": "2fe64ea8-e332-42c0-b0f5-6d5b0e8dd234",
    "updatedAt": "2025-11-03T12:34:14.394553+00:00"
  }
}
```

### `api_v2_admin_flows_run` — 200 OK

```json
{
  "data": {
    "runId": "44be1b1f-c7ae-4db3-91fa-3d9410da3ae0",
    "status": "queued",
    "flowCode": "guardian_report_refresh"
  },
  "meta": {
    "createdAt": "2025-11-03T12:34:23.736124+00:00"
  }
}
```

> 測試模式：推播僅發送至 line_test_user_id。

```json
{
  "data": {
    "runId": "0d78ce4a-634c-49eb-8f3d-f22dfa4a01b1",
    "status": "queued",
    "flowCode": "guardian_report_refresh"
  },
  "meta": {
    "createdAt": "2025-11-03T12:34:38.599136+00:00"
  }
}
```

> 正式模式：推播送至 line_admin_user_id。
