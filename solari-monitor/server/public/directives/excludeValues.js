directivesDomain.directive('excludeValues', excludeValues);

/* @ngInject */
function excludeValues($log) {
  return {
    require: "ngModel",
    scope: {
      excludeValues: "=excludeValues"
    },
    link: link
  };

  function link(scope, element, attrs, controller) {
    controller.$validators.excludeValues = function (modelValue) {
      return modelValue ? !scope.excludeValues.includes(modelValue.trim().toLowerCase()) : true;
    };

    scope.$watch("excludeValues", function () {
      controller.$validate();
    });
  };
};
