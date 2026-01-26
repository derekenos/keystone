import{i as t,_ as e,e as a,a as s}from"./chunk-query-assigned-elements.js";import{A as o}from"./chunk-arch-data-table.js";import{C as i}from"./chunk-constants.js";import{c as l,C as n,P as c,a as r,i as d,b as h,h as m,j as p}from"./chunk-helpers.js";import{T as u}from"./chunk-pubsub.js";import"./chunk-state.js";import"./chunk-focusable.js";import"./chunk-styles.js";import"./arch-loading-indicator.js";import"./arch-hover-tooltip.js";import"./chunk-scale-large.js";import"./chunk-sp-overlay.js";var b,C=[t`
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
  `];let y=b=class extends o{constructor(){super(...arguments),this.showHidden=!1}static renderNameCell(t,e){const a=l("span",{className:"highlightable",textContent:e.name});if(e.collection_type===n.CUSTOM&&e.metadata.state!==c.FINISHED){a.title="This Custom collection is in the process of being created";const t=e.metadata.state,s=t===c.RUNNING?"CREATING":t;return a.appendChild(l("i",{textContent:` (${s})`})),a}return l("a",{href:`/collections/${e.id}`,title:e.name,children:[a]})}static renderLatestDatasetCell(t,e){return e.latest_dataset?l("a",{href:r.dataset(e.latest_dataset.id),title:t,textContent:t}):""}willUpdate(t){super.willUpdate(t);const{showHidden:e}=this;e||(this.actionButtonLabels=["Generate Dataset","Create Custom Collection"],this.actionButtonSignals=[u.GENERATE_DATASET,u.CREATE_SUB_COLLECTION],this.actionButtonDisabledTitles=["Select a single collection below to generate a dataset","Select one or more of the Archive-It, Custom, or Special-type collections below to create a custom collection"]),this.apiCollectionEndpoint="/collections",this.apiItemResponseIsArray=!0,this.apiItemTemplate="/collections?id=:id",e&&(this.apiStaticParamPairs=[["opted_out","true"]]),this.itemPollPredicate=t=>t.collection_type===n.CUSTOM&&d(t.metadata.state),this.itemPollPeriodSeconds=3,this.cellRenderers=[b.renderNameCell,(t,e)=>{var a;return(null===(a=null==e?void 0:e.metadata)||void 0===a?void 0:a.type_displayname)||i[t]},b.renderLatestDatasetCell,t=>t?h(t):"",(t,e)=>e.collection_type===n.CUSTOM&&e.metadata.state!==c.FINISHED?"":m(e)],this.columns=["name","collection_type","latest_dataset.name","latest_dataset.start_time","size_bytes"],this.columnHeaders=["Name","Type","Latest Dataset","Dataset Date","Size"],this.rowSelectDisabledReasonCallback=t=>{const e=t.metadata;return 0===t.size_bytes?"The collection is empty and can not be used as an input for any actions":(null==e?void 0:e.state)&&d(e.state)?"This custom collection is still in the process of being created":null},this.selectable=!e,this.sort="-id",this.sortableColumns=[!0,!0,!1,!0,!0],this.filterableColumns=[!1,!0],this.noResultsMessage=l("i",{children:["No collections found. ",l("a",{href:"https://arch-webservices.zendesk.com/hc/en-us/articles/14795196010772",textContent:"Contact us"})," to access collections or report an error."]}),this.searchColumns=["name"],this.searchColumnLabels=["Name"],this.singleName="Collection",this.persistSearchStateInUrl=!0,this.pluralName="Collections"}postSelectionChangeHandler(t){const{dataTable:e}=this,{props:a}=e,s=t.length,o=1===s,i=t.every(p);a.actionButtonDisabled=[!o,!i],e.setSelectionActionButtonDisabledState(0===s)}selectionActionHandler(t,e){switch(t){case u.GENERATE_DATASET:window.location.href=r.generateCollectionDataset(e[0].id);break;case u.CREATE_SUB_COLLECTION:window.location.href=r.buildSubCollection(e.map((t=>t.id)))}}};y.styles=[...o.styles,...C],e([a({type:Boolean,attribute:"show-hidden"})],y.prototype,"showHidden",void 0),y=b=e([s("arch-collections-table")],y);export{y as ArchCollectionsTable};
//# sourceMappingURL=arch-collections-table.js.map
