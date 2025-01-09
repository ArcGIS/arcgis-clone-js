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
 * Provides common functions involving the arcgis-rest-js library.
 *
 * @module restHelpers
 */

import {
  removeLayerOptimization,
  setDefaultSpatialReference,
  validateSpatialReferenceAndExtent,
  processContingentValues,
} from "./featureServiceHelpers";
import {
  appendQueryParam,
  blobToJson,
  blobToText,
  checkUrlPathTermination,
  deleteProp,
  deleteProps,
  fail,
  getProp,
  getUniqueTitle,
  setCreateProp,
} from "./generalHelpers";
import {
  IAddGroupResponse,
  IAdditionalGroupSearchOptions,
  IDependency,
  IFeatureServiceProperties,
  IFolderStatusResponse,
  IItemTemplate,
  IItemUpdate,
  IPostProcessArgs,
  IRelatedItems,
  IStatusResponse,
  IUpdate,
} from "./interfaces";
import {
  IAddFolderResponse,
  ICreateItemResponse,
  ICreateServiceParams,
  ICreateServiceResult,
  IExtent,
  IGroup,
  IGroupAdd,
  IItem,
  IParams,
  ISpatialReference,
  ItemRelationshipType,
  IRequestOptions,
  IUpdateItemResponse,
  IUserSessionOptions,
  IAddItemDataOptions,
  ICreateItemOptions,
  IFolderIdOptions,
  IGroupSharingOptions,
  IItemResourceOptions,
  IItemResourceResponse,
  IManageItemRelationshipOptions,
  IMoveItemOptions,
  IMoveItemResponse,
  IPagingParams,
  ISearchGroupContentOptions,
  ISearchOptions,
  ISearchResult,
  ISetAccessOptions,
  ISharingResponse,
  IUpdateGroupOptions,
  IUpdateItemOptions,
  IUserGroupOptions,
  IUserItemOptions,
  restAddItemData as portalAddItemData,
  addItemRelationship,
  addItemResource,
  createFolder,
  createGroup,
  createItemInFolder,
  getItem,
  moveItem as portalMoveItem,
  restRemoveFolder as portalRemoveFolder,
  restRemoveGroup as portalRemoveGroup,
  removeGroupUsers as portalRemoveGroupUsers,
  restRemoveItem as portalRemoveItem,
  restSearchGroups as portalSearchGroups,
  restSearchItems as portalSearchItems,
  request,
  searchGroupContent,
  SearchQueryBuilder,
  setItemAccess,
  shareItemWithGroup,
  svcAdminAddToServiceDefinition,
  svcAdminCreateFeatureService,
  restUpdateItem as portalUpdateItem,
  restUpdateGroup as portalUpdateGroup,
  UserSession,
} from "./arcgisRestJS";
import { createZip } from "./libConnectors";
import { getItemBase, getItemDataAsJson } from "./restHelpersGet";
import { getWorkforceDependencies, isWorkforceProject, getWorkforceServiceInfo } from "./workforceHelpers";
import { hasUnresolvedVariables, replaceInTemplate } from "./templatization";
import { isTrackingViewTemplate, setTrackingOptions } from "./trackingHelpers";

// ------------------------------------------------------------------------------------------------------------------ //

export function addItemData(id: string, data: any, authentication: UserSession): Promise<IUpdateItemResponse> {
  const addDataOptions: IAddItemDataOptions = {
    id,
    data,
    authentication,
  };
  return portalAddItemData(addDataOptions);
}

/**
 * Creates a UserSession via a function so that the global arcgisSolution variable can access authentication.
 *
 * @param options See https://esri.github.io/arcgis-rest-js/api/auth/IUserSessionOptions/
 * @returns UserSession
 */
export function getUserSession(options: IUserSessionOptions = {}): UserSession {
  return new UserSession(options);
}

/**
 * Adds a forward relationship between two items.
 *
 * @param originItemId Origin of relationship
 * @param destinationItemId Destination of relationship
 * @param relationshipType Type of relationship
 * @param authentication Credentials for the request
 * @returns A Promise to add item resources.
 */
export function addForwardItemRelationship(
  originItemId: string,
  destinationItemId: string,
  relationshipType: ItemRelationshipType,
  authentication: UserSession,
): Promise<IStatusResponse> {
  return new Promise<IStatusResponse>((resolve) => {
    const requestOptions: IManageItemRelationshipOptions = {
      originItemId,
      destinationItemId,
      relationshipType,
      authentication,
    };
    addItemRelationship(requestOptions).then(
      (response) => {
        resolve({
          success: response.success,
          itemId: originItemId,
        } as IStatusResponse);
      },
      () => {
        resolve({
          success: false,
          itemId: originItemId,
        } as IStatusResponse);
      },
    );
  });
}

/**
 * Adds forward relationships for an item.
 *
 * @param originItemId Origin of relationship
 * @param destinationRelationships Destinations
 * @param authentication Credentials for the request
 * @returns A Promise to add item resources.
 */
export function addForwardItemRelationships(
  originItemId: string,
  destinationRelationships: IRelatedItems[],
  authentication: UserSession,
): Promise<IStatusResponse[]> {
  return new Promise<IStatusResponse[]>((resolve) => {
    // Set up relationships using updated relationship information
    const relationshipPromises = new Array<Promise<IStatusResponse>>();
    destinationRelationships.forEach((relationship) => {
      relationship.relatedItemIds.forEach((relatedItemId) => {
        relationshipPromises.push(
          addForwardItemRelationship(
            originItemId,
            relatedItemId,
            relationship.relationshipType as ItemRelationshipType,
            authentication,
          ),
        );
      });
    });
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    Promise.all(relationshipPromises).then((responses: IStatusResponse[]) => resolve(responses));
  });
}

/**
 * Adds a token to the query parameters of a URL.
 *
 * @param url URL to use as base
 * @param authentication Credentials to be used to generate token for URL
 * @returns A promise that will resolve with the supplied URL with `token=&lt;token&gt;` added to its query params
 * unless either the URL doesn't exist or the token can't be generated
 */
export function addTokenToUrl(url: string, authentication: UserSession): Promise<string> {
  return new Promise<string>((resolve) => {
    if (!url || !authentication) {
      resolve(url);
    } else {
      authentication.getToken(url).then(
        (token) => {
          /* istanbul ignore else */
          if (token) {
            url = appendQueryParam(url, "token=" + token);
          }
          resolve(url);
        },
        () => resolve(url),
      );
    }
  });
}

/**
 * Calls addToDefinition for the service.
 *
 * Added retry due to some solutions failing to deploy in specific orgs/hives due to timeouts.
 * On the first pass we will use the quicker sync request to add.
 * If it fails we will use an async request that will avoid the timeout errors.
 *
 * @param url URL to use as base
 * @param options the info to add to the services definition
 * @param skipRetry a boolean to control if retry logic will be used. Defaults to false.
 * @param useAsync a boolean to control if we will use an async request
 * @returns A promise that will resolve when the request has completed
 */
export function addToServiceDefinition(
  url: string,
  options: any,
  skipRetry: boolean = false,
  useAsync: boolean = false,
): Promise<void> {
  /* istanbul ignore else */
  if (useAsync) {
    options.params = { ...options.params, async: true };
  }
  return new Promise((resolve, reject) => {
    svcAdminAddToServiceDefinition(url, options).then(
      (result: any) => {
        checkRequestStatus(result, options.authentication).then(
          () => resolve(null),
          (e) => reject(fail(e)),
        );
      },
      (e) => {
        if (!skipRetry) {
          addToServiceDefinition(url, options, true, true).then(
            () => resolve(null),
            (e) => reject(e),
          );
        } else {
          reject(fail(e));
        }
      },
    );
  });
}

/**
 * When using an async request we need to poll the status url to know when the request has completed or failed.
 *
 * @param result the result returned from the addToDefinition request.
 * This will contain a status url or the standard sync result.
 * @param authentication Credentials to be used to generate token for URL
 * @returns A promise that will resolve when the request has completed
 */
export function checkRequestStatus(result: any, authentication: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = result.statusURL || result.statusUrl;
    if (url) {
      const checkStatus = setInterval(() => {
        request(url, { authentication }).then(
          (r) => {
            /* istanbul ignore else */
            if (["completed", "success"].indexOf(r.status.toLowerCase()) > -1) {
              clearInterval(checkStatus);
              resolve();
            } else if (r.status.toLowerCase() === "failed") {
              clearInterval(checkStatus);
              reject(r);
            }
          },
          (e) => {
            clearInterval(checkStatus);
            reject(e);
          },
        );
      }, 2000);
    } else {
      resolve();
    }
  });
}

/**
 * Converts a general search into an ISearchOptions structure.
 *
 * @param search Search specified in one of three ways
 * @returns Recast search
 */
export function convertToISearchOptions(search: string | ISearchOptions | SearchQueryBuilder): ISearchOptions {
  // Convert the search into an ISearchOptions
  let searchOptions: ISearchOptions = {
    q: "",
    start: 1,
    num: 100,
  };

  if (typeof search === "string") {
    // Insert query into defaults
    searchOptions.q = search;
  } else if (search instanceof SearchQueryBuilder) {
    // Insert query into defaults
    searchOptions.q = search.toParam();
  } else {
    // search is ISearchOptions
    searchOptions = {
      ...searchOptions, // defaults
      ...search, // request
    };
  }

  // Remove the sortField if it's "relevance"; that's the default option and is not meant to be specified
  if (searchOptions.sortField === "relevance") {
    delete searchOptions.sortField;
  }

  return searchOptions;
}

