/*
 | Copyright 2020 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */

import * as common from "@esri/solution-common";
import { _updateDependencies } from "./quickcapture";

//#region Publish Process ---------------------------------------------------------------------------------------//

/**
 * Converts a Python Notebook item to a template.
 *
 * @param itemTemplate template for the Python Notebook
 * @return templatized itemTemplate
 */
export function convertItemToTemplate(
  itemTemplate: common.IItemTemplate
): common.IItemTemplate {
  // The templates data to process
  const data: any = itemTemplate.data;
  let dataString: string = JSON.stringify(data);

  const idTest: RegExp = /[0-9A-F]{32}/gim;

  if (data && idTest.test(dataString)) {
    const ids: string[] = dataString.match(idTest) as string[];
    const verifiedIds: string[] = [];
    ids.forEach(id => {
      if (verifiedIds.indexOf(id) === -1) {
        verifiedIds.push(id);

        // templatize the itemId--but only once per unique id
        const regEx = new RegExp(id, "gm");
        dataString = dataString.replace(regEx, "{{" + id + ".itemId}}");

        // update the dependencies
        if (itemTemplate.dependencies.indexOf(id) === -1) {
          itemTemplate.dependencies.push(id);
        }
      }
    });
    itemTemplate.data = JSON.parse(dataString);
  }

  return itemTemplate;
}

//#endregion

//#region Deploy Process ---------------------------------------------------------------------------------------//

/**
 * Update the notebooks data
 *
 * @param originalTemplate The original template item
 * @param newlyCreatedItem The current item that may have unswapped variables
 * @param templateDictionary Hash of facts: org URL, adlib replacements, deferreds for dependencies
 * @param authentication Credentials for the requests to the destination
 *
 * @return A promise that will resolve once any updates have been made
 */
export function fineTuneCreatedItem(
  originalTemplate: common.IItemTemplate,
  newlyCreatedItem: common.IItemTemplate,
  templateDictionary: any,
  authentication: common.UserSession
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const data: any = common.replaceInTemplate(
      originalTemplate.data,
      templateDictionary
    );

    const updateOptions: common.IItemUpdate = {
      id: newlyCreatedItem.itemId,
      url: newlyCreatedItem.item.url,
      data: common.jsonToBlob(data)
    };
    common
      .updateItem(updateOptions, authentication)
      .then(() => resolve(), reject);
  });
}

/**
 * Update the notebooks data
 *
 * @param itemId The AGO item id
 * @param data The notebooks data as JSON
 * @param authentication Credentials for the requests to the destination
 *
 * @return A promise that will resolve once any updates have been made
 */
export function postProcessItemDependencies(
  item: common.IItemUpdate,
  data: any,
  authentication: common.UserSession
): Promise<any> {
  return _updateItemData(item, data, authentication);
}

export function _updateItemData(
  item: common.IItemUpdate,
  data: any,
  authentication: common.UserSession
): Promise<any> {
  return new Promise((resolve, reject) => {
    const updateOptions: common.IItemUpdate = {
      ...item,
      data: common.jsonToBlob(data)
    };
    common.updateItem(updateOptions, authentication).then(
      () => resolve(),
      e => reject(common.fail(e))
    );
  });
}

//#endregion
