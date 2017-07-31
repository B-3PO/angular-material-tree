(function(){"use strict";/**
 * @ngdoc module
 * @name angular-material-tree
 *
 * @description
 * Expander Component
 */
mdTreeTheme.$inject = ["$mdThemingProvider", "TREE_THEME"];
angular
  .module('angular-material-tree', ['material.core.theming'])
  .config(mdTreeTheme);

/*@ngInject*/
function mdTreeTheme($mdThemingProvider, TREE_THEME) {
  // register theme styles
  $mdThemingProvider.registerStyles(TREE_THEME);
}
}());
(function(){"use strict";angular.module("angular-material-tree").constant("TREE_THEME","md-branch.md-THEME_NAME-theme .md-branch-icon svg{fill:'{{foreground-2}}'}md-branch.md-THEME_NAME-theme.md-open:not(.md-tip)>.md-branch-inner{border-bottom-color:'{{foreground-4}}'}md-branch.md-THEME_NAME-theme.md-2-line .md-branch-text h3,md-branch.md-THEME_NAME-theme.md-2-line .md-branch-text h4,md-branch.md-THEME_NAME-theme.md-3-line .md-branch-text h3,md-branch.md-THEME_NAME-theme.md-3-line .md-branch-text h4{color:'{{foreground-1}}'}md-branch.md-THEME_NAME-theme.md-2-line .md-branch-text p,md-branch.md-THEME_NAME-theme.md-3-line .md-branch-text p{color:'{{foreground-2}}'}md-branch.md-THEME_NAME-theme.md-checkbox-enabled .checkbox-icon{border-color:'{{foreground-2}}'}md-branch.md-THEME_NAME-theme.md-checkbox-enabled[selected]>.md-branch-inner .checkbox-icon{border-color:'{{foreground-2}}';background-color:'{{primary-color-0.87}}'}md-branch.md-THEME_NAME-theme.md-checkbox-enabled[selected]>.md-branch-inner .checkbox-icon:after{border-color:'{{primary-contrast-0.87}}'}md-branch.md-THEME_NAME-theme:not([disabled]) .md-branch-inner{background-color:'{{background-hue-1}}'}md-branch.md-THEME_NAME-theme:not([disabled]) .md-branch-inner:hover{background-color:'{{background-500-0.2}}'}md-branch.md-THEME_NAME-theme:not([disabled]) .md-branch-inner.md-icon-button:hover{background-color:transparent}md-branch.md-THEME_NAME-theme:not([disabled]).md-focused{outline:none}md-branch.md-THEME_NAME-theme:not([disabled]).md-focused>.md-branch-inner{background-color:'{{background-100}}'}md-branch.md-THEME_NAME-theme:not([disabled]).md-select-highlight-enabled[selected]>.md-branch-inner{background-color:'{{primary-color-0.12}}'}\n");}());
(function(){"use strict";// TODO Add key controls
//      * Enter: Shoudl select happen if branch is deepest descendent?
//      * Shift+Enter: multiple select

// TODO add third state to checkbox to show children selected

branchDirective.$inject = ["$parse", "$document", "$mdUtil", "$filter", "$$mdTree", "$mdConstant"];
angular
  .module('angular-material-tree')
  .directive('mdBranch', branchDirective);


// checkbox html
var CHECKBOX_SELECTION_INDICATOR = angular.element('<div class="checkbox-container"><div class="checkbox-icon"></div></div>');
// branch arrow icon svg
var BRANCH_ARROW_TEMPLATE = angular.element('<div class="md-branch-icon-container">'+
  '<div class="md-branch-icon">'+
    '<svg fill="#000000" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">'+
      '<path d="M8.59 16.34l4.58-4.59-4.58-4.59L10 5.75l6 6-6 6z"/>'+
      '<path d="M0-.25h24v24H0z" fill="none"/>'+
    '</svg>'+
  '</div>'+
'</div>');

/*@ngInject*/
function branchDirective($parse, $document, $mdUtil, $filter, $$mdTree, $mdConstant) {
  var treeElement;

  return {
    restrict: 'E',
    priority: 1000,
    terminal: true,
    transclude: 'element',
    compile: compile
  };


  function compile(tElement, tAttrs) {
    var expression = tAttrs.branchRepeat;
    var match = expression.match(/^\s*([\s\S]+?)\s+in\s+([\s\S]+?)\s*$/);
    var repeatName = match[1];
    var repeatListExpression = $parse(match[2]);
    var parentNode = tElement[0].parentNode;
    var isRoot = parentNode.nodeName === 'MD-TREE';
    var hasParentBranch = parentNode.nodeName === 'MD-BRANCH';
    var isOpen = isRoot || (hasParentBranch && parentNode.classList.contains('md-open'));

    return function postLink(scope, element, attrs, ctrls, transclude) {
      var dataWatcher;
      var items;
      var oldItems;
      var keyCodes = $mdConstant.KEY_CODE;
      var blocks = [];
      var pooledBlocks = [];
      var itemsLength = 0;
      var isUpdating = false;
      var isFilterOpen = false;
      var filter = $filter('filter');
      if (isOpen) { startWatching(); }

      scope.$mdBranchFilter = function (arr, filterValue) {
        var filtered = filter(arr, filterValue);
        // open branches if filter string is greater then 2 and items have been found
        if (filtered.length < arr.length && filtered.length > 0) {
          isFilterOpen = true;
          blocks.forEach(function (block) {
            $$mdTree.filterOpen(block);
          });

        // close branches if filter is less than 3 characters or no items have been found
        } else if (isFilterOpen && filtered.length === 0) {
          isFilterOpen = false;
          blocks.forEach(function (block) {
            $$mdTree.filterClose(block);
          });
        }

        return filtered;
      };


      // watch model data
      function startWatching() {
        if (dataWatcher) { return; }
        dataWatcher = scope.$watchCollection(repeatListExpression, updateBranch);
      }
      // kill watcher
      function killWatching() {
        if (typeof dataWatcher === 'function') {
          dataWatcher();
          dataWatcher = undefined;
        }
      }

      // expose methods to scope
      scope.startWatching = startWatching;
      scope.killWatching = killWatching;


      function updateBranch(newItems, old) {
        if (isUpdating) { return; }
        oldItems = old;
        isUpdating = true;

        var i;
        var _block;
        var keys;
        var index;
        var length;
        var maxIndex;
        var newBlocks = [];
        var _itemsLength = newItems && newItems.length || 0;

        if (_itemsLength !== itemsLength) {
          itemsLength = _itemsLength;
        }
        items = newItems;


        // Detach and pool any blocks that are no longer in the viewport.
        keys = Object.keys(blocks);
        i = 0;
        length = keys.length;
        while (i < length) {
          index = parseInt(keys[i]);
          if (index >= itemsLength) {
            poolBlock(index);
          }
          i += 1;
        }

        // Update blocks that are already rendered.
        i = 0;
        while ((blocks[i] !== null && blocks[i] !== undefined)) {
          updateBlock(blocks[i], i);
          i += 1;
        }
        maxIndex = i - 1;

        // Collect blocks at the end.
        while (i < itemsLength) {
          _block = getBlock(i);
          updateBlock(_block, i);
          newBlocks.push(_block);
          i += 1;
        }

        // Attach collected blocks to the document.
        if (newBlocks.length) {
          element[0].parentNode.insertBefore(
            domFragmentFromBlocks(newBlocks),
            blocks[maxIndex] && blocks[maxIndex].element[0].nextSibling);
        }

        isUpdating = false;
      }


      // store block in memory and remove it from the dom.
      function poolBlock(index) {
        blocks[index].element
          .off('blur', onBlur)
          .off('focus', onFocus);
        pooledBlocks.unshift(blocks[index]);
        blocks[index].element[0].parentNode.removeChild(blocks[index].element[0]);
        delete blocks[index];
      }

      // update block scope and state
      function updateBlock(block, index) {
        blocks[index] = block;

        if (block.new) { updateNewBlock(block); } // configure template for new blocks
        if (!block.new && (block.scope.$index === index && block.scope[repeatName] === items[index])) {
          updateState(block.scope,  index); // update state if a block is nore or changes
          return;
        }
        block.new = false;

        // Update and digest the block's scope.
        updateScope(block.scope, index);
        updateState(block.scope,  index);

        if (!scope.$root.$$phase) {
          block.scope.$digest();
        }
      }


      // NOTE Might cause problems when applying a new scope
      // place contents into containers to display items correctly
      // this is only done once
      function updateNewBlock(block) {
        var isSelectable = block.element.attr('select') !== undefined;
        var hideCheckbox = block.element.attr('hide-checkbox') !== undefined;
        var innerContainer = angular.element('<div class="md-branch-inner">'); // branch contents
        var branchContainer = angular.element('<div class="md-branch-container">'); // nested branched

        if (isSelectable) {
          if (!hideCheckbox) {
            block.element.addClass('md-checkbox-enabled');
            innerContainer.append(CHECKBOX_SELECTION_INDICATOR.clone());
          } else {
            block.element.addClass('md-select-highlight-enabled');
          }
        }
        Array.prototype.slice.call(block.element[0].childNodes).forEach(function (node) {
          if (node.nodeType === 8 && node.nodeValue.trim() === 'mdBranch:') {
            branchContainer.append(node);
          } else {
            innerContainer.append(node);
          }
        });
        block.element.append(innerContainer);

        // add branches
        if (branchContainer[0].childNodes.length) {
          innerContainer.prepend(BRANCH_ARROW_TEMPLATE.clone());
          block.element.append(branchContainer);

        // if no more branches then mark as tip
        } else {
          block.element.addClass('md-tip no-arrow');
        }
      }

      // Change the model value attached to the scope
      function updateScope($scope, index) {
        $scope.$index = index; // data index
        $scope.repeatName = repeatName; // data property
        $scope[repeatName] = items && items[index]; // data
        $scope.$odd = !($scope.$even = (index & 1) === 0);
        $scope.$depth = ($scope.$parent.$depth + 1) || 0;
        items[index].$$depth = $scope.$depth;
      }


      // upate open state
      // disconnect/reconnect scopes
      // start watching for open items
      function updateState($scope, index) {
        var item = items ? items[index] : undefined;
        var element = $scope.$element && $scope.$element[0] ? $scope.$element : undefined;

        // if the data is replaced and we loose the protected state properties then we need to copy them across
        if (item.$$mdBranchId === undefined) {
          var oldItem = oldItems[index];
          if (oldItem && oldItem.id === item.id ) {
            item.$$mdBranchId = oldItem.$$mdBranchId;
            item.$$selected = oldItem.$$selected;
            Object.defineProperty(item, '$$isOpen', {
              value: oldItem.$$isOpen,
              enumerable: false, writable: true, configurable: false
            });
          }
        }

        // reconnect all scopes
        $mdUtil.reconnectScope($scope);
        element.toggleClass('md-open', item.$$isOpen);

        // wait till next digest to change state so we do not get into an ifinite loop
        $mdUtil.nextTick(function () {
          // if open then watch the data
          if (item.$$isOpen) {
            $scope.startWatching();

          // sconnect scopes that are closed
          } else {
            $mdUtil.disconnectScope($scope);
          }
        });
      }

      // set initial state on data
      function initState(item) {
        if (item.$$isOpen === undefined) {
          Object.defineProperty(item, '$$isOpen', {
            value: false,
            configurable: false,
            enumerable: false,
            writable: true
          });
        }
      }

      // check pool for block
      // otherwise create a new block
      function getBlock(index) {
        if (pooledBlocks.length) {
          return pooledBlocks.pop();
        }

        // create new bloc
        var block;
        transclude(function(clone, scope) {
          block = {
            element: clone,
            new: true,
            scope: scope
          };

          updateScope(scope, index);
          initState(items[index]);
          scope.$element = clone; // attach element to scope so it can be accessed in controller
          parentNode.appendChild(clone[0]);
          scope.$on('$destroy', function () {
            clone
              .off('blur', onBlur)
              .off('focus', onFocus);
          });
        });
        return block;
      }

      // add blocks to one fragment for better performance
      function domFragmentFromBlocks(blocks) {
        var fragment = $document[0].createDocumentFragment();
        blocks.forEach(function(block) {
          fragment.appendChild(block.element[0]);
          block.element.attr('tabindex', '0');
          block.element
            .on('blur', onBlur)
            .on('focus', onFocus);
        });
        return fragment;
      }


      function onBlur(e) {
        angular.element(e.target)
          .removeClass('md-focused')
          .off('keydown', onKeydown);
      }

      function onFocus(e) {
        angular.element(e.target)
          .addClass('md-focused')
          .on('keydown', onKeydown);
      }

      function onKeydown(e) {
        switch (e.keyCode) {
          case keyCodes.UP_ARROW:
            return focusPrevious(e.target);
          case keyCodes.DOWN_ARROW:
            return focusNext(e.target);
          case keyCodes.RIGHT_ARROW:
            return openNextBranch(e.target);
          case keyCodes.LEFT_ARROW:
            return closePrevBranch(e.target);
          case $$mdTree.isShiftPressed() && keyCodes.SPACE:
          case $$mdTree.isShiftPressed() && keyCodes.ENTER:
            return selectBranch(e.target, false);
          case keyCodes.SPACE:
          case keyCodes.ENTER:
            return handleEnter(e.target);
        }
      }

      // recusivly find next branch
      function focusNext(branchElement) {
        branchElement = angular.element(branchElement);
        var next;
        var branchContainer = branchElement[0].querySelector('.md-branch-container');
        if (branchElement.hasClass('md-open') && branchContainer) {
          // find nearest child branch
          Array.prototype.slice.call(branchContainer.children).every(function (el) {
            if (el.nodeName === 'MD-BRANCH') { next = angular.element(el); }
            return !next;
          });

          // if no child branches are found try to get next branch
          if (!next) { next = branchElement.next(); }
        } else {
          next = branchElement.next();
        }

        // recursively find next branch
        if (!next || !next.length) { next = findNext(branchElement); }
        if (next && next.length) { next.focus(); }
      }

      // recusivly find previous branch
      function focusPrevious(branchElement) {
        branchElement = angular.element(branchElement);
        var previous = branchElement[0].previousElementSibling;

        // if no previous branch exists then step out to next highest layer
        if (!previous) {
          previous = $$mdTree.getBranch(branchElement[0].parentNode);

        // if found then find the deepest and lowest sub branch
        } else {
          previous = findDeepest(previous);
        }

        // focus on element
        if (previous) { angular.element(previous).focus(); }
      }

      // keep stepping out and look for next branch that we can focus on
      function findNext(el) {
        var branch = $$mdTree.getBranch(el[0].parentNode);
        if (!branch) { return null; }
        var next = angular.element(branch).next();
        if (next && next.length) { return next; }
        return findNext(angular.element(branch));
      }

      function findDeepest(el) {
        var next;
        if (!el || el.nodeName !== 'MD-BRANCH') { return null; }
        if ($$mdTree.isOpen(el)) {
          var branchContainer = el.querySelector('.md-branch-container');
          if (branchContainer) {
            Array.prototype.slice.call(branchContainer.children).reverse().every(function (el) {
              if (el.nodeName === 'MD-BRANCH') { next = el; }
              return !next;
            });
            if (next) { return findDeepest(next); }
          }
        }
        return el;
      }

      // open branch or select next
      function openNextBranch(branchElement) {
        if (!$$mdTree.isOpen(branchElement)) {
          var arrow = $$mdTree.getArrow(branchElement);
          if (arrow && !$$mdTree.isTip(branchElement)) {
            // open branch by simulating click
            getTreeElement(branchElement).triggerHandler({
              type: 'click',
              target: arrow
            });
          } else {
            focusNext(branchElement);
          }
        } else {
          focusNext(branchElement);
        }
      }

      // close branch or select previous
      function closePrevBranch(branchElement) {
        if ($$mdTree.isOpen(branchElement)) {
          var arrow = $$mdTree.getArrow(branchElement);
          if (arrow) {
            // close branch by simulating click
            getTreeElement(branchElement).triggerHandler({
              type: 'click',
              target: arrow
            });
          } else {
            focusPrevious(branchElement);
          }
        } else {
          focusPrevious(branchElement);
        }
      }

      // open/close branch
      function handleEnter(branchElement) {
        // single select branch
        if ($$mdTree.hasCheckbox(branchElement)) {
          selectBranch(branchElement, true);
          // TODO invoke single select callback

        // toggle open/close branch
        } else {
          toggleOpen(branchElement);
        }
      }

      function toggleOpen(branchElement) {
        if ($$mdTree.canOpen(branchElement) && !$$mdTree.isTip(branchElement)) {
          // open branch by simulating click
          getTreeElement(branchElement).triggerHandler({
            type: 'click',
            target: $$mdTree.getArrow(branchElement)
          });
        }
      }

      function selectBranch(branchElement, single) {
        var el;
        if (single === true) {
          el = branchElement.querySelector('.md-branch-inner');
        } else {
          el = $$mdTree.getCheckbox(branchElement);
        }
        if (el) {
          getTreeElement(branchElement).triggerHandler({
            type: 'click',
            target: el
          });
        }
      }


      function getTreeElement(branchElement) {
        if (treeElement) { return treeElement; }
        treeElement = walkForTree(branchElement);
        return treeElement;
      }

      function walkForTree(el) {
        var parent = el.parentNode;
        while (parent && parent !== document.body) {
          if (parent.nodeName === 'MD-TREE') { return angular.element(parent); }
          parent = parent.parentNode;
        }
        return null;
      }

    };
  }

}
}());
(function(){"use strict";
treeService.$inject = ["$mdUtil", "$animateCss"];angular
  .module('angular-material-tree')
  .factory('$$mdTree', treeService);


function treeService($mdUtil, $animateCss) {
  // track shift pressed
  var shiftPressed = false;
  document.addEventListener('keydown', function (e) {
    if (e.keyCode === 16) { shiftPressed = true; }
  });
  document.addEventListener('keyup', function (e) {
    if (e.keyCode === 16) { shiftPressed = false; }
  });

  return {
    open: open,
    close: close,
    canOpen: canOpen,
    filterOpen: filterOpen,
    filterClose: filterClose,
    getTreeElement: getTreeElement,
    getBranch: getBranch,
    getArrow: getArrow,
    isShiftPressed: isShiftPressed,
    isArrow: isArrow,
    isSelectOn: isSelectOn,
    isSelected: isSelected,
    isCheckbox: isCheckbox,
    isOpen: isOpen,
    isTip: isTip,
    hasCheckbox: hasCheckbox,
    getCheckbox: getCheckbox
  };

  function getTreeElement() {
    return treeElement;
  }

  // Connect scope and set it's state
  // animate branch open
  function open(branchElement, noAnimation) {
    if (!branchElement) { return; }

    var element = angular.element(branchElement);
    var scope = element.scope();
    $mdUtil.reconnectScope(scope);
    scope.isOpen = true;
    scope.startWatching(); // watch model data
    if (noAnimation === true) { element.addClass('md-no-animation'); } // remove css transitions

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
        container.css('opacity', '');
        container.removeClass('md-overflow md-show');
        element.removeClass('md-no-animation');
      });
    });
  }

  // disconnect scope and set it's state
  // animate branch closed
  function close(branchElement, noAnimation) {
    if (!branchElement) { return; }

    var element = angular.element(branchElement);
    var scope = element.scope();
    scope.isOpen = false;
    scope.killWatching(); // stop watching model data
    if (noAnimation === true) { element.addClass('md-no-animation'); } // remove css transitions

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
        container.css('opacity', '');
        container.removeClass('md-overflow md-hide');
        element.removeClass('md-no-animation');
        $mdUtil.disconnectScope(scope);
      });
    });
  }

  // used to animate branch open
  function getHeight(element) {
    return element[0].scrollHeight + 'px';
  }


  // open branch for filtering
  // No animations
  function filterOpen(block) {
    $mdUtil.reconnectScope(block.scope);
    block.scope.isOpen = true;
    block.scope.startWatching();
    block.element.addClass('md-open');
    var container = angular.element(block.element[0].querySelector('.md-branch-container'));
    container.css('max-height', 'none');
  }

  // close branch for filtering
  // No animations
  function filterClose(block) {
    // do not disconnect top layer scopes or watchers
    if (block.scope.$depth > 0) {
      $mdUtil.disconnectScope(block.scope);
      block.scope.killWatching();
    }
    block.scope.isOpen = false;
    block.element.removeClass('md-open');
    var container = angular.element(block.element[0].querySelector('.md-branch-container'));
    container.css('max-height', '');
  }

  // get branch element
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

  function isShiftPressed() {
    return shiftPressed;
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

  function isBranch(el) {
    return el.nodeName === 'MD-BRANCH';
  }

  function isBranchContainer(el) {
    return el.classList.contains('md-branch-icon-container');
  }

  function isBranchInner(el) {
    return el.classList.contains('isBranchContainer');
  }

  function isOpen(branchElement) {
    return branchElement.classList.contains('md-open');
  }

  function isTip(branchElement) {
    return branchElement.classList.contains('md-tip');
  }

  function hasCheckbox(el) {
    return !!getCheckbox(el);
  }

  function getCheckbox(el) {
    if (isBranch(el)) {
      var inner = el.firstChild;
      if (!inner) { return null; }
      return inner.querySelector('.checkbox-container');
    } else if (isBranchInner(el)) {
      return el.querySelector('.checkbox-container');
    } else if (isCheckbox(el)) {
      return el;
    }

    return null;
  }

  function canOpen(el) {
    return !!getArrow(el);
  }

  function getArrow(el) {
    if (isBranch(el)) {
      var inner = el.firstChild;
      if (!inner) { return null; }
      return inner.querySelector('.md-branch-icon-container');
    } else if (isBranchInner(el)) {
      return el.querySelector('.md-branch-icon-container');
    } else if (isCheckbox(el)) {
      return el;
    }

    return null;
  }
}
}());
(function(){"use strict";
treeDirective.$inject = ["$mdTheming", "$mdUtil"];angular
  .module('angular-material-tree')
  .directive('mdTree', treeDirective);


var branchNextId = 0;
function treeDirective($mdTheming, $mdUtil) {
  controller.$inject = ["$scope", "$attrs", "$element", "$mdUtil", "$$mdTree"];
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
      if (!vm.selected[hashKey]) { return; }
      Array.prototype.slice.call($element[0].querySelectorAll('md-branch[selected]')).forEach(function (el) {
        var element = angular.element(el);
        var scope = element.scope();
        if (scope[scope.repeatName] === vm.selected[hashKey]) {
          el.removeAttribute('selected');
        }
      });
      vm.selected[hashKey].$$selected = false;
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

        // NOTE will add range selection back
        // set element select state
        // if ($$mdTree.isShiftPressed()) {
        //   rangeSelect(branch);
        // } else {
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
        // }
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
}());