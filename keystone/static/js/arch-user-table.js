import{i as e,_ as t,e as s,y as a,a as r}from"./chunk-query-assigned-elements.js";import{t as i}from"./chunk-state.js";import{U as o,c as n,b as l,t as d}from"./chunk-helpers.js";import{T as c}from"./chunk-pubsub.js";import{A as m}from"./chunk-arch-data-table.js";import{i as u}from"./chunk-focusable.js";import{A as h}from"./chunk-ArchAPI.js";import{ArchEditUserModal as p}from"./arch-edit-user-modal.js";import{A as b}from"./chunk-arch-modal.js";import{B as f}from"./chunk-styles.js";import"./chunk-constants.js";import"./arch-loading-indicator.js";import"./arch-hover-tooltip.js";import"./chunk-scale-large.js";import"./chunk-sp-overlay.js";import"./chunk-arch-select-adder.js";import"./chunk-sizedMixin.js";var y=[...b.styles,f,e`
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
  `];let v=class extends b{constructor(){super(),this.accountTeams=[],h.teams.list().then((e=>{this.accountTeams=e.items,this.renderContent()}))}set unhandledError(e){const{errorEl:t}=this;e?t.classList.add("show"):t.classList.remove("show")}connectedCallback(){super.connectedCallback(),this.scrollable=!0,this.modalSize="m",this.title="Create a New User",this.submitButtonText="Create",this.renderContent(),this.addEventListener("sp-closed",this.onCloseHandler.bind(this))}renderContent(){this.content=a`
      <form validate>
        <input type="hidden" name="account-id" value=${this.accountId} />

        <label for="user-name">
          Username
          <em>
            150 characters or fewer. Letters, digits and &quot;@/./+/-/_&quot;
            only
          </em>
        </label>
        <input
          id="user-name"
          name="user-name"
          type="text"
          pattern="[a-zA-Z0-9@.+-_]+"
          required
          title='150 characters or fewer. Letters, digits and "@/./+/-/_" only'
        />

        <label for="first-name">First Name</label>
        <input id="first-name" name="first-name" type="text" />

        <label for="last-name">Last Name</label>
        <input id="last-name" name="last-name" type="text" />

        <label for="user-email">Email</label>
        <input id="user-email" name="user-email" type="email" required />

        <label for="user-role">Role</label>
        <select id="user-role" name="user-role" required>
          ${Object.entries(o).map((([e,t])=>a`
              <option value="${t}" ?selected=${"USER"===e}>${e}</option>
            `))}
        </select>

        <label for="user-teams-selector">Teams</label>
        <arch-user-teams-selector
          .accountTeams=${this.accountTeams}
          .userTeams=${[]}
          id="user-teams-selector"
        >
        </arch-user-teams-selector>

        <br />
        <input type="checkbox" id="send-email" name="send-email" checked />
        <label for="send-email">Send welcome email</label>
      </form>

      <div class="error alert-danger">
        Something went wrong. Please try again.
      </div>
    `}submit(){const{form:e,teamsSelector:t}=this;if(!e.checkValidity())return void e.reportValidity();const s=new FormData(this.form),a={account_id:parseInt(s.get("account-id")),email:s.get("user-email"),first_name:s.get("first-name"),last_name:s.get("last-name"),role:s.get("user-role"),username:s.get("user-name"),teams:t.selectedOptions.map((e=>({id:e.id,name:e.name})))};this.createUser(a,s.has("send-email"))}clearErrors(){this.unhandledError=!1,this.form&&(this.usernameInput.setCustomValidity(""),this.emailInput.setCustomValidity(""))}clearInputValidityOnChange(e){const t=()=>{e.setCustomValidity(""),e.removeEventListener("input",t)};e.addEventListener("input",t)}createUser(e,t){this.clearErrors(),h.users.create(e,t).then((()=>{this.open=!1,this.onCreate()})).catch((e=>{var t;400!==(null===(t=e.response)||void 0===t?void 0:t.status)?this.unhandledError=!0:e.response.json().then((e=>{const{details:t}=e;let s=!0;t.endsWith("already exists for field (username)")&&(this.usernameInput.setCustomValidity("A user with this Username already exists."),this.usernameInput.reportValidity(),this.clearInputValidityOnChange(this.usernameInput),s=!1),t.endsWith("already exists for field (email)")&&(this.emailInput.setCustomValidity("A user with this Email already exists."),this.emailInput.reportValidity(),this.clearInputValidityOnChange(this.emailInput),s=!1),"account max users limit reached"===t&&(this.usernameInput.setCustomValidity("Your account has reached its maximum number of allowed users"),this.usernameInput.reportValidity(),this.clearInputValidityOnChange(this.usernameInput),s=!1),this.unhandledError=s})).catch((()=>{this.unhandledError=!0}))}))}onCloseHandler(){var e;null===(e=this.form)||void 0===e||e.reset(),this.teamsSelector.reset(),this.clearErrors()}};v.styles=y,t([s({type:Number})],v.prototype,"accountId",void 0),t([s()],v.prototype,"onCreate",void 0),t([u("form")],v.prototype,"form",void 0),t([u("form > input#user-name")],v.prototype,"usernameInput",void 0),t([u("form > input#user-email")],v.prototype,"emailInput",void 0),t([u("div.error")],v.prototype,"errorEl",void 0),t([u("arch-user-teams-selector")],v.prototype,"teamsSelector",void 0),t([i()],v.prototype,"accountTeams",void 0),v=t([r("arch-create-new-user-modal")],v);var g=[e`
    data-table > table {
      table-layout: fixed;
    }

    data-table > table > thead > tr > th,
    data-table > table > tbody > tr > td {
      white-space: nowrap;
      max-width: none;
    }

    data-table > table > thead > tr > th.date-created {
      width: 8em;
    }

    data-table > table > thead > tr > th.last-login {
      width: 8em;
    }

    data-table > table > thead > tr > th.role {
      width: 5em;
    }

    data-table > table > thead > tr > th.status {
      width: 8em;
    }

    data-table > table > tbody > tr > td.is_active .info-icon {
      margin-left: 0.4rem;
      cursor: help;
    }
  `];let U=class extends m{constructor(){super(...arguments),this.accountMaxUsersReached=!1,this.inactiveUsersBecomeViewers=!1}willUpdate(e){super.willUpdate(e),this.actionButtonDisabled=[!1,!1];const t=this.userIsStaff||this.userRole===o.ADMIN;t&&(this.actionButtonLabels=["Edit User"],this.actionButtonSignals=[c.DISPLAY_EDIT_USER_MODAL]),this.apiCollectionEndpoint="/users",this.apiStaticParamPairs=[],this.cellRenderers=[void 0,(e,t)=>{const s=`${e} ${t.last_name}`;return n("span",{title:s,textContent:s})},void 0,e=>e?l(e):"",e=>e?l(e):"",e=>Object.keys(o)[Object.values(o).indexOf(e)],e=>e?"Active":n("span",{children:["Inactive",this.inactiveUsersBecomeViewers?n("span",{className:"info-icon",innerHTML:"&#9432",title:"Inactive users can still log in but their access is restricted to that of a VIEWER"}):""]})],this.columns=["username","first_name","email","date_joined","last_login","role","is_active"],this.columnFilterDisplayMaps=[void 0,void 0,void 0,void 0,void 0,void 0,{true:"Active",false:"Inactive"}],this.columnHeaders=["Username","Full Name","Email","Date Created","Last Login","Role","Status"],this.filterableColumns=[!1,!1,!1,!1,!1,!0,!0],this.pageLength=50,this.persistSearchStateInUrl=!0,this.pluralName="Account Users",this.rowClickEnabled=!0,this.searchColumns=["username","first_name","last_name","email"],this.searchColumnLabels=this.searchColumns.map(d),this.selectable=t,this.singleName="Account User",this.sort="username,role",this.sortableColumns=[!0,!0,!0,!0,!0,!0,!0],t&&(this.nonSelectionActions=[c.DISPLAY_CREATE_USER_MODAL],this.nonSelectionActionLabels=["Create New User"])}_createHiddenModalTriggerButton(){const e=document.createElement("button");return e.setAttribute("slot","trigger"),e.style.display="none",e}render(){const{inactiveUsersBecomeViewers:e}=this,t=new v;return t.accountId=this.accountId,t.onCreate=()=>{this.dataTable.throttledDoSearch()},this.createNewUserModalTrigger=this._createHiddenModalTriggerButton(),t.appendChild(this.createNewUserModalTrigger),this.editUserModal=new p,this.editUserModal.userId=this.userId,this.editUserModal.onUpdate=()=>{this.dataTable.throttledDoSearch()},this.editUserModal.inactiveUsersBecomeViewers=e,this.editUserModalTrigger=this._createHiddenModalTriggerButton(),this.editUserModal.appendChild(this.editUserModalTrigger),[super.render(),t,this.editUserModal]}updated(e){if(super.updated(e),this.accountMaxUsersReached){const e=this.dataTable.querySelector("div.non-selection-buttons button");e.disabled=!0,e.title="Your account has reached its maximum number of allowed users. Please contact your account administrator."}}showEditUserModal(e){this.editUserModal.user=e,this.editUserModalTrigger.click()}selectionActionHandler(e,t){if(e===c.DISPLAY_EDIT_USER_MODAL)this.showEditUserModal(t[0])}nonSelectionActionHandler(e){if(e===c.DISPLAY_CREATE_USER_MODAL)this.createNewUserModalTrigger.click()}postSelectionChangeHandler(e){const{dataTable:t}=this,{props:s}=t,a=e.length,r=1===a;s.actionButtonDisabled=[!r],t.setSelectionActionButtonDisabledState(0===a)}};U.styles=[...m.styles,...g],t([s({type:Number})],U.prototype,"accountId",void 0),t([s({type:Number})],U.prototype,"userId",void 0),t([s({type:Boolean})],U.prototype,"userIsStaff",void 0),t([s({type:String})],U.prototype,"userRole",void 0),t([s({type:Boolean})],U.prototype,"accountMaxUsersReached",void 0),t([s({type:Boolean,attribute:"inactive-users-become-viewers"})],U.prototype,"inactiveUsersBecomeViewers",void 0),t([i()],U.prototype,"createNewUserModalTrigger",void 0),t([i()],U.prototype,"editUserModal",void 0),t([i()],U.prototype,"editUserModalTrigger",void 0),U=t([r("arch-user-table")],U);export{U as ArchUserTable};
//# sourceMappingURL=arch-user-table.js.map
