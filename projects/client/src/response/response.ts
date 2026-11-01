export const StatusCode = {
  Succeeded: 0,
  Failed: 1,
  Canceled: 3,
  NotExists: 4,
  Exception: 5,
  Duplicate: 6,
  Forbidden: 7,
} as const;

export type StatusCode = (typeof StatusCode)[keyof typeof StatusCode];

export const OperationType = {
  Fetch: 0,
  Add: 1,
  Edit: 2,
  Delete: 3,
  Function: 4,
} as const;

export type OperationType = (typeof OperationType)[keyof typeof OperationType];

/**
 * The Core envelope. This is the shape axios deserializes from the wire, so a
 * parsed JSON body satisfies it directly. `isSuccess` is a plain boolean the host
 * sends (Core's `IsSuccess`, true only when `statusCode` is `Succeeded`).
 */
export interface IResponse<T = unknown> {
  readonly isSuccess: boolean;
  serviceName?: string;
  operationType?: OperationType | number;
  statusCode: number;
  developerMessages?: string[];
  userMessage?: string;
  data?: T;
}

export class Response<T = unknown> implements IResponse<T> {
  serviceName?: string;
  operationType?: OperationType | number;
  statusCode: number;
  developerMessages?: string[];
  userMessage?: string;
  data?: T;

  /** `isSuccess` is derived from `statusCode`, so it is not accepted as a value. */
  constructor(values: Omit<IResponse<T>, "isSuccess">) {
    this.serviceName = values.serviceName;
    this.operationType = values.operationType;
    this.statusCode = values.statusCode;
    this.developerMessages = values.developerMessages;
    this.userMessage = values.userMessage;
    this.data = values.data;
  }

  get isSuccess(): boolean {
    return this.statusCode === StatusCode.Succeeded;
  }

  static from<T>(body: unknown): Response<T> {
    if (!Response.isEnvelope<T>(body)) {
      throw new Error("Response is not an IResponse envelope.");
    }
    return new Response(body);
  }

  static isEnvelope<T>(body: unknown): body is Omit<IResponse<T>, "isSuccess"> {
    return (
      !!body &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      typeof (body as IResponse).statusCode === "number"
    );
  }
}
