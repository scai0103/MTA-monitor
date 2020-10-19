
compareTo.$inject = ["$log"];
deviceBulkUpload.$inject = ["$rootScope", "$location", "$timeout", "$log", "$localStorage", "moment", "devicesService", "fileUploadService", "APPLICATION_EVENTS", "FILE_UPLOAD_EVENTS"];
deviceFilter.$inject = ["$location", "$timeout", "$log", "$localStorage", "leafletService"];
deviceStatus.$inject = ["$location", "$timeout", "$log", "$localStorage", "$rootScope", "devicesService", "APPLICATION_EVENTS"];
deviceWizard.$inject = ["$rootScope", "$log", "$timeout", "devicesService", "LEAFLET_EVENTS", "WIZARD_EVENTS", "PATHS"];
excludeValues.$inject = ["$log"];
fileUpload.$inject = ["$rootScope", "$location", "$timeout", "$log", "$localStorage", "fileUploadService", "APPLICATION_EVENTS", "FILE_UPLOAD_EVENTS"];
leaflet.$inject = ["$rootScope", "$location", "$timeout", "$log", "$localStorage", "leafletService", "LEAFLET_EVENTS"];
stationWizard.$inject = ["$rootScope", "$log", "$timeout", "stationsService", "LEAFLET_EVENTS", "WIZARD_EVENTS", "FILE_UPLOAD_EVENTS", "PATHS"];
statusSummary.$inject = ["$location", "$timeout", "$log", "$rootScope", "APPLICATION_EVENTS"];var directivesDomain = angular.module('SolariMonitor.directives', []);
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

directivesDomain.directive('deviceBulkUpload', deviceBulkUpload);

/* @ngInject */
function deviceBulkUpload($rootScope, $location, $timeout, $log, $localStorage, moment, devicesService, fileUploadService, APPLICATION_EVENTS, FILE_UPLOAD_EVENTS) {
  return {
    restrict: 'E',
    scope: {
      uploadUrl: '='
    },
    replace: true,
    templateUrl: '/views/devices/bulkUploadTemplate.html',
    link: link
  };

  function link(scope, element, attrs, controller) {

    var defaultUploadReport = null;
    var poller = null;

    /**
     * BINDINGS
     ************************************************/

    scope.formatDate = formatDate;
    scope.inputUploadElement;
    scope.isFileUploading = false;
    scope.isReportLoading = false;
    scope.progressValue = 0;
    scope.uploadFileName = null;
    scope.uploadReport = defaultUploadReport;


    /**
     * EVENTS
     ************************************************/

    var fileUploadSuccessListener = scope.$on(FILE_UPLOAD_EVENTS.uploadSuccess, onUploadSuccess);
    var fileUploadFailedListener = scope.$on(FILE_UPLOAD_EVENTS.uploadFailed, onUploadFailed);
    scope.$on('$destroy', destroy);


    active();


    /**
     * FUNCTIONS
     ************************************************/

    function active() {
    };


    function destroy() {
      scope.isReportLoading = false;

      if (poller) {
        poller.stop();
        poller = null;
      }

      fileUploadSuccessListener();
      fileUploadFailedListener();
    };


    function formatDate(dateISOStr) {
      var date = moment(dateISOStr);
      return date ? date.format('MM/DD/YYYY HH:mm') : '';
    };


    function onUploadSuccess($event, data) {
      $timeout(function () {
        // POLLER
        scope.isReportLoading = true;

        if (poller == null) {
          poller = devicesService.getBulkImportReportPoller();
          poller.promise
            .then(null, null, function (message) {

              if (message.status !== 200) {
                $log.error(message);
                return
              }

              var data = message.data;
              if (data.processing == false) {
                scope.uploadReport = data;

                if (poller) {
                  poller.stop();
                  poller = null;
                }

                scope.isReportLoading = false;
              }

            });
        }
      }, 0);
    };


    function onUploadFailed(err) {
      $timeout(function () {
        scope.isReportLoading = false;
      }, 0);
    };
  };
};

directivesDomain.directive('deviceFilter', deviceFilter);

