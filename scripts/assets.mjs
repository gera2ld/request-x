import { mkdir, rm, cp, copyFile, readFile, writeFile } from 'fs/promises';
import { Jimp } from 'jimp';
import { load as loadYaml } from 'js-yaml';
import pkg from '../package.json' with { type: 'json' };

async function clean() {
  await rm('dist', { recursive: true, force: true });
}

async function copyFiles() {
  await cp('src/_locales', 'dist/_locales', { recursive: true });
}

async function copyConnectorFiles() {
  await mkdir('lib', { recursive: true });
  await copyFile('src/connector/package.json', 'lib/package.json');
}

async function createIcons() {
  const dist = `dist/public/images`;
  await mkdir(dist, { recursive: true });
  const icon = await Jimp.read('src/resources/x.png');
  return Promise.all(
    [16, 19, 38, 48, 128].map((w) => icon.clone().resize({ w }).write(`${dist}/icon_${w}.png`)),
  );
}

async function manifest() {
  await mkdir('dist', { recursive: true });
  const data = loadYaml(await readFile('src/manifest.yml', 'utf8'));
  // Strip alphabetic suffix
  data.version = pkg.version.replace(/-[^.]*/, '');
  await writeFile(`dist/manifest.json`, JSON.stringify(data));
}

const copyAssets = () =>
  Promise.all([copyFiles(), copyConnectorFiles(), createIcons(), manifest()]);

const tasks = { clean, copyAssets };
const [task = 'copyAssets'] = process.argv.slice(2);
if (!tasks[task]) {
  console.error(`Unknown task: ${task}`);
  process.exit(1);
}
await tasks[task]();
