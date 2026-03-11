import {
  MetaData,
  RenderOptions,
  Series,
  SRHeader,
  SRNode,
  SRParseResult,
  SRStyleConfig,
  SRViewerData
} from "./types";

/**
 * Check if a DICOM series is a Structured Report (SR)
 * @param {Series} serie - The DICOM series object
 * @return {boolean} - True if the series is an SR
 */
export const isSR = function (serie: Series): boolean {
  if (!serie) return false;
  if (serie.metadata && serie.metadata.x00080060) {
    return serie.metadata.x00080060.toUpperCase() === "SR";
  }
  const firstId = serie.imageIds && serie.imageIds[0];
  if (firstId && serie.instances && serie.instances[firstId]) {
    const m = serie.instances[firstId].metadata;
    return (m && m.x00080060 && m.x00080060.toUpperCase() === "SR") as boolean;
  }
  return false;
};

/**
 * Extract a human-readable label from a DICOM Code Sequence item
 */
const _codeLabel = function (codeSeq: MetaData | MetaData[]): string {
  const item = Array.isArray(codeSeq) ? codeSeq[0] : codeSeq;
  if (!item || typeof item !== "object") return String(codeSeq ?? "");
  const meaning: string = item.x00080104 || "";
  const code: string = item.x00080100 || "";
  const scheme: string = item.x00080102 || "";
  if (meaning) return code ? `${meaning} (${code}, ${scheme})` : meaning;
  return code || "";
};

/**
 * Extract the numeric value and unit from a DICOM content item
 * @param {MetaData} item - The DICOM content item
 * @return {Object|null} - Object with numericValue and unit, or null
 */
const _extractNumericValue = function (
  item: MetaData
): { numericValue: string | number; unit: string } | null {
  // Primary path: Measured Value Sequence
  if (item.x0040a300) {
    const seq = Array.isArray(item.x0040a300)
      ? item.x0040a300
      : [item.x0040a300];
    const mvs = seq[0];
    if (mvs) {
      const numericValue = mvs.x0040a30a ?? "";
      const unitSeq = mvs.x0040a168 || item.x0040a168;
      const unit = unitSeq ? _codeLabel(unitSeq) : "";
      if (numericValue !== "") {
        return { numericValue, unit };
      }
    }
  }
  if (item.x0040a30a !== undefined && item.x0040a30a !== "") {
    const unit = item.x0040a168 ? _codeLabel(item.x0040a168) : "";
    return { numericValue: item.x0040a30a, unit };
  }
  return null;
};

/**
 * Recursively parse a DICOM SR content item into a tree node structure
 * @param {MetaData|MetaData[]} item - The DICOM content item(s)
 * @param {string} inheritedRelType - Inherited relationship type from parent
 * @param {string} inheritedValType - Inherited value type from parent
 * @return {SRNode|SRNode[]|null} - Parsed tree node(s)
 */
const _parseItem = function (
  item: MetaData | MetaData[],
  inheritedRelType?: string,
  inheritedValType?: string
): SRNode | SRNode[] | null {
  if (Array.isArray(item)) {
    return item
      .map(i => _parseItem(i, inheritedRelType, inheritedValType))
      .filter(Boolean)
      .flat() as SRNode[];
  }
  if (!item || typeof item !== "object") return null;

  const relType: string = item.x0040a010 || inheritedRelType || "";
  const valType: string = item.x0040a040 || inheritedValType || "";

  const label: string = item.x0040a043 ? _codeLabel(item.x0040a043) : "";

  let value = "";
  if (valType === "NUM") {
    const numeric = _extractNumericValue(item);
    if (numeric !== null) {
      const { numericValue, unit } = numeric;
      value = unit ? `${numericValue} ${unit}` : String(numericValue);
    }
  } else if (item.x0040a160) {
    value = item.x0040a160;
  } else if (valType !== "NUM" && item.x0040a168) {
    value = _codeLabel(item.x0040a168);
  }

  const children: SRNode[] = [];
  if (item.x0040a730) {
    const sub = _parseItem(item.x0040a730, relType, valType);
    if (Array.isArray(sub)) children.push(...sub);
    else if (sub) children.push(sub);
  }

  if (item.x00081140) {
    const refs: MetaData[] = Array.isArray(item.x00081140)
      ? item.x00081140
      : [item.x00081140];
    refs.forEach(ref => {
      children.push({
        label: "Referenced SOP Instance",
        relationshipType: "REFERENCED",
        valueType: "REF",
        value: ref.x00081155 || "",
        children: []
      });
    });
  }

  return {
    label,
    relationshipType: relType,
    valueType: valType,
    value,
    children
  };
};

