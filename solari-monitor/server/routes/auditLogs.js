const express = require('express');
const router = express.Router();
const logger = require('../../config/logger');


module.exports = function (app) {
  const roles = [app.get('roles').superadmin, app.get('roles').admin];
  const permissionMiddleware = require('../middlewares/permissions')(app, roles);

  // READ ROUTE
  router.get('/', permissionMiddleware, function (req, res) {
    try {
      const query = req.query;

      app.get('models').AuditLog
        .findAll({
          where: {
            createdAt: {
              $gte: new Date(Number(query.dateStart)),
              $lte: new Date(Number(query.dateEnd))
            }
          },
          order: [
            ['createdAt', 'DESC']
          ]
        })
        .then(function (auditLogs) {
          return res.status(200).json({ auditLogs: auditLogs });
        })
        .catch(function (err) {
          logger.error(err);
          return res.status(500).json({ error: "SERVER_ERROR", description: JSON.stringify(err) });
        });

    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  // DELETE ROUTE
  router.delete('/', permissionMiddleware, function (req, res) {
    try {
      const query = req.query;

      app.get('models').AuditLog
        .destroy({
          where: {
            createdAt: {
              $gte: new Date(Number(query.dateStart)),
              $lte: new Date(Number(query.dateEnd))
            }
          }
        })
        .then(function () {
          return res.status(200).json({});
        })
        .catch(function (err) {
          logger.error(err);
          return res.status(500).json({ error: "SERVER_ERROR", description: JSON.stringify(err) });
        });

    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  return router;
}
