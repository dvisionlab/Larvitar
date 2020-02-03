import csTools from 'cornerstone-tools';
const BaseTool = csTools.importInternal('base/BaseTool');

export class HelloWorldTool extends BaseTool {
  constructor(name = 'HelloWorld') {
    super({
      name,
      supportedInteractionTypes: ['Mouse'],
      mixins: ['activeOrDisabledBinaryTool'],
    });
  }

  preMouseDownCallback(evt) {
    console.log('Hello cornerstoneTools!', evt);
  }

  activeCallback(element) {
    console.log(`Hello element ${element.uuid}!`);
  }

  disabledCallback(element) {
    console.log(`Goodbye element ${element.uuid}!`);
  }
}