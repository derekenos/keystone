import { LitElement } from "lit";
export declare class ArchContenteditable extends LitElement {
    modelName: string;
    fieldName: string;
    instanceUrl: string;
    updatePageRefSelectors: string[];
    collapseAndTrimWhitespace: boolean;
    csrfToken: string;
    contenteditable: string;
    lastContent: string;
    createRenderRoot(): this;
    maybeAttachStylesheet(): void;
    connectedCallback(): void;
    get filteredTextContent(): string;
    revertAndBlur(): void;
    doUpdate(): Promise<void>;
    keydownHandler(e: KeyboardEvent): Promise<void>;
}
declare global {
    interface HTMLElementTagNameMap {
        "arch-contenteditable": ArchContenteditable;
    }
}
