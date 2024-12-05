import { deleteAsync } from 'del';
import { mkdir, readFile, writeFile } from 'fs/promises';
import gulp from 'gulp';
import { Jimp } from 'jimp';
import yaml from 'js-yaml';
import pkg from './package.json' with { type: 'json' };

export function clean() {
  return deleteAsync('dist/**');
}

function copyFiles() {
  return gulp.src('src/_locales/**', { base: 'src' }).pipe(gulp.dest('dist'));
}

function copyConnectorFiles() {
  return gulp.src('src/connector/package.json').pipe(gulp.dest('lib'));
}

async function createIcons() {
  const dist = `dist/public/images`;
  await mkdir(dist, { recursive: true });
  const icon = await Jimp.read('src/resources/x.png');
  return Promise.all(
    [16, 19, 38, 48, 128].map((w) =>
      icon.clone().resize({ w }).write(`${dist}/icon_${w}.png`),
    ),
  );
}

async function manifest() {
  const data = yaml.load(await readFile('src/manifest.yml', 'utf8'));
  // Strip alphabetic suffix
  data.version = pkg.version.replace(/-[^.]*/, '');
  await writeFile(`dist/manifest.json`, JSON.stringify(data));
}

export const copyAssets = gulp.parallel(
  copyFiles,
  copyConnectorFiles,
  createIcons,
  manifest,
);
