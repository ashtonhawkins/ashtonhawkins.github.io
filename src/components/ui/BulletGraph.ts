const parseValues = (node: HTMLElement) => {
  const raw = node.getAttribute("data-values");
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

export const mountBullets = (root: ParentNode = document) => {
  root.querySelectorAll<HTMLElement>("[data-bullet]").forEach((node) => {
    if (node.dataset.bulletBound === "true") return;
    const values = parseValues(node);
    node.dataset.bulletBound = "true";
    node.innerHTML = "";
    if (!values.length) return;
    const width = Number(node.dataset.width ?? "132");
    const height = Number(node.dataset.height ?? "20");
    const max = Math.max(...values, 1);
    const scale = width / max;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("width", `${width}`);
    svg.setAttribute("height", `${height}`);
    svg.setAttribute("role", "img");
    const label = node.getAttribute("data-label");
    if (label) {
      svg.setAttribute("aria-label", label);
    } else {
      svg.setAttribute("aria-hidden", node.getAttribute("data-aria-hidden") ?? "true");
    }

    const track = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    track.setAttribute("x", "0");
    track.setAttribute("y", `${height / 2 - 4}`);
    track.setAttribute("width", `${width}`);
    track.setAttribute("height", "8");
    track.setAttribute("rx", "4");
    track.setAttribute("fill", "currentColor");
    track.setAttribute("opacity", "0.12");
    svg.append(track);

    const primary = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    primary.setAttribute("x", "0");
    primary.setAttribute("y", `${height / 2 - 4}`);
    primary.setAttribute("height", "8");
    primary.setAttribute("rx", "4");
    primary.setAttribute("fill", "currentColor");
    primary.setAttribute("width", `${Math.max(0, values[values.length - 1] * scale)}`);
    svg.append(primary);

    if (values.length > 1) {
      const baseline = document.createElementNS("http://www.w3.org/2000/svg", "line");
      baseline.setAttribute("x1", `${values[0] * scale}`);
      baseline.setAttribute("x2", `${values[0] * scale}`);
      baseline.setAttribute("y1", "0");
      baseline.setAttribute("y2", `${height}`);
      baseline.setAttribute("stroke", "currentColor");
      baseline.setAttribute("stroke-width", "2");
      baseline.setAttribute("opacity", "0.6");
      svg.append(baseline);
    }

    node.append(svg);
  });
};

export const bootBullets = () => {
  if (typeof window === "undefined") return;
  requestAnimationFrame(() => mountBullets());
};
