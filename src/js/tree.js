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
  function controller($scope, $attrs, $element, $mdUtil, $animateCss) {
    /*jshint validthis:true*/
    var vm = this;
    var selectionRestictions;
    var branches = {};

    vm.selected = {};
    vm.opened = {};
    // vm.toggleSelect = toggleSelect;
    // vm.deselectAll = deselectAll;
    vm.init = init;
    // vm.hashGetter = hashGetter;

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


      $element.on('click', handleClicks);

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

    function toggleSelect(isSelected, hashKey, hashValue) {
      if (!isSelected) {
        select(hashKey, hashValue);
      } else {
        deselect(hashKey);
      }
      refreshViewValue();
    }
    function select(hashKey, hashValue) {
      // TODO  handleSelectionConflicts(hashKey);
      vm.selected[hashKey] = hashValue;
    }
    function deselect(hashKey) {
      delete vm.selected[hashKey];
    }
    function deselectAll() {
      Object.keys(vm.selected).forEach(deselect);
      Array.prototype.slice.call($element[0].querySelectorAll('md-branch[selected]')).forEach(function (el) {
        el.removeAttribute('selected');
      });
    }

    function toggleOpen(hashKey, hashValue, branchElement) {
      var isOpen = !vm.opened[hashKey];
      if (isOpen) {
        vm.opened[hashKey] = hashValue;
        hashValue.$$isOpen = true;
        open(branchElement);
      } else {
        delete vm.opened[hashKey];
        hashValue.$$isOpen = false;
        close(branchElement);
      }
    }

    function open(branchElement) {
      if (!branchElement) { return; }

      var element = angular.element(branchElement);
      var scope = element.scope();
      $mdUtil.reconnectScope(scope);
      scope.isOpen = true;
      scope.startWatching();

      $mdUtil.nextTick(function () {
        var container = angular.element(element[0].querySelector('.md-branch-container'));
        element.addClass('md-open');
        container.addClass('md-overflow md-show');

        $animateCss(container, {
          from: {'max-height': '0px', opacity: 0},
          to: {'max-height': getHeight(element), opacity: 1}
        })
        .start()
        .then(function () {
          container.css('max-height', 'none');
          container.removeClass('md-overflow md-show');
        });
      });
    }

    function close(branchElement) {
      if (!branchElement) { return; }

      var element = angular.element(branchElement);
      var scope = element.scope();
      scope.isOpen = false;
      scope.killWatching();

      $mdUtil.nextTick(function () {
        var container = angular.element(element[0].querySelector('.md-branch-container'));
        element.removeClass('md-open');
        container.addClass('md-overflow md-hide');
        $animateCss(container, {
          from: {'max-height': getHeight(element), opacity: 1},
          to: {'max-height': '0px', opacity: 0}
        })
        .start()
        .then(function () {
          container.removeClass('md-overflow md-hide');
          $mdUtil.disconnectScope(scope);
        });
      });
    }

    function getHeight(element) {
      return element[0].scrollHeight + 'px';
    }

    // handle selection restrictions set by `[restrict-selection]` attr
    // TODO how do i invoke this if there is no controller to call
    // could add $$depth to data
    function handleSelectionConflicts() {
      var restictions = getSelectionRestrictions();
      if (restictions.single) { deselectAll(); }
      // var depth = getDepth(hashKey);
      var conflictingDepths = Object.keys(vm.selected).filter(function (_hashKey) {
        return branches[_hashKey].getDepth() !== depth;
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



    // -- Clicks --

    function handleClicks(e) {
      var closest = getClosest(e.target); // closest clickable element (arrow, checkbox, branch)
      var branch = getBranch(closest);
      if (!branch) { return; };
      var branchScope = angular.element(branch).scope();
      var item = branchScope[branchScope.repeatName];

      // toggle branch
      if (isArrow(closest)) {
        toggleBranchClick(e, item, branch);
        return;
      }

      if (isSelectOn(branch)) {
        var _isSelected = isSelected(branch);
        var item = branchScope[branchScope.repeatName];

        if (!isCheckbox(closest)) {
          if (Object.keys(vm.selected).length > 1) { _isSelected = false; }
          deselectAll();
        }

        if (_isSelected) {
          branch.removeAttribute('selected');
        } else {
          branch.setAttribute('selected', 'selected');
        }
        item.$$selected = !item.$$selected;
        toggleSelect(_isSelected, hashGetter(item), item);
        e.stopPropagation();
      } else {
        toggleBranchClick(e, item, branch);
      }
    }

    // set open state
    function toggleBranchClick(e, branchItem, branchElement) {
      toggleOpen(hashGetter(branchItem), branchItem, branchElement);
      e.stopPropagation();
    }

    function getClosest(el) {
      if (valid(el)) { return el; }
      var parent = el.parentNode;
      while (parent && parent !== document.body) {
        if (valid(parent)) { return parent; }
        parent = parent.parentNode;
      }
      return null;

      function valid(el) {
        return el.nodeName === 'MD-BRANCH' || el.classList.contains('md-branch-icon-container') || el.classList.contains('checkbox-container');
      }
    }

    function getBranch(el) {
      if (!el) { return null; }
      if (el.nodeName === 'MD-BRANCH') { return el; }
      var parent = el.parentNode;
      while (parent && parent !== document.body) {
        if (parent.nodeName === 'MD-BRANCH') { return parent; }
        parent = parent.parentNode;
      }
      return null;
    }

    function isArrow(el) {
      return el.classList.contains('md-branch-icon-container');
    }

    function isSelectOn(el) {
      return el.hasAttribute('select');
    }

    function isSelected(el) {
      return el.hasAttribute('selected');
    }

    function isCheckbox(el) {
      return el.classList.contains('checkbox-container');
    }
  }
}
