<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

## Introduction

The process of initializing tools involves setting up the environment, adding desired tools, and specifying their behavior. For example:

```javascript
initializeCSTools(); // Prepares the default Cornerstone tools environment.
addTool("Wwwc"); // Adds the Window/Level tool for adjusting image contrast and brightness.
setToolActive("Wwwc"); // Activates the "Wwwc" tool, enabling interactive control for the user.
```

In this case, the "Wwwc" tool is added and set as the active tool, allowing users to adjust the contrast and brightness of the image interactively.

Alternatively, developers can load default tools (see [Default and Custom Tools](./default.md) paragraph), including custom ones if previously registered:

```javascript
store.initialize();
addViewport("viewer");
initializeCSTools(); // Prepares the default Cornerstone tools environment.
addDefaultTools("viewer"); // Adds the default tools, which can also include custom-defined tools.
setToolActive("WatershedSegmentation"); // Activates the "WatershedSegmentation" custom tool for user interaction.
```

## Stack Tools Creation and Synchronization
The stack tools creation and synchronization process involves creating a stack object and updating it to ensure that all tools are synchronized with the current image stack.

You can create a stack object using the `csToolsCreateStack` function, which takes the target HTML element, image IDs, and the current image index as parameters. This function initializes the stack object and prepares it for synchronization.

You can then use the `csToolsSyncStack` function to update the stack object with new image IDs, ensuring that all tools are synchronized with the current image stack. This is particularly useful when working with multiple images or stacks, as it allows for seamless interaction and manipulation of the images.

If you use the `addDefaultTools` function, the stack tools are automatically created. This means that you don't need to manually call `csToolsCreateStack` or `csToolsSyncStack` unless you want to customize the stack behavior.

When you create the stack tool if you do not have all imageIds available, you can use the `csToolsSyncStack` function to update the stack object with new image IDs. This allows you to add or remove images from the stack dynamically, ensuring that all tools remain synchronized with the current image stack.


### Key Concepts: Tool States

Tools can be configured with specific states to define how they interact with the imaging environment:

- **Disabled:** The tool is inactive and cannot interact with the image or respond to user input.
- **Passive:** The tool is active in the background, observing user interactions or changes, but it does not modify the image directly.
- **Enabled:** The tool is ready to interact with the image but is not the primary tool in focus. Users can use it alongside other tools.
- **Active:** The tool is the primary tool in use, allowing direct and interactive control by the user.

## API Reference

### `initializeCSTools`

Initialize cornerstone tools with default configuration (extended with custom configuration)

#### Syntax

```typescript
initializeCSTools(
  settings?: ToolSettings,
  style?: ToolStyle
)
```

#### Parameters

| Parameter  | Type         | Description                                                                                   |
| ---------- | ------------ | --------------------------------------------------------------------------------------------- |
| `settings` | ToolSettings | The settings object (default is `DEFAULT_SETTINGS`: [Default and Custom Tools](./default.md)) |
| `style`    | ToolStyle    | The style object (default is `DEFAULT_STYLE`: [Default and Custom Tools](./default.md))       |

**Example:**

```typescript
initializeCSTools({ showSVGCursors: false }, { color: "0000FF" });
```

#### Returns

`void`

### `csToolsCreateStack`

Create stack object to sync stack tools

#### Syntax

```typescript
csToolsCreateStack (
  element: HTMLElement,
  imageIds?: string[],
  currentImageIndex?: number
)
```

#### Parameters

| Parameter           | Type        | Description              |
| ------------------- | ----------- | ------------------------ |
| `element`           | HTMLElement | The target html element. |
| `imageIds`          | string[]    | Stack image ids.         |
| `currentImageIndex` | number      | The current image id.    |

#### Returns

`void`

### `csToolsSyncStack`

Update stack object to sync stack tools

#### Syntax

```typescript
csToolsSyncStack(elementId: string, imageIds: string[])
```

#### Parameters

