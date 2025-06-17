import { LitElement, TemplateResult } from "lit";
export declare class ArchInputAdder extends LitElement {
    deselectButtonText: string;
    headingLevel: number;
    inputType: string;
    inputName: string;
    inputSize: number;
    inputValidator: (s: string) => string;
    valuesTitle: string;
    inputCtaText: string;
    alreadyAddedText: string;
    preserveTrailingWhitespace: boolean;
    onChange: (action: "add" | "remove", value: string) => void;
    itemWrapperFn: (value: string) => string | TemplateResult;
    _values: Array<string>;
    set values(values: Array<string>);
    get values(): Array<string>;
    input: HTMLInputElement;
    slotEl: HTMLSlotElement;
    static styles: import("lit").CSSResult[];
    private heading;
    render(): TemplateResult<1>;
    private inputHandler;
    private pasteHandler;
    private keydownHandler;
    private get formInputsContainer();
    private addInputValue;
    private deselectValue;
}
declare global {
    interface HTMLElementTagNameMap {
        "arch-input-adder": ArchInputAdder;
    }
}
