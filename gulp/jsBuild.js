var paths = require('./config').paths;

var gulp = require('gulp');
var jshint = require('gulp-jshint');
var wrap = require("gulp-wrap");
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var stripDebug = require('gulp-strip-debug');
var rename = require("gulp-rename");
var gutil = require('gulp-util');
var ngAnnotate = require('gulp-ng-annotate');



exports.dev = function () {
  return gulp.src(paths.scripts)
    .pipe(wrap('(function(){"use strict";<%= contents %>}());'))
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(gulp.dest(paths.docs+'angular-material-tree'))
    .on('end', function() {
      gutil.log(gutil.colors.green('✔ JS Dev'), 'Finished');
    });
};

exports.release = function () {
  return gulp.src(paths.scripts)
    .pipe(wrap('(function(){"use strict";<%= contents %>}());'))
    .pipe(ngAnnotate())
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(concat('angular-material-tree.js'))
    .pipe(stripDebug())
    .pipe(gulp.dest(paths.dist))
    .pipe(uglify())
    .pipe(rename('angular-material-tree.min.js'))
    .pipe(gulp.dest(paths.dist))
    .on('end', function() {
      gutil.log(gutil.colors.green('✔ JS Dev'), 'Finished');
    });
};
