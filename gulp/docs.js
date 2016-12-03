var gulp = require('gulp');
var gutil = require('gulp-util');
var inject = require('gulp-inject');
var sass = require('gulp-sass');
var paths = require('./config').paths;
var stream = require('merge-stream');


exports.build = function () {
  var srcJS = gulp.src([paths.docsSrc+'**/*.js'])
    .pipe(gulp.dest(paths.docs));

  var srcSCSS = gulp.src([paths.docsSrc+'**/*.scss', paths.docsSrc+'**/*.css'])
    .pipe(sass())
    .pipe(gulp.dest(paths.docs));

  var srcHTML = gulp.src([paths.docsSrc+'**/*.html', '!'+paths.docsSrc+'index.html'])
    .pipe(gulp.dest(paths.docs));

  var stream2 = gulp.src('./bower_components/**/*.js')
    .pipe(gulp.dest(paths.docs+'bower_components/'));

  return stream(srcJS, srcSCSS, srcHTML, stream2);
}


exports.inject = function () {
  var component = gulp.src(paths.docs + 'angular-material-tree/**/*.js', {read: false});
  var scripts = gulp.src([paths.docs + '**/*.js', '!'+paths.docs + 'angular-material-tree/**', '!'+paths.docs + 'bower_components/**'], {read: false});
  var css = gulp.src(paths.docs+'**/*.css', {read: false});

  return gulp.src(paths.docsSrc+'index.html')
    .pipe(gulp.dest(paths.docs))
    .on('end', function () {
      return gulp.src(paths.docs + 'index.html')
        .pipe(inject(css, {
          name: 'css',
          relative: true
        }))
        .pipe(inject(component, {
          name: 'component',
          relative: true
        }))
        .pipe(inject(scripts, {
          name: 'scripts',
          relative: true
        }))
        .pipe(gulp.dest(paths.docs));
    });

  // return gulp.src(paths.docs + 'index.html')
  //   .pipe(inject(css, {
  //     name: 'css',
  //     relative: true
  //   }))
  //   .pipe(inject(component, {
  //     name: 'component',
  //     relative: true
  //   }))
  //   .pipe(inject(scripts, {
  //     name: 'scripts',
  //     relative: true
  //   }))
  //   .pipe(gulp.dest(paths.docs));
}
