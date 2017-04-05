import 'babel-polyfill'
import 'babel-regenerator-runtime'
import 'source-map-support/register'

import del from 'del'
import gulp from 'gulp'
import babel from 'gulp-babel'
import sourcemaps from 'gulp-sourcemaps'
import babelify from 'babelify'
import source from 'vinyl-source-stream'
import browserify from 'browserify'
import uglifyify from 'uglifyify'
import buffer from 'vinyl-buffer'

gulp.task('default', ['build'])

gulp.task('build', ['cleanLib', 'buildSrc', 'buildProdDist'])

gulp.task('watch', () => {
  gulp.watch(['src/**'], ['build'])
})

gulp.task('cleanLib', () => {
  return del(['lib'], {force: true})
})

gulp.task('buildSrc', ['cleanLib'], () => {
  return gulp
    .src(['src/**/*.js'])
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('lib'))
})

gulp.task('cleanDist', () => {
  return del(['docs/dist'], {force: true})
})

gulp.task('buildDevDist', ['cleanDist'], () => {
  const options = {
    entries: ['index.js'],
    debug: false,
    basedir: 'src',
    standalone: 'rove'
  }
  return browserify(options)
    .transform(babelify)
    .bundle()
    .pipe(source('rove.dev.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({
      // loads map from browserify file
      loadMaps: true
    }))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('docs/dist'))
})

gulp.task('buildProdDist', ['buildDevDist'], () => {
  const options = {
    entries: ['index.js'],
    debug: false,
    basedir: 'src',
    standalone: 'rove'
  }
  return browserify(options)
    .transform(babelify, {plugins: ['babel-plugin-unassert']})
    .transform(uglifyify)
    .bundle()
    .pipe(source('rove.js'))
    .pipe(gulp.dest('docs/dist'))
})
