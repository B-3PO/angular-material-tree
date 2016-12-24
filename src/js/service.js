angular
  .module('angular-material-tree')
  .factory('$$mdTree', treeService);


function treeService($mdUtil, $animateCss) {
  return {
    open: open,
    close: close,

    filterOpen: filterOpen,
    filterClose: filterClose
  };

  function open(branchElement, noAnimation) {
    if (!branchElement) { return; }

    var element = angular.element(branchElement);
    var scope = element.scope();
    $mdUtil.reconnectScope(scope);
    scope.isOpen = true;
    scope.startWatching();
    if (noAnimation === true) { element.addClass('md-no-animation'); }

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
        element.removeClass('md-no-animation');
      });
    });
  }

  function close(branchElement, noAnimation) {
    if (!branchElement) { return; }

    var element = angular.element(branchElement);
    var scope = element.scope();
    scope.isOpen = false;
    scope.killWatching();
    if (noAnimation === true) { element.addClass('md-no-animation'); }

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
        element.removeClass('md-no-animation');
        $mdUtil.disconnectScope(scope);
      });
    });
  }

  function getHeight(element) {
    return element[0].scrollHeight + 'px';
  }


  function filterOpen(block) {
    $mdUtil.reconnectScope(block.scope);
    block.scope.isOpen = true;
    block.scope.startWatching();
    block.element.addClass('md-open');
    var container = angular.element(block.element[0].querySelector('.md-branch-container'));
    container.css('max-height', 'none');
  }

  function filterClose(block) {
    $mdUtil.disconnectScope(block.scope);
    block.scope.isOpen = false;
    block.scope.killWatching();
    block.element.removeClass('md-open');
    var container = angular.element(block.element[0].querySelector('.md-branch-container'));
    container.css('max-height', '');
  }
}
