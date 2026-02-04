import { css } from "lit";

import { Bootstrap4Alerts } from "../../lib/styles";
import { ArchModal } from "../../archModal/index";

export default [
  ...ArchModal.styles,
  Bootstrap4Alerts,
  css`
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
  `,
];
