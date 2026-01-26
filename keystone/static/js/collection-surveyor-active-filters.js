import{i as e,_ as t,e as i,s as r,y as s,a}from"./chunk-query-assigned-elements.js";import{E as n}from"./chunk-index.js";import{r as o}from"./chunk-helpers.js";import"./chunk-constants.js";let c=class extends r{constructor(){super(...arguments),this.activeFilters={f_organizationName:[],f_organizationType:[]}}handleRemoveActiveFilter(e,t){this.emitEvent("facet-deselected",{facetFieldName:e,facetName:t})}emitEvent(e,t={}){this.dispatchEvent(n.createEvent(e,t?{detail:t}:{}))}readableFacetFieldName(e){return e.split("_")[1].split(/(?=[A-Z])/).map((e=>e.charAt(0).toUpperCase()+e.slice(1))).join(" ")}render(){return s`
      <div class="active-filters">
        <h4>Active Filters:</h4>
        <ul>
          ${Object.entries(this.activeFilters).map((([e,t])=>s` ${t.length>0?s`
                    ${t.map((t=>s`
                        <li>
                          <strong
                            >${this.readableFacetFieldName(e)}:</strong
                          >
                          ${o(t,e)}
                          <button
                            @click=${()=>this.handleRemoveActiveFilter(e,t)}
                          >
                            remove
                          </button>
                        </li>
                      `))}
                  `:""}`))}
        </ul>
      </div>
    `}};c.styles=e`
    .active-filters {
      padding: 0px 0px 30px 0px;
    }

    button {
      background: none;
      border: none;
      cursor: pointer;
      color: red;
    }
  `,t([i({type:Object})],c.prototype,"activeFilters",void 0),c=t([a("collection-surveyor-active-filters")],c);export{c as CollectionSurveyorActiveFilters};
//# sourceMappingURL=collection-surveyor-active-filters.js.map
