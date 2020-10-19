servicesDomain.factory('groupsService', groupsService);

/* @ngInject */
function groupsService($log, $http, $q) {
  var endpoint = '/groups';

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
    listGroups: function () {
      return $http.get(endpoint)
        .then(function (response) { return response.data; })
        .catch(function (e) { return errorHandler(e, 'listGroups'); });
    },
    getGroup: function (groupId) {
      return $http.get(endpoint + '/' + groupId)
        .then(function (response) { return response.data; })
        .catch(function (e) { return errorHandler(e, 'getGroup'); });

    },
    createGroup: function (payload) {
      return $http.post(endpoint, payload)
        .then(function (response) { return response.data; })
        .catch(function (e) { return errorHandler(e, 'createGroup'); });
    },
    updateGroup: function (requestBody) {
      return $http.put(endpoint, requestBody)
        .then(function (response) { return response.data; })
        .catch(function (e) { return errorHandler(e, 'updateGroup'); })
    },
    deleteGroups: function (groupsIds) {
      return $http({
        method: 'DELETE',
        url: endpoint,
        data: {
          "groupIds": groupsIds
        },
        headers: {
          'Content-Type': 'application/json;charset=utf-8'
        }
      })
        .then(function (response) {
          return response.data;
        })
        .catch(function (e) {
          return errorHandler(e, 'deleteGroups');
        });
    }
  }
}