/**
 * Simple validate function to ensure all coordinates are numbers
 * In some cases orgs can have null or undefined coordinate values associated with the org extent
 *
 * @param extent the extent to validate
 * @returns the provided extent or a default global extent if some coordinates are not numbers
 * @private
 */
export function _validateExtent(extent: IExtent): IExtent {
  // in some cases orgs can have invalid extents defined
  // this is a simple validate function that will ensure coordiantes are numbers
  // using -179,-89,179,89 because the project call is returning "NaN" when using -180,-90,180,90
  const hasInvalid =
    typeof extent.xmin !== "number" ||
    typeof extent.xmax !== "number" ||
    typeof extent.ymax !== "number" ||
    typeof extent.ymin !== "number";
  if (hasInvalid) {
    extent.xmin = -179;
    extent.xmax = 179;
    extent.ymax = 89;
    extent.ymin = -89;
    extent.spatialReference = { wkid: 4326 };
  }
  return extent;
}

/**
 * If the request to convert the extent fails it has commonly been due to an invalid extent.
 * This function will first attempt to use the provided extent. If it fails it will default to
 * the source items extent and if that fails it will then use a default global extent.
 *
 * @param extent the extent to convert
 * @param fallbackExtent the extent to convert if the main extent does not project to the outSR
 * @param outSR the spatial reference to project to
 * @param geometryServiceUrl the service url for the geometry service to use
 * @param authentication the credentials for the requests
 * @returns the extent projected to the provided spatial reference
 * or the world extent projected to the provided spatial reference
 * @private
 */
export function convertExtentWithFallback(
  extent: IExtent,
  fallbackExtent: any,
  outSR: ISpatialReference,
  geometryServiceUrl: string,
  authentication: UserSession,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const defaultExtent = {
      xmin: -179,
      xmax: 179,
      ymin: -89,
      ymax: 89,
      spatialReference: { wkid: 4326 },
    };
    convertExtent(_validateExtent(extent), outSR, geometryServiceUrl, authentication).then(
      (extentResponse) => {
        // in some cases project will complete successfully but return "NaN" values
        // check for this and call convert again if it does
        const extentResponseString = JSON.stringify(extentResponse);
        const validatedExtent = JSON.stringify(_validateExtent(extentResponse));
        if (extentResponseString === validatedExtent) {
          resolve(extentResponse);
        } else {
          convertExtent(fallbackExtent || defaultExtent, outSR, geometryServiceUrl, authentication).then(resolve, (e) =>
            reject(fail(e)),
          );
        }
      },
      // if convert fails try again with default global extent
      () => {
        convertExtent(defaultExtent, outSR, geometryServiceUrl, authentication).then(resolve, (e) => reject(fail(e)));
      },
    );
  });
}

/**
 * Converts an extent to a specified spatial reference.
 *
 * @param extent Extent object to check and (possibly) to project
 * @param outSR Desired spatial reference
 * @param geometryServiceUrl Path to geometry service providing `findTransformations` and `project` services
 * @param authentication Credentials for the request
 * @returns Original extent if it's already using outSR or the extents projected into the outSR
 */
export function convertExtent(
  extent: IExtent,
  outSR: ISpatialReference,
  geometryServiceUrl: string,
  authentication: UserSession,
): Promise<any> {
  const _requestOptions: any = { authentication };
  return new Promise<any>((resolve, reject) => {
    if (extent.spatialReference.wkid === outSR?.wkid || !outSR) {
      resolve(extent);
    } else {
      _requestOptions.params = {
        f: "json",
        inSR: extent.spatialReference.wkid,
        outSR: outSR.wkid,
        extentOfInterest: JSON.stringify(extent),
      };
      request(checkUrlPathTermination(geometryServiceUrl) + "findTransformations", _requestOptions).then(
        (response) => {
          const transformations = response && response.transformations ? response.transformations : undefined;
          let transformation: any;
          if (transformations && transformations.length > 0) {
            // if a forward single transformation is found use that...otherwise check for and use composite
            transformation = transformations[0].wkid
              ? transformations[0].wkid
              : transformations[0].geoTransforms
                ? transformations[0]
                : undefined;
          }

          _requestOptions.params = {
            f: "json",
            outSR: outSR.wkid,
            inSR: extent.spatialReference.wkid,
            geometries: {
              geometryType: "esriGeometryPoint",
              geometries: [
                { x: extent.xmin, y: extent.ymin },
                { x: extent.xmax, y: extent.ymax },
              ],
            },
            transformation: transformation,
          };
          request(checkUrlPathTermination(geometryServiceUrl) + "project", _requestOptions).then(
            (projectResponse) => {
              const projectGeom: any = projectResponse.geometries.length === 2 ? projectResponse.geometries : undefined;
              if (projectGeom) {
                resolve({
                  xmin: projectGeom[0].x,
                  ymin: projectGeom[0].y,
                  xmax: projectGeom[1].x,
                  ymax: projectGeom[1].y,
                  spatialReference: outSR,
                });
              } else {
                resolve(undefined);
              }
            },
            (e) => reject(fail(e)),
          );
        },
        (e) => reject(fail(e)),
      );
    }
  });
}

/**
 * Publishes a feature service as an AGOL item; it does not include its layers and tables
 *
 * @param newItemTemplate Template of item to be created
 * @param authentication Credentials for the request
 * @param templateDictionary Hash of facts: org URL, adlib replacements, user; .user.folders property contains a list
 * @returns A promise that will resolve with an object reporting success and the Solution id
 */
export function createFeatureService(
  newItemTemplate: IItemTemplate,
  authentication: UserSession,
  templateDictionary: any,
): Promise<ICreateServiceResult> {
  return new Promise((resolve, reject) => {
    // Create item
    _getCreateServiceOptions(newItemTemplate, authentication, templateDictionary).then(
      (createOptions) => {
        svcAdminCreateFeatureService(createOptions).then(
          (createResponse) => {
            // Federated servers may have inconsistent casing, so lowerCase it
            createResponse.encodedServiceURL = _lowercaseDomain(createResponse.encodedServiceURL);
            createResponse.serviceurl = _lowercaseDomain(createResponse.serviceurl);
            resolve(createResponse);
          },
          (e) => reject(fail(e)),
        );
      },
      (e) => reject(fail(e)),
    );
  });
}

/**
 * Publishes an item and its data, metadata, and resources as an AGOL item.
 *
 * @param itemInfo Item's `item` section
 * @param folderId Id of folder to receive item; null indicates that the item goes into the root
 *                 folder; ignored for Group item type
 * @param destinationAuthentication Credentials for for requests to where the item is to be created
 * @param itemThumbnailUrl URL to image to use for item thumbnail
 * @param itemThumbnailAuthentication Credentials for requests to the thumbnail source
 * @param dataFile Item's `data` section
 * @param metadataFile Item's metadata file
 * @param resourcesFiles Item's resources
 * @param access Access to set for item: "public", "org", "private"
 * @returns A promise that will resolve with an object reporting success or failure and the Solution id
 */
