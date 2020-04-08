/** @license
 * Copyright 2020 Esri
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
 * Provides connectors to third-party helper functions.
 */

//#region arcgis-html-sanitizer ------------------------------------------------------------------------------------- //

import * as arcgisSanitizer from "@esri/arcgis-html-sanitizer";

/**
 * Result of checking if a string contains invalid HTML.
 */
export interface IValidationResult {
  /*
   * Flag indicating if `html` is valid (i.e., contains no invalid HTML)
   */
  isValid: boolean;
  /*
   * Sanitized version of `html`
   */
  sanitized: string;
}

/**
 * Sanitizes html.
 *
 * @param HTML Text to sanitize
 * @param sanitizer Instance of Sanitizer class
 * @return Sanitized version of `html`
 * @see https://github.com/esri/arcgis-html-sanitizer#basic-usage
 */
export function sanitizeHTML(
  html: string,
  sanitizer?: arcgisSanitizer.Sanitizer
): string {
  if (!sanitizer) {
    sanitizer = new arcgisSanitizer.Sanitizer();
  }

  return sanitizer.sanitize(html);
}

/**
 * Sanitizes JSON.
 *
 * @param json JSON to sanitize
 * @param sanitizer Instance of Sanitizer class
 * @return Sanitized version of `json`
 * @see https://github.com/esri/arcgis-html-sanitizer#sanitize-json
 */
export function sanitizeJSON(
  json: any,
  sanitizer?: arcgisSanitizer.Sanitizer
): any {
  if (!sanitizer) {
    sanitizer = new arcgisSanitizer.Sanitizer();
  }

  return sanitizer.sanitize(json);
}

/**
 * Sanitizes the protocol in a URL.
 *
 * @param url URL to sanitize
 * @param sanitizer Instance of Sanitizer class
 * @return Sanitized version of `url`
 * @see https://github.com/esri/arcgis-html-sanitizer#sanitize-urls
 */
export function sanitizeURLProtocol(
  url: string,
  sanitizer?: arcgisSanitizer.Sanitizer
): string {
  if (!sanitizer) {
    sanitizer = new arcgisSanitizer.Sanitizer();
  }

  return sanitizer.sanitizeUrl(url);
}

/**
 * Checks if a string contains invalid HTML.
 *
 * @param html HTML to check
 * @param sanitizer Instance of Sanitizer class
 * @return An object containing a flag indicating if `html` is valid (i.e., contains no invalid HTML)
 * as well as the sanitized version of `html`
 * @see https://github.com/esri/arcgis-html-sanitizer#basic-usage
 */
export function validateHTML(
  html: string,
  sanitizer?: arcgisSanitizer.Sanitizer
): IValidationResult {
  if (!sanitizer) {
    sanitizer = new arcgisSanitizer.Sanitizer();
  }

  return sanitizer.validate(html);
}

//#endregion ------------------------------------------------------------------------------------------------------------//
