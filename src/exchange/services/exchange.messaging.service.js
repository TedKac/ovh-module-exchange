angular
    .module("Module.exchange.services")
    .service("messaging", class Messaging {
        resetMessages () {
            this.message = null;
            this.messageDetails = null;
        }

        write (message, alertType, failure = null) {
            this.message = message;
            this.alertType = `alert ${alertType}`;
            this.messageDetails = [];

            if (failure != null) {
                const value = [
                    failure,
                    failure.data
                ];

                _.forEach(value, currentValue => {
                    /* eslint-disable no-continue */
                    if (_.isEmpty(currentValue)) {
                        continue;
                    }
                    /* eslint-enable no-continue */

                    if (_.isString(currentValue)) {
                        this.messageDetails.push({ id: null, message: currentValue });
                    } else if (_.isString(currentValue.message)) {
                        this.messageDetails.push({ id: currentValue.id, message: currentValue.message });
                    } else if (currentValue.messages != null) {
                        this.messageDetails = currentValue.messages.map((currentMessage) => ({ id: currentMessage.code, message: currentMessage.message }));
                        this.messageDetails = _.uniq(this.messageDetails, (currentMessage) => `${currentMessage.id}${currentMessage.message}`);
                    }
                });
            }
        }

        writeSuccess (message, details = null) {
            this.write(message, "alert-success", details);
        }

        writeError (message, details = null) {
            this.write(message, "alert-danger", details);
        }

        /**
         * If multiple messages set message structure as follow :
         * {
         *   OK: 'message to display when success',
         *   PARTIAL: 'message to display when partial success',
         *   ERROR: 'message to display when fail'
         * }
         * @param data : the data from SWS
         */
        setMessage (message, failure) {
            let messageToSend = message;
            let messageDetails = [];
            let alertType = "alert alert-success";

            if (failure != null) {
                if (failure.message != null) {
                    messageDetails.push({ id: failure.id, message: failure.message });
                    alertType = "alert alert-warning";

                    if (_.isString(failure.type)) {
                        switch (failure.type.toUpperCase()) {
                        case "ERROR":
                            alertType += " alert-danger";

                            if (message.ERROR != null || message != null) {
                                messageToSend = message.ERROR || message;
                            }
                            break;
                        case "PARTIAL":
                            alertType += " alert-danger";

                            if (message.PARTIAL != null || message != null) {
                                messageToSend = message.PARTIAL || message;
                            }
                            break;
                        case "INFO":
                            alertType += " alert-success";

                            if (message.INFO != null || message != null) {
                                messageToSend = message.INFO || message;
                            }
                            break;
                        default:
                            break;
                        }
                    }
                } else if (failure.messages != null) {
                    if (!_.isEmpty(failure.messages)) {
                        alertType = "alert";

                        switch (failure.state.toUpperCase()) {
                        case "ERROR":
                            alertType += " alert-danger";
                            messageToSend = message.ERROR || message;
                            break;
                        case "PARTIAL":
                            alertType += " alert-warning";
                            messageToSend = message.PARTIAL || message;
                            break;
                        case "OK":
                            alertType += " alert-success";
                            messageToSend = message.OK || message;
                            break;
                        default:
                            alertType += " alert-warning";
                            messageToSend = message;
                            break;
                        }

                        messageDetails = failure.messages
                            .filter((currentMessage) => _.isString(currentMessage.type) && currentMessage.type.toUpperCase() !== "INFO")
                            .map((currentMessage) => ({ id: currentMessage.code, message: currentMessage.message }));
                    }
                } else if (failure.status != null) {
                    alertType = "alert alert-warning";

                    switch (failure.status.toUpperCase()) {
                    case "BLOCKED":
                    case "CANCELLED":
                    case "PAUSED":
                    case "ERROR":
                        alertType += " alert-danger";
                        break;
                    case "TODO":
                    case "DONE":
                        alertType += " alert-success";
                        break;
                    default:
                    }
                } else if (failure === "true") {
                    alertType = "alert alert-success";
                    messageDetails = null;
                }
            }

            this.message = messageToSend;
            this.messageDetails = messageDetails;
            this.alertType = alertType;
        }
    });
