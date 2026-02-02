import{i as t,_ as a,e,s,y as r,a as i}from"./chunk-query-assigned-elements.js";import{t as o}from"./chunk-state.js";import{A as n}from"./chunk-ArchAPI.js";import{a as d,b as l}from"./chunk-helpers.js";import"./chunk-arch-card.js";import"./arch-loading-indicator.js";import{g as c,c as h}from"./chunk-styles.js";import"./chunk-constants.js";import"./arch-tooltip.js";import"./chunk-scale-large.js";import"./chunk-focusable.js";import"./chunk-sp-overlay.js";var m,p=[c,h,t`
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
  `];let u=m=class extends s{constructor(){super(),this.hideGenerateDataset=!1,this.numTotalDatasets=0,this.datasets=void 0,this.initDatasets()}render(){var t,a;const{numTotalDatasets:e,hideGenerateDataset:s}=this,i=void 0===this.datasets,o=(null!==(t=this.datasets)&&void 0!==t?t:[]).length>0,n=null!==(a=this.datasets)&&void 0!==a?a:[];return r`
      <arch-card
        title="Recent Datasets"
        ctatext=${s?"":"Generate New Dataset"}
        ctahref=${s?"":"/datasets/generate"}
      >
        <div slot="content">
          <table>
            <thead>
              <tr class="${i||!o?"hidden-header":""}">
                <th class="name">Dataset</th>
                <th class="collection">Collection Name</th>
                <th class="date">Date Generated</th>
              </tr>
            </thead>
            <tbody>
              ${i?[r`<tr>
              <td colspan="3">
                <arch-loading-indicator></arch-loading-indicator>
              </td>
            </tr>`]:o?n.map((t=>{const a=`${t.name}${t.is_sample?" (Sample)":""}`;return r`
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
                  ${l(t.finished_time)}
                </td>
              </tr>
            `})):[r`<tr class="no-results">
              <td colspan="3">
                <i>
                  No datasets have been generated.
                  ${s?r``:r`
                        <a
                          href="/datasets/generate"
                          title="Generate a new dataset"
                        >
                          Generate a new dataset
                        </a>
                      `}
                </i>
              </td>
            </tr>`]}
            </tbody>
          </table>
        </div>
        <div slot="footer">
          ${i||!o?r``:r`
                <a href="/datasets/explore" class="view-all">
                  View
                  ${n.length<e?r`All ${e}`:r``}
                  Datasets
                </a>
              `}
        </div>
      </arch-card>
    `}async initDatasets(){const t=await n.datasets.get([["state","=","FINISHED"],["sort","=","-start_time"],["limit","=",m.maxDisplayedDatasets]]);this.numTotalDatasets=t.count,this.datasets=t.items}};u.maxDisplayedDatasets=10,u.styles=p,a([e({type:Boolean,attribute:"hide-generate-dataset"})],u.prototype,"hideGenerateDataset",void 0),a([o()],u.prototype,"numTotalDatasets",void 0),a([o()],u.prototype,"datasets",void 0),u=m=a([i("arch-recent-datasets-card")],u);export{u as ArchRecentDatasetsCard};
//# sourceMappingURL=arch-recent-datasets-card.js.map
