angular
  .module('angular-material-tree')
  .directive('mdBranch', branchDirective);


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
function branchDirective($parse, $document, $mdUtil, $filter, $$mdTree) {
  return {
    restrict: 'E',
    require: ['?^mdBranchTemplates'],
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
      var blocks = [];
      var pooledBlocks = [];
      var itemsLength = 0;
      var isUpdating = false;
      var isFilterOpen = false;
      if (isOpen) { startWatching(); }

      scope.$mdBranchFilter = function (value) {
        if (value && value.length > 2) {
          isFilterOpen = true;
          blocks.forEach(function (block) {
            $$mdTree.filterOpen(block);
          });
        } else if ((!value || value.length < 3) && isFilterOpen) {
          isFilterOpen = false;
          blocks.forEach(function (block) {
            $$mdTree.filterClose(block);
          });
        }
        return $filter('filter')(value);
      }


      function startWatching() {
        if (dataWatcher) { return; }
        dataWatcher = scope.$watchCollection(repeatListExpression, updateBranch);
      }
      function killWatching() {
        if (typeof dataWatcher === 'function') {
          dataWatcher();
          dataWatcher = undefined;
        }
      }
      scope.startWatching = startWatching;
      scope.killWatching = killWatching;


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


      function poolBlock(index) {
        pooledBlocks.unshift(blocks[index]);
        blocks[index].element[0].parentNode.removeChild(blocks[index].element[0]);
        delete blocks[index];
      }

      function updateBlock(block, index) {
        blocks[index] = block;

        if (block.new) { updateNewBlock(block); }
        if (!block.new && (block.scope.$index === index && block.scope[repeatName] === items[index])) {
          updateState(block.scope,  index);
          return;
        }
        block.new = false;
        // Update and digest the block's scope.
        updateScope(block.scope, index);
        updateState(block.scope,  index);

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
        $scope.$depth = ($scope.$parent.$depth + 1) || 0;
        items[index].$$depth = $scope.$depth;
      }

      function updateState($scope, index) {
        var item = items ? items[index] : undefined;
        var element = $scope.$element && $scope.$element[0] ? $scope.$element : undefined;
        $mdUtil.nextTick(function () {
          element.toggleClass('md-open', item.$$isOpen);
          if (item.$$isOpen) {
            $mdUtil.reconnectScope($scope);
            $scope.startWatching();
          }
        });
      }

      function getTreeCtrl(scope) {
        if (scope.treeCtrl) { return scope.treeCtrl; }
        var parent = scope.$element[0].parentNode;
        while (parent && parent !== document.body) {
          if (parent.nodeName === 'MD-TREE') {
            scope.treeCtrl = angular.element(parent).controller('mdTree');
            return scope.treeCtrl;
          }
          parent = parent.parentNode;
        }
        console.error('`<md-branch>` element is not nested in a `<md-tree>` element. Selection will not work');
      }

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
          initState(items[index]);
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
