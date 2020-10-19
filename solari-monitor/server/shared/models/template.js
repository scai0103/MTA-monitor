module.exports = Template;

function Template(obj) {
  const self = this;
  self.name = null;
  self.displayName = null;
  self.custom = {};
  self.config = {};
  self.os = null;
  self.faces = null;

  Object.keys(obj).forEach((prop, idx) => {
    if (obj.hasOwnProperty(prop) && self.hasOwnProperty(prop)) {
      self[prop] = obj[prop];
    }
  });
};

Template.createFromTemplate = function (template) {

  const batchCommands = [];
  template.vars.custom.batch_commands.forEach((bc) => {
    batchCommands.push({
      name: bc.name,
      displayName: bc.display_name,
      command: bc.command,
      params: bc.params
    });
  });

  const templateFields = [];
  template.vars.custom.template_fields.forEach((tf) => {
    templateFields.push({
      name: tf.name,
      type: tf.type,
      displayName: tf.display_name
    });
  });

  const templateServices = [];
  template.vars.custom.template_services.forEach((ts) => {
    templateServices.push({
      name: ts.name,
      displayName: ts.display_name,
      faces: ts.faces,
      params: ts.params ? {
        checkString: ts.params.jq_check_string,
        type: ts.params.type,
        thresholds: ts.params.thresholds ? {
          error: ts.params.thresholds.error ? {
            maxValue: ts.params.thresholds.error.max_value,
            minValue: ts.params.thresholds.error.min_value
          } : undefined,
          warning: ts.params.thresholds.warning ? {
            maxValue: ts.params.thresholds.warning.max_value,
            minValue: ts.params.thresholds.warning.min_value
          } : undefined
        } : undefined
      } : undefined
    });
  });

  const templateServicesValue = {};
  if (template.vars.config && template.vars.config.template_services_value) {
    templateServices.forEach((ts) => {
      var ts_value = template.vars.config.template_services_value.find((v) => { return v.name === ts.name });
      if (ts_value) {
        templateServicesValue[ts.name] = {
          name: ts.name,
          displayName: ts.displayName,
          faces: ts.faces,
          params: {
            enabled: ts_value.params.enabled,
            checkString: ts.params.checkString,
            type: ts.params.type,
            thresholds: ts_value.params.thresholds ? {
              error: ts_value.params.thresholds.error ? {
                maxValue: ts_value.params.thresholds.error.max_value,
                minValue: ts_value.params.thresholds.error.min_value
              } : undefined,
              warning: ts_value.params.thresholds.warning ? {
                maxValue: ts_value.params.thresholds.warning.max_value,
                minValue: ts_value.params.thresholds.warning.min_value
              } : undefined
            } : undefined
          }
        };
      }
    });
  }

  return new Template({
    name: template.vars.custom.template_name,
    displayName: template.vars.custom.template_display_name,
    custom: {
      faces: template.vars.custom.faces,
      screenshotUrl: template.vars.custom.screenshot_url,
      detailUrl: template.vars.custom.detail_url,
      maintenanceUrl: template.vars.custom.maintenance_url,
      resolution: template.vars.custom.resolution,
      batchCommands: batchCommands,
      templateFields: templateFields,
      templateServices: templateServices
    },
    config: template.vars.config ? {
      templateFieldsValue: template.vars.config.template_fields_value,
      templateServicesValue: templateServicesValue
    } : {},
    os: template.vars.os,
    faces: template.vars.faces
  });
};
