import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import ArchAPI from "../../lib/ArchAPI";
import { global } from "../../lib/styles";
import { Dataset } from "../../lib/types";

import { ArchGlobalModal } from "../../archGlobalModal/index";
import "../../archModal/src/arch-modal";

@customElement("arch-cancel-job-button")
export class ArchCancelJobButton extends LitElement {
  @property({ type: Number }) datasetId!: Dataset["id"];
  @property({ type: String }) jobName!: string;
  @property({ type: String }) collectionName!: string;
  @property({ type: String }) iconStyleButtonUrl: undefined | string =
    undefined;

  @state() busy = false;

  // Set delegatesFocus=true so that we can restore focus to the job button
  // on arch-global-modal close.
  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static styles = [
    global,
    css`
      :host {
        display: inline-block;
        overflow: hidden;
      }
      button[slot="trigger"] {
        font-size: var(--button-font-size, inherit);
        padding: var(--button-padding, 0.4rem 1rem);
      }
      button[slot="trigger"].icon {
        width: 1.5em;
        height: 1.5em;
        padding: 0;
        background-color: transparent;
        background-size: contain;
        background-repeat: no-repeat;
        opacity: 0.85;
      }
      button[slot="trigger"].icon:hover {
        background-color: unset;
        opacity: 1;
      }
      button[slot="trigger"][disabled],
      button[slot="trigger"][disabled]:hover,
      button[slot="trigger"][disabled].icon,
      button[slot="trigger"][disabled].icon:hover {
        opacity: 0.5;
      }
      arch-modal {
        white-space: wrap;
      }
    `,
  ];

  render() {
    const { busy, jobName, collectionName, iconStyleButtonUrl } = this;
    // Setting this.title in firstUpdated() sometimes resulted in collectionName being
    // displayed as undefined, so we'll just do it here.
    this.title = `Cancel creating the '${jobName}' dataset for your '${collectionName}' collection.`;
    const buttonClassStr = iconStyleButtonUrl ? "icon" : "danger";
    const buttonStyleStr = iconStyleButtonUrl
      ? `background-image: url("${iconStyleButtonUrl}");`
      : "";
    return html`
      <arch-modal
        modalSize="l"
        modalTitle="Cancel Dataset"
        cancelButtonText="No"
        submitButtonText="Yes"
        submitButtonClass="danger"
        @submit=${this.submit.bind(this)}
      >
        <div slot="content">
          Are you sure you want to cancel creating the '${jobName}' dataset for
          your ‘${collectionName}’ collection?
        </div>
        <button
          slot="trigger"
          class=${buttonClassStr}
          style=${buttonStyleStr}
          ?disabled=${busy}
        >
          ${iconStyleButtonUrl ? nothing : "Cancel"}
        </button>
      </arch-modal>
    `;
  }

  async submit(e: Event) {
    e.stopPropagation();
    const { datasetId } = this;
    this.busy = true;
    try {
      await ArchAPI.datasets.cancel(datasetId);
    } catch {
      this.busy = false;
      ArchGlobalModal.showError(
        "Cancel Failed",
        "Could not cancel job. Please try again.",
        this
      );
    }
  }
}

// Injects the tag into the global name space
declare global {
  interface HTMLElementTagNameMap {
    "arch-cancel-job-button": ArchCancelJobButton;
  }
}
