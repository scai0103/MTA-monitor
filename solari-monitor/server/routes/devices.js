const express = require('express');
const router = express.Router();
const config = require('config');
const request = require('request');
const logger = require('../../config/logger');
const uuidV4 = require('uuid/v4');
const format = require('string-format');
const path = require('path');
const fs = require('fs');
const formidable = require('formidable');
const constants = require(__base + 'shared/constants');
const utils = require(__base + 'shared/utils');
const csvImporter = require(__base + 'shared/csvImporter');

const Device = require(__base + 'shared/models/device');
const Downtime = require(__base + 'shared/models/downtime');
const ErrorWithStatusCode = require(__base + 'shared/models/errorWithStatusCode');

const icingaConfig = config.get('Icinga');
const baseUrl = icingaConfig.URI;
const authSegment = icingaConfig.Auth.split(':');

const JOB_TYPE_HTTP = 'HTTP';
const JOB_TYPE_MAINTENANCE = 'MNT';
const JOB_COMMAND_UPDATE = 'update';
const JOB_COMMAND_ADD_MAINTENANCE = 'add_maintenance';
const JOB_COMMAND_REMOVE_MAINTENANCE = 'remove_maintenance';

module.exports = function (app) {
  const roles = [app.get('roles').superadmin, app.get('roles').admin];
  const permissionMiddleware = require('../middlewares/permissions')(app, roles);

  const deviceGroupModel = app.get('models').DeviceGroup;
  const icingaSyncManager = app.get('icingaSyncManager');
  const auditLogger = require('../shared/auditLogger')(app);

  // LIST ROUTE
  router.get('/', function (req, res) {
    try {
      const endpoint = icingaConfig.EndpointHosts + '?filter=\"solari-monitor\" in host.templates';

      request({
        url: baseUrl + endpoint,
        method: 'GET',
        auth: {
          user: authSegment[0],
          pass: authSegment[1]
        },
        strictSSL: false,
        rejectUnhauthorized: false,
        json: true,
      }, function (error, response, body) {

        try {

          if (error) {
            logger.error(error);
            return res.status(500).json({ error: 'SERVER_ERROR', description: JSON.stringify(error) });
          }

          const icingaError = utils.tryToExtractIcingaErrors(response.statusCode, body);
          if (icingaError && icingaError.statusCode != 200 && icingaError.statusCode != 404) {
            logger.error(body);
            return res.status(icingaError.statusCode).json({ error: 'SERVER_ERROR', description: icingaError.message });
          }

          let list = body.results || [];
          let devices = [];
          list.forEach(function (host) {
            if (!host.groups.includes(constants.DUMMY_HOSTS)) {
              devices.push(Device.createFromHost(host.attrs));
            }
          });

          return res.status(200).json({ devicesList: devices });

        } catch (e) {
          logger.error(e);
          res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
        }
      });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  // SYNC ROUTE
  router.get('/sync', function (req, res) {
    try {
      return icingaSyncManager
        .getCacheData()
        .then((cacheDataStr) => {
          res.status(200);
          res.setHeader('Content-Type', 'application/json');
          res.send(cacheDataStr);
          return res.end();
        })
        .catch((error) => {
          return res.status(error.statusCode).json({ error: error.message });
        });
    } catch (e) {
      logger.error(e);
      return res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  // CREATE ROUTE
  router.post('/', permissionMiddleware, function (req, res) {
    try {
      const device = new Device(req.body);

      // Genero il *name* del device come GUID
      device.name = uuidV4();

      createIcingaHost(device, deviceGroupModel)
        .then(() => {

          try {

            auditLogger.logCreate(req.user, auditLogger.TYPE_DEVICE, device);

            // Update the cache file
            icingaSyncManager
              .sync()
              .catch((error) => {
                logger.error(error);
              })
              .then(() => {
                return res.status(200).json(device);
              });

          } catch (e) {
            logger.error(e);
            res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
          }
        })
        .catch((error) => {
          return res.status(error.statusCode).json({ error: error.message });
        });

    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  // READ ROUTE
  router.get('/:id', function (req, res) {
    try {
      const deviceId = req.params.id;
      const endpoint = icingaConfig.EndpointHosts + '/' + deviceId;

      return request({
        url: baseUrl + endpoint,
        method: 'GET',
        auth: {
          user: authSegment[0],
          pass: authSegment[1]
        },
        strictSSL: false,
        rejectUnhauthorized: false,
        json: true
      }, function (error, response, body) {

        try {

          if (error) {
            logger.error(error);
            return res.status(500).json({ error: JSON.stringify(error) });
          }

          const icingaError = utils.tryToExtractIcingaErrors(response.statusCode, body);
          if (icingaError && icingaError.statusCode != 200) {
            logger.error(body);
            return res.status(icingaError.statusCode).json({ error: 'SERVER_ERROR', description: icingaError.message });
          }

          var data = JSON.parse(body);
          var host = data && data.results ? data.results[0] : {};

          var device = Device.createFromHost(host.attrs);

          return res.status(200).json(device);

        } catch (e) {
          logger.error(e);
          res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
        }
      })

    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  // UPDATE ROUTE
  router.put('/:id', permissionMiddleware, function (req, res) {
    try {
      const deviceId = req.params.id;
      const device = new Device(req.body);

      const isTemplateChanged = device.previousTemplateName != device.config.templateName;
      const isStationChanged = device.previousStationName != device.config.stationName;

      if (isTemplateChanged || isStationChanged) {
        logger.info("Device update: Template or station changed!");

        device.name = deviceId;

        deleteIcingaHost(deviceId, deviceGroupModel)
          .then(() => { return createIcingaHost(device, deviceGroupModel); })
          .then(() => {

            try {

              auditLogger.logUpdate(req.user, auditLogger.TYPE_DEVICE, device);

              // Update the cache file
              icingaSyncManager
                .sync()
                .catch((error) => {
                  logger.error(error);
                })
                .then(() => {
                  return res.status(201).json(device);
                });

            } catch (e) {
              logger.error(e);
              res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
            }
          })
          .catch((error) => {
            return res.status(error.statusCode).json({ error: error.message });
          });
      }
      else {
        updateIcingaHost(deviceId, device, deviceGroupModel)
          .then(() => {

            auditLogger.logUpdate(req.user, auditLogger.TYPE_DEVICE, device);

            // Update the cache file
            icingaSyncManager
              .sync()
              .catch((error) => {
                logger.error(error);
              })
              .then(() => {
                return res.status(201).json(device);
              });

          })
          .catch((error) => {
            return res.status(error.statusCode).json({ error: error.message });
          });
      }

    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  // DELETE ROUTE
  router.delete('/:id', permissionMiddleware, function (req, res) {
    try {
      const deviceId = req.params.id;
      const device = req.body;

      deleteIcingaHost(deviceId, deviceGroupModel)
        .then(() => {

          try {

            auditLogger.logDelete(req.user, auditLogger.TYPE_DEVICE, device);

            // Update the cache file
            icingaSyncManager
              .sync()
              .catch((error) => {
                logger.error(error);
              })
              .then(() => {
                return res.status(200).json({});
              });

          } catch (e) {
            logger.error(e);
            res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
          }
        })
        .catch((error) => {
          return res.status(error.statusCode).json({ error: error.message });
        });

    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  // CONFIG ROUTE
  router.get('/config/:ip', permissionMiddleware, function (req, res) {
    try {
      const deviceIP = req.params.ip;

      request({
        url: 'https://' + deviceIP + '/configdb/device',
        method: 'GET',
        auth: {
          user: 'admin',
          pass: 'naspas'
        },
        json: true,
        https: true,
        strictSSL: false,
        rejectUnhauthorized: false,
        timeout: 5000
      }, function (error, response, body) {

        try {

          if (error) {
            logger.error(error);
            return res.status(500).json({ error: 'SERVER_ERROR', description: JSON.stringify(error) });
          }

          if (response.statusCode != 200) {
            logger.error(body);
            var statusCode = response.statusCode == 401 || response.statusCode == 403 ? 500 : response.statusCode;
            return res.status(statusCode).json({ error: 'SERVER_ERROR', description: JSON.stringify(body) });
          }

          return res.status(200).json(body);

        } catch (e) {
          logger.error(e);
          res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
        }
      });

    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  // STATUS ROUTE
  router.get('/status/:ip', function (req, res) {
    try {
      const deviceIP = req.params.ip;

      request({
        url: 'https://' + deviceIP + '/monitapi/status',
        method: 'GET',
        auth: {
          user: 'admin',
          pass: 'naspas'
        },
        json: true,
        https: true,
        strictSSL: false,
        rejectUnhauthorized: false,
        timeout: 5000
      }, function (error, response, body) {

        try {

          if (error) {
            logger.error(error);
            return res.status(500).json({ error: 'SERVER_ERROR', description: JSON.stringify(error) });
          }

          if (response.statusCode != 200) {
            logger.error(body);
            var statusCode = response.statusCode == 401 || response.statusCode == 403 ? 500 : response.statusCode;
            return res.status(statusCode).json({ error: 'SERVER_ERROR', description: JSON.stringify(body) });
          }

          return res.status(200).json(body);

        } catch (e) {
          logger.error(e);
          res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
        }
      });

    } catch (e) {
      logger.error(e)
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message })
    }
  });

  // LOG ROUTE
  router.get('/log/:ip', function (req, res) {
    try {
      const deviceIP = req.params.ip;

      request({
        url: 'https://' + deviceIP + '/log',
        method: 'GET',
        auth: {
          user: 'admin',
          pass: 'naspas'
        },
        json: true,
        https: true,
        strictSSL: false,
        rejectUnhauthorized: false,
        timeout: 5000
      }, function (error, response, body) {

        try {

          if (error) {
            logger.error(error);
            return res.status(500).json({ error: 'SERVER_ERROR', description: JSON.stringify(error) });
          }

          if (response.statusCode != 200) {
            logger.error(body);
            var statusCode = response.statusCode == 401 || response.statusCode == 403 ? 500 : response.statusCode;
            return res.status(statusCode).json({ error: 'SERVER_ERROR', description: JSON.stringify(body) });
          }

          return res.status(200).json(body);

        } catch (e) {
          logger.error(e);
          res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
        }
      });

    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  // SYSLOG ROUTE
  router.get('/syslog/:ip', function (req, res) {
    try {
      const deviceIP = req.params.ip;

      request({
        url: 'https://' + deviceIP + '/log/syslog',
        method: 'GET',
        auth: {
          user: 'admin',
          pass: 'naspas'
        },
        json: false,
        https: true,
        strictSSL: false,
        rejectUnhauthorized: false,
        timeout: 5000
      }, function (error, response, body) {

        try {

          if (error) {
            logger.error(error);
            return res.status(500).end();
          }

          if (response.statusCode != 200) {
            logger.error(body);
            var statusCode = response.statusCode == 401 || response.statusCode == 403 ? 500 : response.statusCode;
            return res.status(statusCode).end(body);
          }

          res.setHeader('Content-disposition', 'attachment; filename=syslog');
          return res.status(200).end(body);

        } catch (e) {
          logger.error(e);
          res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
        }
      });

    } catch (e) {
      logger.error(e);
      res.status(500).end();
    }
  });

  // BULK IMPORT UPLOAD ROUTE
  router.post('/import/upload', permissionMiddleware, function (req, res) {
    try {
      let fileName = uuidV4();
      let uploadedFile = null;

      // create an incoming form object
      const form = new formidable.IncomingForm();

      // specify that we want to allow the user to upload multiple files in a single request
      form.multiples = true;

      // store all uploads in the /uploads directory
      const uploadDir = config.get('UploadBaseFolderPath');
      form.uploadDir = uploadDir;

      // validate file extension
      form.onPart = function (part) {
        if (!part.filename || part.filename.match(/\.(csv)$/i)) {
          this.handlePart(part);
        }
        else {
          const validationMessage = part.filename + ' is not a valid CSV';
          logger.error(validationMessage);

          return this._error(new Error(validationMessage));
        }
      }

      // every time a file has been uploaded successfully,
      // rename it to it's orignal name
      form.on('file', function (field, file) {
        uploadedFile = file;
      });

      // log any errors that occur
      form.on('error', function (e) {
        logger.error('An error has occured: ' + e);
        return res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
      });

      // once all the files have been uploaded, send a response to the client
      form.on('end', function () {
        try {

          if (!uploadedFile) {
            const validationMessage = 'Error uploading file';
            logger.error(validationMessage);
            return res.status(500).json({ error: 'SERVER_ERROR', description: validationMessage });
          }

          const fileSegments = uploadedFile.name.split('.');
          const fileExtension = fileSegments.length == 2 ? fileSegments[1] : null;

          if (fileExtension) {
            fileName += '.' + fileExtension;
          }

          const filePath = path.join(form.uploadDir, fileName);

          fs.rename(uploadedFile.path, filePath, function () {
            const auditLogger = require('../shared/auditLogger')(app);
            // process CSV file
            csvImporter.process(filePath, auditLogger, req.user)
              .then(() => {
                return res.status(200).json({ fileName: fileName });
              })
              .catch((e) => {
                return res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
              });
          });

        } catch (e) {
          logger.error(e);
          res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
        }
      });

      // parse the incoming request containing the form data
      form.parse(req);

    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  // BULK IMPORT REPORT ROUTE
  router.get('/import/report', permissionMiddleware, function (req, res) {
    try {
      csvImporter
        .getReport()
        .then((report) => {
          res.status(200).json(report);
          res.end();
        })
        .catch((error) => {
          res.status(error.statusCode).json({ error: error.message });
          res.end();
        });

    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  // MULTIPLE UPDATE ROUTE
  router.post('/update/multiple', permissionMiddleware, function (req, res) {
    try {
      const batchConfig = config.get('Batch');
      const batchConfigAuth = batchConfig.Auth.split(':');
      const requestBody = req.body;

      requestBody.devices.forEach((device) => {
        // Se è un comando di tipo HTTP devo aggiungere il baseURL di icinga
        if (device.type == JOB_TYPE_HTTP) {
          if (device.commandName == JOB_COMMAND_UPDATE) {
            device.method = 'POST';
            device.url = icingaConfig.URI + icingaConfig.EndpointHosts + '/' + device.id;
            device.auth = icingaConfig.Auth;
            var deviceData = new Device(device.parameters);

            // predispongo l'oggetto della richiesta (devo mettere tutto l'oggetto perchè icinga non permette di aggiornare una singola proprietà)
            var icingaRequestBody = deviceData.convertToIcingaHost();

            // Rimuovo le proprietà che non si possono modificare
            delete icingaRequestBody.templates;
            delete icingaRequestBody.attrs.groups;

            device.body = icingaRequestBody;
          } else if (device.commandName == JOB_COMMAND_REMOVE_MAINTENANCE) {
            device.method = 'POST';
            device.url = icingaConfig.URI + format(icingaConfig.EndpointRemoveMaintenance, device.id);
            device.auth = icingaConfig.Auth;
            device.body = {};
          } else {
            logger.error("Command name not available.");
            res.status(500).json({ error: 'SERVER_ERROR', description: "Command name not available." });
          }
        }

        else if (device.type == JOB_TYPE_MAINTENANCE) {
          if (device.commandName == JOB_COMMAND_ADD_MAINTENANCE) {
            device.method = 'POST';
            device.url = icingaConfig.URI + format(icingaConfig.EndpointCreateMaintenance, device.id);
            device.deleteUrl = icingaConfig.URI + format(icingaConfig.EndpointRemoveMaintenance, device.id);
            device.auth = icingaConfig.Auth;
            var downtime = new Downtime(device.parameters);
            downtime.fixed = true;
            device.body = downtime.convertToIcingaDowntime();
          }
          else {
            logger.error("Command name not available.");
            res.status(500).json({ error: 'SERVER_ERROR', description: "Command name not available." });
          }
        }

        else {
          logger.error("Command type not available.");
          res.status(500).json({ error: 'SERVER_ERROR', description: "Command type not available." });
        }
      });

      // Send the request to the bach server
      request({
        url: batchConfig.URI + batchConfig.EndpointReceiver,
        method: 'POST',
        auth: {
          'user': batchConfigAuth[0],
          'pass': batchConfigAuth[1]
        },
        json: requestBody
      }, function (error, response, body) {

        try {
          if (error) {
            logger.error(error);
            return res.status(500).json({ error: 'SERVER_ERROR', description: JSON.stringify(error) });
          }

          if (response.statusCode !== 200) {
            logger.error(body);
            return res.status(response.statusCode).json({ error: "SERVER_ERROR", description: JSON.stringify(body) });
          }

          requestBody.devices.forEach(function (device) {
            const deviceId = device.id;
            if (device.commandName == JOB_COMMAND_UPDATE) {
              var deviceData = Device.createFromHost(device.body.attrs);
              auditLogger.logUpdate(req.user, auditLogger.TYPE_DEVICE, deviceData);
            }
            else if (device.commandName == JOB_COMMAND_ADD_MAINTENANCE) {
              var downtimeData = Downtime.createFromDowntime(device.body);
              auditLogger.logMaintenanceOn(req.user, deviceId, downtimeData);
            }
            else if (device.commandName == JOB_COMMAND_REMOVE_MAINTENANCE) {
              auditLogger.logMaintenanceOff(req.user, deviceId, {});
            }
          });

          res.status(200).json(body);
        } catch (e) {
          logger.error(e);
          res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
        }

      });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  // MULTIPLE UPDATE STATUS ROUTE
  router.get('/update/multiple/:id', permissionMiddleware, function (req, res) {
    try {
      const batchId = req.params.id
      const batchConfig = config.get('Batch');
      const batchConfigAuth = batchConfig.Auth.split(':');

      // Send the request to the bach server
      request({
        url: batchConfig.URI + format(batchConfig.EndpointStatus, batchId),
        method: 'GET',
        auth: {
          'user': batchConfigAuth[0],
          'pass': batchConfigAuth[1]
        },
        json: true
      }, function (error, response, body) {

        if (error) {
          logger.error(error);
          return res.status(500).json({ error: 'SERVER_ERROR', description: JSON.stringify(error) });
        }

        if (response.statusCode !== 200) {
          logger.error(body);
          return res.status(response.statusCode).json({ error: "SERVER_ERROR", description: JSON.stringify(body) });
        }

        res.status(200).json(body);
      });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  return router;
}

function createIcingaHost(device, deviceGroupModel) {
  return new Promise((resolve, reject) => {
    try {
      const deviceId = device.name;
      const endpoint = icingaConfig.EndpointHosts + '/' + deviceId;
      const icingaRequestBody = device.convertToIcingaHost();

      request({
        url: baseUrl + endpoint,
        method: 'PUT',
        auth: {
          user: authSegment[0],
          pass: authSegment[1]
        },
        strictSSL: false,
        rejectUnhauthorized: false,
        json: icingaRequestBody
      }, function (error, response, body) {
        try {
          if (error) {
            logger.error(error);
            return reject(new ErrorWithStatusCode({ statusCode: 500, message: JSON.stringify(error) }));
          }

          const icingaError = utils.tryToExtractIcingaErrors(response.statusCode, body);
          if (icingaError && icingaError.statusCode != 200) {
            logger.error(body);
            return reject(new ErrorWithStatusCode({ statusCode: icingaError.statusCode, message: icingaError.message }));
          }

          const deviceGroupData = device.config.maintainerGroupIds.map(function (groupId) {
            return {
              idDevice: deviceId,
              idGroup: groupId
            }
          });

          deviceGroupModel
            .bulkCreate(deviceGroupData)
            .then(() => {
              return resolve();
            })
            .catch((error) => {
              logger.error(error);
              return reject(new ErrorWithStatusCode({ statusCode: 500, message: JSON.stringify(error) }));
            });
        } catch (error) {
          logger.error(error);
          return reject(new ErrorWithStatusCode({ statusCode: 500, message: 'devices::createIcingaHost: Generic error: ' + error }));
        }
      });
    } catch (error) {
      logger.error(error);
      return reject(new ErrorWithStatusCode({ statusCode: 500, message: 'devices::createIcingaHost: Generic error: ' + error }));
    }
  });
};

function updateIcingaHost(deviceId, device, deviceGroupModel) {
  return new Promise((resolve, reject) => {
    try {
      const endpoint = icingaConfig.EndpointHosts + '/' + deviceId;
      const icingaRequestBody = device.convertToIcingaHost();

      delete icingaRequestBody.templates;
      delete icingaRequestBody.attrs.groups;

      return request({
        url: baseUrl + endpoint,
        method: 'POST',
        auth: {
          user: authSegment[0],
          pass: authSegment[1]
        },
        strictSSL: false,
        rejectUnhauthorized: false,
        json: icingaRequestBody
      }, function (error, response, body) {
        try {
          if (error) {
            logger.error(error);
            return reject(new ErrorWithStatusCode({ statusCode: 500, message: JSON.stringify(error) }));
          }

          const icingaError = utils.tryToExtractIcingaErrors(response.statusCode, body);
          if (icingaError && icingaError.statusCode != 200) {
            logger.error(body);
            return reject(new ErrorWithStatusCode({ statusCode: icingaError.statusCode, message: icingaError.message }));
          }

          let deviceGroupData = device.config.maintainerGroupIds.map(function (groupId) {
            return {
              idDevice: deviceId,
              idGroup: groupId
            }
          });

          deviceGroupModel
            .destroy({ where: { idDevice: deviceId } })
            .then(deviceGroupModel.bulkCreate(deviceGroupData))
            .then(() => {
              return resolve();
            })
            .catch((error) => {
              logger.error(error);
              return reject(new ErrorWithStatusCode({ statusCode: 500, message: JSON.stringify(error) }));
            });
        } catch (error) {
          logger.error(error);
          return reject(new ErrorWithStatusCode({ statusCode: 500, message: 'devices::updateIcingaHost: Generic error: ' + error }));
        }
      });
    } catch (error) {
      logger.error(error);
      return reject(new ErrorWithStatusCode({ statusCode: 500, message: 'devices::updateIcingaHost: Generic error: ' + error }));
    }
  });
}

function deleteIcingaHost(deviceId, deviceGroupModel) {
  return new Promise((resolve, reject) => {
    try {
      const endpoint = icingaConfig.EndpointHosts + '/' + deviceId + '?cascade=1';

      request({
        url: baseUrl + endpoint,
        method: 'DELETE',
        auth: {
          user: authSegment[0],
          pass: authSegment[1]
        },
        strictSSL: false,
        rejectUnhauthorized: false,
        json: true
      }, function (error, response, body) {
        try {
          if (error) {
            logger.error(error);
            return reject(new ErrorWithStatusCode({ statusCode: 500, message: JSON.stringify(error) }));
          }

          const icingaError = utils.tryToExtractIcingaErrors(response.statusCode, body);
          if (icingaError && icingaError.statusCode != 200) {
            logger.error(body);
            return reject(new ErrorWithStatusCode({ statusCode: icingaError.statusCode, message: icingaError.message }));
          }

          // Create device/groups association in local DB
          deviceGroupModel
            .destroy({ where: { idDevice: deviceId } })
            .then(() => {
              return resolve();
            })
            .catch((error) => {
              logger.error(error);
              return reject(new ErrorWithStatusCode({ statusCode: 500, message: JSON.stringify(error) }));
            });
        } catch (error) {
          logger.error(error);
          return reject(new ErrorWithStatusCode({ statusCode: 500, message: 'devices::deleteIcingaHost: Generic error: ' + error }));
        }
      });

    } catch (error) {
      logger.error(error);
      return reject(new ErrorWithStatusCode({ statusCode: 500, message: 'devices::deleteIcingaHost: Generic error: ' + error }));
    }
  });
};
