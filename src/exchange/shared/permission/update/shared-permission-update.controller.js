angular.module('Module.exchange.controllers').controller(
  'ExchangeUpdatePublicFolderPermissionCtrl',
  class ExchangeUpdatePublicFolderPermissionCtrl {
    constructor(
      $scope,
      Exchange,
      ExchangePublicFolders,
      $timeout,
      navigation,
      messaging,
      $translate,
      exchangeStates,
    ) {
      this.services = {
        $scope,
        Exchange,
        ExchangePublicFolders,
        $timeout,
        navigation,
        messaging,
        $translate,
        exchangeStates,
      };

      this.$routerParams = Exchange.getParams();
      this.folder = navigation.currentActionData;

      this.permissions = {
        former: null, // the permissions as they were retrieved (no modifications whatesoever)
        current: null, // the current state of the permissions
        changes: {}, // all the accounts primary email addresses
        messages: [], // contains alls the messages associated with the retrieved permissions
        ids: [], // contains the ids of all the retrieved accounts
        selectedPermissions: {
          EDITOR: [],
          REVIEWER: [],
          NONE: [],
          DEFAULT: [],
        },
      };

      this.isLoading = false;
      this.searchValue = null;

      $scope.retrievingPermissions = (count, offset) => this.retrievingPermissions(count, offset);
      $scope.getCurrentPermissions = () => this.permissions.current;
      $scope.getIsLoading = () => this.isLoading;
      $scope.hasBufferChanged = () => this.hasBufferChanged();
      $scope.updatingPermissions = () => this.updatingPermissions();
    }

    static getKeys(obj) {
      return _.keys(obj);
    }

    retrievingPermissions(count, offset) {
      this.services.messaging.resetMessages();
      this.isLoading = true;

      return this.services.ExchangePublicFolders.retrievingAccountsByPublicFolder(
        this.$routerParams.organization,
        this.$routerParams.productId,
        this.folder.path,
        count,
        offset,
        this.searchValue,
      )
        .then((data) => {
          this.permissions.current = _.clone(data, true);
          this.permissions.former = _.clone(data, true);
          this.permissions.messages = _.clone(data.list.messages, true);

          this.mapPermissionToArray();
        })
        .catch((failure) => {
          this.services.navigation.resetAction();
          this.services.messaging.writeError(
            this.services.$translate.instant('exchange_tab_SHARED_all_error_message'),
            failure,
          );
        })
        .finally(() => {
          this.isLoading = false;
        });
    }

    mapPermissionToArray() {
      if (
        !_.has(this.permissions, 'current.list.results')
        || this.permissions.current.list.results == null
      ) {
        throw new Error('mapPermissionToArray() can only be used once the permission retrieved from the server');
      }

      this.permissions.selectedPermissions = _.mapValues(
        this.permissions.selectedPermissions,
        () => [],
      );
      this.permissions.ids = this.permissions.current.list.results.map(
        permission => permission.accessRights,
      );
      this.permissions.former.list.results.forEach((permission) => {
        const account = _.keys(this.permissions.changes).find(
          accountName => accountName === permission.primaryAddressDisplayName,
        );

        if (account == null) {
          this.changeAccountAndPermission(
            permission.primaryAddressDisplayName,
            permission.accessRights,
          );
        } else {
          this.changeAccountAndPermission(
            permission.primaryAddressDisplayName,
            this.permissions.changes[account],
          );
        }
      });
    }

    // state = destination state
    // STATE 0 : "ALL" -> "None"
    // STATE 1 : "None" -> "All"
    // STATE 2 : "Partial" -> "ALL"
    /* eslint-disable no-fallthrough */
    onCheckboxStateClick(state, permission) {
      _.forEach(this.permissions.current.list.results, (account) => {
        switch (state) {
          // "All" -> "None"
          case 0:
            this.changeAccountAndPermission(account.primaryAddressDisplayName, null);
            break;

          // "None" -> "All"
          case 1:

          // "Partial" -> "All"
          case 2:
            this.changeAccountAndPermission(account.primaryAddressDisplayName, permission);
            break;

          default:
            throw new Error(`Unknown case ${state}`);
        }
      });
    }
    /* eslint-enable no-fallthrough */

    onSinglePermissionChange(id, permissionName) {
      this.changeAccountAndPermission(id, permissionName);
    }

    changeAccountAndPermission(accountName, permission, updateAccounts = true) {
      this.updateAccountPermission(accountName, permission);
      this.deletePreviousPermissionEntry(accountName);
      this.updateAccountAndPermissionEntries(accountName, permission);

      if (updateAccounts) {
        const formerPermission = this.permissions.former.list.results.find(
          formerPerm => formerPerm.primaryAddressDisplayName === accountName,
        );
        const formerPermissionName = this.getPermissionName(formerPermission);
        const newPermissionName = this.getPermissionName(permission);

        if (formerPermissionName === newPermissionName) {
          delete this.permissions.changes[accountName];
        } else {
          this.permissions.changes[accountName] = newPermissionName;
        }
      }
    }

    /* eslint-disable class-methods-use-this */
    getPermissionName(permission) {
      return _.has(permission, 'accessRights') ? permission.accessRights : permission;
    }
    /* eslint-enable class-methods-use-this */

    updateAccountPermission(accountName, permission) {
      const permissionName = this.getPermissionName(permission);
      const matchingAccount = this.permissions.current.list.results.find(
        currentAccount => currentAccount.primaryAddressDisplayName === accountName,
      );

      if (matchingAccount != null) {
        matchingAccount.accessRights = permissionName;
      }
    }

    deletePreviousPermissionEntry(accountName) {
      const previousPermissionName = this.permissions.changes[accountName];

      if (!_.isEmpty(previousPermissionName)) {
        this.permissions.selectedPermissions[
          previousPermissionName
        ] = this.permissions.selectedPermissions[previousPermissionName].filter(
          currentAccountName => currentAccountName !== accountName,
        );
      }

      const formerPermission = this.permissions.former.list.results.find(
        formerPerm => formerPerm.primaryAddressDisplayName === accountName,
      );
      const formerPermissionName = this.getPermissionName(formerPermission);

      if (_(this.permissions.selectedPermissions[formerPermissionName]).includes(accountName)) {
        this.permissions.selectedPermissions[
          formerPermissionName
        ] = this.permissions.selectedPermissions[formerPermissionName].filter(
          currentAccountName => currentAccountName !== accountName,
        );
      }
    }

    updateAccountAndPermissionEntries(accountName, newPermission) {
      const newPermissionName = this.getPermissionName(newPermission);

      if (!_.isEmpty(newPermissionName)) {
        this.permissions.selectedPermissions[newPermissionName].push(accountName);
      }
    }

    hasBufferChanged() {
      const allPermissionAreSelected = !_.values(this.permissions.changes).includes(null);
      return !_.isEmpty(this.permissions.changes) && allPermissionAreSelected;
    }

    getOperationType(accountName) {
      const former = this.permissions.former.list.results.find(
        formerPermission => formerPermission.primaryAddressDisplayName === accountName,
      );
      if (former.accessRights === 'DEFAULT') {
        return 'POST';
      }

      const current = this.permissions.current.list.results.find(
        formerPermission => formerPermission.primaryAddressDisplayName === accountName,
      );
      if (current.accessRights === 'DEFAULT') {
        return 'DELETE';
      }

      return 'PUT';
    }

    updatingPermissions() {
      this.services.navigation.resetAction();
      this.services.messaging.writeSuccess(
        this.services.$translate.instant('exchange_dashboard_action_doing'),
      );

      const model = [];

      _.forEach(Object.keys(this.permissions.changes), (accountName) => {
        const newPermission = this.permissions.changes[accountName];
        const former = this.permissions.former.list.results.find(
          formerPermission => formerPermission.primaryAddressDisplayName === accountName,
        );

        model.push({
          primaryAddressDisplayName: accountName,
          allowedAccountId: former.allowedAccountId,
          accessRights: newPermission,
          operation: this.getOperationType(accountName),
        });
      });

      return this.services.ExchangePublicFolders.updatingPublicFolderPermissions(
        this.$routerParams.organization,
        this.$routerParams.productId,
        this.folder.path,
        model,
      )
        .then((data) => {
          const updatePermissionsMessages = {
            OK: this.services.$translate.instant(
              'exchange_action_SHARED_permissions_update_success_message',
              {
                t0: this.folder.path,
              },
            ),
            PARTIAL: this.services.$translate.instant(
              'exchange_action_SHARED_permissions_update_partial_message',
              {
                t0: this.folder.path,
              },
            ),
            ERROR: this.services.$translate.instant(
              'exchange_action_SHARED_permissions_update_error_message',
              {
                t0: this.folder.path,
              },
            ),
          };

          this.services.messaging.setMessage(updatePermissionsMessages, data);
        })
        .catch((failure) => {
          this.services.messaging.writeError(
            this.services.$translate.instant(
              'exchange_action_SHARED_permissions_update_error_message',
              {
                t0: this.folder.path,
              },
            ),
            failure,
          );
        });
    }
  },
);