/* @ngInject */
function deviceFilter($location, $timeout, $log, $localStorage, leafletService) {
  return {
    restrict: 'E',
    scope: {
      mapId: '=',
      areas: '=',
      lines: "=",
      stations: '=',
      callbackFn: '&',
      quickLinksEnabled: '=',
      isAuthorized: '=authorized'
    },
    replace: true,
    templateUrl: '/views/devices/filterTemplate.html',
    link: link
  };

  function link(scope, element, attrs, controller) {

    var STATION_UNDEFINED = 'MR-UNDEFINED';

    var filtersDefault = {
      filterAreaSelected: null,
      filterLineSelected: [],
      filterStationSelected: [],
      filterStatusProduction: true,
      filterStatusNoProduction: true,
      filterStatusError: true,
      filterStatusWarning: true,
      filterStatusMaintenance: true,
      filterStatusOk: true
    };
    var watchGroup = ['filterAreaSelected', 'filterStationSelected', 'filterLineSelected', 'filterStatusProduction', 'filterStatusNoProduction', 'filterStatusError', 'filterStatusWarning', 'filterStatusMaintenance', 'filterStatusOk'];

    /**
     * BINDINGS
     ************************************************/

    scope.clearFilters = clearFilters;
    scope.clearSearchTerm = clearSearchTerm;
    scope.filterAreaSelected;
    scope.filteredStations = [];
    scope.filterLineSelected = [];
    scope.filterStations = filterStations;
    scope.filterStationSelected = [];
    scope.filterStatusProduction;
    scope.filterStatusError;
    scope.filterStatusWarning;
    scope.filterStatusMaintenance;
    scope.filterStatusOk;
    scope.linkAreaSelected;
    scope.linkLineSelected;
    scope.setMapView = setMapView;
    scope.searchTerm;
    scope.STATION_UNDEFINED = STATION_UNDEFINED;

    angular.extend(scope, filtersDefault);

    var watchGroupsListener = scope.$watchGroup(watchGroup, updateValues);

    scope.$on('$destroy', destroy);

    active();


    /**
     * FUNCTIONS
     ************************************************/

    function active() {

      // Get the filters from localStorage
      angular.extend(scope, getLocalData('filters'));

      // Preserve the filters from the URL
      angular.forEach(watchGroup, function (watchEl, idx) {
        var val = $location.search()[watchEl];
        if (val) {
          val = sanitizeQueryParams(val, watchEl);
          scope[watchEl] = val;
        }
      });
    }


    function clearFilters() {
      angular.extend(scope, filtersDefault);
    };


    function clearSearchTerm() {
      scope.searchTerm = '';
    };


    function includesOneElement(arr1, arr2) {
      return arr1.some(function (v) {
        return arr2.includes(v);
      });
    }


    function destroy() {
      // De-registration function for all listeners.
      watchGroupsListener();

      angular.forEach(watchGroup, function (watchEl, idx) {
        $location.search(watchEl, null);
      });
    };


    function filterStations() {
      var filteredStations = [];
      angular.forEach(scope.stations, function (station, idx) {
        if (station.custom.lineNames && includesOneElement(station.custom.lineNames, scope.filterLineSelected)) {
          filteredStations.push(station);
        }
      });

      var filterStationSelected = [];
      angular.forEach(filteredStations, function (station, idx) {
        if (scope.filterStationSelected.includes(station.name)) {
          filterStationSelected.push(station.name);
        }
      });

      scope.filteredStations = filteredStations;
      scope.filterStationSelected = filterStationSelected;
    }


    function getLocalData(key, localData) {
      if (!$localStorage['filterData']) {
        $localStorage['filterData'] = {};
      }

      return $localStorage['filterData'][key];
    };


    function sanitizeQueryParams(param, key) {

      if (key == "filterLineSelected" || key == "filterStationSelected") {
        if (!angular.isArray(param)) {
          param = [param];
        }
      } else {
        if (param == "false") {
          param = false;
        }

        if (param == "true") {
          param = true;
        }
      }

      return param;
    };


    function setLocalData(key, localData) {
      if (!$localStorage['filterData']) {
        $localStorage['filterData'] = {};
      }

      $localStorage['filterData'][key] = localData;
    };


    function setMapView(latlng, zoom) {
      // if mapId parameter is defined
      if (scope.mapId) {
        leafletService
          .getMap(scope.mapId)
          .then(function (map) {
            map.setView(latlng, zoom);
          });
      }
    };


    function updateValues(newValues, oldValues, scope) {

      $timeout(function () {
        var filters = {};
        var isActive = false;
        angular.forEach(watchGroup, function (watchEl, idx) {
          filters[watchEl] = newValues[idx];
          $location.search(watchEl, newValues[idx]);

          isActive = isActive || JSON.stringify(filtersDefault[watchEl]) !== JSON.stringify(filters[watchEl]);
        });

        setLocalData('filters', filters);

        // Call controller callback function
        if (scope.callbackFn) {
          scope.callbackFn({ filters: filters, isActive: isActive });
        }

      }, 0);

    };

  }
};

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

directivesDomain.directive('deviceWizard', deviceWizard);

