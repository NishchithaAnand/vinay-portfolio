import * as React from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The wall the work hangs on, drawn in a shader: limewash plaster that drifts very slowly, ceiling spots pooling
 * light along the rail, and a soft warm light that follows the visitor's pointer. Colours come from the design
 * tokens (--wall, --foreground), so it changes with the theme like the rest of the room.
 */

const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uPointer;
uniform float uPointerOn;
uniform vec3 uWall;
uniform vec3 uInk;
uniform float uDark;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float t = uTime * 0.012;

  // Limewash: broad cloudy mottling, crossed by the long horizontal sweeps of a brush.
  float mottle = fbm(p * 1.8 + vec2(t, -t * 0.7));
  float sweep = fbm(vec2(p.x * 1.4, p.y * 9.0) + mottle * 1.6);
  float plaster = mottle * 0.65 + sweep * 0.35;
  vec3 shade = mix(uWall, uInk, mix(0.07, 0.16, uDark));
  vec3 col = mix(shade, uWall, smoothstep(0.2, 0.8, plaster));

  // Ceiling spots: pools of warm light that wash down the upper wall and breathe a little.
  vec3 warm = mix(vec3(1.0, 0.92, 0.78), vec3(1.0, 0.8, 0.55), uDark);
  float pools = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 c = vec2(aspect * (0.14 + 0.24 * fi) + sin(uTime * 0.05 + fi * 1.3) * 0.04, 1.05);
    vec2 d = (p - c) * vec2(1.25, 0.62);
    pools += exp(-dot(d, d) * 5.0) * (0.8 + 0.2 * sin(uTime * 0.25 + fi * 2.1));
  }

  // The visitor's light.
  vec2 m = vec2(uPointer.x * aspect, uPointer.y);
  vec2 dm = p - m;
  float spot = exp(-dot(dm, dm) * 7.0) * uPointerOn;

  col += warm * (pools * mix(0.035, 0.11, uDark) + spot * mix(0.045, 0.085, uDark));
  col = mix(col, col * warm, pools * mix(0.04, 0.2, uDark));

  // Corners fall off as they would in a real room.
  float vignette = smoothstep(1.35, 0.25, length((uv - vec2(0.5, 0.58)) * vec2(aspect * 0.75, 1.1)));
  col *= mix(mix(0.93, 0.62, uDark), 1.0, vignette);

  // Film-fine grain so gradients never band.
  col += (hash(uv * uRes + fract(uTime * 0.37) * 91.0) - 0.5) * mix(0.018, 0.026, uDark);

  gl_FragColor = vec4(col, 1.0);
}
`;

/** Resolve any CSS colour (oklch included) to sRGB 0–1 by letting a 1×1 canvas paint it. */
function cssColor(value: string, fallback: [number, number, number]): THREE.Vector3 {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx || !value) throw new Error("no context");
    ctx.fillStyle = `rgb(${fallback.map((c) => c * 255).join(",")})`;
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;
    return new THREE.Vector3(r / 255, g / 255, b / 255);
  } catch {
    return new THREE.Vector3(...fallback);
  }
}

function readPalette() {
  const style = getComputedStyle(document.documentElement);
  const dark = document.documentElement.classList.contains("dark");
  return {
    wall: cssColor(style.getPropertyValue("--wall").trim(), dark ? [0.13, 0.12, 0.11] : [0.95, 0.93, 0.89]),
    ink: cssColor(style.getPropertyValue("--foreground").trim(), dark ? [0.92, 0.9, 0.86] : [0.17, 0.15, 0.13]),
    dark: dark ? 1 : 0,
  };
}

function Wall({ reduced }: { reduced: boolean }) {
  const { size, gl } = useThree();
  const pointer = React.useRef({ x: 0.5, y: 0.62, on: 0, target: { x: 0.5, y: 0.62, on: 0 } });
  const uniforms = React.useMemo(() => {
    const palette = readPalette();
    return {
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2(0.5, 0.62) },
      uPointerOn: { value: 0 },
      uWall: { value: palette.wall },
      uInk: { value: palette.ink },
      uDark: { value: palette.dark },
    };
  }, []);

  React.useEffect(() => {
    uniforms.uRes.value.set(size.width * gl.getPixelRatio(), size.height * gl.getPixelRatio());
  }, [size, gl, uniforms]);

  // Follow the theme: the provider toggles .dark on <html>.
  React.useEffect(() => {
    const apply = () => {
      const palette = readPalette();
      uniforms.uWall.value.copy(palette.wall);
      uniforms.uInk.value.copy(palette.ink);
      uniforms.uDark.value = palette.dark;
    };
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [uniforms]);

  React.useEffect(() => {
    const canvas = gl.domElement;
    const move = (event: PointerEvent) => {
      const box = canvas.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const target = pointer.current.target;
      target.x = (event.clientX - box.left) / box.width;
      target.y = 1 - (event.clientY - box.top) / box.height;
      target.on = event.pointerType === "mouse" ? 1 : 0.6;
    };
    const leave = () => { pointer.current.target.on = 0; };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [gl]);

  useFrame((state, delta) => {
    const p = pointer.current;
    // Light lags the hand a little, the way a lamp on a slow arm would.
    const k = 1 - Math.exp(-delta * 3.2);
    p.x += (p.target.x - p.x) * k;
    p.y += (p.target.y - p.y) * k;
    p.on += (p.target.on - p.on) * (1 - Math.exp(-delta * 1.6));
    uniforms.uPointer.value.set(p.x, p.y);
    uniforms.uPointerOn.value = p.on;
    uniforms.uTime.value = reduced ? 0 : state.clock.elapsedTime;
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} depthWrite={false} depthTest={false} />
    </mesh>
  );
}

export function GalleryWall({ className }: { className?: string }) {
  const host = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(true);
  const [reduced, setReduced] = React.useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // Stop drawing once the hero scrolls away.
  React.useEffect(() => {
    const node = host.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? true));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={host} aria-hidden="true" className={className}>
      <Canvas
        flat
        linear
        // The wall is soft by design, so 1× is plenty; at 1.5× a retina screen paid over twice the pixels for nothing.
        dpr={1}
        frameloop={visible ? "always" : "never"}
        gl={{ antialias: false, alpha: false, powerPreference: "low-power" }}
        orthographic
        camera={{ position: [0, 0, 1] }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Wall reduced={reduced} />
      </Canvas>
    </div>
  );
}
