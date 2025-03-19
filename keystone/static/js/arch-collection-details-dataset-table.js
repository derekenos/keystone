import{i as t,_ as e,e as a,a as s}from"./chunk-lit-element.js";import{t as i}from"./chunk-state.js";import{A as l}from"./chunk-arch-data-table.js";import{P as o,c as r,a as n,i as h,B as d,E as c,b as m}from"./chunk-helpers.js";import{T as p}from"./chunk-pubsub.js";import"./chunk-styles.js";import"./arch-loading-indicator.js";import"./arch-hover-tooltip.js";import"./chunk-scale-large.js";import"./chunk-sp-overlay.js";var b,u=[t`
    data-table > table {
      table-layout: fixed;
    }

    data-table > table > thead > tr > th.category {
      width: 7em;
    }

    data-table > table > thead > tr > th.sample {
      width: 6em;
    }

    data-table > table > thead > tr > th.state {
      width: 7em;
    }

    data-table > table > thead > tr > th.started {
      width: 9em;
    }

    data-table > table > thead > tr > th.finished {
      width: 9em;
    }

    data-table > table > thead > tr > th {
      max-width: none;
    }
  `];let y=b=class extends l{constructor(){super(...arguments),this.columnNameHeaderTooltipMap={category:"Dataset categories are Collection, Network, Text, and File Format",sample:"Sample datasets contain only the first 100 available records from a collection"}}static renderDatasetCell(t,e){return e.state!==o.FINISHED?e.name:r("a",{href:n.dataset(e.id),children:[r("span",{className:"highlightable",textContent:e.name})]})}willUpdate(t){super.willUpdate(t),this.apiCollectionEndpoint="/datasets",this.apiItemResponseIsArray=!0,this.apiItemTemplate="/datasets?id=:id",this.itemPollPredicate=t=>h(t.state),this.itemPollPeriodSeconds=3,this.apiStaticParamPairs=[["collection_id",`${this.collectionId}`]],this.cellRenderers=[b.renderDatasetCell,t=>t,t=>d[t.toString()],t=>c[t],t=>m(t),t=>null===t?"":m(t)],this.columnFilterDisplayMaps=[void 0,void 0,d],this.columns=["name","category_name","is_sample","state","start_time","finished_time"],this.columnHeaders=["Dataset","Category","Sample","State","Started","Finished"],this.filterableColumns=[!0,!0,!0,!0,!1,!1],this.nonSelectionActionLabels=["Generate a New Dataset"],this.nonSelectionActions=[p.GENERATE_DATASET],this.singleName="Dataset",this.sort="-start_time",this.sortableColumns=[!0,!0,!0,!0,!0,!0],this.persistSearchStateInUrl=!0,this.pluralName="Datasets"}nonSelectionActionHandler(t){if(t===p.GENERATE_DATASET)window.location.href=n.generateCollectionDataset(this.collectionId)}};y.styles=[...l.styles,...u],e([a({type:Number})],y.prototype,"collectionId",void 0),e([i()],y.prototype,"columnNameHeaderTooltipMap",void 0),y=b=e([s("arch-collection-details-dataset-table")],y);export{y as ArchCollectionDetailsDatasetTable};
//# sourceMappingURL=arch-collection-details-dataset-table.js.map
