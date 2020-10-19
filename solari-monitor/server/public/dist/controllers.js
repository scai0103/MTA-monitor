
ApplicationController.$inject = ["$rootScope", "$scope", "$window", "$location", "$timeout", "$log", "$filter", "$sce", "toastr", "USER_ROLES", "AUTH_EVENTS", "APPLICATION_EVENTS", "PATHS", "AuthService"];
AuditLogController.$inject = ["$scope", "$rootScope", "$log", "$mdDialog", "$filter", "auditLogService", "APPLICATION_EVENTS"];
DeviceDetailController.$inject = ["$rootScope", "$scope", "$log", "$routeParams", "$filter", "$timeout", "$mdSidenav", "$mdDialog", "syncService", "devicesService", "groupsService", "ticketsService", "kibanaService", "APPLICATION_EVENTS", "WIZARD_EVENTS", "SYNC_EVENTS"];
DevicesController.$inject = ["$rootScope", "$scope", "$log", "$timeout", "$filter", "$routeParams", "$mdSidenav", "devicesService", "groupsService", "syncService", "bacthService", "popupStationTemplate", "DynamicItems", "APPLICATION_EVENTS", "WIZARD_EVENTS", "SYNC_EVENTS", "BATCH_EVENTS"];
GroupsController.$inject = ["APPLICATION_EVENTS", "$scope", "$rootScope", "$log", "$filter", "groupsService", "$mdSidenav", "$mdDialog"];
HistoryController.$inject = ["APPLICATION_EVENTS", "$scope", "$rootScope", "$log", "kibanaService", "devicesService"];
LoginController.$inject = ["$rootScope", "$scope", "$location", "$route", "$log", "AUTH_EVENTS", "AuthService", "APPLICATION_EVENTS"];
NavbarController.$inject = ["$rootScope", "$scope", "$translate", "AVAILABLE_LANGUAGES"];
StationDetailController.$inject = ["$rootScope", "$scope", "$log", "$mdSidenav", "$mdDialog", "$routeParams", "$timeout", "$filter", "stationsService", "syncService", "groupsService", "popupDeviceTemplate", "DynamicItems", "APPLICATION_EVENTS", "WIZARD_EVENTS", "SYNC_EVENTS"];
StationsController.$inject = ["$rootScope", "$scope", "$log", "$timeout", "$filter", "$routeParams", "$mdSidenav", "$mdDialog", "stationsService", "syncService", "popupStationTemplate", "DynamicItems", "APPLICATION_EVENTS", "WIZARD_EVENTS", "SYNC_EVENTS"];
UsersController.$inject = ["$scope", "$rootScope", "$mdDialog", "$mdSidenav", "$log", "$filter", "USER_ROLES", "APPLICATION_EVENTS", "usersService", "groupsService"];var controllersDomain = angular.module('SolariMonitor.controllers', []);
controllersDomain.controller('ApplicationController', ApplicationController);

