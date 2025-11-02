# Guardian V2 Competitors RPC Verification — 2025-11-01

以 `.env.local` 中的 Supabase demo 憑證呼叫遠端 RPC，確認終端 2 前端所需欄位與錯誤訊息行為。

> 請自行從 `.env.local` 讀取 `SUPABASE_REST_URL`、`SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY` 後執行下列 `curl`。

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
        "statusReason": "frontend-demo",
        "statusUpdatedAt": "2025-11-01T17:14:16.377374+00:00"
      },
      "storeName": "Demo Bistro",
      "lastSeenAt": "2025-11-01T17:14:16.377374+00:00",
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
    "requestId": "cbe327e2-b966-46ac-a888-968afada2169",
    "generatedAt": "2025-11-01T17:13:59.990308+00:00"
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
      "status": "paused",
      "website": "https://demo-bistro.example.com",
      "accountId": "00000000-0000-4000-8000-000000000001",
      "monitorType": "organic",
      "statusReason": "frontend-demo",
      "statusUpdatedAt": "2025-11-01T11:35:07.864015+00:00"
    },
    "storeName": "Demo Bistro",
    "lastSeenAt": "2025-11-01T17:14:08.437114+00:00",
    "sentimentDelta": 0
  },
  "meta": {
    "requestId": "472fc4c0-9718-4259-b176-4b2f4fbf8e6c",
    "generatedAt": "2025-11-01T17:14:08.437114+00:00"
  }
}
```

## `api_v2_competitors_update_status` — 404 PGRST202

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
      "statusReason": "frontend-demo",
      "statusUpdatedAt": "2025-11-01T17:14:16.377374+00:00"
    },
    "storeName": "Demo Bistro",
    "lastSeenAt": "2025-11-01T17:14:16.377374+00:00",
    "sentimentDelta": 0
  },
  "meta": {
    "requestId": "0d48c4a4-93e3-463c-a119-d8083af18a4d",
    "generatedAt": "2025-11-01T17:14:16.377374+00:00"
  }
}
```

> 已由終端 1 部署 `api_v2_competitors_update_status`，可正式更新競品狀態。

## Admin RPC

### `api_v2_admin_set_plan` — 200 OK

```json
{
  "data": {
    "planCode": "lite",
    "accountId": "00000000-0000-4000-8000-000000000001",
    "planSource": "manual",
    "planExpiresAt": null
  },
  "meta": {
    "eventId": "97e61ad7-05b6-47ca-819f-0d2ae82eeca0",
    "updatedAt": "2025-11-01T11:42:30.435516+00:00"
  }
}
```

### `api_v2_admin_flows_run` — 200 OK

```json
{
  "data": {
    "runId": "a74cbc57-f8fe-4ea7-bb2f-01abe6390a99",
    "status": "queued",
    "flowCode": "guardian_report_refresh"
  },
  "meta": {
    "createdAt": "2025-11-01T11:42:40.69237+00:00"
  }
}
```
