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
    //return $http.get(endpoint + '/sync', { timeout: 15000, cache: false })
    return $http.get(endpoint + '/sync', { timeout: 15000, cache: false })
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
