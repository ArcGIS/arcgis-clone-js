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

import * as common from "@esri/solution-common";
// Need to import collectively to enable spying
import * as notebookHelpers from "./helpers/notebook-helpers";

/**
 * Converts a notebook item into a template.
 *
 * @param itemInfo Info about the item
 * @param destAuthentication Credentials for requests to the destination organization
 * @param srcAuthentication Credentials for requests to source items
 * @param templateDictionary Hash of facts: folder id, org URL, adlib replacements
 * @returns A promise that will resolve when the template has been created
 */
export function convertItemToTemplate(
  itemInfo: any,
  destAuthentication: common.UserSession,
  srcAuthentication: common.UserSession,
  templateDictionary: any,
): Promise<common.IItemTemplate> {
  // Delegate back to simple-types, which will in-turn delegate
  // to convertNotebookToTemplate at the correct point in the process
  // This is a temporary refactor step
  return notebookHelpers.convertItemToTemplate(itemInfo, destAuthentication, srcAuthentication, templateDictionary);
}

// Delegate back to simple-types
// This is a temporary refactor step
export function createItemFromTemplate(
  template: common.IItemTemplate,
  templateDictionary: any,
  destinationAuthentication: common.UserSession,
  itemProgressCallback: common.IItemProgressCallback,
): Promise<common.ICreateItemFromTemplateResponse> {
  return notebookHelpers.createItemFromTemplate(
    template,
    templateDictionary,
    destinationAuthentication,
    itemProgressCallback,
  );
}

/**
 * Converts a Python Notebook item to a template.
 *
 * @param itemTemplate template for the Python Notebook
 * @returns templatized itemTemplate
 */
export function convertNotebookToTemplate(itemTemplate: common.IItemTemplate): Promise<common.IItemTemplate> {
  return new Promise<common.IItemTemplate>((resolve) => {
    deleteProps(itemTemplate.data);
    resolve(itemTemplate);
  });
}

/**
 * Swap any ids found in the items data section with itemId variables
 *
 * @param templates IItemTemplate[] all templates for the current solution
 * @returns templatized IItemTemplate[]
 */
export async function postProcessNotebookTemplates(templates: common.IItemTemplate[]): Promise<common.IItemTemplate[]> {
  return new Promise<common.IItemTemplate[]>((resolve) => {
    const hasNotebook = templates.some((t) => {
      return t.type === "Notebook";
    });
    if (hasNotebook) {
      const ids = templates.reduce((prev, cur: common.IItemTemplate) => {
        prev = [...new Set([...prev, ...cur.dependencies, cur.itemId])];
        return prev;
      }, []);
      templates = templates.map((t) => {
        if (t.type === "Notebook") {
          let dataString: string = JSON.stringify(t.data);
          ids.forEach((id) => {
            const idTest = new RegExp(id, "gim");
            if (t.data && idTest.test(dataString)) {
              dataString = dataString.replace(id, "{{" + id + ".itemId}}");
              if (t.dependencies.indexOf(id) < 0) {
                t.dependencies.push(id);
              }
            }
          });
          return t;
        }
      });
    }
    resolve(templates);
  });
}

/**
 * Remove interpreter and papermill props
 *
 * This function will update the data passed in by removing key props
 *
 * @param data The notebooks data object
 *
 */
export function deleteProps(data: any): void {
  /* istanbul ignore else */
  if (data) {
    const props: string[] = ["metadata.interpreter", "metadata.papermill"];
    common.deleteProps(data, props);
    (data.cells || []).forEach((cell: any) => {
      common.deleteProps(cell, props);
    });
  }
}

/**
 * Update the notebooks data
 *
 * @param originalTemplate The original template item
 * @param newlyCreatedItem The current item that may have unswapped variables
 * @param templateDictionary Hash of facts: org URL, adlib replacements, deferreds for dependencies
 * @param authentication Credentials for the requests to the destination
 *
 * @returns A promise that will resolve once any updates have been made
 */
export function fineTuneCreatedItem(
  originalTemplate: common.IItemTemplate,
  newlyCreatedItem: common.IItemTemplate,
  templateDictionary: any,
  authentication: common.UserSession,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const updateOptions: common.IItemUpdate = {
      id: newlyCreatedItem.itemId,
      url: newlyCreatedItem.item.url,
      data: common.jsonToFile(newlyCreatedItem.data, newlyCreatedItem.itemId + ".ipynb"),
    };
    common.updateItem(updateOptions, authentication).then(() => resolve(null), reject);
  });
}

/**
 * Notebook specific post-processing actions
 *
 * @param {string} itemId The item ID
 * @param {string} type The template type
 * @param {any[]} itemInfos Array of \{id: 'ef3', type: 'Web Map'\} objects
 * @param {any} templateDictionary The template dictionary
 * @param {UserSession} authentication The destination session info
 * @returns {Promise<any>}
 */
export function postProcess(
  itemId: string,
  type: string,
  itemInfos: any[],
  template: common.IItemTemplate,
  templates: common.IItemTemplate[],
  templateDictionary: any,
  authentication: common.UserSession,
): Promise<any> {
  return common.updateItemTemplateFromDictionary(itemId, templateDictionary, authentication);
}
