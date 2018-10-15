angular.module('Module.exchange.controllers').controller(
  'ExchangeUpdateSharedAccountCtrl',
  class ExchangeUpdateSharedAccountCtrl {
    constructor(
      $scope,
      Exchange,
      ExchangeSharedAccounts,
      Alerter,
      navigation,
      messaging,
      $translate,
      formValidation,
    ) {
      this.services = {
        $scope,
        Exchange,
        ExchangeSharedAccounts,
        Alerter,
        navigation,
        messaging,
        $translate,
        formValidation,
      };

      this.$routerParams = Exchange.getParams();
      this.isLoading = false;
      this.errors = {
        emailIsAlreadyTaken: false,
        emailLocalPartIsEmpty: false,
        emailLocalPartDoesntRespectsPattern: false,
        quotaIsWrong: false,
      };

      this.accountBeingUpdated = {
        firstName: navigation.currentActionData.firstName,
        lastName: navigation.currentActionData.lastName,
        displayName: navigation.currentActionData.displayName,
        hiddenFromGAL: navigation.currentActionData.hiddenFromGAL,
        mailingFilter: ['vaderetro'],
        quota: navigation.currentActionData.quota.value,
        sharedEmailAddress: navigation.currentActionData.sharedEmailAddress,
      };

      this.localPart = navigation.currentActionData.login;
      this.domain = this.services.navigation.currentActionData.completeDomain;
      this.originalQuota = navigation.currentActionData.quota.value;
      this.originalSharedEmailAddress = navigation.currentActionData.sharedEmailAddress;

      $scope.updatingAccount = () => this.updatingAccount();
      $scope.isAccountValid = () => this.isAccountValid();
      $scope.loadingUpdateOptions = () => this.loadingUpdateOptions();
    }

    hasEmailAccountFieldErrors() {
      this.errors.emailLocalPartIsEmpty = this.services.formValidation.doesFieldContainsErrors(
        this.sharedAccountForm,
        'localPart',
        'required',
      );
      this.errors.emailLocalPartDoesntRespectsPattern = this.services.formValidation
        .doesFieldContainsErrors(
          this.sharedAccountForm,
          'localPart',
          'pattern',
        );

      return (
        this.errors.emailLocalPartIsEmpty
        || this.errors.emailLocalPartDoesntRespectsPattern
        || this.errors.emailIsAlreadyTaken
      );
    }

    hasQuotaFieldErrors() {
      const quotaIsntANumber = this.services.formValidation.doesFieldContainsErrors(
        this.sharedAccountForm,
        'quota',
        'number',
      );
      this.errors.quotaIsWrong = quotaIsntANumber
        || this.services.formValidation.doesFieldContainsErrors(
          this.sharedAccountForm,
          'quota',
          'min',
        )
        || this.services.formValidation.doesFieldContainsErrors(
          this.sharedAccountForm,
          'quota',
          'max',
        );

      return this.errors.quotaIsWrong;
    }

    buildDisplayName() {
      const firstName = this.accountBeingUpdated.firstName || '';
      const separator = this.accountBeingUpdated.firstName && this.accountBeingUpdated.lastName ? ' ' : '';
      const lastName = this.accountBeingUpdated.lastName || '';

      this.accountBeingUpdated.displayName = `${firstName}${separator}${lastName}`;
    }

    emailOnChange() {
      this.accountBeingUpdated.sharedEmailAddress = `${this.localPart}@${
        this.domain.name
      }`.toLowerCase();
      this.errors.emailIsAlreadyTaken = false;
      const matchingEmaiAddress = this.alreadyTakenEmails.find(
        alreadyTakenEmail => this.accountBeingUpdated.sharedEmailAddress.toUpperCase()
          === alreadyTakenEmail.toUpperCase(),
      );
      this.errors.emailIsAlreadyTaken = matchingEmaiAddress != null;
    }

    loadingUpdateOptions() {
      this.isLoading = true;

      return this.services.ExchangeSharedAccounts.retrievingNewSharedAccountOptions(
        this.$routerParams.organization,
        this.$routerParams.productId,
      )
        .then((data) => {
          this.optionsToUpdateAccount = data;
          this.alreadyTakenEmails = data.takenEmails;

          // Check if max quota is not under min quota or account quota + max quota
          const minQuota = _.get(this.optionsToUpdateAccount, 'minQuota.value', 0);
          const maxQuota = _.get(this.optionsToUpdateAccount, 'maxQuota.value', 0);
          const maxUpdateQuota = Math.max(minQuota, this.originalQuota + maxQuota);

          if (maxQuota < maxUpdateQuota) {
            this.optionsToUpdateAccount.maxQuota.value = maxUpdateQuota;
          }

          if (_.isEmpty(data.availableDomains)) {
            this.services.messaging.writeError(
              this.services.$translate.instant('exchange_ACTION_add_no_domains'),
            );
            this.services.navigation.resetAction();
          } else {
            _.forEach(data.availableDomains, (domain) => {
              if (this.domain.name === domain.name) {
                this.domain = domain;
              }
            });
          }
        })
        .catch((failure) => {
          this.services.navigation.resetAction();
          this.services.messaging.writeError(
            this.services.$translate.instant('exchange_ACTION_add_account_option_fail'),
            failure,
          );
        })
        .finally(() => {
          this.isLoading = true;
        });
    }

    isAccountValid() {
      return (
        this.sharedAccountForm != null
        && this.sharedAccountForm.$dirty
        && !_(this.errors)
          .values()
          .includes(true)
      );
    }

    updatingAccount() {
      return this.services.ExchangeSharedAccounts.updatingSharedAccount(
        this.$routerParams.organization,
        this.$routerParams.productId,
        this.originalSharedEmailAddress,
        this.accountBeingUpdated,
      )
        .then(() => {
          this.services.messaging.writeSuccess(
            this.services.$translate.instant('exchange_SHARED_ACCOUNTS_update_success_message'),
          );
        })
        .catch((failure) => {
          this.services.messaging.writeError(
            this.services.$translate.instant('exchange_ACTION_add_account_error_message'),
            failure,
          );
        })
        .finally(() => {
          this.services.navigation.resetAction();
        });
    }
  },
);
