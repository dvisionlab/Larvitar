<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

# NRRD Parser Module

The NRRD Parser Module provides functionality to parse and decode NRRD (Nearly Raw Raster Data) files. NRRD is a file format commonly used to store volumetric data, particularly in medical imaging applications. This module extracts metadata and image data from NRRD files, enabling seamless integration into visualization and analysis workflows.

## Features

- **File Format Validation:** Ensures that the input file is a valid NRRD file.
- **Header Parsing:** Extracts and processes metadata such as dimensions, spacings, and origins.
- **Data Decoding:** Supports various encoding formats (raw, ascii, and gzip) for decoding image data.
- **Error Handling:** Detects inconsistencies in the file format and provides meaningful error messages.
- **Integration-Ready:** Easily integrates into frameworks like Larvitar as a custom image loader.

## API Reference
`parse`
Parses a NRRD file buffer and returns its metadata and image data.

### Syntax

```typescript
parse(nrrdBuffer: ArrayBuffer, options: { headerOnly?: boolean }): { header: object, data: TypedArray | null }
```

### Parameters

| Parameter    |	Type	     | Description                                                      |
|--------------|-----------------|------------------------------------------------------------------|
| `nrrdBuffer` |	ArrayBuffer	 | The buffer containing the NRRD file data.                        |   
| `options`    |	object	     | Optional settings. Set headerOnly: true to return only metadata. |

### Returns

An object containing the NRRD file’s metadata (header) and image data (data).

### Example

```typescript
import { parse } from './parsers/nrrd';

const volume = parse(bufferArray, { headerOnly: false });
```

## How It Works

### Supported Encoding Formats

The parser supports the following NRRD encoding formats:

  - `raw`: Uncompressed binary data.
  - `ascii`: Text-encoded data.
  - `gzip`: Compressed binary data.

Unsupported encodings, such as `bzip2`, will throw an error.


### Error Handling

The parser includes robust error detection and messages for:

  - Invalid file formats (e.g., missing magic number).
  - Corrupted or inconsistent headers.
  - Unsupported encoding formats.
  - Mismatched data lengths between header and buffer.
  
### Limitations

  - Only supports raw, ascii, and gzip encodings.
  - Requires strict adherence to the NRRD specification for fields like space directions and kinds.
  - Text-based encoding (ascii) can be slower for large datasets.

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>