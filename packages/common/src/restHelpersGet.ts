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
 * Provides common item fetch functions involving the arcgis-rest-js library.
 *
 * @module restHelpersGet
 */

import {
  blobToFile,
  blobToJson,
  blobToText,
  checkUrlPathTermination,
  getProp
} from "./generalHelpers";
import {
  IGetResourcesResponse,
  IGroup,
  IItem,
  IPagingParams,
  IPortal,
  IRelatedItems,
  ItemRelationshipType,
  IUser,
  ArcGISIdentityManager
} from "./interfaces";
import {
  IGetGroupContentOptions,
  IGetRelatedItemsResponse,
  IGroupCategorySchema,
  IItemRelationshipOptions,
  getGroup,
  getGroupCategorySchema as portalGetGroupCategorySchema,
  getGroupContent,
  getItem,
  getItemResources as portalGetItemResources,
  getPortal as portalGetPortal,
  getRelatedItems
} from "@esri/arcgis-rest-portal";
import { IRequestOptions, request } from "@esri/arcgis-rest-request";
import { getBlob } from "./resources/get-blob";
import { searchGroups, searchGroupContents } from "./restHelpers";

// ------------------------------------------------------------------------------------------------------------------ //

const ZIP_FILE_HEADER_SIGNATURE = "PK";

export function checkJsonForError(json: any): boolean {
  return typeof json?.error !== "undefined";
}

export function getPortal(
  id: string,
  authentication: ArcGISIdentityManager
): Promise<IPortal> {
  const requestOptions = {
    authentication: authentication
  };
  return portalGetPortal(id, requestOptions);
}

export function getUser(authentication: ArcGISIdentityManager): Promise<IUser> {
  return authentication.getUser();
}

export function getUsername(authentication: ArcGISIdentityManager): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    getUser(authentication).then(
      (user: IUser) => resolve(user.username),
      reject
    );
  });
}

export function getFoldersAndGroups(authentication: ArcGISIdentityManager): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    const requestOptions = {
      httpMethod: "GET",
      authentication: authentication,
      rawResponse: false
    } as IRequestOptions;

    // Folders
    const foldersUrl: string = `${
      authentication.portal
    }/content/users/${encodeURIComponent(authentication.username)}`;

    // Groups
    const groupsUrl: string = `${
      authentication.portal
    }/community/users/${encodeURIComponent(authentication.username)}`;

    Promise.all([
      request(foldersUrl, requestOptions),
      request(groupsUrl, requestOptions)
    ]).then(
      responses => {
        resolve({
          folders: responses[0].folders || [],
          groups: responses[1].groups || []
        });
      },
      e => reject(e)
    );
  });
}

/**
 * Gets a Blob from a web site and casts it as a file using the supplied name.
 *
 * @param url Address of Blob
 * @param filename Name to use for file
 * @param authentication Credentials for the request
 * @returns Promise that will resolve with a File, undefined if the Blob is null, or an AGO-style JSON failure response
 */
export function getBlobAsFile(
  url: string,
  filename: string,
  authentication: ArcGISIdentityManager,
  ignoreErrors: number[] = [],
  mimeType?: string
): Promise<File> {
  return new Promise<File>((resolve, reject) => {
    // Get the blob from the URL
    getBlobCheckForError(url, authentication, ignoreErrors).then(
      blob =>
        !blob ? resolve(null) : resolve(blobToFile(blob, filename, mimeType)),
      reject
    );
  });
}

/**
 * Gets a Blob from a web site and checks for a JSON error packet in the Blob.
 *
 * @param url Address of Blob
 * @param authentication Credentials for the request
 * @param ignoreErrors List of HTTP error codes that should be ignored
 * @returns Promise that will resolve with Blob or an AGO-REST JSON failure response
 */
