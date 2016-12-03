angular
  .module('angular-material-tree')
  .directive('mdBranch', branchDirective);


/*@ngInject*/
function branchDirective($parse, $document, $compile) {
  return {
    restrict: 'E',
    multiElement: true,
    require: ['^^mdTree', '?^mdBranchTemplates'],
    priority: 1000,
    terminal: true,
    transclude: 'element',
    $$tlb: true,
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
    var isActive = isRoot || (hasParentBranch && parentNode.classList.contains('md-open'));
    isActive = true;

    return function postLink(scope, element, attrs, ctrls, transclude) {
      var dataWatcher;
      var items;
      var blocks = [];
      var pooledBlocks = [];
      var itemsLength = 0;
      var isUpdating = false;
      if (isActive) { initWatching(); }

      function initWatching() {
        if (typeof dataWatcher === 'function') {
          dataWatcher();
        }
        dataWatcher = scope.$watchCollection(repeatListExpression, updateBranch);
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
        // if (newItems !== oldItems || lengthChanged === true) {
        //   // update indexes
        // }


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

        // // Collect blocks at the top.
        i = 0;
        // while (i < itemsLength && (blocks[i] === null || blocks[i] === undefined)) {
        //   _block = getBlock(i);
        //   updateBlock(_block, i);
        //   newBlocks.push(_block);
        //   i += 1;
        // }

        // Update blocks that are already rendered.
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
        // if (newBlocks.length) {
        //   parentNode.insertBefore(
        //     domFragmentFromBlocks(newBlocks),
        //     element[0].nextSibling);
        // }
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

        if (index % 2 === 1) { block.element.addClass('br-odd'); }
        else { block.element.removeClass('br-odd'); }

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

      function updateScope($scope, index) {
        $scope.$index = index;
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

          // $animate.enter(clone, null, previousNode);
          updateScope(scope, index);
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
