const format = require('string-format');
const utils = require(__base + 'shared/utils');

const ServiceValue = require(__base + 'shared/models/serviceValue');

module.exports = Device;

function Device(obj) {
  const self = this;
  self.name = null;
  self.displayName = null;
  self.address = null;
  self.notes = "";
  self.groups = [];
  self.templates = [];
  self.services = {};
  self.error = false;
  self.maintenance = false;
  self.config = {};
  self.custom = {};
  self.os = null;
  self.faces = null;

  self.previousTemplateName = null;
  self.previousStationName = null;

  Object.keys(obj).forEach((prop, idx) => {
    if (obj.hasOwnProperty(prop) && self.hasOwnProperty(prop)) {
      self[prop] = obj[prop];
    }
  });
};

Device.prototype.updateTemplateConfig = function (template) {
  this.config.templateDisplayName = template.displayName;

  // Replace {address} placeholder
  this.custom = {
    faces: template.custom.faces,
    screenshotUrl: [],
    detailUrl: format(template.custom.detailUrl, { address: this.address }),
    maintenanceUrl: format(template.custom.maintenanceUrl, { address: this.address }),
    batchCommands: template.custom.batchCommands, //{address} placeholder will be replaced in the batch node application
    templateFields: template.custom.templateFields,
    templateServices: template.custom.templateServices
  };

  // Replace {address} placeholder
  template.custom.screenshotUrl.forEach((url) => {
    this.custom.screenshotUrl.push(format(url, { address: this.address }));
  });

  return this;
};

Device.prototype.updateStationConfig = function (station) {
  this.config.stationDisplayName = station.displayName;
  this.config.lineNames = station.custom.lineNames;

  const floor = station.custom.floors.find((floor) => { return floor.name == this.config.stationFloorId; })
  this.config.stationFloorDisplayName = floor ? floor.position.displayName : "Floor 0";
  this.config.stationFloorId = floor ? floor.name : -1; // TODO: trucco per non dover cancellare i device dei piani cancellati in precedenza

  return this;
};

Device.prototype.convertToIcingaHost = function () {
  return {
    templates: [this.config.templateName],
    attrs: {
      display_name: this.displayName,
      address: this.address,
      notes: this.notes,
      groups: [this.config.stationName],
      vars: {
        os: this.os,
        faces: this.faces,
        config: {
          area_name: this.config.areaName,
          line_name: this.config.lineName,
          station_name: this.config.stationName,
          station_floor_id: this.config.stationFloorId,
          template_name: this.config.templateName,
          model: this.config.model,
          serial_number: this.config.serialNumber,
          maintainer_group_ids: this.config.maintainerGroupIds,
          production: this.config.production,
          position: {
            display_name: this.config.position.displayName,
            lat_lng: [this.config.position.lat, this.config.position.lng]
          },
          template_fields_value: this.config.templateFieldsValue,
          template_services_value: fromDictionaryToArray(this.config.templateServicesValue)
        }
      }
    }
  }
};

Device.createFromHost = function (host) {
  return new Device({
    name: host.name,
    displayName: host.display_name,
    address: host.address,
    notes: host.notes,
    groups: host.groups,
    templates: host.templates,
    services: {},
    error: host.last_hard_state != 0 ? true : false,
    maintenance: host.downtime_depth != 0 ? true : false,
    os: host.vars.os,
    faces: host.vars.faces,
    config: {
      areaName: "", // TODO: prob da rimuovere
      lineNames: [],
      stationName: host.vars.config.station_name,
      stationDisplayName: "",
      stationFloorId: host.vars.config.station_floor_id != null ? host.vars.config.station_floor_id : -1,
      stationFloorDisplayName: "",
      templateName: host.vars.config.template_name,
      templateDisplayName: "",
      model: host.vars.config.model,
      serialNumber: host.vars.config.serial_number,
      maintainerGroupIds: host.vars.config.maintainer_group_ids,
      production: !utils.isNullOrUndefined(host.vars.config.production) ? host.vars.config.production : true,
      position: !utils.isNullOrUndefined(host.vars.config.position) ? {
        displayName: host.vars.config.position.display_name,
        lat: host.vars.config.position.lat_lng[0],
        lng: host.vars.config.position.lat_lng[1]
      } : {},
      templateFieldsValue: host.vars.config.template_fields_value,
      templateServicesValue: host.vars.config.template_services_value ? fromArrayToDictionary(host.vars.config.template_services_value) : undefined
    }
  });
};

function fromDictionaryToArray(dictionary) {
  var result = [];

  Object.keys(dictionary).forEach((prop, idx) => {
    if (dictionary.hasOwnProperty(prop)) {
      var serviceValue = new ServiceValue(dictionary[prop]);
      result.push(serviceValue.convertToIcingaConfig());
    }
  });

  return result;
};

function fromArrayToDictionary(vector) {
  var dictionary = {};

  if (Array.isArray(vector)) {
    vector.forEach((val) => {
      if (val.name) {
        dictionary[val.name] = ServiceValue.createFromIcingaConfig(val);
      }
    });
  }

  return dictionary;
};