/* @ngInject */
function deviceWizard($rootScope, $log, $timeout, devicesService, LEAFLET_EVENTS, WIZARD_EVENTS, PATHS) {
  return {
    restrict: 'E',
    scope: {
      deviceDefaults: '=?',
      groups: '=',
      devices: '=',
      stations: '=',
      templates: '=',
      isAuthorized: '=authorized'
    },
    replace: true,
    templateUrl: '/views/devices/wizardTemplate.html',
    link: link
  };

  function link(scope, element, attrs, controller) {

    var TAB_BASE_INDEX = 0;
    var TAB_MAP_INDEX = 1;
    var TAB_CUSTOM_INDEX = 2;

    var STATION_UNDEFINED = 'MR-UNDEFINED';

    /**
     * BINDINGS
     ************************************************/

    scope.clearForm = clearForm;
    scope.currentStation = null;
    scope.customFieldConfs = [];
    scope.customServiceConfs = [];
    scope.device = {};
    scope.excludeAddresses = [];
    scope.excludeNames = [];
    scope.getDeviceConfiguration = getDeviceConfiguration;
    scope.handleSubmit = handleSubmit;
    scope.isFormSubmitting = false;
    scope.isNewDevice = true;
    scope.getFloorMapId = getFloorMapId;
    scope.getFloorImageOverlayUrl = getFloorImageOverlayUrl;

    scope.mapEditCenter = { lat: 50, lng: 50, zoom: 1 };
    scope.mapEditMarkers = {};
    scope.mapImagePath = PATHS.mapImagePath;
    scope.numberPattern = /^-?[0-9]+([.][0-9]+)?$/;
    scope.onStationChange = onStationChange;
    scope.onTemplateChange = onTemplateChange;

    scope.TAB_BASE_INDEX = TAB_BASE_INDEX;
    scope.TAB_CUSTOM_INDEX = TAB_CUSTOM_INDEX;
    scope.TAB_MAP_INDEX = TAB_MAP_INDEX;
    scope.tabCurrentIndex = 0;
    scope.tabMaxIndex = 2;
    scope.tabGoTo = tabGoTo;
    scope.tabGoToNext = tabGoToNext;
    scope.tabGoToPrev = tabGoToPrev;
    scope.STATION_UNDEFINED = STATION_UNDEFINED;
    scope.stationImageBasePath = PATHS.stationImageBasePath;
    scope.stationFloors = [];

    var leafletListener = scope.$on(LEAFLET_EVENTS.markerDragEnd, updateMarkerCoordinates);

    scope.$on('$destroy', destroy);

    activate();


    /**
     * FUNCTIONS
     ************************************************/

    function activate() {
      var deviceDefaults = {
        config: {
          production: true,
          position: {
            displayName: "device",
            lat: 50,
            lng: 50
          },
          stationFloorId: -1
        },
        previousTemplateName: null,
        previousStationName: null
      };

      if (scope.deviceDefaults && scope.deviceDefaults.name) {
        scope.isNewDevice = false;
      }

      angular.merge(scope.device, deviceDefaults, scope.deviceDefaults);

      // Solo se è un nuovo dispositivo preseleziono tutti i gruppi
      if (scope.isNewDevice) {
        scope.device.config.maintainerGroupIds = scope.groups.map(function (group) {
          return group.id;
        });
      }
      else {
        scope.device.previousTemplateName = scope.device.config.templateName;
        scope.device.previousStationName = scope.device.config.stationName;

        // controllo che i gruppi selezionati esistano ancora
        var groups = scope.groups.filter(function(group) {
          return scope.device.config.maintainerGroupIds.includes(group.id);
        });

        scope.device.config.maintainerGroupIds = groups.map(function (group) {
          return group.id;
        });
      }

      scope.mapEditMarkers['device'] = {
        lat: scope.device.config.position.lat,
        lng: scope.device.config.position.lng,
        title: scope.device.config.position.displayName,
        focus: true,
        draggable: true
      };

      angular.forEach(scope.devices, function (device) {
        if (device.address != scope.device.address) {
          scope.excludeAddresses.push(device.address.trim().toLowerCase());
        }
        if (device.displayName != scope.device.displayName) {
          scope.excludeNames.push(device.displayName.trim().toLowerCase());
        }
      });

      onTemplateChange(scope.device.config.templateName);
      onStationChange(scope.device.config.stationName);
    };


    function clearForm() {
      // Reset form and disable error messages
      scope.device = {};
      scope.deviceWizardForm.$setPristine();
      scope.deviceWizardForm.$setUntouched();
    };


    function destroy() {
      leafletListener();
    }


    function getFloorMapId(floorId) {
      var station = scope.currentStation;
      var mapId = 'editMap';

      if (!station) {
        $log.error("No station found");
        return '';
      }

      if (floorId == -1) {
        return mapId;
      }

      return mapId + '_' + station.name + '_floor_' + floorId;
    };


    function getFloorImageOverlayUrl(floorId) {
      var station = scope.currentStation;

      if (!station) {
        $log.error("No station found");
        return '';
      }

      if (floorId == -1) {
        return scope.stationImageBasePath + station.custom.position.mapUrl;
      }

      var floors = station.custom.floors ? station.custom.floors : [];
      var floor = floors.find(function (floor) { return floor.name == floorId; });
      if (!floor) {
        $log.error("No image available for the current floor");
        return '';
      }

      return scope.stationImageBasePath + floor.position.mapUrl;
    };


    function handleSubmit() {

      scope.isFormSubmitting = true;

      if (scope.isNewDevice) {
        devicesService.createDevice(scope.device)
          .then(function (data) {
            callbackSuccess(data, 'DEVICE_CREATED');
          })
          .catch(function (err) {
            $log.error(err);
            callbackFailure(err, err.data.error, err.data.description);
          });

      } else {
        devicesService.updateDevice(scope.device.name, scope.device)
          .then(function (data) {
            callbackSuccess(data, 'DEVICE_UPDATED');
          })
          .catch(function (err) {
            callbackFailure(err, err.data.error, err.data.description)
          });
      }


      function callbackSuccess(data, message) {
        scope.isFormSubmitting = false;
        scope.tabGoTo(scope.TAB_BASE_INDEX);
        scope.clearForm();
        scope.$emit(WIZARD_EVENTS.wizardSuccess, { data: data, message: message, closeSideBar: true });
      }

      function callbackFailure(err, message, description) {
        $log.error(err);
        scope.isFormSubmitting = false;
        scope.$emit(WIZARD_EVENTS.wizardFailed, { message: message, description: description });
      }

    };


    function updateMarkerCoordinates($event, data) {
      $timeout(function () {
        scope.device.config.position.lat = data.position.lat;
        scope.device.config.position.lng = data.position.lng;
      }, 0);
    };


    function onTemplateChange(originalValue) {

      if (!scope.device || !scope.device.config) {
        return;
      }

      var isTemplateChanged = originalValue != scope.device.config.templateName;

      var customFieldConfs = [];
      var customFieldsValue = {};
      var templateName = scope.device.config.templateName;
      for (var i = 0; i < scope.templates.length; i++) {
        var template = scope.templates[i];
        if (template.name == templateName) {
          customFieldConfs = template.custom.templateFields;
          customFieldsValue = template.config ? template.config.templateFieldsValue : {};
          scope.device.os = template.os;
          scope.device.faces = template.faces;
          break;
        }
      }
      scope.customFieldConfs = customFieldConfs;

      // Se è un nuovo dispositivo pre-imposto i valori del template
      if (scope.isNewDevice || isTemplateChanged) {
        scope.device.config.templateFieldsValue = customFieldsValue;
      }

      var customServiceConfs = [];
      var customServicesValue = {};
      var templateName = scope.device.config.templateName;
      for (var i = 0; i < scope.templates.length; i++) {
        var template = scope.templates[i];
        if (template.name == templateName) {
          customServiceConfs = template.custom.templateServices;
          customServicesValue = template.config ? template.config.templateServicesValue : {};
          break;
        }
      }
      scope.customServiceConfs = customServiceConfs;

      // Se è un nuovo dispositivo pre-imposto i valori del template
      if (scope.isNewDevice || isTemplateChanged) {
        scope.device.config.templateServicesValue = customServicesValue;
      }
      else {
        scope.device.config.templateServicesValue = angular.merge({}, customServicesValue, scope.device.config.templateServicesValue);
      }
    };


    function onStationChange(originalValue) {

      if (!scope.device || !scope.device.config) {
        return;
      }

      var stationName = scope.device.config.stationName;
      var floors = [];
      for (var i = 0; i < scope.stations.length; i++) {
        var station = scope.stations[i];
        if (station.name == stationName) {
          scope.currentStation = station;
          floors = station.custom.floors;
          break;
        }
      }
      scope.stationFloors = floors;
    };


    function getDeviceConfiguration() {
      var address = scope.device.address;
      devicesService.getDeviceConfig(address)
        .then(function (data) {
          scope.device.displayName = data.name;
          scope.device.config.serialNumber = data.serial;
          scope.device.config.model = data.model;
          scope.device.notes = data.notes;

          scope.$emit(WIZARD_EVENTS.wizardSuccess, { message: 'DEVICE_CONFIGURATED' });
        })
        .catch(function (err) {
          $log.error(err);

          scope.$emit(WIZARD_EVENTS.wizardFailed, { message: err.data.error, description: err.data.description });
        });
    };


    function tabGoTo(index) {
      scope.tabCurrentIndex = index;
    };


    function tabGoToNext() {
      var index = (scope.tabCurrentIndex == scope.tabMaxIndex) ? 0 : scope.tabCurrentIndex + 1;
      scope.tabCurrentIndex = index;
    };


    function tabGoToPrev() {
      var index = (scope.tabCurrentIndex == 0) ? 0 : scope.tabCurrentIndex - 1;
      scope.tabCurrentIndex = index;
    };
  }

};

