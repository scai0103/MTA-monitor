module.exports = ServiceValue;

function ServiceValue(obj) {

  const self = this;
  self.name = null;
  self.displayName = null;
  self.faces = null;
  self.params = {};

  Object.keys(obj).forEach((prop, idx) => {
    if (obj.hasOwnProperty(prop) && self.hasOwnProperty(prop)) {
      self[prop] = obj[prop];
    }
  });
};

ServiceValue.prototype.convertToIcingaConfig = function () {
  return {
    name: this.name,
    display_name: this.displayName,
    faces: this.faces,
    params: this.params ? {
      enabled: this.params.enabled,
      jq_check_string: this.params.checkString,
      type: this.params.type,
      thresholds: this.params.thresholds ? {
        error: this.params.thresholds.error ? {
          min_value: this.params.thresholds.error.minValue,
          max_value: this.params.thresholds.error.maxValue
        } : undefined,
        warning: this.params.thresholds.warning ? {
          min_value: this.params.thresholds.warning.minValue,
          max_value: this.params.thresholds.warning.maxValue
        } : undefined
      } : undefined
    } :undefined
  };
};

ServiceValue.createFromIcingaConfig = function (serviceValue) {
  return new ServiceValue({
    name: serviceValue.name,
    displayName: serviceValue.display_name,
    faces: serviceValue.faces,
    params: serviceValue.params ? {
      enabled: serviceValue.params.enabled,
      checkString: serviceValue.params.jq_check_string,
      type: serviceValue.params.type,
      thresholds: serviceValue.params.thresholds ? {
        error: serviceValue.params.thresholds.error ? {
          minValue: serviceValue.params.thresholds.error.min_value,
          maxValue: serviceValue.params.thresholds.error.max_value
        } : undefined,
        warning: serviceValue.params.thresholds.warning ? {
          minValue: serviceValue.params.thresholds.warning.min_value,
          maxValue: serviceValue.params.thresholds.warning.max_value
        } : undefined
      } : undefined
    } : undefined
  });
};
