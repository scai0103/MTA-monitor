directivesDomain.directive('validFile', validFile);

/* @ngInject */
function validFile($log) {
  return {
    require: 'ngModel',
    link: function (scope, el, attrs, ngModel) {
      el.bind('change', function () {
        scope.$apply(function () {
          ngModel.$setViewValue(el.val());
          ngModel.$render();
        });
      });
    }
  }
};
