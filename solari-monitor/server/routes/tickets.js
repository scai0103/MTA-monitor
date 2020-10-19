const express = require('express');
const router = express.Router();
const config = require('config');
const request = require('request');
const logger = require('../../config/logger');
const format = require('string-format');

const redmineConfig = config.get('Redmine');
const baseUrl = redmineConfig.URI + redmineConfig.Path;
const authSegment = redmineConfig.Auth.split(':');


module.exports = function (app) {
  const roles = [app.get('roles').superadmin, app.get('roles').admin, app.get('roles').operator];
  const hasPermission = require('../middlewares/permissions')(app, roles);

  const auditLogger = require('../shared/auditLogger')(app);

  // READ ROUTE
  router.get('/:deviceId', hasPermission, function (req, res) {
    try {
      const deviceId = req.params.deviceId;
      const endpoint = redmineConfig.EndpointTickets;

      let queryParams = {};
      queryParams['cf_' + redmineConfig.CustomFieldId] = deviceId;

      request({
        url: baseUrl + endpoint,
        method: 'GET',
        auth: {
          user: authSegment[0],
          pass: authSegment[1]
        },
        strictSSL: false,
        rejectUnhauthorized: false,
        qs: queryParams
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

          return res.status(200).json({ tickets: JSON.parse(body).issues });

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
  router.post('/', hasPermission, function (req, res) {
    try {
      const endpoint = redmineConfig.EndpointTickets;
      const deviceId = req.body.deviceId;
      const deviceName = req.body.deviceName || "";

      let redmineRequestBody = {
        issue: {
          project_id: redmineConfig.ProjectId,
          subject: req.body.subject,
          description: format('[{0}] {1}', deviceName, req.body.description),
          status_id: 1,
          tracker_id: 1,
          custom_fields: [{
            value: deviceId,
            id: redmineConfig.CustomFieldId
          }]
        }
      };
      request({
        url: baseUrl + endpoint,
        method: 'POST',
        headers: {
          'X-Redmine-Switch-User': req.user ? req.user.username : ''
        },
        auth: {
          user: authSegment[0],
          pass: authSegment[1]
        },
        strictSSL: false,
        rejectUnhauthorized: false,
        json: redmineRequestBody
      }, function (error, response, body) {

        try {

          if (error) {
            logger.error(error);
            return res.status(500).json({ error: 'SERVER_ERROR', description: JSON.stringify(error) });
          }

          if (response.statusCode !== 201) {
            logger.error(body);
            return res.status(response.statusCode).json({ error: "SERVER_ERROR", description: JSON.stringify(body) });
          }

          auditLogger.logTicket(req.user, deviceId, redmineRequestBody);

          res.status(201).json(body);

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
