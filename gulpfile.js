const gulp = require('gulp');
const fs = require('fs-extra');
const yaml = require('js-yaml');
const string = require('./scripts/string');
const pkg = require('./package.json');

const DIST = 'dist';
const paths = {
  manifest: [
    'src/manifest.yml',
  ],
  copy: [
    'src/_locales/**',
    'src/public/images/**',
  ],
};
function clean() {
  return fs.emptyDir(DIST);
}

function copyFiles() {
  return gulp.src(paths.copy, { base: 'src' })
  .pipe(gulp.dest(DIST));
}

function manifest() {
  return gulp.src(paths.manifest, { base: 'src' })
  .pipe(string((input, file) => {
    const data = yaml.safeLoad(input);
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
  });
}

exports.dev = gulp.parallel(manifest, copyFiles, jsDev);
exports.build = gulp.series(clean, gulp.parallel(manifest, copyFiles, jsProd));
