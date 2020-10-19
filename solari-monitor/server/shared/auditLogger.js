const logger = require('../../config/logger')
const format = require('string-format')

module.exports = function (app) {
  const auditLogModel = app.get('models').AuditLog

  return {

    TYPE_USER: 'USER',
    TYPE_GROUP: 'GROUP',
    TYPE_DEVICE: 'DEVICE',
    TYPE_STATION: 'STATION',

    SUB_TYPE_CREATE: 'CREATE',
    SUB_TYPE_UPDATE: 'UPDATE',
    SUB_TYPE_DELETE: 'DELETE',
    SUB_TYPE_IMPORT: 'IMPORT',
    SUB_TYPE_SEND_COMMAND: 'SEND_COMMAND',
    SUB_TYPE_CREATE_TICKET: 'CREATE_TICKET',
    SUB_TYPE_TURN_MAINTENANCE_ON: 'TURN_MAINTENANCE_ON',
    SUB_TYPE_TURN_MAINTENANCE_OFF: 'TURN_MAINTENANCE_OFF',

    log: function (idUser, author, type, subType, description, object) {
      try {
        const logData = {
          idUser: idUser,
          author: author,
          type: type,
          subType: subType,
          description: description,
          object: JSON.stringify(object)
        }

        return auditLogModel
          .create(logData)
          .then(function (log) {
          })
          .catch(function (err) {
            logger.error(err)
          })
      } catch (e) {
        logger.error(e)
      }
    },

    logCreate: function (user, type, object) {
      try {
        const author = format('{0} {1}', user.name, user.surname)
        const objectId = object.id
        const description = format('User "{0}" (#{1}) created a {2} (#{3})', author, user.id, type, objectId)
        this.log(user.id, author, type, this.SUB_TYPE_CREATE, description, object)
      } catch (e) {
        logger.error(e)
      }
    },

    logUpdate: function (user, type, object) {
      try {
        const author = format('{0} {1}', user.name, user.surname)
        const objectId = object.id
        const description = format('User "{0}" (#{1}) updated a {2} (#{3})', author, user.id, type, objectId)
        this.log(user.id, author, type, this.SUB_TYPE_UPDATE, description, object)
      } catch (e) {
        logger.error(e)
      }
    },

    logDelete: function (user, type, object) {
      try {
        const author = format('{0} {1}', user.name, user.surname)
        const objectId = object.id
        const description = format('User "{0}" (#{1}) deleted a {2} (#{3})', author, user.id, type, objectId)
        this.log(user.id, author, type, this.SUB_TYPE_DELETE, description, object)
      } catch (e) {
        logger.error(e)
      }
    },

    logMaintenanceOn: function (user, deviceId, object) {
      try {
        const author = format('{0} {1}', user.name, user.surname)
        const description = format('User "{0}" (#{1}) turned on MAINTENANCE for DEVICE (#{2})', author, user.id, deviceId)
        this.log(user.id, author, this.TYPE_DEVICE, this.SUB_TYPE_TURN_MAINTENANCE_ON, description, object)
      } catch (e) {
        logger.error(e)
      }
    },

    logMaintenanceOff: function (user, deviceId, object) {
      try {
        const author = format('{0} {1}', user.name, user.surname)
        const description = format('User "{0}" (#{1}) turned off MAINTENANCE for DEVICE (#{2})', author, user.id, deviceId)
        this.log(user.id, author, this.TYPE_DEVICE, this.SUB_TYPE_TURN_MAINTENANCE_OFF, description, object)
      } catch (e) {
        logger.error(e)
      }
    },

    logTicket: function (user, deviceId, object) {
      try {
        const author = format('{0} {1}', user.name, user.surname)
        const description = format('User "{0}" (#{1}) created a TICKET for DEVICE (#{2})', author, user.id, deviceId)
        this.log(user.id, author, this.TYPE_DEVICE, this.SUB_TYPE_CREATE_TICKET, description, object)
      } catch (e) {
        logger.error(e)
      }
    },

    logSendCommand: function (user, deviceId, object) {
      try {
        const author = format('{0} {1}', user.name, user.surname)
        const description = format('User "{0}" (#{1}) sent a COMMAND to DEVICE (#{2})', author, user.id, deviceId)
        this.log(user.id, author, this.TYPE_DEVICE, this.SUB_TYPE_SEND_COMMAND, description, object)
      } catch (e) {
        logger.error(e)
      }
    },

    logBulkImport: function (user, type, object) {
      try {
        const author = format('{0} {1}', user.name, user.surname)
        const description = format('User "{0}" (#{1}) imported a {2}', author, user.id, type)
        this.log(user.id, author, type, this.SUB_TYPE_IMPORT, description, object)
      } catch (e) {
        logger.error(e)
      }
    }
  }
}
