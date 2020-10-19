controllersDomain.controller('ApplicationController', ApplicationController);

/* @ngInject */
function ApplicationController($rootScope, $scope, $window, $location, $timeout, $log, $filter, $sce,
  toastr, USER_ROLES, AUTH_EVENTS, APPLICATION_EVENTS, PATHS, AuthService) {

  /**
   * BINDINGS
   ************************************************/

  $scope.batchStatus = null;
  $scope.currentUser = null;
  $scope.userRoles = USER_ROLES;
  $scope.isAuthenticated = AuthService.isAuthenticated;
  $scope.isAuthorized = AuthService.isAuthorized;
  $scope.isLoading = false;
  $scope.currentNavItem = null;
  $scope.imageBasePath = PATHS.imageBasePath;
  $scope.mapImagePath = PATHS.mapImagePath;
  $scope.summaryData = null;
  $scope.stationImageBasePath = PATHS.stationImageBasePath;
  $scope.tempBasePath = PATHS.tempBasePath;


  /**
   * EVENTS
   ************************************************/

  // Handle the authentication events
  var loginSuccessListener = $scope.$on(AUTH_EVENTS.loginSuccess, function (event) {
    $location.path('/devices');
  });

  var notAuthenticatedListener = $scope.$on(AUTH_EVENTS.notAuthenticated, function (event) {
    // Used timeout to resolve problem with location change conflicts (refresh)
    $timeout(function () {
      AuthService.logout();
    }, 100);
  });

  var notAuthorizedListener = $scope.$on(AUTH_EVENTS.notAuthorized, function (event) {
    // Used timeout to resolve problem with location change conflicts (refresh)
    $timeout(function () {
      AuthService.logout();
    }, 100);
  });

  var loadingCounter = 0;
  var loadingListener = $scope.$on(APPLICATION_EVENTS.appLoading, function (event, args) {
    $timeout(function () {
      if (args.loading) {
        loadingCounter = loadingCounter + 1;
      } else {
        loadingCounter = loadingCounter - 1;
      }

      $scope.isLoading = loadingCounter > 0;
    }, 100);
  });

  var errorNotificationListener = $scope.$on(APPLICATION_EVENTS.appErrorNotify, function (event, args) {
    var message = $filter('translate')(args.message);
    if (args.description) {
      message += '<br/><code>' + args.description + '<code>';
    }
    toastr.error(message, $filter('translate')('ERROR'), { allowHtml: true });
  });

  var infoNotificationListener = $scope.$on(APPLICATION_EVENTS.appInfoNotify, function (event, args) {
    toastr.info($filter('translate')(args.message), $filter('translate')('INFO'));
  });

  var successNotificationListener = $scope.$on(APPLICATION_EVENTS.appSuccessNotify, function (event, args) {
    toastr.success($filter('translate')(args.message), $filter('translate')('SUCCESS'));
  });

  $scope.$on('$destroy', function () {
    loginSuccessListener();
    loginFailedListener();
    notAuthenticatedListener();
    notAuthorizedListener();
    loadingListener();
    errorNotificationListener();
    infoNotificationListener();
    successNotificationListener();
  });


  /**
   * FUNCTIONS
   ************************************************/

  $scope.goto = function (path) {
    $location.path(path);
  };

  $scope.logout = function () {
    AuthService.logout();
  };

  $scope.openCommandDashboard = function () {
    var commandDashboardURI = $scope.currentUser.extra ? $scope.currentUser.extra.commandDashboardURI : '';
    var commandDashboardAuth = $scope.currentUser.extra ? $scope.currentUser.extra.commandDashboardAuth : '';
    var commandDashboardURISegments = commandDashboardURI.split('://');

    var href = commandDashboardURISegments[0] + '://' + commandDashboardURISegments[1]; //commandDashboardAuth + '@' +
    $window.open(href, '_blank');
  };

  $scope.setBatchProgress = function(data) {
    $scope.batchStatus = data;
  };

  $scope.setCurrentUser = function (user) {
    $scope.currentUser = user;
  };

  $scope.setCurrentNavBarItem = function (currentNavItem) {
    $timeout(function () {
      $scope.currentNavItem = currentNavItem;
    }, 100);
  };

  $scope.setSummaryData = function (data) {
    $scope.summaryData = data;
  };

  $scope.trustSrc = function (src) {
    return $sce.trustAsResourceUrl(src);
  };

  $scope.trustHtml = function (html) {
    return $sce.trustAsHtml(html);
  };


  if ($scope.isAuthenticated()) {
    AuthService.getCurrentUser().then(function (user) {
      $scope.setCurrentUser(user);
    }, function (res) {
      $log.error(res.data);
    });
  }
};
