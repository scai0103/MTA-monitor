const uuidV4 = require('uuid/v4');

module.exports = Station;

function Station(obj) {
  const self = this;
  self.name = null;
  self.displayName = null;
  self.devices = {};
  self.error = false;
  self.maintenance = false;
  self.custom = {};

  self.uploadTempFileName = null;
  self.deletedFloors = [];

  Object.keys(obj).forEach((prop, idx) => {
    if (obj.hasOwnProperty(prop) && self.hasOwnProperty(prop)) {
      self[prop] = obj[prop];
    }
  });
};

Station.prototype.convertToIcingaHostGroup = function () {

  const self = this;
  const uploadTempFileName = this.uploadTempFileName;

  // Se viene passato un nuovo file temp dell'immagine
  let mapUrl = this.custom.position.mapUrl;
  if (uploadTempFileName) {
    mapUrl = sanitizeUploadFileName(uploadTempFileName, this.name);
  }

  const floors = this.custom.floors.map((floor) => { return convertFloorToIcingaConf(self.name, floor); });

  return {
    attrs: {
      display_name: this.displayName,
      vars: {
        custom: {
          position: {
            display_name: this.custom.position.displayName,
            lat_lng: [this.custom.position.lat, this.custom.position.lng],
            map_url: mapUrl
          },
          line_names: this.custom.lineNames,
          type: this.custom.type,
          filterable: this.custom.filterable,
          floors: floors
        }
      }
    }
  }
};

Station.createFromHostgroup = function (hostgroup) {
  let floors = [];
  if (hostgroup.vars.custom.floors) {
    floors = hostgroup.vars.custom.floors.map((floor) => {
      return {
        name: floor.name,
        position: {
          displayName: floor.position.display_name,
          lat: floor.position.lat_lng ? floor.position.lat_lng[0] : 0,
          lng: floor.position.lat_lng ? floor.position.lat_lng[1] : 0,
          mapUrl: floor.position.map_url
        }
      };
    });
  }

  return new Station({
    name: hostgroup.name,
    displayName: hostgroup.display_name,
    devices: {},
    error: false,
    maintenance: false,
    custom: {
      filterable: hostgroup.vars.custom.filterable,
      position: {
        displayName: hostgroup.vars.custom.position.display_name,
        lat: hostgroup.vars.custom.position.lat_lng[0],
        lng: hostgroup.vars.custom.position.lat_lng[1],
        mapUrl: hostgroup.vars.custom.position.map_url
      },
      lineNames: hostgroup.vars.custom.line_names,
      floors: floors
    }
  });
};


function convertFloorToIcingaConf(stationId, floor) {
  if (floor.isNew) {
    // Genero il *name* del floor come GUID
    floor.name = uuidV4();
  }

  // Se viene passato un nuovo file temp dell'immagine
  let mapUrl = floor.position.mapUrl
  if (floor.uploadTempFileName) {
    mapUrl = sanitizeUploadFileName(floor.uploadTempFileName, stationId + '_floor_' + floor.name);
  }

  return {
    name: floor.name,
    position: {
      display_name: floor.position.displayName,
      lat_lng: [floor.position.lat, floor.position.lng],
      map_url: mapUrl
    }
  }
};


function sanitizeUploadFileName(uploadTempFileName, uploadFileName) {
  const fileSegments = uploadTempFileName.split('.');
  const fileExtension = fileSegments.length == 2 ? fileSegments[1] : null;
  uploadFileName = uploadFileName + '.' + fileExtension;
  return uploadFileName;
}
