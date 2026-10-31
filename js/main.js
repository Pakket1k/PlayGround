/* ============================================================
   Boot + main loop
   ============================================================ */
(function () {
  let last = 0;

  function loop(now) {
    if (!last) last = now;
    let dt = (now - last) / 1000;
    last = now;
    if (dt < 0) dt = 0;
    if (dt > 0.05) dt = 0.05;

    const r = G.runtime;
    if (r.inGame) {
      if (!r.paused && !r.death && !r.ending && !r.menuOpen && !r.dialogueOpen) {
        try {
          ENGINE.update(dt);
        } catch (err) {
          console.error('Engine update error:', err);
        }
      }
      try {
        ENGINE.render();
      } catch (err) {
        console.error('Render error:', err);
      }
    } else {
      try {
        G.tickTitle(now / 1000);
      } catch (err) { /* title canvas not ready */ }
    }
    requestAnimationFrame(loop);
  }

  function boot() {
    G.initUI();
    if (window.UI) UI.init();
    if (window.ENGINE) ENGINE.resize();
    requestAnimationFrame(loop);
  }

  window.addEventListener('error', (e) => {
    console.error('Runtime error:', e.message, e.filename, e.lineno);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
