
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

    let posX = 0;
    let posY = 0;

    const saveScale = (s) => {
      try {
        localStorage.setItem(STORAGE_KEY_SCALE, s);
      } catch (e) {}
    };

    function contentSize() {
      const bottom = document.getElementById('bottomAdRow');
      const w = Math.max(
        targetElement.offsetWidth || 0,
        targetElement.scrollWidth || 0,
        bottom ? bottom.offsetWidth : 0
      );
      const h = Math.max(
        targetElement.offsetHeight || 0,
        targetElement.scrollHeight || 0,
        bottom ? bottom.offsetTop + bottom.offsetHeight : 0
      );
      return { w, h };
    }

    function clampPosition(x, y, currentScale) {
      const vpW = viewport.clientWidth;
      const vpH = viewport.clientHeight;
      const size = contentSize();
      const elemW = size.w * currentScale;
      const elemH = size.h * currentScale;

      return {
        x: elemW <= vpW ? 0 : Math.min(Math.max(x, vpW - elemW), 0),
        y: elemH <= vpH ? 0 : Math.min(Math.max(y, vpH - elemH), 0)
      };
    }

    function updateTransform(applyClamp = true) {
      if (applyClamp) {
        const clamped = clampPosition(posX, posY, scale);
        posX = clamped.x;
        posY = clamped.y;
      }

      targetElement.style.transform =
        `translate(${posX}px, ${posY}px) scale(${scale})`;

      if (typeof window.syncViewerAds === 'function') {
        window.syncViewerAds();
      }
    }

    setTimeout(() => updateTransform(true), 50);
    window.addEventListener('resize', () => updateTransform(true));

    let initialDist = 0;
    let initialScale = 1.0;
    let touchStartX = 0;
    let touchStartY = 0;
    let initialPosX = 0;
    let initialPosY = 0;
    let initialCenterVpX = 0;
    let initialCenterVpY = 0;
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

      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        initialPosX = posX;
        initialPosY = posY;
      } else if (e.touches.length === 2) {
        initialDist = getDistance(e.touches[0], e.touches[1]);
        initialScale = scale;
        initialPosX = posX;
        initialPosY = posY;

        const vpRect = viewport.getBoundingClientRect();
        const center = getCenter(e.touches[0], e.touches[1]);

        initialCenterVpX = center.clientX - vpRect.left;
        initialCenterVpY = center.clientY - vpRect.top;
      }
    }, { passive: false });

    viewport.addEventListener('touchmove', e => {
      if (isIgnoredTouch) return;

      if (e.touches.length === 1 && initialDist === 0) {
        if (e.cancelable) e.preventDefault();

        posX = initialPosX + (e.touches[0].clientX - touchStartX);
        posY = initialPosY + (e.touches[0].clientY - touchStartY);

        updateTransform(true);
      } else if (e.touches.length === 2 && initialDist > 0) {
        if (e.cancelable) e.preventDefault();

        const currentDist = getDistance(e.touches[0], e.touches[1]);

        if (currentDist > 0) {
          const newScale = Math.min(
            Math.max(initialScale * (currentDist / initialDist), minScale),
            maxScale
          );

          const factor = newScale / initialScale;
          const vpRect = viewport.getBoundingClientRect();
          const center = getCenter(e.touches[0], e.touches[1]);

          posX = (center.clientX - vpRect.left) -
            (initialCenterVpX - initialPosX) * factor;

          posY = (center.clientY - vpRect.top) -
            (initialCenterVpY - initialPosY) * factor;

          scale = newScale;
          updateTransform(true);
        }
      }
    }, { passive: false });

    const endTouch = (e) => {
      if (isIgnoredTouch) {
        if (e.touches.length === 0) isIgnoredTouch = false;
        return;
      }

      initialDist = 0;

      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        initialPosX = posX;
        initialPosY = posY;
      }

      saveScale(scale);
      updateTransform(true);
    };

    viewport.addEventListener('touchend', endTouch);
    viewport.addEventListener('touchcancel', endTouch);

    let isMouseDown = false;
    let mouseStartX = 0;
    let mouseStartY = 0;

    viewport.addEventListener('mousedown', e => {
      if (e.target.closest('button, .mrr-btn, .viewer-yt-link, a, iframe, .top-btn')) {
        return;
      }

      isMouseDown = true;
      mouseStartX = e.clientX - posX;
      mouseStartY = e.clientY - posY;
      viewport.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', e => {
      if (!isMouseDown) return;

      posX = e.clientX - mouseStartX;
      posY = e.clientY - mouseStartY;

      updateTransform(true);
    });

    window.addEventListener('mouseup', () => {
      if (!isMouseDown) return;

      isMouseDown = false;
      viewport.style.cursor = 'default';
      updateTransform(true);
    });

    viewport.addEventListener('wheel', e => {
      if (!e.ctrlKey) return;

      if (e.cancelable) e.preventDefault();

      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.min(
        Math.max(scale * zoomFactor, minScale),
        maxScale
      );

      const vpRect = viewport.getBoundingClientRect();
      const cursorX = e.clientX - vpRect.left;
      const cursorY = e.clientY - vpRect.top;

      posX = cursorX - (cursorX - posX) * (newScale / scale);
      posY = cursorY - (cursorY - posY) * (newScale / scale);

      scale = newScale;
      saveScale(scale);
      updateTransform(true);
    }, { passive: false });
  }
};
