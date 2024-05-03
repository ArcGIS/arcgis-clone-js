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
 * Manages the creation of Form templates
 *
 * @module convert-item-to-template
 */

import { UserSession, IItemTemplate } from "@esri/solution-common";
import { simpleTypes } from "@esri/solution-simple-types";

/**
 * Creates a template from a Form item
 *
 * @param {any} itemInfo: The base item info
 * @param {UserSession} destAuthentication Credentials for requests to the destination organization
 * @param {UserSession} srcAuthentication Credentials for requests to source items
 * @param {any} templateDictionary Hash of facts: folder id, org URL, adlib replacements
 * @returns {Promise<IItemTemplate>}
 */
export function convertItemToTemplate(
  itemInfo: any,
  destAuthentication: UserSession,
  srcAuthentication: UserSession,
  templateDictionary: any
): Promise<IItemTemplate> {
  return new Promise<IItemTemplate>((resolve, reject) => {
    console.log("Web Tool: convertItemToTemplate")
    resolve(null);
  });

  // Delegate to simple types
  // return simpleTypes.convertItemToTemplate(
  //   itemInfo,
  //   destAuthentication,
  //   srcAuthentication,
  //   templateDictionary
  // );
}
