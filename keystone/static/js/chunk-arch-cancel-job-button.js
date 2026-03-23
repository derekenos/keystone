import{s as t,i as o,_ as e,e as a,y as r,b as s,a as i}from"./chunk-query-assigned-elements.js";import{t as n}from"./chunk-state.js";import{A as c}from"./chunk-ArchAPI.js";import{g as l}from"./chunk-styles.js";import{ArchGlobalModal as d}from"./arch-global-modal.js";import"./chunk-arch-modal.js";let u=class extends t{constructor(){super(...arguments),this.iconStyleButtonUrl=void 0,this.busy=!1}render(){const{busy:t,jobName:o,collectionName:e,iconStyleButtonUrl:a}=this;this.title=`Cancel creating the '${o}' dataset for your '${e}' collection.`;const i=a?"icon":"danger",n=a?`background-image: url("${a}");`:"";return r`
      <arch-modal
        modalSize="l"
        modalTitle="Cancel Dataset"
        cancelButtonText="No"
        submitButtonText="Yes"
        submitButtonClass="danger"
        @submit=${this.submit.bind(this)}
      >
        <div slot="content">
          Are you sure you want to cancel creating the '${o}' dataset for
          your ‘${e}’ collection?
        </div>
        <button
          slot="trigger"
          class=${i}
          style=${n}
          ?disabled=${t}
        >
          ${a?s:"Cancel"}
        </button>
      </arch-modal>
    `}async submit(t){t.stopPropagation();const{datasetId:o}=this;this.busy=!0;try{await c.datasets.cancel(o)}catch{this.busy=!1,d.showError("Cancel Failed","Could not cancel job. Please try again.",this)}}};u.shadowRootOptions={...t.shadowRootOptions,delegatesFocus:!0},u.styles=[l,o`
      :host {
        display: inline-block;
        overflow: hidden;
      }
      button[slot="trigger"] {
        font-size: var(--button-font-size, inherit);
        padding: var(--button-padding, 0.4rem 1rem);
      }
      button[slot="trigger"].icon {
        width: 1.5em;
        height: 1.5em;
        padding: 0;
        background-color: transparent;
        background-size: contain;
        background-repeat: no-repeat;
        opacity: 0.85;
      }
      button[slot="trigger"].icon:hover {
        background-color: unset;
        opacity: 1;
      }
      button[slot="trigger"][disabled],
      button[slot="trigger"][disabled]:hover,
      button[slot="trigger"][disabled].icon,
      button[slot="trigger"][disabled].icon:hover {
        opacity: 0.5;
      }
      arch-modal {
        white-space: wrap;
      }
    `],e([a({type:Number})],u.prototype,"datasetId",void 0),e([a({type:String})],u.prototype,"jobName",void 0),e([a({type:String})],u.prototype,"collectionName",void 0),e([a({type:String})],u.prototype,"iconStyleButtonUrl",void 0),e([n()],u.prototype,"busy",void 0),u=e([i("arch-cancel-job-button")],u);
//# sourceMappingURL=chunk-arch-cancel-job-button.js.map
