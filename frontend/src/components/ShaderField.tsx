import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';

type Props = {
  /** Three colours as hex: deep base, mid tone, highlight. */
  colors: [string, string, string];
  className?: string;
  /** 0–1: how strongly the field bends toward the pointer. */
  pointerStrength?: number;
};

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

// Domain-warped fbm (after Inigo Quilez) with contour banding and film grain.
const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uPointer; uniform float uPointerStrength;
uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2;

float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i+vec2(1,0)), c = hash(i+vec2(0,1)), d = hash(i+vec2(1,1));
  vec2 u = f*f*(3.0-2.0*f);
  return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
}
float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(1.6,1.2,-1.2,1.6); for(int i=0;i<5;i++){ v += a*noise(p); p = m*p; a *= 0.5; } return v; }

void main(){
  vec2 uv = gl_FragCoord.xy / uRes.xy;
  vec2 p = (gl_FragCoord.xy - 0.5*uRes.xy) / min(uRes.x, uRes.y);
  vec2 m = (uPointer - 0.5) * vec2(uRes.x/min(uRes.x,uRes.y), uRes.y/min(uRes.x,uRes.y));
  float d = length(p - m);
  p += (p - m) * uPointerStrength * 0.35 * exp(-d*2.2);

  float t = uTime * 0.045;
  vec2 q = vec2(fbm(p*1.4 + vec2(0.0, t)), fbm(p*1.4 + vec2(5.2, -t)));
  vec2 r = vec2(fbm(p*1.6 + 3.0*q + vec2(1.7, 9.2) + t*1.3), fbm(p*1.6 + 3.0*q + vec2(8.3, 2.8) - t));
  float f = fbm(p*1.2 + 3.5*r);

  // fbm clusters around 0.5, so remap it: a dark body, a lit mid band, and sparse
  // lantern glows only in the brightest pockets of the warped field.
  vec3 col = mix(uC0, uC1, smoothstep(0.28, 0.62, f));
  float glow = pow(smoothstep(0.5, 0.78, f + 0.18*length(r - 0.5)), 1.6);
  col = mix(col, uC2, glow * 0.9);
  col += uC2 * 0.12 * smoothstep(0.5, 1.0, length(q));
  // Thin topographic contour lines, like a map of an alien world.
  float bands = abs(fract(f*10.0) - 0.5);
  col += mix(uC1*1.8, uC2, glow) * smoothstep(0.04, 0.0, bands) * 0.35;
  // Vignette + grain.
  col *= 1.0 - 0.55*pow(length(uv-0.5)*1.25, 2.2);
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.06;
  gl_FragColor = vec4(col, 1.0);
}`;

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/**
 * Full-bleed animated WebGL field. Renders at reduced resolution for performance, pauses when
 * off-screen or the tab is hidden, and freezes on a single frame under prefers-reduced-motion.
 */
export const ShaderField = ({ colors, className, pointerStrength = 1 }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    if (!canvas || !gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (import.meta.env.DEV && !gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(prog, name);
    gl.uniform3fv(u('uC0'), hexToRgb(colors[0]));
    gl.uniform3fv(u('uC1'), hexToRgb(colors[1]));
    gl.uniform3fv(u('uC2'), hexToRgb(colors[2]));
    gl.uniform1f(u('uPointerStrength'), pointerStrength);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SCALE = 0.5; // render at half resolution; the grain hides it

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * SCALE));
      canvas.height = Math.max(1, Math.floor(height * SCALE));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u('uRes'), canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Pointer follows with spring-like easing so the field never snaps.
    const target = { x: 0.5, y: 0.5 };
    const pointer = { x: 0.5, y: 0.5 };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      target.x = (e.clientX - r.left) / r.width;
      target.y = 1 - (e.clientY - r.top) / r.height;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
    });
    io.observe(canvas);

    let raf = 0;
    const start = performance.now() - 20_000; // start mid-flow, not at the plain t=0 frame
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      pointer.x += (target.x - pointer.x) * 0.045;
      pointer.y += (target.y - pointer.y) * 0.045;
      gl.uniform2f(u('uPointer'), pointer.x, pointer.y);
      gl.uniform1f(u('uTime'), (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    if (reduced) {
      gl.uniform2f(u('uPointer'), 0.5, 0.5);
      gl.uniform1f(u('uTime'), 40);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      // Free GL objects but keep the context: getContext() returns the same one on remount
      // (e.g. StrictMode), and a deliberately lost context would render nothing.
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [colors, pointerStrength]);

  return <canvas ref={canvasRef} aria-hidden className={cn('block h-full w-full', className)} />;
};
