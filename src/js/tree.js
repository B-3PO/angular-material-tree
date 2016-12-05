angular
  .module('angular-material-tree')
  .directive('mdTree', treeDirective);



function treeDirective($mdTheming) {
  return {
    restrict: 'E',
    controller: controller,
    compile: compile
  };

  function compile(tElement, tAttrs) {
    return function postLink(scope, element, attr) {
      $mdTheming(element);
    };
  }

  /*@ngInject*/
  function controller() {
    /*jshint validthis:true*/
    var vm = this;

    vm.registerTemplate = registerTemplate;


    function registerTemplate() {

    }
  }
}
