<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

## SR Viewer Module

The SR (Structured Report) Viewer module in Larvitar provides a comprehensive solution for parsing, rendering, and interacting with DICOM Structured Reports. This module enables visualization of complex hierarchical medical data with an intuitive tree-based interface.

For more details on each method and additional options, refer to the specific API documentation sections on SR Detection, Parsing, Rendering, and Interaction.

### Key Features

- **SR Detection:** Automatically identify if a DICOM series is a Structured Report based on metadata.

- **Parsing SR Content:** Extract and structure SR data into a tree format with header information and hierarchical content nodes.

- **Interactive Rendering:** Display SR content as an expandable/collapsible tree with search and filtering capabilities.

- **Rich Visualization:** Render various content types including numeric values with units, text, codes, and referenced instances.

- **Customizable Styling:** Built-in modern dark theme with customizable CSS for seamless integration.

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

You can also parse SR data separately for custom rendering:
```typescript
const { header, tree } = larvitar.parseSR(metadata);
console.log("Patient:", header.patientName);
console.log("Content nodes:", tree.length);
```

### Managing SR Display

You can render just the tree component if you already have the parsed data:
```typescript
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

| Parameter | Type                 | Description                  |
| --------- | -------------------- | ---------------------------- |
| `serie`   | Series | The DICOM series object      |

#### Returns

`boolean` – True if the series is an SR, false otherwise

---

### `parseSR`

Parse DICOM SR metadata into a structured header and tree representation

#### Syntax
```typescript
parseSR (metadata: MetaData): SRParseResult
```

#### Parameters

| Parameter  | Type                 | Description                  |
| ---------- | -------------------- | ---------------------------- |
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

| Parameter | Type                        | Description                            |
| --------- | --------------------------- | -------------------------------------- |
| `tree`    | SRNode[]                    | Array of root SR nodes                 |
| `options` | RenderOptions (optional)    | Rendering options (expandDepth, etc.)  |

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

| Parameter     | Type                 | Description                                          |
| ------------- | -------------------- | ---------------------------------------------------- |
| `metadata`    | MetaData | The DICOM SR metadata                                |
| `containerEl` | HTMLElement          | The DOM element to mount the viewer into             |
| `options`     | RenderOptions (optional) | Rendering options: `{ expandDepth?: number }`    |

#### Returns

`void` – Mounts a complete SR viewer with header card, toolbar (Expand All, Collapse All, Search), and interactive tree

---

### `injectSRStyles`

Inject CSS styles for the SR viewer into the document head

#### Syntax
```typescript
injectSRStyles (): void
```

#### Parameters

None

#### Returns

`void` – Injects styles into the document head. Safe to call multiple times (checks for existing styles)

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

#### `RenderOptions`

Options for rendering SR content:
```typescript
{
  expandDepth?: number  // Number of levels to expand initially (default: 2)
}
```

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>