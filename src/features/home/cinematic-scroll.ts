"use client";

/**
 * Cinematic Coast — the first scroll transition.
 *
 * GSAP + ScrollTrigger owns the one pinned moment on the home page: the camera
 * pushes toward the shore while the destination frame opens from a portrait
 * photograph to the full viewport. The scene reads the same progress value, so
 * there is one scroll source and no second RAF loop for the page itself.
 *
 * The helpers are imported on demand: the hero's HTML is complete before GSAP
 * arrives, and a failed import simply leaves the static composition in place.
 */

type CinematicHandles = {
  root: HTMLElement;
  windowEl: HTMLElement;
  copyEl: HTMLElement | null;
  shadeEl: HTMLElement | null;
  cueEl: HTMLElement | null;
  progress: { current: number };
};

export async function initCinematicScroll(
  handles: CinematicHandles,
): Promise<() => void> {
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([
    import("gsap"),
    import("gsap/ScrollTrigger"),
  ]);
  gsap.registerPlugin(ScrollTrigger);

  const { root, windowEl, copyEl, shadeEl, cueEl, progress } = handles;
  const mm = gsap.matchMedia();

  mm.add(
    "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
    () => {
      const state = { p: 0 };
      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: () => `+=${Math.round(window.innerHeight * 0.82)}`,
          pin: true,
          // `.home-editorial` owns a clip-path; fixed pinning would resolve
          // against that ancestor instead of the viewport.
          pinType: "transform",
          scrub: 0.65,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      timeline.fromTo(
        windowEl,
        { clipPath: "inset(7% 5% 13% 40% round 30px)", scale: 0.985 },
        { clipPath: "inset(0% 0% 0% 0% round 0px)", scale: 1 },
        0,
      );
      if (copyEl) {
        timeline.to(copyEl, { y: -34, opacity: 0.92 }, 0);
      }
      if (shadeEl) {
        timeline.to(shadeEl, { opacity: 0.82 }, 0);
      }
      if (cueEl) {
        timeline.to(cueEl, { opacity: 0, y: 10 }, 0.04);
      }
      timeline.to(
        state,
        {
          p: 1,
          onUpdate: () => {
            progress.current = state.p;
          },
        },
        0,
      );

      return () => {
        progress.current = 0;
      };
    },
  );

  mm.add(
    "(max-width: 1023px) and (prefers-reduced-motion: no-preference)",
    () => {
      const state = { p: 0.1 };
      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "bottom top",
          scrub: 0.5,
          invalidateOnRefresh: true,
        },
      });
      // Phones get a shorter, smaller camera move and no pin.
      if (copyEl) timeline.to(copyEl, { y: -18 }, 0);
      timeline.to(windowEl, { scale: 1.015 }, 0);
      if (cueEl) timeline.to(cueEl, { opacity: 0.35 }, 0);
      timeline.to(
        state,
        {
          p: 0.62,
          onUpdate: () => {
            progress.current = state.p;
          },
        },
        0,
      );

      return () => {
        progress.current = 0.1;
      };
    },
  );

  mm.add("(prefers-reduced-motion: reduce)", () => {
    // No pin and no scrub: the frame is already the finished composition.
    progress.current = 0.22;
    return () => {
      progress.current = 0;
    };
  });

  // Pinning inserts a spacer above the fold. Some browsers keep a tiny scroll
  // offset from that reflow (12px in Chrome), which makes the transparent home
  // header switch to its solid state on a fresh load. Only correct while the
  // visitor has not touched the page and this is not a back/forward restore.
  const navigation = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  const pristineLoad = !location.hash && navigation?.type !== "back_forward";
  let disposed = false;
  let settleRaf = 0;
  let userMoved = false;
  const markMoved = () => {
    userMoved = true;
  };
  const intentEvents = [
    "wheel",
    "touchstart",
    "pointerdown",
    "keydown",
  ] as const;
  intentEvents.forEach((event) =>
    window.addEventListener(event, markMoved, { passive: true }),
  );
  const settleAtTop = () => {
    if (disposed) return;
    if (
      pristineLoad &&
      !userMoved &&
      window.scrollY > 0 &&
      window.scrollY < 40
    )
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  };
  const refreshAndSettle = () => {
    if (disposed) return;
    ScrollTrigger.refresh();
    // ScrollTrigger's pin can keep a 0.001px translate at the very top; clear
    // it so the hero truly starts at y=0 (and the header stays transparent).
    if (window.scrollY === 0) gsap.set(root, { y: 0 });
    settleAtTop();
    settleRaf = window.requestAnimationFrame(settleAtTop);
  };
  const raf = window.requestAnimationFrame(refreshAndSettle);
  const later = window.setTimeout(refreshAndSettle, 600);
  const onLoad = () => refreshAndSettle();
  window.addEventListener("load", onLoad, { once: true });
  void document.fonts?.ready.then(refreshAndSettle).catch(() => {});

  return () => {
    disposed = true;
    window.cancelAnimationFrame(raf);
    window.cancelAnimationFrame(settleRaf);
    window.clearTimeout(later);
    window.removeEventListener("load", onLoad);
    intentEvents.forEach((event) =>
      window.removeEventListener(event, markMoved),
    );
    mm.revert();
    progress.current = 0;
  };
}
