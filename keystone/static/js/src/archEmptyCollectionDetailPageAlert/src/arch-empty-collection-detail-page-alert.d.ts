import { AlertClass, ArchAlert } from "../../archAlert/index";
export declare class ArchEmptyCollectionDetailPageAlert extends ArchAlert {
    alertClass: AlertClass;
    nonDismissable: boolean;
    optedOut: boolean;
    willUpdate(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        "arch-empty-collection-detail-page-alert": ArchEmptyCollectionDetailPageAlert;
    }
}
