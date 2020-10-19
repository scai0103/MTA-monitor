controllersDomain.controller('StationDetailController', StationDetailController);

/* @ngInject */
function StationDetailController($rootScope, $scope, $log, $mdSidenav, $mdDialog, $routeParams, $timeout, $filter,
  stationsService, syncService, groupsService, popupDeviceTemplate, DynamicItems,
  APPLICATION_EVENTS, WIZARD_EVENTS, SYNC_EVENTS) {

  var CURRENT_VIEW_MAP = 'map';
  var CURRENT_VIEW_LIST = 'list';

  var lastSyncRequestDataStr = null;

  /**
   * BINDINGS
   ************************************************/

  $scope.areas = [];
  $scope.currentView = $routeParams.view || CURRENT_VIEW_MAP;
  $scope.CURRENT_VIEW_MAP = CURRENT_VIEW_MAP;
  $scope.CURRENT_VIEW_LIST = CURRENT_VIEW_LIST;
  $scope.dataHasLoaded = false;
  $scope.deviceDefaults = {};
  $scope.devices = [];
  $scope.deleteStation = deleteStation;
  $scope.dynamicItems = null;
  $scope.id = $routeParams.id;
  $scope.center = { lat: 50, lng: 50, zoom: 3 };
  $scope.editDeviceNavClose = editDeviceNavClose;
  $scope.editDeviceNavOpen = editDeviceNavOpen;
  $scope.editStationNavClose = editStationNavClose;
  $scope.editStationNavOpen = editStationNavOpen;
  $scope.fabIsOpen = false;
  $scope.fabSelectedMode = 'md-scale';
  $scope.floorSelected = -1;
  $scope.getCustomServiceValues = getCustomServiceValues;
  $scope.getFloorMapId = getFloorMapId;
  $scope.getFloorImageOverlayUrl = getFloorImageOverlayUrl;
  $scope.groups = [];
  $scope.lines = [];
  $scope.mapId = 'stationMap_' + $scope.id;
  $scope.markers = [];
  $scope.returnToRoute = $routeParams.returnToRoute ?
    $routeParams.returnToRouteView ? $routeParams.returnToRoute + '/' + $routeParams.returnToRouteView : $routeParams.returnToRoute :
    '/stations';
  $scope.station = {};
  $scope.stations = [];
  $scope.editStationIsOpen = false;
  $scope.stationDefaults = {};
  $scope.templates = [];


  /**
   * EVENTS
   ************************************************/

  var wizardSuccessListener = $scope.$on(WIZARD_EVENTS.wizardSuccess, onWizardSuccess);
  var wizardFailedListener = $scope.$on(WIZARD_EVENTS.wizardFailed, onWizardFailed);
  var syncSuccessListener = $scope.$on(SYNC_EVENTS.syncSuccess, onNewSyncData);
  $scope.$watch('floorSelected', onFloorSelected);
  $scope.$on('$destroy', destroy);


  activate();


  /**
   * FUNCTIONS
   ************************************************/

  function activate() {
    $scope.setCurrentNavBarItem('devices'); // defined in application controller
    $scope.setSummaryData({ ok: '-', error: '-', warning: '-', maintenance: '-', lastUpdate: undefined });

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

    // Load the available groups from the DB and initialize the poller
    groupsService.listGroups()
      .then(function (data) {
        $scope.groups = data.groups;
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };


  function checkFloorFilters(device) {
    if (angular.isUndefined($scope.floorSelected)) {
      return false;
    }

    var visible = false;

    visible = device.config.stationFloorId === $scope.floorSelected;

    return visible;
  };


  function deleteStation($event) {

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
      stationsService.deleteStation($scope.station.name, $scope.station)
        .then(function (data) {
          $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: 'STATION_DELETED' });

          // Return to devices main/list page
          $scope.goto($scope.returnToRoute);

        })
        .catch(function (err) {
          $log.error(err);
          $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
        });

    }, function () {
      // Cancel function, do nothing
    });
  };


  function destroy() {
    wizardSuccessListener();
    wizardFailedListener();
    syncSuccessListener();
  };


  function editDeviceNavClose() {
    $mdSidenav('edit-device-nav').close();
  };


  function editDeviceNavOpen($event) {
    $event.stopImmediatePropagation(); //top the fab closing animation
    $mdSidenav('edit-device-nav').open();
  };


  function editStationNavClose() {
    $scope.stationDefaults = null;
    $scope.editStationIsOpen = false;
    $mdSidenav('edit-station-nav').close();
  };


  function editStationNavOpen($event) {
    $event.stopImmediatePropagation(); //top the fab closing animation

    // Load the current station data for editing
    $scope.stationDefaults = angular.copy($scope.station);
    $scope.editStationIsOpen = true;

    // Timeout to improve animation
    $timeout(function () {
      $mdSidenav('edit-station-nav').open();
    }, 100);
  };


  function getCustomServiceValues(device, serviceName) {
    var services = device.services ? device.services : {};
    var checkAllService = null;
    for (var prop in services) {
      if (services.hasOwnProperty(prop)) {
        var service = services[prop];
        if (service.custom) {
          checkAllService = service;
          break;
        }
      }
    }

    var customServiceValues = checkAllService && checkAllService.customServices ?
      checkAllService.customServices.find(function (cs) { return cs.name === serviceName }) :
      null;
    return customServiceValues;
  };


  function getFloorMapId(floorId) {
    var mapId = 'stationMap';

    if (floorId == -1) {
      return mapId;
    }

    return mapId + '_' + $scope.id + '_floor_' + floorId;
  };


  function getFloorImageOverlayUrl(floorId) {

    if (floorId == -1) {
      return $scope.stationImageBasePath + $scope.station.custom.position.mapUrl;
    }

    var floors = $scope.station.custom.floors ? $scope.station.custom.floors : [];
    var floor = floors.find(function (floor) { return floor.name == floorId; });
    if (!floor) {
      $log.error("No image available for the current floor");
      return '';
    }

    return $scope.stationImageBasePath + floor.position.mapUrl;
  };


  function onFloorSelected() {
    var markers = {};
    angular.forEach($scope.station.devices, function (device, key) {

      // check if the device is visible for the selected floor (map only)
      if (checkFloorFilters(device)) {

        var deviceName = device.name;
        var deviceDisplayName = device.displayName;
        var lat = device.config.position.lat;
        var lng = device.config.position.lng;

        var popupContent = {
          device: device,
          goto: $scope.goto
        };

        markers[deviceName] = {
          lat: lat,
          lng: lng,
          title: deviceDisplayName,
          icon: {
            type: 'div',
            iconSize: [40, 40],
            html: '<div><span><b>' + (device.maintenance == false ? (device.error ? 'ERR' : (device.warning ? 'WAR' : 'OK')) : 'MT') + '</b></span></div>',
            className: 'marker-cluster marker-cluster-' + (device.maintenance == false ? (device.error ? 'error' : (device.warning ? 'warning' : 'ok')) : 'maintenance'),
            popupAnchor: [0, 0]
          },
          popupTemplate: popupDeviceTemplate,
          popupContent: popupContent,
          private: device
        };

      }
    });

    $scope.markers = markers;
  };


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
        $scope.editDeviceNavClose();
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

    $scope.areas = status.areas;
    $scope.lines = status.lines;
    $scope.stations = status.stations;
    $scope.templates = status.templates;

    var markers = {};
    var stationsTree = status.stationsTree || [];

    $scope.station = angular.extend($scope.station, stationsTree[$scope.id])

    var devices = [];
    angular.forEach($scope.station.devices, function (device, key) {

      devices.push(device);

      // check if the device is visible for the selected floor (map only)
      if (checkFloorFilters(device)) {

        var deviceName = device.name;
        var deviceDisplayName = device.displayName;
        var lat = device.config.position.lat;
        var lng = device.config.position.lng;

        var popupContent = {
          device: device,
          goto: $scope.goto
        };

        markers[deviceName] = {
          lat: lat,
          lng: lng,
          title: deviceDisplayName,
          icon: {
            type: 'div',
            iconSize: [40, 40],
            html: '<div><span><b>' + (device.maintenance == false ? (device.error ? 'ERR' : (device.warning ? 'WAR' : 'OK')) : 'MT') + '</b></span></div>',
            className: 'marker-cluster marker-cluster-' + (device.maintenance == false ? (device.error ? 'error' : (device.warning ? 'warning' : 'ok')) : 'maintenance'),
            popupAnchor: [0, 0]
          },
          popupTemplate: popupDeviceTemplate,
          popupContent: popupContent,
          private: device
        };

      }
    });

    $scope.markers = markers;
    $scope.devices = devices;


    // Define the device defaults with the current station information (for the device wizard)
    if (stationsTree[$scope.id]) {
      $scope.deviceDefaults = angular.copy(
        {
          config: {
            stationName: $scope.id,
            stationFloorId: $scope.floorSelected
          }
        }
      );
    }

    if ($scope.dynamicItems == null) {
      $scope.dynamicItems = new DynamicItems($scope.devices);
    } else {
      $scope.dynamicItems.reset($scope.devices);
    }

    $scope.dataHasLoaded = true;
  };
};