directivesDomain.directive('errSrc', errSrc);

/* @ngInject */
function errSrc() {
  return {
    restrict: 'A',
    link: link
  };

  function link(scope, element, attrs, controller) {

    scope.$on('$destroy', function () {
      element.off('error');
    });

    element.on('error', function () {
      if (attrs.src != attrs.errSrc) {
        attrs.$set('src', attrs.errSrc);
      }
    });
  }
};

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

directivesDomain.directive('fileUpload', fileUpload);

/* @ngInject */
function fileUpload($rootScope, $location, $timeout, $log, $localStorage, fileUploadService, APPLICATION_EVENTS, FILE_UPLOAD_EVENTS) {
  return {
    restrict: 'E',
    scope: {
      idx: '@',
      name: '@?',
      uploadUrl: '=',
      accept: '@?'
    },
    replace: true,
    templateUrl: '/views/fileUploadTemplate.html',
    require: 'ngModel',
    link: link
  };

  function link(scope, element, attrs, controller) {

    /**
     * BINDINGS
     ************************************************/

    scope.inputUploadElement;
    scope.isFileUploading = false;
    scope.name = angular.isDefined(scope.name) ? scope.name : 'upload-input';
    scope.progressValue = 0;


    /**
     * EVENTS
     ************************************************/

    scope.$on('$destroy', destroy);


    active();


    /**
     * FUNCTIONS
     ************************************************/

    function active() {

      var inputUploadElement = element.find('input');
      if (!inputUploadElement) {
        return;
      }

      scope.inputUploadElement = inputUploadElement;

      // listen to the 'change' event of the file input
      inputUploadElement.on('change', onInputChange);

      // add file maxsize validator
      if (attrs.maxsize) {
        var maxsize = parseInt(attrs.maxsize);
        controller.$validators.maxsize = function (modelValue, viewValue) {
          var value = modelValue || viewValue;
          if (angular.isUndefined(value) || value === null) {
            return true;
          }
          for (var i = value.length - 1; i >= 0; i--) {
            if (value[i] && value[i].size && value[i].size > maxsize) {
              return false;
            }
          }
          return true;
        };
      }

      // add file accept validator
      if (attrs.accept) {
        var accept = attrs.accept.split(',').map(function (val) { return val.trim(); });
        controller.$validators.accept = function (modelValue, viewValue) {
          var value = modelValue || viewValue;
          if (angular.isUndefined(value) || value === null) {
            return true;
          }
          for (var i = value.length - 1; i >= 0; i--) {
            if (value[i] && accept.indexOf(value[i].type) === -1) {
              return false;
            }
          }
          return true;
        };
      }
    };


    function destroy() {
      scope.isFileUploading = false;
      scope.progressValue = 0;

      if (scope.inputUploadElement) {
        scope.inputUploadElement.off('change');
      }
    };


    function onInputChange(event) {
      // reset the progress bar
      scope.progressValue = 0;

      var files = event.target ? event.target.files : [];
      controller.$setViewValue(files, event);

      if (!controller.$invalid && files.length > 0) {
        fileUploadService.upload(scope.uploadUrl, files, onProgressCallback, onLoadCallback, onErrorCallback)
        scope.isFileUploading = true;
      }
    };


    function onErrorCallback(err) {
      $timeout(function () {
        scope.$emit(FILE_UPLOAD_EVENTS.uploadFailed, { idx: scope.idx, name: scope.name, message: err.data.error, description: err.data.description });

        controller.$setViewValue(null);
        scope.inputUploadElement[0].value = "";
        scope.isFileUploading = false;
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      }, 0);
    };


    function onLoadCallback(response) {
      $timeout(function () {
        scope.$emit(FILE_UPLOAD_EVENTS.uploadSuccess, { idx: scope.idx, name: scope.name, response: response });

        scope.inputUploadElement[0].value = "";
        scope.isFileUploading = false;
        $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: 'FILE_UPLOADED' });
      }, 0);
    };


    function onProgressCallback(event) {
      $timeout(function () {
        var progressValue = 0;
        if (event.lengthComputable) {
          progressValue = Math.round(event.loaded / event.total * 100);
        }

        scope.progressValue = progressValue;
      }, 0);
    };
  };

};

