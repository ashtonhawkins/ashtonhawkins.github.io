const vertexSource = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const fragmentSource = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_pulse;
uniform float u_motion;
uniform vec3 u_tint;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 78.233);
  return fract(p.x * p.y);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 st = uv;

  float cursor = distance(gl_FragCoord.xy, u_pointer);
  float warp = smoothstep(150.0, 0.0, cursor) * 0.006;
  st.x += sin(st.y * 60.0 + u_time * 0.25) * warp * u_motion;

  float grain = hash(gl_FragCoord.xy + u_time * 0.25) - 0.5;
  float scan = sin((st.y + u_time * 0.02) * 900.0) * 0.5 + 0.5;
  float band = sin((st.y * 20.0) + (u_time * 0.15)) * 0.5 + 0.5;

  float influence = smoothstep(120.0, 0.0, cursor) * 0.8;
  float intensity = (grain * 0.5 + scan * 0.35 + band * 0.15) * (0.35 + influence + u_pulse);
  float alpha = max(0.0, intensity) * 0.11;

  gl_FragColor = vec4(u_tint, alpha);
}
`;

const readVar = (name: string, fallback: string): [number, number, number] => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  const parsed = value.match(/#([0-9a-f]{6})/i)?.[1];
  if (!parsed) return [0.48, 0.6, 0.72];
  return [
    Number.parseInt(parsed.slice(0, 2), 16) / 255,
    Number.parseInt(parsed.slice(2, 4), 16) / 255,
    Number.parseInt(parsed.slice(4, 6), 16) / 255
  ];
};

export const initNoiseShader = (canvas: HTMLCanvasElement): (() => void) => {
  const gl = (canvas.getContext('webgl2', { alpha: true }) ||
    canvas.getContext('webgl', { alpha: true })) as WebGLRenderingContext | WebGL2RenderingContext | null;
  if (!gl) {
    document.documentElement.classList.add('no-webgl');
    return () => undefined;
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 768px)').matches;
  let raf = 0;

  const compile = (type: number, source: string): WebGLShader => {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };

  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  gl.useProgram(program);

  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const uResolution = gl.getUniformLocation(program, 'u_resolution');
  const uTime = gl.getUniformLocation(program, 'u_time');
  const uPointer = gl.getUniformLocation(program, 'u_pointer');
  const uPulse = gl.getUniformLocation(program, 'u_pulse');
  const uMotion = gl.getUniformLocation(program, 'u_motion');
  const uTint = gl.getUniformLocation(program, 'u_tint');

  const pointer = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
  let pulse = 0;

  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = mobile ? 0.5 : 1;
    canvas.width = Math.floor(window.innerWidth * dpr * scale);
    canvas.height = Math.floor(window.innerHeight * dpr * scale);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const setTint = (): void => {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const tint = isDark ? [123 / 255, 154 / 255, 184 / 255] : readVar('--accent-primary', '#3d6080');
    gl.uniform3f(uTint, tint[0], tint[1], tint[2]);
  };

  const onMove = (event: MouseEvent): void => {
    if (reduced) return;
    pointer.x = event.clientX;
    pointer.y = window.innerHeight - event.clientY;
  };

  const onTilt = (event: DeviceOrientationEvent): void => {
    if (reduced || event.gamma == null || event.beta == null || !mobile) return;
    pointer.x = ((event.gamma + 45) / 90) * window.innerWidth;
    pointer.y = window.innerHeight - ((event.beta + 90) / 180) * window.innerHeight;
  };

  const pulseNow = (): void => {
    pulse = 1.2;
  };

  const draw = (time: number): void => {
    pulse *= 0.9;
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform1f(uTime, time * 0.001);
    gl.uniform2f(uPointer, pointer.x * (mobile ? 0.5 : 1), pointer.y * (mobile ? 0.5 : 1));
    gl.uniform1f(uPulse, pulse);
    gl.uniform1f(uMotion, reduced ? 0 : 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!reduced) raf = window.requestAnimationFrame(draw);
  };

  const observer = new MutationObserver(setTint);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  resize();
  setTint();
  if (reduced) {
    draw(0);
  } else {
    raf = window.requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchstart', pulseNow, { passive: true });
  window.addEventListener('deviceorientation', onTilt);

  return () => {
    window.cancelAnimationFrame(raf);
    observer.disconnect();
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('touchstart', pulseNow);
    window.removeEventListener('deviceorientation', onTilt);
  };
};
