/** @license
 * Copyright 2018 Esri
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Provides general helper functions.
 *
 * @module generalHelpers
 */

import { IModel, createId, unique } from "@esri/hub-common";
import { ICreateItemFromTemplateResponse, IDatasourceInfo, IItemTemplate, IStringValuePair } from "./interfaces";
import { Sanitizer, sanitizeJSON } from "./libConnectors";

// ------------------------------------------------------------------------------------------------------------------ //

/**
 * Returns a URL with a query parameter appended
 *
 * @param url URL to append to
 * @param parameter Query parameter to append, prefixed with "?" or "&" as appropriate to what url already has
 * @returns New URL combining url and parameter
 */
export function appendQueryParam(url: string, parameter: string): string {
  return url + (url.indexOf("?") === -1 ? "?" : "&") + parameter;
}

/**
 * Extracts JSON from a Blob.
 *
 * @param blob Blob to use as source
 * @returns A promise that will resolve with JSON or null
 */
export function blobToJson(blob: Blob): Promise<any> {
  return new Promise<any>((resolve) => {
    blobToText(blob).then(
      (blobContents) => {
        try {
          resolve(JSON.parse(blobContents));
        } catch (err) {
          resolve(null);
        }
      },
      () => resolve(null),
    );
  });
}

/**
 * Converts a Blob to a File.
 *
 * @param blob Blob to use as source
 * @param filename Name to use for file
 * @param mimeType MIME type to override blob's MIME type
 * @returns File created out of Blob and filename
 */
export function blobToFile(blob: Blob, filename: string, mimeType?: string): File {
  return new File([blob], filename ? filename : "", {
    type: mimeType ?? blob.type, // Blobs default to type=""
  });
}

/**
 * Extracts text from a Blob.
 *
 * @param blob Blob to use as source
 * @returns A promise that will resolve with text read from blob
 */
export function blobToText(blob: Blob): Promise<string> {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = function (evt) {
      // Disable needed because Node requires cast
      const blobContents = evt.target.result;
      resolve(blobContents ? (blobContents as string) : ""); // not handling ArrayContents variant
    };
    reader.readAsText(blob);
  });
}

/**
 * Checks that a URL path ends with a slash.
 *
 * @param url URL to check
 * @returns URL, appended with slash if missing
 */
export function checkUrlPathTermination(url: string): string {
  return url ? (url.endsWith("/") ? url : url + "/") : url;
}

/**
 * Converts a hub-style item into a solutions-style item, the difference being handling of resources.
 *
 * @param hubModel Hub-style item
 * @return solutions-style item
 */
export function convertIModel(hubModel: IModel | undefined): IItemTemplate {
  const item: any = {
    ...hubModel,
  };
  item.resources = hubModel?.resources ? Object.values(hubModel.resources) : [];

  return item as IItemTemplate;
}

/**
 * Creates a random 32-character alphanumeric string.
 *
 * @returns A lowercase 32-char alphanumeric string
 * @internal
 */
export function createLongId(): string {
  // createId gets a random number, converts it to base 36 representation, then grabs chars 2-8
  return createId("") + createId("") + createId("") + createId("");
}

/**
 * Creates a random 8-character alphanumeric string that begins with an alphabetic character.
 *
 * @returns An alphanumeric string in the range [a0000000..zzzzzzzz]
 */
export function createShortId(): string {
  // Return a random number, but beginning with an alphabetic character so that it can be used as a valid
  // dotable property name. Used for unique identifiers that do not require the rigor of a full UUID -
  // i.e. node ids, process ids, etc.
  const min = 0.2777777777777778; // 0.a in base 36
  const max = 0.9999999999996456; // 0.zzzzzzzz in base 36
  return (_getRandomNumberInRange(min, max).toString(36) + "0000000").substr(2, 8);
}

/**
 * Copies an input list removing duplicates.
 *
 * @param input List to be deduped
 * @returns Deduped list; order of items in input is not maintained
 */
export function dedupe(input: string[] = []): string[] {
  if (input.length === 0) {
    return [];
  }
  const dedupedList = new Set(input);
  const output: string[] = [];
  dedupedList.forEach((value: string) => output.push(value));
  return output;
}

/**
 * Performs an asynchronous delay.
 *
 * @param ms Milliseconds to delay
 * @returns Promise when delay is complete
 */
export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Flags a failure to create an item from a template.
 *
 * @param itemType The AGO item type
 * @param id Item id to include in response
 * @returns Empty creation response
 */
