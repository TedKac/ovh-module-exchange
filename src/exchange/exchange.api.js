{
  const VERBS = ['get', 'put', 'post', 'delete'];

  angular.module('Module.exchange.services').service(
    'APIExchange',
    class APIExchange {
      constructor(Api, $q, constants, $cacheFactory) {
        const cache = $cacheFactory.get('exchangeService') || $cacheFactory('exchangeService');

        _.forEach(VERBS, (verb) => {
          this[verb] = (path, optionsParam) => {
            const options = optionsParam || {};
            options.cache = cache;
            options.cache.removeAll();

            return Api[verb](`${constants.swsProxyRootPath}email/exchange${path}`, options).then(
              data => data,
              reason => $q.reject(reason),
            );
          };
        });
      }
    },
  );
}
