angular.module('Module.exchange.controllers').controller(
  'ExchangeToolboxSharedAccountsCtrl',
  class ExchangeToolboxSharedAccountsCtrl {
    constructor($scope, navigation, Exchange, exchangeStates) {
      this.services = {
        $scope,
        navigation,
        Exchange,
        exchangeStates,
      };

      this.stateDoing = 'TASK_ON_DOING';
      this.stateError = 'TASK_ON_ERROR';

      $scope.isDisabled = () => this.isDisabled();
      $scope.deleteAccount = account => this.deleteAccount(account);
      $scope.delegationSettings = account => this.delegationSettings(account);
    }

    isDisabled(account) {
      return (
        !this.services.exchangeStates.constructor.isOk(account)
        || this.services.exchangeStates.constructor.isDoing(account)
        || this.services.exchangeStates.constructor.isInError(account)
      );
    }

    deleteAccount(account) {
      if (!this.isDisabled(account)) {
        this.services.navigation.setAction(
          'exchange/shared-account/delete/shared-account-delete',
          angular.copy(account),
        );
      }
    }

    delegationSettings(account) {
      if (!this.isDisabled(account)) {
        this.services.navigation.setAction(
          'exchange/shared-account/delegation/shared-account-delegation',
          angular.copy(account),
        );
      }
    }
  },
);
