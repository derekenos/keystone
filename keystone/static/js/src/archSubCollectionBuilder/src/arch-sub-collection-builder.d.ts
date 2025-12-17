import { LitElement, TemplateResult } from "lit";
import "@spectrum-web-components/icon/sp-icon.js";
import "@spectrum-web-components/tabs/sp-tabs.js";
import "@spectrum-web-components/tabs/sp-tab.js";
import "@spectrum-web-components/tabs/sp-tab-panel.js";
import "@spectrum-web-components/theme/sp-theme.js";
import "@spectrum-web-components/theme/src/themes.js";
import { Tabs } from "@spectrum-web-components/tabs";
import { Collection, ValueOf } from "../../lib/types";
import { ArchAlert } from "../../archAlert/index";
import { ArchInputAdder } from "../../archInputAdder";
import "../../archInputAdder/index";
import "../../archAlert/index";
import "./arch-sub-collection-builder-submit-button";
import { DecodedFormData, FormFieldName, FormFieldValue, ParsedFormFieldValue, PreSendValue } from "./types";
export declare class ArchSubCollectionBuilder extends LitElement {
    csrfToken: string;
    collections: undefined | Array<Collection>;
    sourceCollectionIds: Set<Collection["id"]>;
    data: undefined | DecodedFormData;
    surtPrefixExpandedPrefixesMap: Record<string, Array<string>>;
    form: HTMLFormElement;
    sourceSelect: HTMLSelectElement;
    submitButton: HTMLElement;
    urlSurtPrefixTabs: Tabs;
    urlPrefixInputAdder: ArchInputAdder;
    untranslatableSurtAlert: ArchAlert;
    surtPrefixInputAdder: ArchInputAdder;
    statusInputAdder: ArchInputAdder;
    mimeInputAdder: ArchInputAdder;
    static styles: import("lit").CSSResult[];
    connectedCallback(): Promise<void>;
    render(): TemplateResult<1>;
    private inputHandler;
    private refreshData;
    private initCollections;
    private setSourceCollectionIdsUrlParam;
    private sourceCollectionsChangeHandler;
    fieldValueParserMap: Record<FormFieldName, (s: FormFieldValue) => ParsedFormFieldValue>;
    fieldValueValidatorMessagePairMap: Record<string, [
        (s: string) => boolean,
        string
    ]>;
    fieldValuePreSendPrepareMap: Map<keyof DecodedFormData, (x: ValueOf<DecodedFormData>, _this: ArchSubCollectionBuilder) => PreSendValue>;
    decodeFormDataValue(k: FormFieldName, v: string): ValueOf<DecodedFormData>;
    validateDecodedFormData(data: DecodedFormData): DecodedFormData;
    get formData(): DecodedFormData;
    setFormInputValidity(data: DecodedFormData): void;
    private prepareFormDataForSend;
    private doPost;
    validateForm(): boolean;
    private get successModalContent();
    resetInputAdderInputs(): void;
    private createSubCollection;
    private static urlPrefixInputAdderValidator;
    private static surtPrefixInputAdderValidator;
    private purgeOldSurtPrefixExpandedPrefixesMapEntries;
    private static statusInputAdderValidator;
    private static mimeInputAdderValidator;
    private syncUrlSurtPrefixes;
    private surtPrefixItemWrapper;
}
declare global {
    interface HTMLElementTagNameMap {
        "arch-sub-collection-builder": ArchSubCollectionBuilder;
    }
}