/**
 * Parse DICOM SR metadata into a structured header and tree representation
 * @param {MetaData} metadata - The DICOM SR metadata object
 * @return {SRParseResult} - Object containing header fields and content tree
 */
export const parseSR = function (metadata: MetaData): SRParseResult {
  if (!metadata)
    return {
      header: {
        patientName: "",
        studyDescription: "",
        manufacturer: "",
        completionFlag: "",
        verificationFlag: "",
        contentDate: "",
        contentTime: "",
        seriesDescription: ""
      },
      tree: []
    };

  const header: SRHeader = {
    patientName: metadata.x00100010 || "",
    studyDescription: metadata.x00081030 || "",
    manufacturer: metadata.x00080070 || "",
    completionFlag: metadata.x0040a491 || "",
    verificationFlag: metadata.x0040a493 || "",
    contentDate: metadata.x00080023 || "",
    contentTime: metadata.x00080033
      ? String(metadata.x00080033).split(".")[0]
      : "",
    seriesDescription: metadata.x0008103e || ""
  };

  const roots: SRNode[] = [];

  if (metadata.x0040a043) {
    const topLabel = _codeLabel(metadata.x0040a043);
    const contentSeq = metadata.x0040a730 || [];
    const children = _parseItem(contentSeq);
    roots.push({
      label: topLabel,
      relationshipType: metadata.x0040a010 || "",
      valueType: metadata.x0040a040 || "CONTAINER",
      value: "",
      children: Array.isArray(children) ? children : children ? [children] : []
    });
  } else if (metadata.x0040a730) {
    const items = _parseItem(metadata.x0040a730);
    if (Array.isArray(items)) roots.push(...items);
    else if (items) roots.push(items);
  }

  return { header, tree: roots };
};

/**
 * Calculate metadata about the SR tree
 */
const _calculateTreeMetadata = function (tree: SRNode[]): {
  nodeCount: number;
  maxDepth: number;
} {
  let nodeCount = 0;
  let maxDepth = 0;

  const traverse = (nodes: SRNode[], depth: number) => {
    nodeCount += nodes.length;
    maxDepth = Math.max(maxDepth, depth);
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        traverse(node.children, depth + 1);
      }
    });
  };

  traverse(tree, 1);
  return { nodeCount, maxDepth };
};

/**
 * This function returns pure data without creating DOM elements
 *
 * @param {MetaData} metadata - The DICOM SR metadata
 * @return {SRViewerData} - Structured data for custom rendering
 */
export const getSRData = function (metadata: MetaData): SRViewerData {
  const { header, tree } = parseSR(metadata);
  const { nodeCount, maxDepth } = _calculateTreeMetadata(tree);

  return {
    header,
    tree,
    metadata: {
      isEmpty: tree.length === 0,
      nodeCount,
      maxDepth
    }
  };
};

const _REL_DESCRIPTOR: Record<string, string> = {
  "HAS PROPERTIES": "Properties:",
  "HAS ACQ CONTEXT": "Acquisition Context:",
  "HAS CONCEPT MOD": "Concept Modifier:",
  "HAS OBS CONTEXT": "Observation Context:",
  "INFERRED FROM": "Inferred From:",
  CONTAINS: "",
  REFERENCED: "Referenced:"
};

/**
 * Build a DOM element for a single SR tree node with expand/collapse functionality
 */
