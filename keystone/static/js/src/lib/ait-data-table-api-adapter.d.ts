import { FilteredApiResponse } from "./types";
import { DataTable } from "./webservices/src/aitDataTable/src/types";
export default class API<RowT> {
    dataTable: DataTable<RowT>;
    constructor(dataTable: DataTable<RowT>);
    updateNumHits(response: FilteredApiResponse<RowT>): void;
    updatePaginator(hiddenCount: number): void;
    get(apiPath: string): Promise<{
        json: () => Promise<RowT[]>;
    }>;
}
