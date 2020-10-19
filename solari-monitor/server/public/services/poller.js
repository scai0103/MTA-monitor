servicesDomain.factory('pollerService', PollerService);

/* @ngInject */
function PollerService($rootScope, $log, $http, $interval) {
  var pollerService = {
    poll: poll
  };

  return pollerService;

  /**
   * FUNCTIONS
   ************************************************/

  function poll(url, successCallback, errorCallback, pollerInterval, requestTimeout) {

    var Poller = function (options) {
      this.interval = null;
      this.isRequestPendeing = false;
      this.pollerInterval = options.pollerInterval || 30000;
      this.requestTimeout = options.requestTimeout || 20000;

      this.setOptions(options);
    };

    Poller.prototype.setOptions = function (options) {
      this.url = options.url;

      if (options.pollerInterval != null) {
        this.pollerInterval = options.pollerInterval;
      }

      if (options.requestTimeout != null) {
        this.requestTimeout = options.requestTimeout;
      }

      this.successCallback = options.successCallback;
      this.errorCallback = options.errorCallback;
    };

    Poller.prototype.start = function () {
      if (!this.interval) {
        this.execute();
        this.interval = $interval(

          (function (self) {       //Self-executing func which takes 'this' as self
            return function () {   //Return a function in the context of 'self'
              self.execute();    //Thing you wanted to run as non-window 'this'
            }
          })(this),

          this.pollerInterval);
      }
    };

    Poller.prototype.execute = function () {

      if (this.isRequestPendeing) {
        return;
      }

      this.isRequestPendeing = true;
      var self = this;
      $http
        .get(self.url, { timeout: self.requestTimeout, cache: false })
        .then(function (response) {
          self.isRequestPendeing = false;
          if (self.successCallback && angular.isFunction(self.successCallback)) {
            self.successCallback(response.data);
          }
        })
        .catch(function (e) {
          self.isRequestPendeing = false;
          var error = errorHandler(e);

          if (self.errorCallback && angular.isFunction(self.errorCallback)) {
            self.errorCallback(error);
          }
        });
    };

    Poller.prototype.stop = function () {
      if (this.interval) {
        $interval.cancel(this.interval);
        this.interval = null;
      }

      this.isRequestPendeing = false;
    };

    Poller.prototype.restart = function () {
      this.stop();
      this.start();
    };

    var poller = new Poller({ url: url, successCallback: successCallback, errorCallback: errorCallback, pollerInterval: pollerInterval, requestTimeout: requestTimeout });
    poller.start();
    return poller;
  };

  function errorHandler(e) {
    var newMessage = 'XHR Failed';
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

    return e;
  };

}
