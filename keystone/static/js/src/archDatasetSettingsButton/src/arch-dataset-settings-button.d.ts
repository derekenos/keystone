import { LitElement } from "lit";
import { SomeJSONSchema } from "ajv/lib/types/json-schema";
import { DatasetSettings } from "../../lib/types";
import "../../archModal/src/arch-modal";
import "./arch-dataset-settings-form";
export declare class ArchDatasetSettingsButton extends LitElement {
    datasetId: number;
    settings: DatasetSettings;
    static shadowRootOptions: {
        delegatesFocus: boolean;
        mode: ShadowRootMode;
        slotAssignment?: SlotAssignmentMode | undefined;
        customElements?: CustomElementRegistry | undefined;
    };
    static styles: import("lit").CSSResult;
    static DatasetSettingsSchema: SomeJSONSchema;
    render(): import("lit-html").TemplateResult<1>;
    submit(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        "arch-dataset-settings-button": ArchDatasetSettingsButton;
    }
}
