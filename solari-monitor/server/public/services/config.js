servicesDomain.config(function ($httpProvider) {
  $httpProvider.useApplyAsync(true);
  $httpProvider.interceptors.push('dataHttpInterceptor');
});
