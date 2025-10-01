import { customElement, property } from "lit/decorators.js";

import { CollectionSettings } from "../../lib/types";
import { ArchJsonSchemaForm } from "../../archJsonSchemaForm/index";

@customElement("arch-collection-settings-form")
export class ArchCollectionSettingsForm extends ArchJsonSchemaForm<CollectionSettings> {
  @property({ type: Object }) dataKeyAliasMap: Record<string, string> = {
    opt_out: "Hide",
  };
}

// Injects the tag into the global name space
declare global {
  interface HTMLElementTagNameMap {
    "arch-collection-settings-form": ArchCollectionSettingsForm;
  }
}
