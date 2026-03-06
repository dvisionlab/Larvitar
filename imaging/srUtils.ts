import {
  MetaData,
  RenderOptions,
  Series,
  SRHeader,
  SRNode,
  SRParseResult
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

  // Concept name
  const label: string = item.x0040a043 ? _codeLabel(item.x0040a043) : "";

  // Value
  let value = "";
  if (valType === "NUM") {
    const numeric = _extractNumericValue(item);
    if (numeric !== null) {
      const { numericValue, unit } = numeric;
      value = unit ? `${numericValue} ${unit}` : String(numericValue);
    }
  } else if (item.x0040a160) {
    value = item.x0040a160; // TEXT
  } else if (valType !== "NUM" && item.x0040a168) {
    value = _codeLabel(item.x0040a168);
  }

  // Children from ContentSequence
  const children: SRNode[] = [];
  if (item.x0040a730) {
    const sub = _parseItem(item.x0040a730, relType, valType);
    if (Array.isArray(sub)) children.push(...sub);
    else if (sub) children.push(sub);
  }

  // Referenced images
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
        contentTime: ""
      },
      tree: []
    };

  // Header fields
  const header: SRHeader = {
    patientName: metadata.x00100010 || "",
    studyDescription: metadata.x00081030 || "",
    manufacturer: metadata.x00080070 || "",
    completionFlag: metadata.x0040a491 || "",
    verificationFlag: metadata.x0040a493 || "",
    contentDate: metadata.x00080023 || "",
    contentTime: metadata.x00080033
      ? String(metadata.x00080033).split(".")[0]
      : ""
  };

  // Main content tree
  const roots: SRNode[] = [];

  // x0040a043 – Concept Name (sometimes top-level, treated as a root)
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

const _REL_BADGE: Record<string, { cls: string; short: string }> = {
  CONTAINS: { cls: "sr-rel-contains", short: "CONTAINS" },
  "HAS CONCEPT MOD": { cls: "sr-rel-mod", short: "MOD" },
  "HAS OBS CONTEXT": { cls: "sr-rel-obs", short: "OBS" },
  "INFERRED FROM": { cls: "sr-rel-inferred", short: "INF" },
  "HAS PROPERTIES": { cls: "sr-rel-prop", short: "PROP" },
  "HAS ACQ CONTEXT": { cls: "sr-rel-acq", short: "ACQ" },
  REFERENCED: { cls: "sr-rel-ref", short: "REF" }
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
  const { expandDepth = 2, depth = 0 } = opts;

  const li = document.createElement("li");
  li.className = "sr-node";

  const isLeaf = !node.children || node.children.length === 0;
  const isContainer = node.valueType === "CONTAINER";
  const startExpanded = depth < expandDepth;

  // Toggle button
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
      _buildNodeEl(node, { expandDepth: opts.expandDepth ?? 2, depth: 0 })
    );
  });
  return ul;
};

/**
 * Mount a complete SR viewer UI into a container element
 * @param {MetaData} metadata - The DICOM SR metadata
 * @param {HTMLElement} containerEl - The DOM element to mount into
 * @param {RenderOptions} opts - Rendering options
 */
