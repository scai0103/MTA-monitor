const express = require('express');
const router = express.Router();
const config = require('config');
const logger = require('../../config/logger');
const request = require('request');
const format = require('string-format');
const utils = require(__base + 'shared/utils');

const Downtime = require(__base + 'shared/models/downtime');

const icingaConfig = config.get('Icinga');
const baseUrl = icingaConfig.URI;
const authSegment = icingaConfig.Auth.split(':');


module.exports = function (app) {
  const roles = [app.get('roles').superadmin, app.get('roles').admin, app.get('roles').operator];
  const permissionMiddleware = require('../middlewares/permissions')(app, roles);

  const icingaSyncManager = app.get('icingaSyncManager');
  const auditLogger = require('../shared/auditLogger')(app);

  // all routes are managed by permissionMiddleware
  router.use(permissionMiddleware)

  // READ ROUTE
  router.get('/:id', function (req, res) {
    try {
      const deviceId = req.params.id;
      const endpoint = format(icingaConfig.EndpointMaintenance, deviceId);

      request({
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
            return res.status(500).json({ error: 'SERVER_ERROR', description: JSON.stringify(error) });
          }

          const icingaError = utils.tryToExtractIcingaErrors(response.statusCode, body);
          if (icingaError && icingaError.statusCode != 200) {
            logger.error(body);
            return res.status(icingaError.statusCode).json({ error: 'SERVER_ERROR', description: icingaError.message });
          }

          const downtimes = body.results.map((self) => { return Downtime.createFromDowntime(self.attrs); });
          const downtime = downtimes.length ? downtimes[0] : null; //nella nostra gestione ci può essere solo una manutenzione programmata

          return res.status(200).json(downtime);

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

  // CREATE ROUTE
  router.post('/schedule/:id', function (req, res) {
    try {
      const downtime = new Downtime(req.body);

      // imposto il downtime a fixed
      downtime.fixed = true;

      const deviceId = req.params.id;
      const endpoint = format(icingaConfig.EndpointCreateMaintenance, deviceId);
      const icingaRequestBody = downtime.convertToIcingaDowntime();

      request({
        url: baseUrl + endpoint,
        method: 'POST',
        auth: {
          user: authSegment[0],
          pass: authSegment[1]
        },
        headers: {
          'Accept': 'application/json'
        },
        strictSSL: false,
        rejectUnhauthorized: false,
        json: icingaRequestBody
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

          auditLogger.logMaintenanceOn(req.user, deviceId, downtime);

          // Update the cache file
          icingaSyncManager
            .sync()
            .catch((error) => {
              logger.error(error);
            })
            .then(() => {
              return res.status(response.statusCode).json(downtime);
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
  router.post('/remove/:id', function (req, res) {
    try {
      const downtime = new Downtime(req.body);
      const deviceId = req.params.id;
      const endpoint = format(icingaConfig.EndpointRemoveMaintenance, deviceId);

      request({
        url: baseUrl + endpoint,
        method: 'POST',
        auth: {
          user: authSegment[0],
          pass: authSegment[1]
        },
        headers: {
          'Accept': 'application/json'
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

          auditLogger.logMaintenanceOff(req.user, deviceId, {});

          // Update the cache file
          icingaSyncManager
            .sync()
            .catch((error) => {
              logger.error(error);
            })
            .then(() => {
              return res.status(response.statusCode).json({});
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
  })

  return router;
}
