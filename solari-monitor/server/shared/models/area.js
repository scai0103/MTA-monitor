module.exports = Area;

function Area(obj) {
  const self = this;
  self.name = null;
  self.displayName = null;
  self.custom = {};

  Object.keys(obj).forEach((prop, idx) => {
    if (obj.hasOwnProperty(prop) && self.hasOwnProperty(prop)) {
      self[prop] = obj[prop];
    }
  });
};

Area.createFromHostgroup = function (hostgroup) {
  return new Area({
    name: hostgroup.name,
    displayName: hostgroup.display_name,
    custom: {
      filterable: hostgroup.vars.custom.filterable,
      position: {
        displayName: hostgroup.vars.custom.position.display_name,
        lat: hostgroup.vars.custom.position.lat_lng[0],
        lng: hostgroup.vars.custom.position.lat_lng[1],
        zoom: hostgroup.vars.custom.position.zoom
      }
    }
  });
};
