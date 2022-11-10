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
 * Manages the creation and deployment of item types that contain files.
 *
 * @module file
 */

import * as common from "@esri/solution-common";

// ------------------------------------------------------------------------------------------------------------------ //

/**
 * Converts a file item into a template.
 *
 * @param solutionItemId The solution to contain the template
 * @param itemInfo Info about the item
 * @param destAuthentication Credentials for requests to the destination organization
 * @param srcAuthentication Credentials for requests to source items
 * @returns A promise that will resolve when the template has been created
 */
export function convertItemToTemplate(
  solutionItemId: string,
  itemInfo: any,
  destAuthentication: common.UserSession,
  srcAuthentication: common.UserSession
): Promise<common.IItemTemplate> {
  return new Promise<common.IItemTemplate>(resolve => {
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

    // Request file
    const dataPromise = new Promise<File>(dataResolve => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      common
        .getItemDataAsFile(
          itemTemplate.itemId,
          itemTemplate.item.name,
          srcAuthentication
        )
        .then(response => {
          if (!response || response.size === 0) {
            dataResolve(null);
          } else {
            dataResolve(response);
          }
        });
    });

    // Request related items
    const relatedPromise = Promise.resolve(
      {} as common.IGetRelatedItemsResponse
    );

    // Errors are handled as resolved empty values; this means that there's no `reject` clause to handle, hence:
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    Promise.all([dataPromise, relatedPromise]).then(responses => {
      const [itemDataResponse] = responses;

      if (itemDataResponse) {
        const resource: common.IFileMimeTyped = common.convertBlobToSupportableResource(
          itemDataResponse,
          itemTemplate.item.name
        );
        itemTemplate.properties[resource.filename] = resource.mimeType;

        const storageName = common.convertItemResourceToStorageResource(
          itemTemplate.itemId,
          (resource.blob as File).name,
          common.SolutionTemplateFormatVersion,
          ((resource.blob as File).name === resource.filename
              ? common.SolutionResourceType.data
              : common.SolutionResourceType.fakezip)
        );

        // Add the data file to the template so that it can be uploaded with the other resources in the solution
        const dataFile: common.ISourceFile = {
          itemId: itemTemplate.itemId,
          file: resource.blob as File,
          folder: storageName.folder,
          filename: storageName.filename
        }
        itemTemplate.dataFile = dataFile;

        // Update the template's resources
        itemTemplate.resources.push(
          storageName.folder + "/" + storageName.filename
        );

        resolve(itemTemplate);
      } else {
        resolve(itemTemplate);
      }
    });
  });
}

export function createItemFromTemplate(
  template: common.IItemTemplate,
  templateDictionary: any,
  destinationAuthentication: common.UserSession,
  itemProgressCallback: common.IItemProgressCallback
): Promise<common.ICreateItemFromTemplateResponse> {
  return new Promise<common.ICreateItemFromTemplateResponse>(resolve => {
    // Interrupt process if progress callback returns `false`
    if (
      !itemProgressCallback(
        template.itemId,
        common.EItemProgressStatus.Started,
        0
      )
    ) {
      itemProgressCallback(
        template.itemId,
        common.EItemProgressStatus.Ignored,
        0
      );
      resolve(common.generateEmptyCreationResponse(template.type));
      return;
    }

    // Replace the templatized symbols in a copy of the template
    let newItemTemplate: common.IItemTemplate = common.cloneObject(template);
    newItemTemplate = common.replaceInTemplate(
      newItemTemplate,
      templateDictionary
    );
    /* istanbul ignore else */
    if (template.item.thumbnail) {
      newItemTemplate.item.thumbnail = template.item.thumbnail;
    }

    // Create the item, then update its URL with its new id
    common
      .createItemWithData(
        newItemTemplate.item,
        newItemTemplate.data,
        destinationAuthentication,
        templateDictionary.folderId
      )
      .then(
        createResponse => {
          // Interrupt process if progress callback returns `false`
          if (
            !itemProgressCallback(
              template.itemId,
              common.EItemProgressStatus.Created,
              template.estimatedDeploymentCostFactor / 2,
              createResponse.id
            )
          ) {
            itemProgressCallback(
              template.itemId,
              common.EItemProgressStatus.Cancelled,
              0
            );
            common
              .removeItem(createResponse.id, destinationAuthentication)
              .then(
                () =>
                  resolve(common.generateEmptyCreationResponse(template.type)),
                () =>
                  resolve(common.generateEmptyCreationResponse(template.type))
              );
          } else {
            // Add the new item to the settings
            newItemTemplate.itemId = createResponse.id;
            templateDictionary[template.itemId] = {
              itemId: createResponse.id
            };

            itemProgressCallback(
              template.itemId,
              common.EItemProgressStatus.Finished,
              template.estimatedDeploymentCostFactor / 2,
              createResponse.id
            );

            resolve({
              item: newItemTemplate,
              id: createResponse.id,
              type: newItemTemplate.type,
              postProcess: false
            });
          }
        },
        () => {
          itemProgressCallback(
            template.itemId,
            common.EItemProgressStatus.Failed,
            0
          );
          resolve(common.generateEmptyCreationResponse(template.type)); // fails to create item
        }
      );
  });
}
