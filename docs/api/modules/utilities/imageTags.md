<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

<div style="text-align: center;">
    <img src="https://example.com/dicom_logo.png" alt="DICOM Utilities" height="200" />
</div>

## DICOM Image Metadata Parsing Module

### Overview

The DICOM Image Metadata Parsing module is a utility designed for extracting, parsing, and handling metadata from DICOM (Digital Imaging and Communications in Medicine) files. The module offers various functions to retrieve and transform DICOM tag values into usable formats. It is capable of handling different value representations (VRs) such as strings, integers, dates, and other complex structures commonly found in medical imaging datasets.

This module allows developers to parse DICOM tags and convert them into human-readable formats or machine-usable data, supporting various data types like strings, numbers, dates, and arrays.

## API Reference

### `parseTag`

This function retrieves and processes a specific DICOM tag based on its VR. It starts by checking if the VR is provided in the dataset; if not, it retrieves the VR using a DICOM dictionary. The function can process various VR types like strings, integers, floating points, dates, and more.

The function performs type-specific transformations to convert the raw data into usable values, such as:

- Strings (e.g., `SH`, `LO`, `ST`): Returns the string value after checking for valid ASCII characters.
- Integers (e.g., `IS`, `US`): Converts the string of digits into an integer, handling multiple values if necessary.
- Dates (e.g., `DA`, `DT`, `TM`): Parses date and time strings into standard JavaScript Date objects.
- Character Sets (e.g., `PN`, `SH`): Handles special character sets and converts them to readable strings.
- Binary Data (e.g., `OB`, `OW`): Returns raw binary data or tries to convert it into a readable format if possible.

The function can also handle complex data structures like sequences (`SQ`), which are recursively parsed and returned as nested objects.
The pipeline is `readFile`->`parseFile`->`parseDataSet`-> `parseTag` to extract and organize metadata in a readable format from a DICOM dataset and add them to the metadata object (see [Parsing](../../parsing.md) ).

#### Syntax

```typescript
parseTag<T>(dataSet: DataSet, propertyName: string, element: Element): T
```

#### Parameters

| Parameter      | Type    | Description                                  |
| -------------- | ------- | -------------------------------------------- |
| `dataSet`      | DataSet | The parsed dataset object from dicom parser. |
| `propertyName` | string  | The tag name                                 |
| `element`      | Element | The parsed dataset element                   |

#### Returns

`T`- The parsed and formatted DICOM tag value. The return type is generic and depends on the VR type of the tag being parsed (e.g., string, number, date, etc.).

### `getTagValue`

Extracts the value of a specific DICOM tag from the dataset according to its [Value Representation](http://dicom.nema.org/dicom/2013/output/chtml/part05/sect_6.2.html)

#### Syntax

```typescript
getTagValue(dataSet: DataSet, tag: string): any
```

#### Parameters

| Parameter | Type    | Description                                  |
| --------- | ------- | -------------------------------------------- |
| `dataSet` | DataSet | The parsed dataset object from dicom parser. |
| `tag`     | string  | The tag name                                 |

#### Returns

`any`- The value associated with the tag.

## Internal Functions

### `getDICOMTag`

Retrieves the DICOM tag information for a given tag code.

#### Syntax

```typescript
getDICOMTag(code: string): object
```

#### Parameters

| Parameter | Type   | Description         |
| --------- | ------ | ------------------- |
| `code`    | string | The DICOM tag name. |

#### Returns

`object` - The DICOM tag information, including the tag name and VR.

### `isStringVr`

Checks if the value representation (VR) is a string type.

#### Syntax

```typescript
isStringVr(vr: string): boolean
```

#### Parameters

| Parameter | Type   | Description                   |
| --------- | ------ | ----------------------------- |
| `vr`      | string | The value representation (VR) |

#### Returns

`boolean` - true if the VR is a string type, otherwise false.

### `parseDateTag`

Parses a DICOM date tag (DA) into a standardized date format.

#### Syntax

```typescript
parseDateTag(tagValue: string): string
```

#### Parameters

| Parameter  | Type   | Description                             |
| ---------- | ------ | --------------------------------------- |
| `tagValue` | string | The DICOM date value in YYYYMMDD format |

#### Returns

`string` - The parsed date in a readable format (YYYY-MM-DD).

### `parseTimeTag`

Parses a DICOM time tag (TM) into a standardized time format.

#### Syntax

```typescript
parseTimeTag(tagValue: string): string
```

#### Parameters

| Parameter  | Type   | Description                                  |
| ---------- | ------ | -------------------------------------------- |
| `tagValue` | string | The DICOM date value in HHMMSS.FFFFFF format |

#### Returns

`string` - The parsed time in a readable format (HH:mm:ss).

### `parseDateTimeTag`

Parses a DICOM date-time tag (DT) into a standardized date-time format.

#### Syntax

```typescript
parseDateTimeTag(tagValue: string): string
```

#### Parameters

| Parameter  | Type   | Description                                          |
| ---------- | ------ | ---------------------------------------------------- |
| `tagValue` | string | The DICOM date value in YYYYMMDDHHMMSS.FFFFFF format |

#### Returns

`string` - The parsed date-time in a readable format (YYYY-MM-DD HH:mm:ss).

### `formatDate`

Formats a given date into a standardized string format.

#### Syntax

```typescript
formatDate(date: Date): string
```

#### Parameters

| Parameter | Type | Description               |
| --------- | ---- | ------------------------- |
| `date`    | Date | The Date object to format |

#### Returns

`string` - The formatted date in YYYY-MM-DD format.

### `formatDateTime`

Formats a given date-time into a standardized string format.

#### Syntax

```typescript
formatDate(date: Date): string
```

#### Parameters

| Parameter | Type | Description               |
| --------- | ---- | ------------------------- |
| `date`    | Date | The Date object to format |

#### Returns

`string` - The formatted date-time in YYYY-MM-DD HH:mm:ss format.

### `isValidDate`

Checks if a given date is valid.

#### Syntax

```typescript
isValidDate(d: any): boolean
```

#### Parameters

| Parameter | Type | Description       |
| --------- | ---- | ----------------- |
| `date`    | any  | The date to check |

#### Returns

`string` - true if the date is valid, otherwise false.

### `parsePatientNameTag`

Parses a DICOM patient name tag (PN) into a structured name format.

#### Syntax

```typescript
parsePatientNameTag(tagValue: string): string
```

#### Parameters

| Parameter  | Type   | Description                                                    |
| ---------- | ------ | -------------------------------------------------------------- |
| `tagValue` | string | The DICOM patient name in LastName^FirstName^MiddleName format |

#### Returns

`string` - The parsed patient name, formatted as LastName, FirstName MiddleName.

### `parseAgeTag`

Parses a DICOM age tag (AS) into a standardized age format.

#### Syntax

```typescript
parseAgeTag(tagValue: string): string
```

#### Parameters

| Parameter  | Type   | Description                                             |
| ---------- | ------ | ------------------------------------------------------- |
| `tagValue` | string | The DICOM age value in nnnD, nnnW, nnnM, or nnnY format |

#### Returns

`string` - The parsed age in a human-readable format (e.g., "25 years", "6 months").

### `parseDICOMFileIDTag`

Parses a DICOM file ID tag (CS) into a standardized ID format.

#### Syntax

```typescript
parseDICOMFileIDTag(tagValue: string): string
```

#### Parameters

| Parameter  | Type   | Description             |
| ---------- | ------ | ----------------------- |
| `tagValue` | string | The DICOM file ID value |

#### Returns

`string` - The parsed DICOM file ID.

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
```
