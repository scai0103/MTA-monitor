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
