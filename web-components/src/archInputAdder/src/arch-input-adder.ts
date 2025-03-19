import { LitElement, TemplateResult, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";

import { uniq } from "lodash-es";

import { createElement } from "../../lib/webservices/src/legacy/lib/domLib";

import styles from "./styles";

@customElement("arch-input-adder")
export class ArchInputAdder extends LitElement {
  @property({ type: String }) deselectButtonText = "remove";
  @property({ type: Number }) headingLevel = 3;
  @property({ type: String }) inputType = "text";
  @property({ type: String }) inputName!: string;
  @property({ type: Number }) inputSize = 100;
  @property() inputValidator: (s: string) => string = (s) => s;
  @property({ type: String }) valuesTitle = "Added Values";
  @property({ type: String }) inputCtaText = "Enter value to add";
  @property({ type: String }) alreadyAddedText = "Value already added";
  @property({ type: Boolean }) preserveTrailingWhitespace = false;
  @property() onChange: (action: "add" | "remove", value: string) => void =
    () => null;
  @property() itemWrapperFn: (value: string) => string | TemplateResult = (
    value
  ) => value;

  @state() _values: Array<string> = [];

  set values(values: Array<string>) {
    /*
     * values setter that re-inits the array of hidden form inputs
     * on assignment.
     */
    const {
      formInputsContainer,
      inputName,
      inputValidator,
      preserveTrailingWhitespace,
    } = this;
    // Dedupe, maybe strip trailing whitespace, and validate values prior to assignment.
    this._values = uniq(
      values
        .map((x) => (preserveTrailingWhitespace ? x : x.trimEnd()))
        .map((x) => inputValidator(x))
    );
    if (formInputsContainer) {
      formInputsContainer.replaceChildren(
        ...this._values.map((value) =>
          createElement("input", {
            type: "hidden",
            name: inputName,
            value,
          })
        )
      );
    }
  }

  get values(): Array<string> {
    return this._values;
  }

  @query("input") input!: HTMLInputElement;
  @query("slot") slotEl!: HTMLSlotElement;

  static styles = styles;

  private heading(text: string): TemplateResult {
    const { headingLevel } = this;
    switch (headingLevel) {
      case 1:
        return html`<h1>${text}</h1>`;
        break;
      case 2:
        return html`<h2>${text}</h2>`;
        break;
      case 3:
        return html`<h3>${text}</h3>`;
        break;
      case 4:
        return html`<h4>${text}</h4>`;
        break;
      case 5:
        return html`<h5>${text}</h5>`;
        break;
      case 6:
        return html`<h6>${text}</h6>`;
        break;
      default:
        return html``;
    }
  }

  render() {
    const {
      valuesTitle,
      deselectButtonText,
      inputCtaText,
      inputSize,
      inputType,
      itemWrapperFn,
      preserveTrailingWhitespace,
    } = this;

    let { values } = this;

    // In preserveTrailingWhitespace mode, wrap affected values in quotes.
    if (preserveTrailingWhitespace) {
      values = values.map((value) => {
        if (!value.endsWith(" ")) {
          return value;
        }
        const quoteChar = !value.includes('"')
          ? '"'
          : !value.includes("'")
          ? "'"
          : !value.includes("`")
          ? "`"
          : ""; // give up
        return `${quoteChar}${value}${quoteChar}`;
      });
    }

    return html`
      <label for="input" class="visuallyhidden">${inputCtaText}</label>
      <input id="input" type=${inputType} size=${inputSize}
        @input=${this.inputHandler}
        @paste=${this.pasteHandler}
        placeholder="${inputCtaText}"
        autocomplete="off"
        @keydown=${this.keydownHandler}
      >
      </input>
      <button type="button" class="primary" @click=${
        this.addInputValue
      }>add</button>

      <slot></slot>

      ${
        values.length === 0
          ? html``
          : html`
              ${this.heading(valuesTitle)}
              <ul>
                ${values.map(
                  (x) =>
                    html`<li>
                      <button
                        type="button"
                        class="text"
                        @click=${() => this.deselectValue(x)}
                      >
                        ${deselectButtonText}
                      </button>
                      ${itemWrapperFn(x)}
                    </li>`
                )}
              </ul>
            `
      }
    `;
  }

  private inputHandler(e: Event) {
    /* Swallow input events. */
    e.stopPropagation();
    this.input.setCustomValidity("");
  }

  private pasteHandler(e: ClipboardEvent) {
    e.preventDefault();
    e.stopPropagation();
    const { input, preserveTrailingWhitespace } = this;
    const pastedLines = (e.clipboardData as DataTransfer)
      .getData("text")
      .split("\n")
      .map((s) => s.trimStart())
      .map((s) => (preserveTrailingWhitespace ? s : s.trimEnd()))
      .filter((s) => s.length > 0);
    for (const line of pastedLines) {
      input.value = line;
      // Attempt to add the input value, abort on failure.
      if (!this.addInputValue()) {
        return;
      }
    }
  }

  private keydownHandler(e: KeyboardEvent) {
    if (e.keyCode === 13) {
      this.addInputValue();
    }
  }

  private get formInputsContainer(): HTMLElement | undefined {
    /*
     * Attempt to return any first slotted element as the hidden form inputs container.
     */
    const { inputName, slotEl } = this;
    const slottedEls = slotEl.assignedElements();
    if (slottedEls.length) {
      return slottedEls[0] as HTMLElement;
    }
    // Display a warning if inputName was specified but no slotted form inputs container
    // element was defined, as inputName implies the desire to emit hidden <input> elements
    // within the first slotted element so that they may become embedded within a
    // containing <form>.
    if (inputName) {
      console.warn(
        `Please specify a single, slotted <div></div> child to serve as embedded form inputs container for ArchInputAdder component with inputName=${inputName}`
      );
    }
    return undefined;
  }

  private addInputValue(): boolean {
    /* Maybe add a value from the current <input> value. Return a bool
     * indicating whether a value was added.
     */
    const {
      values,
      alreadyAddedText,
      input,
      inputValidator,
      preserveTrailingWhitespace,
    } = this;
    const value = preserveTrailingWhitespace
      ? input.value.trimStart()
      : input.value.trim();
    if (value.length === 0) {
      return false;
    }
    let validatedValue: undefined | string;
    try {
      validatedValue = inputValidator(value);
    } catch (e: unknown) {
      input.setCustomValidity((e as Error).message);
      input.reportValidity();
      return false;
    }
    if (values.includes(validatedValue)) {
      input.setCustomValidity(alreadyAddedText);
      input.reportValidity();
      return false;
    }
    this.values = [...values, validatedValue];
    input.value = "";
    this.onChange("add", validatedValue);
    return true;
  }

  private deselectValue(value: string) {
    this.values = this.values.filter((x) => x !== value);
    this.onChange("remove", value);
  }
}

// Injects the tag into the global name space
declare global {
  interface HTMLElementTagNameMap {
    "arch-input-adder": ArchInputAdder;
  }
}
