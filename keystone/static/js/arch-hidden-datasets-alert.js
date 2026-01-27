import{i as e,_ as t,e as s,y as i,a as o}from"./chunk-query-assigned-elements.js";import{ArchAlert as a,AlertClass as n}from"./arch-alert.js";import"./chunk-styles.js";let r=class extends a{constructor(){super(...arguments),this.alertClass=n.Info,this.nonDismissable=!0,this.message=i`
    You are viewing your hidden datasets. Datasets in this view are hidden
    directly or by collection, as indicated by <i class="hidden-icon"></i>.
    Click on the "Settings" button for each collection or dataset below to
    manage its visibility.
  `}};r.styles=[...a.styles,e`
      i.hidden-icon::before {
        content: var(--hidden-icon-content, "");
        display: inline-block;
        width: 1rem;
        opacity: 0.5;
      }
    `],t([s()],r.prototype,"alertClass",void 0),t([s()],r.prototype,"nonDismissable",void 0),t([s()],r.prototype,"message",void 0),r=t([o("arch-hidden-datasets-alert")],r);export{r as ArchHiddenDatasetsAlert};
//# sourceMappingURL=arch-hidden-datasets-alert.js.map
