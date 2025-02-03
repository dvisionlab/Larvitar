<div style="text-align: center;">
    <img src="https://assets.pokemon.com/assets/cms2/img/pokedex/full/246.png" alt="Larvitar" height="200" />
</div>

## Stress Echo Protocol

The **Stress Echo Protocol** is a specialized imaging protocol used in echocardiography to assess cardiac function under different physiological conditions. This protocol involves capturing ultrasound images of the heart at various stages of stress and rest to evaluate myocardial function and detect ischemia.

### Overview

A stress echocardiogram consists of multiple imaging stages taken at different levels of stress. This typically includes:

- **Baseline (Rest) Stage:** Initial images captured before stress is induced.
- **Low-Stress Stage:** Intermediate stage to monitor heart response.
- **Peak Stress Stage:** Images taken at the highest level of exertion.
- **Recovery Stage:** Post-stress images to observe recovery.

Each stage can include multiple views to provide a comprehensive analysis of heart function.

### Staged Protocol Definition

In **Larvitar**, the Stress Echo Protocol can be managed using the **StagedProtocol** structure. The protocol consists of multiple stages and views, identified by unique attributes:

- `numberOfStages`: Total number of imaging stages.
- `numberOfViews`: Number of different views captured per stage.
- `stageName`: The name of the current stage (e.g., Rest, Peak Stress).
- `stageNumber`: Numeric identifier for the stage.
- `viewName`: The name of the view within the stage (e.g., Apical, Parasternal).
- `viewNumber`: Numeric identifier for the view.

### Metadata Handling in Larvitar

When processing **Stress Echo** studies, Larvitar extracts key metadata from the **DICOM** files to ensure proper organization and visualization of image stacks. The following attributes are used to identify and classify the different stages and views:

- `x00082124`: Number of stages in the study.
- `x0008212a`: Number of views per stage.
- `x00082120`: Name of the current stage.
- `x00082122`: Stage number.
- `x00082127`: Name of the view.
- `x00082128`: View number.

### Image Organization and Sorting

Images within the **Stress Echo Protocol** are stored and organized based on the following criteria:

1. **Sorting by Stage and View:** Images are grouped by stage and sorted based on the predefined sequence (e.g., Rest → Low Stress → Peak Stress → Recovery).
2. **Multiframe Handling:** If a DICOM series contains multiframe images, Larvitar will process them as a single entity while maintaining metadata integrity.
3. **Ordering by Instance Number:** In the absence of explicit stage/view identifiers, images are sorted using the `InstanceNumber` attribute (`x00200013`).
4. **Time-Based Sorting:** For dynamic imaging, images may be ordered by `ContentTime` (`x00080033`) to maintain temporal consistency.

### Special Considerations

- **4D Stress Echo:** When handling 4D datasets, additional metadata like acquisition times and synchronization parameters are taken into account.
- **Color Doppler Imaging:** Stress echo studies may include color Doppler views, which require specialized handling for proper visualization.
- **Contrast Echo Studies:** Some stress echo studies involve contrast agents, necessitating different processing pipelines.

### Error Handling

If the stress echo dataset lacks required attributes, Larvitar applies fallback mechanisms:

- Defaulting to instance number sorting.
- Assigning generic stage/view identifiers if missing.
- Alerting the user if critical metadata is absent.

### Conclusion

The **Stress Echo Protocol** in Larvitar ensures proper organization and visualization of echocardiographic studies across multiple stages and views. With structured metadata extraction and sorting, it facilitates efficient analysis of cardiac function under varying stress conditions.

<br></br>

<div style="text-align: center;">
    <img src="https://press.r1-it.storage.cloud.it/logo_trasparent.png" alt="D/Vision Lab" height="200" />
</div>
