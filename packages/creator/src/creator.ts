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
 * Manages the creation of a Solution item.
 *
 * @module creator
 */

import {
  appendQueryParam,
  createItemWithData,
  createLongId,
  createShortId,
  CURRENT_SCHEMA_VERSION,
  generateSourceThumbnailUrl,
  getBlobAsFile,
  getFilenameFromUrl,
  getGroup,
  getGroupBase,
  getGroupContents,
  getItem,
  getItemBase,
  getItemDataAsJson,
  getPortal,
  getSubgroupIds,
  getUser,
  getVelocityUrlBase,
  getWorkflowBaseURL,
  ICreateSolutionOptions,
  ISolutionItemData,
  IGroup,
  IItem,
  removeItem,
  sanitizeJSON,
  searchItems,
  setLocationTrackingEnabled,
  UserSession,
} from "@esri/solution-common";
import { failSafe, IModel } from "@esri/hub-common";
import { addContentToSolution } from "./helpers/add-content-to-solution";

// Simple no-op to clean up progressCallback management
const noOp = () => {};

/**
 * Creates a solution item.
 *
 * @param sourceId AGO id of group whose contents are to be added to solution or of an item to convert into a solution
 * @param srcAuthentication Credentials for requests to source items
 * @param destAuthentication Credentials for the requests to destination solution
 * @param options Customizations for creating the solution
 * @returns A promise that resolves with the AGO id of the new solution
 */
export async function createSolution(
  sourceId: string,
  srcAuthentication: UserSession,
  destAuthentication: UserSession,
  options?: ICreateSolutionOptions,
): Promise<string> {
  const createOptions: ICreateSolutionOptions = options || {};
  const progressCb = createOptions.progressCallback || noOp;
  createOptions.templateDictionary = Object.assign({}, createOptions.templateDictionary);

  progressCb(1); // let the caller know that we've started

  try {
    // Assume that source is a group and try to get group's information
    let updatedCreateOptions: ICreateSolutionOptions = await Promise.all([
      getGroupBase(sourceId, srcAuthentication),
      getGroupContents(sourceId, srcAuthentication),
      getVelocityUrlBase(srcAuthentication, createOptions.templateDictionary),
    ]).then(
      // Group fetches worked; assumption was correct
      (responses) => {
        createOptions.itemIds = responses[1];
        progressCb(15);

        return new Promise<ICreateSolutionOptions>((resolve) => {
          // Update the createOptions with values from the group
          resolve(_applySourceToCreateOptions(createOptions, responses[0], srcAuthentication, true));
        });
      },

      // Assumption incorrect; try source as an item
      () => {
        return new Promise<ICreateSolutionOptions>((resolve, reject) => {
          createOptions.itemIds = [sourceId];
          getItemBase(sourceId, srcAuthentication).then(
            // Update the createOptions with values from the item
            (itemBase) => {
              if (itemBase.type === "Solution" && itemBase.typeKeywords && itemBase.typeKeywords.includes("Deployed")) {
                _updateCreateOptionForReDeployedTemplate(sourceId, srcAuthentication, createOptions, itemBase).then(
                  (modifiedCreateOptions) => {
                    resolve(_applySourceToCreateOptions(modifiedCreateOptions, itemBase, srcAuthentication, false));
                  },
                  reject,
                );
              } else {
                resolve(_applySourceToCreateOptions(createOptions, itemBase, srcAuthentication, false));
              }
            },
            reject,
          );
        });
      },
    );

    const userInfoResponses = await Promise.all([getPortal("", srcAuthentication), getUser(srcAuthentication)]);
    const [portalResponse, userResponse] = userInfoResponses;

    // check tracking
    setLocationTrackingEnabled(portalResponse, userResponse, updatedCreateOptions.templateDictionary);

    // Add information needed for workflow manager
    const user = await getUser(srcAuthentication);
    updatedCreateOptions.templateDictionary.workflowBaseUrl = await getWorkflowBaseURL(
      srcAuthentication,
      portalResponse,
      user.orgId,
    );

    const portal = await srcAuthentication.getPortal();
    let portalBaseUrl;
    if (portal.urlKey) {
      portalBaseUrl = `https://${portal.urlKey}.maps.arcgis.com`;
    } else if (portal.portalHostname) {
      portalBaseUrl = `https://${portal.portalHostname}`;
    }
    if (portalBaseUrl) {
      updatedCreateOptions.templateDictionary["portalBaseUrl"] = portalBaseUrl;
    }

    // Use a copy of the thumbnail rather than a URL to it
    updatedCreateOptions = await _addThumbnailFileToCreateOptions(updatedCreateOptions, srcAuthentication);

    // Create a solution
    const createdSolutionId = _createSolutionFromItemIds(updatedCreateOptions, srcAuthentication, destAuthentication);

    // Successfully created solution
    progressCb(100); // finished
    return createdSolutionId;
  } catch (error) {
    // Error fetching group, group contents, or item, or error creating solution from ids
    progressCb(1);
    console.error(error);
    throw error;
  }
}

