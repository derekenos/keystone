import{i as t,_ as o,e,s,y as l,a as i}from"./chunk-query-assigned-elements.js";import{t as a}from"./chunk-state.js";import{A as c}from"./chunk-ArchAPI.js";import{a as n,h as r}from"./chunk-helpers.js";import"./chunk-arch-card.js";import"./arch-loading-indicator.js";import{g as d,c as h}from"./chunk-styles.js";import"./chunk-constants.js";import"./arch-tooltip.js";import"./chunk-scale-large.js";import"./chunk-focusable.js";import"./chunk-sp-overlay.js";var m,u=[d,h,t`
    thead > tr.hidden-header {
      color: transparent;
    }

    th.size,
    th.num-datasets {
      text-align: right;
    }

    th.size {
      width: 7rem;
    }

    th.num-datasets {
      width: 10rem;
    }

    td.name {
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow-x: hidden;
    }

    td.size,
    td.num-datasets {
      text-align: right;
    }
  `];let p=m=class extends s{constructor(){super(),this.hideCreateCustomCollection=!1,this.numTotalCollections=0,this.collections=void 0,this.initCollections()}render(){const{maxDisplayedCollections:t}=m,{hideCreateCustomCollection:o}=this,e=void 0===this.collections,s=this.numTotalCollections>0;return l`
      <arch-card
        title="Collections"
        ctatext=${e||!s||o?"":"Create Custom Collection"}
        ctahref="${n.buildSubCollection()}"
        ctaTooltipHeader="Custom Collection"
        ctaTooltipText="Combine and filter your collections into a Custom Collection of only the data you need."
        ctaTooltipLearnMoreUrl="https://arch-webservices.zendesk.com/hc/en-us/articles/16107865758228-How-to-create-a-custom-ARCH-collection"
      >
        <div slot="content">
          <table>
            <thead>
              <tr
                class="${e||!s?"hidden-header":""}"
              >
                <th class="name">Collection Name</th>
                <th class="size">Collection Size</th>
                <th class="num-datasets">Generated Datasets</th>
              </tr>
            </thead>
            <tbody>
              ${(()=>{var o;return e?[l`
              <tr>
                <td colspan="3">
                  <arch-loading-indicator></arch-loading-indicator>
                </td>
              </tr>
            `]:s?(null!==(o=this.collections)&&void 0!==o?o:[]).slice(0,t).map((t=>l`
              <tr>
                <td class="name">
                  <a
                    href="/collections/${t.id}"
                    title="${t.name}"
                  >
                    ${t.name}
                  </a>
                </td>
                <td class="size">${r(t)}</td>
                <td class="num-datasets">
                  ${t.dataset_count} Datasets
                </td>
              </tr>
            `)):[l`
              <tr>
                <td colspan="3">
                  <i
                    >No collections found.
                    <a
                      href="https://arch-webservices.zendesk.com/hc/en-us/articles/14795196010772"
                      title="Contact us"
                      >Contact us</a
                    >
                    to access collections or report an error.</i
                  >
                </td>
              </tr>
            `]})()}
            </tbody>
          </table>
        </div>
        <div slot="footer">
          ${e||!s?l``:l`
                <a href="/collections" class="view-all">
                  View
                  ${this.numTotalCollections>t?l`All ${this.numTotalCollections}`:l``}
                  Collections
                </a>
              `}
        </div>
      </arch-card>
    `}async initCollections(){const t=await c.collections.get([["sort","=","-id"],["limit","=",m.maxDisplayedCollections]]);this.numTotalCollections=t.count,this.collections=t.items}};p.maxDisplayedCollections=10,p.styles=u,o([e({type:Boolean,attribute:"hide-create-custom-collection"})],p.prototype,"hideCreateCustomCollection",void 0),o([a()],p.prototype,"numTotalCollections",void 0),o([a()],p.prototype,"collections",void 0),p=m=o([i("arch-collections-card")],p);export{p as ArchCollectionsCard};
//# sourceMappingURL=arch-collections-card.js.map
