// let cornerstone;
let modules: {
  cornerstoneTools: any;
} = {
  cornerstoneTools: null
};

const externals = new Proxy(modules, {
  get: function (target: typeof modules, name: keyof typeof modules) {
    if (name in target) {
      return target[name];
    } else {
      throw new Error(`External module ${name} not registered`);
    }
  },

  set: function (target: typeof modules, name: keyof typeof modules, value) {
    target[name] = value;
    return true;
  }
});

export default externals;
