/* eslint-disable class-methods-use-this */
angular.module('Module.exchange.controllers').controller(
  'ExchangeExternalContactPopoverCtrl',
  class ExchangeExternalContactPopoverCtrl {
    getIsDisabled(element) {
      return !_.isEmpty(element.taskPendingId);
    }
  },
);
/* eslint-enable class-methods-use-this */
