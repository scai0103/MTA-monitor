servicesDomain.factory('auditLogService', AuditLogService);

/* @ngInject */
function AuditLogService($rootScope, $log, $http, $interval, $q) {
  var endpoint = '/auditLogs';
  var auditLogService = {
    deleteAuditLogs: deleteAuditLogs,
    getAuditLogs: getAuditLogs
  };

  return auditLogService;

  /**
   * FUNCTIONS
   ************************************************/

  function deleteAuditLogs(dateStart, dateEnd) {
    return $http({
      method: 'DELETE',
      url: endpoint + '?dateStart=' + dateStart + '&dateEnd=' + dateEnd,
      headers: { 'Content-Type': 'application/json;charset=utf-8' }
    })
      .then(function (response) { return response.data; })
      .catch(function (e) { return errorHandler(e, 'deleteAuditLogs'); });
  };

  function getAuditLogs(dateStart, dateEnd) {
    return $http.get(endpoint + '?dateStart=' + dateStart + '&dateEnd=' + dateEnd)
      .then(function (response) { return response.data; })
      .catch(function (e) { return errorHandler(e, 'getAuditLogs'); });
  };

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
