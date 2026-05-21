export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };
export type RawRecord = Record<string, unknown>;
export type Maybe<T> = T | null | undefined;
