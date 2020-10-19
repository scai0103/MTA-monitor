directivesDomain.directive('deviceBulkUpload', deviceBulkUpload);

/* @ngInject */
function deviceBulkUpload($rootScope, $location, $timeout, $log, $localStorage, moment, devicesService, fileUploadService, APPLICATION_EVENTS, FILE_UPLOAD_EVENTS) {
  return {
    restrict: 'E',
    scope: {
      uploadUrl: '='
    },
    replace: true,
    templateUrl: '/views/devices/bulkUploadTemplate.html',
    link: link
  };

  function link(scope, element, attrs, controller) {

    var defaultUploadReport = null;
    var poller = null;

    /**
     * BINDINGS
     ************************************************/

    scope.formatDate = formatDate;
    scope.inputUploadElement;
    scope.isFileUploading = false;
    scope.isReportLoading = false;
    scope.progressValue = 0;
    scope.uploadFileName = null;
    scope.uploadReport = defaultUploadReport;


    /**
     * EVENTS
     ************************************************/

    var fileUploadSuccessListener = scope.$on(FILE_UPLOAD_EVENTS.uploadSuccess, onUploadSuccess);
    var fileUploadFailedListener = scope.$on(FILE_UPLOAD_EVENTS.uploadFailed, onUploadFailed);
    scope.$on('$destroy', destroy);


    active();


    /**
     * FUNCTIONS
     ************************************************/

    function active() {
    };


    function destroy() {
      scope.isReportLoading = false;

      if (poller) {
        poller.stop();
        poller = null;
      }

      fileUploadSuccessListener();
      fileUploadFailedListener();
    };


    function formatDate(dateISOStr) {
      var date = moment(dateISOStr);
      return date ? date.format('MM/DD/YYYY HH:mm') : '';
    };


    function onUploadSuccess($event, data) {
      $timeout(function () {
        // POLLER
        scope.isReportLoading = true;

        if (poller == null) {
          poller = devicesService.getBulkImportReportPoller();
          poller.promise
            .then(null, null, function (message) {

              if (message.status !== 200) {
                $log.error(message);
                return
              }

              var data = message.data;
              if (data.processing == false) {
                scope.uploadReport = data;

                if (poller) {
                  poller.stop();
                  poller = null;
                }

                scope.isReportLoading = false;
              }

            });
        }
      }, 0);
    };


    function onUploadFailed(err) {
      $timeout(function () {
        scope.isReportLoading = false;
      }, 0);
    };
  };
};