export function getBlobCheckForError(
  url: string,
  authentication: ArcGISIdentityManager,
  ignoreErrors: number[] = []
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    // Get the blob from the URL
    getBlob(url, authentication).then(blob => {
      // Reclassify text/plain blobs as needed
      _fixTextBlobType(blob).then(adjustedBlob => {
        if (adjustedBlob.type === "application/json") {
          // Blob may be an error
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          blobToJson(adjustedBlob).then((json: any) => {
            // Check for valid JSON with an error
            if (json?.error) {
              const code: number = json.error.code;
              if (code !== undefined && ignoreErrors.indexOf(code) >= 0) {
                resolve(null); // Error, but ignored
              } else {
                reject(json); // Other error; fail with error
              }
            } else {
              resolve(adjustedBlob);
            }
          });
        } else {
          resolve(adjustedBlob);
        }
      }, reject);
    }, reject);
  });
}

/**
 * Extracts the text in a url between the last forward slash and the beginning of the url's parameters.
 *
 * @param url URL to work with
 * @returns Text extracted; empty if url ends with a forward slash or has a "?" immediately after the last
 * forward slash
 */
export function getFilenameFromUrl(url: string): string {
  if (!url) {
    return "";
  }

  let iParamsStart = url.indexOf("?");
  /* istanbul ignore else */
  if (iParamsStart < 0) {
    iParamsStart = url.length;
  }
  const iFilenameStart = url.lastIndexOf("/", iParamsStart) + 1;

  return iFilenameStart < iParamsStart
    ? url.substring(iFilenameStart, iParamsStart)
    : "";
}

/**
 * Gets the primary information of an AGO group.
 *
 * @param groupId Id of an group whose primary information is sought
 * @param authentication Credentials for the request to AGO
 * @returns A promise that will resolve with group's JSON or error JSON or throws ArcGISRequestError in case of HTTP error
 *         or response error code
 */
export function getGroupBase(
  groupId: string,
  authentication: ArcGISIdentityManager
): Promise<IGroup> {
  const requestOptions = {
    authentication: authentication
  };
  return getGroup(groupId, requestOptions);
}

/**
 * Gets the category schema set on a group.
 *
 * @param groupId Id of an group whose category schema information is sought
 * @param authentication Credentials for the request to AGO
 * @returns A promise that will resolve with JSON of group's category schema
 * @see https://developers.arcgis.com/rest/users-groups-and-items/group-category-schema.htm
 */
export function getGroupCategorySchema(
  groupId: string,
  authentication: ArcGISIdentityManager
): Promise<IGroupCategorySchema> {
  const requestOptions = {
    authentication: authentication
  };
  return portalGetGroupCategorySchema(groupId, requestOptions);
}

/**
 * Gets the ids of the dependencies (contents) of an AGO group.
 *
 * @param groupId Id of a group whose contents are sought
 * @param authentication Credentials for the request to AGO
 * @returns A promise that will resolve with list of dependent ids or an empty list
 */
export function getGroupContents(
  groupId: string,
  authentication: ArcGISIdentityManager
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const pagingParams: IPagingParams = {
      start: 1,
      num: 100 // max allowed by REST API
    };

    // Fetch group items
    _getGroupContentsTranche(groupId, pagingParams, authentication).then(
      contents => {
        resolve(contents);
      },
      reject
    );
  });
}

/**
 * Gets the primary information of an AGO item.
 *
 * @param itemId Id of an item whose primary information is sought
 * @param authentication Credentials for the request to AGO
 * @returns A promise that will resolve with item's JSON or error JSON or throws ArcGISRequestError in case of HTTP error
 *         or response error code
 */
export function getItemBase(
  itemId: string,
  authentication: ArcGISIdentityManager
): Promise<IItem> {
  const itemParam: IRequestOptions = {
    authentication: authentication
  };
  return getItem(itemId, itemParam);
}

/**
 * Gets the data information of an AGO item in its raw (Blob) form and casts it as a file using the supplied name.
 *
 * @param itemId Id of an item whose data information is sought
 * @param filename Name to use for file
 * @param authentication Credentials for the request to AGO
 * @returns Promise that will resolve with a File, undefined if the Blob is null, or an AGO-style JSON failure response
 */
export function getItemDataAsFile(
  itemId: string,
  filename: string,
  authentication: ArcGISIdentityManager
): Promise<File> {
  return new Promise<File>(resolve => {
    getItemDataBlob(itemId, authentication).then(
      blob => resolve(blobToFile(blob, filename)),
      () => resolve(null)
    );
  });
}

