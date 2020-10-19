const express = require('express');
const router = express.Router();
const logger = require('../../config/logger');


module.exports = function (app) {
  const roles = [app.get('roles').superadmin, app.get('roles').admin];
  const hasPermission = require('../middlewares/permissions')(app, roles);

  const auditLogger = require('../shared/auditLogger')(app);

  // CREATE ROUTE
  router.post('/', hasPermission, function (req, res) {
    try {
      const groupRequest = req.body;

      app.get('models').Group
        .create(groupRequest)
        .then(function (group) {

          auditLogger.logCreate(req.user, auditLogger.TYPE_GROUP, group);

          return res.status(201).json(group.dataValues);
        })
        .catch(function (err) {
          logger.error(err);
          return res.status(500).json({ error: "SERVER_ERROR", description: JSON.stringify(err) });
        })
    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  // READ ROUTE
  router.get('/', function (req, res) {
    try {
      app.get('models').Group
        .findAll()
        .then(function (groups) {
          return res.json({ groups: groups });
        })
        .catch(function (err) {
          logger.error(err);
          return res.status(500).json({ error: "SERVER_ERROR", description: JSON.stringify(err) });
        })
    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  // READ BY ID
  router.get('/:id', function (req, res) {
    try {
      const groupId = req.params.id;

      if (!groupId) {
        res.status(400).json({ error: "BAD_REQUEST" });
      }

      app.get('models').Group
        .findById(groupId)
        .then(function (group) {

          if (!group) {
            return res.status(404).json({ error: "GROUP_NOT_FOUND" });
          }

          return res.json({ "group": group });
        })
        .catch(function (err) {
          logger.error(err);
          return res.status(500).json({ error: "SERVER_ERROR", description: JSON.stringify(err) });
        })
    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  // UPDATE ROUTE
  // Same request body as create
  router.put('/', hasPermission, function (req, res) {
    try {
      const groupId = req.body.groupId;
      const groupReqBody = req.body.group;

      if (!groupId) {
        res.status(400).json({ error: "BAD_REQUEST" });
      }

      app.get('models').Group
        .findById(groupId)
        .then(function (group) {

          if (!group) {
            return res.status(404).json({ error: "GROUP_NOT_FOUND" });
          }

          group
            .update(groupReqBody)
            .then(function (updatedGroup) {

              auditLogger.logUpdate(req.user, auditLogger.TYPE_GROUP, updatedGroup);

              return res.status(200).json(updatedGroup);
            })
            .catch(function (err) {
              logger.error(err);
              return res.status(500).json({ error: "SERVER_ERROR", description: JSON.stringify(err) });
            })

        })
        .catch(function (err) {
          logger.error(err);
          return res.status(500).json({ error: "SERVER_ERROR", description: JSON.stringify(err) });
        })
    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  // DELETE ROUTE
  /**
   * @param groupIds : Array of group ids to be deleted
   */
  router.delete('/', hasPermission, function (req, res) {
    try {
      const groupIds = req.body.groupIds;

      if (!groupIds || !groupIds.length) {
        return res.status(400).json({ error: "BAD_REQUEST" });
      }

      const groupModel = app.get('models').Group;
      let groupsToBedeleted = [];

      groupModel
        .findAll({
          where: {
            id: groupIds
          }
        })
        .then(function (groups) {
          groupsToBedeleted = groups;

          groupModel
            .destroy({
              where: {
                id: groupIds
              }
            })
            .then(function () {

              groupsToBedeleted.forEach(function (deletedGroup) {
                auditLogger.logDelete(req.user, auditLogger.TYPE_GROUP, deletedGroup);
              });

              return res.status(200).json({ success: true });
            })
            .catch(function (error) {
              logger.error(error);
              return res.status(500).json({ error: "SERVER_ERROR", description: JSON.stringify(error) });
            });
        })
        .catch(function (error) {
          logger.error(error);
          return res.status(500).json({ error: "SERVER_ERROR", description: JSON.stringify(error) });
        });
    } catch (e) {
      logger.error(e);
      res.status(500).json({ error: 'SERVER_ERROR', description: e.message });
    }
  });

  return router;
}
