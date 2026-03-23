import{i as t,_ as e,e as a,a as i}from"./chunk-query-assigned-elements.js";import{t as o}from"./chunk-state.js";import{A as s}from"./chunk-arch-data-table.js";import{B as l,E as n}from"./chunk-constants.js";import{P as r,c,a as d,i as h,b as m}from"./chunk-helpers.js";import{T as p}from"./chunk-pubsub.js";import"./chunk-arch-cancel-job-button.js";import"./chunk-focusable.js";import"./chunk-styles.js";import"./arch-loading-indicator.js";import"./arch-hover-tooltip.js";import"./chunk-scale-large.js";import"./chunk-sp-overlay.js";import"./chunk-ArchAPI.js";import"./arch-global-modal.js";import"./chunk-arch-modal.js";import"./chunk-sizedMixin.js";var u,b=[t`
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
  `];let y=u=class extends s{constructor(){super(...arguments),this.hideGenerateDataset=!1,this.isOptedOutCollection=!1,this.columnNameHeaderTooltipMap={category:"Dataset categories are Collection, Network, Text, and File Format",sample:"Sample datasets contain only the first 100 available records from a collection"}}static renderDatasetCell(t,e){return e.state!==r.FINISHED?e.name:c("a",{href:d.dataset(e.id),children:[c("span",{className:"highlightable",textContent:e.name})]})}renderStateCell(t,e){const{cancelJobIconUrl:a}=this,i=n[t];return h(e.state)?c("div",{children:[i,c("arch-cancel-job-button",{datasetId:e.id,jobName:e.name,collectionName:e.collection_name,iconStyleButtonUrl:a,style:"vertical-align: middle; margin: 0 0 0.2em 0.5em;"})]}):i}willUpdate(t){super.willUpdate(t);const{hideGenerateDataset:e,isOptedOutCollection:a}=this;this.apiCollectionEndpoint="/datasets",this.apiItemsTemplateFn=t=>`/datasets?${t.map((t=>`id=${t.id}`)).join("&")}`,this.itemPollPredicate=t=>h(t.state),this.itemPollPeriodSeconds=3,this.apiStaticParamPairs=[["collection_id",`${this.collectionId}`]],a&&this.apiStaticParamPairs.push(["opted_out","true"]),this.cellRenderers=[u.renderDatasetCell,t=>t,t=>l[t.toString()],this.renderStateCell.bind(this),t=>m(t),t=>null===t?"":m(t)],this.columnFilterDisplayMaps=[void 0,void 0,l],this.columns=["name","category_name","is_sample","state","start_time","finished_time"],this.columnHeaders=["Dataset","Category","Sample","State","Started","Finished"],this.filterableColumns=[!0,!0,!0,!0,!1,!1],e||(this.nonSelectionActionLabels=["Generate a New Dataset"],this.nonSelectionActions=[p.GENERATE_DATASET]),this.noResultsMessage=c("span",{children:["No datasets have been generated from this collection. ",e?"":c("a",{href:`/datasets/generate?cid=${this.collectionId}`,textContent:"Generate a new dataset"})]}),this.singleName="Dataset",this.sort="-start_time",this.sortableColumns=[!0,!0,!0,!0,!0,!0],this.persistSearchStateInUrl=!0,this.pluralName="Datasets"}nonSelectionActionHandler(t){if(t===p.GENERATE_DATASET)window.location.href=d.generateCollectionDataset(this.collectionId)}};y.styles=[...s.styles,...b],e([a({type:Number})],y.prototype,"collectionId",void 0),e([a({type:Boolean,attribute:"hide-generate-dataset"})],y.prototype,"hideGenerateDataset",void 0),e([a({type:Boolean,attribute:"is-opted-out-collection"})],y.prototype,"isOptedOutCollection",void 0),e([a({type:String,attribute:"cancel-job-icon-url"})],y.prototype,"cancelJobIconUrl",void 0),e([o()],y.prototype,"columnNameHeaderTooltipMap",void 0),y=u=e([i("arch-collection-details-dataset-table")],y);export{y as ArchCollectionDetailsDatasetTable};
//# sourceMappingURL=arch-collection-details-dataset-table.js.map
