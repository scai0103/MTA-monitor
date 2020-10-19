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
