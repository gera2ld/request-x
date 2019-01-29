const gulp = require('gulp');
const fs = require('fs-extra');
const log = require('fancy-log');
const webpack = require('webpack');
const yaml = require('js-yaml');
const { loadWebpackConfig } = require('@gera2ld/plaid/util');
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

function webpackCallback(done) {
  let firstTime = true;
  return (err, stats) => {
    if (err) {
      log('[FATAL]', err);
      return;
    }
    if (stats.hasErrors()) {
      log('[ERROR] webpack compilation failed\n', stats.toJson().errors.join('\n'));
      return;
    }
    if (stats.hasWarnings()) {
      log('[WARNING] webpack compilation has warnings\n', stats.toJson().warnings.join('\n'));
    }
    (Array.isArray(stats.stats) ? stats.stats : [stats])
    .forEach(stat => {
      const timeCost = (stat.endTime - stat.startTime) / 1000;
      const chunks = Object.keys(stat.compilation.namedChunks).join(' ');
      log(`Webpack built: [${timeCost.toFixed(3)}s] ${chunks}`);
    });
    if (firstTime) {
      firstTime = false;
      done(err);
    }
  }
}

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

async function jsDev(done) {
  const compiler = webpack(await loadWebpackConfig());
  compiler.watch({}, webpackCallback(done));
}

async function jsProd(done) {
  const compiler = webpack(await loadWebpackConfig());
  compiler.run(webpackCallback(done));
}

exports.clean = clean;
exports.dev = gulp.parallel(manifest, copyFiles, jsDev);
exports.build = gulp.series(clean, gulp.parallel(manifest, copyFiles, jsProd));
