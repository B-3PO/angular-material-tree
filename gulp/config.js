var srcPath = 'src/';
var docsDestPath = 'docs/';
var docsSrcPath = 'docsApp/';
var distPath = 'dist/';


exports.paths = {
  src: srcPath,
  docs: docsDestPath,
  docsSrc: docsSrcPath,
  dist: distPath,
  appPartials: docsSrcPath+'**/*.html',
  scripts: [srcPath+'**/*.js'],
  css: [srcPath+'*.scss', srcPath+'*.css', '!'+srcPath+'*spec.css', '!'+srcPath+'*-theme.scss']
};
