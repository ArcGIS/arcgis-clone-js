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
 * Manages the creation and deployment of simple item types.
 *
 * @module simple-types
 */

import * as auth from "@esri/arcgis-rest-auth";
import * as common from "@esri/solution-common";
import * as dashboard from "./dashboard";
import * as form from "./form";
import * as portal from "@esri/arcgis-rest-portal";
import * as webmap from "./webmap";
import * as webmappingapplication from "./webmappingapplication";

// ------------------------------------------------------------------------------------------------------------------ //

export function convertItemToTemplate(
  solutionItemId: string,
  itemInfo: any,
  userSession: auth.UserSession,
  isGroup = false
): Promise<common.IItemTemplate> {
  return new Promise<common.IItemTemplate>(resolve => {
    console.log(
      "converting " +
        (isGroup ? "Group" : itemInfo.type) +
        ' "' +
        itemInfo.title +
        '" (' +
        itemInfo.id +
        ")..."
    );
    const requestOptions: auth.IUserRequestOptions = {
      authentication: userSession
    };

    // Init template
    const itemTemplate: common.IItemTemplate = isGroup
      ? common.createInitializedGroupTemplate(itemInfo)
      : common.createInitializedItemTemplate(itemInfo);
    itemTemplate.estimatedDeploymentCostFactor = 2; // minimal set is starting, creating, done|failed

    // Templatize item info property values
    itemTemplate.item.id = common.templatizeTerm(
      itemTemplate.item.id,
      itemTemplate.item.id,
      ".id"
    );
    if (itemTemplate.item.item) {
      itemTemplate.item.item = common.templatizeTerm(
        itemTemplate.item.item,
        itemTemplate.item.item,
        ".id"
      );
    }

    if (!isGroup) {
      // Use the initiative's extent
      // if (itemTemplate.item.extent) {
      //   itemTemplate.item.extent = "{{initiative.extent:optional}}";
      // }

      // Request item resources
      const resourcePromise = portal
        .getItemResources(itemTemplate.itemId, requestOptions)
        .then(resourcesResponse => {
          // Save resources to solution item
          itemTemplate.resources = (resourcesResponse.resources as any[]).map(
            (resourceDetail: any) => resourceDetail.resource
          );
          const resourceItemFilePaths: common.ISourceFileCopyPath[] = common.generateSourceItemFilePaths(
            "https://www.arcgis.com/sharing/",
            itemTemplate.itemId,
            itemTemplate.item.thumbnail,
            itemTemplate.resources
          );
          return common.copyFilesToStorageItem(
            requestOptions,
            resourceItemFilePaths,
            solutionItemId,
            requestOptions
          );
        })
        .catch(() => Promise.resolve([]));

      // Perform type-specific handling
      let dataPromise = Promise.resolve({});
      switch (itemInfo.type.toLowerCase()) {
        case "dashboard":
        case "feature service":
        case "project package":
        case "workforce project":
        case "web map":
        case "web mapping application":
          dataPromise = getItemData(itemTemplate.itemId, userSession);
          break;
        case "form":
          break;
      }

      // Items without a data section return an error from the REST library, so we'll need to prevent it
      // from killing off both promises. This means that there's no `reject` clause to handle, hence:
      // tslint:disable-next-line:no-floating-promises
      Promise.all([
        dataPromise.catch(() => null),
        resourcePromise.catch(() => null)
      ]).then(responses => {
        const [itemDataResponse, savedResourceFilenames] = responses;
        itemTemplate.data = itemDataResponse ? itemDataResponse : [];
        itemTemplate.resources = savedResourceFilenames
          ? savedResourceFilenames
          : [];

        switch (itemInfo.type.toLowerCase()) {
          case "dashboard":
            dashboard.convertItemToTemplate(itemTemplate);
            break;
          case "form":
            form.convertItemToTemplate(itemTemplate);
            break;
          case "web map":
            webmap.convertItemToTemplate(itemTemplate);
            break;
          case "web mapping application":
            webmappingapplication.convertItemToTemplate(itemTemplate);
            break;
        }

        console.log(
          "converted " +
            itemInfo.type +
            ' "' +
            itemInfo.title +
            '" (' +
            itemInfo.id +
            ")"
        );
        resolve(itemTemplate);
      });
    } else {
      // Get the group's items--its dependencies
      common.getGroupContents(itemInfo.id, requestOptions).then(
        groupContents => {
          itemTemplate.type = "Group";
          itemTemplate.dependencies = groupContents;
          resolve(itemTemplate);
        },
        () => resolve(itemTemplate)
      );
    }
  });
}

export function createItemFromTemplate(
  template: common.IItemTemplate,
  resourceFilePaths: common.IDeployFileCopyPath[],
  storageUserSession: auth.UserSession,
  templateDictionary: any,
  destinationUserSession: auth.UserSession,
  progressTickCallback: () => void
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    console.log(
      "createItemFromTemplate for a " +
        template.type +
        " (" +
        template.itemId +
        ")"
    );

    // Replace the templatized symbols in a copy of the template
    let newItemTemplate = common.cloneObject(template) as common.IItemTemplate;
    newItemTemplate = common.replaceInTemplate(
      newItemTemplate,
      templateDictionary
    );

    // Create the item, then update its URL with its new id
    common
      .createItemWithData(
        newItemTemplate.item,
        newItemTemplate.data,
        { authentication: destinationUserSession },
        templateDictionary.folderId
      )
      .then(
        createResponse => {
          progressTickCallback();

          if (createResponse.success) {
            // Add the new item to the settings
            templateDictionary[template.itemId] = {
              id: createResponse.id
            };

            // Copy resources, metadata, thumbnail
            const resourcesDef = common.copyFilesFromStorageItem(
              { authentication: storageUserSession },
              resourceFilePaths,
              createResponse.id,
              { authentication: destinationUserSession }
            );

            // The item's URL includes its id, so it needs to be updated
            const updateUrlDef = common.updateItemURL(
              createResponse.id,
              common.replaceInTemplate(
                newItemTemplate.item.url,
                templateDictionary
              ),
              { authentication: destinationUserSession }
            );

            Promise.all([resourcesDef, updateUrlDef]).then(
              () => {
                progressTickCallback();

                // Update the template dictionary with the new id
                templateDictionary[template.itemId].id = createResponse.id;

                resolve(createResponse.id);
              },
              e => reject(common.fail(e))
            );
          } else {
            reject(common.fail());
          }
        },
        e => reject(common.fail(e))
      );
  });
}

// ------------------------------------------------------------------------------------------------------------------ //

function getItemData(
  itemId: string,
  userSession: auth.UserSession
): Promise<any> {
  // Get item data
  const itemDataParam: portal.IItemDataOptions = {
    authentication: userSession
  };
  return portal.getItemData(itemId, itemDataParam);
}
