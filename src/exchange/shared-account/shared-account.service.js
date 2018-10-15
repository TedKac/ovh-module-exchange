angular.module('Module.exchange.services').service(
  'ExchangeSharedAccounts',
  class ExchangeSharedAccounts {
    constructor(Exchange, OvhHttp) {
      this.services = {
        Exchange,
        OvhHttp,
      };
    }

    retrievingSharedAccounts(organization, exchange, count = 10, offset = 0, search = '') {
      return this.services.OvhHttp.get(`/sws/exchange/${organization}/${exchange}/sharedAccounts`, {
        rootPath: '2api',
        params: {
          count,
          offset,
          search,
        },
      });
    }

    retrievingNewSharedAccountOptions(organization, exchange) {
      return this.services.OvhHttp.get(
        `/sws/exchange/${organization}/${exchange}/sharedAccounts/options`,
        {
          rootPath: '2api',
        },
      );
    }

    addingSharedAccount(organization, exchange, data) {
      return this.services.OvhHttp.post(
        `/email/exchange/${organization}/service/${exchange}/sharedAccount`,
        {
          rootPath: 'apiv6',
          data,
        },
      ).then((response) => {
        this.services.Exchange.resetSharedAccounts();
        this.services.Exchange.resetTasks();

        return response;
      });
    }

    updatingSharedAccount(organization, exchange, sharedEmailAddress, data) {
      return this.services.OvhHttp.put(
        `/email/exchange/${organization}/service/${exchange}/sharedAccount/${sharedEmailAddress}`,
        {
          rootPath: 'apiv6',
          data,
        },
      ).then((response) => {
        this.services.Exchange.resetSharedAccounts();
        this.services.Exchange.resetTasks();

        return response;
      });
    }

    deletingSharedAccount(organization, exchange, sharedEmailAddress) {
      return this.services.OvhHttp.delete(
        `/email/exchange/${organization}/service/${exchange}/sharedAccount/${sharedEmailAddress}`,
        {
          rootPath: 'apiv6',
        },
      ).then((response) => {
        this.services.Exchange.resetSharedAccounts();
        this.services.Exchange.resetTasks();

        return response;
      });
    }

    retrievingSharedAccountDelegations(
      organization,
      exchange,
      account,
      count = 10,
      offset = 0,
      search = '',
    ) {
      return this.services.OvhHttp.get(
        `/sws/exchange/${organization}/${exchange}/sharedAccounts/${account}/delegations`,
        {
          rootPath: '2api',
          params: {
            count,
            offset,
            search,
          },
        },
      );
    }

    updatingSharedAccountDelegations(organization, exchange, model) {
      return this.services.OvhHttp.put(
        `/sws/exchange/${organization}/${exchange}/sharedAccounts/${
          model.primaryEmail
        }/delegations-update`,
        {
          rootPath: '2api',
          data: {
            sendRights: model.sendRights,
            fullAccessRights: model.fullAccessRights,
            sendOnBehalfRights: model.sendOnBehalfToRights,
          },
        },
      ).then((response) => {
        this.services.Exchange.resetSharedAccounts();
        this.services.Exchange.resetTasks();

        return response;
      });
    }

    retrievingQuota(organization, exchange) {
      return this.services.OvhHttp.get(
        `/email/exchange/${organization}/service/${exchange}/sharedAccountQuota`,
        {
          rootPath: 'apiv6',
        },
      );
    }
  },
);
