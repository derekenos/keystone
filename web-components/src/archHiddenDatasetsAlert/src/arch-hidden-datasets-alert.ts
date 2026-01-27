import { css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import { ArchAlert, AlertClass } from "../../archAlert/index";

@customElement("arch-hidden-datasets-alert")
export class ArchHiddenDatasetsAlert extends ArchAlert {
  @property() alertClass = AlertClass.Info;
  @property() nonDismissable = true;
  @property() message = html`
    You are viewing your hidden datasets. Datasets in this view are hidden
    directly or by collection, as indicated by <i class="hidden-icon"></i>.
    Click on the "Settings" button for each collection or dataset below to
    manage its visibility.
  `;

  static styles = [
    ...ArchAlert.styles,
    css`
      i.hidden-icon::before {
        content: var(--hidden-icon-content, "");
        display: inline-block;
        width: 1rem;
        opacity: 0.5;
      }
    `,
  ];
}

// Injects the tag into the global name space
declare global {
  interface HTMLElementTagNameMap {
    "arch-hidden-datasets-alert": ArchHiddenDatasetsAlert;
  }
}