| Parameter   | Type     | Description                 |
| ----------- | -------- | --------------------------- |
| `elementId` | string   | The target html element id. |
| `imageIds`  | string[] | Stack image ids.            |

#### Returns

`void`

### `addTool`

Add a cornerstone tool (grab it from original library or dvision custom tools)

#### Syntax

```typescript
addTool(
  toolName: string,
  customConfig: Partial<ToolConfig>,
  targetElementId?: string
)
```

#### Parameters

| Parameter         | Type       | Description                 |
| ----------------- | ---------- | --------------------------- |
| `toolName`        | string     | The tool name               |
| `customConfig`    | ToolConfig | The tool configuration      |
| `targetElementId` | string     | The target html element id. |

**Example:**

```typescript
addTool(
  "ScaleOverlay",
  { configuration: { minorTickLength: 10, majorTickLength: 25 } },
  "viewer"
);
```

#### Returns

`void`

### `setToolActive`

Set Tool **active** on all elements (ie, rendered and manipulable) and refresh cornerstone elements

#### Syntax

```typescript
setToolActive(
  toolName: string,
  options?: Partial<ToolConfig["options"]>,
  viewports?: string[],
  doNotSetInStore?: boolean
)
```

#### Parameters

| Parameter         | Type                  | Description                                                                            |
| ----------------- | --------------------- | -------------------------------------------------------------------------------------- |
| `toolName`        | string                | The custom tool name                                                                   |
| `options`         | ToolConfig["options"] | The custom options. @default from tools/default.js                                     |
| `viewports`       | string[]              | The hmtl element id to be used for tool initialization.                                |
| `doNotSetInStore` | boolean               | Flag to avoid setting in store (useful on tools initialization eg in addDefaultTools). |

#### Returns

`void`

### `setToolDisabled`

Set Tool **disabled** on all elements (ie, not rendered) and refresh cornerstone elements

#### Syntax

```typescript
setToolDisabled(
  toolName: string,
  viewports?: string[],
  resetCursor = true
)
```

#### Parameters

| Parameter     | Type     | Description                                             |
| ------------- | -------- | ------------------------------------------------------- |
| `toolName`    | string   | The tool name.                                          |
| `viewports`   | string[] | The hmtl element id to be used for tool initialization. |
| `resetCursor` | boolean  | Flag to restore native cursor. @default true            |

#### Returns

`void`

### `setToolEnabled`

Set Tool **enabled** on all elements (ie, rendered but not manipulable) and refresh cornerstone elements

#### Syntax

```typescript
setToolEnabled(
  toolName: string,
  viewports?: string[],
  resetCursor = true
)
```

#### Parameters

| Parameter     | Type     | Description                                             |
| ------------- | -------- | ------------------------------------------------------- |
| `toolName`    | string   | The tool name.                                          |
| `viewports`   | string[] | The hmtl element id to be used for tool initialization. |
| `resetCursor` | boolean  | Flag to restore native cursor. @default true            |

#### Returns

`void`

### `setToolPassive`

Set Tool **passive** on all elements (ie, rendered and manipulable passively) & refresh cornerstone elements

#### Syntax

```typescript
setToolPassive(
  toolName: string,
  viewports?: string[],
  resetCursor = true
)
```

#### Parameters

| Parameter     | Type     | Description                                             |
| ------------- | -------- | ------------------------------------------------------- |
| `toolName`    | string   | The tool name.                                          |
| `viewports`   | string[] | The hmtl element id to be used for tool initialization. |
| `resetCursor` | boolean  | Flag to restore native cursor. @default true            |

#### Returns

`void`

### `setToolsStyle`

Set cornerstone tools custom configuration (extend default configuration)

#### Syntax

```typescript
setToolsStyle(style?: ToolStyle)
```

#### Parameters

| Parameter | Type      | Description                                                                             |
| --------- | --------- | --------------------------------------------------------------------------------------- |
| `style`   | ToolStyle | the style object (default in `DEFAULT_STYLE`: [Default and Custom Tools](./default.md)) |

#### Returns

`void`

<div style="text-align: center;">
  <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
