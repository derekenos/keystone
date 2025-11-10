import { LitElement, TemplateResult } from "lit";
export declare enum AlertClass {
    Danger = "danger",
    Dark = "dark",
    Info = "info",
    Light = "light",
    Primary = "primary",
    Secondary = "secondary",
    Success = "success",
    Warning = "warning"
}
export declare class ArchAlert extends LitElement {
    alertClass: AlertClass;
    hidden: boolean;
    message: string | TemplateResult;
    nonDismissable: boolean;
    static styles: import("lit").CSSResult[];
    render(): TemplateResult<1>;
    hide(): void;
    show(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        "arch-alert": ArchAlert;
    }
}
