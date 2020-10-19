servicesDomain.factory('fileUploadService', fileUploadService);

/* @ngInject */
function fileUploadService($log, $http, $q) {

  var fileUploadService = {
    upload: upload
  };

  return fileUploadService;

  /**
   * FUNCTIONS
   ************************************************/


  function errorHandler(e, responseJSON, serviceActionName) {
    var newMessage = 'XHR Failed for ' + serviceActionName;

    // For upload call
    if (!e.data) {
      e.data = {
        error: responseJSON ? responseJSON.error : "SERVER_ERROR",
        description: responseJSON ? responseJSON.description : ""
      }
    }

    if (e.data && e.data.error) {
      newMessage = newMessage + '\n' + e.data.error;
    }
    if (e.data && e.data.description) {
      newMessage = newMessage + '\n' + e.data.description;
    }
    if (e.data) {
      e.data.detail = newMessage;
    }
    $log.error(newMessage);
    return e;
  };


  function upload(url, files, onProgressCallback, onLoadCallback, onErrorCallback) {
    if (files.length > 0) {
      // create a FormData object which will be sent as the data payload in the
      // AJAX request
      var formData = new FormData();

      // loop through all the selected files and add them to the formData object
      for (var i = 0; i < files.length; i++) {
        var file = files[i];

        // add the files to formData object for the data payload
        formData.append('uploads[]', file, file.name);
      }

      // create an XMLHttpRequest
      var xhr = new XMLHttpRequest();

      // listen to the 'progress' event
      xhr.upload.onprogress = function (e) {
        if (onProgressCallback && typeof onProgressCallback === 'function') {
          onProgressCallback(e);
        }
      };

      // listen to the 'load' event
      xhr.onload = function (e) {

        if (xhr.status != 200) {
          var responseJSON = xhr.responseText ? JSON.parse(xhr.responseText) : null;
          var error = errorHandler(e, responseJSON, 'upload');
          if (onErrorCallback && typeof onErrorCallback === 'function') {
            onErrorCallback(error)
          }
          return false;
        }

        var response = {
          files: files,
          data: xhr.responseText ? JSON.parse(xhr.responseText) : null
        };

        if (onLoadCallback && typeof onLoadCallback === 'function') {
          onLoadCallback(response);
        }
      };

      // listen to the 'error' event
      xhr.upload.onerror = function (e) {
        var responseJSON = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        var error = errorHandler(e, responseJSON, 'upload');
        if (onErrorCallback && typeof onErrorCallback === 'function') {
          onErrorCallback(error)
        }
      };

      // POST the file
      xhr.open("POST", url);
      xhr.send(formData);

    }
  }

};