directivesDomain.directive('leaflet', leaflet);

/* @ngInject */
function leaflet($rootScope, $location, $timeout, $log, $localStorage, leafletService, LEAFLET_EVENTS) {
  return {
    restrict: 'E',
    scope: {
      mapId: '=',
      center: '=',
      imageOverlayUrl: '=',
      markers: '=',
      markerCluster: '=',
      saveMapState: '='
    },
    replace: true,
    template: '<div class="map"></div>',
    link: link
  };

  function link(scope, element, attr, controller) {

    var saveMapState = scope.saveMapState;
    var scopeId = scope.mapId;
    var map = null;
    var markersLayer = null;

    scope.$watch('markers', updateMarkers);

    scope.$on('$destroy', destroy);

    active();


    /**
     * FUNCTIONS
     ************************************************/

    function active() {

      // Get the coordinates (latlng and zoom) from defaults <= directive <= localStorage
      var center = { lat: 50, lng: 50, zoom: 4 };
      angular.extend(center, scope.center);

      if (saveMapState) {
        angular.extend(center, getLocalData('center'));
      }

      // DM 04/07/208: tolto in quanto inefficiente e può dare problemi di performance/memoria
      // Preserve the coordinates (latlng and zoom) from the URL
      // if (!$rootScope.isIE11) {
      //   var searchObject = $location.search();
      //   if (saveMapState && searchObject.lat && searchObject.lng && searchObject.zoom) {
      //     angular.extend(center, {
      //       lat: parseFloat(searchObject.lat),
      //       lng: parseFloat(searchObject.lng),
      //       zoom: parseInt(searchObject.zoom)
      //     });
      //   }
      // }

      map = L.map(element[0], {
        crs: L.CRS.Simple,
        maxZoom: 7,
        minZoom: 3,
      });

      // Check if image overlay URL is defined
      if (scope.imageOverlayUrl) {
        var img = new Image();
        img.onload = function (e) {
          var width = this.width;
          var height = this.height;
          var ratio = (width / height);
          var bounds = [
            [0, 0],
            [100, 100 * ratio]
          ];

          // var southWest = map.unproject([0, height], map.getZoom());
          // var northEast = map.unproject([width, -height], map.getZoom());
          // var bounds = new L.LatLngBounds(southWest, northEast);
          // map.setMaxBounds(bounds);

          map.setView([center.lat, center.lng * ratio], center.zoom);
          map.setMaxBounds(bounds);

          var image = L.imageOverlay(scope.imageOverlayUrl, bounds)
            .setOpacity(0.9)
            .addTo(map);
        }

        img.src = scope.imageOverlayUrl;
      } else {
        $log.error('directive:leaflet: No "imageOverlayUrl" defined');
      }

      var markerCluster = scope.markerCluster;
      if (markerCluster) {
        markersLayer = L.markerClusterGroup(markerCluster);

        if (markerCluster.clusterMouseOverFunction) {
          markersLayer.on('clustermouseover', markerCluster.clusterMouseOverFunction);
        }
      } else {
        markersLayer = new L.FeatureGroup();
      }

      map.addLayer(markersLayer);

      // map.on('click', function (e) {
      //   console.log("click LATLNG", e.latlng);
      //   console.log("click POINT", map.project(e.latlng));
      // });

      map.on('moveend', function (e) {
        // DM 04/07/208: tolto in quanto inefficiente e può dare problemi di performance/memoria
        // $timeout(function () {

        //   if (saveMapState) {
        //     var lat = map.getCenter().lat;
        //     var lng = map.getCenter().lng;
        //     var zoom = map.getZoom();

        //     if (!$rootScope.isIE11) {
        //       $location.search('lat', lat);
        //       $location.search('lng', lng);
        //       $location.search('zoom', zoom);
        //     }

        //     setLocalData('center', { lat: lat, lng: lng, zoom: zoom });
        //   }

        // }, 0);

        if (saveMapState) {
          var lat = map.getCenter().lat;
          var lng = map.getCenter().lng;
          var zoom = map.getZoom();
          setLocalData('center', { lat: lat, lng: lng, zoom: zoom });
        }

      });

      // Export the map object
      leafletService.setMap(map, scopeId);

    };

    function destroy() {

      // DM 04/07/208: tolto in quanto inefficiente e può dare problemi di performance/memoria
      // if (saveMapState) {
      //   if (!$rootScope.isIE11) {
      //     $location.search('lat', null);
      //     $location.search('lng', null);
      //     $location.search('zoom', null);
      //   }
      // }

      map.remove();
      map = null;
    };

    function getLocalData(key) {
      if (!$localStorage['leafletData_' + scopeId]) {
        $localStorage['leafletData_' + scopeId] = {};
      }

      return $localStorage['leafletData_' + scopeId][key];
    };

    function setLocalData(key, localData) {
      if (!$localStorage['leafletData_' + scopeId]) {
        $localStorage['leafletData_' + scopeId] = {};
      }

      $localStorage['leafletData_' + scopeId][key] = localData;
    };

    function updateMarkers() {

      if (!markersLayer) {
        $log.warn("leafletDirective: MarkerLayer not ready");
        return;
      }

      markersLayer.clearLayers();

      angular.forEach(scope.markers, function (item, key) {

        var marker = L.marker([item.lat, item.lng], {
          title: item.title,
          draggable: item.draggable || false,
          focus: item.focus || false
        });

        if (item.icon) {
          var icon = null;
          switch (item.icon.type) {
            case 'div':
              icon = L.divIcon(item.icon);
              break;
            default:
              icon = L.icon(item.icon);
          }

          marker.setIcon(icon);
        }

        if (item.popupHtml) {
          var popup = L.popup().setContent(item.popupHtml);
          marker.bindPopup(popup, { maxWidth: "auto" });
        }
        else if (item.popupTemplate) {
          var popup = L.popup.angular({
            template: item.popupTemplate,
          }).setContent(item.popupContent);

          marker.bindPopup(popup, { maxWidth: "auto" });
        }

        marker.on('mouseover', function (e) {
          this.openPopup();
        });

        if (item.draggable) {
          marker.on('dragend', function (event) {
            var marker = event.target;
            var position = marker.getLatLng();
            scope.$emit(LEAFLET_EVENTS.markerDragEnd, { marker: marker, position: position });
          });
        }

        marker.private = item.private;

        markersLayer.addLayer(marker);

      });
    };

  }

}

