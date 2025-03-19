import { css } from "lit";

import { global } from "../../lib/styles";

export default [
  global,
  css`
    ul {
      list-style: none;
      padding-inline-start: 1rem;
    }

    li {
      margin-bottom: 0.25rem;
      font-family: monospace;
      font-size: 0.9em;
    }

    button.text {
      margin-right: 0.5rem;
    }

    #input-cta-text {
      color: #444;
      display: inline-block;
      padding-right: 0.5rem;
      font-size: 1rem;
      font-style: italic;
    }
  `,
];
