
AuditLogService.$inject = ["$rootScope", "$log", "$http", "$interval", "$q"];
AuthService.$inject = ["$log", "$http", "$window", "$localStorage", "$q"];
BacthService.$inject = ["$rootScope", "$log", "$http", "$q", "$localStorage", "pollerService", "BATCH_EVENTS"];
DevicesService.$inject = ["$rootScope", "$log", "$http", "$q", "poller"];
fileUploadService.$inject = ["$log", "$http", "$q"];
groupsService.$inject = ["$log", "$http", "$q"];
dataHttpInterceptor.$inject = ["$rootScope", "$q", "$log", "AUTH_EVENTS", "APPLICATION_EVENTS"];
kibanaService.$inject = ["$log", "$http", "$q"];
PollerService.$inject = ["$rootScope", "$log", "$http", "$interval"];
StationsService.$inject = ["$rootScope", "$log", "$http", "$interval", "$q"];
SyncService.$inject = ["$rootScope", "$log", "$http", "$q", "pollerService", "SYNC_EVENTS"];
ticketsService.$inject = ["$log", "$http", "$q"];
usersService.$inject = ["$log", "$http", "$q"];
leafletService.$inject = ["$q"];var servicesDomain = angular.module('SolariMonitor.services', []);
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

servicesDomain.factory('AuthService', AuthService);

/* @ngInject */
function AuthService($log, $http, $window, $localStorage, $q) {
  var authService = {};

  authService.login = function (payload) {
    return $http.post('/login', payload)
      .then(function (response) {
        return $localStorage.user = response.data.user;
      })
      .catch(function (e) { return errorHandler(e, 'login'); });
  };

  authService.logout = function () {
    delete $localStorage.user;
    $window.location.href = '/logout';
  };

  authService.getCurrentUser = function() {
    if ($localStorage.user) {
      return $q.when($localStorage.user);
    } else {
      return getCurrentUserInner();
    }
  };

  authService.isAuthenticated = function () {
    return !!$localStorage.user;
  };

  authService.isAuthorized = function (authorizedRoles) {
    if (!angular.isArray(authorizedRoles)) {
      authorizedRoles = [authorizedRoles];
    }
    return (authService.isAuthenticated() &&
      authorizedRoles.indexOf($localStorage.user.idRole) !== -1);
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
  }

  return authService;

  function getCurrentUserInner() {
    return $http.get('/profile')
      .then(function (response) {
        return $localStorage.user = response.data.user;
      })
      .catch(function (e) { return errorHandler(e, 'getCurrentUser'); });
  };
}

servicesDomain.factory('bacthService', BacthService);

var batchPoller = null;