directivesDomain.directive('refreshOnIdle', refreshOnIdle);

/* @ngInject */
function refreshOnIdle() {
  return {
    restrict: 'A',
    link: link
  };

  function link(scope, element, attrs, controller) {
    var idleTime = 1 * 60 * 1000;
    var checkTime = 10 * 60 * 1000;
    var time = new Date().getTime();
    var timeout = null;


    /**
     * EVENTS
     ************************************************/

    scope.$on('$destroy', destroy);


    /**
     * FUNCTIONS
     ************************************************/

    function destroy() {
      if(timeout) {
        clearTimeout(timeout);
        timeout = null;
      }

      window.removeEventListener("focus", updateTime, false);
      window.removeEventListener("blur", updateTime, false);
      window.removeEventListener("click", updateTime, false);
      window.removeEventListener("mousemove", updateTime, false);
      window.removeEventListener("keypress", updateTime, false);
    };

    function refresh() {
      // Se non ho fatto niente per più di *idleTime* (1min)
      if (new Date().getTime() - time >= idleTime) {
        window.location.reload(true);
        return;
      }

      // Ricontrolla fra *idleTime* (1min)
      timeout = setTimeout(refresh, idleTime);
    };

    function updateTime() {
      time = new Date().getTime();
    };


    // Controlla fra *checkTime* (10min)
    timeout = setTimeout(refresh, checkTime);

    window.addEventListener("focus", updateTime, false);
    window.addEventListener("blur", updateTime, false);
    window.addEventListener("click", updateTime, false);
    window.addEventListener("mousemove", updateTime, false);
    window.addEventListener("keypress", updateTime, false);
  }
};

