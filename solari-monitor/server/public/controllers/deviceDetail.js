controllersDomain.controller('DeviceDetailController', DeviceDetailController);

/* @ngInject */
function DeviceDetailController(
  $rootScope, $scope, $log, $routeParams, $filter, $timeout, $mdSidenav, $mdDialog,
  syncService, devicesService, groupsService, ticketsService, kibanaService,
  APPLICATION_EVENTS, WIZARD_EVENTS, SYNC_EVENTS) {

  var lastSyncRequestDataStr = null;

  var currDate = new Date();
  var fromDate = new Date(currDate.setHours(0, 0, 0, 0));
  var toDate = new Date(currDate.setHours(23, 59, 59, 0));

  var defaultChartFilters = {
    from: fromDate,
    to: toDate,
    device: -1,
    station: -1,
    template: -1
  };

  var defaultTicket = {
    subject: "",
    description: "",
    deviceId: -1,
    deviceName: ""
  };

  /**
   * BINDINGS
   ************************************************/

  $scope.areas = [];
  $scope.chartFilters = defaultChartFilters;
  $scope.commandsAvailable = [];
  $scope.commandRequireParams = commandRequireParams;
  $scope.commandSelected = {};
  $scope.commandSend = commandSend;
  $scope.createTicket = createTicket;
  $scope.currentStation = null;
  $scope.currentTemplate = null;
  $scope.customFieldConfs = [];
  $scope.editDeviceIsOpen = false;
  $scope.dashboardId = "";
  $scope.dashboards = [];
  $scope.deleteDevice = deleteDevice;
  $scope.deviceDefaults = {};
  $scope.device = {};
  $scope.devices = [];
  $scope.downtime = {};
  $scope.editDeviceNavClose = editDeviceNavClose;
  $scope.editDeviceNavOpen = editDeviceNavOpen;
  $scope.filterChart = filterChart;
  $scope.form = {};
  $scope.fabIsOpen = false;
  $scope.fabSelectedMode = 'md-scale';
  $scope.getCustomServiceValues = getCustomServiceValues;
  $scope.getCustomThresholdValues = getCustomThresholdValues;
  $scope.groups = [];
  $scope.id = -1;
  $scope.isLogAvailable = false;
  $scope.isMaintenanceFormSubmitting = false;
  $scope.isCommandFormSubmitting = false;
  $scope.isTicketFormSubmitting = false;
  $scope.kibanaDashUrl = "";
  $scope.lines = [];
  $scope.getTickets = getTickets;
  $scope.maintenanceSchedule = maintenanceSchedule;
  $scope.maintenanceRemove = maintenanceRemove;
  $scope.newDowntime = {};
  $scope.newTicket = {};
  $scope.onDetailTabDeSelect = onDetailTabDeSelect;
  $scope.onDetailTabSelect = onDetailTabSelect;
  $scope.onScreenshotTabDeSelect = onScreenshotTabDeSelect;
  $scope.onScreenshotTabSelect = onScreenshotTabSelect;
  $scope.onMaintenanceTabSelect = onMaintenanceTabSelect;
  $scope.onTicketTabSelect = onTicketTabSelect;
  $scope.query = { order: 'id', limit: 5, page: 1 };
  $scope.reset = reset;
  $scope.random;
  $scope.returnToRoute = $routeParams.returnToRoute ? '/devices/' + $routeParams.returnToRoute : '/devices';
  $scope.showDetailIframe = false;
  $scope.showScreenshot = false;
  $scope.selected = [];
  $scope.stationFloors = [];
  $scope.stations = [];
  $scope.templates = [];
  $scope.tickets = [];


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

  function clearForm() {
    if ($scope.form.ticketForm) {
      $scope.form.ticketForm.$setUntouched();
      $scope.form.ticketForm.$setPristine();

      defaultTicket.deviceId = $scope.id;
      $scope.newTicket = angular.copy(defaultTicket);
    }

    if ($scope.form.filtersForm) {
      $scope.form.filtersForm.$setUntouched();
      $scope.form.filtersForm.$setPristine();
      $scope.chartFilters = angular.copy(defaultChartFilters);
    }
  }


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

    var device = $scope.device;
    var commandPayLoad = { devices: [] };

    commandPayLoad.devices.push(
      {
        id: device.name,
        title: device.displayName,
        address: device.address,
        command: $scope.commandSelected.command,
        parameters: $scope.commandSelected.parameters
      }
    );

    $scope.isCommandFormSubmitting = true;

    devicesService
      .sendCommand(commandPayLoad)
      .then(function (data) {
        $scope.isCommandFormSubmitting = false;
        $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: 'COMMAND_SENT' });
        // Clear command selection
        $scope.commandSelected = {};
        deviceCommandForm.$setUntouched();
        deviceCommandForm.$setPristine();
      })
      .catch(function (err) {
        $log.error(err);
        $scope.isCommandFormSubmitting = false;
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };


  function activate() {
    $scope.setCurrentNavBarItem('devices'); // defined in application controller
    $scope.setSummaryData({ ok: '-', error: '-', warning: '-', maintenance: '-', lastUpdate: undefined });

    $scope.id = $routeParams.id;

    clearForm();

    defaultTicket.deviceId = $scope.id;
    $scope.newTicket = angular.copy(defaultTicket);
    $scope.chartFilters = angular.copy(defaultChartFilters);

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

/*
    // Load the available groups from the DB and initialize the poller
    kibanaService
      .listDashboards()
      .then(function (data) {
        $scope.dashboards = data.dashboards;
        $scope.dashboardId = $scope.dashboards.length > 0 ? $scope.dashboards[0].id : "";
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
*/
  };


  function checkLogAvailability() {

    if (!$scope.device || !$scope.device.config) {
      return;
    }

    var address = $scope.device.address;

    return devicesService.getDeviceLog(address)
      .then(function (data) {
        $scope.isLogAvailable = true;
      })
      .catch(function (err) {
        $log.error(err);
        $scope.isLogAvailable = false;
      });
  }


  function deleteDevice($event) {
    // Appending dialog to document.body to cover sidenav in docs app
    var confirm = $mdDialog.confirm()
      .title($filter('translate')('DELETE_CONFIRM_TITLE'))
      .textContent($filter('translate')('DELETE_CONFIRM_MSG'))
      .ariaLabel($filter('translate')('DELETE_CONFIRM_TITLE'))
      .targetEvent($event)
      .ok($filter('translate')('OK'))
      .cancel($filter('translate')('CANCEL'));

    $mdDialog.show(confirm).then(function () {
      // Confirm function, call service
      devicesService.deleteDevice($scope.device.name, $scope.device)
        .then(function (data) {
          $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: 'DEVICE_DELETED' });

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
  }


  function editDeviceNavClose() {
    $mdSidenav('edit-device-nav').close();
    $scope.editDeviceIsOpen = false;
  };


  function editDeviceNavOpen($event) {
    $event.stopImmediatePropagation(); //top the fab closing animation

    // Load the current device data for editing
    $scope.deviceDefaults = angular.copy($scope.device);
    $scope.editDeviceIsOpen = true;

    // Timeout to improve animation
    $timeout(function () {
      $mdSidenav('edit-device-nav').open();
    }, 100);

  };


/*
  function filterChart() {
    var payload = $scope.chartFilters;
    kibanaService.filterChart($scope.dashboardId, payload, $scope.id)
      .then(function (data) {
        $scope.kibanaDashUrl = data.iframeUrl;
        renderReportIframe();
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  }
*/
  function filterChart() {
    var payload = $scope.chartFilters;
    kibanaService.filterChart(payload, $scope.id)
      .then(function (data) {
        $scope.kibanaDashUrl = data.iframeUrl;
        renderReportIframe();
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  }


  function getCurrentStation() {
    if (!$scope.device || !$scope.device.config) {
      return null;
    }

    var stationName = $scope.device.config.stationName;
    for (var i = 0; i < $scope.stations.length; i++) {
      var station = $scope.stations[i];
      if (station.name == stationName) {
        return station;
      }
    }
  };


  function getCurrentTemplate() {
    if (!$scope.device || !$scope.device.config) {
      return null;
    }

    var templateName = $scope.device.config.templateName;
    for (var i = 0; i < $scope.templates.length; i++) {
      var template = $scope.templates[i];
      if (template.name == templateName) {
        return template;
      }
    }
  };


  function getCustomServiceValues(serviceName) {
    var services = $scope.device.services ? $scope.device.services : {};
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


  function getCustomThresholdValues(serviceName, thresholdName) {
    var serviceValues = getCustomServiceValues(serviceName);
    var thresholds = serviceValues && serviceValues.outputJSON && serviceValues.outputJSON.thresholds ? serviceValues.outputJSON.thresholds : [];
    var threshold = thresholds.find(function (threshold) { return threshold.name == thresholdName; });
    return threshold ? threshold : null;
  };


  function getMaintenance() {
    devicesService.getMaintenance($scope.id)
      .then(function (downtime) {

        if (downtime) {
          // Create a Date object for the UI
          downtime.startDate = new Date(downtime.startTime);
          downtime.startDate.setHours(0);
          downtime.startDate.setMinutes(0);
          downtime.startDate.setSeconds(0);

          // Create a Date object for the UI
          downtime.endDate = new Date(downtime.endTime);
          downtime.endDate.setHours(23);
          downtime.endDate.setMinutes(59);
          downtime.endDate.setSeconds(59);
        }

        $scope.downtime = downtime;
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };


  function isJsonString(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  };


  function getTickets() {
    ticketsService.getTickets($scope.id)
      .then(function (data) {
        $scope.tickets = data.tickets;
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  }


  function maintenanceSchedule() {

    var payload = $scope.newDowntime;

    // Set startTime to 00:00:00
    payload.startDate.setHours(0);
    payload.startDate.setMinutes(0);
    payload.startDate.setSeconds(0);

    // Set endTime to 23:59:59
    payload.endDate.setHours(23);
    payload.endDate.setMinutes(59);
    payload.endDate.setSeconds(59);

    payload.startTime = payload.startDate.getTime();
    payload.endTime = payload.endDate.getTime();

    $scope.isMaintenanceFormSubmitting = true;

    devicesService.scheduleMaintenance($scope.device.name, payload)
      .then(function (data) {
        $scope.isMaintenanceFormSubmitting = false;
        $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: 'MAINTENANCE_SCHEDULED' });

        getMaintenance();
        syncService.restartSyncPoller();
      })
      .catch(function (err) {
        $log.error(err);
        $scope.isMaintenanceFormSubmitting = false;
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };


  function maintenanceRemove($event) {
    // Appending dialog to document.body to cover sidenav in docs app
    var confirm = $mdDialog.confirm()
      .title($filter('translate')('DELETE_CONFIRM_TITLE'))
      .textContent($filter('translate')('DELETE_CONFIRM_MSG'))
      .ariaLabel($filter('translate')('DELETE_CONFIRM_TITLE'))
      .targetEvent($event)
      .ok($filter('translate')('OK'))
      .cancel($filter('translate')('CANCEL'));

    $mdDialog.show(confirm).then(function () {
      // Confirm function, call service
      devicesService.removeMaintenance($scope.device.name, $scope.downtime)
        .then(function (data) {
          $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: 'MAINTENANCE_REMOVED' });

          getMaintenance();
          syncService.restartSyncPoller();
        })
        .catch(function (err) {
          $log.error(err);
          $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
        });

    }, function () {
      // Cancel function, do nothing
    });
  };


  function onDetailTabDeSelect() {
    $scope.showDetailIframe = false;
  };


  function onDetailTabSelect() {
    $scope.showDetailIframe = true;
    checkLogAvailability();
  };


  function onNewSyncData($event, args) {
    var data = args.data;
    processSyncData(data);
  };


  function onScreenshotTabDeSelect() {
    $scope.showScreenshot = false;
  };


  function onScreenshotTabSelect() {
    $scope.showScreenshot = true;
  };


  function onMaintenanceTabSelect() {
    $scope.newDowntime = { author: $scope.currentUser.name + " " + $scope.currentUser.surname };

    getMaintenance();
  };


  function onTicketTabSelect() {
    getTickets();
  };


  function onWizardSuccess($event, args) {
    $event.preventDefault();
    $event.stopPropagation();
    $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: args.message, description: args.description });

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


  function prepareCustomFieldConfs() {
    $scope.customFieldConfs = $scope.currentTemplate ? $scope.currentTemplate.custom.templateFields : [];
  };


  function prepareStationFloors() {
    $scope.stationFloors = $scope.currentStation ? $scope.currentStation.custom.floors : [];
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

    $scope.random = new Date().getTime();

    $scope.areas = status.areas;
    $scope.lines = status.lines;
    $scope.devices = status.devices;
    $scope.stations = status.stations;
    $scope.templates = status.templates;

    var device = null;
    var devices = status.devices;

    for (var i = 0; i < devices.length; i++) {
      if (devices[i].name === $scope.id) {
        device = devices[i];
        break;
      }
    }

    if (JSON.stringify(device) === JSON.stringify($scope.device)) {
      $log.debug('Device data not changed');
      return;
    }

    angular.forEach(device.services, function (service) {
      if (isJsonString(service.output)) {
        service.outputJSON = JSON.parse(service.output);
      }
    });

    $scope.device = device;
    $scope.commandsAvailable = device.custom.batchCommands;
    $scope.currentTemplate = getCurrentTemplate();
    $scope.currentStation = getCurrentStation();

    // Aggiorno il device name
    $scope.newTicket.deviceName = $scope.device.displayName;

    prepareCustomFieldConfs();
    prepareStationFloors();
  };


  function renderReportIframe() {
    angular.element(document.querySelector("#kibana-iframe")).remove();
    var el = document.createElement('iframe');
    el.src = $scope.kibanaDashUrl;
    el.id = "kibana-iframe";
    angular.element(document.querySelector("#kibana-iframe-container")).html(el.outerHTML);
  }


/*
  function reset() {
    $scope.kibanaDashUrl = "";
    clearForm();

    kibanaService.getDashboardUrl($scope.dashboardId, $scope.id)
      .then(function (data) {
        $scope.kibanaDashUrl = data.iframeUrl;
        renderReportIframe();
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  }
*/

  function reset() {
    $scope.kibanaDashUrl = "";
    clearForm();

    kibanaService.getDashboardUrl($scope.id)
      .then(function (data) {
        $scope.kibanaDashUrl = data.iframeUrl;
        renderReportIframe();
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  }



  function createTicket() {
    var payload = $scope.newTicket;

    $scope.isTicketFormSubmitting = true;

    ticketsService
      .createTicket(payload)
      .then(function (data) {
        $scope.isTicketFormSubmitting = false;
        clearForm();
        getTickets();
        $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: 'TICKET_CREATED' });
      })
      .catch(function (err) {
        $log.error(err);
        $scope.isTicketFormSubmitting = false;
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  }

}
