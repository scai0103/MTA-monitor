// Group model definition
module.exports = function (sequelize, DataTypes) {
  let User = sequelize.import('./user')

  let Group = sequelize.define("Group", {
    name: { type: DataTypes.STRING, allowNull: false },
    idRedmine: DataTypes.INTEGER
  }, {
      associate: function (models) {
        Group.hasMany(models.User, { onDelete: 'SET NULL' })
      }
    })

  return Group
}
