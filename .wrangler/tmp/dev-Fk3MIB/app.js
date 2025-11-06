var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  __name(assertIs, "assertIs");
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  __name(assertNever, "assertNever");
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  __name(joinValues, "joinValues");
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = /* @__PURE__ */ __name((data) => {
  const t2 = typeof data;
  switch (t2) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
}, "getParsedType");

// node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = /* @__PURE__ */ __name((obj) => {
  const json3 = JSON.stringify(obj, null, 2);
  return json3.replace(/"([^"]+)":/g, "$1:");
}, "quotelessJson");
var ZodError = class _ZodError extends Error {
  static {
    __name(this, "ZodError");
  }
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = /* @__PURE__ */ __name((error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    }, "processError");
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/zod/v3/locales/en.js
var errorMap = /* @__PURE__ */ __name((issue, _ctx) => {
  let message2;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message2 = "Required";
      } else {
        message2 = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message2 = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message2 = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message2 = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message2 = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message2 = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message2 = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message2 = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message2 = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message2 = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message2 = `${message2} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message2 = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message2 = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message2 = `Invalid ${issue.validation}`;
      } else {
        message2 = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message2 = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message2 = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message2 = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message2 = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message2 = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message2 = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message2 = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message2 = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message2 = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message2 = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message2 = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message2 = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message2 = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message2 = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message2 = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message2 = "Number must be finite";
      break;
    default:
      message2 = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message: message2 };
}, "errorMap");
var en_default = errorMap;

// node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
__name(setErrorMap, "setErrorMap");
function getErrorMap() {
  return overrideErrorMap;
}
__name(getErrorMap, "getErrorMap");

// node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = /* @__PURE__ */ __name((params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
}, "makeIssue");
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
__name(addIssueToContext, "addIssueToContext");
var ParseStatus = class _ParseStatus {
  static {
    __name(this, "ParseStatus");
  }
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = /* @__PURE__ */ __name((value) => ({ status: "dirty", value }), "DIRTY");
var OK = /* @__PURE__ */ __name((value) => ({ status: "valid", value }), "OK");
var isAborted = /* @__PURE__ */ __name((x) => x.status === "aborted", "isAborted");
var isDirty = /* @__PURE__ */ __name((x) => x.status === "dirty", "isDirty");
var isValid = /* @__PURE__ */ __name((x) => x.status === "valid", "isValid");
var isAsync = /* @__PURE__ */ __name((x) => typeof Promise !== "undefined" && x instanceof Promise, "isAsync");

// node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message2) => typeof message2 === "string" ? { message: message2 } : message2 || {};
  errorUtil2.toString = (message2) => typeof message2 === "string" ? message2 : message2?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  static {
    __name(this, "ParseInputLazyPath");
  }
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = /* @__PURE__ */ __name((ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
}, "handleResult");
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = /* @__PURE__ */ __name((iss, ctx) => {
    const { message: message2 } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message2 ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message2 ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message2 ?? invalid_type_error ?? ctx.defaultError };
  }, "customMap");
  return { errorMap: customMap, description };
}
__name(processCreateParams, "processCreateParams");
var ZodType = class {
  static {
    __name(this, "ZodType");
  }
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message2) {
    const getIssueProperties = /* @__PURE__ */ __name((val) => {
      if (typeof message2 === "string" || typeof message2 === "undefined") {
        return { message: message2 };
      } else if (typeof message2 === "function") {
        return message2(val);
      } else {
        return message2;
      }
    }, "getIssueProperties");
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = /* @__PURE__ */ __name(() => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      }), "setError");
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: /* @__PURE__ */ __name((data) => this["~validate"](data), "validate")
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
__name(timeRegexSource, "timeRegexSource");
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
__name(timeRegex, "timeRegex");
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
__name(datetimeRegex, "datetimeRegex");
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
__name(isValidIP, "isValidIP");
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
__name(isValidJWT, "isValidJWT");
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
__name(isValidCidr, "isValidCidr");
var ZodString = class _ZodString extends ZodType {
  static {
    __name(this, "ZodString");
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message2) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message2)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message2) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message2) });
  }
  url(message2) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message2) });
  }
  emoji(message2) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message2) });
  }
  uuid(message2) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message2) });
  }
  nanoid(message2) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message2) });
  }
  cuid(message2) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message2) });
  }
  cuid2(message2) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message2) });
  }
  ulid(message2) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message2) });
  }
  base64(message2) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message2) });
  }
  base64url(message2) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message2)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message2) {
    return this._addCheck({ kind: "date", message: message2 });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message2) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message2) });
  }
  regex(regex, message2) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message2)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message2) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message2)
    });
  }
  endsWith(value, message2) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message2)
    });
  }
  min(minLength, message2) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message2)
    });
  }
  max(maxLength, message2) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message2)
    });
  }
  length(len, message2) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message2)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message2) {
    return this.min(1, errorUtil.errToObj(message2));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
__name(floatSafeRemainder, "floatSafeRemainder");
var ZodNumber = class _ZodNumber extends ZodType {
  static {
    __name(this, "ZodNumber");
  }
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message2) {
    return this.setLimit("min", value, true, errorUtil.toString(message2));
  }
  gt(value, message2) {
    return this.setLimit("min", value, false, errorUtil.toString(message2));
  }
  lte(value, message2) {
    return this.setLimit("max", value, true, errorUtil.toString(message2));
  }
  lt(value, message2) {
    return this.setLimit("max", value, false, errorUtil.toString(message2));
  }
  setLimit(kind, value, inclusive, message2) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message2)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message2) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message2)
    });
  }
  positive(message2) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message2)
    });
  }
  negative(message2) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message2)
    });
  }
  nonpositive(message2) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message2)
    });
  }
  nonnegative(message2) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message2)
    });
  }
  multipleOf(value, message2) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message2)
    });
  }
  finite(message2) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message2)
    });
  }
  safe(message2) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message2)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message2)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  static {
    __name(this, "ZodBigInt");
  }
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message2) {
    return this.setLimit("min", value, true, errorUtil.toString(message2));
  }
  gt(value, message2) {
    return this.setLimit("min", value, false, errorUtil.toString(message2));
  }
  lte(value, message2) {
    return this.setLimit("max", value, true, errorUtil.toString(message2));
  }
  lt(value, message2) {
    return this.setLimit("max", value, false, errorUtil.toString(message2));
  }
  setLimit(kind, value, inclusive, message2) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message2)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message2) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message2)
    });
  }
  negative(message2) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message2)
    });
  }
  nonpositive(message2) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message2)
    });
  }
  nonnegative(message2) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message2)
    });
  }
  multipleOf(value, message2) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message2)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  static {
    __name(this, "ZodBoolean");
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  static {
    __name(this, "ZodDate");
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message2) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message2)
    });
  }
  max(maxDate, message2) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message2)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  static {
    __name(this, "ZodSymbol");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  static {
    __name(this, "ZodUndefined");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  static {
    __name(this, "ZodNull");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  static {
    __name(this, "ZodAny");
  }
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  static {
    __name(this, "ZodUnknown");
  }
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  static {
    __name(this, "ZodNever");
  }
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  static {
    __name(this, "ZodVoid");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  static {
    __name(this, "ZodArray");
  }
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message2) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message2) }
    });
  }
  max(maxLength, message2) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message2) }
    });
  }
  length(len, message2) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message2) }
    });
  }
  nonempty(message2) {
    return this.min(1, message2);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: /* @__PURE__ */ __name(() => newShape, "shape")
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
__name(deepPartialify, "deepPartialify");
var ZodObject = class _ZodObject extends ZodType {
  static {
    __name(this, "ZodObject");
  }
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message2) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message2 !== void 0 ? {
        errorMap: /* @__PURE__ */ __name((issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message2).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }, "errorMap")
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => ({
        ...this._def.shape(),
        ...augmentation
      }), "shape")
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: /* @__PURE__ */ __name(() => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }), "shape"),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => shape, "shape")
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => shape, "shape")
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => newShape, "shape")
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: /* @__PURE__ */ __name(() => newShape, "shape")
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: /* @__PURE__ */ __name(() => shape, "shape"),
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: /* @__PURE__ */ __name(() => shape, "shape"),
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  static {
    __name(this, "ZodUnion");
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    __name(handleResults, "handleResults");
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types2, params) => {
  return new ZodUnion({
    options: types2,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = /* @__PURE__ */ __name((type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
}, "getDiscriminator");
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  static {
    __name(this, "ZodDiscriminatedUnion");
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
__name(mergeValues, "mergeValues");
var ZodIntersection = class extends ZodType {
  static {
    __name(this, "ZodIntersection");
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = /* @__PURE__ */ __name((parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    }, "handleParsed");
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  static {
    __name(this, "ZodTuple");
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  static {
    __name(this, "ZodRecord");
  }
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  static {
    __name(this, "ZodMap");
  }
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  static {
    __name(this, "ZodSet");
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    __name(finalizeSet, "finalizeSet");
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message2) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message2) }
    });
  }
  max(maxSize, message2) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message2) }
    });
  }
  size(size, message2) {
    return this.min(size, message2).max(size, message2);
  }
  nonempty(message2) {
    return this.min(1, message2);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  static {
    __name(this, "ZodFunction");
  }
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    __name(makeArgsIssue, "makeArgsIssue");
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    __name(makeReturnsIssue, "makeReturnsIssue");
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  static {
    __name(this, "ZodLazy");
  }
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  static {
    __name(this, "ZodLiteral");
  }
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
__name(createZodEnum, "createZodEnum");
var ZodEnum = class _ZodEnum extends ZodType {
  static {
    __name(this, "ZodEnum");
  }
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  static {
    __name(this, "ZodNativeEnum");
  }
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  static {
    __name(this, "ZodPromise");
  }
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  static {
    __name(this, "ZodEffects");
  }
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: /* @__PURE__ */ __name((arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      }, "addIssue"),
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = /* @__PURE__ */ __name((acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      }, "executeRefinement");
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  static {
    __name(this, "ZodOptional");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  static {
    __name(this, "ZodNullable");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  static {
    __name(this, "ZodDefault");
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  static {
    __name(this, "ZodCatch");
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  static {
    __name(this, "ZodNaN");
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  static {
    __name(this, "ZodBranded");
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  static {
    __name(this, "ZodPipeline");
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = /* @__PURE__ */ __name(async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      }, "handleAsync");
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  static {
    __name(this, "ZodReadonly");
  }
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = /* @__PURE__ */ __name((data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    }, "freeze");
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p2 = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p22 = typeof p2 === "string" ? { message: p2 } : p2;
  return p22;
}
__name(cleanParams, "cleanParams");
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r2 = check(data);
      if (r2 instanceof Promise) {
        return r2.then((r3) => {
          if (!r3) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r2) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
__name(custom, "custom");
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = /* @__PURE__ */ __name((cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params), "instanceOfType");
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = /* @__PURE__ */ __name(() => stringType().optional(), "ostring");
var onumber = /* @__PURE__ */ __name(() => numberType().optional(), "onumber");
var oboolean = /* @__PURE__ */ __name(() => booleanType().optional(), "oboolean");
var coerce = {
  string: /* @__PURE__ */ __name((arg) => ZodString.create({ ...arg, coerce: true }), "string"),
  number: /* @__PURE__ */ __name((arg) => ZodNumber.create({ ...arg, coerce: true }), "number"),
  boolean: /* @__PURE__ */ __name((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  }), "boolean"),
  bigint: /* @__PURE__ */ __name((arg) => ZodBigInt.create({ ...arg, coerce: true }), "bigint"),
  date: /* @__PURE__ */ __name((arg) => ZodDate.create({ ...arg, coerce: true }), "date")
};
var NEVER = INVALID;

// src/env.ts
var EnvValidationError = class extends Error {
  static {
    __name(this, "EnvValidationError");
  }
  issues;
  constructor(issues) {
    super(`Invalid environment configuration: ${issues.join("; ")}`);
    this.name = "EnvValidationError";
    this.issues = issues;
  }
};
var HTTP_SCHEMES = /* @__PURE__ */ new Set(["http:", "https:"]);
var ABSOLUTE_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
var LOCAL_FLAG_VALUES = /* @__PURE__ */ new Set(["1", "true", "yes", "on"]);
var DEV_SHIM_ENVIRONMENTS = /* @__PURE__ */ new Set(["development", "dev", "local"]);
function isHttpUrl(candidate) {
  try {
    const parsed = new URL(candidate);
    return HTTP_SCHEMES.has(parsed.protocol);
  } catch {
    return false;
  }
}
__name(isHttpUrl, "isHttpUrl");
function isSafeRelativePath(candidate) {
  return candidate.startsWith("/") && !candidate.startsWith("//");
}
__name(isSafeRelativePath, "isSafeRelativePath");
var EnvSchema = external_exports.object({
  ACCESS_JWKS_URL: external_exports.string().min(1, "ACCESS_JWKS_URL must be set").refine((value) => isHttpUrl(value.trim()), {
    message: "ACCESS_JWKS_URL must be an http(s) URL"
  }),
  ACCESS_AUD: external_exports.string().trim().min(1, "ACCESS_AUD must be set"),
  APP_BASE_URL: external_exports.string().min(1, "APP_BASE_URL must be set").refine((value) => isHttpUrl(value.trim()), {
    message: "APP_BASE_URL must be an absolute http(s) URL"
  }),
  RETURN_DEFAULT: external_exports.string().min(1, "RETURN_DEFAULT must be set"),
  CURSOR_SECRET: external_exports.string().trim().min(16, "CURSOR_SECRET must be at least 16 characters long")
}).passthrough().superRefine((value, ctx) => {
  const binding = value.DB;
  if (!binding || typeof binding !== "object" || typeof binding.prepare !== "function") {
    ctx.addIssue({
      path: ["DB"],
      code: external_exports.ZodIssueCode.custom,
      message: "DB binding must be configured with a D1 database"
    });
  }
  const appBase = typeof value.APP_BASE_URL === "string" ? value.APP_BASE_URL.trim() : "";
  if (!appBase || !isHttpUrl(appBase)) {
    ctx.addIssue({
      path: ["APP_BASE_URL"],
      code: external_exports.ZodIssueCode.custom,
      message: "APP_BASE_URL must be an absolute http(s) URL"
    });
  }
  const returnDefault = typeof value.RETURN_DEFAULT === "string" ? value.RETURN_DEFAULT.trim() : "";
  if (!returnDefault) {
    ctx.addIssue({
      path: ["RETURN_DEFAULT"],
      code: external_exports.ZodIssueCode.custom,
      message: "RETURN_DEFAULT must be set"
    });
  } else if (!isSafeRelativePath(returnDefault) && !isHttpUrl(returnDefault)) {
    ctx.addIssue({
      path: ["RETURN_DEFAULT"],
      code: external_exports.ZodIssueCode.custom,
      message: "RETURN_DEFAULT must be a safe relative path or an absolute http(s) URL"
    });
  }
  const appApiBase = typeof value.APP_API_BASE === "string" ? value.APP_API_BASE.trim() : "";
  if (appApiBase && ABSOLUTE_SCHEME_PATTERN.test(appApiBase) && !isHttpUrl(appApiBase)) {
    ctx.addIssue({
      path: ["APP_API_BASE"],
      code: external_exports.ZodIssueCode.custom,
      message: "APP_API_BASE must use http(s) scheme when absolute"
    });
  }
  const appAssetBase = typeof value.APP_ASSET_BASE === "string" ? value.APP_ASSET_BASE.trim() : "";
  if (appAssetBase) {
    if (appAssetBase.startsWith("//")) {
      try {
        const parsed = new URL(`https:${appAssetBase}`);
        if (!parsed.host) {
          throw new Error("missing host");
        }
      } catch {
        ctx.addIssue({
          path: ["APP_ASSET_BASE"],
          code: external_exports.ZodIssueCode.custom,
          message: "APP_ASSET_BASE protocol-relative URLs must include a host"
        });
      }
    } else if (ABSOLUTE_SCHEME_PATTERN.test(appAssetBase) && !isHttpUrl(appAssetBase)) {
      ctx.addIssue({
        path: ["APP_ASSET_BASE"],
        code: external_exports.ZodIssueCode.custom,
        message: "APP_ASSET_BASE must use http(s) scheme when absolute"
      });
    }
  }
  const ingestOriginsRaw = typeof value.INGEST_ALLOWED_ORIGINS === "string" ? value.INGEST_ALLOWED_ORIGINS.trim() : "";
  const ingestRateLimitRaw = typeof value.INGEST_RATE_LIMIT_PER_MIN === "string" ? value.INGEST_RATE_LIMIT_PER_MIN.trim() : "";
  const ingestFailureLimitRaw = typeof value.INGEST_FAILURE_LIMIT_PER_MIN === "string" ? value.INGEST_FAILURE_LIMIT_PER_MIN.trim() : "";
  const ingestToleranceRaw = typeof value.INGEST_SIGNATURE_TOLERANCE_SECS === "string" ? value.INGEST_SIGNATURE_TOLERANCE_SECS.trim() : "";
  const ingestIpLimitRaw = typeof value.INGEST_IP_LIMIT_PER_MIN === "string" ? value.INGEST_IP_LIMIT_PER_MIN.trim() : "";
  const ingestIpBlockRaw = typeof value.INGEST_IP_BLOCK_SECONDS === "string" ? value.INGEST_IP_BLOCK_SECONDS.trim() : "";
  const normalizedAllowShim = typeof value.ALLOW_DEV_ACCESS_SHIM === "string" ? value.ALLOW_DEV_ACCESS_SHIM.trim().toLowerCase() : "";
  const allowShimFlag = normalizedAllowShim.length > 0 && LOCAL_FLAG_VALUES.has(normalizedAllowShim);
  const hasDevUser = typeof value.DEV_ALLOW_USER === "string" && value.DEV_ALLOW_USER.trim().length > 0;
  const rawEnvironment = typeof value.ENVIRONMENT === "string" ? value.ENVIRONMENT.trim().toLowerCase() : "";
  const environmentAllowsShim = rawEnvironment.length > 0 && DEV_SHIM_ENVIRONMENTS.has(rawEnvironment);
  const appBaseLower = appBase.toLowerCase();
  const appBaseIsLocal = appBaseLower.startsWith("http://localhost") || appBaseLower.startsWith("http://127.0.0.1") || appBaseLower.startsWith("http://0.0.0.0") || appBaseLower.startsWith("http://[::1]");
  if (allowShimFlag && !environmentAllowsShim) {
    ctx.addIssue({
      path: ["ALLOW_DEV_ACCESS_SHIM"],
      code: external_exports.ZodIssueCode.custom,
      message: "ALLOW_DEV_ACCESS_SHIM requires ENVIRONMENT to be one of development, dev, local, test"
    });
  }
  if (allowShimFlag && !appBaseIsLocal) {
    ctx.addIssue({
      path: ["ALLOW_DEV_ACCESS_SHIM"],
      code: external_exports.ZodIssueCode.custom,
      message: "ALLOW_DEV_ACCESS_SHIM may only be enabled when APP_BASE_URL points to a localhost origin"
    });
  }
  const isLocalEnv = hasDevUser || appBaseIsLocal || environmentAllowsShim;
  if (!ingestOriginsRaw) {
    if (isLocalEnv) {
      console.warn("INGEST_ALLOWED_ORIGINS is not set; ingest endpoints will deny browser origins.");
    } else {
      ctx.addIssue({
        path: ["INGEST_ALLOWED_ORIGINS"],
        code: external_exports.ZodIssueCode.custom,
        message: "INGEST_ALLOWED_ORIGINS must be configured for non-local environments"
      });
    }
  }
  if (ingestIpLimitRaw) {
    const parsed = Number.parseInt(ingestIpLimitRaw, 10);
    if (!Number.isFinite(parsed) || parsed < 0) {
      ctx.addIssue({
        path: ["INGEST_IP_LIMIT_PER_MIN"],
        code: external_exports.ZodIssueCode.custom,
        message: "INGEST_IP_LIMIT_PER_MIN must be zero or a positive integer when set"
      });
    }
    if (parsed > 0 && ingestIpBlockRaw) {
      const block = Number.parseInt(ingestIpBlockRaw, 10);
      if (!Number.isFinite(block) || block <= 0) {
        ctx.addIssue({
          path: ["INGEST_IP_BLOCK_SECONDS"],
          code: external_exports.ZodIssueCode.custom,
          message: "INGEST_IP_BLOCK_SECONDS must be a positive integer when set"
        });
      }
    }
    if (parsed > 0 && !value.INGEST_IP_BUCKETS && !isLocalEnv) {
      console.warn(
        "INGEST_IP_LIMIT_PER_MIN is enabled without an INGEST_IP_BUCKETS binding; falling back to in-memory token buckets per isolate."
      );
    }
  } else if (ingestIpBlockRaw) {
    const block = Number.parseInt(ingestIpBlockRaw, 10);
    if (!Number.isFinite(block) || block <= 0) {
      ctx.addIssue({
        path: ["INGEST_IP_BLOCK_SECONDS"],
        code: external_exports.ZodIssueCode.custom,
        message: "INGEST_IP_BLOCK_SECONDS must be a positive integer when set"
      });
    }
  }
  if (!ingestRateLimitRaw) {
    ctx.addIssue({
      path: ["INGEST_RATE_LIMIT_PER_MIN"],
      code: external_exports.ZodIssueCode.custom,
      message: "INGEST_RATE_LIMIT_PER_MIN must be configured"
    });
  } else {
    const parsed = Number.parseInt(ingestRateLimitRaw, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
      ctx.addIssue({
        path: ["INGEST_RATE_LIMIT_PER_MIN"],
        code: external_exports.ZodIssueCode.custom,
        message: "INGEST_RATE_LIMIT_PER_MIN must be a positive integer"
      });
    }
  }
  if (ingestFailureLimitRaw) {
    const parsed = Number.parseInt(ingestFailureLimitRaw, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      ctx.addIssue({
        path: ["INGEST_FAILURE_LIMIT_PER_MIN"],
        code: external_exports.ZodIssueCode.custom,
        message: "INGEST_FAILURE_LIMIT_PER_MIN must be a non-negative integer"
      });
    }
  }
  if (!ingestToleranceRaw) {
    ctx.addIssue({
      path: ["INGEST_SIGNATURE_TOLERANCE_SECS"],
      code: external_exports.ZodIssueCode.custom,
      message: "INGEST_SIGNATURE_TOLERANCE_SECS must be configured"
    });
  } else {
    const parsed = Number.parseInt(ingestToleranceRaw, 10);
    if (Number.isNaN(parsed) || parsed < 0) {
      ctx.addIssue({
        path: ["INGEST_SIGNATURE_TOLERANCE_SECS"],
        code: external_exports.ZodIssueCode.custom,
        message: "INGEST_SIGNATURE_TOLERANCE_SECS must be zero or a positive integer"
      });
    }
  }
  const logLevelRaw = typeof value.LOG_LEVEL === "string" ? value.LOG_LEVEL.trim().toLowerCase() : "";
  if (logLevelRaw && !["debug", "info", "warn", "error"].includes(logLevelRaw)) {
    ctx.addIssue({
      path: ["LOG_LEVEL"],
      code: external_exports.ZodIssueCode.custom,
      message: "LOG_LEVEL must be one of debug, info, warn, error"
    });
  }
  const logSampleRaw = typeof value.LOG_DEBUG_SAMPLE_RATE === "string" ? value.LOG_DEBUG_SAMPLE_RATE.trim() : "";
  if (logSampleRaw) {
    const parsed = Number(logSampleRaw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      ctx.addIssue({
        path: ["LOG_DEBUG_SAMPLE_RATE"],
        code: external_exports.ZodIssueCode.custom,
        message: "LOG_DEBUG_SAMPLE_RATE must be a positive number"
      });
    }
  }
  const observabilityMaxRaw = typeof value.OBSERVABILITY_MAX_BYTES === "string" ? value.OBSERVABILITY_MAX_BYTES.trim() : "";
  if (observabilityMaxRaw) {
    const parsed = Number(observabilityMaxRaw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      ctx.addIssue({
        path: ["OBSERVABILITY_MAX_BYTES"],
        code: external_exports.ZodIssueCode.custom,
        message: "OBSERVABILITY_MAX_BYTES must be a positive integer"
      });
    }
  }
  const carryForwardRaw = typeof value.TELEMETRY_CARRY_MAX_MINUTES === "string" ? value.TELEMETRY_CARRY_MAX_MINUTES.trim() : "";
  if (carryForwardRaw) {
    const parsed = Number.parseInt(carryForwardRaw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      ctx.addIssue({
        path: ["TELEMETRY_CARRY_MAX_MINUTES"],
        code: external_exports.ZodIssueCode.custom,
        message: "TELEMETRY_CARRY_MAX_MINUTES must be a positive integer"
      });
    }
  }
});
var validatedEnvs = /* @__PURE__ */ new WeakSet();
function validateEnv(env) {
  if (validatedEnvs.has(env)) {
    return env;
  }
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const path = issue.path.length ? issue.path.join(".") : "env";
      return `${path}: ${issue.message}`;
    });
    throw new EnvValidationError(issues);
  }
  validatedEnvs.add(env);
  return env;
}
__name(validateEnv, "validateEnv");

// src/assets-manifest.json
var assets_manifest_default = {
  "Gear_Icon_01.svg": '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="3" fill="#52ff99"/><path d="M3 12h3m12 0h3M12 3v3m0 12v3M5 5l2.1 2.1M16.9 16.9L19 19M19 5l-2.1 2.1M7.1 16.9 5 19" stroke="#52ff99" stroke-width="2" fill="none"/></svg>',
  "GREENBRO LOGO APP.svg": '<svg viewBox="0 0 320 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GreenBro"><rect width="320" height="64" rx="12" fill="#0b1e14"/><text x="32" y="40" font-size="28" font-family="Arial, Helvetica, sans-serif" fill="#52ff99">GreenBro</text></svg>',
  "Gear_Icon_02.svg": '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="12" height="12" rx="2" stroke="#52ff99" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="2" fill="#52ff99"/></svg>',
  "Gear_Icon_03.svg": '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 12a8 8 0 1 0 16 0" stroke="#52ff99" stroke-width="2" fill="none"/><path d="M12 4a8 8 0 0 0 0 16" stroke="#52ff99" stroke-width="2" fill="none"/></svg>'
};

// src/frontend/static-bundle.ts
var STATIC_BUNDLE = {
  "index.html": '<!doctype html>\n<html lang="en-ZA">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>GreenBro - Heat Pump Dashboard</title>\n    <link rel="icon" type="image/svg+xml" href="/app/assets/GREENBRO LOGO APP.svg" />\n    <script type="module" crossorigin src="/app/assets/index-CAv5rt5M.js"><\/script>\n    <link rel="stylesheet" crossorigin href="/app/assets/index-y6znqhWW.css">\n  </head>\n  <body>\n    <div id="root"></div>\n  </body>\n</html>\n',
  "assets/AdminArchivePage-eBZK27bO.js": 'import{u as o,r as t,j as e,L as m}from"./index-CAv5rt5M.js";import{P as r,b as h,a as v}from"./format-BvCvFL95.js";function f(){const c=o(),[d,l]=t.useState("loading"),[a,n]=t.useState(null);return t.useEffect(()=>{const s=new AbortController;return l("loading"),c.get("/api/archive/offline",{signal:s.signal}).then(i=>{n(i),l("ready")}).catch(i=>{i instanceof DOMException&&i.name==="AbortError"||l("error")}),()=>s.abort()},[c]),d==="loading"?e.jsx(r,{title:"Archive",children:e.jsx("div",{className:"card",children:"Loading..."})}):d==="error"||!a?e.jsx(r,{title:"Archive",children:e.jsx("div",{className:"card callout error",children:"Unable to load archive data"})}):e.jsxs(r,{title:"Archive",children:[e.jsxs("div",{className:"card",children:[e.jsxs("div",{className:"card-header",children:[e.jsx("div",{className:"card-title",children:"Offline devices"}),e.jsxs("span",{className:"pill",children:[a.offline?.length??0," entries"]})]}),a.offline?.length?e.jsx("div",{className:"stack",children:a.offline.map(s=>e.jsxs("div",{className:"list-item",children:[e.jsxs("div",{children:[e.jsx("div",{className:"font-semibold",children:s.device_id}),s.site?e.jsx("div",{className:"subdued",children:s.site}):null,e.jsxs("div",{className:"meta",children:["Last heartbeat ",h(s.last_seen_at)]})]}),e.jsxs("div",{className:"text-right",children:[e.jsxs("div",{className:"meta",children:["Alerts ",s.alerts]}),e.jsx(m,{to:`/app/device?device=${encodeURIComponent(s.lookup)}`,className:"link",children:"Open"})]})]},s.lookup))}):e.jsx("div",{className:"empty",children:"No offline devices found"})]}),e.jsxs("div",{className:"card mt-1",children:[e.jsx("div",{className:"card-header",children:e.jsx("div",{className:"card-title",children:"Telemetry archive volume"})}),a.history?.length?e.jsx("div",{className:"history-grid",children:a.history.map((s,i)=>e.jsxs("div",{className:"history-card",children:[e.jsx("strong",{children:s.day}),e.jsxs("div",{className:"subdued",children:[v(s.samples??0,0)," samples"]})]},`${s.day}-${i}`))}):e.jsx("div",{className:"empty",children:"No recent telemetry samples"})]})]})}export{f as default};\n',
  "assets/AdminPage-Bf9ziHWx.js": 'import{u as m,r,j as e,L as u}from"./index-CAv5rt5M.js";import{P as c,a as l,c as h}from"./format-BvCvFL95.js";function f(){const n=m(),[a,d]=r.useState("loading"),[t,x]=r.useState(null);if(r.useEffect(()=>{const s=new AbortController;return d("loading"),n.get("/api/fleet/admin-overview",{signal:s.signal}).then(i=>{x(i),d("ready")}).catch(i=>{i instanceof DOMException&&i.name==="AbortError"||d("error")}),()=>s.abort()},[n]),a==="loading")return e.jsx(c,{title:"Admin",children:e.jsx("div",{className:"card",children:"Loading..."})});if(a==="error"||!t)return e.jsx(c,{title:"Admin",children:e.jsx("div",{className:"card callout error",children:"Unable to load admin overview"})});const j=p(t.ops_summary),o=t.ops_window?`Window: last ${l(t.ops_window.days,0)} days (since ${h(t.ops_window.start)})`:null;return e.jsxs(c,{title:"Admin",children:[e.jsxs("div",{className:"card",children:[e.jsxs("div",{className:"card-header",children:[e.jsx("div",{className:"card-title",children:"Tenants"}),e.jsxs("span",{className:"pill",children:[t.tenants?.length??0," profiles"]})]}),t.tenants?.length?e.jsx("div",{className:"min-table",children:e.jsxs("table",{className:"table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Profile"}),e.jsx("th",{children:"Devices"}),e.jsx("th",{children:"Online"})]})}),e.jsx("tbody",{children:t.tenants.map(s=>e.jsxs("tr",{children:[e.jsx("td",{children:s.profile_id}),e.jsx("td",{children:l(s.device_count??0,0)}),e.jsx("td",{children:l(s.online_count??0,0)})]},s.profile_id))})]})}):e.jsx("div",{className:"empty",children:"No tenant data"})]}),e.jsxs("div",{className:"card mt-1",children:[e.jsxs("div",{className:"card-header",children:[e.jsx("div",{className:"card-title",children:"Recent operations"}),e.jsxs("span",{className:"pill",children:[t.ops?.length??0," events"]})]}),t.ops?.length?e.jsx("div",{className:"min-table",children:e.jsxs("table",{className:"table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Timestamp"}),e.jsx("th",{children:"Route"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Duration ms"}),e.jsx("th",{children:"Device"})]})}),e.jsx("tbody",{children:t.ops.map((s,i)=>e.jsxs("tr",{children:[e.jsx("td",{children:h(s.ts)}),e.jsx("td",{children:s.route}),e.jsx("td",{children:s.status_code}),e.jsx("td",{children:s.duration_ms}),e.jsx("td",{children:s.device_id?e.jsx(u,{className:"link",to:`/app/device?device=${encodeURIComponent(s.lookup??"")}`,children:s.device_id}):"-"})]},`${s.ts}-${i}`))})]})}):e.jsx("div",{className:"empty",children:"No recent operations in scope"}),e.jsxs("div",{className:"subdued mt-06",children:["Status mix: ",j]}),o?e.jsx("div",{className:"subdued",children:o}):null]})]})}function p(n){if(!n)return"n/a";const a=Object.entries(n);return a.length?a.map(([d,t])=>`${d}: ${l(t,0)}`).join(" | "):"n/a"}export{f as default};\n',
  "assets/AlertsPage-CiG2Kh3G.js": 'import{u as p,b as g,r as c,j as s}from"./index-CAv5rt5M.js";import{P as d,a as h,b as u}from"./format-BvCvFL95.js";function w(){const e=p(),[x]=g(),[i,v]=c.useState(null),[n,l]=c.useState("loading"),a=x.get("hours")??void 0;c.useEffect(()=>{const t=new AbortController;l("loading");const o=new URLSearchParams;a&&o.set("hours",a);const m=o.toString(),N=m?"/api/alerts/recent?"+m:"/api/alerts/recent";return e.get(N,{signal:t.signal}).then(r=>{v(r),l("ready")}).catch(r=>{r instanceof DOMException&&r.name==="AbortError"||l("error")}),()=>t.abort()},[e,a]);const j=c.useMemo(()=>a?`${a}h`:"72h",[a]);return n==="loading"?s.jsx(d,{title:"Alerts",children:s.jsx("div",{className:"card",children:"Loading..."})}):n==="error"||!i?s.jsx(d,{title:"Alerts",children:s.jsx("div",{className:"card callout error",children:"Unable to load alerts"})}):s.jsxs(d,{title:"Alerts",children:[s.jsxs("div",{className:"grid kpis",children:[s.jsxs("div",{className:"card tight",children:[s.jsx("div",{className:"muted",children:"Total alerts"}),s.jsx("div",{className:"large-number",children:h(i.stats?.total??0,0)})]}),s.jsxs("div",{className:"card tight",children:[s.jsx("div",{className:"muted",children:"Active now"}),s.jsx("div",{className:"large-number",children:h(i.stats?.active??0,0)})]}),s.jsxs("div",{className:"card tight",children:[s.jsx("div",{className:"muted",children:"Window"}),s.jsxs("div",{className:"large-number",children:["Last ",j]})]})]}),s.jsx("div",{className:"stack",children:i.items?.length?i.items.map(t=>s.jsx(f,{alert:t},t.lookup)):s.jsx("div",{className:"card",children:s.jsx("div",{className:"empty",children:"No alerts during this window"})})})]})}function f({alert:e}){return s.jsxs("div",{className:"card",children:[s.jsxs("div",{className:"card-header",children:[s.jsxs("div",{children:[s.jsx("div",{className:"card-title",children:e.device_id}),e.site?s.jsx("div",{className:"subdued",children:e.site}):null]}),s.jsx("span",{className:`pill${e.active?" warn":""}`,children:e.active?"Active":"Cleared"})]}),s.jsx("div",{className:"list",children:s.jsxs("div",{className:"list-item",children:[s.jsxs("div",{children:[s.jsx("div",{children:e.faults?.join(", ")||"Fault reported"}),s.jsxs("div",{className:"meta",children:["Triggered ",u(e.ts)]})]}),s.jsxs("div",{className:"text-right",children:[s.jsx("div",{className:"meta",children:e.last_update?`Last update ${u(e.last_update)}`:"No recent update"}),s.jsx("a",{href:`/app/device?device=${encodeURIComponent(e.lookup)}`,className:"link inline-link",children:"Inspect device"})]})]})})]})}export{w as default};\n',
  "assets/CommissioningPage-CNVLMK2O.js": 'import{u as x,r as d,j as s}from"./index-CAv5rt5M.js";import{P as m,a as i,b as f}from"./format-BvCvFL95.js";function k(){const e=x(),[a,n]=d.useState("loading"),[o,c]=d.useState(null);if(d.useEffect(()=>{const l=new AbortController;return n("loading"),e.get("/api/commissioning/checklist",{signal:l.signal}).then(t=>{const u=(t.devices??[]).map(g);c({summary:t.summary,devices:u}),n("ready")}).catch(t=>{t instanceof DOMException&&t.name==="AbortError"||n("error")}),()=>l.abort()},[e]),a==="loading")return s.jsx(m,{title:"Commissioning & QA",children:s.jsx("div",{className:"card",children:"Loading..."})});if(a==="error"||!o)return s.jsx(m,{title:"Commissioning & QA",children:s.jsx("div",{className:"card callout error",children:"Unable to load commissioning status"})});const{summary:r,devices:p}=o,h=r.total?Math.round((r.ready??0)/r.total*100):0;return s.jsxs(m,{title:"Commissioning & QA",children:[s.jsxs("div",{className:"card",children:[s.jsxs("div",{className:"card-header",children:[s.jsx("div",{className:"card-title",children:"Readiness overview"}),s.jsxs("span",{className:"pill",children:[r.ready," ready of ",r.total]})]}),s.jsx("div",{className:"callout mt-06",children:r.total?`${h}% checklist complete across fleet`:"No devices in scope"})]}),s.jsx("div",{className:"stack mt-1",children:p.map(l=>s.jsxs("div",{className:"card",children:[s.jsxs("div",{className:"card-header",children:[s.jsxs("div",{children:[s.jsx("div",{className:"card-title",children:l.device_id}),l.site?s.jsx("div",{className:"subdued",children:l.site}):null]}),s.jsxs("span",{className:`pill${l.progress>=.86?"":" warn"}`,children:[i(l.progress*100,0),"%"]})]}),s.jsxs("div",{className:"subdued",children:["Last heartbeat ",f(l.last_seen_at??l.updated_at)]}),s.jsx("progress",{className:"progress-bar",max:100,value:Math.round(l.progress*100)}),s.jsx("div",{className:"checklist",children:l.checklist.map(t=>s.jsxs("div",{className:`check-item${t.pass?"":" fail"}`,children:[s.jsx("span",{children:t.label}),s.jsx("span",{className:"subdued",children:t.detail})]},t.key))}),s.jsx("div",{className:"mt-06",children:s.jsx("a",{href:`/app/device?device=${encodeURIComponent(l.lookup)}`,className:"link",children:"Open device"})})]},l.lookup))})]})}function g(e){const a=j(e),n=a.filter(c=>c.pass).length,o=a.length?n/a.length:0;return{...e,checklist:a,progress:o}}function j(e){const a=[];return a.push({key:"online",label:"Device online",detail:e.online?"Heartbeat received":"Waiting for heartbeat",pass:e.online}),a.push({key:"flow",label:"Flow sensor reporting",detail:e.flowLps!==null?`${i(e.flowLps,2)} L/s`:"No flow telemetry yet",pass:typeof e.flowLps=="number"}),a.push({key:"delta",label:"\xCE\u201DT above 3\xC2\xB0C",detail:e.deltaT!==null?`${i(e.deltaT,1)} \xC2\xB0C`:"\xCE\u201DT unavailable",pass:typeof e.deltaT=="number"&&e.deltaT>=3}),a.push({key:"thermal",label:"Thermal output reported",detail:e.thermalKW!==null?`${i(e.thermalKW,2)} kW`:"No thermal telemetry",pass:typeof e.thermalKW=="number"}),a.push({key:"mode",label:"Operating mode detected",detail:e.mode??"Mode unknown",pass:!!e.mode}),a}export{k as default};\n',
  "assets/CompactDashboardPage-azXId9pO.js": 'import{u as y,r as c,j as e}from"./index-CAv5rt5M.js";import{P as m,f as _,a as n,b as u}from"./format-BvCvFL95.js";import{S as k}from"./Sparkline-D2W6pTJo.js";function O(){const o=y(),[a,v]=c.useState(null),[r,p]=c.useState([]),[x,j]=c.useState("loading"),[t,h]=c.useState("cop");c.useEffect(()=>{const s=new AbortController;let i=!1;async function b(){try{const d=await o.get("/api/client/compact",{signal:s.signal});i||(v(d),j("ready"))}catch(d){!i&&!(d instanceof DOMException&&d.name==="AbortError")&&j("error")}}async function g(){try{const d=await o.get("/api/devices?mine=1&limit=12",{signal:s.signal});i||p(d.items??[])}catch{}}return b(),g(),()=>{i=!0,s.abort()}},[o]);const N=c.useMemo(()=>a?(a.trend??[]).map(s=>{const i=s[t];return typeof i=="number"?i:null}):[],[a,t]),f=c.useMemo(()=>{switch(t){case"cop":return"Fleet average COP";case"thermalKW":return"Thermal output (kW)";case"deltaT":return"?T average (\xC2\xB0C)";default:return""}},[t]);if(x==="loading")return e.jsx(m,{title:"My Sites - Compact",children:e.jsx("div",{className:"card",children:"Loading..."})});if(x==="error"||!a)return e.jsx(m,{title:"My Sites - Compact",children:e.jsx("div",{className:"card callout error",children:"Unable to load dashboard data"})});const l=a.kpis;return e.jsxs(m,{title:"My Sites - Compact",children:[e.jsxs("div",{className:"grid kpis",children:[e.jsxs("div",{className:"card tight",children:[e.jsx("div",{className:"muted",children:"Online rate"}),e.jsx("div",{className:"large-number",children:_(l.online_pct)}),e.jsxs("div",{className:"subdued",children:[l.devices_online,"/",l.devices_total," devices online"]})]}),e.jsxs("div",{className:"card tight",children:[e.jsx("div",{className:"muted",children:"Open alerts"}),e.jsx("div",{className:"large-number",children:n(l.open_alerts??0,0)}),e.jsx("div",{className:"subdued",children:a.alerts?.length?`${a.alerts.length} devices affected`:"Monitoring"})]}),e.jsxs("div",{className:"card tight",children:[e.jsx("div",{className:"muted",children:"Avg COP"}),e.jsx("div",{className:"large-number",children:n(l.avg_cop,2)}),e.jsxs("div",{className:"subdued",children:["Window start ",u(a.window_start_ms)]})]}),e.jsxs("div",{className:"card tight",children:[e.jsx("div",{className:"muted",children:"Low ?T (24h)"}),e.jsx("div",{className:"large-number",children:n(l.low_deltaT_count??0,0)}),e.jsx("div",{className:"subdued",children:l.max_heartbeat_age_sec?`Oldest heartbeat ${n((l.max_heartbeat_age_sec??0)/60,1)}m`:"All fresh"})]})]}),e.jsxs("div",{className:"card chart-card",children:[e.jsxs("div",{className:"card-header",children:[e.jsxs("div",{children:[e.jsx("div",{className:"muted",children:"Performance trend"}),e.jsx("div",{className:"trend-subtitle",children:f})]}),e.jsxs("div",{className:"tabs",children:[e.jsx("button",{type:"button",className:`btn ghost${t==="cop"?" active":""}`,onClick:()=>h("cop"),children:"COP"}),e.jsx("button",{type:"button",className:`btn ghost${t==="thermalKW"?" active":""}`,onClick:()=>h("thermalKW"),children:"Thermal kW"}),e.jsx("button",{type:"button",className:`btn ghost${t==="deltaT"?" active":""}`,onClick:()=>h("deltaT"),children:"?T"})]})]}),e.jsx("div",{className:"card-section",children:e.jsx(k,{values:N,color:t==="cop"?"#52ff99":t==="thermalKW"?"#7d96ff":"#ffcc66"})})]}),e.jsxs("div",{className:"card",children:[e.jsxs("div",{className:"card-header",children:[e.jsx("div",{className:"card-title",children:"Recent alerts"}),a.alerts?.length?e.jsxs("span",{className:"pill warn",children:[a.alerts.length," active"]}):e.jsx("span",{className:"pill",children:"Stable"})]}),a.alerts?.length?e.jsx("div",{className:"list",children:a.alerts.map(s=>e.jsxs("div",{className:"list-item",children:[e.jsxs("div",{children:[e.jsx("div",{className:"font-semibold",children:s.device_id}),s.site?e.jsx("div",{className:"subdued",children:s.site}):null,e.jsxs("div",{className:"meta",children:["Updated ",u(s.updated_at)]})]}),e.jsxs("div",{className:"text-right",children:[e.jsx("div",{children:s.faults?.slice(0,3).join(", ")||"Fault reported"}),e.jsx("div",{className:"meta",children:s.faults&&s.faults.length>3?`+${s.faults.length-3} more`:""}),e.jsx("a",{href:`/app/device?device=${encodeURIComponent(s.lookup)}`,className:"link inline-link",children:"Open"})]})]},s.lookup))}):e.jsx("div",{className:"empty",children:"No alerts in the selected window"})]}),e.jsxs("div",{className:"card",children:[e.jsxs("div",{className:"card-header",children:[e.jsx("div",{className:"card-title",children:"Device roster"}),e.jsx("div",{className:"subdued",children:r.length?`${r.length} listed`:"No devices yet"})]}),r.length?e.jsx("div",{className:"min-table",children:e.jsxs("table",{className:"table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Device"}),e.jsx("th",{children:"Site"}),e.jsx("th",{children:"Online"}),e.jsx("th",{children:"Last heartbeat"}),e.jsx("th",{children:"Firmware"})]})}),e.jsx("tbody",{children:r.map(s=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx("a",{href:`/app/device?device=${encodeURIComponent(s.lookup)}`,className:"link",children:s.device_id||"(device)"})}),e.jsx("td",{children:s.site??"-"}),e.jsx("td",{children:e.jsx("span",{className:`status-dot${s.online?" ok":""}`,title:s.online?"Online":"Offline"})}),e.jsx("td",{children:u(s.last_seen_at)}),e.jsx("td",{children:s.firmware??"-"})]},s.lookup))})]})}):e.jsx("div",{className:"empty",children:"No devices in scope"})]})]})}export{O as default};\n',
  "assets/DeviceDetailPage-B9wux4UQ.js": 'import{u as z,a as G,r as a,b as J,j as e}from"./index-CAv5rt5M.js";import{b as P,a as n,P as Q,c as X}from"./format-BvCvFL95.js";import{S as b}from"./Sparkline-D2W6pTJo.js";function te(){const l=z(),o=G().user,m=a.useMemo(()=>(o?.roles??[]).some(s=>s.toLowerCase()==="admin"),[o?.roles]),[$,R]=a.useState(()=>!m),[w,M]=J(),A=w.get("device")??"",[y,_]=a.useState([]),[r,S]=a.useState(A),[j,E]=a.useState(null),[N,K]=a.useState(null),[O,F]=a.useState(""),[U,C]=a.useState(!1),[I,W]=a.useState(!1),x=m?$:!0;a.useEffect(()=>{let s=!1;async function t(){try{const f=new URLSearchParams({limit:"50",mine:x?"1":"0"}),c=await l.get(`/api/devices?${f.toString()}`);if(s)return;const p=c.items??[];_(p),S(D=>D&&p.some(V=>V.lookup===D)?D:p[0]?.lookup??"")}catch{s||(_([]),S(""))}}return t(),()=>{s=!0}},[l,x]);const k=a.useCallback(async s=>{if(s){C(!0),W(!1);try{const t=new URLSearchParams({scope:"device",device:s,interval:"5m",limit:"120",fill:"carry"}),[f,c]=await Promise.all([l.post("/api/telemetry/latest-batch",{devices:[s]}),l.get(`/api/telemetry/series?${t.toString()}`)]),p=f.items?.[0]??null;E(p),K(c),F(p?.device_id??""),C(!1)}catch{W(!0),C(!1)}}},[l]);a.useEffect(()=>{r&&(k(r),M(s=>{const t=new URLSearchParams(s);return t.set("device",r),t}))},[k,r,M]);const i=a.useMemo(()=>j?.latest??{},[j]),T=a.useMemo(()=>y.find(s=>s.lookup===r)??null,[y,r]),d=a.useMemo(()=>{const s=N?.series??[];return{supply:s.map(t=>u(t,"supplyC")),return:s.map(t=>u(t,"returnC")),thermal:s.map(t=>u(t,"thermalKW")),cop:s.map(t=>u(t,"cop"))}},[N]),L=a.useMemo(()=>(N?.series??[]).slice(-10).reverse(),[N]),B=a.useMemo(()=>{const s=O.trim();return s.length>0?s:j?.device_id??"-"},[O,j]),q=i.updated_at!=null?`Updated ${P(i.updated_at)}`:i.ts!=null?`Sample ${P(i.ts)}`:"",H=m?e.jsxs("div",{className:"tabs",role:"group","aria-label":"Device scope filter",children:[e.jsx("button",{type:"button",className:`btn ghost${x?" active":""}`,"aria-pressed":x,onClick:()=>R(!0),children:"Assigned"}),e.jsx("button",{type:"button",className:`btn ghost${x?"":" active"}`,"aria-pressed":!x,onClick:()=>R(!1),children:"All devices"})]}):null,h=a.useCallback((s,t,f=1)=>{const c=i[s];return c==null?e.jsxs("div",{className:"metric-tile",children:[e.jsx("div",{className:"metric-label",children:t}),e.jsx("div",{className:"metric-value",children:"-"})]},String(s)):typeof c=="number"?e.jsxs("div",{className:"metric-tile",children:[e.jsx("div",{className:"metric-label",children:t}),e.jsx("div",{className:"metric-value",children:n(c,f)})]},String(s)):e.jsxs("div",{className:"metric-tile",children:[e.jsx("div",{className:"metric-label",children:t}),e.jsx("div",{className:"metric-value",children:Y(c)})]},String(s))},[i]);return e.jsx(Q,{title:"Device detail",actions:H,children:e.jsxs("div",{className:"card",children:[e.jsxs("div",{className:"flex",children:[e.jsxs("div",{className:"flex-basis-220",children:[e.jsx("label",{className:"muted",htmlFor:"device-select",children:"Device"}),e.jsxs("select",{id:"device-select",value:r,onChange:s=>S(s.target.value),children:[e.jsx("option",{value:"",children:"Select a device"}),y.map(s=>e.jsx("option",{value:s.lookup,children:s.device_id},s.lookup))]})]}),e.jsx("button",{type:"button",className:"btn align-self-end",onClick:()=>{r&&k(r)},disabled:!r||U,children:U?"Loading...":"Refresh"})]}),I?e.jsx("div",{className:"callout error mt-1",children:"Unable to load device data"}):null,j?e.jsxs("div",{className:"stack mt-1",children:[e.jsxs("div",{className:"grid-3",children:[e.jsxs("div",{className:"card tight",children:[e.jsx("div",{className:"muted",children:"Device ID"}),e.jsx("div",{className:"large-number",children:B}),e.jsx("div",{className:"subdued",children:q})]}),e.jsxs("div",{className:"card tight",children:[e.jsx("div",{className:"muted",children:"Status"}),e.jsxs("div",{className:"status-row",children:[e.jsx("span",{className:`status-dot${i.online?" ok":""}`,title:i.online?"Online":"Offline"}),e.jsx("span",{children:i.online?"Online":"Offline"})]}),e.jsx("div",{className:"subdued",children:i.mode??"Mode unknown"})]}),e.jsxs("div",{className:"card tight",children:[e.jsx("div",{className:"muted",children:"Site"}),e.jsx("div",{className:"large-number",children:T?.site??"-"}),e.jsxs("div",{className:"subdued",children:["Last heartbeat ",P(T?.last_seen_at??null)]})]})]}),e.jsxs("div",{className:"metric-grid",children:[h("supplyC","Supply \xC2\xB0C",1),h("returnC","Return \xC2\xB0C",1),h("deltaT","\xCE\u201DT \xC2\xB0C",1),h("thermalKW","Thermal kW",2),h("cop","COP",2),h("flowLps","Flow L/s",2),h("powerKW","Power kW",2)]}),e.jsxs("div",{className:"grid auto mt-1",children:[e.jsxs("div",{className:"card tight",children:[e.jsx("div",{className:"muted",children:"Supply trend"}),e.jsx(b,{values:d.supply,color:"#52ff99"}),e.jsxs("div",{className:"subdued",children:["Latest ",n(g(d.supply),1)," \\\\u00B0C"]})]}),e.jsxs("div",{className:"card tight",children:[e.jsx("div",{className:"muted",children:"Return trend"}),e.jsx(b,{values:d.return,color:"#86a5ff"}),e.jsxs("div",{className:"subdued",children:["Latest ",n(g(d.return),1)," \\\\u00B0C"]})]}),e.jsxs("div",{className:"card tight",children:[e.jsx("div",{className:"muted",children:"Thermal output"}),e.jsx(b,{values:d.thermal,color:"#ffcc66"}),e.jsxs("div",{className:"subdued",children:["Latest ",n(g(d.thermal),2)," kW"]})]}),e.jsxs("div",{className:"card tight",children:[e.jsx("div",{className:"muted",children:"COP trend"}),e.jsx(b,{values:d.cop,color:"#52ff99"}),e.jsxs("div",{className:"subdued",children:["Latest ",n(g(d.cop),2)]})]})]}),L.length?e.jsxs("div",{className:"card mt-1",children:[e.jsxs("div",{className:"card-header",children:[e.jsx("div",{className:"card-title",children:"Recent telemetry"}),e.jsxs("div",{className:"subdued",children:[L.length," buckets"]})]}),e.jsx("div",{className:"min-table",children:e.jsxs("table",{className:"table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Timestamp"}),e.jsx("th",{children:"Samples"}),e.jsx("th",{children:"Supply"}),e.jsx("th",{children:"Return"}),e.jsx("th",{children:"Thermal kW"}),e.jsx("th",{children:"COP"})]})}),e.jsx("tbody",{children:L.map(s=>e.jsxs("tr",{children:[e.jsx("td",{children:X(s.bucket_start)}),e.jsx("td",{children:s.sample_count}),e.jsx("td",{children:n(u(s,"supplyC"),1)}),e.jsx("td",{children:n(u(s,"returnC"),1)}),e.jsx("td",{children:n(u(s,"thermalKW"),2)}),e.jsx("td",{children:n(u(s,"cop"),2)})]},s.bucket_start))})]})})]}):null]}):e.jsx("div",{className:"empty mt-1",children:r?"Select refresh to load details":"Choose a device to load telemetry"})]})})}function Y(l){return l==null?"-":typeof l=="string"||typeof l=="number"||typeof l=="boolean"?String(l):"-"}function u(l,v){const m=l.values?.[v]?.avg;return typeof m=="number"&&Number.isFinite(m)?m:null}function g(l){for(let v=l.length-1;v>=0;v-=1){const o=l[v];if(typeof o=="number"&&!Number.isNaN(o))return o}return null}export{te as default};\n',
  "assets/DevicesPage-D9uGgfnL.js": 'import{u as y,a as k,r as l,j as e,L}from"./index-CAv5rt5M.js";import{P as S,b as A}from"./format-BvCvFL95.js";const C={items:[],cursor:null,loading:!1,error:!1};function U(){const u=y(),m=k().user,i=l.useMemo(()=>(m?.roles??[]).some(s=>s.toLowerCase()==="admin"),[m?.roles]),[f,h]=l.useState(()=>!i),[b,n]=l.useState(C),a=i?f:!0,r=l.useCallback(async(s,d=!1)=>{n(t=>({items:d?[]:t.items,cursor:d?null:t.cursor,loading:!0,error:!1}));try{const t=new URLSearchParams({limit:"25",mine:a?"1":"0"});s&&t.set("cursor",s);const j=await u.get(`/api/devices?${t.toString()}`),p=j.items??[];n(N=>({items:s&&!d?N.items.concat(p):p,cursor:j.next??null,loading:!1,error:!1}))}catch{n(t=>({...t,loading:!1,error:!0}))}},[u,a]);l.useEffect(()=>{r(null,!0)},[r]);const{items:x,cursor:c,loading:o,error:v}=b,g=i?e.jsxs("div",{className:"tabs",role:"group","aria-label":"Device scope filter",children:[e.jsx("button",{type:"button",className:`btn ghost${a?" active":""}`,"aria-pressed":a,onClick:()=>h(!0),children:"Assigned"}),e.jsx("button",{type:"button",className:`btn ghost${a?"":" active"}`,"aria-pressed":!a,onClick:()=>h(!1),children:"All devices"})]}):null;return e.jsx(S,{title:"Devices",actions:g,children:e.jsxs("div",{className:"card",children:[e.jsxs("div",{className:"card-header",children:[e.jsx("div",{className:"card-title",children:"Devices in scope"}),v?e.jsx("span",{className:"pill error",children:"Error fetching list"}):null]}),x.length?e.jsx("div",{className:"min-table",children:e.jsxs("table",{className:"table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Device"}),e.jsx("th",{children:"Site"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Last seen"}),e.jsx("th",{children:"Profile"})]})}),e.jsx("tbody",{children:x.map(s=>e.jsxs("tr",{children:[e.jsx("td",{children:e.jsx(L,{className:"link",to:`/app/device?device=${encodeURIComponent(s.lookup)}`,children:s.device_id})}),e.jsx("td",{children:s.site??"-"}),e.jsx("td",{children:e.jsx("span",{className:`status-dot${s.online?" ok":""}`,title:s.online?"Online":"Offline"})}),e.jsx("td",{children:A(s.last_seen_at)}),e.jsx("td",{children:s.profile_id??"-"})]},s.lookup))})]})}):e.jsx("div",{className:"empty",children:o?"Loading...":"No devices"}),e.jsxs("div",{className:"flex-between mt-1",children:[e.jsx("div",{className:"subdued",children:c?"More devices available":"End of list"}),c?e.jsx("button",{type:"button",className:"btn",disabled:o,onClick:()=>{r(c)},children:o?"Loading...":"Load more"}):null]})]})})}export{U as default};\n',
  "assets/GREENBRO LOGO APP.svg": '\xEF\xBB\xBF<svg viewBox="0 0 320 64" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GreenBro">\n  <rect width="320" height="64" rx="12" fill="#0b1e14"/>\n  <text x="32" y="40" font-size="28" font-family="Arial, Helvetica, sans-serif" fill="#52ff99">GreenBro</text>\n</svg>\r\n',
  "assets/Gear_Icon_01.svg": '\xEF\xBB\xBF<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">\n  <circle cx="12" cy="12" r="3" fill="#52ff99"/>\n  <path d="M3 12h3m12 0h3M12 3v3m0 12v3M5 5l2.1 2.1M16.9 16.9L19 19M19 5l-2.1 2.1M7.1 16.9 5 19" stroke="#52ff99" stroke-width="2" fill="none"/>\n</svg>\r\n',
  "assets/Gear_Icon_02.svg": '\xEF\xBB\xBF<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">\n  <rect x="6" y="6" width="12" height="12" rx="2" stroke="#52ff99" stroke-width="2" fill="none"/>\n  <circle cx="12" cy="12" r="2" fill="#52ff99"/>\n</svg>\r\n',
  "assets/Gear_Icon_03.svg": '\xEF\xBB\xBF<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">\n  <path d="M4 12a8 8 0 1 0 16 0" stroke="#52ff99" stroke-width="2" fill="none"/>\n  <path d="M12 4a8 8 0 0 0 0 16" stroke="#52ff99" stroke-width="2" fill="none"/>\n</svg>\r\n',
  "assets/OpsPage-CXH1Qzc6.js": 'import{u as T,r as W,j as e}from"./index-CAv5rt5M.js";import{u as q,R as w}from"./RequestErrorCallout-BT33_181.js";import{P as m,a as r,c as u,f as a}from"./format-BvCvFL95.js";function P(){const x=T(),g=W.useCallback(({signal:s})=>x.get("/api/ops/overview",{signal:s}),[x]),{phase:b,data:t,error:j,retry:f,isRetryScheduled:y,nextRetryInMs:$,attempts:R,isFetching:S}=q(g,{autoRefreshMs:6e4}),k=t?"Issues loading latest operations data":"Unable to load operations metrics",d=j?e.jsx(w,{title:k,error:j,onRetry:f,retryScheduled:y,nextRetryInMs:$,attempts:R,busy:S}):null;if(!t&&b==="loading")return e.jsx(m,{title:"Operations",children:e.jsx("div",{className:"card",children:"Loading..."})});if(!t)return e.jsx(m,{title:"Operations",children:d??e.jsx("div",{className:"card callout error",children:"Unable to load operations metrics"})});const{ops_summary:l,devices:i,thresholds:n,ops:c,recent:h,ops_window:o}=t,v=n?.error_rate?.warn??null,N=n?.client_error_rate?.warn??null,p=n?.avg_duration_ms?.warn??null,_=o?`Window: last ${r(o.days,0)} days (since ${u(o.start)})`:null;return e.jsxs(m,{title:"Operations",children:[d?e.jsx("div",{style:{marginBottom:"1rem"},children:d}):null,e.jsxs("div",{className:"grid kpis",children:[e.jsxs("div",{className:"card tight",children:[e.jsx("div",{className:"muted",children:"Requests observed"}),e.jsx("div",{className:"large-number",children:r(l.total_requests,0)}),e.jsxs("div",{className:"subdued",children:["Generated ",u(t.generated_at),_?` \xE2\u20AC\xA2 ${_}`:null]})]}),e.jsxs("div",{className:"card tight",children:[e.jsx("div",{className:"muted",children:"Server error rate"}),e.jsx("div",{className:"large-number",children:a(l.server_error_rate*100,2)}),e.jsx("div",{className:"subdued",children:v!==null?`Warns at ${a(v*100,2)}`:"No threshold"})]}),e.jsxs("div",{className:"card tight",children:[e.jsx("div",{className:"muted",children:"Client error rate"}),e.jsx("div",{className:"large-number",children:a(l.client_error_rate*100,2)}),e.jsx("div",{className:"subdued",children:N!==null?`Warns at ${a(N*100,2)}`:"No threshold"})]}),e.jsxs("div",{className:"card tight",children:[e.jsx("div",{className:"muted",children:"Slow requests"}),e.jsx("div",{className:"large-number",children:a(l.slow_rate*100,2)}),e.jsx("div",{className:"subdued",children:p!==null?`Warns at ${r(p,0)} ms`:"No threshold"})]}),e.jsxs("div",{className:"card tight",children:[e.jsx("div",{className:"muted",children:"Devices online"}),e.jsx("div",{className:"large-number",children:r(i.online,0)}),e.jsxs("div",{className:"subdued",children:[r(i.offline,0)," offline (",a(i.offline_ratio*100,2),")"]})]})]}),l.slow_routes.length||l.top_server_error_routes.length?e.jsxs("div",{className:"card mt-1",children:[e.jsx("div",{className:"card-header",children:e.jsx("div",{className:"card-title",children:"Hotspots"})}),e.jsxs("div",{className:"stack",children:[l.slow_routes.length?e.jsxs("div",{children:[e.jsx("div",{className:"muted",children:"Slow routes"}),e.jsx("ul",{style:{listStyle:"none",padding:0,margin:"0.25rem 0 0"},children:l.slow_routes.map(s=>e.jsxs("li",{children:[s.route," (",s.status_code,") \xC2\xB7 ",r(s.avg_duration_ms,1)," ms avg \xC2\xB7"," ",r(s.count,0)," calls"]},`${s.route}-${s.status_code}`))})]}):null,l.top_server_error_routes.length?e.jsxs("div",{children:[e.jsx("div",{className:"muted",children:"Server errors"}),e.jsx("ul",{style:{listStyle:"none",padding:0,margin:"0.25rem 0 0"},children:l.top_server_error_routes.map(s=>e.jsxs("li",{children:[s.route," (",s.status_code,") \xC2\xB7 ",r(s.count,0)," errors"]},`${s.route}-${s.status_code}`))})]}):null]})]}):null,e.jsxs("div",{className:"card mt-1",children:[e.jsxs("div",{className:"card-header",children:[e.jsx("div",{className:"card-title",children:"Route breakdown"}),e.jsxs("span",{className:"pill",children:[c.length," groups"]})]}),c.length?e.jsx("div",{className:"min-table",children:e.jsxs("table",{className:"table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Route"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Count"}),e.jsx("th",{children:"Avg ms"}),e.jsx("th",{children:"Max ms"}),e.jsx("th",{children:"Total ms"})]})}),e.jsx("tbody",{children:c.map(s=>e.jsxs("tr",{children:[e.jsx("td",{children:s.route}),e.jsx("td",{children:s.status_code}),e.jsx("td",{children:r(s.count,0)}),e.jsx("td",{children:r(s.avg_duration_ms,1)}),e.jsx("td",{children:r(s.max_duration_ms,1)}),e.jsx("td",{children:r(s.total_duration_ms,1)})]},`${s.route}-${s.status_code}`))})]})}):e.jsx("div",{className:"empty",children:"No aggregated metrics"})]}),e.jsxs("div",{className:"card mt-1",children:[e.jsxs("div",{className:"card-header",children:[e.jsx("div",{className:"card-title",children:"Recent events"}),e.jsxs("span",{className:"pill",children:[h.length," events"]})]}),h.length?e.jsx("div",{className:"min-table",children:e.jsxs("table",{className:"table",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Timestamp"}),e.jsx("th",{children:"Route"}),e.jsx("th",{children:"Status"}),e.jsx("th",{children:"Duration ms"}),e.jsx("th",{children:"Device"})]})}),e.jsx("tbody",{children:h.map((s,C)=>e.jsxs("tr",{children:[e.jsx("td",{children:u(s.ts)}),e.jsx("td",{children:s.route}),e.jsx("td",{children:s.status_code}),e.jsx("td",{children:r(s.duration_ms,1)}),e.jsx("td",{children:s.device_id?s.lookup?e.jsx("a",{className:"link",href:`/app/device?device=${encodeURIComponent(s.lookup)}`,children:s.device_id}):s.device_id:"-"})]},`${s.ts}-${C}`))})]})}):e.jsx("div",{className:"empty",children:"No recent events"})]})]})}export{P as default};\n',
  "assets/OverviewPage-CmJl3bQb.js": 'import{u as j,r as N,j as e}from"./index-CAv5rt5M.js";import{u as g,R as f}from"./RequestErrorCallout-BT33_181.js";import{P as t,f as p,a as r,b as _}from"./format-BvCvFL95.js";function R(){const i=j(),d=N.useCallback(({signal:x})=>i.get("/api/fleet/summary",{signal:x}),[i]),{phase:c,data:s,error:l,retry:n,isRetryScheduled:m,nextRetryInMs:o,attempts:u,isFetching:v}=g(d),h=s?"Issues loading latest fleet metrics":"Failed to load fleet metrics",a=l?e.jsx(f,{title:h,error:l,onRetry:n,retryScheduled:m,nextRetryInMs:o,attempts:u,busy:v}):null;return!s&&c==="loading"?e.jsx(t,{title:"Overview (Fleet)",children:e.jsx("div",{className:"card",children:"Loading..."})}):s?e.jsxs(t,{title:"Overview (Fleet)",children:[a?e.jsx("div",{style:{marginBottom:"1rem"},children:a}):null,e.jsxs("div",{className:"grid kpis",children:[e.jsxs("div",{className:"card tight",children:[e.jsx("div",{className:"muted",children:"Online %"}),e.jsx("div",{className:"large-number",children:p(s.online_pct)}),e.jsxs("div",{className:"subdued",children:[s.devices_online,"/",s.devices_total," online"]})]}),e.jsxs("div",{className:"card tight",children:[e.jsx("div",{className:"muted",children:"Avg COP (24h)"}),e.jsx("div",{className:"large-number",children:r(s.avg_cop_24h,2)}),e.jsxs("div",{className:"subdued",children:["Window start ",_(s.window_start_ms)]})]}),e.jsxs("div",{className:"card tight",children:[e.jsx("div",{className:"muted",children:"Low ?T events"}),e.jsx("div",{className:"large-number",children:r(s.low_deltaT_count_24h??0,0)}),e.jsxs("div",{className:"subdued",children:["Oldest heartbeat ",r((s.max_heartbeat_age_sec??0)/60,1),"m"]})]})]}),e.jsxs("div",{className:"card mt-1",children:[e.jsx("div",{className:"card-title",children:"Devices"}),e.jsxs("div",{className:"subdued",children:[s.devices_online,"/",s.devices_total," online"]})]})]}):e.jsx(t,{title:"Overview (Fleet)",children:a??e.jsx("div",{className:"card callout error",children:"Failed to load fleet metrics"})})}export{R as default};\n',
  "assets/RequestErrorCallout-BT33_181.js": 'import{r as e,A as K,j as o}from"./index-CAv5rt5M.js";const j={initialDelayMs:2e3,multiplier:2,maxDelayMs:3e4};function L(t){return t?{initialDelayMs:t.initialDelayMs??j.initialDelayMs,multiplier:t.multiplier??j.multiplier,maxDelayMs:t.maxDelayMs??j.maxDelayMs}:j}function W(t,r){const i=Math.max(0,t-1),f=r.initialDelayMs*r.multiplier**i;return Math.min(r.maxDelayMs,f)}function _(t){if(t){if(typeof t=="string")return t;if(typeof t=="number"||typeof t=="boolean")return String(t);if(typeof t=="object"){const r=t.message??t.error??t.detail??t.title;return typeof r=="string"?r:void 0}}}function G(t){if(t instanceof K){const r=_(t.body),i=t.status>=500||t.status===429||t.status===408;return{message:`API request failed (${t.status})`,description:r,status:t.status,cause:t,retryable:i}}return t instanceof DOMException&&t.name==="AbortError"?{message:"Request cancelled",cause:t,retryable:!1}:t instanceof Error?{message:t.message||"Request failed",description:typeof t.cause=="string"?t.cause:void 0,cause:t,retryable:!0}:{message:"Request failed",cause:t,retryable:!0}}function X(t,r={}){const{initialData:i=null,autoRefreshMs:f,enableAutoRetry:A=!0,backoff:g,onSuccess:b,onError:S}=r,m=e.useMemo(()=>L(g),[g]),[s,I]=e.useState(()=>({phase:i?"ready":"loading",data:i,error:null,isFetching:!1,attempts:0,isRetryScheduled:!1,nextRetryInMs:null,lastUpdatedAt:i?Date.now():null,lastErrorAt:null})),h=e.useRef(s),M=e.useRef(!0),w=e.useRef(null),D=e.useRef(null),k=e.useRef(null),a=e.useRef(null),E=e.useRef(null);e.useEffect(()=>{h.current=s},[s]);const N=e.useCallback(n=>{I(p=>{const u=typeof n=="function"?n(p):n;return h.current=u,u})},[]),d=e.useCallback(n=>{M.current&&N(n)},[N]),C=e.useCallback(()=>{a.current&&(clearInterval(a.current),a.current=null)},[]),y=e.useCallback(()=>{k.current&&(clearTimeout(k.current),k.current=null)},[]),R=e.useCallback(()=>{D.current&&(clearTimeout(D.current),D.current=null),E.current=null,C(),d(n=>!n.isRetryScheduled&&n.nextRetryInMs===null?n:{...n,isRetryScheduled:!1,nextRetryInMs:null})},[C,d]),q=e.useCallback(()=>{E.current&&(C(),a.current=setInterval(()=>{if(!M.current){a.current&&(clearInterval(a.current),a.current=null);return}const n=E.current;if(!n){a.current&&(clearInterval(a.current),a.current=null);return}const p=Math.max(0,n-Date.now());d(u=>!u.isRetryScheduled||u.nextRetryInMs===p?u:{...u,nextRetryInMs:p}),p<=0&&a.current&&(clearInterval(a.current),a.current=null)},250))},[C,d]),x=e.useCallback(n=>{const p=!!n?.manual,u=!!n?.silent,B=n?.resetAttempts??p;R(),y();const v=new AbortController;w.current?.abort(),w.current=v;const U=h.current.data!==null;d(l=>{const c={...l,isFetching:!0,isRetryScheduled:!1,nextRetryInMs:null};return B&&(c.attempts=0),u||(c.phase=U?l.phase:"loading",U||(c.error=null)),c}),t({signal:v.signal}).then(l=>{M.current&&(R(),y(),d(c=>({phase:"ready",data:l,error:null,isFetching:!1,attempts:0,isRetryScheduled:!1,nextRetryInMs:null,lastUpdatedAt:Date.now(),lastErrorAt:c.lastErrorAt})),b?.(l),f&&f>0&&(k.current=setTimeout(()=>{x({silent:!0,resetAttempts:!0})},f)))}).catch(l=>{if(!M.current||v.signal.aborted||l instanceof DOMException&&l.name==="AbortError"||l instanceof Error&&l.name==="AbortError")return;y();const c=G(l),$=(B?0:h.current.attempts)+1,O=h.current.data!==null?"ready":"error",T=W($,m),F=A&&c.retryable;d(H=>({...H,phase:O,error:c,isFetching:!1,attempts:$,isRetryScheduled:F,nextRetryInMs:F?T:null,lastErrorAt:Date.now()})),S?.(l,c),F&&(E.current=Date.now()+T,D.current=setTimeout(()=>{D.current=null,E.current=null,x({silent:h.current.data!==null})},T),q())})},[f,m,y,A,S,b,t,d,q,R]),P=e.useCallback(()=>{const n=h.current.data!==null;x({manual:!0,silent:n,resetAttempts:!0})},[x]),z=e.useCallback(()=>{R()},[R]);return e.useEffect(()=>(x(),()=>{M.current=!1,w.current?.abort(),R(),y()}),[y,x,R]),{phase:s.phase,data:s.data,error:s.error,isFetching:s.isFetching,attempts:s.attempts,isRetryScheduled:s.isRetryScheduled,nextRetryInMs:s.nextRetryInMs,lastUpdatedAt:s.lastUpdatedAt,lastErrorAt:s.lastErrorAt,retry:P,cancelRetry:z}}function Y({title:t,error:r,onRetry:i,retryScheduled:f,nextRetryInMs:A,attempts:g,busy:b=!1}){const S=r.description??r.message,m=f&&typeof A=="number"?Math.max(0,Math.ceil(A/1e3)):null,s=[];g>0&&s.push(`Attempt ${g}`),m!==null?s.push(`Retrying in ${m}s`):r.retryable||s.push("Auto retry disabled");const I=s.length?s.join(" \xE2\u20AC\xA2 "):null;return o.jsxs("div",{className:"card callout error",children:[o.jsx("div",{children:o.jsx("strong",{children:t})}),o.jsx("div",{children:S}),r.status?o.jsx("div",{className:"muted",children:`HTTP status ${r.status}`}):null,I?o.jsx("div",{className:"muted",children:I}):null,o.jsxs("div",{className:"mt-1",style:{display:"flex",gap:"0.5rem",flexWrap:"wrap",alignItems:"center"},children:[o.jsx("button",{type:"button",className:"btn",onClick:i,disabled:b,children:b?"Retrying...":"Retry now"}),m!==null?o.jsx("span",{className:"subdued",children:`Next attempt in ${m}s`}):null]})]})}export{Y as R,X as u};\n',
  "assets/Sparkline-D2W6pTJo.js": 'import{j as e}from"./index-CAv5rt5M.js";function h({values:a=[],color:i="#52ff99",emptyLabel:l="No data"}){const n=a.filter(t=>typeof t=="number"&&!Number.isNaN(t));if(n.length===0)return e.jsx("div",{className:"empty",children:l});const o=Math.min(...n),r=Math.max(...n),s=n.map((t,m)=>{const c=n.length===1?100:m/(n.length-1)*100,p=100-(r===o?.5:(t-o)/(r-o))*100;return`${c.toFixed(2)},${p.toFixed(2)}`}).join(" ");return e.jsxs("svg",{className:"sparkline",viewBox:"0 0 100 100",role:"img","aria-label":"sparkline chart",children:[e.jsx("polyline",{points:s,fill:"none",stroke:i,strokeWidth:6,opacity:.08,strokeLinecap:"round"}),e.jsx("polyline",{points:s,fill:"none",stroke:i,strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"})]})}export{h as S};\n',
  "assets/format-BvCvFL95.js": 'import{j as o}from"./index-CAv5rt5M.js";function c({title:t,actions:r=null,children:e}){return o.jsxs("div",{className:"wrap",children:[o.jsxs("div",{className:"page-header",children:[o.jsx("h2",{className:"page-title",children:t}),r]}),e]})}function f(t,r=1){if(t==null||Number.isNaN(t))return"\xEF\xBF\xBD";const e=Math.pow(10,r);return String(Math.round(t*e)/e)}function d(t,r=0){return t==null||Number.isNaN(t)?"\xEF\xBF\xBD":`${f(t,r)}%`}function N(t){if(!t)return"\xEF\xBF\xBD";const r=typeof t=="number"?new Date(t):new Date(String(t));if(Number.isNaN(r.getTime()))return String(t);const e=Date.now()-r.getTime(),n=e>=0?"ago":"from now",i=Math.abs(e);if(i<6e4)return"just now";const a=Math.round(i/6e4);if(a<60)return`${a}m ${n}`;const s=Math.round(a/60);return s<48?`${s}h ${n}`:`${Math.round(s/24)}d ${n}`}function g(t){if(!t)return"\xEF\xBF\xBD";const r=typeof t=="number"?new Date(t):new Date(String(t));return Number.isNaN(r.getTime())?String(t):r.toLocaleString()}export{c as P,f as a,N as b,g as c,d as f};\n',
  "assets/index-y6znqhWW.css": ":root{color-scheme:dark;--bg:#0b0f10;--card:#11181a;--muted:#6b7f7a;--fg:#e9ffef;--brand:#52ff99;--warn:#ffcc66;--err:#ff7a7a;--ok:#7dffa1}*{box-sizing:border-box}html,body,#root{height:100%}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 Inter,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif}a{color:var(--brand);text-decoration:none}.nav{display:flex;gap:.75rem;align-items:center;padding:.75rem 1rem;border-bottom:1px solid #17322a;background:#0d1415;position:sticky;top:0;z-index:10}.nav .brand{display:flex;align-items:center;gap:.5rem;font-weight:600;font-size:15px}.tag{padding:.1rem .5rem;border-radius:.5rem;background:#143c2c;color:#72ffb6;font-size:12px;text-transform:uppercase;letter-spacing:.08em}.sp{flex:1}.btn{background:#123026;border:1px solid #1d4a39;color:var(--fg);padding:.5rem .85rem;border-radius:.6rem;cursor:pointer;font-weight:500}.btn:hover{background:#173a2e}.btn.ghost{background:transparent;color:var(--muted);border-color:#1d4032}.btn.ghost.active{color:var(--fg);background:#123026}.wrap{max-width:1180px;margin:0 auto;padding:1.2rem}.page-header{display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;margin-bottom:1rem}.page-title{margin:0}.flex-between{display:flex;justify-content:space-between;align-items:center}.flex-basis-220{flex:1 1 220px}.align-self-end{align-self:flex-end}.status-row{display:flex;align-items:center;gap:.5rem;margin-top:.4rem}.font-semibold{font-weight:600}.text-right{text-align:right}.trend-subtitle{font-size:16px;font-weight:600;margin-top:.2rem}.card-section{padding:0 1rem 1rem}.inline-link{display:inline-block;margin-top:.4rem}.mt-1{margin-top:1rem}.mt-06{margin-top:.6rem}.mt-04{margin-top:.4rem}.mt-02{margin-top:.2rem}.mb-1{margin-bottom:1rem}.grid{display:grid;gap:1rem}.grid.kpis{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}.grid.auto{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:.75rem}.card{background:var(--card);border:1px solid #15352a;border-radius:1rem;padding:1rem;box-shadow:0 10px 25px #0000002e}.card.tight{padding:.75rem}.card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem}.card-title{font-size:16px;font-weight:600}.muted{color:var(--muted)}.hero,.large-number{font-size:32px;font-weight:600}.subdued{color:#889a94;font-size:12px}.pill{display:inline-flex;align-items:center;gap:.35rem;padding:.2rem .55rem;border-radius:999px;background:#133126;color:#7dffa1;font-size:12px;text-transform:uppercase;letter-spacing:.08em}.pill.warn{background:#3a2e1a;color:var(--warn)}.pill.error{background:#3a1f1f;color:var(--err)}.chip{background:#102119;border:1px solid #1f4532;border-radius:.6rem;padding:.2rem .55rem;font-size:12px;display:inline-flex;align-items:center;gap:.3rem;color:#7dffa1}.chip.warn{border-color:#4d3c20;color:var(--warn);background:#2a2113}.chip.error{border-color:#4a2020;color:var(--err);background:#2a1414}table{width:100%;border-collapse:collapse}.table th,.table td{padding:.55rem .65rem;border-bottom:1px solid #163226;text-align:left;font-size:13px}.table tr:hover{background:#52ff990d}.status-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#ff7a7a}.status-dot.ok{background:#7dffa1}.sparkline{width:100%;height:60px}.list{display:flex;flex-direction:column;gap:.8rem}.list-item{display:flex;justify-content:space-between;align-items:flex-start;border:1px solid #163226;border-radius:.85rem;padding:.85rem;background:#0f1716;gap:.75rem}.list-item .meta{font-size:12px;color:var(--muted)}.metric-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:.75rem}.metric-tile{background:#101918;border:1px solid #1b382f;border-radius:.85rem;padding:.75rem}.metric-label{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.08em}.metric-value{margin-top:.35rem;font-size:20px;font-weight:600}.metric-sub{color:#86a59c;font-size:12px;margin-top:.2rem}.checklist{display:flex;flex-direction:column;gap:.45rem;margin-top:.6rem}.check-item{display:flex;justify-content:space-between;align-items:center;background:#101b19;border:1px solid #1b382f;border-radius:.7rem;padding:.45rem .6rem}.check-item.fail{background:#1a1111;border-color:#3e1c1c}.check-item span{font-size:13px}.progress-bar{appearance:none;-webkit-appearance:none;width:100%;height:8px;border-radius:999px;background:#132320;margin-top:.4rem;overflow:hidden;border:none}.progress-bar::-webkit-progress-bar{background:#132320;border-radius:999px}.progress-bar::-webkit-progress-value{background:linear-gradient(90deg,#1fcc78,#52ff99);border-radius:999px}.progress-bar::-moz-progress-bar{background:linear-gradient(90deg,#1fcc78,#52ff99);border-radius:999px}input,select{background:#0e1516;border:1px solid #193a30;color:var(--fg);border-radius:.6rem;padding:.5rem .6rem;font-size:14px}.flex{display:flex;gap:1rem;flex-wrap:wrap}.two-column{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem}.empty{color:var(--muted);font-style:italic}.tabs{display:flex;gap:.5rem;margin-bottom:1rem;flex-wrap:wrap}.stack{display:flex;flex-direction:column;gap:.75rem}.callout{background:#11231d;border:1px solid #1d4032;border-radius:.8rem;padding:.75rem;font-size:13px;color:#7dffa1}.callout.warn{background:#2a2113;border-color:#4a3a1a;color:var(--warn)}.callout.error{background:#2a1414;border-color:#4a2020;color:var(--err)}.min-table{max-height:320px;overflow:auto}.chart-card{padding:0}.chart-card svg{display:block;width:100%;height:160px}.section-title{font-size:18px;margin:0 0 .5rem;font-weight:600}.link{color:var(--brand);text-decoration:none}.link:hover{text-decoration:underline}.mono{font-family:JetBrains Mono,monospace}.badge{border:1px solid #2b5a49;border-radius:.4rem;padding:.2rem .45rem;font-size:12px}.pill+.pill{margin-left:.4rem}.card-group{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem}.history-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem}.history-card{background:#101918;border:1px solid #1b382f;border-radius:.75rem;padding:.6rem .75rem}.history-card strong{font-size:16px}@media(max-width:720px){.nav{flex-wrap:wrap;gap:.5rem}.nav .brand{margin-bottom:.25rem}.nav-links{flex-wrap:wrap;width:100%;margin-left:0}.nav-link{padding:.3rem .5rem}.nav .sp{display:none}.grid.kpis{grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}}\n"
};

// src/utils/responses.ts
var JSON_CT = "application/json;charset=utf-8";
var HTML_CT = "text/html;charset=utf-8";
var SVG_CT = "image/svg+xml;charset=utf-8";
function appendUnique(target, values) {
  if (!values) return;
  for (const value of values) {
    if (!target.includes(value)) {
      target.push(value);
    }
  }
}
__name(appendUnique, "appendUnique");
function withSecurityHeaders(res, options = {}) {
  const scriptSrc = ["'self'"];
  appendUnique(scriptSrc, options.scriptSrc);
  appendUnique(scriptSrc, options.scriptHashes);
  appendUnique(scriptSrc, options.scriptNonces);
  const styleSrc = ["'self'"];
  appendUnique(styleSrc, options.styleHashes);
  appendUnique(styleSrc, options.styleNonces);
  appendUnique(styleSrc, options.styleSrc);
  const connectSrc = ["'self'"];
  appendUnique(connectSrc, options.connectSrc);
  const imgSrc = ["'self'", "data:"];
  appendUnique(imgSrc, options.imgSrc);
  const fontSrc = ["'self'", "data:"];
  appendUnique(fontSrc, options.fontSrc);
  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    `style-src ${styleSrc.join(" ")}`,
    `img-src ${imgSrc.join(" ")}`,
    `connect-src ${connectSrc.join(" ")}`,
    `font-src ${fontSrc.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'"
  ].join("; ");
  const h2 = new Headers(res.headers);
  h2.set("Content-Security-Policy", csp);
  h2.set("X-Content-Type-Options", "nosniff");
  h2.set("Referrer-Policy", "no-referrer");
  h2.set("Cross-Origin-Opener-Policy", "same-origin");
  h2.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return new Response(res.body, {
    headers: h2,
    status: res.status,
    statusText: res.statusText
  });
}
__name(withSecurityHeaders, "withSecurityHeaders");
function json(data, init = {}) {
  const headers = new Headers({ "content-type": JSON_CT });
  if (init.headers) {
    const initHeaders = new Headers(init.headers);
    initHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
  }
  const responseInit = { ...init, headers };
  return withSecurityHeaders(new Response(JSON.stringify(data), responseInit));
}
__name(json, "json");
function text(body, init = {}) {
  return withSecurityHeaders(new Response(body, init));
}
__name(text, "text");

// src/assets.ts
var MANIFEST = assets_manifest_default;
function bundledAssetBody(name) {
  const key = `assets/${name}`;
  const bundled = STATIC_BUNDLE[key];
  return typeof bundled === "string" ? bundled : null;
}
__name(bundledAssetBody, "bundledAssetBody");
var ASSETS = Object.fromEntries(
  Object.entries(MANIFEST).map(([name, fallback]) => {
    const body = bundledAssetBody(name) ?? fallback;
    return [name, { ct: SVG_CT, body }];
  })
);

// node_modules/jose/dist/browser/runtime/webcrypto.js
var webcrypto_default = crypto;
var isCryptoKey = /* @__PURE__ */ __name((key) => key instanceof CryptoKey, "isCryptoKey");

// node_modules/jose/dist/browser/lib/buffer_utils.js
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var MAX_INT32 = 2 ** 32;
function concat(...buffers) {
  const size = buffers.reduce((acc, { length }) => acc + length, 0);
  const buf = new Uint8Array(size);
  let i = 0;
  for (const buffer of buffers) {
    buf.set(buffer, i);
    i += buffer.length;
  }
  return buf;
}
__name(concat, "concat");

// node_modules/jose/dist/browser/runtime/base64url.js
var decodeBase64 = /* @__PURE__ */ __name((encoded) => {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}, "decodeBase64");
var decode = /* @__PURE__ */ __name((input) => {
  let encoded = input;
  if (encoded instanceof Uint8Array) {
    encoded = decoder.decode(encoded);
  }
  encoded = encoded.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  try {
    return decodeBase64(encoded);
  } catch {
    throw new TypeError("The input to be decoded is not correctly encoded.");
  }
}, "decode");

// node_modules/jose/dist/browser/util/errors.js
var JOSEError = class extends Error {
  static {
    __name(this, "JOSEError");
  }
  static get code() {
    return "ERR_JOSE_GENERIC";
  }
  constructor(message2) {
    super(message2);
    this.code = "ERR_JOSE_GENERIC";
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
};
var JWTClaimValidationFailed = class extends JOSEError {
  static {
    __name(this, "JWTClaimValidationFailed");
  }
  static get code() {
    return "ERR_JWT_CLAIM_VALIDATION_FAILED";
  }
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2);
    this.code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
};
var JWTExpired = class extends JOSEError {
  static {
    __name(this, "JWTExpired");
  }
  static get code() {
    return "ERR_JWT_EXPIRED";
  }
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2);
    this.code = "ERR_JWT_EXPIRED";
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
};
var JOSEAlgNotAllowed = class extends JOSEError {
  static {
    __name(this, "JOSEAlgNotAllowed");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JOSE_ALG_NOT_ALLOWED";
  }
  static get code() {
    return "ERR_JOSE_ALG_NOT_ALLOWED";
  }
};
var JOSENotSupported = class extends JOSEError {
  static {
    __name(this, "JOSENotSupported");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JOSE_NOT_SUPPORTED";
  }
  static get code() {
    return "ERR_JOSE_NOT_SUPPORTED";
  }
};
var JWSInvalid = class extends JOSEError {
  static {
    __name(this, "JWSInvalid");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JWS_INVALID";
  }
  static get code() {
    return "ERR_JWS_INVALID";
  }
};
var JWTInvalid = class extends JOSEError {
  static {
    __name(this, "JWTInvalid");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JWT_INVALID";
  }
  static get code() {
    return "ERR_JWT_INVALID";
  }
};
var JWKSInvalid = class extends JOSEError {
  static {
    __name(this, "JWKSInvalid");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JWKS_INVALID";
  }
  static get code() {
    return "ERR_JWKS_INVALID";
  }
};
var JWKSNoMatchingKey = class extends JOSEError {
  static {
    __name(this, "JWKSNoMatchingKey");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JWKS_NO_MATCHING_KEY";
    this.message = "no applicable key found in the JSON Web Key Set";
  }
  static get code() {
    return "ERR_JWKS_NO_MATCHING_KEY";
  }
};
var JWKSMultipleMatchingKeys = class extends JOSEError {
  static {
    __name(this, "JWKSMultipleMatchingKeys");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
    this.message = "multiple matching keys found in the JSON Web Key Set";
  }
  static get code() {
    return "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  }
};
var JWKSTimeout = class extends JOSEError {
  static {
    __name(this, "JWKSTimeout");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JWKS_TIMEOUT";
    this.message = "request timed out";
  }
  static get code() {
    return "ERR_JWKS_TIMEOUT";
  }
};
var JWSSignatureVerificationFailed = class extends JOSEError {
  static {
    __name(this, "JWSSignatureVerificationFailed");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
    this.message = "signature verification failed";
  }
  static get code() {
    return "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  }
};

// node_modules/jose/dist/browser/lib/crypto_key.js
function unusable(name, prop = "algorithm.name") {
  return new TypeError(`CryptoKey does not support this operation, its ${prop} must be ${name}`);
}
__name(unusable, "unusable");
function isAlgorithm(algorithm, name) {
  return algorithm.name === name;
}
__name(isAlgorithm, "isAlgorithm");
function getHashLength(hash) {
  return parseInt(hash.name.slice(4), 10);
}
__name(getHashLength, "getHashLength");
function getNamedCurve(alg) {
  switch (alg) {
    case "ES256":
      return "P-256";
    case "ES384":
      return "P-384";
    case "ES512":
      return "P-521";
    default:
      throw new Error("unreachable");
  }
}
__name(getNamedCurve, "getNamedCurve");
function checkUsage(key, usages) {
  if (usages.length && !usages.some((expected) => key.usages.includes(expected))) {
    let msg = "CryptoKey does not support this operation, its usages must include ";
    if (usages.length > 2) {
      const last = usages.pop();
      msg += `one of ${usages.join(", ")}, or ${last}.`;
    } else if (usages.length === 2) {
      msg += `one of ${usages[0]} or ${usages[1]}.`;
    } else {
      msg += `${usages[0]}.`;
    }
    throw new TypeError(msg);
  }
}
__name(checkUsage, "checkUsage");
function checkSigCryptoKey(key, alg, ...usages) {
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512": {
      if (!isAlgorithm(key.algorithm, "HMAC"))
        throw unusable("HMAC");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "RS256":
    case "RS384":
    case "RS512": {
      if (!isAlgorithm(key.algorithm, "RSASSA-PKCS1-v1_5"))
        throw unusable("RSASSA-PKCS1-v1_5");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "PS256":
    case "PS384":
    case "PS512": {
      if (!isAlgorithm(key.algorithm, "RSA-PSS"))
        throw unusable("RSA-PSS");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "EdDSA": {
      if (key.algorithm.name !== "Ed25519" && key.algorithm.name !== "Ed448") {
        throw unusable("Ed25519 or Ed448");
      }
      break;
    }
    case "ES256":
    case "ES384":
    case "ES512": {
      if (!isAlgorithm(key.algorithm, "ECDSA"))
        throw unusable("ECDSA");
      const expected = getNamedCurve(alg);
      const actual = key.algorithm.namedCurve;
      if (actual !== expected)
        throw unusable(expected, "algorithm.namedCurve");
      break;
    }
    default:
      throw new TypeError("CryptoKey does not support this operation");
  }
  checkUsage(key, usages);
}
__name(checkSigCryptoKey, "checkSigCryptoKey");

// node_modules/jose/dist/browser/lib/invalid_key_input.js
function message(msg, actual, ...types2) {
  types2 = types2.filter(Boolean);
  if (types2.length > 2) {
    const last = types2.pop();
    msg += `one of type ${types2.join(", ")}, or ${last}.`;
  } else if (types2.length === 2) {
    msg += `one of type ${types2[0]} or ${types2[1]}.`;
  } else {
    msg += `of type ${types2[0]}.`;
  }
  if (actual == null) {
    msg += ` Received ${actual}`;
  } else if (typeof actual === "function" && actual.name) {
    msg += ` Received function ${actual.name}`;
  } else if (typeof actual === "object" && actual != null) {
    if (actual.constructor?.name) {
      msg += ` Received an instance of ${actual.constructor.name}`;
    }
  }
  return msg;
}
__name(message, "message");
var invalid_key_input_default = /* @__PURE__ */ __name((actual, ...types2) => {
  return message("Key must be ", actual, ...types2);
}, "default");
function withAlg(alg, actual, ...types2) {
  return message(`Key for the ${alg} algorithm must be `, actual, ...types2);
}
__name(withAlg, "withAlg");

// node_modules/jose/dist/browser/runtime/is_key_like.js
var is_key_like_default = /* @__PURE__ */ __name((key) => {
  if (isCryptoKey(key)) {
    return true;
  }
  return key?.[Symbol.toStringTag] === "KeyObject";
}, "default");
var types = ["CryptoKey"];

// node_modules/jose/dist/browser/lib/is_disjoint.js
var isDisjoint = /* @__PURE__ */ __name((...headers) => {
  const sources = headers.filter(Boolean);
  if (sources.length === 0 || sources.length === 1) {
    return true;
  }
  let acc;
  for (const header of sources) {
    const parameters = Object.keys(header);
    if (!acc || acc.size === 0) {
      acc = new Set(parameters);
      continue;
    }
    for (const parameter of parameters) {
      if (acc.has(parameter)) {
        return false;
      }
      acc.add(parameter);
    }
  }
  return true;
}, "isDisjoint");
var is_disjoint_default = isDisjoint;

// node_modules/jose/dist/browser/lib/is_object.js
function isObjectLike(value) {
  return typeof value === "object" && value !== null;
}
__name(isObjectLike, "isObjectLike");
function isObject(input) {
  if (!isObjectLike(input) || Object.prototype.toString.call(input) !== "[object Object]") {
    return false;
  }
  if (Object.getPrototypeOf(input) === null) {
    return true;
  }
  let proto = input;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(input) === proto;
}
__name(isObject, "isObject");

// node_modules/jose/dist/browser/runtime/check_key_length.js
var check_key_length_default = /* @__PURE__ */ __name((alg, key) => {
  if (alg.startsWith("RS") || alg.startsWith("PS")) {
    const { modulusLength } = key.algorithm;
    if (typeof modulusLength !== "number" || modulusLength < 2048) {
      throw new TypeError(`${alg} requires key modulusLength to be 2048 bits or larger`);
    }
  }
}, "default");

// node_modules/jose/dist/browser/lib/is_jwk.js
function isJWK(key) {
  return isObject(key) && typeof key.kty === "string";
}
__name(isJWK, "isJWK");
function isPrivateJWK(key) {
  return key.kty !== "oct" && typeof key.d === "string";
}
__name(isPrivateJWK, "isPrivateJWK");
function isPublicJWK(key) {
  return key.kty !== "oct" && typeof key.d === "undefined";
}
__name(isPublicJWK, "isPublicJWK");
function isSecretJWK(key) {
  return isJWK(key) && key.kty === "oct" && typeof key.k === "string";
}
__name(isSecretJWK, "isSecretJWK");

// node_modules/jose/dist/browser/runtime/jwk_to_key.js
function subtleMapping(jwk) {
  let algorithm;
  let keyUsages;
  switch (jwk.kty) {
    case "RSA": {
      switch (jwk.alg) {
        case "PS256":
        case "PS384":
        case "PS512":
          algorithm = { name: "RSA-PSS", hash: `SHA-${jwk.alg.slice(-3)}` };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "RS256":
        case "RS384":
        case "RS512":
          algorithm = { name: "RSASSA-PKCS1-v1_5", hash: `SHA-${jwk.alg.slice(-3)}` };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "RSA-OAEP":
        case "RSA-OAEP-256":
        case "RSA-OAEP-384":
        case "RSA-OAEP-512":
          algorithm = {
            name: "RSA-OAEP",
            hash: `SHA-${parseInt(jwk.alg.slice(-3), 10) || 1}`
          };
          keyUsages = jwk.d ? ["decrypt", "unwrapKey"] : ["encrypt", "wrapKey"];
          break;
        default:
          throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    case "EC": {
      switch (jwk.alg) {
        case "ES256":
          algorithm = { name: "ECDSA", namedCurve: "P-256" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ES384":
          algorithm = { name: "ECDSA", namedCurve: "P-384" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ES512":
          algorithm = { name: "ECDSA", namedCurve: "P-521" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          algorithm = { name: "ECDH", namedCurve: jwk.crv };
          keyUsages = jwk.d ? ["deriveBits"] : [];
          break;
        default:
          throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    case "OKP": {
      switch (jwk.alg) {
        case "EdDSA":
          algorithm = { name: jwk.crv };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          algorithm = { name: jwk.crv };
          keyUsages = jwk.d ? ["deriveBits"] : [];
          break;
        default:
          throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    default:
      throw new JOSENotSupported('Invalid or unsupported JWK "kty" (Key Type) Parameter value');
  }
  return { algorithm, keyUsages };
}
__name(subtleMapping, "subtleMapping");
var parse = /* @__PURE__ */ __name(async (jwk) => {
  if (!jwk.alg) {
    throw new TypeError('"alg" argument is required when "jwk.alg" is not present');
  }
  const { algorithm, keyUsages } = subtleMapping(jwk);
  const rest = [
    algorithm,
    jwk.ext ?? false,
    jwk.key_ops ?? keyUsages
  ];
  const keyData = { ...jwk };
  delete keyData.alg;
  delete keyData.use;
  return webcrypto_default.subtle.importKey("jwk", keyData, ...rest);
}, "parse");
var jwk_to_key_default = parse;

// node_modules/jose/dist/browser/runtime/normalize_key.js
var exportKeyValue = /* @__PURE__ */ __name((k) => decode(k), "exportKeyValue");
var privCache;
var pubCache;
var isKeyObject = /* @__PURE__ */ __name((key) => {
  return key?.[Symbol.toStringTag] === "KeyObject";
}, "isKeyObject");
var importAndCache = /* @__PURE__ */ __name(async (cache, key, jwk, alg, freeze = false) => {
  let cached = cache.get(key);
  if (cached?.[alg]) {
    return cached[alg];
  }
  const cryptoKey = await jwk_to_key_default({ ...jwk, alg });
  if (freeze)
    Object.freeze(key);
  if (!cached) {
    cache.set(key, { [alg]: cryptoKey });
  } else {
    cached[alg] = cryptoKey;
  }
  return cryptoKey;
}, "importAndCache");
var normalizePublicKey = /* @__PURE__ */ __name((key, alg) => {
  if (isKeyObject(key)) {
    let jwk = key.export({ format: "jwk" });
    delete jwk.d;
    delete jwk.dp;
    delete jwk.dq;
    delete jwk.p;
    delete jwk.q;
    delete jwk.qi;
    if (jwk.k) {
      return exportKeyValue(jwk.k);
    }
    pubCache || (pubCache = /* @__PURE__ */ new WeakMap());
    return importAndCache(pubCache, key, jwk, alg);
  }
  if (isJWK(key)) {
    if (key.k)
      return decode(key.k);
    pubCache || (pubCache = /* @__PURE__ */ new WeakMap());
    const cryptoKey = importAndCache(pubCache, key, key, alg, true);
    return cryptoKey;
  }
  return key;
}, "normalizePublicKey");
var normalizePrivateKey = /* @__PURE__ */ __name((key, alg) => {
  if (isKeyObject(key)) {
    let jwk = key.export({ format: "jwk" });
    if (jwk.k) {
      return exportKeyValue(jwk.k);
    }
    privCache || (privCache = /* @__PURE__ */ new WeakMap());
    return importAndCache(privCache, key, jwk, alg);
  }
  if (isJWK(key)) {
    if (key.k)
      return decode(key.k);
    privCache || (privCache = /* @__PURE__ */ new WeakMap());
    const cryptoKey = importAndCache(privCache, key, key, alg, true);
    return cryptoKey;
  }
  return key;
}, "normalizePrivateKey");
var normalize_key_default = { normalizePublicKey, normalizePrivateKey };

// node_modules/jose/dist/browser/key/import.js
async function importJWK(jwk, alg) {
  if (!isObject(jwk)) {
    throw new TypeError("JWK must be an object");
  }
  alg || (alg = jwk.alg);
  switch (jwk.kty) {
    case "oct":
      if (typeof jwk.k !== "string" || !jwk.k) {
        throw new TypeError('missing "k" (Key Value) Parameter value');
      }
      return decode(jwk.k);
    case "RSA":
      if (jwk.oth !== void 0) {
        throw new JOSENotSupported('RSA JWK "oth" (Other Primes Info) Parameter value is not supported');
      }
    case "EC":
    case "OKP":
      return jwk_to_key_default({ ...jwk, alg });
    default:
      throw new JOSENotSupported('Unsupported "kty" (Key Type) Parameter value');
  }
}
__name(importJWK, "importJWK");

// node_modules/jose/dist/browser/lib/check_key_type.js
var tag = /* @__PURE__ */ __name((key) => key?.[Symbol.toStringTag], "tag");
var jwkMatchesOp = /* @__PURE__ */ __name((alg, key, usage) => {
  if (key.use !== void 0 && key.use !== "sig") {
    throw new TypeError("Invalid key for this operation, when present its use must be sig");
  }
  if (key.key_ops !== void 0 && key.key_ops.includes?.(usage) !== true) {
    throw new TypeError(`Invalid key for this operation, when present its key_ops must include ${usage}`);
  }
  if (key.alg !== void 0 && key.alg !== alg) {
    throw new TypeError(`Invalid key for this operation, when present its alg must be ${alg}`);
  }
  return true;
}, "jwkMatchesOp");
var symmetricTypeCheck = /* @__PURE__ */ __name((alg, key, usage, allowJwk) => {
  if (key instanceof Uint8Array)
    return;
  if (allowJwk && isJWK(key)) {
    if (isSecretJWK(key) && jwkMatchesOp(alg, key, usage))
      return;
    throw new TypeError(`JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present`);
  }
  if (!is_key_like_default(key)) {
    throw new TypeError(withAlg(alg, key, ...types, "Uint8Array", allowJwk ? "JSON Web Key" : null));
  }
  if (key.type !== "secret") {
    throw new TypeError(`${tag(key)} instances for symmetric algorithms must be of type "secret"`);
  }
}, "symmetricTypeCheck");
var asymmetricTypeCheck = /* @__PURE__ */ __name((alg, key, usage, allowJwk) => {
  if (allowJwk && isJWK(key)) {
    switch (usage) {
      case "sign":
        if (isPrivateJWK(key) && jwkMatchesOp(alg, key, usage))
          return;
        throw new TypeError(`JSON Web Key for this operation be a private JWK`);
      case "verify":
        if (isPublicJWK(key) && jwkMatchesOp(alg, key, usage))
          return;
        throw new TypeError(`JSON Web Key for this operation be a public JWK`);
    }
  }
  if (!is_key_like_default(key)) {
    throw new TypeError(withAlg(alg, key, ...types, allowJwk ? "JSON Web Key" : null));
  }
  if (key.type === "secret") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithms must not be of type "secret"`);
  }
  if (usage === "sign" && key.type === "public") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm signing must be of type "private"`);
  }
  if (usage === "decrypt" && key.type === "public") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm decryption must be of type "private"`);
  }
  if (key.algorithm && usage === "verify" && key.type === "private") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm verifying must be of type "public"`);
  }
  if (key.algorithm && usage === "encrypt" && key.type === "private") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm encryption must be of type "public"`);
  }
}, "asymmetricTypeCheck");
function checkKeyType(allowJwk, alg, key, usage) {
  const symmetric = alg.startsWith("HS") || alg === "dir" || alg.startsWith("PBES2") || /^A\d{3}(?:GCM)?KW$/.test(alg);
  if (symmetric) {
    symmetricTypeCheck(alg, key, usage, allowJwk);
  } else {
    asymmetricTypeCheck(alg, key, usage, allowJwk);
  }
}
__name(checkKeyType, "checkKeyType");
var check_key_type_default = checkKeyType.bind(void 0, false);
var checkKeyTypeWithJwk = checkKeyType.bind(void 0, true);

// node_modules/jose/dist/browser/lib/validate_crit.js
function validateCrit(Err, recognizedDefault, recognizedOption, protectedHeader, joseHeader) {
  if (joseHeader.crit !== void 0 && protectedHeader?.crit === void 0) {
    throw new Err('"crit" (Critical) Header Parameter MUST be integrity protected');
  }
  if (!protectedHeader || protectedHeader.crit === void 0) {
    return /* @__PURE__ */ new Set();
  }
  if (!Array.isArray(protectedHeader.crit) || protectedHeader.crit.length === 0 || protectedHeader.crit.some((input) => typeof input !== "string" || input.length === 0)) {
    throw new Err('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
  }
  let recognized;
  if (recognizedOption !== void 0) {
    recognized = new Map([...Object.entries(recognizedOption), ...recognizedDefault.entries()]);
  } else {
    recognized = recognizedDefault;
  }
  for (const parameter of protectedHeader.crit) {
    if (!recognized.has(parameter)) {
      throw new JOSENotSupported(`Extension Header Parameter "${parameter}" is not recognized`);
    }
    if (joseHeader[parameter] === void 0) {
      throw new Err(`Extension Header Parameter "${parameter}" is missing`);
    }
    if (recognized.get(parameter) && protectedHeader[parameter] === void 0) {
      throw new Err(`Extension Header Parameter "${parameter}" MUST be integrity protected`);
    }
  }
  return new Set(protectedHeader.crit);
}
__name(validateCrit, "validateCrit");
var validate_crit_default = validateCrit;

// node_modules/jose/dist/browser/lib/validate_algorithms.js
var validateAlgorithms = /* @__PURE__ */ __name((option, algorithms) => {
  if (algorithms !== void 0 && (!Array.isArray(algorithms) || algorithms.some((s) => typeof s !== "string"))) {
    throw new TypeError(`"${option}" option must be an array of strings`);
  }
  if (!algorithms) {
    return void 0;
  }
  return new Set(algorithms);
}, "validateAlgorithms");
var validate_algorithms_default = validateAlgorithms;

// node_modules/jose/dist/browser/runtime/subtle_dsa.js
function subtleDsa(alg, algorithm) {
  const hash = `SHA-${alg.slice(-3)}`;
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512":
      return { hash, name: "HMAC" };
    case "PS256":
    case "PS384":
    case "PS512":
      return { hash, name: "RSA-PSS", saltLength: alg.slice(-3) >> 3 };
    case "RS256":
    case "RS384":
    case "RS512":
      return { hash, name: "RSASSA-PKCS1-v1_5" };
    case "ES256":
    case "ES384":
    case "ES512":
      return { hash, name: "ECDSA", namedCurve: algorithm.namedCurve };
    case "EdDSA":
      return { name: algorithm.name };
    default:
      throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  }
}
__name(subtleDsa, "subtleDsa");

// node_modules/jose/dist/browser/runtime/get_sign_verify_key.js
async function getCryptoKey(alg, key, usage) {
  if (usage === "sign") {
    key = await normalize_key_default.normalizePrivateKey(key, alg);
  }
  if (usage === "verify") {
    key = await normalize_key_default.normalizePublicKey(key, alg);
  }
  if (isCryptoKey(key)) {
    checkSigCryptoKey(key, alg, usage);
    return key;
  }
  if (key instanceof Uint8Array) {
    if (!alg.startsWith("HS")) {
      throw new TypeError(invalid_key_input_default(key, ...types));
    }
    return webcrypto_default.subtle.importKey("raw", key, { hash: `SHA-${alg.slice(-3)}`, name: "HMAC" }, false, [usage]);
  }
  throw new TypeError(invalid_key_input_default(key, ...types, "Uint8Array", "JSON Web Key"));
}
__name(getCryptoKey, "getCryptoKey");

// node_modules/jose/dist/browser/runtime/verify.js
var verify = /* @__PURE__ */ __name(async (alg, key, signature, data) => {
  const cryptoKey = await getCryptoKey(alg, key, "verify");
  check_key_length_default(alg, cryptoKey);
  const algorithm = subtleDsa(alg, cryptoKey.algorithm);
  try {
    return await webcrypto_default.subtle.verify(algorithm, cryptoKey, signature, data);
  } catch {
    return false;
  }
}, "verify");
var verify_default = verify;

// node_modules/jose/dist/browser/jws/flattened/verify.js
async function flattenedVerify(jws, key, options) {
  if (!isObject(jws)) {
    throw new JWSInvalid("Flattened JWS must be an object");
  }
  if (jws.protected === void 0 && jws.header === void 0) {
    throw new JWSInvalid('Flattened JWS must have either of the "protected" or "header" members');
  }
  if (jws.protected !== void 0 && typeof jws.protected !== "string") {
    throw new JWSInvalid("JWS Protected Header incorrect type");
  }
  if (jws.payload === void 0) {
    throw new JWSInvalid("JWS Payload missing");
  }
  if (typeof jws.signature !== "string") {
    throw new JWSInvalid("JWS Signature missing or incorrect type");
  }
  if (jws.header !== void 0 && !isObject(jws.header)) {
    throw new JWSInvalid("JWS Unprotected Header incorrect type");
  }
  let parsedProt = {};
  if (jws.protected) {
    try {
      const protectedHeader = decode(jws.protected);
      parsedProt = JSON.parse(decoder.decode(protectedHeader));
    } catch {
      throw new JWSInvalid("JWS Protected Header is invalid");
    }
  }
  if (!is_disjoint_default(parsedProt, jws.header)) {
    throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
  }
  const joseHeader = {
    ...parsedProt,
    ...jws.header
  };
  const extensions = validate_crit_default(JWSInvalid, /* @__PURE__ */ new Map([["b64", true]]), options?.crit, parsedProt, joseHeader);
  let b64 = true;
  if (extensions.has("b64")) {
    b64 = parsedProt.b64;
    if (typeof b64 !== "boolean") {
      throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
    }
  }
  const { alg } = joseHeader;
  if (typeof alg !== "string" || !alg) {
    throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
  }
  const algorithms = options && validate_algorithms_default("algorithms", options.algorithms);
  if (algorithms && !algorithms.has(alg)) {
    throw new JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter value not allowed');
  }
  if (b64) {
    if (typeof jws.payload !== "string") {
      throw new JWSInvalid("JWS Payload must be a string");
    }
  } else if (typeof jws.payload !== "string" && !(jws.payload instanceof Uint8Array)) {
    throw new JWSInvalid("JWS Payload must be a string or an Uint8Array instance");
  }
  let resolvedKey = false;
  if (typeof key === "function") {
    key = await key(parsedProt, jws);
    resolvedKey = true;
    checkKeyTypeWithJwk(alg, key, "verify");
    if (isJWK(key)) {
      key = await importJWK(key, alg);
    }
  } else {
    checkKeyTypeWithJwk(alg, key, "verify");
  }
  const data = concat(encoder.encode(jws.protected ?? ""), encoder.encode("."), typeof jws.payload === "string" ? encoder.encode(jws.payload) : jws.payload);
  let signature;
  try {
    signature = decode(jws.signature);
  } catch {
    throw new JWSInvalid("Failed to base64url decode the signature");
  }
  const verified = await verify_default(alg, key, signature, data);
  if (!verified) {
    throw new JWSSignatureVerificationFailed();
  }
  let payload;
  if (b64) {
    try {
      payload = decode(jws.payload);
    } catch {
      throw new JWSInvalid("Failed to base64url decode the payload");
    }
  } else if (typeof jws.payload === "string") {
    payload = encoder.encode(jws.payload);
  } else {
    payload = jws.payload;
  }
  const result = { payload };
  if (jws.protected !== void 0) {
    result.protectedHeader = parsedProt;
  }
  if (jws.header !== void 0) {
    result.unprotectedHeader = jws.header;
  }
  if (resolvedKey) {
    return { ...result, key };
  }
  return result;
}
__name(flattenedVerify, "flattenedVerify");

// node_modules/jose/dist/browser/jws/compact/verify.js
async function compactVerify(jws, key, options) {
  if (jws instanceof Uint8Array) {
    jws = decoder.decode(jws);
  }
  if (typeof jws !== "string") {
    throw new JWSInvalid("Compact JWS must be a string or Uint8Array");
  }
  const { 0: protectedHeader, 1: payload, 2: signature, length } = jws.split(".");
  if (length !== 3) {
    throw new JWSInvalid("Invalid Compact JWS");
  }
  const verified = await flattenedVerify({ payload, protected: protectedHeader, signature }, key, options);
  const result = { payload: verified.payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}
__name(compactVerify, "compactVerify");

// node_modules/jose/dist/browser/lib/epoch.js
var epoch_default = /* @__PURE__ */ __name((date) => Math.floor(date.getTime() / 1e3), "default");

// node_modules/jose/dist/browser/lib/secs.js
var minute = 60;
var hour = minute * 60;
var day = hour * 24;
var week = day * 7;
var year = day * 365.25;
var REGEX = /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i;
var secs_default = /* @__PURE__ */ __name((str) => {
  const matched = REGEX.exec(str);
  if (!matched || matched[4] && matched[1]) {
    throw new TypeError("Invalid time period format");
  }
  const value = parseFloat(matched[2]);
  const unit = matched[3].toLowerCase();
  let numericDate;
  switch (unit) {
    case "sec":
    case "secs":
    case "second":
    case "seconds":
    case "s":
      numericDate = Math.round(value);
      break;
    case "minute":
    case "minutes":
    case "min":
    case "mins":
    case "m":
      numericDate = Math.round(value * minute);
      break;
    case "hour":
    case "hours":
    case "hr":
    case "hrs":
    case "h":
      numericDate = Math.round(value * hour);
      break;
    case "day":
    case "days":
    case "d":
      numericDate = Math.round(value * day);
      break;
    case "week":
    case "weeks":
    case "w":
      numericDate = Math.round(value * week);
      break;
    default:
      numericDate = Math.round(value * year);
      break;
  }
  if (matched[1] === "-" || matched[4] === "ago") {
    return -numericDate;
  }
  return numericDate;
}, "default");

// node_modules/jose/dist/browser/lib/jwt_claims_set.js
var normalizeTyp = /* @__PURE__ */ __name((value) => value.toLowerCase().replace(/^application\//, ""), "normalizeTyp");
var checkAudiencePresence = /* @__PURE__ */ __name((audPayload, audOption) => {
  if (typeof audPayload === "string") {
    return audOption.includes(audPayload);
  }
  if (Array.isArray(audPayload)) {
    return audOption.some(Set.prototype.has.bind(new Set(audPayload)));
  }
  return false;
}, "checkAudiencePresence");
var jwt_claims_set_default = /* @__PURE__ */ __name((protectedHeader, encodedPayload, options = {}) => {
  let payload;
  try {
    payload = JSON.parse(decoder.decode(encodedPayload));
  } catch {
  }
  if (!isObject(payload)) {
    throw new JWTInvalid("JWT Claims Set must be a top-level JSON object");
  }
  const { typ } = options;
  if (typ && (typeof protectedHeader.typ !== "string" || normalizeTyp(protectedHeader.typ) !== normalizeTyp(typ))) {
    throw new JWTClaimValidationFailed('unexpected "typ" JWT header value', payload, "typ", "check_failed");
  }
  const { requiredClaims = [], issuer, subject, audience, maxTokenAge } = options;
  const presenceCheck = [...requiredClaims];
  if (maxTokenAge !== void 0)
    presenceCheck.push("iat");
  if (audience !== void 0)
    presenceCheck.push("aud");
  if (subject !== void 0)
    presenceCheck.push("sub");
  if (issuer !== void 0)
    presenceCheck.push("iss");
  for (const claim of new Set(presenceCheck.reverse())) {
    if (!(claim in payload)) {
      throw new JWTClaimValidationFailed(`missing required "${claim}" claim`, payload, claim, "missing");
    }
  }
  if (issuer && !(Array.isArray(issuer) ? issuer : [issuer]).includes(payload.iss)) {
    throw new JWTClaimValidationFailed('unexpected "iss" claim value', payload, "iss", "check_failed");
  }
  if (subject && payload.sub !== subject) {
    throw new JWTClaimValidationFailed('unexpected "sub" claim value', payload, "sub", "check_failed");
  }
  if (audience && !checkAudiencePresence(payload.aud, typeof audience === "string" ? [audience] : audience)) {
    throw new JWTClaimValidationFailed('unexpected "aud" claim value', payload, "aud", "check_failed");
  }
  let tolerance;
  switch (typeof options.clockTolerance) {
    case "string":
      tolerance = secs_default(options.clockTolerance);
      break;
    case "number":
      tolerance = options.clockTolerance;
      break;
    case "undefined":
      tolerance = 0;
      break;
    default:
      throw new TypeError("Invalid clockTolerance option type");
  }
  const { currentDate } = options;
  const now = epoch_default(currentDate || /* @__PURE__ */ new Date());
  if ((payload.iat !== void 0 || maxTokenAge) && typeof payload.iat !== "number") {
    throw new JWTClaimValidationFailed('"iat" claim must be a number', payload, "iat", "invalid");
  }
  if (payload.nbf !== void 0) {
    if (typeof payload.nbf !== "number") {
      throw new JWTClaimValidationFailed('"nbf" claim must be a number', payload, "nbf", "invalid");
    }
    if (payload.nbf > now + tolerance) {
      throw new JWTClaimValidationFailed('"nbf" claim timestamp check failed', payload, "nbf", "check_failed");
    }
  }
  if (payload.exp !== void 0) {
    if (typeof payload.exp !== "number") {
      throw new JWTClaimValidationFailed('"exp" claim must be a number', payload, "exp", "invalid");
    }
    if (payload.exp <= now - tolerance) {
      throw new JWTExpired('"exp" claim timestamp check failed', payload, "exp", "check_failed");
    }
  }
  if (maxTokenAge) {
    const age = now - payload.iat;
    const max = typeof maxTokenAge === "number" ? maxTokenAge : secs_default(maxTokenAge);
    if (age - tolerance > max) {
      throw new JWTExpired('"iat" claim timestamp check failed (too far in the past)', payload, "iat", "check_failed");
    }
    if (age < 0 - tolerance) {
      throw new JWTClaimValidationFailed('"iat" claim timestamp check failed (it should be in the past)', payload, "iat", "check_failed");
    }
  }
  return payload;
}, "default");

// node_modules/jose/dist/browser/jwt/verify.js
async function jwtVerify(jwt, key, options) {
  const verified = await compactVerify(jwt, key, options);
  if (verified.protectedHeader.crit?.includes("b64") && verified.protectedHeader.b64 === false) {
    throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
  }
  const payload = jwt_claims_set_default(verified.protectedHeader, verified.payload, options);
  const result = { payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}
__name(jwtVerify, "jwtVerify");

// node_modules/jose/dist/browser/jwks/local.js
function getKtyFromAlg(alg) {
  switch (typeof alg === "string" && alg.slice(0, 2)) {
    case "RS":
    case "PS":
      return "RSA";
    case "ES":
      return "EC";
    case "Ed":
      return "OKP";
    default:
      throw new JOSENotSupported('Unsupported "alg" value for a JSON Web Key Set');
  }
}
__name(getKtyFromAlg, "getKtyFromAlg");
function isJWKSLike(jwks) {
  return jwks && typeof jwks === "object" && Array.isArray(jwks.keys) && jwks.keys.every(isJWKLike);
}
__name(isJWKSLike, "isJWKSLike");
function isJWKLike(key) {
  return isObject(key);
}
__name(isJWKLike, "isJWKLike");
function clone(obj) {
  if (typeof structuredClone === "function") {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
}
__name(clone, "clone");
var LocalJWKSet = class {
  static {
    __name(this, "LocalJWKSet");
  }
  constructor(jwks) {
    this._cached = /* @__PURE__ */ new WeakMap();
    if (!isJWKSLike(jwks)) {
      throw new JWKSInvalid("JSON Web Key Set malformed");
    }
    this._jwks = clone(jwks);
  }
  async getKey(protectedHeader, token) {
    const { alg, kid } = { ...protectedHeader, ...token?.header };
    const kty = getKtyFromAlg(alg);
    const candidates = this._jwks.keys.filter((jwk2) => {
      let candidate = kty === jwk2.kty;
      if (candidate && typeof kid === "string") {
        candidate = kid === jwk2.kid;
      }
      if (candidate && typeof jwk2.alg === "string") {
        candidate = alg === jwk2.alg;
      }
      if (candidate && typeof jwk2.use === "string") {
        candidate = jwk2.use === "sig";
      }
      if (candidate && Array.isArray(jwk2.key_ops)) {
        candidate = jwk2.key_ops.includes("verify");
      }
      if (candidate && alg === "EdDSA") {
        candidate = jwk2.crv === "Ed25519" || jwk2.crv === "Ed448";
      }
      if (candidate) {
        switch (alg) {
          case "ES256":
            candidate = jwk2.crv === "P-256";
            break;
          case "ES256K":
            candidate = jwk2.crv === "secp256k1";
            break;
          case "ES384":
            candidate = jwk2.crv === "P-384";
            break;
          case "ES512":
            candidate = jwk2.crv === "P-521";
            break;
        }
      }
      return candidate;
    });
    const { 0: jwk, length } = candidates;
    if (length === 0) {
      throw new JWKSNoMatchingKey();
    }
    if (length !== 1) {
      const error = new JWKSMultipleMatchingKeys();
      const { _cached } = this;
      error[Symbol.asyncIterator] = async function* () {
        for (const jwk2 of candidates) {
          try {
            yield await importWithAlgCache(_cached, jwk2, alg);
          } catch {
          }
        }
      };
      throw error;
    }
    return importWithAlgCache(this._cached, jwk, alg);
  }
};
async function importWithAlgCache(cache, jwk, alg) {
  const cached = cache.get(jwk) || cache.set(jwk, {}).get(jwk);
  if (cached[alg] === void 0) {
    const key = await importJWK({ ...jwk, ext: true }, alg);
    if (key instanceof Uint8Array || key.type !== "public") {
      throw new JWKSInvalid("JSON Web Key Set members must be public keys");
    }
    cached[alg] = key;
  }
  return cached[alg];
}
__name(importWithAlgCache, "importWithAlgCache");
function createLocalJWKSet(jwks) {
  const set = new LocalJWKSet(jwks);
  const localJWKSet = /* @__PURE__ */ __name(async (protectedHeader, token) => set.getKey(protectedHeader, token), "localJWKSet");
  Object.defineProperties(localJWKSet, {
    jwks: {
      value: /* @__PURE__ */ __name(() => clone(set._jwks), "value"),
      enumerable: true,
      configurable: false,
      writable: false
    }
  });
  return localJWKSet;
}
__name(createLocalJWKSet, "createLocalJWKSet");

// node_modules/jose/dist/browser/runtime/fetch_jwks.js
var fetchJwks = /* @__PURE__ */ __name(async (url, timeout, options) => {
  let controller;
  let id;
  let timedOut = false;
  if (typeof AbortController === "function") {
    controller = new AbortController();
    id = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeout);
  }
  const response = await fetch(url.href, {
    signal: controller ? controller.signal : void 0,
    redirect: "manual",
    headers: options.headers
  }).catch((err) => {
    if (timedOut)
      throw new JWKSTimeout();
    throw err;
  });
  if (id !== void 0)
    clearTimeout(id);
  if (response.status !== 200) {
    throw new JOSEError("Expected 200 OK from the JSON Web Key Set HTTP response");
  }
  try {
    return await response.json();
  } catch {
    throw new JOSEError("Failed to parse the JSON Web Key Set HTTP response as JSON");
  }
}, "fetchJwks");
var fetch_jwks_default = fetchJwks;

// node_modules/jose/dist/browser/jwks/remote.js
function isCloudflareWorkers() {
  return typeof WebSocketPair !== "undefined" || typeof navigator !== "undefined" && true || typeof EdgeRuntime !== "undefined" && EdgeRuntime === "vercel";
}
__name(isCloudflareWorkers, "isCloudflareWorkers");
var USER_AGENT;
if (typeof navigator === "undefined" || !"Cloudflare-Workers"?.startsWith?.("Mozilla/5.0 ")) {
  const NAME = "jose";
  const VERSION = "v5.9.3";
  USER_AGENT = `${NAME}/${VERSION}`;
}
var jwksCache = Symbol();
function isFreshJwksCache(input, cacheMaxAge) {
  if (typeof input !== "object" || input === null) {
    return false;
  }
  if (!("uat" in input) || typeof input.uat !== "number" || Date.now() - input.uat >= cacheMaxAge) {
    return false;
  }
  if (!("jwks" in input) || !isObject(input.jwks) || !Array.isArray(input.jwks.keys) || !Array.prototype.every.call(input.jwks.keys, isObject)) {
    return false;
  }
  return true;
}
__name(isFreshJwksCache, "isFreshJwksCache");
var RemoteJWKSet = class {
  static {
    __name(this, "RemoteJWKSet");
  }
  constructor(url, options) {
    if (!(url instanceof URL)) {
      throw new TypeError("url must be an instance of URL");
    }
    this._url = new URL(url.href);
    this._options = { agent: options?.agent, headers: options?.headers };
    this._timeoutDuration = typeof options?.timeoutDuration === "number" ? options?.timeoutDuration : 5e3;
    this._cooldownDuration = typeof options?.cooldownDuration === "number" ? options?.cooldownDuration : 3e4;
    this._cacheMaxAge = typeof options?.cacheMaxAge === "number" ? options?.cacheMaxAge : 6e5;
    if (options?.[jwksCache] !== void 0) {
      this._cache = options?.[jwksCache];
      if (isFreshJwksCache(options?.[jwksCache], this._cacheMaxAge)) {
        this._jwksTimestamp = this._cache.uat;
        this._local = createLocalJWKSet(this._cache.jwks);
      }
    }
  }
  coolingDown() {
    return typeof this._jwksTimestamp === "number" ? Date.now() < this._jwksTimestamp + this._cooldownDuration : false;
  }
  fresh() {
    return typeof this._jwksTimestamp === "number" ? Date.now() < this._jwksTimestamp + this._cacheMaxAge : false;
  }
  async getKey(protectedHeader, token) {
    if (!this._local || !this.fresh()) {
      await this.reload();
    }
    try {
      return await this._local(protectedHeader, token);
    } catch (err) {
      if (err instanceof JWKSNoMatchingKey) {
        if (this.coolingDown() === false) {
          await this.reload();
          return this._local(protectedHeader, token);
        }
      }
      throw err;
    }
  }
  async reload() {
    if (this._pendingFetch && isCloudflareWorkers()) {
      this._pendingFetch = void 0;
    }
    const headers = new Headers(this._options.headers);
    if (USER_AGENT && !headers.has("User-Agent")) {
      headers.set("User-Agent", USER_AGENT);
      this._options.headers = Object.fromEntries(headers.entries());
    }
    this._pendingFetch || (this._pendingFetch = fetch_jwks_default(this._url, this._timeoutDuration, this._options).then((json3) => {
      this._local = createLocalJWKSet(json3);
      if (this._cache) {
        this._cache.uat = Date.now();
        this._cache.jwks = json3;
      }
      this._jwksTimestamp = Date.now();
      this._pendingFetch = void 0;
    }).catch((err) => {
      this._pendingFetch = void 0;
      throw err;
    }));
    await this._pendingFetch;
  }
};
function createRemoteJWKSet(url, options) {
  const set = new RemoteJWKSet(url, options);
  const remoteJWKSet = /* @__PURE__ */ __name(async (protectedHeader, token) => set.getKey(protectedHeader, token), "remoteJWKSet");
  Object.defineProperties(remoteJWKSet, {
    coolingDown: {
      get: /* @__PURE__ */ __name(() => set.coolingDown(), "get"),
      enumerable: true,
      configurable: false
    },
    fresh: {
      get: /* @__PURE__ */ __name(() => set.fresh(), "get"),
      enumerable: true,
      configurable: false
    },
    reload: {
      value: /* @__PURE__ */ __name(() => set.reload(), "value"),
      enumerable: true,
      configurable: false,
      writable: false
    },
    reloading: {
      get: /* @__PURE__ */ __name(() => !!set._pendingFetch, "get"),
      enumerable: true,
      configurable: false
    },
    jwks: {
      value: /* @__PURE__ */ __name(() => set._local?.jwks(), "value"),
      enumerable: true,
      configurable: false,
      writable: false
    }
  });
  return remoteJWKSet;
}
__name(createRemoteJWKSet, "createRemoteJWKSet");

// node_modules/jose/dist/browser/util/base64url.js
var decode2 = decode;

// node_modules/jose/dist/browser/util/decode_jwt.js
function decodeJwt(jwt) {
  if (typeof jwt !== "string")
    throw new JWTInvalid("JWTs must use Compact JWS serialization, JWT must be a string");
  const { 1: payload, length } = jwt.split(".");
  if (length === 5)
    throw new JWTInvalid("Only JWTs using Compact JWS serialization can be decoded");
  if (length !== 3)
    throw new JWTInvalid("Invalid JWT");
  if (!payload)
    throw new JWTInvalid("JWTs must contain a payload");
  let decoded;
  try {
    decoded = decode2(payload);
  } catch {
    throw new JWTInvalid("Failed to base64url decode the payload");
  }
  let result;
  try {
    result = JSON.parse(decoder.decode(decoded));
  } catch {
    throw new JWTInvalid("Failed to parse the decoded payload as JSON");
  }
  if (!isObject(result))
    throw new JWTInvalid("Invalid JWT Claims Set");
  return result;
}
__name(decodeJwt, "decodeJwt");

// src/rbac.ts
var ROLE_MAP = {
  admin: "admin",
  contractor: "contractor",
  client: "client"
};
function canonicalRole(candidate) {
  const normalized = candidate.trim().toLowerCase();
  if (!normalized) return null;
  return ROLE_MAP[normalized] ?? null;
}
__name(canonicalRole, "canonicalRole");
function deriveUserFromClaims(claims) {
  const email = claims.email || claims.sub || "unknown@unknown";
  const rawRolesArr = Array.isArray(claims.roles) ? claims.roles : Array.isArray(claims.groups) ? claims.groups : [];
  const rawRoles = rawRolesArr.map((r2) => String(r2));
  const roles = /* @__PURE__ */ new Set();
  for (const r2 of rawRoles) {
    const canonical = canonicalRole(r2);
    if (canonical) {
      roles.add(canonical);
    }
  }
  const groupsUnknown = Array.isArray(claims.groups) ? claims.groups : [];
  const groups = groupsUnknown.map((g2) => String(g2));
  const fromGroups = groups.filter((g2) => g2.startsWith("client:")).map((g2) => g2.slice("client:".length));
  const claimIdsUnknown = Array.isArray(claims.clientIds) ? claims.clientIds : [];
  const fromClaim = claimIdsUnknown.map((id) => String(id));
  const clientIds = Array.from(/* @__PURE__ */ new Set([...fromGroups, ...fromClaim]));
  return { email, roles: Array.from(roles), clientIds };
}
__name(deriveUserFromClaims, "deriveUserFromClaims");
function landingFor(user) {
  if (user.roles.includes("admin")) return "/app/overview";
  if (user.roles.includes("client")) return "/app/compact";
  if (user.roles.includes("contractor")) return "/app/devices";
  return "/app/unauthorized";
}
__name(landingFor, "landingFor");

// src/utils/logging.ts
var LEVEL_PRIORITY = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};
var DEFAULT_REDACTION = {
  clientIp: false,
  userAgent: false,
  cfRay: false
};
var loggingConfig = {
  level: "debug",
  debugSampleRate: 1,
  redaction: DEFAULT_REDACTION
};
var configuredFromEnv = false;
var JsonLogger = class _JsonLogger {
  static {
    __name(this, "JsonLogger");
  }
  base;
  constructor(base = {}) {
    this.base = pruneUndefined(base);
  }
  debug(message2, fields) {
    if (!shouldLog("debug")) return;
    this.emit("debug", message2, fields);
  }
  info(message2, fields) {
    if (!shouldLog("info")) return;
    this.emit("info", message2, fields);
  }
  warn(message2, fields) {
    if (!shouldLog("warn")) return;
    this.emit("warn", message2, fields);
  }
  error(message2, fields) {
    if (!shouldLog("error")) return;
    this.emit("error", message2, fields);
  }
  with(extra) {
    const merged = { ...this.base, ...pruneUndefined(extra) };
    return new _JsonLogger(merged);
  }
  emit(level, message2, fields) {
    const entry = {
      ts: (/* @__PURE__ */ new Date()).toISOString(),
      level,
      msg: message2,
      ...this.base,
      ...pruneUndefined(fields ?? {})
    };
    if (entry.error instanceof Error) {
      entry.error = serializeError(entry.error);
    } else if (entry.error && typeof entry.error === "object") {
      entry.error = normalizeErrorLike(entry.error);
    }
    writeLog(applyRedaction(entry));
  }
};
var requestLoggers = /* @__PURE__ */ new WeakMap();
function bindRequestLogger(req, env, extra) {
  configureLoggingFromEnv(env);
  const base = {
    request_id: deriveRequestId(req),
    method: req.method,
    path: safePath(req.url),
    host: safeHost(req.url),
    user_agent: headerOrNull(req, "user-agent"),
    client_ip: headerOrNull(req, "cf-connecting-ip"),
    cf_ray: headerOrNull(req, "cf-ray"),
    ...pruneUndefined(extra ?? {})
  };
  const logger = new JsonLogger(base);
  requestLoggers.set(req, logger);
  return logger;
}
__name(bindRequestLogger, "bindRequestLogger");
function loggerForRequest(req, extra) {
  const existing = requestLoggers.get(req);
  if (existing) {
    return extra && Object.keys(extra).length ? existing.with(extra) : existing;
  }
  const logger = new JsonLogger(pruneUndefined(extra ?? {}));
  requestLoggers.set(req, logger);
  return logger;
}
__name(loggerForRequest, "loggerForRequest");
function releaseRequestLogger(req) {
  requestLoggers.delete(req);
}
__name(releaseRequestLogger, "releaseRequestLogger");
function systemLogger(extra) {
  return new JsonLogger({ scope: "system", ...pruneUndefined(extra ?? {}) });
}
__name(systemLogger, "systemLogger");
function serializeError(err) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack
    };
  }
  if (typeof err === "string") {
    return { message: err };
  }
  if (typeof err === "object" && err !== null) {
    const obj = err;
    return {
      name: typeof obj.name === "string" ? obj.name : void 0,
      message: typeof obj.message === "string" ? obj.message : JSON.stringify(obj)
    };
  }
  return { message: String(err) };
}
__name(serializeError, "serializeError");
function normalizeErrorLike(errorLike) {
  const normalized = {};
  for (const [key, value] of Object.entries(errorLike)) {
    if (value instanceof Error) {
      normalized[key] = serializeError(value);
    } else if (typeof value === "bigint") {
      normalized[key] = value.toString();
    } else {
      normalized[key] = value;
    }
  }
  return normalized;
}
__name(normalizeErrorLike, "normalizeErrorLike");
function pruneUndefined(fields) {
  const pruned = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === void 0) continue;
    if (typeof value === "bigint") {
      pruned[key] = value.toString();
    } else if (value instanceof Error) {
      pruned[key] = serializeError(value);
    } else {
      pruned[key] = value;
    }
  }
  return pruned;
}
__name(pruneUndefined, "pruneUndefined");
function safePath(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
__name(safePath, "safePath");
function safeHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return void 0;
  }
}
__name(safeHost, "safeHost");
function headerOrNull(req, key) {
  const value = req.headers.get(key);
  return value ?? void 0;
}
__name(headerOrNull, "headerOrNull");
function deriveRequestId(req) {
  const explicit = req.headers.get("x-request-id") ?? req.headers.get("cf-ray");
  if (explicit) return explicit;
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
__name(deriveRequestId, "deriveRequestId");
function writeLog(entry) {
  try {
    console.log(JSON.stringify(entry, replacer));
  } catch (err) {
    console.log(
      JSON.stringify({
        ts: (/* @__PURE__ */ new Date()).toISOString(),
        level: "error",
        msg: "log_serialization_failed",
        original_message: entry.msg,
        error: serializeError(err)
      })
    );
  }
}
__name(writeLog, "writeLog");
function replacer(_key, value) {
  if (value instanceof Error) return serializeError(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function") return void 0;
  if (value instanceof Request) {
    return { method: value.method, url: value.url };
  }
  if (value instanceof Response) {
    return { status: value.status };
  }
  return value;
}
__name(replacer, "replacer");
function shouldLog(level) {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[loggingConfig.level]) {
    return false;
  }
  if (level === "debug" && loggingConfig.debugSampleRate < 1) {
    return Math.random() < loggingConfig.debugSampleRate;
  }
  return true;
}
__name(shouldLog, "shouldLog");
function applyRedaction(entry) {
  const { redaction } = loggingConfig;
  if (!redaction.clientIp && !redaction.userAgent && !redaction.cfRay) {
    return entry;
  }
  const clone2 = { ...entry };
  if (redaction.clientIp && "client_ip" in clone2) {
    clone2.client_ip = "[redacted]";
  }
  if (redaction.userAgent && "user_agent" in clone2) {
    clone2.user_agent = "[redacted]";
  }
  if (redaction.cfRay && "cf_ray" in clone2) {
    clone2.cf_ray = "[redacted]";
  }
  return clone2;
}
__name(applyRedaction, "applyRedaction");
function configureLogging(options) {
  if (options.level) loggingConfig.level = options.level;
  if (typeof options.debugSampleRate === "number" && options.debugSampleRate > 0) {
    loggingConfig.debugSampleRate = Math.min(options.debugSampleRate, 1);
  }
  if (options.redaction) {
    loggingConfig.redaction = {
      ...loggingConfig.redaction,
      ...options.redaction
    };
  }
}
__name(configureLogging, "configureLogging");
function parseLogLevel(candidate) {
  if (!candidate) return null;
  const normalized = candidate.trim().toLowerCase();
  if (normalized === "debug" || normalized === "info" || normalized === "warn" || normalized === "error") {
    return normalized;
  }
  return null;
}
__name(parseLogLevel, "parseLogLevel");
function parseSampleRate(raw) {
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return null;
  if (parsed <= 0) return null;
  return parsed > 1 ? 1 : parsed;
}
__name(parseSampleRate, "parseSampleRate");
function configureLoggingFromEnv(env) {
  if (configuredFromEnv) return;
  configuredFromEnv = true;
  const level = parseLogLevel(env.LOG_LEVEL);
  const sampleRate = parseSampleRate(env.LOG_DEBUG_SAMPLE_RATE);
  configureLogging({
    level: level ?? loggingConfig.level,
    debugSampleRate: sampleRate ?? loggingConfig.debugSampleRate,
    redaction: {
      clientIp: flagEnabled(env.LOG_REDACT_CLIENT_IP),
      userAgent: flagEnabled(env.LOG_REDACT_USER_AGENT),
      cfRay: flagEnabled(env.LOG_REDACT_CF_RAY)
    }
  });
}
__name(configureLoggingFromEnv, "configureLoggingFromEnv");
function flagEnabled(value) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}
__name(flagEnabled, "flagEnabled");

// src/lib/access.ts
var jwksCache2 = /* @__PURE__ */ new Map();
var devUserCache = /* @__PURE__ */ new WeakMap();
var requestUserCache = /* @__PURE__ */ new WeakMap();
var DISABLED_TOKENS = /* @__PURE__ */ new Set(["0", "false", "off", "no"]);
var ENABLED_TOKENS = /* @__PURE__ */ new Set(["1", "true", "on", "yes"]);
var ALLOWED_ROLES = ["admin", "client", "contractor"];
var DEV_SHIM_ENVIRONMENTS2 = /* @__PURE__ */ new Set(["development", "dev", "local"]);
function cacheRequestUser(req, user) {
  requestUserCache.set(req, user);
}
__name(cacheRequestUser, "cacheRequestUser");
function getCachedRequestUser(req) {
  return requestUserCache.get(req);
}
__name(getCachedRequestUser, "getCachedRequestUser");
function getJwks(env) {
  const url = env.ACCESS_JWKS_URL;
  if (!jwksCache2.has(url)) {
    jwksCache2.set(url, createRemoteJWKSet(new URL(url)));
  }
  return jwksCache2.get(url);
}
__name(getJwks, "getJwks");
function resolveDevUser(env) {
  const rawValue = typeof env.DEV_ALLOW_USER === "string" ? env.DEV_ALLOW_USER : null;
  const rawFlag = typeof env.ALLOW_DEV_ACCESS_SHIM === "string" ? env.ALLOW_DEV_ACCESS_SHIM : null;
  const cached = devUserCache.get(env);
  if (cached && cached.rawUser === rawValue && cached.rawFlag === rawFlag) {
    return cached.user;
  }
  const normalizedFlag = rawFlag?.trim().toLowerCase() ?? "";
  if (!normalizedFlag || DISABLED_TOKENS.has(normalizedFlag) || !ENABLED_TOKENS.has(normalizedFlag)) {
    devUserCache.set(env, { rawUser: rawValue, rawFlag, user: null });
    return null;
  }
  if (!rawValue) {
    devUserCache.set(env, { rawUser: null, rawFlag, user: null });
    return null;
  }
  const trimmed = rawValue.trim();
  if (!trimmed || DISABLED_TOKENS.has(trimmed.toLowerCase())) {
    devUserCache.set(env, { rawUser: rawValue, rawFlag, user: null });
    return null;
  }
  let parsed = trimmed;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
  }
  let email = "dev@example.com";
  let roles = ["admin"];
  let clientIds = [];
  if (typeof parsed === "string") {
    const candidate = parsed.trim();
    if (candidate) {
      email = candidate;
    }
  } else if (parsed && typeof parsed === "object") {
    const candidateEmail = parsed.email;
    if (typeof candidateEmail === "string" && candidateEmail.trim()) {
      email = candidateEmail.trim();
    }
    const candidateRoles = parsed.roles;
    if (Array.isArray(candidateRoles)) {
      const normalized = candidateRoles.map((role) => typeof role === "string" ? role.trim().toLowerCase() : "").filter((role) => role.length > 0);
      const filtered = normalized.map((role) => ALLOWED_ROLES.find((allowed) => allowed === role)).filter((role) => Boolean(role));
      if (filtered.length > 0) {
        roles = Array.from(new Set(filtered));
      }
    }
    const candidateClientIds = parsed.clientIds;
    if (Array.isArray(candidateClientIds)) {
      const normalized = candidateClientIds.map((id) => typeof id === "string" ? id.trim() : "").filter((id) => id.length > 0);
      if (normalized.length > 0) {
        clientIds = Array.from(new Set(normalized));
      }
    }
  } else {
    const candidate = String(parsed).trim();
    if (candidate) {
      email = candidate;
    }
  }
  const user = { email, roles, clientIds };
  devUserCache.set(env, { rawUser: rawValue, rawFlag, user });
  return user;
}
__name(resolveDevUser, "resolveDevUser");
async function requireAccessUser(req, env) {
  const cached = getCachedRequestUser(req);
  if (cached !== void 0) {
    return cached;
  }
  const jwt = req.headers.get("Cf-Access-Jwt-Assertion");
  if (jwt) {
    try {
      const { payload } = await jwtVerify(jwt, getJwks(env), { audience: env.ACCESS_AUD });
      const user = deriveUserFromClaims(payload);
      cacheRequestUser(req, user);
      return user;
    } catch (error) {
      const log = loggerForRequest(req, { scope: "access" });
      const decoded = safeDecodeJwt(jwt);
      const reason = error instanceof Error ? error.message : String(error);
      const headerEmail = req.headers.get("Cf-Access-Authenticated-User-Email");
      const payloadEmail = typeof decoded?.email === "string" ? decoded.email : typeof decoded?.sub === "string" ? decoded.sub : void 0;
      const sanitizedEmail = sanitizeEmailForLog(headerEmail ?? payloadEmail);
      const cfRay = req.headers.get("cf-ray");
      const logFields = {
        reason,
        audience: env.ACCESS_AUD,
        cf_ray: cfRay ?? void 0,
        metric: "greenbro.security.jwt_verify_failed",
        metric_key: "security.jwt_verify_failed",
        count: 1
      };
      const tokenAudience = normalizeAudience(decoded?.aud);
      if (tokenAudience) {
        logFields.token_audience = tokenAudience;
      }
      if (sanitizedEmail) {
        logFields.sanitized_email = sanitizedEmail;
      }
      log.warn("access.jwt_verify_failed", logFields);
    }
  }
  const environment = typeof env.ENVIRONMENT === "string" ? env.ENVIRONMENT.trim().toLowerCase() : "";
  const environmentAllowsShim = environment.length > 0 && DEV_SHIM_ENVIRONMENTS2.has(environment);
  const hasShimFlag = typeof env.ALLOW_DEV_ACCESS_SHIM === "string" && env.ALLOW_DEV_ACCESS_SHIM.trim().length > 0 && ENABLED_TOKENS.has(env.ALLOW_DEV_ACCESS_SHIM.trim().toLowerCase());
  if (hasShimFlag && !environmentAllowsShim) {
    loggerForRequest(req, { scope: "access" }).warn("access.dev_shim_blocked", {
      environment: environment || null
    });
    cacheRequestUser(req, null);
    return null;
  }
  if (!environmentAllowsShim) {
    cacheRequestUser(req, null);
    return null;
  }
  const devUser = resolveDevUser(env);
  if (devUser) {
    loggerForRequest(req, { scope: "access" }).info("access.dev_shim_used", {
      email: devUser.email,
      environment
    });
    cacheRequestUser(req, devUser);
    return devUser;
  }
  cacheRequestUser(req, null);
  return null;
}
__name(requireAccessUser, "requireAccessUser");
function userIsAdmin(user) {
  return user.roles?.includes("admin") ?? false;
}
__name(userIsAdmin, "userIsAdmin");
function safeDecodeJwt(token) {
  try {
    return decodeJwt(token);
  } catch {
    return null;
  }
}
__name(safeDecodeJwt, "safeDecodeJwt");
function normalizeAudience(aud) {
  if (!aud) return void 0;
  if (typeof aud === "string") return aud;
  if (Array.isArray(aud)) return aud.join(",");
  return void 0;
}
__name(normalizeAudience, "normalizeAudience");
function sanitizeEmailForLog(candidate) {
  if (typeof candidate !== "string") return void 0;
  const trimmed = candidate.trim().toLowerCase();
  if (!trimmed) return void 0;
  const parts = trimmed.split("@");
  if (parts.length !== 2) return void 0;
  const [localPartRaw, domainRaw] = parts;
  const domain = domainRaw.trim();
  if (!domain) return void 0;
  const localPart = localPartRaw.trim();
  if (!localPart) return `*@${domain}`;
  if (localPart.length === 1) return `*@${domain}`;
  if (localPart.length === 2) return `${localPart[0]}*@${domain}`;
  return `${localPart[0]}***${localPart.slice(-1)}@${domain}`;
}
__name(sanitizeEmailForLog, "sanitizeEmailForLog");

// src/lib/cors.ts
var ALLOW_METHODS = "GET,POST,OPTIONS";
var ALLOW_HEADERS = "content-type,cf-access-jwt-assertion,x-greenbro-device-key,x-greenbro-signature,x-greenbro-timestamp";
var CORS_BASE = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": ALLOW_METHODS,
  "access-control-allow-headers": ALLOW_HEADERS
};
function appendVary(headers, value) {
  const existing = headers.get("vary");
  if (!existing) {
    headers.set("vary", value);
    return;
  }
  const parts = existing.split(",").map((token) => token.trim()).filter(Boolean);
  if (!parts.some((token) => token.toLowerCase() === value.toLowerCase())) {
    parts.push(value);
    headers.set("vary", parts.join(", "));
  }
}
__name(appendVary, "appendVary");
function parseAllowedOrigins(env) {
  const raw = env.INGEST_ALLOWED_ORIGINS;
  if (typeof raw !== "string") {
    return { origins: [], configured: false };
  }
  const origins = raw.split(/[, \n\r]+/).map((entry) => entry.trim()).filter(Boolean);
  return { origins, configured: origins.length > 0 };
}
__name(parseAllowedOrigins, "parseAllowedOrigins");
function matchesOrigin(origin, rule) {
  if (rule === "*") return true;
  const normOrigin = origin.toLowerCase();
  const normRule = rule.toLowerCase();
  if (normRule.startsWith("*.")) {
    const suffix = normRule.slice(1);
    return normOrigin.endsWith(suffix);
  }
  return normOrigin === normRule;
}
__name(matchesOrigin, "matchesOrigin");
function evaluateCors(req, env) {
  const origin = req.headers.get("Origin");
  const { origins: allowedOrigins, configured } = parseAllowedOrigins(env);
  if (!configured) {
    return { allowed: false, origin: origin ?? null, allowOrigin: null };
  }
  if (!origin) {
    const allowAny = allowedOrigins.includes("*");
    return {
      allowed: true,
      origin: null,
      allowOrigin: allowAny ? "*" : null
    };
  }
  for (const candidate of allowedOrigins) {
    if (matchesOrigin(origin, candidate)) {
      const allowOrigin = candidate === "*" ? "*" : origin;
      return { allowed: true, origin, allowOrigin };
    }
  }
  return { allowed: false, origin, allowOrigin: null };
}
__name(evaluateCors, "evaluateCors");
function withCors(req, env, res, evaluation) {
  const result = evaluation ?? evaluateCors(req, env);
  const headers = new Headers(res.headers);
  if (result.allowOrigin) {
    headers.set("access-control-allow-origin", result.allowOrigin);
  } else {
    headers.delete("access-control-allow-origin");
  }
  headers.set("access-control-allow-methods", ALLOW_METHODS);
  headers.set("access-control-allow-headers", ALLOW_HEADERS);
  appendVary(headers, "Origin");
  return new Response(res.body, {
    headers,
    status: res.status,
    statusText: res.statusText
  });
}
__name(withCors, "withCors");
function maybeHandlePreflight(req, pathname, env) {
  if (req.method !== "OPTIONS") return null;
  if (pathname.startsWith("/api/ingest/") || pathname.startsWith("/api/heartbeat/") || /^\/api\/devices\/[^/]+\/latest$/.test(pathname)) {
    const evaluation = evaluateCors(req, env);
    if (!evaluation.allowed) {
      return withCors(
        req,
        env,
        json({ error: "Origin not allowed" }, { status: 403 }),
        evaluation
      );
    }
    const headers = new Headers({
      "access-control-allow-methods": ALLOW_METHODS,
      "access-control-allow-headers": ALLOW_HEADERS,
      "access-control-max-age": "600"
    });
    appendVary(headers, "Origin");
    if (evaluation.allowOrigin) {
      headers.set("access-control-allow-origin", evaluation.allowOrigin);
    }
    return withSecurityHeaders(new Response("", { status: 204, headers }));
  }
  return null;
}
__name(maybeHandlePreflight, "maybeHandlePreflight");

// node_modules/itty-router/index.mjs
var t = /* @__PURE__ */ __name(({ base: e = "", routes: t2 = [], ...r2 } = {}) => ({ __proto__: new Proxy({}, { get: /* @__PURE__ */ __name((r3, o2, a, s) => (r4, ...c) => t2.push([o2.toUpperCase?.(), RegExp(`^${(s = (e + r4).replace(/\/+(\/|$)/g, "$1")).replace(/(\/?\.?):(\w+)\+/g, "($1(?<$2>*))").replace(/(\/?\.?):(\w+)/g, "($1(?<$2>[^$1/]+?))").replace(/\./g, "\\.").replace(/(\/?)\*/g, "($1.*)?")}/*$`), c, s]) && a, "get") }), routes: t2, ...r2, async fetch(e2, ...o2) {
  let a, s, c = new URL(e2.url), n = e2.query = { __proto__: null };
  for (let [e3, t3] of c.searchParams) n[e3] = n[e3] ? [].concat(n[e3], t3) : t3;
  e: try {
    for (let t3 of r2.before || []) if (null != (a = await t3(e2.proxy ?? e2, ...o2))) break e;
    t: for (let [r3, n2, l, i] of t2) if ((r3 == e2.method || "ALL" == r3) && (s = c.pathname.match(n2))) {
      e2.params = s.groups || {}, e2.route = i;
      for (let t3 of l) if (null != (a = await t3(e2.proxy ?? e2, ...o2))) break t;
    }
  } catch (t3) {
    if (!r2.catch) throw t3;
    a = await r2.catch(t3, e2.proxy ?? e2, ...o2);
  }
  try {
    for (let t3 of r2.finally || []) a = await t3(a, e2.proxy ?? e2, ...o2) ?? a;
  } catch (t3) {
    if (!r2.catch) throw t3;
    a = await r2.catch(t3, e2.proxy ?? e2, ...o2);
  }
  return a;
} }), "t");
var r = /* @__PURE__ */ __name((e = "text/plain; charset=utf-8", t2) => (r2, o2 = {}) => {
  if (void 0 === r2 || r2 instanceof Response) return r2;
  const a = new Response(t2?.(r2) ?? r2, o2.url ? void 0 : o2);
  return a.headers.set("content-type", e), a;
}, "r");
var o = r("application/json; charset=utf-8", JSON.stringify);
var p = r("text/plain; charset=utf-8", String);
var f = r("text/html");
var u = r("image/jpeg");
var h = r("image/png");
var g = r("image/webp");

// src/utils/index.ts
async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
function hexToBytes(hex2) {
  const normalized = hex2.replace(/\s+/g, "").toLowerCase();
  if (normalized.length % 2 !== 0) {
    throw new Error("Hex string must have an even length");
  }
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    const byte = Number.parseInt(normalized.slice(i, i + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error("Invalid hex string");
    }
    bytes[i / 2] = byte;
  }
  return bytes;
}
__name(hexToBytes, "hexToBytes");
function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(bytesToHex, "bytesToHex");
async function hmacSha256Hex(keyHex, payload) {
  const keyBytes = hexToBytes(keyHex);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const data = new TextEncoder().encode(payload);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
  return bytesToHex(new Uint8Array(signature));
}
__name(hmacSha256Hex, "hmacSha256Hex");
function timingSafeEqual(a, b) {
  const len = Math.max(a.length, b.length);
  let mismatch = a.length === b.length ? 0 : 1;
  for (let i = 0; i < len; i++) {
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    mismatch |= ca ^ cb;
  }
  return mismatch === 0;
}
__name(timingSafeEqual, "timingSafeEqual");
function round(n, dp) {
  if (typeof n !== "number" || Number.isNaN(n)) return null;
  const f2 = Math.pow(10, dp);
  return Math.round(n * f2) / f2;
}
__name(round, "round");
function nowISO() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
__name(nowISO, "nowISO");
function maskId(id) {
  if (!id) return "";
  if (id.length <= 4) return "***";
  return id.slice(0, 3) + "***" + id.slice(-2);
}
__name(maskId, "maskId");
function parseAndCheckTs(ts) {
  const ms = Date.parse(ts);
  if (Number.isNaN(ms)) return { ok: false, reason: "Invalid timestamp" };
  const now = Date.now();
  const ahead = 5 * 60 * 1e3;
  const behind = 365 * 24 * 60 * 60 * 1e3;
  if (ms > now + ahead) return { ok: false, reason: "Timestamp too far in future" };
  if (ms < now - behind) return { ok: false, reason: "Timestamp too old" };
  return { ok: true, ms };
}
__name(parseAndCheckTs, "parseAndCheckTs");
function safeDecode(part) {
  if (!part) return null;
  try {
    return decodeURIComponent(part);
  } catch {
    return null;
  }
}
__name(safeDecode, "safeDecode");
function base64UrlEncode(data) {
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(base64UrlEncode, "base64UrlEncode");
function base64UrlDecode(input) {
  try {
    let normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    while (normalized.length % 4) normalized += "=";
    const binary = atob(normalized);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}
__name(base64UrlDecode, "base64UrlDecode");
function andWhere(where, clause) {
  return where ? `${where} AND ${clause}` : `WHERE ${clause}`;
}
__name(andWhere, "andWhere");
function parseFaultsJson(jsonStr) {
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed.filter((f2) => typeof f2 === "string") : [];
  } catch {
    return [];
  }
}
__name(parseFaultsJson, "parseFaultsJson");
function parseMetricsJson(jsonStr) {
  if (!jsonStr) return {};
  try {
    const parsed = JSON.parse(jsonStr);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
__name(parseMetricsJson, "parseMetricsJson");

// src/lib/cursor.ts
var cursorKeyCache = /* @__PURE__ */ new Map();
function ensureCursorSecret(env) {
  const secret = env.CURSOR_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("CURSOR_SECRET must be configured (>= 16 characters)");
  }
  return secret;
}
__name(ensureCursorSecret, "ensureCursorSecret");
async function importCursorKey(secret) {
  if (!cursorKeyCache.has(secret)) {
    const encoder4 = new TextEncoder();
    const secretHash = await crypto.subtle.digest("SHA-256", encoder4.encode(secret));
    const keyPromise = crypto.subtle.importKey(
      "raw",
      secretHash,
      "AES-GCM",
      false,
      ["encrypt", "decrypt"]
    );
    cursorKeyCache.set(secret, keyPromise);
  }
  return cursorKeyCache.get(secret);
}
__name(importCursorKey, "importCursorKey");
async function sealCursorId(env, deviceId) {
  const secret = ensureCursorSecret(env);
  const key = await importCursorKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder4 = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder4.encode(deviceId)
  );
  return `enc.${base64UrlEncode(iv)}.${base64UrlEncode(new Uint8Array(ciphertext))}`;
}
__name(sealCursorId, "sealCursorId");
async function unsealCursorId(env, token) {
  const secret = ensureCursorSecret(env);
  const key = await importCursorKey(secret);
  const [, ivPart, dataPart] = token.split(".", 3);
  if (!ivPart || !dataPart) return null;
  const ivArray = base64UrlDecode(ivPart);
  const payloadArray = base64UrlDecode(dataPart);
  if (!ivArray || !payloadArray) return null;
  const ivBuffer = new ArrayBuffer(ivArray.length);
  new Uint8Array(ivBuffer).set(ivArray);
  const payloadBuffer = new ArrayBuffer(payloadArray.length);
  new Uint8Array(payloadBuffer).set(payloadArray);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuffer }, key, payloadBuffer);
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}
__name(unsealCursorId, "unsealCursorId");
async function parseCursorId(encoded, env, isAdmin) {
  if (!encoded) return { ok: true, id: null };
  if (!encoded.startsWith("enc.")) {
    return isAdmin ? { ok: true, id: encoded } : { ok: false };
  }
  try {
    const unsealed = await unsealCursorId(env, encoded);
    if (!unsealed) return { ok: false };
    return { ok: true, id: unsealed };
  } catch {
    return { ok: false };
  }
}
__name(parseCursorId, "parseCursorId");

// src/lib/device.ts
function buildDeviceScope(user, alias = "d") {
  const isAdmin = userIsAdmin(user);
  if (isAdmin) {
    return { isAdmin: true, empty: false, clause: "", bind: [] };
  }
  const ids = user.clientIds || [];
  if (!ids.length) {
    return { isAdmin: false, empty: true, clause: "", bind: [] };
  }
  const placeholders = ids.map(() => "?").join(",");
  return {
    isAdmin: false,
    empty: false,
    clause: `${alias}.profile_id IN (${placeholders})`,
    bind: [...ids]
  };
}
__name(buildDeviceScope, "buildDeviceScope");
function presentDeviceId(id, isAdmin) {
  return isAdmin ? id : maskId(id);
}
__name(presentDeviceId, "presentDeviceId");
async function resolveDeviceId(raw, env, isAdmin) {
  if (isAdmin) return raw;
  if (!raw) return null;
  const parsed = await parseCursorId(raw, env, isAdmin);
  if (!parsed.ok || !parsed.id) return null;
  return parsed.id;
}
__name(resolveDeviceId, "resolveDeviceId");
async function buildDeviceLookup(id, env, isAdmin) {
  return isAdmin ? id : sealCursorId(env, id);
}
__name(buildDeviceLookup, "buildDeviceLookup");
async function claimDeviceIfUnowned(env, deviceId, profileId) {
  await env.DB.prepare(
    `UPDATE devices SET profile_id = ?2 WHERE device_id = ?1 AND profile_id IS NULL`
  ).bind(deviceId, profileId).run();
  const row = await env.DB.prepare(`SELECT profile_id FROM devices WHERE device_id = ?1`).bind(deviceId).first();
  if (!row) return { ok: false, reason: "unknown_device" };
  if (row.profile_id && row.profile_id !== profileId) {
    return { ok: false, reason: "claimed_by_other", owner: row.profile_id };
  }
  return { ok: true };
}
__name(claimDeviceIfUnowned, "claimDeviceIfUnowned");
async function verifyDeviceKey(env, deviceId, keyHeader) {
  if (!keyHeader) return { ok: false, reason: "missing_key" };
  const row = await env.DB.prepare(`SELECT device_key_hash FROM devices WHERE device_id = ?1`).bind(deviceId).first();
  if (!row) return { ok: false, reason: "unknown_device" };
  if (!row.device_key_hash) return { ok: false, reason: "missing_device_key" };
  const hash = await sha256Hex(keyHeader);
  if (hash.toLowerCase() !== String(row.device_key_hash).toLowerCase()) {
    return { ok: false, reason: "mismatch" };
  }
  return { ok: true, deviceKeyHash: hash };
}
__name(verifyDeviceKey, "verifyDeviceKey");
async function fetchDeviceMeta(env, deviceIds) {
  if (!deviceIds.length) return /* @__PURE__ */ new Map();
  const unique = [...new Set(deviceIds)];
  const placeholders = unique.map((_, idx) => `?${idx + 1}`).join(",");
  const rows = await env.DB.prepare(
    `SELECT device_id, profile_id, site
         FROM devices
        WHERE device_id IN (${placeholders})`
  ).bind(...unique).all();
  const map = /* @__PURE__ */ new Map();
  for (const row of rows.results ?? []) {
    map.set(row.device_id, row);
  }
  return map;
}
__name(fetchDeviceMeta, "fetchDeviceMeta");

// src/schemas/params.ts
function coerceNumber(input) {
  if (input === void 0 || input === null) return void 0;
  if (typeof input === "number") return input;
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed === "") return void 0;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
}
__name(coerceNumber, "coerceNumber");
function numericParam(options) {
  let schema = external_exports.number();
  if (options.integer) schema = schema.int();
  if (options.min !== void 0) schema = schema.min(options.min);
  if (options.max !== void 0) schema = schema.max(options.max);
  const withPreprocess = external_exports.preprocess(coerceNumber, schema);
  return options.defaultValue !== void 0 ? withPreprocess.default(options.defaultValue) : withPreprocess.optional();
}
__name(numericParam, "numericParam");
var optionalBooleanFlag = external_exports.preprocess((input) => {
  if (input === void 0 || input === null) return void 0;
  if (typeof input === "boolean") return input;
  if (typeof input === "number") return input !== 0;
  if (typeof input === "string") {
    const trimmed = input.trim().toLowerCase();
    if (trimmed === "") return void 0;
    if (trimmed === "1" || trimmed === "true" || trimmed === "yes") return true;
    if (trimmed === "0" || trimmed === "false" || trimmed === "no") return false;
  }
  return input;
}, external_exports.boolean()).optional();
var optionalTrimmedString = external_exports.preprocess((input) => {
  if (input === void 0 || input === null) return void 0;
  if (typeof input !== "string") return input;
  const trimmed = input.trim();
  return trimmed === "" ? void 0 : trimmed;
}, external_exports.string().min(1, "Must not be empty")).optional();

// src/schemas/admin.ts
var AdminOverviewQuerySchema = external_exports.object({
  limit: numericParam({ integer: true, min: 1, max: 100, defaultValue: 40 })
}).strict();

// src/utils/validation.ts
function fromZodError(error) {
  return error.issues.map((issue) => ({
    path: issue.path.length ? issue.path.join(".") : "root",
    message: issue.message
  }));
}
__name(fromZodError, "fromZodError");
function validateWithSchema(schema, payload) {
  if (!schema) {
    return {
      success: false,
      issues: [{ path: "root", message: "Validation unavailable" }]
    };
  }
  const parsed = schema.safeParse(payload);
  if (parsed.success) {
    return { success: true, data: parsed.data };
  }
  return { success: false, issues: fromZodError(parsed.error) };
}
__name(validateWithSchema, "validateWithSchema");
function validationErrorResponse(issues, init) {
  const details = issues instanceof external_exports.ZodError ? fromZodError(issues) : issues;
  return json(
    {
      error: "Validation failed",
      details
    },
    {
      status: 400,
      ...init
    }
  );
}
__name(validationErrorResponse, "validationErrorResponse");

// src/lib/ops-metrics.ts
var DAY_MS = 864e5;
var OPS_METRICS_WINDOW_DAYS = 30;
var OPS_METRICS_WINDOW_MS = OPS_METRICS_WINDOW_DAYS * DAY_MS;
var OPS_METRICS_PRUNE_INTERVAL_MS = 15 * 60 * 1e3;
var lastPruneAttemptMs = 0;
function opsMetricsWindowStart(now = Date.now()) {
  const startMs = now - OPS_METRICS_WINDOW_MS;
  return new Date(startMs).toISOString();
}
__name(opsMetricsWindowStart, "opsMetricsWindowStart");
async function pruneOpsMetrics(env, now = Date.now()) {
  if (now - lastPruneAttemptMs < OPS_METRICS_PRUNE_INTERVAL_MS) {
    return;
  }
  lastPruneAttemptMs = now;
  const cutoff = opsMetricsWindowStart(now);
  try {
    await env.DB.prepare("DELETE FROM ops_metrics WHERE ts < ?1").bind(cutoff).run();
  } catch (error) {
    systemLogger({ scope: "ops_metrics" }).warn("ops_metrics.prune_failed", { cutoff, error });
  }
}
__name(pruneOpsMetrics, "pruneOpsMetrics");
async function recordOpsMetric(env, route, statusCode, durationMs, deviceId, logger) {
  try {
    await env.DB.prepare(
      `INSERT INTO ops_metrics (ts, route, status_code, duration_ms, device_id) VALUES (?1, ?2, ?3, ?4, ?5)`
    ).bind(nowISO(), route, statusCode, durationMs, deviceId).run();
  } catch (error) {
    const bucketMs = Math.floor(Date.now() / 6e4) * 6e4;
    const scopedLogger = logger ?? systemLogger({ route });
    scopedLogger.error("ops_metrics.insert_failed", {
      route,
      status_code: statusCode,
      device_id: deviceId ?? void 0,
      duration_ms: durationMs,
      metric: "greenbro.ops_metrics.insert_failed",
      metric_key: "ops_metrics.insert_failed",
      count: 1,
      bucket_minute: new Date(bucketMs).toISOString(),
      error
    });
  }
}
__name(recordOpsMetric, "recordOpsMetric");

// src/routes/admin.ts
async function buildOverviewResponse(req, env, user, routeTag) {
  const log = loggerForRequest(req, { route: routeTag });
  const scope = buildDeviceScope(user);
  const url = new URL(req.url);
  const paramsResult = AdminOverviewQuerySchema.safeParse({
    limit: url.searchParams.get("limit")
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.error);
  }
  const { limit } = paramsResult.data;
  const now = Date.now();
  const windowStart = opsMetricsWindowStart(now);
  await pruneOpsMetrics(env, now);
  let tenants;
  if (scope.isAdmin) {
    tenants = await env.DB.prepare(
      `SELECT COALESCE(d.profile_id, 'unassigned') AS profile_id,
                COUNT(*) AS device_count,
                SUM(d.online) AS online_count
           FROM devices d
          GROUP BY COALESCE(d.profile_id, 'unassigned')
          ORDER BY device_count DESC`
    ).all();
  } else if (scope.empty) {
    tenants = { results: [] };
  } else {
    const where = andWhere("", scope.clause);
    tenants = await env.DB.prepare(
      `SELECT d.profile_id AS profile_id,
                COUNT(*) AS device_count,
                SUM(d.online) AS online_count
           FROM devices d
           ${where}
          GROUP BY d.profile_id`
    ).bind(...scope.bind).all();
  }
  let opsRows;
  if (scope.isAdmin) {
    opsRows = await env.DB.prepare(
      `SELECT ts, route, status_code, duration_ms, device_id
           FROM ops_metrics
          WHERE ts >= ?
          ORDER BY ts DESC
          LIMIT ?`
    ).bind(windowStart, limit).all();
  } else if (scope.empty) {
    opsRows = { results: [] };
  } else {
    const tenantClause = scope.clause.replace(/\bd\./g, "devices.");
    const where = andWhere("WHERE o.ts >= ?", tenantClause);
    opsRows = await env.DB.prepare(
      `SELECT o.ts, o.route, o.status_code, o.duration_ms, o.device_id
           FROM ops_metrics o
           JOIN devices ON devices.device_id = o.device_id
           ${where}
          ORDER BY o.ts DESC
          LIMIT ?`
    ).bind(windowStart, ...scope.bind, limit).all();
  }
  const ops = [];
  for (const row of opsRows.results ?? []) {
    const deviceId = row.device_id;
    let lookupToken = null;
    let outwardId = null;
    if (deviceId) {
      outwardId = presentDeviceId(deviceId, scope.isAdmin);
      try {
        lookupToken = await buildDeviceLookup(deviceId, env, scope.isAdmin);
      } catch (err) {
        log.error("admin.lookup_failed", { device_id: deviceId, error: err });
        continue;
      }
    }
    ops.push({
      ts: row.ts,
      route: row.route,
      status_code: row.status_code,
      duration_ms: row.duration_ms,
      device_id: outwardId,
      lookup: lookupToken
    });
  }
  const statusCounts = ops.reduce((acc, item) => {
    const bucket = item.status_code >= 500 ? "5xx" : item.status_code >= 400 ? "4xx" : "ok";
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});
  return json({
    generated_at: nowISO(),
    scope: scope.isAdmin ? "admin" : scope.empty ? "empty" : "tenant",
    tenants: tenants.results?.map((row) => ({
      profile_id: row.profile_id ?? "unassigned",
      device_count: row.device_count ?? 0,
      online_count: row.online_count ?? 0
    })) ?? [],
    ops,
    ops_summary: statusCounts,
    ops_window: {
      start: windowStart,
      days: OPS_METRICS_WINDOW_DAYS
    }
  });
}
__name(buildOverviewResponse, "buildOverviewResponse");
async function handleAdminOverview(req, env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  if (!userIsAdmin(user)) return json({ error: "Forbidden" }, { status: 403 });
  return buildOverviewResponse(req, env, user, "/api/admin/overview");
}
__name(handleAdminOverview, "handleAdminOverview");
async function handleFleetAdminOverview(req, env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  return buildOverviewResponse(req, env, user, "/api/fleet/admin-overview");
}
__name(handleFleetAdminOverview, "handleFleetAdminOverview");

// src/schemas/audit.ts
var AuditTrailQuerySchema = external_exports.object({
  entity_type: external_exports.string().trim().min(1).optional(),
  entity_id: external_exports.string().trim().min(1).optional(),
  actor_id: external_exports.string().trim().min(1).optional(),
  action: external_exports.string().trim().min(1).optional(),
  limit: numericParam({ integer: true, min: 1, max: 200, defaultValue: 100 }),
  since: external_exports.string().datetime({ offset: true }).optional(),
  until: external_exports.string().datetime({ offset: true }).optional()
}).strict();
var CreateAuditEntrySchema = external_exports.object({
  audit_id: external_exports.string().trim().min(1).optional(),
  actor_id: external_exports.string().trim().min(1).optional(),
  actor_email: external_exports.string().trim().email().optional(),
  actor_name: external_exports.string().trim().min(1).optional(),
  action: external_exports.string().trim().min(1),
  entity_type: external_exports.string().trim().min(1).optional(),
  entity_id: external_exports.string().trim().min(1).optional(),
  metadata: external_exports.record(external_exports.any()).optional(),
  ip_address: external_exports.string().trim().min(1).optional(),
  created_at: external_exports.string().datetime({ offset: true }).optional()
}).strict();

// src/lib/audit-store.ts
function mapAuditRow(row) {
  let metadata = null;
  if (row.metadata_json) {
    try {
      const parsed = JSON.parse(row.metadata_json);
      if (parsed && typeof parsed === "object") {
        metadata = parsed;
      }
    } catch {
      metadata = null;
    }
  }
  return {
    audit_id: row.audit_id,
    actor_id: row.actor_id,
    actor_email: row.actor_email,
    actor_name: row.actor_name,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    metadata,
    ip_address: row.ip_address,
    created_at: row.created_at
  };
}
__name(mapAuditRow, "mapAuditRow");
async function createAuditEntry(env, params) {
  const id = params.audit_id ?? crypto.randomUUID();
  const createdAt = params.created_at ?? nowISO();
  const metadataJson = params.metadata ? JSON.stringify(params.metadata) : null;
  const actorEmail = params.actor_email ?? null;
  const actorName = params.actor_name ?? null;
  const entityType = params.entity_type ?? null;
  const entityId = params.entity_id ?? null;
  const ipAddress = params.ip_address ?? null;
  try {
    await env.DB.prepare(
      `INSERT INTO audit_trail (
            audit_id, actor_id, actor_email, actor_name, action,
            entity_type, entity_id, metadata_json, ip_address, created_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
    ).bind(
      id,
      params.actor_id,
      actorEmail,
      actorName,
      params.action,
      entityType,
      entityId,
      metadataJson,
      ipAddress,
      createdAt
    ).run();
  } catch (err) {
    const message2 = typeof err?.message === "string" ? err.message : String(err);
    if (message2.includes("UNIQUE constraint failed")) {
      return { ok: false, reason: "conflict" };
    }
    throw err;
  }
  const row = await env.DB.prepare(`SELECT * FROM audit_trail WHERE audit_id = ?1 LIMIT 1`).bind(id).first();
  if (!row) {
    return { ok: false, reason: "conflict" };
  }
  return { ok: true, audit: mapAuditRow(row) };
}
__name(createAuditEntry, "createAuditEntry");
async function listAuditTrail(env, filters) {
  let where = "";
  const bind = [];
  if (filters.entity_type) {
    where = andWhere(where, "entity_type = ?");
    bind.push(filters.entity_type);
  }
  if (filters.entity_id) {
    where = andWhere(where, "entity_id = ?");
    bind.push(filters.entity_id);
  }
  if (filters.actor_id) {
    where = andWhere(where, "actor_id = ?");
    bind.push(filters.actor_id);
  }
  if (filters.action) {
    where = andWhere(where, "action = ?");
    bind.push(filters.action);
  }
  if (filters.since) {
    where = andWhere(where, "created_at >= ?");
    bind.push(filters.since);
  }
  if (filters.until) {
    where = andWhere(where, "created_at <= ?");
    bind.push(filters.until);
  }
  const sql = `SELECT * FROM audit_trail ${where} ORDER BY created_at DESC LIMIT ?`;
  bind.push(filters.limit);
  const rows = await env.DB.prepare(sql).bind(...bind).all();
  return (rows.results ?? []).map(mapAuditRow);
}
__name(listAuditTrail, "listAuditTrail");

// src/routes/audit.ts
async function handleListAuditTrail(req, env) {
  const user = await requireAccessUser(req, env);
  if (!user || !userIsAdmin(user)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const paramsResult = validateWithSchema(AuditTrailQuerySchema, {
    entity_type: url.searchParams.get("entity_type") ?? void 0,
    entity_id: url.searchParams.get("entity_id") ?? void 0,
    actor_id: url.searchParams.get("actor_id") ?? void 0,
    action: url.searchParams.get("action") ?? void 0,
    limit: url.searchParams.get("limit") ?? void 0,
    since: url.searchParams.get("since") ?? void 0,
    until: url.searchParams.get("until") ?? void 0
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.issues);
  }
  const params = paramsResult.data;
  if (params.since && params.until) {
    const sinceMs = Date.parse(params.since);
    const untilMs = Date.parse(params.until);
    if (!Number.isNaN(sinceMs) && !Number.isNaN(untilMs) && untilMs < sinceMs) {
      return json({ error: "Invalid range" }, { status: 400 });
    }
  }
  const limit = params.limit ?? 100;
  const entries = await listAuditTrail(env, {
    entity_type: params.entity_type ?? void 0,
    entity_id: params.entity_id ?? void 0,
    actor_id: params.actor_id ?? void 0,
    action: params.action ?? void 0,
    since: params.since ?? void 0,
    until: params.until ?? void 0,
    limit
  });
  return json({
    generated_at: nowISO(),
    entries
  });
}
__name(handleListAuditTrail, "handleListAuditTrail");
async function handleCreateAuditEntry(req, env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  if (!userIsAdmin(user)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }
  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parseResult = validateWithSchema(CreateAuditEntrySchema, payload);
  if (!parseResult.success) {
    return validationErrorResponse(parseResult.issues);
  }
  const body = parseResult.data;
  const expectedActorId = user.email;
  const expectedActorEmail = user.email;
  if (body.actor_id && body.actor_id !== expectedActorId) {
    return json({ error: "Actor identity mismatch" }, { status: 400 });
  }
  if (body.actor_email && body.actor_email !== expectedActorEmail) {
    return json({ error: "Actor identity mismatch" }, { status: 400 });
  }
  const ip = body.ip_address ?? req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? null;
  const result = await createAuditEntry(env, {
    audit_id: body.audit_id,
    actor_id: expectedActorId,
    actor_email: expectedActorEmail,
    actor_name: body.actor_name ?? null,
    action: body.action,
    entity_type: body.entity_type ?? null,
    entity_id: body.entity_id ?? null,
    metadata: body.metadata ?? null,
    ip_address: ip,
    created_at: body.created_at
  });
  if (!result.ok) {
    if (result.reason === "conflict") {
      return json({ error: "Audit entry already exists" }, { status: 409 });
    }
    return json({ error: "Server error" }, { status: 500 });
  }
  return json({ ok: true, audit: result.audit }, { status: 201 });
}
__name(handleCreateAuditEntry, "handleCreateAuditEntry");

// src/telemetry/index.ts
var WATER_DENSITY_KG_PER_L = 0.997;
var WATER_SPECIFIC_HEAT_KJ_PER_KG_C = 4.186;
var MIN_COP_POWER_KW = 0.05;
var ALERT_THRESHOLDS = {
  devices: {
    offline_ratio: { warn: 0.2, critical: 0.35 },
    heartbeat_gap_minutes: { warn: 5, critical: 10 }
  },
  ops: {
    error_rate: { warn: 0.02, critical: 0.05 },
    client_error_rate: { warn: 0.08, critical: 0.15 },
    avg_duration_ms: { warn: 1500, critical: 3e3 }
  },
  ingest: {
    consecutive_failures: { warn: 3, critical: 5 },
    rate_limit_per_device: { warn: 90, critical: 120 }
  }
};
function coerceNumber2(value, fallback = 0) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}
__name(coerceNumber2, "coerceNumber");
function pickMetricsFormat(explicit, acceptHeader) {
  if (explicit === "json" || explicit === "prom") return explicit;
  if (typeof acceptHeader === "string" && acceptHeader.toLowerCase().includes("application/json")) {
    return "json";
  }
  return "prom";
}
__name(pickMetricsFormat, "pickMetricsFormat");
function deriveDeltaT(supplyC, returnC) {
  if (typeof supplyC !== "number" || typeof returnC !== "number") return null;
  return round(supplyC - returnC, 1);
}
__name(deriveDeltaT, "deriveDeltaT");
function deriveThermalKW(deltaT, flowLps) {
  if (deltaT === null || typeof flowLps !== "number") return null;
  return round(WATER_DENSITY_KG_PER_L * WATER_SPECIFIC_HEAT_KJ_PER_KG_C * flowLps * deltaT, 2);
}
__name(deriveThermalKW, "deriveThermalKW");
function deriveCop(thermalKW, powerKW) {
  if (thermalKW === null || typeof powerKW !== "number" || powerKW <= MIN_COP_POWER_KW) {
    return { cop: null, quality: null };
  }
  return {
    cop: round(thermalKW / powerKW, 2),
    quality: "measured"
  };
}
__name(deriveCop, "deriveCop");
function deriveTelemetryMetrics(input) {
  const deltaT = deriveDeltaT(input.supplyC ?? null, input.returnC ?? null);
  const thermalKW = deriveThermalKW(deltaT, input.flowLps ?? null);
  const copInfo = deriveCop(thermalKW, input.powerKW ?? null);
  return {
    deltaT,
    thermalKW,
    cop: copInfo.cop,
    cop_quality: copInfo.quality
  };
}
__name(deriveTelemetryMetrics, "deriveTelemetryMetrics");
function maskTelemetryNumber(value, isAdmin, tenantPrecision = 1, adminPrecision) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  if (isAdmin) {
    return typeof adminPrecision === "number" ? Number(value.toFixed(adminPrecision)) : value;
  }
  return Number(value.toFixed(tenantPrecision));
}
__name(maskTelemetryNumber, "maskTelemetryNumber");
function normalizeDeviceSummary(stats) {
  const total = Number.isFinite(stats.total) ? stats.total : 0;
  const online = Number.isFinite(stats.online) ? stats.online : 0;
  const offline = Math.max(0, total - online);
  return { total, online, offline };
}
__name(normalizeDeviceSummary, "normalizeDeviceSummary");
function normalizeOpsMetrics(rows) {
  return rows.map((row) => {
    const route = row.route ?? "unknown";
    const statusCodeRaw = typeof row.status_code === "number" ? row.status_code : coerceNumber2(row.status_code);
    const statusCode = Number.isFinite(statusCodeRaw) ? Math.trunc(statusCodeRaw) : 0;
    const count = coerceNumber2(row.count);
    const totalDuration = coerceNumber2(row.total_duration_ms);
    const avgDuration = count > 0 ? totalDuration / count : coerceNumber2(row.avg_duration_ms);
    const maxDuration = coerceNumber2(row.max_duration_ms);
    return {
      route,
      status_code: statusCode,
      count,
      total_duration_ms: totalDuration,
      avg_duration_ms: avgDuration,
      max_duration_ms: maxDuration
    };
  });
}
__name(normalizeOpsMetrics, "normalizeOpsMetrics");
function summarizeOpsMetrics(rows) {
  let total = 0;
  let serverErrors = 0;
  let clientErrors = 0;
  let slow = 0;
  const slowRoutes = [];
  const serverErrorRoutes = [];
  for (const row of rows) {
    total += row.count;
    if (row.status_code >= 500) {
      serverErrors += row.count;
      serverErrorRoutes.push({
        route: row.route,
        status_code: row.status_code,
        count: row.count
      });
    } else if (row.status_code >= 400) {
      clientErrors += row.count;
    }
    if (row.avg_duration_ms >= ALERT_THRESHOLDS.ops.avg_duration_ms.warn) {
      slow += row.count;
      slowRoutes.push({
        route: row.route,
        status_code: row.status_code,
        avg_duration_ms: Number(row.avg_duration_ms.toFixed(2)),
        count: row.count
      });
    }
  }
  slowRoutes.sort((a, b) => b.avg_duration_ms - a.avg_duration_ms);
  serverErrorRoutes.sort((a, b) => b.count - a.count);
  const totalRequests = total;
  const denominator = totalRequests > 0 ? totalRequests : 1;
  return {
    total_requests: totalRequests,
    server_error_rate: totalRequests > 0 ? Number((serverErrors / denominator).toFixed(4)) : 0,
    client_error_rate: totalRequests > 0 ? Number((clientErrors / denominator).toFixed(4)) : 0,
    slow_rate: totalRequests > 0 ? Number((slow / denominator).toFixed(4)) : 0,
    slow_routes: slowRoutes.slice(0, 5),
    top_server_error_routes: serverErrorRoutes.slice(0, 5)
  };
}
__name(summarizeOpsMetrics, "summarizeOpsMetrics");
function formatMetricsJson(devices, opsRows, generatedAt = nowISO()) {
  const summary = normalizeDeviceSummary(devices);
  const ops = normalizeOpsMetrics(opsRows);
  const opsSummary = summarizeOpsMetrics(ops);
  const offlineRatio = summary.total > 0 ? summary.offline / summary.total : 0;
  return {
    devices: {
      ...summary,
      offline_ratio: Number(offlineRatio.toFixed(4))
    },
    ops,
    ops_summary: opsSummary,
    thresholds: ALERT_THRESHOLDS,
    generated_at: generatedAt
  };
}
__name(formatMetricsJson, "formatMetricsJson");
function formatPromMetrics(devices, opsRows, timestampMs = Date.now()) {
  const summary = normalizeDeviceSummary(devices);
  const ops = normalizeOpsMetrics(opsRows);
  const opsSummary = summarizeOpsMetrics(ops);
  const offlineRatio = summary.total > 0 ? summary.offline / summary.total : 0;
  const lines = [
    "# HELP greenbro_devices_total Total registered devices",
    "# TYPE greenbro_devices_total gauge",
    `greenbro_devices_total ${summary.total}`,
    "# HELP greenbro_devices_online_total Devices currently marked online",
    "# TYPE greenbro_devices_online_total gauge",
    `greenbro_devices_online_total ${summary.online}`,
    "# HELP greenbro_devices_offline_total Devices currently marked offline",
    "# TYPE greenbro_devices_offline_total gauge",
    `greenbro_devices_offline_total ${summary.offline}`,
    "# HELP greenbro_devices_offline_ratio Fraction of devices currently offline",
    "# TYPE greenbro_devices_offline_ratio gauge",
    `greenbro_devices_offline_ratio ${offlineRatio}`,
    "# HELP greenbro_ops_requests_total Recorded API requests by route and status",
    "# TYPE greenbro_ops_requests_total counter"
  ];
  for (const row of ops) {
    const routeLabel = row.route.replace(/"/g, '\\"');
    lines.push(
      `greenbro_ops_requests_total{route="${routeLabel}",status="${row.status_code}"} ${row.count}`
    );
  }
  lines.push(
    "# HELP greenbro_metrics_generated_at Timestamp metrics payload produced",
    "# TYPE greenbro_metrics_generated_at gauge"
  );
  lines.push(`greenbro_metrics_generated_at ${Math.floor(timestampMs / 1e3)}`);
  lines.push("# HELP greenbro_ops_requests_overall_total Total recorded API requests (all routes)");
  lines.push("# TYPE greenbro_ops_requests_overall_total counter");
  lines.push(`greenbro_ops_requests_overall_total ${opsSummary.total_requests}`);
  lines.push("# HELP greenbro_ops_server_error_rate Share of requests returning 5xx");
  lines.push("# TYPE greenbro_ops_server_error_rate gauge");
  lines.push(`greenbro_ops_server_error_rate ${opsSummary.server_error_rate}`);
  lines.push("# HELP greenbro_ops_client_error_rate Share of requests returning 4xx");
  lines.push("# TYPE greenbro_ops_client_error_rate gauge");
  lines.push(`greenbro_ops_client_error_rate ${opsSummary.client_error_rate}`);
  lines.push("# HELP greenbro_ops_slow_rate Share of requests above avg latency threshold");
  lines.push("# TYPE greenbro_ops_slow_rate gauge");
  lines.push(`greenbro_ops_slow_rate ${opsSummary.slow_rate}`);
  return lines.join("\n") + "\n";
}
__name(formatPromMetrics, "formatPromMetrics");

// src/schemas/ops.ts
var OpsOverviewQuerySchema = external_exports.object({
  limit: numericParam({ integer: true, min: 1, max: 200, defaultValue: 50 })
}).strict();

// src/routes/ops.ts
async function handleOpsOverview(req, env) {
  const log = loggerForRequest(req, { route: "/api/ops/overview" });
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  if (!userIsAdmin(user)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const paramsResult = OpsOverviewQuerySchema.safeParse({
    limit: url.searchParams.get("limit")
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.error);
  }
  const { limit } = paramsResult.data;
  const now = Date.now();
  const windowStart = opsMetricsWindowStart(now);
  await pruneOpsMetrics(env, now);
  const deviceStats = await env.DB.prepare("SELECT COUNT(*) AS total, SUM(online) AS online FROM devices").first() ?? null;
  const opsRows = (await env.DB.prepare(
    `SELECT route,
                status_code,
                COUNT(*) AS count,
                SUM(duration_ms) AS total_duration_ms,
                AVG(duration_ms) AS avg_duration_ms,
                MAX(duration_ms) AS max_duration_ms
           FROM ops_metrics
          WHERE ts >= ?1
          GROUP BY route, status_code
          ORDER BY route ASC, status_code ASC`
  ).bind(windowStart).all()).results ?? [];
  const metrics = formatMetricsJson(deviceStats ?? { total: 0, online: 0 }, opsRows);
  const recentRows = (await env.DB.prepare(
    `SELECT ts, route, status_code, duration_ms, device_id
           FROM ops_metrics
          WHERE ts >= ?1
          ORDER BY ts DESC
          LIMIT ?2`
  ).bind(windowStart, limit).all()).results ?? [];
  const recent = [];
  for (const row of recentRows) {
    let lookup = null;
    let outwardId = null;
    if (row.device_id) {
      outwardId = presentDeviceId(row.device_id, true);
      try {
        lookup = await buildDeviceLookup(row.device_id, env, true);
      } catch (error) {
        log.error("ops.recent_lookup_failed", { device_id: row.device_id, error });
        lookup = null;
      }
    }
    recent.push({
      ts: row.ts,
      route: row.route,
      status_code: row.status_code,
      duration_ms: row.duration_ms,
      device_id: outwardId,
      lookup
    });
  }
  return json({
    generated_at: metrics.generated_at,
    scope: "admin",
    devices: metrics.devices,
    ops: metrics.ops,
    ops_summary: metrics.ops_summary,
    thresholds: metrics.thresholds?.ops ?? null,
    ops_window: {
      start: windowStart,
      days: OPS_METRICS_WINDOW_DAYS
    },
    recent
  });
}
__name(handleOpsOverview, "handleOpsOverview");

// src/router/access.ts
function withAccess(handler) {
  return async (req, env, ctx) => {
    const user = await requireAccessUser(req, env);
    if (!user) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }
    return handler(req, env, ctx);
  };
}
__name(withAccess, "withAccess");

// src/router/admin.ts
function registerAdminRoutes(router2) {
  router2.get("/api/admin/overview", withAccess((req, env) => handleAdminOverview(req, env))).get("/api/ops/overview", withAccess((req, env) => handleOpsOverview(req, env))).get("/api/audit/logs", withAccess((req, env) => handleListAuditTrail(req, env))).post("/api/audit/logs", withAccess((req, env) => handleCreateAuditEntry(req, env)));
}
__name(registerAdminRoutes, "registerAdminRoutes");

// src/schemas/devices.ts
var ListDevicesQuerySchema = external_exports.object({
  mine: optionalBooleanFlag,
  limit: numericParam({ integer: true, min: 1, max: 100, defaultValue: 50 }),
  cursor: optionalTrimmedString
}).strict();
var DeviceHistoryQuerySchema = external_exports.object({
  limit: numericParam({ integer: true, min: 1, max: 500, defaultValue: 72 })
}).strict();

// src/routes/devices.ts
async function handleLatest(req, env, deviceId) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const isAdmin = userIsAdmin(user);
  const resolvedId = await resolveDeviceId(deviceId, env, isAdmin);
  if (!resolvedId) return json({ error: "Not found" }, { status: 404 });
  let row;
  if (isAdmin) {
    row = await env.DB.prepare(`SELECT * FROM latest_state WHERE device_id = ?1 LIMIT 1`).bind(resolvedId).first();
  } else {
    if (!user.clientIds || user.clientIds.length === 0) {
      return json({ error: "Not found" }, { status: 404 });
    }
    const placeholders = user.clientIds.map((_, i) => `?${i + 2}`).join(",");
    row = await env.DB.prepare(
      `SELECT ls.*
         FROM latest_state ls
         JOIN devices d ON d.device_id = ls.device_id
        WHERE ls.device_id = ?1
          AND d.profile_id IN (${placeholders})
        LIMIT 1`
    ).bind(resolvedId, ...user.clientIds).first();
  }
  if (!row) return json({ error: "Not found" }, { status: 404 });
  const outwardDeviceId = presentDeviceId(resolvedId, isAdmin);
  let latest = row;
  if (!isAdmin) {
    const { device_id: _drop, ...rest } = row;
    latest = rest;
  }
  return json({ device_id: outwardDeviceId, latest });
}
__name(handleLatest, "handleLatest");
async function handleListDevices(req, env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const isAdmin = userIsAdmin(user);
  const url = new URL(req.url);
  const paramsResult = ListDevicesQuerySchema.safeParse({
    mine: url.searchParams.get("mine") ?? void 0,
    limit: url.searchParams.get("limit") ?? void 0,
    cursor: url.searchParams.get("cursor") ?? void 0
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.error);
  }
  const { mine: mineParam, limit = 50, cursor } = paramsResult.data;
  const mine = isAdmin ? mineParam ?? false : true;
  const rawCursor = cursor ?? null;
  let cursorPhase = null;
  let cursorTs = null;
  let cursorId = null;
  if (rawCursor) {
    const parts = rawCursor.split("|", 3);
    const phase = parts[0];
    if (phase === "ts") {
      cursorPhase = "ts";
      const tsPart = parts[1] ?? null;
      cursorTs = safeDecode(tsPart);
      if (tsPart && cursorTs === null) return json({ error: "Invalid cursor" }, { status: 400 });
      const idPartRaw = parts.length >= 3 ? parts[2] ?? null : null;
      const idPart = safeDecode(idPartRaw);
      if (idPartRaw && idPart === null) return json({ error: "Invalid cursor" }, { status: 400 });
      if (idPart) {
        const parsed = await parseCursorId(idPart, env, isAdmin);
        if (!parsed.ok) return json({ error: "Invalid cursor" }, { status: 400 });
        cursorId = parsed.id;
      }
    } else if (phase === "null") {
      cursorPhase = "null";
      const idPartRaw = parts[1] ?? null;
      const idPart = safeDecode(idPartRaw);
      if (!idPart) return json({ error: "Invalid cursor" }, { status: 400 });
      const parsed = await parseCursorId(idPart, env, isAdmin);
      if (!parsed.ok || !parsed.id) return json({ error: "Invalid cursor" }, { status: 400 });
      cursorId = parsed.id;
    }
  }
  let where = "";
  const bind = [];
  if (mine) {
    if (!user.clientIds?.length) return json({ items: [], next: null });
    const ph = user.clientIds.map((_, i) => `?${i + 1}`).join(",");
    where = `WHERE d.profile_id IN (${ph})`;
    bind.push(...user.clientIds);
  }
  if (cursorPhase === "ts" && cursorTs) {
    where += where ? " AND" : "WHERE";
    if (cursorId) {
      where += " ((d.last_seen_at IS NOT NULL AND (d.last_seen_at < ? OR (d.last_seen_at = ? AND d.device_id > ?))) OR d.last_seen_at IS NULL)";
      bind.push(cursorTs, cursorTs, cursorId);
    } else {
      where += " ((d.last_seen_at IS NOT NULL AND d.last_seen_at < ?) OR d.last_seen_at IS NULL)";
      bind.push(cursorTs);
    }
  } else if (cursorPhase === "null" && cursorId) {
    where += where ? " AND" : "WHERE";
    where += " (d.last_seen_at IS NULL AND d.device_id > ?)";
    bind.push(cursorId);
  }
  const sql = `
    SELECT d.device_id, d.profile_id, d.site, d.firmware, d.map_version,
           d.online, d.last_seen_at
      FROM devices d
      ${where}
     ORDER BY (d.last_seen_at IS NOT NULL) DESC, d.last_seen_at DESC, d.device_id ASC
     LIMIT ${limit + 1}
  `;
  const rows = (await env.DB.prepare(sql).bind(...bind).all()).results ?? [];
  const hasMore = rows.length > limit;
  const slice = hasMore ? rows.slice(0, limit) : rows;
  let items;
  try {
    items = await Promise.all(
      slice.map(async (r2) => ({
        device_id: presentDeviceId(r2.device_id, isAdmin),
        lookup: await buildDeviceLookup(r2.device_id, env, isAdmin),
        profile_id: r2.profile_id,
        online: !!r2.online,
        last_seen_at: r2.last_seen_at,
        site: r2.site ?? null,
        firmware: r2.firmware ?? null,
        map_version: r2.map_version ?? null
      }))
    );
  } catch (err) {
    loggerForRequest(req, { route: "/api/devices" }).error("devices.list_failed", {
      error: err
    });
    return json({ error: "Server error" }, { status: 500 });
  }
  let next = null;
  if (hasMore) {
    const last = slice[slice.length - 1];
    let cursorDeviceId = last.device_id;
    if (!isAdmin) {
      try {
        cursorDeviceId = await sealCursorId(env, last.device_id);
      } catch (err) {
        loggerForRequest(req, { route: "/api/devices" }).error("devices.cursor_seal_failed", {
          error: err
        });
        return json({ error: "Server error" }, { status: 500 });
      }
    }
    next = last.last_seen_at ? `ts|${encodeURIComponent(last.last_seen_at)}|${encodeURIComponent(cursorDeviceId)}` : `null|${encodeURIComponent(cursorDeviceId)}`;
  }
  return json({ items, next });
}
__name(handleListDevices, "handleListDevices");
async function handleDeviceHistory(req, env, rawDeviceId) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const scope = buildDeviceScope(user);
  const resolvedId = await resolveDeviceId(rawDeviceId, env, scope.isAdmin);
  if (!resolvedId) return json({ error: "Not found" }, { status: 404 });
  if (!scope.isAdmin) {
    if (scope.empty) return json({ error: "Not found" }, { status: 404 });
    const owned = await env.DB.prepare(
      `SELECT 1 FROM devices d WHERE d.device_id = ?1 AND ${scope.clause} LIMIT 1`
    ).bind(resolvedId, ...scope.bind).first();
    if (!owned) return json({ error: "Not found" }, { status: 404 });
  }
  const url = new URL(req.url);
  const paramsResult = DeviceHistoryQuerySchema.safeParse({
    limit: url.searchParams.get("limit")
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.error);
  }
  const { limit = 72 } = paramsResult.data;
  const rows = await env.DB.prepare(
    `SELECT ts, metrics_json, deltaT, thermalKW, cop
         FROM telemetry
        WHERE device_id = ?1
        ORDER BY ts DESC
        LIMIT ${limit}`
  ).bind(resolvedId).all();
  const items = (rows.results ?? []).map((row) => {
    const metrics = parseMetricsJson(row.metrics_json);
    return {
      ts: new Date(row.ts).toISOString(),
      deltaT: row.deltaT ?? null,
      thermalKW: row.thermalKW ?? null,
      cop: row.cop ?? null,
      supplyC: metrics.supplyC ?? null,
      returnC: metrics.returnC ?? null,
      tankC: metrics.tankC ?? null,
      ambientC: metrics.ambientC ?? null,
      flowLps: metrics.flowLps ?? null,
      powerKW: metrics.powerKW ?? null,
      mode: metrics.mode ?? null,
      defrost: metrics.defrost ?? null
    };
  }).reverse();
  let lookupToken;
  try {
    lookupToken = await buildDeviceLookup(resolvedId, env, scope.isAdmin);
  } catch (err) {
    loggerForRequest(req, {
      route: "/api/devices/:id/history",
      device_id: resolvedId,
      request_device_id: rawDeviceId
    }).error("devices.history_lookup_failed", { error: err });
    return json({ error: "Server error" }, { status: 500 });
  }
  return json({
    device_id: presentDeviceId(resolvedId, scope.isAdmin),
    lookup: lookupToken,
    items
  });
}
__name(handleDeviceHistory, "handleDeviceHistory");

// src/router/devices.ts
function registerDeviceRoutes(router2, withParam2) {
  router2.get("/api/devices", withAccess((req, env) => handleListDevices(req, env))).get(
    "/api/devices/:id/latest",
    withAccess(
      withParam2("id", (req, env, deviceId) => handleLatest(req, env, deviceId))
    )
  ).get(
    "/api/devices/:id/history",
    withAccess(
      withParam2("id", (req, env, deviceId) => handleDeviceHistory(req, env, deviceId))
    )
  );
}
__name(registerDeviceRoutes, "registerDeviceRoutes");

// src/router/params.ts
function decodeParam(req, key) {
  const raw = req.params?.[key] ?? null;
  const decoded = safeDecode(raw);
  if (decoded === null || decoded === "") return null;
  return decoded;
}
__name(decodeParam, "decodeParam");
var withParam = /* @__PURE__ */ __name((param, handler) => {
  return (req, env, ctx) => {
    const value = decodeParam(req, param);
    if (!value) {
      return json({ error: `Invalid ${param}` }, { status: 400 });
    }
    return handler(req, env, value, ctx);
  };
}, "withParam");

// src/schemas/metrics.ts
var MetricsQuerySchema = external_exports.object({
  format: external_exports.preprocess(
    (input) => {
      if (input === void 0 || input === null) return void 0;
      if (typeof input !== "string") return input;
      const trimmed = input.trim().toLowerCase();
      return trimmed === "" ? void 0 : trimmed;
    },
    external_exports.enum(["json", "prom", "dashboard"]).optional()
  )
}).strict();

// src/routes/metrics.ts
async function handleMetrics(req, env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  if (!userIsAdmin(user)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const paramsResult = MetricsQuerySchema.safeParse({
    format: url.searchParams.get("format")
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.error);
  }
  const formatParam = paramsResult.data.format;
  const isDashboardFormat = formatParam === "dashboard";
  const now = Date.now();
  const windowStart = opsMetricsWindowStart(now);
  await pruneOpsMetrics(env, now);
  const deviceStats = await env.DB.prepare("SELECT COUNT(*) AS total, SUM(online) AS online FROM devices").first() ?? null;
  const opsRows = (await env.DB.prepare(
    `SELECT route,
                status_code,
                COUNT(*) AS count,
                SUM(duration_ms) AS total_duration_ms,
                AVG(duration_ms) AS avg_duration_ms,
                MAX(duration_ms) AS max_duration_ms
           FROM ops_metrics
          WHERE ts >= ?1
          GROUP BY route, status_code
          ORDER BY route ASC, status_code ASC`
  ).bind(windowStart).all()).results ?? [];
  const deviceSummary = {
    total: deviceStats?.total ?? null,
    online: deviceStats?.online ?? null
  };
  const metricsPayload = formatMetricsJson(deviceSummary, opsRows);
  if (isDashboardFormat) {
    const dashboard = buildDashboardPayload(metricsPayload);
    return json({
      ...dashboard,
      ops_window: {
        start: windowStart,
        days: OPS_METRICS_WINDOW_DAYS
      }
    });
  }
  const format = pickMetricsFormat(formatParam, req.headers.get("accept") ?? "");
  if (format === "json") {
    return json({
      ...metricsPayload,
      ops_window: {
        start: windowStart,
        days: OPS_METRICS_WINDOW_DAYS
      }
    });
  }
  const promPayload = formatPromMetrics(deviceSummary, opsRows);
  return text(promPayload, {
    headers: {
      "content-type": "text/plain; charset=utf-8"
    }
  });
}
__name(handleMetrics, "handleMetrics");
function buildDashboardPayload(payload) {
  const offlineStatus = deriveSeverity(
    payload.devices.offline_ratio,
    payload.thresholds.devices.offline_ratio
  );
  const serverSeverity = deriveSeverity(
    payload.ops_summary.server_error_rate,
    payload.thresholds.ops.error_rate
  );
  const clientSeverity = deriveSeverity(
    payload.ops_summary.client_error_rate,
    payload.thresholds.ops.client_error_rate
  );
  const maxAvgDuration = payload.ops_summary.slow_routes[0]?.avg_duration_ms ?? 0;
  const latencySeverity = deriveSeverity(
    maxAvgDuration,
    payload.thresholds.ops.avg_duration_ms
  );
  const overallOpsSeverity = [serverSeverity, clientSeverity, latencySeverity].reduce(
    (acc, current) => severityWeight(current) > severityWeight(acc) ? current : acc,
    "ok"
  );
  return {
    generated_at: payload.generated_at,
    devices: {
      ...payload.devices,
      status: offlineStatus,
      thresholds: payload.thresholds.devices
    },
    ops: {
      summary: payload.ops_summary,
      status: overallOpsSeverity,
      metrics: {
        server_error_rate: {
          value: payload.ops_summary.server_error_rate,
          status: serverSeverity,
          thresholds: payload.thresholds.ops.error_rate
        },
        client_error_rate: {
          value: payload.ops_summary.client_error_rate,
          status: clientSeverity,
          thresholds: payload.thresholds.ops.client_error_rate
        },
        max_avg_duration_ms: {
          value: maxAvgDuration,
          status: latencySeverity,
          thresholds: payload.thresholds.ops.avg_duration_ms
        }
      },
      slow_routes: payload.ops_summary.slow_routes,
      top_server_error_routes: payload.ops_summary.top_server_error_routes
    },
    thresholds: payload.thresholds
  };
}
__name(buildDashboardPayload, "buildDashboardPayload");
function deriveSeverity(value, thresholds) {
  if (value >= thresholds.critical) return "critical";
  if (value >= thresholds.warn) return "warn";
  return "ok";
}
__name(deriveSeverity, "deriveSeverity");
function severityWeight(level) {
  switch (level) {
    case "critical":
      return 3;
    case "warn":
      return 2;
    default:
      return 1;
  }
}
__name(severityWeight, "severityWeight");

// src/router/metrics.ts
function registerMetricsRoutes(router2) {
  router2.get("/metrics", (req, env) => handleMetrics(req, env));
}
__name(registerMetricsRoutes, "registerMetricsRoutes");

// src/schemas/telemetry.ts
var DEVICE_ID_LIMIT = 200;
var TelemetryLatestBatchSchema = external_exports.object({
  devices: external_exports.array(
    external_exports.string({
      required_error: "Device identifiers are required",
      invalid_type_error: "Device identifiers must be strings"
    }).trim().min(1, "Device identifier must not be empty")
  ).max(DEVICE_ID_LIMIT, `Cannot request more than ${DEVICE_ID_LIMIT} devices`).default([]),
  include: external_exports.object({
    faults: optionalBooleanFlag.default(true),
    metrics: optionalBooleanFlag.default(true)
  }).default({
    faults: true,
    metrics: true
  })
}).strict();
var TelemetrySeriesQuerySchema = external_exports.object({
  scope: optionalTrimmedString.transform(
    (value) => value ? value.toLowerCase() : void 0
  ).refine(
    (value) => !value || ["device", "profile", "fleet"].includes(value),
    "Invalid scope"
  ).default("device"),
  device: optionalTrimmedString,
  profile: optionalTrimmedString,
  metric: optionalTrimmedString,
  start: optionalTrimmedString,
  end: optionalTrimmedString,
  interval: optionalTrimmedString,
  fill: optionalTrimmedString,
  limit: numericParam({ integer: true, min: 1, max: 2e3, defaultValue: 288 })
}).strict();
var TELEMETRY_ALLOWED_METRICS = [
  "thermalKW",
  "cop",
  "deltaT",
  "supplyC",
  "returnC",
  "flowLps",
  "powerKW"
];
var TELEMETRY_INTERVALS_MS = {
  "1m": 6e4,
  "5m": 3e5,
  "15m": 9e5,
  "1h": 36e5,
  "1d": 864e5
};

// src/lib/telemetry-access.ts
var SENSITIVE_PAYLOAD_KEYS = ["secret", "token", "password", "key", "signature", "auth"];
async function resolveLatestBatchDevices(env, user, deviceTokens) {
  const scope = buildDeviceScope(user);
  const requested = deviceTokens.map((token, index) => ({
    token,
    index,
    resolved: null
  }));
  const missingTokens = [];
  if (!deviceTokens.length) {
    return { scope, requested, resolvedIds: [], missingTokens };
  }
  const resolutions = await Promise.all(
    requested.map((entry) => resolveDeviceId(entry.token, env, scope.isAdmin))
  );
  resolutions.forEach((resolved, index) => {
    if (!resolved) {
      missingTokens.push(requested[index].token);
      return;
    }
    requested[index].resolved = resolved;
  });
  const resolvedIds = Array.from(
    new Set(requested.filter((candidate) => candidate.resolved).map((candidate) => candidate.resolved))
  );
  return { scope, requested, resolvedIds, missingTokens };
}
__name(resolveLatestBatchDevices, "resolveLatestBatchDevices");
async function presentLatestBatchRow(row, env, include, user) {
  const isAdmin = userIsAdmin(user);
  const lookup = await buildDeviceLookup(row.device_id, env, isAdmin);
  const outwardId = presentDeviceId(row.device_id, isAdmin);
  const flags = include ?? { faults: true, metrics: true };
  const includeMetrics = flags.metrics !== false;
  const includeFaults = flags.faults !== false;
  const latest = {
    ts: row.ts ?? null,
    updated_at: row.updated_at ?? null,
    online: row.latest_online === 1,
    mode: row.mode ?? null,
    defrost: row.defrost ?? null,
    cop_quality: row.cop_quality ?? null
  };
  if (includeMetrics) {
    if (isAdmin) {
      const parsedPayload = safeParseJson(row.payload_json);
      const sanitized = parsedPayload === null ? null : sanitizeTelemetryPayload(parsedPayload);
      latest.payload = sanitized ?? null;
    }
    latest.supplyC = maskTelemetryNumber(row.supplyC, isAdmin);
    latest.returnC = maskTelemetryNumber(row.returnC, isAdmin);
    latest.tankC = maskTelemetryNumber(row.tankC, isAdmin);
    latest.ambientC = maskTelemetryNumber(row.ambientC, isAdmin);
    latest.flowLps = maskTelemetryNumber(row.flowLps, isAdmin, 3);
    latest.compCurrentA = maskTelemetryNumber(row.compCurrentA, isAdmin, 2);
    latest.eevSteps = maskTelemetryNumber(row.eevSteps, isAdmin, 0);
    latest.powerKW = maskTelemetryNumber(row.powerKW, isAdmin, 3);
    latest.deltaT = maskTelemetryNumber(row.deltaT, isAdmin, 2);
    latest.thermalKW = maskTelemetryNumber(row.thermalKW, isAdmin, 3);
    latest.cop = maskTelemetryNumber(row.cop, isAdmin, 2);
  } else if (isAdmin) {
    const parsedPayload = safeParseJson(row.payload_json);
    if (parsedPayload !== null) {
      const sanitized = sanitizeTelemetryPayload(parsedPayload);
      if (sanitized !== void 0) {
        latest.payload = sanitized;
      }
    }
  }
  if (includeFaults) {
    latest.faults = parseFaultsJson(row.faults_json);
  }
  return {
    lookup,
    device_id: outwardId,
    profile_id: row.profile_id ?? null,
    site: row.site ?? null,
    online: row.device_online === 1,
    last_seen_at: row.last_seen_at ?? null,
    latest
  };
}
__name(presentLatestBatchRow, "presentLatestBatchRow");
async function resolveTelemetrySeriesConfig(params, env, user) {
  const metrics = resolveMetrics(params.metric);
  if (!metrics.length) {
    return { ok: false, status: 400, error: "Invalid metrics" };
  }
  const bucketMs = resolveInterval(params.interval ?? "5m");
  if (!bucketMs) {
    return { ok: false, status: 400, error: "Invalid interval" };
  }
  const now = Date.now();
  const endMs = clampTimestamp(params.end, now);
  if (endMs === null) {
    return { ok: false, status: 400, error: "Invalid end timestamp" };
  }
  const defaultStart = endMs - 24 * 60 * 60 * 1e3;
  let startMs = clampTimestamp(params.start, defaultStart);
  if (startMs === null) {
    return { ok: false, status: 400, error: "Invalid start timestamp" };
  }
  if (startMs >= endMs) {
    return { ok: false, status: 400, error: "Start must be before end" };
  }
  const limit = params.limit ?? 288;
  const maxWindow = limit * bucketMs;
  if (endMs - startMs > maxWindow) {
    startMs = endMs - maxWindow;
  }
  const scope = buildDeviceScope(user, "d");
  const isAdmin = scope.isAdmin;
  const fillMode = params.fill === "carry" ? "carry" : "none";
  const tenantPrecision = isAdmin ? 4 : 2;
  const conditions = ["t.ts BETWEEN params.start_ms AND params.end_ms"];
  const bindings = [];
  let scopeDescriptor;
  if (params.scope === "device") {
    if (!params.device) {
      return { ok: false, status: 400, error: "Device parameter is required for device scope" };
    }
    const resolvedId = await resolveDeviceId(params.device, env, isAdmin);
    if (!resolvedId) {
      return { ok: false, status: 404, error: "Device not found" };
    }
    const row = await env.DB.prepare(`SELECT device_id, profile_id FROM devices WHERE device_id = ?1 LIMIT 1`).bind(resolvedId).first();
    if (!row) {
      return { ok: false, status: 404, error: "Device not found" };
    }
    if (!isAdmin) {
      const allowed = scope.bind ?? [];
      if (!allowed.includes(row.profile_id ?? "")) {
        return { ok: false, status: 403, error: "Forbidden" };
      }
    }
    conditions.push("t.device_id = ?");
    bindings.push(row.device_id);
    const outwardId = presentDeviceId(row.device_id, isAdmin);
    const lookup = await buildDeviceLookup(row.device_id, env, isAdmin);
    scopeDescriptor = { type: "device", device_id: outwardId, lookup };
  } else if (params.scope === "profile") {
    if (isAdmin) {
      if (!params.profile) {
        return { ok: false, status: 400, error: "Profile parameter is required for profile scope" };
      }
      conditions.push(buildInClause("d.profile_id", [params.profile]));
      bindings.push(params.profile);
      scopeDescriptor = { type: "profile", profile_ids: [params.profile] };
    } else {
      const allowed = scope.bind ?? [];
      if (!allowed.length) {
        conditions.push("1=0");
        scopeDescriptor = { type: "profile", profile_ids: [] };
      } else {
        let selected;
        if (params.profile) {
          if (!allowed.includes(params.profile)) {
            return { ok: false, status: 403, error: "Forbidden" };
          }
          selected = [params.profile];
        } else if (allowed.length === 1) {
          selected = [...allowed];
        } else {
          return {
            ok: false,
            status: 400,
            error: "Profile parameter required for scoped users"
          };
        }
        conditions.push(buildInClause("d.profile_id", selected));
        bindings.push(...selected);
        scopeDescriptor = { type: "profile", profile_ids: selected };
      }
    }
  } else {
    if (isAdmin) {
      if (params.profile) {
        conditions.push(buildInClause("d.profile_id", [params.profile]));
        bindings.push(params.profile);
        scopeDescriptor = { type: "fleet", profile_ids: [params.profile] };
      } else {
        scopeDescriptor = { type: "fleet", profile_ids: null };
      }
    } else {
      const allowed = scope.bind ?? [];
      if (!allowed.length) {
        conditions.push("1=0");
        scopeDescriptor = { type: "fleet", profile_ids: [] };
      } else {
        let selected = [...allowed];
        if (params.profile) {
          if (!allowed.includes(params.profile)) {
            return { ok: false, status: 403, error: "Forbidden" };
          }
          selected = [params.profile];
        }
        conditions.push(buildInClause("d.profile_id", selected));
        bindings.push(...selected);
        scopeDescriptor = { type: "fleet", profile_ids: selected };
      }
    }
  }
  if (!isAdmin && scope.clause) {
    conditions.push(scope.clause);
    bindings.push(...scope.bind);
  }
  const whereClause = conditions.join(" AND ");
  return {
    ok: true,
    config: {
      bucketMs,
      startMs,
      endMs,
      metrics,
      whereClause,
      bindings,
      scopeDescriptor,
      fillMode,
      tenantPrecision
    }
  };
}
__name(resolveTelemetrySeriesConfig, "resolveTelemetrySeriesConfig");
function resolveMetrics(csv) {
  if (!csv) return [...TELEMETRY_ALLOWED_METRICS];
  const parts = csv.split(",").map((part) => part.trim()).filter(Boolean);
  const allowed = new Set(TELEMETRY_ALLOWED_METRICS);
  return parts.filter((part) => allowed.has(part));
}
__name(resolveMetrics, "resolveMetrics");
function resolveInterval(interval) {
  if (!interval) return TELEMETRY_INTERVALS_MS["5m"];
  return TELEMETRY_INTERVALS_MS[interval] ?? null;
}
__name(resolveInterval, "resolveInterval");
function clampTimestamp(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = String(value).trim();
  if (!trimmed) return fallback;
  if (/^\d+$/.test(trimmed)) {
    const parsed2 = Number.parseInt(trimmed, 10);
    return Number.isNaN(parsed2) ? null : parsed2;
  }
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}
__name(clampTimestamp, "clampTimestamp");
function buildInClause(column, values) {
  if (!values.length) return "1=0";
  const placeholders = values.map(() => "?").join(",");
  return `${column} IN (${placeholders})`;
}
__name(buildInClause, "buildInClause");
function sanitizeTelemetryPayload(payload, depth = 0) {
  if (payload === null) return null;
  if (depth >= 6) return null;
  if (Array.isArray(payload)) {
    const items = payload.slice(0, 50).map((item) => sanitizeTelemetryPayload(item, depth + 1)).filter((item) => item !== void 0);
    return items;
  }
  if (typeof payload === "object") {
    const entries = Object.entries(payload);
    const result = {};
    for (const [key, value] of entries) {
      if (!key) continue;
      const normalized = key.toLowerCase();
      if (SENSITIVE_PAYLOAD_KEYS.some((fragment) => normalized.includes(fragment))) {
        result[key] = "[redacted]";
        continue;
      }
      const sanitized = sanitizeTelemetryPayload(value, depth + 1);
      if (sanitized !== void 0) {
        result[key] = sanitized;
      }
    }
    return result;
  }
  if (typeof payload === "string") {
    if (!payload.trim()) return "";
    return payload.length > 512 ? `${payload.slice(0, 509)}...` : payload;
  }
  if (typeof payload === "number" || typeof payload === "boolean") {
    return payload;
  }
  return void 0;
}
__name(sanitizeTelemetryPayload, "sanitizeTelemetryPayload");
function safeParseJson(payload) {
  if (!payload) return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
__name(safeParseJson, "safeParseJson");

// src/lib/telemetry-store.ts
var TELEMETRY_LATEST_BATCH_CHUNK = 100;
async function fetchLatestTelemetryBatch(env, deviceIds, scope) {
  if (!deviceIds.length) {
    return [];
  }
  const rows = [];
  for (let i = 0; i < deviceIds.length; i += TELEMETRY_LATEST_BATCH_CHUNK) {
    const chunk = deviceIds.slice(i, i + TELEMETRY_LATEST_BATCH_CHUNK);
    const placeholders = chunk.map(() => "?").join(",");
    let where = `ls.device_id IN (${placeholders})`;
    const bind = [...chunk];
    if (!scope.isAdmin && scope.clause) {
      where = andWhere(where, scope.clause.replace(/^WHERE\s+/i, ""));
      bind.push(...scope.bind);
    }
    const query = `
      SELECT
        ls.device_id,
        ls.ts,
        ls.updated_at,
        ls.supplyC,
        ls.returnC,
        ls.tankC,
        ls.ambientC,
        ls.flowLps,
        ls.compCurrentA,
        ls.eevSteps,
        ls.powerKW,
        ls.deltaT,
        ls.thermalKW,
        ls.cop,
        ls.cop_quality,
        ls.mode,
        ls.defrost,
        ls.online AS latest_online,
        ls.faults_json,
        ls.payload_json,
        d.profile_id,
        d.site,
        d.online AS device_online,
        d.last_seen_at
      FROM latest_state ls
      JOIN devices d ON d.device_id = ls.device_id
      WHERE ${where}
    `;
    const result = await env.DB.prepare(query).bind(...bind).all();
    rows.push(...result.results ?? []);
  }
  return rows;
}
__name(fetchLatestTelemetryBatch, "fetchLatestTelemetryBatch");
async function fetchTelemetrySeries(env, config) {
  const query = buildSeriesSql(config.whereClause);
  const bindings = [
    config.bucketMs,
    config.startMs,
    config.endMs,
    ...config.bindings
  ];
  const rows = await env.DB.prepare(query).bind(...bindings).all();
  return rows.results ?? [];
}
__name(fetchTelemetrySeries, "fetchTelemetrySeries");
function buildSeriesSql(whereClause) {
  return `
    WITH params AS (
      SELECT ? AS bucket_ms, ? AS start_ms, ? AS end_ms
    ),
    scoped AS (
      SELECT
        (CAST(t.ts / params.bucket_ms AS INTEGER) * params.bucket_ms) AS bucket_start_ms,
        t.device_id,
        t.deltaT,
        t.thermalKW,
        t.cop,
        json_extract(t.metrics_json, '$.supplyC') AS supplyC,
        json_extract(t.metrics_json, '$.returnC') AS returnC,
        json_extract(t.metrics_json, '$.flowLps') AS flowLps,
        json_extract(t.metrics_json, '$.powerKW') AS powerKW
      FROM telemetry t
      JOIN devices d ON d.device_id = t.device_id
      JOIN params
      WHERE ${whereClause}
    ),
    per_device AS (
      SELECT
        bucket_start_ms,
        device_id,
        COUNT(*) AS sample_count,
        AVG(deltaT) AS avg_deltaT,
        MIN(deltaT) AS min_deltaT,
        MAX(deltaT) AS max_deltaT,
        SUM(CASE WHEN deltaT IS NOT NULL THEN 1 ELSE 0 END) AS deltaT_count,
        AVG(thermalKW) AS avg_thermalKW,
        MIN(thermalKW) AS min_thermalKW,
        MAX(thermalKW) AS max_thermalKW,
        SUM(CASE WHEN thermalKW IS NOT NULL THEN 1 ELSE 0 END) AS thermalKW_count,
        AVG(cop) AS avg_cop,
        MIN(cop) AS min_cop,
        MAX(cop) AS max_cop,
        SUM(CASE WHEN cop IS NOT NULL THEN 1 ELSE 0 END) AS cop_count,
        AVG(supplyC) AS avg_supplyC,
        AVG(returnC) AS avg_returnC,
        AVG(flowLps) AS avg_flowLps,
        AVG(powerKW) AS avg_powerKW,
        SUM(CASE WHEN supplyC IS NOT NULL THEN 1 ELSE 0 END) AS supplyC_count,
        SUM(CASE WHEN returnC IS NOT NULL THEN 1 ELSE 0 END) AS returnC_count,
        SUM(CASE WHEN flowLps IS NOT NULL THEN 1 ELSE 0 END) AS flowLps_count,
        SUM(CASE WHEN powerKW IS NOT NULL THEN 1 ELSE 0 END) AS powerKW_count
      FROM scoped
      GROUP BY bucket_start_ms, device_id
    ),
    aggregated AS (
      SELECT
        bucket_start_ms,
        SUM(sample_count) AS sample_count,
        SUM(avg_deltaT * deltaT_count) / NULLIF(SUM(deltaT_count), 0) AS avg_deltaT,
        MIN(min_deltaT) AS min_deltaT,
        MAX(max_deltaT) AS max_deltaT,
        SUM(avg_thermalKW * thermalKW_count) / NULLIF(SUM(thermalKW_count), 0) AS avg_thermalKW,
        MIN(min_thermalKW) AS min_thermalKW,
        MAX(max_thermalKW) AS max_thermalKW,
        SUM(avg_cop * cop_count) / NULLIF(SUM(cop_count), 0) AS avg_cop,
        MIN(min_cop) AS min_cop,
        MAX(max_cop) AS max_cop,
        SUM(avg_supplyC * supplyC_count) / NULLIF(SUM(supplyC_count), 0) AS avg_supplyC,
        SUM(avg_returnC * returnC_count) / NULLIF(SUM(returnC_count), 0) AS avg_returnC,
        SUM(avg_flowLps * flowLps_count) / NULLIF(SUM(flowLps_count), 0) AS avg_flowLps,
        SUM(avg_powerKW * powerKW_count) / NULLIF(SUM(powerKW_count), 0) AS avg_powerKW
      FROM per_device
      GROUP BY bucket_start_ms
    )
    SELECT *
    FROM aggregated
    ORDER BY bucket_start_ms ASC
  `;
}
__name(buildSeriesSql, "buildSeriesSql");

// src/routes/telemetry.legacy.ts
var LATEST_BATCH_CHUNK = 100;
var METRICS_WITH_EXTENTS = /* @__PURE__ */ new Set([
  "deltaT",
  "thermalKW",
  "cop"
]);
async function legacyHandleTelemetryLatestBatch(req, env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = validateWithSchema(TelemetryLatestBatchSchema, payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.issues);
  }
  const body = parsed.data;
  const scope = buildDeviceScope(user);
  if (body.devices.length === 0) {
    return json({ generated_at: nowISO(), items: [], missing: [] });
  }
  if (scope.empty && !scope.isAdmin) {
    return json({
      generated_at: nowISO(),
      items: [],
      missing: [...new Set(body.devices)]
    });
  }
  const requested = body.devices.map(
    (token, index) => ({
      token,
      index,
      resolved: null
    })
  );
  const isResolved = /* @__PURE__ */ __name((entry) => entry.resolved !== null, "isResolved");
  const missing = [];
  for (const entry of requested) {
    const resolved = await resolveDeviceId(entry.token, env, scope.isAdmin);
    if (!resolved) {
      missing.push(entry.token);
      continue;
    }
    entry.resolved = resolved;
  }
  const resolvedIds = Array.from(new Set(requested.filter(isResolved).map((r2) => r2.resolved)));
  if (!resolvedIds.length) {
    return json({
      generated_at: nowISO(),
      items: [],
      missing: dedupePreserveOrder(body.devices, missing)
    });
  }
  const rows = await fetchLatestRows(env, resolvedIds, scope);
  const rowMap = /* @__PURE__ */ new Map();
  for (const row of rows) {
    rowMap.set(row.device_id, row);
  }
  const items = [];
  const seen = /* @__PURE__ */ new Set();
  const missingTokens = new Set(missing);
  for (const entry of requested) {
    if (!entry.resolved) {
      continue;
    }
    if (seen.has(entry.resolved)) {
      continue;
    }
    const row = rowMap.get(entry.resolved);
    if (!row) {
      missingTokens.add(entry.token);
      continue;
    }
    seen.add(entry.resolved);
    try {
      const formatted = await presentLatestRow(
        row,
        env,
        userIsAdmin(user),
        body.include ?? { faults: true, metrics: true }
      );
      items.push(formatted);
    } catch (error) {
      loggerForRequest(req, { route: "/api/telemetry/latest-batch" }).error(
        "telemetry.latest_batch.present_failed",
        { error, device_id: entry.resolved }
      );
    }
  }
  return json({
    generated_at: nowISO(),
    items,
    missing: dedupePreserveOrder(body.devices, Array.from(missingTokens))
  });
}
__name(legacyHandleTelemetryLatestBatch, "legacyHandleTelemetryLatestBatch");
async function legacyHandleTelemetrySeries(req, env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const rawQuery = {};
  const searchEntries = url.searchParams;
  for (const [key, value] of searchEntries) {
    rawQuery[key] = value;
  }
  const parsed = TelemetrySeriesQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }
  const result = await resolveSeriesConfig(parsed.data, env, user);
  if (!result.ok) {
    if (result.status === 400) {
      return json({ error: result.error }, { status: 400 });
    }
    if (result.status === 403) {
      return json({ error: "Forbidden" }, { status: 403 });
    }
    if (result.status === 404) {
      return json({ error: "Not found" }, { status: 404 });
    }
    return json({ error: "Server error" }, { status: 500 });
  }
  const { config } = result;
  const query = buildSeriesSql2(config.whereClause);
  const bindings = [config.bucketMs, config.startMs, config.endMs, ...config.bindings];
  const rows = await env.DB.prepare(query).bind(...bindings).all();
  const bucketRows = rows.results ?? [];
  const series = buildSeriesResponse(bucketRows, {
    startMs: config.startMs,
    endMs: config.endMs,
    bucketMs: config.bucketMs,
    metrics: config.metrics,
    fillMode: config.fillMode,
    isAdmin: userIsAdmin(user),
    tenantPrecision: config.tenantPrecision
  });
  return json({
    generated_at: nowISO(),
    scope: config.scopeDescriptor,
    interval_ms: config.bucketMs,
    window: {
      start: new Date(config.startMs).toISOString(),
      end: new Date(config.endMs).toISOString()
    },
    metrics: config.metrics,
    series
  });
}
__name(legacyHandleTelemetrySeries, "legacyHandleTelemetrySeries");
async function resolveSeriesConfig(params, env, user) {
  const metrics = resolveMetrics2(params.metric);
  if (!metrics.length) {
    return { ok: false, status: 400, error: "Invalid metrics" };
  }
  const bucketMs = resolveInterval2(params.interval ?? "5m");
  if (!bucketMs) {
    return { ok: false, status: 400, error: "Invalid interval" };
  }
  const now = Date.now();
  const endMs = clampTimestamp2(params.end, now);
  if (endMs === null) {
    return { ok: false, status: 400, error: "Invalid end timestamp" };
  }
  const defaultStart = endMs - 24 * 60 * 60 * 1e3;
  let startMs = clampTimestamp2(params.start, defaultStart);
  if (startMs === null) {
    return { ok: false, status: 400, error: "Invalid start timestamp" };
  }
  if (startMs >= endMs) {
    return { ok: false, status: 400, error: "Start must be before end" };
  }
  const limit = params.limit ?? 288;
  const maxWindow = limit * bucketMs;
  if (endMs - startMs > maxWindow) {
    startMs = endMs - maxWindow;
  }
  const scope = buildDeviceScope(user, "d");
  const isAdmin = scope.isAdmin;
  const fillMode = params.fill === "carry" ? "carry" : "none";
  const tenantPrecision = isAdmin ? 4 : 2;
  const conditions = ["t.ts BETWEEN params.start_ms AND params.end_ms"];
  const bindings = [];
  let scopeDescriptor;
  if (params.scope === "device") {
    if (!params.device) {
      return { ok: false, status: 400, error: "Device parameter is required for device scope" };
    }
    const resolvedId = await resolveDeviceId(params.device, env, isAdmin);
    if (!resolvedId) {
      return { ok: false, status: 404, error: "Device not found" };
    }
    const row = await env.DB.prepare(`SELECT device_id, profile_id FROM devices WHERE device_id = ?1 LIMIT 1`).bind(resolvedId).first();
    if (!row) {
      return { ok: false, status: 404, error: "Device not found" };
    }
    if (!isAdmin) {
      const allowed = scope.bind ?? [];
      if (!allowed.includes(row.profile_id ?? "")) {
        return { ok: false, status: 403, error: "Forbidden" };
      }
    }
    conditions.push("t.device_id = ?");
    bindings.push(row.device_id);
    const outwardId = presentDeviceId(row.device_id, isAdmin);
    const lookup = await buildDeviceLookup(row.device_id, env, isAdmin);
    scopeDescriptor = { type: "device", device_id: outwardId, lookup };
  } else if (params.scope === "profile") {
    if (isAdmin) {
      if (!params.profile) {
        return { ok: false, status: 400, error: "Profile parameter is required for profile scope" };
      }
      const clause = buildInClause2("d.profile_id", [params.profile]);
      conditions.push(clause);
      bindings.push(params.profile);
      scopeDescriptor = { type: "profile", profile_ids: [params.profile] };
    } else {
      const allowed = scope.bind ?? [];
      if (!allowed.length) {
        conditions.push("1=0");
        scopeDescriptor = { type: "profile", profile_ids: [] };
      } else {
        let selected;
        if (params.profile) {
          if (!allowed.includes(params.profile)) {
            return { ok: false, status: 403, error: "Forbidden" };
          }
          selected = [params.profile];
        } else if (allowed.length === 1) {
          selected = [...allowed];
        } else {
          return { ok: false, status: 400, error: "Profile parameter required for scoped users" };
        }
        const clause = buildInClause2("d.profile_id", selected);
        conditions.push(clause);
        bindings.push(...selected);
        scopeDescriptor = { type: "profile", profile_ids: selected };
      }
    }
  } else {
    if (isAdmin) {
      if (params.profile) {
        const clause = buildInClause2("d.profile_id", [params.profile]);
        conditions.push(clause);
        bindings.push(params.profile);
        scopeDescriptor = { type: "fleet", profile_ids: [params.profile] };
      } else {
        scopeDescriptor = { type: "fleet", profile_ids: null };
      }
    } else {
      const allowed = scope.bind ?? [];
      if (!allowed.length) {
        conditions.push("1=0");
        scopeDescriptor = { type: "fleet", profile_ids: [] };
      } else {
        let selected = [...allowed];
        if (params.profile) {
          if (!allowed.includes(params.profile)) {
            return { ok: false, status: 403, error: "Forbidden" };
          }
          selected = [params.profile];
        }
        const clause = buildInClause2("d.profile_id", selected);
        conditions.push(clause);
        bindings.push(...selected);
        scopeDescriptor = { type: "fleet", profile_ids: selected };
      }
    }
  }
  if (!isAdmin && scope.clause) {
    conditions.push(scope.clause);
    bindings.push(...scope.bind);
  }
  const whereClause = conditions.join(" AND ");
  return {
    ok: true,
    config: {
      bucketMs,
      startMs,
      endMs,
      metrics,
      whereClause,
      bindings,
      scopeDescriptor,
      fillMode,
      tenantPrecision
    }
  };
}
__name(resolveSeriesConfig, "resolveSeriesConfig");
function resolveMetrics2(csv) {
  if (!csv) return [...TELEMETRY_ALLOWED_METRICS];
  const parts = csv.split(",").map((part) => part.trim()).filter(Boolean);
  const allowed = new Set(TELEMETRY_ALLOWED_METRICS);
  return parts.filter((part) => allowed.has(part));
}
__name(resolveMetrics2, "resolveMetrics");
function resolveInterval2(interval) {
  if (!interval) return TELEMETRY_INTERVALS_MS["5m"];
  return TELEMETRY_INTERVALS_MS[interval] ?? null;
}
__name(resolveInterval2, "resolveInterval");
function clampTimestamp2(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = String(value).trim();
  if (!trimmed) return fallback;
  if (/^\d+$/.test(trimmed)) {
    const parsed2 = Number.parseInt(trimmed, 10);
    return Number.isNaN(parsed2) ? null : parsed2;
  }
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}
__name(clampTimestamp2, "clampTimestamp");
function buildInClause2(column, values) {
  if (!values.length) return "1=0";
  const placeholders = values.map(() => "?").join(",");
  return `${column} IN (${placeholders})`;
}
__name(buildInClause2, "buildInClause");
function buildSeriesSql2(whereClause) {
  return `
    WITH params AS (
      SELECT ? AS bucket_ms, ? AS start_ms, ? AS end_ms
    ),
    scoped AS (
      SELECT
        (CAST(t.ts / params.bucket_ms AS INTEGER) * params.bucket_ms) AS bucket_start_ms,
        t.device_id,
        t.deltaT,
        t.thermalKW,
        t.cop,
        json_extract(t.metrics_json, '$.supplyC') AS supplyC,
        json_extract(t.metrics_json, '$.returnC') AS returnC,
        json_extract(t.metrics_json, '$.flowLps') AS flowLps,
        json_extract(t.metrics_json, '$.powerKW') AS powerKW
      FROM telemetry t
      JOIN devices d ON d.device_id = t.device_id
      JOIN params
      WHERE ${whereClause}
    ),
    per_device AS (
      SELECT
        bucket_start_ms,
        device_id,
        COUNT(*) AS sample_count,
        AVG(deltaT) AS avg_deltaT,
        MIN(deltaT) AS min_deltaT,
        MAX(deltaT) AS max_deltaT,
        AVG(thermalKW) AS avg_thermalKW,
        MIN(thermalKW) AS min_thermalKW,
        MAX(thermalKW) AS max_thermalKW,
        AVG(cop) AS avg_cop,
        MIN(cop) AS min_cop,
        MAX(cop) AS max_cop,
        AVG(supplyC) AS avg_supplyC,
        AVG(returnC) AS avg_returnC,
        AVG(flowLps) AS avg_flowLps,
        AVG(powerKW) AS avg_powerKW
      FROM scoped
      GROUP BY bucket_start_ms, device_id
    ),
    aggregated AS (
      SELECT
        bucket_start_ms,
        SUM(sample_count) AS sample_count,
        AVG(avg_deltaT) AS avg_deltaT,
        MIN(min_deltaT) AS min_deltaT,
        MAX(max_deltaT) AS max_deltaT,
        AVG(avg_thermalKW) AS avg_thermalKW,
        MIN(min_thermalKW) AS min_thermalKW,
        MAX(max_thermalKW) AS max_thermalKW,
        AVG(avg_cop) AS avg_cop,
        MIN(min_cop) AS min_cop,
        MAX(max_cop) AS max_cop,
        AVG(avg_supplyC) AS avg_supplyC,
        AVG(avg_returnC) AS avg_returnC,
        AVG(avg_flowLps) AS avg_flowLps,
        AVG(avg_powerKW) AS avg_powerKW
      FROM per_device
      GROUP BY bucket_start_ms
    )
    SELECT *
    FROM aggregated
    ORDER BY bucket_start_ms ASC
  `;
}
__name(buildSeriesSql2, "buildSeriesSql");
async function fetchLatestRows(env, deviceIds, scope) {
  const rows = [];
  for (let i = 0; i < deviceIds.length; i += LATEST_BATCH_CHUNK) {
    const chunk = deviceIds.slice(i, i + LATEST_BATCH_CHUNK);
    const placeholders = chunk.map(() => "?").join(",");
    let where = `ls.device_id IN (${placeholders})`;
    const bind = [...chunk];
    if (!scope.isAdmin && scope.clause) {
      where = andWhere(where, scope.clause.replace(/^WHERE\s+/i, ""));
      bind.push(...scope.bind);
    }
    const query = `
      SELECT
        ls.device_id,
        ls.ts,
        ls.updated_at,
        ls.supplyC,
        ls.returnC,
        ls.tankC,
        ls.ambientC,
        ls.flowLps,
        ls.compCurrentA,
        ls.eevSteps,
        ls.powerKW,
        ls.deltaT,
        ls.thermalKW,
        ls.cop,
        ls.cop_quality,
        ls.mode,
        ls.defrost,
        ls.online AS latest_online,
        ls.faults_json,
        ls.payload_json,
        d.profile_id,
        d.site,
        d.online AS device_online,
        d.last_seen_at
      FROM latest_state ls
      JOIN devices d ON d.device_id = ls.device_id
      WHERE ${where}
    `;
    const result = await env.DB.prepare(query).bind(...bind).all();
    rows.push(...result.results ?? []);
  }
  return rows;
}
__name(fetchLatestRows, "fetchLatestRows");
async function presentLatestRow(row, env, isAdmin, include) {
  const lookup = await buildDeviceLookup(row.device_id, env, isAdmin);
  const outwardId = presentDeviceId(row.device_id, isAdmin);
  const payload = safeParseJson2(row.payload_json);
  const latest = {
    ts: row.ts ?? null,
    updated_at: row.updated_at ?? null,
    online: row.latest_online === 1,
    mode: row.mode ?? null,
    defrost: row.defrost ?? null,
    cop_quality: row.cop_quality ?? null,
    payload
  };
  if (include.metrics !== false) {
    latest.supplyC = maskTelemetryNumber(row.supplyC, isAdmin);
    latest.returnC = maskTelemetryNumber(row.returnC, isAdmin);
    latest.tankC = maskTelemetryNumber(row.tankC, isAdmin);
    latest.ambientC = maskTelemetryNumber(row.ambientC, isAdmin);
    latest.flowLps = maskTelemetryNumber(row.flowLps, isAdmin, 3);
    latest.compCurrentA = maskTelemetryNumber(row.compCurrentA, isAdmin, 2);
    latest.eevSteps = maskTelemetryNumber(row.eevSteps, isAdmin, 0);
    latest.powerKW = maskTelemetryNumber(row.powerKW, isAdmin, 3);
    latest.deltaT = maskTelemetryNumber(row.deltaT, isAdmin, 2);
    latest.thermalKW = maskTelemetryNumber(row.thermalKW, isAdmin, 3);
    latest.cop = maskTelemetryNumber(row.cop, isAdmin, 2);
  }
  if (include.faults !== false) {
    latest.faults = parseFaultsJson(row.faults_json);
  }
  return {
    lookup,
    device_id: outwardId,
    profile_id: row.profile_id ?? null,
    site: row.site ?? null,
    online: row.device_online === 1,
    last_seen_at: row.last_seen_at ?? null,
    latest
  };
}
__name(presentLatestRow, "presentLatestRow");
function buildSeriesResponse(rows, options) {
  const { startMs, endMs, bucketMs, metrics, fillMode, isAdmin, tenantPrecision } = options;
  const map = /* @__PURE__ */ new Map();
  for (const row of rows) {
    map.set(row.bucket_start_ms, row);
  }
  const startBucket = Math.floor(startMs / bucketMs) * bucketMs;
  const endBucket = Math.floor(endMs / bucketMs) * bucketMs;
  const buckets = [];
  if (fillMode === "carry") {
    let current = startBucket;
    let lastValues = null;
    while (current <= endBucket) {
      const row = map.get(current);
      if (row) {
        buckets.push(row);
        lastValues = captureLastValues(row);
      } else if (lastValues) {
        buckets.push({
          bucket_start_ms: current,
          sample_count: 0,
          avg_deltaT: lastValues.deltaT,
          min_deltaT: lastValues.deltaT,
          max_deltaT: lastValues.deltaT,
          avg_thermalKW: lastValues.thermalKW,
          min_thermalKW: lastValues.thermalKW,
          max_thermalKW: lastValues.thermalKW,
          avg_cop: lastValues.cop,
          min_cop: lastValues.cop,
          max_cop: lastValues.cop,
          avg_supplyC: lastValues.supplyC,
          avg_returnC: lastValues.returnC,
          avg_flowLps: lastValues.flowLps,
          avg_powerKW: lastValues.powerKW
        });
      }
      current += bucketMs;
    }
  } else {
    buckets.push(...rows);
  }
  return buckets.map((row) => ({
    bucket_start: new Date(row.bucket_start_ms).toISOString(),
    sample_count: row.sample_count,
    values: buildMetricValues(row, metrics, isAdmin, tenantPrecision)
  }));
}
__name(buildSeriesResponse, "buildSeriesResponse");
function captureLastValues(row) {
  return {
    deltaT: row.avg_deltaT,
    thermalKW: row.avg_thermalKW,
    cop: row.avg_cop,
    supplyC: row.avg_supplyC,
    returnC: row.avg_returnC,
    flowLps: row.avg_flowLps,
    powerKW: row.avg_powerKW
  };
}
__name(captureLastValues, "captureLastValues");
function buildMetricValues(row, metrics, isAdmin, tenantPrecision) {
  const values = {};
  for (const metric of metrics) {
    const entry = {};
    const avg = averageForMetric(row, metric);
    entry.avg = maskTelemetryNumber(avg, isAdmin, tenantPrecision, 4);
    if (METRICS_WITH_EXTENTS.has(metric)) {
      const minVal = minForMetric(row, metric);
      const maxVal = maxForMetric(row, metric);
      entry.min = maskTelemetryNumber(minVal, isAdmin, tenantPrecision, 4);
      entry.max = maskTelemetryNumber(maxVal, isAdmin, tenantPrecision, 4);
    }
    values[metric] = entry;
  }
  return values;
}
__name(buildMetricValues, "buildMetricValues");
function averageForMetric(row, metric) {
  switch (metric) {
    case "deltaT":
      return row.avg_deltaT;
    case "thermalKW":
      return row.avg_thermalKW;
    case "cop":
      return row.avg_cop;
    case "supplyC":
      return row.avg_supplyC;
    case "returnC":
      return row.avg_returnC;
    case "flowLps":
      return row.avg_flowLps;
    case "powerKW":
      return row.avg_powerKW;
    default:
      return null;
  }
}
__name(averageForMetric, "averageForMetric");
function minForMetric(row, metric) {
  switch (metric) {
    case "deltaT":
      return row.min_deltaT;
    case "thermalKW":
      return row.min_thermalKW;
    case "cop":
      return row.min_cop;
    default:
      return null;
  }
}
__name(minForMetric, "minForMetric");
function maxForMetric(row, metric) {
  switch (metric) {
    case "deltaT":
      return row.max_deltaT;
    case "thermalKW":
      return row.max_thermalKW;
    case "cop":
      return row.max_cop;
    default:
      return null;
  }
}
__name(maxForMetric, "maxForMetric");
function safeParseJson2(payload) {
  if (!payload) return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}
__name(safeParseJson2, "safeParseJson");
function dedupePreserveOrder(requested, extra) {
  const seen = /* @__PURE__ */ new Set();
  const output = [];
  const extraSet = new Set(extra);
  for (const token of requested) {
    if (extraSet.has(token) && !seen.has(token)) {
      seen.add(token);
      output.push(token);
    }
  }
  for (const token of extra) {
    if (!seen.has(token)) {
      seen.add(token);
      output.push(token);
    }
  }
  return output;
}
__name(dedupePreserveOrder, "dedupePreserveOrder");

// src/routes/telemetry.ts
var METRICS_WITH_EXTENTS2 = new Set(
  TELEMETRY_ALLOWED_METRICS.filter(
    (metric) => metric === "deltaT" || metric === "thermalKW" || metric === "cop"
  )
);
var DEFAULT_CARRY_FORWARD_MINUTES = 30;
function resolveCarryForwardLimitMs(env) {
  const raw = typeof env.TELEMETRY_CARRY_MAX_MINUTES === "string" ? env.TELEMETRY_CARRY_MAX_MINUTES.trim() : "";
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed * 60 * 1e3;
    }
  }
  return DEFAULT_CARRY_FORWARD_MINUTES * 60 * 1e3;
}
__name(resolveCarryForwardLimitMs, "resolveCarryForwardLimitMs");
async function handleTelemetryLatestBatch(req, env, ctx) {
  const mode = getTelemetryFeatureMode(env);
  if (mode === "legacy") {
    return legacyHandleTelemetryLatestBatch(req, env);
  }
  const shadowReq = mode === "compare" ? req.clone() : null;
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = validateWithSchema(TelemetryLatestBatchSchema, payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.issues);
  }
  const body = parsed.data;
  const resolution = await resolveLatestBatchDevices(env, user, body.devices);
  const { scope, requested, resolvedIds, missingTokens } = resolution;
  if (body.devices.length === 0) {
    const response2 = json({ generated_at: nowISO(), items: [], missing: [] });
    if (shadowReq) {
      scheduleShadowComparison(
        ctx,
        runLegacyShadowComparison(
          req,
          shadowReq,
          env,
          legacyHandleTelemetryLatestBatch,
          response2.clone(),
          "/api/telemetry/latest-batch"
        )
      );
    }
    return response2;
  }
  if (scope.empty && !scope.isAdmin) {
    const response2 = json({
      generated_at: nowISO(),
      items: [],
      missing: [...new Set(body.devices)]
    });
    if (shadowReq) {
      scheduleShadowComparison(
        ctx,
        runLegacyShadowComparison(
          req,
          shadowReq,
          env,
          legacyHandleTelemetryLatestBatch,
          response2.clone(),
          "/api/telemetry/latest-batch"
        )
      );
    }
    return response2;
  }
  if (!resolvedIds.length) {
    const response2 = json({
      generated_at: nowISO(),
      items: [],
      missing: dedupePreserveOrder2(body.devices, missingTokens)
    });
    if (shadowReq) {
      scheduleShadowComparison(
        ctx,
        runLegacyShadowComparison(
          req,
          shadowReq,
          env,
          legacyHandleTelemetryLatestBatch,
          response2.clone(),
          "/api/telemetry/latest-batch"
        )
      );
    }
    return response2;
  }
  const rows = await fetchLatestTelemetryBatch(env, resolvedIds, scope);
  const rowMap = new Map(rows.map((row) => [row.device_id, row]));
  const include = body.include ?? { faults: true, metrics: true };
  const items = [];
  const seen = /* @__PURE__ */ new Set();
  const missingSet = new Set(missingTokens);
  for (const entry of requested) {
    if (!entry.resolved) continue;
    if (seen.has(entry.resolved)) continue;
    const row = rowMap.get(entry.resolved);
    if (!row) {
      missingSet.add(entry.token);
      continue;
    }
    seen.add(entry.resolved);
    try {
      const formatted = await presentLatestBatchRow(row, env, include, user);
      items.push(formatted);
    } catch (error) {
      loggerForRequest(req, { route: "/api/telemetry/latest-batch" }).error(
        "telemetry.latest_batch.present_failed",
        { error, device_id: entry.resolved, mode }
      );
    }
  }
  const response = json({
    generated_at: nowISO(),
    items,
    missing: dedupePreserveOrder2(body.devices, Array.from(missingSet))
  });
  if (shadowReq) {
    scheduleShadowComparison(
      ctx,
      runLegacyShadowComparison(
        req,
        shadowReq,
        env,
        legacyHandleTelemetryLatestBatch,
        response.clone(),
        "/api/telemetry/latest-batch"
      )
    );
  }
  return response;
}
__name(handleTelemetryLatestBatch, "handleTelemetryLatestBatch");
async function handleTelemetrySeries(req, env, ctx) {
  const mode = getTelemetryFeatureMode(env);
  if (mode === "legacy") {
    return legacyHandleTelemetrySeries(req, env);
  }
  const shadowReq = mode === "compare" ? req.clone() : null;
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const rawQuery = {};
  const searchEntries = url.searchParams;
  for (const [key, value] of searchEntries) {
    rawQuery[key] = value;
  }
  const parsed = TelemetrySeriesQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }
  const result = await resolveTelemetrySeriesConfig(parsed.data, env, user);
  if (!result.ok) {
    if (result.status === 400) {
      return json({ error: result.error }, { status: 400 });
    }
    if (result.status === 403) {
      return json({ error: "Forbidden" }, { status: 403 });
    }
    if (result.status === 404) {
      return json({ error: "Not found" }, { status: 404 });
    }
    return json({ error: "Server error" }, { status: 500 });
  }
  const { config } = result;
  const rows = await fetchTelemetrySeries(env, config);
  const carryForwardLimitMs = resolveCarryForwardLimitMs(env);
  const series = buildSeriesResponse2(rows, {
    startMs: config.startMs,
    endMs: config.endMs,
    bucketMs: config.bucketMs,
    metrics: config.metrics,
    fillMode: config.fillMode,
    isAdmin: userIsAdmin(user),
    tenantPrecision: config.tenantPrecision,
    carryForwardLimitMs
  });
  const response = json({
    generated_at: nowISO(),
    scope: config.scopeDescriptor,
    interval_ms: config.bucketMs,
    window: {
      start: new Date(config.startMs).toISOString(),
      end: new Date(config.endMs).toISOString()
    },
    metrics: config.metrics,
    series
  });
  if (shadowReq) {
    scheduleShadowComparison(
      ctx,
      runLegacyShadowComparison(
        req,
        shadowReq,
        env,
        legacyHandleTelemetrySeries,
        response.clone(),
        "/api/telemetry/series"
      )
    );
  }
  return response;
}
__name(handleTelemetrySeries, "handleTelemetrySeries");
function buildSeriesResponse2(rows, options) {
  const {
    startMs,
    endMs,
    bucketMs,
    metrics,
    fillMode,
    isAdmin,
    tenantPrecision,
    carryForwardLimitMs
  } = options;
  const map = /* @__PURE__ */ new Map();
  for (const row of rows) {
    map.set(row.bucket_start_ms, row);
  }
  const startBucket = Math.floor(startMs / bucketMs) * bucketMs;
  const endBucket = Math.floor(endMs / bucketMs) * bucketMs;
  const buckets = [];
  if (fillMode === "carry") {
    let current = startBucket;
    let lastValues = null;
    let lastRealBucketMs = null;
    while (current <= endBucket) {
      const row = map.get(current);
      if (row) {
        buckets.push({ row, stale: false });
        lastRealBucketMs = current;
        lastValues = captureLastValues2(row);
      } else if (lastValues) {
        if (lastRealBucketMs === null || current - lastRealBucketMs > carryForwardLimitMs) {
          lastValues = null;
          lastRealBucketMs = null;
        } else {
          const syntheticRow = {
            bucket_start_ms: current,
            sample_count: 0,
            avg_deltaT: lastValues.deltaT,
            min_deltaT: lastValues.deltaT,
            max_deltaT: lastValues.deltaT,
            avg_thermalKW: lastValues.thermalKW,
            min_thermalKW: lastValues.thermalKW,
            max_thermalKW: lastValues.thermalKW,
            avg_cop: lastValues.cop,
            min_cop: lastValues.cop,
            max_cop: lastValues.cop,
            avg_supplyC: lastValues.supplyC,
            avg_returnC: lastValues.returnC,
            avg_flowLps: lastValues.flowLps,
            avg_powerKW: lastValues.powerKW
          };
          buckets.push({ row: syntheticRow, stale: true });
        }
      }
      current += bucketMs;
    }
  } else {
    for (const row of rows) {
      buckets.push({ row, stale: false });
    }
  }
  return buckets.map(({ row, stale }) => ({
    bucket_start: new Date(row.bucket_start_ms).toISOString(),
    sample_count: row.sample_count,
    stale,
    values: buildMetricValues2(row, metrics, isAdmin, tenantPrecision)
  }));
}
__name(buildSeriesResponse2, "buildSeriesResponse");
function captureLastValues2(row) {
  return {
    deltaT: row.avg_deltaT,
    thermalKW: row.avg_thermalKW,
    cop: row.avg_cop,
    supplyC: row.avg_supplyC,
    returnC: row.avg_returnC,
    flowLps: row.avg_flowLps,
    powerKW: row.avg_powerKW
  };
}
__name(captureLastValues2, "captureLastValues");
function buildMetricValues2(row, metrics, isAdmin, tenantPrecision) {
  const values = {};
  for (const metric of metrics) {
    const entry = {};
    const avg = averageForMetric2(row, metric);
    entry.avg = maskTelemetryNumber(avg, isAdmin, tenantPrecision, 4);
    if (METRICS_WITH_EXTENTS2.has(metric)) {
      const minVal = minForMetric2(row, metric);
      const maxVal = maxForMetric2(row, metric);
      entry.min = maskTelemetryNumber(minVal, isAdmin, tenantPrecision, 4);
      entry.max = maskTelemetryNumber(maxVal, isAdmin, tenantPrecision, 4);
    }
    values[metric] = entry;
  }
  return values;
}
__name(buildMetricValues2, "buildMetricValues");
function averageForMetric2(row, metric) {
  switch (metric) {
    case "deltaT":
      return row.avg_deltaT;
    case "thermalKW":
      return row.avg_thermalKW;
    case "cop":
      return row.avg_cop;
    case "supplyC":
      return row.avg_supplyC;
    case "returnC":
      return row.avg_returnC;
    case "flowLps":
      return row.avg_flowLps;
    case "powerKW":
      return row.avg_powerKW;
    default:
      return null;
  }
}
__name(averageForMetric2, "averageForMetric");
function minForMetric2(row, metric) {
  switch (metric) {
    case "deltaT":
      return row.min_deltaT;
    case "thermalKW":
      return row.min_thermalKW;
    case "cop":
      return row.min_cop;
    default:
      return null;
  }
}
__name(minForMetric2, "minForMetric");
function maxForMetric2(row, metric) {
  switch (metric) {
    case "deltaT":
      return row.max_deltaT;
    case "thermalKW":
      return row.max_thermalKW;
    case "cop":
      return row.max_cop;
    default:
      return null;
  }
}
__name(maxForMetric2, "maxForMetric");
function dedupePreserveOrder2(requested, extra) {
  const seen = /* @__PURE__ */ new Set();
  const output = [];
  const extraSet = new Set(extra);
  for (const token of requested) {
    if (extraSet.has(token) && !seen.has(token)) {
      seen.add(token);
      output.push(token);
    }
  }
  for (const token of extra) {
    if (!seen.has(token)) {
      seen.add(token);
      output.push(token);
    }
  }
  return output;
}
__name(dedupePreserveOrder2, "dedupePreserveOrder");
function getTelemetryFeatureMode(env) {
  const raw = String(env.TELEMETRY_REFACTOR_MODE ?? "").trim().toLowerCase();
  if (raw === "legacy" || raw === "off") {
    return "legacy";
  }
  if (raw === "compare" || raw === "shadow" || raw === "dark") {
    return "compare";
  }
  return "refactor";
}
__name(getTelemetryFeatureMode, "getTelemetryFeatureMode");
function scheduleShadowComparison(ctx, work) {
  if (ctx) {
    ctx.waitUntil(work);
  } else {
    void work;
  }
}
__name(scheduleShadowComparison, "scheduleShadowComparison");
async function runLegacyShadowComparison(req, legacyReq, env, handler, refactorResponse, route) {
  try {
    const legacyResponse = await handler(legacyReq, env);
    await compareResponses(req, refactorResponse, legacyResponse, route);
  } catch (error) {
    loggerForRequest(req, { route }).warn("telemetry.refactor.shadow_failed", { error });
  }
}
__name(runLegacyShadowComparison, "runLegacyShadowComparison");
async function compareResponses(req, refactorResponse, legacyResponse, route) {
  try {
    const refactorBody = await extractBody(refactorResponse);
    const legacyBody = await extractBody(legacyResponse);
    const statusMismatch = refactorResponse.status !== legacyResponse.status;
    const bodyMismatch = !deepEqual(refactorBody, legacyBody);
    if (statusMismatch || bodyMismatch) {
      loggerForRequest(req, { route }).warn("telemetry.refactor.shadow_mismatch", {
        refactor_status: refactorResponse.status,
        legacy_status: legacyResponse.status,
        refactor_body: refactorBody,
        legacy_body: legacyBody
      });
    }
  } catch (error) {
    loggerForRequest(req, { route }).warn("telemetry.refactor.shadow_compare_failed", { error });
  }
}
__name(compareResponses, "compareResponses");
async function extractBody(response) {
  const text2 = await response.text();
  if (!text2) return null;
  try {
    return JSON.parse(text2);
  } catch {
    return text2;
  }
}
__name(extractBody, "extractBody");
function deepEqual(lhs, rhs) {
  return JSON.stringify(lhs) === JSON.stringify(rhs);
}
__name(deepEqual, "deepEqual");

// src/router/telemetry.ts
function registerTelemetryRoutes(router2) {
  router2.post(
    "/api/telemetry/latest-batch",
    withAccess((req, env, ctx) => handleTelemetryLatestBatch(req, env, ctx))
  ).get(
    "/api/telemetry/series",
    withAccess((req, env, ctx) => handleTelemetrySeries(req, env, ctx))
  );
}
__name(registerTelemetryRoutes, "registerTelemetryRoutes");

// src/schemas/alerts.ts
var ALERT_SEVERITIES = ["info", "warning", "critical"];
var ALERT_STATUSES = ["open", "acknowledged", "resolved"];
var ALERT_ACTIONS = ["acknowledge", "assign", "resolve"];
var AlertSeveritySchema = external_exports.enum(ALERT_SEVERITIES);
var AlertStatusSchema = external_exports.enum(ALERT_STATUSES);
var AlertActionSchema = external_exports.enum(ALERT_ACTIONS);
var AlertsQuerySchema = external_exports.object({
  limit: numericParam({ integer: true, min: 1, max: 100, defaultValue: 40 }),
  hours: numericParam({ integer: true, min: 1, max: 168, defaultValue: 72 })
}).strict();
var AlertListQuerySchema = external_exports.object({
  status: AlertStatusSchema.optional(),
  severity: AlertSeveritySchema.optional(),
  device: external_exports.string().trim().min(1).optional(),
  profile: external_exports.string().trim().min(1).optional(),
  limit: numericParam({ integer: true, min: 1, max: 200, defaultValue: 50 }),
  since: external_exports.string().datetime({ offset: true }).optional(),
  until: external_exports.string().datetime({ offset: true }).optional()
}).strict();
var CreateAlertSchema = external_exports.object({
  alert_id: external_exports.string().trim().min(1).optional(),
  device_id: external_exports.string().trim().min(1),
  profile_id: external_exports.string().trim().min(1).optional(),
  alert_type: external_exports.string().trim().min(1),
  severity: AlertSeveritySchema.default("info"),
  status: AlertStatusSchema.default("open"),
  summary: external_exports.string().trim().min(1).max(240).optional(),
  description: external_exports.string().trim().min(1).max(4e3).optional(),
  metadata: external_exports.record(external_exports.any()).optional(),
  acknowledged_at: external_exports.string().datetime({ offset: true }).optional(),
  resolved_at: external_exports.string().datetime({ offset: true }).nullable().optional(),
  resolved_by: external_exports.string().trim().min(1).optional(),
  assigned_to: external_exports.string().trim().min(1).optional()
}).strict();
var CommentSchema = external_exports.string().trim().min(1, "Comment must not be empty").max(2e3, "Comment must be 2000 characters or fewer");
var AssigneeSchema = external_exports.string().trim().min(1).max(200);
var AlertLifecycleActionSchema = external_exports.discriminatedUnion("action", [
  external_exports.object({
    action: external_exports.literal("acknowledge"),
    comment: CommentSchema.optional(),
    assignee: AssigneeSchema.optional()
  }).strict(),
  external_exports.object({
    action: external_exports.literal("assign"),
    assignee: AssigneeSchema,
    comment: CommentSchema.optional()
  }).strict(),
  external_exports.object({
    action: external_exports.literal("resolve"),
    comment: CommentSchema.optional()
  }).strict()
]);
var AlertCommentCreateSchema = external_exports.object({
  comment: CommentSchema
}).strict();

// src/lib/db.ts
var foreignKeysEnabled = false;
async function enableForeignKeys(db) {
  if (foreignKeysEnabled) return;
  try {
    await db.prepare("PRAGMA foreign_keys = ON").run();
    foreignKeysEnabled = true;
  } catch (error) {
    systemLogger({ scope: "db" }).warn("db.enable_foreign_keys_failed", { error });
  }
}
__name(enableForeignKeys, "enableForeignKeys");
async function withTransaction(db, work) {
  await enableForeignKeys(db);
  await db.prepare("BEGIN IMMEDIATE").run();
  try {
    const result = await work();
    await db.prepare("COMMIT").run();
    return result;
  } catch (error) {
    try {
      await db.prepare("ROLLBACK").run();
    } catch (rollbackError) {
      systemLogger({ scope: "db" }).error("db.transaction_rollback_failed", {
        error: rollbackError,
        original_error: error
      });
    }
    throw error;
  }
}
__name(withTransaction, "withTransaction");

// src/lib/alerts-store.ts
function mapAlertRow(row) {
  let metadata = null;
  if (row.metadata_json) {
    try {
      const parsed = JSON.parse(row.metadata_json);
      if (parsed && typeof parsed === "object") metadata = parsed;
    } catch {
      metadata = null;
    }
  }
  return {
    alert_id: row.alert_id,
    device_id: row.device_id,
    profile_id: row.profile_id,
    alert_type: row.alert_type,
    severity: row.severity,
    status: row.status,
    summary: row.summary,
    description: row.description,
    metadata,
    acknowledged_at: row.acknowledged_at,
    resolved_at: row.resolved_at,
    resolved_by: row.resolved_by,
    assigned_to: row.assigned_to,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
__name(mapAlertRow, "mapAlertRow");
async function createAlert(env, params) {
  const deviceId = params.device_id;
  const id = params.alert_id ?? crypto.randomUUID();
  const createdAt = params.created_at ?? nowISO();
  const updatedAt = params.updated_at ?? createdAt;
  const acknowledgedAt = params.acknowledged_at ?? null;
  const resolvedAt = params.resolved_at ?? null;
  const resolvedBy = params.resolved_by ?? null;
  const assignedTo = params.assigned_to ?? null;
  const summary = params.summary ?? null;
  const description = params.description ?? null;
  const metadataJson = params.metadata ? JSON.stringify(params.metadata) : null;
  let profileId = params.profile_id ?? null;
  if (!profileId) {
    const deviceRow = await env.DB.prepare(`SELECT profile_id FROM devices WHERE device_id = ?1 LIMIT 1`).bind(deviceId).first();
    if (!deviceRow) {
      return { ok: false, reason: "device_not_found" };
    }
    profileId = deviceRow.profile_id ?? null;
  } else {
    const exists = await env.DB.prepare(`SELECT 1 FROM devices WHERE device_id = ?1 LIMIT 1`).bind(deviceId).first();
    if (!exists) {
      return { ok: false, reason: "device_not_found" };
    }
  }
  try {
    await env.DB.prepare(
      `INSERT INTO alerts (
            alert_id, device_id, profile_id, alert_type, severity, status,
            summary, description, metadata_json, acknowledged_at, resolved_at,
            resolved_by, assigned_to, created_at, updated_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)`
    ).bind(
      id,
      deviceId,
      profileId,
      params.alert_type,
      params.severity,
      params.status,
      summary,
      description,
      metadataJson,
      acknowledgedAt,
      resolvedAt,
      resolvedBy,
      assignedTo,
      createdAt,
      updatedAt
    ).run();
  } catch (err) {
    const message2 = typeof err?.message === "string" ? err.message : String(err);
    if (message2.includes("UNIQUE constraint failed")) {
      return { ok: false, reason: "conflict" };
    }
    throw err;
  }
  const row = await env.DB.prepare(`SELECT * FROM alerts WHERE alert_id = ?1 LIMIT 1`).bind(id).first();
  if (!row) {
    return { ok: false, reason: "device_not_found" };
  }
  return { ok: true, alert: mapAlertRow(row) };
}
__name(createAlert, "createAlert");
async function listAlerts(env, filters) {
  let where = "";
  const bind = [];
  if (filters.status) {
    where = andWhere(where, "status = ?");
    bind.push(filters.status);
  }
  if (filters.severity) {
    where = andWhere(where, "severity = ?");
    bind.push(filters.severity);
  }
  if (filters.device_id) {
    where = andWhere(where, "device_id = ?");
    bind.push(filters.device_id);
  }
  if (filters.profile_ids && filters.profile_ids.length) {
    const placeholders = filters.profile_ids.map(() => "?").join(",");
    where = andWhere(where, `profile_id IN (${placeholders})`);
    bind.push(...filters.profile_ids);
  } else if (filters.profile_id) {
    where = andWhere(where, "profile_id = ?");
    bind.push(filters.profile_id);
  }
  if (filters.since) {
    where = andWhere(where, "created_at >= ?");
    bind.push(filters.since);
  }
  if (filters.until) {
    where = andWhere(where, "created_at <= ?");
    bind.push(filters.until);
  }
  const sql = `SELECT * FROM alerts ${where} ORDER BY created_at DESC LIMIT ?`;
  bind.push(filters.limit);
  const rows = await env.DB.prepare(sql).bind(...bind).all();
  return (rows.results ?? []).map(mapAlertRow);
}
__name(listAlerts, "listAlerts");
function mapAlertCommentRow(row) {
  let metadata = null;
  if (row.metadata_json) {
    try {
      const parsed = JSON.parse(row.metadata_json);
      if (parsed && typeof parsed === "object") metadata = parsed;
    } catch {
      metadata = null;
    }
  }
  return {
    comment_id: row.comment_id,
    alert_id: row.alert_id,
    action: row.action,
    author_id: row.author_id,
    author_email: row.author_email,
    body: row.body,
    metadata,
    created_at: row.created_at
  };
}
__name(mapAlertCommentRow, "mapAlertCommentRow");
async function getAlert(env, alertId) {
  const row = await env.DB.prepare(`SELECT * FROM alerts WHERE alert_id = ?1 LIMIT 1`).bind(alertId).first();
  if (!row) return null;
  return mapAlertRow(row);
}
__name(getAlert, "getAlert");
async function updateAlertLifecycle(env, params) {
  const current = await env.DB.prepare(`SELECT * FROM alerts WHERE alert_id = ?1 LIMIT 1`).bind(params.alert_id).first();
  if (!current) {
    return { ok: false, reason: "not_found" };
  }
  const now = nowISO();
  const actorEmail = params.actor_email ?? null;
  let commentMetadata = null;
  let commentAction = params.action;
  let commentBody = params.comment ?? null;
  let shouldInsertComment = Boolean(params.comment);
  let assignedTo = current.assigned_to;
  let acknowledgedAt = current.acknowledged_at;
  let status = current.status;
  let resolvedAt = current.resolved_at;
  let resolvedBy = current.resolved_by;
  if (params.action === "acknowledge") {
    acknowledgedAt = params.acknowledged_at ?? now;
    if (current.status !== "resolved") {
      status = "acknowledged";
    }
    if (params.assignee !== void 0) {
      assignedTo = params.assignee;
      if (!params.comment) {
        commentBody = null;
      }
      if (params.assignee !== null) {
        commentMetadata = { assignee: params.assignee };
      }
      shouldInsertComment = shouldInsertComment || params.assignee !== void 0;
    }
  } else if (params.action === "assign") {
    assignedTo = params.assignee;
    commentMetadata = { assignee: params.assignee };
    shouldInsertComment = true;
    commentAction = "assign";
  } else if (params.action === "resolve") {
    status = "resolved";
    resolvedAt = params.resolved_at ?? now;
    resolvedBy = params.actor_id;
    if (!acknowledgedAt) {
      acknowledgedAt = resolvedAt;
    }
  }
  const updateStmt = env.DB.prepare(
    `UPDATE alerts
          SET status = ?2,
              acknowledged_at = ?3,
              resolved_at = ?4,
              resolved_by = ?5,
              assigned_to = ?6,
              updated_at = ?7
        WHERE alert_id = ?1`
  ).bind(
    params.alert_id,
    status,
    acknowledgedAt,
    resolvedAt,
    resolvedBy,
    assignedTo,
    now
  );
  const statements = [updateStmt];
  let commentRecord = null;
  if (shouldInsertComment) {
    const commentId = crypto.randomUUID();
    const metadataJson = commentMetadata ? JSON.stringify(commentMetadata) : null;
    const insertStmt = env.DB.prepare(
      `INSERT INTO alert_comments (
            comment_id, alert_id, action, author_id, author_email, body, metadata_json, created_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
    ).bind(
      commentId,
      params.alert_id,
      commentAction,
      params.actor_id,
      actorEmail,
      commentBody,
      metadataJson,
      now
    );
    statements.push(insertStmt);
    commentRecord = {
      comment_id: commentId,
      alert_id: params.alert_id,
      action: commentAction,
      author_id: params.actor_id,
      author_email: actorEmail,
      body: commentBody,
      metadata: commentMetadata,
      created_at: now
    };
  }
  await withTransaction(env.DB, async () => {
    for (const statement of statements) {
      await statement.run();
    }
  });
  const refreshed = await getAlert(env, params.alert_id);
  if (!refreshed) {
    return { ok: false, reason: "not_found" };
  }
  return { ok: true, alert: refreshed, comment: commentRecord };
}
__name(updateAlertLifecycle, "updateAlertLifecycle");
async function listAlertComments(env, alertId) {
  const rows = await env.DB.prepare(
    `SELECT * FROM alert_comments WHERE alert_id = ?1 ORDER BY created_at ASC, comment_id ASC`
  ).bind(alertId).all();
  return (rows.results ?? []).map(mapAlertCommentRow);
}
__name(listAlertComments, "listAlertComments");
async function listAlertCommentsForAlerts(env, alertIds) {
  const map = /* @__PURE__ */ new Map();
  if (!alertIds.length) {
    return map;
  }
  const unique = [...new Set(alertIds)];
  const placeholders = unique.map((_, idx) => `?${idx + 1}`).join(",");
  const rows = await env.DB.prepare(
    `SELECT * FROM alert_comments
         WHERE alert_id IN (${placeholders})
         ORDER BY alert_id ASC, created_at ASC, comment_id ASC`
  ).bind(...unique).all();
  for (const row of rows.results ?? []) {
    const record = mapAlertCommentRow(row);
    const bucket = map.get(record.alert_id);
    if (bucket) {
      bucket.push(record);
    } else {
      map.set(record.alert_id, [record]);
    }
  }
  for (const id of unique) {
    if (!map.has(id)) {
      map.set(id, []);
    }
  }
  return map;
}
__name(listAlertCommentsForAlerts, "listAlertCommentsForAlerts");
async function addAlertComment(env, params) {
  const now = nowISO();
  const metadataJson = params.metadata ? JSON.stringify(params.metadata) : null;
  const commentId = crypto.randomUUID();
  const insertStmt = env.DB.prepare(
    `INSERT INTO alert_comments (
          comment_id, alert_id, action, author_id, author_email, body, metadata_json, created_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
  ).bind(
    commentId,
    params.alert_id,
    params.action,
    params.actor_id,
    params.actor_email ?? null,
    params.body ?? null,
    metadataJson,
    now
  );
  const updateAlertStmt = env.DB.prepare(`UPDATE alerts SET updated_at = ?2 WHERE alert_id = ?1`).bind(params.alert_id, now);
  await withTransaction(env.DB, async () => {
    await insertStmt.run();
    await updateAlertStmt.run();
  });
  return {
    comment_id: commentId,
    alert_id: params.alert_id,
    action: params.action,
    author_id: params.actor_id,
    author_email: params.actor_email ?? null,
    body: params.body ?? null,
    metadata: params.metadata ?? null,
    created_at: now
  };
}
__name(addAlertComment, "addAlertComment");

// src/routes/alerts.ts
async function handleAlertsFeed(req, env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const scope = buildDeviceScope(user);
  const url = new URL(req.url);
  const paramsResult = AlertsQuerySchema.safeParse({
    limit: url.searchParams.get("limit"),
    hours: url.searchParams.get("hours")
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.error);
  }
  const { limit = 40, hours = 72 } = paramsResult.data;
  const sinceMs = Date.now() - hours * 60 * 60 * 1e3;
  if (scope.empty) {
    return json({ generated_at: nowISO(), items: [], stats: { total: 0, active: 0 } });
  }
  let where = "";
  const bind = [];
  if (scope.clause) {
    where = andWhere(where, scope.clause);
    bind.push(...scope.bind);
  }
  const faultsWhere = andWhere(
    andWhere(where, "t.ts >= ?"),
    "t.faults_json IS NOT NULL AND t.faults_json != '[]' AND t.faults_json != ''"
  );
  const faultRows = await env.DB.prepare(
    `SELECT t.device_id, t.ts, t.faults_json, d.site, ls.updated_at AS last_update, ls.faults_json AS latest_faults
         FROM telemetry t
         JOIN devices d ON d.device_id = t.device_id
         LEFT JOIN latest_state ls ON ls.device_id = t.device_id
         ${faultsWhere}
        ORDER BY t.ts DESC
        LIMIT ${limit}`
  ).bind(...bind, sinceMs).all();
  let items;
  try {
    items = await Promise.all(
      (faultRows.results ?? []).map(async (row) => {
        const faults = parseFaultsJson(row.faults_json);
        const activeFaults = parseFaultsJson(row.latest_faults);
        return {
          device_id: presentDeviceId(row.device_id, scope.isAdmin),
          lookup: await buildDeviceLookup(row.device_id, env, scope.isAdmin),
          site: row.site ?? null,
          ts: new Date(row.ts).toISOString(),
          fault_count: faults.length,
          faults,
          active: activeFaults.length > 0,
          active_faults: activeFaults,
          last_update: row.last_update ?? null
        };
      })
    );
  } catch (err) {
    loggerForRequest(req, { route: "/api/alerts/recent" }).error("alerts.feed_failed", {
      error: err
    });
    return json({ error: "Server error" }, { status: 500 });
  }
  const active = items.filter((i) => i.active).length;
  return json({
    generated_at: nowISO(),
    items,
    stats: {
      total: items.length,
      active
    }
  });
}
__name(handleAlertsFeed, "handleAlertsFeed");
function requestIp(req) {
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null;
}
__name(requestIp, "requestIp");
function presentAlertComment(comment) {
  return {
    comment_id: comment.comment_id,
    alert_id: comment.alert_id,
    action: comment.action,
    author_id: comment.author_id,
    author_email: comment.author_email,
    body: comment.body,
    metadata: comment.metadata,
    created_at: comment.created_at
  };
}
__name(presentAlertComment, "presentAlertComment");
async function ensureAlertAccess(env, scope, alert) {
  if (scope.isAdmin) return true;
  if (scope.empty) return false;
  const allowedProfiles = scope.bind ?? [];
  if (!allowedProfiles.length) return false;
  if (alert.profile_id && allowedProfiles.includes(alert.profile_id)) return true;
  const row = await env.DB.prepare(`SELECT profile_id FROM devices WHERE device_id = ?1 LIMIT 1`).bind(alert.device_id).first();
  const profileId = row?.profile_id ?? null;
  if (!profileId) return false;
  return allowedProfiles.includes(profileId);
}
__name(ensureAlertAccess, "ensureAlertAccess");
async function recordAlertAudit(env, req, userEmail, action, alert, extras) {
  const result = await createAuditEntry(env, {
    actor_id: userEmail,
    actor_email: userEmail,
    actor_name: null,
    action,
    entity_type: "alert",
    entity_id: alert.alert_id,
    metadata: {
      alert_id: alert.alert_id,
      device_id: alert.device_id,
      profile_id: alert.profile_id,
      status: alert.status,
      severity: alert.severity,
      acknowledged_at: alert.acknowledged_at,
      resolved_at: alert.resolved_at,
      assigned_to: alert.assigned_to,
      ...extras
    },
    ip_address: requestIp(req)
  });
  if (!result.ok) {
    throw new Error("Failed to create audit entry for alert lifecycle action");
  }
}
__name(recordAlertAudit, "recordAlertAudit");
async function presentAlertRecord(record, env, scope, meta, comments) {
  const info = meta.get(record.device_id);
  const outwardId = presentDeviceId(record.device_id, scope.isAdmin);
  const lookup = await buildDeviceLookup(record.device_id, env, scope.isAdmin);
  return {
    alert_id: record.alert_id,
    device_id: outwardId,
    lookup,
    profile_id: record.profile_id ?? info?.profile_id ?? null,
    site: info?.site ?? null,
    alert_type: record.alert_type,
    severity: record.severity,
    status: record.status,
    summary: record.summary,
    description: record.description,
    metadata: record.metadata,
    acknowledged_at: record.acknowledged_at,
    resolved_at: record.resolved_at,
    resolved_by: record.resolved_by,
    assigned_to: record.assigned_to,
    created_at: record.created_at,
    updated_at: record.updated_at,
    comments: (comments ?? []).map(presentAlertComment)
  };
}
__name(presentAlertRecord, "presentAlertRecord");
async function handleListAlertRecords(req, env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const scope = buildDeviceScope(user, "a");
  if (scope.empty && !scope.isAdmin) {
    return json({ generated_at: nowISO(), items: [] });
  }
  const url = new URL(req.url);
  const paramsResult = validateWithSchema(AlertListQuerySchema, {
    status: url.searchParams.get("status") ?? void 0,
    severity: url.searchParams.get("severity") ?? void 0,
    device: url.searchParams.get("device") ?? void 0,
    profile: url.searchParams.get("profile") ?? void 0,
    limit: url.searchParams.get("limit") ?? void 0,
    since: url.searchParams.get("since") ?? void 0,
    until: url.searchParams.get("until") ?? void 0
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.issues);
  }
  const params = paramsResult.data;
  if (params.since && params.until) {
    const sinceMs = Date.parse(params.since);
    const untilMs = Date.parse(params.until);
    if (!Number.isNaN(sinceMs) && !Number.isNaN(untilMs) && untilMs < sinceMs) {
      return json({ error: "Invalid range" }, { status: 400 });
    }
  }
  let deviceId;
  if (params.device) {
    const resolved = await resolveDeviceId(params.device, env, scope.isAdmin);
    if (!resolved) {
      return json({ error: "Unknown device" }, { status: 404 });
    }
    deviceId = resolved;
  }
  let profileIds;
  let singleProfile = void 0;
  if (scope.isAdmin) {
    if (params.profile) singleProfile = params.profile;
  } else {
    const allowedProfiles = scope.bind;
    if (!allowedProfiles.length) {
      return json({ generated_at: nowISO(), items: [] });
    }
    if (params.profile) {
      if (!allowedProfiles.includes(params.profile)) {
        return json({ error: "Forbidden" }, { status: 403 });
      }
      profileIds = [params.profile];
    } else {
      profileIds = allowedProfiles;
    }
    if (deviceId) {
      const deviceRow = await env.DB.prepare(`SELECT profile_id FROM devices WHERE device_id = ?1 LIMIT 1`).bind(deviceId).first();
      const deviceProfile = deviceRow?.profile_id ?? null;
      if (!deviceProfile || !allowedProfiles.includes(deviceProfile)) {
        return json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }
  const limit = params.limit ?? 50;
  const alerts = await listAlerts(env, {
    status: params.status ?? void 0,
    severity: params.severity ?? void 0,
    device_id: deviceId,
    profile_id: singleProfile,
    profile_ids: profileIds,
    since: params.since ?? void 0,
    until: params.until ?? void 0,
    limit
  });
  const meta = await fetchDeviceMeta(env, alerts.map((a) => a.device_id));
  const commentMap = await listAlertCommentsForAlerts(
    env,
    alerts.map((a) => a.alert_id)
  );
  const items = await Promise.all(
    alerts.map(
      (record) => presentAlertRecord(record, env, scope, meta, commentMap.get(record.alert_id) ?? [])
    )
  );
  return json({
    generated_at: nowISO(),
    items
  });
}
__name(handleListAlertRecords, "handleListAlertRecords");
async function handleCreateAlertRecord(req, env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const scope = buildDeviceScope(user, "a");
  if (scope.empty && !scope.isAdmin) {
    return json({ error: "Forbidden" }, { status: 403 });
  }
  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parseResult = validateWithSchema(CreateAlertSchema, payload);
  if (!parseResult.success) {
    return validationErrorResponse(parseResult.issues);
  }
  const body = parseResult.data;
  const deviceId = await resolveDeviceId(body.device_id, env, scope.isAdmin);
  if (!deviceId) {
    return json({ error: "Unknown device" }, { status: 404 });
  }
  let resolvedProfile = body.profile_id ?? null;
  if (!scope.isAdmin) {
    const allowedProfiles = scope.bind;
    const deviceRow = await env.DB.prepare(`SELECT profile_id FROM devices WHERE device_id = ?1 LIMIT 1`).bind(deviceId).first();
    if (!deviceRow?.profile_id || !allowedProfiles.includes(deviceRow.profile_id)) {
      return json({ error: "Forbidden" }, { status: 403 });
    }
    if (resolvedProfile && resolvedProfile !== deviceRow.profile_id) {
      return json({ error: "Profile mismatch" }, { status: 400 });
    }
    resolvedProfile = deviceRow.profile_id;
  }
  const result = await createAlert(env, {
    alert_id: body.alert_id,
    device_id: deviceId,
    profile_id: resolvedProfile,
    alert_type: body.alert_type,
    severity: body.severity,
    status: body.status,
    summary: body.summary ?? null,
    description: body.description ?? null,
    metadata: body.metadata ?? null,
    acknowledged_at: body.acknowledged_at ?? null,
    resolved_at: body.resolved_at ?? null,
    resolved_by: body.resolved_by ?? null,
    assigned_to: body.assigned_to ?? null
  });
  if (!result.ok) {
    if (result.reason === "device_not_found") {
      return json({ error: "Unknown device" }, { status: 404 });
    }
    if (result.reason === "conflict") {
      return json({ error: "Alert already exists" }, { status: 409 });
    }
    return json({ error: "Server error" }, { status: 500 });
  }
  const meta = await fetchDeviceMeta(env, [result.alert.device_id]);
  const [alert] = await Promise.all([
    presentAlertRecord(result.alert, env, scope, meta, [])
  ]);
  return json({ ok: true, alert }, { status: 201 });
}
__name(handleCreateAlertRecord, "handleCreateAlertRecord");
async function handleUpdateAlertRecord(req, env, alertId) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const scope = buildDeviceScope(user, "a");
  if (scope.empty && !scope.isAdmin) {
    return json({ error: "Forbidden" }, { status: 403 });
  }
  const existing = await getAlert(env, alertId);
  if (!existing) {
    return json({ error: "Alert not found" }, { status: 404 });
  }
  if (!await ensureAlertAccess(env, scope, existing)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }
  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parseResult = validateWithSchema(AlertLifecycleActionSchema, payload);
  if (!parseResult.success) {
    return validationErrorResponse(parseResult.issues);
  }
  const body = parseResult.data;
  const updateResult = await updateAlertLifecycle(env, {
    ...body,
    alert_id: alertId,
    actor_id: user.email,
    actor_email: user.email,
    comment: body.comment ?? null
  });
  if (!updateResult.ok) {
    return json({ error: "Alert not found" }, { status: 404 });
  }
  const updatedAlert = updateResult.alert;
  const meta = await fetchDeviceMeta(env, [updatedAlert.device_id]);
  const comments = await listAlertComments(env, alertId);
  const presented = await presentAlertRecord(updatedAlert, env, scope, meta, comments);
  const auditExtras = {};
  if (body.comment) auditExtras.comment = body.comment;
  if ("assignee" in body) {
    auditExtras.assignee = body.assignee ?? null;
  }
  if (updateResult.comment) {
    auditExtras.comment_id = updateResult.comment.comment_id;
  }
  await recordAlertAudit(env, req, user.email, `alert.${body.action}`, updatedAlert, auditExtras);
  return json({
    ok: true,
    alert: presented,
    comment: updateResult.comment ? presentAlertComment(updateResult.comment) : null
  });
}
__name(handleUpdateAlertRecord, "handleUpdateAlertRecord");
async function handleCreateAlertComment(req, env, alertId) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const scope = buildDeviceScope(user, "a");
  if (scope.empty && !scope.isAdmin) {
    return json({ error: "Forbidden" }, { status: 403 });
  }
  const existing = await getAlert(env, alertId);
  if (!existing) {
    return json({ error: "Alert not found" }, { status: 404 });
  }
  if (!await ensureAlertAccess(env, scope, existing)) {
    return json({ error: "Forbidden" }, { status: 403 });
  }
  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parseResult = validateWithSchema(AlertCommentCreateSchema, payload);
  if (!parseResult.success) {
    return validationErrorResponse(parseResult.issues);
  }
  const body = parseResult.data;
  const commentRecord = await addAlertComment(env, {
    alert_id: alertId,
    action: "comment",
    body: body.comment,
    actor_id: user.email,
    actor_email: user.email,
    metadata: null
  });
  const refreshed = await getAlert(env, alertId);
  if (!refreshed) {
    return json({ error: "Alert not found" }, { status: 404 });
  }
  const meta = await fetchDeviceMeta(env, [refreshed.device_id]);
  const comments = await listAlertComments(env, alertId);
  const presented = await presentAlertRecord(refreshed, env, scope, meta, comments);
  await recordAlertAudit(env, req, user.email, "alert.commented", refreshed, {
    comment_id: commentRecord.comment_id
  });
  return json({
    ok: true,
    alert: presented,
    comment: presentAlertComment(commentRecord)
  });
}
__name(handleCreateAlertComment, "handleCreateAlertComment");

// src/schemas/archive.ts
var ArchiveQuerySchema = external_exports.object({
  offlineHours: numericParam({ integer: true, min: 1, max: 720, defaultValue: 72 }),
  days: numericParam({ integer: true, min: 1, max: 30, defaultValue: 14 })
}).strict();

// src/routes/archive.ts
async function handleArchive(req, env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const scope = buildDeviceScope(user);
  const url = new URL(req.url);
  const paramsResult = ArchiveQuerySchema.safeParse({
    offlineHours: url.searchParams.get("offlineHours"),
    days: url.searchParams.get("days")
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.error);
  }
  const { offlineHours = 72, days = 14 } = paramsResult.data;
  const offlineThreshold = new Date(Date.now() - offlineHours * 60 * 60 * 1e3).toISOString();
  const historySinceMs = Date.now() - days * 24 * 60 * 60 * 1e3;
  if (scope.empty) {
    return json({ generated_at: nowISO(), offline: [], history: [] });
  }
  let where = "";
  const bind = [];
  if (scope.clause) {
    where = andWhere(where, scope.clause);
    bind.push(...scope.bind);
  }
  const offlineWhere = andWhere(where, "(d.last_seen_at IS NULL OR d.last_seen_at < ?)");
  const offlineRows = await env.DB.prepare(
    `SELECT d.device_id, d.site, d.last_seen_at, d.online, ls.cop, ls.deltaT, ls.faults_json, ls.updated_at
         FROM devices d
         LEFT JOIN latest_state ls ON ls.device_id = d.device_id
         ${offlineWhere}
        ORDER BY d.last_seen_at IS NOT NULL, d.last_seen_at ASC
        LIMIT 25`
  ).bind(...bind, offlineThreshold).all();
  let offline;
  try {
    offline = await Promise.all(
      (offlineRows.results ?? []).map(async (row) => ({
        device_id: presentDeviceId(row.device_id, scope.isAdmin),
        lookup: await buildDeviceLookup(row.device_id, env, scope.isAdmin),
        site: row.site ?? null,
        last_seen_at: row.last_seen_at ?? null,
        online: !!row.online,
        cop: maskTelemetryNumber(row.cop, scope.isAdmin, 1, 2),
        deltaT: maskTelemetryNumber(row.deltaT, scope.isAdmin, 1, 2),
        alerts: parseFaultsJson(row.faults_json).length,
        updated_at: row.updated_at ?? null
      }))
    );
  } catch (err) {
    loggerForRequest(req, { route: "/api/archive/offline" }).error("archive.offline_payload_failed", {
      error: err
    });
    return json({ error: "Server error" }, { status: 500 });
  }
  const historyWhere = andWhere(andWhere(where, "t.ts >= ?"), "t.ts IS NOT NULL");
  const historyRows = await env.DB.prepare(
    `SELECT DATE(t.ts / 1000, 'unixepoch') AS day, COUNT(*) AS samples
         FROM telemetry t
         JOIN devices d ON d.device_id = t.device_id
         ${historyWhere}
        GROUP BY DATE(t.ts / 1000, 'unixepoch')
        ORDER BY day DESC
        LIMIT ${days}`
  ).bind(...bind, historySinceMs).all();
  const history = (historyRows.results ?? []).map((row) => ({
    day: row.day,
    samples: row.samples
  }));
  return json({
    generated_at: nowISO(),
    offline,
    history
  });
}
__name(handleArchive, "handleArchive");

// src/schemas/client.ts
var ClientCompactQuerySchema = external_exports.object({
  hours: numericParam({ integer: true, min: 1, max: 72, defaultValue: 24 }),
  lowDeltaT: numericParam({ min: 0, defaultValue: 2 })
}).strict();

// src/routes/client.ts
async function handleClientCompact(req, env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const scope = buildDeviceScope(user);
  const url = new URL(req.url);
  const paramsResult = ClientCompactQuerySchema.safeParse({
    hours: url.searchParams.get("hours"),
    lowDeltaT: url.searchParams.get("lowDeltaT")
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.error);
  }
  const { hours = 24, lowDeltaT = 2 } = paramsResult.data;
  const sinceMs = Date.now() - hours * 60 * 60 * 1e3;
  if (scope.empty) {
    return json({
      generated_at: nowISO(),
      scope: "empty",
      window_start_ms: sinceMs,
      kpis: {
        devices_total: 0,
        devices_online: 0,
        offline_count: 0,
        online_pct: 0,
        avg_cop: null,
        low_deltaT_count: 0,
        open_alerts: 0,
        max_heartbeat_age_sec: null
      },
      alerts: [],
      top_devices: [],
      trend: []
    });
  }
  let where = "";
  const bind = [];
  if (scope.clause) {
    where = andWhere(where, scope.clause);
    bind.push(...scope.bind);
  }
  const totalRow = await env.DB.prepare(`SELECT COUNT(*) AS c FROM devices d ${where}`).bind(...bind).first();
  const onlineRow = await env.DB.prepare(`SELECT COUNT(*) AS c FROM devices d ${andWhere(where, "d.online = 1")}`).bind(...bind).first();
  const devices_total = totalRow?.c ?? 0;
  const devices_online = onlineRow?.c ?? 0;
  const offline_count = Math.max(0, devices_total - devices_online);
  const online_pct = devices_total ? Math.round(devices_online / devices_total * 100) : 0;
  const telemWhere = andWhere(where, "t.ts >= ?");
  const telemBind = [...bind, sinceMs];
  const avgRow = await env.DB.prepare(
    `SELECT AVG(t.cop) AS v
         FROM telemetry t
         JOIN devices d ON d.device_id = t.device_id
         ${telemWhere}`
  ).bind(...telemBind).first();
  const lowWhere = andWhere(telemWhere, "t.deltaT IS NOT NULL AND t.deltaT < ?");
  const lowBind = [...telemBind, lowDeltaT];
  const lowRow = await env.DB.prepare(
    `SELECT COUNT(*) AS c
         FROM telemetry t
         JOIN devices d ON d.device_id = t.device_id
         ${lowWhere}`
  ).bind(...lowBind).first();
  const hbRow = await env.DB.prepare(
    `SELECT MAX(
          CASE WHEN d.last_seen_at IS NULL THEN NULL
               ELSE (strftime('%s','now') - strftime('%s', d.last_seen_at))
          END
        ) AS s
       FROM devices d
       ${where}`
  ).bind(...bind).first();
  const alertsRows = await env.DB.prepare(
    `SELECT t.device_id, t.ts, t.faults_json, d.site, ls.updated_at
         FROM telemetry t
         JOIN devices d ON d.device_id = t.device_id
         LEFT JOIN latest_state ls ON ls.device_id = t.device_id
         ${andWhere(telemWhere, "t.faults_json IS NOT NULL AND t.faults_json != '[]' AND t.faults_json != ''")}
        ORDER BY t.ts DESC
        LIMIT 12`
  ).bind(...telemBind).all();
  let alerts;
  try {
    alerts = await Promise.all(
      (alertsRows.results ?? []).map(async (row) => {
        const faults = parseFaultsJson(row.faults_json);
        return {
          device_id: presentDeviceId(row.device_id, scope.isAdmin),
          lookup: await buildDeviceLookup(row.device_id, env, scope.isAdmin),
          site: row.site ?? null,
          ts: new Date(row.ts).toISOString(),
          updated_at: row.updated_at ?? null,
          faults,
          fault_count: faults.length
        };
      })
    );
  } catch (err) {
    loggerForRequest(req, { route: "/api/client/compact" }).error("client.alerts_payload_failed", {
      error: err
    });
    return json({ error: "Server error" }, { status: 500 });
  }
  const openAlertsTotal = alerts.filter((a) => a.fault_count > 0).length;
  const topRows = await env.DB.prepare(
    `SELECT d.device_id, d.site, d.online, d.last_seen_at, ls.cop, ls.deltaT, ls.thermalKW, ls.faults_json, ls.updated_at
         FROM devices d
         LEFT JOIN latest_state ls ON ls.device_id = d.device_id
         ${where}
        ORDER BY d.online DESC, (d.last_seen_at IS NULL), d.last_seen_at DESC, d.device_id ASC
        LIMIT 8`
  ).bind(...bind).all();
  let topDevices;
  try {
    topDevices = await Promise.all(
      (topRows.results ?? []).map(async (row) => {
        const faults = parseFaultsJson(row.faults_json);
        return {
          device_id: presentDeviceId(row.device_id, scope.isAdmin),
          lookup: await buildDeviceLookup(row.device_id, env, scope.isAdmin),
          site: row.site ?? null,
          online: !!row.online,
          last_seen_at: row.last_seen_at ?? null,
          updated_at: row.updated_at ?? null,
          cop: maskTelemetryNumber(row.cop, scope.isAdmin, 1, 2),
          deltaT: maskTelemetryNumber(row.deltaT, scope.isAdmin, 1, 2),
          thermalKW: maskTelemetryNumber(row.thermalKW, scope.isAdmin, 1, 2),
          alert_count: faults.length
        };
      })
    );
  } catch (err) {
    loggerForRequest(req, { route: "/api/client/compact" }).error("client.top_devices_payload_failed", {
      error: err
    });
    return json({ error: "Server error" }, { status: 500 });
  }
  const telemetryRows = await env.DB.prepare(
    `SELECT t.ts, t.cop, t.thermalKW, t.deltaT
         FROM telemetry t
         JOIN devices d ON d.device_id = t.device_id
         ${telemWhere}
        ORDER BY t.ts DESC
        LIMIT 160`
  ).bind(...telemBind).all();
  const bucketCount = 8;
  const nowMs = Date.now();
  const spanMs = Math.max(1, nowMs - sinceMs);
  const bucketMs = spanMs / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, i) => ({
    start: sinceMs + i * bucketMs,
    end: sinceMs + (i + 1) * bucketMs,
    count: 0,
    cop: 0,
    thermal: 0,
    delta: 0
  }));
  for (const row of telemetryRows.results ?? []) {
    const idx = Math.min(bucketCount - 1, Math.max(0, Math.floor((row.ts - sinceMs) / bucketMs)));
    const bucket = buckets[idx];
    bucket.count += 1;
    if (typeof row.cop === "number") bucket.cop += row.cop;
    if (typeof row.thermalKW === "number") bucket.thermal += row.thermalKW;
    if (typeof row.deltaT === "number") bucket.delta += row.deltaT;
  }
  const trend = buckets.map((bucket) => {
    const avgCop = bucket.count ? bucket.cop / bucket.count : null;
    const avgThermal = bucket.count ? bucket.thermal / bucket.count : null;
    const avgDelta = bucket.count ? bucket.delta / bucket.count : null;
    return {
      label: new Date(Math.min(nowMs, bucket.end)).toISOString(),
      cop: maskTelemetryNumber(avgCop, scope.isAdmin, 1, 2),
      thermalKW: maskTelemetryNumber(avgThermal, scope.isAdmin, 1, 2),
      deltaT: maskTelemetryNumber(avgDelta, scope.isAdmin, 1, 2)
    };
  });
  return json({
    generated_at: nowISO(),
    scope: scope.isAdmin ? "fleet" : "tenant",
    window_start_ms: sinceMs,
    kpis: {
      devices_total,
      devices_online,
      offline_count,
      online_pct,
      avg_cop: maskTelemetryNumber(avgRow?.v ?? null, scope.isAdmin, 1, 2),
      low_deltaT_count: lowRow?.c ?? 0,
      open_alerts: openAlertsTotal,
      max_heartbeat_age_sec: hbRow?.s ?? null
    },
    alerts,
    top_devices: topDevices,
    trend
  });
}
__name(handleClientCompact, "handleClientCompact");

// src/schemas/fleet.ts
var FleetSummaryQuerySchema = external_exports.object({
  hours: numericParam({ integer: true, min: 1, max: 168, defaultValue: 24 }),
  lowDeltaT: numericParam({ min: 0, defaultValue: 2 })
}).strict();

// src/routes/fleet.ts
async function handleFleetSummary(req, env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const scope = buildDeviceScope(user);
  const url = new URL(req.url);
  const paramsResult = FleetSummaryQuerySchema.safeParse({
    hours: url.searchParams.get("hours"),
    lowDeltaT: url.searchParams.get("lowDeltaT")
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.error);
  }
  const { hours = 24, lowDeltaT = 2 } = paramsResult.data;
  const sinceMs = Date.now() - hours * 60 * 60 * 1e3;
  let where = "";
  const bind = [];
  if (scope.empty) {
    return json({
      devices_total: 0,
      devices_online: 0,
      online_pct: 0,
      avg_cop_24h: null,
      low_deltaT_count_24h: 0,
      max_heartbeat_age_sec: null,
      window_start_ms: sinceMs,
      generated_at: nowISO()
    });
  }
  if (scope.clause) {
    where = andWhere(where, scope.clause);
    bind.push(...scope.bind);
  }
  const totalRow = await env.DB.prepare(`SELECT COUNT(*) AS c FROM devices d ${where}`).bind(...bind).first();
  const onlineRow = await env.DB.prepare(`SELECT COUNT(*) AS c FROM devices d ${andWhere(where, "d.online = 1")}`).bind(...bind).first();
  const devices_total = totalRow?.c ?? 0;
  const devices_online = onlineRow?.c ?? 0;
  const online_pct = devices_total ? Math.round(devices_online / devices_total * 100) : 0;
  const telemWhere = andWhere(where, "t.ts >= ?");
  const telemBind = [...bind, sinceMs];
  const avgRow = await env.DB.prepare(
    `SELECT AVG(t.cop) AS v
         FROM telemetry t
         JOIN devices d ON d.device_id = t.device_id
         ${telemWhere}`
  ).bind(...telemBind).first();
  const lowWhere = andWhere(telemWhere, "t.deltaT IS NOT NULL AND t.deltaT < ?");
  const lowBind = [...telemBind, lowDeltaT];
  const lowRow = await env.DB.prepare(
    `SELECT COUNT(*) AS c
         FROM telemetry t
         JOIN devices d ON d.device_id = t.device_id
         ${lowWhere}`
  ).bind(...lowBind).first();
  const hbRow = await env.DB.prepare(
    `SELECT MAX(
          CASE WHEN d.last_seen_at IS NULL THEN NULL
               ELSE (strftime('%s','now') - strftime('%s', d.last_seen_at))
          END
        ) AS s
       FROM devices d
       ${where}`
  ).bind(...bind).first();
  return json({
    devices_total,
    devices_online,
    online_pct,
    avg_cop_24h: maskTelemetryNumber(avgRow?.v ?? null, scope.isAdmin, 1, 2),
    low_deltaT_count_24h: lowRow?.c ?? 0,
    max_heartbeat_age_sec: hbRow?.s ?? null,
    window_start_ms: sinceMs,
    generated_at: nowISO()
  });
}
__name(handleFleetSummary, "handleFleetSummary");

// src/lib/ip-rate-limit.ts
var MEMORY_BUCKETS = /* @__PURE__ */ new Map();
var CLEANUP_INTERVAL_MS = 5 * 60 * 1e3;
var lastCleanup = Date.now();
async function checkIpRateLimit(req, env, route) {
  const config = resolveConfig(env);
  if (!config) return null;
  const ip = extractClientIp(req);
  if (!ip) return null;
  const key = `${route}:${ip}`;
  const now = Date.now();
  if (env.INGEST_IP_BUCKETS) {
    try {
      const kvResult = await checkKvRateLimit(env.INGEST_IP_BUCKETS, key, ip, config, now);
      if (kvResult) {
        return kvResult;
      }
    } catch (error) {
      systemLogger({ scope: "ingest_ip_rate_limit" }).warn("ingest.ip_kv_bucket_failed", {
        error
      });
    }
  }
  cleanupBuckets(now);
  return checkMemoryRateLimit(key, ip, config, now);
}
__name(checkIpRateLimit, "checkIpRateLimit");
function resolveConfig(env) {
  const rawLimit = typeof env.INGEST_IP_LIMIT_PER_MIN === "string" ? env.INGEST_IP_LIMIT_PER_MIN.trim() : "";
  if (!rawLimit) return null;
  const capacity = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(capacity) || capacity <= 0) return null;
  const rawBlockSeconds = typeof env.INGEST_IP_BLOCK_SECONDS === "string" ? env.INGEST_IP_BLOCK_SECONDS.trim() : "";
  const blockSeconds = Number.parseInt(rawBlockSeconds || "60", 10);
  const blockDurationMs = Number.isFinite(blockSeconds) && blockSeconds > 0 ? blockSeconds * 1e3 : 6e4;
  return {
    capacity,
    refillIntervalMs: 6e4,
    blockDurationMs
  };
}
__name(resolveConfig, "resolveConfig");
function extractClientIp(req) {
  const direct = req.headers.get("cf-connecting-ip");
  if (direct?.trim()) {
    return direct.trim();
  }
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded?.trim()) {
    const first = forwarded.split(",")[0]?.trim();
    return first || null;
  }
  return null;
}
__name(extractClientIp, "extractClientIp");
function refill(bucket, config, now) {
  if (bucket.tokens >= config.capacity) {
    bucket.tokens = config.capacity;
    bucket.lastRefill = now;
    return;
  }
  const elapsed = now - bucket.lastRefill;
  if (elapsed <= 0) return;
  const tokensToAdd = elapsed / config.refillIntervalMs * config.capacity;
  bucket.tokens = Math.min(config.capacity, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;
}
__name(refill, "refill");
async function checkKvRateLimit(kv, key, ip, config, now) {
  if (!kv) return null;
  const ttlSeconds = computeTtlSeconds(config);
  const stored = await kv.get(key, { type: "json" });
  const bucket = stored ?? {
    tokens: config.capacity,
    lastRefill: now,
    blockedUntil: 0
  };
  if (bucket.blockedUntil > now) {
    await kv.put(
      key,
      JSON.stringify(bucket),
      { expirationTtl: ttlSeconds }
    );
    return {
      limited: true,
      retryAfterSeconds: Math.ceil((bucket.blockedUntil - now) / 1e3),
      remaining: 0,
      limit: config.capacity,
      ip
    };
  }
  refill(bucket, config, now);
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    await kv.put(
      key,
      JSON.stringify(bucket),
      { expirationTtl: ttlSeconds }
    );
    return {
      limited: false,
      remaining: Math.floor(bucket.tokens),
      limit: config.capacity,
      ip
    };
  }
  bucket.tokens = 0;
  bucket.blockedUntil = now + config.blockDurationMs;
  await kv.put(
    key,
    JSON.stringify(bucket),
    { expirationTtl: ttlSeconds }
  );
  return {
    limited: true,
    retryAfterSeconds: Math.ceil(config.blockDurationMs / 1e3),
    remaining: 0,
    limit: config.capacity,
    ip
  };
}
__name(checkKvRateLimit, "checkKvRateLimit");
function checkMemoryRateLimit(key, ip, config, now) {
  let bucket = MEMORY_BUCKETS.get(key);
  if (!bucket) {
    bucket = {
      capacity: config.capacity,
      tokens: config.capacity,
      lastRefill: now,
      blockedUntil: 0
    };
    MEMORY_BUCKETS.set(key, bucket);
  }
  if (bucket.blockedUntil > now) {
    return {
      limited: true,
      retryAfterSeconds: Math.ceil((bucket.blockedUntil - now) / 1e3),
      remaining: 0,
      limit: config.capacity,
      ip
    };
  }
  refill(bucket, config, now);
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return {
      limited: false,
      remaining: Math.floor(bucket.tokens),
      limit: config.capacity,
      ip
    };
  }
  bucket.blockedUntil = now + config.blockDurationMs;
  bucket.tokens = 0;
  return {
    limited: true,
    retryAfterSeconds: Math.ceil(config.blockDurationMs / 1e3),
    remaining: 0,
    limit: config.capacity,
    ip
  };
}
__name(checkMemoryRateLimit, "checkMemoryRateLimit");
function computeTtlSeconds(config) {
  const totalMs = config.blockDurationMs + config.refillIntervalMs * 2;
  return Math.max(60, Math.ceil(totalMs / 1e3));
}
__name(computeTtlSeconds, "computeTtlSeconds");
function cleanupBuckets(now) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of MEMORY_BUCKETS) {
    if (bucket.tokens >= bucket.capacity && bucket.blockedUntil <= now) {
      MEMORY_BUCKETS.delete(key);
    }
  }
}
__name(cleanupBuckets, "cleanupBuckets");

// src/schemas/ingest.ts
var nullableNumber = external_exports.union([external_exports.number(), external_exports.null()]).optional().transform(
  (value) => value === void 0 ? null : value
);
var nullableString = external_exports.union([external_exports.string().min(1), external_exports.null()]).optional().transform(
  (value) => value === void 0 ? null : value
);
var TelemetryMetricsSchema = external_exports.object({
  supplyC: nullableNumber,
  returnC: nullableNumber,
  tankC: nullableNumber,
  ambientC: nullableNumber,
  flowLps: nullableNumber,
  compCurrentA: nullableNumber,
  eevSteps: nullableNumber,
  powerKW: nullableNumber,
  mode: nullableString,
  defrost: nullableNumber
}).strip();
var TelemetryPayloadSchema = external_exports.object({
  device_id: external_exports.string().min(1, "device_id must not be empty"),
  ts: external_exports.string().min(1, "ts must not be empty"),
  metrics: TelemetryMetricsSchema,
  faults: external_exports.array(external_exports.string()).default([]),
  rssi: nullableNumber
}).strict();
var HeartbeatPayloadSchema = external_exports.object({
  device_id: external_exports.string().min(1, "device_id must not be empty"),
  ts: external_exports.string().min(1).optional(),
  rssi: nullableNumber
}).strict();

// src/utils/ingest-dedup.ts
var DEFAULT_INGEST_DEDUP_WINDOW_MINUTES = 5;
function ingestDedupWindowMs(env) {
  const raw = env.INGEST_DEDUP_WINDOW_MINUTES;
  const parsed = raw ? Number(raw) : NaN;
  const minutes = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INGEST_DEDUP_WINDOW_MINUTES;
  const windowMs = Math.floor(minutes * 6e4);
  return Math.max(windowMs, 1e3);
}
__name(ingestDedupWindowMs, "ingestDedupWindowMs");

// src/lib/request-metrics.ts
var recordedMetrics = /* @__PURE__ */ new WeakMap();
function initializeRequestMetrics(req) {
  recordedMetrics.set(req, false);
}
__name(initializeRequestMetrics, "initializeRequestMetrics");
function markRequestMetricsRecorded(req) {
  recordedMetrics.set(req, true);
}
__name(markRequestMetricsRecorded, "markRequestMetricsRecorded");
function requestMetricsRecorded(req) {
  return recordedMetrics.get(req) === true;
}
__name(requestMetricsRecorded, "requestMetricsRecorded");

// src/routes/ingest.ts
var DEVICE_KEY_HEADER = "X-GREENBRO-DEVICE-KEY";
var SIGNATURE_HEADER = "X-GREENBRO-SIGNATURE";
var TIMESTAMP_HEADER = "X-GREENBRO-TIMESTAMP";
var INGEST_ROUTE = "/api/ingest";
var HEARTBEAT_ROUTE = "/api/heartbeat";
var textEncoder = new TextEncoder();
function signatureToleranceMs(env) {
  const raw = env.INGEST_SIGNATURE_TOLERANCE_SECS;
  const parsed = raw ? Number(raw) : NaN;
  const seconds = Number.isFinite(parsed) && parsed > 0 ? parsed : 300;
  return seconds * 1e3;
}
__name(signatureToleranceMs, "signatureToleranceMs");
function parseSignatureTimestamp(raw) {
  const value = raw.trim();
  if (!value) return null;
  if (/^\d{10,}$/.test(value)) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    if (value.length <= 10) {
      return numeric * 1e3;
    }
    return numeric;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}
__name(parseSignatureTimestamp, "parseSignatureTimestamp");
function parsePositiveInt(raw, fallback) {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}
__name(parsePositiveInt, "parsePositiveInt");
function parseNonNegativeInt(raw, fallback) {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}
__name(parseNonNegativeInt, "parseNonNegativeInt");
function parsedRateLimit(env) {
  return parsePositiveInt(env.INGEST_RATE_LIMIT_PER_MIN, 120);
}
__name(parsedRateLimit, "parsedRateLimit");
function parsedFailureLimit(env, overallLimit) {
  const explicit = parseNonNegativeInt(env.INGEST_FAILURE_LIMIT_PER_MIN, -1);
  if (explicit >= 0) {
    return explicit;
  }
  if (overallLimit > 0) {
    return Math.max(10, Math.floor(overallLimit / 2));
  }
  return 0;
}
__name(parsedFailureLimit, "parsedFailureLimit");
async function isRateLimited(env, route, deviceId, limitPerMinute) {
  if (limitPerMinute <= 0) return false;
  const sinceIso = new Date(Date.now() - 6e4).toISOString();
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS cnt
         FROM ops_metrics
        WHERE device_id = ?1
          AND route = ?2
          AND ts >= ?3`
  ).bind(deviceId, route, sinceIso).first();
  const rawCount = row?.cnt ?? 0;
  const count = typeof rawCount === "number" ? rawCount : Number(rawCount);
  return Number.isFinite(count) && count >= limitPerMinute;
}
__name(isRateLimited, "isRateLimited");
async function isFailureRateLimited(env, route, deviceId, failureLimitPerMinute) {
  if (failureLimitPerMinute <= 0) return false;
  const sinceIso = new Date(Date.now() - 6e4).toISOString();
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS cnt
         FROM ops_metrics
        WHERE device_id = ?1
          AND route = ?2
          AND ts >= ?3
          AND status_code >= 400`
  ).bind(deviceId, route, sinceIso).first();
  const rawCount = row?.cnt ?? 0;
  const count = typeof rawCount === "number" ? rawCount : Number(rawCount);
  return Number.isFinite(count) && count >= failureLimitPerMinute;
}
__name(isFailureRateLimited, "isFailureRateLimited");
function isNonceConflict(error) {
  if (!error) return false;
  const message2 = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (!message2) return false;
  return message2.includes("ingest_nonces") && message2.toLowerCase().includes("unique constraint failed");
}
__name(isNonceConflict, "isNonceConflict");
async function ensureSignature(req, env, payload, deviceKeyHash) {
  const signatureHeader = req.headers.get(SIGNATURE_HEADER);
  const timestampHeader = req.headers.get(TIMESTAMP_HEADER);
  if (!signatureHeader || !timestampHeader) {
    return { ok: false, status: 401, error: "Missing signature headers" };
  }
  const trimmedTimestamp = timestampHeader.trim();
  const normalizedSignature = signatureHeader.trim().toLowerCase();
  if (!trimmedTimestamp) {
    return { ok: false, status: 400, error: "Invalid signature timestamp" };
  }
  if (!normalizedSignature) {
    return { ok: false, status: 401, error: "Invalid signature" };
  }
  const tsMs = parseSignatureTimestamp(trimmedTimestamp);
  if (tsMs === null) {
    return { ok: false, status: 400, error: "Invalid signature timestamp" };
  }
  const toleranceMs = signatureToleranceMs(env);
  if (Math.abs(Date.now() - tsMs) > toleranceMs) {
    return {
      ok: false,
      status: 401,
      error: "Signature timestamp outside tolerance"
    };
  }
  const expected = await hmacSha256Hex(deviceKeyHash, `${trimmedTimestamp}.${payload}`);
  if (!timingSafeEqual(expected, normalizedSignature)) {
    return { ok: false, status: 401, error: "Invalid signature" };
  }
  return { ok: true };
}
__name(ensureSignature, "ensureSignature");
function readRawBody(raw) {
  if (!raw) return null;
  return JSON.parse(raw);
}
__name(readRawBody, "readRawBody");
function payloadSizeOk(raw) {
  return textEncoder.encode(raw).length <= 256e3;
}
__name(payloadSizeOk, "payloadSizeOk");
async function logAndRecordEarlyExit(req, env, route, statusCode, t0, log, event, options = {}) {
  const { deviceId = null, level, fields } = options;
  const scopedLog = deviceId ? log.with({ device_id: deviceId }) : log;
  await recordOpsMetric(env, route, statusCode, Date.now() - t0, deviceId, scopedLog);
  markRequestMetricsRecorded(req);
  const severity = level ?? (statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info");
  const payload = { status_code: statusCode, ...fields ?? {} };
  if (severity === "error") {
    scopedLog.error(event, payload);
  } else if (severity === "info") {
    scopedLog.info(event, payload);
  } else {
    scopedLog.warn(event, payload);
  }
}
__name(logAndRecordEarlyExit, "logAndRecordEarlyExit");
async function handleIngest(req, env, profileId) {
  const t0 = Date.now();
  const log = loggerForRequest(req, { route: `${INGEST_ROUTE}/:profile`, profile_id: profileId });
  const cors = evaluateCors(req, env);
  if (!cors.allowed) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 403, t0, log, "ingest.cors_blocked", {
      fields: { reason: "origin_not_allowed", origin: cors.origin },
      level: "warn"
    });
    return json({ error: "Origin not allowed" }, { status: 403 });
  }
  const ipDecision = await checkIpRateLimit(req, env, INGEST_ROUTE);
  if (ipDecision?.limited) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 429, t0, log, "ingest.ip_rate_limited", {
      fields: {
        reason: "ip_rate_limited",
        client_ip: ipDecision.ip,
        limit_per_minute: ipDecision.limit,
        retry_after_seconds: ipDecision.retryAfterSeconds
      },
      level: "warn"
    });
    const rateResponse = json({ error: "Rate limit exceeded" }, { status: 429 });
    if (ipDecision.retryAfterSeconds != null) {
      rateResponse.headers.set("Retry-After", String(ipDecision.retryAfterSeconds));
    }
    return withCors(req, env, rateResponse, cors);
  }
  let rawBodyText;
  try {
    rawBodyText = await req.text();
  } catch (error) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 400, t0, log, "ingest.body_read_failed", {
      fields: { reason: "invalid_json", error },
      level: "warn"
    });
    return withCors(req, env, json({ error: "Invalid JSON" }, { status: 400 }), cors);
  }
  if (!payloadSizeOk(rawBodyText)) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 413, t0, log, "ingest.payload_too_large", {
      fields: { reason: "payload_too_large" }
    });
    return withCors(req, env, json({ error: "Payload too large" }, { status: 413 }), cors);
  }
  let rawBody;
  try {
    rawBody = readRawBody(rawBodyText);
  } catch (error) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 400, t0, log, "ingest.invalid_json", {
      fields: { reason: "invalid_json", error },
      level: "warn"
    });
    return withCors(req, env, json({ error: "Invalid JSON" }, { status: 400 }), cors);
  }
  const parsedBody = TelemetryPayloadSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 400, t0, log, "ingest.validation_failed", {
      fields: {
        reason: "validation_failed",
        issue_count: parsedBody.error.issues.length
      }
    });
    return withCors(req, env, validationErrorResponse(parsedBody.error), cors);
  }
  const body = parsedBody.data;
  const tsCheck = parseAndCheckTs(body.ts);
  if (!tsCheck.ok) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 400, t0, log, "ingest.invalid_timestamp", {
      deviceId: body.device_id,
      fields: { reason: tsCheck.reason }
    });
    return withCors(req, env, json({ error: tsCheck.reason }, { status: 400 }), cors);
  }
  const tsMs = tsCheck.ms;
  const limitPerMinute = parsedRateLimit(env);
  const failureLimitPerMinute = parsedFailureLimit(env, limitPerMinute);
  if (await isFailureRateLimited(env, INGEST_ROUTE, body.device_id, failureLimitPerMinute)) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 429, t0, log, "ingest.failure_rate_limited", {
      deviceId: body.device_id,
      fields: {
        reason: "failure_rate_limited",
        failure_limit_per_minute: failureLimitPerMinute
      }
    });
    return withCors(req, env, json({ error: "Rate limit exceeded" }, { status: 429 }), cors);
  }
  if (await isRateLimited(env, INGEST_ROUTE, body.device_id, limitPerMinute)) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 429, t0, log, "ingest.rate_limited", {
      deviceId: body.device_id,
      fields: { reason: "rate_limited", limit_per_minute: limitPerMinute }
    });
    return withCors(req, env, json({ error: "Rate limit exceeded" }, { status: 429 }), cors);
  }
  const keyHeader = req.headers.get(DEVICE_KEY_HEADER);
  const keyVerification = await verifyDeviceKey(env, body.device_id, keyHeader);
  if (!keyVerification.ok || !keyVerification.deviceKeyHash) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 401, t0, log, "ingest.unauthorized_device_key", {
      deviceId: body.device_id,
      fields: { reason: "invalid_device_key" }
    });
    return withCors(req, env, json({ error: "Unauthorized" }, { status: 401 }), cors);
  }
  const signatureCheck = await ensureSignature(req, env, rawBodyText, keyVerification.deviceKeyHash);
  if (!signatureCheck.ok) {
    await logAndRecordEarlyExit(
      req,
      env,
      INGEST_ROUTE,
      signatureCheck.status,
      t0,
      log,
      "ingest.signature_failure",
      {
        deviceId: body.device_id,
        fields: { reason: signatureCheck.error }
      }
    );
    return withCors(
      req,
      env,
      json({ error: signatureCheck.error }, { status: signatureCheck.status }),
      cors
    );
  }
  const devRow = await env.DB.prepare(`SELECT profile_id FROM devices WHERE device_id = ?1`).bind(body.device_id).first();
  if (!devRow) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 401, t0, log, "ingest.unknown_device", {
      deviceId: body.device_id,
      fields: { reason: "unknown_device" }
    });
    return withCors(
      req,
      env,
      json({ error: "Unauthorized (unknown device)" }, { status: 401 }),
      cors
    );
  }
  if (devRow.profile_id && devRow.profile_id !== profileId) {
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 409, t0, log, "ingest.profile_mismatch", {
      deviceId: body.device_id,
      fields: {
        reason: "profile_mismatch",
        db_profile_id: devRow.profile_id,
        requested_profile_id: profileId
      }
    });
    return withCors(
      req,
      env,
      json({ error: "Profile mismatch for device" }, { status: 409 }),
      cors
    );
  }
  if (!devRow.profile_id) {
    const claim = await claimDeviceIfUnowned(env, body.device_id, profileId);
    if (!claim.ok && claim.reason === "claimed_by_other") {
      await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 409, t0, log, "ingest.claim_conflict", {
        deviceId: body.device_id,
        fields: { reason: "claim_conflict" }
      });
      return withCors(
        req,
        env,
        json({ error: "Profile mismatch for device" }, { status: 409 }),
        cors
      );
    }
  }
  const supply = typeof body.metrics.supplyC === "number" ? body.metrics.supplyC : null;
  const ret = typeof body.metrics.returnC === "number" ? body.metrics.returnC : null;
  const flow = typeof body.metrics.flowLps === "number" ? body.metrics.flowLps : null;
  const powerKW = typeof body.metrics.powerKW === "number" ? body.metrics.powerKW : null;
  const { deltaT, thermalKW, cop, cop_quality } = deriveTelemetryMetrics({
    supplyC: supply,
    returnC: ret,
    flowLps: flow,
    powerKW
  });
  const sanitizedMetricsJson = JSON.stringify(body.metrics);
  const faults_json = JSON.stringify(body.faults || []);
  const status_json = JSON.stringify({
    mode: body.metrics.mode ?? null,
    defrost: body.metrics.defrost ?? 0,
    rssi: body.rssi ?? null
  });
  const dedupWindowMs = ingestDedupWindowMs(env);
  const dedupExpiresAt = tsMs + dedupWindowMs;
  const dedupCleanupCutoff = Date.now();
  try {
    const updatedAtIso = nowISO();
    const lastSeenIso = new Date(tsMs).toISOString();
    await withTransaction(env.DB, async () => {
      await env.DB.prepare(
        `DELETE FROM ingest_nonces WHERE device_id = ?1 AND ts_ms = ?2 AND expires_at < ?3`
      ).bind(body.device_id, tsMs, dedupCleanupCutoff).run();
      await env.DB.prepare(
        `INSERT INTO telemetry (device_id, ts, metrics_json, deltaT, thermalKW, cop, cop_quality, status_json, faults_json)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
           ON CONFLICT (device_id, ts) DO NOTHING`
      ).bind(
        body.device_id,
        tsMs,
        sanitizedMetricsJson,
        deltaT,
        thermalKW,
        cop,
        cop_quality,
        status_json,
        faults_json
      ).run();
      await env.DB.prepare(
        `INSERT INTO latest_state
             (device_id, ts, supplyC, returnC, tankC, ambientC, flowLps, compCurrentA, eevSteps, powerKW,
              deltaT, thermalKW, cop, cop_quality, mode, defrost, online, payload_json, faults_json, updated_at)
           VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,1,?17,?18,?19)
           ON CONFLICT(device_id) DO UPDATE SET
              ts=excluded.ts, supplyC=excluded.supplyC, returnC=excluded.returnC, tankC=excluded.tankC,
              ambientC=excluded.ambientC, flowLps=excluded.flowLps, compCurrentA=excluded.compCurrentA,
              eevSteps=excluded.eevSteps, powerKW=excluded.powerKW, deltaT=excluded.deltaT,
              thermalKW=excluded.thermalKW, cop=excluded.cop, cop_quality=excluded.cop_quality,
              mode=excluded.mode, defrost=excluded.defrost, online=1, payload_json=excluded.payload_json,
              faults_json=excluded.faults_json, updated_at=excluded.updated_at`
      ).bind(
        body.device_id,
        tsMs,
        supply,
        ret,
        body.metrics.tankC ?? null,
        body.metrics.ambientC ?? null,
        flow,
        body.metrics.compCurrentA ?? null,
        body.metrics.eevSteps ?? null,
        body.metrics.powerKW ?? null,
        deltaT,
        thermalKW,
        cop,
        cop_quality,
        body.metrics.mode ?? null,
        body.metrics.defrost ?? 0,
        sanitizedMetricsJson,
        faults_json,
        updatedAtIso
      ).run();
      await env.DB.prepare(`UPDATE devices SET online=1, last_seen_at=?2 WHERE device_id=?1`).bind(body.device_id, lastSeenIso).run();
      await env.DB.prepare(`INSERT INTO ingest_nonces (device_id, ts_ms, expires_at) VALUES (?1, ?2, ?3)`).bind(body.device_id, tsMs, dedupExpiresAt).run();
    });
    const deviceLog = log.with({ device_id: body.device_id });
    await recordOpsMetric(env, INGEST_ROUTE, 200, Date.now() - t0, body.device_id, deviceLog);
    markRequestMetricsRecorded(req);
    deviceLog.info("ingest.telemetry_stored", {
      payload_ts: new Date(tsMs).toISOString(),
      faults_count: body.faults?.length ?? 0,
      delta_t: deltaT,
      thermal_kw: thermalKW,
      cop
    });
    return withCors(req, env, json({ ok: true }), cors);
  } catch (e) {
    if (isNonceConflict(e)) {
      await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 409, t0, log, "ingest.duplicate_payload", {
        deviceId: body.device_id,
        fields: {
          reason: "duplicate_payload",
          payload_ts: new Date(tsMs).toISOString(),
          dedup_window_ms: dedupWindowMs
        }
      });
      return withCors(
        req,
        env,
        json({ error: "Duplicate payload" }, { status: 409 }),
        cors
      );
    }
    await logAndRecordEarlyExit(req, env, INGEST_ROUTE, 500, t0, log, "ingest.db_error", {
      deviceId: body.device_id,
      level: "error",
      fields: { reason: "db_error", error: e }
    });
    return withCors(
      req,
      env,
      json({ error: "DB error" }, { status: 500 }),
      cors
    );
  }
}
__name(handleIngest, "handleIngest");
async function handleHeartbeat(req, env, profileId) {
  const t0 = Date.now();
  const log = loggerForRequest(req, { route: `${HEARTBEAT_ROUTE}/:profile`, profile_id: profileId });
  const cors = evaluateCors(req, env);
  if (!cors.allowed) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 403, t0, log, "heartbeat.cors_blocked", {
      fields: { reason: "origin_not_allowed", origin: cors.origin },
      level: "warn"
    });
    return json({ error: "Origin not allowed" }, { status: 403 });
  }
  const ipDecision = await checkIpRateLimit(req, env, HEARTBEAT_ROUTE);
  if (ipDecision?.limited) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 429, t0, log, "heartbeat.ip_rate_limited", {
      fields: {
        reason: "ip_rate_limited",
        client_ip: ipDecision.ip,
        limit_per_minute: ipDecision.limit,
        retry_after_seconds: ipDecision.retryAfterSeconds
      },
      level: "warn"
    });
    const rateResponse = json({ error: "Rate limit exceeded" }, { status: 429 });
    if (ipDecision.retryAfterSeconds != null) {
      rateResponse.headers.set("Retry-After", String(ipDecision.retryAfterSeconds));
    }
    return withCors(req, env, rateResponse, cors);
  }
  let rawBodyText;
  try {
    rawBodyText = await req.text();
  } catch (error) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 400, t0, log, "heartbeat.body_read_failed", {
      fields: { reason: "invalid_json", error },
      level: "warn"
    });
    return withCors(req, env, json({ error: "Invalid JSON" }, { status: 400 }), cors);
  }
  if (!payloadSizeOk(rawBodyText)) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 413, t0, log, "heartbeat.payload_too_large", {
      fields: { reason: "payload_too_large" }
    });
    return withCors(req, env, json({ error: "Payload too large" }, { status: 413 }), cors);
  }
  let rawBody;
  try {
    rawBody = readRawBody(rawBodyText);
  } catch (error) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 400, t0, log, "heartbeat.invalid_json", {
      fields: { reason: "invalid_json", error },
      level: "warn"
    });
    return withCors(req, env, json({ error: "Invalid JSON" }, { status: 400 }), cors);
  }
  const parsedBody = HeartbeatPayloadSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 400, t0, log, "heartbeat.validation_failed", {
      fields: {
        reason: "validation_failed",
        issue_count: parsedBody.error.issues.length
      }
    });
    return withCors(req, env, validationErrorResponse(parsedBody.error), cors);
  }
  const body = parsedBody.data;
  const tsStr = body.ts ?? (/* @__PURE__ */ new Date()).toISOString();
  const tsCheck = parseAndCheckTs(tsStr);
  if (!tsCheck.ok) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 400, t0, log, "heartbeat.invalid_timestamp", {
      deviceId: body.device_id,
      fields: { reason: tsCheck.reason }
    });
    return withCors(req, env, json({ error: tsCheck.reason }, { status: 400 }), cors);
  }
  const heartRateLimit = parsedRateLimit(env);
  const heartFailureLimit = parsedFailureLimit(env, heartRateLimit);
  if (await isFailureRateLimited(env, HEARTBEAT_ROUTE, body.device_id, heartFailureLimit)) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 429, t0, log, "heartbeat.failure_rate_limited", {
      deviceId: body.device_id,
      fields: {
        reason: "failure_rate_limited",
        failure_limit_per_minute: heartFailureLimit
      }
    });
    return withCors(req, env, json({ error: "Rate limit exceeded" }, { status: 429 }), cors);
  }
  if (await isRateLimited(env, HEARTBEAT_ROUTE, body.device_id, heartRateLimit)) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 429, t0, log, "heartbeat.rate_limited", {
      deviceId: body.device_id,
      fields: { reason: "rate_limited", limit_per_minute: heartRateLimit }
    });
    return withCors(req, env, json({ error: "Rate limit exceeded" }, { status: 429 }), cors);
  }
  const keyHeader = req.headers.get(DEVICE_KEY_HEADER);
  const keyVerification = await verifyDeviceKey(env, body.device_id, keyHeader);
  if (!keyVerification.ok || !keyVerification.deviceKeyHash) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 401, t0, log, "heartbeat.unauthorized_device_key", {
      deviceId: body.device_id,
      fields: { reason: "invalid_device_key" }
    });
    return withCors(req, env, json({ error: "Unauthorized" }, { status: 401 }), cors);
  }
  const signatureCheck = await ensureSignature(req, env, rawBodyText, keyVerification.deviceKeyHash);
  if (!signatureCheck.ok) {
    await logAndRecordEarlyExit(
      req,
      env,
      HEARTBEAT_ROUTE,
      signatureCheck.status,
      t0,
      log,
      "heartbeat.signature_failure",
      {
        deviceId: body.device_id,
        fields: { reason: signatureCheck.error }
      }
    );
    return withCors(
      req,
      env,
      json({ error: signatureCheck.error }, { status: signatureCheck.status }),
      cors
    );
  }
  const devRow = await env.DB.prepare(`SELECT profile_id FROM devices WHERE device_id = ?1`).bind(body.device_id).first();
  if (!devRow) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 401, t0, log, "heartbeat.unknown_device", {
      deviceId: body.device_id,
      fields: { reason: "unknown_device" }
    });
    return withCors(
      req,
      env,
      json({ error: "Unauthorized (unknown device)" }, { status: 401 }),
      cors
    );
  }
  if (devRow.profile_id && devRow.profile_id !== profileId) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 409, t0, log, "heartbeat.profile_mismatch", {
      deviceId: body.device_id,
      fields: {
        reason: "profile_mismatch",
        db_profile_id: devRow.profile_id,
        requested_profile_id: profileId
      }
    });
    return withCors(
      req,
      env,
      json({ error: "Profile mismatch for device" }, { status: 409 }),
      cors
    );
  }
  if (!devRow.profile_id) {
    const claim = await claimDeviceIfUnowned(env, body.device_id, profileId);
    if (!claim.ok && claim.reason === "claimed_by_other") {
      await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 409, t0, log, "heartbeat.claim_conflict", {
        deviceId: body.device_id,
        fields: { reason: "claim_conflict" }
      });
      return withCors(
        req,
        env,
        json({ error: "Profile mismatch for device" }, { status: 409 }),
        cors
      );
    }
  }
  const limitPerMinute = parsedRateLimit(env);
  if (await isRateLimited(env, HEARTBEAT_ROUTE, body.device_id, limitPerMinute)) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 429, t0, log, "heartbeat.rate_limited", {
      deviceId: body.device_id,
      fields: { reason: "rate_limited", limit_per_minute: limitPerMinute }
    });
    return withCors(req, env, json({ error: "Rate limit exceeded" }, { status: 429 }), cors);
  }
  const tsMs = tsCheck.ms ?? Date.now();
  try {
    const updatedIso = new Date(tsMs).toISOString();
    await withTransaction(env.DB, async () => {
      await env.DB.prepare(
        `UPDATE latest_state
              SET online=1, updated_at=?2, faults_json='[]'
            WHERE device_id=?1`
      ).bind(body.device_id, updatedIso).run();
      await env.DB.prepare(`UPDATE devices SET online=1, last_seen_at=?2 WHERE device_id=?1`).bind(body.device_id, updatedIso).run();
    });
    const deviceLog = log.with({ device_id: body.device_id });
    await recordOpsMetric(env, HEARTBEAT_ROUTE, 200, Date.now() - t0, body.device_id, deviceLog);
    markRequestMetricsRecorded(req);
    deviceLog.info("heartbeat.accepted", { payload_ts: new Date(tsMs).toISOString() });
    return withCors(req, env, json({ ok: true, server_time: (/* @__PURE__ */ new Date()).toISOString() }), cors);
  } catch (e) {
    await logAndRecordEarlyExit(req, env, HEARTBEAT_ROUTE, 500, t0, log, "heartbeat.db_error", {
      deviceId: body.device_id,
      level: "error",
      fields: { reason: "db_error", error: e }
    });
    return withCors(req, env, json({ error: "DB error" }, { status: 500 }), cors);
  }
}
__name(handleHeartbeat, "handleHeartbeat");

// src/routes/me.ts
async function handleMe(req, env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  return json(user);
}
__name(handleMe, "handleMe");

// src/routes/commissioning.ts
async function handleCommissioning(req, env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const scope = buildDeviceScope(user);
  if (scope.empty && !scope.isAdmin) {
    return json({ generated_at: nowISO(), devices: [], summary: { total: 0, ready: 0 } });
  }
  let where = "";
  const bind = [];
  if (!scope.isAdmin) {
    where = andWhere(where, scope.clause);
    bind.push(...scope.bind);
  }
  const rows = await env.DB.prepare(
    `SELECT d.device_id, d.site, d.online, d.last_seen_at,
              ls.supplyC, ls.returnC, ls.deltaT, ls.flowLps, ls.cop, ls.thermalKW,
              ls.mode, ls.defrost, ls.powerKW, ls.updated_at
         FROM devices d
         LEFT JOIN latest_state ls ON ls.device_id = d.device_id
         ${where}
        ORDER BY d.device_id ASC`
  ).bind(...bind).all();
  let devices;
  try {
    devices = await Promise.all(
      (rows.results ?? []).map(async (row) => ({
        device_id: presentDeviceId(row.device_id, scope.isAdmin),
        lookup: await buildDeviceLookup(row.device_id, env, scope.isAdmin),
        site: row.site ?? null,
        online: !!row.online,
        last_seen_at: row.last_seen_at ?? null,
        supplyC: row.supplyC ?? null,
        returnC: row.returnC ?? null,
        deltaT: row.deltaT ?? null,
        flowLps: row.flowLps ?? null,
        cop: row.cop ?? null,
        thermalKW: row.thermalKW ?? null,
        mode: row.mode ?? null,
        defrost: row.defrost ?? null,
        powerKW: row.powerKW ?? null,
        updated_at: row.updated_at ?? null
      }))
    );
  } catch (err) {
    loggerForRequest(req, { route: "/api/commissioning/checklist" }).error(
      "commissioning.payload_failed",
      { error: err }
    );
    return json({ error: "Server error" }, { status: 500 });
  }
  const ready = devices.filter((d) => d.online && d.deltaT !== null && d.flowLps !== null).length;
  return json({
    generated_at: nowISO(),
    devices,
    summary: {
      total: devices.length,
      ready
    }
  });
}
__name(handleCommissioning, "handleCommissioning");

// src/routes/health.ts
async function handleHealth() {
  return json({ ok: true, ts: nowISO() });
}
__name(handleHealth, "handleHealth");

// src/schemas/commissioning.ts
var COMMISSIONING_STATUSES = ["draft", "in_progress", "blocked", "completed", "failed"];
var CommissioningStatusSchema = external_exports.enum(COMMISSIONING_STATUSES);
var CommissioningRunsQuerySchema = external_exports.object({
  status: CommissioningStatusSchema.optional(),
  device: external_exports.string().trim().min(1).optional(),
  profile: external_exports.string().trim().min(1).optional(),
  limit: numericParam({ integer: true, min: 1, max: 200, defaultValue: 50 }),
  since: external_exports.string().datetime({ offset: true }).optional(),
  until: external_exports.string().datetime({ offset: true }).optional()
}).strict();
var CreateCommissioningRunSchema = external_exports.object({
  run_id: external_exports.string().trim().min(1).optional(),
  device_id: external_exports.string().trim().min(1),
  profile_id: external_exports.string().trim().min(1).optional(),
  status: CommissioningStatusSchema.default("draft"),
  started_at: external_exports.string().datetime({ offset: true }).optional(),
  completed_at: external_exports.string().datetime({ offset: true }).nullable().optional(),
  checklist: external_exports.array(external_exports.string().trim().min(1)).optional(),
  notes: external_exports.string().trim().min(1).max(4e3).optional(),
  performed_by: external_exports.string().trim().min(1).optional()
}).strict();

// src/lib/commissioning-report.ts
var encoder2 = new TextEncoder();
var REPORT_KEY_PREFIX = "reports/commissioning/";
var DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;
var PDF_LINE_HEIGHT = 18;
var PDF_ASCII_FALLBACKS = {
  "\xA0": " ",
  "\u2013": "-",
  "\u2014": "-",
  "\u2018": "'",
  "\u2019": "'",
  "\u201C": '"',
  "\u201D": '"',
  "\u2022": "*"
};
function sanitizePdfText(input) {
  return input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").split("").map((char) => {
    if (char === "\n" || char === "\r") return "\n";
    if (char === "	") return " ";
    if (char >= " " && char <= "~") return char;
    return PDF_ASCII_FALLBACKS[char] ?? "?";
  }).join("");
}
__name(sanitizePdfText, "sanitizePdfText");
function escapePdfText(input) {
  const sanitized = sanitizePdfText(input);
  return sanitized.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/\r?\n/g, " ");
}
__name(escapePdfText, "escapePdfText");
function wrapText(text2, maxWidth = 88) {
  const words = text2.split(/\s+/).filter(Boolean);
  if (!words.length) return [""];
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text2.slice(0, maxWidth)];
}
__name(wrapText, "wrapText");
function appendLine(layout, text2) {
  layout.commands.push(`(${escapePdfText(text2)}) Tj`);
  layout.cursorY -= layout.lineHeight;
  layout.commands.push(`0 -${layout.lineHeight} Td`);
}
__name(appendLine, "appendLine");
function buildContent(run, generatedAt) {
  const lines = [];
  lines.push("Commissioning Run Report");
  lines.push(`Run ID: ${run.run_id}`);
  lines.push(`Device: ${run.device_id}`);
  lines.push(`Profile: ${run.profile_id ?? "n/a"}`);
  lines.push(`Status: ${run.status}`);
  lines.push(`Started: ${run.started_at}`);
  lines.push(`Completed: ${run.completed_at ?? "n/a"}`);
  lines.push(`Performed By: ${run.performed_by ?? "n/a"}`);
  lines.push(`Generated: ${generatedAt}`);
  if (run.notes) {
    lines.push("");
    lines.push("Notes:");
    const noteLines = wrapText(run.notes);
    for (const line of noteLines) {
      lines.push(`* ${line}`);
    }
  }
  if (Array.isArray(run.checklist) && run.checklist.length) {
    lines.push("");
    lines.push("Checklist:");
    for (const item of run.checklist) {
      lines.push(`- ${item}`);
    }
  }
  const layout = {
    cursorX: 72,
    cursorY: 720,
    commands: ["BT", "/F1 12 Tf", "72 720 Td"],
    lineHeight: PDF_LINE_HEIGHT
  };
  for (const line of lines) {
    appendLine(layout, line || " ");
  }
  layout.commands.push("ET");
  return layout.commands.join("\n");
}
__name(buildContent, "buildContent");
function assemblePdf(streamContent) {
  const streamBytes = encodeLatin1(streamContent);
  const objects = [];
  objects[1] = `1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
`;
  objects[2] = `2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
`;
  objects[3] = `3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
`;
  objects[4] = `4 0 obj
<< /Length ${streamBytes.length} >>
stream
${streamContent}
endstream
endobj
`;
  objects[5] = `5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
`;
  const header = `%PDF-1.4
${String.fromCharCode(226, 227, 207, 211)}
`;
  let position = header.length;
  const offsets = [0];
  let body = header;
  for (let i = 1; i <= 5; i++) {
    const obj = objects[i];
    offsets[i] = position;
    body += obj;
    position += obj.length;
  }
  const xrefStart = position;
  let xref = `xref
0 6
0000000000 65535 f 
`;
  for (let i = 1; i <= 5; i++) {
    xref += `${offsets[i].toString().padStart(10, "0")} 00000 n 
`;
  }
  const trailer = `trailer
<< /Size 6 /Root 1 0 R >>
startxref
${xrefStart}
%%EOF
`;
  const pdfString = body + xref + trailer;
  return encodeLatin1(pdfString);
}
__name(assemblePdf, "assemblePdf");
function encodeLatin1(input) {
  const bytes = new Uint8Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    bytes[i] = input.charCodeAt(i) & 255;
  }
  return bytes;
}
__name(encodeLatin1, "encodeLatin1");
async function signReportUrl(env, key, method, ttlSeconds) {
  if (!env.APP_BASE_URL || !env.ASSET_SIGNING_SECRET) {
    return null;
  }
  const expires = Math.floor(Date.now() / 1e3) + ttlSeconds;
  const canonicalMethod = method.toUpperCase();
  const payload = `${canonicalMethod}
${key}
${expires}`;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder2.encode(env.ASSET_SIGNING_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", cryptoKey, encoder2.encode(payload));
  const signature = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const url = new URL(`/r2/${key}`, env.APP_BASE_URL);
  url.searchParams.set("exp", String(expires));
  url.searchParams.set("sig", signature);
  return url.toString();
}
__name(signReportUrl, "signReportUrl");
async function generateCommissioningReport(env, run, options = {}) {
  const bucket = env.GB_BUCKET ?? env.APP_STATIC;
  if (!bucket) {
    return null;
  }
  const generatedAt = nowISO();
  const streamContent = buildContent(run, generatedAt);
  const pdfBytes = assemblePdf(streamContent);
  const key = `${options.keyPrefix ?? REPORT_KEY_PREFIX}${run.run_id}.pdf`;
  await bucket.put(key, pdfBytes, {
    httpMetadata: { contentType: "application/pdf" }
  });
  let url = await signReportUrl(env, key, "GET", options.expiresInSeconds ?? DEFAULT_TTL_SECONDS);
  if (!url && env.APP_BASE_URL) {
    url = new URL(`/r2/${key}`, env.APP_BASE_URL).toString();
  }
  return { key, url, generated_at: generatedAt };
}
__name(generateCommissioningReport, "generateCommissioningReport");

// src/lib/commissioning-store.ts
function mapRunRow(row) {
  let checklist = null;
  if (row.checklist_json) {
    try {
      const parsed = JSON.parse(row.checklist_json);
      if (Array.isArray(parsed)) checklist = parsed.filter((item) => typeof item === "string");
    } catch {
      checklist = null;
    }
  }
  return {
    run_id: row.run_id,
    device_id: row.device_id,
    profile_id: row.profile_id,
    status: row.status,
    started_at: row.started_at,
    completed_at: row.completed_at,
    checklist,
    notes: row.notes,
    performed_by: row.performed_by,
    report_url: row.report_url,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}
__name(mapRunRow, "mapRunRow");
async function createCommissioningRun(env, params) {
  const deviceId = params.device_id;
  const id = params.run_id ?? crypto.randomUUID();
  const createdAt = params.created_at ?? nowISO();
  const updatedAt = params.updated_at ?? createdAt;
  const startedAt = params.started_at ?? createdAt;
  const completedAt = params.completed_at ?? null;
  const checklistJson = params.checklist ? JSON.stringify(params.checklist) : null;
  const notes = params.notes ?? null;
  const performedBy = params.performed_by ?? null;
  const reportUrl = null;
  let profileId = params.profile_id ?? null;
  if (!profileId) {
    const deviceRow = await env.DB.prepare(`SELECT profile_id FROM devices WHERE device_id = ?1 LIMIT 1`).bind(deviceId).first();
    if (!deviceRow) {
      return { ok: false, reason: "device_not_found" };
    }
    profileId = deviceRow.profile_id ?? null;
  } else {
    const exists = await env.DB.prepare(`SELECT 1 FROM devices WHERE device_id = ?1 LIMIT 1`).bind(deviceId).first();
    if (!exists) {
      return { ok: false, reason: "device_not_found" };
    }
  }
  try {
    await env.DB.prepare(
      `INSERT INTO commissioning_runs (
            run_id, device_id, profile_id, status, started_at,
            completed_at, checklist_json, notes, performed_by,
            report_url, created_at, updated_at
          ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)`
    ).bind(
      id,
      deviceId,
      profileId,
      params.status,
      startedAt,
      completedAt,
      checklistJson,
      notes,
      performedBy,
      reportUrl,
      createdAt,
      updatedAt
    ).run();
  } catch (err) {
    const message2 = typeof err?.message === "string" ? err.message : String(err);
    if (message2.includes("UNIQUE constraint failed")) {
      return { ok: false, reason: "conflict" };
    }
    throw err;
  }
  const row = await env.DB.prepare(`SELECT * FROM commissioning_runs WHERE run_id = ?1 LIMIT 1`).bind(id).first();
  if (!row) {
    return { ok: false, reason: "device_not_found" };
  }
  let runRecord = mapRunRow(row);
  if (runRecord.status === "completed" && !runRecord.report_url) {
    try {
      const report = await generateCommissioningReport(env, runRecord);
      if (report?.url) {
        const updatedAtNow = nowISO();
        await env.DB.prepare(`UPDATE commissioning_runs SET report_url = ?1, updated_at = ?2 WHERE run_id = ?3`).bind(report.url, updatedAtNow, runRecord.run_id).run();
        runRecord = { ...runRecord, report_url: report.url, updated_at: updatedAtNow };
      }
    } catch (error) {
      console.warn("commissioning.report_failed", {
        run_id: runRecord.run_id,
        error
      });
    }
  }
  return { ok: true, run: runRecord };
}
__name(createCommissioningRun, "createCommissioningRun");
async function listCommissioningRuns(env, filters) {
  let where = "";
  const bind = [];
  if (filters.status) {
    where = andWhere(where, "status = ?");
    bind.push(filters.status);
  }
  if (filters.device_id) {
    where = andWhere(where, "device_id = ?");
    bind.push(filters.device_id);
  }
  if (filters.profile_ids && filters.profile_ids.length) {
    const placeholders = filters.profile_ids.map(() => "?").join(",");
    where = andWhere(where, `profile_id IN (${placeholders})`);
    bind.push(...filters.profile_ids);
  } else if (filters.profile_id) {
    where = andWhere(where, "profile_id = ?");
    bind.push(filters.profile_id);
  }
  if (filters.since) {
    where = andWhere(where, "created_at >= ?");
    bind.push(filters.since);
  }
  if (filters.until) {
    where = andWhere(where, "created_at <= ?");
    bind.push(filters.until);
  }
  const sql = `SELECT * FROM commissioning_runs ${where} ORDER BY created_at DESC LIMIT ?`;
  bind.push(filters.limit);
  const rows = await env.DB.prepare(sql).bind(...bind).all();
  return (rows.results ?? []).map(mapRunRow);
}
__name(listCommissioningRuns, "listCommissioningRuns");

// src/routes/commissioning-runs.ts
async function presentRun(record, env, scope, meta) {
  const info = meta.get(record.device_id);
  const outwardId = presentDeviceId(record.device_id, scope.isAdmin);
  const lookup = await buildDeviceLookup(record.device_id, env, scope.isAdmin);
  return {
    run_id: record.run_id,
    device_id: outwardId,
    lookup,
    profile_id: record.profile_id ?? info?.profile_id ?? null,
    site: info?.site ?? null,
    status: record.status,
    started_at: record.started_at,
    completed_at: record.completed_at,
    checklist: record.checklist,
    notes: record.notes,
    performed_by: record.performed_by,
    report_url: record.report_url,
    created_at: record.created_at,
    updated_at: record.updated_at
  };
}
__name(presentRun, "presentRun");
async function handleListCommissioningRuns(req, env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const scope = buildDeviceScope(user, "cr");
  if (scope.empty && !scope.isAdmin) {
    return json({ generated_at: nowISO(), runs: [] });
  }
  const url = new URL(req.url);
  const paramsResult = validateWithSchema(CommissioningRunsQuerySchema, {
    status: url.searchParams.get("status") ?? void 0,
    device: url.searchParams.get("device") ?? void 0,
    profile: url.searchParams.get("profile") ?? void 0,
    limit: url.searchParams.get("limit") ?? void 0,
    since: url.searchParams.get("since") ?? void 0,
    until: url.searchParams.get("until") ?? void 0
  });
  if (!paramsResult.success) {
    return validationErrorResponse(paramsResult.issues);
  }
  const params = paramsResult.data;
  if (params.since && params.until) {
    const sinceMs = Date.parse(params.since);
    const untilMs = Date.parse(params.until);
    if (!Number.isNaN(sinceMs) && !Number.isNaN(untilMs) && untilMs < sinceMs) {
      return json({ error: "Invalid range" }, { status: 400 });
    }
  }
  let deviceId;
  if (params.device) {
    const resolved = await resolveDeviceId(params.device, env, scope.isAdmin);
    if (!resolved) {
      return json({ error: "Unknown device" }, { status: 404 });
    }
    deviceId = resolved;
  }
  let profileIds;
  let profileId;
  if (scope.isAdmin) {
    if (params.profile) profileId = params.profile;
  } else {
    const allowedProfiles = scope.bind;
    if (!allowedProfiles.length) {
      return json({ generated_at: nowISO(), runs: [] });
    }
    if (params.profile) {
      if (!allowedProfiles.includes(params.profile)) {
        return json({ error: "Forbidden" }, { status: 403 });
      }
      profileIds = [params.profile];
    } else {
      profileIds = allowedProfiles;
    }
    if (deviceId) {
      const deviceRow = await env.DB.prepare(`SELECT profile_id FROM devices WHERE device_id = ?1 LIMIT 1`).bind(deviceId).first();
      const deviceProfile = deviceRow?.profile_id ?? null;
      if (!deviceProfile || !allowedProfiles.includes(deviceProfile)) {
        return json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }
  const limit = params.limit ?? 50;
  const runs = await listCommissioningRuns(env, {
    status: params.status ?? void 0,
    device_id: deviceId,
    profile_id: profileId,
    profile_ids: profileIds,
    since: params.since ?? void 0,
    until: params.until ?? void 0,
    limit
  });
  const meta = await fetchDeviceMeta(env, runs.map((run) => run.device_id));
  const items = await Promise.all(runs.map((run) => presentRun(run, env, scope, meta)));
  return json({
    generated_at: nowISO(),
    runs: items
  });
}
__name(handleListCommissioningRuns, "handleListCommissioningRuns");
async function handleCreateCommissioningRun(req, env) {
  const user = await requireAccessUser(req, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const scope = buildDeviceScope(user, "cr");
  if (scope.empty && !scope.isAdmin) {
    return json({ error: "Forbidden" }, { status: 403 });
  }
  let payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parseResult = validateWithSchema(CreateCommissioningRunSchema, payload);
  if (!parseResult.success) {
    return validationErrorResponse(parseResult.issues);
  }
  const body = parseResult.data;
  const deviceId = await resolveDeviceId(body.device_id, env, scope.isAdmin);
  if (!deviceId) {
    return json({ error: "Unknown device" }, { status: 404 });
  }
  if (body.completed_at && body.started_at) {
    const startedMs = Date.parse(body.started_at);
    const completedMs = Date.parse(body.completed_at);
    if (!Number.isNaN(startedMs) && !Number.isNaN(completedMs) && completedMs < startedMs) {
      return json({ error: "Invalid lifecycle timestamps" }, { status: 400 });
    }
  }
  let resolvedProfile = body.profile_id ?? null;
  if (!scope.isAdmin) {
    const allowedProfiles = scope.bind;
    const deviceRow = await env.DB.prepare(`SELECT profile_id FROM devices WHERE device_id = ?1 LIMIT 1`).bind(deviceId).first();
    if (!deviceRow?.profile_id || !allowedProfiles.includes(deviceRow.profile_id)) {
      return json({ error: "Forbidden" }, { status: 403 });
    }
    if (resolvedProfile && resolvedProfile !== deviceRow.profile_id) {
      return json({ error: "Profile mismatch" }, { status: 400 });
    }
    resolvedProfile = deviceRow.profile_id;
  }
  const result = await createCommissioningRun(env, {
    run_id: body.run_id,
    device_id: deviceId,
    profile_id: resolvedProfile,
    status: body.status,
    started_at: body.started_at,
    completed_at: body.completed_at ?? null,
    checklist: body.checklist ?? null,
    notes: body.notes ?? null,
    performed_by: body.performed_by ?? null
  });
  if (!result.ok) {
    if (result.reason === "device_not_found") {
      return json({ error: "Unknown device" }, { status: 404 });
    }
    if (result.reason === "conflict") {
      return json({ error: "Run already exists" }, { status: 409 });
    }
    return json({ error: "Server error" }, { status: 500 });
  }
  const meta = await fetchDeviceMeta(env, [result.run.device_id]);
  const [run] = await Promise.all([presentRun(result.run, env, scope, meta)]);
  return json({ ok: true, run }, { status: 201 });
}
__name(handleCreateCommissioningRun, "handleCreateCommissioningRun");

// src/schemas/observability.ts
var optionalLimitedString = /* @__PURE__ */ __name((max) => external_exports.string().max(max).optional(), "optionalLimitedString");
var optionalTrimmedString2 = /* @__PURE__ */ __name((max) => external_exports.string().trim().max(max).optional(), "optionalTrimmedString");
var optionalStringRecord = external_exports.record(external_exports.union([external_exports.string(), external_exports.number(), external_exports.boolean(), external_exports.null()])).optional();
var ClientErrorReportSchema = external_exports.object({
  name: optionalTrimmedString2(256),
  message: optionalLimitedString(2048),
  stack: optionalLimitedString(8192),
  componentStack: optionalLimitedString(8192),
  userAgent: optionalLimitedString(1024),
  url: optionalLimitedString(2048),
  timestamp: optionalTrimmedString2(64),
  release: optionalTrimmedString2(128),
  tags: optionalStringRecord,
  extras: external_exports.unknown().optional()
}).extend({
  user: external_exports.object({
    email: optionalTrimmedString2(320),
    roles: external_exports.array(optionalTrimmedString2(128)).optional(),
    clientIds: external_exports.array(optionalTrimmedString2(128)).optional()
  }).optional()
}).passthrough();

// src/routes/observability.ts
var ROUTE_PATH = "/api/observability/client-errors";
var DEFAULT_MAX_PAYLOAD_BYTES = 16384;
var STACK_MAX_CHARS = 4096;
var COMPONENT_STACK_MAX_CHARS = 4096;
var MESSAGE_MAX_CHARS = 2048;
var EXTRAS_MAX_BYTES = 4096;
var encoder3 = new TextEncoder();
async function handleClientErrorReport(req, env) {
  const user = await requireAccessUser(req, env);
  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  let rawBody = "";
  try {
    rawBody = await req.text();
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }
  const maxBytes = resolveMaxPayloadBytes(env);
  if (encoder3.encode(rawBody).length > maxBytes) {
    return json({ error: "Payload too large" }, { status: 413 });
  }
  let payload;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = validateWithSchema(ClientErrorReportSchema, payload);
  if (!parsed.success) {
    return validationErrorResponse(parsed.issues);
  }
  const body = parsed.data;
  const log = loggerForRequest(req, { route: ROUTE_PATH });
  const sanitized = sanitizeClientErrorReport(body);
  const userContext = {
    email: user.email,
    roles: user.roles,
    client_ids: user.clientIds
  };
  const logPayload = {
    source: "frontend",
    report: sanitized.report,
    user: userContext
  };
  if (sanitized.truncatedFields.length) {
    logPayload.truncated_fields = sanitized.truncatedFields;
  }
  log.error("ui.error_boundary", logPayload);
  return json({ ok: true }, { status: 202 });
}
__name(handleClientErrorReport, "handleClientErrorReport");
function resolveMaxPayloadBytes(env) {
  const raw = env.OBSERVABILITY_MAX_BYTES?.trim();
  if (!raw) return DEFAULT_MAX_PAYLOAD_BYTES;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_MAX_PAYLOAD_BYTES;
}
__name(resolveMaxPayloadBytes, "resolveMaxPayloadBytes");
function sanitizeClientErrorReport(body) {
  const truncatedFields = [];
  const report = {
    name: body.name ?? null,
    message: truncateString(body.message, MESSAGE_MAX_CHARS, truncatedFields, "message"),
    stack: truncateString(body.stack, STACK_MAX_CHARS, truncatedFields, "stack"),
    component_stack: truncateString(
      body.componentStack,
      COMPONENT_STACK_MAX_CHARS,
      truncatedFields,
      "component_stack"
    ),
    user_agent: body.userAgent ?? null,
    url: body.url ?? null,
    timestamp: body.timestamp ?? (/* @__PURE__ */ new Date()).toISOString(),
    release: body.release ?? null,
    tags: body.tags ?? null,
    extras: sanitizeExtras(body.extras, truncatedFields),
    reporter_user: body.user ?? null
  };
  return { report, truncatedFields };
}
__name(sanitizeClientErrorReport, "sanitizeClientErrorReport");
function truncateString(value, maxLength, truncatedFields, fieldName) {
  if (typeof value !== "string") return value ?? null;
  if (value.length <= maxLength) return value;
  truncatedFields.push(fieldName);
  return `${value.slice(0, maxLength)}...`;
}
__name(truncateString, "truncateString");
function sanitizeExtras(extras, truncatedFields) {
  if (extras === void 0) return void 0;
  if (extras === null) return null;
  try {
    const serialized = JSON.stringify(extras);
    if (encoder3.encode(serialized).length <= EXTRAS_MAX_BYTES) {
      return extras;
    }
    truncatedFields.push("extras");
    return {
      truncated: true,
      bytes: encoder3.encode(serialized).length,
      note: `extras truncated above ${EXTRAS_MAX_BYTES} bytes`
    };
  } catch {
    truncatedFields.push("extras");
    return {
      truncated: true,
      note: "extras could not be serialized"
    };
  }
}
__name(sanitizeExtras, "sanitizeExtras");

// src/router.ts
var router = t();
router.get("/health", () => handleHealth());
registerMetricsRoutes(router);
registerDeviceRoutes(router, withParam);
registerTelemetryRoutes(router);
registerAdminRoutes(router);
router.get("/api/me", withAccess((req, env) => handleMe(req, env))).get("/api/fleet/summary", withAccess((req, env) => handleFleetSummary(req, env))).get(
  "/api/fleet/admin-overview",
  withAccess((req, env) => handleFleetAdminOverview(req, env))
).get("/api/client/compact", withAccess((req, env) => handleClientCompact(req, env))).get("/api/alerts", withAccess((req, env) => handleListAlertRecords(req, env))).post("/api/alerts", withAccess((req, env) => handleCreateAlertRecord(req, env))).patch(
  "/api/alerts/:id",
  withAccess(
    withParam("id", (req, env, alertId) => handleUpdateAlertRecord(req, env, alertId))
  )
).post(
  "/api/alerts/:id/comments",
  withAccess(
    withParam("id", (req, env, alertId) => handleCreateAlertComment(req, env, alertId))
  )
).get("/api/alerts/recent", withAccess((req, env) => handleAlertsFeed(req, env))).get("/api/commissioning/checklist", withAccess((req, env) => handleCommissioning(req, env))).get("/api/commissioning/runs", withAccess((req, env) => handleListCommissioningRuns(req, env))).post("/api/commissioning/runs", withAccess((req, env) => handleCreateCommissioningRun(req, env))).get("/api/archive/offline", withAccess((req, env) => handleArchive(req, env))).post(
  "/api/observability/client-errors",
  withAccess((req, env) => handleClientErrorReport(req, env))
).post(
  "/api/ingest/:profile",
  withParam("profile", (req, env, profile) => handleIngest(req, env, profile))
).post(
  "/api/heartbeat/:profile",
  withParam("profile", (req, env, profile) => handleHeartbeat(req, env, profile))
);
router.all("*", () => json({ error: "Not found" }, { status: 404 }));
function handleRequest(req, env, ctx) {
  const start = Date.now();
  initializeRequestMetrics(req);
  const logger = bindRequestLogger(req, env);
  logger.debug("request.received");
  const pathname = safePath2(req.url);
  let statusCode = null;
  return Promise.resolve(router.fetch(req, env, ctx)).then((res) => {
    statusCode = res?.status ?? 0;
    logger.info("request.completed", {
      status: statusCode,
      duration_ms: Date.now() - start
    });
    return res;
  }).catch((err) => {
    statusCode = 500;
    loggerForRequest(req).error("request.failed", {
      duration_ms: Date.now() - start,
      error: err
    });
    throw err;
  }).finally(async () => {
    try {
      if (!requestMetricsRecorded(req)) {
        const route = normalizeRoute(pathname);
        await recordOpsMetric(env, route, statusCode ?? 0, Date.now() - start, null, logger);
      }
    } catch (error) {
      logger.warn("request.metrics_failed", { error });
    } finally {
      releaseRequestLogger(req);
    }
  });
}
__name(handleRequest, "handleRequest");
function safePath2(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
__name(safePath2, "safePath");
function normalizeRoute(pathname) {
  if (pathname.startsWith("/api/ingest/")) return "/api/ingest";
  if (pathname.startsWith("/api/heartbeat/")) return "/api/heartbeat";
  if (pathname.startsWith("/api/alerts/") && pathname.split("/").length === 4) {
    return "/api/alerts/:id";
  }
  if (pathname.startsWith("/api/commissioning/runs")) {
    return "/api/commissioning/runs";
  }
  return pathname;
}
__name(normalizeRoute, "normalizeRoute");

// src/utils/asset-base.ts
var PLACEHOLDER_ORIGIN = "https://asset-base.invalid";
var ABSOLUTE_SCHEME = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
var ALLOWED_ABSOLUTE_SCHEMES = /* @__PURE__ */ new Set(["http:", "https:"]);
var UnsupportedAssetSchemeError = class extends Error {
  static {
    __name(this, "UnsupportedAssetSchemeError");
  }
  scheme;
  constructor(scheme) {
    super(`Unsupported asset base scheme: ${scheme}`);
    this.name = "UnsupportedAssetSchemeError";
    this.scheme = scheme.toLowerCase();
  }
};
function parseAssetBase(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    const url2 = new URL("/", PLACEHOLDER_ORIGIN);
    return { url: url2, kind: "root-relative", original: trimmed };
  }
  if (trimmed.startsWith("//")) {
    const url2 = new URL(`https:${trimmed}`);
    return { url: url2, kind: "protocol-relative", original: trimmed };
  }
  if (ABSOLUTE_SCHEME.test(trimmed)) {
    const scheme = trimmed.slice(0, trimmed.indexOf(":") + 1).toLowerCase();
    if (!ALLOWED_ABSOLUTE_SCHEMES.has(scheme)) {
      throw new UnsupportedAssetSchemeError(scheme);
    }
    const url2 = new URL(trimmed);
    return { url: url2, kind: "absolute", original: trimmed };
  }
  const url = new URL(trimmed, PLACEHOLDER_ORIGIN);
  const kind = trimmed.startsWith("/") ? "root-relative" : "relative";
  return { url, kind, original: trimmed };
}
__name(parseAssetBase, "parseAssetBase");
function ensureTrailingSlash(url) {
  if (!url.pathname.endsWith("/")) {
    url.pathname = `${url.pathname}/`;
  }
}
__name(ensureTrailingSlash, "ensureTrailingSlash");
function serializeAssetUrl(parsed) {
  const { url, kind } = parsed;
  const suffix = `${url.pathname}${url.search}${url.hash}`;
  switch (kind) {
    case "absolute":
      return url.toString();
    case "protocol-relative":
      return `//${url.host}${suffix}`;
    case "root-relative":
      return suffix;
    case "relative": {
      return suffix.startsWith("/") ? suffix.slice(1) : suffix;
    }
    default:
      return suffix;
  }
}
__name(serializeAssetUrl, "serializeAssetUrl");
function splitSuffix(input) {
  const match = input.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
  return {
    path: match?.[1] ?? "",
    search: match?.[2] ?? "",
    hash: match?.[3] ?? ""
  };
}
__name(splitSuffix, "splitSuffix");
function combineQueryStrings(baseSearch, suffixSearch) {
  const params = new URLSearchParams();
  if (suffixSearch) {
    const suffixParams = new URLSearchParams(suffixSearch.slice(1));
    suffixParams.forEach((value, key) => {
      params.append(key, value);
    });
  }
  if (baseSearch) {
    const baseParams = new URLSearchParams(baseSearch.slice(1));
    baseParams.forEach((value, key) => {
      params.append(key, value);
    });
  }
  const combined = params.toString();
  return combined ? `?${combined}` : "";
}
__name(combineQueryStrings, "combineQueryStrings");
function manualEnsureTrailingSlash(input) {
  const trimmed = input.trim();
  if (!trimmed) return "/";
  const match = trimmed.match(/^([^?#]*)([?#].*)?$/);
  if (!match) return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
  let path = match[1] ?? "";
  const suffix = match[2] ?? "";
  if (!path.endsWith("/")) {
    path = path ? `${path}/` : "/";
  }
  return `${path}${suffix}`;
}
__name(manualEnsureTrailingSlash, "manualEnsureTrailingSlash");
function manualExpand(base, suffix) {
  const baseMatch = base.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
  if (!baseMatch) return base.endsWith("/") ? `${base}${suffix}` : `${base}/${suffix}`;
  let basePath = baseMatch[1] ?? "";
  const baseSearch = baseMatch[2] ?? "";
  const baseHash = baseMatch[3] ?? "";
  if (!basePath.endsWith("/")) {
    basePath = basePath ? `${basePath}/` : "/";
  }
  const suffixParts = splitSuffix(suffix);
  const combinedPath = `${basePath}${suffixParts.path}`;
  const combinedSearch = combineQueryStrings(baseSearch, suffixParts.search);
  const combinedHash = suffixParts.hash || baseHash;
  return `${combinedPath}${combinedSearch}${combinedHash}`;
}
__name(manualExpand, "manualExpand");
function normalizeAssetBase(value, fallback) {
  const candidate = value?.trim()?.length ? value.trim() : fallback;
  try {
    const parsed = parseAssetBase(candidate);
    ensureTrailingSlash(parsed.url);
    return serializeAssetUrl(parsed);
  } catch (err) {
    if (err instanceof UnsupportedAssetSchemeError && candidate !== fallback) {
      systemLogger({ scope: "app_config" }).warn("asset_base_invalid_scheme", {
        value: candidate,
        fallback,
        scheme: err.scheme
      });
    }
    if (candidate !== fallback) {
      return normalizeAssetBase(void 0, fallback);
    }
    return manualEnsureTrailingSlash(candidate);
  }
}
__name(normalizeAssetBase, "normalizeAssetBase");
function expandAssetBase(assetBase, suffix) {
  const trimmedBase = assetBase.trim();
  if (!trimmedBase) {
    return suffix;
  }
  try {
    const parsed = parseAssetBase(trimmedBase);
    ensureTrailingSlash(parsed.url);
    const originalSearch = parsed.url.search;
    const originalHash = parsed.url.hash;
    const suffixParts = splitSuffix(suffix);
    parsed.url.pathname = `${parsed.url.pathname}${suffixParts.path}`;
    const combinedSearch = combineQueryStrings(originalSearch, suffixParts.search);
    parsed.url.search = combinedSearch ? combinedSearch.slice(1) : "";
    const finalHash = suffixParts.hash || originalHash;
    parsed.url.hash = finalHash ? finalHash.slice(1) : "";
    return serializeAssetUrl(parsed);
  } catch {
    return manualExpand(trimmedBase, suffix);
  }
}
__name(expandAssetBase, "expandAssetBase");

// src/app-config.ts
var DEFAULT_APP_CONFIG = {
  apiBase: "",
  assetBase: "/app/assets/"
};
var JSON_HTML_SAFE_CHARS = /[<>&\u2028\u2029]/g;
var JSON_HTML_SAFE_REPLACEMENTS = {
  "<": "\\u003C",
  ">": "\\u003E",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
var ABSOLUTE_SCHEME_PATTERN2 = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
var HTTP_SCHEME_PATTERN = /^https?:\/\//i;
var PLACEHOLDER_API_ORIGIN = "https://api-base.invalid";
function sanitizeApiPath(pathname) {
  if (!pathname || pathname === "/") {
    return "/";
  }
  const collapsed = pathname.replace(/\/{2,}/g, "/");
  if (collapsed.endsWith("/")) {
    return collapsed.replace(/\/+$/, "/");
  }
  return collapsed;
}
__name(sanitizeApiPath, "sanitizeApiPath");
function normalizeApiBase(value, fallback) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return fallback;
  }
  const hasScheme = ABSOLUTE_SCHEME_PATTERN2.test(trimmed);
  if (hasScheme && !HTTP_SCHEME_PATTERN.test(trimmed)) {
    systemLogger({ scope: "app_config" }).warn("api_base_invalid_scheme", {
      value: trimmed,
      fallback
    });
    return fallback;
  }
  try {
    const isRootRelative = trimmed.startsWith("/");
    const url = hasScheme ? new URL(trimmed) : new URL(trimmed, PLACEHOLDER_API_ORIGIN);
    url.pathname = sanitizeApiPath(url.pathname);
    const serialized = url.toString();
    if (hasScheme) {
      return serialized;
    }
    const withoutPlaceholder = serialized.replace(PLACEHOLDER_API_ORIGIN, "");
    if (isRootRelative) {
      return withoutPlaceholder;
    }
    return withoutPlaceholder.startsWith("/") ? withoutPlaceholder.slice(1) : withoutPlaceholder;
  } catch (error) {
    systemLogger({ scope: "app_config" }).warn("api_base_normalization_failed", {
      value: trimmed,
      fallback,
      error
    });
    return fallback;
  }
}
__name(normalizeApiBase, "normalizeApiBase");
function resolveAppConfig(env) {
  return {
    apiBase: normalizeApiBase(env.APP_API_BASE, DEFAULT_APP_CONFIG.apiBase),
    assetBase: normalizeAssetBase(env.APP_ASSET_BASE, DEFAULT_APP_CONFIG.assetBase),
    returnDefault: env.RETURN_DEFAULT
  };
}
__name(resolveAppConfig, "resolveAppConfig");
function serializeAppConfig(config) {
  const json3 = JSON.stringify(config);
  return json3.replace(JSON_HTML_SAFE_CHARS, (char) => JSON_HTML_SAFE_REPLACEMENTS[char] ?? char);
}
__name(serializeAppConfig, "serializeAppConfig");

// src/utils/security-options.ts
var SECURITY_OPTION_KEYS = [
  "scriptSrc",
  "scriptHashes",
  "scriptNonces",
  "styleHashes",
  "styleNonces",
  "styleSrc",
  "connectSrc",
  "imgSrc",
  "fontSrc"
];
var ALLOWED_PROTOCOLS = /* @__PURE__ */ new Set(["http:", "https:"]);
function extractOrigin(value) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (ALLOWED_PROTOCOLS.has(url.protocol)) {
      return url.origin;
    }
  } catch {
  }
  return null;
}
__name(extractOrigin, "extractOrigin");
function mergeList(base, extra) {
  if (!base && !extra) return void 0;
  const combined = [...base ?? []];
  if (extra) {
    for (const value of extra) {
      if (!combined.includes(value)) {
        combined.push(value);
      }
    }
  }
  return combined.length ? combined : void 0;
}
__name(mergeList, "mergeList");
function cloneOptions(source) {
  const clone2 = {};
  for (const key of SECURITY_OPTION_KEYS) {
    const list = source[key];
    if (list && list.length) {
      clone2[key] = [...list];
    }
  }
  return clone2;
}
__name(cloneOptions, "cloneOptions");
function baseSecurityHeaderOptions(env) {
  const config = resolveAppConfig(env);
  const apiOrigin = extractOrigin(config.apiBase);
  const assetOrigin = extractOrigin(config.assetBase);
  const base = {};
  const connectSources = [];
  if (apiOrigin) connectSources.push(apiOrigin);
  if (assetOrigin) connectSources.push(assetOrigin);
  if (connectSources.length) {
    base.connectSrc = connectSources;
  }
  if (assetOrigin) {
    base.scriptSrc = [assetOrigin];
    base.imgSrc = [assetOrigin];
    base.styleSrc = [assetOrigin];
    base.fontSrc = [assetOrigin];
  }
  return base;
}
__name(baseSecurityHeaderOptions, "baseSecurityHeaderOptions");
function mergeSecurityHeaderOptions(base, overrides) {
  if (!overrides) {
    return cloneOptions(base);
  }
  const merged = {};
  for (const key of SECURITY_OPTION_KEYS) {
    const combined = mergeList(base[key], overrides[key]);
    if (combined && combined.length) {
      merged[key] = combined;
    }
  }
  return merged;
}
__name(mergeSecurityHeaderOptions, "mergeSecurityHeaderOptions");

// src/utils/return-url.ts
var HTTP_SCHEMES2 = /* @__PURE__ */ new Set(["http:", "https:"]);
var ABSOLUTE_SCHEME2 = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
function isSafeRelativePath2(candidate) {
  return candidate.startsWith("/") && !candidate.startsWith("//");
}
__name(isSafeRelativePath2, "isSafeRelativePath");
function collectAllowedOrigins(env, requestOrigin) {
  const origins = /* @__PURE__ */ new Set([requestOrigin]);
  try {
    const appUrl = new URL(env.APP_BASE_URL);
    origins.add(appUrl.origin);
  } catch {
  }
  if (env.RETURN_DEFAULT) {
    try {
      const fallbackUrl = new URL(env.RETURN_DEFAULT, requestOrigin);
      origins.add(fallbackUrl.origin);
    } catch {
    }
  }
  return origins;
}
__name(collectAllowedOrigins, "collectAllowedOrigins");
function resolveLogoutReturn(raw, env, requestUrl) {
  const fallback = env.RETURN_DEFAULT ?? "/";
  const candidate = raw?.trim();
  if (!candidate) return fallback;
  if (isSafeRelativePath2(candidate)) {
    return candidate;
  }
  if (candidate.startsWith("//")) {
    return fallback;
  }
  try {
    const parsed = new URL(candidate, requestUrl.origin);
    if (!HTTP_SCHEMES2.has(parsed.protocol)) {
      return fallback;
    }
    const allowedOrigins = collectAllowedOrigins(env, requestUrl.origin);
    if (!allowedOrigins.has(parsed.origin)) {
      return fallback;
    }
    if (ABSOLUTE_SCHEME2.test(candidate)) {
      return parsed.toString();
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
__name(resolveLogoutReturn, "resolveLogoutReturn");

// src/r2.ts
var json2 = json;
function badRequest(msg = "Bad Request") {
  return json2({ error: msg }, { status: 400 });
}
__name(badRequest, "badRequest");
function unauthorized(msg = "Unauthorized") {
  return json2({ error: msg }, { status: 401 });
}
__name(unauthorized, "unauthorized");
function forbidden(msg = "Forbidden") {
  return json2({ error: msg }, { status: 403 });
}
__name(forbidden, "forbidden");
function notFound() {
  return json2({ error: "Not found" }, { status: 404 });
}
__name(notFound, "notFound");
function normalizeKey(pathname) {
  const key = pathname.replace(/^\/+/, "");
  if (!key) throw new Error("empty_key");
  if (key.split("/").some((segment) => segment === "..")) {
    throw new Error("invalid_key");
  }
  return key;
}
__name(normalizeKey, "normalizeKey");
function parseAllowedPrefixes(env) {
  const raw = env.ALLOWED_PREFIXES?.trim();
  if (!raw) return null;
  const prefixes = /* @__PURE__ */ new Set();
  for (const token of raw.split(",").map((part) => part.trim()).filter(Boolean)) {
    const normalized = token.replace(/^\/+/, "").replace(/\/+$/, "");
    if (!normalized) {
      return null;
    }
    prefixes.add(`${normalized}/`);
  }
  return prefixes.size ? [...prefixes] : null;
}
__name(parseAllowedPrefixes, "parseAllowedPrefixes");
function withinAllowedPrefixes(key, prefixes) {
  return !prefixes || prefixes.some((prefix) => key.startsWith(prefix));
}
__name(withinAllowedPrefixes, "withinAllowedPrefixes");
var jwksCache3 = /* @__PURE__ */ new Map();
function getJwks2(env) {
  const url = env.ACCESS_JWKS_URL;
  if (!jwksCache3.has(url)) {
    jwksCache3.set(url, createRemoteJWKSet(new URL(url)));
  }
  return jwksCache3.get(url);
}
__name(getJwks2, "getJwks");
async function requireAccess(req, env) {
  const jwt = req.headers.get("Cf-Access-Jwt-Assertion");
  if (!jwt) return null;
  try {
    const { payload } = await jwtVerify(jwt, getJwks2(env), { audience: env.ACCESS_AUD });
    return payload;
  } catch {
    return null;
  }
}
__name(requireAccess, "requireAccess");
function nowSec() {
  return Math.floor(Date.now() / 1e3);
}
__name(nowSec, "nowSec");
function hex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hex, "hex");
function safeEq(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
__name(safeEq, "safeEq");
async function verifySignedUrl(url, method, env) {
  const secret = env.ASSET_SIGNING_SECRET;
  if (!secret) return false;
  const exp = Number(url.searchParams.get("exp"));
  const sig = url.searchParams.get("sig") || "";
  if (!Number.isFinite(exp) || exp < nowSec()) return false;
  let key;
  try {
    key = normalizeKey(url.pathname);
  } catch {
    return false;
  }
  const msg = `${method.toUpperCase()}
${key}
${exp}`;
  const encoder4 = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder4.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", cryptoKey, encoder4.encode(msg));
  const expected = hex(mac);
  return safeEq(expected, sig);
}
__name(verifySignedUrl, "verifySignedUrl");
function withCors2(res) {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Vary", "Origin");
  return withSecurityHeaders(
    new Response(res.body, {
      headers,
      status: res.status,
      statusText: res.statusText
    })
  );
}
__name(withCors2, "withCors");
function rewriteUrlForPrefix(original, prefix) {
  if (!prefix) return new URL(original);
  const normalized = prefix.endsWith("/") && prefix !== "/" ? prefix.slice(0, -1) : prefix;
  if (!normalized.startsWith("/")) {
    throw new Error(`routePrefix must start with "/": ${prefix}`);
  }
  const path = original.pathname;
  if (path === normalized) {
    const clone2 = new URL(original);
    clone2.pathname = "/";
    return clone2;
  }
  if (path.startsWith(`${normalized}/`)) {
    const clone2 = new URL(original);
    clone2.pathname = path.slice(normalized.length) || "/";
    return clone2;
  }
  return null;
}
__name(rewriteUrlForPrefix, "rewriteUrlForPrefix");
async function handleR2Request(req, env, options = {}) {
  const bucket = env.GB_BUCKET;
  if (!bucket) {
    return json2({ error: "R2 bucket not configured" }, { status: 503 });
  }
  const rewrittenUrl = rewriteUrlForPrefix(new URL(req.url), options.routePrefix);
  if (!rewrittenUrl) {
    return notFound();
  }
  let key;
  try {
    key = normalizeKey(rewrittenUrl.pathname);
  } catch {
    return badRequest("Invalid object key");
  }
  const method = req.method.toUpperCase();
  const prefixes = parseAllowedPrefixes(env);
  if (!withinAllowedPrefixes(key, prefixes)) {
    return forbidden("Key not allowed");
  }
  const accessPayload = await requireAccess(req, env);
  const hasAccess = !!accessPayload;
  const hasValidSignature = await verifySignedUrl(rewrittenUrl, method, env);
  if (method === "PUT") {
    if (!hasAccess) return unauthorized();
    const contentType = req.headers.get("content-type") || void 0;
    try {
      await bucket.put(key, req.body, { httpMetadata: { contentType } });
      return json2({ ok: true, key });
    } catch (error) {
      systemLogger({ scope: "r2" }).error("r2.put_failed", { key, error });
      return json2(
        { error: "Write failed" },
        { status: 500 }
      );
    }
  }
  if (method === "DELETE") {
    if (!hasAccess) return unauthorized();
    try {
      await bucket.delete(key);
      return json2({ ok: true, key, deleted: true });
    } catch (error) {
      systemLogger({ scope: "r2" }).error("r2.delete_failed", { key, error });
      return json2(
        { error: "Delete failed" },
        { status: 500 }
      );
    }
  }
  if (method === "GET") {
    if (!hasAccess && !hasValidSignature) return unauthorized();
    const obj = await bucket.get(key);
    if (!obj) return notFound();
    const headers = new Headers();
    if (obj.httpMetadata?.contentType) headers.set("content-type", obj.httpMetadata.contentType);
    if (obj.httpMetadata?.cacheControl) headers.set("cache-control", obj.httpMetadata.cacheControl);
    if (obj.etag) headers.set("etag", obj.etag);
    if (obj.uploaded) headers.set("last-modified", obj.uploaded.toUTCString());
    return withCors2(new Response(obj.body, { headers }));
  }
  if (method === "HEAD") {
    if (!hasAccess && !hasValidSignature) return unauthorized();
    const obj = await bucket.head(key);
    if (!obj) return notFound();
    const headers = new Headers();
    if (obj.httpMetadata?.contentType) headers.set("content-type", obj.httpMetadata.contentType);
    if (obj.httpMetadata?.cacheControl) headers.set("cache-control", obj.httpMetadata.cacheControl);
    if (obj.etag) headers.set("etag", obj.etag);
    if (obj.uploaded) headers.set("last-modified", obj.uploaded.toUTCString());
    headers.set("content-length", String(obj.size));
    return withCors2(new Response(null, { headers }));
  }
  if (method === "OPTIONS") {
    const headers = new Headers();
    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Access-Control-Allow-Methods", "GET,HEAD,PUT,DELETE,OPTIONS");
    headers.set(
      "Access-Control-Allow-Headers",
      "content-type,Cf-Access-Jwt-Assertion,Cf-Access-Client-Id,Cf-Access-Client-Secret"
    );
    headers.set("Access-Control-Max-Age", "600");
    return withSecurityHeaders(new Response(null, { status: 204, headers }));
  }
  return json2(
    { error: "Method not allowed" },
    { status: 405, headers: { Allow: "GET,HEAD,PUT,DELETE,OPTIONS" } }
  );
}
__name(handleR2Request, "handleR2Request");

// src/lib/cron-cursor.ts
var UPSERT_CURSOR_SQL = `
INSERT INTO cron_cursors (name, cursor, updated_at)
VALUES (?1, ?2, ?3)
ON CONFLICT(name) DO UPDATE SET
  cursor = excluded.cursor,
  updated_at = excluded.updated_at
`;
async function readCronCursor(env, name) {
  const row = await env.DB.prepare(`SELECT cursor FROM cron_cursors WHERE name = ?1 LIMIT 1`).bind(name).first();
  return row?.cursor ?? null;
}
__name(readCronCursor, "readCronCursor");
async function writeCronCursor(env, name, cursor) {
  const cursorValue = typeof cursor === "number" ? String(Math.floor(cursor)) : String(cursor);
  await env.DB.prepare(UPSERT_CURSOR_SQL).bind(name, cursorValue, nowISO()).run();
}
__name(writeCronCursor, "writeCronCursor");
async function clearCronCursor(env, name) {
  await env.DB.prepare(`DELETE FROM cron_cursors WHERE name = ?1`).bind(name).run();
}
__name(clearCronCursor, "clearCronCursor");

// src/jobs/retention.ts
var DEFAULT_RETENTION_DAYS = 90;
var MIN_RETENTION_DAYS = 7;
var MS_PER_DAY = 24 * 60 * 60 * 1e3;
var TELEMETRY_BATCH_SIZE = 250;
var TELEMETRY_RETENTION_CRON = "15 2 * * *";
var BOOLEAN_TRUE = /* @__PURE__ */ new Set(["1", "true", "yes", "on"]);
var MAX_TELEMETRY_BATCHES_PER_RUN = 40;
var TELEMETRY_CURSOR_KEY = "retention.telemetry";
async function runTelemetryRetention(env, options = {}) {
  const startedAt = Date.now();
  const now = options.now ?? /* @__PURE__ */ new Date();
  const retentionDays = parseRetentionDays(env.TELEMETRY_RETENTION_DAYS);
  const cutoffMs = now.getTime() - retentionDays * MS_PER_DAY;
  const cutoffIso = new Date(cutoffMs).toISOString();
  const jobId = options.jobId ?? generateJobId(now);
  const baseLogger = options.logger ?? systemLogger({ task: "data-retention" });
  const log = baseLogger.with({
    job_id: jobId,
    retention_days: retentionDays,
    cutoff_iso: cutoffIso
  });
  const archiveTarget = resolveArchiveTarget(env);
  const backupRequired = isTruthy(env.RETENTION_BACKUP_BEFORE_DELETE);
  const shouldBackup = !options.dryRun && archiveTarget !== null;
  if (backupRequired && archiveTarget === null) {
    const err = new Error("Data retention job requires backup but no R2 archive bucket is configured");
    log.error("retention.backup_missing", { error: err });
    throw err;
  }
  if (!options.dryRun && archiveTarget === null) {
    log.warn("retention.backup_skipped", {
      reason: "archive bucket not configured"
    });
  }
  log.info("retention.started", {
    dry_run: Boolean(options.dryRun),
    backup_enabled: shouldBackup
  });
  let existingCursor = null;
  if (!options.dryRun) {
    const rawCursor = await readCronCursor(env, TELEMETRY_CURSOR_KEY);
    existingCursor = rawCursor ? Number(rawCursor) : null;
  }
  const telemetrySummary = await pruneTelemetry(env, {
    cutoffMs,
    cutoffIso,
    jobId,
    log: log.with({ table: "telemetry" }),
    archive: shouldBackup ? archiveTarget : null,
    dryRun: Boolean(options.dryRun),
    cursor: existingCursor
  });
  if (!options.dryRun) {
    if (telemetrySummary.resumeCursor !== null) {
      await writeCronCursor(env, TELEMETRY_CURSOR_KEY, telemetrySummary.resumeCursor);
    } else {
      await clearCronCursor(env, TELEMETRY_CURSOR_KEY);
    }
  }
  const opsDeleted = await pruneOpsMetrics2(env, {
    cutoffIso,
    dryRun: Boolean(options.dryRun),
    log: log.with({ table: "ops_metrics" })
  });
  log.info("retention.completed", {
    telemetry_deleted: telemetrySummary.deleted,
    telemetry_batches: telemetrySummary.batches,
    telemetry_backups: telemetrySummary.backups.length,
    ops_metrics_deleted: opsDeleted,
    telemetry_has_more: telemetrySummary.hasMore,
    telemetry_resume_cursor: telemetrySummary.resumeCursor
  });
  const statusCode = telemetrySummary.hasMore ? 299 : 200;
  await recordOpsMetric(env, "/cron/retention", statusCode, Date.now() - startedAt, null, log);
  return {
    retentionDays,
    cutoffMs,
    cutoffIso,
    telemetry: telemetrySummary,
    opsMetricsDeleted: opsDeleted,
    telemetryHasMore: telemetrySummary.hasMore,
    telemetryCursor: telemetrySummary.resumeCursor
  };
}
__name(runTelemetryRetention, "runTelemetryRetention");
function parseRetentionDays(raw) {
  if (!raw) return DEFAULT_RETENTION_DAYS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_RETENTION_DAYS;
  const coerced = Math.floor(parsed);
  if (coerced <= 0) return DEFAULT_RETENTION_DAYS;
  return Math.max(MIN_RETENTION_DAYS, coerced);
}
__name(parseRetentionDays, "parseRetentionDays");
function isTruthy(value) {
  if (!value) return false;
  return BOOLEAN_TRUE.has(value.trim().toLowerCase());
}
__name(isTruthy, "isTruthy");
function sanitizePrefix(prefix) {
  const trimmed = prefix.trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? trimmed : "data-retention";
}
__name(sanitizePrefix, "sanitizePrefix");
function generateJobId(now) {
  return now.toISOString().replace(/[:.]/g, "-");
}
__name(generateJobId, "generateJobId");
function resolveArchiveTarget(env) {
  const bucket = env.RETENTION_ARCHIVE ?? env.GB_BUCKET ?? null;
  if (!bucket) return null;
  const prefixInput = env.RETENTION_BACKUP_PREFIX ?? "data-retention";
  const prefix = sanitizePrefix(prefixInput);
  return { bucket, prefix };
}
__name(resolveArchiveTarget, "resolveArchiveTarget");
async function pruneTelemetry(env, params) {
  const summary = {
    scanned: 0,
    deleted: 0,
    batches: 0,
    backups: [],
    hasMore: false,
    resumeCursor: params.cursor ?? null
  };
  let cursor = params.cursor ?? 0;
  while (true) {
    const batch = await env.DB.prepare(
      `SELECT rowid, device_id, ts, metrics_json, deltaT, thermalKW, cop, cop_quality, status_json, faults_json
           FROM telemetry
          WHERE ts < ?1
            AND rowid > ?2
          ORDER BY rowid
          LIMIT ?3`
    ).bind(params.cutoffMs, cursor, TELEMETRY_BATCH_SIZE).all();
    const rows = batch.results ?? [];
    if (!rows.length) {
      summary.resumeCursor = null;
      break;
    }
    summary.scanned += rows.length;
    summary.batches += 1;
    const rowIds = rows.map((row) => row.rowid).filter((value) => typeof value === "number");
    const lastRowId = rowIds[rowIds.length - 1] ?? cursor;
    if (!params.dryRun && params.archive) {
      const key = buildArchiveKey(params.archive.prefix, params.jobId, "telemetry", summary.batches);
      const payload = rows.map(
        (row) => JSON.stringify({
          device_id: row.device_id,
          ts: toNumber(row.ts),
          metrics_json: row.metrics_json,
          deltaT: toNumberNullable(row.deltaT),
          thermalKW: toNumberNullable(row.thermalKW),
          cop: toNumberNullable(row.cop),
          cop_quality: row.cop_quality ?? null,
          status_json: row.status_json ?? null,
          faults_json: row.faults_json ?? null,
          retention_cutoff_iso: params.cutoffIso,
          retention_job_id: params.jobId
        })
      ).join("\n").concat("\n");
      await params.archive.bucket.put(key, payload, {
        httpMetadata: { contentType: "application/x-ndjson" },
        customMetadata: {
          table: "telemetry",
          cutoff_iso: params.cutoffIso,
          job_id: params.jobId
        }
      });
      summary.backups.push(key);
      params.log.info("retention.batch_backed_up", { key, rows: rows.length });
    }
    if (!params.dryRun) {
      if (rowIds.length) {
        const placeholders = rowIds.map(() => "?").join(",");
        await env.DB.prepare(`DELETE FROM telemetry WHERE rowid IN (${placeholders})`).bind(...rowIds).run();
      }
      summary.deleted += rowIds.length;
    }
    cursor = lastRowId;
    summary.resumeCursor = lastRowId;
    if (summary.batches >= MAX_TELEMETRY_BATCHES_PER_RUN) {
      summary.hasMore = true;
      params.log.warn("retention.batch_limit_reached", {
        batches: summary.batches,
        deleted: params.dryRun ? 0 : summary.deleted
      });
      break;
    }
    if (rows.length < TELEMETRY_BATCH_SIZE) {
      summary.hasMore = false;
      summary.resumeCursor = null;
      break;
    }
  }
  params.log.info("retention.table_completed", {
    scanned: summary.scanned,
    deleted: params.dryRun ? 0 : summary.deleted,
    batches: summary.batches,
    has_more: summary.hasMore,
    resume_cursor: summary.resumeCursor
  });
  return summary;
}
__name(pruneTelemetry, "pruneTelemetry");
async function pruneOpsMetrics2(env, params) {
  if (params.dryRun) {
    const countRow = await env.DB.prepare(
      `SELECT COUNT(*) AS cnt FROM ops_metrics WHERE ts < ?1`
    ).bind(params.cutoffIso).first();
    const raw = countRow?.cnt ?? 0;
    const count = typeof raw === "number" ? raw : Number(raw);
    params.log.info("retention.table_completed", {
      scanned: count,
      deleted: 0,
      batches: 0
    });
    return 0;
  }
  const result = await env.DB.prepare(`DELETE FROM ops_metrics WHERE ts < ?1`).bind(params.cutoffIso).run();
  const deleted = Number(result.meta?.changes ?? 0);
  params.log.info("retention.table_completed", {
    scanned: deleted,
    deleted,
    batches: 1
  });
  return deleted;
}
__name(pruneOpsMetrics2, "pruneOpsMetrics");
function buildArchiveKey(prefix, jobId, table, batch) {
  const padded = batch.toString().padStart(4, "0");
  return `${prefix}/${jobId}/${table}/batch-${padded}.ndjson`;
}
__name(buildArchiveKey, "buildArchiveKey");
function toNumber(value) {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Failed to coerce numeric value from '${value}'`);
  }
  return parsed;
}
__name(toNumber, "toNumber");
function toNumberNullable(value) {
  if (value === null || value === void 0) return null;
  return toNumber(value);
}
__name(toNumberNullable, "toNumberNullable");

// src/app.ts
var STATIC_CONTENT_TYPES = {
  ".html": HTML_CT,
  ".js": "application/javascript;charset=utf-8",
  ".css": "text/css;charset=utf-8"
};
var APP_R2_PREFIX = "app/";
var DEFAULT_HEARTBEAT_INTERVAL_SECS = 30;
var DEFAULT_OFFLINE_MULTIPLIER = 6;
var OFFLINE_BATCH_SIZE = 100;
var OFFLINE_MAX_BATCHES_PER_RUN = 40;
var OFFLINE_CURSOR_KEY = "offline.devices";
function extname(path) {
  const idx = path.lastIndexOf(".");
  return idx === -1 ? "" : path.slice(idx);
}
__name(extname, "extname");
function contentTypeFor(path) {
  return STATIC_CONTENT_TYPES[extname(path)] || "application/octet-stream";
}
__name(contentTypeFor, "contentTypeFor");
function coerceFiniteNumber(value, fallback) {
  if (value === void 0) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
__name(coerceFiniteNumber, "coerceFiniteNumber");
function rewriteStaticAssetBase(html, assetBase) {
  if (!assetBase) return html;
  return html.replace(/(href|src)=(["'])\/(?:app\/)?assets\/([^"']+)/g, (_match, attr, quote, suffix) => {
    const rewritten = expandAssetBase(assetBase, suffix);
    return `${attr}=${quote}${rewritten}`;
  });
}
__name(rewriteStaticAssetBase, "rewriteStaticAssetBase");
function defaultCacheControl(key) {
  if (key === "index.html") return "no-store";
  if (key.startsWith("assets/")) {
    return "public, max-age=31536000, immutable";
  }
  return "public, max-age=900, immutable";
}
__name(defaultCacheControl, "defaultCacheControl");
async function sha256Base64(content) {
  const data = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
__name(sha256Base64, "sha256Base64");
async function injectAppConfig(html, env) {
  const config = resolveAppConfig(env);
  const rewrittenHtml = rewriteStaticAssetBase(html, config.assetBase);
  const scriptContent = `window.__APP_CONFIG__=${serializeAppConfig(config)};`;
  const hash = await sha256Base64(scriptContent);
  const scriptToken = `'sha256-${hash}'`;
  const scriptTag = `<script>${scriptContent}<\/script>`;
  const closingHead = /<\/head>/i;
  const injected = closingHead.test(rewrittenHtml) ? rewrittenHtml.replace(closingHead, `  ${scriptTag}
</head>`) : `${scriptTag}
${rewrittenHtml}`;
  return { html: injected, scriptHashes: [scriptToken] };
}
__name(injectAppConfig, "injectAppConfig");
async function loadFromR2(key, env) {
  if (!("APP_STATIC" in env) || !env.APP_STATIC) return null;
  return env.APP_STATIC.get(APP_R2_PREFIX + key);
}
__name(loadFromR2, "loadFromR2");
function r2Headers(obj, fallbackCt, key) {
  const headers = new Headers();
  if (obj?.httpMetadata?.contentType) {
    headers.set("content-type", obj.httpMetadata.contentType);
  } else {
    headers.set("content-type", fallbackCt);
  }
  if (obj?.httpMetadata?.cacheControl) {
    headers.set("cache-control", obj.httpMetadata.cacheControl);
  }
  if (!headers.has("cache-control")) {
    headers.set("cache-control", defaultCacheControl(key));
  }
  return headers;
}
__name(r2Headers, "r2Headers");
async function bundleResponse(key, env) {
  const body = STATIC_BUNDLE[key];
  const ct = contentTypeFor(key);
  let payload = body;
  let scriptHashes;
  if (key === "index.html") {
    const injected = await injectAppConfig(body, env);
    payload = injected.html;
    scriptHashes = injected.scriptHashes;
  }
  const headers = new Headers({
    "content-type": ct,
    "cache-control": defaultCacheControl(key)
  });
  return { response: new Response(payload, { headers }), scriptHashes };
}
__name(bundleResponse, "bundleResponse");
async function readR2Text(obj) {
  if (obj && typeof obj.text === "function") {
    return obj.text();
  }
  return new Response(obj?.body).text();
}
__name(readR2Text, "readR2Text");
async function serveAppStatic(path, env) {
  const normalized = path.replace(/^\/app\/?/, "");
  const bundleKey = normalized && !normalized.startsWith("assets/") ? "index.html" : normalized || "index.html";
  if (!(bundleKey in STATIC_BUNDLE)) {
    return null;
  }
  const ctHint = contentTypeFor(bundleKey);
  const r2 = await loadFromR2(bundleKey, env);
  if (r2) {
    const headers = r2Headers(r2, ctHint, bundleKey);
    if (bundleKey === "index.html") {
      const raw = await readR2Text(r2);
      const injected = await injectAppConfig(raw, env);
      return {
        response: new Response(injected.html, { headers }),
        scriptHashes: injected.scriptHashes
      };
    }
    return { response: new Response(r2.body, { headers }) };
  }
  return bundleResponse(bundleKey, env);
}
__name(serveAppStatic, "serveAppStatic");
var app_default = {
  async fetch(req, env) {
    validateEnv(env);
    const url = new URL(req.url);
    const path = url.pathname;
    const baseSecurity = baseSecurityHeaderOptions(env);
    const applySecurity = /* @__PURE__ */ __name((response, overrides) => withSecurityHeaders(response, mergeSecurityHeaderOptions(baseSecurity, overrides)), "applySecurity");
    const canonicalAppRequestUrl = /* @__PURE__ */ __name((requestUrl) => {
      try {
        const canonical = new URL(env.APP_BASE_URL);
        canonical.pathname = requestUrl.pathname;
        canonical.search = requestUrl.search;
        canonical.hash = requestUrl.hash;
        return canonical;
      } catch {
        return requestUrl;
      }
    }, "canonicalAppRequestUrl");
    const respondUnauthenticated = /* @__PURE__ */ __name(() => {
      if (req.method === "GET" || req.method === "HEAD") {
        try {
          const canonicalUrl = canonicalAppRequestUrl(url);
          const loginUrl = new URL(
            `/cdn-cgi/access/login/${encodeURIComponent(env.ACCESS_AUD)}`,
            canonicalUrl
          );
          loginUrl.searchParams.set("redirect_url", canonicalUrl.toString());
          return applySecurity(Response.redirect(loginUrl.toString(), 302));
        } catch {
        }
      }
      return applySecurity(new Response("Unauthorized", { status: 401 }));
    }, "respondUnauthenticated");
    if (path === "/") {
      return Response.redirect(url.origin + "/app", 302);
    }
    const preflight = maybeHandlePreflight(req, path, env);
    if (preflight) return applySecurity(preflight);
    if (path === "/favicon.ico") {
      return applySecurity(new Response("", { status: 204 }));
    }
    if (path === "/sw-brand.js") {
      return applySecurity(
        new Response("// stub\n", { headers: { "content-type": "application/javascript" } })
      );
    }
    if (path === "/r2" || path.startsWith("/r2/")) {
      return handleR2Request(req, env, { routePrefix: "/r2" });
    }
    if (req.method === "OPTIONS") {
      return applySecurity(new Response("", { status: 204, headers: CORS_BASE }));
    }
    if (path.startsWith("/assets/")) {
      const name = decodeURIComponent(path.replace("/assets/", ""));
      const asset = ASSETS[name];
      if (!asset) return text("Not found", { status: 404 });
      return applySecurity(new Response(asset.body, { headers: { "content-type": asset.ct } }));
    }
    if (path === "/app" || path === "/app/") {
      const user = await requireAccessUser(req, env);
      if (!user) {
        return respondUnauthenticated();
      }
      const landingPath = landingFor(user);
      if (!landingPath.startsWith("/") || landingPath.startsWith("//")) {
        throw new Error(`Invalid landing path: ${landingPath}`);
      }
      const landingUrl = new URL(landingPath, env.APP_BASE_URL);
      if (url.pathname !== landingUrl.pathname) {
        return applySecurity(Response.redirect(landingUrl.toString(), 302));
      }
      const spa = await serveAppStatic("/app", env);
      if (spa) {
        const overrides = spa.scriptHashes ? { scriptHashes: spa.scriptHashes } : void 0;
        return applySecurity(spa.response, overrides);
      }
      return text("Not found", { status: 404 });
    }
    if (path === "/app/logout") {
      const ret = resolveLogoutReturn(url.searchParams.get("return"), env, url);
      const logoutUrl = new URL("/cdn-cgi/access/logout", url);
      logoutUrl.searchParams.set("return", ret);
      return Response.redirect(logoutUrl.toString(), 302);
    }
    if (path.startsWith("/app/assets/")) {
      const user = await requireAccessUser(req, env);
      if (!user) {
        return respondUnauthenticated();
      }
      const assetRes = await serveAppStatic(path, env);
      if (assetRes) {
        const overrides = assetRes.scriptHashes ? { scriptHashes: assetRes.scriptHashes } : void 0;
        return applySecurity(assetRes.response, overrides);
      }
      return text("Not found", { status: 404 });
    }
    if (path.startsWith("/app/")) {
      const user = await requireAccessUser(req, env);
      if (!user) {
        return respondUnauthenticated();
      }
      const spa = await serveAppStatic(path, env);
      if (spa) {
        const overrides = spa.scriptHashes ? { scriptHashes: spa.scriptHashes } : void 0;
        return applySecurity(spa.response, overrides);
      }
      return text("Not found", { status: 404 });
    }
    return handleRequest(req, env);
  },
  async scheduled(event, env, _ctx) {
    if (event.cron === TELEMETRY_RETENTION_CRON) {
      const retentionLog = systemLogger({ task: "retention-cron" });
      try {
        await runTelemetryRetention(env, { logger: retentionLog });
      } catch (error) {
        retentionLog.error("cron.retention.failed", { error });
      }
      return;
    }
    const log = systemLogger({ task: "offline-cron" });
    try {
      const result = await env.DB.prepare(
        `DELETE FROM ingest_nonces WHERE expires_at < ?1`
      ).bind(Date.now()).run();
      log.debug("cron.ingest_nonce_prune.completed", {
        deleted: result.meta?.changes ?? 0
      });
    } catch (error) {
      log.error("cron.ingest_nonce_prune.failed", { error });
    }
    const hbInterval = coerceFiniteNumber(
      env.HEARTBEAT_INTERVAL_SECS,
      DEFAULT_HEARTBEAT_INTERVAL_SECS
    );
    const multiplier = coerceFiniteNumber(env.OFFLINE_MULTIPLIER, DEFAULT_OFFLINE_MULTIPLIER);
    const thresholdSecs = Math.max(60, hbInterval * multiplier);
    const days = thresholdSecs / 86400;
    const offlineStartedAt = Date.now();
    const totalRow = await env.DB.prepare(
      `SELECT COUNT(*) AS cnt
           FROM devices
          WHERE online = 1
            AND (last_seen_at IS NULL OR (julianday('now') - julianday(last_seen_at)) > ?1)`
    ).bind(days).first();
    const totalStale = Number(totalRow?.cnt ?? 0);
    if (!Number.isFinite(totalStale) || totalStale <= 0) {
      await clearCronCursor(env, OFFLINE_CURSOR_KEY);
      log.debug("cron.offline_check.noop", { stale_count: 0, threshold_secs: thresholdSecs });
      await recordOpsMetric(env, "/cron/offline", 200, Date.now() - offlineStartedAt, null, log);
      return;
    }
    log.info("cron.offline_check.start", {
      stale_count: totalStale,
      threshold_secs: thresholdSecs
    });
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    const existingCursorRaw = await readCronCursor(env, OFFLINE_CURSOR_KEY);
    let cursor = existingCursorRaw ? Number(existingCursorRaw) : 0;
    let resumeCursor = existingCursorRaw ? Number(existingCursorRaw) : null;
    let processed = 0;
    let batches = 0;
    let truncated = false;
    while (true) {
      const rowsResult = await env.DB.prepare(
        `SELECT rowid, device_id
             FROM devices
            WHERE online = 1
              AND (last_seen_at IS NULL OR (julianday('now') - julianday(last_seen_at)) > ?1)
              AND rowid > ?2
            ORDER BY rowid
            LIMIT ?3`
      ).bind(days, cursor, OFFLINE_BATCH_SIZE).all();
      const rows = rowsResult.results ?? [];
      if (!rows.length) {
        resumeCursor = null;
        break;
      }
      const batchIds = rows.map((row) => row.device_id);
      batches += 1;
      const devicePlaceholders = batchIds.map(() => "?").join(",");
      await env.DB.prepare(
        `UPDATE devices SET online=0 WHERE online=1 AND device_id IN (${devicePlaceholders})`
      ).bind(...batchIds).run();
      const latestPlaceholders = batchIds.map((_, index) => `?${index + 2}`).join(",");
      await env.DB.prepare(
        `UPDATE latest_state SET online=0, updated_at=?1 WHERE device_id IN (${latestPlaceholders})`
      ).bind(ts, ...batchIds).run();
      const values = batchIds.map(() => `(?, ?, ?, ?, ?)`).join(",");
      const binds = [];
      for (const id of batchIds) {
        binds.push(ts, "/cron/offline", 200, 0, id);
      }
      await env.DB.prepare(
        `INSERT INTO ops_metrics (ts, route, status_code, duration_ms, device_id) VALUES ${values}`
      ).bind(...binds).run();
      processed += batchIds.length;
      const lastRowId = rows[rows.length - 1]?.rowid ?? cursor;
      cursor = lastRowId;
      resumeCursor = lastRowId;
      if (batches >= OFFLINE_MAX_BATCHES_PER_RUN) {
        truncated = true;
        break;
      }
      if (rows.length < OFFLINE_BATCH_SIZE) {
        resumeCursor = null;
        break;
      }
    }
    if (resumeCursor !== null) {
      await writeCronCursor(env, OFFLINE_CURSOR_KEY, resumeCursor);
    } else {
      await clearCronCursor(env, OFFLINE_CURSOR_KEY);
    }
    log.info("cron.offline_check.completed", {
      stale_count: totalStale,
      processed,
      batches,
      truncated,
      resume_cursor: resumeCursor
    });
    await recordOpsMetric(env, "/cron/offline", truncated ? 299 : 200, Date.now() - offlineStartedAt, null, log);
  }
};

// C:/Users/bradl.CRABNEBULA/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// .wrangler/tmp/bundle-rw2AgJ/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default
];
var middleware_insertion_facade_default = app_default;

// C:/Users/bradl.CRABNEBULA/AppData/Roaming/npm/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-rw2AgJ/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default,
  resolveAppConfig,
  serializeAppConfig
};
//# sourceMappingURL=app.js.map