/* @ngInject */
function BacthService($rootScope, $log, $http, $q, $localStorage, pollerService, BATCH_EVENTS) {
  var endpoint = '/devices';
  var batchService = {
    checkBatchStatus: checkBatchStatus,
    getBatchStatus: getBatchStatus,
    getLocalBatchData: getLocalBatchData,
    setLocalBatchData: setLocalBatchData
  };

  return batchService;

  function checkBatchStatus() {
    var batchData = getLocalBatchData();
    if (!batchData) {
      destroyBatchPoller();
      return;
    }

    startBatchPoller(batchData.id);
    return;
  };

  function destroyBatchPoller() {
    if (!batchPoller) {
      return;
    }

    batchPoller.stop();
    batchPoller = null;
    return;
  }

  function getBatchStatus(id) {
    return $http.get(endpoint + '/update/multiple/' + id, { timeout: 10000, cache: false })
      .then(function (response) {
        return response.data;
      })
      .catch(function (e) { return errorHandler(e, 'getBatchStatus'); });
  };

  function getLocalBatchData() {
    return $localStorage['batchData'];
  };

  function initBatchPoller(id) {
    if (batchPoller) {
      return;
    }

    var pollerInterval = 10000;
    var requestTimeout = 5000;

    batchPoller = pollerService.poll(
      endpoint + '/update/multiple/' + id,
      function (data) {
        var batch = data.batch;

        // Se il batch ha terminato, oppure se i dati non sono stati completati in 10 minuti
        // Rimuovo il batch dal local storage e smetto di fare il polling
        if (batch) {
          if (batch.total == (batch.completed + batch.failed)) {
            batch = null;
            setLocalBatchData(null);
            $rootScope.$broadcast(BATCH_EVENTS.statusSuccess, { data: batch });
            return;
          }

          var TTL = 5 * 60 * 1000; // se ci mette troppo tempo lo rimuovo...
          var now = new Date();
          if (now - new Date(batch.createdAt) > TTL) {
            batch = null;
            setLocalBatchData(null);
            $rootScope.$broadcast(BATCH_EVENTS.statusSuccess, { data: batch });
            return;
          }
        }

        $rootScope.$broadcast(BATCH_EVENTS.statusSuccess, { data: batch });
      },
      function (e) {
        $rootScope.$broadcast(BATCH_EVENTS.statusFailed, { message: e.data.error, description: e.data.description });
        setLocalBatchData(null);
      },
      pollerInterval,
      requestTimeout
    );

    return batchPoller;
  };

  function setLocalBatchData(localData) {
    $localStorage['batchData'] = localData;
    checkBatchStatus();
  };

  function startBatchPoller(id) {
    if (!batchPoller) {
      initBatchPoller(id);
    }

    batchPoller.start();
    return;
  };

  function stopBatchPoller() {
    if (!batchPoller) {
      return;
    }

    batchPoller.stop();
    return;
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

servicesDomain.factory('fileUploadService', fileUploadService);

/* @ngInject */
function fileUploadService($log, $http, $q) {

  var fileUploadService = {
    upload: upload
  };

  return fileUploadService;

  /**
   * FUNCTIONS
   ************************************************/


  function errorHandler(e, responseJSON, serviceActionName) {
    var newMessage = 'XHR Failed for ' + serviceActionName;

    // For upload call
    if (!e.data) {
      e.data = {
        error: responseJSON ? responseJSON.error : "SERVER_ERROR",
        description: responseJSON ? responseJSON.description : ""
      }
    }

    if (e.data && e.data.error) {
      newMessage = newMessage + '\n' + e.data.error;
    }
    if (e.data && e.data.description) {
      newMessage = newMessage + '\n' + e.data.description;
    }
    if (e.data) {
      e.data.detail = newMessage;
    }
    $log.error(newMessage);
    return e;
  };


  function upload(url, files, onProgressCallback, onLoadCallback, onErrorCallback) {
    if (files.length > 0) {
      // create a FormData object which will be sent as the data payload in the
      // AJAX request
      var formData = new FormData();

      // loop through all the selected files and add them to the formData object
      for (var i = 0; i < files.length; i++) {
        var file = files[i];

        // add the files to formData object for the data payload
        formData.append('uploads[]', file, file.name);
      }

      // create an XMLHttpRequest
      var xhr = new XMLHttpRequest();

      // listen to the 'progress' event
      xhr.upload.onprogress = function (e) {
        if (onProgressCallback && typeof onProgressCallback === 'function') {
          onProgressCallback(e);
        }
      };

      // listen to the 'load' event
      xhr.onload = function (e) {

        if (xhr.status != 200) {
          var responseJSON = xhr.responseText ? JSON.parse(xhr.responseText) : null;
          var error = errorHandler(e, responseJSON, 'upload');
          if (onErrorCallback && typeof onErrorCallback === 'function') {
            onErrorCallback(error)
          }
          return false;
        }

        var response = {
          files: files,
          data: xhr.responseText ? JSON.parse(xhr.responseText) : null
        };

        if (onLoadCallback && typeof onLoadCallback === 'function') {
          onLoadCallback(response);
        }
      };

      // listen to the 'error' event
      xhr.upload.onerror = function (e) {
        var responseJSON = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        var error = errorHandler(e, responseJSON, 'upload');
        if (onErrorCallback && typeof onErrorCallback === 'function') {
          onErrorCallback(error)
        }
      };

      // POST the file
      xhr.open("POST", url);
      xhr.send(formData);

    }
  }

};

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

servicesDomain.factory('dataHttpInterceptor', dataHttpInterceptor);

/* @ngInject */
function dataHttpInterceptor($rootScope, $q, $log, AUTH_EVENTS, APPLICATION_EVENTS) {
  return {
    request: function (config) {

      $rootScope.$broadcast(APPLICATION_EVENTS.appLoading, { loading: true });

      // Disable caching for MSIE (from version 6 to 11)
      if ($rootScope.isIE11) {
        //initialize get if not there
        if (!config.headers) {
          config.headers = {};
        }

        //disable IE ajax request caching
        // config.headers['If-Modified-Since'] = 'Mon, 26 Jul 1997 05:00:00 GMT'; // Questo sembra dare problemi in alcuni casi con alcuni webserver...
        config.headers['Cache-Control'] = 'no-cache';
        config.headers['Pragma'] = 'no-cache';
      }

      return config;
    },

    requestError: function (rejection) {

      $rootScope.$broadcast(APPLICATION_EVENTS.appLoading, { loading: false });

      if (canRecover(rejection)) {
        return responseOrNewPromise
      }
      return $q.reject(rejection);
    },

    response: function (response) {

      $rootScope.$broadcast(APPLICATION_EVENTS.appLoading, { loading: false });

      return response;
    },

    responseError: function (response) {

      $rootScope.$broadcast(APPLICATION_EVENTS.appLoading, { loading: false });

      $rootScope.$broadcast({
        401: AUTH_EVENTS.notAuthenticated,
        403: AUTH_EVENTS.notAuthorized,
      }[response.status], response);
      return $q.reject(response);
    }
  };
}

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

servicesDomain.factory('leafletService', leafletService);

function leafletService($q) {
  var deferredMap = {
    'map': []
  };
  var leafletService = {
    setMap: setMap,
    getMap: getMap
  };
  return leafletService;

  /**
   * FUNCTIONS
   ************************************************/

  function _createDeferred(type, scopeId) {
    var deferredList = deferredMap[type];
    deferredList[scopeId] = $q.defer();
    return deferredList[scopeId];
  };

  function _getDeferred(type, scopeId) {
    var deferredList = deferredMap[type];
    if (!deferredList[scopeId]) {
      return _createDeferred(type, scopeId);
    }
    return deferredList[scopeId];
  };

  function getMap(scopeId) {
    var deferred = _getDeferred('map', scopeId);
    return deferred.promise;
  };

  function setMap(map, scopeId) {
    var deferred = _createDeferred('map', scopeId);
    deferred.resolve(map)
  };
}

servicesDomain.factory('pollerService', PollerService);

/* @ngInject */
function PollerService($rootScope, $log, $http, $interval) {
  var pollerService = {
    poll: poll
  };

  return pollerService;

  /**
   * FUNCTIONS
   ************************************************/

  function poll(url, successCallback, errorCallback, pollerInterval, requestTimeout) {

    var Poller = function (options) {
      this.interval = null;
      this.isRequestPendeing = false;
      this.pollerInterval = options.pollerInterval || 30000;
      this.requestTimeout = options.requestTimeout || 20000;

      this.setOptions(options);
    };

    Poller.prototype.setOptions = function (options) {
      this.url = options.url;

      if (options.pollerInterval != null) {
        this.pollerInterval = options.pollerInterval;
      }

      if (options.requestTimeout != null) {
        this.requestTimeout = options.requestTimeout;
      }

      this.successCallback = options.successCallback;
      this.errorCallback = options.errorCallback;
    };

    Poller.prototype.start = function () {
      if (!this.interval) {
        this.execute();
        this.interval = $interval(

          (function (self) {       //Self-executing func which takes 'this' as self
            return function () {   //Return a function in the context of 'self'
              self.execute();    //Thing you wanted to run as non-window 'this'
            }
          })(this),

          this.pollerInterval);
      }
    };

    Poller.prototype.execute = function () {

      if (this.isRequestPendeing) {
        return;
      }

      this.isRequestPendeing = true;
      var self = this;
      $http
        .get(self.url, { timeout: self.requestTimeout, cache: false })
        .then(function (response) {
          self.isRequestPendeing = false;
          if (self.successCallback && angular.isFunction(self.successCallback)) {
            self.successCallback(response.data);
          }
        })
        .catch(function (e) {
          self.isRequestPendeing = false;
          var error = errorHandler(e);

          if (self.errorCallback && angular.isFunction(self.errorCallback)) {
            self.errorCallback(error);
          }
        });
    };

    Poller.prototype.stop = function () {
      if (this.interval) {
        $interval.cancel(this.interval);
        this.interval = null;
      }

      this.isRequestPendeing = false;
    };

    Poller.prototype.restart = function () {
      this.stop();
      this.start();
    };

    var poller = new Poller({ url: url, successCallback: successCallback, errorCallback: errorCallback, pollerInterval: pollerInterval, requestTimeout: requestTimeout });
    poller.start();
    return poller;
  };

  function errorHandler(e) {
    var newMessage = 'XHR Failed';
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

    return e;
  };

}

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

servicesDomain.factory('syncService', SyncService);

var cachedSyncData = null;
var cacheDate = null;

var syncPoller = null;

/* @ngInject */
function SyncService($rootScope, $log, $http, $q, pollerService, SYNC_EVENTS) {
  var endpoint = '/devices';
  var syncService = {
    getCachedSyncData: getCachedSyncData,
    getSyncData: getSyncData,
    isSyncPollerRunning: isSyncPollerRunning,
    restartSyncPoller: restartSyncPoller,
    startSyncPoller: startSyncPoller,
    stopSyncPoller: stopSyncPoller,
    updateDeviceCachedData: updateDeviceCachedData,
    updateStationCachedData: updateStationCachedData
  };

  return syncService;

  function getCachedSyncData() {
    if (cachedSyncData) {
      return $q.when(cachedSyncData);
    } else {
      return getSyncData();
    }
  }

  function getSyncData() {
    return $http.get(endpoint + '/sync', { timeout: 10000, cache: false })
      .then(function (response) {
        setCachedSyncData(response.data)
        return response.data;
      })
      .catch(function (e) { return errorHandler(e, 'getSyncData'); });
  };

  function initSyncPoller() {
    if (syncPoller) {
      return;
    }

    syncPoller = pollerService.poll(
      endpoint + '/sync',
      function (data) {
        setCachedSyncData(data);
      },
      function (e) {
        $rootScope.$broadcast(SYNC_EVENTS.syncFailed, { message: e.data.error, description: e.data.description });
      });

    return syncPoller;
  };

  function isSyncPollerRunning() {
    return syncPoller && syncPoller.interval != null;
  };

  function restartSyncPoller() {
    if (!syncPoller) {
      return;
    }

    syncPoller.restart();
    return;
  };

  function setCachedSyncData(syncData) {
    var lastUpdateDate = syncData && syncData.summary ? syncData.summary.lastUpdate : null;
    if (cacheDate !== null && lastUpdateDate !== null && lastUpdateDate <= cacheDate) {
      return;
    }

    $rootScope.$broadcast(SYNC_EVENTS.syncSuccess, { data: syncData });
    cachedSyncData = syncData;
    cacheDate = new Date();
  };

  function startSyncPoller() {
    if (!syncPoller) {
      initSyncPoller();
    }

    syncPoller.start();
    return;
  };

  function stopSyncPoller() {
    if (!syncPoller) {
      return;
    }

    syncPoller.stop();
    return;
  };

  function updateDeviceCachedData(data) {
    if (!data) {
      return;
    }

    var lastUpdateDate = cachedSyncData || cachedSyncData.summary ? cachedSyncData.summary.lastUpdate : null;
    if (cacheDate == null || lastUpdateDate == null || lastUpdateDate > cacheDate) {
      return;
    }

    for (var i = 0; i < cachedSyncData.devices.length; i++) {
      var device = cachedSyncData.devices[i];
      if (device) {
        angular.extend(device, data);
        break;
      }
    }

    //TODO: si potrebbe pensare di eliminare questo oggetto
    var stationTree = cachedSyncData.stationsTree[data.config.stationName];
    if (stationTree) {
      var deviceTree = stationTree['devices'][data.name];
      if (deviceTree) {
        angular.extend(deviceTree, data);
      }
    }

    setCachedSyncData(cachedSyncData);
  };

  function updateStationCachedData(data) {
    if (!data) {
      return;
    }

    var lastUpdateDate = cachedSyncData || cachedSyncData.summary ? cachedSyncData.summary.lastUpdate : null;
    if (cacheDate == null || lastUpdateDate == null || lastUpdateDate > cacheDate) {
      return;
    }

    for (var i = 0; i < cachedSyncData.stations.length; i++) {
      var station = cachedSyncData.stations[i];
      if (station) {
        angular.extend(station, data);
        break;
      }
    }

    //TODO: si potrebbe pensare di eliminare questo oggetto
    var stationTree = cachedSyncData.stationsTree[data.name];
    if (stationTree) {
      angular.extend(stationTree, data);
    }

    setCachedSyncData(cachedSyncData);
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

servicesDomain.config(["$httpProvider", function ($httpProvider) {
  $httpProvider.useApplyAsync(true);
  $httpProvider.interceptors.push('dataHttpInterceptor');
}]);
