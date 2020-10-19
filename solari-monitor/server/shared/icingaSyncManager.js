const request = require('request');
const config = require('config');
const logger = require(__base + '../config/logger');
const fs = require('fs');
const path = require('path');
const https = require('https');
const url = require('url');
const constants = require(__base + 'shared/constants');
const utils = require(__base + 'shared/utils');

const ErrorWithStatusCode = require(__base + 'shared/models/errorWithStatusCode');
const Template = require(__base + 'shared/models/template');
const Line = require(__base + 'shared/models/line');
const Area = require(__base + 'shared/models/area');
const Station = require(__base + 'shared/models/station');
const Device = require(__base + 'shared/models/device');
const Downtime = require(__base + 'shared/models/downtime');
const Service = require(__base + 'shared/models/service');

const icingaConfig = config.get('Icinga');
const cacheFolderPath = config.get('CacheFolderPath');
const lockFilePath = path.join(cacheFolderPath, 'sync.lock');
const baseUrl = icingaConfig.URI;
const emptyResponse = {
  areas: [],
  devices: [],
  lines: [],
  stations: [],
  templates: [],
  stationsTree: {}
};

module.exports = {
  sync: function () {
    return new Promise((resolve, reject) => {
      try {

        // check cache file
        if (!fs.existsSync(cacheFolderPath)) {
          fs.mkdirSync(cacheFolderPath);
        }

        // check if sync is already running
        if (fs.existsSync(lockFilePath)) {

          // check if the lock file is too old
          const FIVE_MIN = 5 * 60 * 1000;
          const now = new Date();
          const lockFileStat = fs.statSync(lockFilePath);
          if (now - new Date(lockFileStat.ctime) < FIVE_MIN) {
            // return reject(new ErrorWithStatusCode({ statusCode: 503, message: 'icingaSync::sync: Sync already running' }));
            return resolve(null);
          }

          // delete lock file and procede
          fs.unlinkSync(lockFilePath);
        }

        // create lock file
        fs.closeSync(fs.openSync(lockFilePath, 'w'));

        const icingaRequestsConfig = [
          {
            key: 'hosts',
            endpoint: icingaConfig.EndpointHosts,
            filter: '\"solari-monitor\" in host.templates',
            attrs: ['name', 'display_name', 'address', 'notes', 'groups', 'templates', 'last_hard_state', 'downtime_depth', 'vars']
          },
          {
            key: 'hostgroups',
            endpoint: icingaConfig.EndpointHostGroups,
            filter: 'match(\"LEVEL*\",hostgroup.vars.custom.type)',
            attrs: ['name', 'display_name', 'vars']
          },
          // {
          //   key: 'downtimes',
          //   endpoint: icingaConfig.EndpointDowntimes,
          //   filter: undefined,
          //   attrs: undefined
          // },
          {
            key: 'services',
            endpoint: icingaConfig.EndpointServices,
            filter: undefined,
            attrs: ['name', 'display_name', 'state', 'last_check_result', 'last_check', 'host_name', 'vars']
          }
        ];

        let promises = [];
        icingaRequestsConfig.forEach((config) => {
          promises.push(requestIcingaData(config));
        });


        return Promise
          .all(promises)
          .then((responses) => {
            const responseData = processIncingaData(responses);

            // save data to cache
            const cacheFilePath = path.join(cacheFolderPath, 'sync.json');
            fs.writeFileSync(cacheFilePath, JSON.stringify(responseData));

            // delete lock file and continue
            if (fs.existsSync(lockFilePath)) {
              fs.unlinkSync(lockFilePath);
            }

            return resolve(responseData);
          },
            (error) => {
              logger.error(error);

              // delete lock file and continue
              if (fs.existsSync(lockFilePath)) {
                fs.unlinkSync(lockFilePath);
              }

              const statusCode = error.statusCode || 500;
              const description = error.body ? utils.tryToExtractIcingaErrors(error.body) : JSON.stringify(error);
              return reject(new ErrorWithStatusCode({ statusCode: statusCode, message: 'icingaSync::sync: Unable to retrieve icinga data: ' + description }));
            }
          )
          .catch((error) => {
            logger.error(error);

            // delete lock file and continue
            if (fs.existsSync(lockFilePath)) {
              fs.unlinkSync(lockFilePath);
            }

            const statusCode = error.statusCode || 500;
            const description = error.body ? utils.tryToExtractIcingaErrors(error.body) : JSON.stringify(error);
            return reject(new ErrorWithStatusCode({ statusCode: statusCode, message: 'icingaSync::sync: Unable to retrieve icinga data: ' + description }));
          });

      } catch (error) {
        logger.error(error);

        // delete lock file and continue
        if (fs.existsSync(lockFilePath)) {
          fs.unlinkSync(lockFilePath);
        }

        return reject(new ErrorWithStatusCode({ statusCode: 500, message: 'icingaSync::sync: Generic error: ' + error }));
      }
    });
  },

  getCacheData: function () {
    return new Promise((resolve, reject) => {
      try {

        // check cache file
        if (!fs.existsSync(cacheFolderPath)) {
          fs.mkdirSync(cacheFolderPath);
        }

        // read data from cache
        const cacheFilePath = path.join(cacheFolderPath, 'sync.json');

        // if the cache file doesn't exists SYNC and return empty data
        if (!fs.existsSync(cacheFilePath)) {
          this.sync().catch((error) => {
            logger.error(error);
          });
          return resolve(JSON.stringify(emptyResponse));
        }

        // if the cache file is too old SYNC and return last data
        const ONE_MIN = 1 * 60 * 1000;
        const now = new Date();
        const cacheFileStat = fs.statSync(cacheFilePath);
        if (now - new Date(cacheFileStat.mtime) > ONE_MIN) {
          this.sync().catch((error) => {
            logger.error(error);
          });
        }

        const cacheStr = fs.readFileSync(cacheFilePath, 'utf-8');

        return resolve(cacheStr);

      } catch (error) {
        logger.error(error);
        return reject(new ErrorWithStatusCode({ statusCode: 500, message: 'icingaSync::getCacheData: Generic error: ' + error }));
      }
    });
  },

  deleteLockFile: function () {
    if (fs.existsSync(lockFilePath)) {
      fs.unlinkSync(lockFilePath);
    }
  }
};