/**
 * Gets the data information of an AGO item in its JSON form.
 *
 * @param itemId Id of an item whose data information is sought
 * @param filename Name to use for file
 * @param authentication Credentials for the request to AGO
 * @returns Promise that will resolve with JSON, or an AGO-style JSON failure response
 */
export function getItemDataAsJson(
  itemId: string,
  authentication: ArcGISIdentityManager
): Promise<any> {
  return new Promise<any>(resolve => {
    getItemDataBlob(itemId, authentication).then(
      blob => resolve(blobToJson(blob)),
      () => resolve(null)
    );
  });
}

/**
 * Gets the data information of an AGO item in its raw (Blob) form.
 *
 * @param itemId Id of an item whose data information is sought
 * @param authentication Credentials for the request to AGO
 * @returns A promise that will resolve with the data Blob or null if the item doesn't have a data section
 */
export function getItemDataBlob(
  itemId: string,
  authentication: ArcGISIdentityManager
): Promise<Blob> {
  return new Promise<Blob>(resolve => {
    const url = getItemDataBlobUrl(itemId, authentication);
    getBlobCheckForError(url, authentication, [400, 500]).then(
      blob => resolve(_fixTextBlobType(blob)),
      () => resolve(null)
    );
  });
}

/**
 * Gets the URL to the data information of an AGO item in its raw (Blob) form.
 *
 * @param itemId Id of an item whose data information is sought
 * @param authentication Credentials for the request to AGO
 * @returns URL string
 */
export function getItemDataBlobUrl(
  itemId: string,
  authentication: ArcGISIdentityManager
): string {
  return `${getPortalSharingUrlFromAuth(
    authentication
  )}/content/items/${itemId}/data`;
}

/**
 * Gets the URL to an information item in an AGO item.
 *
 * @param itemId Id of an item whose data information is sought
 * @param authentication Credentials for the request to AGO
 * @returns URL string
 */
export function getItemInfoFileUrlPrefix(
  itemId: string,
  authentication: ArcGISIdentityManager
): string {
  return `${getPortalSharingUrlFromAuth(
    authentication
  )}/content/items/${itemId}/info/`;
}

/**
 * Gets the metadata information of an AGO item.
 *
 * @param itemId Id of an item whose data information is sought
 * @param authentication Credentials for the request to AGO
 * @returns Promise that will resolve with `undefined` or a File containing the metadata
 */
export function getItemMetadataAsFile(
  itemId: string,
  authentication: ArcGISIdentityManager
): Promise<File> {
  return new Promise<File>(resolve => {
    getItemMetadataBlob(itemId, authentication).then(
      blob => {
        if (!blob || (blob && blob.type.startsWith("application/json"))) {
          resolve(null); // JSON error
        } else {
          resolve(blobToFile(blob, "metadata.xml"));
        }
      },
      () => resolve(null)
    );
  });
}

/**
 * Gets the metadata information of an AGO item.
 *
 * @param itemId Id of an item whose data information is sought
 * @param authentication Credentials for the request to AGO
 * @returns A promise that will resolve with the metadata Blob or null if the item doesn't have a metadata file
 */
export function getItemMetadataBlob(
  itemId: string,
  authentication: ArcGISIdentityManager
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const url = getItemMetadataBlobUrl(itemId, authentication);

    getBlobCheckForError(url, authentication, [400]).then(resolve, reject);
  });
}

/**
 * Gets the URL to the metadata information of an AGO item.
 *
 * @param itemId Id of an item whose data information is sought
 * @param authentication Credentials for the request to AGO
 * @returns URL string
 */
export function getItemMetadataBlobUrl(
  itemId: string,
  authentication: ArcGISIdentityManager
): string {
  return (
    getItemInfoFileUrlPrefix(itemId, authentication) + "metadata/metadata.xml"
  );
}

