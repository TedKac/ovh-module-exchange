angular.module('Module.exchange.controllers').controller(
  'ExchangeToolboxGroupsCtrl',
  class ExchangeToolboxGroupsCtrl {
    constructor($scope, navigation, Exchange, exchangeStates) {
      this.services = {
        $scope,
        navigation,
        Exchange,
        exchangeStates,
      };
    }

    updateGroup(ml) {
      if (this.services.exchangeStates.constructor.isOk(ml)) {
        this.services.navigation.setAction('exchange/group/update/group-update', angular.copy(ml));
      }
    }

    updateAccounts(ml) {
      if (this.services.exchangeStates.constructor.isOk(ml)) {
        this.services.navigation.setAction(
          'exchange/group/accounts/group-accounts',
          angular.copy(ml),
        );
      }
    }

    deleteGroup(ml) {
      if (this.services.exchangeStates.constructor.isOk(ml)) {
        this.services.navigation.setAction('exchange/group/remove/group-remove', angular.copy(ml));
      }
    }

    addGroupAlias(ml) {
      if (this.services.exchangeStates.constructor.isOk(ml)) {
        this.services.navigation.setAction(
          'exchange/group/alias/add/group-alias-add',
          angular.copy(ml),
        );
      }
    }

    groupDelegation(ml) {
      if (this.services.exchangeStates.constructor.isOk(ml)) {
        this.services.navigation.setAction(
          'exchange/group/delegation/group-delegation',
          angular.copy(ml),
        );
      }
    }
  },
);
