const logger = require(__base + '../config/logger');
const CustomService = require(__base + 'shared/models/customService');

module.exports = Service;

function Service(obj) {
  const self = this;
  self.name = null;
  self.hostName = null;
  self.displayName = null;
  self.error = false;
  self.warning = false;
  self.state = null;
  self.output = "";
  self.custom = false;
  self.customServices = null;
  self.lastCheck = null;

  Object.keys(obj).forEach((prop, idx) => {
    if (obj.hasOwnProperty(prop) && self.hasOwnProperty(prop)) {
      self[prop] = obj[prop];
    }
  });
};

Service.IsCustomService = function (service) {
  return service.vars ? service.vars.custom : false;
};

Service.createFromService = function (service) {
  const custom = service.vars ? service.vars.custom : false;
  const output = service.last_check_result ? service.last_check_result.output : "";
  const lastCheck = service.last_check && service.last_check != -1 ? service.last_check * 1000 : null;

  return new Service({
    name: service.name,
    hostName: service.host_name,
    displayName: service.display_name,
    error: service.state == 2 || service.state == 3 ? true : false,
    warning: service.state == 1,
    state: service.state,
    output: output,
    custom: custom,
    customServices: custom ? createCustomServices(output, service.host_name, lastCheck) : [],
    lastCheck: service.last_check && service.last_check != -1 ? service.last_check * 1000 : null
  });
};

function createCustomServices(output, hostName, lastCheck) {
  if (!isJsonString(output)) {
    return [];
  }

  const outputJSON = JSON.parse(output);
  const customServices = outputJSON.map((data) => {
    return CustomService.createFromServiceOutput(data, hostName, lastCheck);
  });

  return customServices;
};

function isJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    logger.error(e);
    return false;
  }
  return true;
};