function requestIcingaData(config) {

  const key = config.key;
  const endpoint = config.endpoint;
  const cacheFilePath = path.join(cacheFolderPath, key + '.json');
  const wstream = fs.createWriteStream(cacheFilePath);

  return new Promise(function (resolve, reject) {
    try {
      const parsedUrl = url.parse(baseUrl + endpoint);
      const postData = JSON.stringify({ filter: config.filter, attrs: config.attrs });
      const options = {
        method: 'POST',
        protocol: parsedUrl.protocol,
        host: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + (parsedUrl.search || ''),
        auth: icingaConfig.Auth,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': postData.length,
          'X-HTTP-Method-Override': 'GET'
        },
        rejectUnauthorized: false,
        timeout: 30 * 1000, // connection timeout
      };

      logger.debug("Send request for: " + options.host + options.path);

      const FIVE_MIN = 5 * 60 * 1000;

      const req = https
        .request(options, (res) => {
          const { statusCode } = res;
          const contentType = res.headers['content-type'];

          let error;
          if (statusCode !== 200 && statusCode != 404) {
            error = 'Request Failed. Status Code: ' + statusCode;
          } else if (!/^application\/json/.test(contentType)) {
            error = 'Invalid content-type. Expected application/json but received: ' + contentType;
          }

          if (error) {
            // consume response data to free up memory
            res.resume();
            return reject({ statusCode: statusCode, body: error });
          }

          res.setEncoding('utf8');
          res.pipe(wstream);
          res.on('end', () => {
            try {
              logger.debug("Received response for: " + options.host + options.path);

              const rawData = fs.readFileSync(cacheFilePath);
              const parsedData = JSON.parse(rawData);
              const results = parsedData.results;

              if (!results) {
                return reject({ statusCode: 500, body: parsedData });
              }

              let list = results || [];
              list = list.map(function (el) {
                return el.attrs;
              });

              logger.debug("Completed parsing for: " + options.host + options.path);
              // logger.debug(process.memoryUsage());

              return resolve(list);
            } catch (e) {

              logger.error("Error parsing response for: " + options.host + options.path);
              // logger.debug("Connection destroyed: " + res.connection.destroyed);
              // logger.debug(process.memoryUsage());

              return reject({ statusCode: 500, body: e.message });
            }
          });
        });

      req.on('error', (error) => {
        logger.error("Request error for: " + options.host + options.path);
        return reject({ statusCode: 500, body: error.message });
      });

      req.on('timeout', () => {
        logger.error("Request timeout for: " + options.host + options.path);
        if (!req.aborted) {
          req.abort();
        }
      });

      req.setTimeout(FIVE_MIN); // read timeout

      req.write(postData);

      req.end();

    } catch (e) {
      logger.error(e);
      return reject(new ErrorWithStatusCode({ statusCode: 500, message: 'icingaSync::requestIcingaData: Generic error: ' + e }));
    }
  });
};