export const mountSRViewer = function (
  metadata: MetaData,
  containerEl: HTMLElement,
  opts: RenderOptions = {}
): void {
  containerEl.innerHTML = "";

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
    ["contentTime", "Content Time"]
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
  containerEl.appendChild(headerDiv);

  // Toolbar
  const toolbar = document.createElement("div");
  toolbar.className = "sr-toolbar";

  const expandAll = document.createElement("button");
  expandAll.className = "sr-btn";
  expandAll.textContent = "Expand All";

  const collapseAll = document.createElement("button");
  collapseAll.className = "sr-btn";
  collapseAll.textContent = "Collapse All";

  const searchInput = document.createElement("input");
  searchInput.type = "search";
  searchInput.className = "sr-search";
  searchInput.placeholder = "Filter nodes…";

  toolbar.appendChild(expandAll);
  toolbar.appendChild(collapseAll);
  toolbar.appendChild(searchInput);
  containerEl.appendChild(toolbar);

  // Tree
  const treeEl = renderSRTree(tree, opts);
  containerEl.appendChild(treeEl);

  // Empty state
  if (!tree || tree.length === 0) {
    const empty = document.createElement("p");
    empty.className = "sr-empty";
    empty.textContent = "No structured report content found.";
    containerEl.appendChild(empty);
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
      // Always show ancestor chain when a descendant matches
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
};

/**
 * Inject CSS styles for the SR viewer into the document head
 * @param {string} customStyles - Optional custom CSS to append or override default styles
 */
export const injectSRStyles = function (customStyles?: string): void {
  if (document.getElementById("sr-utils-styles")) return;
  const style = document.createElement("style");
  style.id = "sr-utils-styles";

  const defaultStyles = `
.sr-viewer {
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-size: 14px;
  color: #e2e8f0;
  background: #0f172a;
  border-radius: 12px;
  padding: 1.5rem;
  min-height: 200px;
  overflow: auto;
}

.sr-header-card {
  background: linear-gradient(135deg, #1e3a5f 0%, #1e293b 100%);
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 4rem 1.25rem;
  margin-bottom: 1rem;
}
.sr-title {
  color: #38bdf8;
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
  letter-spacing: 0.02em;
}
.sr-header-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.35rem 1.5rem; }
.sr-header-row  { display: flex; gap: 0.5rem; align-items: baseline; }
.sr-header-key  { color: #94a3b8; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
.sr-header-val  { color: #f1f5f9; font-weight: 500; }

.sr-toolbar { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; }
.sr-btn {
  background: #1e293b; border: 1px solid #334155; color: #94a3b8;
  border-radius: 6px; padding: 0.3rem 0.75rem; font-size: 0.8rem;
  cursor: pointer; transition: background 0.15s, color 0.15s;
}
.sr-btn:hover { background: #334155; color: #e2e8f0; }
.sr-search {
  background: #1e293b; border: 1px solid #334155; color: #e2e8f0;
  border-radius: 6px; padding: 0.3rem 0.75rem; font-size: 0.82rem;
  outline: none; flex: 1; min-width: 160px; transition: border-color 0.15s;
}
.sr-search:focus { border-color: #38bdf8; }

.sr-tree, .sr-children { list-style: none; margin: 0; padding: 0 0 0 1.4rem; }
.sr-tree { padding-left: 0; }
.sr-hidden { display: none; }
.sr-node { padding: 2px 0; position: relative; }
.sr-node + .sr-node { border-top: 1px solid #1e293b; }

.sr-node-header {
  display: inline-flex; align-items: center; gap: 0.35rem;
  padding: 0.25rem 0.5rem; border-radius: 6px;
  transition: background 0.12s;
  max-width: calc(100% - 1.6rem);
  flex-wrap: wrap;
}
.sr-node-header:hover { background: #1e293b; }
.sr-container > .sr-label { font-weight: 700; color: #7dd3fc; font-size: 0.95rem; }

.sr-toggle, .sr-bullet {
  display: inline-flex; align-items: center; justify-content: center;
  width: 1.1rem; height: 1.1rem; color: #64748b;
  font-size: 0.7rem; cursor: default; flex-shrink: 0; border-radius: 3px;
  transition: color 0.12s;
}
.sr-toggle { cursor: pointer; color: #38bdf8; }
.sr-toggle:hover { background: #1e3a5f; }

.sr-icon { font-size: 0.85rem; flex-shrink: 0; }
.sr-descriptor { 
  color: #94a3b8; 
  font-weight: 600; 
  font-size: 0.82rem;
  font-style: italic;
}
.sr-label { color: #cbd5e1; }
.sr-sep   { color: #475569; }
.sr-value { color: #86efac; font-weight: 500; }

.sr-empty { color: #64748b; font-style: italic; padding: 1rem; }

.sr-highlight { background: #854d0e; color: #fef3c7; border-radius: 2px; padding: 0 2px; }
`;

  style.textContent = customStyles
    ? defaultStyles + "\n\n/* Custom Styles */\n" + customStyles
    : defaultStyles;

  document.head.appendChild(style);
};
