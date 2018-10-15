angular.module('Module.exchange.controllers').controller(
  'ExchangeGroupAccountsCtrl',
  class ExchangeGroupAccountsCtrl {
    constructor($scope, Exchange, messaging, navigation, $translate) {
      this.services = {
        $scope,
        Exchange,
        messaging,
        navigation,
        $translate,
      };

      this.$routerParams = Exchange.getParams();

      this.timeout = null;
      this.selectedGroup = navigation.currentActionData;

      this.search = {
        value: null,
      };

      this.model = {
        displayName: this.selectedGroup.displayName,
        senderAuthentification: this.selectedGroup.senderAuthentification,
        hiddenFromGAL: this.selectedGroup.hiddenFromGAL,
        joinRestriction: this.selectedGroup.joinRestriction,
        departRestriction: this.selectedGroup.departRestriction,
        managersList: [],
        membersList: [],
      };

      $scope.getAccounts = (count, offset) => this.getAccounts(count, offset);
      $scope.updateAccounts = () => this.updateAccounts();
      $scope.getAccountsList = () => this.accountsList;
      $scope.getLoading = () => this.loading;
    }

    resetSearch() {
      this.search.value = null;
      this.services.$scope.$broadcast('paginationServerSide.loadPage', 1, 'accountsByGroupTable');
    }

    onSearch() {
      this.services.$scope.$broadcast('paginationServerSide.loadPage', 1, 'accountsByGroupTable');
    }

    saveSelection() {
      this.model.managersList = [];
      this.model.membersList = [];

      if (_.has(this.accountsList, 'list.results')) {
        const accounts = this.accountsList.list.results;

        _.forEach(accounts, (account) => {
          const bufferedAccount = _.find(
            this.accountsListBuffer.list.results,
            bufferedAcc => bufferedAcc.id === account.id,
          );
          let bufferedAccountUserType = _.get(bufferedAccount, 'manager');

          if (account.manager !== bufferedAccountUserType) {
            this.model.managersList.push({
              id: account.id,
              operation: account.manager ? 'POST' : 'DELETE',
              itemType: account.type,
            });
          }

          bufferedAccountUserType = _.get(bufferedAccount, 'member');

          if (account.member !== bufferedAccountUserType) {
            this.model.membersList.push({
              id: account.id,
              operation: account.member ? 'POST' : 'DELETE',
              itemType: account.type,
            });
          }
        });
      }
    }

    getAccounts(count, offset) {
      this.services.messaging.resetMessages();
      this.loading = true;

      this.services.Exchange.getAccountsByGroup(
        this.$routerParams.organization,
        this.$routerParams.productId,
        this.selectedGroup.mailingListAddress,
        count,
        offset,
        this.search != null ? this.search.value : '',
      )
        .then((accounts) => {
          this.accountsListBuffer = accounts;
          this.accountsList = angular.copy(accounts);
        })
        .catch((failure) => {
          this.services.messaging.writeError(
            this.services.$translate.instant('exchange_tab_ACCOUNTS_error_message'),
            failure,
          );
        })
        .finally(() => {
          this.loading = false;
          this.services.$scope.$broadcast(
            'paginationServerSide.loadPage',
            1,
            'accountsByGroupTable',
          );
        });
    }

    updateAccounts() {
      this.services.messaging.writeSuccess(
        this.services.$translate.instant('exchange_dashboard_action_doing'),
      );
      this.saveSelection();

      this.services.Exchange.updateGroups(
        this.$routerParams.organization,
        this.$routerParams.productId,
        this.selectedGroup.mailingListAddress,
        this.model,
      )
        .then((data) => {
          const addGroupMessages = {
            OK: this.services.$translate.instant('exchange_GROUPS_settings_success_message', {
              t0: this.selectedGroup.mailingListDisplayName,
            }),
            PARTIAL: this.services.$translate.instant('exchange_GROUPS_settings_partial_message', {
              t0: this.selectedGroup.mailingListDisplayName,
            }),
            ERROR: this.services.$translate.instant('exchange_GROUPS_settings_error_message', {
              t0: this.selectedGroup.mailingListDisplayName,
            }),
          };

          if (data == null) {
            this.services.messaging.writeSuccess(
              this.services.$translate.instant('exchange_GROUPS_settings_success_message', {
                t0: this.selectedGroup.mailingListDisplayName,
              }),
            );
          } else {
            this.services.messaging.setMessage(addGroupMessages, data);
          }
        })
        .catch((failure) => {
          this.services.messaging.writeError(
            this.services.$translate.instant('exchange_GROUPS_settings_error_message', {
              t0: this.selectedGroup.mailingListDisplayName,
            }),
            failure,
          );
        })
        .finally(() => {
          this.services.navigation.resetAction();
        });
    }
  },
);
