import { defaultTheme } from "@vuepress/theme-default";
import { viteBundler } from "@vuepress/bundler-vite";
import { slimsearchPlugin } from "@vuepress/plugin-slimsearch";

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
      "/": [
        {
          text: "Home",
          children: [
            { text: "Guide", link: "/guide/index.md" },
            { text: "API", link: "/api/index.md" },
            { text: "Examples", link: "/guide/examples.md" }
          ]
        }
      ],
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
              children: [
                { text: "Store", link: "/api/modules/store.md" },
                {
                  text: "Managers",
                  children: [
                    {
                      text: "Image Manager",
                      link: "/api/modules/managers/imageManager.md"
                    },
                    {
                      text: "GSPS Manager",
                      link: "/api/modules/managers/gspsManager.md"
                    },
                    {
                      text: "File Manager",
                      link: "/api/modules/managers/fileManager.md"
                    }
                  ]
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
                  text: "Interaction Tools",
                  children: [
                    {
                      text: "Initialize and manage Tools",
                      link: "/api/modules/tools/initialization.md"
                    },
                    {
                      text: "Default and Custom Tools",
                      link: "/api/modules/tools/default.md"
                    },
                    {
                      text: "Segmentation Tools",
                      link: "/api/modules/tools/segmentation.md"
                    },
                    {
                      text: "DvTools",
                      link: "/api/modules/tools/dvTools.md"
                    }
                  ]
                },
                {
                  text: "Utilities",
                  children: [
                    {
                      text: "DICOM Anonymization",
                      link: "/api/modules/utilities/anonymization.md"
                    },
                    {
                      text: "DICOM Customization",
                      link: "/api/modules/utilities/customization.md"
                    },
                    {
                      text: "Tags",
                      link: "/api/modules/utilities/imageTags.md"
                    },
                    {
                      text: "Utils",
                      link: "/api/modules/utilities/imageUtils.md"
                    },
                    {
                      text: "Memory",
                      link: "/api/modules/utilities/memory.md"
                    }
                  ]
                },
                {
                  text: "Post Processing",
                  children: [
                    { text: "DSA", link: "/api/modules/postProcessing/dsa.md" }
                  ]
                },
                {
                  text: "Visualizations",
                  children: [
                    {
                      text: "Overlays",
                      link: "/api/modules/visualizations/overlays.md"
                    },
                    {
                      text: "ECG",
                      link: "/api/modules/visualizations/ecg.md"
                    },
                    {
                      text: "Color Maps",
                      link: "/api/modules/visualizations/colorMaps.md"
                    }
                  ]
                }
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
  },
  plugins: [
    slimsearchPlugin({
      // options
    })
  ]
};
