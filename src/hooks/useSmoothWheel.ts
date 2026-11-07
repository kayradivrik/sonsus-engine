import { RefObject, useEffect } from "react";

/**
 * Fare tekerleği (notched wheel) hareketlerini 144Hz / 180Hz ekranlarla uyumlu,
 * fizik tabanlı yumuşak ivmeli (inertial lerp) kaydırmaya dönüştürür.
 * Touchpad (hassas piksel delta) hareketlerine müdahale etmez.
 */
export function useSmoothWheel(containerRef: RefObject<HTMLElement | null>, enabled = true) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;

    let targetScroll = el.scrollTop;
    let currentScroll = el.scrollTop;
    let rafId: number | null = null;
    let lastTime = 0;

    const animate = (now: number) => {
      const dt = lastTime ? Math.min((now - lastTime) / 16.667, 2.5) : 1;
      lastTime = now;

      const diff = targetScroll - currentScroll;
      if (Math.abs(diff) < 0.5) {
        el.scrollTop = targetScroll;
        currentScroll = targetScroll;
        rafId = null;
        lastTime = 0;
        return;
      }

      // Kare hızından bağımsız yumuşatma katsayısı
      const factor = 1 - Math.pow(1 - 0.17, dt);
      currentScroll += diff * factor;
      el.scrollTop = currentScroll;
      rafId = requestAnimationFrame(animate);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        return;
      }

      // Touchpad küçük piksel adımları gönderir; yalnızca fare tekerleğini yumuşat
      const isMouseWheel = e.deltaMode === 1 || Math.abs(e.deltaY) >= 48;
      if (!isMouseWheel) {
        targetScroll = el.scrollTop;
        currentScroll = el.scrollTop;
        return;
      }

      e.preventDefault();
      if (rafId === null) {
        targetScroll = el.scrollTop;
        currentScroll = el.scrollTop;
      }

      const rawDelta = e.deltaMode === 1 ? e.deltaY * 36 : e.deltaY;
      const maxScroll = el.scrollHeight - el.clientHeight;
      targetScroll = Math.max(0, Math.min(maxScroll, targetScroll + rawDelta * 1.15));

      if (rafId === null) {
        rafId = requestAnimationFrame(animate);
      }
    };

    const onScroll = () => {
      // Kullanıcı kaydırma çubuğunu elle sürüklerse hedefleri senkronla
      if (rafId === null) {
        targetScroll = el.scrollTop;
        currentScroll = el.scrollTop;
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scroll", onScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [containerRef, enabled]);
}

