/**
 * Utility types for the application
 */

// Make all properties of T optional
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

// Make all properties of T required
export type Required<T> = {
  [P in keyof T]-?: T[P];
};

// Pick a set of properties from T
export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

// Omit a set of properties from T
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// Create a type with T properties that have types from U
export type Overwrite<T, U> = Omit<T, keyof U> & U;

// Create a type from T with properties in K made optional
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Create a type from T with properties in K made required
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// Create a type from T with all properties nullable
export type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

// Create a type from T with all properties non-nullable
export type NonNullable<T> = {
  [P in keyof T]: Exclude<T[P], null | undefined>;
};

// Create a type that requires at least one of the properties in T
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> & {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys];

// Create a type that requires exactly one of the properties in T
export type RequireExactlyOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> & {
    [K in Keys]: Pick<T, K> & {
      [K2 in Exclude<Keys, K>]?: never
    }
  }[Keys];

// Deep partial - makes all properties optional recursively
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Recursive readonly - makes all properties readonly recursively
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// ValueOf - gets union of all value types in an object
export type ValueOf<T> = T[keyof T];

// AsyncReturnType - extracts the return type of a Promise
export type AsyncReturnType<T extends (...args: any) => Promise<any>> = 
  T extends (...args: any) => Promise<infer R> ? R : any;