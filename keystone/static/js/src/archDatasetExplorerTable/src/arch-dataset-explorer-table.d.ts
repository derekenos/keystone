import { PropertyValues } from "lit";
import { ArchDataTable } from "../../archDataTable/index";
import { Dataset, ValueOf } from "../../lib/types";
export declare class ArchDatasetExplorerTable extends ArchDataTable<Dataset> {
    showHidden: boolean;
    hideGenerateDataset: boolean;
    columnNameHeaderTooltipMap: {
        category: string;
        sample: string;
    };
    static styles: import("lit").CSSResult[];
    renderNameCell(name: ValueOf<Dataset>, dataset: Dataset): string | HTMLElement;
    renderCollectionCell(collectionName: Dataset["collection_name"], dataset: Dataset): HTMLElement;
    willUpdate(_changedProperties: PropertyValues): void;
}
declare global {
    interface HTMLElementTagNameMap {
        "arch-dataset-explorer-table": ArchDatasetExplorerTable;
    }
}
