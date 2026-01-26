import{i as t,_ as e,e as a,a as i}from"./chunk-query-assigned-elements.js";import{t as s}from"./chunk-state.js";import{A as o}from"./chunk-arch-data-table.js";import{P as l,c as n,a as r,i as d,B as h,E as c,b as m}from"./chunk-helpers.js";import"./chunk-focusable.js";import"./chunk-styles.js";import"./arch-loading-indicator.js";import"./arch-hover-tooltip.js";import"./chunk-scale-large.js";import"./chunk-sp-overlay.js";var p=[t`
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

    data-table > table > tbody > tr > td img.hidden-icon {
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
  `];let u=class extends o{constructor(){super(...arguments),this.showHidden=!1,this.hiddenIconUrl="",this.columnNameHeaderTooltipMap={category:"Dataset categories are Collection, Network, Text, and File Format",sample:"Sample datasets contain only the first 100 available records from a collection"}}renderNameCell(t,e){var a;const{hiddenIconUrl:i,showHidden:s}=this;if(e.state!==l.FINISHED)return e.name;const o=document.createElement("div");return s&&(null===(a=e.user_settings)||void 0===a?void 0:a.opt_out)&&o.appendChild(n("img",{className:"hidden-icon",src:i,title:"This dataset is hidden directly via user settings"})),o.appendChild(n("a",{href:r.dataset(e.id),children:[n("span",{className:"highlightable",textContent:e.name})]})),o}renderCollectionCell(t,e){const{hiddenIconUrl:a,showHidden:i}=this,s=n("span",{className:"highlightable",textContent:t.toString()});if(!e.collection_access)return s.classList.add("no-collection-access"),s.title="You are not authorized to access this collection",s;const o=document.createElement("div");return i&&e.collection_opted_out&&o.appendChild(n("img",{className:"hidden-icon",src:a,title:"This dataset is hidden as a result of its collection being hidden via user settings"})),o.appendChild(n("a",{href:r.collection(e.collection_id),children:[s]})),o}willUpdate(t){super.willUpdate(t);const{showHidden:e}=this;this.apiCollectionEndpoint="/datasets",this.apiItemResponseIsArray=!0,this.apiItemTemplate="/datasets?id=:id",this.itemPollPredicate=t=>d(t.state),this.itemPollPeriodSeconds=3,e&&(this.apiStaticParamPairs=[["opted_out","true"]]),this.cellRenderers=[this.renderNameCell.bind(this),t=>t,this.renderCollectionCell.bind(this),t=>h[t.toString()],t=>c[t],t=>m(t),t=>null===t?"":m(t)],this.columnFilterDisplayMaps=[void 0,void 0,void 0,h],this.columns=["name","category_name","collection_name","is_sample","state","start_time","finished_time"],this.columnHeaders=["Dataset","Category","Collection","Sample","State","Started","Finished"],this.filterableColumns=[!0,!0,!0,!0,!0,!1,!1],this.noResultsMessage=n("i",{children:["No datasets have been generated. ",n("a",{href:"/datasets/generate",textContent:"Generate a new dataset"})]}),this.searchColumns=["name","category_name","collection_name","state"],this.searchColumnLabels=["Name","Category","Collection","State"],this.singleName="Dataset",this.sort="-start_time",this.sortableColumns=[!0,!0,!0,!0,!0,!0,!0],this.persistSearchStateInUrl=!0,this.pluralName="Datasets"}};u.styles=[...o.styles,...p],e([a({type:Boolean,attribute:"show-hidden"})],u.prototype,"showHidden",void 0),e([a({type:String,attribute:"hidden-icon"})],u.prototype,"hiddenIconUrl",void 0),e([s()],u.prototype,"columnNameHeaderTooltipMap",void 0),u=e([i("arch-dataset-explorer-table")],u);export{u as ArchDatasetExplorerTable};
//# sourceMappingURL=arch-dataset-explorer-table.js.map
