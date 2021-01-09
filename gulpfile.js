const gulp = require('gulp');
const fs = require('fs').promises;
const del = require('del');
const yaml = require('js-yaml');
const Jimp = require('jimp');
const string = require('./scripts/string');
const pkg = require('./package.json');

const DIST = 'dist';
const paths = {
  manifest: [
    'src/manifest.yml',
  ],
  copy: [
    'src/_locales/**',
  ],
};
function clean() {
  return del(DIST);
}

function copyFiles() {
  return gulp.src(paths.copy, { base: 'src' })
  .pipe(gulp.dest(DIST));
}

async function createIcons() {
  const dist = `${DIST}/public/images`;
  await fs.mkdir(dist, { recursive: true });
  const icon = await Jimp.read('src/resources/wall.png');
  return Promise.all([
    16, 19, 38, 48, 128,
  ].map(size => icon.clone().resize(size, size).write(`${dist}/icon_${size}.png`)));
}

function manifest() {
  return gulp.src(paths.manifest, { base: 'src' })
  .pipe(string((input, file) => {
    const data = yaml.load(input);
    // Strip alphabetic suffix
    data.version = pkg.version.replace(/-[^.]*/, '');
    file.path = file.path.replace(/\.yml$/, '.json');
    return JSON.stringify(data);
  }))
  .pipe(gulp.dest(DIST));
}

async function jsDev() {
  require('@gera2ld/plaid-webpack/bin/develop')();
}

async function jsProd() {
  return require('@gera2ld/plaid-webpack/bin/build')({
    api: true,
    keep: true,
  });
}

exports.dev = gulp.parallel(manifest, createIcons, copyFiles, jsDev);
exports.build = gulp.series(clean, gulp.parallel(manifest, createIcons, copyFiles, jsProd));
