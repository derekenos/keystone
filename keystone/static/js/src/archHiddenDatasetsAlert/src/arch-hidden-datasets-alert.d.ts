import { ArchAlert, AlertClass } from "../../archAlert/index";
export declare class ArchHiddenDatasetsAlert extends ArchAlert {
    alertClass: AlertClass;
    nonDismissable: boolean;
    hiddenIconUrl: string;
    static styles: import("lit").CSSResult[];
    connectedCallback(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        "arch-hidden-datasets-alert": ArchHiddenDatasetsAlert;
    }
}
