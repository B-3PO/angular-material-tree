angular
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
