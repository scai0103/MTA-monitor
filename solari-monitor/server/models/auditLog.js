// AuditLog model definition
module.exports = function (sequelize, DataTypes) {
  let User = sequelize.import('./user')

  let AuditLog = sequelize.define("AuditLog", {
    idUser: DataTypes.INTEGER,
    author: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.STRING, allowNull: false },
    subType: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.STRING,
    object: DataTypes.TEXT
  })

  return AuditLog
}
