import{i as t,_ as a,s as e,y as s,a as r}from"./chunk-query-assigned-elements.js";import{t as i}from"./chunk-state.js";import{A as o}from"./chunk-ArchAPI.js";import{a as d,b as n}from"./chunk-helpers.js";import"./chunk-arch-card.js";import"./arch-loading-indicator.js";import{g as l,c}from"./chunk-styles.js";import"./chunk-scale-large.js";import"./chunk-focusable.js";import"./chunk-sp-overlay.js";var h,m=[l,c,t`
    thead > tr.hidden-header {
      color: transparent;
    }

    th.date {
      width: 8rem;
      text-align: right;
    }

    td.name,
    td.collection {
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow-x: hidden;
    }

    td.date {
      text-align: right;
    }
  `];let p=h=class extends e{constructor(){super(),this.numTotalDatasets=0,this.datasets=void 0,this.initDatasets()}render(){var t,a;const{numTotalDatasets:e}=this,r=void 0===this.datasets,i=(null!==(t=this.datasets)&&void 0!==t?t:[]).length>0,o=null!==(a=this.datasets)&&void 0!==a?a:[];return s`
      <arch-card
        title="Recent Datasets"
        ctatext="Generate New Dataset"
        ctahref="/datasets/generate"
      >
        <div slot="content">
          <table>
            <thead>
              <tr class="${r||!i?"hidden-header":""}">
                <th class="name">Dataset</th>
                <th class="collection">Collection Name</th>
                <th class="date">Date Generated</th>
              </tr>
            </thead>
            <tbody>
              ${r?[s`<tr>
              <td colspan="3">
                <arch-loading-indicator></arch-loading-indicator>
              </td>
            </tr>`]:i?o.map((t=>{const a=`${t.name}${t.is_sample?" (Sample)":""}`;return s`
              <tr>
                <td class="name">
                  <a href="${d.dataset(t.id)}" title="${a}">
                    ${a}
                  </a>
                </td>
                <td class="collection" title="${t.collection_name}">
                  ${t.collection_name}
                </td>
                <td class="date">
                  ${n(t.finished_time)}
                </td>
              </tr>
            `})):[s`<tr class="no-results">
              <td colspan="3">
                <i>
                  No datasets have been generated.
                  <a href="/datasets/generate" title="Generate a new dataset">
                    Generate a new dataset
                  </a>
                </i>
              </td>
            </tr>`]}
            </tbody>
          </table>
        </div>
        <div slot="footer">
          ${r||!i?s``:s`
                <a href="/datasets/explore" class="view-all">
                  View
                  ${o.length<e?s`All ${e}`:s``}
                  Datasets
                </a>
              `}
        </div>
      </arch-card>
    `}async initDatasets(){const t=await o.datasets.get([["state","=","FINISHED"],["sort","=","-start_time"],["limit","=",h.maxDisplayedDatasets]]);this.numTotalDatasets=t.count,this.datasets=t.items}};p.maxDisplayedDatasets=10,p.styles=m,a([i()],p.prototype,"numTotalDatasets",void 0),a([i()],p.prototype,"datasets",void 0),p=h=a([r("arch-recent-datasets-card")],p);export{p as ArchRecentDatasetsCard};
//# sourceMappingURL=arch-recent-datasets-card.js.map
