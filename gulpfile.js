const fs = require('fs');
const promisify = require('es6-promisify');
const gulp = require('gulp');
const del = require('del');
const webpack = require('webpack');
const gutil = require('gutil');
const json = require('./scripts/json');
const webpackConfig = require('./scripts/webpack.conf');
const pkg = require('./package.json');
const readFile = promisify(fs.readFile);

function webpackCallback(err, stats) {
  if (err) {
    gutil.log('[FATAL]', err);
    return;
  }
  if (stats.hasErrors()) {
    gutil.log('[ERROR] webpack compilation failed\n', stats.toJson().errors.join('\n'));
    return;
  }
  if (stats.hasWarnings()) {
    gutil.log('[WARNING] webpack compilation has warnings\n', stats.toJson().warnings.join('\n'));
  }
  stats.stats.forEach(stat => {
    const timeCost = (stat.endTime - stat.startTime) / 1000;
    const chunks = Object.keys(stat.compilation.namedChunks).join(' ');
    gutil.log(`Webpack built: [${timeCost.toFixed(3)}s] ${chunks}`);
  });
}

const DIST = 'dist';
const paths = {
  manifest: [
    'src/manifest.json',
  ],
  copy: [
    'src/_locales/**',
    'src/images/**',
  ],
};
const buildTasks = ['manifest', 'copy'];

gulp.task('clean', () => del('dist'));

gulp.task('manifest', () =>
  gulp.src(paths.manifest, {base: 'src'})
  .pipe(json(data => {
    data.version = pkg.version.replace(/-[^.]*/, '');
    return data;
  }))
  .pipe(gulp.dest('dist'))
);

gulp.task('copy', () =>
  gulp.src(paths.copy, { base: 'src' })
  .pipe(gulp.dest(DIST))
);

gulp.task('watch', buildTasks.concat(['js-dev']), () => {
  gulp.watch(paths.copy, ['copy']);
  gulp.watch(paths.manifest, ['manifest']);
});

gulp.task('build', buildTasks.concat(['js-prd']));

gulp.task('js-dev', () => webpack(webpackConfig).watch({}, webpackCallback));
gulp.task('js-prd', () => webpack(webpackConfig, webpackCallback));
