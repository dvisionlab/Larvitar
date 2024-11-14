export const redirects = JSON.parse("{}")

export const routes = Object.fromEntries([
  ["/", { loader: () => import(/* webpackChunkName: "index.html" */"/home/daron1337/Projects/Larvitar/docsv2/.vuepress/.temp/pages/index.html.js"), meta: {"title":"Larvitar Documentation"} }],
  ["/api/", { loader: () => import(/* webpackChunkName: "api_index.html" */"/home/daron1337/Projects/Larvitar/docsv2/.vuepress/.temp/pages/api/index.html.js"), meta: {"title":"Core API"} }],
  ["/api/interacting.html", { loader: () => import(/* webpackChunkName: "api_interacting.html" */"/home/daron1337/Projects/Larvitar/docsv2/.vuepress/.temp/pages/api/interacting.html.js"), meta: {"title":""} }],
  ["/api/loading.html", { loader: () => import(/* webpackChunkName: "api_loading.html" */"/home/daron1337/Projects/Larvitar/docsv2/.vuepress/.temp/pages/api/loading.html.js"), meta: {"title":""} }],
  ["/api/modules.html", { loader: () => import(/* webpackChunkName: "api_modules.html" */"/home/daron1337/Projects/Larvitar/docsv2/.vuepress/.temp/pages/api/modules.html.js"), meta: {"title":""} }],
  ["/api/parsing.html", { loader: () => import(/* webpackChunkName: "api_parsing.html" */"/home/daron1337/Projects/Larvitar/docsv2/.vuepress/.temp/pages/api/parsing.html.js"), meta: {"title":""} }],
  ["/api/rendering.html", { loader: () => import(/* webpackChunkName: "api_rendering.html" */"/home/daron1337/Projects/Larvitar/docsv2/.vuepress/.temp/pages/api/rendering.html.js"), meta: {"title":""} }],
  ["/guide/examples.html", { loader: () => import(/* webpackChunkName: "guide_examples.html" */"/home/daron1337/Projects/Larvitar/docsv2/.vuepress/.temp/pages/guide/examples.html.js"), meta: {"title":"Larvitar Examples"} }],
  ["/guide/", { loader: () => import(/* webpackChunkName: "guide_index.html" */"/home/daron1337/Projects/Larvitar/docsv2/.vuepress/.temp/pages/guide/index.html.js"), meta: {"title":""} }],
  ["/guide/installation.html", { loader: () => import(/* webpackChunkName: "guide_installation.html" */"/home/daron1337/Projects/Larvitar/docsv2/.vuepress/.temp/pages/guide/installation.html.js"), meta: {"title":"Larvitar Installation Guide"} }],
  ["/404.html", { loader: () => import(/* webpackChunkName: "404.html" */"/home/daron1337/Projects/Larvitar/docsv2/.vuepress/.temp/pages/404.html.js"), meta: {"title":""} }],
]);

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
  if (__VUE_HMR_RUNTIME__.updateRoutes) {
    __VUE_HMR_RUNTIME__.updateRoutes(routes)
  }
  if (__VUE_HMR_RUNTIME__.updateRedirects) {
    __VUE_HMR_RUNTIME__.updateRedirects(redirects)
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(({ routes, redirects }) => {
    __VUE_HMR_RUNTIME__.updateRoutes(routes)
    __VUE_HMR_RUNTIME__.updateRedirects(redirects)
  })
}
