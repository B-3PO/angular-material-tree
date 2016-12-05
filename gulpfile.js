var paths = require('./gulp/config').paths;
var gulp = require('gulp');
var serve = require('gulp-serve');
var del = require('del');
var serve = require('gulp-serve');
var gulpSequence = require('gulp-sequence');

var jsBuild = require('./gulp/jsBuild');
gulp.task('jsDev', jsBuild.dev);

var cssBuild = require('./gulp/cssBuild');
gulp.task('cssDev', cssBuild.dev);

var themeBuild = require('./gulp/theme');
gulp.task('themeDev', themeBuild.dev);

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
    'docsBuild',
    'themeDev'
  ],
  'docsInject'
));


gulp.task('cleanDocs', function () {
  return del(paths.docs);
});

gulp.task('serve', serve({
  root: ['docs'],
  port: 8080
}));


gulp.task('watch', function () {
  gulp.watch(paths.scripts, ['jsDev']);
  gulp.watch(paths.css, ['cssDev']);
  gulp.watch(paths.docsSrc, ['docsBuild']);
  gulp.watch(paths.appPartials, ['docsBuild']);
});
