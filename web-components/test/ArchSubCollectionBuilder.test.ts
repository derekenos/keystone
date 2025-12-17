import {
  assert,
  elementUpdated,
  fixture,
  html,
  waitUntil,
} from "@open-wc/testing";
import { spy, stub } from "sinon";

import ArchAPI from "../src/lib/ArchAPI";

import "../src/archSubCollectionBuilder/index";
import "../src/archInputAdder/index";
import "../src/archModal/index";

/*
 * Global stubs (WHERE DO THESE BELONG?)
 */

// Stub ArchAPI.collection.get to return a canned response.
stub(ArchAPI, "collections").get(() => ({
  get: async () => ({
    count: 1,
    items: [
      {
        id: 1,
        name: "ARCH Test Collection 1",
        collection_type: "SPECIAL",
        size_bytes: 176128,
        dataset_count: 40,
        latest_dataset: {
          id: 106,
          name: "Word processing file information",
          start_time: "2025-04-15T22:28:41.978Z",
        },
        metadata: null,
      },
      {
        id: 2,
        name: "ARCH Test Collection 2",
        collection_type: "SPECIAL",
        size_bytes: 176128,
        dataset_count: 0,
        latest_dataset: {},
        metadata: null,
      },
    ],
  }),
}));

/*
 * Fixtures
 */

class InputAdderProxy {
  /*
   * <input>-compatible interface proxy for ArchInputAdder component.
   */
  constructor(instance) {
    this.instance = instance;
    this.input = instance.input;
    this.name = instance.inputName;
  }
  set value(value) {
    this.input.value = value;
    this.instance.addInputValue();
  }
  get validationMessage() {
    return this.input.validationMessage;
  }
  get dispatchEvent() {
    return this.input.dispatchEvent.bind(this.input);
  }
  checkValidity() {
    return this.input.validationMessage === "";
  }
  reset() {
    this.instance.values = [];
    this.input.value = "";
    this.input.setCustomValidity("");
  }
}

async function elInputsMapPair() {
  /*
   * Return a pair comprising a ArchSubCollectionBuilder element fixture
   * and an inputName -> inputElement map.
   */
  const el = await fixture(
    html`<arch-sub-collection-builder></arch-sub-collection-builder>`
  );

  // Wait for collections to be initialized.
  el.requestUpdate();
  await el.updateComplete;
  const sourcesEl = el.form.querySelector("select[name=sources]");
  await waitUntil(() => sourcesEl.options.length === 2);
  const inputNames = ["sources", "name", "timestampFrom", "timestampTo"];
  return [
    el,
    Object.fromEntries(
      inputNames
        .map((n) => [n, el.form.querySelector(`[name="${n}"]`)])
        .concat([
          ["surtPrefixesOR", new InputAdderProxy(el.surtPrefixInputAdder)],
          ["statusPrefixesOR", new InputAdderProxy(el.statusInputAdder)],
          ["mimesOR", new InputAdderProxy(el.mimeInputAdder)],
        ])
    ),
  ];
}

async function elInputPair(inputName) {
  /*
   * Return a pair comprising a ArchSubCollectionBuilder element fixture
   * and the specified form input element.
   */
  const [el, inputsMap] = await elInputsMapPair();
  return [el, inputsMap[inputName]];
}

/*
 * Helpers
 */

function assertInputIsValid(
  el,
  inputEl,
  inputValue,
  decodedValue,
  preSendValue
) {
  // Set the input to the specified value.
  inputEl.value = inputValue;
  // Decode the form data and use it to set form validity.
  const formData = el.formData;
  el.setFormInputValidity(formData);

  // Assert that the input state is valid and decoded value is as expected.
  assert.isTrue(inputEl.checkValidity());

  assert.deepEqual(formData[inputEl.name], decodedValue);
  if (preSendValue !== undefined) {
    assert.deepEqual(
      el.prepareFormDataForSend(formData)[inputEl.name],
      preSendValue
    );
  }
}

