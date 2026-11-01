import type { EntityKey } from '@sardanapal/client';

/** Mirrors `RegisterVM<byte>`. Property names are camelCase on the wire. */
export interface RegisterModel {
  username: string;
  password: string;
  roles: number[];
}

/** Mirrors `UserEditableVM`. */
export interface UserEditableModel extends RegisterModel {
  claims: number[];
}

/** Mirrors `ChangePasswordVM`: the user proves the old password. */
export interface ChangePasswordModel {
  username: string;
  oldPassword: string;
  newPassword: string;
}

/** Mirrors `ChangePasswordVM<TUserKey>`: set a password for a user id. */
export interface ChangeUserPasswordModel<TUserKey extends EntityKey = number> {
  userId: TUserKey;
  newPassword: string;
}

/** Mirrors `OtpRequestVM`. Send `email` or `phoneNumber`. */
export interface OtpRequestModel {
  email?: string | null;
  phoneNumber?: number | null;
  role: number;
}

/** Mirrors `OTPResponseVM<TUserKey>`: the code the user typed. */
export interface OtpResponseModel<TUserKey extends EntityKey = number> {
  userId: TUserKey;
  roleId: number;
  code: string;
}

/** Mirrors `ResetPasswordRequestVM`. Send `email` or `phoneNumber`. */
export interface ResetPasswordRequestModel {
  email?: string | null;
  phoneNumber?: number | null;
}

/** Mirrors `ResetPasswordVM<TUserKey>`. */
export interface ResetPasswordModel<TUserKey extends EntityKey = number> {
  userId: TUserKey;
  roleId: number;
  code: string;
  newPassword: string;
}
