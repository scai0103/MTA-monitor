controllersDomain.controller('StationsController', StationsController);

/* @ngInject */
function StationsController($rootScope, $scope, $log, $timeout, $filter, $routeParams, $mdSidenav, $mdDialog,
  stationsService, syncService, popupStationTemplate, DynamicItems,
  APPLICATION_EVENTS, WIZARD_EVENTS, SYNC_EVENTS) {

  var CURRENT_VIEW_MAP = 'map';
  var CURRENT_VIEW_LIST = 'list';
  var STATION_UNDEFINED = 'MR-UNDEFINED';

  var lastSyncRequestDataStr = null;


  /**
   * BINDINGS
   ************************************************/

  $scope.currentView = $routeParams.view || CURRENT_VIEW_MAP;
  $scope.CURRENT_VIEW_MAP = CURRENT_VIEW_MAP;
  $scope.CURRENT_VIEW_LIST = CURRENT_VIEW_LIST;
  $scope.dataHasLoaded = false;
  $scope.deleteStation = deleteStation;
  $scope.dynamicItems = null;
  $scope.editStationNavClose = editStationNavClose;
  $scope.editStationNavOpen = editStationNavOpen;
  $scope.fabIsOpen = false;
  $scope.fabSelectedMode = 'md-scale';
  $scope.mapId = 'mainStationMap';
  $scope.mapMarkers = [];
  $scope.mapMarkerCluster = null;
  $scope.station = {};
  $scope.stationCheckedIds = {};
  $scope.stations = [];
  $scope.editStationIsOpen = false;
  $scope.stationDefaults = null;
  $scope.lines = [];
  $scope.mapEditMarkers = {};


  /**
   * EVENTS
   ************************************************/

  var wizardSuccessListener = $scope.$on(WIZARD_EVENTS.wizardSuccess, onWizardSuccess);
  var wizardFailedListener = $scope.$on(WIZARD_EVENTS.wizardFailed, onWizardFailed);
  var syncSuccessListener = $scope.$on(SYNC_EVENTS.syncSuccess, onNewSyncData);
  $scope.$on('$destroy', destroy);


  activate();


  /**
   * FUNCTIONS
   ************************************************/

  function activate() {
    $scope.setCurrentNavBarItem('stations'); // defined in application controller
    $scope.setSummaryData({ ok: '-', error: '-', warning: '-', maintenance: '-', lastUpdate: undefined });

    $scope.mapMarkerCluster = {
      iconCreateFunction: function (cluster) {
        var markers = cluster.getAllChildMarkers();

        return new L.divIcon({
          html: '<div><span><b>' + '' + '</b></span></div>',
          className: 'marker-cluster marker-cluster-empty',
          iconSize: new L.Point(40, 40)
        });
      },
      clusterMouseOverFunction: function (event) {
        var layer = event.layer;
        var clusterStations = layer.getAllChildMarkers();

        var html = "<b>Station Cluster Detail</b><br>";

        angular.forEach(clusterStations, function (clusterStation) {
          var station = clusterStation.private;

          html += "<div class='clusterDetailBox'>";
          html += "<span>" + station.displayName + "</span> ";
          html += "<span class='statusCircle empty-host" + '' + "'></span>";
          html += "</div>"
        });

        var popup = L.popup().setContent(html);
        layer.bindPopup(popup);
        layer.openPopup();
      },
      maxClusterRadius: 80,
    };

    // Local cached data
    syncService
      .getCachedSyncData()
      .then(function (cachedSyncData) {
        processSyncData(cachedSyncData);
        if (!syncService.isSyncPollerRunning()) {
          syncService.startSyncPoller();
        }
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };


  function deleteStation($event, station) {

    var message = $filter('translate')('WARNING_DELETE_DEVICES') + ' ' + $filter('translate')('DELETE_CONFIRM_MSG');

    // Appending dialog to document.body to cover sidenav in docs app
    var confirm = $mdDialog.confirm()
      .title($filter('translate')('DELETE_CONFIRM_TITLE'))
      .textContent(message)
      .ariaLabel($filter('translate')('DELETE_CONFIRM_TITLE'))
      .targetEvent($event)
      .ok($filter('translate')('OK'))
      .cancel($filter('translate')('CANCEL'));

    $mdDialog.show(confirm).then(function () {
      // Confirm function, call service
      stationsService.deleteStation(station.name, station)
        .then(function (data) {
          $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: 'STATION_DELETED' });

          // Refresh page data
          refresh();
        })
        .catch(function (err) {
          $log.error(err);
          $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
        });

    }, function () {
      // Cancel function, do nothing
    });
  };


  function editStationNavClose() {
    $scope.stationDefaults = null;
    $scope.editStationIsOpen = false;
    $mdSidenav('edit-station-nav').close();
  };


  function editStationNavOpen($event, name) {
    $event.stopImmediatePropagation(); //top the fab closing animation

    // Load the current station data for editing
    $scope.stationDefaults = $scope.stations.find(function (station) {
      return station.name == name;
    });
    $scope.editStationIsOpen = true;

    // Timeout to improve animation
    $timeout(function () {
      $mdSidenav('edit-station-nav').open();
    }, 100);
  };


  function destroy() {
    wizardSuccessListener();
    wizardFailedListener();
    syncSuccessListener();
  }


  function onNewSyncData($event, args) {
    var data = args.data;
    processSyncData(data);
  };


  function onWizardSuccess($event, args) {
    $event.preventDefault();
    $event.stopPropagation();
    $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: args.message });

    if (args.closeSideBar) {
      $timeout(function () {
        // Close the sidebar
        $scope.editStationNavClose();

        syncService.updateStationCachedData(args.data); //TODO: da rivedere
        syncService.restartSyncPoller();
      }, 0);
    }
  };


  function onWizardFailed($event, args) {
    $event.preventDefault();
    $event.stopPropagation();
    $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: args.message, description: args.description });
  };


  function processSyncData(data) {
    // Stops if no data is available
    if (!data) {
      $log.debug('No data available');
      $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: 'NO_DATA_AVAILABLE' });
      return;
    }

    // Stops if the data is not changed
    var dataStr = JSON.stringify(data);
    if (lastSyncRequestDataStr === dataStr) {
      $log.debug('Data not changed');
      return;
    }

    // Copy of the last data received
    lastSyncRequestDataStr = dataStr;

    refresh(data);
  };


  function refresh(status) {

    $scope.setSummaryData(status.summary);

    $scope.lines = status.lines;
    $scope.stations = status.stations;

    var stationCheckedIds = {};
    var markers = {};

    angular.forEach($scope.stations, function (station, key) {

      station.deviceCount = Object.keys(station.devices).length;

      var stationName = station.name;
      var stationDisplayName = station.displayName;
      var lat = station.custom.position.lat;
      var lng = station.custom.position.lng;

      // Rimuove la stazione *MR-UNDEFINED* dalla visualizzazione a mappa
      if (stationName !== STATION_UNDEFINED) {

        var popupContent = {
          station: station,
          goto: $scope.goto,
          editStationNavOpen: $scope.editStationNavOpen,
          deleteStation: $scope.deleteStation
        };

        markers[stationName] = {
          lat: lat,
          lng: lng,
          title: stationDisplayName,
          icon: {
            type: 'div',
            iconSize: [40, 40],
            html: '<div><span><b>' + '' + '</b></span></div>',
            className: 'marker-cluster marker-cluster-empty',
            popupAnchor: [0, 0]
          },
          popupTemplate: popupStationTemplate,
          popupContent: popupContent,
          private: station
        };

      }
    });

    $scope.markers = markers;
    $scope.stationCheckedIds = stationCheckedIds;

    if ($scope.dynamicItems == null) {
      $scope.dynamicItems = new DynamicItems($scope.stations);
    } else {
      $scope.dynamicItems.reset($scope.stations);
    }

    $scope.dataHasLoaded = true;
  };
};