export function generateEmptyCreationResponse(itemType: string, id = ""): ICreateItemFromTemplateResponse {
  return {
    item: null,
    id,
    type: itemType,
    postProcess: false,
  };
}

/**
 * Returns a regular expression matching a global search for a 32-character AGO-style id.
 *
 * @returns Regular expression
 */
export function getAgoIdRegEx(): RegExp {
  return /\b([0-9A-Fa-f]){32}\b/g;
}

/**
 * Returns a regular expression matching a global search for a 32-character AGO-style id as a Solution template variable.
 *
 * @returns Regular expression
 */
export function getAgoIdTemplateRegEx(): RegExp {
  return /{{\b([0-9A-Fa-f]){32}\b}}/g;
}

/**
 * Returns a regular expression matching a global search for a word such as an AGO-style id.
 *
 * @param word Word to search for, bounded by regular expression word boundaries (\b)
 * @returns Regular expression
 */
export function getSpecifiedWordRegEx(word: string): RegExp {
  return new RegExp(`\\b${word}\\b`, "g");
}

/**
 * Converts JSON to a Blob.
 *
 * @param json JSON to use as source
 * @returns A blob from the source JSON
 */
export function jsonToBlob(json: any): Blob {
  const uint8array = new TextEncoder().encode(JSON.stringify(json));
  const blobOptions = { type: "application/octet-stream" };
  return new Blob([uint8array], blobOptions);
}

/**
 * Converts JSON to a File.
 *
 * @param json JSON to use as source
 * @param filename Name to use for file
 * @param mimeType MIME type to override blob's MIME type
 * @returns File created out of JSON and filename
 */
export function jsonToFile(json: any, filename: string, mimeType = "application/json"): File {
  return blobToFile(jsonToBlob(json), filename, mimeType);
}

/**
 * Makes a unique copy of JSON by stringifying and parsing.
 *
 * @param json JSON to use as source
 * @returns A JSON object from the source JSON
 */
export function jsonToJson(json: any): any {
  return JSON.parse(JSON.stringify(json));
}

/**
 * Saves a blob to a file.
 *
 * @param filename Name to give file
 * @param blob Blob to save
 * @returns Promise resolving when operation is complete
 */
// Function is only used for live testing, so excluding it from coverage for now
/* istanbul ignore next */
export function saveBlobAsFile(filename: string, blob: Blob): Promise<void> {
  return new Promise<void>((resolve) => {
    const dataUrl = URL.createObjectURL(blob);
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUrl);
    linkElement.setAttribute("download", filename);
    linkElement.style.display = "none";
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    setTimeout(() => {
      URL.revokeObjectURL(dataUrl);
      resolve(null);
    }, 500);
  });
}

/**
 * Makes a deep clone, including arrays but not functions.
 *
 * @param obj Object to be cloned
 * @returns Clone of obj
 * @example
 * ```js
 * import { cloneObject } from "utils/object-helpers";
 * const original = { foo: "bar" }
 * const copy = cloneObject(original)
 * copy.foo // "bar"
 * copy === original // false
 * ```
 */
export function cloneObject(obj: { [index: string]: any }): any {
  let clone: { [index: string]: any } = {};
  // first check array
  if (Array.isArray(obj)) {
    clone = obj.map(cloneObject);
  } else if (typeof obj === "object") {
    if (obj instanceof File) {
      const fileOptions = obj.type ? { type: obj.type } : undefined;
      clone = new File([obj], obj.name, fileOptions);
    } else {
      for (const i in obj) {
        if (obj[i] != null && typeof obj[i] === "object") {
          clone[i] = cloneObject(obj[i]);
        } else {
          clone[i] = obj[i];
        }
      }
    }
  } else {
    clone = obj;
  }
  return clone;
}

/**
 * Compares two JSON objects using JSON.stringify.
 *
 * @param json1 First object
 * @param json2 Second object
 * @returns True if objects are the same
 */
export function compareJSON(json1: any, json2: any): boolean {
  return JSON.stringify(json1) === JSON.stringify(json2);
}

/**
 * Compares two JSON objects using JSON.stringify, converting empty strings to nulls.
 *
 * @param json1 First object
 * @param json2 Second object
 * @returns True if objects are the same
 */
