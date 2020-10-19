directivesDomain.directive('leaflet', leaflet);

/* @ngInject */
function leaflet($rootScope, $location, $timeout, $log, $localStorage, leafletService, LEAFLET_EVENTS) {
  return {
    restrict: 'E',
    scope: {
      mapId: '=',
      center: '=',
      imageOverlayUrl: '=',
      markers: '=',
      markerCluster: '=',
      saveMapState: '='
    },
    replace: true,
    template: '<div class="map"></div>',
    link: link
  };

  function link(scope, element, attr, controller) {

    var saveMapState = scope.saveMapState;
    var scopeId = scope.mapId;
    var map = null;
    var markersLayer = null;

    scope.$watch('markers', updateMarkers);

    scope.$on('$destroy', destroy);

    active();


    /**
     * FUNCTIONS
     ************************************************/

    function active() {

      // Get the coordinates (latlng and zoom) from defaults <= directive <= localStorage
      var center = { lat: 50, lng: 50, zoom: 4 };
      angular.extend(center, scope.center);

      if (saveMapState) {
        angular.extend(center, getLocalData('center'));
      }

      // DM 04/07/208: tolto in quanto inefficiente e può dare problemi di performance/memoria
      // Preserve the coordinates (latlng and zoom) from the URL
      // if (!$rootScope.isIE11) {
      //   var searchObject = $location.search();
      //   if (saveMapState && searchObject.lat && searchObject.lng && searchObject.zoom) {
      //     angular.extend(center, {
      //       lat: parseFloat(searchObject.lat),
      //       lng: parseFloat(searchObject.lng),
      //       zoom: parseInt(searchObject.zoom)
      //     });
      //   }
      // }

      map = L.map(element[0], {
        crs: L.CRS.Simple,
        maxZoom: 7,
        minZoom: 3,
      });

      // Check if image overlay URL is defined
      if (scope.imageOverlayUrl) {
        var img = new Image();
        img.onload = function (e) {
          var width = this.width;
          var height = this.height;
          var ratio = (width / height);
          var bounds = [
            [0, 0],
            [100, 100 * ratio]
          ];

          // var southWest = map.unproject([0, height], map.getZoom());
          // var northEast = map.unproject([width, -height], map.getZoom());
          // var bounds = new L.LatLngBounds(southWest, northEast);
          // map.setMaxBounds(bounds);

          map.setView([center.lat, center.lng * ratio], center.zoom);
          map.setMaxBounds(bounds);

          var image = L.imageOverlay(scope.imageOverlayUrl, bounds)
            .setOpacity(0.9)
            .addTo(map);
        }

        img.src = scope.imageOverlayUrl;
      } else {
        $log.error('directive:leaflet: No "imageOverlayUrl" defined');
      }

      var markerCluster = scope.markerCluster;
      if (markerCluster) {
        markersLayer = L.markerClusterGroup(markerCluster);

        if (markerCluster.clusterMouseOverFunction) {
          markersLayer.on('clustermouseover', markerCluster.clusterMouseOverFunction);
        }
      } else {
        markersLayer = new L.FeatureGroup();
      }

      map.addLayer(markersLayer);

      // map.on('click', function (e) {
      //   console.log("click LATLNG", e.latlng);
      //   console.log("click POINT", map.project(e.latlng));
      // });

      map.on('moveend', function (e) {
        // DM 04/07/208: tolto in quanto inefficiente e può dare problemi di performance/memoria
        // $timeout(function () {

        //   if (saveMapState) {
        //     var lat = map.getCenter().lat;
        //     var lng = map.getCenter().lng;
        //     var zoom = map.getZoom();

        //     if (!$rootScope.isIE11) {
        //       $location.search('lat', lat);
        //       $location.search('lng', lng);
        //       $location.search('zoom', zoom);
        //     }

        //     setLocalData('center', { lat: lat, lng: lng, zoom: zoom });
        //   }

        // }, 0);

        if (saveMapState) {
          var lat = map.getCenter().lat;
          var lng = map.getCenter().lng;
          var zoom = map.getZoom();
          setLocalData('center', { lat: lat, lng: lng, zoom: zoom });
        }

      });

      // Export the map object
      leafletService.setMap(map, scopeId);

    };

    function destroy() {

      // DM 04/07/208: tolto in quanto inefficiente e può dare problemi di performance/memoria
      // if (saveMapState) {
      //   if (!$rootScope.isIE11) {
      //     $location.search('lat', null);
      //     $location.search('lng', null);
      //     $location.search('zoom', null);
      //   }
      // }

      map.remove();
      map = null;
    };

    function getLocalData(key) {
      if (!$localStorage['leafletData_' + scopeId]) {
        $localStorage['leafletData_' + scopeId] = {};
      }

      return $localStorage['leafletData_' + scopeId][key];
    };

    function setLocalData(key, localData) {
      if (!$localStorage['leafletData_' + scopeId]) {
        $localStorage['leafletData_' + scopeId] = {};
      }

      $localStorage['leafletData_' + scopeId][key] = localData;
    };

    function updateMarkers() {

      if (!markersLayer) {
        $log.warn("leafletDirective: MarkerLayer not ready");
        return;
      }

      markersLayer.clearLayers();

      angular.forEach(scope.markers, function (item, key) {

        var marker = L.marker([item.lat, item.lng], {
          title: item.title,
          draggable: item.draggable || false,
          focus: item.focus || false
        });

        if (item.icon) {
          var icon = null;
          switch (item.icon.type) {
            case 'div':
              icon = L.divIcon(item.icon);
              break;
            default:
              icon = L.icon(item.icon);
          }

          marker.setIcon(icon);
        }

        if (item.popupHtml) {
          var popup = L.popup().setContent(item.popupHtml);
          marker.bindPopup(popup, { maxWidth: "auto" });
        }
        else if (item.popupTemplate) {
          var popup = L.popup.angular({
            template: item.popupTemplate,
          }).setContent(item.popupContent);

          marker.bindPopup(popup, { maxWidth: "auto" });
        }

        marker.on('mouseover', function (e) {
          this.openPopup();
        });

        if (item.draggable) {
          marker.on('dragend', function (event) {
            var marker = event.target;
            var position = marker.getLatLng();
            scope.$emit(LEAFLET_EVENTS.markerDragEnd, { marker: marker, position: position });
          });
        }

        marker.private = item.private;

        markersLayer.addLayer(marker);

      });
    };

  }

}
