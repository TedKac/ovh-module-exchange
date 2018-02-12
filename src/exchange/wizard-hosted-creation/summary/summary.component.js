{
    class controller {
        constructor (constants, Exchange, ExchangeDomains, EXCHANGE_MX_CONFIG, messaging, navigation, translator, $rootScope, wizardHostedCreationEmailCreation) {
            Object.assign(this, { constants, Exchange, ExchangeDomains, EXCHANGE_MX_CONFIG, messaging, navigation, translator, $rootScope, wizardHostedCreationEmailCreation });
        }

        $onInit () {
            this.$routerParams = this.Exchange.getParams();
            this.exchange = this.Exchange.value;
            this.$rootScope.$on("exchange.wizard.request.done", (event, data) => {
                this.retrievingEmailAccounts();
            });

            const mxAndSRVTooltipFirstSentence = this.translator.tr("exchange_wizardHostedCreation_configureDNSZone_manual_explanation_tooltip_1");
            const mxAndSRVTooltipSecondSentence = this.translator.tr("exchange_wizardHostedCreation_configureDNSZone_manual_explanation_tooltip_2");
            this.tooltipText = `${mxAndSRVTooltipFirstSentence}<br /><br />${mxAndSRVTooltipSecondSentence}`;

            this.isLoading = true;
            this.homepage.savingCheckpoint()
                .then(() => this.retrievingEmailAccounts())
                .then(() => this.retrievingDNSSettings())
                .finally(() => {
                    this.isLoading = false;
                });
        }

        closeWizard () {
            this.$rootScope.$broadcast("exchange.wizard_hosted_creation.hide");

            if (this.homepage.isAutoConfigurationMode) {
                this.navigation.setAction("exchange/wizard-hosted-creation/summary/automatic/automatic", {
                    domainName: this.homepage.domainName
                });
            } else {
                this.navigation.setAction("exchange/wizard-hosted-creation/summary/manual/manual", {
                    domainName: this.homepage.domainName
                });
            }

            return this.homepage.deletingCheckpoint();
        }

        retrievingDNSSettings () {
            return this.ExchangeDomains
                .gettingDNSSettings(this.$routerParams.organization, this.$routerParams.productId, this.homepage.domainName)
                .then((data) => {
                    this.domainDiagnostic = data;

                    if (this.constants.target === "CA") {
                        this.domainDiagnostic.mx.spam = this.EXCHANGE_MX_CONFIG.CA.spam;
                    } else if (this.constants.target === "EU") {
                        this.domainDiagnostic.mx.spam = this.EXCHANGE_MX_CONFIG.EU.spam;
                    }

                    if (this.domainDiagnostic.isOvhDomain) {
                        this.model = {
                            antiSpam: false
                        };
                    }
                })
                .catch((failure) => {
                    this.navigation.resetAction();
                    this.messaging.writeError(this.translator.tr("exchange_tab_domain_diagnostic_add_field_failure"), failure);
                });
        }

        goBackToEmailCustomization () {
            this.homepage.shouldDisplayFirstStep = true;
            this.homepage.navigationState = "email-creation";

            return this.homepage.savingCheckpoint();
        }

        retrievingEmailAccounts (count, offset) {
            return this.wizardHostedCreationEmailCreation
                .retrievingAccounts(this.$routerParams.organization, this.$routerParams.productId, count, offset)
                .then((accounts) => {
                    const copy = _(accounts).clone();
                    copy.list.results = _(accounts.list.results).filter((currentAccount) => currentAccount.domain === this.homepage.domainName).value();
                    copy.count = copy.list.results.length;
                    this.homepage.emailAccounts = copy;
                    this.hasEmailAddresses = angular.isArray(this.homepage.emailAccounts.list.results) && this.homepage.emailAccounts.count > 0;
                })
                .catch((error) => {
                    this.messaging.writeError(this.translator.tr("exchange_wizardHostedCreation_configureDNSZone_availableAccountsRetrieval_error"), error);
                });
        }
    }

    angular
        .module("Module.exchange.components")
        .component("exchangeWizardHostedCreationSummary", {
            templateUrl: "exchange/wizard-hosted-creation/summary/summary.html",
            controller,
            require: {
                homepage: "^^exchangeWizardHostedCreation"
            }
        });
}