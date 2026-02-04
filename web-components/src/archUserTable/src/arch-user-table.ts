import { PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { User, UserRoles, ValueOf } from "../../lib/types";
import {
  createElement,
  isoStringToDateString,
  toTitleCase,
} from "../../lib/helpers";
import { Topics } from "../../lib/pubsub";

import { ArchDataTable } from "../../archDataTable/index";

import { ArchCreateNewUserModal } from "../../archCreateNewUserModal/index";
import { ArchEditUserModal } from "../../archEditUserModal/index.js";

import Styles from "./styles.js";

@customElement("arch-user-table")
export class ArchUserTable extends ArchDataTable<User> {
  @property({ type: Number }) accountId!: number;
  @property({ type: Number }) userId!: number;
  @property({ type: Boolean }) accountMaxUsersReached = false;
  @property({ type: Boolean, attribute: "inactive-users-become-viewers" })
  inactiveUsersBecomeViewers = false;
  @property({ type: Boolean }) readonly = false;

  @state() createNewUserModalTrigger!: HTMLElement;
  @state() editUserModal!: ArchEditUserModal;
  @state() editUserModalTrigger!: HTMLElement;

  static styles = [...ArchDataTable.styles, ...Styles];

  willUpdate(_changedProperties: PropertyValues) {
    super.willUpdate(_changedProperties);
    const { readonly } = this;
    this.actionButtonDisabled = [false, false];
    // Add selection action buttons if not in readonly mode.
    if (!readonly) {
      this.actionButtonLabels = ["Edit User"];
      this.actionButtonSignals = [Topics.DISPLAY_EDIT_USER_MODAL];
    }
    this.apiCollectionEndpoint = "/users";
    this.apiStaticParamPairs = [];
    this.cellRenderers = [
      undefined,
      (first_name: ValueOf<User>, user: User): HTMLElement => {
        const s = `${first_name as string} ${user.last_name}`;
        return createElement("span", {
          title: s,
          textContent: s,
        });
      },
      undefined,
      (date_joined) =>
        date_joined ? isoStringToDateString(date_joined as string) : "",
      (last_login) =>
        last_login ? isoStringToDateString(last_login as string) : "",
      (role) =>
        Object.keys(UserRoles)[
          Object.values(UserRoles).indexOf(role as UserRoles)
        ],
      (is_active) =>
        is_active
          ? "Active"
          : createElement("span", {
              children: [
                "Inactive",
                !this.inactiveUsersBecomeViewers
                  ? ""
                  : createElement("span", {
                      className: "info-icon",
                      innerHTML: "&#9432",
                      title:
                        "Inactive users can still log in but their access is restricted to that of a VIEWER",
                    }),
              ],
            }),
    ];
    this.columns = [
      "username",
      "first_name",
      "email",
      "date_joined",
      "last_login",
      "role",
      "is_active",
    ];
    this.columnFilterDisplayMaps = [
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      { true: "Active", false: "Inactive" },
    ];
    this.columnHeaders = [
      "Username",
      "Full Name",
      "Email",
      "Date Created",
      "Last Login",
      "Role",
      "Status",
    ];
    this.filterableColumns = [false, false, false, false, false, true, true];
    this.pageLength = 50;
    this.persistSearchStateInUrl = true;
    this.pluralName = "Account Users";
    this.rowClickEnabled = true;
    this.searchColumns = ["username", "first_name", "last_name", "email"];
    this.searchColumnLabels = this.searchColumns.map(toTitleCase);
    this.selectable = !readonly;
    this.singleName = "Account User";
    this.sort = "username,role";
    this.sortableColumns = [true, true, true, true, true, true, true];

    // Display "Create User" button if not in readonly mode.
    if (!readonly) {
      this.nonSelectionActions = [Topics.DISPLAY_CREATE_USER_MODAL];
      this.nonSelectionActionLabels = ["Create New User"];
    }
  }

  _createHiddenModalTriggerButton(): HTMLButtonElement {
    const el = document.createElement("button");
    el.setAttribute("slot", "trigger");
    el.style.display = "none";
    return el;
  }

  render() {
    const { inactiveUsersBecomeViewers } = this;

    // Instantiate the user create modal and create a trigger element.
    const createNewUserModal = new ArchCreateNewUserModal();
    createNewUserModal.accountId = this.accountId;
    createNewUserModal.onCreate = () => void this.dataTable.throttledDoSearch();
    this.createNewUserModalTrigger = this._createHiddenModalTriggerButton();
    createNewUserModal.appendChild(this.createNewUserModalTrigger);

    // Instantiate the edit user modal and create a trigger element.
    this.editUserModal = new ArchEditUserModal();
    this.editUserModal.userId = this.userId;
    this.editUserModal.onUpdate = () => void this.dataTable.throttledDoSearch();
    this.editUserModal.inactiveUsersBecomeViewers = inactiveUsersBecomeViewers;
    this.editUserModalTrigger = this._createHiddenModalTriggerButton();
    this.editUserModal.appendChild(this.editUserModalTrigger);

    return [
      super.render(),
      createNewUserModal,
      this.editUserModal,
    ] as Array<HTMLElement>;
  }

  updated(_changedProperties: PropertyValues) {
    super.updated(_changedProperties);

    // If account max users has been reached, disable the Create New User button.
    if (this.accountMaxUsersReached) {
      const createNewUserButton = this.dataTable.querySelector(
        "div.non-selection-buttons button"
      ) as HTMLButtonElement;
      createNewUserButton.disabled = true;
      createNewUserButton.title =
        "Your account has reached its maximum number of allowed users. Please contact your account administrator.";
    }
  }

  showEditUserModal(user: User) {
    this.editUserModal.user = user;
    this.editUserModalTrigger.click();
  }

  selectionActionHandler(action: string, selectedRows: Array<User>) {
    switch (action as Topics) {
      case Topics.DISPLAY_EDIT_USER_MODAL:
        this.showEditUserModal(selectedRows[0]);
        break;
      default:
        break;
    }
  }

  nonSelectionActionHandler(action: string) {
    switch (action as Topics) {
      case Topics.DISPLAY_CREATE_USER_MODAL:
        this.createNewUserModalTrigger.click();
        break;
      default:
        break;
    }
  }

  postSelectionChangeHandler(selectedRows: Array<User>) {
    /* Update DataTable.actionButtonDisabled based on the number
       of selected rows.
    */
    const { dataTable } = this;
    const { props } = dataTable;
    const numSelected = selectedRows.length;
    const editUserEnabled = numSelected === 1;
    props.actionButtonDisabled = [!editUserEnabled];
    dataTable.setSelectionActionButtonDisabledState(numSelected === 0);
  }
}

// Injects the <ait-user-table> tag into the global name space
declare global {
  interface HTMLElementTagNameMap {
    "arch-user-table": ArchUserTable;
  }
}
