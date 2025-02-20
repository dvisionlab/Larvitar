<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

## Memory Monitoring Module

### Overview

The Memory Monitoring module provides utility functions for tracking and managing memory usage within an application. It ensures efficient memory allocation and prevents excessive usage by monitoring JavaScript heap size and clearing unnecessary data when needed.

## API Reference

### `checkAndClearMemory`

#### Description

Checks memory allocation and clears non-rendered series from memory if necessary.

#### Syntax

```typescript
checkAndClearMemory(bytes: number, renderedSeriesIds: string[]): void
```

#### Parameters

| Parameter           | Type             | Description                      |
| ------------------- | ---------------- | -------------------------------- |
| `bytes`             | Number           | The number of bytes to allocate. |
| `renderedSeriesIds` | Array of Strings | List of rendered series IDs.     |

#### Example

```typescript
checkAndClearMemory(50000000, ["series1", "series2"]);
```

---

### `checkMemoryAllocation`

#### Description

Checks memory allocation and returns `false` if the JavaScript heap size limit is reached.

#### Syntax

```typescript
checkMemoryAllocation(bytes: number): boolean
```

#### Parameters

| Parameter | Type   | Description                      |
| --------- | ------ | -------------------------------- |
| `bytes`   | Number | The number of bytes to allocate. |

#### Returns

`boolean` - `true` if there is enough memory, `false` otherwise.

#### Example

```typescript
const isEnough = checkMemoryAllocation(50000000);
```

---

### `getUsedMemory`

#### Description

Retrieves the amount of memory currently used in the JavaScript heap.

#### Syntax

```typescript
getUsedMemory(): number
```

#### Returns

`number` - Used JS heap size in bytes, or `NaN` if unsupported.

#### Example

```typescript
const usedMemory = getUsedMemory();
```

---

### `getAvailableMemory`

#### Description

Returns the available JavaScript heap size.

#### Syntax

```typescript
getAvailableMemory(): number
```

#### Returns

`number` - Available JS heap size in bytes, or `NaN` if unsupported.

#### Example

```typescript
const availableMemory = getAvailableMemory();
```

---

### `setAvailableMemory`

#### Description

Sets a custom maximum available memory limit.

#### Syntax

```typescript
setAvailableMemory(value: number): void
```

#### Parameters

| Parameter | Type   | Description                |
| --------- | ------ | -------------------------- |
| `value`   | Number | Memory limit in gigabytes. |

#### Example

```typescript
setAvailableMemory(4);
```

---

## Internal Utility Functions

### `checkMemorySupport`

#### Description

Checks if `performance.memory` is supported in the browser.

#### Syntax

```typescript
checkMemorySupport(): boolean
```

#### Returns

`boolean` - `true` if supported, `false` otherwise.

#### Example

```typescript
const isSupported = checkMemorySupport();
```

---

### `getMB`

#### Description

Converts bytes to megabytes.

#### Syntax

```typescript
getMB(bytes: number): number
```

#### Parameters

| Parameter | Type   | Description      |
| --------- | ------ | ---------------- |
| `bytes`   | Number | Memory in bytes. |

#### Example

```typescript
const memoryInMB = getMB(1048576);
```

---

## Constants

### `backingMemory`

- A constant defining 100 MB (`100 * 1048576`) reserved memory.

### `customMemoryLimit`

- A variable that stores the user-defined memory limit.

## Dependencies

- `getImageManager()`, `removeDataFromImageManager()`, `clearImageCache()`, and `store` from external modules.

## Warnings & Considerations

- This module ensures efficient memory management, preventing excessive memory usage.
- Works only in browsers that support `performance.memory` (Chrome-based browsers).

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
