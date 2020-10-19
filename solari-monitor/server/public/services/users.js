servicesDomain.factory('usersService', usersService);

/* @ngInject */
function usersService($log, $http, $q) {
  var endpoint = '/users';

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
    createUser: function (payload) {
      return $http.post(endpoint, payload)
        .then(function (response) { return response.data; })
        .catch(function (e) { return errorHandler(e, 'createUser'); });
    },
    listUsers: function () {
      return $http.get(endpoint)
        .then(function (response) { return response.data; })
        .catch(function (e) { return errorHandler(e, 'listUsers'); });
    },
    getUser: function (userId) {
      return $http.get(endpoint + '/' + userId)
        .then(function (response) { return response.data; })
        .catch(function (e) { return errorHandler(e, 'getUser'); });
    },
    updateUser: function (requestBody) {
      return $http.put(endpoint, requestBody)
        .then(function (response) { return response.data; })
        .catch(function (e) { return errorHandler(e, 'updateUser'); })
    },
    deleteUsers: function (usersIds) {
      return $http({
        method: 'DELETE',
        url: endpoint,
        data: { 'userIds': usersIds },
        headers: { 'Content-Type': 'application/json;charset=utf-8' }
      })
        .then(function (response) { return response.data; })
        .catch(function (e) { return errorHandler(e, 'deleteUsers'); });
    }
  }
}
