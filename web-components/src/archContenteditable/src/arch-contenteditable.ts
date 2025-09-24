import { LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

const styles = `
  arch-contenteditable {
    display: inline-block;
    cursor: text;
  }

  arch-contenteditable:not(:focus)::after {
    content: "";
    display: inline-block;
    margin-left: 0.5em;
    width: 0.6em;
    height: 0.6em;
    opacity: 0.5;
    /*
      Setting pointer-events=none on pencil icon fixes an issue where
      clicking on the icon prevents Chrome from positioning a cursor
      inside the editable element.
    */
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3C!--!Font Awesome Free v7.0.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--%3E%3Cpath d='M36.4 353.2c4.1-14.6 11.8-27.9 22.6-38.7l181.2-181.2 33.9-33.9c16.6 16.6 51.3 51.3 104 104l33.9 33.9-33.9 33.9-181.2 181.2c-10.7 10.7-24.1 18.5-38.7 22.6L30.4 510.6c-8.3 2.3-17.3 0-23.4-6.2S-1.4 489.3 .9 481L36.4 353.2zm55.6-3.7c-4.4 4.7-7.6 10.4-9.3 16.6l-24.1 86.9 86.9-24.1c6.4-1.8 12.2-5.1 17-9.7L91.9 349.5zm354-146.1c-16.6-16.6-51.3-51.3-104-104L308 65.5C334.5 39 349.4 24.1 352.9 20.6 366.4 7 384.8-.6 404-.6S441.6 7 455.1 20.6l35.7 35.7C504.4 69.9 512 88.3 512 107.4s-7.6 37.6-21.2 51.1c-3.5 3.5-18.4 18.4-44.9 44.9z'/%3E%3C/svg%3E");
  }

  arch-contenteditable:not(:focus):hover::after {
    opacity: 1;
  }
`;

@customElement("arch-contenteditable")
export class ArchContenteditable extends LitElement {
  @property({ type: String }) modelName!: string;
  @property({ type: String }) fieldName!: string;
  @property({ type: String }) instanceUrl!: string;
  @property({ type: Array }) updatePageRefSelectors!: string[];
  @property({ type: Boolean }) collapseAndTrimWhitespace = true;
  @property({ type: String }) csrfToken!: string;
  /*
   * Note that only plain-text values, indicated by contenteditable="plaintext-only", are
   * currently supported because trying to escape/unescape the text/html
   * to/from the string/textarea (which is functionally what a contenteditable element is)
   * is a total pain and we don't need that functionality right now.
   * We log a warning to console if you try to set contenteditable=true.
   */
  @property({ type: String, reflect: true }) contenteditable = "plaintext-only";

  @state() lastContent = "";

  createRenderRoot() {
    // Disable shadow root creation.
    return this;
  }

  maybeAttachStylesheet() {
    // Attach a component-specific stylesheet if not already attached.
    const stylesheetName = "arch-contenteditable";
    if (!document.querySelector(`style[name=${stylesheetName}]`)) {
      const style = document.createElement("style");
      style.setAttribute("name", stylesheetName);
      style.textContent = styles;
      document.head.appendChild(style);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    const { contenteditable, modelName, fieldName } = this;

    // Log a warning about plain-text-only support if contenteditable=true.
    if (contenteditable === "true") {
      console.warn(
        `The ${modelName} ${fieldName} arch-editablecontent element specifies contenteditable=true but only plain-text is currently supported`
      );
    }

    // Ensure that stylesheet is attached.
    this.maybeAttachStylesheet();

    // Save initial content as last.
    this.lastContent = this.filteredTextContent;

    // Set attributes and add handlers.
    this.setAttribute("title", `Edit ${modelName} ${fieldName}`);
    this.addEventListener("focusout", () => void this.doUpdate());
    this.addEventListener("keydown", (e) => void this.keydownHandler(e));
  }

  get filteredTextContent() {
    const { collapseAndTrimWhitespace } = this;
    const textContent = this.textContent as string;
    return collapseAndTrimWhitespace
      ? textContent.replaceAll(/\s+/g, " ").trim()
      : textContent;
  }

  revertAndBlur() {
    const { lastContent } = this;
    this.textContent = lastContent;
    this.blur();
  }

  async doUpdate() {
    const {
      csrfToken,
      fieldName,
      instanceUrl,
      lastContent,
      modelName,
      updatePageRefSelectors,
    } = this;
    const textContent = this.filteredTextContent;

    // Reflect filtered plain-text value back to element.
    this.textContent = textContent;

    // Ignore if value hasn't changed.
    if (textContent === lastContent) {
      this.blur();
      return;
    }
    // Revert to last value if current value is empty.
    if (textContent.length === 0) {
      this.revertAndBlur();
      return;
    }

    let error = false;
    try {
      const res = await fetch(instanceUrl, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({
          [fieldName]: textContent,
        }),
      });
      error = !res.ok;
    } catch (e) {
      error = true;
    }

    if (error) {
      console.warn(`Could not update ${modelName} ${fieldName}`);
      this.revertAndBlur();
      return;
    }

    // Update was successful - set current value as last.
    this.lastContent = textContent;

    // Update any additional page references.
    for (const selector of updatePageRefSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        el.textContent = textContent;
      }
    }
  }

  async keydownHandler(e: KeyboardEvent) {
    switch (e.key) {
      case "Escape":
        // Blur the element and restore its previous value.
        e.preventDefault();
        e.stopPropagation();
        this.revertAndBlur();
        break;

      case "Enter":
        // Prevent the Enter key from adding a newline, do the update, and blur the element.
        e.preventDefault();
        e.stopPropagation();
        await this.doUpdate();
        this.blur();
        break;
    }
  }
}

// Injects the tag into the global name space
declare global {
  interface HTMLElementTagNameMap {
    "arch-contenteditable": ArchContenteditable;
  }
}
