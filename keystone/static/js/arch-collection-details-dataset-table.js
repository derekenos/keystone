import{i as t,_ as e,e as a,a as s}from"./chunk-query-assigned-elements.js";import{t as i}from"./chunk-state.js";import{A as o}from"./chunk-arch-data-table.js";import{B as l,E as n}from"./chunk-constants.js";import{P as r,c,a as d,i as h,b as m}from"./chunk-helpers.js";import{T as p}from"./chunk-pubsub.js";import"./chunk-focusable.js";import"./chunk-styles.js";import"./arch-loading-indicator.js";import"./arch-hover-tooltip.js";import"./chunk-scale-large.js";import"./chunk-sp-overlay.js";var u,b=[t`
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

    data-table > table > tbody > tr.no-results > td {
      font-weight: normal;
    }
  `];let y=u=class extends o{constructor(){super(...arguments),this.isOptedOutCollection=!1,this.isEmptyCollection=!1,this.columnNameHeaderTooltipMap={category:"Dataset categories are Collection, Network, Text, and File Format",sample:"Sample datasets contain only the first 100 available records from a collection"}}static renderDatasetCell(t,e){return e.state!==r.FINISHED?e.name:c("a",{href:d.dataset(e.id),children:[c("span",{className:"highlightable",textContent:e.name})]})}willUpdate(t){super.willUpdate(t);const{isEmptyCollection:e,isOptedOutCollection:a}=this;this.apiCollectionEndpoint="/datasets",this.apiItemResponseIsArray=!0,this.apiItemTemplate="/datasets?id=:id",this.itemPollPredicate=t=>h(t.state),this.itemPollPeriodSeconds=3,this.apiStaticParamPairs=[["collection_id",`${this.collectionId}`]],a&&this.apiStaticParamPairs.push(["opted_out","true"]),this.cellRenderers=[u.renderDatasetCell,t=>t,t=>l[t.toString()],t=>n[t],t=>m(t),t=>null===t?"":m(t)],this.columnFilterDisplayMaps=[void 0,void 0,l],this.columns=["name","category_name","is_sample","state","start_time","finished_time"],this.columnHeaders=["Dataset","Category","Sample","State","Started","Finished"],this.filterableColumns=[!0,!0,!0,!0,!1,!1],this.singleName="Dataset",this.sort="-start_time",this.sortableColumns=[!0,!0,!0,!0,!0,!0],this.persistSearchStateInUrl=!0,this.pluralName="Datasets",e||a?(this.nonSelectionActionLabels=[],this.nonSelectionActions=[],this.noResultsMessage=e?"No datasets can be generated from this empty collection.":"No datasets have been generated from this collection."):(this.nonSelectionActionLabels=["Generate a New Dataset"],this.nonSelectionActions=[p.GENERATE_DATASET],this.noResultsMessage=c("span",{children:["No datasets have been generated from this collection. ",c("a",{href:`/datasets/generate?cid=${this.collectionId}`,textContent:"Generate a new dataset"})]}))}nonSelectionActionHandler(t){if(t===p.GENERATE_DATASET)window.location.href=d.generateCollectionDataset(this.collectionId)}};y.styles=[...o.styles,...b],e([a({type:Number})],y.prototype,"collectionId",void 0),e([a({type:Boolean})],y.prototype,"isOptedOutCollection",void 0),e([a({type:Boolean})],y.prototype,"isEmptyCollection",void 0),e([i()],y.prototype,"columnNameHeaderTooltipMap",void 0),y=u=e([s("arch-collection-details-dataset-table")],y);export{y as ArchCollectionDetailsDatasetTable};
//# sourceMappingURL=arch-collection-details-dataset-table.js.map