export function createFullItem(
  itemInfo: any,
  folderId: string | undefined,
  destinationAuthentication: UserSession,
  itemThumbnailUrl?: string,
  itemThumbnailAuthentication?: UserSession,
  dataFile?: File,
  metadataFile?: File,
  resourcesFiles?: File[],
  access = "private",
): Promise<ICreateItemResponse> {
  return new Promise((resolve, reject) => {
    // Create item
    const createOptions: ICreateItemOptions = {
      item: {
        ...itemInfo,
      },
      folderId,
      authentication: destinationAuthentication,
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    addTokenToUrl(itemThumbnailUrl, itemThumbnailAuthentication).then((updatedThumbnailUrl) => {
      /* istanbul ignore else */
      if (updatedThumbnailUrl) {
        createOptions.item.thumbnailUrl = appendQueryParam(updatedThumbnailUrl, "w=400");
      }

      createItemInFolder(createOptions).then(
        (createResponse) => {
          if (createResponse.success) {
            let accessDef: Promise<ISharingResponse>;

            // Set access if it is not AGOL default
            // Set the access manually since the access value in createItem appears to be ignored
            // Need to run serially; will not work reliably if done in parallel with adding the data section
            if (access !== "private") {
              const accessOptions: ISetAccessOptions = {
                id: createResponse.id,
                access: access === "public" ? "public" : "org", // need to use constants rather than string
                authentication: destinationAuthentication,
              };
              accessDef = setItemAccess(accessOptions);
            } else {
              accessDef = Promise.resolve({
                itemId: createResponse.id,
              } as ISharingResponse);
            }

            // Now add attached items
            accessDef.then(
              () => {
                const updateDefs: Array<Promise<any>> = [];

                // Add the data section
                if (dataFile) {
                  updateDefs.push(_addItemDataFile(createResponse.id, dataFile, destinationAuthentication));
                }

                // Add the resources via a zip because AGO sometimes loses resources if many are added at the
                // same time to the same item
                if (Array.isArray(resourcesFiles) && resourcesFiles.length > 0) {
                  updateDefs.push(
                    new Promise<IItemResourceResponse>((rsrcResolve, rsrcReject) => {
                      createZip("resources.zip", resourcesFiles).then((zipfile: File) => {
                        const addResourceOptions: IItemResourceOptions = {
                          id: createResponse.id,
                          resource: zipfile,
                          authentication: destinationAuthentication,
                          params: {
                            archive: true,
                          },
                        };
                        addItemResource(addResourceOptions).then(rsrcResolve, rsrcReject);
                      }, rsrcReject);
                    }),
                  );
                }

                // Add the metadata section
                if (metadataFile) {
                  updateDefs.push(_addItemMetadataFile(createResponse.id, metadataFile, destinationAuthentication));
                }

                // Wait until all adds are done
                Promise.all(updateDefs).then(
                  () => resolve(createResponse),
                  (e) => reject(fail(e)),
                );
              },
              (e) => reject(fail(e)),
            );
          } else {
            reject(fail());
          }
        },
        (e) => reject(fail(e)),
      );
    });
  });
}

/**
 * Publishes an item and its data as an AGOL item.
 *
 * @param itemInfo Item's `item` section
 * @param dataInfo Item's `data` section
 * @param authentication Credentials for the request
 * @param folderId Id of folder to receive item; null indicates that the item goes into the root
 *                 folder; ignored for Group item type
 * @param access Access to set for item: "public", "org", "private"
 * @returns A promise that will resolve with an object reporting success and the Solution id
 */
export function createItemWithData(
  itemInfo: any,
  dataInfo: any,
  authentication: UserSession,
  folderId: string | undefined,
  access = "private",
): Promise<ICreateItemResponse> {
  return new Promise((resolve, reject) => {
    // Create item
    const createOptions: ICreateItemOptions = {
      item: {
        title: "_", // provide backup title
        ...itemInfo,
        data: dataInfo,
      },
      folderId,
      authentication: authentication,
    };

    if (itemInfo.thumbnail) {
      createOptions.params = {
        // Pass thumbnail file in via params because item property is serialized, which discards a blob
        thumbnail: itemInfo.thumbnail,
      };
      delete createOptions.item.thumbnail;
    }

    createItemInFolder(createOptions).then(
      (createResponse) => {
        if (createResponse.success) {
          if (access !== "private") {
            // Set access if it is not AGOL default
            // Set the access manually since the access value in createItem appears to be ignored
            const accessOptions: ISetAccessOptions = {
              id: createResponse.id,
              access: access === "public" ? "public" : "org", // need to use constants rather than string
              authentication: authentication,
            };
            setItemAccess(accessOptions).then(
              () => {
                resolve({
                  folder: createResponse.folder,
                  id: createResponse.id,
                  success: true,
                });
              },
              (e) => reject(fail(e)),
            );
          } else {
            resolve({
              folder: createResponse.folder,
              id: createResponse.id,
              success: true,
            });
          }
        } else {
          reject(fail());
        }
      },
      (e) => reject(fail(e)),
    );
  });
}

/**
 * Creates a folder using a numeric suffix to ensure uniqueness if necessary.
 *
 * @param title Folder title, used as-is if possible and with suffix otherwise
 * @param templateDictionary Hash of facts: org URL, adlib replacements, user; .user.folders property contains a list
 * of known folder names; function updates list with existing names not yet known, and creates .user.folders if it
 * doesn't exist in the dictionary
 * @param authentication Credentials for creating folder
 * @returns Id of created folder
 */
export function createUniqueFolder(
  title: string,
  templateDictionary: any,
  authentication: UserSession,
): Promise<IAddFolderResponse> {
  return new Promise<IAddFolderResponse>((resolve, reject) => {
    // Get a title that is not already in use
    const folderTitle: string = getUniqueTitle(title, templateDictionary, "user.folders");
    const folderCreationParam = {
      title: folderTitle,
      authentication: authentication,
    };
    createFolder(folderCreationParam).then(
      (ok) => resolve(ok),
      (err) => {
        // If the name already exists, we'll try again
        const errorDetails = getProp(err, "response.error.details") as string[];
        if (Array.isArray(errorDetails) && errorDetails.length > 0) {
          const nameNotAvailMsg = "Folder title '" + folderTitle + "' not available.";
          if (errorDetails.indexOf(nameNotAvailMsg) >= 0) {
            // Create the user.folders property if it doesn't exist
            /* istanbul ignore else */
            if (!getProp(templateDictionary, "user.folders")) {
              setCreateProp(templateDictionary, "user.folders", []);
            }
            templateDictionary.user.folders.push({
              title: folderTitle,
            });
            createUniqueFolder(title, templateDictionary, authentication).then(resolve, reject);
          } else {
            reject(err);
          }
        } else {
          // Otherwise, error out
          reject(err);
        }
      },
    );
  });
}

/**
 * Creates a group using numeric suffix to ensure uniqueness.
 *
 * @param title Group title, used as-is if possible and with suffix otherwise
 * @param templateDictionary Hash of facts: org URL, adlib replacements, user
 * @param authentication Credentials for creating group
 * @param owner Optional arg for the Tracking owner
 *              If the tracking owner is not the one deploying the solution
 *              tracker groups will be created under the deployment user but
 *              will be reassigned to the tracking owner.
 * @returns Information about created group
 */
export function createUniqueGroup(
  title: string,
  groupItem: IGroupAdd,
  templateDictionary: any,
  authentication: UserSession,
  owner?: string,
): Promise<IAddGroupResponse> {
  return new Promise<IAddGroupResponse>((resolve, reject) => {
    let groupsPromise: Promise<any>;
    // when working with tracker we need to consider the groups of the deploying user as well as the groups
    // of the tracking user...must be unique for both
    if (owner && owner !== authentication.username) {
      groupsPromise = searchAllGroups(`(owner:${owner}) orgid:${templateDictionary.organization.id}`, authentication);
    } else {
      groupsPromise = Promise.resolve([]);
    }

    // first get the tracker owner groups
    groupsPromise.then(
      (groups) => {
        templateDictionary["allGroups"] = groups.concat(getProp(templateDictionary, "user.groups"));

        // Get a title that is not already in use
        groupItem.title = getUniqueTitle(title, templateDictionary, "allGroups");
        const groupCreationParam = {
          group: groupItem,
          authentication: authentication,
        };
        createGroup(groupCreationParam).then(resolve, (err) => {
          // If the name already exists, we'll try again
          const errorDetails = getProp(err, "response.error.details") as string[];
          if (Array.isArray(errorDetails) && errorDetails.length > 0) {
            const nameNotAvailMsg = "You already have a group named '" + groupItem.title + "'. Try a different name.";
            if (errorDetails.indexOf(nameNotAvailMsg) >= 0) {
              templateDictionary.user.groups.push({
                title: groupItem.title,
              });
              createUniqueGroup(title, groupItem, templateDictionary, authentication).then(resolve, reject);
            } else {
              reject(err);
            }
          } else {
            // Otherwise, error out
            reject(err);
          }
        });
      },
      (e) => reject(e),
    );
  });
}

/**
 * Gets the ids of the dependencies of an AGOL feature service item.
 * Dependencies will only exist when the service is a view.
 *
 * @param itemTemplate Template of item to be created
 * @param authentication Credentials for the request
 * @returns A promise that will resolve a list of dependencies
 */
export function extractDependencies(itemTemplate: IItemTemplate, authentication?: UserSession): Promise<IDependency[]> {
  const dependencies: any[] = [];
  return new Promise((resolve, reject) => {
    // Get service dependencies when the item is a view
    // This step is skipped for tracker views as they will already have a source service in the org
    if (itemTemplate.properties.service.isView && itemTemplate.item.url && !isTrackingViewTemplate(itemTemplate)) {
      request(checkUrlPathTermination(itemTemplate.item.url) + "sources?f=json", {
        authentication: authentication,
      }).then(
        (response) => {
          /* istanbul ignore else */
          if (response && response.services) {
            response.services.forEach((layer: any) => {
              dependencies.push({
                id: layer.serviceItemId,
                name: layer.name,
              });
            });
          }
          resolve(dependencies);
        },
        (e) => reject(fail(e)),
      );
    } else if (isWorkforceProject(itemTemplate)) {
      resolve(getWorkforceDependencies(itemTemplate, dependencies));
    } else {
      resolve(dependencies);
    }
  });
}

/**
 * Get json info for the services layers
 *
 * @param serviceUrl the url for the service
 * @param layerList list of base layer info
 * @param authentication Credentials for the request
 * @returns A promise that will resolve a list of dependencies
 */
export function getLayers(serviceUrl: string, layerList: any[], authentication: UserSession): Promise<any[]> {
  return new Promise<any[]>((resolve, reject) => {
    if (layerList.length === 0) {
      resolve([]);
    }

    // get the admin URL
    serviceUrl = serviceUrl.replace("/rest/services", "/rest/admin/services");

    const requestsDfd: Array<Promise<any>> = [];
    layerList.forEach((layer) => {
      const requestOptions: IRequestOptions = {
        authentication: authentication,
      };
      requestsDfd.push(request(checkUrlPathTermination(serviceUrl) + layer["id"] + "?f=json", requestOptions));
    });

    // Wait until all layers are heard from
    Promise.all(requestsDfd).then(
      (layers) => resolve(layers),
      (e) => reject(fail(e)),
    );
  });
}

/**
 * Add additional options to a layers definition.
 *
 * @param args The IPostProcessArgs for the request(s)
 * @param isPortal boolean to indicate if we are deploying to portal
 *
 * @returns An array of update instructions
 * @private
 */
export function getLayerUpdates(args: IPostProcessArgs, isPortal: boolean): IUpdate[] {
  const adminUrl: string = args.itemTemplate.item.url.replace("rest/services", "rest/admin/services");

  const updates: IUpdate[] = [];
  const refresh: any = _getUpdate(adminUrl, null, null, args, "refresh");
  updates.push(refresh);
  Object.keys(args.objects).forEach((id) => {
    const obj: any = Object.assign({}, args.objects[id]);
    // These properties cannot be set in the update definition when working with portal
    if (isPortal) {
      deleteProps(obj, ["type", "id", "relationships", "sourceServiceFields"]);
    }
    // handle definition deletes
    // removes previous editFieldsInfo fields if their names were changed
    if (obj.hasOwnProperty("deleteFields")) {
      updates.push(_getUpdate(adminUrl, id, obj, args, "delete"));
      deleteProp(obj, "deleteFields");
      updates.push(_getUpdate(adminUrl, null, null, args, "refresh"));
    }
  });

  const subtypeUpdates = _getSubtypeUpdates({
    message: "add subtype updates",
    objects: args.objects,
    itemTemplate: args.itemTemplate,
    authentication: args.authentication,
  });

  /* istanbul ignore else */
  if (subtypeUpdates.length > 0 && isPortal) {
    subtypeUpdates.forEach((subtypeUpdate) => {
      updates.push(
        _getUpdate(adminUrl + subtypeUpdate.id, null, { subtypeField: subtypeUpdate.subtypeField }, args, "update"),
      );
      updates.push(
        _getUpdate(
          adminUrl + subtypeUpdate.id,
          null,
          { defaultSubtypeCode: subtypeUpdate.defaultSubtypeCode },
          args,
          "update",
        ),
      );
      updates.push(_getUpdate(adminUrl + subtypeUpdate.id, null, { subtypes: subtypeUpdate.subtypes }, args, "add"));
    });
  }

  // issue: #706
  // Add source service relationships
  // views will now always add all layers in a single call and will inherit the relationships from the source service
  if (!args.itemTemplate.properties.service.isView) {
    const relUpdates: any = _getRelationshipUpdates({
      message: "updated layer relationships",
      objects: args.objects,
      itemTemplate: args.itemTemplate,
      authentication: args.authentication,
    });
    // issue: #724
    // In portal the order the relationships are added needs to follow the layer order
    // otherwise the relationship IDs will be reset
    relUpdates.layers = _sortRelationships(
      args.itemTemplate.properties.layers,
      args.itemTemplate.properties.tables,
      relUpdates,
    );
    /* istanbul ignore else */
    if (relUpdates.layers.length > 0) {
      updates.push(_getUpdate(adminUrl, null, relUpdates, args, "add"));
      updates.push(refresh);
    }

    // handle contingent values
    const contingentValuesUpdates = _getContingentValuesUpdates({
      message: "add layer contingent values",
      objects: args.objects,
      itemTemplate: args.itemTemplate,
      authentication: args.authentication,
    });

    /* istanbul ignore else */
    if (contingentValuesUpdates.length > 0) {
      contingentValuesUpdates.forEach((conUpdate) => {
        updates.push(_getUpdate(adminUrl + conUpdate.id, null, conUpdate.contingentValues, args, "add"));
      });
    }
  }

  // issue: https://devtopia.esri.com/WebGIS/solution-deployment-apps/issues/273
  // For portal only...add specific indexes with existing supplementary addToDefinition call if it exists
  // or with a new addToDefinition call if one doesn't already exist
  if (isPortal) {
    Object.keys(args.objects).forEach((id) => {
      const obj: any = Object.assign({}, args.objects[id]);
      let update;
      if (Array.isArray(obj.indexes) && obj.indexes.length > 0) {
        const layerHasExistingAdd = updates.some((u) => {
          if (u.url.indexOf(`${id}/addToDefinition`) > -1) {
            update = u;
            return true;
          }
        });
        if (layerHasExistingAdd) {
          // append to existing addToDef
          update.params.addToDefinition = {
            ...update.params.addToDefinition,
            indexes: obj.indexes,
          };
        } else {
          // create new addToDef
          updates.push(_getUpdate(checkUrlPathTermination(adminUrl) + id, null, { indexes: obj.indexes }, args, "add"));
        }
      }
    });
  }
  return updates.length === 1 ? [] : updates;
}

/**
 * Moves an AGO item to a specified folder.
 *
 * @param itemId Id of item to move
 * @param folderId Id of folder to receive item
 * @param authentication Credentials for the request
 * @returns A Promise resolving to the results of the move
 */
export async function moveItemToFolder(
  itemId: string,
  folderId: string,
  authentication: UserSession,
): Promise<IMoveItemResponse> {
  const moveOptions: IMoveItemOptions = {
    itemId,
    folderId,
    authentication,
  };

  return portalMoveItem(moveOptions);
}

/**
 * Moves a list of AGO items to a specified folder.
 *
 * @param itemIds Ids of items to move
 * @param folderId Id of folder to receive item
 * @param authentication Credentials for the request
 * @returns A Promise resolving to the results of the moves
 */
export async function moveItemsToFolder(
  itemIds: string[],
  folderId: any,
  authentication: UserSession,
): Promise<IMoveItemResponse[]> {
  const movePromises = new Array<Promise<IMoveItemResponse>>();
  itemIds.forEach((itemId) => {
    movePromises.push(moveItemToFolder(itemId, folderId, authentication));
  });
  return Promise.all(movePromises);
}

/**
 * Sorts relationships based on order of supporting layers and tables in the service definition
 *
 * @param layers the layers from the service
 * @param tables the tables from the service
 * @param relUpdates the relationships to add for the service
 *
 * @returns An array with relationships that have been sorted
 * @private
 */
export function _sortRelationships(layers: any[], tables: any[], relUpdates: any): any[] {
  const ids: number[] = [].concat(
    layers.map((l: any) => l.id),
    tables.map((t: any) => t.id),
  );
  // In portal the order the relationships are added needs to follow the layer order
  // otherwise the relationship IDs will be reset
  const _relUpdateLayers: any[] = [];
  ids.forEach((id) => {
    relUpdates.layers.some((relUpdate: any) => {
      if (id === relUpdate.id) {
        _relUpdateLayers.push(relUpdate);
        return true;
      } else {
        return false;
      }
    });
  });
  return _relUpdateLayers;
}

/**
 * Add additional options to a layers definition
 *
 * Added retry due to some solutions failing to deploy in specific orgs/hives
 *
 *
 * @param Update will contain either add, update, or delete from service definition call
 * @param skipRetry defaults to false. when true the retry logic will be ignored
 * @returns A promise that will resolve when service definition call has completed
 * @private
 */
/* istanbul ignore else */
export function getRequest(
  update: IUpdate,
  skipRetry: boolean = false,
  useAsync: boolean = false,
  isPortal: boolean = false,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const options: IRequestOptions = {
      params: update.params,
      authentication: update.args.authentication,
    };
    /* istanbul ignore else */
    if (
      (useAsync && update.url.indexOf("addToDefinition") > -1) ||
      update.url.indexOf("updateDefinition") > -1 ||
      update.url.indexOf("deleteFromDefinition") > -1
    ) {
      options.params = { ...options.params, async: true };
    }
    request(update.url, options).then(
      (result) => {
        checkRequestStatus(result, options.authentication).then(
          () => resolve(null),
          (e) => reject(fail(e)),
        );
      },
      (e: any) => {
        if (!skipRetry) {
          getRequest(update, true, true, isPortal).then(
            () => resolve(),
            (e) => reject(e),
          );
        } else {
          reject(e);
        }
      },
    );
  });
}

