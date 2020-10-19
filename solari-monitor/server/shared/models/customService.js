module.exports = CustomService;

function CustomService(obj) {
  const self = this;
  self.name = null;
  self.hostName = null;
  self.displayName = null;
  self.error = false;
  self.warning = false;
  self.lastCheck = null;
  self.faces = [];

  Object.keys(obj).forEach((prop, idx) => {
    if (obj.hasOwnProperty(prop) && self.hasOwnProperty(prop)) {
      self[prop] = obj[prop];
    }
  });
};

CustomService.createFromServiceOutput = function (jsonOutput, hostName, lastCheck) {
  return new CustomService({
    name: jsonOutput.name,
    hostName: hostName,
    displayName: jsonOutput.display_name,
    error: jsonOutput.error,
    warning: jsonOutput.warning,
    lastCheck: lastCheck,
    faces: jsonOutput.faces.map((face) => {
      return {
        error: face.error,
        warning: face.warning,
        value: face.value
      }
    })
  });
}
