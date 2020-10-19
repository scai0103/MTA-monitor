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
