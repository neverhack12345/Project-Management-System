/**
 * Vault link graph — force-directed layout with D3 (replaces Mermaid flowchart for /api/vault/graph).
 */
import * as d3 from "https://esm.sh/d3@7.9.0";

let gradUid = 0;

function truncateLabel(s, max) {
  const t = String(s || "");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * @param {HTMLElement} container
 * @param {{ nodes?: Array<{ id: string, title?: string }>, edges?: Array<{ from: string, to: string, ok?: boolean }> }} graph
 * @param {{ onNodeClick?: (id: string) => void }} [options]
 * @returns {{ destroy: () => void }}
 */
export function renderVaultLinkGraph(container, graph, options = {}) {
  const { onNodeClick } = options;
  const { nodes: rawNodes = [], edges: rawEdges = [] } = graph || {};
  const nodeById = new Map(rawNodes.map((n) => [n.id, n]));

  const links = rawEdges
    .filter((e) => e.ok && nodeById.has(e.from) && nodeById.has(e.to))
    .map((e) => ({ source: e.from, target: e.to }));

  const simNodes = rawNodes.map((n) => ({
    id: n.id,
    title: n.title || n.id
  }));

  container.innerHTML = "";

  const gradId = `vault-node-grad-${++gradUid}`;
  let width = Math.max(320, container.clientWidth || 640);
  let height = Math.max(280, container.clientHeight || 420);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("class", "vault-d3-graph-svg")
    .attr("width", "100%")
    .attr("height", "100%")
    .attr("viewBox", [0, 0, width, height])
    .attr("role", "img")
    .attr("aria-label", "Vault note link graph");

  const defs = svg.append("defs");
  const lg = defs
    .append("linearGradient")
    .attr("id", gradId)
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "100%");
  lg.append("stop").attr("offset", "0%").attr("stop-color", "#8b5cf6");
  lg.append("stop").attr("offset", "100%").attr("stop-color", "#22d3ee");

  const gZoom = svg.append("g").attr("class", "vault-d3-graph-zoom-layer");

  const zoom = d3
    .zoom()
    .scaleExtent([0.15, 5])
    .on("zoom", (event) => {
      gZoom.attr("transform", event.transform);
    });

  svg.call(zoom);

  const simulation = d3
    .forceSimulation(simNodes)
    .force(
      "link",
      d3
        .forceLink(links)
        .id((d) => d.id)
        .distance(72)
        .strength(0.35)
    )
    .force("charge", d3.forceManyBody().strength(-260))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide().radius(40));

  const linkSel = gZoom
    .append("g")
    .attr("class", "vault-d3-graph-links")
    .attr("stroke", "rgba(145, 170, 235, 0.55)")
    .attr("stroke-width", 1.25)
    .selectAll("line")
    .data(links)
    .join("line");

  const nodeSel = gZoom
    .append("g")
    .attr("class", "vault-d3-graph-nodes")
    .selectAll("g")
    .data(simNodes)
    .join("g")
    .style("cursor", onNodeClick ? "pointer" : "default")
    .call(
      d3
        .drag()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.35).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );

  nodeSel
    .append("circle")
    .attr("r", 20)
    .attr("fill", `url(#${gradId})`)
    .attr("stroke", "rgba(206, 189, 255, 0.45)")
    .attr("stroke-width", 1.2);

  nodeSel
    .append("text")
    .attr("dy", 32)
    .attr("text-anchor", "middle")
    .attr("fill", "#dee5ff")
    .attr("font-size", 10)
    .attr("font-family", "Inter, Segoe UI, system-ui, sans-serif")
    .style("pointer-events", "none")
    .text((d) => truncateLabel(d.title, 20));

  if (onNodeClick) {
    nodeSel.on("click", (event, d) => {
      event.stopPropagation();
      onNodeClick(d.id);
    });
  }

  simulation.on("tick", () => {
    linkSel
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    nodeSel.attr("transform", (d) => `translate(${d.x},${d.y})`);
  });

  const ro =
    typeof ResizeObserver !== "undefined"
      ? new ResizeObserver((entries) => {
          const cr = entries[0]?.contentRect;
          if (!cr || cr.width < 80 || cr.height < 80) return;
          width = cr.width;
          height = cr.height;
          svg.attr("viewBox", [0, 0, width, height]);
          simulation.force("center", d3.forceCenter(width / 2, height / 2));
          simulation.alpha(0.35).restart();
        })
      : null;
  if (ro) ro.observe(container);

  let stopped = false;
  function destroy() {
    if (stopped) return;
    stopped = true;
    ro?.disconnect();
    simulation.stop();
    svg.on(".zoom", null);
    nodeSel.on("click", null);
  }

  return { destroy };
}
