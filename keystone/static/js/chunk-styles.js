import{i as o}from"./chunk-query-assigned-elements.js";const r=o`#2b74a1`,t=o`#1b4865`,a=o`#dc3545`,e=o`#fff`,n=o`#bb2d3b`,l=o`#b02a37`,c=o`#f0f0f0`,d=o`#222`,i=o`#ddd`,b=o`#111`,s=r,g=o`#fff`,u=t,f=g,$=o`#1e7b34`,p=o`#fff`;o`#e3e7e8`;const m={backgroundColor:s,border:o`none`,color:g,cursor:o`pointer`,hoverBackgroundColor:u,hoverColor:f,transition:o`background-color 300ms ease-out`};var h=o`
  :host {
    /* DataTable action buttons */
    --data-table-action-button-background-color: ${m.backgroundColor};
    --data-table-action-button-border: ${m.border};
    --data-table-action-button-color: ${m.color};
    --data-table-action-button-cursor: ${m.cursor};
    --data-table-action-button-hover-background-color: ${m.hoverBackgroundColor};
    --data-table-action-button-hover-color: ${m.hoverColor};
    --data-table-action-button-transition: ${m.transition};

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
`;o`#2991cc`,o`#fff`,o`#dce0e0`,o`#dce0e0`;const k=o`#052c65`,v=o`#2b2f32`,y=o`#0a3622`,w=o`#055160`,x=o`#664d03`,z=o`#58151c`,C=o`#495057`,B=o`#495057`,q=o`
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
    background-color: ${c};
    color: ${d};
  }

  button:hover {
    background-color: ${i};
    color: ${b};
  }

  button:disabled,
  input:disabled,
  select:disabled {
    cursor: default;
  }

  button.primary {
    background-color: ${s};
    color: ${g};
  }

  button.primary:hover {
    background-color: ${u};
    color: ${f};
  }

  button.success {
    background-color: ${$};
    color: ${p};
  }

  button.danger {
    color: ${e};
    background-color: ${a};
  }

  button.danger:hover {
    background-color: ${n};
    border-color: ${l};
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
`,A=o`
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
`,D=o`
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
    color: ${k};
    background-color: ${o`#cfe2ff`};
    border-color: ${o`#9ec5fe`};
  }

  .alert-primary a {
    color: ${k};
  }

  .alert-secondary {
    color: ${v};
    background-color: ${o`#e2e3e5`};
    border-color: ${o`#c4c8cb`};
  }

  .alert-secondary a {
    color: ${v};
  }

  .alert-success {
    color: ${y};
    background-color: ${o`#d1e7dd`};
    border-color: ${o`#a3cfbb`};
  }

  .alert-success a {
    color: ${y};
  }

  .alert-info {
    color: ${w};
    background-color: ${o`#cff4fc`};
    border-color: ${o`#9eeaf9`};
  }

  .alert-info a {
    color: ${w};
  }

  .alert-warning {
    color: ${x};
    background-color: ${o`#fff3cd`};
    border-color: ${o`#ffe69c`};
  }

  .alert-warning a {
    color: ${x};
  }

  .alert-danger {
    color: ${z};
    background-color: ${o`#f8d7da`};
    border-color: ${o`#f1aeb5`};
  }

  .alert-danger a {
    color: ${z};
  }

  .alert-light {
    color: ${C};
    background-color: ${o`#fcfcfd`};
    border-color: ${o`#e9ecef`};
  }

  .alert-light a {
    color: ${C};
  }

  .alert-dark {
    color: ${B};
    background-color: ${o`#ced4da`};
    border-color: ${o`#adb5bd`};
  }

  .alert-dark a {
    color: ${B};
  }
`;export{D as B,h as G,A as c,c as d,q as g};
//# sourceMappingURL=chunk-styles.js.map
