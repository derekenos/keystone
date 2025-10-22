import { customElement, property } from "lit/decorators.js";

import { DatasetSettings } from "../../lib/types";
import { ArchJsonSchemaForm } from "../../archJsonSchemaForm/index";

@customElement("arch-dataset-settings-form")
export class ArchDatasetSettingsForm extends ArchJsonSchemaForm<DatasetSettings> {
  @property({ type: Object }) dataKeyAliasMap: Record<string, string> = {
    opt_out: "Hide",
  };
}

// Injects the tag into the global name space
declare global {
  interface HTMLElementTagNameMap {
    "arch-dataset-settings-form": ArchDatasetSettingsForm;
  }
}
