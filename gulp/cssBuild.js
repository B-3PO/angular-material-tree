var paths = require('./config').paths;

var gulp = require('gulp');
var gutil = require('gulp-util');
var autoprefixer = require('gulp-autoprefixer');
var concat = require('gulp-concat');
var cssnano = require('gulp-cssnano');
var sass = require('gulp-sass');
var rename = require('gulp-rename');


exports.dev = function () {

  return gulp.src(paths.css)
    .pipe(sass())
    .pipe(autoprefixer())
    .pipe(gulp.dest(paths.docs))
    .on('end', function() {
      gutil.log(gutil.colors.green('✔ CSS Dev'), 'Finished');
    });
}
