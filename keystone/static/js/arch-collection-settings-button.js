import{_ as t,e as o,a as e,s,y as i}from"./chunk-query-assigned-elements.js";import{A as c}from"./chunk-ArchAPI.js";import{g as n}from"./chunk-styles.js";import"./chunk-arch-modal.js";import{A as r}from"./chunk-arch-json-schema-form.js";import"./chunk-helpers.js";import"./chunk-scale-large.js";import"./chunk-focusable.js";import"./chunk-state.js";import"./chunk-sizedMixin.js";import"./chunk-_commonjsHelpers.js";let l=class extends r{constructor(){super(...arguments),this.dataKeyAliasMap={opt_out:"Hide"}}};var a;t([o({type:Object})],l.prototype,"dataKeyAliasMap",void 0),l=t([e("arch-collection-settings-form")],l);let p=a=class extends s{render(){const{CollectionSettingsSchema:t}=a,{settings:o}=this;return i`
      <arch-modal
        title="Collection Settings"
        modalSize="l"
        submitButtonText="Save"
        @submit=${this.submit}
      >
        <div slot="content">
          <arch-collection-settings-form
            .schema=${t}
            .data=${o}
          ></arch-collection-settings-form>
        </div>
        <button slot="trigger" class="info">Settings</button>
      </arch-modal>
    `}submit(){const{collectionId:t,settings:o}=this;c.collections.updateUserSettings(t,o)}};p.shadowRootOptions={...s.shadowRootOptions,delegatesFocus:!0},p.styles=n,p.CollectionSettingsSchema={type:"object",required:["opt_out"],properties:{opt_out:{type:"boolean",title:"Hide",description:"Control whether this collection appears in your list of available collections."}}},t([o({type:Number})],p.prototype,"collectionId",void 0),t([o({type:Object})],p.prototype,"settings",void 0),p=a=t([e("arch-collection-settings-button")],p);export{p as ArchCollectionSettingsButton};
//# sourceMappingURL=arch-collection-settings-button.js.map
