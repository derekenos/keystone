import { ArchAlert, AlertClass } from "../../archAlert/index";
export declare class ArchHiddenDatasetsAlert extends ArchAlert {
    alertClass: AlertClass;
    nonDismissable: boolean;
    message: import("lit-html").TemplateResult<1>;
    static styles: import("lit").CSSResult[];
}
declare global {
    interface HTMLElementTagNameMap {
        "arch-hidden-datasets-alert": ArchHiddenDatasetsAlert;
    }
}