/**
 * Gets the related items of an AGO item.
 *
 * @param itemId Id of an item whose related items are sought
 * @param relationshipType
 * @param direction
 * @param authentication Credentials for the request to AGO
 * @returns A promise that will resolve with an arcgis-rest-js `IGetRelatedItemsResponse` structure
 */
export function getItemRelatedItems(
  itemId: string,
  relationshipType: ItemRelationshipType | ItemRelationshipType[],
  direction: "forward" | "reverse",
  authentication: ArcGISIdentityManager
): Promise<IGetRelatedItemsResponse> {
  return new Promise<IGetRelatedItemsResponse>(resolve => {
    const itemRelatedItemsParam: IItemRelationshipOptions = {
      id: itemId,
      relationshipType,
      direction,
      authentication: authentication
    };
    getRelatedItems(itemRelatedItemsParam).then(
      (response: IGetRelatedItemsResponse) => {
        resolve(response);
      },
      () => {
        resolve({
          total: 0,
          start: 1,
          num: 0,
          nextStart: -1,
          relatedItems: []
        } as IGetRelatedItemsResponse);
      }
    );
  });
}

/**
 * Gets all of the related items of an AGO item in the specified direction.
 *
 * @param itemId Id of an item whose related items are sought
 * @param direction
 * @param authentication Credentials for the request to AGO
 * @returns A promise that will resolve with a list of IRelatedItems
 */
export function getItemRelatedItemsInSameDirection(
  itemId: string,
  direction: "forward" | "reverse",
  authentication: ArcGISIdentityManager
): Promise<IRelatedItems[]> {
  return new Promise<IRelatedItems[]>(resolve => {
    const relationshipTypes = [
      // from ItemRelationshipType
      "APIKey2Item",
      "Area2CustomPackage",
      "Area2Package",
      "Item2Attachment",
      "Item2Report",
      "Listed2Provisioned",
      "Map2AppConfig",
      "Map2Area",
      "Map2FeatureCollection",
      "Map2Service",
      "MobileApp2Code",
      "Service2Data",
      "Service2Layer",
      "Service2Route",
      "Service2Service",
      "Service2Style",
      "Solution2Item",
      "Style2Style",
      "Survey2Data",
      "Survey2Service",
      "SurveyAddIn2Data",
      "Theme2Story",
      "TrackView2Map",
      "WebStyle2DesktopStyle",
      "WMA2Code",
      "WorkforceMap2FeatureService"
    ];

    const relatedItemDefs: Array<Promise<
      IGetRelatedItemsResponse
    >> = relationshipTypes.map(relationshipType =>
      getItemRelatedItems(
        itemId,
        relationshipType as ItemRelationshipType,
        direction,
        authentication
      )
    );
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    Promise.all(relatedItemDefs).then(
      (relationshipResponses: IGetRelatedItemsResponse[]) => {
        const relatedItems: IRelatedItems[] = [];

        for (let i: number = 0; i < relationshipTypes.length; ++i) {
          if (relationshipResponses[i].total > 0) {
            relatedItems.push({
              relationshipType: relationshipTypes[i],
              relatedItemIds: relationshipResponses[i].relatedItems.map(
                item => item.id
              )
            });
          }
        }

        resolve(relatedItems);
      }
    );
  });
}

export function getItemResources(
  id: string,
  authentication: ArcGISIdentityManager
): Promise<any> {
  return new Promise<any>(resolve => {
    const requestOptions = {
      authentication: authentication
    };
    portalGetItemResources(id, requestOptions).then(resolve, () => {
      resolve({
        total: 0,
        start: 1,
        num: 0,
        nextStart: -1,
        resources: []
      } as IGetResourcesResponse);
    });
  });
}

/**
 * Gets the resources of an AGO item.
 *
 * @param itemId Id of an item whose resources are sought
 * @param authentication Credentials for the request to AGO
 * @returns Promise that will resolve with a list of Files or an AGO-style JSON failure response
 */
export function getItemResourcesFiles(
  itemId: string,
  authentication: ArcGISIdentityManager
): Promise<File[]> {
  return new Promise<File[]>((resolve, reject) => {
    const pagingParams: IPagingParams = {
      start: 1,
      num: 100 // max allowed by REST API
    };

    // Fetch resources
    _getItemResourcesTranche(itemId, pagingParams, authentication).then(
      itemResourcesDef => {
        Promise.all(itemResourcesDef).then(resolve, reject);
      },
      reject
    );
  });
}

