directivesDomain.directive('compareTo', compareTo);

/* @ngInject */
function compareTo($log) {
  return {
    require: "ngModel",
    scope: {
      otherModelValue: "=compareTo"
    },
    link: link
  };

  function link(scope, element, attrs, controller) {
    controller.$validators.compareTo = function (modelValue) {
      return modelValue == scope.otherModelValue;
    };

    scope.$watch("otherModelValue", function () {
      controller.$validate();
    });
  };
};
