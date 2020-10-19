servicesDomain.factory('devicesService', DevicesService);

/* @ngInject */
function DevicesService($rootScope, $log, $http, $q, poller) {
  var endpoint = '/devices';
  var deviceService = {
    createDevice: createDevice,
    deleteDevice: deleteDevice,
    getBulkImportReport: getBulkImportReport,
    getBulkImportReportPoller: getBulkImportReportPoller,
    getDevice: getDevice,
    getDeviceConfig: getDeviceConfig,
    getDeviceLog: getDeviceLog,
    getDeviceStatus: getDeviceStatus,
    getDevices: getDevices,
    getMaintenance: getMaintenance,
    removeMaintenance: removeMaintenance,
    scheduleMaintenance: scheduleMaintenance,
    sendCommand: sendCommand,
    sync: sync,
    updateDevice: updateDevice,
    updateDevices: updateDevices
  };

  return deviceService;

  /**
   * FUNCTIONS
   ************************************************/

  function sync() {
    return $http.get(endpoint + '/sync', { timeout: 10000, cache: false })
      .then(function (response) {
        return response.data;
      })
      .catch(function (e) { return errorHandler(e, 'sync'); });
  };

  function getDevice(id) {
    return $http.get(endpoint + '/' + id)
      .then(function (response) {
        return response.data;
      })
      .catch(function (e) { return errorHandler(e, 'getDevice'); });
  };

  function getDevices() {
    return $http.get(endpoint)
      .then(function (response) {
        return response.data;
      })
      .catch(function (e) { return errorHandler(e, 'getDevices'); });
  }

  function createDevice(payload) {
    return $http.post(endpoint, payload)
      .then(function (response) {
        return response.data;
      })
      .catch(function (e) { return errorHandler(e, 'createDevice'); });
  };

  function updateDevice(id, payload) {
    return $http.put(endpoint + '/' + id, payload)
      .then(function (response) {
        return response.data;
      })
      .catch(function (e) { return errorHandler(e, 'updateDevice'); });
  };

  function deleteDevice(id, payload) {
    return $http({
      method: 'DELETE',
      url: endpoint + '/' + id,
      data: payload,
      headers: {
        'Content-type': 'application/json;charset=utf-8'
      }
    }).then(function (response) {
      return response.data;
    })
      .catch(function (e) { return errorHandler(e, 'deleteDevice'); });
  };

  function getDeviceConfig(address) {
    return $http.get(endpoint + '/config/' + address)
      .then(function (response) {
        return response.data;
      })
      .catch(function (e) { return errorHandler(e, 'getDeviceConfig'); });
  }

  function getDeviceLog(address) {
    return $http.get(endpoint + '/log/' + address)
      .then(function (response) {
        return response.data;
      })
      .catch(function (e) { return errorHandler(e, 'getDeviceLog'); });
  }

  function getDeviceStatus(address) {
    return $http.get(endpoint + '/status/' + address)
      .then(function (response) {
        return response.data;
      })
      .catch(function (e) { return errorHandler(e, 'getDeviceStatus'); });
  }

  function getMaintenance(id) {
    return $http.get('maintenance/' + id)
      .then(function (response) {
        return response.data;
      })
      .catch(function (e) { return errorHandler(e, 'getMaintenance'); });
  };

  function getBulkImportReport() {
    return $http.get(endpoint + '/import/report')
      .then(function (response) {
        return response.data;
      })
      .catch(function (e) { return errorHandler(e, 'getBulkImportReport'); });
  };

  function getBulkImportReportPoller() {
    return poller.get(endpoint + '/import/report', {
      delay: 2000,
      catchError: true,
      smart: true,
      argumentsArray: [
        { timeout: 10000, cache: false }
      ]
    });
  };

  function scheduleMaintenance(id, payload) {
    return $http.post('maintenance/schedule/' + id, payload)
      .then(function (response) {
        return response.data;
      })
      .catch(function (e) { return errorHandler(e, 'scheduleMaintenance'); });
  };

  function removeMaintenance(id, payload) {
    return $http.post('maintenance/remove/' + id, payload)
      .then(function (response) {
        return response.data;
      })
      .catch(function (e) { return errorHandler(e, 'removeMaintenance'); });
  };

  function sendCommand(payload) {
    return $http.post('commands/', payload)
      .then(function (response) {
        return response.data;
      })
      .catch(function (e) { return errorHandler(e, 'sendCommand'); });
  };

  function updateDevices(payload) {
    return $http.post(endpoint + '/update/multiple/', payload)
      .then(function (response) {
        return response.data;
      })
      .catch(function (e) { return errorHandler(e, 'updateDevices'); });
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

}