/**
 * Gets all of the items associated with a Solution via a Solution2Item relationship.
 *
 * @param solutionItemId Id of a deployed Solution
 * @param authentication Credentials for the request
 * @returns Promise resolving to a list of detailed item information
 */
export function getItemsRelatedToASolution(
  solutionItemId: string,
  authentication: ArcGISIdentityManager
): Promise<IItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  return getItemRelatedItems(
    solutionItemId,
    "Solution2Item",
    "forward",
    authentication
  ).then((relationshipResponse: IGetRelatedItemsResponse) => {
    return relationshipResponse.relatedItems;
  });
}

/**
 * Gets the thumbnail of an AGO item.
 *
 * @param itemId Id of an item whose resources are sought
 * @param thumbnailUrlPart The partial name of the item's thumbnail as reported by the `thumbnail` property
 * in the item's base section
 * @param isGroup Switch indicating if the item is a group
 * @param authentication Credentials for the request to AGO
 * @returns Promise that will resolve with an image Blob or an AGO-style JSON failure response
 */
export function getItemThumbnail(
  itemId: string,
  thumbnailUrlPart: string,
  isGroup: boolean,
  authentication: ArcGISIdentityManager
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    if (!thumbnailUrlPart) {
      resolve(null);
      return;
    }

    const url = getItemThumbnailUrl(
      itemId,
      thumbnailUrlPart,
      isGroup,
      authentication
    );

    getBlobCheckForError(url, authentication, [500]).then(
      blob => resolve(_fixTextBlobType(blob)),
      reject
    );
  });
}

/**
 * Gets the thumbnail of an AGO item.
 *
 * @param itemId Id of an item whose resources are sought
 * @param thumbnailUrlPart The partial name of the item's thumbnail as reported by the `thumbnail` property
 * in the item's base section
 * @param isGroup Switch indicating if the item is a group
 * @param authentication Credentials for the request to AGO
 * @returns Promise that will resolve with an image Blob or an AGO-style JSON failure response
 */
export function getItemThumbnailAsFile(
  itemId: string,
  thumbnailUrlPart: string,
  isGroup: boolean,
  authentication: ArcGISIdentityManager
): Promise<File> {
  return new Promise<File>((resolve, reject) => {
    /* istanbul ignore else */
    if (!thumbnailUrlPart) {
      resolve(null);
      return;
    }

    const url = getItemThumbnailUrl(
      itemId,
      thumbnailUrlPart,
      isGroup,
      authentication
    );

    const iFilenameStart = thumbnailUrlPart.lastIndexOf("/") + 1;
    const filename = thumbnailUrlPart.substring(iFilenameStart);

    getBlobAsFile(url, filename, authentication, [400, 500]).then(
      resolve,
      reject
    );
  });
}

/**
 * Gets the URL to the thumbnail of an AGO item.
 *
 * @param itemId Id of an item whose resources are sought
 * @param thumbnailUrlPart The partial name of the item's thumbnail as reported by the `thumbnail` property
 * in the item's base section
 * @param isGroup Switch indicating if the item is a group
 * @param authentication Credentials for the request to AGO
 * @returns URL string
 */
export function getItemThumbnailUrl(
  itemId: string,
  thumbnailUrlPart: string,
  isGroup: boolean,
  authentication: ArcGISIdentityManager
): string {
  return (
    checkUrlPathTermination(getPortalSharingUrlFromAuth(authentication)) +
    (isGroup ? "community/groups/" : "content/items/") +
    itemId +
    "/info/" +
    thumbnailUrlPart
  );
}

/**
 * Gets a JSON from a web site.
 *
 * @param url Address of JSON
 * @param authentication Credentials for the request
 * @returns Promise that will resolve with JSON
 */
