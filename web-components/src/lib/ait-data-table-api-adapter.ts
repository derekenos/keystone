import { Paths } from "./helpers";
import { createElement } from "./helpers";
import { FilteredApiResponse, ValueOf } from "./types";

import { DataTable } from "./webservices/src/aitDataTable/src/types";

export default class API<RowT> {
  dataTable: DataTable<RowT>;

  constructor(dataTable: DataTable<RowT>) {
    this.dataTable = dataTable;

    // Make DataTable.doTotalHitsQuery() a noop because ARCH API responses include
    // a 'count' property, which we will use to manually update the DataTable hit
    // count in DataTableAPIAdapter.get().
    dataTable.doTotalHitsQuery = () => new Promise(() => null);

    // Override DataTable.getHitsOrDistinctQueryApiPath(), which having already
    // noop'd doTotalHitsQuery() will only ever be called for distinct filter values,
    // to query a dedicated, collection-specific filter option endpoint instead of
    // the same endpoint as is used to retrieve the collection objects but with the
    // addition of the distinct={fieldName} query param so that we don't need to
    // implement a polymorphic response type on the collection object endpoints.

    dataTable.getHitsOrDistinctQueryApiPath = (extraParams = {}) => {
      const field = extraParams.distinct;
      const { apiCollectionEndpoint } = dataTable.props;
      return `${apiCollectionEndpoint}/filter_values?field=${field}`;
    };
  }

  updateNumHits(response: FilteredApiResponse<RowT>) {
    const { count, opted_out_count: hiddenCount } = response;
    const { dataTable } = this;
    const { selectable } = dataTable.props;
    const { search } = dataTable.state;
    search.numHits = count;
    if (selectable) {
      const { selectAllCheckbox } = dataTable.refs;
      selectAllCheckbox.numHits = count;
    }
    this.updatePaginator(hiddenCount ?? 0);
  }

  updatePaginator(hiddenCount: number) {
    /*
     * Override default DataTable.updatePaginator to include hidden count link.
     */
    const { dataTable } = this;
    const { singleName, pluralName } = dataTable.props;
    const { limit, numHits, pageNum } = dataTable.state.search;
    const start = (pageNum - 1) * limit + 1;
    const showingElChildren: Array<string | HTMLElement> = [
      `${singleName} List (${numHits ? start : 0} to ${Math.min(
        numHits,
        start + limit - 1
      )} of ${numHits} ${pluralName}`,
      ")",
    ];

    if (hiddenCount > 0) {
      // Look up any defined hidden items URL path, log a warning and abort if none exists.
      const hiddenItemsPath = (Paths as Record<string, ValueOf<typeof Paths>>)[
        `hidden${pluralName}`
      ] as string | undefined;
      if (hiddenItemsPath === undefined) {
        console.warn(`No lib.helpers.Paths item found for: ${pluralName}`);
      } else {
        const hiddenItemsUrl = new URL(window.location.href);
        hiddenItemsUrl.pathname = hiddenItemsPath;
        showingElChildren.splice(
          1,
          0,
          ", ",
          createElement("a", {
            href: hiddenItemsUrl.href,
            style:
              "font-size: 0.75em; color: #664d03; text-decoration: underline; cursor: pointer;",
            title:
              "View the " +
              (hiddenCount === 1
                ? `hidden ${singleName} that matches`
                : `${hiddenCount} hidden ${pluralName} that match`) +
              " this search",
            target: "_blank",
            textContent: `${hiddenCount} hidden`,
          })
        );
      }
    }

    const showingEl = createElement("span", {
      className: "showing",
      children: showingElChildren,
    });
    void dataTable.updatePaginator(showingEl);
  }

  async get(apiPath: string) {
    // Create a URL from the relative API path.
    const url = new URL(apiPath, window.location.origin);
    const { searchParams } = url;

    // Remove unsupported params.
    searchParams.delete("search_fields");

    // Remove limit=-1
    if (searchParams.get("limit") === "-1") {
      searchParams.delete("limit");
    }

    // Replace te Django-style {field}__in={csv} params with discrete
    // {field}={value} params.
    Array.from(searchParams.keys())
      .filter((k) => k.endsWith("__in"))
      .forEach((k) => {
        const finalK = k.slice(0, k.length - 4);
        (searchParams.get(k) as string)
          .split(",")
          .forEach((v) => searchParams.append(finalK, v));
        searchParams.delete(k);
      });

    // Extract the final API path.
    apiPath = url.href.slice(url.origin.length);

    // Make the request.
    const response = (await (
      await fetch(`${this.dataTable.props.apiBaseUrl}${apiPath}`, {
        credentials: "same-origin",
        headers: {
          accept: "application/json",
        },
      })
    ).json()) as FilteredApiResponse<RowT>;

    // Determine whether we should update the hit count with the
    // response from this query.
    const shouldUpdateNumHits =
      // Not a single record query (e.g. polling of dataset in active state)
      !searchParams.has("id") &&
      // Not a field facet values query.
      !url.pathname.endsWith("/filter_values");

    // If request was not a facets query, update the dataTable hit counts.
    if (shouldUpdateNumHits) {
      this.updateNumHits(response);
    }

    // The DataTable expects a Response-type object, for which json() will
    // return the requested object, i.e. the 'results' part of the ARCH API
    // response. So let's give it what it wants.
    return {
      json: () => Promise.resolve(response.items),
    };
  }
}
