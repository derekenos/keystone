import { css } from "lit";

import { global } from "../../lib/styles";

export default [
  global,
  css`
    label {
      margin-top: 1rem;
    }

    label:first-of-type {
      margin-top: 0;
    }

    em {
      line-height: 1.2em;
      display: block;
      padding: 0.5rem 0;
      color: #444;
    }

    arch-sub-collection-builder-submit-button {
      display: block;
      margin-top: 1rem;
    }

    select#sources,
    input#name,
    input#surts {
      width: 100%;
    }

    select#sources {
      resize: vertical;
    }

    input#status,
    input#mime {
      width: 50%;
    }

    sp-theme {
      --spectrum-font-size: 1rem;
      --mod-tabs-font-size: 1rem;
      --mod-tabs-font-weight: bold;
    }
  `,
];