/* @ngInject */
function ApplicationController($rootScope, $scope, $window, $location, $timeout, $log, $filter, $sce,
  toastr, USER_ROLES, AUTH_EVENTS, APPLICATION_EVENTS, PATHS, AuthService) {

  /**
   * BINDINGS
   ************************************************/

  $scope.batchStatus = null;
  $scope.currentUser = null;
  $scope.userRoles = USER_ROLES;
  $scope.isAuthenticated = AuthService.isAuthenticated;
  $scope.isAuthorized = AuthService.isAuthorized;
  $scope.isLoading = false;
  $scope.currentNavItem = null;
  $scope.imageBasePath = PATHS.imageBasePath;
  $scope.mapImagePath = PATHS.mapImagePath;
  $scope.summaryData = null;
  $scope.stationImageBasePath = PATHS.stationImageBasePath;
  $scope.tempBasePath = PATHS.tempBasePath;


  /**
   * EVENTS
   ************************************************/

  // Handle the authentication events
  var loginSuccessListener = $scope.$on(AUTH_EVENTS.loginSuccess, function (event) {
    $location.path('/devices');
  });

  var notAuthenticatedListener = $scope.$on(AUTH_EVENTS.notAuthenticated, function (event) {
    // Used timeout to resolve problem with location change conflicts (refresh)
    $timeout(function () {
      AuthService.logout();
    }, 100);
  });

  var notAuthorizedListener = $scope.$on(AUTH_EVENTS.notAuthorized, function (event) {
    // Used timeout to resolve problem with location change conflicts (refresh)
    $timeout(function () {
      AuthService.logout();
    }, 100);
  });

  var loadingCounter = 0;
  var loadingListener = $scope.$on(APPLICATION_EVENTS.appLoading, function (event, args) {
    $timeout(function () {
      if (args.loading) {
        loadingCounter = loadingCounter + 1;
      } else {
        loadingCounter = loadingCounter - 1;
      }

      $scope.isLoading = loadingCounter > 0;
    }, 100);
  });

  var errorNotificationListener = $scope.$on(APPLICATION_EVENTS.appErrorNotify, function (event, args) {
    var message = $filter('translate')(args.message);
    if (args.description) {
      message += '<br/><code>' + args.description + '<code>';
    }
    toastr.error(message, $filter('translate')('ERROR'), { allowHtml: true });
  });

  var infoNotificationListener = $scope.$on(APPLICATION_EVENTS.appInfoNotify, function (event, args) {
    toastr.info($filter('translate')(args.message), $filter('translate')('INFO'));
  });

  var successNotificationListener = $scope.$on(APPLICATION_EVENTS.appSuccessNotify, function (event, args) {
    toastr.success($filter('translate')(args.message), $filter('translate')('SUCCESS'));
  });

  $scope.$on('$destroy', function () {
    loginSuccessListener();
    loginFailedListener();
    notAuthenticatedListener();
    notAuthorizedListener();
    loadingListener();
    errorNotificationListener();
    infoNotificationListener();
    successNotificationListener();
  });


  /**
   * FUNCTIONS
   ************************************************/

  $scope.goto = function (path) {
    $location.path(path);
  };

  $scope.logout = function () {
    AuthService.logout();
  };

  $scope.openCommandDashboard = function () {
    var commandDashboardURI = $scope.currentUser.extra ? $scope.currentUser.extra.commandDashboardURI : '';
    var commandDashboardAuth = $scope.currentUser.extra ? $scope.currentUser.extra.commandDashboardAuth : '';
    var commandDashboardURISegments = commandDashboardURI.split('://');

    var href = commandDashboardURISegments[0] + '://' + commandDashboardURISegments[1]; //commandDashboardAuth + '@' +
    $window.open(href, '_blank');
  };

  $scope.setBatchProgress = function(data) {
    $scope.batchStatus = data;
  };

  $scope.setCurrentUser = function (user) {
    $scope.currentUser = user;
  };

  $scope.setCurrentNavBarItem = function (currentNavItem) {
    $timeout(function () {
      $scope.currentNavItem = currentNavItem;
    }, 100);
  };

  $scope.setSummaryData = function (data) {
    $scope.summaryData = data;
  };

  $scope.trustSrc = function (src) {
    return $sce.trustAsResourceUrl(src);
  };

  $scope.trustHtml = function (html) {
    return $sce.trustAsHtml(html);
  };


  if ($scope.isAuthenticated()) {
    AuthService.getCurrentUser().then(function (user) {
      $scope.setCurrentUser(user);
    }, function (res) {
      $log.error(res.data);
    });
  }
};

controllersDomain.controller('AuditLogController', AuditLogController);

