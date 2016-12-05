var paths = require('./config').paths;

var gulp = require('gulp');
var through2 = require('through2');
var sass = require('gulp-sass');
var cssnano = require('gulp-cssnano');
var autoprefixer = require('gulp-autoprefixer');
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var wrap = require('gulp-wrap');
var ngConstant = require('gulp-ng-constant');


exports.dev = function () {
  return gulp.src(paths.theme)
    .pipe(sass())
    .pipe(through2.obj(function (file, enc, cb) {
      var config = {
        name: 'angular-material-tree',
        deps: false,
        constants: {
          TREE_THEME: file.contents.toString()
        }
      };
      file.contents = new Buffer(JSON.stringify(config), 'utf-8');
      this.push(file);
      cb();
    }))
    .pipe(ngConstant({wrap: false}))
    .pipe(wrap('(function(){"use strict";<%= contents %>}());'))
    .pipe(rename('_theme.js'))
    .pipe(gulp.dest(paths.docs))
}
