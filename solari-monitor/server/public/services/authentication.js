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
