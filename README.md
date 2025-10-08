# 星級引擎 LIFF Pages

獨立部署的星級引擎 LIFF 表單與品牌頁面，包含：

- `index.html`：30 秒初檢四格表單與流程
- `about.html`：品牌介紹
- `sample-report.html`：示例報表預覽

所有靜態檔案可直接透過 GitHub Pages 發佈。

## 發佈流程建議

1. 完成文案或樣式調整後，執行 `node scripts/update_timestamp.js`。
   - 會自動產生新的 `ts=YYYYMMDDTHHMM` 快取參數並覆寫所有頁面、設定檔。
   - 會同步複製最新版檔案到 `releases/20251006T0054/`，避免兩份版本不一致。
   - 若需自訂時間戳，可傳入參數，例如 `node scripts/update_timestamp.js 20251008T0000`。
2. 檢查 `git status` 確認只有預期檔案被修改後，再 `git push origin main`。
3. 等待 GitHub Pages 的 `pages-build-deployment` workflow 成功，即可在 LINE / 瀏覽器看到最新頁面。

> Tip: 可以把 `node scripts/update_timestamp.js` 納入個人流程（例如 pre-push hook 或別名指令），就能避免忘記替換快取參數或同步 release 檔案。
