import { PropertyValues } from "lit";
import { ArchDataTable } from "../../archDataTable/index";
import { Dataset, ValueOf } from "../../lib/types";
import "../../archCancelJobButton/index";
export declare class ArchCollectionDetailsDatasetTable extends ArchDataTable<Dataset> {
    collectionId: number;
    hideGenerateDataset: boolean;
    isOptedOutCollection: boolean;
    cancelJobIconUrl: string;
    columnNameHeaderTooltipMap: {
        category: string;
        sample: string;
    };
    static styles: import("lit").CSSResult[];
    static renderDatasetCell(name: ValueOf<Dataset>, dataset: Dataset): string | HTMLElement;
    renderStateCell(state: ValueOf<Dataset>, dataset: Dataset): string | HTMLElement;
    willUpdate(_changedProperties: PropertyValues): void;
    nonSelectionActionHandler(action: string): void;
}
declare global {
    interface HTMLElementTagNameMap {
        "arch-collection-details-dataset-table": ArchCollectionDetailsDatasetTable;
    }
}
