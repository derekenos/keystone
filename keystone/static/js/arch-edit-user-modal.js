import{i as e,_ as t,e as s,y as r,a}from"./chunk-query-assigned-elements.js";import{t as i}from"./chunk-state.js";import{i as o}from"./chunk-focusable.js";import{A as n}from"./chunk-ArchAPI.js";import{a as l,U as d}from"./chunk-helpers.js";import{A as c}from"./chunk-arch-select-adder.js";import{g as m,B as p}from"./chunk-styles.js";import{A as u}from"./chunk-arch-modal.js";import"./chunk-constants.js";import"./chunk-scale-large.js";import"./chunk-sizedMixin.js";var h=[m,e`
    h3 {
      margin-block-start: 0;
      margin-block-end: 0.5rem;
      font-size: 1rem;
    }

    ul {
      line-height: 1.6rem;
      font-style: italic;
    }

    button {
      padding: 0;
      background-color: transparent;
      margin-left: 1rem;
      text-decoration: underline;
      color: red;
      font-size: 0.8em;
    }

    label {
      margin-left: 1.2rem;
    }

    select {
      padding: 0.2rem;
      border-radius: 8px;
    }
  `];let f=class extends c{connectedCallback(){const{readOnly:e}=this;this.reset(),this.deselectButtonText="remove",this.emptyOptionsPlaceholder=r`
      <em
        >Your account doesn’t have any teams yet.
        <a href="${l.teams}">Manage your teams here.</a></em
      >
    `,this.headingLevel=0,this.readOnlyMessage=e?r`<em>Contact an account admin to modify your teams.</em>`:void 0,this.selectCtaText="Add a team",this.valueGetter=e=>String(e.id),this.labelGetter=e=>e.name,super.connectedCallback()}willUpdate(e){e.has("userTeams")&&this.reset()}reset(){const{accountTeams:e,userTeams:t}=this;this.options=e.slice(),this.selectedOptions=t.slice()}};f.styles=h,t([s({type:Array})],f.prototype,"accountTeams",void 0),t([s({type:Array})],f.prototype,"userTeams",void 0),t([s({type:Boolean})],f.prototype,"readOnly",void 0),f=t([a("arch-user-teams-selector")],f);var v=[...u.styles,p,e`
    form > label {
      font-weight: normal;
      margin-top: 0.5rem;
      font-size: 0.95rem;
    }

    form > label:first-child {
      margin-top: 0;
    }

    form > label > em {
      display: block;
      font-size: 0.9em;
    }

    form > input,
    form > select {
      box-sizing: border-box;
      width: 100%;
    }

    form > label[for="send-email"],
    form > input#send-email {
      display: inline-block;
      width: auto;
    }

    select[name="user-role"]:disabled {
      cursor: not-allowed;
    }

    form > span#user-active-wrapper {
      display: inline-block;
    }

    form > span#user-active-wrapper > span.info-icon {
      margin-left: 0.3rem;
      cursor: help;
    }

    form > span#user-active-wrapper > input {
      width: unset;
      margin-top: 1rem;
    }

    form > span#user-active-wrapper > label {
      display: inline-block;
      margin-top: 1rem;
      cursor: pointer;
    }

    form > span#user-active-wrapper.disabled {
      cursor: not-allowed;
    }

    form > span#user-active-wrapper.disabled > * {
      cursor: unset;
    }

    form > label[for="send-email"] {
      margin-left: 0.5em;
    }

    div.error {
      margin-top: 1rem;
      padding: 0.5rem 0.75rem;
      display: none;
    }

    div.error.show {
      display: block;
    }
  `];let y=class extends u{constructor(){super(),this.profileMode=!1,this.onUpdate=e=>null,this.inactiveUsersBecomeViewers=!1,this.accountTeams=[],this.allowIsActiveModify=!1,n.teams.list().then((e=>this.accountTeams=e.items))}set unhandledError(e){const{errorEl:t}=this;e?t.classList.add("show"):t.classList.remove("show")}set user(e){const{accountTeams:t,inactiveUsersBecomeViewers:s,profileMode:a,userId:i}=this;if(void 0===e)return void(this.content=r``);const o=e.id===i;this.allowIsActiveModify=!(a||o);const n=e.role===d.ADMIN;this.content=r`
      <form validate>
        <input type="hidden" name="id" value=${e.id} />

        <label for="first-name">First Name</label>
        <input
          id="first-name"
          name="first-name"
          type="text"
          value=${e.first_name}
        />

        <label for="last-name">Last Name</label>
        <input
          id="last-name"
          name="last-name"
          type="text"
          value=${e.last_name}
        />

        <label for="user-email">Email</label>
        <input
          id="user-email"
          name="user-email"
          type="email"
          required
          value=${e.email}
        />

        ${a?r``:r`
              <label for="user-role">Role</label>
              <select
                id="user-role"
                name="user-role"
                required
                ?disabled=${o}
                title=${o?"Your role can only be changed by another Admin":"Select user role"}
              >
                ${Object.entries(d).map((([t,s])=>r`
                    <option value="${s}" ?selected=${t===e.role}>
                      ${t}
                    </option>
                  `))}
              </select>
              <span
                id="user-active-wrapper"
                title=${o?"Your activation status can only be changed by another Admin":""}
                class=${o?"disabled":""}
              >
                <input
                  type="checkbox"
                  id="user-active"
                  name="user-active"
                  ?checked=${e.is_active}
                  ?disabled=${o}
                />
                <label for="user-active">Active</label>
                ${s?r` <span
                      class="info-icon"
                      title="Inactive users can still log in but their access is restricted to that of a VIEWER"
                      >&#9432;</span
                    >`:""}
              </span>
            `}
        ${0===t.length&&a&&!n?r``:r`
              <label for="user-teams-selector">Teams</label>
              <arch-user-teams-selector
                .accountTeams=${t}
                .userTeams=${e.teams}
                .readOnly=${!!a&&e.role!==d.ADMIN}
                id="user-teams-selector"
              >
              </arch-user-teams-selector>
            `}
      </form>
      <div class="error alert-danger">
        Something went wrong. Please try again.
      </div>
    `}connectedCallback(){super.connectedCallback();const{profileMode:e}=this;this.scrollable=!0,this.modalSize="m",this.submitButtonText="Save",this.title=e?"Edit Profile":"Edit User",this.addEventListener("sp-opened",this.onOpenHandler.bind(this)),this.addEventListener("sp-closed",this.onCloseHandler.bind(this))}submit(){const{allowIsActiveModify:e,form:t,teamsSelector:s}=this;if(!t.checkValidity())return void t.reportValidity();const r=new FormData(this.form),a=parseInt(r.get("id")),i={email:r.get("user-email"),first_name:r.get("first-name"),last_name:r.get("last-name"),role:r.get("user-role"),teams:s.selectedOptions};e&&(i.is_active="on"===r.get("user-active")),this.updateUser(a,i)}clearErrors(){this.unhandledError=!1,this.form&&this.emailInput.setCustomValidity("")}clearInputValidityOnChange(e){const t=()=>{e.setCustomValidity(""),e.removeEventListener("input",t)};e.addEventListener("input",t)}updateUser(e,t){this.clearErrors(),n.users.update(e,t).then((e=>{this.open=!1;try{this.onUpdate(e)}catch(e){console.error(e)}})).catch((e=>{var t;400!==(null===(t=e.response)||void 0===t?void 0:t.status)?this.unhandledError=!0:e.response.json().then((e=>{const{details:t}=e;t.endsWith("already exists for field (email)")?(this.emailInput.setCustomValidity("A user with this Email already exists."),this.emailInput.reportValidity(),this.clearInputValidityOnChange(this.emailInput)):this.unhandledError=!0})).catch((()=>this.unhandledError=!0))}))}onOpenHandler(){const{profileMode:e,userId:t}=this;e&&n.users.get(t).then((e=>this.user=e))}onCloseHandler(){var e;const{profileMode:t}=this;null===(e=this.form)||void 0===e||e.reset(),this.teamsSelector.reset(),this.clearErrors(),t&&(this.user=void 0)}};y.styles=v,t([s({type:Number})],y.prototype,"userId",void 0),t([s({type:Boolean})],y.prototype,"profileMode",void 0),t([s()],y.prototype,"onUpdate",void 0),t([s({type:Boolean,attribute:"inactive-users-become-viewers"})],y.prototype,"inactiveUsersBecomeViewers",void 0),t([o("form")],y.prototype,"form",void 0),t([o("form > input#user-email")],y.prototype,"emailInput",void 0),t([o("div.error")],y.prototype,"errorEl",void 0),t([o("arch-user-teams-selector")],y.prototype,"teamsSelector",void 0),t([i()],y.prototype,"accountTeams",void 0),t([i()],y.prototype,"allowIsActiveModify",void 0),y=t([a("arch-edit-user-modal")],y);export{y as ArchEditUserModal};
//# sourceMappingURL=arch-edit-user-modal.js.map