export function getJson(
  url: string,
  authentication?: ArcGISIdentityManager
): Promise<any> {
  // Get the blob from the URL
  const requestOptions: IRequestOptions = { httpMethod: "GET" };
  return getBlob(url, authentication, requestOptions)
    .then(blob => {
      // Reclassify text/plain blobs as needed
      return _fixTextBlobType(blob);
    })
    .then(adjustedBlob => {
      if (adjustedBlob.type === "application/json") {
        // Blob may be an error
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        return blobToJson(adjustedBlob);
      } else {
        return Promise.resolve(null);
      }
    });
}

/**
 * Extracts the portal sharing url from a supplied authentication.
 *
 * @param authentication Credentials for the request to AGO
 * @returns Portal sharing url to be used in API requests, defaulting to `https://www.arcgis.com/sharing/rest`
 */
export function getPortalSharingUrlFromAuth(
  authentication: ArcGISIdentityManager
): string {
  // If auth was passed, use that portal
  return getProp(authentication, "portal") || "https://www.arcgis.com/sharing/rest";
}

/**
 * Extracts the portal url from a supplied authentication.
 *
 * @param authentication Credentials for the request to AGO
 * @returns Portal url to be used in API requests, defaulting to `https://www.arcgis.com`
 */
export function getPortalUrlFromAuth(authentication: ArcGISIdentityManager): string {
  return getPortalSharingUrlFromAuth(authentication).replace(
    "/sharing/rest",
    ""
  );
}

/**
 * Gets the ids of all Solution items associated with an AGO item via a Solution2Item relationship.
 *
 * @param itemId Id of an AGO item to query
 * @param authentication Credentials for the request
 * @returns Promise resolving to a list of Solution item ids
 */
export function getSolutionsRelatedToAnItem(
  itemId: string,
  authentication: ArcGISIdentityManager
): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  return getItemRelatedItems(
    itemId,
    "Solution2Item",
    "reverse",
    authentication
  ).then((relationshipResponse: IGetRelatedItemsResponse) => {
    return relationshipResponse.relatedItems.map(item => item.id);
  });
}

export function getThumbnailFile(
  url: string,
  filename: string,
  authentication: ArcGISIdentityManager
): Promise<File> {
  return new Promise<File>(resolve => {
    getBlobAsFile(url, filename, authentication, [500]).then(resolve, () =>
      resolve(null)
    );
  });
}

// ------------------------------------------------------------------------------------------------------------------ //

/**
 * Fixes the types of Blobs incorrectly typed as text/plain.
 *
 * @param blob Blob to check
 * @returns Promise resolving to original Blob, unless it's originally typed as text/plain but is
 * really JSON, ZIP, or XML
 * @private
 */
export function _fixTextBlobType(blob: Blob): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    if (
      blob &&
      blob.size > 0 &&
      (blob.type.startsWith("text/plain") ||
        blob.type.startsWith("application/json"))
    ) {
      blobToText(blob).then(
        blobText => {
          // Convertible to JSON?
          try {
            JSON.parse(blobText);
            // Yes; reclassify as JSON
            resolve(new Blob([blob], { type: "application/json" }));
          } catch (ignored) {
            // Nope; test for ZIP file
            if (
              blobText.length > 4 &&
              blobText.substr(0, 4) === ZIP_FILE_HEADER_SIGNATURE
            ) {
              // Yes; reclassify as ZIP
              resolve(new Blob([blob], { type: "application/zip" }));
            } else if (blobText.startsWith("<")) {
              // Reclassify as XML; since the blob started out as text/plain, it's more likely that is
              // meant to be human-readable, so we'll use text/xml instead of application/xml
              resolve(new Blob([blob], { type: "text/xml" }));
            } else {
              // Leave as text
              resolve(blob);
            }
          }
        },
        // Faulty blob
        reject
      );
    } else {
      // Empty or not typed as plain text, so simply return
      if (blob) {
        resolve(blob);
      } else {
        reject();
      }
    }
  });
}

/**
 * Gets some of the ids of the dependencies (contents) of an AGO group.
 *
 * @param groupId Id of a group whose contents are sought
 * @param pagingParams Structure with start and num properties for the tranche to fetch
 * @param authentication Credentials for the request to AGO
 * @returns A promise that will resolve with list of dependent ids or an empty list
 * @private
 */
