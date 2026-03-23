import { LitElement } from "lit";
import { Dataset } from "../../lib/types";
import "../../archModal/src/arch-modal";
export declare class ArchCancelJobButton extends LitElement {
    datasetId: Dataset["id"];
    jobName: string;
    collectionName: string;
    iconStyleButtonUrl: undefined | string;
    busy: boolean;
    static shadowRootOptions: {
        delegatesFocus: boolean;
        mode: ShadowRootMode;
        slotAssignment?: SlotAssignmentMode | undefined;
        customElements?: CustomElementRegistry | undefined;
    };
    static styles: import("lit").CSSResult[];
    render(): import("lit-html").TemplateResult<1>;
    submit(e: Event): Promise<void>;
}
declare global {
    interface HTMLElementTagNameMap {
        "arch-cancel-job-button": ArchCancelJobButton;
    }
}
