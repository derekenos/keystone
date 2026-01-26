import{i as t,s as i,_ as a,e,y as s,b as o,a as n}from"./chunk-query-assigned-elements.js";import{t as r}from"./chunk-state.js";import{i as d}from"./chunk-focusable.js";import{A as l}from"./chunk-ArchAPI.js";import{b as h,R as c}from"./chunk-helpers.js";import{ArchGlobalModal as u}from"./arch-global-modal.js";import"./arch-loading-indicator.js";import"./arch-dataset-metadata-form.js";import"./chunk-arch-modal.js";import{g as p,d as m}from"./chunk-styles.js";import"./chunk-constants.js";import"./chunk-arch-json-schema-form.js";import"./chunk-_commonjsHelpers.js";import"./chunk-sizedMixin.js";import"./chunk-scale-large.js";var b=[p,t`
    :host > div.container {
      display: flex;
    }

    :host > div.container > div:first-child {
      flex-grow: 1;
    }

    :host > div.container > button {
      align-self: flex-start;
    }

    :host > div.container > button.cancel {
      margin-right: 0.5rem;
    }

    h2 {
      font-size: 1em;
      margin: 0 0 0.75em 0;
    }

    /* Prevent items from overflow container: https://stackoverflow.com/a/66689926 */
    div.detail {
      min-width: 0;
    }

    div.metadata-display > dl,
    div.metadata-display > arch-loading-indicator,
    div.metadata-display > i {
      margin-left: 2rem;
    }

    div.metadata-edit {
      background-color: ${m};
      border-radius: 8px;
      padding: 1rem 1.5rem;
    }

    dl > div,
    dl > div:last-child {
      margin-bottom: 0.75em;
    }

    [hidden] {
      display: none;
    }

    div.form-buttons {
      text-align: right;
    }
  `],g="https://arch.archive-it.org/js/pub-metadata-schema.json",y="http://json-schema.org/draft-07/schema",f="Published Dataset Metadata",v="object",P=["title","description","creator","subject","licenseurl"],S={title:{type:"string",description:"A title for this dataset.",minLength:8,maxLength:100,nullable:!0,title:"Title"},description:{type:"string",description:"A description of this dataset.",minLength:8,maxLength:1e3,nullable:!0,title:"Description"},creator:{description:"The name(s) of the author(s) of this dataset.",items:{type:"string",minLength:8,maxLength:64},nullable:!0,type:"array",title:"Author(s)",uniqueItems:!0},subject:{description:"A list of keywords that describe this dataset.",items:{type:"string",minLength:4,maxLength:16},nullable:!0,type:"array",title:"Keyword(s)",uniqueItems:!0},licenseurl:{type:"string",description:"The license to apply to this dataset.",nullable:!0,title:"Access Rights",oneOf:[{const:"https://creativecommons.org/licenses/by/4.0/",title:"CC BY",description:"This license allows reusers to distribute, remix, adapt, and build upon the material in any medium or format, so long as attribution is given to the creator. The license allows for commercial use."},{const:"https://creativecommons.org/licenses/by-sa/4.0/",title:"CC BY-SA",description:"This license allows reusers to distribute, remix, adapt, and build upon the material in any medium or format, so long as attribution is given to the creator. The license allows for commercial use. If you remix, adapt, or build upon the material, you must license the modified material under identical terms."},{const:"https://creativecommons.org/licenses/by-nc/4.0/",title:"CC BY-NC",description:"This license allows reusers to distribute, remix, adapt, and build upon the material in any medium or format for noncommercial purposes only, and only so long as attribution is given to the creator."},{const:"https://creativecommons.org/licenses/by-nc-sa/4.0/",title:"CC BY-NC-SA",description:"This license allows reusers to distribute, remix, adapt, and build upon the material in any medium or format for noncommercial purposes only, and only so long as attribution is given to the creator. If you remix, adapt, or build upon the material, you must license the modified material under identical terms."},{const:"https://creativecommons.org/licenses/by-nd/4.0/",title:"CC BY-ND",description:"This license allows reusers to copy and distribute the material in any medium or format in unadapted form only, and only so long as attribution is given to the creator. The license allows for commercial use."},{const:"https://creativecommons.org/licenses/by-nc-nd/4.0/",title:"CC BY-NC-ND",description:"This license allows reusers to copy and distribute the material in any medium or format in unadapted form only, for noncommercial purposes only, and only so long as attribution is given to the creator."},{const:"https://creativecommons.org/publicdomain/zero/1.0/",title:"CC0",description:"Public Domain"}]}},$={$id:g,$schema:y,title:f,type:v,propertiesOrder:P,properties:S},k=Object.freeze({__proto__:null,$id:g,$schema:y,title:f,type:v,propertiesOrder:P,properties:S,default:$});const w=k,_=w.propertiesOrder;var C,M;!function(t){t[t.Loading=0]="Loading",t[t.Unpublished=1]="Unpublished",t[t.PrePublish=2]="PrePublish",t[t.Publishing=3]="Publishing",t[t.Published=4]="Published",t[t.Unpublishing=5]="Unpublishing"}(C||(C={})),function(t){t[t.Displaying=0]="Displaying",t[t.Editing=1]="Editing",t[t.Saving=2]="Saving"}(M||(M={}));const j=Object.keys(w.properties).sort(((t,i)=>_.indexOf(t)<_.indexOf(i)?-1:1));let I=class extends i{constructor(){super(...arguments),this.readOnly=!1,this.pubState=C.Loading,this.pubInfo=void 0,this.initiatedPublication=!1,this.metadataState=M.Displaying,this.metadata=void 0,this.preEditMetadata=void 0}connectedCallback(){super.connectedCallback(),this._fetchInitialData()}get _metadataFormData(){var t;const i={},a=Array.from(new FormData(this.metadataForm.form).entries()).filter((([,t])=>""!==t.trim())).map((([t,i])=>[t,i.replaceAll("\t"," ").replaceAll("\n","<br>")]));for(const[e,s]of a)i[e]=(null!==(t=i[e])&&void 0!==t?t:[]).concat(s);return i}render(){const{publishButton:t,pubState:i,readOnly:a}=this;if(i===C.Loading)return s`<arch-loading-indicator></arch-loading-indicator>`;const{metadata:e}=this,n=this.pubInfo;return s`
      <arch-modal
        id="unpublish-confirmation-modal"
        title="Unpublish Dataset"
        submitButtonClass="danger"
        submitButtonText="Unpublish"
        content="Are you sure you want to unpublish this dataset?"
        .elementToFocusOnClose=${t}
        @submit=${this._unpublish}
      ></arch-modal>
      <div class="container">
        <div class="detail">
          <dl>
            <div>
              <dt>Last Published</dt>
              <dd>
                ${i===C.Published?h(n.time):"never"}
              </dd>
            </div>
            ${i!==C.Published?s``:s`
                  <div>
                    <dt>ARK</dt>
                    <dd>
                      <a href="https://ark.archive.org/${n.ark}"
                        >${n.ark}</a
                      >
                    </dd>
                  </div>
                `}
          </dl>

          <!-- Metadata section header -->
          <h2>
            ${i<C.PrePublish||i===C.Publishing?"":i===C.PrePublish?s`<i>Enter Metadata</i>`:"Metadata"}
            ${i<C.Published||this.metadataState===M.Editing||this.metadataState===M.Saving||a?"":s`
                  <button class="text" @click=${this._startEditingMetadata}>
                    (edit)
                  </button>
                `}
          </h2>

          <!-- Metadata display list -->
          <div
            class="metadata-display"
            ?hidden=${i<C.Published||this.metadataState===M.Editing||this.metadataState===M.Saving}
          >
            ${void 0===e?s`<arch-loading-indicator></arch-loading-indicator>`:0===Object.keys(e).length?s`<i>none</i>`:s`
                  <dl>
                    ${j.filter((t=>void 0!==e[t])).map((t=>{const i=function(t){return w.properties[t].title}(t);let a=e[t];return Array.isArray(a)||(a=[a]),a=a.filter((t=>t.length>0)),0===a.length?o:s`
                              <div>
                                <dt>${i}</dt>
                                ${a.map((t=>s`<dd>${t}</dd>`))}
                              </div>
                            `}))}
                  </dl>
                `}
          </div>

          <!-- Metadata edit form -->
          <div
            class="metadata-edit"
            ?hidden=${i!==C.PrePublish&&this.metadataState!==M.Editing&&this.metadataState!==M.Saving}
          >
            <arch-dataset-metadata-form
              .schema=${k}
              .data=${null!=e?e:{}}
            >
            </arch-dataset-metadata-form>
            <br />
            <div
              ?hidden=${i===C.PrePublish}
              class="form-buttons"
            >
              <button
                type="button"
                @click=${this._cancelEditingMetadata}
                ?disabled=${this.metadataState===M.Saving}
              >
                Cancel
              </button>
              <button
                type="button"
                class="primary"
                @click=${()=>this._saveMetadata()}
                ?disabled=${this.metadataState===M.Saving}
              >
                ${this.metadataState===M.Saving?s`<arch-loading-indicator
                      style="--color: #fff"
                      text="Saving"
                    ></arch-loading-indicator>`:s`Save`}
              </button>
            </div>
          </div>
        </div>

        <button
          class="cancel"
          @click=${()=>this.pubState=C.Unpublished}
          ?hidden=${i!==C.PrePublish}
        >
          Cancel
        </button>

        <button
          id="publish-button"
          class="${i===C.Unpublished?"primary":i===C.PrePublish?"success":i===C.Published?"danger":""} ${a?"hidden":""}"
          ?disabled=${i===C.Publishing||i===C.Unpublishing}
          ?hidden=${this.metadataState!==M.Displaying}
          @click=${this._publishButtonClickHandler}
        >
          ${i===C.Unpublished?"Publish":i===C.PrePublish?"Publish Now":i===C.Publishing?"Publish in progress...":i===C.Published?"Unpublish":i===C.Unpublishing?"Unpublishing...":""}
        </button>
      </div>
    `}async _fetchInitialData(){const{initiatedPublication:t,publishButton:i,pubState:a}=this,e=await this._fetchPubInfo();return e?!1===e.complete?(this.pubState=C.Publishing,void setTimeout((()=>{this._fetchInitialData()}),3e3)):(this.pubInfo=e,this.pubState=C.Published,void this._pollItemMetadata()):t&&a===C.Publishing?(this.showErrorModal("dataset publication",i),this.pubState=C.PrePublish,void(this.initiatedPublication=!1)):(this.pubState=C.Unpublished,void(this.metadata={}))}async _pollItemMetadata(){const{pubState:t}=this,i=await this._fetchItemMetadata();void 0===i&&t===C.Published&&setTimeout((()=>{this._pollItemMetadata()}),3e3),this.metadata=i}async _fetchPubInfo(){const{datasetId:t}=this;try{return await l.datasets.publication.info(t)}catch(t){return void(t instanceof c&&404===t.response.status||console.error(t))}}async _fetchItemMetadata(){const{datasetId:t}=this;try{return await l.datasets.publication.metadata.get(t)}catch(t){return void(t instanceof c&&404===t.response.status||console.error(t))}}_publishButtonClickHandler(){const{unpublishConfirmationModal:t}=this,i=this.metadataForm;switch(this.pubState){case C.Unpublished:this.pubState=C.PrePublish;break;case C.PrePublish:i.form.checkValidity()?this._publish():i.form.reportValidity();break;case C.Published:t.open=!0}}showErrorModal(t,i){u.showError("",`An error occurred during ${t}. Please try again`,i)}async _publish(){const{csrfToken:t,datasetId:i,publishButton:a,_metadataFormData:e}=this;this.initiatedPublication=!0,this.pubState=C.Publishing;const s=()=>{this.pubState=C.PrePublish,this.showErrorModal("dataset publication",a)};let o;try{o=await fetch(`/api/datasets/${i}/publication`,{method:"POST",credentials:"same-origin",headers:{"X-CSRFToken":t},mode:"cors",body:JSON.stringify(e)})}catch(t){throw s(),t}o.ok?setTimeout((()=>{this._fetchInitialData()}),3e4):s()}async _unpublish(){const{datasetId:t,publishButton:i}=this;this.pubState=C.Unpublishing;try{await l.datasets.publication.unpublish(t)}catch{return this.pubState=C.Published,void this.showErrorModal("dataset unpublication",i)}this.pubState=C.Unpublished,this._fetchInitialData()}async _saveMetadata(){const{datasetId:t,_metadataFormData:i,publishButton:a}=this;this.metadata=i,this.metadataState=M.Saving;const e=Object.assign(Object.fromEntries(j.map((t=>[t,[]]))),i);try{await l.datasets.publication.metadata.update(t,e)}catch{return this.metadataState=M.Editing,void this.showErrorModal("dataset metadata update",a)}this.metadataState=M.Displaying}_startEditingMetadata(){this.preEditMetadata=structuredClone(this.metadata),this.metadataState=M.Editing}_cancelEditingMetadata(){const{preEditMetadata:t}=this;this.metadata=t,this.metadataState=M.Displaying}};I.styles=b,I.shadowRootOptions={...i.shadowRootOptions,delegatesFocus:!0},a([e({type:String})],I.prototype,"datasetId",void 0),a([e({type:String})],I.prototype,"csrfToken",void 0),a([e({type:Boolean})],I.prototype,"readOnly",void 0),a([r()],I.prototype,"pubState",void 0),a([r()],I.prototype,"pubInfo",void 0),a([r()],I.prototype,"initiatedPublication",void 0),a([r()],I.prototype,"metadataState",void 0),a([r()],I.prototype,"metadata",void 0),a([r()],I.prototype,"preEditMetadata",void 0),a([d("arch-dataset-metadata-form")],I.prototype,"metadataForm",void 0),a([d("#publish-button")],I.prototype,"publishButton",void 0),a([d("#unpublish-confirmation-modal")],I.prototype,"unpublishConfirmationModal",void 0),I=a([n("arch-dataset-publishing-card")],I);export{I as ArchDatasetPublishingCard};
//# sourceMappingURL=arch-dataset-publishing-card.js.map
