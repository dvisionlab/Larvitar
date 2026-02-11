<p align="center">
  <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" width="100" title="Larvitar Logo" alt="Larvitar Logo">
</p>

# Larvitar

![License](https://img.shields.io/github/license/dvisionlab/Larvitar)
[![type-coverage](https://img.shields.io/badge/dynamic/json.svg?label=type-coverage&prefix=%E2%89%A5&suffix=%&query=$.typeCoverage.atLeast&uri=https%3A%2F%2Fraw.githubusercontent.com%2Fplantain-00%2Ftype-coverage%2Fmaster%2Fpackage.json)](https://github.com/dvisionlab/Larvitar)
![Last Commit](https://img.shields.io/github/last-commit/dvisionlab/Larvitar)
![GitHub stars](https://img.shields.io/github/stars/dvisionlab/Larvitar?style=social)

**Larvitar** is a modern, lightweight TypeScript library for medical imaging applications. Built on top of the Cornerstone ecosystem, Larvitar provides tools for rendering, analyzing, and interacting with medical images, including support for advanced modalities like multiframe images, NRRD, and ECG synchronization.

## 🛠 Current Version

![Build Status](https://img.shields.io/github/actions/workflow/status/dvisionlab/Larvitar/build-docs.yml?branch=master)
[![GitHub release](https://img.shields.io/github/v/release/dvisionlab/Larvitar?color=green)](https://github.com/dvisionlab/Larvitar/releases/latest)
![npm](https://img.shields.io/npm/v/larvitar)

Check out the [releases page](https://github.com/dvisionlab/Larvitar/releases) for more details.

## 🚀 Features

- **Advanced DICOM Image Rendering**: Seamlessly handles single-frame, multiframe, and custom modalities.
- **ECG and Waveform Visualization**: Built-in tools for synchronizing and rendering waveforms.
- **Custom Tools and Extensions**: Easily extendable for specific imaging needs.
- **Integration Ready**: Designed for use in advanced imaging workflows and applications.

---

## 📖 Documentation

Comprehensive documentation is available on the [Larvitar Documentation Page](https://larvitar.dvisionlab.com).

### Sections

1. [**Core API**](https://larvitar.dvisionlab.com/api/): Learn how to parse, load, and render DICOM images.
2. [**Modules**](https://larvitar.dvisionlab.com/api/): Explore the segmentation tools, color maps, and advanced rendering features.
3. [**Examples**](https://larvitar.dvisionlab.com/guide/examples.html): See working examples for ECG synchronization, NRRD image loading, segmentation tools, and more.
4. [**Installation**](https://larvitar.dvisionlab.com/guide/installation.html): Step-by-step guide to getting started with Larvitar in your project.

---

## 📦 Dependencies

Larvitar relies on the following libraries for its core functionality:

- [`cornerstone-core`](https://github.com/cornerstonejs/cornerstone): Core library for medical image visualization.
- [`cornerstone-tools`](https://github.com/cornerstonejs/cornerstoneTools): A suite of tools for image interaction.
- [`cornerstone-wado-image-loader`](https://github.com/cornerstonejs/cornerstoneWADOImageLoader): Loader for WADO-based DICOM images.
- [`dicom-parser`](https://github.com/cornerstonejs/dicomParser): Parser for DICOM files.
- [`cornerstone-file-image-loader`](https://github.com/webnamics/cornerstoneFileImageLoader): Loader for file-based DICOM images.

Make sure to have these dependencies installed when developing or using Larvitar.

---

## 🛠 Development

To start developing Larvitar or contribute to the project:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/dvisionlab/Larvitar.git
   cd Larvitar
   ```
2. **Install dependencies**:
   ```bash
    npm install
   ```
3. **Start the development server**:
   ```bash
   npm run dev
   ```
4. **Open the development environment**:
   - Serve the examples folder using a static server (e.g., `http-server` or visual studio code live server).
   - Navigate to http://localhost:5500/docs/examples/<example_name>.html (or the port configured in your dev server).

## 📝 License

Larvitar is licensed under the MIT License. Feel free to use, modify, and distribute it in your projects.

## 🤝 Contributing

Contributions are welcome! If you’d like to report a bug, suggest a feature, or submit a pull request, please follow our [contributing guidelines](CONTRIBUTING.md).

Larvitar has adopted a [Code of Conduct](CODE_OF_CONDUCT.md) that we expect project participants to adhere to.

## 👨‍💻 Main Developers

- Simone Manini, D/Vision Lab | [LinkedIn](https://linkedin.com/in/simone-manini)
- Mattia Ronzoni, D/Vision Lab | [LinkedIn](https://linkedin.com/in/mattiaronzoni90)
- Laura Borghesi, D/Vision Lab | [LinkedIn](https://linkedin.com/in/laura-borghesi-160557218)
- Sara Zanchi, D/Vision Lab | [LinkedIn](https://linkedin.com/in/sara-zanchi-113a4b61)

<p align="center">
  <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" width="200" title="D/Vision Lab Logo" alt="D/Vision Lab Logo">
</p>
