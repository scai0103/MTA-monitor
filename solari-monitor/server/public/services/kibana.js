servicesDomain.factory('kibanaService', kibanaService);

/* @ngInject */
function kibanaService($log, $http, $q) {

  var endpoint = '/kibana';

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

  return {
    getDashboardUrl: function (deviceId) {
      var apiURL = endpoint;
      if (typeof deviceId != 'undefined') {
        apiURL += '/' + deviceId;
      }
      return $http.get(apiURL)
        .then(function (response) { return response.data; })
        .catch(function (e) { return errorHandler(e, 'getDashboardUrl'); });
    },
    filterChart: function (payload, deviceId) {
      var apiURL = endpoint;
      if (typeof deviceId != 'undefined') {
        apiURL += '/' + deviceId;
      }
      return $http.post(apiURL, payload)
        .then(function (response) { return response.data; })
        .catch(function (e) { return errorHandler(e, 'getDashboardUrl'); });
    }
  }
}
