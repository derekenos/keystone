import { PropertyValues } from "lit";
import { ArchDataTable } from "../../archDataTable/index";
import { Dataset, ValueOf } from "../../lib/types";
import "../../archCancelJobButton/index";
export declare class ArchDatasetExplorerTable extends ArchDataTable<Dataset> {
    showHidden: boolean;
    hideGenerateDataset: boolean;
    cancelJobIconUrl: string;
    columnNameHeaderTooltipMap: {
        category: string;
        sample: string;
    };
    static styles: import("lit").CSSResult[];
    renderNameCell(name: ValueOf<Dataset>, dataset: Dataset): string | HTMLElement;
    renderCollectionCell(collectionName: Dataset["collection_name"], dataset: Dataset): HTMLElement;
    renderStateCell(state: ValueOf<Dataset>, dataset: Dataset): string | HTMLElement;
    willUpdate(_changedProperties: PropertyValues): void;
}
declare global {
    interface HTMLElementTagNameMap {
        "arch-dataset-explorer-table": ArchDatasetExplorerTable;
    }
}
