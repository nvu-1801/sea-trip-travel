"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { motionAllowed, subscribeMotion } from "@/lib/motion";

/**
 * Cinematic Coast — the sea.
 *
 * A small, real 3D scene (Three.js, one plane, one shader) that gives the hero
 * a horizon with actual perspective instead of a tinted photograph. The camera
 * moves with the scroll timeline through `progressRef`; this component never
 * sets React state per frame.
 *
 * Lifecycle rules:
 *  - Three.js is imported lazily and only after a WebGL context is proven to
 *    exist, so the homepage's first paint never waits for the renderer.
 *  - The loop stops when the hero leaves the viewport, the tab is hidden, the
 *    OS asks for reduced motion or the owner pauses motion.
 *  - DPR and geometry are capped per device; the backing store has a pixel
 *    budget.
 *  - A CSS sea underlay is painted first and stays if WebGL/import/context
 *    fails, so the hero is never an empty rectangle.
 *  - Everything this component owns (geometry, material, renderer, observers,
 *    listeners, RAF) is disposed on unmount.
 */

const VERTEX = `
uniform float uTime;
varying vec3 vWorld;
varying float vWave;
varying vec3 vNormal;
void main() {
  vec3 p = position;
  float t = uTime;
  float w1 = sin(p.x * 0.40 + t * 0.55 + p.y * 0.05) * 0.26;
  float w2 = sin(p.y * 0.52 - t * 0.42 + p.x * 0.16) * 0.18;
  float w3 = sin((p.x + p.y) * 0.21 + t * 0.31) * 0.11;
  float wave = w1 + w2 + w3;
  // The plane is XY before rotation; local Z becomes world Y.
  p.z += wave;

  // Analytic slope keeps the wave crests lit without a normal texture.
  float c1 = cos(p.x * 0.40 + t * 0.55 + p.y * 0.05);
  float c2 = cos(p.y * 0.52 - t * 0.42 + p.x * 0.16);
  float c3 = cos((p.x + p.y) * 0.21 + t * 0.31);
  float dwdx = 0.40 * 0.26 * c1 + 0.16 * 0.18 * c2 + 0.21 * 0.11 * c3;
  float dwdy = 0.05 * 0.26 * c1 - 0.52 * 0.18 * c2 + 0.21 * 0.11 * c3;
  vNormal = normalize(vec3(-dwdx, 1.0, dwdy));

  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  vWave = wave;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAGMENT = `
precision highp float;
uniform float uTime;
uniform float uScroll;
varying vec3 vWorld;
varying float vWave;
varying vec3 vNormal;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  // 0 near the viewer, 1 at the horizon.
  float depth = clamp((-vWorld.z + 1.0) / 36.0, 0.0, 1.0);

  vec3 deep = vec3(0.014, 0.115, 0.145);
  vec3 mid = vec3(0.031, 0.400, 0.450);
  vec3 shallow = vec3(0.090, 0.620, 0.630);
  vec3 foam = vec3(0.910, 0.975, 0.950);
  vec3 sun = vec3(1.000, 0.780, 0.500);

  vec3 colour = mix(shallow, mid, smoothstep(0.0, 0.42, depth));
  colour = mix(colour, deep, smoothstep(0.42, 1.0, depth));

  // Warm horizon haze: the shore is out there, not a hard plane edge.
  float haze = smoothstep(0.66, 1.0, depth - uScroll * 0.06);
  colour = mix(colour, sun, haze * 0.55);

  // Directional light + one sun path, widening as it reaches the horizon.
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(vec3(0.42, 0.82, -0.38));
  float diffuse = max(dot(normal, lightDir), 0.0);
  colour *= 0.78 + diffuse * 0.34;

  float sunPath = exp(-pow((vWorld.x - 0.55) * 0.85, 2.0)) * smoothstep(0.2, 0.95, depth);
  colour += sun * sunPath * (0.22 + uScroll * 0.08);

  float glint = pow(max(dot(reflect(-lightDir, normal), vec3(0.0, 0.6, -0.8)), 0.0), 26.0);
  colour += sun * glint * 0.55;

  // Foam lives on crests and in a few long streaks; sparse enough to stay calm.
  float crest = smoothstep(0.30, 0.66, vWave);
  float sparkle = hash(floor(vWorld.xz * 24.0) + floor(uTime * 1.6));
  float bands = sin(vWorld.x * 1.6 + vWorld.z * 2.2 + uTime * 0.55)
    * sin(vWorld.z * 1.1 - uTime * 0.35);
  float streaks = smoothstep(0.58, 0.96, bands);
  colour = mix(colour, foam, crest * 0.24 + sparkle * crest * 0.2 + streaks * 0.12);

  // Keep the lower foreground saturated so the copy stays legible.
  colour *= 0.94 + 0.06 * smoothstep(0.0, 0.5, depth);

  gl_FragColor = vec4(colour, 1.0);
}
`;

type SeaState = "starting" | "ready" | "fallback";

function supportsWebGL(): boolean {
  try {
    const probe = document.createElement("canvas");
    return Boolean(
      probe.getContext("webgl2") ||
        probe.getContext("webgl") ||
        probe.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}

export function CinematicSea({
  progressRef,
  className,
}: {
  progressRef: RefObject<number>;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<SeaState>("starting");

  useEffect(() => {
    const hostNode = host.current;
    const canvasNode = canvas.current;
    if (!hostNode || !canvasNode) return;

    let disposed = false;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset.motionPaused === "true" ||
      !supportsWebGL()
    ) {
      // Defer so the effect body does not set state synchronously.
      queueMicrotask(() => {
        if (!disposed) setState("fallback");
      });
      return () => {
        disposed = true;
      };
    }

    let running = false;
    let frame = 0;
    let visible = true;
    let elapsed = 0;
    let previous = 0;
    let renderer: import("three").WebGLRenderer | null = null;
    let geometry: import("three").BufferGeometry | null = null;
    let material: import("three").ShaderMaterial | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let intersection: IntersectionObserver | null = null;
    let unsubscribe: (() => void) | null = null;
    let cameraCleanup: (() => void) | null = null;

    const isMobile = window.matchMedia("(max-width: 767px)").matches;

    const init = async () => {
      let THREE: typeof import("three");
      try {
        THREE = await import("three");
      } catch {
        if (!disposed) setState("fallback");
        return;
      }
      if (disposed) return;

      try {
        renderer = new THREE.WebGLRenderer({
          canvas: canvasNode,
          alpha: true,
          antialias: !isMobile,
          depth: true,
          stencil: false,
          powerPreference: isMobile ? "low-power" : "high-performance",
        });
      } catch {
        setState("fallback");
        return;
      }

      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
      renderer.toneMapping = THREE.NoToneMapping;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
      const baseZ = isMobile ? 5.8 : 5.2;
      camera.position.set(0, isMobile ? 1.85 : 1.65, baseZ);
      camera.lookAt(0, 0.18, -4);

      geometry = new THREE.PlaneGeometry(60, 60, isMobile ? 88 : 148, isMobile ? 64 : 108);
      material = new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uScroll: { value: 0 },
        },
        transparent: false,
        depthWrite: true,
        depthTest: true,
      });
      const sea = new THREE.Mesh(geometry, material);
      sea.rotation.x = -Math.PI / 2;
      sea.position.set(0, -1.15, 0);
      scene.add(sea);

      const resize = () => {
        if (!renderer) return;
        const width = Math.max(hostNode.clientWidth, 1);
        const height = Math.max(hostNode.clientHeight, 1);
        const ratio = Math.min(window.devicePixelRatio || 1, isMobile ? 1.35 : 1.75);
        const budget = 2_300_000;
        const pixels = width * height * ratio * ratio;
        const scale = pixels > budget ? Math.sqrt(budget / pixels) : 1;
        const dpr = Math.max(ratio * scale, 0.75);
        renderer.setPixelRatio(dpr);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };

      const draw = (now?: number) => {
        if (!renderer || !material) return;
        if (now !== undefined) {
          const delta = previous ? (now - previous) / 1000 : 1 / 60;
          previous = now;
          elapsed += Math.min(delta, 0.1);
          material.uniforms.uTime.value = elapsed;
        }
        const progress = Math.min(Math.max(progressRef.current ?? 0, 0), 1);
        material.uniforms.uScroll.value = progress;
        camera.position.z = baseZ - progress * (isMobile ? 1.1 : 2.0);
        camera.position.y = (isMobile ? 1.85 : 1.65) - progress * 0.28;
        camera.lookAt(0, 0.18 + progress * 0.12, -4);
        renderer.render(scene, camera);
      };

      const loop = (now: number) => {
        if (disposed || !running) return;
        draw(now);
        frame = window.requestAnimationFrame(loop);
      };

      const start = () => {
        if (disposed || running || !visible || !motionAllowed()) return;
        running = true;
        hostNode.dataset.seaRunning = "true";
        previous = 0;
        frame = window.requestAnimationFrame(loop);
      };

      const stop = () => {
        running = false;
        hostNode.dataset.seaRunning = "false";
        previous = 0;
        if (frame) window.cancelAnimationFrame(frame);
        frame = 0;
      };

      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(hostNode);

      intersection = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
          if (visible) start();
          else stop();
        },
        { threshold: 0 },
      );
      intersection.observe(hostNode);

      unsubscribe = subscribeMotion(() => {
        if (motionAllowed()) start();
        else {
          stop();
          draw();
        }
      });

      const onVisibility = () => {
        if (document.hidden) stop();
        else start();
      };
      document.addEventListener("visibilitychange", onVisibility);

      const onContextLost = (event: Event) => {
        event.preventDefault();
        stop();
        setState("fallback");
      };
      const onContextRestored = () => {
        setState("ready");
        resize();
        start();
      };
      canvasNode.addEventListener("webglcontextlost", onContextLost);
      canvasNode.addEventListener("webglcontextrestored", onContextRestored);

      cameraCleanup = () => {
        document.removeEventListener("visibilitychange", onVisibility);
        canvasNode.removeEventListener("webglcontextlost", onContextLost);
        canvasNode.removeEventListener("webglcontextrestored", onContextRestored);
      };

      resize();
      draw();
      setState("ready");
      start();
    };

    void init();

    return () => {
      disposed = true;
      stop();
      unsubscribe?.();
      resizeObserver?.disconnect();
      intersection?.disconnect();
      cameraCleanup?.();
      geometry?.dispose();
      material?.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer = null;
    };
  }, [progressRef]);

  return (
    <div
      ref={host}
      className={cn("stt-sea", className)}
      data-sea-scene
      data-sea-state={state}
      aria-hidden="true"
    >
      <span className="stt-sea-sky" aria-hidden="true" />
      <canvas ref={canvas} />
      <span className="stt-sea-fallback" aria-hidden="true" />
      <span className="stt-sea-haze" aria-hidden="true" />
    </div>
  );
}