const _buildNodeEl = function (
  node: SRNode,
  opts: RenderOptions & { depth?: number }
): HTMLElement {
  const { expandDepth = 99, depth = 0 } = opts;

  const li = document.createElement("li");
  li.className = "sr-node";

  const isLeaf = !node.children || node.children.length === 0;
  const isContainer = node.valueType === "CONTAINER";
  const startExpanded = depth < expandDepth;

  const toggle = document.createElement("span");
  if (!isLeaf) {
    toggle.className = "sr-toggle" + (startExpanded ? " sr-open" : "");
    toggle.textContent = startExpanded ? "▾" : "▸";
    toggle.setAttribute("role", "button");
    toggle.setAttribute("tabindex", "0");
  } else {
    toggle.className = "sr-bullet";
    toggle.textContent = "•";
  }
  li.appendChild(toggle);

  const header = document.createElement("span");
  header.className = "sr-node-header" + (isContainer ? " sr-container" : "");

  const icon = document.createElement("span");
  icon.className = "sr-icon";
  icon.textContent = " ";
  header.appendChild(icon);

  if (node.relationshipType && _REL_DESCRIPTOR[node.relationshipType]) {
    const descriptor = _REL_DESCRIPTOR[node.relationshipType];
    if (descriptor) {
      const descEl = document.createElement("span");
      descEl.className = "sr-descriptor";
      descEl.textContent = descriptor + " ";
      header.appendChild(descEl);
    }
  }

  if (node.label) {
    const labelEl = document.createElement("span");
    labelEl.className = "sr-label";
    labelEl.textContent = node.label;
    header.appendChild(labelEl);
  }

  if (node.value) {
    const sep = document.createElement("span");
    sep.className = "sr-sep";
    sep.textContent = " = ";
    const valEl = document.createElement("span");
    valEl.className = "sr-value";
    valEl.textContent = node.value;
    header.appendChild(sep);
    header.appendChild(valEl);
  }

  li.appendChild(header);

  if (!isLeaf) {
    const ul = document.createElement("ul");
    ul.className = "sr-children" + (startExpanded ? "" : " sr-hidden");

    node.children.forEach(child => {
      const childLi = _buildNodeEl(child, { ...opts, depth: depth + 1 });
      ul.appendChild(childLi);
    });
    li.appendChild(ul);

    const doToggle = () => {
      const open = toggle.classList.contains("sr-open");
      toggle.classList.toggle("sr-open", !open);
      toggle.textContent = !open ? "▾" : "▸";
      ul.classList.toggle("sr-hidden", open);
    };
    toggle.addEventListener("click", doToggle);
    toggle.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        doToggle();
      }
    });
    header.addEventListener("click", doToggle);
    (header as HTMLElement).style.cursor = "pointer";
  }

  return li;
};

/**
 * Render a complete SR tree as an interactive DOM structure
 * @param {SRNode[]} tree - Array of root SR nodes
 * @param {RenderOptions} opts - Rendering options (expandDepth, etc.)
 * @return {HTMLElement} - The rendered tree as a DOM element
 */
export const renderSRTree = function (
  tree: SRNode[],
  opts: RenderOptions = {}
): HTMLElement {
  const ul = document.createElement("ul");
  ul.className = "sr-tree";
  (tree || []).forEach(node => {
    ul.appendChild(
      _buildNodeEl(node, { expandDepth: opts.expandDepth ?? 99, depth: 0 })
    );
  });
  return ul;
};

/**
 * @param {MetaData} metadata - The DICOM SR metadata
 * @param {RenderOptions} opts - Rendering options
 * @return {HTMLElement} - The complete SR viewer DOM element
 */