function assertInputIsInvalid(
  el,
  inputEl,
  inputValue,
  badValsStr,
  fullCustomValidation
) {
  // Set the input to the specified value.
  inputEl.value = inputValue;
  // Decode the form data and use it to set form validity.
  const formData = el.formData;
  el.setFormInputValidity(formData);
  // Assert that the input state is invalid and that the custom validity
  // message is as expected.
  assert.isFalse(inputEl.checkValidity());
  assert.equal(
    inputEl.validationMessage,
    fullCustomValidation ||
      `Please correct the invalid value(s): ${badValsStr ?? inputValue.trim()}`
  );
  // Do not check for presence of Error in formData for ArchInputAdder elements.
  if (!(inputEl instanceof InputAdderProxy)) {
    assert.instanceOf(formData[inputEl.name], Error);
  }
  // Assert that the next input event clears the custom validity state.
  inputEl.dispatchEvent(new Event("input", { bubbles: true }));
  assert.isTrue(inputEl.checkValidity());
  assert.empty(inputEl.validationMessage);
}

/*
 * Tests
 */

describe("ArchSubCollectionBuilder", () => {
  /*
   * SURT Prefix(es) form input tests
   */
  describe("surt prefixes form input", () => {
    it("accepts and decodes valid single values", async () => {
      const [el, inputEl] = await elInputPair("surtPrefixesOR");
      // Ensure that the SURT Prefix(es) tab is selected to prevent value overwrite'
      // via call to syncUrlSurtPrefixes().
      el.urlSurtPrefixTabs.selected = "surtPrefixes";
      // Expect preSendVal to have the trailing domain-part comma removed.
      for (const [inputVal, decodedVal, preSendVal] of [
        ["org,archive", ["org,archive"], ["org,archive"]],
        ["org,arch-ive", ["org,arch-ive"], ["org,arch-ive"]], // hyphen is valid label char
        ["org,archive,", ["org,archive,"], ["org,archive,"]],
        ["org,archive,books,", ["org,archive,books,"], ["org,archive,books,"]],
        ["org,archive)/", ["org,archive)/"], ["org,archive)/"]],
        ["org,archive)/a", ["org,archive)/a"], ["org,archive)/a"]],
        ["org,archive)/a/b", ["org,archive)/a/b"], ["org,archive)/a/b"]],
        [
          "org,archive)/a/b?c=1",
          ["org,archive)/a/b?c=1"],
          ["org,archive)/a/b?c=1"],
        ],
      ]) {
        // Reset the InputAdder proxy.
        inputEl.reset();
        assertInputIsValid(el, inputEl, inputVal, decodedVal, preSendVal);
      }
    });

    it("accepts and decodes valid multiple values", async () => {
      const [el, inputEl] = await elInputPair("surtPrefixesOR");
      // Ensure that the SURT Prefix(es) tab is selected to prevent value overwrite'
      // via call to syncUrlSurtPrefixes().
      el.urlSurtPrefixTabs.selected = "surtPrefixes";
      const vals = [
        "com,example,",
        "com,example)/",
        "com,example)/1/2/3?q=search",
      ];
      // Expect preSendVals to have been sorted.
      const preSendVals = [
        "com,example)/",
        "com,example)/1/2/3?q=search",
        "com,example,",
      ];
      // Manually add all but the last value, which we'll pass to assertInputIsValid.
      for (const x of vals.slice(0, -1)) {
        inputEl.value = x;
      }
      assertInputIsValid(el, inputEl, vals[vals.length - 1], vals, preSendVals);
    });

    it("rejects invalid single values", async () => {
      const [el, inputEl] = await elInputPair("surtPrefixesOR");
      for (const [inputVal, errorMessage] of [
        ["org", "Please enter a valid SURT"],
        ["org,", "Please enter a valid SURT"],
        ["org,arch_ive", "Please enter a valid SURT"], // underscore is invalid label char
        ["org,archive/", "Please enter a valid SURT"],
        ["org,archive)/*", "SURT can not contain wildcard (*) character"],
        ["org,archive)a", "Please enter a valid SURT"],
        ["https://archive.org", "Please enter a valid SURT"],
        ["https://archive.org/a/b?c=1", "Please enter a valid SURT"],
        ["not even trying", "Please enter a valid SURT"],
      ]) {
        assertInputIsInvalid(el, inputEl, inputVal, undefined, errorMessage);
      }
    });
  });

  /*
   * Crawl Date (start) form input tests
   */
  describe("crawl date start form input", () => {
    it("decodes to ARCH timestamp string", async () => {
      const [el, inputEl] = await elInputPair("timestampFrom");
      for (const [val, preSendVal] of [
        ["2023-08-08T12:00", "20230808120000"],
        ["2023-08-08T12:59", "20230808125900"],
      ]) {
        assertInputIsValid(el, inputEl, val, val, preSendVal);
      }
    });
  });

  /*
   * Crawl Date (end) form input tests
   */
  describe("crawl date end form input", () => {
    it("decodes to ARCH timestamp string", async () => {
      const [el, inputEl] = await elInputPair("timestampTo");
      for (const [val, preSendVal] of [
        ["2023-08-08T12:00", "20230808120000"],
        ["2023-08-08T12:59", "20230808125900"],
      ]) {
        assertInputIsValid(el, inputEl, val, val, preSendVal);
      }
    });
  });

  /*
   * Combined Crawl Date (start/end) form input tests
   */
  describe("combined crawl date end/start form inputs", () => {
    it("accepts a valid range", async () => {
      const [el, inputsMap] = await elInputsMapPair();
      assertInputIsValid(
        el,
        inputsMap.timestampFrom,
        "2023-08-08T12:00",
        "2023-08-08T12:00",
        "20230808120000"
      );
      assertInputIsValid(
        el,
        inputsMap.timestampTo,
        "2023-08-08T12:01",
        "2023-08-08T12:01",
        "20230808120100"
      );
    });

    it("rejects a range where timestampFrom > timestampTo", async () => {
      const [el, inputsMap] = await elInputsMapPair();
      assertInputIsValid(
        el,
        inputsMap.timestampFrom,
        "2023-08-08T12:01",
        "2023-08-08T12:01",
        "20230808120100"
      );
      assertInputIsInvalid(
        el,
        inputsMap.timestampTo,
        "2023-08-08T12:00",
        null,
        "Crawl Date (end) must be later than Crawl Date (start)"
      );
    });

    it("rejects a range where timestampFrom == timestampTo", async () => {
      const [el, inputsMap] = await elInputsMapPair();
      assertInputIsValid(
        el,
        inputsMap.timestampFrom,
        "2023-08-08T12:01",
        "2023-08-08T12:01",
        "20230808120100"
      );
      assertInputIsInvalid(
        el,
        inputsMap.timestampTo,
        "2023-08-08T12:01",
        null,
        "Crawl Date (end) must be later than Crawl Date (start)"
      );
    });
  });

  /*
   * HTTP Status form input tests
   */
  describe("status code form input", () => {
    it("accepts and decodes a single valid value", async () => {
      const [el, inputEl] = await elInputPair("statusPrefixesOR");
      for (const [inputVal, decodedVal, preSendVal] of [
        ["100", ["100"], [100]],
        ["200", ["200"], [200]],
        ["302", ["302"], [302]],
        ["400", ["400"], [400]],
        ["404", ["404"], [404]],
        ["503", ["503"], [503]],
        ["599", ["599"], [599]],
      ]) {
        // Reset the InputAdder proxy.
        inputEl.reset();
        assertInputIsValid(el, inputEl, inputVal, decodedVal, preSendVal);
      }
    });

    it("rejects invalid single values", async () => {
      const [el, inputEl] = await elInputPair("statusPrefixesOR");
      for (const inputVal of ["-200", "0", "99", "600"]) {
        // Reset the InputAdder proxy.
        inputEl.reset();
        assertInputIsInvalid(
          el,
          inputEl,
          inputVal,
          null,
          "Please enter a valid status code in range: 100 - 599"
        );
      }
    });
  });

  /*
   * MIME Type form input tests
   */
  describe("mime type form input", () => {
    it("accepts and decodes a single valid value", async () => {
      const [el, inputEl] = await elInputPair("mimesOR");
      for (const [inputVal, decodedAndPreSendVal] of [
        ["text/html", ["text/html"]],
        ["application/json", ["application/json"]],
        ["audio/aac", ["audio/aac"]],
        ["font/collection", ["font/collection"]],
        ["image/bmp", ["image/bmp"]],
        ["model/step", ["model/step"]],
        ["video/mp4", ["video/mp4"]],
        // Test MIMEs that were previously, accidentally omitted.
        ["image/gif", ["image/gif"]],
        ["image/jpeg", ["image/jpeg"]],
        ["model/mesh", ["model/mesh"]],
        ["model/vrml", ["model/vrml"]],
        ["text/enriched", ["text/enriched"]],
        ["text/plain", ["text/plain"]],
        ["text/richtext", ["text/richtext"]],
        ["video/mpeg", ["video/mpeg"]],
      ]) {
        // Reset the InputAdder proxy.
        inputEl.reset();
        assertInputIsValid(
          el,
          inputEl,
          inputVal,
          decodedAndPreSendVal,
          decodedAndPreSendVal
        );
      }
    });

    it("rejects invalid single values", async () => {
      const [el, inputEl] = await elInputPair("mimesOR");
      for (const inputVal of [
        "not good",
        "textual/html",
        "text/htmlized",
        "applications/json",
        "applications/jsonified",
        "audiofile/aac",
        "audio/aacdefg",
        "fontificate/collection",
        "font/collectionize",
        "imagaine/bmp",
        "image/bmpbmpitup",
        "modal/step",
        "model/stepbystep",
        "videotape/mp4",
        "video/mp4eva",
      ]) {
        // Reset the InputAdder proxy.
        inputEl.reset();
        assertInputIsInvalid(
          el,
          inputEl,
          inputVal,
          null,
          "Please enter a valid MIME"
        );
      }
    });
  });

  /*
   * Form submit payload tests
   */
  describe("form submission", () => {
    it("POSTs the expected single-input-collection payload to /api/collections/custom", async () => {
      const [el, inputsMap] = await elInputsMapPair();
      // Select a single input collection.
      Array.from(inputsMap.sources.options)
        .filter((x) => x.value === "1")
        .map((x) => (x.selected = true));
      // Enter values for the remaining input fields.
      inputsMap.name.value = "ARCH Test Collection - HTML Only 3";
      // The InputAdderProxy(s) will aggregate values if you assign multiple times.
      inputsMap.surtPrefixesOR.value = "org,archive";
      inputsMap.surtPrefixesOR.value = "org,archive-it";
      inputsMap.timestampFrom.value = "2023-08-15T12:00";
      inputsMap.timestampTo.value = "2023-08-16T12:00";
      inputsMap.statusPrefixesOR.value = "200";
      inputsMap.statusPrefixesOR.value = "403";
      inputsMap.mimesOR.value = "text/html";
      inputsMap.mimesOR.value = "text/css";
      // Do the submit.
      const doPostSpy = spy(el, "doPost");
      // Click the confirmation modal confirm button.
      el.submitButton.shadowRoot
        .querySelector("arch-modal")
        .shadowRoot.querySelector("button.primary")
        .click();
      // Check the payload.
      assert.isTrue(
        doPostSpy.calledWith({
          sources: ["1"],
          name: "ARCH Test Collection - HTML Only 3",
          surtPrefixesOR: ["org,archive", "org,archive-it"],
          timestampFrom: "20230815120000",
          timestampTo: "20230816120000",
          statusPrefixesOR: [200, 403],
          mimesOR: ["text/html", "text/css"],
        })
      );
    });

    it("POSTs the expected multi-input-collection payload to /api/collections/custom", async () => {
      const [el, inputsMap] = await elInputsMapPair();
      // Select multiple input collections.
      Array.from(inputsMap.sources.options)
        .filter((x) => x.value === "1" || x.value === "2")
        .map((x) => (x.selected = true));
      // Enter values for the remaining input fields.
      inputsMap.name.value = "ARCH Test Collection - HTML Only 3";
      // The InputAdderProxy(s) will aggregate values if you assign multiple times.
      inputsMap.surtPrefixesOR.value = "org,archive";
      inputsMap.surtPrefixesOR.value = "org,archive-it";
      inputsMap.timestampFrom.value = "2023-08-15T12:00";
      inputsMap.timestampTo.value = "2023-08-16T12:00";
      inputsMap.statusPrefixesOR.value = "200";
      inputsMap.statusPrefixesOR.value = "403";
      inputsMap.mimesOR.value = "text/html";
      inputsMap.mimesOR.value = "text/css";
      // Do the submit.
      const doPostSpy = spy(el, "doPost");
      // Click the confirmation modal confirm button.
      el.submitButton.shadowRoot
        .querySelector("arch-modal")
        .shadowRoot.querySelector("button.primary")
        .click();
      // Check the payload.
      assert.isTrue(
        doPostSpy.calledWith({
          sources: ["1", "2"],
          name: "ARCH Test Collection - HTML Only 3",
          surtPrefixesOR: ["org,archive", "org,archive-it"],
          timestampFrom: "20230815120000",
          timestampTo: "20230816120000",
          statusPrefixesOR: [200, 403],
          mimesOR: ["text/html", "text/css"],
        })
      );
    });
  });
});
