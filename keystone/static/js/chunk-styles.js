import{i as o}from"./chunk-query-assigned-elements.js";const r=o`#2b74a1`,t=o`#1b4865`,a=o`#f0f0f0`,e=o`#222`,n=r,l=o`#fff`,c=o`#1e7b34`,d=o`#fff`;o`#e3e7e8`;const i={backgroundColor:n,border:o`none`,color:l,cursor:o`pointer`,hoverBackgroundColor:t,hoverColor:l,transition:o`background-color 300ms ease-out`};var b=o`
  :host {
    /* DataTable action buttons */
    --data-table-action-button-background-color: ${i.backgroundColor};
    --data-table-action-button-border: ${i.border};
    --data-table-action-button-color: ${i.color};
    --data-table-action-button-cursor: ${i.cursor};
    --data-table-action-button-hover-background-color: ${i.hoverBackgroundColor};
    --data-table-action-button-hover-color: ${i.hoverColor};
    --data-table-action-button-transition: ${i.transition};

    /* DataTable paginator */
    --data-table-paginator-wrapper-font-size: 1rem;
    --data-table-paginator-control-button-background-color: transparent;
    --data-table-paginator-control-button-border: none;
    --data-table-paginator-control-button-color: #348fc6;
    --data-table-paginator-control-button-padding: 0.25rem;
  }

  a:any-link {
    color: ${r};
  }

  a:hover {
    color: ${t};
  }
`;o`#2991cc`,o`#fff`,o`#dce0e0`,o`#dce0e0`;const s=o`#052c65`,g=o`#2b2f32`,f=o`#0a3622`,u=o`#055160`,p=o`#664d03`,$=o`#58151c`,m=o`#495057`,h=o`#495057`,k=o`#f8d7da`,y=o`
  :host {
    color: #222;
    font-family: "Open Sans", Helvetica, Arial, sans-serif;
  }

  /* https://www.w3.org/WAI/tutorials/forms/labels */
  .visuallyhidden {
    border: 0;
    clip: rect(0 0 0 0);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
  }

  a:any-link {
    color: ${r};
    text-decoration: none;
  }

  button {
    white-space: nowrap;
    font-size: 0.9rem;
    border-radius: 3px;
    border: none;
    padding: 0.4rem 1rem;
    cursor: pointer;
    background-color: ${a};
    color: ${e};
  }

  button:disabled,
  input:disabled,
  select:disabled {
    cursor: default;
  }

  button.primary {
    background-color: ${n};
    color: ${l};
  }

  button.success {
    background-color: ${c};
    color: ${d};
  }

  button.danger {
    background-color: ${k};
    color: ${$};
  }

  a:any-link:hover,
  button.text:hover {
    color: ${t};
    cursor: pointer;
  }

  button.text {
    background: transparent;
    border: none;
    padding: 0;
    color: ${r};
    font-size: 1rem;
  }

  dl {
    margin-block-start: 0;
    margin-block-end: 0;
  }

  dl > div {
    margin-bottom: 1rem;
  }

  dl > div:last-child {
    margin-bottom: 0;
  }

  dt {
    display: inline;
    font-weight: bold;
  }

  dt:after {
    content: ":";
    margin-right: 0.5em;
  }

  dd {
    display: inline;
    margin: 0;
    line-height: 1.2em;
    font-style: italic;
  }

  dd::after {
    content: ",";
    padding-right: 0.2em;
  }

  dd:last-child::after {
    content: none;
    padding-right: 0;
  }

  form > label {
    font-size: 1rem;
    color: black;
    cursor: pointer;
    display: block;
    font-weight: bold;
    line-height: 1.5;
    margin-bottom: 0;
  }

  form > em {
    display: block;
    padding: 0.5rem 0;
    color: #444;
  }

  input,
  select {
    background-color: #fff;
    font-family: inherit;
    border: 1px solid #ccc;
    color: rgba(0, 0, 0, 0.75);
    font-size: 0.875rem;
    padding: 0.5rem;
    cursor: pointer;
  }

  label.required:after {
    content: "*";
    color: red;
  }

  .hidden {
    display: none;
  }
`,v=o`
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  tr {
    border-bottom: solid #eee 1px;
  }

  tr:last-child {
    border-bottom: none;
  }

  tbody > tr:hover {
    background-color: #f7f7f7;
  }

  tbody > tr.no-results:hover {
    background-color: unset;
  }

  th,
  td {
    text-align: left;
    padding: 0.5rem 0.25rem;
  }

  th {
    color: #555;
    font-size: 0.9rem;
  }

  a.view-all {
    font-weight: bold;
  }
`,w=o`
  .alert {
    position: relative;
    padding: 1rem;
    margin-bottom: 1rem;
    border: 1px solid transparent;
    border-radius: 0.375rem;
  }

  .alert a {
    font-weight: 700;
  }

  .alert-primary {
    color: ${s};
    background-color: ${o`#cfe2ff`};
    border-color: ${o`#9ec5fe`};
  }

  .alert-primary a {
    color: ${s};
  }

  .alert-secondary {
    color: ${g};
    background-color: ${o`#e2e3e5`};
    border-color: ${o`#c4c8cb`};
  }

  .alert-secondary a {
    color: ${g};
  }

  .alert-success {
    color: ${f};
    background-color: ${o`#d1e7dd`};
    border-color: ${o`#a3cfbb`};
  }

  .alert-success a {
    color: ${f};
  }

  .alert-info {
    color: ${u};
    background-color: ${o`#cff4fc`};
    border-color: ${o`#9eeaf9`};
  }

  .alert-info a {
    color: ${u};
  }

  .alert-warning {
    color: ${p};
    background-color: ${o`#fff3cd`};
    border-color: ${o`#ffe69c`};
  }

  .alert-warning a {
    color: ${p};
  }

  .alert-danger {
    color: ${$};
    background-color: ${k};
    border-color: ${o`#f1aeb5`};
  }

  .alert-danger a {
    color: ${$};
  }

  .alert-light {
    color: ${m};
    background-color: ${o`#fcfcfd`};
    border-color: ${o`#e9ecef`};
  }

  .alert-light a {
    color: ${m};
  }

  .alert-dark {
    color: ${h};
    background-color: ${o`#ced4da`};
    border-color: ${o`#adb5bd`};
  }

  .alert-dark a {
    color: ${h};
  }
`;export{w as B,b as G,v as c,a as d,y as g};
//# sourceMappingURL=chunk-styles.js.map
