angular.module('Module.exchange.controllers').controller(
  'ExchangeOrderCtrl',
  class ExchangeOrderCtrl {
    constructor($scope, Products, Exchange, User) {
      this.services = {
        $scope,
        Products,
        Exchange,
        User,
      };

      this.loaders = {
        init: false,
      };

      User.getUrlOf('exchangeOrder').then((exchangeOrder) => {
        this.exchangeOrderUrl = exchangeOrder;
      });

      this.getExchanges();
    }

    getExchanges() {
      this.loaders.init = true;

      this.services.Products.getProductsByType()
        .then((productsByType) => {
          this.exchanges = _.map(productsByType.exchanges, (exchange) => {
            _.set(exchange, 'domain', exchange.name);

            return exchange;
          });

          if (_.isEmpty(this.exchanges)) {
            this.alreadyHasAnExchange = false;
          } else {
            this.alreadyHasAnExchange = true;
            this.firstExchangeAccount = _.first(this.exchanges);
          }
        })
        .finally(() => {
          this.loaders.init = false;
        });
    }

    getExchangeOrderUrl() {
      if (this.alreadyHasAnExchange && this.firstExchangeAccount != null) {
        return `#/configuration/${this.firstExchangeAccount.type.toLowerCase()}/${
          this.firstExchangeAccount.organization
        }/${this.firstExchangeAccount.name}?tab=ACCOUNT`;
      }
      return this.exchangeOrderUrl;
    }
  },
);