export function _getGroupContentsTranche(
  groupId: string,
  pagingParams: IPagingParams,
  authentication: ArcGISIdentityManager
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    // Fetch group items
    const pagingRequest: IGetGroupContentOptions = {
      paging: pagingParams,
      authentication: authentication
    };

    getGroupContent(groupId, pagingRequest).then(contents => {
      if (contents.num > 0) {
        // Extract the list of content ids from the JSON returned
        const trancheIds: string[] = contents.items.map((item: any) => item.id);

        // Are there more contents to fetch?
        if (contents.nextStart > 0) {
          pagingRequest.paging.start = contents.nextStart;
          _getGroupContentsTranche(groupId, pagingParams, authentication).then(
            (allSubsequentTrancheIds: string[]) => {
              // Append all of the following tranches to the current tranche and return it
              resolve(trancheIds.concat(allSubsequentTrancheIds));
            },
            reject
          );
        } else {
          resolve(trancheIds);
        }
      } else {
        resolve([]);
      }
    }, reject);
  });
}

/**
 * Gets some of the resources of an AGO item.
 *
 * @param itemId Id of an item whose resources are sought
 * @param pagingParams Structure with start and num properties for the tranche to fetch
 * @param authentication Credentials for the request to AGO
 * @returns Promise that will resolve with a list of File promises or an AGO-style JSON failure response
 * @private
 */
export function _getItemResourcesTranche(
  itemId: string,
  pagingParams: IPagingParams,
  authentication: ArcGISIdentityManager
): Promise<Array<Promise<File>>> {
  return new Promise<Array<Promise<File>>>((resolve, reject) => {
    // Fetch resources
    const portalSharingUrl = getPortalSharingUrlFromAuth(authentication);
    const trancheUrl = `${portalSharingUrl}/content/items/${itemId}/resources`;
    const itemResourcesDef: Array<Promise<File>> = [];

    const options: IRequestOptions = {
      params: {
        ...pagingParams
      },
      authentication: authentication
    };

    request(trancheUrl, options).then(contents => {
      if (contents.num > 0) {
        // Extract the list of resource filenames from the JSON returned
        contents.resources.forEach((resource: any) => {
          const itemResourceUrl = `${portalSharingUrl}/content/items/${itemId}/resources/${resource.resource}`;
          itemResourcesDef.push(
            getBlobAsFile(itemResourceUrl, resource.resource, authentication)
          );
        });

        // Are there more resources to fetch?
        if (contents.nextStart > 0) {
          pagingParams.start = contents.nextStart;
          _getItemResourcesTranche(itemId, pagingParams, authentication).then(
            (allSubsequentTrancheDefs: Array<Promise<File>>) => {
              // Append all of the following tranches to the current tranche and return it
              resolve(itemResourcesDef.concat(allSubsequentTrancheDefs));
            },
            reject
          );
        } else {
          resolve(itemResourcesDef);
        }
      } else {
        resolve([]);
      }
    }, reject);
  });
}

/**
 * Retrieves the default basemap for the given & basemapGalleryGroupQuery, basemapTitle
 *
 * @param {string} basemapGalleryGroupQuery The default basemap group query
 * @param {string} basemapTitle The default basemap title
 * @param {ArcGISIdentityManager} authentication The session info
 * @returns {IItem}
 */
export function getPortalDefaultBasemap(
  basemapGalleryGroupQuery: string,
  basemapTitle: string,
  authentication: ArcGISIdentityManager
) {
  return searchGroups(basemapGalleryGroupQuery, authentication, { num: 1 })
    .then(({ results: [basemapGroup] }) => {
      if (!basemapGroup) {
        throw new Error("No basemap group found");
      }
      return searchGroupContents(
        basemapGroup.id,
        `title:${basemapTitle}`,
        authentication,
        { num: 1 }
      );
    })
    .then(({ results: [defaultBasemap] }) => {
      if (!defaultBasemap) {
        throw new Error("No basemap found");
      }
      return defaultBasemap;
    });
}
