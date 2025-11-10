import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import { SomeJSONSchema } from "ajv/lib/types/json-schema";

import ArchAPI from "../../lib/ArchAPI";
import { global } from "../../lib/styles";
import { CollectionSettings } from "../../lib/types";

import "../../archModal/src/arch-modal";

import "./arch-collection-settings-form";

@customElement("arch-collection-settings-button")
export class ArchCollectionSettingsButton extends LitElement {
  @property({ type: Number }) collectionId!: number;
  @property({ type: Object }) settings!: CollectionSettings;

  // Set delegatesFocus=true so that we can restore focus to the job button
  // on arch-global-modal close.
  static shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static styles = global;

  static CollectionSettingsSchema: SomeJSONSchema = {
    type: "object",
    required: ["opt_out"],
    properties: {
      opt_out: {
        type: "boolean",
        title: "Hide",
        description:
          "Control whether this collection appears in your list of available collections.",
      },
    },
  };

  render() {
    const { CollectionSettingsSchema } = ArchCollectionSettingsButton;
    const { settings } = this;

    return html`
      <arch-modal
        title="Collection Settings"
        modalSize="l"
        submitButtonText="Save"
        @submit=${this.submit}
      >
        <div slot="content">
          <arch-collection-settings-form
            .schema=${CollectionSettingsSchema}
            .data=${settings}
          ></arch-collection-settings-form>
        </div>
        <button slot="trigger" class="info">Settings</button>
      </arch-modal>
    `;
  }

  submit() {
    const { collectionId, settings } = this;
    void ArchAPI.collections.updateUserSettings(collectionId, settings);
  }
}

// Injects the tag into the global name space
declare global {
  interface HTMLElementTagNameMap {
    "arch-collection-settings-button": ArchCollectionSettingsButton;
  }
}
