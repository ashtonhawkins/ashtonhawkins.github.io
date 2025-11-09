const parsePoints = (node: HTMLElement) => {
  const raw = node.getAttribute("data-points");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((value) => Number(value)).filter((value) => Number.isFinite(value));
    }
  } catch (error) {
    return [];
  }
  return [];
};

const buildPath = (values: number[], width: number, height: number) => {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / Math.max(values.length - 1, 1);
  return values
    .map((value, index) => {
      const x = index * step;
      const normalized = (value - min) / range;
      const y = height - normalized * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
};

export const mountSparklines = (root: ParentNode = document) => {
  root.querySelectorAll<HTMLElement>("[data-sparkline]").forEach((node) => {
    if (node.dataset.sparklineBound === "true") return;
    const points = parsePoints(node);
    node.dataset.sparklineBound = "true";
    node.innerHTML = "";
    if (!points.length) return;
    const width = Number(node.dataset.width ?? "120");
    const height = Number(node.dataset.height ?? "32");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", `${width}`);
    svg.setAttribute("height", `${height}`);
    svg.setAttribute("fill", "none");
    svg.setAttribute("role", "img");
    const label = node.getAttribute("data-label");
    if (label) {
      svg.setAttribute("aria-label", label);
      svg.setAttribute("aria-hidden", "false");
    } else {
      svg.setAttribute("aria-hidden", node.getAttribute("data-aria-hidden") ?? "true");
    }

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const commands = buildPath(points, width, height);
    path.setAttribute("d", commands);
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");

    const area = document.createElementNS("http://www.w3.org/2000/svg", "path");
    if (commands) {
      const lastPoint = commands.split(" ").pop() ?? "";
      const [lastX] = lastPoint.replace(/[ML]/g, "").split(",");
      area.setAttribute("d", `${commands} L${lastX ?? width},${height} L0,${height} Z`);
      area.setAttribute("fill", "currentColor");
      area.setAttribute("opacity", "0.08");
      svg.append(area);
    }

    svg.append(path);
    node.append(svg);
  });
};

export const bootSparklines = () => {
  if (typeof window === "undefined") return;
  requestAnimationFrame(() => mountSparklines());
};
