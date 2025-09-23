import { css } from "lit";
import { global } from "../../lib/styles";

export default [
  global,
  css`
    div.buttons-wrapper {
      margin-top: 2rem;
      text-align: right;
    }

    /*
     * Some components slot in content, while others directly create
     * children of the <slot> element itself, so we need to style both.
     */
    slot[name="content"] > *,
    slot[name="content"]::slotted(*) {
      max-height: 50vh;
      overflow-y: auto;
    }
  `,
];
