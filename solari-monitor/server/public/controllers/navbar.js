controllersDomain.controller('NavbarController', NavbarController);

/* @ngInject */
function NavbarController($rootScope, $scope, $translate, AVAILABLE_LANGUAGES) {
    $scope.availableLanguages = AVAILABLE_LANGUAGES;
    $scope.currentLanguage = 'en';
    // $scope.$watch('currentLanguage', function() {
    //     $translate.use($scope.currentLanguage);
    // });
};
