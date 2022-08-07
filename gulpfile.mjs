import gulp from 'gulp';
import { mkdir } from 'fs/promises';
import { deleteAsync } from 'del';
import yaml from 'js-yaml';
import Jimp from 'jimp';
import string from './scripts/string.js';
import pkg from './package.json' assert { type: 'json' };

const DIST = 'dist';
const paths = {
  manifest: [
    'src/manifest.yml',
  ],
  copy: [
    'src/_locales/**',
  ],
};

export function clean() {
  return deleteAsync(DIST);
}

function copyFiles() {
  return gulp.src(paths.copy, { base: 'src' })
  .pipe(gulp.dest(DIST));
}

async function createIcons() {
  const dist = `${DIST}/public/images`;
  await mkdir(dist, { recursive: true });
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
  const { default: develop } = await import('@gera2ld/plaid-webpack/bin/develop.js');
  return develop();
}

async function jsProd() {
  const { default: build } = await import('@gera2ld/plaid-webpack/bin/build.js');
  return build({
    api: true,
    keep: true,
  });
}

export const dev = gulp.parallel(manifest, createIcons, copyFiles, jsDev);
export const build = gulp.series(clean, gulp.parallel(manifest, createIcons, copyFiles, jsProd));
