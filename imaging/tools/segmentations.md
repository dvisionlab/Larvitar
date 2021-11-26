# Introduction

This guide explains the key concepts of Larvitar **segmentation masks management**, based on cornerstone tools's **segmentation module**.

# Definitions

- _segmentation mask_ or just _mask_: the set of pixels that belongs to a specific structure
- _volume_: a buffer containing one or more segmentations
- _label_: the value inside a volume that identifies a specific segmentation

# CS tools

## Segmentation module structure

In cs tools world, the different volumes are defined _labelmaps_, while the different labels in a volume are _segments_. Labelmaps can support up to 2^16 segments.
The values in the volume (ie, labels) define which color will be used from the LUT map: in fact, segments get the color from the lutmap and can be shown/hidden one by one.
Each labelmaps can be linked to a different colormap and has a active / inactive property that affects the rendering style (see configuration).

> setters.toggleSegmentVisibility(htmlelement,segmentvalue,labelmapid)  
> setters.colorForSegmentIndexOfColorLUT(colorLutIndex, segmentValue, colorRGBAarray)

## Configuration

TODO

# Larvitar segmentation management

TODO

# Larvitar segmentation API

TODO
