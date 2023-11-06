# Tools Management

## Default tools

In `default.ts` the list of Larvitar default tools is exported as `DEFAULT_TOOLS`, along with their default configuration, that extendes the cornerstoneTools configuration with these properties:

```
{
    name : toolName (string),
    viewports : "all" or [array of target viewports],
    configuration : configuration {object},
    options : options {object},
    class : cornerstone tool library class name (ie "LengthTool" for Length tool),
    sync : cornerstone synchronizer name (ie "wwwcSynchronizer" for Wwwc sync tool),
    cleanable : if true, this tool will be removed when calling "no tools",
    defaultActive : if true, this tool will be activated when calling "addDefaultTools",
    shortcut : keyboard shortcut [not implemented],
    type : tool category inside Larvitar (one of: "utils", "annotation", "segmentation", "overlay"),
    description: a string that describes the tool (eg to be shown in a tooltip)
}
```

These are the tools that will be added calling `addDefaultTools`. User can override defaults calling `setDefaultToolsProps`.

## External Tools

User can add custom tools calling `registerExternalTool`. The tool will be registered in the dvTools object and in DEFAULT*TOOLS array. If done \_before* adding the tools with `addDefaultTools`, the tool will be added automatically along with the default ones. Otherwise, the user can simply add its tool using `addTool`.
