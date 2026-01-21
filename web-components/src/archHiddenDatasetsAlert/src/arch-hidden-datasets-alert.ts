import { css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import { ArchAlert, AlertClass } from "../../archAlert/index";

@customElement("arch-hidden-datasets-alert")
export class ArchHiddenDatasetsAlert extends ArchAlert {
  @property() alertClass = AlertClass.Info;
  @property() nonDismissable = true;

  @property({ type: String, attribute: "hidden-icon" }) hiddenIconUrl!: string;

  static styles = [
    ...ArchAlert.styles,
    css`
      img {
        width: 1rem;
        opacity: 0.5;
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    const { hiddenIconUrl } = this;
    this.message = html`
      You are viewing your hidden datasets. Datasets in this view are hidden
      directly or by collection, as indicated by
      <img src=${hiddenIconUrl} alt="not visible icon" />. Click on the
      "Settings" button for each collection or dataset below to manage its
      visibility.
    `;
  }
}

// Injects the tag into the global name space
declare global {
  interface HTMLElementTagNameMap {
    "arch-hidden-datasets-alert": ArchHiddenDatasetsAlert;
  }
}
