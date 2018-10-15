{
  class controller {
    constructor(
      Exchange,
      exchangeStates,
      messaging,
      navigation,
      $translate,
      $rootScope,
      $scope,
      $timeout,
      wizardHostedCreationDomainConfiguration,
      wizardHostedCreationEmailCreation,
    ) {
      this.Exchange = Exchange;
      this.exchangeStates = exchangeStates;
      this.messaging = messaging;
      this.navigation = navigation;
      this.$translate = $translate;
      this.$rootScope = $rootScope;
      this.$scope = $scope;
      this.$timeout = $timeout;
      this.wizardHostedCreationDomainConfiguration = wizardHostedCreationDomainConfiguration;
      this.wizardHostedCreationEmailCreation = wizardHostedCreationEmailCreation;
    }

    $onInit() {
      this.$routerParams = this.Exchange.getParams();
      this.$rootScope.$on('exchange.wizard.request.done', () => {
        this.retrievingEmailAccounts();
      });

      this.$scope.retrievingEmailAccounts = (count, offset) => this.retrievingEmailAccounts(
        count,
        offset,
      );
      this.$scope.getEmailAccounts = () => this.homepage.otherAccounts;
      this.$scope.getIsLoading = () => this.isLoading;

      return this.$timeout(() => this.retrievingEmailAccounts().finally(() => {
        this.scrollToBottom();
      }));
    }

    scrollToBottom() {
      this.$timeout(() => {
        document.getElementById('email-creation-main-container').scrollIntoView(false);
      });
    }

    scrollToTop() {
      this.$timeout(() => {
        document.getElementById('wizard-error-message').scrollIntoView(true);
      });
    }

    static getDisplayName(account) {
      return !_(account.displayName).isEmpty() ? account.displayName : account.login;
    }

    refreshTable() {
      if (!this.isLoading) {
        this.$rootScope.$broadcast('paginationServerSide.loadPage', 1);
      }
    }

    retrievingAvailableEmailAccounts() {
      return this.wizardHostedCreationEmailCreation
        .retrievingAvailableAccounts(this.$routerParams.organization, this.$routerParams.productId)
        .then((availableAccounts) => {
          this.homepage.availableAccounts = _(availableAccounts)
            .filter(account => this.exchangeStates.constructor.isOk(account))
            .value();
          this.homepage.numberOfAvailableAccounts = this.homepage.availableAccounts.length;
        })
        .catch((error) => {
          this.messaging.writeError(
            this.$translate.instant(
              'exchange_wizardHostedCreation_configureDNSZone_availableAccountsRetrieval_error',
            ),
            error,
          );
        });
    }

    retrievingEmailAccounts() {
      this.isLoading = true;

      return this.wizardHostedCreationEmailCreation
        .retrievingAccounts(this.$routerParams.organization, this.$routerParams.productId)
        .then(accounts => this.wizardHostedCreationEmailCreation.retrievingAccounts(
          this.$routerParams.organization,
          this.$routerParams.productId,
          this.homepage.domainName,
          accounts.count,
        ))
        .then((accounts) => {
          this.homepage.otherAccounts = accounts;
          return this.retrievingAvailableEmailAccounts();
        })
        .catch((error) => {
          this.messaging.writeError(
            this.$translate.instant(
              'exchange_wizardHostedCreation_configureDNSZone_availableAccountsRetrieval_error',
            ),
            error,
          );
        })
        .finally(() => {
          this.isLoading = false;
        });
    }

    updateEmailAccount(account) {
      this.navigation.setAction(
        'exchange/wizard-hosted-creation/first-step/email-creation/update/update',
        angular.copy(account),
      );
    }

    removeEmailAccount(account) {
      this.navigation.setAction(
        'exchange/wizard-hosted-creation/first-step/email-creation/delete/delete',
        angular.copy(account),
      );
    }

    thereAreOperationsPending() {
      if (!_(this.homepage.otherAccounts).isObject()) {
        return false;
      }

      const thereAreAccountsBeingDeleted = _(this.homepage.otherAccounts.list.results)
        .filter(account => this.exchangeStates.constructor.isDeleting(account))
        .value().length > 0;
      const thereIsNoRoomForMoreAccountCreation = this.homepage.numberOfAvailableAccounts === 0;

      return thereIsNoRoomForMoreAccountCreation && thereAreAccountsBeingDeleted;
    }

    atLeastOneEmailIsCustomized() {
      if (!_(this.homepage.otherAccounts).isObject()) {
        return false;
      }

      const atLeastOneEmailIsCustomized = _(this.homepage.otherAccounts.list.results)
        .filter(account => !this.exchangeStates.constructor.isDeleting(account))
        .value().length > 0;

      return atLeastOneEmailIsCustomized;
    }
  }

  angular
    .module('Module.exchange.components')
    .component('exchangeWizardHostedCreationEmailCreation', {
      templateUrl: 'exchange/wizard-hosted-creation/first-step/email-creation/email-creation.html',
      controller,
      require: {
        homepage: '^^exchangeWizardHostedCreation',
      },
    });
}
