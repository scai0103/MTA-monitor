servicesDomain.factory('ticketsService', ticketsService);

/* @ngInject */
function ticketsService($log, $http, $q) {

  var endpoint = '/tickets';

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
    createTicket: function (payload) {
      return $http.post(endpoint, payload)
        .then(function (response) { return response.data; })
        .catch(function (e) { return errorHandler(e, 'createTicket'); });
    },
    getTickets: function (deviceId) {
      return $http.get(endpoint + '/' + deviceId)
        .then(function (response) { return response.data; })
        .catch(function (e) { return errorHandler(e, 'getTickets'); });
    },
    getTicket: function (deviceId, ticketId) {
      return $http.get(endpoint + '/' + ticketId)
        .then(function (response) { return response.data; })
        .catch(function (e) { return errorHandler(e, 'getTicket'); });
    },
    updateTicket: function (requestBody) {
      return $http.put(endpoint, requestBody)
        .then(function (response) { return response.data; })
        .catch(function (e) { return errorHandler(e, 'updateTicket'); })
    },
    deleteTicket: function (ticketIds) {
      return $http({
        method: 'DELETE',
        url: endpoint,
        data: {
          "userIds": ticketIds
        },
        headers: {
          'Content-Type': 'application/json;charset=utf-8'
        }
      })
        .then(function (response) { return response.data; })
        .catch(function (e) { return errorHandler(e, 'deleteTickets'); });
    }
  }

}