export function compareJSONNoEmptyStrings(json1: any, json2: any): boolean {
  const jsonStr1 = JSON.stringify(json1).replace(/":""/g, '":null');
  const jsonStr2 = JSON.stringify(json2).replace(/":""/g, '":null');
  return jsonStr1 === jsonStr2;
}

/**
 *  Compares two JSON objects property by property and reports each mismatch.
 *
 * @param json1 First object
 * @param json2 Second object
 * @returns A list of mismatch report strings
 */
export function compareJSONProperties(json1: any, json2: any): string[] {
  let mismatches = [] as string[];

  const type1 = _typeof_null(json1);
  const type2 = _typeof_null(json2);

  if (type1 !== type2) {
    // Ignore "undefined" vs. "null" and vice versa
    /* istanbul ignore else */
    if ((type1 !== "undefined" && type1 !== "null") || (type2 !== "null" && type2 !== "undefined")) {
      mismatches.push("Type difference: " + type1 + " vs. " + type2);
    }
  } else {
    if (json1 !== json2) {
      switch (type1) {
        case "boolean":
          mismatches.push("Value difference: " + json1 + " vs. " + json2);
          break;
        case "number":
          mismatches.push("Value difference: " + json1 + " vs. " + json2);
          break;
        case "string":
          mismatches.push('String difference: "' + json1 + '" vs. "' + json2 + '"');
          break;
        case "object":
          const keys1 = Object.keys(json1);
          const keys2 = Object.keys(json2);
          if (keys1.length !== keys2.length || JSON.stringify(keys1) !== JSON.stringify(keys2)) {
            if (Array.isArray(json1) && Array.isArray(json2)) {
              mismatches.push("Array length difference: [" + keys1.length + "] vs. [" + keys2.length + "]");
            } else {
              mismatches.push("Props difference: " + JSON.stringify(keys1) + " vs. " + JSON.stringify(keys2));
            }
          } else {
            for (let k = 0; k < keys1.length; ++k) {
              const submismatches = compareJSONProperties(json1[keys1[k]], json2[keys2[k]]);
              if (submismatches.length > 0) {
                mismatches = mismatches.concat(submismatches);
              }
            }
          }
          break;
      }
    }
  }

  return mismatches;
}

/**
 * Sanitizes JSON and echoes changes to console.
 *
 * @param json JSON to sanitize
 * @param sanitizer Instance of Sanitizer class
 * @returns Sanitized version of `json`
 * @see https://github.com/esri/arcgis-html-sanitizer#sanitize-json
 */
export function sanitizeJSONAndReportChanges(json: any, sanitizer?: Sanitizer): any {
  const sanitizedJSON = sanitizeJSON(json, sanitizer);

  const mismatches = compareJSONProperties(json, sanitizedJSON);
  if (mismatches.length > 0) {
    console.warn("Changed " + mismatches.length + (mismatches.length === 1 ? " property" : " properties"));
    mismatches.forEach((mismatch) => console.warn("    " + mismatch));
  }

  return sanitizedJSON;
}

export function deleteItemProps(itemTemplate: any): any {
  const propsToRetain: string[] = [
    "accessInformation",
    "appCategories",
    "banner",
    "categories",
    "culture",
    "description",
    "documentation",
    "extent",
    "groupDesignations",
    "industries",
    "languages",
    "licenseInfo",
    "listed",
    "name",
    "properties",
    "proxyFilter",
    "screenshots",
    "size",
    "snippet",
    "spatialReference",
    "tags",
    "title",
    "type",
    "typeKeywords",
    "url",
  ];
  const propsToDelete: string[] = Object.keys(itemTemplate).filter((k) => propsToRetain.indexOf(k) < 0);
  deleteProps(itemTemplate, propsToDelete);
  return itemTemplate;
}

/**
 * Deletes a property from an object.
 *
 * @param obj Object with property to delete
 * @param path Path into an object to property, e.g., "data.values.webmap", where "data" is a top-level property
 *             in obj
 */
export function deleteProp(obj: any, path: string): void {
  const pathParts: string[] = path.split(".");

  if (Array.isArray(obj)) {
    obj.forEach((child: any) => deleteProp(child, path));
  } else {
    const subpath = pathParts.slice(1).join(".");
    if (typeof obj[pathParts[0]] !== "undefined") {
      if (pathParts.length === 1) {
        delete obj[path];
      } else {
        deleteProp(obj[pathParts[0]], subpath);
      }
    }
  }
}

/**
 * Deletes properties from an object.
 *
 * @param obj Object with properties to delete
 * @param props Array of properties on object that should be deleted
 */
export function deleteProps(obj: any, props: string[]): void {
  props.forEach((prop) => {
    deleteProp(obj, prop);
  });
}

/**
 * Creates an AGO-style JSON failure response with success property.
 *
 * @param e Optional error information
 * @returns JSON structure with property success set to false and optionally including `e`
 */
export function fail(e?: any): any {
  if (e) {
    return { success: false, error: e.response?.error || e.error || e };
  } else {
    return { success: false };
  }
}

/**
 * Creates an AGO-style JSON failure response with success property and extended with ids list.
 *
 * @param ids List of ids
 * @param e Optional error information
 * @returns JSON structure with property success set to false and optionally including `e`
 */
export function failWithIds(itemIds: string[], e?: any): any {
  if (e) {
    return { success: false, itemIds, error: e.error || e };
  } else {
    return { success: false, itemIds };
  }
}

/**
 * Extracts subgroup ids from item tags
 *
 * @param tags Tags in an item
 * @returns List of subgroup ids; subgroups are identified using tags that begin with "group." and end with a group id,
 * e.g., "group.8d515625ee9f49d7b4f6c6cb2a389151"; non-matching tags are ignored
 */
export function getSubgroupIds(tags: string[]): string[] {
  if (tags) {
    const containedGroupPrefix = "group.";
    return tags
      .filter((tag) => tag.startsWith(containedGroupPrefix))
      .map((tag) => tag.substring(containedGroupPrefix.length));
  } else {
    return [];
  }
}

/**
 * Extracts the ids from a string
 *
 * @param v String to examine
 * @returns List of id strings found
 * @example
 * get id from
 *   bad3483e025c47338d43df308c117308
 *   {bad3483e025c47338d43df308c117308
 *   =bad3483e025c47338d43df308c117308
 * do not get id from
 *   http: *something/name_bad3483e025c47338d43df308c117308
 *   {{bad3483e025c47338d43df308c117308.itemId}}
 *   bad3483e025c47338d43df308c117308bad3483e025c47338d43df308c117308
 */
export function getIDs(v: string): string[] {
  // lookbehind is not supported in safari
  // cannot use /(?<!_)(?<!{{)\b[0-9A-F]{32}/gi

  // use groups and filter out the ids that start with {{
  return regExTest(v, /({*)(\b[0-9A-F]{32}\b)/gi).reduce(function (acc, _v) {
    /* istanbul ignore else */
    if (_v.indexOf("{{") < 0) {
      acc.push(_v.replace("{", ""));
    }
    return acc;
  }, []);
}

/**
 * Gets a property out of a deeply nested object.
 * Does not handle anything but nested object graph
 *
 * @param obj Object to retrieve value from
 * @param path Path into an object, e.g., "data.values.webmap", where "data" is a top-level property
 *             in obj
 * @returns Value at end of path
 */
export function getProp(obj: { [index: string]: any }, path: string): any {
  return path.split(".").reduce(function (prev, curr) {
    /* istanbul ignore next no need to test undefined scenario */
    return prev ? prev[curr] : undefined;
  }, obj);
}

/**
 * Returns an array of values from an object based on an array of property paths.
 *
 * @param obj Object to retrieve values from
 * @param props Array of paths into the object e.g., "data.values.webmap", where "data" is a top-level property
 * @returns Array of the values plucked from the object; only defined values are returned
 */
export function getProps(obj: any, props: string[]): any {
  return props.reduce((a, p) => {
    const v = getProp(obj, p);
    if (v) {
      a.push(v);
    }
    return a;
  }, [] as any[]);
}

/**
 * Get a property out of a deeply nested object
 * Does not handle anything but nested object graph
 *
 * @param obj Object to retrieve value from
 * @param path Path into an object, e.g., "data.values.webmap", where "data" is a top-level property
 *             in obj
 * @param defaultV Optional value to use if any part of path--including final value--is undefined
 * @returns Value at end of path
 */
export function getPropWithDefault(obj: IStringValuePair, path: string, defaultV?: any): any {
  const value = path.split(".").reduce(function (prev, curr) {
    /* istanbul ignore next no need to test undefined scenario */
    return prev ? prev[curr] : undefined;
  }, obj);
  if (typeof value === "undefined") {
    return defaultV;
  } else {
    return value;
  }
}

/**
 * Updates a list of the items dependencies if more are found in the
 * provided value.
 *
 * @param v a string value to check for ids
 * @param deps a list of the items dependencies
 */
export function idTest(v: any, deps: string[]): void {
  const ids: any[] = getIDs(v);
  ids.forEach((id) => {
    /* istanbul ignore else */
    if (deps.indexOf(id) === -1) {
      deps.push(id);
    }
  });
}

/**
 * Sets a deeply nested property of an object.
 * Creates the full path if it does not exist.
 *
 * @param obj Object to set value of
 * @param path Path into an object, e.g., "data.values.webmap", where "data" is a top-level property in obj
 * @param value The value to set at the end of the path
 */
export function setCreateProp(obj: any, path: string, value: any) {
  const pathParts: string[] = path.split(".");
  pathParts.reduce((a: any, b: any, c: any) => {
    if (c === pathParts.length - 1) {
      a[b] = value;
      return value;
    } else {
      if (!a[b]) {
        a[b] = {};
      }
      return a[b];
    }
  }, obj);
}

/**
 * Sets a deeply nested property of an object.
 * Does nothing if the full path does not exist.
 *
 * @param obj Object to set value of
 * @param path Path into an object, e.g., "data.values.webmap", where "data" is a top-level property in obj
 * @param value The value to set at the end of the path
 */
export function setProp(obj: any, path: string, value: any) {
  if (getProp(obj, path)) {
    const pathParts: string[] = path.split(".");
    pathParts.reduce((a: any, b: any, c: any) => {
      if (c === pathParts.length - 1) {
        a[b] = value;
        return value;
      } else {
        return a[b];
      }
    }, obj);
  }
}

/**
 * Creates a timestamp string using the current UTC date and time.
 *
 * @returns Timestamp formatted as YYYYMMDD_hhmm_ssmmm, with month one-based and all values padded with zeroes on the
 * left as needed (`ssmmm` stands for seconds from 0..59 and milliseconds from 0..999)
 * @private
 */
export function getUTCTimestamp(): string {
  const now = new Date();
  return (
    _padPositiveNum(now.getUTCFullYear(), 4) +
    _padPositiveNum(now.getUTCMonth() + 1, 2) +
    _padPositiveNum(now.getUTCDate(), 2) +
    "_" +
    _padPositiveNum(now.getUTCHours(), 2) +
    _padPositiveNum(now.getUTCMinutes(), 2) +
    "_" +
    _padPositiveNum(now.getUTCSeconds(), 2) +
    _padPositiveNum(now.getUTCMilliseconds(), 3)
  );
}

/**
 * Tests if an object's `item.typeKeywords` or `typeKeywords` properties has any of a set of keywords.
 *
 * @param jsonObj Object to test
 * @param keywords List of keywords to look for in jsonObj
 * @returns Boolean indicating result
 */
export function hasAnyKeyword(jsonObj: any, keywords: string[]): boolean {
  const typeKeywords = getProp(jsonObj, "item.typeKeywords") || jsonObj.typeKeywords || [];
  return keywords.reduce((a, kw) => {
    if (!a) {
      a = typeKeywords.includes(kw);
    }
    return a;
  }, false);
}

/**
 * Tests if an object's `item.typeKeywords` or `typeKeywords` properties has a specific keyword.
 *
 * @param jsonObj Object to test
 * @param keyword Keyword to look for in jsonObj
 * @returns Boolean indicating result
 */
export function hasTypeKeyword(jsonObj: any, keyword: string): boolean {
  const typeKeywords = getProp(jsonObj, "item.typeKeywords") || jsonObj.typeKeywords || [];
  return typeKeywords.includes(keyword);
}

/**
 * Will return the provided title if it does not exist as a property
 * in one of the objects at the defined path. Otherwise the title will
 * have a numerical value attached.
 *
 * @param title The root title to test
 * @param templateDictionary Hash of the facts
 * @param path to the objects to evaluate for potantial name clashes
 * @returns string The unique title to use
 */
export function getUniqueTitle(title: string, templateDictionary: any, path: string): string {
  title = title ? title.trim() : "_";
  const objs: any[] = getProp(templateDictionary, path) || [];
  const titles: string[] = objs.map((obj) => {
    return obj.title;
  });
  let newTitle: string = title;
  let i: number = 0;
  while (titles.indexOf(newTitle) > -1) {
    i++;
    newTitle = title + " " + i;
  }
  return newTitle;
}

/**
 * Performs string replacement on every string in an object.
 *
 * @param obj Object to scan and to modify
 * @param pattern Search pattern in each string
 * @param replacement Replacement for matches to search pattern
 * @returns Modified obj is returned
 */
export function globalStringReplace(obj: any, pattern: RegExp, replacement: string): any {
  if (obj) {
    Object.keys(obj).forEach((prop) => {
      const propObj = obj[prop];
      if (propObj) {
        /* istanbul ignore else */
        if (typeof propObj === "object") {
          globalStringReplace(propObj, pattern, replacement);
        } else if (typeof propObj === "string") {
          obj[prop] = obj[prop].replace(pattern, replacement);
        }
      }
    });
  }
  return obj;
}

/**
 * Tests if an array of DatasourceInfos has a given item and layer id already.
 *
 * @param datasourceInfos Array of DatasourceInfos to evaluate
 * @param itemId The items id to check for
 * @param layerId The layers id to check for
 * @returns Boolean indicating result
 */
export function hasDatasource(datasourceInfos: IDatasourceInfo[], itemId: string, layerId: number): boolean {
  return datasourceInfos.some((ds) => ds.itemId === itemId && ds.layerId === layerId);
}

/**
 * remove templatization from item id to compare
 *
 * @example
 * \{\{934a9ef8efa7448fa8ddf7b13cef0240.itemId\}\}
 * returns 934a9ef8efa7448fa8ddf7b13cef0240
 */
export function cleanItemId(id: any): any {
  return id ? id.replace("{{", "").replace(".itemId}}", "") : id;
}

/**
 * remove templatization from layer based item id to compare
 *
 * @example
 * \{\{934a9ef8efa7448fa8ddf7b13cef0240.layer0.itemId\}\}
 * returns 934a9ef8efa7448fa8ddf7b13cef0240
 */
export function cleanLayerBasedItemId(id: any): any {
  return id ? id.replace("{{", "").replace(/([.]layer([0-9]|[1-9][0-9])[.](item|layer)Id)[}]{2}/, "") : id;
}

/**
 * remove templatization from layer id to compare
 *
 * @example
 * \{\{934a9ef8efa7448fa8ddf7b13cef0240.layer0.layerId\}\}
 * returns 0
 */
export function cleanLayerId(id: any) {
  return id?.toString()
    ? parseInt(
        id
          .toString()
          .replace(/[{]{2}.{32}[.]layer/, "")
          .replace(/[.]layerId[}]{2}/, ""),
        10,
      )
    : id;
}

/**
 * Get template from list of templates by ID
 *
 * @param templates Array of item templates to search
 * @param id of template we are searching for
 *
 * @returns Template associated with the user provided id argument
 */
export function getTemplateById(templates: IItemTemplate[], id: string): any {
  let template;
  templates.some((_template) => {
    if (_template.itemId === id) {
      template = _template;
      return true;
    }
    return false;
  });
  return template;
}

/**
 * Evaluates a value with a regular expression
 *
 * @param v a string value to test with the expression
 * @param ex the regular expresion to test with
 * @returns an array of matches
 */
export function regExTest(v: any, ex: RegExp): any[] {
  return v && ex.test(v) ? v.match(ex) : [];
}

/**
 * Removes duplicates from a list of strings.
 *
 * @param list List to be de-duped
 * @returns List of unique strings
 */
export function uniqueStringList(list: string[]): string[] {
  return list.filter(unique);
}

// ------------------------------------------------------------------------------------------------------------------ //

/**
 * Creates a random number between two values.
 *
 * @param min Inclusive minimum desired value
 * @param max Non-inclusive maximum desired value
 * @returns Random number in the range [min, max)
 */
export function _getRandomNumberInRange(min: number, max: number): number {
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random#Getting_a_random_number_between_two_values
  // © 2006 IvanWills
  // MIT license https://opensource.org/licenses/mit-license.php
  return Math.random() * (max - min) + min;
}

/**
 * Pads the string representation of a number to a minimum width. Requires modern browser.
 *
 * @param n Number to pad
 * @param totalSize Desired *minimum* width of number after padding with zeroes
 * @returns Number converted to string and padded on the left as needed
 * @private
 */
export function _padPositiveNum(n: number, totalSize: number): string {
  let numStr = n.toString();
  const numPads = totalSize - numStr.length;
  if (numPads > 0) {
    numStr = "0".repeat(numPads) + numStr; // TODO IE11 does not support repeat()
  }
  return numStr;
}

/**
 * Implements rejected ECMA proposal to change `typeof null` from "object" to "null".
 *
 * @param value Value whose type is sought
 * @returns "null" if `value` is null; `typeof value` otherwise
 * @see https://web.archive.org/web/20160331031419/http://wiki.ecmascript.org:80/doku.php?id=harmony:typeof_null
 * @private
 */
function _typeof_null(value: any): string {
  return value === null ? "null" : typeof value;
}
