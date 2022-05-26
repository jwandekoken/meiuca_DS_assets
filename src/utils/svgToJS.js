const fs = require("fs");
const path = require("path");
const fse = require("fs-extra");
const specialCharactherRegex = /[ `!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/gi;

// Helpers to normalize Names
function matchSpecialCharacters() {
  return new RegExp(specialCharactherRegex);
}

function normalizeName(name) {
  const regex = matchSpecialCharacters();
  return !regex.test(name[0]) ? name[0].toUpperCase() + name.slice(1, name.length) : name[1].toUpperCase() + name.slice(2, name.length);
}

function _camelCase(name) {
  return name.toLowerCase()
    .replace( /[-_]+/g, ' ')
    .replace( /[^\w\s]/g, '')
    .replace( / (.)/g, function($1) { return $1.toUpperCase(); })
    .replace( / /g, '');
}


function svgToJS (config) {
  const scale = config.scale || 1
  const files = fs.readdirSync(config.inputDir)
  const svgs = [];
  const isIcon = config.inputDir.includes('icons');

  for (const file of files) {
    if (file.slice(-4) !== '.svg') continue
    const code = fs.readFileSync(path.join(config.inputDir, file), 'utf-8')
    const size = String(code.match(/viewBox="[^"]+/)).slice(9)
    const name = file.slice(0, -4)

    const svgExpression = /^[^>]+>|<[^<]+$/g;

    let body = code.replace(svgExpression, '')
                   .replace(/(\r\n|\n|\r)/g, '');

    if (isIcon) {
      body = body.replace(/fill="[^"]+/g, 'fill="currentColor')
    }

    const camelCase = name.replace(/-+./g, (m) => m.slice(-1).toUpperCase())
    const titleCase = camelCase.replace(/./, (m) => m.toUpperCase())
    const [w, h] = size.split(' ').slice(2).map((val) => `${(val / scale).toFixed(3)}em`)
    if (!h) throw new Error(`Malformed viewBox in SVG ${file}`)

    svgs.push({
      camelCase,
      titleCase,
      name,
      svg: `<svg viewBox="${size}" class="${name}" width="${w}" height="${h}" aria-hidden="true" focusable="false">${body}</svg>`
    })
  }

  let commonAssetIndex = ``;
  let srcAssetIndex = ``;
  let svgsList = [];

  svgs.forEach(({ svg, name }) => {
    const _name = name.replace(/-/g, '_').toLocaleLowerCase();
    const normalizedName = normalizeName(_camelCase(_name));
    const currentFileContent = `const ${normalizedName} = '${svg}';\nexport default ${normalizedName}`;
    commonAssetIndex += `import ${normalizedName} from "./${_name}.js";\n`;
    srcAssetIndex += `import ${normalizedName} from "./${name}.svg";\n`;
    svgsList.push(normalizedName);
    fse.outputFileSync(`${config.outputDir}/${name.replace(/-/g, '_').toLocaleLowerCase()}.js`, currentFileContent);
  });

  const exportsAssets = `
  export {
    ${svgs.map(svg => normalizeName(_camelCase(svg.name))).join()}
  }
`
  commonAssetIndex += exportsAssets;
  srcAssetIndex += exportsAssets;

  fse.outputFileSync(`${config.outputDir}/index.js`, commonAssetIndex);
  fse.outputFileSync(`${config.inputDir}/index.js`, srcAssetIndex);

  fse.outputFileSync(`${config.outputDir}/exported-assets-list.js`, `export default ${JSON.stringify(svgsList)}`);
}

module.exports = {
  svgToJS
}