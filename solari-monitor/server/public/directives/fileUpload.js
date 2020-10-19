directivesDomain.directive('fileUpload', fileUpload);

/* @ngInject */
function fileUpload($rootScope, $location, $timeout, $log, $localStorage, fileUploadService, APPLICATION_EVENTS, FILE_UPLOAD_EVENTS) {
  return {
    restrict: 'E',
    scope: {
      idx: '@',
      name: '@?',
      uploadUrl: '=',
      accept: '@?'
    },
    replace: true,
    templateUrl: '/views/fileUploadTemplate.html',
    require: 'ngModel',
    link: link
  };

  function link(scope, element, attrs, controller) {

    /**
     * BINDINGS
     ************************************************/

    scope.inputUploadElement;
    scope.isFileUploading = false;
    scope.name = angular.isDefined(scope.name) ? scope.name : 'upload-input';
    scope.progressValue = 0;


    /**
     * EVENTS
     ************************************************/

    scope.$on('$destroy', destroy);


    active();


    /**
     * FUNCTIONS
     ************************************************/

    function active() {

      var inputUploadElement = element.find('input');
      if (!inputUploadElement) {
        return;
      }

      scope.inputUploadElement = inputUploadElement;

      // listen to the 'change' event of the file input
      inputUploadElement.on('change', onInputChange);

      // add file maxsize validator
      if (attrs.maxsize) {
        var maxsize = parseInt(attrs.maxsize);
        controller.$validators.maxsize = function (modelValue, viewValue) {
          var value = modelValue || viewValue;
          if (angular.isUndefined(value) || value === null) {
            return true;
          }
          for (var i = value.length - 1; i >= 0; i--) {
            if (value[i] && value[i].size && value[i].size > maxsize) {
              return false;
            }
          }
          return true;
        };
      }

      // add file accept validator
      if (attrs.accept) {
        var accept = attrs.accept.split(',').map(function (val) { return val.trim(); });
        controller.$validators.accept = function (modelValue, viewValue) {
          var value = modelValue || viewValue;
          if (angular.isUndefined(value) || value === null) {
            return true;
          }
          for (var i = value.length - 1; i >= 0; i--) {
            if (value[i] && accept.indexOf(value[i].type) === -1) {
              return false;
            }
          }
          return true;
        };
      }
    };


    function destroy() {
      scope.isFileUploading = false;
      scope.progressValue = 0;

      if (scope.inputUploadElement) {
        scope.inputUploadElement.off('change');
      }
    };


    function onInputChange(event) {
      // reset the progress bar
      scope.progressValue = 0;

      var files = event.target ? event.target.files : [];
      controller.$setViewValue(files, event);

      if (!controller.$invalid && files.length > 0) {
        fileUploadService.upload(scope.uploadUrl, files, onProgressCallback, onLoadCallback, onErrorCallback)
        scope.isFileUploading = true;
      }
    };


    function onErrorCallback(err) {
      $timeout(function () {
        scope.$emit(FILE_UPLOAD_EVENTS.uploadFailed, { idx: scope.idx, name: scope.name, message: err.data.error, description: err.data.description });

        controller.$setViewValue(null);
        scope.inputUploadElement[0].value = "";
        scope.isFileUploading = false;
        $rootScope.$broadcast(APPLICATION_EVENTS.appErrorNotify, { message: err.data.error, description: err.data.description });
      }, 0);
    };


    function onLoadCallback(response) {
      $timeout(function () {
        scope.$emit(FILE_UPLOAD_EVENTS.uploadSuccess, { idx: scope.idx, name: scope.name, response: response });

        scope.inputUploadElement[0].value = "";
        scope.isFileUploading = false;
        $rootScope.$broadcast(APPLICATION_EVENTS.appSuccessNotify, { message: 'FILE_UPLOADED' });
      }, 0);
    };


    function onProgressCallback(event) {
      $timeout(function () {
        var progressValue = 0;
        if (event.lengthComputable) {
          progressValue = Math.round(event.loaded / event.total * 100);
        }

        scope.progressValue = progressValue;
      }, 0);
    };
  };

};