export const createSRViewer = function (
  metadata: MetaData,
  opts: RenderOptions = {}
): HTMLElement {
  const container = document.createElement("div");
  container.className = "sr-viewer";

  const { header, tree } = parseSR(metadata);

  // Header card
  const headerDiv = document.createElement("div");
  headerDiv.className = "sr-header-card";

  const title = document.createElement("h2");
  title.className = "sr-title";
  title.textContent = "SR DICOM Structured Report";
  headerDiv.appendChild(title);

  const HEADER_LABELS: [keyof SRHeader, string][] = [
    ["patientName", "Patient Name"],
    ["studyDescription", "Study Description"],
    ["manufacturer", "Manufacturer"],
    ["completionFlag", "Completion Flag"],
    ["verificationFlag", "Verification Flag"],
    ["contentDate", "Content Date"],
    ["contentTime", "Content Time"],
    ["seriesDescription", "Series Description"]
  ];

  const grid = document.createElement("div");
  grid.className = "sr-header-grid";
  HEADER_LABELS.forEach(([key, label]) => {
    if (!header[key]) return;
    const row = document.createElement("div");
    row.className = "sr-header-row";
    const k = document.createElement("span");
    k.className = "sr-header-key";
    k.textContent = label;
    const v = document.createElement("span");
    v.className = "sr-header-val";
    v.textContent = header[key];
    row.appendChild(k);
    row.appendChild(v);
    grid.appendChild(row);
  });
  headerDiv.appendChild(grid);
  container.appendChild(headerDiv);

  // Toolbar
  const toolbar = document.createElement("div");
  toolbar.className = "sr-toolbar";

  const expandAll = document.createElement("button");
  expandAll.className = "sr-btn";
  expandAll.textContent = "Expand All";

  const collapseAll = document.createElement("button");
  collapseAll.className = "sr-btn";
  collapseAll.textContent = "Collapse All";

  const printBtn = document.createElement("button");
  printBtn.className = "sr-btn";
  printBtn.textContent = "Print";

  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.className = "sr-search";
  searchInput.placeholder = "Filter nodes…";

  toolbar.appendChild(expandAll);
  toolbar.appendChild(collapseAll);
  toolbar.appendChild(printBtn);
  toolbar.appendChild(searchInput);
  container.appendChild(toolbar);

  // Tree
  const treeEl = renderSRTree(tree, opts);
  container.appendChild(treeEl);

  // Empty state
  if (!tree || tree.length === 0) {
    const empty = document.createElement("p");
    empty.className = "sr-empty";
    empty.textContent = "No structured report content found.";
    container.appendChild(empty);
  }

  // Toolbar actions
  expandAll.addEventListener("click", () => {
    treeEl.querySelectorAll(".sr-toggle").forEach(t => {
      t.classList.add("sr-open");
      t.textContent = "▾";
    });
    treeEl.querySelectorAll(".sr-children").forEach(ul => {
      ul.classList.remove("sr-hidden");
    });
  });

  collapseAll.addEventListener("click", () => {
    treeEl.querySelectorAll(".sr-toggle").forEach(t => {
      t.classList.remove("sr-open");
      t.textContent = "▸";
    });
    treeEl.querySelectorAll(".sr-children").forEach(ul => {
      ul.classList.add("sr-hidden");
    });
  });

  printBtn.addEventListener("click", () => {
    const printClone = container.cloneNode(true) as HTMLElement;
    printClone.id = "sr-print-container";
    printClone.classList.add("sr-viewer", "sr-print-view");

    printClone.querySelectorAll(".sr-children").forEach(ul => {
      ul.classList.remove("sr-hidden");
      (ul as HTMLElement).style.display = "block";
    });
    printClone.querySelectorAll(".sr-toggle").forEach(t => {
      t.textContent = "▾";
    });

    document.body.appendChild(printClone);
    document.body.classList.add("sr-is-printing");

    setTimeout(() => {
      window.print();

      document.body.removeChild(printClone);
      document.body.classList.remove("sr-is-printing");
    }, 150);
  });

  // Search / filter
  searchInput.addEventListener("input", () => {
    const q = (searchInput as HTMLInputElement).value.trim().toLowerCase();
    treeEl.querySelectorAll(".sr-node").forEach(node => {
      if (!q) {
        (node as HTMLElement).style.display = "";
        return;
      }
      const text =
        node.querySelector(".sr-label")?.textContent?.toLowerCase() || "";
      const val =
        node.querySelector(".sr-value")?.textContent?.toLowerCase() || "";
      const match = text.includes(q) || val.includes(q);
      (node as HTMLElement).style.display = match ? "" : "none";
      if (match) {
        let p = node.parentElement;
        while (p && !p.classList.contains("sr-tree")) {
          if (p.classList.contains("sr-node"))
            (p as HTMLElement).style.display = "";
          if (p.classList.contains("sr-children"))
            p.classList.remove("sr-hidden");
          p = p.parentElement;
        }
      }
    });
  });

  return container;
};

