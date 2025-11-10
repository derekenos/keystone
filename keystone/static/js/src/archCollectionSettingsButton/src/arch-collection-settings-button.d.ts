import { LitElement } from "lit";
import { SomeJSONSchema } from "ajv/lib/types/json-schema";
import { CollectionSettings } from "../../lib/types";
import "../../archModal/src/arch-modal";
import "./arch-collection-settings-form";
export declare class ArchCollectionSettingsButton extends LitElement {
    collectionId: number;
    settings: CollectionSettings;
    static shadowRootOptions: {
        delegatesFocus: boolean;
        mode: ShadowRootMode;
        slotAssignment?: SlotAssignmentMode | undefined;
        customElements?: CustomElementRegistry | undefined;
    };
    static styles: import("lit").CSSResult;
    static CollectionSettingsSchema: SomeJSONSchema;
    render(): import("lit-html").TemplateResult<1>;
    submit(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        "arch-collection-settings-button": ArchCollectionSettingsButton;
    }
}