directivesDomain.directive('stationWizard', stationWizard);

/* @ngInject */
function stationWizard($rootScope, $log, $timeout, stationsService, LEAFLET_EVENTS, WIZARD_EVENTS, FILE_UPLOAD_EVENTS, PATHS) {
  return {
    restrict: 'E',
    scope: {
      stationDefaults: '=?',
      lines: '=',
      stations: '='
    },
    replace: true,
    templateUrl: '/views/stations/wizardTemplate.html',
    link: link
  };

  function link(scope, element, attrs, controller) {

    var TAB_BASE_INDEX = 0;

    /**
     * BINDINGS
     ************************************************/

    scope.addFloor = addFloor;
    scope.clearForm = clearForm;
    scope.deleteFloor = deleteFloor;
    scope.excludeNames = [];
    scope.handleSubmit = handleSubmit;
    scope.imageBasePath = PATHS.imageBasePath;
    scope.isFormSubmitting = false;
    scope.isNewStation = true;
    scope.isTabVisible = false;
    scope.floorsUploadFileName = [];
    scope.mapEditCenter = { lat: 50, lng: 50, zoom: 1 };
    scope.mapEditId = 'editStationMap';
    scope.mapEditMarkers = {};
    scope.mapImagePath = PATHS.mapImagePath;
    scope.onTabSelected = onTabSelected;
    scope.station = {};
    scope.stationImageBasePath = PATHS.stationImageBasePath;
    scope.TAB_BASE_INDEX = TAB_BASE_INDEX;
    scope.tabCurrentIndex = 0;
    scope.tempBasePath = PATHS.tempBasePath;
    scope.uploadUrl = 'stations/image/upload';
    scope.uploadFileName = undefined;


    /**
     * EVENTS
     ************************************************/

    var leafletListener = scope.$on(LEAFLET_EVENTS.markerDragEnd, updateMarkerCoordinates);
    var fileUploadSuccessListener = scope.$on(FILE_UPLOAD_EVENTS.uploadSuccess, onUploadSuccess);
    scope.$on('$destroy', destroy);


    activate();


    /**
     * FUNCTIONS
     ************************************************/

    function addFloor() {
      var idx = scope.station.custom.floors.length;
      scope.station.custom.floors.push({
        isNew: true,
        position: {
          displayName: "Floor " + (idx + 1),
          lat: scope.station.custom.position.lat,
          lng: scope.station.custom.position.lng
        },
        uploadTempFileName: undefined
      });

      scope.floorsUploadFileName[idx] = undefined;
    };

    function activate() {

      var stationDefaults = {
        custom: {
          position: {
            displayName: "station",
            lat: 50,
            lng: 50
          },
          type: "LEVEL2",
          filterable: true,
          floors: [],
          deletedFloors: []
        },
        uploadTempFileName: undefined
      };

      if (scope.stationDefaults && scope.stationDefaults.name) {
        scope.isNewStation = false;
      }

      angular.merge(scope.station, stationDefaults, scope.stationDefaults);

      // Recreate the floor object
      angular.forEach(scope.station.custom.floors, function (floor, idx) {
        var floorDefault = {
          isNew: false,
          isDeleted: false,
          position: {
            displayName: "Floor " + (idx + 1),
            lat: scope.station.custom.position.lat,
            lng: scope.station.custom.position.lng
          },
          uploadTempFileName: undefined
        };
        floor = angular.merge(floor, floorDefault);
        scope.floorsUploadFileName[idx] = undefined;
      });

      scope.mapEditMarkers['station'] = {
        lat: scope.station.custom.position.lat,
        lng: scope.station.custom.position.lng,
        title: scope.station.custom.position.displayName,
        focus: true,
        draggable: true
      };

      angular.forEach(scope.stations, function (station) {
        if (station.displayName != scope.station.displayName) {
          scope.excludeNames.push(station.displayName.trim().toLowerCase());
        }
      });

    };


    function clearForm() {
      // Reset form and disable error messages
      scope.station = {};
      scope.stationWizardForm.$setPristine();
      scope.stationWizardForm.$setUntouched();
    };


    function deleteFloor(idx) {
      if (scope.station.custom.floors.length > idx) {
        var floor = scope.station.custom.floors[idx];
        scope.station.custom.floors.splice(idx, 1);
        scope.floorsUploadFileName.splice(idx, 1);

        // Mantengo un array dei piani cancellati in modo che il server possa fare pulizia
        if (!floor.isNew) {
          scope.station.deletedFloors.push(floor);
        }

        delete scope.stationWizardForm['uploadInput-' + idx];
      }
    }


    function destroy() {
      leafletListener();
      fileUploadSuccessListener();
    }


    function handleSubmit() {

      scope.isFormSubmitting = true;

      if (scope.isNewStation) {
        stationsService.createStation(scope.station)
          .then(function (data) {
            callbackSuccess(data, 'STATION_CREATED');
          })
          .catch(function (err) {
            $log.error(err);
            callbackFailure(err, err.data.error, err.data.description);
          });

      } else {
        stationsService.updateStation(scope.station.name, scope.station)
          .then(function (data) {
            callbackSuccess(data, 'STATION_UPDATED');
          })
          .catch(function (err) {
            callbackFailure(err, err.data.error, err.data.description);
          });
      }


      function callbackSuccess(data, message) {
        scope.isFormSubmitting = false;
        scope.clearForm();
        scope.$emit(WIZARD_EVENTS.wizardSuccess, { data: data, message: message, closeSideBar: true });
      }

      function callbackFailure(err, message, description) {
        $log.error(err);
        scope.isFormSubmitting = false;
        scope.$emit(WIZARD_EVENTS.wizardFailed, { message: message, description: description });
      }
    };


    function onTabSelected(tab) {
      $timeout(function() {
        scope.isTabVisible = true;
      }, 100);
    }


    function onUploadSuccess($event, data) {
      if (data) {
        var idx = data.idx;
        var floor = idx == -1 ? scope.station : scope.station.custom.floors[idx];
        var response = data.response;

        if (response && response.data) {
          floor.uploadTempFileName = response.data.fileName;
        }
        else {
          floor.uploadTempFileName = undefined;
        }
      }
    };


    function updateMarkerCoordinates($event, data) {
      $timeout(function () {
        scope.station.custom.position.lat = data.position.lat;
        scope.station.custom.position.lng = data.position.lng;
      }, 0);
    };

  };

};

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
