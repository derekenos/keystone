import{i as t,_ as e,e as a,a as s}from"./chunk-query-assigned-elements.js";import{A as i,a as l}from"./chunk-arch-data-table.js";import{c as o,C as n,P as r,a as c,i as d,j as h,b as m,g as p,k as u}from"./chunk-helpers.js";import{T as b}from"./chunk-pubsub.js";import"./chunk-state.js";import"./chunk-focusable.js";import"./chunk-styles.js";import"./arch-loading-indicator.js";import"./arch-hover-tooltip.js";import"./chunk-scale-large.js";import"./chunk-sp-overlay.js";var C,S=[t`
    data-table > table {
      table-layout: fixed;
    }

    data-table > table > thead > tr > th.type {
      width: 7em;
    }

    data-table > table > thead > tr > th.dataset-date {
      width: 7em;
    }

    data-table > table > thead > tr > th.size {
      width: 7em;
    }

    data-table > table > thead > tr > th {
      max-width: none;
    }
  `];class w extends l{updateNumHits(t){super.updateNumHits(t);const{opted_out_count:e}=t;if(null==e||0===e)return;const{dataTable:a}=this,s=(null==a?void 0:a.querySelector("div.paginator-wrapper")).children[0],i=s.textContent,l=new URL(window.location.href);l.pathname="/hidden-collections";const o="View the "+(1===e?"hidden collection that matches":`${e} hidden collections that match`)+" this search";s.innerHTML=`${i.slice(0,i.length-1)}, <a href="${l.href}" target="_blank" title="${o}" style="font-size: 0.75em; color: #664d03; text-decoration: underline; cursor: pointer;">${e} hidden</a>)`}}let y=C=class extends i{constructor(){super(),this.showHidden=!1,this.apiFactory=w}static renderNameCell(t,e){const a=o("span",{className:"highlightable",textContent:e.name});if(e.collection_type===n.CUSTOM&&e.metadata.state!==r.FINISHED){a.title="This Custom collection is in the process of being created";const t=e.metadata.state,s=t===r.RUNNING?"CREATING":t;return a.appendChild(o("i",{textContent:` (${s})`})),a}return o("a",{href:`/collections/${e.id}`,title:e.name,children:[a]})}static renderLatestDatasetCell(t,e){return null===t?"":o("a",{href:c.dataset(e.latest_dataset.id),title:t.toString(),textContent:t.toString()})}willUpdate(t){super.willUpdate(t);const{showHidden:e}=this;e||(this.actionButtonLabels=["Generate Dataset","Create Custom Collection"],this.actionButtonSignals=[b.GENERATE_DATASET,b.CREATE_SUB_COLLECTION],this.actionButtonDisabledTitles=["Select a single collection below to generate a dataset","Select one or more of the Archive-It, Custom, or Special-type collections below to create a custom collection"]),this.apiCollectionEndpoint="/collections",this.apiItemResponseIsArray=!0,this.apiItemTemplate="/collections?id=:id",e&&(this.apiStaticParamPairs=[["opted_out","true"]]),this.itemPollPredicate=t=>t.collection_type===n.CUSTOM&&d(t.metadata.state),this.itemPollPeriodSeconds=3,this.cellRenderers=[C.renderNameCell,(t,e)=>{var a;return(null===(a=null==e?void 0:e.metadata)||void 0===a?void 0:a.type_displayname)||h[t]},C.renderLatestDatasetCell,t=>t?m(t):"",(t,e)=>e.collection_type===n.CUSTOM&&e.metadata.state!==r.FINISHED?"":p(e)],this.columns=["name","collection_type","latest_dataset.name","latest_dataset.start_time","size_bytes"],this.columnHeaders=["Name","Type","Latest Dataset","Dataset Date","Size"],this.rowSelectDisabledCallback=t=>{const e=t.metadata;return(null==e?void 0:e.state)&&d(e.state)},this.selectable=!e,this.sort="-id",this.sortableColumns=[!0,!0,!1,!0,!0],this.filterableColumns=[!1,!0],this.searchColumns=["name"],this.searchColumnLabels=["Name"],this.singleName="Collection",this.persistSearchStateInUrl=!0,this.pluralName="Collections"}postSelectionChangeHandler(t){const{dataTable:e}=this,{props:a}=e,s=t.length,i=1===s,l=t.every(u);a.actionButtonDisabled=[!i,!l],e.setSelectionActionButtonDisabledState(0===s)}selectionActionHandler(t,e){switch(t){case b.GENERATE_DATASET:window.location.href=c.generateCollectionDataset(e[0].id);break;case b.CREATE_SUB_COLLECTION:window.location.href=c.buildSubCollection(e.map((t=>t.id)))}}};y.styles=[...i.styles,...S],e([a({type:Boolean,attribute:"show-hidden"})],y.prototype,"showHidden",void 0),y=C=e([s("arch-collections-table")],y);export{y as ArchCollectionsTable};
//# sourceMappingURL=arch-collections-table.js.map
