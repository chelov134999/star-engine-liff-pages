const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function run() {
  const repoRoot = path.resolve(__dirname, '..');
  const releaseTimestamp = '20251012T2359';
  const releaseRoot = path.join(repoRoot, 'releases', releaseTimestamp);
  const htmlPath = path.join(releaseRoot, 'index.html');
  const runtimeConfigPath = path.join(releaseRoot, 'config.runtime.js');
  const configPath = path.join(releaseRoot, 'config.js');
  const analyticsPath = path.join(releaseRoot, 'analytics.js');
  const appScriptPath = path.join(releaseRoot, 'app.js');

  const requiredFiles = [htmlPath, runtimeConfigPath, configPath, analyticsPath, appScriptPath];
  requiredFiles.forEach((filePath) => {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing required file: ${filePath}`);
    }
  });

  const html = fs.readFileSync(htmlPath, 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: `https://chelov134999.github.io/star-engine-liff-pages/releases/${releaseTimestamp}/index.html?lead_id=stage_guard_lead&ts=${releaseTimestamp}`,
  });

  const { window } = dom;
  const analyticsLog = [];

  window.matchMedia = window.matchMedia || function matchMedia() {
    return {
      matches: false,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() { return false; },
    };
  };

  window.fetch = async () => ({
    ok: true,
    text: async () => JSON.stringify({ ok: true }),
    headers: {
      get(header) {
        return header && header.toLowerCase() === 'content-type' ? 'application/json' : null;
      },
    },
  });

  window.liff = {
    init: async () => {},
    ready: Promise.resolve(),
    isLoggedIn: () => true,
    getProfile: async () => ({ userId: 'test-user' }),
  };

  const captureLogEvent = (name, payload) => {
    analyticsLog.push({ name, payload });
  };

  window.logEvent = captureLogEvent;

  [runtimeConfigPath, configPath, analyticsPath].forEach((scriptPath) => {
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');
    window.eval(scriptContent);
  });

  window.logEvent = captureLogEvent;

  const appScriptContent = fs.readFileSync(appScriptPath, 'utf8');
  window.eval(`${appScriptContent}\nwindow.__appState = state;\nwindow.__originalLogEvent = originalLogEvent;\nwindow.__logEventWrapper = logEvent;`);
  window.logEvent = captureLogEvent;

  const stageSnapshots = {
    initial: window.__appState ? window.__appState.stage : '(unknown)',
  };

  // Allow bootstrap timers to settle
  await new Promise((resolve) => setTimeout(resolve, 30));

  if (typeof window.setStage === 'function') {
    window.setStage('s4');
    stageSnapshots.afterSet = window.__appState ? window.__appState.stage : '(unknown)';
  }

  if (typeof window.handleStatusResponse === 'function') {
    window.handleStatusResponse({
      lead_id: 'stage_guard_lead',
      stage: 'partial',
      status: 'partial',
      metrics: [],
    });
    stageSnapshots.afterPayload = window.__appState ? window.__appState.stage : '(unknown)';
  }

  await new Promise((resolve) => setTimeout(resolve, 10));

  const prioritySnapshot =
    typeof window.resolveStagePriority === 'function'
      ? {
          partial: window.resolveStagePriority('partial'),
          s4: window.resolveStagePriority('s4'),
          current: window.__appState ? window.resolveStagePriority(window.__appState.stage) : null,
        }
      : {};

  console.log(JSON.stringify({ logs: analyticsLog, stages: stageSnapshots, priorities: prioritySnapshot }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
