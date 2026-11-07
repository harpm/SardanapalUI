import type { SardanapalAlign } from '../types/types';

/** Fields the login card edits through two-way binding. */
export class SardanapalLoginModel {
  username = '';
  password = '';
  email = '';
  phone = '';
  code = '';
  rememberMe = false;
}

/** English defaults; a host replaces any key to localize the card. */
export interface SardanapalLoginLabels {
  username?: string;
  password?: string;
  email?: string;
  phone?: string;
  code?: string;
  rememberMe?: string;
  signIn?: string;
  sendCode?: string;
  passwordTab?: string;
  emailTab?: string;
  phoneTab?: string;
}

/** English defaults; a host replaces any key to localize the form. */
export interface SardanapalChangePasswordLabels {
  username?: string;
  oldPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  submit?: string;
}

/** Fields the change-password form edits through two-way binding. */
export class SardanapalChangePasswordModel {
  username = '';
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
}

/** English defaults; a host replaces any key to localize the unauthorized page. */
export interface SardanapalUnauthorizedLabels {
  title?: string;
  message?: string;
}

<<<<<<< Updated upstream
=======
/** English defaults; a host replaces any key to localize the not-found page. */
export interface SardanapalNotFoundLabels {
  title?: string;
  message?: string;
}

>>>>>>> Stashed changes
/** One column of `s-grid`. */
export interface SardanapalGridColumn<TItem = unknown> {
  /** Property of the row. A dotted path such as `customer.name` reads nested values. Also sent as `sortId`. */
  field: string;
  title: string;
  /** Lets the user sort by this column. The host sorts by the `field` name. */
  sortable?: boolean;
  /** Any CSS width, for example `120px`. */
  width?: string;
  align?: SardanapalAlign;
  /** Turns the cell value into text. Without it, `null` is empty, dates use the local format, and everything else is `String(value)`. */
  format?: (value: unknown, row: TItem) => string;
}
