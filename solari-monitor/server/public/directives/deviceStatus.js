directivesDomain.directive('deviceStatus', deviceStatus);

/* @ngInject */
function deviceStatus($location, $timeout, $log, $localStorage, $rootScope, devicesService, APPLICATION_EVENTS) {
  return {
    restrict: 'E',
    scope: {
      device: '=',
      mode: '=?'
    },
    replace: true,
    templateUrl: '/views/devices/statusTemplate.html',
    link: link
  };

  function link(scope, element, attrs, controller) {

    var MODE_LIST = 'list';

    /**
     * BINDINGS
     ************************************************/

    scope.isDoubleFace = false;
    scope.isError = false;
    scope.MODE_LIST = MODE_LIST;
    scope.search = search;
    scope.status = {};

    activate();


    /**
     * FUNCTIONS
     ************************************************/

    function activate() {

      scope.isDoubleFace = scope.device.custom.screenshotUrl.length > 1;

      devicesService
        .getDeviceStatus(scope.device.address)
        .then(function (data) {
          scope.status = data;
        })
        .catch(function (err) {
          $log.error(err);
          scope.isError = true;
          // $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
        });
    };

    function search(services, key) {
      var result = null;

      if (services && key) {
        result = services.find(function (service) {
          return service.name == key;
        })
      }

      return result;
    }

  };

};
