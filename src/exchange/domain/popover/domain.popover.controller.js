angular.module('Module.exchange.controllers').controller(
  'ExchangeToolboxDomainsCtrl',
  class ExchangeToolboxDomainsCtrl {
    constructor(
      $scope,
      Exchange,
      navigation,
      $translate,
      messaging,
      exchangeVersion,
      exchangeStates,
      exchangeServiceInfrastructure,
    ) {
      this.services = {
        $scope,
        Exchange,
        navigation,
        $translate,
        messaging,
        exchangeVersion,
        exchangeStates,
        exchangeServiceInfrastructure,
      };
    }

    isReseller2010AuthInvalidMx() {
      return (
        this.services.exchangeServiceInfrastructure.isProvider()
        && this.services.exchangeVersion.isVersion(2010)
      );
    }

    isUpdateDisabled(domain) {
      return (
        !this.services.exchangeStates.constructor.isOk(domain)
        || domain.taskInProgress
        || this.isReseller2010AuthInvalidMx()
      );
    }

    isDeleteDisabled(domain) {
      return !this.services.exchangeStates.constructor.isOk(domain) || domain.accountsCount > 0;
    }

    getDeleteTooltip(domain) {
      return this.isDeleteDisabled(domain)
        ? this.services.$translate.instant('exchange_tab_domain_delete_domain_accounts_warning')
        : '';
    }
  },
);
