import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import { SomeJSONSchema } from "ajv/lib/types/json-schema";

import ArchAPI from "../../lib/ArchAPI";
import { global } from "../../lib/styles";
import { DatasetSettings } from "../../lib/types";

import "../../archModal/src/arch-modal";

import "./arch-dataset-settings-form";

@customElement("arch-dataset-settings-button")
export class ArchDatasetSettingsButton extends LitElement {
  @property({ type: Number }) datasetId!: number;
  @property({ type: Object }) settings!: DatasetSettings;

  // Set delegatesFocus=true so that we can restore focus to the job button
  // on arch-global-modal close.
  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static styles = global;

  static DatasetSettingsSchema: SomeJSONSchema = {
    type: "object",
    required: ["opt_out"],
    properties: {
      opt_out: {
        type: "boolean",
        title: "Hide",
        description:
          "Control whether this dataset appears in your list of available datasets.",
      },
    },
  };

  render() {
    const { DatasetSettingsSchema } = ArchDatasetSettingsButton;
    const { settings } = this;

    return html`
      <arch-modal
        title="Dataset Settings"
        modalSize="l"
        submitButtonText="Save"
        @submit=${this.submit}
      >
        <div slot="content">
          <arch-dataset-settings-form
            .schema=${DatasetSettingsSchema}
            .data=${settings}
          ></arch-dataset-settings-form>
        </div>
        <button slot="trigger" class="info">Settings</button>
      </arch-modal>
    `;
  }

  submit() {
    const { datasetId, settings } = this;
    void ArchAPI.datasets.updateUserSettings(datasetId, settings);
  }
}

// Injects the tag into the global name space
declare global {
  interface HTMLElementTagNameMap {
    "arch-dataset-settings-button": ArchDatasetSettingsButton;
  }
}
