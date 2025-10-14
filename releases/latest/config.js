(function loadStarEngineConfig() {
  const runtime = window.__STAR_ENGINE_CONFIG__ || {};
  const defaults = {
    formLiffId: '2008215846-5LwXlWVN',
    reportLiffId: '2008215846-5LwXlWVN',
    liffId: '2008215846-5LwXlWVN',
    webhookUrl: 'https://mycologic-arielle-warriorlike.ngrok-free.dev/webhook/lead-entry',
    quizUrl: 'https://mycologic-arielle-warriorlike.ngrok-free.dev/webhook/lead-entry',
    analysisStatusUrl: 'https://mycologic-arielle-warriorlike.ngrok-free.dev/webhook/analysis-status',
    weeklyDraftUrl: 'https://chelov134999.app.n8n.cloud/webhook/weekly-draft',
    reportEndpoint: 'https://mycologic-arielle-warriorlike.ngrok-free.dev/webhook/report-data',
    serpEndpoint: 'https://mycologic-arielle-warriorlike.ngrok-free.dev/webhook/report-data',
    formUrl: 'https://chelov134999.github.io/star-engine-liff-pages/releases/latest/index.html?ts=20251014T2130',
    reportUrl: 'https://mycologic-arielle-warriorlike.ngrok-free.dev/report.html',
    serpReportUrl: 'https://mycologic-arielle-warriorlike.ngrok-free.dev/report-serp.html',
    trialUrl: 'https://line.me/ti/p/@star-up',
    aboutUrl: 'https://chelov134999.github.io/star-engine-liff-pages/releases/latest/about.html?ts=20251014T2130',
    sampleReportUrl: 'https://chelov134999.github.io/star-engine-liff-pages/releases/latest/sample-report.html?ts=20251014T2130',
    plansPageUrl: 'https://chelov134999.github.io/star-engine-liff-pages/releases/latest/plans.html?ts=20251014T2130',
    assistantLabel: '生成正式入場券',
    assistantEntryUrl: 'https://chelov134999.app.n8n.cloud/webhook/assistant-entry',
  };

  const coalesce = (key) => (runtime[key] ?? defaults[key] ?? '');

  const config = {
    formLiffId: coalesce('formLiffId') || coalesce('liffId'),
    reportLiffId: coalesce('reportLiffId') || coalesce('liffId'),
    liffId: coalesce('liffId'),
    webhookUrl: coalesce('webhookUrl'),
    quizUrl: coalesce('quizUrl') || coalesce('quiz_url') || coalesce('webhookUrl'),
    analysisStatusUrl: coalesce('analysisStatusUrl') || coalesce('analysis_status_url'),
    weeklyDraftUrl: coalesce('weeklyDraftUrl') || coalesce('weekly_draft_url'),
    reportEndpoint: coalesce('reportEndpoint'),
    reportUrl: coalesce('reportUrl'),
    formUrl: coalesce('formUrl') || coalesce('form_url'),
    aboutUrl: coalesce('aboutUrl') || coalesce('about_url'),
    trialUrl: coalesce('trialUrl'),
    googlePlacesApiKey: coalesce('googlePlacesApiKey'),
    scraperApiKey: coalesce('scraperApiKey'),
    sampleReportUrl: coalesce('sampleReportUrl'),
    plansPageUrl: coalesce('plansPageUrl') || coalesce('planPageUrl'),
    serpDetailUrl: coalesce('serpDetailUrl') || coalesce('serpReportUrl') || coalesce('reportSerpUrl'),
    serpReportUrl: coalesce('serpReportUrl') || coalesce('reportSerpUrl'),
    serpEndpoint: coalesce('serpEndpoint'),
    checkoutPrimaryUrl: coalesce('checkoutPrimaryUrl'),
    checkoutSecondaryUrl: coalesce('checkoutSecondaryUrl'),
    assistantLabel: coalesce('assistantLabel') || 'AI 守護專家',
    assistantEntryUrl: coalesce('assistantEntryUrl') || coalesce('assistant_entry_url'),
  };

  const missing = Object.entries({
    webhookUrl: config.webhookUrl,
    reportEndpoint: config.reportEndpoint,
    analysisStatusUrl: config.analysisStatusUrl,
  })
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length) {
    console.warn('[star-engine] 以下設定缺失，部分功能將無法使用：', missing.join(', '));
  }

  window.STAR_ENGINE_CONFIG = Object.freeze(config);
})();
