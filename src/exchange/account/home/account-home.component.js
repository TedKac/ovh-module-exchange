{
  class ExchangeAccountHomeController {
    constructor(
      $filter,
      $scope,
      Exchange,
      exchangeAccount,
      exchangeAccountTypes,
      exchangeAccountOutlook,
      exchangeSelectedService,
      exchangeStates,
      messaging,
      navigation,
      officeAttach,
      $translate,
    ) {
      this.$filter = $filter;
      this.$scope = $scope;

      this.Exchange = Exchange;
      this.exchangeAccount = exchangeAccount;
      this.exchangeAccountTypes = exchangeAccountTypes;
      this.exchangeAccountOutlook = exchangeAccountOutlook;
      this.exchangeSelectedService = exchangeSelectedService;
      this.exchangeStates = exchangeStates;
      this.messaging = messaging;
      this.navigation = navigation;
      this.officeAttach = officeAttach;
      this.$translate = $translate;
    }

    $onInit() {
      this.$routerParams = this.Exchange.getParams();
      this.hostname = this.Exchange.value.hostname;

      this.datagridParameters = {};
      this.linkToSpamTicket = `#/ticket?serviceName=${this.$routerParams.productId}`;
      this.initialAccountRetrieval = true;
      this.atLeastOneDomainIsAssociatedToCurrentExchangeService = true;

      this.accountTypeOptions = {
        operators: ['is'],
      };

      this.buildAccountTypeColumnOptions();

      this.$scope.$on(this.Exchange.events.accountsChanged, () => this.refreshList());

      return this.fetchInitialData();
    }

    buildAccountTypeColumnOptions() {
      this.accountTypeColumnOptions = {
        values: {
          STANDARD: this.exchangeAccountTypes.getDisplayValue(
            this.exchangeAccountTypes.TYPES.STANDARD,
          ),
        },
      };

      if (this.exchangeAccountTypes.CAN_DO.BASIC()) {
        this.accountTypeColumnOptions.values.BASIC = this.exchangeAccountTypes.getDisplayValue(
          this.exchangeAccountTypes.TYPES.BASIC,
        );
      }

      if (this.exchangeAccountTypes.CAN_DO.ENTERPRISE()) {
        this.accountTypeColumnOptions.values.ENTERPRISE = this.exchangeAccountTypes.getDisplayValue(
          this.exchangeAccountTypes.TYPES.ENTERPRISE,
        );
      }
    }

    fetchInitialData() {
      this.initialLoading = true;

      this.fetchCanUserSubscribeToOfficeAttach()
        .then(() => this.fetchAccountCreationOptions())
        .finally(() => {
          this.initialLoading = false;
        });
    }

    fetchCanUserSubscribeToOfficeAttach() {
      return this.officeAttach
        .retrievingIfUserAlreadyHasSubscribed(this.$routerParams.productId)
        .then((userHasAlreadySubscribed) => {
          this.userCanSubscribeToOfficeAttach = !userHasAlreadySubscribed;
        })
        .catch((error) => {
          this.messaging.writeError(
            this.$translate.instant('exchange_accounts_fetchOfficeAttachError_error'),
            error,
          );
        });
    }

    fetchAccountCreationOptions() {
      return this.Exchange.fetchingAccountCreationOptions(
        this.$routerParams.organization,
        this.$routerParams.productId,
      )
        .then((accountCreationOptions) => {
          this.atLeastOneDomainIsAssociatedToCurrentExchangeService = !_(accountCreationOptions)
            .chain()
            .get('availableDomains')
            .isEmpty()
            .value();
        })
        .catch((error) => {
          this.messaging.writeError(
            this.$translate.instant('exchange_accounts_fetchAccountCreationOptions_error'),
            error,
          );
        });
    }

    refreshList() {
      return this.Exchange.fetchAccounts(
        this.$routerParams.organization,
        this.$routerParams.productId,
        this.datagridParameters.pageSize,
        this.datagridParameters.offset - 1,
        this.datagridParameters.searchValues,
        this.datagridParameters.accountTypeFilter,
      )
        .then((accounts) => {
          const formattedAccounts = this.formatAccountsForDatagrid(
            accounts,
            this.datagridParameters.sort,
          );

          for (let i = 0; i < formattedAccounts.length; i += 1) {
            this.accounts.splice(i, 1, formattedAccounts[i]);
          }

          for (let i = formattedAccounts.length; i < this.accounts.length; i += 1) {
            this.accounts.splice(i, 1);
          }
        })
        .catch((error) => {
          this.messaging.writeError(
            this.$translate.instant('exchange_accounts_fetchAccounts_error'),
            error,
          );
        });
    }

    fetchAccounts(parameters) {
      this.datagridParameters = parameters;

      this.datagridParameters.searchValues = _(parameters.criteria)
        .filter(
          criterium => _(criterium.property).isNull() || criterium.property === 'emailAddress',
        )
        .map(criterium => criterium.value)
        .value();

      const accountTypeFilters = _(parameters.criteria)
        .filter(criterium => criterium.property === 'accountLicense')
        .map(criterium => criterium.value)
        .value();

      this.datagridParameters.accountTypeFilter = accountTypeFilters.length === 2 ? '' : accountTypeFilters[0];

      return this.Exchange.fetchAccounts(
        this.$routerParams.organization,
        this.$routerParams.productId,
        parameters.pageSize,
        parameters.offset - 1,
        this.datagridParameters.searchValues,
        this.datagridParameters.accountTypeFilter,
      )
        .then((accounts) => {
          this.accounts = this.formatAccountsForDatagrid(accounts, parameters.sort);

          return {
            data: this.accounts,
            meta: {
              totalCount: accounts.count,
            },
          };
        })
        .catch((error) => {
          this.messaging.writeError(
            this.$translate.instant('exchange_accounts_fetchAccounts_error'),
            error,
          );
        })
        .finally(() => {
          this.initialAccountRetrieval = false;
        });
    }

    formatAccountsForDatagrid(accounts, sortingOptions) {
      function unpunycodeEmailAddress(emailAddress) {
        const parts = emailAddress.split('@');
        const unpunycodedLocalPart = punycode.toUnicode(parts[0]);

        return `${unpunycodedLocalPart}@${parts[1]}`;
      }

      function transformSizeData(account) {
        return {
          usage: Math.round(((account.currentUsage / Math.pow(1024, 2)) * 100) / account.quota), // eslint-disable-line
          progressionText: `${account.usedQuota.value} ${this.$translate.instant(
            `unit_size_${account.usedQuota.unit}`,
          )} / ${account.totalQuota.value} ${this.$translate.instant(
            `unit_size_${account.totalQuota.unit}`,
          )}`,
        };
      }

      function transformOutlookStatus(account) {
        const accountOutlookStatus = this.exchangeAccountOutlook.getStatus(account);

        if (
          !this.exchangeAccountOutlook.canHaveLicense(account)
          || this.exchangeAccountOutlook.hasStatus(
            account,
            this.exchangeAccountOutlook.STATES.CANT_ORDER_OR_ACTIVATE_LICENSE,
          )
        ) {
          return {
            state: '',
            displayValue: '',
          };
        }

        return {
          status, // eslint-disable-line
          displayValue: this.$translate.instant(
            `exchange_tab_accounts_table_outlook_${accountOutlookStatus}`,
          ),
        };
      }

      function chooseStatusText(account) {
        if (this.exchangeStates.constructor.isDeleting(account)) {
          return this.exchangeAccount.CAN_DO.DESTRUCTION_METHOD.DELETING()
            ? this.$translate.instant('exchange_tab_ACCOUNTS_state_DELETING')
            : this.$translate.instant('exchange_tab_ACCOUNTS_state_RESETTING');
        }

        if (account.spamDetected) {
          return this.$translate.instant('exchange_tab_ACCOUNTS_state_BLOCKED');
        }

        if (this.exchangeAccount.isPlaceholder(account)) {
          return this.$translate.instant('exchange_tab_ACCOUNTS_state_TO_CONFIGURE');
        }

        if (this.exchangeStates.isValidState(account.state)) {
          return this.$translate.instant(
            `exchange_tab_ACCOUNTS_state_${_(account.state)
              .snakeCase()
              .toUpperCase()}`,
          );
        }

        if (_(account.taskPendingId).isNumber() && account.taskPendingId !== 0) {
          return this.$translate.instant('exchange_tab_ACCOUNTS_state_TASK_ON_DOING');
        }

        return this.$translate.instant('exchange_tab_ACCOUNTS_state_UNKNOWN');
      }

      let formattedAccounts = _(accounts)
        .get('list.results', [])
        .map(account => _(account)
          .assign({
            emailAddress: unpunycodeEmailAddress(account.primaryEmailDisplayName),
            size: transformSizeData.call(this, account),
            numberOfAliases: account.aliases,
            outlookStatus: transformOutlookStatus.call(this, account),
            status: chooseStatusText.call(this, account),
          })
          .value());

      formattedAccounts = this.$filter('orderBy')(
        formattedAccounts,
        sortingOptions.property,
        sortingOptions.dir < 0,
      );

      return formattedAccounts;
    }

    displayAliasManagementView(account) {
      this.messaging.resetMessages();
      this.$scope.$emit(this.exchangeAccount.EVENTS.CHANGE_STATE, {
        stateName: 'alias',
        args: { account: _(account).clone() },
      });
    }

    displayDialog(pathToFeature, account) {
      this.navigation.setAction(pathToFeature, _(account).clone());
    }

    displayAccountAddingView() {
      this.messaging.resetMessages();
      this.$scope.$emit(this.exchangeAccount.EVENTS.CHANGE_STATE, { stateName: 'add' });
    }

    openAccountOrderingDialog() {
      const placeholderAccountAmount = _(this.accounts)
        .sum(account => this.exchangeAccount.isPlaceholder(account));
      this.navigation.setAction('exchange/account/order/account-order', {
        placeholderAccountAmount,
      });
    }
  }

  angular.module('Module.exchange.components').component('exchangeAccountHome', {
    templateUrl: 'exchange/account/home/account-home.html',
    controller: ExchangeAccountHomeController,
  });
}
