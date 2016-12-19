angular
  .module('angular-material-tree')
  .directive('mdBranch', branchDirective)
  .controller('BranchController', branchController);


var CHECKBOX_SELECTION_INDICATOR = angular.element('<div class="checkbox-container"><div class="checkbox-icon"></div></div>');
var BRANCH_ARROW_TEMPLATE = angular.element('<div class="md-branch-icon-container">'+
  '<div class="md-branch-icon">'+
    '<svg fill="#000000" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">'+
      '<path d="M8.59 16.34l4.58-4.59-4.58-4.59L10 5.75l6 6-6 6z"/>'+
      '<path d="M0-.25h24v24H0z" fill="none"/>'+
    '</svg>'+
  '</div>'+
'</div>');

/*@ngInject*/
function branchDirective($parse, $document, $compile) {
  return {
    restrict: 'E',
    // multiElement: true,
    require: ['mdBranch', '?^mdBranch', '?^mdTree', '?^mdBranchTemplates'],
    priority: 1000,
    terminal: true,
    transclude: 'element',
    // $$tlb: true,
    compile: compile,
    controller: 'BranchController'
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
      var blocks = [];
      var pooledBlocks = [];
      var itemsLength = 0;
      var isUpdating = false;
      var ctrl = ctrls[0];
      var parentBranchCtrl = ctrls[1];
      if (isOpen) { startWatching(); }


      function startWatching() {
        killWatching();
        dataWatcher = scope.$watchCollection(repeatListExpression, updateBranch);
      }
      function killWatching() {
        if (typeof dataWatcher === 'function') {
          dataWatcher();
        }
      }
      ctrl.startWatching = startWatching;
      ctrl.killWatching = killWatching;
      ctrl.setOpenState(isOpen);

      // add tree controller and register if available
      if (ctrls[2]) {
        ctrl.treeCtrl = ctrls[2];
        ctrl.registerBranch();
      }


      function updateBranch(newItems, oldItems) {
        if (isUpdating) { return; }
        isUpdating = true;

        var i;
        var _block;
        var keys;
        var index;
        var length;
        var maxIndex;
        var lengthChanged = false;
        var newBlocks = [];
        var _itemsLength = newItems && newItems.length || 0;

        if (_itemsLength !== itemsLength) {
          lengthChanged = true;
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


      function poolBlock() {
        pooledBlocks.push(blocks[index]);
        parentNode.removeChild(blocks[index].element[0]);
        delete blocks[index];
      }

      function updateBlock(block, index) {
        blocks[index] = block;

        if (block.new) { updateNewBlock(block); }
        if (!block.new &&
            (block.scope.$index === index && block.scope[repeatName] === items[index])) {
          return;
        }
        block.new = false;

        // Update and digest the block's scope.
        updateScope(block.scope, index);

        // Perform digest before re-attaching the block.
        // Any resulting synchronous dom mutations should be much faster as a result.
        // This might break some directives, but I'm going to try it for now.
        if (!scope.$root.$$phase) {
          block.scope.$digest();
        }
      }


      // NOTE this might cause problems when applying a new scope
      // place contents into containers to display items correctly
      // this is only done once
      function updateNewBlock(block) {
        var isSelectable = block.element.attr('select') !== undefined;
        // branch contents
        var innerContainer = angular.element('<div class="md-branch-inner">');
        // nested branched
        var branchContainer = angular.element('<div class="md-branch-container">');
        innerContainer.append(BRANCH_ARROW_TEMPLATE.clone());
        if (isSelectable) {
          block.element.addClass('md-checkbox-enabled');
          innerContainer.append(CHECKBOX_SELECTION_INDICATOR.clone());
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
          block.element.append(branchContainer);

        // if no more branches then mark as tip
        } else {
          block.element.addClass('md-tip');
        }
      }

      function updateScope($scope, index) {
        $scope.$index = index;
        $scope.repeatName = repeatName;
        $scope[repeatName] = items && items[index];
        $scope.$odd = !($scope.$even = (index & 1) === 0);
      }

      function getBlock(index) {
        if (pooledBlocks.length) {
          return pooledBlocks.pop();
        }

        var block;
        transclude(function(clone, scope) {
          block = {
            element: clone,
            new: true,
            scope: scope
          };

          updateScope(scope, index);
          scope.$element = clone; // attach element to scope so it can be accessed in controller

          parentNode.appendChild(clone[0]);
        });
        return block;
      }

      function domFragmentFromBlocks(blocks) {
        var fragment = $document[0].createDocumentFragment();
        blocks.forEach(function(block) {
          fragment.appendChild(block.element[0]);
        });
        return fragment;
      }

    };
  }

}








// --- Controller ---

/*@ngInject*/
function branchController($scope, $mdUtil, $animateCss) {
  /*jshint validthis: true*/
  var vm = this;
  var isOpen = false;

  // injected $element is holds refernce to the comment. heres how to get arround this
  var $element = $scope.$element;

  // vm.startWatching; set in link function
  // vm.killWatching; set in link function
  vm.setOpenState = setOpenState;
  vm.setSelected = setSelected;
  vm.registerBranch = registerBranch;

  if (!$element) { return; }
  var arrow = $element[0].querySelector('.md-branch-icon');
  var ngClick = $element.attr('ng-click');

  if (!ngClick) {
    $element.on('click', handleClick);
  }

  $scope.$on('$destroy', function () {
    // tree controller may not exist if branch was never opened
    if (vm.treeCtrl) {
      vm.treeCtrl.unregisterBranch(vm.treeCtrl.hashGetter($scope[$scope.repeatName]));
    }
  });


  function handleClick(e) {
    // toggel branch
    if (e.target.classList.contains('md-branch-icon-container')) {
      toggleBranchClick(e);
      return;
    }

    // handle select
    var isSelect = $element.attr('select') !== undefined;
    if (isSelect && branchContainsElement(e.target)) {
      var selected = $element.attr('selected') !== undefined;
      $element.attr('selected', !selected);

      // deselect all if user did not click the checkbox
      if (!e.target.classList.contains('checkbox-container')) { // clicked on checkbox
        getTreeCtrl().deselectAll();
      }

      getTreeCtrl().toggleSelect(!selected, getTreeCtrl().hashGetter($scope[$scope.repeatName]), $scope[$scope.repeatName]);
      e.stopPropagation();
    } else {
      toggleBranchClick(e);
    }
  }

  function setOpenState(value) {
    // if (isOpen == false) { disconnectScope(); }
    if (value === isOpen) { return; }
    isOpen = value;
    if (isOpen === true) { open(true); }
    else { close(true); }
  }

  function toggleBranchClick(e) {
    if (!branchContainsElement(e.target)) { return; }
    if (isOpen !== true) { open(); }
    else { close(); }
    e.stopPropagation();
  }

  function branchContainsElement(el) {
    var innerContainer = $element[0].querySelector('.md-branch-inner');
    if (el === innerContainer) { return true; } // check if el is container be preceding
    var parent = el.parentNode;

    while (parent && parent !== document.body) {
      if (parent === innerContainer) { return true; }
      if (parent.nodeName === 'MD-BRANCH') { return false; }
      parent = parent.parentNode;
    }
    return false;
  }


  function open(noAnimation) {
    if (isOpen) { return; }
    isOpen = true;
    reconnectScope();
    vm.startWatching();
    $element.toggleClass('md-no-animation', noAnimation || false);

    $mdUtil.nextTick(function () {
      var container = angular.element($element[0].querySelector('.md-branch-container'));
      $element.addClass('md-open');
      container.addClass('md-overflow md-show');

      $animateCss(container, {
        from: {'max-height': '0px', opacity: 0},
        to: {'max-height': getHeight(), opacity: 1}
      })
      .start()
      .then(function () {
        container.css('max-height', 'none');
        container.removeClass('md-overflow md-show');
      });
    });
  }

  function close(noAnimation) {
    if (!isOpen) { return; }
    isOpen = false;
    vm.killWatching();
    $element.toggleClass('md-no-animation', noAnimation || false);

    $mdUtil.nextTick(function () {
      var container = angular.element($element[0].querySelector('.md-branch-container'));
      $element.removeClass('md-open');
      container.addClass('md-overflow md-hide');
      $animateCss(container, {
        from: {'max-height': getHeight(), opacity: 1},
        to: {'max-height': '0px', opacity: 0}
      })
      .start()
      .then(function () {
        container.removeClass('md-overflow md-hide');
        disconnectScope();
      });
    });
  }

  function getHeight() {
    return $element[0].scrollHeight + 'px';
  }

  // nested, nested branches cannot access the tree controller due to their parents not being added to the dom.
  // To fix this we will walk the dom to find the tree and grab its controller
  function getTreeCtrl() {
    if (vm.treeCtrl) { return vm.treeCtrl; }

    var parent = $element[0].parentNode;
    while (parent && parent !== document.body) {
      if (parent.nodeName === 'MD-TREE') {
        vm.treeCtrl = angular.element(parent).controller('mdTree');
        registerBranch();
        return vm.treeCtrl;
      }
      parent = parent.parentNode;
    }

    console.error('`<md-branch>` element is not nested in a `<md-tree>` element. Selection will not work');
  }

  // register branch if tree controller is accesable
  function registerBranch() {
    vm.treeCtrl.registerBranch(vm.treeCtrl.hashGetter($scope[$scope.repeatName]), {
      setSelected: setSelected,
      getDepth: getDepth
    });
    setSelected(vm.treeCtrl.selected[vm.treeCtrl.hashGetter($scope[$scope.repeatName])] !== undefined);
  }

  function getDepth() {
    if ($scope.$depth) { return $scope.$depth; }
    var depth = 0;
    var parent = $element[0].parentNode;
    while (parent && parent !== document.body) {
      if (parent.nodeName === 'MD-TREE') { break; }
      if (parent.nodeName === 'MD-BRANCH') { depth += 1; }
      parent = parent.parentNode;
    }
    $scope.$depth = depth;
    return depth;
  }


  // remove scope from parents reference so it is not used in digest
  function disconnectScope() {
    if ($scope.$$destroyed) return;

    var parent = $scope.$parent;
    $scope.$$disconnected = true;

    // See Scope.$destroy
    if (parent.$$childHead === $scope) parent.$$childHead = $scope.$$nextSibling;
    if (parent.$$childTail === $scope) parent.$$childTail = $scope.$$prevSibling;
    if ($scope.$$prevSibling) { $scope.$$prevSibling.$$nextSibling = $scope.$$nextSibling; }
    if ($scope.$$nextSibling) { $scope.$$nextSibling.$$prevSibling = $scope.$$prevSibling; }
    $scope.$$nextSibling = $scope.$$prevSibling = null;
  }

  // recoonect disconnected scope so it is used in the digest
  function reconnectScope() {
    if (!$scope.$$disconnected) return;

    var child = $scope;
    var parent = child.$parent;
    child.$$disconnected = false;
    // See Scope.$new for this logic...
    child.$$prevSibling = parent.$$childTail;
    if (parent.$$childHead) {
      parent.$$childTail.$$nextSibling = child;
      parent.$$childTail = child;
    } else {
      parent.$$childHead = parent.$$childTail = child;
    }
  }

  // set select state
  function setSelected(isSelected) {
    if ($element) { $element.attr('selected', isSelected); }
  }
}
