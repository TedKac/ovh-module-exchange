angular.module('Module.exchange.controllers').controller(
  'exchangeWizardHostedCreationAutoController',
  class ExchangeWizardHostedCreationAutoController {
    constructor(Exchange, navigation, $scope, $translate) {
      this.Exchange = Exchange;
      this.navigation = navigation;
      this.$scope = $scope;
      this.$translate = $translate;
    }

    $onInit() {
      this.hostname = this.Exchange.value.hostname;
      this.domainName = this.navigation.currentActionData.domainName;

      this.$scope.hideCancelButton = () => true;
    }
  },
);
