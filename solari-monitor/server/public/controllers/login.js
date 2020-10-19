controllersDomain.controller('LoginController', LoginController);

/* @ngInject */
function LoginController($rootScope, $scope, $location, $route, $log, AUTH_EVENTS, AuthService, APPLICATION_EVENTS) {

  /**
   * BINDINGS
   ************************************************/

  $scope.credentials = {
    username: "",
    password: ""
  };
  $scope.submitForm = submitForm;


  /**
   * FUNCTIONS
   ************************************************/

  function submitForm() {
    AuthService.login($scope.credentials)
      .then(function (user) {
        $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
        $scope.setCurrentUser(user); // Defined in ApplicationCtrl
      }, function (err) {
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };
};
