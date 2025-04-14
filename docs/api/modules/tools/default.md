<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

## Introduction: default Tools

In `default.ts` the list of Larvitar default tools is exported as `DEFAULT_TOOLS`, along with their default configuration, that extendes the cornerstoneTools configuration with these properties:

- **Name:** String representing the tool's name.
- **Viewports:** Specifies the viewports targeted by the tool (`"all"` or an array of specific viewports).
- **Configuration:** Configuration options defined as an object.
- **Options:** Additional options defined as an object.
- **Class:** The corresponding Cornerstone tool library class (e.g., `"LengthTool"` for the length measurement tool).
- **Sync:** Synchronization behavior for the tool.
- **Cleanable:** if true, this tool will be removed when calling `"no tools"`,
- **DefaultActive:** if true, this tool will be activated when calling `addDefaultTools`,
- **Shortcut:** keyboard shortcut [not implemented],
- **Type:** tool category inside Larvitar (one of: `"utils", "annotation", "segmentation", "overlay"`),
- **Description:** a string that describes the tool (eg to be shown in a tooltip)

These tools are either cornerstone-customized tools or fully custom tools (e.g., `watershedSegmentationTool`) and can be added to the viewport through `addDefaultTools`.

### Example: Tool Definition

```typescript
Zoom: {
    name: "Zoom",
    viewports: "all",
    configuration: {
      invert: false,
      preventZoomOutsideImage: false,
      minScale: 0.01,
      maxScale: 25.0
    },
    options: {
      mouseButtonMask: 2,
      supportedInteractionTypes: ["Mouse", "Touch"],
      defaultStrategy: "default" // can be 'default', 'translate' or 'zoomToCenter'
    },
    cleanable: false,
    class: "ZoomTool",
    defaultActive: true,
    description: "Zoom image at mouse position",
    shortcut: "ctrl-z",
    type: "utils"
  }
```

### Example: Default Tools Activation

```typescript
store.addViewport("viewer");
initializeCSTools();
addDefaultTools("viewer");
setToolActive("Wwwc"); //explicitly set the active tool. If not, default active is StackScroll
```

## Introduction: custom Tools

User can add custom tools calling `registerExternalTool`. The tool will be registered in the dvTools object and in `DEFAULT_TOOLS` array. If done **before** adding the tools with `addDefaultTools`, the tool will be added automatically along with the default ones. Otherwise, the user can simply add its tool using `addTool`.

### Example: Custom Tools Registration

```typescript
initializeCSTools();
store.addViewport("viewer");
registerExternalTool("customTool");
addTool("customTool"); //or directly use addDefaultTools();
setToolActive("customTool");
```

## API Reference

### `getDefaultToolsByType`

Gets available tools by type, which is useful for populating menus.

#### Syntax

```typescript
getDefaultToolsByType(type: NonNullable<ToolConfig["type"]>): ToolConfig[]
```

#### Parameters

| Parameter | Type                            | Description                                                   |
| --------- | ------------------------------- | ------------------------------------------------------------- |
| `type`    | NonNullable<ToolConfig["type"]> | The type of tool to filter and return from the list of tools. |

#### Returns

`ToolConfig[]` – An array of tool configurations that match the specified type.

### `setDefaultToolsProps`

Overrides the default properties of tools.

#### Syntax

```typescript
setDefaultToolsProps(newProps: Partial<ToolConfig>[]): void
```

#### Parameters

| Parameter  | Type                    | Description                                                                                                                               |
| ---------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `newProps` | Partial<ToolConfig [] > | An array of objects representing the properties to be overridden for the default tools. The "name" property is mandatory for each object. |

#### Returns

`void` – The function does not return a value. It directly modifies the DEFAULT_TOOLS object with the new properties.

### `registerExternalTool`

Overrides the default properties of tools.
NOTE:

- if toolName is already existent in `DEFAULT_TOOLS`, it will ovverride the tool
- toolClass must be a valid cornerstone tool

#### Syntax

```typescript
registerExternalTool(toolName: string, toolClass: any): void
```

#### Parameters

| Parameter   | Type   | Description          |
| ----------- | ------ | -------------------- |
| `toolName`  | string | The name of the tool |
| `toolClass` | string | The tool class       |

#### Returns

`void` – The function does not return a value. It directly modifies the DEFAULT_TOOLS and dvTools objects with the new tool.

```typescript
dvTools[toolClass.name] = toolClass;
DEFAULT_TOOLS[toolName] = {
  name: toolName,
  class: toolClass.name,
  viewports: "all",
  configuration: {},
  options: { mouseButtonMask: 1 },
  defaultActive: false
};
```

### `addDefaultTools`

Add all default tools, as listed in `DEFAULT_TOOLS`

#### Syntax

```typescript
addDefaultTools(elementId: string): void
```

#### Parameters

| Parameter  | Type   | Description                                                                    |
| ---------- | ------ | ------------------------------------------------------------------------------ |
| `elementId` | string | The id of the cornerstone Enabled Element on which the tools will be activated |

#### Returns

`void`

## Constants

### `dvTools`

Contains a set of custom tools that are used for various processing tasks. The tools are accessible by their respective names and can be extended or modified as needed.

#### Syntax

```typescript
const dvTools: {
  [key: string]: any;
} = {
  ...,
  OverlayTool: OverlayTool
};
```

### `DEFAULT_STYLE`

specifies the default visual settings for tools, such as line width, colors, font family, font size, and background color. These can be customized to fit the application's design needs.

#### Syntax

```typescript
const DEFAULT_STYLE: ToolStyle = {
  width: 1,
  color: "#02FAE5",
  activeColor: "#00FF00",
  fillColor: "#0000FF",
  fontFamily: "Roboto",
  fontSize: 18,
  backgroundColor: "rgba(1, 1, 1, 0.7)"
};
```

### `DEFAULT_SETTINGS`

defines the default behavior of tools, such as whether mouse and touch interactions are enabled, SVG cursors are shown, and whether global tool synchronization is active. It also includes settings like auto-resizing viewports and line dash styles.

#### Syntax

```typescript
const DEFAULT_SETTINGS: ToolSettings = {
  mouseEnabled: true,
  touchEnabled: true,
  showSVGCursors: true,
  globalToolSyncEnabled: false,
  autoResizeViewports: true,
  lineDash: [4, 4]
};
```

### `DEFAULT_MOUSE_KEYS`

configures default interactions for the tools. It includes mouse button mappings (e.g., shift + left mouse button for zoom), right mouse button bindings, and keyboard shortcuts. These defaults can be customized to change the behavior of the tools.

#### Syntax

```typescript
const DEFAULT_MOUSE_KEYS: ToolMouseKeys = {
  debug: true, // log changes
  mouse_button_left: {
    shift: "Zoom",
    ctrl: "Pan",
    default: "Wwwc"
  },
  mouse_button_right: {
    shift: "Zoom",
    ctrl: "Pan",
    default: "Wwwc"
  },
  keyboard_shortcuts: {
    // alt key + letter
    KEY_R: "Rotate",
    KEY_A: "Angle",
    KEY_L: "Length"
  }
};
```

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
```
