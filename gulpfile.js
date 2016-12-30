var paths = require('./gulp/config').paths;
var gulp = require('gulp');
var serve = require('gulp-serve');
var del = require('del');
var serve = require('gulp-serve');
var gulpSequence = require('gulp-sequence');
var bump = require('gulp-bump');

var jsBuild = require('./gulp/jsBuild');
gulp.task('jsDev', jsBuild.dev);
gulp.task('jsRelease', jsBuild.release);

var cssBuild = require('./gulp/cssBuild');
gulp.task('cssDev', cssBuild.dev);
gulp.task('cssRelease', cssBuild.release);

var docs = require('./gulp/docs');
gulp.task('docsBuild', docs.build);
gulp.task('docsInject', docs.inject);



// --- main tasks. use these to watch and build and release ---

gulp.task('default', gulpSequence('buildLocal', ['serve', 'watch']));
gulp.task('buildLocal', gulpSequence(
  'cleanDocs',
  [
    'jsDev',
    'cssDev',
    'docsBuild'
  ],
  'docsInject'
));

gulp.task('release', gulpSequence(
  'cleanDist',
  [
    'jsRelease',
    'cssRelease'
  ]
));


gulp.task('cleanDocs', function () {
  return del(paths.docs);
});

gulp.task('cleanDist', function () {
  return del(paths.dist);
});

gulp.task('serve', serve({
  root: ['docs'],
  port: 8080
}));


gulp.task('watch', function () {
  gulp.watch(paths.scripts, ['jsDev']);
  gulp.watch(paths.css, ['cssDev']);
  gulp.watch(paths.docsSrc+'**/*', ['docsBuild']);
  gulp.watch(paths.appPartials, ['docsBuild']);
});

gulp.task('major', function(){
  gulp.src(['./bower.json', './package.json'])
  .pipe(bump({type:'major'}))
  .pipe(gulp.dest('./'));
});

gulp.task('minor', function(){
  gulp.src(['./bower.json', './package.json'])
  .pipe(bump({type:'minor'}))
  .pipe(gulp.dest('./'));
});

gulp.task('patch', function(){
  gulp.src(['./bower.json', './package.json'])
  .pipe(bump({type:'patch'}))
  .pipe(gulp.dest('./'));
});

gulp.task('prerelease', function(){
  gulp.src(['./bower.json', './package.json'])
  .pipe(bump({type:'prerelease'}))
  .pipe(gulp.dest('./'));
});
