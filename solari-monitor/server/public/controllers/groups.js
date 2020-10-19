controllersDomain.controller('GroupsController', GroupsController);

/* @ngInject */
function GroupsController(APPLICATION_EVENTS, $scope, $rootScope, $log, $filter, groupsService, $mdSidenav, $mdDialog) {

  var groupModelIntitial = { name: "" };


  /**
   * BINDINGS
   ************************************************/

  $scope.addGroup = addGroup;
  $scope.deleteGroup = deleteGroup;
  $scope.disableFabToolbar = disableFabToolbar;
  $scope.editGroupNavClose = editGroupNavClose;
  $scope.editGroupNavOpen = editGroupNavOpen;
  $scope.enableFabToolbar = enableFabToolbar;
  $scope.groupModel = angular.copy(groupModelIntitial);
  $scope.handleSubmit = handleSubmit;
  $scope.isFormSubmitting = false;
  $scope.isOpen = false;
  $scope.isUpdate = false;
  $scope.pageTitle = 'GROUPS';
  $scope.query = { order: 'name', limit: 10, page: 1 };
  $scope.refreshGroups = refreshGroups;
  $scope.selected = [];
  $scope.selectedMode = 'md-scale';
  $scope.showConfirm = showConfirm;
  $scope.updateGroup = updateGroup;


  activate();


  /**
   * FUNCTIONS
   ************************************************/

  function activate() {
    $scope.setCurrentNavBarItem('groups'); // defined in application controller
    $scope.setSummaryData(null);
    $scope.refreshGroups(); // Call refreshUsers for the page first loading
  }

  function addGroup() {
    $scope.isUpdate = false;
    $scope.editGroupNavOpen();
  };

  function deleteGroup() {
    groupsService.deleteGroups($scope.selected)
      .then(function (data) {
        $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: "GROUP_DELETED" });
        $scope.refreshGroups();
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };

  function disableFabToolbar() {
    $scope.isOpen = false;
  };

  function editGroupNavClose() {
    $scope.groupForm.$setUntouched();
    $scope.groupForm.$setPristine();
    $scope.groupModel = angular.copy(groupModelIntitial);
    $mdSidenav('edit-group-nav')
      .close()
      .then(function () {
        isOpen = false;
      })
  };

  function editGroupNavOpen() {
    $scope.disableFabToolbar();
    $mdSidenav('edit-group-nav').toggle()
  };

  function enableFabToolbar() {
    $scope.isOpen = true;
  };

  function handleSubmit() {

    $scope.isFormSubmitting = true;

    if ($scope.isUpdate) {
      var payload = {
        "groupId": $scope.selected[0],
        "group": $scope.groupModel
      }
      groupsService.updateGroup(payload)
        .then(function (data) {
          $scope.isFormSubmitting = false;
          $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: "GROUP_UPDATED" });
          $scope.isUpdate = false;
          $scope.editGroupNavClose();
          $scope.refreshGroups();
        })
        .catch(function (err) {
          $log.error(err);
          $scope.isFormSubmitting = false;
          $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
        });
    } else {
      groupsService.createGroup($scope.groupModel)
        .then(function (data) {
          $scope.isFormSubmitting = false;
          $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: "GROUP_CREATED" });
          $scope.editGroupNavClose();
          $scope.refreshGroups();
        })
        .catch(function (err) {
          $log.error(err);
          $scope.isFormSubmitting = false;
          $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
        });
    }
  };

  function refreshGroups() {
    // Clear current selected groups
    $scope.selected = [];
    // When we open the section we want to retrieve the list of groups
    groupsService.listGroups()
      .then(function (data) {
        $scope.groups = data.groups;
      })
      .catch(function (err) {
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
        $scope.deleteGroup();
      }, function () {
        // Cancel function, do nothing
      });
  };

  function updateGroup() {
    var groupId = $scope.selected[0];
    groupsService.getGroup(groupId)
      .then(function (data) {
        $scope.isUpdate = true;
        $scope.groupModel = data.group;
        $scope.editGroupNavOpen();
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };
};
