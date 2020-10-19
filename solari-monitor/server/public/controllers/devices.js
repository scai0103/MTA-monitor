controllersDomain.controller('DevicesController', DevicesController);

/* @ngInject */
function DevicesController($rootScope, $scope, $log, $timeout, $filter, $routeParams, $mdSidenav,
  devicesService, groupsService, syncService, bacthService, popupStationTemplate, DynamicItems,
  APPLICATION_EVENTS, WIZARD_EVENTS, SYNC_EVENTS, BATCH_EVENTS) {

  var CURRENT_VIEW_MAP = 'map';
  var CURRENT_VIEW_LIST = 'list';
  var DEVICE_POPUP_LIMIT = 6;
  var STATION_UNDEFINED = 'MR-UNDEFINED';
  var UPDATE_DEVICES_COMMAND_TYPE_HTTP = 'HTTP';
  var UPDATE_DEVICES_COMMAND_TYPE_MAINTENANCE = 'MNT';
  var UPDATE_DEVICES_COMMAND_UPDATE = 'update';
  var UPDATE_DEVICES_COMMAND_ADD_MAINTENANCE = 'add_maintenance';
  var UPDATE_DEVICES_COMMAND_REMOVE_MAINTENANCE = 'remove_maintenance';

  var lastSyncRequestDataStr = null;
  var updateDevicesCommands = [
    {
      type: UPDATE_DEVICES_COMMAND_TYPE_HTTP,
      name: UPDATE_DEVICES_COMMAND_UPDATE,
      displayName: 'Update Production'
    },
    {
      type: UPDATE_DEVICES_COMMAND_TYPE_MAINTENANCE,
      name: UPDATE_DEVICES_COMMAND_ADD_MAINTENANCE,
      displayName: 'Schedule Maintenance'
    },
    {
      type: UPDATE_DEVICES_COMMAND_TYPE_HTTP,
      name: UPDATE_DEVICES_COMMAND_REMOVE_MAINTENANCE,
      displayName: 'Remove Maintenance'
    }
  ];


  /**
   * BINDINGS
   ************************************************/

  $scope.areas = [];
  $scope.batchStatus = null;
  $scope.clearDeviceCommandForm = clearDeviceCommandForm;
  $scope.clearUpdateDevicesForm = clearUpdateDevicesForm;
  $scope.commandsAvailable = [];
  $scope.commandsNavClose = commandsNavClose;
  $scope.commandsNavOpen = commandsNavOpen;
  $scope.commandRequireParams = commandRequireParams;
  $scope.commandSelected = {};
  $scope.commandSend = commandSend;
  $scope.currentView = $routeParams.view || CURRENT_VIEW_MAP;
  $scope.CURRENT_VIEW_MAP = CURRENT_VIEW_MAP;
  $scope.CURRENT_VIEW_LIST = CURRENT_VIEW_LIST;
  $scope.dataHasLoaded = false;
  $scope.devices = [];
  $scope.deviceCheckedIds = {};
  $scope.deviceNumberViewLimit = DEVICE_POPUP_LIMIT;
  $scope.deviceRandom = {};
  $scope.deviceSelectAll = deviceSelectAll;
  $scope.deviceScreenshotIds = {};
  $scope.dynamicItems = null;
  $scope.editDeviceNavClose = editDeviceNavClose;
  $scope.editDeviceNavOpen = editDeviceNavOpen;
  $scope.editDeviceIsOpen = false;
  $scope.fabIsOpen = false;
  $scope.fabSelectedMode = 'md-scale';
  $scope.filters = null;
  $scope.formatDeviceIdList = formatDeviceIdList;
  $scope.filtersNavClose = filtersNavClose;
  $scope.filtersNavOpen = filtersNavOpen;
  $scope.getCustomServiceValues = getCustomServiceValues;
  $scope.groups = [];
  $scope.isFilterActive = false;
  $scope.isOneDeviceAvailable = false;
  $scope.lines = [];
  $scope.mapId = 'mainMap';
  $scope.mapMarkers = [];
  $scope.mapMarkerCluster = null;
  $scope.navClose = navClose;
  $scope.navShow = navShow;
  $scope.onCommandChange = onCommandChange;
  $scope.onSearchTermChange = onSearchTermChange;
  $scope.onUpdateDevicesCommandChange = onUpdateDevicesCommandChange;
  $scope.pageTitle = 'Devices';
  $scope.searchTerm = { term: '' };
  $scope.setFilterData = setFilterData;
  $scope.showScreenshot = showScreenshot;
  $scope.showScreenshots = false;
  $scope.stations = [];
  $scope.templates = [];
  $scope.UPDATE_DEVICES_COMMAND_UPDATE = UPDATE_DEVICES_COMMAND_UPDATE;
  $scope.UPDATE_DEVICES_COMMAND_ADD_MAINTENANCE = UPDATE_DEVICES_COMMAND_ADD_MAINTENANCE;
  $scope.UPDATE_DEVICES_COMMAND_REMOVE_MAINTENANCE = UPDATE_DEVICES_COMMAND_REMOVE_MAINTENANCE;
  $scope.updateDevices = updateDevices;
  $scope.updateDevicesCommands = updateDevicesCommands;
  $scope.updateDevicesCommandSelected = {};
  $scope.updateDevicesNavClose = updateDevicesNavClose;
  $scope.updateDevicesNavOpen = updateDevicesNavOpen;
  $scope.uploadDeviceNavClose = uploadDeviceNavClose;
  $scope.uploadDeviceNavOpen = uploadDeviceNavOpen;
  $scope.uploadUrl = "/devices/import/upload";


  /**
   * EVENTS
   ************************************************/

  var wizardSuccessListener = $scope.$on(WIZARD_EVENTS.wizardSuccess, onWizardSuccess);
  var wizardFailedListener = $scope.$on(WIZARD_EVENTS.wizardFailed, onWizardFailed);
  var syncSuccessListener = $scope.$on(SYNC_EVENTS.syncSuccess, onNewSyncData);
  var batchStatusSuccessListener = $scope.$on(BATCH_EVENTS.statusSuccess, onBatchStatus);
  $scope.$on('$destroy', destroy);


  activate();


  /**
   * FUNCTIONS
   ************************************************/

  function activate() {
    $scope.setCurrentNavBarItem('devices'); // defined in application controller
    $scope.setSummaryData({ ok: '-', error: '-', warning: '-', maintenance: '-', lastUpdate: undefined });

    $scope.mapMarkerCluster = {
      iconCreateFunction: function (cluster) {
        var markers = cluster.getAllChildMarkers();

        var clusterStatus = getClusterStatus(markers);

        return new L.divIcon({
          html: '<div><span><b>' + clusterStatus.code + '</b></span></div>',
          className: 'marker-cluster ' + clusterStatus.class,
          iconSize: new L.Point(40, 40)
        });
      },
      clusterMouseOverFunction: function (event) {
        var layer = event.layer;
        var clusterStations = layer.getAllChildMarkers();

        var html = "<b>Station Cluster Detail</b><br>";

        angular.forEach(clusterStations, function (clusterStation) {
          var station = clusterStation.private;
          var stationStatus = getStationStatus(station);

          html += "<div class='clusterDetailBox'>";
          html += "<span>" + station.displayName + "</span> ";
          html += "<span class='statusCircle " + stationStatus.hostClass + "'></span>";
          html += "</div>"
        });

        var popup = L.popup().setContent(html);
        layer.bindPopup(popup);
        layer.openPopup();
      },
      maxClusterRadius: 80,
    };

    bacthService.checkBatchStatus(); //TODO: da capire se va bene qui

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
    groupsService
      .listGroups()
      .then(function (data) {
        $scope.groups = data.groups;
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };


  function checkFilters(device) {
    if (!$scope.filters) {
      return true;
    }

    var visible = false;

    visible |= $scope.filters['filterStatusError'] && !device.maintenance && device.error;

    visible |= $scope.filters['filterStatusWarning'] && !device.maintenance && !device.error && device.warning;

    visible |= $scope.filters['filterStatusOk'] && !device.error && !device.warning;

    visible |= $scope.filters['filterStatusMaintenance'] && device.maintenance;

    // filtro applicato solo se sono autorizzato alla visualizzazione dei dispositivi NON in produzione
    if ($scope.isAuthorized([$scope.userRoles.superadmin, $scope.userRoles.admin])) {
      var visibleProduction = $scope.filters['filterStatusProduction'] && device.config.production;
      visibleProduction |= $scope.filters['filterStatusNoProduction'] && !device.config.production;
      visible &= visibleProduction;
    } else {
      // altrimenti NON mostro quelli NON in produzione
      visible &= device.config.production;
    }

    var filterStationSelected = $scope.filters['filterStationSelected'];
    visible &= filterStationSelected == null || filterStationSelected.length == 0 || filterStationSelected.includes(device.config.stationName);

    var filterLineSelected = $scope.filters['filterLineSelected'];
    visible &= filterLineSelected == null || filterLineSelected.length == 0 || includesOneElement(device.config.lineNames, filterLineSelected);

    var searchTerm = $scope.searchTerm && $scope.searchTerm.term ? $scope.searchTerm.term.trim().toLowerCase() : null;
    if (searchTerm && searchTerm !== '') {
      visible &= (device.displayName.toLowerCase().search(searchTerm) > -1 || device.address.toLowerCase().search(searchTerm) > -1);
    }

    return visible;
  };


  function clearDeviceCommandForm(deviceCommandForm) {

    if (deviceCommandForm) {
      // Reset form and disable error messages
      deviceCommandForm.$setPristine();
      deviceCommandForm.$setUntouched();
    }

    // Empty the command list
    $scope.commandsAvailable = [];

    // Empty the command object
    $scope.commandSelected = {};
  };


  function clearUpdateDevicesForm(updateDevicesForm) {

    if (updateDevicesForm) {
      // Reset form and disable error messages
      updateDevicesForm.$setPristine();
      updateDevicesForm.$setUntouched();
    }

    // Empty the command object
    $scope.updateDevicesCommandSelected = {};
  };


  function clearDeviceIdList() {
    angular.forEach($scope.deviceCheckedIds, function (checked, key) {
      $scope.deviceCheckedIds[key] = false;
    });
  };


  function commandRequireParams(commandName) {
    var command;
    for (var i = 0; i < $scope.commandsAvailable.length; i++) {
      var tmp = $scope.commandsAvailable[i];
      if (tmp.name == commandName) {
        command = tmp;
        break;
      }
    }

    return command ? command.params : false;
  };


  function commandSend(deviceCommandForm) {

    // Add all the fields for the selected command
    for (var i = 0; i < $scope.commandsAvailable.length; i++) {
      var tmp = $scope.commandsAvailable[i];
      if (tmp.name == $scope.commandSelected.name) {
        angular.extend($scope.commandSelected, tmp);
        break;
      }
    }

    var commandPayLoad = { devices: [] };

    angular.forEach($scope.devices, function (device) {
      if ($scope.deviceCheckedIds[device.name]) {
        commandPayLoad.devices.push(
          {
            id: device.name,
            title: device.displayName,
            address: device.address,
            command: $scope.commandSelected.command,
            commandName: $scope.commandSelected.name,
            parameters: $scope.commandSelected.parameters,
            type: 'CMD',
          }
        );
      }
    });

    devicesService
      .sendCommand(commandPayLoad)
      .then(function (data) {
        $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: 'COMMAND_SENT' });
        $scope.commandsNavClose(deviceCommandForm);
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };


  function commandsNavClose(deviceCommandForm) {

    $scope.clearDeviceCommandForm(deviceCommandForm); // TODO: non capisco perchè sono obbligato a passare il "name" della form e non recuperarla dallo scope

    $mdSidenav('commands-nav').close();
  };


  function commandsNavOpen($event) {
    $event.stopImmediatePropagation(); //top the fab closing animation

    $scope.isOneDeviceAvailable = false;

    // TODO: Adesso viene fatto un intersect dei comandi da valutare se abilitare/disabilitare il pulsante se non sono tutti uguali
    // Prepare the command list
    angular.forEach($scope.devices, function (device) {
      if ($scope.deviceCheckedIds[device.name]) {
        if ($scope.commandsAvailable.length == 0) {
          $scope.commandsAvailable = device.custom.batchCommands;
        } else {
          $scope.commandsAvailable = $filter('intersect')($scope.commandsAvailable, device.custom.batchCommands);
        }

        $scope.isOneDeviceAvailable = true;
      }
    });

    $mdSidenav('commands-nav').open();
  };


  function destroy() {
    wizardSuccessListener();
    wizardFailedListener();
    syncSuccessListener();
    batchStatusSuccessListener();
  };


  function deviceSelectAll(selectAll) {
    angular.forEach($scope.deviceCheckedIds, function (checked, key) {
      $scope.deviceCheckedIds[key] = selectAll;
    });
  };


  function editDeviceNavClose() {
    $mdSidenav('edit-device-nav').close();
    $scope.editDeviceIsOpen = false;
  };


  function editDeviceNavOpen($event) {
    $event.stopImmediatePropagation(); //top the fab closing animation
    $mdSidenav('edit-device-nav').open();
    $scope.editDeviceIsOpen = true;
  };


  function filtersNavClose() {
    $mdSidenav('filters-nav').close();
  };


  function filtersNavOpen($event) {
    $event.stopImmediatePropagation(); //top the fab closing animation
    $mdSidenav('filters-nav').open();
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


  function updateDevices(updateDevicesForm) {
    // Add all the fields for the selected command
    for (var i = 0; i < $scope.updateDevicesCommands.length; i++) {
      var tmp = $scope.updateDevicesCommands[i];
      if (tmp.name == $scope.updateDevicesCommandSelected.name) {
        angular.extend($scope.updateDevicesCommandSelected, tmp);
        break;
      }
    }

    var commandPayLoad = { devices: [] };

    angular.forEach($scope.devices, function (device) {
      if ($scope.deviceCheckedIds[device.name]) {
        if ($scope.updateDevicesCommandSelected.name == UPDATE_DEVICES_COMMAND_UPDATE) {
          var cloneDevice = JSON.parse(JSON.stringify(device));
          cloneDevice.config.production = $scope.updateDevicesCommandSelected.parameters || false;
          commandPayLoad.devices.push(
            {
              id: device.name,
              title: device.displayName,
              address: device.address,
              commandName: $scope.updateDevicesCommandSelected.name,
              parameters: cloneDevice,
              type: $scope.updateDevicesCommandSelected.type,
            }
          );
        } else if ($scope.updateDevicesCommandSelected.name == UPDATE_DEVICES_COMMAND_ADD_MAINTENANCE) {

          var parameters = $scope.updateDevicesCommandSelected.parameters;

          // Set startTime to 00:00:00
          parameters.startDate.setHours(0);
          parameters.startDate.setMinutes(0);
          parameters.startDate.setSeconds(0);

          // Set endTime to 23:59:59
          parameters.endDate.setHours(23);
          parameters.endDate.setMinutes(59);
          parameters.endDate.setSeconds(59);

          parameters.startTime = parameters.startDate.getTime();
          parameters.endTime = parameters.endDate.getTime();

          commandPayLoad.devices.push(
            {
              id: device.name,
              title: device.displayName,
              address: device.address,
              commandName: $scope.updateDevicesCommandSelected.name,
              parameters: parameters,
              type: $scope.updateDevicesCommandSelected.type,
            }
          );
        }
        else {
          commandPayLoad.devices.push(
            {
              id: device.name,
              title: device.displayName,
              address: device.address,
              commandName: $scope.updateDevicesCommandSelected.name,
              parameters: $scope.updateDevicesCommandSelected.parameters,
              type: $scope.updateDevicesCommandSelected.type,
            }
          );
        }
      }
    });

    devicesService
      .updateDevices(commandPayLoad)
      .then(function (data) {
        $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: 'COMMAND_SENT' });
        // $scope.updateDevicesNavClose(updateDevicesForm);

        // Aggiungo il batch nel local storage in modo da poterne verificare il progress
        bacthService.setLocalBatchData(data);
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };


  function updateDevicesNavClose(updateDevicesForm) {
    $scope.clearUpdateDevicesForm(updateDevicesForm); // TODO: non capisco perchè sono obbligato a passare il "name" della form e non recuperarla dallo scope

    $mdSidenav('updatedevices-nav').close();
  };


  function updateDevicesNavOpen($event) {
    $event.stopImmediatePropagation(); //top the fab closing animation

    if($scope.devices && $scope.devices.length>0) {$scope.isOneDeviceAvailable = true;}

    $mdSidenav('updatedevices-nav').open();
  };


  function uploadDeviceNavClose() {
    $mdSidenav('uploaddevice-nav').close();
  };


  function uploadDeviceNavOpen($event) {
    $event.stopImmediatePropagation(); //top the fab closing animation
    $mdSidenav('uploaddevice-nav').open();
  };


  function formatDeviceIdList(deviceCheckedIds) {
    var response = [];

    if (deviceCheckedIds) {
      angular.forEach($scope.devices, function (device) {
        if (deviceCheckedIds[device.name]) {
          response.push('<span class=\"tag\">' + device.displayName + '</span>');
        }
      });
    }
    return $scope.trustHtml(response.join(''));
  };


  function getClusterStatus(clusterStations) {
    var clusterEmpty = true;
    var clusterError = false;
    var clusterWarning = false;
    var clusterMaintenance = true;
    for (var i = 0; i < clusterStations.length; i++) {
      var clusterStation = clusterStations[i];
      var station = clusterStation.private;

      var stationDevices = [];
      var stationError = false;
      var stationWarning = false;
      var stationMaintenance = true;
      angular.forEach(station.devices, function (device) {
        // Prepare the device filtered list
        if (checkFilters(device)) {
          stationDevices.push(device);
          stationError |= device.error;
          stationWarning |= device.warning;
          stationMaintenance &= device.maintenance;
        }
      });

      // Una stazione è in manutenzione se ha almeno un dispositivo
      stationMaintenance &= stationDevices.length > 0;

      clusterEmpty &= stationDevices.length === 0;
      clusterError |= stationMaintenance == false && stationError;
      clusterWarning |= clusterError == false && stationWarning;
      clusterMaintenance &= stationMaintenance;
    }

    var status = {
      code: 'OK',
      class: 'marker-cluster-ok',
      hostClass: 'ok-host'
    };

    if (clusterMaintenance) {
      status.code = 'MNT';
      status.class = 'marker-cluster-maintenance';
      status.hostClass = 'maintenance-host';
    }
    else if (clusterError) {
      status.code = 'ERR';
      status.class = 'marker-cluster-error';
      status.hostClass = 'error-host';
    }
    else if (clusterWarning) {
      status.code = 'WAR';
      status.class = 'marker-cluster-warning';
      status.hostClass = 'warning-host';
    }
    else if (clusterEmpty) {
      status.code = 'MTY';
      status.class = 'marker-cluster-empty';
      status.hostClass = 'empty-host';
    }

    return status;
  }


  function getStationStatus(station) {
    var stationDevices = [];
    var stationEmpty = false;
    var stationError = false;
    var stationWarning = false;
    var stationMaintenance = true;
    angular.forEach(station.devices, function (device) {
      // Prepera the device filtered list
      if (checkFilters(device)) {
        stationDevices.push(device);

        stationError |= device.error;
        stationWarning |= device.warning;
        stationMaintenance &= device.maintenance;
      }
    });

    stationEmpty = stationDevices.length === 0;

    // Una stazione è in manutenzione se ha almeno un dispositivo
    stationMaintenance &= stationDevices.length > 0;

    var status = {
      code: 'OK',
      class: 'marker-cluster-ok',
      hostClass: 'ok-host'
    };

    if (stationMaintenance) {
      status.code = 'MNT';
      status.class = 'marker-cluster-maintenance';
      status.hostClass = 'maintenance-host';
    }
    else if (stationError) {
      status.code = 'ERR';
      status.class = 'marker-cluster-error';
      status.hostClass = 'error-host';
    }
    else if (stationWarning) {
      status.code = 'WAR';
      status.class = 'marker-cluster-warning';
      status.hostClass = 'warning-host';
    }
    else if (stationEmpty) {
      status.code = 'MTY';
      status.class = 'marker-cluster-empty';
      status.hostClass = 'empty-host';
    }

    return status;
  }


  function includesOneElement(arr1, arr2) {
    return arr1.some(function (v) {
      return arr2.includes(v);
    });
  }


  function navClose(side) {
    $mdSidenav(side)
      .close();
  };


  function navShow(side) {
    $mdSidenav(side)
      .toggle();
  };


  function onBatchStatus($event, args) {
    // $scope.setBatchProgress(args.data);
    $scope.batchStatus = args.data;
    syncService.restartSyncPoller();
  };


  function onCommandChange($event) {
    if ($scope.commandSelected) {
      $scope.commandSelected.parameters = undefined;
    }
  };


  function onNewSyncData($event, args) {
    var syncData = args.data;
    processSyncData(syncData);
  };


  function onSearchTermChange($event) {
    if (lastSyncRequestDataStr) {
      clearDeviceIdList();
      refresh(JSON.parse(lastSyncRequestDataStr));
    }
  }


  function onUpdateDevicesCommandChange($event) {
    if ($scope.updateDevicesCommandSelected) {
      $scope.updateDevicesCommandSelected.parameters = undefined;

      if ($scope.updateDevicesCommandSelected.name == $scope.UPDATE_DEVICES_COMMAND_ADD_MAINTENANCE) {
        $scope.updateDevicesCommandSelected.parameters = { author: $scope.currentUser.name + " " + $scope.currentUser.surname }
      }
    }
  }


  function onWizardSuccess($event, args) {
    $event.preventDefault();
    $event.stopPropagation();
    $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: args.message });

    if (args.closeSideBar) {
      $timeout(function () {
        // Close the sidebar
        $scope.editDeviceNavClose();

        syncService.updateDeviceCachedData(args.data); //TODO: da rivedere
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
    var devices = [];

    var deviceScreenshotIds = {};
    var deviceCheckedIds = {};
    var deviceRandom = {};
    var stationsTree = status.stationsTree || [];
    angular.forEach(stationsTree, function (station, key) {

      var stationName = station.name;
      var stationDisplayName = station.displayName;
      var lat = station.custom.position.lat;
      var lng = station.custom.position.lng;
      var lineNames = station.custom.lineNames;

      // Rimuove la stazione *MR-UNDEFINED* dalla visualizzazione a mappa
      if (stationName !== STATION_UNDEFINED) {

        var devicesFiltered = [];
        for (key in station.devices) {

          var device = station.devices[key];
          if (checkFilters(device)) {
            devicesFiltered.push(device);
          }
        }

        station.devicesFiltered = devicesFiltered;

        var popupContent = {
          station: station,
          deviceNumberViewLimit: $scope.deviceNumberViewLimit,
          goto: $scope.goto,
          showMore: function (stationName) {
            $scope.goto("stationDetails/" + stationName + "/list/devices/map");
          }
        };

        var stationStatus = getStationStatus(station);

        markers[stationName] = {
          lat: lat,
          lng: lng,
          title: stationDisplayName,
          icon: {
            type: 'div',
            iconSize: [40, 40],
            html: '<div><span><b>' + stationStatus.code + '</b></span></div>',
            className: 'marker-cluster ' + stationStatus.class,
            popupAnchor: [0, 0]
          },
          popupTemplate: popupStationTemplate,
          popupContent: popupContent,
          private: station
        };

      }

      angular.forEach(station.devices, function (device) {

        // Prepera the device filtered list
        if (checkFilters(device)) {
          devices.push(device);
        }

        // Prepare the current screenshot for the devices
        deviceScreenshotIds[device.name] = $scope.deviceScreenshotIds[device.name] || 0;

        // Prepare the checkbox models for the devices
        deviceCheckedIds[device.name] = $scope.deviceCheckedIds[device.name] || false;

        // Prepare the random values for the devices
        deviceRandom[device.name] = $scope.deviceRandom[device.name] || new Date().getTime();

      });

    });


    $scope.mapMarkers = markers;
    $scope.devices = devices;

    $scope.deviceScreenshotIds = deviceScreenshotIds;
    $scope.deviceCheckedIds = deviceCheckedIds;
    $scope.deviceRandom = deviceRandom;

    if ($scope.dynamicItems == null) {
      $scope.dynamicItems = new DynamicItems($scope.devices);
    } else {
      $scope.dynamicItems.reset($scope.devices);
    }

    $scope.dataHasLoaded = true;
  };


  function setFilterData(filters, isActive) {
    $scope.isFilterActive = isActive;
    $scope.filters = filters;

    if (lastSyncRequestDataStr) {
      clearDeviceIdList();
      refresh(JSON.parse(lastSyncRequestDataStr));
    }
  };


  function showScreenshot(deviceName, idx) {
    $scope.deviceRandom[deviceName] = new Date().getTime();
    $scope.deviceScreenshotIds[deviceName] = idx;
  };

};