/**
 * Update the createOptions with the group properties
 *
 * @param createOptions
 * @param sourceInfo
 * @param authentication
 * @param isGroup Boolean to indicate if the files are associated with a group or item
 * @private
 */
export function _applySourceToCreateOptions(
  createOptions: ICreateSolutionOptions,
  sourceInfo: IGroup | IItem,
  srcAuthentication: UserSession,
  isGroup = false,
): ICreateSolutionOptions {
  // Create a solution from the group's or item's contents,
  // using the group's or item's information as defaults for the solution item
  [
    "title",
    "snippet",
    "description",
    "tags",
    "properties",
    "accessInformation",
    "licenseInfo",
    "categories",
    "typeKeywords",
  ].forEach((prop) => {
    if (createOptions[prop] !== undefined || sourceInfo[prop] !== undefined) {
      createOptions[prop] = createOptions[prop] ?? sourceInfo[prop];
    }
  });

  if (!createOptions.thumbnailurl && sourceInfo.thumbnail) {
    // Get the full path to the thumbnail
    createOptions.thumbnailurl = generateSourceThumbnailUrl(
      srcAuthentication.portal,
      sourceInfo.id,
      sourceInfo.thumbnail,
      isGroup,
    );
    delete sourceInfo.thumbnail;
  }

  if (isGroup) {
    // Does the group contain groups?
    const groupIdsViaOptions: string[] = createOptions.subgroupIds || [];
    createOptions.itemIds = groupIdsViaOptions.concat(createOptions.itemIds || [], getSubgroupIds(sourceInfo.tags));
  }

  return createOptions;
}

/**
 * Update the createOptions with the thumbnail file
 *
 * @param createOptions
 * @param srcAuthentication
 * @private
 */
export function _addThumbnailFileToCreateOptions(
  createOptions: ICreateSolutionOptions,
  srcAuthentication: UserSession,
): Promise<ICreateSolutionOptions> {
  return new Promise<ICreateSolutionOptions>((resolve) => {
    if (!createOptions.thumbnail && createOptions.thumbnailurl) {
      // Figure out the thumbnail's filename
      const filename = getFilenameFromUrl(createOptions.thumbnailurl) || "thumbnail";
      const thumbnailurl = appendQueryParam(createOptions.thumbnailurl, "w=400");
      delete createOptions.thumbnailurl;

      // Fetch the thumbnail
      getBlobAsFile(thumbnailurl, filename, srcAuthentication).then(
        (thumbnail) => {
          createOptions.thumbnail = thumbnail;
          resolve(createOptions);
        },
        () => {
          resolve(createOptions);
        },
      );
    } else {
      resolve(createOptions);
    }
  });
}

/**
 * Creates a solution item using a list of AGO item ids.
 *
 * @param options Customizations for creating the solution
 * @param srcAuthentication Credentials for requests to source items
 * @param destAuthentication Credentials for the requests to destination solution
 * @returns A promise that resolves with the AGO id of the new solution; solution item is deleted if its
 * there is a problem updating it
 * @private
 */
export function _createSolutionFromItemIds(
  options: ICreateSolutionOptions,
  srcAuthentication: UserSession,
  destAuthentication: UserSession,
): Promise<string> {
  let solutionId = "";
  // Create a solution from the list of items
  return _createSolutionItem(destAuthentication, options)
    .then((id) => {
      solutionId = id;
      // Add list of items to the new solution
      return addContentToSolution(solutionId, options, srcAuthentication, destAuthentication);
    })
    .catch((addError) => {
      // If the solution item got created, delete it
      if (solutionId) {
        const failSafeRemove = failSafe(removeItem, { success: true });
        return failSafeRemove(solutionId, destAuthentication).then(() => {
          throw addError;
        });
      } else {
        throw addError;
      }
    });
}

/**
 * Creates an empty solution item.
 *
 * @param authentication Credentials for the request
 * @param options Customizations for creating the solution
 * @returns A promise that resolves with the AGO id of the new solution; solution item is deleted if its
 * there is a problem updating its thumbnail
 * @private
 */
export function _createSolutionItem(authentication: UserSession, options?: ICreateSolutionOptions): Promise<string> {
  const model = _createSolutionItemModel(options);

  // Create new solution item
  delete model.item.thumbnailurl;
  model.item.thumbnail = options?.thumbnail;
  return createItemWithData(model.item, model.data, authentication, options?.folderId).then((createResponse) => {
    return Promise.resolve(createResponse.id);
  });
}

/**
 * Create the Solution Item model to be used to create
 * the Solution Item itself
 *
 * @param options
 * @private
 */
