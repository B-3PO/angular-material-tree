angular
  .module('angular-material-tree')
  .directive('mdTree', treeDirective);



function treeDirective() {
  return {
    restrict: 'E',
    controller: controller
  };

  /*@ngInject*/
  function controller() {
    /*jshint validthis:true*/
    var vm = this;

    vm.registerTemplate = registerTemplate;


    function registerTemplate() {

    }
  }
}
