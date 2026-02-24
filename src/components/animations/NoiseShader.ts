const VERT = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_boost;
uniform float u_motion;
uniform vec3 u_tint;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

void main() {
  vec2 uv = v_uv;
  float t = u_time * 0.08 * u_motion;
  float scan = sin((uv.y + t) * u_resolution.y * 0.03) * 0.5 + 0.5;
  float grain = noise(uv * vec2(u_resolution.x / 4.0, u_resolution.y / 4.0) + t * 8.0);

  vec2 pointerUv = u_pointer / u_resolution;
  float dist = distance(uv, pointerUv);
  float hotspot = smoothstep(0.22, 0.0, dist) * u_boost;

  float strength = 0.08 + scan * 0.05 + grain * 0.16 + hotspot * 0.22;
  vec3 color = u_tint * strength;
  gl_FragColor = vec4(color, clamp(strength, 0.0, 0.09));
}
`;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const initNoiseShader = (canvas: HTMLCanvasElement): void => {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false });
  if (!gl) {
    document.documentElement.classList.add('no-webgl');
    return;
  }

  const compile = (type: number, source: string): WebGLShader => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('Shader init failed');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };

  const program = gl.createProgram();
  if (!program) return;
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  gl.useProgram(program);

  const pos = gl.getAttribLocation(program, 'a_position');
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(program, 'u_resolution');
  const uTime = gl.getUniformLocation(program, 'u_time');
  const uPointer = gl.getUniformLocation(program, 'u_pointer');
  const uBoost = gl.getUniformLocation(program, 'u_boost');
  const uMotion = gl.getUniformLocation(program, 'u_motion');
  const uTint = gl.getUniformLocation(program, 'u_tint');

  const pointer = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5, boost: 0 };
  const mobile = window.matchMedia('(max-width: 640px)').matches;

  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = mobile ? 0.5 : 1;
    canvas.width = Math.floor(window.innerWidth * dpr * scale);
    canvas.height = Math.floor(window.innerHeight * dpr * scale);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const updateTint = (): void => {
    const theme = document.documentElement.getAttribute('data-theme');
    const tint = theme === 'light' ? [61 / 255, 96 / 255, 128 / 255] : [123 / 255, 154 / 255, 184 / 255];
    gl.uniform3f(uTint, tint[0], tint[1], tint[2]);
  };

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', (event) => {
    if (reducedMotion()) return;
    pointer.x = event.clientX;
    pointer.y = window.innerHeight - event.clientY;
    pointer.boost = 1;
  });
  window.addEventListener('touchstart', () => {
    pointer.boost = 1.4;
  });

  window.addEventListener('deviceorientation', (event) => {
    if (reducedMotion() || event.beta == null || event.gamma == null) return;
    pointer.x = ((event.gamma + 45) / 90) * window.innerWidth;
    pointer.y = ((event.beta + 90) / 180) * window.innerHeight;
  });

  const observer = new MutationObserver(updateTint);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  resize();
  updateTint();

  const staticFrame = reducedMotion();
  let raf = 0;
  const draw = (time: number): void => {
    pointer.boost *= 0.93;
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, time * 0.001);
    gl.uniform2f(uPointer, pointer.x * (mobile ? 0.5 : 1), pointer.y * (mobile ? 0.5 : 1));
    gl.uniform1f(uBoost, Math.min(pointer.boost, 1.5));
    gl.uniform1f(uMotion, staticFrame ? 0 : 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!staticFrame) raf = window.requestAnimationFrame(draw);
  };

  raf = window.requestAnimationFrame(draw);

  window.addEventListener('beforeunload', () => {
    window.cancelAnimationFrame(raf);
    observer.disconnect();
  });
};
