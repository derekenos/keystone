import{i as t,_ as e,e as s,y as i,a as o}from"./chunk-query-assigned-elements.js";import{ArchAlert as a,AlertClass as n}from"./arch-alert.js";import"./chunk-styles.js";let r=class extends a{constructor(){super(...arguments),this.alertClass=n.Info,this.nonDismissable=!0}connectedCallback(){super.connectedCallback();const{hiddenIconUrl:t}=this;this.message=i`
      You are viewing your hidden datasets. Datasets in this view are hidden
      directly or by collection, as indicated by
      <img src=${t} alt="not visible icon" />. Click on the
      "Settings" button for each collection or dataset below to manage its
      visibility.
    `}};r.styles=[...a.styles,t`
      img {
        width: 1rem;
        opacity: 0.5;
      }
    `],e([s()],r.prototype,"alertClass",void 0),e([s()],r.prototype,"nonDismissable",void 0),e([s({type:String,attribute:"hidden-icon"})],r.prototype,"hiddenIconUrl",void 0),r=e([o("arch-hidden-datasets-alert")],r);export{r as ArchHiddenDatasetsAlert};
//# sourceMappingURL=arch-hidden-datasets-alert.js.map
