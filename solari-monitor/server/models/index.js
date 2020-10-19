/**
 * Models index, made to import the whole directory
 * inside the main app file
 */

const config = require('config')
const Sequelize = require('sequelize')
const fs = require('fs')
const path = require('path')
const sequelize = new Sequelize(config.get("DbConnectionURI"))

let db = {}
db.sequelize = sequelize

db.Sequelize = Sequelize

fs.readdirSync(__dirname)
    .filter(function(file) {
        return (file.indexOf(".") !== 0) && (file !== "index.js")
    })
    .forEach(function(file) {
        var model = sequelize.import(path.join(__dirname, file))
        db[model.name] = model
    })

Object.keys(db).forEach(function(modelName) {
    if ("associate" in db[modelName]) {
        db[modelName].associate(db)
    }
})

module.exports = db