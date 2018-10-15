angular.module('Module.exchange.controllers').controller(
  'ExchangeMailingListDelegationCtrl',
  class ExchangeMailingListDelegationCtrl {
    constructor($scope, Exchange, $timeout, messaging, navigation, $translate) {
      this.services = {
        $scope,
        Exchange,
        $timeout,
        messaging,
        navigation,
        $translate,
      };

      this.$routerParams = Exchange.getParams();

      this.selectedGroup = navigation.currentActionData;
      this.form = {
        search: null,
      };

      $scope.$on(Exchange.events.accountsChanged, () => $scope.$broadcast('paginationServerSide.reload', 'delegationTable'));

      this.debouncedGetDelegationRight = _.debounce(this.getDelegationRight, 300);

      $scope.getLoading = () => this.loading;
      $scope.getDelegationList = () => this.delegationList;
      $scope.updateDelegationRight = () => this.updateDelegationRight();
      $scope.getDelegationRight = (count, offset) => this.getDelegationRight(count, offset);
      $scope.hasChanged = () => this.hasChanged();
    }

    onSearchValueChange() {
      this.debouncedGetDelegationRight();
    }

    getChanges() {
      const changesList = {
        account: this.selectedGroup.mailingListName,
        sendRights: [],
        sendOnBehalfToRights: [],
      };

      if (_.has(this.delegationList, 'list.results')) {
        _.forEach(this.delegationList.list.results, (account) => {
          this.recordChangeOperations(account, changesList);
        });
      }

      return changesList;
    }

    resetSearch() {
      this.form.search = null;
      this.services.$scope.$broadcast('paginationServerSide.loadPage', 1, 'delegationTable');
    }

    /* eslint-disable class-methods-use-this */
    recordChangeOperations(account, changesList) {
      // record the operation to be done for sendAs rights:
      if (account.newSendAsValue !== account.sendAs) {
        changesList.sendRights.push({
          id: account.id,
          operation: account.newSendAsValue ? 'POST' : 'DELETE',
        });
      }

      // records the operation for sendOnBehalfTo rights:
      if (account.newSendOnBehalfToValue !== account.sendOnBehalfTo) {
        changesList.sendOnBehalfToRights.push({
          id: account.id,
          operation: account.newSendOnBehalfToValue ? 'POST' : 'DELETE',
        });
      }

      return changesList;
    }
    /* eslint-enable class-methods-use-this */

    hasChanged() {
      const changesList = this.getChanges();

      return changesList != null
        ? changesList.sendRights.length > 0 || changesList.sendOnBehalfToRights.length > 0
        : false;
    }

    getDelegationRight(count, offset) {
      this.services.messaging.resetMessages();
      this.loading = true;

      this.services.Exchange.getMailingListDelegationRights(
        this.$routerParams.organization,
        this.$routerParams.productId,
        this.selectedGroup.mailingListName,
        count,
        offset,
        this.form.search,
      )
        .then((accounts) => {
          // make a deep copy of accounts list to use it as model
          this.delegationList = angular.copy(accounts);

          if (_.has(this.delegationList, 'list.results')) {
            // keep the original value to have a reference to compare changes
            _.forEach(this.delegationList.list.results, (account) => {
              _.set(account, 'newSendAsValue', account.sendAs);
              _.set(account, 'newSendOnBehalfToValue', account.sendOnBehalfTo);
            });
          }
        })
        .catch((failure) => {
          this.services.messaging.writeError(
            this.services.$translate.instant('exchange_tab_GROUPS_error_message'),
            failure,
          );
        })
        .finally(() => {
          this.loading = false;
          this.services.$scope.$broadcast('paginationServerSide.loadPage', 1, 'delegationTable');
        });
    }

    updateDelegationRight() {
      this.services.messaging.writeSuccess(
        this.services.$translate.instant('exchange_GROUPS_delegation_doing_message'),
      );

      this.services.Exchange.updateMailingListDelegationRights(
        this.$routerParams.organization,
        this.$routerParams.productId,
        this.getChanges(),
      )
        .then((data) => {
          this.services.messaging.writeSuccess(
            this.services.$translate.instant('exchange_GROUPS_delegation_success_message'),
            data,
          );
        })
        .catch((failure) => {
          this.services.messaging.writeError(
            this.services.$translate.instant('exchange_GROUPS_delegation_error_message'),
            failure,
          );
        })
        .finally(() => {
          this.services.navigation.resetAction();
        });
    }
  },
);
