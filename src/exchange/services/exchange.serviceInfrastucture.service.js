angular.module('Module.exchange.services').service(
  'exchangeServiceInfrastructure',
  class ExchangeServiceInfrastructure {
    constructor(Exchange, exchangeVersion) {
      this.Exchange = Exchange;
      this.exchangeVersion = exchangeVersion;

      this.INFRASTRUCTURES = {
        HOSTED: 'Hosted',
        PROVIDER: 'Provider',
        DEDICATED: 'Dedicated',
        DEDICATED_CLUSTER: 'DedicatedCluster',
      };
    }

    isType(infrastructure) {
      if (_(`${infrastructure}`).isEmpty()) {
        throw new Error("Can't work with empty input");
      }

      return (
        _(this.Exchange)
          .chain()
          .get('value.offer', '')
          .camelCase()
          .value()
          .toUpperCase()
        === _(`${infrastructure}`)
          .camelCase()
          .toUpperCase()
      );
    }

    is(infrastructure) {
      return this.isType(infrastructure);
    }

    isDedicated() {
      return this.is(this.INFRASTRUCTURES.DEDICATED);
    }

    isDedicatedCluster() {
      return this.is(this.INFRASTRUCTURES.DEDICATED_CLUSTER);
    }

    isHosted() {
      return this.is(this.INFRASTRUCTURES.HOSTED);
    }

    isProvider() {
      return this.is(this.INFRASTRUCTURES.PROVIDER);
    }

    is25g() {
      return this.isProvider() && this.exchangeVersion.isIndividual2010();
    }
  },
);
