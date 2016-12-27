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

      // standard angular filter wrapped so we can determian if the parent should be opened for closed
      scope.$mdBranchFilter = function (value) {
        var filtered = $filter('filter')(value);

        // open branches if filter string is greater then 2 and items have been found
        if (filtered && filtered.length > 2) {
          isFilterOpen = true;
          blocks.forEach(function (block) {
            $$mdTree.filterOpen(block);
          });

        // close branches if filter is less than 3 characters or no items have been found
        } else if ((!filtered || filtered.length < 3) && isFilterOpen) {
          isFilterOpen = false;
          blocks.forEach(function (block) {
            $$mdTree.filterClose(block);
          });
        }
        return filtered;
      }


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


      function updateBranch(newItems, oldItems) {
        if (isUpdating) { return; }
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
        var innerContainer = angular.element('<div class="md-branch-inner">'); // branch contents
        var branchContainer = angular.element('<div class="md-branch-container">'); // nested branched
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

      // walk dome to find tree
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
        });
        return block;
      }

      // add blocks to one fragment for better performance
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