/**
 * Fills in missing data, including full layer and table definitions, in a feature services' definition.
 *
 * @param itemTemplate Feature service item, data, dependencies definition to be modified
 * @param authentication Credentials for the request to AGOL
 * @returns A promise that will resolve when fullItem has been updated
 * @private
 */
export function getServiceLayersAndTables(
  itemTemplate: IItemTemplate,
  authentication: UserSession,
): Promise<IItemTemplate> {
  return new Promise<IItemTemplate>((resolve, reject) => {
    // To have enough information for reconstructing the service, we'll supplement
    // the item and data sections with sections for the service, full layers, and
    // full tables

    // Extra steps must be taken for workforce version 2
    const isWorkforceService = isWorkforceProject(itemTemplate);

    // Get the service description
    if (itemTemplate.item.url) {
      getFeatureServiceProperties(itemTemplate.item.url, authentication, isWorkforceService).then(
        (properties) => {
          itemTemplate.properties = properties;
          resolve(itemTemplate);
        },
        (e) => reject(fail(e)),
      );
    } else {
      resolve(itemTemplate);
    }
  });
}

/**
 * Get service properties for the given url and update key props
 *
 * @param serviceUrl the feature service url
 * @param authentication Credentials for the request to AGOL
 * @param workforceService boolean to indicate if extra workforce service steps should be handled
 * @returns A promise that will resolve with the service properties
 * @private
 */
export function getFeatureServiceProperties(
  serviceUrl: string,
  authentication: UserSession,
  workforceService: boolean = false,
): Promise<IFeatureServiceProperties> {
  return new Promise<IFeatureServiceProperties>((resolve, reject) => {
    const properties: IFeatureServiceProperties = {
      service: {},
      layers: [],
      tables: [],
    };

    // get the admin URL
    serviceUrl = serviceUrl.replace("/rest/services", "/rest/admin/services");

    // Get the service description
    request(serviceUrl + "?f=json", {
      authentication: authentication,
    }).then(
      (serviceData) => {
        properties.service = _parseAdminServiceData(serviceData);

        // Copy cacheMaxAge to top level so that AGO sees it when deploying the service
        // serviceData may have set it if there isn't an adminServiceInfo
        /* istanbul ignore else */
        if (serviceData.adminServiceInfo?.cacheMaxAge) {
          properties.service.cacheMaxAge = serviceData.adminServiceInfo.cacheMaxAge;
        }

        // Move the layers and tables out of the service's data section
        /* istanbul ignore else */
        if (serviceData.layers) {
          properties.layers = serviceData.layers;

          // Fill in properties that the service layer doesn't provide
          // and remove properties that should not exist in the template
          properties.layers.forEach((layer) => {
            layer.serviceItemId = properties.service.serviceItemId;
            layer.extent = null;
            removeLayerOptimization(layer);
          });
        }
        delete serviceData.layers;

        /* istanbul ignore else */
        if (serviceData.tables) {
          properties.tables = serviceData.tables;

          // Fill in properties that the service layer doesn't provide
          properties.tables.forEach((table) => {
            table.serviceItemId = properties.service.serviceItemId;
            table.extent = null;
          });
        }
        delete serviceData.tables;

        // Ensure solution items have unique indexes on relationship key fields
        _updateIndexesForRelationshipKeyFields(properties);

        processContingentValues(properties, serviceUrl, authentication).then(
          () => {
            if (workforceService) {
              getWorkforceServiceInfo(properties, serviceUrl, authentication).then(resolve, reject);
            } else {
              resolve(properties);
            }
          },
          (e: any) => reject(fail(e)),
        );
      },
      (e: any) => reject(fail(e)),
    );
  });
}