export function _createSolutionItemModel(options: any): IModel {
  // Solution uses all supplied tags but for deploy.* tags; that information goes into properties
  const creationTags = options?.tags ?? [];

  const solutionItem: any = {
    type: "Solution",
    accessInformation: options?.accessInformation ?? "",
    title: options?.title ?? createShortId(),
    snippet: options?.snippet ?? "",
    description: options?.description ?? "",
    properties: options?.properties ?? {
      schemaVersion: CURRENT_SCHEMA_VERSION,
    },
    thumbnailurl: options?.thumbnailurl ?? "",
    tags: creationTags.filter((tag: any) => !tag.startsWith("deploy.")),
    typeKeywords: options?.typeKeywords ?? ["Solution", "Template"].concat(_getDeploymentProperties(creationTags)),
    categories: options?.categories ?? [],
    licenseInfo: options?.licenseInfo ?? "",
  };

  // ensure that snippet and description are not nefarious
  const sanitizedItem = sanitizeJSON(solutionItem);

  const addlKeywords = options?.additionalTypeKeywords || [];
  sanitizedItem.typeKeywords = [].concat(solutionItem.typeKeywords, addlKeywords);

  const solutionData: ISolutionItemData = {
    metadata: {},
    templates: [],
  };
  return {
    item: sanitizedItem,
    data: solutionData,
  };
}

/**
 * Gets the deploy.id and deploy.version tag values.
 *
 * @param tags A list of item tags
 * @returns A list containing the two values found in the tags, or defaulting to a new GUID and "1.0", respectively,
 * as needed
 * @private
 */
export function _getDeploymentProperties(tags: string[]): string[] {
  return [
    "solutionid-" + (_getDeploymentProperty("deploy.id.", tags) ?? createLongId()),
    "solutionversion-" + (_getDeploymentProperty("deploy.version.", tags) ?? "1.0"),
  ];
}

/**
 * Searches for a tag that has the specified prefix and returns the rest of the tag following that prefix.
 *
 * @param desiredTagPrefix Tag prefix to look for
 * @param tags A list of item tags
 * @returns The extracted value of the first matching tag or null if a tag with the specified prefix is not found
 * @private
 */
export function _getDeploymentProperty(desiredTagPrefix: string, tags: string[]): string | null {
  const foundTagAsList = tags.filter((tag) => tag.startsWith(desiredTagPrefix));
  if (foundTagAsList.length > 0) {
    return foundTagAsList[0].substr(desiredTagPrefix.length);
  } else {
    return null;
  }
}

export async function _updateCreateOptionForReDeployedTemplate(
  sourceId: string,
  authentication: UserSession,
  createOptions: ICreateSolutionOptions,
  itemBase: IItem,
): Promise<ICreateSolutionOptions> {
  const itemData = await getItemDataAsJson(sourceId, authentication);

  if (itemData) {
    const checkExistsList = [];
    //Check if any of the item ids is deleted, if so remove from the list
    for (const template of itemData.templates) {
      if (template.type === "Group") {
        checkExistsList.push(getGroup(template.itemId, { authentication: authentication }));
      } else {
        checkExistsList.push(getItem(template.itemId, { authentication: authentication }));
      }
    }
    const itemFetches = await Promise.allSettled(checkExistsList);

    //Add all valid items to createOptions items list
    createOptions.itemIds = itemFetches
      .filter((item: any) => item.status === "fulfilled")
      .map((item: any) => item.value.id);

    //check if any new groups were made and store in the tag
    const newGroups = itemBase.tags.filter((str) => str.includes("group.")).map((str) => str.split(".")[1]);

    if (newGroups.length > 0) {
      newGroups.forEach((groupId) => {
        // If id does not already exist, push it to createOptions, itemids list.
        if (!createOptions.itemIds.includes(groupId)) {
          createOptions.itemIds.push(groupId);
        }
      });
    }

    if (itemBase.ownerFolder) {
      //query the folder for new items
      const response = await searchItems({
        q: `ownerfolder:${itemBase.ownerFolder}`,
        authentication: authentication,
        num: 100,
        sortField: "modified",
        sortOrder: "desc",
      });

      response.results.forEach((result) => {
        // See if there are new items in the folder, if so add them to the itemIds
        if (!createOptions.itemIds.includes(result.id) && result.type !== "Solution") {
          createOptions.itemIds.push(result.id);
        }
      });
    }

    //switch thhe Deployed keyword to Template
    createOptions.typeKeywords = itemBase.typeKeywords;
    const deployedIndex = createOptions.typeKeywords.indexOf("Deployed");
    if (deployedIndex !== -1) {
      createOptions.typeKeywords[deployedIndex] = "Template";
    }

    //remove any tags with group. since it's now a new solution.
    createOptions.tags = itemBase.tags;
    createOptions.tags = itemBase.tags.filter((tag) => !tag.includes("group."));
  } else {
    console.error("Item data does not exists, returning create options");
  }

  return createOptions;
}
