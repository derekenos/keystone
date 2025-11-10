import { CollectionSettings } from "../../lib/types";
import { ArchJsonSchemaForm } from "../../archJsonSchemaForm/index";
export declare class ArchCollectionSettingsForm extends ArchJsonSchemaForm<CollectionSettings> {
    dataKeyAliasMap: Record<string, string>;
}
declare global {
    interface HTMLElementTagNameMap {
        "arch-collection-settings-form": ArchCollectionSettingsForm;
    }
}
