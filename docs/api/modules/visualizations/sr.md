<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

## SR Viewer Module

The SR (Structured Report) Viewer module in Larvitar provides a comprehensive solution for parsing, rendering, and interacting with DICOM Structured Reports. This module enables visualization of complex hierarchical medical data with an intuitive tree-based interface.

For more details on each method and additional options, refer to the specific API documentation sections on SR Detection, Parsing, Rendering, and Interaction.

### Key Features

- **SR Detection:** Automatically identify if a DICOM series is a Structured Report based on metadata.

- **Parsing SR Content:** Extract and structure SR data into a tree format with header information and hierarchical content nodes.

- **Data Extraction:** Get pure structured data for custom rendering workflows (React, Vue, etc.).

- **Interactive Rendering:** Display SR content as an expandable/collapsible tree with search and filtering capabilities.

- **Rich Visualization:** Render various content types including numeric values with units, text, codes, and referenced instances.

- **Granular Styling:** Type-safe, element-by-element style configuration with human-readable properties.

- **Flexible Integration:** Choose between pre-built viewers or custom rendering with data-only extraction.

- **Use Cases:** The SR Viewer module is particularly useful for displaying measurement reports, clinical findings, and any DICOM SR content in a user-friendly format.

### Example: Detecting and Rendering SR Content

To detect if a series is an SR and render its content:
```typescript
if (larvitar.isSR(serie)) {
  const container = document.getElementById("sr-container");
  larvitar.injectSRStyles();
  larvitar.mountSRViewer(serie.metadata, container, { expandDepth: 2 });
}
```

### Example: Get Structured Data for Custom Rendering

Extract SR data without creating DOM elements:
```typescript
const srData = larvitar.getSRData(metadata);

console.log("Patient:", srData.header.patientName);
console.log("Content nodes:", srData.tree.length);
console.log("Total nodes:", srData.metadata.nodeCount);
console.log("Max depth:", srData.metadata.maxDepth);

// Use with your framework (React, Vue, etc.)
return <CustomSRComponent data={srData} />;
```

### Example: Create Viewer Element Without Mounting

Create a viewer element and mount it wherever you need:
```typescript
const viewerElement = larvitar.createSRViewer(metadata, { expandDepth: 3 });
document.getElementById("custom-location").appendChild(viewerElement);
```

### Example: Custom Styling

Customize the appearance with granular control:
```typescript
// Inject custom styles
larvitar.injectSRStyles({
  container: {
    background: "#1a1a2e",
    borderRadius: "16px",
    padding: "2rem"
  },
  title: {
    color: "#00d9ff",
    fontSize: "1.5rem",
    fontWeight: "800"
  },
  button: {
    background: "#2d4059",
    hoverBackground: "#ea5455",
    hoverColor: "#ffffff"
  },
  value: {
    color: "#f07b3f",
    fontWeight: "600"
  },
  label: {
    color: "#ffd460"
  }
});

// Or update existing styles
larvitar.updateSRStyles({
  headerCard: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  }
});
```

### Managing SR Display

You can render just the tree component if you already have the parsed data:
```typescript
const { tree } = larvitar.parseSR(metadata);
const treeElement = larvitar.renderSRTree(tree, { expandDepth: 3 });
document.getElementById("custom-container").appendChild(treeElement);
```

## API Reference

### `isSR`

Check if a DICOM series is a Structured Report

#### Syntax
```typescript
isSR (serie: Series): boolean
```

#### Parameters

| Parameter | Type   | Description             |
| --------- | ------ | ----------------------- |
| `serie`   | Series | The DICOM series object |

#### Returns

`boolean` – True if the series is an SR, false otherwise

---

### `getSRData`

Get structured SR data for custom rendering (no DOM creation)

#### Syntax
```typescript
getSRData (metadata: MetaData): SRViewerData
```

#### Parameters

| Parameter  | Type     | Description                  |
| ---------- | -------- | ---------------------------- |
| `metadata` | MetaData | The DICOM SR metadata object |

#### Returns

`SRViewerData` – Complete structured data:
```typescript
{
  header: SRHeader,           // Patient info, study details, etc.
  tree: SRNode[],             // Hierarchical content nodes
  metadata: {
    isEmpty: boolean,         // True if no content found
    nodeCount: number,        // Total number of nodes in tree
    maxDepth: number          // Maximum tree depth
  }
}
```

#### Use Case

Perfect for integrating with React, Vue, Angular, or any custom rendering logic where you want full control over the UI.

---

### `parseSR`

Parse DICOM SR metadata into a structured header and tree representation

#### Syntax
```typescript
parseSR (metadata: MetaData): SRParseResult
```

#### Parameters

| Parameter  | Type     | Description                  |
| ---------- | -------- | ---------------------------- |
| `metadata` | MetaData | The DICOM SR metadata object |

#### Returns

`SRParseResult` – Object containing header fields and content tree:
```typescript
{
  header: {
    patientName: string,
    studyDescription: string,
    manufacturer: string,
    completionFlag: string,
    verificationFlag: string,
    contentDate: string,
    contentTime: string
  },
  tree: SRNode[]
}
```

---

### `createSRViewer`

