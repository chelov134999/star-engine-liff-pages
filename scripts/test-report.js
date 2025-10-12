const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function run() {
  const repoRoot = path.resolve(__dirname, '..');
  const workspaceRoot = path.resolve(repoRoot, '..');
  const releaseTimestamp = '20251012T2359';
  const releaseRoot = path.join(repoRoot, 'releases', releaseTimestamp);
  const reportHtmlPath = path.join(releaseRoot, 'report.html');
  const configRuntimePath = path.join(releaseRoot, 'config.runtime.js');
  const configPath = path.join(releaseRoot, 'config.js');
  const analyticsPath = path.join(releaseRoot, 'analytics.js');
  const reportScriptPath = path.join(releaseRoot, 'report.js');
  const payloadPath = path.join(workspaceRoot, 'tmp', 'analysis_status_se_20251012_122537_38a5.json');

  const [html, runtimeConfig, config, analytics, reportScript, payloadRaw] = [
    reportHtmlPath,
    configRuntimePath,
    configPath,
    analyticsPath,
    reportScriptPath,
    payloadPath,
  ].map((filePath) => {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing required file: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf8');
  });

  const payload = JSON.parse(payloadRaw);
  const leadId = payload.lead_id || payload.report?.lead_id || 'unknown_lead';
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: `https://chelov134999.github.io/star-engine-liff-pages/releases/${releaseTimestamp}/report.html?lead_id=${encodeURIComponent(leadId)}&ts=${releaseTimestamp}`,
  });

  const { window } = dom;
  const captured = {
    fetchCalls: [],
    openedUrls: [],
  };

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

  window.open = (url) => {
    captured.openedUrls.push(url);
    return { closed: false };
  };

  window.fetch = async (url, options = {}) => {
    captured.fetchCalls.push({ url, options });
    if (url.includes('assistant-entry')) {
      const requestBody = options.body ? JSON.parse(options.body) : {};
      const assistantUrl = `https://assistant.example.test/lead/${requestBody.lead_id || 'unknown'}`;
      return {
        ok: true,
        text: async () => JSON.stringify({
          assistant_url: assistantUrl,
          lead_id: requestBody.lead_id,
        }),
      };
    }
    return {
      ok: true,
      text: async () => JSON.stringify(payload),
    };
  };

  window.console = window.console || console;

  window.eval(runtimeConfig);
  window.eval(config);
  window.eval(analytics);
  window.eval(reportScript);

  // wait for loadReport -> fetch -> DOM updates
  await new Promise((resolve) => setTimeout(resolve, 50));

  const document = window.document;
  const queryText = (selector, root = document) => {
    const element = root.querySelector(selector);
    return element ? element.textContent.trim() : '';
  };

  const metricCards = Array.from(document.querySelectorAll('.metric-card')).map((card) => ({
    id: card.getAttribute('data-metric') || '',
    score: queryText('[data-role="score"]', card),
    hint: queryText('[data-role="hint"]', card),
    state: queryText('[data-role="state"]', card),
    source: queryText('[data-role="source"]', card),
  }));

  const guardianQuicklist = Array.from(document.querySelectorAll('#report-guardian-quicklist .crisis-actions__item')).map(
    (item) => item.textContent.trim(),
  );
  const guardianTasks = Array.from(
    document.querySelectorAll('[data-task="guardian"] .task-list li'),
  ).map((item) => item.textContent.trim());
  const collectionTasks = Array.from(
    document.querySelectorAll('[data-task="collection"] .task-list li'),
  ).map((item) => item.textContent.trim());
  const riskReviewTasks = Array.from(
    document.querySelectorAll('[data-task="risk_reviews"] .task-list li'),
  ).map((item) => item.textContent.trim());

  const ctaButton = document.getElementById('report-cta-primary');
  if (ctaButton) {
    ctaButton.click();
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  const results = {
    heroTitle: queryText('#report-title'),
    heroSubtitle: queryText('#report-subtitle'),
    guardianQuicklist,
    guardianTasks,
    collectionTasks,
    riskReviewTasks,
    metricCards,
    ctaNote: queryText('#report-cta-primary-note'),
    openedUrls: captured.openedUrls,
    fetchCalls: captured.fetchCalls.map((entry) => ({
      url: entry.url,
      method: (entry.options && entry.options.method) || 'GET',
    })),
  };

  console.log(JSON.stringify(results, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
