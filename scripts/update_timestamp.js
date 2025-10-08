#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const releaseDir = path.join(root, 'releases', '20251006T0054');

const rawInput = process.argv[2];
const nowIso = new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
const defaultTs = nowIso.replace(/[-:]/g, '');
const timestamp = rawInput || defaultTs;

if (!/^20\d{6}T\d{4}$/.test(timestamp)) {
  console.error(`[update_timestamp] 無效的格式：${timestamp}，應為 YYYYMMDDTHHMM`);
  process.exit(1);
}

const filesToUpdate = [
  'config.js',
  'config.runtime.js',
  'index.html',
  'about.html',
  'plans.html',
  'report.html',
  'sample-report.html',
  path.join('releases', '20251006T0054', 'config.js'),
  path.join('releases', '20251006T0054', 'config.runtime.js'),
  path.join('releases', '20251006T0054', 'index.html'),
  path.join('releases', '20251006T0054', 'about.html'),
  path.join('releases', '20251006T0054', 'plans.html'),
  path.join('releases', '20251006T0054', 'report.html'),
  path.join('releases', '20251006T0054', 'sample-report.html'),
];

const copyPairs = [
  ['index.html', path.join('releases', '20251006T0054', 'index.html')],
  ['about.html', path.join('releases', '20251006T0054', 'about.html')],
  ['plans.html', path.join('releases', '20251006T0054', 'plans.html')],
  ['sample-report.html', path.join('releases', '20251006T0054', 'sample-report.html')],
  ['report.html', path.join('releases', '20251006T0054', 'report.html')],
  ['config.js', path.join('releases', '20251006T0054', 'config.js')],
  ['config.runtime.js', path.join('releases', '20251006T0054', 'config.runtime.js')],
  ['report.js', path.join('releases', '20251006T0054', 'report.js')],
  ['report-utils.js', path.join('releases', '20251006T0054', 'report-utils.js')],
  ['styles.css', path.join('releases', '20251006T0054', 'styles.css')],
];

const pattern = /ts=20\d{6}T\d{4}/g;
let updatedCount = 0;

filesToUpdate.forEach((relativePath) => {
  const targetPath = path.join(root, relativePath);
  if (!fs.existsSync(targetPath)) {
    console.warn(`[update_timestamp] 找不到檔案：${relativePath}`);
    return;
  }

  const original = fs.readFileSync(targetPath, 'utf8');
  const replaced = original.replace(pattern, `ts=${timestamp}`);
  if (replaced !== original) {
    fs.writeFileSync(targetPath, replaced);
    updatedCount += 1;
  }
});

copyPairs.forEach(([source, dest]) => {
  const srcPath = path.join(root, source);
  const destPath = path.join(root, dest);
  if (!fs.existsSync(srcPath)) {
    console.warn(`[update_timestamp] 找不到來源檔案：${source}`);
    return;
  }
  const destDir = path.dirname(destPath);
  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(srcPath, destPath);
});

console.log(`[update_timestamp] 已設定 ts=${timestamp}，更新 ${updatedCount} 份檔案並同步 release 目錄。`);
