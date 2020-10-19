// User model definition
module.exports = function (sequelize, DataTypes) {
  let User = sequelize.define("User", {
    name: { type: DataTypes.STRING, allowNull: false },
    surname: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    idRole: { type: DataTypes.INTEGER, allowNull: false },
    idGroup: DataTypes.INTEGER,
    idRedmine: DataTypes.INTEGER,
    idKibana: DataTypes.INTEGER
  }, {
      classMethods: {
        associate: function (models) {
          User.belongsTo(models.Group, { foreignKey: 'idGroup', onDelete: 'SET NULL' })
        }
      }
    })

  return User
}
