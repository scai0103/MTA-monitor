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
