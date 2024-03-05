import gulp from 'gulp';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { deleteAsync } from 'del';
import yaml from 'js-yaml';
import Jimp from 'jimp';
import pkg from './package.json' assert { type: 'json' };

export function clean() {
  return deleteAsync('dist/**');
}

function copyFiles() {
  return gulp.src('src/_locales/**', { base: 'src' })
  .pipe(gulp.dest('dist'));
}

async function createIcons() {
  const dist = `dist/public/images`;
  await mkdir(dist, { recursive: true });
  const icon = await Jimp.read('src/resources/wall.png');
  return Promise.all([
    16, 19, 38, 48, 128,
  ].map(size => icon.clone().resize(size, size).write(`${dist}/icon_${size}.png`)));
}

async function manifest() {
  const data = yaml.load(await readFile('src/manifest.yml', 'utf8'));
  // Strip alphabetic suffix
  data.version = pkg.version.replace(/-[^.]*/, '');
  await writeFile(`dist/manifest.json`, JSON.stringify(data));
}

export const copyAssets = gulp.parallel(copyFiles, createIcons, manifest);
