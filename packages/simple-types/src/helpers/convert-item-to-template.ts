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
import * as dashboard from "../dashboard";
import * as notebook from "../notebook";
import * as oic from "../oic";
import * as quickcapture from "../quickcapture";
import * as webmap from "../webmap";
import * as webmappingapplication from "../webmappingapplication";
import * as workforce from "../workforce";

/**
 * Converts an item into a template.
 *
 * @param solutionItemId The solution to contain the template
 * @param itemInfo Info about the item
 * @param destAuthentication Credentials for requests to the destination organization
 * @param srcAuthentication Credentials for requests to source items
 * @param templateDictionary Hash of facts: folder id, org URL, adlib replacements
 *
 * @returns A promise that will resolve when the template has been created
 */
export function convertItemToTemplate(
  solutionItemId: string,
  itemInfo: any,
  destAuthentication: common.UserSession,
  srcAuthentication: common.UserSession,
  templateDictionary: any
): Promise<common.IItemTemplate> {
  return new Promise<common.IItemTemplate>((resolve, reject) => {
    // Init template
    const itemTemplate: common.IItemTemplate = common.createInitializedItemTemplate(
      itemInfo
    );

    // Templatize item info property values
    itemTemplate.item.id = common.templatizeTerm(
      itemTemplate.item.id,
      itemTemplate.item.id,
      ".itemId"
    );

    // Request related items
    const relatedPromise = common.getItemRelatedItemsInSameDirection(
      itemTemplate.itemId,
      "forward",
      srcAuthentication
    );

    // Perform type-specific handling
    let dataPromise = Promise.resolve({});
    switch (itemInfo.type) {
      case "Dashboard":
      case "Feature Collection":
      case "Feature Service":
      case "Hub Initiative":
      case "Hub Page":
      case "Hub Site Application":
      case "Insights Model":
      case "Oriented Imagery Catalog":
      case "Project Package":
      case "Workforce Project":
      case "Web Map":
      case "Web Mapping Application":
      case "Web Scene":
      case "Notebook":
        dataPromise = new Promise(resolveJSON => {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          common
            .getItemDataAsJson(itemTemplate.itemId, srcAuthentication)
            .then(json => resolveJSON(json));
        });
        break;
      case "Form":
        dataPromise = common.getItemDataAsFile(
          itemTemplate.itemId,
          itemTemplate.item.name,
          srcAuthentication
        );
        break;
      case "QuickCapture Project":
        dataPromise = common.getItemResourcesFiles(
          itemTemplate.itemId,
          srcAuthentication
        );
        break;
    }

    // Errors are handled as resolved empty values; this means that there's no `reject` clause to handle, hence:
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    Promise.all([dataPromise, relatedPromise]).then(responses => {
      const [itemDataResponse, relatedItemsResponse] = responses;

      // need to pre-process for velocity urls before they could be templatized by other processors
      itemTemplate.data = common.updateVelocityReferences(
        itemDataResponse,
        itemInfo.type,
        templateDictionary
      );
      const relationships = relatedItemsResponse;

      // Save the mappings to related items & add those items to the dependencies, but not WMA Code Attachments
      itemTemplate.dependencies = [] as string[];
      itemTemplate.relatedItems = [] as common.IRelatedItems[];

      relationships.forEach(relationship => {
        /* istanbul ignore else */
        if (relationship.relationshipType !== "WMA2Code") {
          itemTemplate.relatedItems.push(relationship);
          relationship.relatedItemIds.forEach(relatedItemId => {
            if (itemTemplate.dependencies.indexOf(relatedItemId) < 0) {
              itemTemplate.dependencies.push(relatedItemId);
            }
          });
        }
      });

      let wrapupPromise = Promise.resolve(null);
      let templateModifyingPromise = Promise.resolve(itemTemplate);
      switch (itemInfo.type) {
        case "Dashboard":
          dashboard.convertItemToTemplate(itemTemplate, templateDictionary);
          break;
        case "Form":
          // Store the form's data in the solution resources, not in template
          itemTemplate.data = null;

          // Store form data
          if (itemDataResponse) {
            const originalFilename =
              itemTemplate.item.name || (itemDataResponse as File).name;
            const filename =
              originalFilename && originalFilename !== "undefined"
                ? originalFilename
                : `${itemTemplate.itemId}.zip`;
            itemTemplate.item.name = filename;
            const storageName = common.convertItemResourceToStorageResource(
              itemTemplate.itemId,
              filename,
              common.SolutionTemplateFormatVersion,
              common.SolutionResourceType.data
            );
            wrapupPromise = new Promise<void>(
              (resolveDataStorage, rejectDataStorage) => {

                // Add the data file to the template so that it can be uploaded with the other resources in the solution
                console.log(storageName.folder + "/" + storageName.filename + " add form as resource....");//???
                const dataFile: common.ISourceFile = {
                  itemId: itemTemplate.itemId,
                  file: itemDataResponse as File,
                  folder: storageName.folder,
                  filename: filename
                }
                itemTemplate.dataFile = dataFile;

                // Update the template's resources
                itemTemplate.resources.push(
                  storageName.folder + "/" + storageName.filename
                );

                resolve(itemTemplate);
              }
            );
          }
          break;
        case "Notebook":
          notebook.convertNotebookToTemplate(itemTemplate);
          break;
        case "Oriented Imagery Catalog":
          templateModifyingPromise = oic.convertItemToTemplate(
            itemTemplate,
            destAuthentication,
            srcAuthentication
          );
          break;
        case "Web Map":
        case "Web Scene":
          templateModifyingPromise = webmap.convertItemToTemplate(
            itemTemplate,
            destAuthentication,
            srcAuthentication,
            templateDictionary
          );
          break;
        case "Web Mapping Application":
          if (itemDataResponse) {
            templateModifyingPromise = webmappingapplication.convertItemToTemplate(
              itemTemplate,
              destAuthentication,
              srcAuthentication,
              templateDictionary
            );
          }
          break;
        case "Workforce Project":
          templateModifyingPromise = workforce.convertItemToTemplate(
            itemTemplate,
            destAuthentication,
            srcAuthentication,
            templateDictionary
          );
          break;
        case "QuickCapture Project":
          templateModifyingPromise = quickcapture.convertQuickCaptureToTemplate(
            itemTemplate
          );
          break;
      }

      wrapupPromise.then(
        () => {
          templateModifyingPromise.then(resolve, err =>
            reject(common.fail(err))
          );
        },
        err => reject(common.fail(err))
      );
    });
  });
}
