(function bootstrapStarEngineConfig(global) {
  const runtime = global.__STAR_ENGINE_CONFIG__ || {};
  const existing = global.STAR_ENGINE_CONFIG || {};
  const pickString = (value) => (typeof value === 'string' ? value.trim() : '');

  const apiBase = pickString(runtime.API_BASE).replace(/\/$/, '');
  const checkoutPrimary = pickString(runtime.CHECKOUT_PRIMARY_URL);
  const checkoutSecondary = pickString(runtime.CHECKOUT_SECONDARY_URL);
  const assistantEntry = pickString(runtime.CHATKIT_URL);
  const plansPageUrl = pickString(runtime.PLANS_PAGE_URL) || 'plans.html';
  const serpDetailUrl = pickString(runtime.SERP_DETAIL_URL) || 'report-serp.html';
  const reportUrl = pickString(runtime.REPORT_URL) || 'report.html';
  const formUrl = pickString(runtime.FORM_URL) || 'index.html';

  const resolvedConfig = {
    reportEndpoint: existing.reportEndpoint || (apiBase ? `${apiBase}/report-data` : ''),
    serpEndpoint: existing.serpEndpoint || (apiBase ? `${apiBase}/report-serp` : ''),
    serpReportEndpoint:
      existing.serpReportEndpoint || (apiBase ? `${apiBase}/report-serp` : ''),
    assistantEntryUrl: existing.assistantEntryUrl || assistantEntry,
    checkoutPrimaryUrl: existing.checkoutPrimaryUrl || checkoutPrimary,
    checkoutSecondaryUrl: existing.checkoutSecondaryUrl || checkoutSecondary,
    plansPageUrl: existing.plansPageUrl || plansPageUrl,
    serpDetailUrl: existing.serpDetailUrl || serpDetailUrl,
    detail: existing.detail || reportUrl,
    reportUrl: existing.reportUrl || reportUrl,
    formUrl: existing.formUrl || formUrl,
  };

  global.STAR_ENGINE_CONFIG = { ...resolvedConfig };
})(window);