/**
 * Fetches the configuration of a workflow.
 *
 * @param itemId Id of the workflow item
 * @param workflowBaseUrl URL of the workflow manager, e.g., "https://workflow.arcgis.com/orgId"
 * @param authentication Credentials for the request to AGOL
 * @returns Promise resolving with the workflow configuration in a zip file
 * @throws {WorkflowJsonExceptionDTO} if request to workflow manager fails
 */
export async function getWorkflowConfigurationZip(
  itemId: string,
  workflowBaseUrl: string,
  authentication: UserSession,
): Promise<File> {
  const url = `${workflowBaseUrl}/admin/${itemId}/export`;

  return request(url, {
    authentication,
    headers: {
      "Accept": "application/octet-stream",
      "Authorization": `Bearer ${authentication.token}`,
      "X-Esri-Authorization": `Bearer ${authentication.token}`,
    },
    params: {
      f: "zip",
    },
  });
}

/**
 * Sets the configuration of a workflow.
 *
 * @param itemId Id of the workflow item
 * @param configurationZipFile Configuration files in a zip file
 * @param workflowBaseUrl URL of the workflow manager, e.g., "https://workflow.arcgis.com/orgId"
 * @param authentication Credentials for the request to AGOL
 * @returns Promise resolving with the workflow configuration in a zip file
 * @throws {WorkflowJsonExceptionDTO} if request to workflow manager fails
 */
export async function setWorkflowConfigurationZip(
  itemId: string,
  configurationZipFile: File,
  workflowBaseUrl: string,
  authentication: UserSession,
): Promise<IStatusResponse> {
  const url = `${workflowBaseUrl}/admin/${itemId}/import`;

  return request(url, {
    authentication,
    headers: {
      "Accept": "application/octet-stream",
      "Authorization": `Bearer ${authentication.token}`,
      "X-Esri-Authorization": `Bearer ${authentication.token}`,
    },
    params: {
      file: configurationZipFile,
    },
  });
}

/**
 * Parses the layers array and will filter subsets of Layers and Tables
 * Layers and Tables are both returned in the layers array when we access a feature service from the admin api.
 *
 * @param adminData The data of the feature service
 * @returns A mutated version of the provided adminData
 * @private
 */
export function _parseAdminServiceData(adminData: any): any {
  const layers: any[] = adminData.layers || [];
  const tables: any[] = adminData.tables || [];
  setCreateProp(
    adminData,
    "layers",
    layers.filter((l) => l.type === "Feature Layer"),
  );
  // TODO understand if the concat is necessary.
  // Not sure if the admin api will ever actually return a tables collection here.
  setCreateProp(adminData, "tables", tables.concat(layers.filter((l) => l.type === "Table")));
  return adminData;
}

/**
 * livingatlas designation test.
 * These layers should not be templatized or depolyed
 *
 * @param groupDesignations the items group designations to evaluate
 * @returns A boolean indicating if the invalid designation is found in the item info
 */
export function hasInvalidGroupDesignations(groupDesignations: string): boolean {
  const invalidGroupDesignations: string[] = ["livingatlas"];
  return groupDesignations ? invalidGroupDesignations.indexOf(groupDesignations) > -1 : false;
}

/**
 * Removes a folder from AGO.
 *
 * @param folderId Id of a folder to delete
 * @param authentication Credentials for the request to AGO
 * @returns A promise that will resolve with the result of the request
 */
export function removeFolder(folderId: string, authentication: UserSession): Promise<IFolderStatusResponse> {
  return new Promise<IFolderStatusResponse>((resolve, reject) => {
    const requestOptions: IFolderIdOptions = {
      folderId: folderId,
      authentication: authentication,
    };
    portalRemoveFolder(requestOptions).then((result) => (result.success ? resolve(result) : reject(result)), reject);
  });
}

/**
 * Removes a group from AGO.
 *
 * @param groupId Id of a group to delete
 * @param authentication Credentials for the request to AGO
 * @returns A promise that will resolve with the result of the request
 */
export function removeGroup(groupId: string, authentication: UserSession): Promise<IStatusResponse> {
  return new Promise<IStatusResponse>((resolve, reject) => {
    const requestOptions: IUserGroupOptions = {
      id: groupId,
      authentication: authentication,
    };
    portalRemoveGroup(requestOptions).then((result) => (result.success ? resolve(result) : reject(result)), reject);
  });
}

/**
 * Removes an item from AGO.
 *
 * @param itemId Id of an item to delete
 * @param authentication Credentials for the request to AGO
 * @param permanentDelete If true (the default), the item is permanently deleted; if false and the item type
 * supports the recycle bin, the item will be put into the recycle bin
 * @returns A promise that will resolve with the result of the request
 */
export function removeItem(
  itemId: string,
  authentication: UserSession,
  permanentDelete = true,
): Promise<IStatusResponse> {
  return new Promise<IStatusResponse>((resolve, reject) => {
    const requestOptions: IUserItemOptions = {
      id: itemId,
      authentication: authentication,
      params: {
        permanentDelete,
      },
    };
    portalRemoveItem(requestOptions).then((result) => (result.success ? resolve(result) : reject(result)), reject);
  });
}

/**
 * Removes an item or group from AGO.
 *
 * @param itemId Id of an item or group to delete
 * @param authentication Credentials for the request to AGO
 * @param permanentDelete If true (the default), the item is permanently deleted; if false and the item type
 * supports the recycle bin, the item will be put into the recycle bin; note that this does not apply to groups
 * @returns A promise that will resolve with the result of the request
 */
export function removeItemOrGroup(
  itemId: string,
  authentication: UserSession,
  permanentDelete = true,
): Promise<IStatusResponse> {
  return new Promise<IStatusResponse>((resolve, reject) => {
    removeItem(itemId, authentication, permanentDelete).then(resolve, (error) => {
      removeGroup(itemId, authentication).then(resolve, () => reject(error));
    });
  });
}

/**
 * Searches for items matching a query and that the caller has access to.
 *
 * @param search Search string (e.g., "q=redlands+map") or a more detailed structure that can include authentication
 * @returns Promise resolving with search results
 * @see https://developers.arcgis.com/rest/users-groups-and-items/search.htm
 */
export function searchItems(search: string | ISearchOptions | SearchQueryBuilder): Promise<ISearchResult<IItem>> {
  return portalSearchItems(search);
}

/**
 * Searches for items matching a query and that the caller has access to, continuing recursively until done.
 *
 * @param search Search string (e.g., "q=redlands+map") or a more detailed structure that can include authentication
 * @param accumulatedResponse Response built from previous requests
 * @returns Promise resolving with search results
 * @see https://developers.arcgis.com/rest/users-groups-and-items/search.htm
 */
export function searchAllItems(
  search: string | ISearchOptions | SearchQueryBuilder,
  accumulatedResponse?: ISearchResult<IItem>,
): Promise<ISearchResult<IItem>> {
  // Convert the search into an ISearchOptions
  const searchOptions = convertToISearchOptions(search);

  // Provide a base into which results can be concatenated
  const completeResponse: ISearchResult<IItem> = accumulatedResponse
    ? accumulatedResponse
    : ({
        query: searchOptions.q,
        start: 1,
        num: 100,
        nextStart: -1,
        total: 0,
        results: [] as IItem[],
      } as ISearchResult<IItem>);

  return new Promise<ISearchResult<IItem>>((resolve, reject) => {
    searchItems(search).then(
      (response) => {
        completeResponse.results = completeResponse.results.concat(response.results);
        completeResponse.num = completeResponse.total = completeResponse.results.length;
        if (response.nextStart > 0) {
          // Insert nextStart into next query
          searchOptions.start = response.nextStart;
          resolve(searchAllItems(searchOptions, completeResponse));
        } else {
          resolve(completeResponse);
        }
      },
      (e) => reject(e),
    );
  });
}

/**
 * Searches for groups matching criteria.
 *
 * @param searchString Text for which to search, e.g., 'redlands+map', 'type:"Web Map" -type:"Web Mapping Application"'
 * @param authentication Credentials for the request to AGO
 * @param additionalSearchOptions Adjustments to search, such as tranche size
 * @returns A promise that will resolve with a structure with a tranche of results and
 * describing how many items are available
 * @see https://developers.arcgis.com/rest/users-groups-and-items/group-search.htm
 * @see https://developers.arcgis.com/rest/users-groups-and-items/search-reference.htm
 */
