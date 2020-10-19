// User model definition
module.exports = function(sequelize, DataTypes) {
    let Group = sequelize.import('./group')

    let DeviceGroup = sequelize.define("DeviceGroup", {
        idDevice: { type: DataTypes.STRING(100), unique: 'compositeIndex' },
        idGroup: { type: DataTypes.INTEGER, unique: 'compositeIndex' }
    }, {
        classMethods: {
            associate: function(models) {
                DeviceGroup.hasMany(Group, { foreignKey: 'idGroup' })
            }
        }
    })

    return DeviceGroup
}
