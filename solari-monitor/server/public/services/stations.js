servicesDomain.factory('stationsService', StationsService);

/* @ngInject */
function StationsService($rootScope, $log, $http, $interval, $q) {
  var endpoint = '/stations';
  var stationsService = {
    createStation: createStation,
    deleteStation: deleteStation,
    readStation: readStation,
    listStations: listStations,
    updateStation: updateStation
  };

  return stationsService;

  /**
   * FUNCTIONS
   ************************************************/

  function createStation(payload) {
    return $http.post(endpoint, payload)
      .then(function (response) {
        return response.data;
      })
      .catch(function (e) { return errorHandler(e, 'createStation'); });
  }

  function deleteStation(id, payload) {
    return $http({
      method: 'DELETE',
      url: endpoint + '/' + id,
      data: payload,
      headers: {
        'Content-type': 'application/json;charset=utf-8'
      }
    })
      .then(function (response) {
        return response.data;
      })
      .catch(function (e) { return errorHandler(e, 'deleteStation'); });
  }

  function readStation(id) {
    return $http.get(endpoint + '/' + id)
      .then(function (response) {
        return response.data;
      })
      .catch(function (e) { return errorHandler(e, 'readStation'); });
  }

  function listStations() {
    return $http.get(endpoint + '/')
      .then(function (response) {
        return response.data;
      })
      .catch(function (e) { return errorHandler(e, 'listStations'); });
  }

  function updateStation(id, payload) {
    return $http.put(endpoint + '/' + id, payload)
      .then(function (response) {
        return response.data;
      })
      .catch(function (e) { return errorHandler(e, 'updateStation'); });
  }

  function errorHandler(e, serviceActionName) {
    var newMessage = 'XHR Failed for ' + serviceActionName;
    if (e.data && e.data.error) {
      newMessage = newMessage + '\n' + e.data.error;
    }
    if (e.data && e.data.description) {
      newMessage = newMessage + '\n' + e.data.description;
    }
    if (e.data) {
      e.data.detail = newMessage;
    } else {
      e.data = {
        error: "SERVER_ERROR",
        description: e.statusText
      };
    }
    $log.error(newMessage);
    return $q.reject(e);
  };

};
