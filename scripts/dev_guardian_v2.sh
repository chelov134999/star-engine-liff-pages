#!/usr/bin/env bash
set -euo pipefail

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[guardian-v2] 請先安裝 pnpm (https://pnpm.io/)" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APPS=("apps/v2-reports" "apps/v2-competitors" "apps/v2-admin")

echo "[guardian-v2] 檢查 .env.local ..."
if [ ! -f "$ROOT_DIR/.env.local" ]; then
  echo "[guardian-v2] 未找到 .env.local，請複製 .env.example_v2 並填入 Supabase/LIFF 設定。" >&2
fi

echo "[guardian-v2] 使用 pnpm 並行啟動三個子專案 (需額外開啟三個終端或使用 tmux/iterm 分窗)"
for app in "${APPS[@]}"; do
  if [ ! -d "$ROOT_DIR/$app" ]; then
    echo "[guardian-v2] 找不到 $app 目錄" >&2
    exit 1
  fi
  (cd "$ROOT_DIR/$app" && pnpm install)
done

echo "[guardian-v2] 建議在各自終端執行："
for app in "${APPS[@]}"; do
  echo "  cd $ROOT_DIR/$app && pnpm dev"
done

echo "[guardian-v2] 若使用 pnpm workspace，可執行："
echo "  pnpm --filter guardian-v2-reports --filter guardian-v2-competitors --filter guardian-v2-admin dev"
echo "[guardian-v2] 亦可單獨啟動，例如："
echo "  pnpm --filter guardian-v2-reports dev"
echo "完成後可透過 http://localhost:5173/ 等 Vite 預設 port 驗證介面。"
