import { defaultTheme } from "@vuepress/theme-default";
import { viteBundler } from "@vuepress/bundler-vite";

export default {
  title: "Larvitar Documentation",
  description: "Documentation for the Larvitar library",
  theme: defaultTheme({
    // Theme configuration options
    navbar: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/index.md" },
      { text: "API", link: "/api/index.md" },
      { text: "GitHub", link: "https://github.com/dvisionlab/Larvitar" }
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          children: [
            { text: "Installation", link: "/guide/installation.md" },
            { text: "Examples", link: "/guide/examples.md" }
          ]
        }
      ],
      "/api/": [
        {
          text: "API",
          children: [
            { text: "Parsing", link: "/api/parsing.md" },
            { text: "Loading", link: "/api/loading.md" },
            { text: "Rendering", link: "/api/rendering.md" },
            { text: "Interacting", link: "/api/interacting.md" },
            {
              text: "Modules",
              link: "/api/modules.md",
              children: [{ text: "todo", link: "/api/modules/todo.md" }]
            }
          ]
        }
      ]
    }
  }),
  bundler: viteBundler()
};
