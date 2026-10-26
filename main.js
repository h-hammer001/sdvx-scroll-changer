
const SdvxViewerUI = {
  init(viewport, targetElement) {
    if (!viewport || !targetElement) return;

    const minScale = 0.4;
    const maxScale = 4.0;
    const STORAGE_KEY_SCALE = 'chuni_viewer_scale';

    let scale = (() => {
      try {
        const saved = parseFloat(localStorage.getItem(STORAGE_KEY_SCALE));
        if (!isNaN(saved)) return Math.min(Math.max(saved, minScale), maxScale);
      } catch (e) {}
      return 1.0;
    })();

    const saveScale = (s) => {
      try {
        localStorage.setItem(STORAGE_KEY_SCALE, s);
      } catch (e) {}
    };

    function updateTransform() {
      targetElement.style.transform = `scale(${scale})`;
      if (typeof window.syncViewerAds === 'function') {
        window.syncViewerAds();
      }
    }

    setTimeout(updateTransform, 50);
    window.addEventListener('resize', updateTransform);

    let initialDist = 0;
    let initialScale = 1.0;
    let initialCenterX = 0;
    let initialCenterY = 0;
    let isIgnoredTouch = false;

    const getDistance = (t1, t2) =>
      Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

    const getCenter = (t1, t2) => ({
      clientX: (t1.clientX + t2.clientX) / 2,
      clientY: (t1.clientY + t2.clientY) / 2
    });

    viewport.addEventListener('touchstart', e => {
      if (e.target.closest('button, .mrr-btn, .viewer-yt-link, a, iframe, .top-btn')) {
        isIgnoredTouch = true;
        return;
      }

      isIgnoredTouch = false;

      if (e.touches.length === 2) {
        initialDist = getDistance(e.touches[0], e.touches[1]);
        initialScale = scale;

        const center = getCenter(e.touches[0], e.touches[1]);
        const rect = viewport.getBoundingClientRect();

        initialCenterX = center.clientX - rect.left;
        initialCenterY = center.clientY - rect.top;
      }
    }, { passive: true });

    viewport.addEventListener('touchmove', e => {
      if (isIgnoredTouch || e.touches.length !== 2 || initialDist <= 0) {
        return;
      }

      const currentDist = getDistance(e.touches[0], e.touches[1]);
      if (currentDist <= 0) return;

      const newScale = Math.min(
        Math.max(initialScale * (currentDist / initialDist), minScale),
        maxScale
      );

      scale = newScale;
      updateTransform();
    }, { passive: true });

    const endTouch = (e) => {
      if (e.touches.length < 2) {
        initialDist = 0;
        saveScale(scale);
      }

      if (e.touches.length === 0) {
        isIgnoredTouch = false;
      }
    };

    viewport.addEventListener('touchend', endTouch);
    viewport.addEventListener('touchcancel', endTouch);
  }
};
