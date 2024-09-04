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
          children: ["/guide/installation.md", "/guide/examples.md"]
        }
      ],
      "/api/": [
        {
          text: "API",
          children: ["/api/core.md", "/api/modules.md"]
        }
      ]
    }
  }),
  bundler: viteBundler()
};