export function searchGroups(
  searchString: string,
  authentication: UserSession,
  additionalSearchOptions?: IAdditionalGroupSearchOptions,
): Promise<ISearchResult<IGroup>> {
  const searchOptions: ISearchOptions = {
    q: searchString,
    params: {
      ...additionalSearchOptions,
    },
    authentication: authentication,
  };
  return portalSearchGroups(searchOptions);
}

/**
 * Searches for groups matching criteria recurusively.
 *
 * @param searchString Text for which to search, e.g., 'redlands+map', 'type:"Web Map" -type:"Web Mapping Application"'
 * @param authentication Credentials for the request to AGO
 * @param groups List of groups that have been found from previous requests
 * @param inPagingParams The paging params for the recurisve searching
 *
 * @returns A promise that will resolve with all groups that meet the search criteria
 */
export function searchAllGroups(
  searchString: string,
  authentication: UserSession,
  groups?: IGroup[],
  inPagingParams?: IPagingParams,
): Promise<IGroup[]> {
  const pagingParams: IPagingParams = inPagingParams
    ? inPagingParams
    : {
        start: 1,
        num: 24,
      };
  const additionalSearchOptions = {
    sortField: "title",
    sortOrder: "asc",
    ...pagingParams,
  };

  // Provide a base onto which results can be concatenated
  let finalResults: IGroup[] = groups ? groups : [];

  return new Promise<IGroup[]>((resolve, reject) => {
    searchGroups(searchString, authentication, additionalSearchOptions).then(
      (response) => {
        finalResults = finalResults.concat(response.results);
        if (response.nextStart > 0) {
          pagingParams.start = response.nextStart;
          resolve(searchAllGroups(searchString, authentication, finalResults, pagingParams));
        } else {
          resolve(finalResults);
        }
      },
      (e) => reject(e),
    );
  });
}

/**
 * Searches for group contents matching criteria recursively.
 *
 * @param groupId Group whose contents are to be searched
 * @param searchString Text for which to search, e.g., 'redlands+map', 'type:"Web Map" -type:"Web Mapping Application"'
 * @param authentication Credentials for the request to AGO
 * @param additionalSearchOptions Adjustments to search, such as tranche size and categories of interest; categories
 * are supplied as an array: each array element consists of one or more categories to be ORed; array elements are ANDed
 * @param portalUrl Rest Url of the portal to perform the search
 * @param accumulatedResponse Response built from previous requests
 * @returns A promise that will resolve with a structure with a tranche of results and
 * describing how many items are available
 * @see https://developers.arcgis.com/rest/users-groups-and-items/group-content-search.htm
 * @see https://developers.arcgis.com/rest/users-groups-and-items/search-reference.htm
 */
export function searchGroupAllContents(
  groupId: string,
  searchString: string,
  authentication: UserSession,
  additionalSearchOptions?: IAdditionalGroupSearchOptions,
  portalUrl?: string,
  accumulatedResponse?: ISearchResult<IItem>,
): Promise<ISearchResult<IItem>> {
  additionalSearchOptions = additionalSearchOptions ? additionalSearchOptions : {};

  // Provide a base into which results can be concatenated
  const completeResponse: ISearchResult<IItem> = accumulatedResponse
    ? accumulatedResponse
    : ({
        query: searchString,
        start: 1,
        num: 100,
        nextStart: -1,
        total: 0,
        results: [] as IItem[],
      } as ISearchResult<IItem>);

  // Remove the sortField if it's "relevance"; that's the default option and is not meant to be specified
  if (additionalSearchOptions.sortField === "relevance") {
    delete additionalSearchOptions.sortField;
  }

  return new Promise<ISearchResult<IItem>>((resolve, reject) => {
    searchGroupContents(groupId, searchString, authentication, additionalSearchOptions, portalUrl).then(
      (response) => {
        completeResponse.results = completeResponse.results.concat(response.results);
        completeResponse.num = completeResponse.total = completeResponse.results.length;
        if (response.nextStart > 0) {
          additionalSearchOptions.start = response.nextStart;
          resolve(
            searchGroupAllContents(
              groupId,
              searchString,
              authentication,
              additionalSearchOptions,
              portalUrl,
              completeResponse,
            ),
          );
        } else {
          resolve(completeResponse);
        }
      },
      (e) => reject(e),
    );
  });
}

/**
 * Searches for group contents matching criteria.
 *
 * @param groupId Group whose contents are to be searched
 * @param searchString Text for which to search, e.g., 'redlands+map', 'type:"Web Map" -type:"Web Mapping Application"'
 * @param authentication Credentials for the request to AGO
 * @param additionalSearchOptions Adjustments to search, such as tranche size and categories of interest; categories
 * are supplied as an array: each array element consists of one or more categories to be ORed; array elements are ANDed
 * @param portalUrl Rest Url of the portal to perform the search
 * @returns A promise that will resolve with a structure with a tranche of results and
 * describing how many items are available
 * @see https://developers.arcgis.com/rest/users-groups-and-items/group-content-search.htm
 * @see https://developers.arcgis.com/rest/users-groups-and-items/search-reference.htm
 */
export function searchGroupContents(
  groupId: string,
  searchString: string,
  authentication: UserSession,
  additionalSearchOptions?: IAdditionalGroupSearchOptions,
  portalUrl?: string,
): Promise<ISearchResult<IItem>> {
  const searchOptions: ISearchGroupContentOptions = {
    groupId,
    q: searchString,
    params: Object.assign(
      {
        num: 100,
      },
      additionalSearchOptions,
    ),
    authentication: authentication,
    portal: portalUrl,
  };

  // If search options include `categories`, switch to new arcgis-rest-js format
  /* istanbul ignore else */
  if (Array.isArray(searchOptions.params.categories)) {
    searchOptions.params.categories = searchOptions.params.categories.map((andGroup) => andGroup.split(","));
  }

  return searchGroupContent(searchOptions);
}

/**
 * Reassign ownership of a group
 *
 * @param groupId Group to remove users from
 * @param userName The new owner for the group
 * @param authentication Credentials for the request to
 *
 * @returns A promise that will resolve after the group ownership has been assigned
 *
 */
export function reassignGroup(groupId: string, userName: string, authentication: UserSession): Promise<any> {
  const requestOptions: IRequestOptions = {
    authentication: authentication,
    params: {
      targetUsername: userName,
    },
  };
  return request(`${authentication.portal}/community/groups/${groupId}/reassign`, requestOptions);
}

/**
 * Remove users from a group
 *
 * @param groupId Group to remove users from
 * @param users List of users to remove from the group
 * @param authentication Credentials for the request to
 *
 * @returns A promise that will resolve after the users have been removed
 *
 */
export function removeUsers(groupId: string, users: string[], authentication: UserSession): Promise<any> {
  return portalRemoveGroupUsers({
    id: groupId,
    users,
    authentication,
  });
}

/**
 * Shares an item to the defined group
 *
 * @param groupId Group to share with
 * @param id the item id to share with the group
 * @param destinationAuthentication Credentials for the request to AGO
 * @param owner owner of the group when sharing tracking items (can be different from the deploying user)
 *
 * @returns A promise that will resolve after the item has been shared
 *
 */
export function shareItem(
  groupId: string,
  id: string,
  destinationAuthentication: UserSession,
  owner?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const shareOptions: IGroupSharingOptions = {
      groupId,
      id,
      authentication: destinationAuthentication,
    };

    /* istanbul ignore else */
    if (owner) {
      shareOptions.owner = owner;
    }

    shareItemWithGroup(shareOptions).then(
      () => resolve(null),
      (e: any) => reject(fail(e)),
    );
  });
}

/**
 * Updates an item.
 *
 * @param itemInfo The base info of an item; note that this content will be serialized, which doesn't work
 * for binary content
 * @param authentication Credentials for request
 * @param folderId Item's folder
 * @param additionalParams Updates that are put under the `params` property, which is not serialized
 * @return
 */
export function updateItem(
  itemInfo: IItemUpdate,
  authentication: UserSession,
  folderId?: string,
  additionalParams?: any,
): Promise<IUpdateItemResponse> {
  return new Promise((resolve, reject) => {
    const updateOptions: IUpdateItemOptions = {
      item: itemInfo,
      folderId: folderId,
      authentication: authentication,
      params: {
        ...(additionalParams ?? {}),
      },
    };
    portalUpdateItem(updateOptions).then(
      (response) => (response.success ? resolve(response) : reject(response)),
      (err) => reject(err),
    );
  });
}

/**
 * Updates a group.
 *
 * @param groupInfo The base info of a group; note that this content will be serialized, which doesn't work
 * for binary content
 * @param authentication Credentials for request
 * @param additionalParams Updates that are put under the `params` property, which is not serialized
 * @returns A Promise that will resolve with the success/failure status of the request
 */
export function updateGroup(
  groupInfo: IGroup,
  authentication: UserSession,
  additionalParams?: any,
): Promise<{ success: boolean; groupId: string }> {
  return new Promise((resolve, reject) => {
    const updateOptions: IUpdateGroupOptions = {
      group: groupInfo,
      authentication,
      params: {
        ...(additionalParams ?? {}),
      },
    };

    portalUpdateGroup(updateOptions).then(
      (response) => (response.success ? resolve(response) : reject(response)),
      (err) => reject(err),
    );
  });
}

/**
 * Updates an item.
 *
 * @param itemInfo The base info of an item
 * @param data The items data section
 * @param authentication Credentials for requests
 * @param thumbnail optional thumbnail to update
 * @param access "public" or "org"
 * @return
 */
