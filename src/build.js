const fs = require('fs');
const assetModuleFolder = ['icons'];
const {svgToJS} = require("./utils/svgToJS");


assetModuleFolder.forEach(asset => {
  const options = {
    inputDir: `src/assets/${asset}`,
    outputDir: `dist/assets/${asset}`
  }

  svgToJS(options);
})