/**
 * Mount a complete SR viewer UI into a container element
 * @param {MetaData} metadata - The DICOM SR metadata
 * @param {string} containerElementId - The DOM element to mount into
 * @param {RenderOptions} opts - Rendering options
 */
export const mountSRViewer = function (
  metadata: MetaData,
  containerElementId: string,
  opts: RenderOptions = {}
): void {
  const containerEl = document.getElementById(containerElementId);
  if (!containerEl) {
    console.error(
      `Container element with ID '${containerElementId}' not found.`
    );
    return;
  }
  containerEl.innerHTML = "";
  const viewer = createSRViewer(metadata, opts);
  containerEl.appendChild(viewer);
};

/**
 * Default style configuration
 */
const getDefaultStyles = (): SRStyleConfig => ({
  container: {
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    fontSize: "14px",
    color: "#e2e8f0",
    background: "#0f172a",
    borderRadius: "12px",
    padding: "1.5rem",
    minHeight: "200px"
  },
  headerCard: {
    background: "linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%)",
    border: "1px solid #334155",
    borderRadius: "10px",
    padding: "1rem 1.25rem",
    marginBottom: "1rem"
  },
  title: {
    color: "#38bdf8",
    fontSize: "1.15rem",
    fontWeight: "700",
    margin: "0 0 0.75rem",
    letterSpacing: "0.02em"
  },
  headerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "0.35rem 1.5rem"
  },
  headerKey: {
    color: "#94a3b8",
    fontSize: "0.78rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em"
  },
  headerValue: {
    color: "#f1f5f9",
    fontWeight: "500"
  },
  toolbar: {
    display: "flex",
    gap: "0.5rem",
    alignItems: "center",
    marginBottom: "0.75rem"
  },
  button: {
    background: "#1e293b",
    border: "1px solid #334155",
    color: "#94a3b8",
    borderRadius: "6px",
    padding: "0.3rem 0.75rem",
    fontSize: "0.8rem",
    cursor: "pointer",
    hoverBackground: "#334155",
    hoverColor: "#e2e8f0"
  },
  searchInput: {
    background: "#1e293b",
    border: "1px solid #334155",
    color: "#e2e8f0",
    borderRadius: "6px",
    padding: "0.3rem 0.75rem",
    fontSize: "0.82rem",
    focusBorderColor: "#38bdf8"
  },
  tree: {
    listStyle: "none",
    margin: "0",
    padding: "0",
    paddingLeft: "0"
  },
  node: {
    padding: "2px 0",
    borderTop: "1px solid #1e293b"
  },
  nodeHeader: {
    display: "inline-flex",
    gap: "0.35rem",
    padding: "0.25rem 0.5rem",
    borderRadius: "6px",
    hoverBackground: "#1e293b"
  },
  containerLabel: {
    fontWeight: "700",
    color: "#7dd3fc",
    fontSize: "0.95rem"
  },
  toggle: {
    width: "1.1rem",
    height: "1.1rem",
    color: "#38bdf8",
    fontSize: "0.7rem",
    cursor: "pointer",
    borderRadius: "3px",
    hoverBackground: "#1e3a5f"
  },
  bullet: {
    width: "1.1rem",
    height: "1.1rem",
    color: "#64748b",
    fontSize: "0.7rem"
  },
  icon: {
    fontSize: "0.85rem"
  },
  descriptor: {
    color: "#94a3b8",
    fontWeight: "600",
    fontSize: "0.82rem",
    fontStyle: "italic"
  },
  label: {
    color: "#cbd5e1"
  },
  separator: {
    color: "#475569"
  },
  value: {
    color: "#86efac",
    fontWeight: "500"
  },
  empty: {
    color: "#64748b",
    fontStyle: "italic",
    padding: "1rem"
  }
});

/**
 * Generate CSS from style configuration
 */
