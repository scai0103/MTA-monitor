const logger = require('../../config/logger')

module.exports = function(app, rolesArray) {
    return function(req, res, next) {
        if (!req.user) {
            res.status(401).redirect('/')
        } else {
            let userRole = req.user.idRole
            let isAllowedRole = rolesArray.find(function(element) {
                return userRole == element
            })
            if (!isAllowedRole) {
                return res.sendStatus(401)
            } else {
                next()
            }
        }
    }
}