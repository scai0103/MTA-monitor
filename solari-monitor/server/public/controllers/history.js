controllersDomain.controller('HistoryController', HistoryController);

/* @ngInject */
function HistoryController(APPLICATION_EVENTS, $scope, $rootScope, $log, kibanaService, devicesService) {

  var currDate = new Date();
  var fromDate = new Date(currDate.setHours(0, 0, 0, 0));
  var toDate = new Date(currDate.setHours(23, 59, 59, 0));
  var STATION_UNDEFINED = 'MR-UNDEFINED';

  var defaultChartFilters = {
    from: fromDate,
    to: toDate,
    device: -1,
    station: -1,
    template: -1
  };

  /**
   * BINDINGS
   ************************************************/

  $scope.chartFilters = defaultChartFilters;
  $scope.dashboardId = "";
  $scope.dashboards = [];
  $scope.devices = [];
  $scope.form = {};
  $scope.filterChart = filterChart;
  $scope.kibanaDashUrl = "";
  $scope.lines = [];
  $scope.pageTitle = "HISTORY";
  $scope.reset = reset;
  $scope.stations = [];
  $scope.templates = [];
  $scope.STATION_UNDEFINED = STATION_UNDEFINED;

  activate();

  /**
  * FUNCTIONS
  ************************************************/

  function activate() {
    $scope.setCurrentNavBarItem('history');
    $scope.setSummaryData(null);

    clearForm();

/*
    // Load the available groups from the DB and initialize the poller
    kibanaService
      .listDashboards()
      .then(function (data) {
        $scope.dashboards = data.dashboards;
        $scope.dashboardId = $scope.dashboards.length > 0 ? $scope.dashboards[0].id : "";
        $scope.reset();
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
*/

    devicesService.sync()
      .then(function (status) {
        $scope.lines = status.lines;
        $scope.stations = status.stations;
        $scope.templates = status.templates;

        var devices = [];
        angular.forEach($scope.stations, function (station) {
          angular.forEach(station.devices, function (device) {
            devices.push(device);
          })
        });

        $scope.devices = devices;

      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };

  function clearForm() {
    if ($scope.form.filtersForm) {
      $scope.form.filtersForm.$setUntouched();
      $scope.form.filtersForm.$setPristine();
      $scope.chartFilters = angular.copy(defaultChartFilters);
    }
  };

  function filterChart() {
    var payload = $scope.chartFilters;
    kibanaService.filterChart(payload)
      .then(function (data) {
        $scope.kibanaDashUrl = data.iframeUrl;
        renderIframe();
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };
/*
  function filterChart() {
    var payload = $scope.chartFilters;
    kibanaService.filterChart($scope.dashboardId, payload)
      .then(function (data) {
        $scope.kibanaDashUrl = data.iframeUrl;
        renderIframe();
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };
*/

  function renderIframe() {
    angular.element(document.querySelector("#kibana-iframe")).remove();
    var el = document.createElement('iframe');
    el.src = $scope.kibanaDashUrl;
    el.id = "kibana-iframe";
    angular.element(document.querySelector("#kibana-iframe-container")).html(el.outerHTML);
  };

  function reset() {
    $scope.kibanaDashUrl = "";

    kibanaService.getDashboardUrl($scope.id)
      .then(function (data) {
        $scope.kibanaDashUrl = data.iframeUrl;
        clearForm();
        renderIframe();
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
/*
    kibanaService.getDashboardUrl($scope.dashboardId, $scope.id)
      .then(function (data) {
        $scope.kibanaDashUrl = data.iframeUrl;
        clearForm();
        renderIframe();
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
*/  
};
};
