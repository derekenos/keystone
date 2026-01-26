import { LitElement, TemplateResult, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";

import { uniq } from "lodash-es";

import "@spectrum-web-components/icon/sp-icon.js";
import "@spectrum-web-components/tabs/sp-tabs.js";
import "@spectrum-web-components/tabs/sp-tab.js";
import "@spectrum-web-components/tabs/sp-tab-panel.js";
import "@spectrum-web-components/theme/sp-theme.js";
import "@spectrum-web-components/theme/src/themes.js";
import { Tabs } from "@spectrum-web-components/tabs";

import ArchAPI from "../../lib/ArchAPI";
import { UrlCollectionsParamName } from "../../lib/constants";
import {
  Paths,
  assertIsValidWildcardPatternUrl,
  checkSurt,
  createElement,
  identity,
  isValidCustomInputCollection,
  surtToUrl,
  urlToSurt,
  urlToExpandedSurts,
} from "../../lib/helpers";
import { Collection, ValueOf } from "../../lib/types";
import { AlertClass, ArchAlert } from "../../archAlert/index";
import { ArchGlobalModal } from "../../archGlobalModal";
import { ArchInputAdder } from "../../archInputAdder";
import "../../archInputAdder/index";
import "../../archAlert/index";

import "./arch-sub-collection-builder-submit-button";
import styles from "./styles";
import {
  DecodedFormData,
  FormFieldName,
  FormFieldValue,
  ParsedFormFieldValue,
  PreSendValue,
} from "./types";

// https://www.iana.org/assignments/media-types/media-types.xhtml
import ValidMediaTypeSubTypesMap from "./mediaTypes.js";

/*
 * Helpers
 */

function prepareDatetimeFieldValue(isoDateStr: string): string {
  // Convert Date to ARCH timestamp string (yyyyMMddHHmmSS).
  const d = new Date(isoDateStr);
  const yearStr = d.getFullYear();
  const monthStr = (d.getMonth() + 1).toString().padStart(2, "0");
  const dateStr = d.getDate().toString().padStart(2, "0");
  const hoursStr = d.getHours().toString().padStart(2, "0");
  const minutesStr = d.getMinutes().toString().padStart(2, "0");
  // The form input only provides for minute resolution, so append 00 for the seconds.
  return `${yearStr}${monthStr}${dateStr}${hoursStr}${minutesStr}00`;
}

/*
 * ArchSubCollectionBuilder Class
 */

@customElement("arch-sub-collection-builder")
export class ArchSubCollectionBuilder extends LitElement {
  @property({ type: String }) csrfToken!: string;

  @state() collections: undefined | Array<Collection> = undefined;
  @state() sourceCollectionIds: Set<Collection["id"]> = new Set();
  @state() data: undefined | DecodedFormData = undefined;
  @state() surtPrefixExpandedPrefixesMap: Record<string, Array<string>> = {};

  @query("form") form!: HTMLFormElement;
  @query("select#source") sourceSelect!: HTMLSelectElement;
  @query("arch-sub-collection-builder-submit-button")
  submitButton!: HTMLElement;
  @query("#url-surt-prefixes-tabs") urlSurtPrefixTabs!: Tabs;
  @query("#url-prefix-input-adder") urlPrefixInputAdder!: ArchInputAdder;
  @query("#untranslatable-surt-alert") untranslatableSurtAlert!: ArchAlert;
  @query("#surt-prefix-input-adder") surtPrefixInputAdder!: ArchInputAdder;
  @query("#status-input-adder") statusInputAdder!: ArchInputAdder;
  @query("#mime-input-adder") mimeInputAdder!: ArchInputAdder;

  static styles = styles;

  async connectedCallback() {
    super.connectedCallback();

    // Fetch available Collections and Jobs.
    await this.initCollections();
    // Select any initial Collections.
    this.sourceCollectionIds = new Set(
      new URLSearchParams(window.location.search)
        .getAll(UrlCollectionsParamName)
        .map((s) => parseInt(s))
    );
  }

  render() {
    const { collections, sourceCollectionIds } = this;
    const sourceCollections =
      collections === undefined
        ? []
        : collections.filter((x) => sourceCollectionIds.has(x.id));
    return html`
      <arch-alert
        .alertClass=${AlertClass.Primary}
        .message=${html`Use this form to create a custom collection by filtering
          the contents of one or more existing source collections. You may use
          as many of the filtering options below as you desire and leave others
          blank.
          <a
            href="https://arch-webservices.zendesk.com/hc/en-us/articles/16107865758228"
            target="_blank"
            >Learn about options and common choices here</a
          >. ARCH will email you when your custom collection is ready to use.`}
      >
      </arch-alert>

      <form @input=${this.inputHandler}>
        <label for="sources" class="required"> Source Collection(s) </label>
        <em id="sourceDesc">
          Select the collection(s) to use as the source for this custom
          collection.
        </em>
        <select
          name="sources"
          id="sources"
          aria-labelledby="source sourceDesc"
          required
          multiple
          size="8"
          ?disabled=${collections === undefined
            ? true
            : collections.length === 0}
          @change=${this.sourceCollectionsChangeHandler}
        >
          ${collections === undefined
            ? html`<option value="">Loading Collections...</option>`
            : collections.length === 0
            ? html`<option value="">
                No eligible input collections found
              </option>`
            : collections.map(
                (collection) => html`
                  <option
                    value="${collection.id}"
                    ?selected=${sourceCollectionIds.has(collection.id)}
                  >
                    ${collection.name}
                  </option>
                `
              )}
        </select>

        <label for="name" class="required"> Custom Collection Name </label>
        <em id="nameDesc">
          Give your custom collection a name to describe its contents.
        </em>
        <input
          type="text"
          name="name"
          id="name"
          autocomplete="off"
          aria-labelledby="name nameDesc"
          placeholder="${sourceCollections.length > 0
            ? sourceCollections[0].name
            : "Example Collection"} - My filters"
          required
        />

        <sp-theme color="light" scale="medium" style="margin-top: 0.75rem;">
          <sp-tabs selected="urlPrefixes" size="l" id="url-surt-prefixes-tabs">
            <sp-tab label="URL Prefix(es)" value="urlPrefixes"></sp-tab>
            <sp-tab label="SURT Prefix(es)" value="surtPrefixes"></sp-tab>

            <sp-tab-panel value="urlPrefixes">
              <div>
                <em>
                  Choose
                  <a
                    href="https://arch-webservices.zendesk.com/hc/en-us/articles/14410683244948#document"
                    target="_blank"
                    >web documents</a
                  >
                  to include in your custom collection by their URL prefix/es.
                </em>
                <arch-alert
                  id="untranslatable-surt-alert"
                  alertClass="info"
                  hidden
                ></arch-alert>
                <arch-input-adder
                  inputType="text"
                  inputCtaText="Enter URL prefix"
                  alreadyAddedText="URL prefix already added"
                  valuesTitle=""
                  id="url-prefix-input-adder"
                  .inputValidator=${ArchSubCollectionBuilder.urlPrefixInputAdderValidator}
                  .onChange=${this.syncUrlSurtPrefixes.bind(this)}
                ></arch-input-adder>
              </div>
            </sp-tab-panel>

            <sp-tab-panel value="surtPrefixes">
              <div>
                <em id="surtsDesc">
                  Choose
                  <a
                    href="https://arch-webservices.zendesk.com/hc/en-us/articles/14410683244948#document"
                    target="_blank"
                    >web documents</a
                  >
                  to include in your custom collection by their
                  <a
                    href="https://arch-webservices.zendesk.com/hc/en-us/articles/14410683244948#surt"
                    target="_blank"
                    >SURT prefix/es</a
                  >.
                </em>
                <arch-input-adder
                  inputType="text"
                  inputName="surtPrefixesOR"
                  inputCtaText="Enter SURT prefix"
                  alreadyAddedText="SURT prefix already added"
                  valuesTitle=""
                  preserveTrailingWhitespace
                  id="surt-prefix-input-adder"
                  .inputValidator=${ArchSubCollectionBuilder.surtPrefixInputAdderValidator}
                  .onChange=${this.syncUrlSurtPrefixes.bind(this)}
                  .itemWrapperFn=${this.surtPrefixItemWrapper.bind(this)}
                  ><div></div
                ></arch-input-adder>
              </div>
            </sp-tab-panel>
          </sp-tabs>
        </sp-theme>

        <label for="timestampFrom"> Crawl Date (start) </label>
        <em id="timestampFromDesc">
          Specify the earliest in a range of
          <a
            href="https://arch-webservices.zendesk.com/hc/en-us/articles/14410683244948#timestamp"
            target="_blank"
            >timestamps</a
          >
          to include in your custom collection, or leave blank to include all
          web documents going back to the earliest collected.
        </em>
        <input
          type="datetime-local"
          name="timestampFrom"
          id="timestampFrom"
          aria-labelledby="timestampFrom timestampFromDesc"
        />

        <label for="timestampTo"> Crawl Date (end) </label>
        <em id="timestampToDesc">
          Specify the latest in a range of
          <a
            href="https://arch-webservices.zendesk.com/hc/en-us/articles/14410683244948#timestamp"
            target="_blank"
            >timestamps</a
          >
          to include in your custom collection, or leave blank to include all
          web documents up to the most recent collected.
        </em>
        <input
          type="datetime-local"
          name="timestampTo"
          id="timestampTo"
          aria-labelledby="timestampTo timestampToDesc"
        />

        <label for="status"> HTTP Status </label>
        <em id="statusDesc">
          Choose web documents to include in your custom collection by their
          <a
            href="https://arch-webservices.zendesk.com/hc/en-us/articles/14410683244948#status"
            target="_blank"
            >HTTP status code/s</a
          >.
        </em>
        <arch-input-adder
          inputType="number"
          inputName="statusPrefixesOR"
          inputCtaText="200"
          alreadyAddedText="Status code already added"
          valuesTitle=""
          id="status-input-adder"
          aria-labelledby="status statusDesc"
          .inputValidator=${ArchSubCollectionBuilder.statusInputAdderValidator}
          .onChange=${this.refreshData.bind(this)}
          ><div></div
        ></arch-input-adder>

        <label for="mime"> MIME Type </label>
        <em id="mimeDesc">
          Choose web documents to include in your custom collection by their
          file format/s, expressed as
          <a
            href="https://arch-webservices.zendesk.com/hc/en-us/articles/14410683244948#mime"
            target="_blank"
            >MIME type/s</a
          >.
        </em>
        <arch-input-adder
          inputType="text"
          inputName="mimesOR"
          inputCtaText="text/html"
          alreadyAddedText="MIME already added"
          valuesTitle=""
          id="mime-input-adder"
          aria-labelledby="mime mimeDesc"
          .inputValidator=${ArchSubCollectionBuilder.mimeInputAdderValidator}
          .onChange=${this.refreshData.bind(this)}
          ><div></div
        ></arch-input-adder>

        <br />
        <arch-sub-collection-builder-submit-button
          .validateForm=${this.validateForm.bind(this)}
          .collections=${this.collections}
          .data=${this.data}
          @submit=${this.createSubCollection}
        >
        </arch-sub-collection-builder-submit-button>
      </form>
    `;
  }

  private inputHandler(e: Event | null) {
    // Clear any custom validity message on input value change.
    if (e) {
      (e.target as HTMLInputElement | HTMLSelectElement).setCustomValidity("");
    }
    this.data = this.formData;
  }

  private refreshData() {
    /* Do a component update to refresh the hidden surtPrefix input field set and invoke
     * inputHandler() to update this.data, and indirectly, submitButton.data.
     */
    this.requestUpdate();
    void this.updateComplete.then(() => this.inputHandler(null));
  }

  private async initCollections() {
    const response = await ArchAPI.collections.get([["empty", "=", false]]);
    this.collections = response.items.filter(isValidCustomInputCollection);
  }

  private setSourceCollectionIdsUrlParam(
    collectionIds: Array<Collection["id"]>
  ) {
    const url = new URL(window.location.href);
    // Unconditionally delete the params in preparation for any params.append()
    url.searchParams.delete(UrlCollectionsParamName);
    collectionIds.forEach((collectionId) =>
      url.searchParams.append(UrlCollectionsParamName, collectionId.toString())
    );
    history.replaceState(null, "", url.toString());
  }

  private sourceCollectionsChangeHandler(e: Event) {
    const collectionIds = Array.from(
      (e.target as HTMLSelectElement).selectedOptions
    ).map((el) => parseInt(el.value));
    this.sourceCollectionIds = new Set(collectionIds);
    this.setSourceCollectionIdsUrlParam(collectionIds);
  }

  fieldValueParserMap: Record<
    FormFieldName,
    (s: FormFieldValue) => ParsedFormFieldValue
  > = {
    mimesOR: (s) => identity<string>(s as string),
    name: (s) => identity<string>(s as string),
    sources: (s) => identity<Array<string>>(s as Array<string>),
    statusPrefixesOR: (s) => identity<string>(s as string),
    surtPrefixesOR: (s) => identity<string>(s as string),
    timestampFrom: (s) => identity<string>(s as string),
    timestampTo: (s) => identity<string>(s as string),
  };

  fieldValueValidatorMessagePairMap: Record<
    string,
    [(s: string) => boolean, string]
  > = {};

  fieldValuePreSendPrepareMap: Map<
    keyof DecodedFormData,
    (
      x: ValueOf<DecodedFormData>,
      _this: ArchSubCollectionBuilder
    ) => PreSendValue
  > = new Map([
    [
      "statusPrefixesOR",
      (xs) => (xs as Array<string>).map((x) => parseInt(x)) as PreSendValue,
    ],
    [
      "surtPrefixesOR",
      (xs, _this) => {
        // For each surt prefix, if an surtPrefixExpandedPrefixesMap entry exists, include
        // those values, otherwise include just the surt.
        const { surtPrefixExpandedPrefixesMap } = _this;
        const surtPrefixes = uniq(
          (xs as Array<string>)
            .map(
              (surtPrefix) =>
                surtPrefixExpandedPrefixesMap[surtPrefix] ?? [surtPrefix]
            )
            .flat()
        );
        surtPrefixes.sort();
        return surtPrefixes as PreSendValue;
      },
    ],
    [
      "timestampFrom",
      (s) => prepareDatetimeFieldValue(s as string) as PreSendValue,
    ],
    [
      "timestampTo",
      (s) => prepareDatetimeFieldValue(s as string) as PreSendValue,
    ],
  ]);

  decodeFormDataValue(k: FormFieldName, v: string): ValueOf<DecodedFormData> {
    let rv: ValueOf<DecodedFormData> = this.fieldValueParserMap[k](v);
    // If a validator is defined, apply it.
    const isValidMessagePair = this.fieldValueValidatorMessagePairMap[k];
    if (isValidMessagePair !== undefined) {
      const [isValid, message] = isValidMessagePair;
      const badVals = (Array.isArray(rv) ? rv : [rv]).filter(
        (s) => !isValid(s)
      );
      if (badVals.length > 0) {
        rv = new Error(`${message}: ${badVals.join(", ")}`);
      }
    }
    return rv;
  }

  validateDecodedFormData(data: DecodedFormData): DecodedFormData {
    // If a timestampFrom/To pair is invalid, add a validation error to the ...To field.
    if (
      typeof data.timestampFrom === "string" &&
      typeof data.timestampTo === "string" &&
      data.timestampFrom >= data.timestampTo
    ) {
      data.timestampTo = new Error(
        "Crawl Date (end) must be later than Crawl Date (start)"
      );
    }
    return data;
  }

  get formData(): DecodedFormData {
    // Return the <form> inputs as a validated, API POST-ready object.
    const formData = new FormData(this.form);
    const getAllKeys = new Set([
      "mimesOR",
      "sources",
      "statusPrefixesOR",
      "surtPrefixesOR",
    ]);
    let data = Object.fromEntries(
      Array.from(new Set(formData.keys()).values()) // use Set to dedupe keys
        .map((k) => [
          k,
          getAllKeys.has(k) ? formData.getAll(k) : formData.get(k),
        ])
        // Convert the form input strings to their API POST-ready values.
        .map(([k, v]) => [
          k,
          // Assume keys in getAllKeys are Array<string> and require no parsing.
          getAllKeys.has(k as string)
            ? (v as Array<string>)
            : this.decodeFormDataValue(k as FormFieldName, v as string),
        ])
        // Remove fields with an empty string or Array value.
        .filter(
          ([, v]) =>
            v instanceof Error || (v as string | Array<string>).length > 0
        )
    ) as DecodedFormData;
    data = this.validateDecodedFormData(data);
    return data;
  }

  setFormInputValidity(data: DecodedFormData) {
    // Set or clear each form <input>'s validity based on whether a decoding
    // attempt failed.
    for (const [k, v] of Object.entries(data)) {
      if (k !== "sources") {
        (
          this.form.querySelector(`[name="${k}"]`) as HTMLInputElement
        ).setCustomValidity(v instanceof Error ? v.message : "");
      }
    }
  }

  private prepareFormDataForSend(
    data: DecodedFormData
  ): Record<keyof DecodedFormData, PreSendValue> {
    //  Apply any pre-flight formData conversions.
    // PreSendValue is a superset of ValueOf<DecodedFormData>.
    const finalData = Object.assign({}, data) as Record<
      keyof DecodedFormData,
      PreSendValue
    >;
    Array.from(this.fieldValuePreSendPrepareMap.entries()).forEach(
      ([k, prepareFn]) => {
        if (finalData[k] !== undefined) {
          finalData[k] = prepareFn(
            finalData[k] as ValueOf<DecodedFormData>,
            this
          );
        }
      }
    );
    return finalData;
  }

  private async doPost(data: Record<keyof DecodedFormData, PreSendValue>) {
    const { csrfToken } = this;
    return fetch("/api/collections/custom", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        "X-CSRFToken": csrfToken,
      },
      mode: "cors",
      body: JSON.stringify(data),
    });
  }

  validateForm(): boolean {
    /* Validate the form inputs and return a boolean indicating whether the
       inputs are valid.*/
    const { form, formData } = this;

    // Update form field validity.
    this.setFormInputValidity(formData);

    // Check form validity and return true if valid.
    if (form.checkValidity()) {
      return true;
    }
    form.reportValidity();
    return false;
  }

  private get successModalContent(): HTMLSpanElement {
    /* Return an element to serve as the success modal content. */
    return createElement("span", {
      children: [
        "You will receive an email when your custom collection is ready to view. You will be able to access it from the ",
        createElement("a", {
          href: Paths.collections,
          textContent: "Collections page",
        }),
      ],
    });
  }

  resetInputAdderInputs() {
    // Reset the ArchInputAdder-type inputs.
    const {
      mimeInputAdder,
      statusInputAdder,
      urlPrefixInputAdder,
      urlSurtPrefixTabs,
      surtPrefixInputAdder,
    } = this;
    urlPrefixInputAdder.values = [];
    surtPrefixInputAdder.values = [];
    this.syncUrlSurtPrefixes();
    urlSurtPrefixTabs.selected = "urlPrefixes";
    statusInputAdder.values = [];
    mimeInputAdder.values = [];
  }

  private async createSubCollection(e: Event) {
    // Prevent the form submission.
    e.preventDefault();
    // Make the request.
    const res = await this.doPost(this.prepareFormDataForSend(this.formData));
    const { submitButton } = this;
    if (res.ok) {
      // Request was successful. Reset the form and show the notification modal.
      this.form.reset();
      this.resetInputAdderInputs();
      ArchGlobalModal.showNotification(
        "ARCH is creating your custom collection",
        this.successModalContent,
        submitButton
      );
    } else {
      // Request failed. Show the error modal.
      ArchGlobalModal.showError(
        "",
        "Could not create custom collection. Please try again.",
        submitButton
      );
    }
  }

  private static urlPrefixInputAdderValidator(urlPrefix: string): string {
    // Use URL() to validate and normalize the urlPrefix value.
    let url: undefined | URL = undefined;
    try {
      url = new URL(urlPrefix);
    } catch {
      throw new Error("Please enter a valid HTTP URL");
    }
    if (!url.protocol.toLowerCase().startsWith("http")) {
      throw new Error("Please enter a valid HTTP URL");
    }
    // Strip any "www." hostname prefix to mirror SURT behavior.
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
    }
    // Transform "/*" suffix to "/".
    if (url.pathname.endsWith("/*")) {
      url.pathname = url.pathname.slice(0, -1);
    }
    assertIsValidWildcardPatternUrl(url);
    return url.href;
  }

  private static surtPrefixInputAdderValidator(surtPrefix: string): string {
    // Use SURT() to validate and normalize the surtPrefix value.
    if (!checkSurt(surtPrefix).isValid) {
      throw new Error("Please enter a valid SURT");
    }
    if (surtPrefix.includes("*")) {
      throw new Error("SURT can not contain wildcard (*) character");
    }
    return surtPrefix;
  }

  private purgeOldSurtPrefixExpandedPrefixesMapEntries() {
    /*
     * Purge surtPrefixExpandedPrefixesMap entries whose keys ar
     * no longer defined in surtPrefixInputAdder.values.
     */
    const { surtPrefixExpandedPrefixesMap, surtPrefixInputAdder } = this;
    Object.keys(surtPrefixExpandedPrefixesMap)
      .filter((k) => !surtPrefixInputAdder.values.includes(k))
      .forEach((k) => delete surtPrefixExpandedPrefixesMap[k]);
  }

  private static statusInputAdderValidator(statusCode: string): string {
    const n = parseInt(statusCode);
    if (!(n >= 100 && n <= 599)) {
      throw new Error("Please enter a valid status code in range: 100 - 599");
    }
    return statusCode;
  }

  private static mimeInputAdderValidator(mime: string): string {
    const splits = mime.split("/");
    if (
      splits.length !== 2 ||
      !(ValidMediaTypeSubTypesMap as Record<string, Array<string>>)[
        splits[0]
      ]?.includes(splits[1])
    ) {
      throw new Error("Please enter a valid MIME");
    }
    return mime;
  }

  private syncUrlSurtPrefixes() {
    /*
     * Mirror the configured values in the currently selected URL/SURT prefix
     * tab input element to the other, non-selected element.
     */
    const {
      urlPrefixInputAdder,
      surtPrefixInputAdder,
      untranslatableSurtAlert,
      urlSurtPrefixTabs,
      surtPrefixExpandedPrefixesMap,
    } = this;
    const urlPrefixes = urlPrefixInputAdder.values;
    const surtPrefixes = surtPrefixInputAdder.values;
    const untranslatableSurtPrefixes = surtPrefixes.filter(
      (x) => surtToUrl(x) === null
    );

    if (urlSurtPrefixTabs.selected === "urlPrefixes") {
      // Sync urlPrefixes to surtPrefixes.
      // Collect the surts that were entered using the SURT Prefix(es) intput,
      // as indicated by the surt's absence from surtPrefixExpandedPrefixesMap.
      const nonUrlSurts = surtPrefixInputAdder.values.filter(
        (x) => surtPrefixExpandedPrefixesMap[x] === undefined
      );

      // Create an array of SURTs that aren't aready present in
      // surtPrefixInputAdder.values and generate an expanded SURTs set for each.
      const urlSurts: Array<string> = [];
      for (const url of urlPrefixes) {
        const surt = urlToSurt(url);
        urlSurts.push(surt);
        // Only generate a surtPrefixExpandedPrefixesMap entry if the surt
        // was not previously added via the SURT Prefix(es) input.
        if (!nonUrlSurts.includes(surt)) {
          surtPrefixExpandedPrefixesMap[surt] = urlToExpandedSurts(url);
        }
      }
      surtPrefixInputAdder.values = untranslatableSurtPrefixes.concat(urlSurts);
    } else {
      // Sync translatable surtPrefixes to urlPrefixes.
      // Note that the urlPrefixInputAdder.values setter handler stripping trailing whitespace,
      // dedupe, and validation.
      urlPrefixInputAdder.values = Array.from(surtPrefixes)
        .filter((x) => !untranslatableSurtPrefixes.includes(x))
        .map(surtToUrl)
        .filter((x) => x !== null) as Array<string>;
    }

    // Ensure that surtPrefixExpandedPrefixesMap entries remain for deleted surts.
    this.purgeOldSurtPrefixExpandedPrefixesMapEntries();

    // Show/hide the untranslatable SURT prefixes alert.
    const untransSurtCount = untranslatableSurtPrefixes.length;
    if (untransSurtCount === 0) {
      untranslatableSurtAlert.hide();
    } else {
      untranslatableSurtAlert.message = html`
        <details style="font-size: 0.9em;">
          <summary>
            ${untransSurtCount} configured SURT
            Prefix${untransSurtCount > 1 ? "es" : ""} not shown
          </summary>
          <br />
          ${untransSurtCount > 1
            ? "The following SURT Prefixes can not be visually represented as URL Prefixes"
            : "The following SURT Prefix can not be visually represented as a URL Prefix"}:
          <ul style="margin: 0;">
            ${untranslatableSurtPrefixes.map(
              (x) => html`<li><strong>${x}</strong></li>`
            )}
          </ul>
        </details>
      `;
      untranslatableSurtAlert.show();
    }
    this.refreshData();
  }

  private surtPrefixItemWrapper(surtPrefix: string): string | TemplateResult {
    const { surtPrefixExpandedPrefixesMap } = this;
    const expandedSurts = surtPrefixExpandedPrefixesMap[surtPrefix];
    // Don't need to worry about surtPrefix being surrounded by quotes here because
    // the URL prefix input strips trailing whitespace.
    return !expandedSurts
      ? surtPrefix
      : html`
          <span
            style="display: inline-block; vertical-align: top; margin-bottom: 0.5rem;"
          >
            ${surtPrefix}
            <br />
            <details
              style="display: inline-block; margin: 0.5rem 0 0 0.2rem;
                   color: #444; font-size: 0.9em; cursor: pointer;"
              title="These variations were automatically generated during URL to SURT prefix conversion and are intended to increase matches."
            >
              <summary>
                Show all SURTs generated by this URL prefix conversion
              </summary>
              <ul style="padding-inline-start: 1rem;">
                ${expandedSurts.map(
                  (s) =>
                    html`<li
                      style="margin: 0.5rem 0; cursor: text; font-size: inherit;"
                    >
                      ${s.endsWith(" ") ? `"${s}"` : s}
                    </li>`
                )}
              </ul>
            </details>
          </span>
        `;
  }
}

// Injects the tag into the global name space
declare global {
  interface HTMLElementTagNameMap {
    "arch-sub-collection-builder": ArchSubCollectionBuilder;
  }
}
