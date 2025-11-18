import { html } from "lit";
import { customElement, property } from "lit/decorators.js";

import { AlertClass, ArchAlert } from "../../archAlert/index";
import { NewHelpTicketUrl } from "../../lib/constants";

const EmptyAlertMessage =
  "This collection is empty and can not be used to generate datasets or create custom collections.";

const OptOutMessage =
  ' To hide it from display in the future, click the "Settings" button and toggle the "Hide" option ON.';

const ReportIssueMessage = html` To report an issue,
  <a href="${NewHelpTicketUrl}" target="_blank">contact the ARCH team here</a
  >.`;

@customElement("arch-empty-collection-detail-page-alert")
export class ArchEmptyCollectionDetailPageAlert extends ArchAlert {
  @property() alertClass = AlertClass.Danger;
  @property() nonDismissable = true;
  @property({ type: Boolean, attribute: "opted-out" }) optedOut = false;

  willUpdate() {
    const { optedOut } = this;
    this.message = html`${EmptyAlertMessage}${optedOut
      ? ""
      : OptOutMessage}${ReportIssueMessage}`;
  }
}

// Injects the tag into the global name space
declare global {
  interface HTMLElementTagNameMap {
    "arch-empty-collection-detail-page-alert": ArchEmptyCollectionDetailPageAlert;
  }
}
