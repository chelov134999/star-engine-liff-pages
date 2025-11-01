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
        "accountId": "00000000-0000-4000-8000-000000000001",
        "monitorType": "organic",
        "trackingLevel": "full"
      },
      "storeName": "Demo Competitor",
      "lastSeenAt": "2025-11-01T07:50:17.525876+00:00",
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
        "website": "https://demo-bistro.example.com",
        "accountId": "00000000-0000-4000-8000-000000000001",
        "monitorType": "organic"
      },
      "storeName": "Demo Bistro",
      "lastSeenAt": "2025-11-01T08:29:00.187833+00:00",
      "sentimentDelta": 0
    }
  ],
  "meta": {
    "requestId": "a62a4059-3148-43bc-8363-d833dcc71fdb",
    "generatedAt": "2025-11-01T08:28:50.416164+00:00"
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
      "website": "https://demo-bistro.example.com",
      "accountId": "00000000-0000-4000-8000-000000000001",
      "monitorType": "organic"
    },
    "storeName": "Demo Bistro",
    "lastSeenAt": "2025-11-01T08:29:00.187833+00:00",
    "sentimentDelta": 0
  },
  "meta": {
    "requestId": "9b49e602-6050-46e2-a4b0-c83316aeb5b8",
    "generatedAt": "2025-11-01T08:29:00.187833+00:00"
  }
}
```

## `api_v2_competitors_update_status` — 404 PGRST202

```json
{
  "code": "PGRST202",
  "details": "Searched for the function public.api_v2_competitors_update_status with parameters p_lead, p_reason, p_status, p_store_id or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache.",
  "hint": "Perhaps you meant to call the function public.api_v2_competitors_list",
  "message": "Could not find the function public.api_v2_competitors_update_status(p_lead, p_reason, p_status, p_store_id) in the schema cache"
}
```

> **TODO**：待終端 1 建立 `api_v2_competitors_update_status` RPC 後重新驗證；目前前端會顯示「尚未部署」提醒並維持原狀態。
