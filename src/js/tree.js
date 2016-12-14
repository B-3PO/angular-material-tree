angular
  .module('angular-material-tree')
  .directive('mdTree', treeDirective);


var branchNextId = 0;
function treeDirective($mdTheming, $mdUtil) {
  return {
    restrict: 'E',
    require: ['mdTree', '?ngModel'],
    compile: compile,
    controller: controller,
    controllerAs: 'mdTree'
  };

  function compile(tElement, tAttrs) {
    return function postLink(scope, element, attr, ctrls) {
      $mdTheming(element);

      // make ngModel available to controller
      var ngModelCtrl = ctrls[1];

      // create fake ngModel so code runs as normal when no model is provided
      if (!ngModelCtrl) {
        ngModelCtrl = $mdUtil.fakeNgModel();
        ngModelCtrl.$validators = []; //$mdUtil.fakeNgModel is missing `$validators`
      }
      ctrls[0].init(ngModelCtrl, attr.ngModel);
    };
  }

  /*@ngInject*/
  function controller($scope) {
    /*jshint validthis:true*/
    var vm = this;
    var branches = {};

    vm.selected = {};
    vm.registerBranch = registerBranch;
    vm.unregisterBranch = unregisterBranch;
    vm.toggleSelect = toggleSelect;
    vm.init = init;
    vm.hashGetter = hashGetter;

    // setup ngModel and make it available to controller
    function init(ngModel, binding) {
      vm.ngModel = ngModel;
      vm.ngModel.$validators['md-multiple'] = validateArray;
      vm.ngModel.$render = modelRender;

      $scope.$watchCollection(binding, function(value) {
        if (validateArray(value)) { modelRender(value); }
      });

      ngModel.$isEmpty = function(value) {
        return !value || value.length === 0;
      };

      function validateArray(modelValue, viewValue) {
        return angular.isArray(modelValue || viewValue || []);
      }
    }

    // ngmodel renderer
    function modelRender() {
      var newSelectedValues = vm.ngModel.$modelValue || vm.ngModel.$viewValue || [];
      if (!angular.isArray(newSelectedValues)) { return; }

      var oldSelected = Object.keys(vm.selected);
      var newSelectedHashes = newSelectedValues.map(hashGetter);
      var deselected = oldSelected.filter(function(hash) {
        return newSelectedHashes.indexOf(hash) === -1;
      });

      deselected.forEach(deselect);
      newSelectedHashes.forEach(function (hashKey, i) {
        select(hashKey, newSelectedValues[i]);
      });
    }

    function hashGetter(value) {
      if (typeof value === 'object' && value !== null) {
        return 'object_' + (value.$$mdBranchId || (value.$$mdBranchId = ++branchNextId));
      }
      return value;
    }


    function registerBranch(hashKey, ctrl) {
      if (branches[hashKey] !== undefined) {
        console.warn('This branch was already registered, ignoring.');
        return;
      }
      branches[hashKey] = ctrl;
    }

    function unregisterBranch(hashKey) {
      if (branches[branch] === undefined) { return; }
      branches[branch] = undefined;
      delete branches[branch];
    }

    function toggleSelect(selected, hashKey, value) {
      if (selected) {
        select(hashKey, value);
      } else {
        deselect(hashKey);
      }
      refreshViewValue();
    }


    function select(hashKey, hashedValue) {
      var branch = branches[hashKey];
      if (branch !== undefined) { branch.setSelected(true); }
      vm.selected[hashKey] = hashedValue;
    }

    function deselect(hashKey) {
      var branch = branches[hashKey];
      if (branch !== undefined) { branch.setSelected(false); }
      vm.selected[hashKey] = undefined;
      delete vm.selected[hashKey];
    }

    function refreshViewValue() {
      var branchValue;
      var newValue;
      var prevValue;
      var values = [];
      var hashKeys = Object.keys(vm.selected);
      var hashKey = hashKeys.pop();

      while (hashKey !== undefined) {
        branchValue = vm.selected[hashKey];
        if (branchValue) {
          values.push(branchValue);
        }

        hashKey = hashKeys.pop();
      }

      newValue = values;
      prevValue = vm.ngModel.$modelValue;
      if (prevValue !== newValue) {
        vm.ngModel.$setViewValue(newValue);
        vm.ngModel.$render();
      }
    }
  }
}
