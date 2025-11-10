import{i as e,_ as t,e as s,s as i,y as r,a}from"./chunk-query-assigned-elements.js";import{g as n,B as o}from"./chunk-styles.js";var l,d=[n,o,e`
    div.alert {
      display: flex;
      padding: 0;
    }

    p {
      font-size: 1rem;
      line-height: 1.6rem;
      flex-grow: 1;
      margin: 0;
      padding: 1.2rem 0 1.2rem 1.2rem;
    }

    button {
      align-self: flex-start;
      padding: 1.2rem;
      font-size: 1.2rem;
    }

    button:hover {
      font-weight: bold;
    }
  `];!function(e){e.Danger="danger",e.Dark="dark",e.Info="info",e.Light="light",e.Primary="primary",e.Secondary="secondary",e.Success="success",e.Warning="warning"}(l||(l={}));let h=class extends i{constructor(){super(...arguments),this.alertClass=l.Primary,this.hidden=!1,this.message=r``,this.nonDismissable=!1}render(){return r`
      <div
        class="alert alert-${this.alertClass}"
        style="display: ${this.hidden?"none":"flex"}"
        role="alert"
      >
        <p>${this.message}</p>
        ${this.nonDismissable?r``:r` <button
              type="button"
              class="close"
              data-dismiss="alert"
              aria-label="Close"
              style="background-color: transparent;"
              @click=${this.hide}
            >
              <span aria-hidden="true">&times;</span>
            </button>`}
      </div>
    `}hide(){this.setAttribute("hidden","")}show(){this.removeAttribute("hidden")}};h.styles=d,t([s({type:String,attribute:"alert-class"})],h.prototype,"alertClass",void 0),t([s({type:Boolean})],h.prototype,"hidden",void 0),t([s({type:String})],h.prototype,"message",void 0),t([s({type:Boolean,attribute:"non-dismissable"})],h.prototype,"nonDismissable",void 0),h=t([a("arch-alert")],h);export{l as AlertClass,h as ArchAlert};
//# sourceMappingURL=arch-alert.js.map
