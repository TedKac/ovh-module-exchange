/**
 * Renew Exchange service action
 */
angular.module('Module.exchange.controllers').controller(
  'ExchangeUpdateRenewCtrl',
  class ExchangeUpdateRenewCtrl {
    constructor(
      $scope,
      Exchange,
      $location,
      navigation,
      $translate,
      messaging,
      exchangeServiceInfrastructure,
      exchangeVersion,
    ) {
      this.services = {
        $scope,
        Exchange,
        $location,
        navigation,
        $translate,
        messaging,
        exchangeServiceInfrastructure,
        exchangeVersion,
      };

      this.$routerParams = Exchange.getParams();

      this.exchange = Exchange.value;
      this.search = {
        value: null,
      };
      this.buffer = {
        hasChanged: false,
        changes: [],
        selectedMonthly: [],
        selectedYearly: [],
        selectedDeleteAtExpiration: [],
        ids: [],
      };

      this.periods = ['YEARLY', 'MONTHLY', 'DELETE_AT_EXPIRATION'];

      this.model = {
        displayDeleteWarning: false,
      };

      this.debouncedRetrieveAccounts = _.debounce(this.setFilter, 300);

      $scope.submit = () => this.submit();
      $scope.hasChanged = () => this.buffer.hasChanged;
      $scope.getBufferedAccounts = () => this.bufferedAccounts;
      $scope.getLoading = () => this.loading;
      $scope.retrieveAccounts = (count, offset) => this.retrieveAccounts(count, offset);
    }

    setFilter() {
      this.services.$scope.$broadcast('paginationServerSide.loadPage', 1, 'accountsTable');
    }

    onSearchValueChange() {
      this.debouncedRetrieveAccounts();
    }

    resetSearch() {
      this.search.value = null;
      this.services.$scope.$broadcast('paginationServerSide.loadPage', 1, 'accountsTable');
    }

    checkForChanges() {
      if (this.buffer.changes == null) {
        this.buffer.changes = [];
      }

      this.model.displayDeleteWarning = false;

      if (
        _(this.bufferedAccounts).has('list.results')
        && this.bufferedAccounts.list.results != null
      ) {
        _.forEach(this.bufferedAccounts.list.results, (bufferedAccount) => {
          const currentAccount = _(this.accounts.list.results).find({
            primaryEmailAddress: bufferedAccount.primaryEmailAddress,
          });

          if (currentAccount.renewPeriod !== bufferedAccount.renewPeriod) {
            this.bufferChanges(bufferedAccount);

            if (bufferedAccount.renewPeriod === 'DELETE_AT_EXPIRATION') {
              this.model.displayDeleteWarning = true;
            }
          } else {
            this.buffer.changes = this.buffer.changes.filter(
              change => change.primaryEmailAddress !== currentAccount.primaryEmailAddress,
            );
          }
        });
      }

      this.buffer.hasChanged = !_.isEmpty(this.buffer.changes);
    }

    bufferChanges(account) {
      if (this.buffer.changes == null) {
        this.buffer.changes = [];
      }

      const accountInChange = _(this.buffer.changes).find({
        primaryEmailAddress: account.primaryEmailAddress,
      });

      if (accountInChange == null) {
        this.buffer.changes.push({
          primaryEmailAddress: account.primaryEmailAddress,
          primaryEmailDisplayName: account.primaryEmailDisplayName,
          renewPeriod: account.renewPeriod,
          exchangeOffer: this.exchange.offer,
        });
      } else {
        accountInChange.renewPeriod = account.renewPeriod;
      }
    }

    retrieveAccounts(count, offset) {
      this.services.messaging.resetMessages();
      this.loading = true;

      this.services.Exchange.getAccounts(count, offset, this.search.value)
        .then((accounts) => {
          this.accounts = accounts;
          this.bufferedAccounts = _.cloneDeep(accounts);
          this.buffer.selectedMonthly = [];
          this.buffer.selectedYearly = [];
          this.buffer.selectedDeleteAtExpiration = [];

          if (
            _(this.bufferedAccounts).has('list.results')
            && this.bufferedAccounts.list.results != null
          ) {
            this.buffer.ids = this.bufferedAccounts.list.results.map(
              item => item.primaryEmailAddress,
            );

            // roll previous buffered changes
            if (this.buffer.hasChanged) {
              _.forEach(this.bufferedAccounts.list.results, (currentBufferedAccount) => {
                const buffer = _(this.buffer.changes).find({
                  primaryEmailAddress: currentBufferedAccount.primaryEmailAddress,
                });

                if (buffer != null) {
                  _.set(currentBufferedAccount, 'renewPeriod', buffer.renewPeriod);
                }
              });
            }

            // needed by selectAll checkbox
            _.forEach(this.bufferedAccounts.list.results, (account) => {
              this.trackSelected(account.primaryEmailAddress, account.renewPeriod);
            });
          }
        })
        .catch((failure) => {
          this.services.messaging.writeError(
            this.services.$translate.instant('exchange_tab_ACCOUNTS_error_message'),
            failure,
          );
          this.services.navigation.resetAction();
        })
        .finally(() => {
          this.loading = false;
        });
    }

    /**
     * Mark alltems on the page as selected with 'value'.
     * @param value
     */
    checkboxStateChange(value) {
      if (_.has(this.buffer, 'ids') && this.buffer.ids != null) {
        _.forEach(this.buffer.ids, (id) => {
          this.trackSelected(id, value);
        });
      }
    }

    trackSelected(primaryEmailAddress, period) {
      const matchingAccount = _(this.bufferedAccounts.list.results).find({
        primaryEmailAddress,
      });

      const matchingProperty = ExchangeUpdateRenewCtrl.GetPropertyNameFromPeriodName(period);

      if (matchingAccount != null) {
        matchingAccount.renewPeriod = period;

        if (!_(this.buffer[matchingProperty]).includes(matchingAccount.primaryEmailAddress)) {
          this.buffer[matchingProperty].push(matchingAccount.primaryEmailAddress);
        }

        const otherPeriods = this.periods.filter(currentPeriod => currentPeriod !== period);

        _.forEach(otherPeriods, (otherPeriod) => {
          const matchingOtherProperty = ExchangeUpdateRenewCtrl.GetPropertyNameFromPeriodName(
            otherPeriod,
          );
          this.buffer[matchingOtherProperty] = this.buffer[matchingOtherProperty].filter(
            bufferedAccount => bufferedAccount !== matchingAccount.primaryEmailAddress,
          );
        });

        this.checkForChanges();
      }
    }

    static GetPropertyNameFromPeriodName(period) {
      const capitalizedPeriod = _.capitalize(_.camelCase(period));
      const matchingProperty = _.camelCase(`selected${capitalizedPeriod}`);

      return matchingProperty;
    }

    submit() {
      this.services.$location.search('action', null);
      this.services.messaging.writeSuccess(
        this.services.$translate.instant('exchange_dashboard_action_doing'),
      );

      if (_.has(this.buffer, 'changes') && this.buffer.changes != null) {
        _.forEach(this.buffer.changes, (change) => {
          _.set(change, 'is25g', this.services.exchangeServiceInfrastructure.is25g());
        });
      }

      this.services.Exchange.updateRenew(
        this.$routerParams.organization,
        this.$routerParams.productId,
        this.buffer.changes,
      )
        .then((data) => {
          const updateRenewMessages = {
            OK: this.services.$translate.instant('exchange_update_billing_periode_success'),
            PARTIAL: this.services.$translate.instant('exchange_update_billing_periode_partial'),
            ERROR: this.services.$translate.instant('exchange_update_billing_periode_failure'),
          };

          this.services.messaging.setMessage(updateRenewMessages, data);
        })
        .catch((failure) => {
          this.services.messaging.writeError(
            this.services.$translate.instant('exchange_update_billing_periode_failure'),
            failure,
          );
        })
        .finally(() => {
          this.services.navigation.resetAction();
        });
    }
  },
);
