/**
 * @ngdoc module
 * @name angular-material-tree
 *
 * @description
 * Expander Component
 */
angular
  .module('angular-material-tree', ['material.core.theming'])
  .config(mdTreeTheme);

/*@ngInject*/
function mdTreeTheme($mdThemingProvider, TREE_THEME) {
  // register theme styles
  $mdThemingProvider.registerStyles(TREE_THEME);
}
