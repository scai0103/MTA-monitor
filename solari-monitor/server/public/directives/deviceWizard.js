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