export function updateItemExtended(
  itemInfo: IItemUpdate,
  data: any,
  authentication: UserSession,
  thumbnail?: File,
  access?: string | undefined,
  templateDictionary?: any,
): Promise<IUpdateItemResponse> {
  return new Promise<IUpdateItemResponse>((resolve, reject) => {
    const updateOptions: IUpdateItemOptions = {
      item: itemInfo,
      params: {
        text: data || {}, // AGO ignores update if `data` is empty
      },
      authentication: authentication,
    };
    if (thumbnail) {
      updateOptions.params.thumbnail = thumbnail;
    }
    if (isTrackingViewTemplate(undefined, itemInfo) && templateDictionary) {
      updateOptions.owner = templateDictionary.locationTracking.owner;
    }
    portalUpdateItem(updateOptions).then(
      (result) => {
        if (access && access !== "private") {
          // Set access if it is not AGOL default
          // Set the access manually since the access value in createItem appears to be ignored
          const accessOptions: ISetAccessOptions = {
            id: itemInfo.id,
            access: access === "public" ? "public" : "org", // need to use constants rather than string
            authentication: authentication,
          };
          setItemAccess(accessOptions).then(
            () => resolve(result),
            (e) => reject(fail(e)),
          );
        } else {
          resolve(result);
        }
      },
      (e) => reject(fail(e)),
    );
  });
}

/**
 * Update an item's base and data using a dictionary.
 *
 * @param {string} itemId The item ID
 * @param {any} templateDictionary The template dictionary
 * @param {UserSession} authentication The destination session info
 * @returns Promise resolving to successfulness of update
 */
export function updateItemTemplateFromDictionary(
  itemId: string,
  templateDictionary: any,
  authentication: UserSession,
): Promise<IUpdateItemResponse> {
  return new Promise<IUpdateItemResponse>((resolve, reject) => {
    // Fetch the items as stored in AGO
    Promise.all([getItemBase(itemId, authentication), getItemDataAsJson(itemId, authentication)])
      .then(([item, data]) => {
        // Do they have any variables?
        if (hasUnresolvedVariables(item) || hasUnresolvedVariables(data)) {
          // Update if so
          const { item: updatedItem, data: updatedData } = replaceInTemplate({ item, data }, templateDictionary);
          _reportVariablesInItem(itemId, item.type, updatedItem, updatedData);

          return updateItemExtended(updatedItem, updatedData, authentication);
        } else {
          // Shortcut out if not
          return Promise.resolve({
            success: true,
            id: itemId,
          } as IUpdateItemResponse);
        }
      })
      .then((result) => resolve(result))
      .catch((error) => reject(error));
  });
}

/**
 * Updates the URL of an item.
 *
 * @param id AGOL id of item to update
 * @param url URL to assign to item's base section
 * @param authentication Credentials for the request
 * @returns A promise that will resolve with the item id when the item has been updated or an AGO-style JSON failure
 *         response
 */
export function updateItemURL(id: string, url: string, authentication: UserSession): Promise<string> {
  const numAttempts = 3;
  return _updateItemURL(id, url, authentication, numAttempts);
}

// ------------------------------------------------------------------------------------------------------------------ //

/**
 * Adds a data section to an item.
 *
 * @param itemId Id of item to receive data file
 * @param dataFile Data to be added
 * @param authentication Credentials for the request
 * @returns Promise reporting success or failure
 * @private
 */
export function _addItemDataFile(
  itemId: string,
  dataFile: File,
  authentication: UserSession,
): Promise<IUpdateItemResponse> {
  return new Promise<IUpdateItemResponse>((resolve, reject) => {
    const _addItemData: (data: any) => void = (data: any) => {
      addItemData(itemId, data, authentication).then(resolve, reject);
    };

    // Item data has to be submitted as text or JSON for those file types
    if (dataFile.type.startsWith("text/plain")) {
      blobToText(dataFile).then(_addItemData, reject);
    } else if (dataFile.type === "application/json") {
      blobToJson(dataFile).then(_addItemData, reject);
    } else {
      _addItemData(dataFile);
    }
  });
}

/**
 * Adds a metadata file to an item.
 *
 * @param itemId Id of item to receive data file
 * @param metadataFile Metadata to be added
 * @param authentication Credentials for the request
 * @returns Promise reporting success or failure
 * @private
 */
export function _addItemMetadataFile(
  itemId: string,
  metadataFile: File,
  authentication: UserSession,
): Promise<IUpdateItemResponse> {
  return new Promise<IUpdateItemResponse>((resolve, reject) => {
    const addMetadataOptions: IUpdateItemOptions = {
      item: {
        id: itemId,
      },
      params: {
        // Pass metadata in via params because item property is serialized, which discards a blob
        metadata: metadataFile,
      },
      authentication: authentication,
    };

    portalUpdateItem(addMetadataOptions).then(resolve, reject);
  });
}

/**
 * Accumulates the number of relationships in a collection of layers.
 *
 * @param List of layers to examine
 * @returns The number of relationships
 * @private
 */
export function _countRelationships(layers: any[]): number {
  const reducer = (accumulator: number, currentLayer: any) =>
    accumulator + (currentLayer.relationships ? currentLayer.relationships.length : 0);

  return layers.reduce(reducer, 0);
}

/**
 * Gets the full definitions of the layers affiliated with a hosted service.
 *
 * @param serviceUrl URL to hosted service
 * @param layerList List of layers at that service...must contain id
 * @param authentication Credentials for the request
 * @returns A promise that will resolve with a list of the layers from the admin api
 * @private
 */
export function _getCreateServiceOptions(
  newItemTemplate: IItemTemplate,
  authentication: UserSession,
  templateDictionary: any,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const serviceInfo: any = newItemTemplate.properties;
    const folderId: any = templateDictionary.folderId;
    const isPortal: boolean = templateDictionary.isPortal;
    const itemId: string = newItemTemplate.itemId;

    validateSpatialReferenceAndExtent(serviceInfo, newItemTemplate, templateDictionary);

    const fallbackExtent: any = _getFallbackExtent(serviceInfo, templateDictionary);

    const params: IParams = {};

    const itemInfo: any = {
      title: newItemTemplate.item.title,
      name: newItemTemplate.item.name,
    };

    const _item: ICreateServiceParams = {
      ...itemInfo,
      preserveLayerIds: true,
    };

    const createOptions = {
      item: _item,
      folderId,
      params,
      authentication: authentication,
    };

    createOptions.item = !isTrackingViewTemplate(newItemTemplate)
      ? _setItemProperties(createOptions.item, newItemTemplate, serviceInfo, params, isPortal)
      : setTrackingOptions(newItemTemplate, createOptions, templateDictionary);

    // project the portals extent to match that of the service
    convertExtentWithFallback(
      templateDictionary.organization.defaultExtent,
      fallbackExtent,
      serviceInfo.service.spatialReference,
      templateDictionary.organization.helperServices.geometry.url,
      authentication,
    ).then(
      (extent) => {
        templateDictionary[itemId].solutionExtent = extent;
        setDefaultSpatialReference(templateDictionary, itemId, extent.spatialReference);
        createOptions.item = replaceInTemplate(createOptions.item, templateDictionary);
        createOptions.params = replaceInTemplate(createOptions.params, templateDictionary);

        if (newItemTemplate.item.thumbnail) {
          // Pass thumbnail file in via params because item property is serialized, which discards a blob
          createOptions.params.thumbnail = newItemTemplate.item.thumbnail;
        }

        resolve(createOptions);
      },
      (e) => reject(fail(e)),
    );
  });
}

/**
 * When the services spatial reference does not match that of it's default extent
 * use the out SRs default extent if it exists in the templateDictionary
 * this should be set when adding a custom out wkid to the params before calling deploy
 * this will help avoid situations where the orgs default extent and default world extent
 * will not project successfully to the out SR
 *
 * @param serviceInfo the object that contains the spatial reference to evaluate
 * @param templateDictionary the template dictionary
 * @returns the extent to use as the fallback
 * @private
 */
export function _getFallbackExtent(serviceInfo: any, templateDictionary: any): any {
  const serviceSR: any = serviceInfo.service.spatialReference;
  const serviceInfoWkid = getProp(serviceInfo, "defaultExtent.spatialReference.wkid");
  const customDefaultExtent = getProp(templateDictionary, "params.defaultExtent");
  return serviceInfoWkid && serviceInfoWkid === serviceSR.wkid
    ? serviceInfo.defaultExtent
    : customDefaultExtent
      ? customDefaultExtent
      : serviceInfo.defaultExtent;
}

/**
 * Add relationships to all layers in one call to retain fully functioning composite relationships
 *
 * @param args The IPostProcessArgs for the request(s)
 * @returns Any relationships that should be updated for the service
 * @private
 */
export function _getRelationshipUpdates(args: IPostProcessArgs): any {
  const rels: any = {
    layers: [],
  };
  Object.keys(args.objects).forEach((k: any) => {
    const obj: any = args.objects[k];
    /* istanbul ignore else */
    if (obj.relationships && obj.relationships.length > 0) {
      rels.layers.push({
        id: obj.id,
        relationships: obj.relationships,
      });
    }
    deleteProp(obj, "relationships");
  });
  return rels;
}

/**
 * Get the stored contingent values and structure them to be added to the services layers.
 *
 * @param args The IPostProcessArgs for the request(s)
 * @returns Any contingent values that should be added to the service.
 * @private
 */
export function _getContingentValuesUpdates(args: IPostProcessArgs): any {
  const contingentValues: any[] = [];
  Object.keys(args.objects).forEach((k: any) => {
    const obj: any = args.objects[k];
    /* istanbul ignore else */
    if (obj.contingentValues) {
      contingentValues.push({
        id: obj.id,
        contingentValues: obj.contingentValues,
      });
    }
    deleteProp(obj, "contingentValues");
  });
  return contingentValues;
}

