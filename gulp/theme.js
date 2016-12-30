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
var uglify = require('gulp-uglify');
var gulpFile = require('gulp-file');



module.exports = function injectFile() {
  require('require-sass')();
  return gulpFile('theme.js', wrapper(require('../'+paths.theme)));
};

function wrapper(contents) {
  return 'angular.module("angular-material-tree").constant("TREE_THEME",'+JSON.stringify(contents)+');';
}
