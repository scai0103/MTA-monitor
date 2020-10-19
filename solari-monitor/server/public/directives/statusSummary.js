directivesDomain.directive('statusSummary', statusSummary);

/* @ngInject */
function statusSummary($location, $timeout, $log, $rootScope, APPLICATION_EVENTS) {
  return {
    restrict: 'E',
    scope: {
      data: '='
    },
    replace: true,
    templateUrl: '/views/summaryTemplate.html',
    link: link
  };

  function link(scope, element, attrs, controller) {

  };
};
