import { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { ArchDataTable } from "../../archDataTable/index";
import { BoolDisplayMap, EventTypeDisplayMap } from "../../lib/constants";
import { Dataset, ProcessingState, ValueOf } from "../../lib/types";
import {
  Paths,
  createElement,
  isActiveProcessingState,
  isoStringToDateString,
} from "../../lib/helpers";
import Styles from "./styles";

@customElement("arch-dataset-explorer-table")
export class ArchDatasetExplorerTable extends ArchDataTable<Dataset> {
  @property({ type: Boolean, attribute: "show-hidden" }) showHidden = false;

  @state() columnNameHeaderTooltipMap = {
    category:
      "Dataset categories are Collection, Network, Text, and File Format",
    sample:
      "Sample datasets contain only the first 100 available records from a collection",
  };

  static styles = [...ArchDataTable.styles, ...Styles];

  renderNameCell(
    name: ValueOf<Dataset>,
    dataset: Dataset
  ): string | HTMLElement {
    /*
     * Render the `Name` cell value.
     */
    const { showHidden } = this;
    if (dataset.state !== ProcessingState.FINISHED) {
      return dataset.name;
    }
    const isHiddenBy = showHidden && dataset.user_settings?.opt_out;
    return createElement("a", {
      href: Paths.dataset(dataset.id),
      children: [
        createElement("span", {
          classList: ["highlightable", isHiddenBy ? "hidden-by" : ""],
          textContent: dataset.name,
          title: isHiddenBy
            ? "This dataset is hidden directly via user settings"
            : "",
        }),
      ],
    });
  }

  renderCollectionCell(
    collectionName: Dataset["collection_name"],
    dataset: Dataset
  ): HTMLElement {
    const { showHidden } = this;
    const isHiddenBy = showHidden && dataset.collection_opted_out;
    const nameEl = createElement("span", {
      classList: [
        "highlightable",
        isHiddenBy ? "hidden-by" : "",
        dataset.collection_access ? "" : "no-collection-access",
      ],
      textContent: collectionName.toString(),
      title: [
        isHiddenBy
          ? "This dataset is hidden because its collection is hidden via user settings"
          : "",
        dataset.collection_access
          ? ""
          : "You are not authorized to access this collection",
      ]
        .filter(Boolean)
        .join(" and "),
    });

    return !dataset.collection_access
      ? nameEl
      : createElement("a", {
          href: Paths.collection(dataset.collection_id),
          children: [nameEl],
        });
  }

  willUpdate(_changedProperties: PropertyValues) {
    super.willUpdate(_changedProperties);

    const { showHidden } = this;

    this.apiCollectionEndpoint = "/datasets";
    this.apiItemResponseIsArray = true;
    this.apiItemTemplate = "/datasets?id=:id";
    this.itemPollPredicate = (item) => isActiveProcessingState(item.state);
    this.itemPollPeriodSeconds = 3;
    // Maybe show only hidden datasets.
    if (showHidden) {
      this.apiStaticParamPairs = [["opted_out", "true"]];
    }
    this.cellRenderers = [
      this.renderNameCell.bind(this),

      (categoryName) => categoryName as Dataset["category_name"],

      this.renderCollectionCell.bind(this),

      (isSample) =>
        BoolDisplayMap[(isSample as Dataset["is_sample"]).toString()],

      (state) => EventTypeDisplayMap[state as Dataset["state"]],

      (startTime) => isoStringToDateString(startTime as Dataset["start_time"]),

      (finishedTime) =>
        finishedTime === null
          ? ""
          : isoStringToDateString(finishedTime as Dataset["finished_time"]),
    ];
    this.columnFilterDisplayMaps = [
      undefined,
      undefined,
      undefined,
      BoolDisplayMap,
    ];
    this.columns = [
      "name",
      "category_name",
      "collection_name",
      "is_sample",
      "state",
      "start_time",
      "finished_time",
    ];
    this.columnHeaders = [
      "Dataset",
      "Category",
      "Collection",
      "Sample",
      "State",
      "Started",
      "Finished",
    ];
    this.filterableColumns = [true, true, true, true, true, false, false];
    this.noResultsMessage = createElement("i", {
      children: showHidden
        ? ["You have no hidden datasets."]
        : [
            "No datasets have been generated. ",
            createElement("a", {
              href: "/datasets/generate",
              textContent: "Generate a new dataset",
            }),
          ],
    });
    this.searchColumns = ["name", "category_name", "collection_name", "state"];
    this.searchColumnLabels = ["Name", "Category", "Collection", "State"];
    this.singleName = "Dataset";
    this.sort = "-start_time";
    this.sortableColumns = [true, true, true, true, true, true, true];
    this.persistSearchStateInUrl = true;
    this.pluralName = "Datasets";
  }
}

// Injects the tag into the global name space
declare global {
  interface HTMLElementTagNameMap {
    "arch-dataset-explorer-table": ArchDatasetExplorerTable;
  }
}
