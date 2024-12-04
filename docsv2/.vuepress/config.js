import { defaultTheme } from "@vuepress/theme-default";
import { viteBundler } from "@vuepress/bundler-vite";

export default {
  title: "Larvitar Documentation",
  description: "Documentation for the Larvitar library",
  theme: defaultTheme({
    colorMode: "auto",
    colorModeSwitch: true,
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
            { text: "Initializing", link: "/api/initializing.md" },
            { text: "Parsing", link: "/api/parsing.md" },
            { text: "Loading", link: "/api/loading.md" },
            { text: "Rendering", link: "/api/rendering.md" },
            { text: "Interacting", link: "/api/interacting.md" },
            {
              text: "Modules",
              link: "/api/modules.md",
              children: [
                { text: "Store", link: "/api/modules/store.md" },
                {
                  text: "Larvitar Manager",
                  link: "/api/modules/larvitarManager.md"
                },
                {
                  text: "Parsers",
                  children: [
                    {
                      text: "PDF Parser",
                      link: "/api/modules/parsers/pdf.md"
                    },
                    {
                      text: "NRRD Parser",
                      link: "/api/modules/parsers/nrrd.md"
                    },
                    {
                      text: "ECG Parser",
                      link: "/api/modules/parsers/ecg.md"
                    }
                  ]
                },
                {
                  text: "Loaders",
                  link: "/api/modules/loaders/loaders.md",
                  children: [
                    {
                      text: "DICOM Loader",
                      link: "/api/modules/loaders/dicomLoader.md"
                    },
                    {
                      text: "MultiFrame Loader",
                      link: "/api/modules/loaders/multiframeLoader.md"
                    },
                    {
                      text: "DSA Image Loader",
                      link: "/api/modules/loaders/dsaImageLoader.md"
                    },
                    {
                      text: "File Loader",
                      link: "/api/modules/loaders/fileLoader.md"
                    },
                    {
                      text: "Nrrd Loader",
                      link: "/api/modules/loaders/nrrdLoader.md"
                    }
                  ]
                },
                {
                  text: "Algorithms",
                  children: [
                    { text: "Ecg", link: "/api/modules/ecg.md" },
                    { text: "Stress Echo", link: "/api/modules/stressecho.md" },
                    { text: "DSA", link: "/api/modules/dsa.md" }
                  ]
                },
                { text: "Overlays", link: "/api/modules/overlays.md" }
              ]
            }
          ]
        }
      ]
    }
  }),
  bundler: viteBundler(),
  locales: {
    "/": {
      lang: "en-US"
    }
  }
};
