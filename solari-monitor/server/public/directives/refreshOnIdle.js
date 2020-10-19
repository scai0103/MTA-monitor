directivesDomain.directive('refreshOnIdle', refreshOnIdle);

/* @ngInject */
function refreshOnIdle() {
  return {
    restrict: 'A',
    link: link
  };

  function link(scope, element, attrs, controller) {
    var idleTime = 1 * 60 * 1000;
    var checkTime = 10 * 60 * 1000;
    var time = new Date().getTime();
    var timeout = null;


    /**
     * EVENTS
     ************************************************/

    scope.$on('$destroy', destroy);


    /**
     * FUNCTIONS
     ************************************************/

    function destroy() {
      if(timeout) {
        clearTimeout(timeout);
        timeout = null;
      }

      window.removeEventListener("focus", updateTime, false);
      window.removeEventListener("blur", updateTime, false);
      window.removeEventListener("click", updateTime, false);
      window.removeEventListener("mousemove", updateTime, false);
      window.removeEventListener("keypress", updateTime, false);
    };

    function refresh() {
      // Se non ho fatto niente per più di *idleTime* (1min)
      if (new Date().getTime() - time >= idleTime) {
        window.location.reload(true);
        return;
      }

      // Ricontrolla fra *idleTime* (1min)
      timeout = setTimeout(refresh, idleTime);
    };

    function updateTime() {
      time = new Date().getTime();
    };


    // Controlla fra *checkTime* (10min)
    timeout = setTimeout(refresh, checkTime);

    window.addEventListener("focus", updateTime, false);
    window.addEventListener("blur", updateTime, false);
    window.addEventListener("click", updateTime, false);
    window.addEventListener("mousemove", updateTime, false);
    window.addEventListener("keypress", updateTime, false);
  }
};
