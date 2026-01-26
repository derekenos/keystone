import{_ as t,e as s,a as e,s as a,y as o}from"./chunk-query-assigned-elements.js";import{A as i}from"./chunk-ArchAPI.js";import{g as r}from"./chunk-styles.js";import"./chunk-arch-modal.js";import{A as n}from"./chunk-arch-json-schema-form.js";import"./chunk-helpers.js";import"./chunk-constants.js";import"./chunk-scale-large.js";import"./chunk-focusable.js";import"./chunk-state.js";import"./chunk-sizedMixin.js";import"./chunk-_commonjsHelpers.js";let c=class extends n{constructor(){super(...arguments),this.dataKeyAliasMap={opt_out:"Hide"}}};var p;t([s({type:Object})],c.prototype,"dataKeyAliasMap",void 0),c=t([e("arch-dataset-settings-form")],c);let d=p=class extends a{render(){const{DatasetSettingsSchema:t}=p,{settings:s}=this;return o`
      <arch-modal
        title="Dataset Settings"
        modalSize="l"
        submitButtonText="Save"
        @submit=${this.submit}
      >
        <div slot="content">
          <arch-dataset-settings-form
            .schema=${t}
            .data=${s}
          ></arch-dataset-settings-form>
        </div>
        <button slot="trigger" class="info">Settings</button>
      </arch-modal>
    `}submit(){const{datasetId:t,settings:s}=this;i.datasets.updateUserSettings(t,s)}};d.shadowRootOptions={...a.shadowRootOptions,delegatesFocus:!0},d.styles=r,d.DatasetSettingsSchema={type:"object",required:["opt_out"],properties:{opt_out:{type:"boolean",title:"Hide",description:"Control whether this dataset appears in your list of available datasets."}}},t([s({type:Number})],d.prototype,"datasetId",void 0),t([s({type:Object})],d.prototype,"settings",void 0),d=p=t([e("arch-dataset-settings-button")],d);export{d as ArchDatasetSettingsButton};
//# sourceMappingURL=arch-dataset-settings-button.js.map
