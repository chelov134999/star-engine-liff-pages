/* layout-guards.js — Apple-level mobile experience guards */

/* ---------- S7：Header 收合、CTA Dock 預留與鍵盤互斥 ---------- */
(function s7LayoutGuards() {
  const hdr = document.querySelector('.header');
  const dock = document.querySelector('.cta-dock');
  const page = document.querySelector('.page');

  if (dock && page) {
    const setDockPadding = () => {
      document.documentElement.style.setProperty('--dock-h', `${dock.offsetHeight}px`);
    };
    window.addEventListener('resize', setDockPadding, { passive: true });
    setDockPadding();
  }

  /* 捲動收合 Header（下捲縮，上捲張） */
  if (hdr) {
    let lastY = 0;
    window.addEventListener(
      'scroll',
      () => {
        const y = window.scrollY || document.documentElement.scrollTop;
        if (y > 24 && y > lastY) hdr.classList.add('header--compact');
        else if (y < 12) hdr.classList.remove('header--compact');
        lastY = y;
      },
      { passive: true },
    );
  }

  /* iOS 鍵盤：同步隱藏 Dock，避免擋輸入區域 */
  const vv = window.visualViewport;
  if (vv && dock) {
    const onVV = () => {
      const shrink = vv.height < window.innerHeight - 80;
      dock.style.transform = shrink ? 'translateY(110%)' : 'translateY(0)';
    };
    vv.addEventListener('resize', onVV);
    vv.addEventListener('scroll', onVV);
    onVV();
  }
})();

/* ---------- S4：表格邊緣漸層提示 + 估損欄曝光事件 ---------- */
(function s4TableGuards() {
  const wrap = document.getElementById('s4-table');
  if (!wrap) return;

  const left = wrap.querySelector('.table-edge--left');
  const right = wrap.querySelector('.table-edge--right');

  const updateEdges = () => {
    const el = wrap;
    const table = el.querySelector('table');
    if (!table) {
      if (left) left.style.opacity = 0;
      if (right) right.style.opacity = 0;
      return;
    }

    const max = el.scrollWidth - el.clientWidth;
    if (left) left.style.opacity = el.scrollLeft <= 2 ? 0 : 1;
    if (right) right.style.opacity = el.scrollLeft >= max - 2 ? 0 : 1;
  };

  wrap.addEventListener('scroll', updateEdges, { passive: true });
  window.addEventListener('resize', updateEdges, { passive: true });
  updateEdges();

  /* 估損欄位曝光率，上報做 A/B 追蹤 */
  const lossCells = wrap.querySelectorAll('.loss, .metric-card__loss');
  if (!lossCells.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          try {
            fetch('/analytics', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ev: 's4_loss_viewed', ts: Date.now() }),
            });
          } catch (error) {
            // 忽略分析上報失敗
          }
          io.unobserve(entry.target);
        }
      });
    },
    { root: wrap, threshold: 0.6 },
  );

  lossCells.forEach((cell) => io.observe(cell));
})();
