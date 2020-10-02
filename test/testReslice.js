const fs = require("fs");
const image_utils = require("./image_utils");

// example of datas structure
// for each orientation (axial, coronal, sagittal)
// imageids is the list of image id of the dicom series
// instances is an object with key = imageId
// for each instance there is the pixel data object (index, value)
// and the metadata object

// let example = {
//   axial: {
//     imageIds: ["dicomfile:1"],
//     instances: {
//       "dicomfile:1": {
//         pixelData: {
//           0: 0,
//           1: 0
//         },
//         metadata: {}
//       }
//     }
//   }
// };

var args = process.argv.slice(2);

// read original data from input.json into seriesData
let rawdata = fs.readFileSync(args[0]);
let seriesData = JSON.parse(rawdata);
// original orientation data is seriesData["axial"]

// generate pixel data for new reslice orientation
seriesData["coronal"].imageIds.forEach(function (imageId) {
  let data = image_utils.getReslicedPixeldata(
    imageId,
    seriesData["axial"],
    seriesData["coronal"]
  );
  seriesData["coronal"].instances[imageId].pixelData = data;
});

// write output
fs.writeFileSync(args[1], JSON.stringify(seriesData));

// compare to original output.json
// TODO
