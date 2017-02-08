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
  function controller($scope, $attrs, $element, $mdUtil, $$mdTree) {
    /*jshint validthis:true*/
    var vm = this;
    var selectionRestictions;

    vm.selected = {};
    vm.opened = {};
    vm.init = init;

    // setup ngModel and make it available to controller
    function init(ngModel, binding) {
      vm.ngModel = ngModel;
      vm.ngModel.$validators['md-multiple'] = validateArray;
      vm.ngModel.$render = modelRender;


      // watch ng model
      $scope.$watchCollection(binding, function(value) {
        if (validateArray(value)) { modelRender(value); }
      });

      // handle all click interactions for the tree
      $element.on('click', handleClicks);

      function validateArray(modelValue, viewValue) {
        return Array.isArray(modelValue || viewValue || []);
      }
    }

    // ngmodel renderer
    function modelRender() {
      var newSelectedValues = vm.ngModel.$modelValue || vm.ngModel.$viewValue || [];
      if (!Array.isArray(newSelectedValues)) { return; }

      var oldSelected = Object.keys(vm.selected); // current selectiom, before change
      var newSelectedHashes = newSelectedValues.map(hashGetter); // new selections from ngModel
      var deselected = oldSelected.filter(function(hash) {
        return newSelectedHashes.indexOf(hash) === -1;
      });

      // deselect items that are no longer in ngModel
      deselected.forEach(deselect);
      // select all in ngModel arr
      newSelectedHashes.forEach(function (hashKey, i) {
        select(hashKey, newSelectedValues[i]);
      });
    }


    // get or set hashkey on data object
    function hashGetter(value) {
      if (typeof value === 'object' && value !== null) {
        return 'object_' + (value.$$mdBranchId || (value.$$mdBranchId = ++branchNextId));
      }
      return value;
    }

    // toggle selection and refesh ngModel
    function toggleSelect(isSelected, hashKey, hashValue, element) {
      if (!isSelected) {
        select(hashKey, hashValue, element);
      } else {
        deselect(hashKey, element);
      }
      refreshViewValue();
    }
    function select(hashKey, hashValue, element) {
      handleSelectionConflicts(hashKey, hashValue, element);
      vm.selected[hashKey] = hashValue;
    }
    function deselect(hashKey, element) {
      delete vm.selected[hashKey];
    }

    // delselect all and update elements
    function deselectAll() {
      Object.keys(vm.selected).forEach(deselect);
      Array.prototype.slice.call($element[0].querySelectorAll('md-branch[selected]')).forEach(function (el) {
        el.removeAttribute('selected');
      });
    }

    // set open state of branch and run animations
    function toggleOpen(hashKey, hashValue, branchElement) {
      var isOpen = !vm.opened[hashKey];
      if (isOpen) {
        vm.opened[hashKey] = hashValue;
        hashValue.$$isOpen = true;
        $$mdTree.open(branchElement); // animate open
      } else {
        delete vm.opened[hashKey];
        hashValue.$$isOpen = false;
        $$mdTree.close(branchElement); // animate closed
      }
    }


    // handle selection restrictions set by `[restrict-selection]` attr
    function handleSelectionConflicts(hashKey, hashValue, element) {
      var restictions = getSelectionRestrictions();
      if (restictions.single) { deselectAll(); }
      var depth = hashValue.$$depth;

      if (restictions.depth) {
        // list of items that do not have the same depth as last selected item
        var conflictingDepths = Object.keys(vm.selected).filter(function (_hashKey) {
          return vm.selected[_hashKey].$$depth !== depth;
        });

        if (conflictingDepths.length) {
          // TODO make reference between item and element so we can optimize rendering
          // currently I am assuming that only one item is clicked at a time
          deselectAll();
          vm.selected[hashKey] = hashValue; // add targeted item
          refreshViewValue();
          element.setAttribute('selected', ''); // updated tageted element
        }
      }
    }

    // gets selection restrictions from the `[restrict-selection]` attr and puts it into an object
    // ```html
    // <md-tree restrict-selection="depth"></md-tree>
    // <md-tree restrict-selection="single"></md-tree>
    // ```
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


    // refresh ngModel
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



    // -- Clicks --

    function handleClicks(e) {
      var closest = getClosest(e.target); // closest clickable element (arrow, checkbox, branch)
      var branch = $$mdTree.getBranch(closest); // branch element
      if (!branch) { return; } // do not proceed if element is not inside a branch

      var branchScope = angular.element(branch).scope();
      var item = branchScope[branchScope.repeatName]; // ngModel data

      // toggle branch
      if ($$mdTree.isArrow(closest)) {
        toggleBranchClick(e, item, branch);
        return;
      }

      if ($$mdTree.isSelectOn(branch)) {
        var _isSelected = $$mdTree.isSelected(branch);
        item = branchScope[branchScope.repeatName];

        // set element select state
        if ($$mdTree.isShiftPressed()) {
          rangeSelect(branch);
        } else {
          // if selectable and not clicked on checkbox then deselct all
          if (!$$mdTree.isCheckbox(closest)) {
            if (Object.keys(vm.selected).length > 1) { _isSelected = false; }
            deselectAll();
          }

          if (_isSelected) {
            branch.removeAttribute('selected');
          } else {
            branch.setAttribute('selected', 'selected');
          }
        }
        item.$$selected = !item.$$selected;
        toggleSelect(_isSelected, hashGetter(item), item, branch);
        e.stopPropagation();
      } else {
        toggleBranchClick(e, item, branch);
      }
    }

    // TODO this currently will only work visually, needs to set model data
    // TODO make this work across all lbranches with the same depth
    // NOTE may want to add selection memory so we can select from last selection
    // Currentl we select from top if possible then from bottom
    function rangeSelect(branchElement) {
      var siblings = [];
      var foundSelected = false;
      // var foundTargeted = false;
      var branches = Array.prototype.slice.call(branchElement.parentNode.children).filter(function (el) {
        return el.nodeName === 'MD-BRANCH';
      });

      // select down
      var i = 0;
      var end = branches.indexOf(branchElement);
      while (i < end) {
        if (!foundSelected && branches[i].hasAttribute('selected')) { foundSelected = true; }
        if (foundSelected) { siblings.push(branches[i]); }
        i += 1;
      }

      // select up
      if (!foundSelected) {
        i = end+1;
        end = branches.length;
        while (i < end) {
          siblings.push(branches[i]);
          if (!foundSelected && branches[i].hasAttribute('selected')) { foundSelected = true; }
          i += 1;
        }
      }

      deselectAll();
      if (foundSelected) {
        siblings.forEach(function (el) {
          el.setAttribute('selected', 'selected');
        });
      }
      branchElement.setAttribute('selected', 'selected');
    }

    // set open state
    function toggleBranchClick(e, branchItem, branchElement) {
      toggleOpen(hashGetter(branchItem), branchItem, branchElement);
      e.stopPropagation();
    }


    // find closest clickable element
    function getClosest(el) {
      if (valid(el)) { return el; }
      var parent = el.parentNode;
      while (parent && parent !== document.body) {
        if (valid(parent)) { return parent; }
        parent = parent.parentNode;
      }
      return null;

      function valid(el) {
        return el.nodeName === 'MD-BRANCH' || $$mdTree.isArrow(el) || $$mdTree.isCheckbox(el);
      }
    }
  }
}
