angular.module('Module.exchange.controllers').controller(
  'ExchangeToolboxResourcesCtrl',
  class ExchangeToolboxResourcesCtrl {
    constructor(navigation, exchangeStates) {
      this.services = { navigation, exchangeStates };
    }

    updateResource(resource) {
      if (this.services.exchangeStates.constructor.isOk(resource)) {
        this.services.navigation.setAction(
          'exchange/resource/update/resource-update',
          angular.copy(resource),
        );
      }
    }

    resourceDelegation(resource) {
      if (this.services.exchangeStates.constructor.isOk(resource)) {
        this.services.navigation.setAction(
          'exchange/resource/delegation/resource-delegation',
          angular.copy(resource),
        );
      }
    }

    deleteResource(resource) {
      if (this.services.exchangeStates.constructor.isOk(resource)) {
        this.services.navigation.setAction(
          'exchange/resource/remove/resource-remove',
          angular.copy(resource),
        );
      }
    }
  },
);
