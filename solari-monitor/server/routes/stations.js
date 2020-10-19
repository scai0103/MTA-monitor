const express = require('express');
const router = express.Router();
const config = require('config');
const logger = require('../../config/logger');
const request = require('request');
const uuidV4 = require('uuid/v4');
const path = require('path');
const fs = require('fs');
const formidable = require('formidable');
const utils = require(__base + 'shared/utils');

const Station = require(__base + 'shared/models/station');
const ErrorWithStatusCode = require(__base + 'shared/models/errorWithStatusCode');

const icingaConfig = config.get('Icinga');
const baseUrl = icingaConfig.URI;
const authSegment = icingaConfig.Auth.split(':');


module.exports = function (app) {
  const roles = [app.get('roles').superadmin, app.get('roles').admin];
  const permissionMiddleware = require('../middlewares/permissions')(app, roles);

  const icingaSyncManager = app.get('icingaSyncManager');
  const auditLogger = require('../shared/auditLogger')(app);

  // LIST ROUTE
  router.get('/', function (req, res) {
    try {
      const endpoint = icingaConfig.EndpointHostGroups + '?filter=match(\"LEVEL*\",hostgroup.vars.custom.type)';

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
            logger.error(error)
            return res.status(500).json({ error: 'SERVER_ERROR', description: JSON.stringify(error) });
          }

          const icingaError = utils.tryToExtractIcingaErrors(response.statusCode, body);
          if (icingaError && icingaError.statusCode != 200 && response.statusCode != 404) {
            logger.error(body);
            return res.status(icingaError.statusCode).json({ error: 'SERVER_ERROR', description: icingaError.message });
          }

          let list = body.results || [];
          let stations = [];
          list.forEach(function (hostgroup, idx, arr) {

            floors = hostgroup.vars.custom.floors.map((floor) => {
              return {
                position: {
                  displayName: floor.position.display_name,
                  lat: floor.position.lat_lng ? floor.position.lat_lng[0] : 0,
                  lng: floor.position.lat_lng ? floor.position.lat_lng[1] : 0,
                  mapUrl: floor.position.map_url
                }
              };
            });

            stations.push(
              {
                name: hostgroup.attrs.name,
                displayName: hostgroup.attrs.display_name,
                vars: {
                  custom: {
                    position: {
                      displayName: hostgroup.attrs.vars.custom.position.display_name,
                      latLng: hostgroup.attrs.vars.custom.position.lat_lng,
                      mapUrl: hostgroup.attrs.vars.custom.position.map_url
                    },
                    lineNames: hostgroup.attrs.vars.custom.line_names,
                    type: hostgroup.attrs.vars.custom.type,
                    filterable: hostgroup.attrs.vars.custom.filterable,
                    floors: floors
                  }
                }
              }
            )
          });

          return res.status(200).json({ stations: stations });

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

  // CREATE
  router.post('/', permissionMiddleware, function (req, res) {
    try {
      const station = new Station(req.body);

      // Genero il *name* della station come GUID
      station.name = uuidV4();

      const stationId = station.name;
      const endpoint = icingaConfig.EndpointHostGroups + '/' + stationId;

      let icingaRequestBody = station.convertToIcingaHostGroup();

      return request({
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
            logger.error(error)
            return res.status(500).json({ error: 'SERVER_ERROR', description: JSON.stringify(error) });
          }

          const icingaError = utils.tryToExtractIcingaErrors(response.statusCode, body);
          if (icingaError && icingaError.statusCode != 200) {
            logger.error(body);
            return res.status(icingaError.statusCode).json({ error: 'SERVER_ERROR', description: icingaError.message });
          }

          // map image rename
          const uploadTempFileName = station.uploadTempFileName;
          if (uploadTempFileName) {
            const uploadFileName = icingaRequestBody.attrs.vars.custom.position.map_url;
            updateImageFile(station.custom, uploadTempFileName, uploadFileName);
          }

          // floor map image rename
          station.custom.floors.forEach((floor, idx) => {
            const uploadTempFileName = floor.uploadTempFileName;
            if (uploadTempFileName) {
              const uploadFileName = icingaRequestBody.attrs.vars.custom.floors[idx].position.map_url;
              updateImageFile(floor, uploadTempFileName, uploadFileName);
            }
          });

          // delete files in temp folder (older than 1h)
          const tempBaseFolderPath = config.get('TempBaseFolderPath');
          const tempFileLiveTime = config.get('TempFileLiveTime');
          utils.deleteFilesOlderThan(tempBaseFolderPath, tempFileLiveTime);

          // audit log
          icingaRequestBody.id = station.name;
          auditLogger.logCreate(req.user, auditLogger.TYPE_STATION, icingaRequestBody);

          // Update the cache file
          icingaSyncManager
            .sync()
            .catch((error) => {
              logger.error(error);
            })
            .then(() => {
              return res.status(201).json(station);
            });

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

  // READ ROUTE
  router.get('/:id', function (req, res) {
    try {
      const stationId = req.params.id;
      const endpoint = icingaConfig.EndpointHostGroups + '/' + stationId;

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
            logger.error(error)
            return res.status(500).json({ error: JSON.stringify(error) });
          }

          const icingaError = utils.tryToExtractIcingaErrors(response.statusCode, body);
          if (icingaError && icingaError.statusCode != 200) {
            logger.error(body);
            return res.status(icingaError.statusCode).json({ error: 'SERVER_ERROR', description: icingaError.message });
          }

          var data = JSON.parse(body);
          var hostgroup = data && data.results ? data.results[0] : {};

          // TODO: bisogna convertire nel modello per angular

          return res.status(200).json(hostgroup);

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

  // UPDATE ROUTE
  router.put('/:id', permissionMiddleware, function (req, res) {
    try {
      const stationId = req.params.id;
      const station = new Station(req.body);
      const endpoint = icingaConfig.EndpointHostGroups + '/' + stationId;

      // delete floors image files
      station.deletedFloors.forEach((floor) => { deleteImageFile(floor); });

      let icingaRequestBody = station.convertToIcingaHostGroup();

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
            return res.status(500).json({ error: JSON.stringify(error) });
          }

          const icingaError = utils.tryToExtractIcingaErrors(response.statusCode, body);
          if (icingaError && icingaError.statusCode != 200) {
            logger.error(body);
            return res.status(icingaError.statusCode).json({ error: 'SERVER_ERROR', description: icingaError.message });
          }

          // map image rename
          const uploadTempFileName = station.uploadTempFileName;
          if (uploadTempFileName) {
            const uploadFileName = icingaRequestBody.attrs.vars.custom.position.map_url;
            updateImageFile(station.custom, uploadTempFileName, uploadFileName);
          }

          // floor map image rename
          station.custom.floors.forEach((floor, idx) => {
            const uploadTempFileName = floor.uploadTempFileName;
            if (uploadTempFileName) {
              const uploadFileName = icingaRequestBody.attrs.vars.custom.floors[idx].position.map_url;
              updateImageFile(floor, uploadTempFileName, uploadFileName);
            }
          });

          // delete files in temp folder (older than 1h)
          const tempBaseFolderPath = config.get('TempBaseFolderPath');
          const tempFileLiveTime = config.get('TempFileLiveTime');
          utils.deleteFilesOlderThan(tempBaseFolderPath, tempFileLiveTime);

          // audit log
          icingaRequestBody.id = stationId;
          auditLogger.logUpdate(req.user, auditLogger.TYPE_STATION, icingaRequestBody);

          // Update the cache file
          icingaSyncManager
            .sync()
            .catch((error) => {
              logger.error(error);
            })
            .then(() => {
              return res.status(200).json(station);
            });

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

  // DELETE ROUTE
  router.delete('/:id', permissionMiddleware, function (req, res) {
    try {
      const stationId = req.params.id;
      const station = new Station(req.body);
      const endpoint = icingaConfig.EndpointHostGroups + '/' + stationId + '?cascade=1';

      return request({
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
            return res.status(500).json({ error: 'SERVER_ERROR', description: JSON.stringify(error) });
          }

          const icingaError = utils.tryToExtractIcingaErrors(response.statusCode, body);
          if (icingaError && icingaError.statusCode != 200) {
            logger.error(body);
            return res.status(icingaError.statusCode).json({ error: 'SERVER_ERROR', description: icingaError.message });
          }

          auditLogger.logDelete(req.user, auditLogger.TYPE_STATION, station);

          // delete image file
          deleteImageFile(station.custom);

          // delete floors image files
          station.custom.floors.forEach((floor) => { deleteImageFile(floor); });

          // delete files in temp folder (older than 1h)
          const tempBaseFolderPath = config.get('TempBaseFolderPath');
          const tempFileLiveTime = config.get('TempFileLiveTime');
          utils.deleteFilesOlderThan(tempBaseFolderPath, tempFileLiveTime);

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

    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  // IMAGE UPLOAD ROUTE
  router.post('/image/upload', function (req, res) {
    try {
      let fileName = uuidV4();

      // create an incoming form object
      const form = new formidable.IncomingForm();

      // specify that we want to allow the user to upload multiple files in a single request
      form.multiples = true;

      // store all uploads in the /uploads directory
      const uploadDir = config.get('TempBaseFolderPath');

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
      }

      form.uploadDir = uploadDir;

      // validate file extension
      form.onPart = function (part) {
        if (!part.filename || part.filename.match(/\.(jpg|jpeg|png)$/i)) {
          this.handlePart(part);
        }
        else {
          const validationMessage = part.filename + ' is not a valid image (jpg|jpeg|png)';
          logger.error(validationMessage);

          return this._error(new Error(validationMessage));
        }
      };

      const ONE_MB = 1 * 1024 * 1024;
      // form.maxFileSize = ONE_MB; // nella versione 1.2.1 di formidable è disponibile una proprietà per limitare la dimensione massima dei file
      form.on('progress', function (bytesReceived, bytesExpected) {
        if (bytesReceived > ONE_MB) {
          const validationMessage = 'Exceed max file size (1MB)';
          logger.error(validationMessage);

          return this._error(new Error(validationMessage));
        }
      });

      // every time a file has been uploaded successfully,
      // rename it to it's orignal name
      form.on('file', function (field, file) {
        const fileSegments = file.name.split('.');
        const fileExtension = fileSegments.length == 2 ? fileSegments[1] : null;

        if (fileExtension) {
          fileName += '.' + fileExtension;
        }

        const filePath = path.join(form.uploadDir, fileName);
        fs.rename(file.path, filePath, function (err) {
          if (err) {
            logger.error(err);
          }
        });
      });

      // log any errors that occur
      form.on('error', function (e) {
        logger.error('An error has occured: ' + e);
        return res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
      });

      // once all the files have been uploaded, send a response to the client
      form.on('end', function () {
        return res.status(200).json({ fileName: fileName });
      });

      // parse the incoming request containing the form data
      form.parse(req);

    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });


  return router;
};

function deleteImageFile(floor) {
  const targetFilePath = path.join(config.get('MRBaseFolderPath'), floor.position.mapUrl);
  fs.unlink(targetFilePath, (err) => {
    if (err) {
      logger.error(err);
    }
  });
};

function updateImageFile(floor, uploadTempFileName, uploadFileName) {
  const oldFilePath = floor.position.mapUrl ? path.join(config.get('MRBaseFolderPath'), floor.position.mapUrl) : null;
  const sourceFilePath = path.join(config.get('TempBaseFolderPath'), uploadTempFileName);
  const targetFilePath = path.join(config.get('MRBaseFolderPath'), uploadFileName);

  if (oldFilePath != null) {
    fs.unlink(oldFilePath, (err) => {
      if (err) {
        logger.error(err);
      }
    });
  }

  fs.rename(sourceFilePath, targetFilePath, (err) => {
    if (err) {
      logger.error(err);
    }
  });
}
