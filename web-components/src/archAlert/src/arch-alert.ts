import { LitElement, TemplateResult, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import styles from "./styles";

export enum AlertClass {
  Danger = "danger",
  Dark = "dark",
  Info = "info",
  Light = "light",
  Primary = "primary",
  Secondary = "secondary",
  Success = "success",
  Warning = "warning",
}

@customElement("arch-alert")
export class ArchAlert extends LitElement {
  @property({ type: String, attribute: "alert-class" }) alertClass: AlertClass =
    AlertClass.Primary;
  @property({ type: Boolean }) hidden = false;
  @property({ type: String }) message: string | TemplateResult = html``;
  @property({ type: Boolean, attribute: "non-dismissable" }) nonDismissable =
    false;

  static styles = styles;

  render() {
    return html`
      <div
        class="alert alert-${this.alertClass}"
        style="display: ${this.hidden ? "none" : "flex"}"
        role="alert"
      >
        <p>${this.message}</p>
        ${this.nonDismissable
          ? html``
          : html` <button
              type="button"
              class="close"
              data-dismiss="alert"
              aria-label="Close"
              style="background-color: transparent;"
              @click=${this.hide}
            >
              <span aria-hidden="true">&times;</span>
            </button>`}
      </div>
    `;
  }

  hide() {
    this.setAttribute("hidden", "");
  }

  show() {
    this.removeAttribute("hidden");
  }
}

// Injects the tag into the global name space
declare global {
  interface HTMLElementTagNameMap {
    "arch-alert": ArchAlert;
  }
}
