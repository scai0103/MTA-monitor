filtersDomain.filter('intersect', intersect);

function intersect() {
  return function (array1, array2) {
    array3 = []
    angular.forEach(array1, function (value, index) {
      angular.forEach(array2, function (object, index1) {
        if (value.name == object.name) {
          array3.push(object)
        }
      })
    })

    return array3;
  };
};
