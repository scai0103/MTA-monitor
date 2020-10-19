angular.module('SolariMonitor', [
  'ngMaterial',
  'ngRoute',
  'ngCookies',
  'ngStorage',
  'ngMessages',
  'SolariMonitor.models',
  'SolariMonitor.filters',
  'SolariMonitor.directives',
  'SolariMonitor.services',
  'SolariMonitor.controllers',
  'md.data.table',
  'pascalprecht.translate',
  'emguo.poller',
  'toastr',
  'md.time.picker',
  'angularMoment'
])
  // .constant('$MD_THEME_CSS', '') // per IE11 disabilitare theme: Disabilitato tramite $mdThemingProvider.disableTheming();
  .constant('AUTH_EVENTS', {
    loginSuccess: 'auth-login-success',
    loginFailed: 'auth-login-failed',
    logoutSuccess: 'auth-logout-success',
    notAuthenticated: 'auth-not-authenticated',
    notAuthorized: 'auth-not-authorized'
  })
  .constant('LEAFLET_EVENTS', {
    markerDragEnd: 'leaflet-marker-dragend'
  })
  .constant('WIZARD_EVENTS', {
    wizardFailed: 'wizard-failed',
    wizardSuccess: 'wizard-success'
  })
  .constant('APPLICATION_EVENTS', {
    appLoading: 'app-loading',
    appErrorNotify: 'app-error-notify',
    appInfoNotify: 'app-info-notify',
    appSuccessNotify: 'app-success-notify'
  })
  .constant('FILE_UPLOAD_EVENTS', {
    uploadFailed: 'upload-failed',
    uploadSuccess: 'upload-success'
  })
  .constant('SYNC_EVENTS', {
    syncFailed: 'sync-failed',
    syncSuccess: 'sync-success'
  })
  .constant('BATCH_EVENTS', {
    statusFailed: 'batch-status-failed',
    statusSuccess: 'batch-status-success'
  })
  .constant('AVAILABLE_LANGUAGES', ['it', 'en'])
  .constant('USER_ROLES', {
    superadmin: 1,
    admin: 2,
    operator: 3,
    maintainer: 4
  })
  .constant('PATHS', {
    imageBasePath: 'assets/images/',
    mapImagePath: 'assets/images/map.jpg',
    stationImageBasePath: 'assets/images/MR/',
    tempBasePath: 'assets/temp/'
  })
  .config(['$routeProvider', 'USER_ROLES', '$mdThemingProvider', 'pollerConfig', '$compileProvider', '$mdCompilerProvider', '$translateProvider', '$mdDateLocaleProvider', 'moment',
    function ($routeProvider, USER_ROLES, $mdThemingProvider, pollerConfig, $compileProvider, $mdCompilerProvider, $translateProvider, $mdDateLocaleProvider, moment) {

      $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|file|javascript):/);

      // Disable theme for MSIE (from version 6 to 11)
      if (navigator.userAgent.indexOf('MSIE') !== -1 || navigator.appVersion.indexOf('Trident/') > -1) {
        $mdThemingProvider.disableTheming();
      }

      pollerConfig.resetOn = '$routeChangeStart';

      // $compileProvider.preAssignBindingsEnabled(true); // deprecato da angularjs > 1.7.x
      $mdCompilerProvider.respectPreAssignBindingsEnabled(true);

      // Translation init
      $translateProvider.useStaticFilesLoader({
        prefix: 'assets/translations/locale-',
        suffix: '.json'
      });
      // Set default language
      $translateProvider.preferredLanguage('en');
      // Add sanitazion of the strings to avoid XSS
      $translateProvider.useSanitizeValueStrategy('escape');

      // Add truncate to the string prototype
      function truncate(n, useWordBoundary) {
        if (this.length <= n) { return this; }
        var subString = this.substr(0, n - 1);
        return (useWordBoundary
          ? subString.substr(0, subString.lastIndexOf(' '))
          : subString) + "...";
      };
      String.prototype.trunc = truncate;

      function pad(num, pad) {
        return (pad + num).slice(-pad.length);
      }

      $mdDateLocaleProvider.parseDate = function (dateString) {
        var m = moment(dateString, 'MM/DD/YYYY', true);
        return m.isValid() ? m.toDate() : new Date(NaN);
      };

      $mdDateLocaleProvider.formatDate = function (date) {
        return moment(date).format('MM/DD/YYYY');
      };

      var customPrimary = {
        '50': '#819ba8',
        '100': '#728f9d',
        '200': '#648391',
        '300': '#5a7582',
        '400': '#4f6873',
        '500': '#455a64',
        '600': '#3b4c55',
        '700': '#303f46',
        '800': '#263137',
        '900': '#1b2428',
        'A100': '#90a7b2',
        'A200': '#9fb3bd',
        'A400': '#aebfc7',
        'A700': '#111619'
      };
      $mdThemingProvider
        .definePalette('customPrimary',
          customPrimary);

      var customAccent = {
        '50': '#fbfcfc',
        '100': '#fbfcfc',
        '200': '#00302c',
        '300': '#004943',
        '400': '#00635a',
        '500': '#007c71',
        '600': '#00af9f',
        '700': '#00c9b6',
        '800': '#00e2cd',
        '900': '#007c71',
        'A100': '#007c71',
        'A200': '#009688',
        'A400': '#007c71',
        'A700': '#007c71'
      };
      $mdThemingProvider
        .definePalette('customAccent',
          customAccent);

      var customWarn = {
        '50': '#ffb8a1',
        '100': '#ffa588',
        '200': '#ff916e',
        '300': '#ff7e55',
        '400': '#ff6a3b',
        '500': '#FF5722',
        '600': '#ff4408',
        '700': '#ee3900',
        '800': '#d43300',
        '900': '#bb2d00',
        'A100': '#ffcbbb',
        'A200': '#ffdfd4',
        'A400': '#fff2ee',
        'A700': '#a12700'
      };
      $mdThemingProvider
        .definePalette('customWarn',
          customWarn);

      var customBackground = {
        '50': '#ffffff',
        '100': '#ffffff',
        '200': '#fbfcfc',
        '300': '#ecf0f1',
        '400': '#dee4e7',
        '500': '#cfd8dc',
        '600': '#c0ccd1',
        '700': '#b1c0c6',
        '800': '#a3b4bc',
        '900': '#94a8b1',
        'A100': '#ffffff',
        'A200': '#ffffff',
        'A400': '#ffffff',
        'A700': '#859ca6'
      };
      $mdThemingProvider
        .definePalette('customBackground',
          customBackground);

      $mdThemingProvider.theme('default')
        .primaryPalette('customPrimary', {
          'default': '500', // by default use shade 400 from the pink palette for primary intentions
          'hue-1': '100', // use shade 100 for the <code>md-hue-1</code> class
          'hue-2': '600', // use shade 600 for the <code>md-hue-2</code> class
          'hue-3': 'A100' // use shade A100 for the <code>md-hue-3</code> class
        })
        .accentPalette('customAccent', {
          'default': 'A200', // by default use shade 400 from the pink palette for primary intentions
          'hue-1': '100', // use shade 100 for the <code>md-hue-1</code> class
          'hue-2': '600', // use shade 600 for the <code>md-hue-2</code> class
          'hue-3': 'A100' // use shade A100 for the <code>md-hue-3</code> class
        })
        .warnPalette('customWarn')
        .backgroundPalette('customBackground')

      $mdThemingProvider.theme('light-on-dark')
        .primaryPalette('customBackground')
        .dark()
        .foregroundPalette['3'] = 'rgba(198,198,198,0.9)';


      $routeProvider.when('/login', {
        templateUrl: 'views/login.html',
        controller: 'LoginController',
        resolve: {
          // check: function ($location, $q, AuthService) {
          //   var deferred = $q.defer();
          //   if (!AuthService.isAuthenticated()) {
          //     deferred.resolve(true);
          //   } else {
          //     deferred.reject();
          //     $location.path('/devices');
          //   }
          //   return deferred.promise;
          // }
        }
      });
      $routeProvider.when('/devices/:view?', {
        templateUrl: 'views/devices.html',
        controller: 'DevicesController',
        reloadOnSearch: false,
        resolve: {
          popupStationTemplate: function ($templateRequest) {
            return $templateRequest('views/devices/popupStationTemplate.html');
          }
        },
        data: {
          authorizedRoles: [USER_ROLES.superadmin, USER_ROLES.admin, USER_ROLES.maintainer, USER_ROLES.operator]
        }
      });
      $routeProvider.when('/stations/:view?', {
        templateUrl: 'views/stations.html',
        controller: 'StationsController',
        reloadOnSearch: false,
        resolve: {
          popupStationTemplate: function ($templateRequest) {
            return $templateRequest('views/stations/popupStationTemplate.html');
          }
        },
        data: {
          authorizedRoles: [USER_ROLES.superadmin, USER_ROLES.admin]
        }
      });
      $routeProvider.when('/stationDetails/:id/:view/:returnToRoute?/:returnToRouteView?', {
        templateUrl: 'views/stations/details.html',
        controller: 'StationDetailController',
        reloadOnSearch: false,
        resolve: {
          popupDeviceTemplate: function ($templateRequest) {
            return $templateRequest('views/stations/popupDeviceTemplate.html');
          }
        },
        data: {
          authorizedRoles: [USER_ROLES.superadmin, USER_ROLES.admin, USER_ROLES.maintainer, USER_ROLES.operator]
        }
      });
      $routeProvider.when('/deviceDetails/:id/:returnToRoute?', {
        templateUrl: 'views/devices/details.html',
        controller: 'DeviceDetailController',
        reloadOnSearch: false,
        data: {
          authorizedRoles: [USER_ROLES.superadmin, USER_ROLES.admin, USER_ROLES.maintainer, USER_ROLES.operator]
        }
      });
      $routeProvider.when('/history', {
        templateUrl: 'views/history.html',
        controller: 'HistoryController',
        data: {
          authorizedRoles: [USER_ROLES.superadmin, USER_ROLES.admin, USER_ROLES.maintainer, USER_ROLES.operator]
        }
      });
      $routeProvider.when('/users', {
        templateUrl: 'views/users.html',
        controller: 'UsersController',
        data: {
          authorizedRoles: [USER_ROLES.superadmin, USER_ROLES.admin]
        }
      });
      $routeProvider.when('/groups', {
        templateUrl: 'views/groups.html',
        controller: 'GroupsController',
        data: {
          authorizedRoles: [USER_ROLES.superadmin, USER_ROLES.admin]
        }
      });
      $routeProvider.when('/auditLog', {
        templateUrl: 'views/auditLog.html',
        controller: 'AuditLogController',
        data: {
          authorizedRoles: [USER_ROLES.superadmin, USER_ROLES.admin]
        }
      });
      $routeProvider.otherwise({
        redirectTo: '/login'
      });
    }])
  .run(['$rootScope', 'AUTH_EVENTS', 'AuthService',
    function ($rootScope, AUTH_EVENTS, AuthService) {
      $rootScope.isIE11 = navigator.userAgent.indexOf('MSIE') !== -1 || navigator.appVersion.indexOf('Trident/') > -1;
      $rootScope.$on('$routeChangeStart', function (event, next) {
        var authorizedRoles = next.data ? next.data.authorizedRoles : null;
        if (authorizedRoles && !AuthService.isAuthorized(authorizedRoles)) {
          event.preventDefault();
          if (AuthService.isAuthenticated()) {
            // user is not allowed
            $rootScope.$broadcast(AUTH_EVENTS.notAuthorized);
          } else {
            // user is not logged in
            $rootScope.$broadcast(AUTH_EVENTS.notAuthenticated);
          }
        }
      });
    }
  ]);