Create a complete SR viewer DOM element without mounting it

#### Syntax
```typescript
createSRViewer (
  metadata: MetaData,
  options?: RenderOptions
): HTMLElement
```

#### Parameters

| Parameter  | Type                     | Description                           |
| ---------- | ------------------------ | ------------------------------------- |
| `metadata` | MetaData                 | The DICOM SR metadata                 |
| `options`  | RenderOptions (optional) | Rendering options: `{ expandDepth? }` |

#### Returns

`HTMLElement` – A complete SR viewer element (div with class `sr-viewer`) ready to be appended to any container

#### Use Case

Useful when you need to control where and when the viewer is mounted, or when building dynamic UIs.

---

### `renderSRTree`

Render a complete SR tree as an interactive DOM structure

#### Syntax
```typescript
renderSRTree (
  tree: SRNode[],
  options?: RenderOptions
): HTMLElement
```

#### Parameters

| Parameter | Type                     | Description                           |
| --------- | ------------------------ | ------------------------------------- |
| `tree`    | SRNode[]                 | Array of root SR nodes                |
| `options` | RenderOptions (optional) | Rendering options (expandDepth, etc.) |

#### Returns

`HTMLElement` – The rendered tree as a DOM element (ul element with class `sr-tree`)

---

### `mountSRViewer`

Mount a complete SR viewer UI into a container element

#### Syntax
```typescript
mountSRViewer (
  metadata: MetaData,
  containerEl: HTMLElement,
  options?: RenderOptions
): void
```

#### Parameters

| Parameter     | Type                     | Description                                       |
| ------------- | ------------------------ | ------------------------------------------------- |
| `metadata`    | MetaData                 | The DICOM SR metadata                             |
| `containerEl` | HTMLElement              | The DOM element to mount the viewer into          |
| `options`     | RenderOptions (optional) | Rendering options: `{ expandDepth?: number }`     |

#### Returns

`void` – Mounts a complete SR viewer with header card, toolbar (Expand All, Collapse All, Search), and interactive tree

---

### `injectSRStyles`

Inject CSS styles for the SR viewer into the document head

#### Syntax
```typescript
injectSRStyles (styleConfig?: SRStyleConfig): void
```

#### Parameters

| Parameter     | Type                       | Description                                            |
| ------------- | -------------------------- | ------------------------------------------------------ |
| `styleConfig` | SRStyleConfig (optional)   | Custom style configuration (see SRStyleConfig below)   |

#### Returns

`void` – Injects styles into the document head. Safe to call multiple times. If called again with a config, updates existing styles.

---

### `updateSRStyles`

Update existing SR styles without full re-injection

#### Syntax
```typescript
updateSRStyles (styleConfig: SRStyleConfig): void
```

#### Parameters

| Parameter     | Type          | Description                     |
| ------------- | ------------- | ------------------------------- |
| `styleConfig` | SRStyleConfig | Style configuration to apply    |

#### Returns

`void` – Updates the existing style element or creates one if it doesn't exist

---

### Types

#### `SRNode`

Tree node structure for SR content:
```typescript
{
  label: string,              // Human-readable concept name
  relationshipType: string,   // CONTAINS, HAS PROPERTIES, etc.
  valueType: string,          // CONTAINER, NUM, TEXT, CODE, REF
  value: string,              // Rendered value (for leaf nodes)
  children: SRNode[]          // Child nodes
}
```

#### `SRViewerData`

Complete structured data representation:
```typescript
{
  header: SRHeader,           // Patient and study information
  tree: SRNode[],             // Hierarchical content tree
  metadata: {
    isEmpty: boolean,         // Whether the tree is empty
    nodeCount: number,        // Total number of nodes
    maxDepth: number          // Maximum depth of the tree
  }
}
```

#### `RenderOptions`

Options for rendering SR content:
```typescript
{
  expandDepth?: number  // Number of levels to expand initially (default: 2)
}
```

#### `SRStyleConfig`

Type-safe style configuration for granular control:
```typescript
{
  container?: {
    fontFamily?: string,
    fontSize?: string,
    color?: string,
    background?: string,
    borderRadius?: string,
    padding?: string,
    minHeight?: string
  },
  headerCard?: {
    background?: string,
    border?: string,
    borderRadius?: string,
    padding?: string,
    marginBottom?: string
  },
  title?: {
    color?: string,
    fontSize?: string,
    fontWeight?: string,
    margin?: string,
    letterSpacing?: string
  },
  button?: {
    background?: string,
    border?: string,
    color?: string,
    borderRadius?: string,
    padding?: string,
    fontSize?: string,
    cursor?: string,
    hoverBackground?: string,
    hoverColor?: string
  },
  searchInput?: {
    background?: string,
    border?: string,
    color?: string,
    borderRadius?: string,
    padding?: string,
    fontSize?: string,
    focusBorderColor?: string
  },
  label?: {
    color?: string
  },
  value?: {
    color?: string,
    fontWeight?: string
  },
  descriptor?: {
    color?: string,
    fontWeight?: string,
    fontSize?: string,
    fontStyle?: string
  },
  // ... and many more (see full type definition)
}
```

Each property is optional and has sensible defaults. Only override what you need to customize.


<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
