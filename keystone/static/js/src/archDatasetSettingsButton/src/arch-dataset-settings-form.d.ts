import { DatasetSettings } from "../../lib/types";
import { ArchJsonSchemaForm } from "../../archJsonSchemaForm/index";
export declare class ArchDatasetSettingsForm extends ArchJsonSchemaForm<DatasetSettings> {
    dataKeyAliasMap: Record<string, string>;
}
declare global {
    interface HTMLElementTagNameMap {
        "arch-dataset-settings-form": ArchDatasetSettingsForm;
    }
}
