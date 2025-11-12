import { PropertyValues } from "lit";
import { customElement, property } from "lit/decorators.js";

import { ArchDataTable } from "../../archDataTable/index";
import API from "../../lib/ait-data-table-api-adapter";
import { CollectionTypeDisplayMap } from "../../lib/constants";
import {
  Collection,
  CollectionType,
  CustomCollectionMetadata,
  CollectionFilteredApiResponse,
  SpecialCollectionMetadata,
  ProcessingState,
  ValueOf,
} from "../../lib/types";
import { Topics } from "../../lib/pubsub";
import {
  Paths,
  createElement,
  formatCollectionSize,
  isActiveProcessingState,
  isValidCustomInputCollection,
  isoStringToDateString,
} from "../../lib/helpers";
import Styles from "./styles";

class CollectionsTableAPI extends API<Collection> {
  updateNumHits(response: CollectionFilteredApiResponse) {
    /*
     * Override default API adapter to display the num hidden count.
     */
    super.updateNumHits(response);
    const { opted_out_count: hiddenCount } = response;
    if (
      hiddenCount === undefined ||
      hiddenCount === null ||
      hiddenCount === 0
    ) {
      return;
    }
    const { dataTable } = this;
    const el = (
      dataTable?.querySelector("div.paginator-wrapper") as HTMLElement
    ).children[0] as HTMLElement;
    const textContent = el.textContent as string;
    const hiddenCollectionsUrl = new URL(window.location.href);
    hiddenCollectionsUrl.pathname = "/hidden-collections";
    const title =
      "View the " +
      (hiddenCount === 1
        ? "hidden collection that matches"
        : `${hiddenCount} hidden collections that match`) +
      " this search";
    el.innerHTML = `${textContent.slice(0, textContent.length - 1)}, <a href="${
      hiddenCollectionsUrl.href
    }" target="_blank" title="${title}" style="font-size: 0.75em; color: #664d03; text-decoration: underline; cursor: pointer;">${hiddenCount} hidden</a>)`;
  }
}

@customElement("arch-collections-table")
export class ArchCollectionsTable extends ArchDataTable<Collection> {
  @property({ type: Boolean, attribute: "show-hidden" }) showHidden = false;

  static styles = [...ArchDataTable.styles, ...Styles];

  constructor() {
    // Use ArchCollectionsTable-specific API adapter class.
    super();
    this.apiFactory = CollectionsTableAPI;
  }

  static renderNameCell(
    name: ValueOf<Collection>,
    collection: Collection
  ): HTMLElement {
    /*
     * Render the `Name` cell element.
     */
    const nameSpan = createElement("span", {
      className: "highlightable",
      textContent: collection.name,
    });

    if (
      collection.collection_type === CollectionType.CUSTOM &&
      (collection.metadata as CustomCollectionMetadata).state !==
        ProcessingState.FINISHED
    ) {
      // Collection is an in-progress custom collection.
      nameSpan.title =
        "This Custom collection is in the process of being created";
      const state = (collection.metadata as CustomCollectionMetadata).state;
      const displayStatus =
        state === ProcessingState.RUNNING ? "CREATING" : state;
      nameSpan.appendChild(
        createElement("i", { textContent: ` (${displayStatus})` })
      );
      return nameSpan;
    }

    // Collection is not an in-progress custom collection.
    return createElement("a", {
      href: `/collections/${collection.id}`,
      title: collection.name,
      children: [nameSpan],
    });
  }

  static renderLatestDatasetCell(
    lastJobName: ValueOf<Collection>,
    collection: Collection
  ): string | HTMLElement {
    /*
     * Render the `Latest Dataset` cell element.
     */
    return lastJobName === null
      ? ""
      : createElement("a", {
          href: Paths.dataset(collection.latest_dataset.id),
          title: lastJobName.toString(),
          textContent: lastJobName.toString(),
        });
  }

