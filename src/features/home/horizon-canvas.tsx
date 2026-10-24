"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { motionAllowed, subscribeMotion, useMotionAllowed } from "@/lib/motion";

/**
 * A single, cheap WebGL pass: the sea horizon that sits behind the home hero.
 *
 * This is the one canvas on the page. It is a fullscreen quad with one fragment
 * shader — no scene graph, no textures, no three.js — because the whole job is
 * "a soft moving horizon in the brand palette". ThreeUI does the same thing for
 * their `EmeraldHorizonBackground`, and the lifecycle rules are the useful part
 * of that pattern:
 *
 *  - the renderer is created lazily, at the element's real size;
 *  - the loop stops when the host leaves the viewport, when the tab is hidden,
 *    when the owner pauses motion or when the OS asks for reduced motion;
 *  - device pixel ratio is clamped, and the backing store has a total pixel
 *    budget so a 6K display does not pay for a background;
 *  - the scroll uniform is read from the host's own rectangle, so the shader
 *    answers to the page without a scroll listener;
 *  - everything is disposed on unmount, and a lost context degrades to the CSS
 *    underlay instead of a black rectangle.
 *
 * If WebGL is unavailable the element still paints a static gradient painted by
 * `.stt-horizon::before`, so the hero never depends on the canvas to look
 * finished.
 */

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_scroll;
uniform vec3 u_deep;
uniform vec3 u_glow;
uniform vec3 u_foam;
uniform float u_alpha;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  float x = uv.x * aspect;
  float t = u_time;

  // The horizon rides slightly higher as the hero scrolls away.
  float horizon = 0.54 + u_scroll * 0.10;
  float line = horizon
    + 0.026 * sin(x * 1.6 + t * 0.22)
    + 0.013 * sin(x * 3.1 - t * 0.35 + 1.7);

  float below = smoothstep(line + 0.004, line - 0.014, uv.y);
  float crest = smoothstep(0.007, 0.0, abs(uv.y - line));
  float depth = clamp((line - uv.y) / max(line, 0.001), 0.0, 1.0);

  vec3 water = mix(u_glow, u_deep, smoothstep(0.0, 0.9, depth));
  float glint = pow(max(0.0, sin(x * 4.2 + t * 0.6) * sin(x * 1.3 - t * 0.4)), 8.0);
  water += u_foam * glint * below * 0.16;

  float air = smoothstep(line + 0.34, line, uv.y) * (1.0 - below);
  vec3 color = water * below + u_glow * air * 0.32;

  float alpha = u_alpha * (below * smoothstep(0.0, 0.05, depth) * 0.92 + crest * 0.5 + air * 0.22);
  alpha *= mix(0.4, 1.0, smoothstep(0.0, 0.16, uv.x) * smoothstep(1.0, 0.84, uv.x));
  alpha *= smoothstep(1.4, 0.4, distance(uv, vec2(0.5, 0.46)));
  alpha = clamp(alpha, 0.0, 1.0);

  gl_FragColor = vec4(color * alpha, alpha);
}
`;

type Vec3 = [number, number, number];

const FALLBACKS: Record<"light" | "dark", { deep: Vec3; glow: Vec3; foam: Vec3 }> = {
  light: { deep: [0.86, 0.76, 0.79], glow: [0.97, 0.89, 0.78], foam: [1, 0.99, 0.98] },
  dark: { deep: [0.05, 0.09, 0.12], glow: [0.78, 0.56, 0.27], foam: [0.94, 0.86, 0.73] },
};

const TOKENS = {
  light: {
    deep: "--color-brand-300",
    glow: "--color-sun-300",
    foam: "--color-surface",
  },
  dark: {
    deep: "--scrim-dark",
    glow: "--color-sun-500",
    foam: "--color-champagne",
  },
} as const;

function readColor(name: string, fallback: Vec3, root: HTMLElement): Vec3 {
  const raw = getComputedStyle(root).getPropertyValue(name).trim();
  if (!raw) return fallback;
  if (raw.startsWith("#")) {
    const hex = raw.slice(1);
    const expand = (value: string) =>
      value.length === 1 ? value + value : value;
    if (hex.length === 3 || hex.length === 4) {
      return [
        parseInt(expand(hex[0]) + expand(hex[0]), 16) / 255,
        parseInt(expand(hex[1]) + expand(hex[1]), 16) / 255,
        parseInt(expand(hex[2]) + expand(hex[2]), 16) / 255,
      ];
    }
    if (hex.length === 6 || hex.length === 8) {
      return [
        parseInt(hex.slice(0, 2), 16) / 255,
        parseInt(hex.slice(2, 4), 16) / 255,
        parseInt(hex.slice(4, 6), 16) / 255,
      ];
    }
    return fallback;
  }
  const match = raw.match(/rgba?\(([^)]+)\)/i);
  if (!match) return fallback;
  const parts = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.some(Number.isNaN)) return fallback;
  return [parts[0] / 255, parts[1] / 255, parts[2] / 255];
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function HorizonCanvas({
  tone = "dark",
  className,
  alpha = 0.55,
}: {
  tone?: "light" | "dark";
  className?: string;
  /** Peak opacity of the water band. The whole layer is decorative. */
  alpha?: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const alphaRef = useRef(alpha);
  const [webgl, setWebgl] = useState<"pending" | "ok" | "fallback">("pending");
  const [paused, setPaused] = useState(false);
  const motionEnabled = useMotionAllowed();

  useEffect(() => {
    alphaRef.current = alpha;
  }, [alpha]);

  useEffect(() => {
    const hostNode = host.current;
    const canvasNode = canvas.current;
    if (!hostNode || !canvasNode) return;

    let disposed = false;
    let frame = 0;
    let running = false;
    let visible = true;
    let elapsed = 0;
    let previous = 0;

    const gl =
      canvasNode.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: true,
        powerPreference: "low-power",
      }) ||
      (canvasNode.getContext("experimental-webgl") as WebGLRenderingContext | null);

    if (!gl) {
      setWebgl("fallback");
      return;
    }

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) {
      setWebgl("fallback");
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setWebgl("fallback");
      return;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    gl.useProgram(program);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);

    const uniforms = {
      resolution: gl.getUniformLocation(program, "u_resolution"),
      time: gl.getUniformLocation(program, "u_time"),
      scroll: gl.getUniformLocation(program, "u_scroll"),
      deep: gl.getUniformLocation(program, "u_deep"),
      glow: gl.getUniformLocation(program, "u_glow"),
      foam: gl.getUniformLocation(program, "u_foam"),
      alpha: gl.getUniformLocation(program, "u_alpha"),
    };

    let colors: { deep: Vec3; glow: Vec3; foam: Vec3 };

    const syncColors = () => {
      const root = document.documentElement;
      const fallback = FALLBACKS[tone];
      const tokens = TOKENS[tone];
      colors = {
        deep: readColor(tokens.deep, fallback.deep, root),
        glow: readColor(tokens.glow, fallback.glow, root),
        foam: readColor(tokens.foam, fallback.foam, root),
      };
      gl.uniform3fv(uniforms.deep, colors.deep);
      gl.uniform3fv(uniforms.glow, colors.glow);
      gl.uniform3fv(uniforms.foam, colors.foam);
    };

    const resize = () => {
      const width = Math.max(hostNode.clientWidth, 1);
      const height = Math.max(hostNode.clientHeight, 1);
      const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
      const budget = 2_400_000;
      const pixels = width * height * ratio * ratio;
      const scale = pixels > budget ? Math.sqrt(budget / pixels) : 1;
      const dpr = Math.max(ratio * scale, 0.75);
      const nextWidth = Math.round(width * dpr);
      const nextHeight = Math.round(height * dpr);
      if (
        canvasNode.width !== nextWidth ||
        canvasNode.height !== nextHeight
      ) {
        canvasNode.width = nextWidth;
        canvasNode.height = nextHeight;
        gl.viewport(0, 0, nextWidth, nextHeight);
        gl.uniform2f(uniforms.resolution, nextWidth, nextHeight);
      }
      syncColors();
      draw();
    };

    const draw = () => {
      const rect = hostNode.getBoundingClientRect();
      const progress =
        rect.height > 0
          ? Math.min(Math.max(-rect.top / rect.height, 0), 1)
          : 0;
      gl.uniform1f(uniforms.time, elapsed);
      gl.uniform1f(uniforms.scroll, progress);
      gl.uniform1f(uniforms.alpha, alphaRef.current);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const step = (now: number) => {
      if (disposed) return;
      if (!running) return;
      const delta = previous ? (now - previous) / 1000 : 1 / 60;
      previous = now;
      elapsed += Math.min(delta, 0.1);
      draw();
      frame = window.requestAnimationFrame(step);
    };

    const start = () => {
      if (disposed || running || !visible || !motionAllowed()) return;
      running = true;
      previous = 0;
      setPaused(false);
      frame = window.requestAnimationFrame(step);
    };

    const stop = () => {
      running = false;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      if (!disposed) setPaused(true);
    };

    const sync = () => {
      const allowed = motionAllowed();
      setPaused(!allowed);
      if (!allowed) {
        stop();
        // Park the scene at a stable frame so pause/reduced motion looks
        // deliberate rather than frozen mid-gesture.
        draw();
        return;
      }
      if (visible) start();
    };

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) stop();
      else if (motionAllowed()) start();
    });
    observer.observe(hostNode);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(hostNode);

    const onContextLost = (event: Event) => {
      event.preventDefault();
      stop();
      setWebgl("fallback");
    };
    const onContextRestored = () => {
      setWebgl("ok");
      resize();
      if (motionAllowed()) start();
    };
    canvasNode.addEventListener("webglcontextlost", onContextLost);
    canvasNode.addEventListener("webglcontextrestored", onContextRestored);

    const themeObserver = new MutationObserver(() => resize());
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const unsubscribe = subscribeMotion(sync);

    setWebgl("ok");
    resize();
    start();

    return () => {
      disposed = true;
      stop();
      observer.disconnect();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      unsubscribe();
      canvasNode.removeEventListener("webglcontextlost", onContextLost);
      canvasNode.removeEventListener("webglcontextrestored", onContextRestored);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [tone]);

  return (
    <div
      ref={host}
      className={cn("stt-horizon", className)}
      data-horizon
      data-tone={tone}
      data-webgl={webgl}
      data-paused={paused || !motionEnabled ? "true" : "false"}
      aria-hidden="true"
    >
      <canvas ref={canvas} />
    </div>
  );
}
