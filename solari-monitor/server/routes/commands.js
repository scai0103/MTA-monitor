const express = require('express');
const router = express.Router();
const config = require('config');
const request = require('request');
const logger = require('../../config/logger');


module.exports = function (app) {
  const roles = [app.get('roles').superadmin, app.get('roles').admin, app.get('roles').operator];
  const hasPermission = require('../middlewares/permissions')(app, roles);

  const auditLogger = require('../shared/auditLogger')(app);

  // CREATE ROUTE
  router.post('/', hasPermission, function (req, res) {
    try {
      const batchConfig = config.get('Batch');
      const batchConfigAuth = batchConfig.Auth.split(':');
      const requestBody = req.body;

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
            auditLogger.logSendCommand(req.user, deviceId, device);
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

  return router;
}
