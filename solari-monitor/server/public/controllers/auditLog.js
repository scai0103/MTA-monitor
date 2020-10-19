controllersDomain.controller('AuditLogController', AuditLogController);

/* @ngInject */
function AuditLogController($scope, $rootScope, $log, $mdDialog, $filter, auditLogService, APPLICATION_EVENTS) {

  var currentDate = new Date();
  var startDate = subtractMonth(currentDate, 1);
  var dateEnd = currentDate;


  /**
   * BINDINGS
   ************************************************/

  $scope.dateStart = startDate;
  $scope.dateEnd = dateEnd;
  $scope.deleteData = deleteData;
  $scope.logs = [];
  $scope.pageTitle = 'AUDIT_LOG';
  $scope.query = { order: 'createdAt', limit: 10, page: 1, filter: '' };
  $scope.refreshData = refresh;
  $scope.selected = [];


  activate();


  /**
  * FUNCTIONS
  ************************************************/

  function activate() {
    $scope.setCurrentNavBarItem(null);
    $scope.setSummaryData(null);
    refresh();
  };


  function deleteData($event) {

    // Appending dialog to document.body to cover sidenav in docs app
    var confirm = $mdDialog.confirm()
      .title($filter('translate')('DELETE_CONFIRM_TITLE'))
      .textContent($filter('translate')('DELETE_CONFIRM_MSG'))
      .ariaLabel($filter('translate')('DELETE_CONFIRM_TITLE'))
      .targetEvent($event)
      .ok($filter('translate')('OK'))
      .cancel($filter('translate')('CANCEL'));

    $mdDialog.show(confirm).then(function () {
      // Confirm function, call service
      var dateStart = $scope.dateStart.setHours(0, 0, 0, 0);
      var dateEnd = $scope.dateEnd.setHours(23, 59, 59, 0);

      auditLogService
        .deleteAuditLogs(dateStart, dateEnd)
        .then(function () {
          refresh();
        })
        .catch(function (err) {
          $log.error(err);
          $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
        });

    }, function () {
      // Cancel function, do nothing
    });
  };


  function refresh() {
    var dateStart = $scope.dateStart.setHours(0, 0, 0, 0);
    var dateEnd = $scope.dateEnd.setHours(23, 59, 59, 0);

    auditLogService
      .getAuditLogs(dateStart, dateEnd)
      .then(function (data) {
        $scope.logs = data.auditLogs;
      })
      .catch(function (err) {
        $log.error(err);
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      });
  };


  function subtractMonth(dt, subMonth) {
    return new Date(new Date(dt).setMonth(dt.getMonth() - subMonth));
  };
};
