import{i as t,_ as e,a as o,s as a,e as s,y as i}from"./chunk-lit-element.js";import{t as r}from"./chunk-state.js";import{g as l,B as n,i as c}from"./chunk-styles.js";import{d,A as p,e as h}from"./chunk-arch-json-schema-form.js";import"./chunk-sp-tab-panel.js";import"./chunk-scale-large.js";import{P as b,a as m,b as u,l as g,D as f,i as y,c as j}from"./chunk-helpers.js";import{A as v}from"./chunk-ArchAPI.js";import{ArchGlobalModal as I}from"./arch-global-modal.js";import"./arch-loading-indicator.js";import"./chunk-arch-modal.js";import"./chunk-_commonjsHelpers.js";import"./chunk-sizedMixin.js";var $=[l,...d,t`
    div.input-block {
      background-color: #f8f8f8;
      padding-bottom: 0.5rem;
    }

    label {
      background-color: #666;
      color: #fff;
      padding: 0.5rem;
      display: block;
      font-size: 0.9rem;
      /* Make it a little brighter than the default background color */
      filter: brightness(1.2);
    }
  `];let S=class extends p{};S.styles=$,S=e([o("arch-job-parameters-form")],S);var C=[l,n,t`
    dl {
      padding-inline-start: 1rem;
      line-height: 1.4rem;
    }

    dt {
      display: inline-block;
      font-weight: normal;
    }

    dd {
      font-weight: bold;
    }

    dd:after {
      content: "";
      padding: 0;
    }

    div > h3 {
      margin-top: 0;
    }

    div > p {
      line-height: 1.2rem;
    }

    button.job-button {
      cursor: wait;
    }

    button.job-button.primary {
      cursor: pointer;
    }

    p.history > a {
      text-decoration: underline;
    }

    /* Disabled button text style should match ArchLoadingIndicator */
    button:disabled {
      font-style: italic;
      color: #666;
    }
  `];let w=class extends a{constructor(){super(...arguments),this.buttonClass="",this.buttonHTML=i``,this.jobName="",this.collectionName="",this.jobStateTuples=[]}renderButton(){const{jobStateTuples:t}=this,e=(t,e,o,a="")=>i`
      <button slot="trigger" class=${a} ?disabled=${o}>
        ${e?i`<arch-loading-indicator
              text=${t}
            ></arch-loading-indicator>`:t}
      </button>
    `;switch(t){case void 0:return e("Loading",!0,!0);case null:return e("Generate Dataset",!1,!1,"primary")}switch(t[0][2]){case b.SUBMITTED:return e("Job Starting",!0,!0);case b.QUEUED:return e("Job Queued",!1,!0);case b.RUNNING:return e("Job Running",!0,!0);case b.FINISHED:case b.FAILED:case b.CANCELLED:return e("Generate New Dataset",!1,!1,"primary")}}render(){const{jobParameters:t,jobName:e,collectionName:o}=this;return i`
      <arch-modal title="Generate Dataset">
        <div slot="content">
          <p>
            You're about to generate a <strong>${e}</strong> dataset from
            the <strong>${o}</strong> collection with the following
            configuration:
            <dl>
            ${Object.entries(t).map((([t,e])=>i`
                <dt>${t}</dt>
                <dd>${"boolean"==typeof e?e?"Yes":"No":e}</dd>
                <br />
              `))}
            </dl>
          </p>
        </div>
        ${this.renderButton()}
      </arch-modal>
    `}};var M;w.styles=C,w.shadowRootOptions={...a.shadowRootOptions,delegatesFocus:!0},e([s()],w.prototype,"buttonClass",void 0),e([s()],w.prototype,"buttonHTML",void 0),e([s()],w.prototype,"jobName",void 0),e([s()],w.prototype,"collectionName",void 0),e([s()],w.prototype,"jobParameters",void 0),e([s()],w.prototype,"jobStateTuples",void 0),w=e([o("arch-job-button")],w);let N=M=class extends a{constructor(){super(...arguments),this.jobParameters={}}extendParamsSchemaWithDefaultOptions(t){return t=null!=t?t:M.DefaultParametersSchema,Object.assign(t,{properties:Object.assign(t.properties,{sample:{type:"boolean",title:"Sample",default:!1,description:"Generate a sample dataset from a small subset of records"}})})}get historicalDatasetsUrl(){const{collectionId:t,job:e}=this;return`${m.collection(t)}?column-name=${encodeURIComponent(e.name)}`}renderHistory(){const{jobIdStatesMap:t,job:e}=this,o=t&&t[e.id];if(void 0===o||0===o.length)return i`
        <h4>History</h4>
        <p class="history">
          No datasets of this type have been generated for this collection.
        </p>
      `;const a=o.filter((([,,t])=>t===b.FINISHED));if(0===a.length)return i`
        <h4>History</h4>
        <p class="history">
          No datasets of this type have been completed for this collection.
        </p>
      `;const s=a.length>1;return i`
      <h4>History</h4>
      <p class="history">
        You've generated this dataset
        <a href="${this.historicalDatasetsUrl}" target="_blank">
          <strong
            >${a.length}&nbsp;time${s?"s":""}</strong
          >
        </a>
        for this collection, most recently on
        <a href="${m.dataset(a[0][0])}">
          <strong>${u(a[0][1])}</strong> </a
        >.
      </p>
    `}renderConfigureJob(){const{job:t,jobParameters:e}=this;return i`
      <h4>Configure</h4>
      <arch-job-parameters-form
        .schema=${this.extendParamsSchemaWithDefaultOptions(t.parameters_schema)}
        .data=${e}
        @data-change=${()=>this.jobButton.requestUpdate()}
      ></arch-job-parameters-form>
    `}emitGenerateDataset(t){t.stopPropagation(),this.dispatchEvent(new CustomEvent("generate-dataset",{detail:{archJobCard:this},bubbles:!0,composed:!0}))}render(){var t;const{collectionId:e,collectionName:o,job:a,jobIdStatesMap:s,jobParameters:r}=this,{id:l}=a,n=this.jobIdStatesMap?null!==(t=s[l])&&void 0!==t?t:null:void 0;return i` <div>
      <h3>${a.name}</h3>
      <p>
        ${a.description}
        <a href="${a.info_url}">Learn&nbsp;more &gt;</a>.
        <a href="${a.code_url}">Read&nbsp;the&nbsp;code &gt;</a>.
      </p>
      ${null===e?i`<p class="alert alert-info">
            Select a Source Collection above to display the options for
            generating a Dataset of this type.
          </p>`:i`
            ${this.renderHistory()} ${this.renderConfigureJob()}
            <arch-job-button
              .jobName=${a.name}
              .collectionName=${o}
              .jobStateTuples=${n}
              .jobParameters=${r}
              @submit=${this.emitGenerateDataset.bind(this)}
            >
            </arch-job-button>
          `}
    </div>`}};N.styles=C,N.DefaultParametersSchema={type:"object",required:[],properties:{}},e([s({type:Number})],N.prototype,"collectionId",void 0),e([s({type:String})],N.prototype,"collectionName",void 0),e([s()],N.prototype,"job",void 0),e([s()],N.prototype,"jobIdStatesMap",void 0),e([r()],N.prototype,"jobParameters",void 0),e([c("arch-job-button")],N.prototype,"jobButton",void 0),N=M=e([o("arch-job-card")],N);var D=[l,t`
    label {
      background-color: #000;
      color: #fff;
      padding: 0.5rem;
      display: block;
      font-size: 0.9rem;
      font-weight: bold;
    }

    select[name="source-collection"] {
      width: 100%;
    }

    label[for="job-category"] {
      margin-top: 1rem;
    }

    arch-job-category-section {
      flex-grow: 1;
    }

    .category-header {
      padding: 0.5rem;
      background-color: #eee;
    }

    sp-tabs[name="job-tabs"] sp-tab {
      padding: 0 1rem;
    }

    sp-tabs[name="job-tabs"] sp-tab[selected] {
      background-color: #fff;
      margin-right: 0;
    }

    sp-tabs[name="job-tabs"] sp-tab-panel > arch-job-card {
      flex-grow: 1;
      background-color: #fff;
      padding: 1rem;
    }
  `];let P=class extends a{render(){const{collectionId:t,collectionName:e,jobIdStatesMap:o}=this,{categoryDescription:a,jobs:s}=this.jobsCat;return i`
      <div class="category-header">
        <p class="category-description">${a}</p>
      </div>

      <label for="job-tabs">Select Dataset Type</label>
      <br />
      <sp-theme color="light" scale="medium">
        <sp-tabs
          compact
          direction="vertical"
          selected="${s[0].id}"
          name="job-tabs"
        >
          ${s.map((a=>i`<sp-tab
                label="${a.name}"
                value="${a.id}"
              ></sp-tab>
              <sp-tab-panel value="${a.id}">
                <arch-job-card
                  .collectionId=${t}
                  .collectionName=${e}
                  .job=${a}
                  .jobIdStatesMap=${o}
                ></arch-job-card>
              </sp-tab-panel>`))}
        </sp-tabs>
      </sp-theme>
    `}};var k;P.styles=D,e([s({type:String})],P.prototype,"collectionId",void 0),e([s({type:String})],P.prototype,"collectionName",void 0),e([s({type:Object})],P.prototype,"jobsCat",void 0),e([s({type:Object})],P.prototype,"jobIdStatesMap",void 0),P=e([o("arch-job-category-section")],P);const J=["Collection","Network","Text","File Formats"],x={Collection:["Domain frequency","Web archive transformation (WAT)"],Network:["Domain graph","Image graph","Longitudinal graph","Web graph"],Text:["Named entities","Plain text of webpages","Text file information"],"File Formats":["Audio file information","Image file information","PDF file information","Presentation file information","Spreadsheet file information","Video file information","Word processing file information"]};let U=k=class extends a{constructor(){super(...arguments),this.collections=null,this.collectionIdNameMap=new Map,this.availableJobs=[],this.sourceCollectionId=k.getUrlCollectionId(),this.collectionJobIdStatesMapMap={},this.activePollCollectionId=null}static getUrlCollectionId(){const t=new URLSearchParams(window.location.search).get(g);return t?parseInt(t):null}async connectedCallback(){const{sourceCollectionId:t}=this;this.initCollections(),t?await this.setSourceCollectionId(t):this.initAvailableJobs(),super.connectedCallback(),this.addEventListener("generate-dataset",(t=>{this.generateDatasetHandler(t)}))}render(){var t;const e=this.sourceCollectionId&&this.collectionJobIdStatesMapMap[this.sourceCollectionId];return i`
      <label for="source-collection">Select Source Collection</label>
      <select
        name="source-collection"
        @change=${this.sourceCollectionChangeHandler}
        ?disabled=${null===this.collections}
      >
        ${null===this.collections?i`<option>Loading...</option>`:i`<option value="">${f}</option>`}
        ${(null!==(t=this.collections)&&void 0!==t?t:[]).map((t=>i`
            <option
              value="${t.id}"
              ?selected=${t.id===this.sourceCollectionId}
            >
              ${t.name}
            </option>
          `))}
      </select>

      <label for="job-category">Select Dataset Category</label>
      <sp-theme color="light" scale="medium">
        ${0===this.availableJobs.length?i``:i`
              <sp-tabs selected="${this.availableJobs[0].categoryId}" size="l">
                ${this.availableJobs.map((t=>i`<sp-tab
                    label="${t.categoryName}"
                    value="${t.categoryId}"
                    style="--mod-tabs-icon-to-text: 0;"
                  >
                    <sp-icon
                      label="${t.categoryName}"
                      src="${t.categoryImage}"
                      slot="icon"
                      size="l"
                    ></sp-icon>
                  </sp-tab> `))}
                ${this.availableJobs.map((t=>{var o;return i`
                    <sp-tab-panel value="${t.categoryId}">
                      <arch-job-category-section
                        .collectionId=${this.sourceCollectionId}
                        .collectionName=${this.collectionIdNameMap.get(null!==(o=this.sourceCollectionId)&&void 0!==o?o:0)}
                        .jobsCat=${t}
                        .jobIdStatesMap=${e}
                      >
                      </arch-job-category-section>
                    </sp-tab-panel>
                  `}))}
              </sp-tabs>
            `}
      </sp-theme>
    `}setCollectionIdUrlParam(t){const e=new URL(window.location.href);t?e.searchParams.set(g,t.toString()):e.searchParams.delete(g),history.replaceState(null,"",e.toString())}async sourceCollectionChangeHandler(t){const e=parseInt(t.target.value)||null;this.setCollectionIdUrlParam(e),await this.setSourceCollectionId(e),this.requestUpdate()}async setSourceCollectionId(t){this.sourceCollectionId=t,t&&(await this.initAvailableJobs(),this.collectionJobIdStatesMapMap[t]=await this.fetchJobIdStatesMap(t),this.maybeStartPolling())}async initCollections(){const t=await v.collections.get([["limit","=",1e4],["sort","=","name"]]);this.collections=t.items,this.collectionIdNameMap=new Map(this.collections.map((t=>[t.id,t.name]))),this.requestUpdate()}async initAvailableJobs(){const{sourceCollectionId:t}=this,e=await(await fetch("/api/available-jobs"+(null===t?"":`?collection_id=${t}`))).json();e.sort(((t,e)=>J.indexOf(t.categoryName)>J.indexOf(e.categoryName)?1:-1)).map((t=>(t.jobs.sort(((e,o)=>{const a=x[t.categoryName];return void 0===a?0:a.indexOf(e.name)>a.indexOf(o.name)?1:-1})),t))),this.availableJobs=e}async fetchJobIdStatesMap(t){return await(await fetch(`/api/collections/${t}/dataset_states`)).json()}async pollDatasetStates(){const{sourceCollectionId:t}=this;if(null!==t&&this.activePollCollectionId===t){this.collectionJobIdStatesMapMap[t]=await this.fetchJobIdStatesMap(t),this.requestUpdate();for(const e of Object.values(this.collectionJobIdStatesMapMap[t]))if(y(e[0][2]))return void setTimeout((()=>{this.pollDatasetStates()}),1e4);this.activePollCollectionId=null}else this.activePollCollectionId=null}maybeStartPolling(){const{collectionJobIdStatesMapMap:t,sourceCollectionId:e}=this;if(null!==e&&null===this.activePollCollectionId)for(const o of Object.values(t[e]))if(y(o[0][2]))return this.activePollCollectionId=e,void this.pollDatasetStates()}get successModalContent(){return j("span",{children:["You will receive an email when your dataset is ready. You can monitor its progress on the ",j("a",{href:m.datasets,textContent:"Dataset list"})]})}async generateDatasetHandler(t){const e=t.detail.archJobCard,o=e.job.id,a=e.jobParameters,{collectionJobIdStatesMapMap:s}=this,i=this.sourceCollectionId,r=s[i],l=[0,(new Date).toISOString(),b.SUBMITTED];r[o]?r[o].unshift(l):r[o]=[l],e.jobButton.requestUpdate();try{await v.jobs.run(i,o,a)}catch{return r[o].shift(),e.jobButton.requestUpdate(),void I.showError("","Dataset generation failed. Please try again.",e.jobButton)}I.showNotification("ARCH is generating your dataset",this.successModalContent,e.jobButton),this.maybeStartPolling()}};U.styles=D,e([s({type:String})],U.prototype,"csrfToken",void 0),e([r()],U.prototype,"collections",void 0),e([r()],U.prototype,"collectionIdNameMap",void 0),e([r()],U.prototype,"availableJobs",void 0),e([r()],U.prototype,"sourceCollectionId",void 0),e([r()],U.prototype,"collectionJobIdStatesMapMap",void 0),e([r()],U.prototype,"activePollCollectionId",void 0),e([c("select[name=source-collection]")],U.prototype,"collectionSelector",void 0),e([h("arch-job-category-section")],U.prototype,"categorySections",void 0),U=k=e([o("arch-generate-dataset-form")],U);export{U as ArchGenerateDatasetForm};
//# sourceMappingURL=arch-generate-dataset-form.js.map
