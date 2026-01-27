import{i as t,_ as e,e as a,a as s}from"./chunk-query-assigned-elements.js";import{t as i}from"./chunk-state.js";import{A as o}from"./chunk-arch-data-table.js";import{B as l,E as n}from"./chunk-constants.js";import{P as r,c as d,a as h,i as c,b as m}from"./chunk-helpers.js";import"./chunk-focusable.js";import"./chunk-styles.js";import"./arch-loading-indicator.js";import"./arch-hover-tooltip.js";import"./chunk-scale-large.js";import"./chunk-sp-overlay.js";var p=[t`
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
      width: 6em;
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
  `];let u=class extends o{constructor(){super(...arguments),this.showHidden=!1,this.columnNameHeaderTooltipMap={category:"Dataset categories are Collection, Network, Text, and File Format",sample:"Sample datasets contain only the first 100 available records from a collection"}}renderNameCell(t,e){var a;const{showHidden:s}=this;if(e.state!==r.FINISHED)return e.name;const i=s&&(null===(a=e.user_settings)||void 0===a?void 0:a.opt_out);return d("a",{href:h.dataset(e.id),children:[d("span",{classList:["highlightable",i?"hidden-by":""],textContent:e.name,title:i?"This dataset is hidden directly via user settings":""})]})}renderCollectionCell(t,e){const{showHidden:a}=this,s=a&&e.collection_opted_out,i=d("span",{classList:["highlightable",s?"hidden-by":"",e.collection_access?"":"no-collection-access"],textContent:t.toString(),title:[s?"This dataset is hidden because its collection is hidden via user settings":"",e.collection_access?"":"You are not authorized to access this collection"].filter(Boolean).join(" and ")});return e.collection_access?d("a",{href:h.collection(e.collection_id),children:[i]}):i}willUpdate(t){super.willUpdate(t);const{showHidden:e}=this;this.apiCollectionEndpoint="/datasets",this.apiItemResponseIsArray=!0,this.apiItemTemplate="/datasets?id=:id",this.itemPollPredicate=t=>c(t.state),this.itemPollPeriodSeconds=3,e&&(this.apiStaticParamPairs=[["opted_out","true"]]),this.cellRenderers=[this.renderNameCell.bind(this),t=>t,this.renderCollectionCell.bind(this),t=>l[t.toString()],t=>n[t],t=>m(t),t=>null===t?"":m(t)],this.columnFilterDisplayMaps=[void 0,void 0,void 0,l],this.columns=["name","category_name","collection_name","is_sample","state","start_time","finished_time"],this.columnHeaders=["Dataset","Category","Collection","Sample","State","Started","Finished"],this.filterableColumns=[!0,!0,!0,!0,!0,!1,!1],this.noResultsMessage=d("i",{children:e?["You have no hidden datasets."]:["No datasets have been generated. ",d("a",{href:"/datasets/generate",textContent:"Generate a new dataset"})]}),this.searchColumns=["name","category_name","collection_name","state"],this.searchColumnLabels=["Name","Category","Collection","State"],this.singleName="Dataset",this.sort="-start_time",this.sortableColumns=[!0,!0,!0,!0,!0,!0,!0],this.persistSearchStateInUrl=!0,this.pluralName="Datasets"}};u.styles=[...o.styles,...p],e([a({type:Boolean,attribute:"show-hidden"})],u.prototype,"showHidden",void 0),e([i()],u.prototype,"columnNameHeaderTooltipMap",void 0),u=e([s("arch-dataset-explorer-table")],u);export{u as ArchDatasetExplorerTable};
//# sourceMappingURL=arch-dataset-explorer-table.js.map