/**
 * Get the stored subtype values and structure them to be added to the services layers.
 *
 * @param args The IPostProcessArgs for the request(s)
 * @returns Any subtype values that should be added to the service.
 * @private
 */
export function _getSubtypeUpdates(args: IPostProcessArgs): any {
  const subtypeUpdates: any[] = [];
  Object.keys(args.objects).forEach((k: any) => {
    const obj: any = args.objects[k];
    /* istanbul ignore else */
    if (obj.subtypeField) {
      subtypeUpdates.push({
        id: obj.id,
        subtypeField: obj.subtypeField,
        subtypes: obj.subtypes,
        defaultSubtypeCode: obj.defaultSubtypeCode,
      });
    }
    deleteProp(obj, "subtypeField");
    deleteProp(obj, "subtypes");
    deleteProp(obj, "defaultSubtypeCode");
  });
  return subtypeUpdates;
}

/**
 * Get refresh, add, update, or delete definition info
 *
 * @param url the base admin url for the service
 * @param id the id of the layer
 * @param obj parameters for the request
 * @param args various arguments to help support the request
 * @param type type of update the request will handle
 * @returns IUpdate that has the request url and arguments
 * @private
 */
export function _getUpdate(
  url: string,
  id: any,
  obj: any,
  args: any,
  type: "delete" | "update" | "add" | "refresh",
): IUpdate {
  const ops: any = {
    delete: {
      url: checkUrlPathTermination(url) + id + "/deleteFromDefinition",
      params: {
        deleteFromDefinition: {
          fields: obj && obj.hasOwnProperty("deleteFields") ? obj.deleteFields : [],
        },
      },
    },
    update: {
      url: checkUrlPathTermination(url) + (id ? `${id}/updateDefinition` : "updateDefinition"),
      params: {
        updateDefinition: obj,
      },
    },
    add: {
      url: checkUrlPathTermination(url) + "addToDefinition",
      params: {
        addToDefinition: obj,
      },
    },
    refresh: {
      url: checkUrlPathTermination(url) + "refresh",
      params: {
        f: "json",
      },
    },
  };

  return {
    url: ops[type].url,
    params: ops[type].params,
    args: args,
  };
}

/**
 * Changes just the domain part of a URL to lowercase.
 *
 * @param url URL to modify
 * @return Adjusted URL
 * @see From `getServerRootUrl` in arcgis-rest-js' ArcGISIdentityManager.ts
 * @private
 */
export function _lowercaseDomain(url: string): string {
  if (!url) {
    return url;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, protocol, domainAndPath] = url.match(/(https?:\/\/)(.+)/);
  const [domain, ...path] = domainAndPath.split("/");

  // Only the domain is lowercased because in some cases an org id might be
  // in the path which cannot be lowercased.
  return `${protocol}${domain.toLowerCase()}/${path.join("/")}`;
}

/**
 * Checks the two main parts of an item for unresolved variables and reports any found.
 *
 * @param base Item's base section
 * @param data Item's data section
 * @private
 */
export function _reportVariablesInItem(itemId: string, itemType: string, base: any, data: any): void {
  const getUnresolved = (v: any) => {
    return JSON.stringify(v).match(/{{.+?}}/gim);
  };

  // Provide feedback about any remaining unresolved variables
  /* istanbul ignore else */
  if (base && hasUnresolvedVariables(base)) {
    console.log(itemId + " (" + itemType + ") contains variables in base: " + JSON.stringify(getUnresolved(base)));
  }
  /* istanbul ignore else */
  if (data && hasUnresolvedVariables(data)) {
    console.log(itemId + " (" + itemType + ") contains variables in data: " + JSON.stringify(getUnresolved(data)));
  }
}

/**
 * Updates a feature service item.
 *
 * @param item Item to update
 * @param itemTemplate item template for the new item
 * @param serviceInfo Service information
 * @param params arcgis-rest-js params to update
 * @param isPortal Is the service hosted in a portal?
 * @returns Updated item
 * @private
 */
export function _setItemProperties(
  item: any,
  itemTemplate: IItemTemplate,
  serviceInfo: any,
  params: IParams,
  isPortal: boolean,
): any {
  // Set the capabilities
  const portalCapabilities = ["Create", "Query", "Editing", "Update", "Delete", "Uploads", "Sync", "Extract"];

  const capabilities = getProp(serviceInfo, "service.capabilities") || (isPortal ? "" : []);

  item.capabilities = isPortal
    ? capabilities
        .split(",")
        .filter((c: any) => portalCapabilities.indexOf(c) > -1)
        .join(",")
    : capabilities;
  if (serviceInfo.service.capabilities) {
    serviceInfo.service.capabilities = item.capabilities;
  }

  // Handle index update for any pre-published solution items that
  // have non-unique indexes on relationship key fields
  _updateIndexesForRelationshipKeyFields(serviceInfo);

  // set create options item properties
  const keyProperties: string[] = [
    "isView",
    "sourceSchemaChangesAllowed",
    "isUpdatableView",
    "capabilities",
    "isMultiServicesView",
  ];
  const deleteKeys: string[] = ["layers", "tables"];
  /* istanbul ignore else */
  if (isPortal) {
    // removed for issue #423 causing FS to fail to create
    deleteKeys.push("adminServiceInfo");
  }
  const itemKeys: string[] = Object.keys(item);
  const serviceKeys: string[] = Object.keys(serviceInfo.service);
  serviceKeys.forEach((k) => {
    /* istanbul ignore else */
    if (itemKeys.indexOf(k) === -1 && deleteKeys.indexOf(k) < 0) {
      item[k] = serviceInfo.service[k];
      // These need to be included via params otherwise...
      // addToDef calls fail when adding adminLayerInfo
      /* istanbul ignore else */
      if (serviceInfo.service.isView && keyProperties.indexOf(k) > -1) {
        params[k] = serviceInfo.service[k];
      }
    }
  });

  // Enable editor tracking on layer with related tables is not supported.
  /* istanbul ignore else */
  if (item.isMultiServicesView && getProp(item, "editorTrackingInfo.enableEditorTracking")) {
    item.editorTrackingInfo.enableEditorTracking = false;
    params["editorTrackingInfo"] = item.editorTrackingInfo;
  }

  /* istanbul ignore else */
  if (isPortal) {
    // portal will fail when initialExtent is defined but null
    // removed for issue #449 causing FS to fail to create on portal
    /* istanbul ignore else */
    if (Object.keys(item).indexOf("initialExtent") > -1 && !item.initialExtent) {
      deleteProp(item, "initialExtent");
    }
  }

  return item;
}

/**
 * Set isUnique as true for indexes that reference origin relationship keyFields.
 *
 * @param serviceInfo Service information
 * @private
 */
export function _updateIndexesForRelationshipKeyFields(serviceInfo: any): void {
  const layersAndTables: any[] = (serviceInfo.layers || []).concat(serviceInfo.tables || []);
  layersAndTables.forEach((item) => {
    const relationships: any[] = item.relationships;
    const indexes: any[] = item.indexes;
    /* istanbul ignore else */
    if (relationships && relationships.length > 0 && indexes && indexes.length > 0) {
      const keyFields: string[] = relationships.reduce((acc, v) => {
        /* istanbul ignore else */
        if (v.role === "esriRelRoleOrigin" && v.keyField && acc.indexOf(v.keyField) < 0) {
          acc.push(v.keyField);
        }
        return acc;
      }, []);
      indexes.map((i) => {
        /* istanbul ignore else */
        if (
          keyFields.some((k) => {
            const regEx: RegExp = new RegExp(`\\b${k}\\b`);
            return regEx.test(i.fields);
          })
        ) {
          i.isUnique = true;
        }
        return i;
      });
    }
  });
}

/**
 * Updates the URL of an item.
 *
 * @param id AGOL id of item to update
 * @param url URL to assign to item's base section
 * @param authentication Credentials for the request
 * @param numAttempts Number of times to try to set the URL if AGO says that it updated the URL, but really didn't
 * @returns A promise that will resolve with the item id when the item has been updated or an AGO-style JSON failure
 *         response
 * @private
 */
export function _updateItemURL(id: string, url: string, authentication: UserSession, numAttempts = 1): Promise<string> {
  // Introduce a lag because AGO update appears to choke with rapid subsequent calls
  const msLag = 1000;

  return new Promise((resolve, reject) => {
    // Update the item's URL
    const options = { item: { id, url }, authentication: authentication };

    portalUpdateItem(options).then(
      (result) => {
        if (!result.success) {
          reject(fail(result));
        } else {
          // Get the item to see if the URL really changed; we'll delay a bit before testing because AGO
          // has a timing problem with URL updates
          setTimeout(() => {
            getItem(id, { authentication: authentication }).then(
              (item) => {
                const iBrace = item.url.indexOf("{");
                if (iBrace > -1) {
                  console.warn(id + " has template variable: " + item.url.substr(iBrace));
                }

                if (url === item.url) {
                  resolve(id);
                } else {
                  // If it fails, try again if we have sufficient attempts remaining
                  const errorMsg =
                    "URL not updated for " + item.type + " " + item.id + ": " + item.url + " (" + numAttempts + ")";
                  if (--numAttempts > 0) {
                    _updateItemURL(id, url, authentication, numAttempts).then(resolve, reject);
                  } else {
                    console.error(id + ": " + errorMsg + "; FAILED");
                    reject(errorMsg);
                  }
                }
              },
              (e) => reject(fail(e)),
            );
          }, msLag);
        }
      },
      (e) => reject(fail(e)),
    );
  });
}
