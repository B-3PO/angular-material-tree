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
  function controller($scope, $attrs) {
    /*jshint validthis:true*/
    var vm = this;
    var selectionRestictions;
    var branches = {};

    vm.selected = {};
    vm.registerBranch = registerBranch;
    vm.unregisterBranch = unregisterBranch;
    vm.toggleSelect = toggleSelect;
    vm.deselectAll = deselectAll;
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
    }

    function deselectAll() {
      Object.keys(branches).forEach(deselect);
    }

    function select(hashKey, hashedValue) {
      var depth;
      var branch = branches[hashKey];
      if (branch !== undefined) {
        handleSelectionConflicts(branch)
        branch.setSelected(true);
        vm.selected[hashKey] = hashedValue;
      }
    }

    function deselect(hashKey) {
      var branch = branches[hashKey];
      if (branch !== undefined) { branch.setSelected(false); }
      vm.selected[hashKey] = undefined;
      delete vm.selected[hashKey];
    }

    // handle selection restrictions set by `[restrict-selection]` attr
    function handleSelectionConflicts(branch) {
      var restictions = getSelectionRestrictions();
      if (restictions.single) { deselectAll(); }
      var depth = branch.getDepth();
      var conflictingDepths = Object.keys(vm.selected).filter(function (hashKey) {
        return branches[hashKey].getDepth() !== depth;
      });
      if (restictions.depth && conflictingDepths.length) {
        conflictingDepths.forEach(deselect);
      }
    }

    // gets selection restrictions from the `[restrict-selection]` attr and puts it into an object
    function getSelectionRestrictions() {
      if (!selectionRestictions) {
        selectionRestictions = {};
        var attrArr = $attrs.restrictSelection ? $attrs.restrictSelection.split(',').map(function (item) { return item.trim(); }) : [];
        attrArr.forEach(function (key) {
          selectionRestictions[key] = true;
        });
      }
      return selectionRestictions;
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
