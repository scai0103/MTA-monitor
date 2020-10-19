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