  willUpdate(_changedProperties: PropertyValues) {
    super.willUpdate(_changedProperties);

    const { showHidden } = this;

    if (!showHidden) {
      this.actionButtonLabels = [
        "Generate Dataset",
        "Create Custom Collection",
      ];
      this.actionButtonSignals = [
        Topics.GENERATE_DATASET,
        Topics.CREATE_SUB_COLLECTION,
      ];
      this.actionButtonDisabledTitles = [
        "Select a single collection below to generate a dataset",
        "Select one or more of the Archive-It, Custom, or Special-type collections below to create a custom collection",
      ];
    }
    this.apiCollectionEndpoint = "/collections";
    this.apiItemResponseIsArray = true;
    this.apiItemTemplate = "/collections?id=:id";
    // Maybe show only hidden collections.
    if (showHidden) {
      this.apiStaticParamPairs = [["opted_out", "true"]];
    }
    this.itemPollPredicate = (item) =>
      item.collection_type === CollectionType.CUSTOM
        ? isActiveProcessingState(
            (item.metadata as CustomCollectionMetadata).state
          )
        : false;
    this.itemPollPeriodSeconds = 3;

    this.cellRenderers = [
      ArchCollectionsTable.renderNameCell,

      (collectionType, collection) =>
        ((collection?.metadata as SpecialCollectionMetadata)
          ?.type_displayname as string | null) ||
        CollectionTypeDisplayMap[collectionType as CollectionType],

      ArchCollectionsTable.renderLatestDatasetCell,

      (lastJobTime) =>
        !lastJobTime ? "" : isoStringToDateString(lastJobTime as string),

      (_, collection: Collection) =>
        collection.collection_type === CollectionType.CUSTOM &&
        (collection.metadata as CustomCollectionMetadata).state !==
          ProcessingState.FINISHED
          ? ""
          : formatCollectionSize(collection),
    ];

    this.columns = [
      "name",
      "collection_type",
      "latest_dataset.name",
      "latest_dataset.start_time",
      "size_bytes",
    ];
    this.columnHeaders = [
      "Name",
      "Type",
      "Latest Dataset",
      "Dataset Date",
      "Size",
    ];
    this.rowSelectDisabledCallback = (row: Collection) => {
      const metadata = row.metadata as CustomCollectionMetadata;
      return metadata?.state && isActiveProcessingState(metadata.state);
    };
    this.selectable = !showHidden;
    this.sort = "-id";
    this.sortableColumns = [true, true, false, true, true];
    this.filterableColumns = [false, true];
    this.noResultsMessage = createElement("i", {
      children: [
        "No collections found. ",
        createElement("a", {
          href: "https://arch-webservices.zendesk.com/hc/en-us/articles/14795196010772",
          textContent: "Contact us",
        }),
        " to access collections or report an error.",
      ],
    });
    this.searchColumns = ["name"];
    this.searchColumnLabels = ["Name"];
    this.singleName = "Collection";
    this.persistSearchStateInUrl = true;
    this.pluralName = "Collections";
  }

  postSelectionChangeHandler(selectedRows: Array<Collection>) {
    /* Update DataTable.actionButtonDisabled based on the number
       of selected rows.
    */
    const { dataTable } = this;
    const { props } = dataTable;
    const numSelected = selectedRows.length;
    const generateDatasetEnabled = numSelected === 1;
    const createSubCollectionEnabled = selectedRows.every(
      isValidCustomInputCollection
    );
    props.actionButtonDisabled = [
      !generateDatasetEnabled,
      !createSubCollectionEnabled,
    ];
    dataTable.setSelectionActionButtonDisabledState(numSelected === 0);
  }

  selectionActionHandler(action: string, selectedRows: Array<Collection>) {
    switch (action) {
      case Topics.GENERATE_DATASET:
        window.location.href = Paths.generateCollectionDataset(
          selectedRows[0].id
        );
        break;
      case Topics.CREATE_SUB_COLLECTION:
        window.location.href = Paths.buildSubCollection(
          selectedRows.map((x) => x.id)
        );
    }
  }
}

// Injects the tag into the global name space
declare global {
  interface HTMLElementTagNameMap {
    "arch-collections-table": ArchCollectionsTable;
  }
}
