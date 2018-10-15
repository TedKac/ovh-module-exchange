angular.module('Module.exchange.controllers').controller(
  'ExchangeCtrl',
  class ExchangeCtrl {
    constructor(
      exchangeServiceInfrastructure,
      $rootScope,
      $scope,
      $timeout,
      $location,
      Products,
      $translate,
      Exchange,
      APIExchange,
      User,
      EXCHANGE_CONFIG,
      navigation,
      ovhUserPref,
      messaging,
      exchangeVersion,
      officeAttach,
    ) {
      this.services = {
        exchangeServiceInfrastructure,
        $rootScope,
        $scope,
        $timeout,
        $location,
        Products,
        $translate,
        Exchange,
        APIExchange,
        User,
        EXCHANGE_CONFIG,
        navigation,
        ovhUserPref,
        messaging,
        exchangeVersion,
        officeAttach,
      };

      this.worldPart = this.services.$rootScope.worldPart;

      this.$routerParams = Exchange.getParams();

      _.set(navigation, '$exchangeRootScope', $scope);
      _.set(messaging, '$exchangeRootScope', $scope);

      $scope.resetAction = navigation.resetAction.bind(navigation);
      $scope.setAction = navigation.setAction.bind(navigation);
      $scope.resetMessages = messaging.resetMessages.bind(messaging);
      $scope.setMessage = messaging.setMessage.bind(messaging);

      this.isLoading = true;
      this.hasNoDomain = false;
      this.loadingExchangeError = false;

      this.currentAction = null;
      this.currentActionData = null;
      this.displayGuides = null;
      this.displayName = null;

      $scope.$on('exchange.dashboard.refresh', () => {
        this.retrievingExchange();
      });

      $scope.$on('$locationChangeStart', () => {
        this.services.navigation.resetAction();
      });

      $scope.$on('exchange.wizard_hosted_creation.display', () => {
        this.shouldOpenWizard = this.services.exchangeServiceInfrastructure.isHosted();
        this.hasNoDomain = true;
      });

      $scope.$on('exchange.wizard_hosted_creation.hide', () => {
        this.shouldOpenWizard = false;
        this.hasNoDomain = false;
      });

      if ($location.search().action === 'billing') {
        $timeout(() => {
          $rootScope.$broadcast(
            'leftNavigation.selectProduct.fromName',
            this.parseLocationForExchangeData(),
          );
          $scope.setAction(
            'exchange/header/update-renew/update-renew',
            this.parseLocationForExchangeData(),
          );
          this.retrievingExchange();
        }, 2000);
      } else {
        this.retrievingExchange();
      }
    }

    $onInit() {
      this.services.$scope.resetMessages();
    }

    submittingDisplayName() {
      return this.services.APIExchange.put('/{organizationName}/service/{exchangeService}', {
        urlParams: {
          organizationName: this.exchange.organization,
          exchangeService: this.exchange.domain,
        },
        data: {
          displayName: this.displayName,
        },
      })
        .then(() => {
          this.exchange.displayName = this.displayName;
          this.services.$rootScope.$broadcast('change.displayName', [
            this.exchange.domain,
            this.displayName,
          ]);
          this.services.messaging.writeSuccess(
            this.services.$translate.instant('exchange_ACTION_configure_success'),
          );
        })
        .catch((reason) => {
          this.services.messaging.writeError(
            this.services.$translate.instant('exchange_ACTION_configure_error'),
            reason,
          );
        })
        .finally(() => {
          this.editMode = false;
        });
    }

    retrievingWizardPreference() {
      this.isLoading = true;
      this.shouldOpenWizard = this.services.exchangeServiceInfrastructure.isHosted();

      if (!this.shouldOpenWizard) {
        return false;
      }

      return this.services.Exchange.retrievingWizardPreference()
        .then((preference) => {
          this.shouldOpenWizard = _.get(preference, 'shouldOpenWizard', false);
        })
        .catch(() => {
          this.shouldOpenWizard = true;
        })
        .then(() => this.services.User.getUser().then((currentUser) => {
          const { ovhSubsidiary } = currentUser;

          this.shouldOpenWizard = this.shouldOpenWizard && ovhSubsidiary !== 'CA';
        }))
        .then(() => {
          if (this.shouldOpenWizard) {
            return this.services.ovhUserPref
              .getValue('WIZARD_HOSTED_CREATION_CHECKPOINT')
              .catch(() => null)
              .then((preferences) => {
                const preferenceToSave = !_(preferences).isObject() || _(preferences).isEmpty()
                  ? {}
                  : preferences;

                const hasNoDomain = this.exchange.domainsNumber === 0;
                const isReturningToWizard = !_(
                  preferenceToSave[this.$routerParams.organization],
                ).isEmpty();

                this.hasNoDomain = hasNoDomain || (!hasNoDomain && isReturningToWizard);
              });
          }

          return null;
        })
        .finally(() => {
          this.isLoading = false;
        });
    }

    retrievingExchange() {
      this.isLoading = true;

      return this.services.Exchange.getSelected(true)
        .then((exchange) => {
          this.services.Exchange.value = exchange;
          this.exchange = exchange;
          this.displayName = exchange.displayName;
        })
        .then(() => this.canActivateSharepoint())
        .then(() => this.services.officeAttach
          .retrievingIfUserAlreadyHasSubscribed(this.exchange.domain))
        .then((userHasAlreadySubscribedToOfficeAttach) => {
          this.canUserSubscribeToOfficeAttach = !userHasAlreadySubscribedToOfficeAttach;

          if (!_.isEmpty(this.exchange.messages)) {
            this.services.messaging.writeError(
              this.services.$translate.instant('exchange_dashboard_loading_error'),
              this.exchange,
            );
          }
        })
        .then(() => this.services.Exchange.updateValue())
        .then(() => this.retrievingWizardPreference())
        .catch((failure) => {
          if (failure) {
            const response = failure.data || failure;
            const data = {
              status: 'ERROR',
              messages: [
                {
                  type: 'ERROR',
                  message: response.message,
                  id: response.id,
                },
              ],
            };

            if (response.code === 460 || response.status === 460) {
              this.services.messaging.writeError(
                this.services.$translate.instant('common_service_expired', { t0: response.id }),
                data,
              );
            } else {
              this.services.messaging.writeError(
                this.services.$translate.instant('exchange_dashboard_loading_error'),
                data,
              );
            }
          } else {
            this.loadingExchangeError = true;
          }
        })
        .finally(() => {
          this.isLoading = false;
        });
    }

    canActivateSharepoint() {
      return this.services.Exchange.getSharepointService()
        .then((sharepoint) => {
          this.sharepoint = sharepoint;
          const isAlreadyActivated = sharepoint != null;
          const isSupportedExchangeType = this.services.exchangeServiceInfrastructure.isHosted();

          this.canSubscribeToSharepoint = !isAlreadyActivated && isSupportedExchangeType && this.worldPart === 'EU';
        })
        .catch(() => {
          this.canSubscribeToSharepoint = this.services.exchangeServiceInfrastructure.isHosted() && this.worldPart === 'EU';
        });
    }

    parseLocationForExchangeData() {
      // expect something like
      // /configuration/exchange_dedicated/organization-ID/exchange-ID?action=billing&tab=DOMAINS"
      // extract "exchange_dedicated"
      const locationSplit = this.services.$location
        .url()
        .replace('/configuration/', '')
        .split('/');
      const type = locationSplit[0].toUpperCase();

      return {
        name: this.$routerParams.productId,
        organization: this.$routerParams.organization,
        type,
      };
    }

    editDisplayName() {
      this.displayName = this.exchange.displayName;
      this.editMode = true;
    }

    resetDisplayName() {
      this.editMode = false;

      if (this.formExchangeDisplayName.displayNameField.$invalid) {
        this.services.messaging.writeError(
          this.services.$translate.instant('exchange_dashboard_display_name_min'),
        );
      }
    }
  },
);