const _generateCSS = (config: SRStyleConfig): string => {
  const defaults = getDefaultStyles();
  const merged = { ...defaults, ...config };

  const css: string[] = [];

  if (merged.container) {
    const c = merged.container;
    css.push(`.sr-viewer {
  ${c.fontFamily ? `font-family: ${c.fontFamily};` : ""}
  ${c.fontSize ? `font-size: ${c.fontSize};` : ""}
  ${c.color ? `color: ${c.color};` : ""}
  ${c.background ? `background: ${c.background};` : ""}
  ${c.borderRadius ? `border-radius: ${c.borderRadius};` : ""}
  ${c.padding ? `padding: ${c.padding};` : ""}
  ${c.minHeight ? `min-height: ${c.minHeight};` : ""}
  overflow: auto;
}`);
  }

  // Header Card
  if (merged.headerCard) {
    const h = merged.headerCard;
    css.push(`.sr-header-card {
  ${h.background ? `background: ${h.background};` : ""}
  ${h.border ? `border: ${h.border};` : ""}
  ${h.borderRadius ? `border-radius: ${h.borderRadius};` : ""}
  ${h.padding ? `padding: ${h.padding};` : ""}
  ${h.marginBottom ? `margin-bottom: ${h.marginBottom};` : ""}
}`);
  }

  // Title
  if (merged.title) {
    const t = merged.title;
    css.push(`.sr-title {
  ${t.color ? `color: ${t.color};` : ""}
  ${t.fontSize ? `font-size: ${t.fontSize};` : ""}
  ${t.fontWeight ? `font-weight: ${t.fontWeight};` : ""}
  ${t.margin ? `margin: ${t.margin};` : ""}
  ${t.letterSpacing ? `letter-spacing: ${t.letterSpacing};` : ""}
}`);
  }

  // Header Grid
  if (merged.headerGrid) {
    const g = merged.headerGrid;
    css.push(`.sr-header-grid {
  ${g.display ? `display: ${g.display};` : ""}
  ${g.gridTemplateColumns ? `grid-template-columns: ${g.gridTemplateColumns};` : ""}
  ${g.gap ? `gap: ${g.gap};` : ""}
}`);
  }

  css.push(
    `.sr-header-row { display: flex; gap: 0.5rem; align-items: baseline; }`
  );

  // Header Key
  if (merged.headerKey) {
    const k = merged.headerKey;
    css.push(`.sr-header-key {
  ${k.color ? `color: ${k.color};` : ""}
  ${k.fontSize ? `font-size: ${k.fontSize};` : ""}
  ${k.textTransform ? `text-transform: ${k.textTransform};` : ""}
  ${k.letterSpacing ? `letter-spacing: ${k.letterSpacing};` : ""}
  white-space: nowrap;
}`);
  }

  // Header Value
  if (merged.headerValue) {
    const v = merged.headerValue;
    css.push(`.sr-header-val {
  ${v.color ? `color: ${v.color};` : ""}
  ${v.fontWeight ? `font-weight: ${v.fontWeight};` : ""}
}`);
  }

  // Toolbar
  if (merged.toolbar) {
    const t = merged.toolbar;
    css.push(`.sr-toolbar {
  ${t.display ? `display: ${t.display};` : ""}
  ${t.gap ? `gap: ${t.gap};` : ""}
  ${t.alignItems ? `align-items: ${t.alignItems};` : ""}
  ${t.marginBottom ? `margin-bottom: ${t.marginBottom};` : ""}
  flex-wrap: wrap;
}`);
  }

  // Button
  if (merged.button) {
    const b = merged.button;
    css.push(`.sr-btn {
  ${b.background ? `background: ${b.background};` : ""}
  ${b.border ? `border: ${b.border};` : ""}
  ${b.color ? `color: ${b.color};` : ""}
  ${b.borderRadius ? `border-radius: ${b.borderRadius};` : ""}
  ${b.padding ? `padding: ${b.padding};` : ""}
  ${b.fontSize ? `font-size: ${b.fontSize};` : ""}
  ${b.cursor ? `cursor: ${b.cursor};` : ""}
  transition: background 0.15s, color 0.15s;
}`);
    if (b.hoverBackground || b.hoverColor) {
      css.push(`.sr-btn:hover {
  ${b.hoverBackground ? `background: ${b.hoverBackground};` : ""}
  ${b.hoverColor ? `color: ${b.hoverColor};` : ""}
}`);
    }
  }

  // Search Input
  if (merged.searchInput) {
    const s = merged.searchInput;
    css.push(`.sr-search {
  ${s.background ? `background: ${s.background};` : ""}
  ${s.border ? `border: ${s.border};` : ""}
  ${s.color ? `color: ${s.color};` : ""}
  ${s.borderRadius ? `border-radius: ${s.borderRadius};` : ""}
  ${s.padding ? `padding: ${s.padding};` : ""}
  ${s.fontSize ? `font-size: ${s.fontSize};` : ""}
  outline: none;
  flex: 1;
  min-width: 160px;
  transition: border-color 0.15s;
}`);
    if (s.focusBorderColor) {
      css.push(`.sr-search:focus { border-color: ${s.focusBorderColor}; }`);
    }
  }

  // Tree
  if (merged.tree) {
    const t = merged.tree;
    css.push(`.sr-tree, .sr-children {
  ${t.listStyle ? `list-style: ${t.listStyle};` : ""}
  ${t.margin ? `margin: ${t.margin};` : ""}
  padding: 0 0 0 1.4rem;
}`);
    css.push(
      `.sr-tree { ${t.paddingLeft ? `padding-left: ${t.paddingLeft};` : "padding-left: 0;"} }`
    );
  }

  css.push(`.sr-hidden { display: none; }`);

  // Node
  if (merged.node) {
    const n = merged.node;
    css.push(`.sr-node {
  ${n.padding ? `padding: ${n.padding};` : ""}
  position: relative;
}`);
    if (n.borderTop) {
      css.push(`.sr-node + .sr-node { border-top: ${n.borderTop}; }`);
    }
  }

  // Node Header
  if (merged.nodeHeader) {
    const h = merged.nodeHeader;
    css.push(`.sr-node-header {
  ${h.display ? `display: ${h.display};` : ""}
  align-items: center;
  ${h.gap ? `gap: ${h.gap};` : ""}
  ${h.padding ? `padding: ${h.padding};` : ""}
  ${h.borderRadius ? `border-radius: ${h.borderRadius};` : ""}
  transition: background 0.12s;
  max-width: calc(100% - 1.6rem);
  flex-wrap: wrap;
}`);
    if (h.hoverBackground) {
      css.push(`.sr-node-header:hover { background: ${h.hoverBackground}; }`);
    }
  }

  // Container Label
  if (merged.containerLabel) {
    const c = merged.containerLabel;
    css.push(`.sr-container > .sr-label {
  ${c.fontWeight ? `font-weight: ${c.fontWeight};` : ""}
  ${c.color ? `color: ${c.color};` : ""}
  ${c.fontSize ? `font-size: ${c.fontSize};` : ""}
}`);
  }

  // Toggle & Bullet
  const toggleBullet = `display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; transition: color 0.12s;`;

  if (merged.toggle) {
    const t = merged.toggle;
    css.push(`.sr-toggle {
  ${toggleBullet}
  ${t.width ? `width: ${t.width};` : ""}
  ${t.height ? `height: ${t.height};` : ""}
  ${t.color ? `color: ${t.color};` : ""}
  ${t.fontSize ? `font-size: ${t.fontSize};` : ""}
  ${t.cursor ? `cursor: ${t.cursor};` : ""}
  ${t.borderRadius ? `border-radius: ${t.borderRadius};` : ""}
}`);
    if (t.hoverBackground) {
      css.push(`.sr-toggle:hover { background: ${t.hoverBackground}; }`);
    }
  }

  if (merged.bullet) {
    const b = merged.bullet;
    css.push(`.sr-bullet {
  ${toggleBullet}
  ${b.width ? `width: ${b.width};` : ""}
  ${b.height ? `height: ${b.height};` : ""}
  ${b.color ? `color: ${b.color};` : ""}
  ${b.fontSize ? `font-size: ${b.fontSize};` : ""}
  cursor: default;
}`);
  }

  // Icon
  if (merged.icon) {
    css.push(`.sr-icon {
  ${merged.icon.fontSize ? `font-size: ${merged.icon.fontSize};` : ""}
  flex-shrink: 0;
}`);
  }

  // Descriptor
  if (merged.descriptor) {
    const d = merged.descriptor;
    css.push(`.sr-descriptor {
  ${d.color ? `color: ${d.color};` : ""}
  ${d.fontWeight ? `font-weight: ${d.fontWeight};` : ""}
  ${d.fontSize ? `font-size: ${d.fontSize};` : ""}
  ${d.fontStyle ? `font-style: ${d.fontStyle};` : ""}
}`);
  }

  // Label
  if (merged.label) {
    css.push(
      `.sr-label { ${merged.label.color ? `color: ${merged.label.color};` : ""} }`
    );
  }

  // Separator
  if (merged.separator) {
    css.push(
      `.sr-sep { ${merged.separator.color ? `color: ${merged.separator.color};` : ""} }`
    );
  }

  // Value
  if (merged.value) {
    const v = merged.value;
    css.push(`.sr-value {
  ${v.color ? `color: ${v.color};` : ""}
  ${v.fontWeight ? `font-weight: ${v.fontWeight};` : ""}
}`);
  }

  // Empty
  if (merged.empty) {
    const e = merged.empty;
    css.push(`.sr-empty {
  ${e.color ? `color: ${e.color};` : ""}
  ${e.fontStyle ? `font-style: ${e.fontStyle};` : ""}
  ${e.padding ? `padding: ${e.padding};` : ""}
}`);
  }

  css.push(`
/* Hide the print clone while browsing */
@media screen {
  .sr-print-view {
    display: none !important;
  }
}

/* Print logic */
@media print {
  /* HIDE the original application/viewer entirely */
  body.sr-is-printing > *:not(#sr-print-container) {
    display: none !important;
  }

  /* SHOW only our prepared container */
  #sr-print-container {
    display: block !important;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    background: white !important;
    color: black !important;
    padding: 0 !important;
    margin: 0 !important;
  }
  
  /* Hide toolbar completely when printing */
  .sr-toolbar {
    display: none !important;
  }
  
  /* Remove padding/margins from viewer container for full width */
  .sr-viewer {
    padding: 1rem !important;
    margin: 0 !important;
    border-radius: 0 !important;
  }
  
  /* Remove left padding from tree to use full width */
  .sr-tree {
    padding-left: 0 !important;
  }
  
  .sr-children {
    padding-left: 1rem !important;
  }
 
  /* Ensure all nested items are forced visible */
  .sr-children {
    display: block !important;
    visibility: visible !important;
    height: auto !important;
  }
  
  /* REMOVE page breaks - allow natural flow like text */
  .sr-node {
    page-break-inside: auto !important;
    page-break-after: auto !important;
    page-break-before: auto !important;
  }
  
  /* Compress spacing for compact print layout */
  .sr-node {
    padding: 0 !important;
    margin: 0 !important;
    border: none !important;
  }
  
  .sr-node-header {
    padding: 0.1rem 0.25rem !important;
  }
}`);

  return css.join("\n\n");
};

/**
 * Inject CSS styles for the SR viewer into the document head
 * @param {SRStyleConfig} styleConfig - Optional style configuration object
 */
export const injectSRStyles = function (styleConfig?: SRStyleConfig): void {
  if (document.getElementById("sr-utils-styles")) {
    // Update existing styles
    const existingStyle = document.getElementById("sr-utils-styles");
    if (existingStyle && styleConfig) {
      existingStyle.textContent = _generateCSS(styleConfig);
    }
    return;
  }

  const style = document.createElement("style");
  style.id = "sr-utils-styles";
  style.textContent = _generateCSS(styleConfig || {});
  document.head.appendChild(style);
};

/**
 * Update existing SR styles without full re-injection
 * @param {SRStyleConfig} styleConfig - Style configuration to apply
 */
export const updateSRStyles = function (styleConfig: SRStyleConfig): void {
  const existingStyle = document.getElementById("sr-utils-styles");
  if (existingStyle) {
    existingStyle.textContent = _generateCSS(styleConfig);
  } else {
    injectSRStyles(styleConfig);
  }
};