function processIncingaData(responses) {

  let response = {
    areas: [],
    devices: [],
    lines: [],
    stations: [],
    templates: [],
    stationsTree: {},
    summary: { ok: 0, error: 0, warning: 0, maintenance: 0, lastUpdate: new Date() }
  };

  try {
    let hosts = responses[0] || [],
      hostgroups = responses[1] || [],
      // downtimes = responses[2] || [],
      services = responses[2] || [],
      templates = [];

    // create a tree that starts from hostgroups and that summarizes data
    let templatesTree = {}, // templates tree
      stationsTree = {}, // hostgroup->host tree
      devicesTree = {}; // host->service tree

    //#region templates

    templates = hosts.filter((host) => { return host.groups.includes(constants.DUMMY_HOSTS); });
    templates.forEach((tmpl) => {
      let template = Template.createFromTemplate(tmpl);
      templatesTree[template.name] = template;
      response.templates.push(template);
    });

    //#endregion

    //#region hostgroups

    hostgroups.forEach((hostgroup) => {
      switch (hostgroup.vars.custom.type) {
        case constants.TYPE_AREA:
          let area = Area.createFromHostgroup(hostgroup);
          response.areas.push(area);
          break;

        case constants.TYPE_STATION:
          let station = Station.createFromHostgroup(hostgroup);
          response.stations.push(station);
          stationsTree[station.name] = station;
          break;

        case constants.TYPE_LINE:
          let line = Line.createFromHostgroup(hostgroup);
          response.lines.push(line);
          break;
      };
    });

    //#endregion

    //#region  hosts

    hosts.forEach((host) => {

      // Exclude DUMMY HOSTS
      if (!host.groups.includes(constants.DUMMY_HOSTS)) {

        let device = Device.createFromHost(host);
        devicesTree[device.name] = device;

        for (let i = 0; i < host.templates.length; i++) {
          let templateName = host.templates[i];
          if (templateName == device.config.templateName && templatesTree[templateName]) {
            let templateNode = templatesTree[templateName];
            device.updateTemplateConfig(templateNode);
            break;
          }
        }

        for (let i = 0; i < host.groups.length; i++) {
          let groupName = host.groups[i];
          if (groupName == device.config.stationName && stationsTree[groupName]) {
            let stationNode = stationsTree[groupName];
            device.updateStationConfig(stationNode);
            stationNode.devices[device.name] = {};
            break;
          }
        }

        response.devices.push(device);
      }
    });

    //#endregion

    //#region services

    services.forEach((s) => {
      let service = Service.createFromService(s);
      let hostName = service.hostName;

      if (devicesTree[hostName]) {
        devicesTree[hostName].error |= service.error;
        devicesTree[hostName].warning |= service.warning;
        devicesTree[hostName].services[service.name] = service;
      }

      // Allineo lo stato del host anche sulla base dello stto dei servizi custom
      if (service.custom) {
        service.customServices.forEach((cs) => {
          if (devicesTree[hostName]) {
            devicesTree[hostName].error |= cs.error;
            devicesTree[hostName].warning |= (!cs.error && cs.warning);
          }
        });
      }
    });


    //#endregion

    //#region downtimes

    // downtimes.forEach((d) => {
    //   let downtime = Downtime.createFromDowntime(d);
    //   let hostName = d.host_name;
    //   if (devicesTree[hostName]) {
    //     devicesTree[hostName].downtimes.push(downtime);
    //   }
    // });

    //#endregion

    //#region stationTree

    for (let key of Object.keys(stationsTree)) {
      let stationTree = stationsTree[key];
      let devices = stationTree.devices;
      let error = false;
      let maintenance = true;
      for (let key1 of Object.keys(devices)) {
        let host = devices[key1];
        error |= devicesTree[key1].error;
        maintenance &= devicesTree[key1].maintenance;
        stationTree.devices[key1] = devicesTree[key1];

        if (devicesTree[key1].maintenance) {
          response.summary.maintenance++;
        }
        else if (devicesTree[key1].error) {
          response.summary.error++;
        }
        else if (devicesTree[key1].warning) {
          response.summary.warning++;
        }
        else {
          response.summary.ok++;
        }
      }

      stationTree.error = error;
      stationTree.maintenance = Object.keys(devices).length > 0 && maintenance;
    }

    response.stationsTree = stationsTree;

    //#endregion

  } catch (error) {
    logger.error(error);
  }

  return response;
};
