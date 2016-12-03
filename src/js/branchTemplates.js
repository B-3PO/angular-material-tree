angular
  .module('angular-material-tree')
  .directive('mdBranchTemplates', branchTemplateDirective);



function branchTemplateDirective() {
  return {
    restrict: 'E',
    require: '^mdTree',
    link: link
  };


  function link(scope, element, attrs, ctrl) {

  }
}
