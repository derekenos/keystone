import{i as t,_ as e,e as o,s as r,y as i,a}from"./chunk-query-assigned-elements.js";import"./arch-tooltip.js";import{g as s}from"./chunk-styles.js";var h=[s,t`
    :host {
      display: block;
      background-color: #fff;
      padding: 1rem 1rem 3rem 1rem;
      height: calc(100% - 4rem);
      box-shadow: 1px 1px 6px #888;
      font-size: 0.95rem;
      border-radius: 6px;
      position: relative;
    }

    :host .header {
      display: flex;
    }

    :host .header > *:first-child {
      flex-grow: 1;
    }

    :host .header > a {
      margin: auto;
    }

    :host .footer {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 1rem;
      text-align: center;
    }

    :host arch-tooltip {
      margin: auto 0 auto 0.5rem;
    }
  `];let l=class extends r{constructor(){super(...arguments),this.title="Title",this.headerLevel=2,this.ctaText=void 0,this.ctaHref=void 0,this.ctaTooltipHeader=void 0,this.ctaTooltipText=void 0,this.ctaTooltipLearnMoreUrl=void 0}get header(){switch(this.headerLevel){case 1:return i`<h1>${this.title}</h1>`;case 2:return i`<h2>${this.title}</h2>`;case 3:return i`<h3>${this.title}</h3>`;case 4:return i`<h4>${this.title}</h4>`;case 5:return i`<h5>${this.title}</h5>`;default:return i`<h6>${this.title}</h6>`}}render(){const{ctaTooltipHeader:t,ctaTooltipText:e,ctaTooltipLearnMoreUrl:o}=this;return i`
      <section>
        <div class="header">
          ${this.header}
          ${this.ctaText&&this.ctaHref?i`
                <a href="${this.ctaHref}">${this.ctaText}</a>
                ${t||e||o?i`
                      <arch-tooltip
                        .header=${t}
                        .text=${e}
                        .learnMoreUrl=${o}
                      ></arch-tooltip>
                    `:i``}
              `:""}
        </div>
        <hr />
        <slot name="content"></slot>
        <div class="footer">
          <slot name="footer"></slot>
        </div>
      </section>
    `}};l.styles=h,e([o({type:String})],l.prototype,"title",void 0),e([o({type:Number})],l.prototype,"headerLevel",void 0),e([o({type:String})],l.prototype,"ctaText",void 0),e([o({type:String})],l.prototype,"ctaHref",void 0),e([o({type:String})],l.prototype,"ctaTooltipHeader",void 0),e([o({type:String})],l.prototype,"ctaTooltipText",void 0),e([o({type:String})],l.prototype,"ctaTooltipLearnMoreUrl",void 0),l=e([a("arch-card")],l);
//# sourceMappingURL=chunk-arch-card.js.map
