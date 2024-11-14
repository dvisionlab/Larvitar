export const themeData = JSON.parse("{\"navbar\":[{\"text\":\"Home\",\"link\":\"/\"},{\"text\":\"Guide\",\"link\":\"/guide/index.md\"},{\"text\":\"API\",\"link\":\"/api/index.md\"},{\"text\":\"GitHub\",\"link\":\"https://github.com/dvisionlab/Larvitar\"}],\"sidebar\":{\"/guide/\":[{\"text\":\"Guide\",\"children\":[{\"text\":\"Installation\",\"link\":\"/guide/installation.md\"},{\"text\":\"Examples\",\"link\":\"/guide/examples.md\"}]}],\"/api/\":[{\"text\":\"API\",\"children\":[{\"text\":\"Parsing\",\"link\":\"/api/parsing.md\"},{\"text\":\"Loading\",\"link\":\"/api/loading.md\"},{\"text\":\"Rendering\",\"link\":\"/api/rendering.md\"},{\"text\":\"Interacting\",\"link\":\"/api/interacting.md\"},{\"text\":\"Modules\",\"link\":\"/api/modules.md\",\"children\":[{\"text\":\"todo\",\"link\":\"/api/modules/todo.md\"}]}]}]},\"locales\":{\"/\":{\"selectLanguageName\":\"English\"}},\"colorMode\":\"auto\",\"colorModeSwitch\":true,\"logo\":null,\"repo\":null,\"selectLanguageText\":\"Languages\",\"selectLanguageAriaLabel\":\"Select language\",\"sidebarDepth\":2,\"editLink\":true,\"editLinkText\":\"Edit this page\",\"lastUpdated\":true,\"lastUpdatedText\":\"Last Updated\",\"contributors\":true,\"contributorsText\":\"Contributors\",\"notFound\":[\"There's nothing here.\",\"How did we get here?\",\"That's a Four-Oh-Four.\",\"Looks like we've got some broken links.\"],\"backToHome\":\"Take me home\",\"openInNewWindow\":\"open in new window\",\"toggleColorMode\":\"toggle color mode\",\"toggleSidebar\":\"toggle sidebar\"}")

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
  if (__VUE_HMR_RUNTIME__.updateThemeData) {
    __VUE_HMR_RUNTIME__.updateThemeData(themeData)
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(({ themeData }) => {
    __VUE_HMR_RUNTIME__.updateThemeData(themeData)
  })
}
