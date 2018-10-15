{
  const PREFERENCE_CHECKPOINT = 'WIZARD_HOSTED_CREATION_CHECKPOINT';

  class controller {
    constructor(
      Exchange,
      messaging,
      navigation,
      ovhUserPref,
      $rootScope,
      $timeout,
      $translate,
      wizardHostedCreationDomainConfiguration,
    ) {
      this.Exchange = Exchange;
      this.messaging = messaging;
      this.navigation = navigation;
      this.ovhUserPref = ovhUserPref;
      this.$rootScope = $rootScope;
      this.$timeout = $timeout;
      this.$translate = $translate;
      this.wizardHostedCreationDomainConfiguration = wizardHostedCreationDomainConfiguration;
    }

    $onInit() {
      this.$routerParams = this.Exchange.getParams();
      this.navigationState = '';
      this.shouldDisplayFirstStep = true;

      return this.restoringCheckpoint();
    }

    retrievingCheckpoint() {
      return this.ovhUserPref.getValue(PREFERENCE_CHECKPOINT).catch(() => null);
    }

    static createOrUsePreviousPreferences(currentPreferences) {
      const currentPreferencesExist = _(currentPreferences).isObject();
      const preferencesToUse = currentPreferencesExist ? currentPreferences : {};

      return preferencesToUse;
    }

    createPreferencesForCurrentServiceIfNeeded(preferences) {
      const currentServiceHasPreferences = !_(
        preferences[this.$routerParams.organization],
      ).isEmpty();

      if (!currentServiceHasPreferences) {
        _.set(preferences, this.$routerParams.organization, {});
      }

      return preferences;
    }

    createPreferencesForCurrentDomain(previousPreferences) {
      const preferencesToUse = controller.createOrUsePreviousPreferences(previousPreferences);
      const preferencesWithCurrentService = this.createPreferencesForCurrentServiceIfNeeded(
        preferencesToUse,
      );

      preferencesWithCurrentService[this.$routerParams.organization][this.domainName] = {
        cnameToCheck: this.cnameToCheck,
        domainIsAssociatedToEmailService: this.domainIsAssociatedToEmailService,
        isAutoConfigurationMode: this.isAutoConfigurationMode,
        mxRelay: this.mxRelay,
        domainIsNotManagedByCurrentNIC: this.domainIsNotManagedByCurrentNIC,
        domainIsOnlyForExchange: this.domainIsOnlyForExchange,
        shouldDisplayFirstStep: this.shouldDisplayFirstStep,
        navigationState: this.navigationState,
        domainHasBeenAssociated: this.domainHasBeenAssociated,
        shouldDisabledDomainSelection: this.shouldDisabledDomainSelection,
        isShowingEmailCustomization: this.isShowingEmailCustomization,
      };

      return preferencesWithCurrentService;
    }

    closeMessages() {
      this.messaging.resetMessages();
      this.scrollToBottom();
    }

    scrollToBottom() {
      this.$timeout(() => {
        document.getElementById('email-creation-main-container').scrollIntoView(false);
      });
    }

    scrollToTop() {
      this.$timeout(() => {
        document.getElementById('wizard-error-message').scrollIntoView(true);
      });
    }

    savingCheckpoint() {
      return this.retrievingCheckpoint().then((retrievedPreferences) => {
        const preferencesToSave = this.createPreferencesForCurrentDomain(retrievedPreferences);

        return this.ovhUserPref.create(PREFERENCE_CHECKPOINT, preferencesToSave);
      });
    }

    restoringCheckpoint() {
      return this.retrievingCheckpoint()
        .then((preferences) => {
          if (
            !_(preferences).isObject()
            || _(preferences[this.$routerParams.organization]).isEmpty()
          ) {
            return null;
          }

          const firstDomainName = Object.keys(preferences[this.$routerParams.organization])[0];
          this.domainName = firstDomainName;

          return this.wizardHostedCreationDomainConfiguration
            .retrievingDomain(
              this.$routerParams.organization,
              this.$routerParams.productId,
              this.domainName,
            )
            .then(() => {
              const preferenceToUse = preferences[this.$routerParams.organization][this.domainName];

              this.cnameToCheck = preferenceToUse.cnameToCheck;
              this.domainIsAssociatedToEmailService = preferenceToUse.domainIsAssociatedToEmailService; // eslint-disable-line
              this.isAutoConfigurationMode = preferenceToUse.isAutoConfigurationMode;
              this.mxRelay = preferenceToUse.mxRelay;
              this.domainIsNotManagedByCurrentNIC = preferenceToUse.domainIsNotManagedByCurrentNIC;
              this.domainIsOnlyForExchange = preferenceToUse.domainIsOnlyForExchange;
              this.shouldDisplayFirstStep = preferenceToUse.shouldDisplayFirstStep;
              this.navigationState = preferenceToUse.navigationState;
              this.domainHasBeenAssociated = preferenceToUse.domainHasBeenAssociated;
              this.shouldDisabledDomainSelection = preferenceToUse.shouldDisabledDomainSelection;
              this.isShowingEmailCustomization = preferenceToUse.isShowingEmailCustomization;

              return preferenceToUse;
            })
            .catch(() => this.deletingCheckpoint());
        })
        .catch(() => null);
    }

    deletingCheckpoint() {
      return this.retrievingCheckpoint()
        .then(preferences => this.ovhUserPref.remove(PREFERENCE_CHECKPOINT).then(() => preferences))
        .then((preferences) => {
          if (
            !_(preferences).isObject()
            || _(preferences).isEmpty()
            || _(preferences[this.$routerParams.organization]).isEmpty()
          ) {
            return null;
          }

          delete preferences[this.$routerParams.organization][this.domainName]; // eslint-disable-line

          if (_(preferences[this.$routerParams.organization]).isEmpty()) {
            delete preferences[this.$routerParams.organization]; // eslint-disable-line
          }

          this.domainName = null;
          this.cnameToCheck = null;
          this.isAutoConfigurationMode = null;
          this.mxRelay = null;
          this.domainIsAssociatedToEmailService = null;
          this.domainIsNotManagedByCurrentNIC = null;
          this.domainIsOnlyForExchange = null;
          this.shouldDisplayFirstStep = true;
          this.navigationState = '';
          this.domainHasBeenAssociated = false;
          this.shouldDisabledDomainSelection = false;
          this.isShowingEmailCustomization = false;

          if (_(preferences).isEmpty()) {
            return null;
          }

          return this.ovhUserPref.create(PREFERENCE_CHECKPOINT, preferences);
        });
    }
  }

  angular.module('Module.exchange.components').component('exchangeWizardHostedCreation', {
    templateUrl: 'exchange/wizard-hosted-creation/wizard-hosted-creation.html',
    controller,
  });
}