/* @ngInject */
function AuditLogController($scope, $rootScope, $log, $mdDialog, $filter, auditLogService, APPLICATION_EVENTS) {

  var currentDate = new Date();
  var startDate = subtractMonth(currentDate, 1);
  var dateEnd = currentDate;


  /**
   * BINDINGS
   ************************************************/

  $scope.dateStart = startDate;
  $scope.dateEnd = dateEnd;
  $scope.deleteData = deleteData;
  $scope.logs = [];
  $scope.pageTitle = 'AUDIT_LOG';
  $scope.query = { order: 'createdAt', limit: 10, page: 1, filter: '' };
  $scope.refreshData = refresh;
  $scope.selected = [];


  activate();


  /**
  * FUNCTIONS
  ************************************************/

  function activate() {
    $scope.setCurrentNavBarItem(null);
    $scope.setSummaryData(null);
    refresh();
  };


  function deleteData($event) {

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
      var dateStart = $scope.dateStart.setHours(0, 0, 0, 0);
      var dateEnd = $scope.dateEnd.setHours(23, 59, 59, 0);

      auditLogService
        .deleteAuditLogs(dateStart, dateEnd)
        .then(function () {
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


  function refresh() {
    var dateStart = $scope.dateStart.setHours(0, 0, 0, 0);
    var dateEnd = $scope.dateEnd.setHours(23, 59, 59, 0);

    auditLogService
      .getAuditLogs(dateStart, dateEnd)
      .then(function (data) {
        $scope.logs = data.auditLogs;
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };


  function subtractMonth(dt, subMonth) {
    return new Date(new Date(dt).setMonth(dt.getMonth() - subMonth));
  };
};

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

	quickFilterListener = $rootScope.$on('quickFilter', function(event, filters){
		setFilterData(filters,true);
		$log.log(filters + "INSIDE");
	});
	alert(filters + "OUTSIDE");
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

controllersDomain.controller('GroupsController', GroupsController);

/* @ngInject */
function GroupsController(APPLICATION_EVENTS, $scope, $rootScope, $log, $filter, groupsService, $mdSidenav, $mdDialog) {

  var groupModelIntitial = { name: "" };


  /**
   * BINDINGS
   ************************************************/

  $scope.addGroup = addGroup;
  $scope.deleteGroup = deleteGroup;
  $scope.disableFabToolbar = disableFabToolbar;
  $scope.editGroupNavClose = editGroupNavClose;
  $scope.editGroupNavOpen = editGroupNavOpen;
  $scope.enableFabToolbar = enableFabToolbar;
  $scope.groupModel = angular.copy(groupModelIntitial);
  $scope.handleSubmit = handleSubmit;
  $scope.isFormSubmitting = false;
  $scope.isOpen = false;
  $scope.isUpdate = false;
  $scope.pageTitle = 'GROUPS';
  $scope.query = { order: 'name', limit: 10, page: 1 };
  $scope.refreshGroups = refreshGroups;
  $scope.selected = [];
  $scope.selectedMode = 'md-scale';
  $scope.showConfirm = showConfirm;
  $scope.updateGroup = updateGroup;


  activate();


  /**
   * FUNCTIONS
   ************************************************/

  function activate() {
    $scope.setCurrentNavBarItem('groups'); // defined in application controller
    $scope.setSummaryData(null);
    $scope.refreshGroups(); // Call refreshUsers for the page first loading
  }

  function addGroup() {
    $scope.isUpdate = false;
    $scope.editGroupNavOpen();
  };

  function deleteGroup() {
    groupsService.deleteGroups($scope.selected)
      .then(function (data) {
        $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: "GROUP_DELETED" });
        $scope.refreshGroups();
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };

  function disableFabToolbar() {
    $scope.isOpen = false;
  };

  function editGroupNavClose() {
    $scope.groupForm.$setUntouched();
    $scope.groupForm.$setPristine();
    $scope.groupModel = angular.copy(groupModelIntitial);
    $mdSidenav('edit-group-nav')
      .close()
      .then(function () {
        isOpen = false;
      })
  };

  function editGroupNavOpen() {
    $scope.disableFabToolbar();
    $mdSidenav('edit-group-nav').toggle()
  };

  function enableFabToolbar() {
    $scope.isOpen = true;
  };

  function handleSubmit() {

    $scope.isFormSubmitting = true;

    if ($scope.isUpdate) {
      var payload = {
        "groupId": $scope.selected[0],
        "group": $scope.groupModel
      }
      groupsService.updateGroup(payload)
        .then(function (data) {
          $scope.isFormSubmitting = false;
          $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: "GROUP_UPDATED" });
          $scope.isUpdate = false;
          $scope.editGroupNavClose();
          $scope.refreshGroups();
        })
        .catch(function (err) {
          $log.error(err);
          $scope.isFormSubmitting = false;
          $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
        });
    } else {
      groupsService.createGroup($scope.groupModel)
        .then(function (data) {
          $scope.isFormSubmitting = false;
          $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: "GROUP_CREATED" });
          $scope.editGroupNavClose();
          $scope.refreshGroups();
        })
        .catch(function (err) {
          $log.error(err);
          $scope.isFormSubmitting = false;
          $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
        });
    }
  };

  function refreshGroups() {
    // Clear current selected groups
    $scope.selected = [];
    // When we open the section we want to retrieve the list of groups
    groupsService.listGroups()
      .then(function (data) {
        $scope.groups = data.groups;
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };

  function showConfirm(ev) {
    // Appending dialog to document.body to cover sidenav in docs app
    var confirm = $mdDialog.confirm()
      .title($filter('translate')('DELETE_CONFIRM_TITLE'))
      .textContent($filter('translate')('DELETE_CONFIRM_MSG'))
      .ariaLabel($filter('translate')('DELETE_CONFIRM_TITLE'))
      .targetEvent(ev)
      .ok($filter('translate')('OK'))
      .cancel($filter('translate')('CANCEL'));

    $mdDialog.show(confirm)
      .then(function () {
        // Confirm function, call service
        $scope.deleteGroup();
      }, function () {
        // Cancel function, do nothing
      });
  };

  function updateGroup() {
    var groupId = $scope.selected[0];
    groupsService.getGroup(groupId)
      .then(function (data) {
        $scope.isUpdate = true;
        $scope.groupModel = data.group;
        $scope.editGroupNavOpen();
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };
};



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




controllersDomain.controller('LoginController', LoginController);

/* @ngInject */
function LoginController($rootScope, $scope, $location, $route, $log, AUTH_EVENTS, AuthService, APPLICATION_EVENTS) {

  /**
   * BINDINGS
   ************************************************/

  $scope.credentials = {
    username: "",
    password: ""
  };
  $scope.submitForm = submitForm;


  /**
   * FUNCTIONS
   ************************************************/

  function submitForm() {
    AuthService.login($scope.credentials)
      .then(function (user) {
        $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
        $scope.setCurrentUser(user); // Defined in ApplicationCtrl
      }, function (err) {
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };
};

controllersDomain.controller('NavbarController', NavbarController);

/* @ngInject */
function NavbarController($rootScope, $scope, $translate, AVAILABLE_LANGUAGES) {
    $scope.availableLanguages = AVAILABLE_LANGUAGES;
    $scope.currentLanguage = 'en';
    // $scope.$watch('currentLanguage', function() {
    //     $translate.use($scope.currentLanguage);
    // });
};

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

controllersDomain.controller('UsersController', UsersController);

/* @ngInject */
function UsersController($scope, $rootScope, $mdDialog, $mdSidenav, $log, $filter, USER_ROLES, APPLICATION_EVENTS, usersService, groupsService) {

  var userModelInitial = {
    name: "",
    surname: "",
    email: "",
    password: "",
    confirmPassword: "",
    idRole: null,
    idGroup: null,
    idRedmine: null,
    idKibana: null
  };


  /**
   * BINDINGS
   ************************************************/

  $scope.addUser = addUser;
  $scope.deleteUser = deleteUser;
  $scope.disableFabToolbar = disableFabToolbar;
  $scope.editUserNavClose = editUserNavClose;
  $scope.editUserNavOpen = editUserNavOpen;
  $scope.enableFabToolbar = enableFabToolbar;
  $scope.handleSubmit = handleSubmit;
  $scope.isFormSubmitting = false;
  $scope.isOpen = false;
  $scope.isUpdate = false;
  $scope.pageTitle = 'USERS';
  $scope.query = { order: 'name', limit: 10, page: 1 };
  $scope.refreshUsers = refreshUsers;
  $scope.selected = [];
  $scope.selectedMode = 'md-scale';
  $scope.showConfirm = showConfirm;
  $scope.updateUser = updateUser;
  $scope.userModel = angular.copy(userModelInitial);
  $scope.userRoles = USER_ROLES;


  activate();


  /**
   * FUNCTIONS
   ************************************************/

  function activate() {
    $scope.setCurrentNavBarItem('users'); // defined in application controller
    $scope.setSummaryData(null);
    $scope.refreshUsers(); // Call refreshUsers for the page first loading
  }

  function addUser() {
    $scope.isUpdate = false;
    $scope.editUserNavOpen('right');
  };

  function deleteUser() {
    usersService.deleteUsers($scope.selected)
      .then(function (data) {
        $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: "USER_DELETED" });
        $scope.refreshUsers();
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
        $scope.refreshUsers();
      });
  };

  function disableFabToolbar() {
    $scope.isOpen = false;
  };

  function editUserNavClose() {
    $scope.userForm.$setUntouched();
    $scope.userForm.$setPristine();
    $scope.userModel = angular.copy(userModelInitial);
    $mdSidenav('edit-user-nav').close();
  };

  function editUserNavOpen() {
    $scope.userForm.$setUntouched();
    $scope.userForm.$setPristine();
    $mdSidenav('edit-user-nav').toggle();
  };

  function enableFabToolbar() {
    $scope.isOpen = true;
  };

  function handleSubmit() {

    $scope.isFormSubmitting = true;

    if ($scope.isUpdate) {
      var payload = {
        "userId": $scope.selected[0],
        "user": $scope.userModel
      }
      usersService.updateUser(payload)
        .then(function (data) {
          $scope.isFormSubmitting = false;
          $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: "USER_UPDATED" });
          $scope.isUpdate = false;
          $scope.editUserNavClose();
          $scope.refreshUsers();
        })
        .catch(function (err) {
          $log.error(err);
          $scope.isFormSubmitting = false;
          $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
        });
    } else {
      usersService.createUser($scope.userModel)
        .then(function (data) {
          $scope.isFormSubmitting = false;
          $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: "USER_CREATED" });
          $scope.editUserNavClose();
          $scope.refreshUsers();
        })
        .catch(function (err) {
          $log.error(err);
          $scope.isFormSubmitting = false;
          $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
        });
    }
  };

  function refreshUsers() {
    // Clear current selected users
    $scope.selected = [];
    // When we open the section we want to retrieve the list of users
    usersService.listUsers()
      .then(function (data) {

        $scope.users = data.users;
        for (var i in data.users) {
          var user = data.users[i];
          switch (user.idRole) {
            case $scope.userRoles.superadmin:
              user.roleName = "SuperAdmin";
              break;
            case $scope.userRoles.admin:
              user.roleName = "Admin";
              break;
            case $scope.userRoles.maintainer:
              user.roleName = "Maintainer";
              break;
            case $scope.userRoles.operator:
              user.roleName = "Operator";
              break;
            default:
              user.roleName = "-";
              break;
          }
        }

        // Load the groups from DB so they can be printed on the table
        groupsService.listGroups()
          .then(function (data) {
            $scope.groups = data.groups;
          })
          .catch(function (err) {
            $log.error(err);
            $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
          });

      }).catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };

  function showConfirm(ev) {
    // Appending dialog to document.body to cover sidenav in docs app
    var confirm = $mdDialog.confirm()
      .title($filter('translate')('DELETE_CONFIRM_TITLE'))
      .textContent($filter('translate')('DELETE_CONFIRM_MSG'))
      .ariaLabel($filter('translate')('DELETE_CONFIRM_TITLE'))
      .targetEvent(ev)
      .ok($filter('translate')('OK'))
      .cancel($filter('translate')('CANCEL'));

    $mdDialog.show(confirm)
      .then(function () {
        // Confirm function, call service
        $scope.deleteUser();
      }, function () {
        // Cancel function, do nothing
      });
  };

  function updateUser() {
    var userId = $scope.selected[0];
    usersService.getUser(userId)
      .then(function (data) {
        $scope.isUpdate = true;
        $scope.userModel = data.user;
        $scope.userModel.password = "";
        $scope.userModel.confirmPassword = "";
        $scope.editUserNavOpen();
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };
};
