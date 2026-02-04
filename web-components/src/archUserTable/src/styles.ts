import { css } from "lit";

export default [
  css`
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
  `,
];
