import{i as t,_ as e,e as a,a as i}from"./chunk-query-assigned-elements.js";import{t as s}from"./chunk-state.js";import{A as o}from"./chunk-arch-data-table.js";import{B as l,E as n}from"./chunk-constants.js";import{P as r,c as d,a as c,i as h,b as m}from"./chunk-helpers.js";import"./chunk-arch-cancel-job-button.js";import"./chunk-focusable.js";import"./chunk-styles.js";import"./arch-loading-indicator.js";import"./arch-hover-tooltip.js";import"./chunk-scale-large.js";import"./chunk-sp-overlay.js";import"./chunk-ArchAPI.js";import"./arch-global-modal.js";import"./chunk-arch-modal.js";import"./chunk-sizedMixin.js";var p=[t`
    data-table {
      min-width: 60rem;
    }

    data-table > table {
      table-layout: fixed;
    }

    data-table > table > thead > tr > th.category {
      width: 8em;
    }

    data-table > table > thead > tr > th.sample {
      width: 7em;
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

    data-table > table > tbody > tr > td .hidden-by::before {
      content: var(--data-table-hidden-icon-content, "");
      display: inline-block;
      width: 1rem;
      opacity: 0.5;
      margin-right: 0.4rem;
      cursor: help;
    }

    data-table > table > tbody > tr.no-results > td {
      font-weight: normal;
    }

    span.no-collection-access {
      cursor: not-allowed;
      text-decoration: underline;
    }
  `];let u=class extends o{constructor(){super(...arguments),this.showHidden=!1,this.hideGenerateDataset=!1,this.columnNameHeaderTooltipMap={category:"Dataset categories are Collection, Network, Text, and File Format",sample:"Sample datasets contain only the first 100 available records from a collection"}}renderNameCell(t,e){var a;const{showHidden:i}=this;if(e.state!==r.FINISHED)return e.name;const s=i&&(null===(a=e.user_settings)||void 0===a?void 0:a.opt_out);return d("a",{href:c.dataset(e.id),children:[d("span",{classList:["highlightable",s?"hidden-by":""],textContent:e.name,title:s?"This dataset is hidden directly via user settings":""})]})}renderCollectionCell(t,e){const{showHidden:a}=this,i=a&&e.collection_opted_out,s=d("span",{classList:["highlightable",i?"hidden-by":"",e.collection_access?"":"no-collection-access"],textContent:t.toString(),title:[i?"This dataset is hidden because its collection is hidden via user settings":"",e.collection_access?"":"You are not authorized to access this collection"].filter(Boolean).join(" and ")});return e.collection_access?d("a",{href:c.collection(e.collection_id),children:[s]}):s}renderStateCell(t,e){const{cancelJobIconUrl:a}=this,i=n[t];return h(e.state)?d("div",{children:[i,d("arch-cancel-job-button",{datasetId:e.id,jobName:e.name,collectionName:e.collection_name,iconStyleButtonUrl:a,style:"vertical-align: middle; margin: 0 0 0.2em 0.5em;"})]}):i}willUpdate(t){super.willUpdate(t);const{hideGenerateDataset:e,showHidden:a}=this;this.apiCollectionEndpoint="/datasets",this.apiItemsTemplateFn=t=>`/datasets?${t.map((t=>`id=${t.id}`)).join("&")}`,this.itemPollPredicate=t=>h(t.state),this.itemPollPeriodSeconds=3,a&&(this.apiStaticParamPairs=[["opted_out","true"]]),this.cellRenderers=[this.renderNameCell.bind(this),t=>t,this.renderCollectionCell.bind(this),t=>l[t.toString()],this.renderStateCell.bind(this),t=>m(t),t=>null===t?"":m(t)],this.columnFilterDisplayMaps=[void 0,void 0,void 0,l],this.columns=["name","category_name","collection_name","is_sample","state","start_time","finished_time"],this.columnHeaders=["Dataset","Category","Collection","Sample","State","Started","Finished"],this.filterableColumns=[!0,!0,!0,!0,!0,!1,!1],this.noResultsMessage=d("i",{children:a?["You have no hidden datasets."]:["No datasets have been generated. ",e?"":d("a",{href:"/datasets/generate",textContent:"Generate a new dataset"})]}),this.searchColumns=["name","category_name","collection_name","state"],this.searchColumnLabels=["Name","Category","Collection","State"],this.singleName="Dataset",this.sort="-start_time",this.sortableColumns=[!0,!0,!0,!0,!0,!0,!0],this.persistSearchStateInUrl=!0,this.pluralName="Datasets"}};u.styles=[...o.styles,...p],e([a({type:Boolean,attribute:"show-hidden"})],u.prototype,"showHidden",void 0),e([a({type:Boolean,attribute:"hide-generate-dataset"})],u.prototype,"hideGenerateDataset",void 0),e([a({type:String,attribute:"cancel-job-icon-url"})],u.prototype,"cancelJobIconUrl",void 0),e([s()],u.prototype,"columnNameHeaderTooltipMap",void 0),u=e([i("arch-dataset-explorer-table")],u);export{u as ArchDatasetExplorerTable};
//# sourceMappingURL=arch-dataset-explorer-table.js.map
