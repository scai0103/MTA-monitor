controllersDomain.controller('UsersController', UsersController);

/* @ngInject */
function UsersController($scope, $rootScope, $mdDialog, $mdSidenav, $log, $filter, USER_ROLES, APPLICATION_EVENTS, usersService, groupsService) {

  var userModelInitial = {
    name: "",
    surname: "",
    email: "",
    password: "",
    confirmPassword: "",
    idRole: null,
    idGroup: null,
    idRedmine: null,
    idKibana: null
  };


  /**
   * BINDINGS
   ************************************************/

  $scope.addUser = addUser;
  $scope.deleteUser = deleteUser;
  $scope.disableFabToolbar = disableFabToolbar;
  $scope.editUserNavClose = editUserNavClose;
  $scope.editUserNavOpen = editUserNavOpen;
  $scope.enableFabToolbar = enableFabToolbar;
  $scope.handleSubmit = handleSubmit;
  $scope.isFormSubmitting = false;
  $scope.isOpen = false;
  $scope.isUpdate = false;
  $scope.pageTitle = 'USERS';
  $scope.query = { order: 'name', limit: 10, page: 1 };
  $scope.refreshUsers = refreshUsers;
  $scope.selected = [];
  $scope.selectedMode = 'md-scale';
  $scope.showConfirm = showConfirm;
  $scope.updateUser = updateUser;
  $scope.userModel = angular.copy(userModelInitial);
  $scope.userRoles = USER_ROLES;


  activate();


  /**
   * FUNCTIONS
   ************************************************/

  function activate() {
    $scope.setCurrentNavBarItem('users'); // defined in application controller
    $scope.setSummaryData(null);
    $scope.refreshUsers(); // Call refreshUsers for the page first loading
  }

  function addUser() {
    $scope.isUpdate = false;
    $scope.editUserNavOpen('right');
  };

  function deleteUser() {
    usersService.deleteUsers($scope.selected)
      .then(function (data) {
        $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: "USER_DELETED" });
        $scope.refreshUsers();
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
        $scope.refreshUsers();
      });
  };

  function disableFabToolbar() {
    $scope.isOpen = false;
  };

  function editUserNavClose() {
    $scope.userForm.$setUntouched();
    $scope.userForm.$setPristine();
    $scope.userModel = angular.copy(userModelInitial);
    $mdSidenav('edit-user-nav').close();
  };

  function editUserNavOpen() {
    $scope.userForm.$setUntouched();
    $scope.userForm.$setPristine();
    $mdSidenav('edit-user-nav').toggle();
  };

  function enableFabToolbar() {
    $scope.isOpen = true;
  };

  function handleSubmit() {

    $scope.isFormSubmitting = true;

    if ($scope.isUpdate) {
      var payload = {
        "userId": $scope.selected[0],
        "user": $scope.userModel
      }
      usersService.updateUser(payload)
        .then(function (data) {
          $scope.isFormSubmitting = false;
          $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: "USER_UPDATED" });
          $scope.isUpdate = false;
          $scope.editUserNavClose();
          $scope.refreshUsers();
        })
        .catch(function (err) {
          $log.error(err);
          $scope.isFormSubmitting = false;
          $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
        });
    } else {
      usersService.createUser($scope.userModel)
        .then(function (data) {
          $scope.isFormSubmitting = false;
          $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: "USER_CREATED" });
          $scope.editUserNavClose();
          $scope.refreshUsers();
        })
        .catch(function (err) {
          $log.error(err);
          $scope.isFormSubmitting = false;
          $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
        });
    }
  };

  function refreshUsers() {
    // Clear current selected users
    $scope.selected = [];
    // When we open the section we want to retrieve the list of users
    usersService.listUsers()
      .then(function (data) {

        $scope.users = data.users;
        for (var i in data.users) {
          var user = data.users[i];
          switch (user.idRole) {
            case $scope.userRoles.superadmin:
              user.roleName = "SuperAdmin";
              break;
            case $scope.userRoles.admin:
              user.roleName = "Admin";
              break;
            case $scope.userRoles.maintainer:
              user.roleName = "Maintainer";
              break;
            case $scope.userRoles.operator:
              user.roleName = "Operator";
              break;
            default:
              user.roleName = "-";
              break;
          }
        }

        // Load the groups from DB so they can be printed on the table
        groupsService.listGroups()
          .then(function (data) {
            $scope.groups = data.groups;
          })
          .catch(function (err) {
            $log.error(err);
            $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
          });

      }).catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };

  function showConfirm(ev) {
    // Appending dialog to document.body to cover sidenav in docs app
    var confirm = $mdDialog.confirm()
      .title($filter('translate')('DELETE_CONFIRM_TITLE'))
      .textContent($filter('translate')('DELETE_CONFIRM_MSG'))
      .ariaLabel($filter('translate')('DELETE_CONFIRM_TITLE'))
      .targetEvent(ev)
      .ok($filter('translate')('OK'))
      .cancel($filter('translate')('CANCEL'));

    $mdDialog.show(confirm)
      .then(function () {
        // Confirm function, call service
        $scope.deleteUser();
      }, function () {
        // Cancel function, do nothing
      });
  };

  function updateUser() {
    var userId = $scope.selected[0];
    usersService.getUser(userId)
      .then(function (data) {
        $scope.isUpdate = true;
        $scope.userModel = data.user;
        $scope.userModel.password = "";
        $scope.userModel.confirmPassword = "";
        $scope.editUserNavOpen();
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };
};
