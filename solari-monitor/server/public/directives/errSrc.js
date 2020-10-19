directivesDomain.directive('errSrc', errSrc);

/* @ngInject */
function errSrc() {
  return {
    restrict: 'A',
    link: link
  };

  function link(scope, element, attrs, controller) {

    scope.$on('$destroy', function () {
      element.off('error');
    });

    element.on('error', function () {
      if (attrs.src != attrs.errSrc) {
        attrs.$set('src', attrs.errSrc);
      }
    });
  }
};
