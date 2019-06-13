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

import * as auth from "@esri/arcgis-rest-auth";
import * as generalHelpers from "./generalHelpers";
import * as portal from "@esri/arcgis-rest-portal";
import * as serviceAdmin from "@esri/arcgis-rest-service-admin";
import {
  IDependency,
  IItemTemplate,
  IUpdate,
  IPostProcessArgs
} from "./interfaces";
import { IParams, request } from "@esri/arcgis-rest-request";

// ------------------------------------------------------------------------------------------------------------------ //

/**
 * Publishes a feature service as an AGOL item; it does not include its layers and tables
 *
 * @param itemInfo Item's `item` section
 * @param requestOptions Options for the request
 * @param folderId Id of folder to receive item; null indicates that the item goes into the root
 *                 folder
 * @param access Access to set for item: "public", "org", "private"
 * @return A promise that will resolve with an object reporting success and the Solution id
 */
export function createFeatureService(
  itemInfo: any,
  dataInfo: any,
  serviceInfo: any,
  requestOptions: auth.IUserRequestOptions,
  folderId: string | undefined,
  isPortal: boolean
): Promise<serviceAdmin.ICreateServiceResult> {
  return new Promise((resolve, reject) => {
    // Create item
    const createOptions: serviceAdmin.ICreateServiceOptions = _getCreateServiceOptions(
      itemInfo,
      dataInfo,
      serviceInfo,
      folderId,
      isPortal,
      requestOptions
    );

    serviceAdmin.createFeatureService(createOptions).then(
      createResponse => {
        resolve(createResponse);
      },
      e => reject(generalHelpers.fail(e))
    );
  });
}

export function _getCreateServiceOptions(
  itemInfo: any,
  dataInfo: any,
  serviceInfo: any,
  folderId: any,
  isPortal: boolean,
  requestOptions: auth.IUserRequestOptions
): any {
  const params: IParams = {
    preserveLayerIds: true
  };

  const name: string = itemInfo.name || itemInfo.title;

  const _item: serviceAdmin.ICreateServiceParams = {
    ...itemInfo,
    data: dataInfo,
    name: name + "_" + generalHelpers.getUTCTimestamp()
  };

  const createOptions = {
    item: _item,
    folderId,
    params,
    preserveLayerIds: true,
    ...requestOptions
  };

  createOptions.item = _setItemProperties(
    createOptions.item,
    dataInfo,
    serviceInfo,
    params,
    isPortal
  );

  return createOptions;
}

/**
 * Creates a folder using numeric suffix to ensure uniqueness.
 * @param folderTitleRoot Folder title, used as-is if possible and with suffix otherwise
 * @param userSession Credentials for creating folder
 * @param suffix Current suffix level; '0' means no suffix
 * @return Id of created folder
 */
export function createUniqueFolder(
  folderTitleRoot: string,
  userSession: auth.UserSession,
  suffix = 0
): Promise<portal.IAddFolderResponse> {
  return new Promise<portal.IAddFolderResponse>((resolve, reject) => {
    const folderName =
      folderTitleRoot + (suffix > 0 ? " " + suffix.toString() : "");
    const folderCreationParam = {
      title: folderName,
      authentication: userSession
    };
    portal.createFolder(folderCreationParam).then(
      ok => resolve(ok),
      err => {
        // If the name already exists, we'll try again
        const errorDetails = generalHelpers.getProp(
          err,
          "response.error.details"
        ) as string[];
        if (Array.isArray(errorDetails) && errorDetails.length > 0) {
          const nameNotAvailMsg =
            "Folder title '" + folderName + "' not available.";
          if (errorDetails.indexOf(nameNotAvailMsg) >= 0) {
            createUniqueFolder(folderTitleRoot, userSession, suffix + 1).then(
              resolve,
              reject
            );
          } else {
            reject(err);
          }
        } else {
          // Otherwise, error out
          reject(err);
        }
      }
    );
  });
}

export function _setItemProperties(
  item: any,
  data: any,
  serviceInfo: any,
  params: IParams,
  isPortal: boolean
): any {
  if (data) {
    // Get the items data
    item.text = data;
    // delete itemTemplate.data;
  }

  // Set the capabilities
  const portalCapabilities = [
    "Create",
    "Query",
    "Editing",
    "Update",
    "Delete",
    "Uploads",
    "Sync",
    "Extract"
  ];

  const capabilities =
    generalHelpers.getProp(serviceInfo, "service.capabilities") ||
    (isPortal ? "" : []);

  item.capabilities = isPortal
    ? capabilities
        .split(",")
        .filter((c: any) => portalCapabilities.indexOf(c) > -1)
        .join(",")
    : capabilities;
  if (serviceInfo.service.capabilities) {
    serviceInfo.service.capabilities = item.capabilities;
  }

  // set create options item properties
  const keyProperties: string[] = [
    "name",
    "isView",
    "sourceSchemaChangesAllowed",
    "isUpdatableView",
    "capabilities",
    "isMultiServicesView"
  ];
  const deleteKeys: string[] = ["layers", "tables", "fullExtent", "hasViews"];
  const itemKeys: string[] = Object.keys(item);
  const serviceKeys: string[] = Object.keys(serviceInfo.service);
  serviceKeys.forEach(k => {
    if (itemKeys.indexOf(k) === -1) {
      params[k] = serviceInfo.service[k];
      if (serviceInfo.service.isView && keyProperties.indexOf(k) > -1) {
        item[k] = serviceInfo.service[k];
      } else {
        item[k] = serviceInfo.service[k];
      }

      if (deleteKeys.indexOf(k) > -1) {
        delete item[k];
        delete params[k];
      }
    }
  });

  return item;
}

export function addToServiceDefinition(
  url: string,
  options: any
): Promise<void> {
  return new Promise((resolve, reject) => {
    serviceAdmin.addToServiceDefinition(url, options).then(
      () => {
        resolve();
      },
      e => reject(generalHelpers.fail(e))
    );
  });
}

/**
 * Publishes an item and its data as an AGOL item.
 *
 * @param itemInfo Item's `item` section
 * @param dataInfo Item's `data` section
 * @param requestOptions Options for the request
 * @param folderId Id of folder to receive item; null indicates that the item goes into the root
 *                 folder; ignored for Group item type
 * @param access Access to set for item: "public", "org", "private"
 * @return A promise that will resolve with an object reporting success and the Solution id
 */
export function createItemWithData(
  itemInfo: any,
  dataInfo: any,
  requestOptions: auth.IUserRequestOptions,
  folderId: string | undefined,
  access = "private"
): Promise<portal.ICreateItemResponse> {
  return new Promise((resolve, reject) => {
    // Create item
    const createOptions: portal.ICreateItemOptions = {
      item: {
        ...itemInfo,
        data: dataInfo
      },
      folderId,
      ...requestOptions
    };

    portal.createItemInFolder(createOptions).then(
      createResponse => {
        if (access !== "private") {
          // Set access if it is not AGOL default
          // Set the access manually since the access value in createItem appears to be ignored
          const accessOptions: portal.ISetAccessOptions = {
            id: createResponse.id,
            access: access === "public" ? "public" : "org", // need to use constants rather than string
            ...requestOptions
          };
          portal.setItemAccess(accessOptions).then(
            () => {
              resolve({
                folder: createResponse.folder,
                id: createResponse.id,
                success: true
              });
            },
            e => reject(generalHelpers.fail(e))
          );
        } else {
          resolve({
            folder: createResponse.folder,
            id: createResponse.id,
            success: true
          });
        }
      },
      e => reject(generalHelpers.fail(e))
    );
  });
}

/**
 * Gets the ids of the dependencies (contents) of an AGOL group.
 *
 * @param fullItem A group whose contents are sought
 * @param requestOptions Options for requesting information from AGOL
 * @return A promise that will resolve with list of dependent ids or an empty list
 * @protected
 */
export function getGroupContents(
  groupId: string,
  requestOptions: auth.IUserRequestOptions
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const pagingRequest: portal.IGetGroupContentOptions = {
      paging: {
        start: 1,
        num: 100
      },
      ...requestOptions
    };

    // Fetch group items
    getGroupContentsTranche(groupId, pagingRequest).then(
      contents => {
        resolve(contents);
      },
      e => reject(generalHelpers.fail(e))
    );
  });
}

/**
 * Gets the ids of a group's contents.
 *
 * @param groupId Group id
 * @param pagingRequest Options for requesting group contents; note: its paging.start parameter may
 *                      be modified by this routine
 * @return A promise that will resolve with a list of the ids of the group's contents or an empty
 *         list
 * @protected
 */
export function getGroupContentsTranche(
  groupId: string,
  pagingRequest: portal.IGetGroupContentOptions
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    // Fetch group items
    portal.getGroupContent(groupId, pagingRequest).then(
      contents => {
        if (contents.num > 0) {
          // Extract the list of content ids from the JSON returned
          const trancheIds: string[] = contents.items.map(
            (item: any) => item.id
          );

          // Are there more contents to fetch?
          if (contents.nextStart > 0) {
            pagingRequest.paging.start = contents.nextStart;
            getGroupContentsTranche(groupId, pagingRequest).then(
              (allSubsequentTrancheIds: string[]) => {
                // Append all of the following tranches to this tranche and return it
                resolve(trancheIds.concat(allSubsequentTrancheIds));
              },
              e => reject(generalHelpers.fail(e))
            );
          } else {
            resolve(trancheIds);
          }
        } else {
          resolve([]);
        }
      },
      e => reject(generalHelpers.fail(e))
    );
  });
}

/**
 * Updates the URL of an item.
 *
 * @param id AGOL id of item to update
 * @param url URL to assign to item's base section
 * @param requestOptions Options for the request
 * @return A promise that will resolve when the item has been updated
 */
export function updateItemURL(
  id: string,
  url: string,
  requestOptions: auth.IUserRequestOptions
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Update its URL
    const options = {
      item: {
        id,
        url
      },
      ...requestOptions
    };

    portal.updateItem(options).then(
      () => {
        resolve(id);
      },
      e => reject(generalHelpers.fail(e))
    );
  });
}

export function updateItem(
  serviceItemId: string,
  itemInfo: any,
  requestOptions: auth.IUserRequestOptions,
  access?: string | undefined,
  progressTickCallback?: () => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const updateOptions: any = {
      item: itemInfo,
      ...requestOptions
    };

    portal.updateItem(updateOptions).then(
      () => {
        if (access && access !== "private") {
          // Set access if it is not AGOL default
          // Set the access manually since the access value in createItem appears to be ignored
          const accessOptions: portal.ISetAccessOptions = {
            id: serviceItemId,
            access: access === "public" ? "public" : "org", // need to use constants rather than string
            ...requestOptions
          };
          portal.setItemAccess(accessOptions).then(
            () => {
              progressTickCallback && progressTickCallback();
              resolve();
            },
            e => reject(generalHelpers.fail(e))
          );
        } else {
          progressTickCallback && progressTickCallback();
          resolve();
        }
      },
      e => reject(generalHelpers.fail(e))
    );
  });
}

/**
 * Fills in missing data, including full layer and table definitions, in a feature services' definition.
 *
 * @param itemTemplate Feature service item, data, dependencies definition to be modified
 * @param requestOptions Options for requesting information from AGOL
 * @return A promise that will resolve when fullItem has been updated
 * @protected
 */
export function getServiceLayersAndTables(
  itemTemplate: IItemTemplate,
  requestOptions: auth.IUserRequestOptions
): Promise<IItemTemplate> {
  return new Promise<IItemTemplate>((resolve, reject) => {
    const properties: any = {
      service: {},
      layers: [],
      tables: []
    };

    // To have enough information for reconstructing the service, we'll supplement
    // the item and data sections with sections for the service, full layers, and
    // full tables

    // Get the service description
    const serviceUrl = itemTemplate.item.url;
    request(serviceUrl + "?f=json", requestOptions).then(
      serviceData => {
        properties.service = serviceData;
        Promise.all([
          getLayers(serviceUrl, serviceData["layers"], requestOptions),
          getLayers(serviceUrl, serviceData["tables"], requestOptions)
        ]).then(
          results => {
            properties.layers = results[0];
            properties.tables = results[1];
            itemTemplate.properties = properties;

            itemTemplate.estimatedDeploymentCostFactor +=
              properties.layers.length + // layers
              _countRelationships(properties.layers) + // layer relationships
              properties.tables.length + // tables & estimated single relationship for each
              _countRelationships(properties.tables); // table relationships

            resolve(itemTemplate);
          },
          e => reject(generalHelpers.fail(e))
        );
      },
      (e: any) => reject(generalHelpers.fail(e))
    );
  });
}

export function _countRelationships(layers: any[]): number {
  const reducer = (accumulator: number, currentLayer: any) =>
    accumulator +
    (currentLayer.relationships ? currentLayer.relationships.length : 0);

  return layers.reduce(reducer, 0);
}

/**
 * Gets the full definitions of the layers affiliated with a hosted service.
 *
 * @param serviceUrl URL to hosted service
 * @param layerList List of layers at that service...must contain id
 * @param requestOptions Options for the request
 * @return A promise that will resolve with a list of the layers from the admin api
 */
export function getLayers(
  serviceUrl: string,
  layerList: any[],
  requestOptions: auth.IUserRequestOptions
): Promise<any[]> {
  return new Promise<any[]>((resolve, reject) => {
    if (!Array.isArray(layerList) || layerList.length === 0) {
      resolve([]);
    }

    // get the admin URL
    serviceUrl = serviceUrl.replace("/rest/services", "/rest/admin/services");

    const requestsDfd: Array<Promise<any>> = [];
    layerList.forEach(layer => {
      requestsDfd.push(
        request(serviceUrl + "/" + layer["id"] + "?f=json", requestOptions)
      );
    });

    // Wait until all layers are heard from
    Promise.all(requestsDfd).then(
      layers => resolve(layers),
      e => reject(generalHelpers.fail(e))
    );
  });
}

/**
 * Gets the ids of the dependencies of an AGOL feature service item.
 * Dependencies will only exist when the service is a view.
 *
 * @param itemTemplate Template of item to be created
 * @param requestOptions Options for the request
 * @return A promise that will resolve a list of dependencies
 */
export function extractDependencies(
  itemTemplate: IItemTemplate,
  requestOptions?: auth.IUserRequestOptions
): Promise<IDependency[]> {
  const dependencies: any[] = [];
  return new Promise((resolve, reject) => {
    // Get service dependencies when the item is a view
    if (itemTemplate.properties.service.isView) {
      const url: string = itemTemplate.item.url;
      request(url + "/sources?f=json", requestOptions).then(
        response => {
          if (response && response.services) {
            response.services.forEach((layer: any) => {
              dependencies.push({
                id: layer.serviceItemId,
                name: layer.name
              });
            });
            resolve(dependencies);
          }
        },
        e => reject(generalHelpers.fail(e))
      );
    } else {
      resolve(dependencies);
    }
  });
}

/**
 * Add additional options to a layers definition
 *
 * @param args The IPostProcessArgs for the request(s)
 * @return A promise that will resolve when fullItem has been updated
 * @protected
 */
export function getLayerUpdates(args: IPostProcessArgs): any[] {
  const adminUrl: string = args.itemTemplate.item.url.replace(
    "rest/services",
    "rest/admin/services"
  );

  const updates: IUpdate[] = [];
  const refresh: any = _getUpdate(adminUrl, null, null, args, "refresh");
  updates.push(refresh);
  Object.keys(args.objects).forEach(id => {
    const obj: any = Object.assign({}, args.objects[id]);
    // These properties cannot be set in the update definition when working with portal
    generalHelpers.deleteProps(obj, ["type", "id", "relationships"]);
    // handle definition deletes
    // removes previous editFieldsInfo fields if their names were changed
    if (obj.hasOwnProperty("deleteFields")) {
      updates.push(_getUpdate(adminUrl, id, obj, args, "delete"));
      generalHelpers.deleteProp(obj, "deleteFields");
      updates.push(_getUpdate(adminUrl, null, null, args, "refresh"));
    }
    // handle definition updates
    updates.push(_getUpdate(adminUrl, id, obj, args, "update"));
    updates.push(refresh);
  });
  if (!args.itemTemplate.properties.service.isView) {
    const relUpdates: any = _getRelationshipUpdates({
      message: "updated layer relationships",
      objects: args.objects,
      itemTemplate: args.itemTemplate,
      requestOptions: args.requestOptions,
      progressTickCallback: args.progressTickCallback
    });
    if (relUpdates.layers.length > 0) {
      updates.push(_getUpdate(adminUrl, null, relUpdates, args, "add"));
      updates.push(refresh);
    }
  }
  return updates;
}

/**
 * Get refresh, add, update, or delete definition info
 *
 * @param url the base admin url for the service
 * @param id the id of the layer
 * @param obj parameters for the request
 * @param args various arguments to help support the request
 * @param type type of update the request will handle
 * @return IUpdate that has the request url and arguments
 * @protected
 */
export function _getUpdate(
  url: string,
  id: any,
  obj: any,
  args: any,
  type: "delete" | "update" | "add" | "refresh"
): IUpdate {
  const ops: any = {
    delete: {
      url: url + "/" + id + "/deleteFromDefinition",
      params: {
        deleteFromDefinition: {
          fields:
            obj && obj.hasOwnProperty("deleteFields") ? obj.deleteFields : []
        }
      }
    },
    update: {
      url: url + "/" + id + "/updateDefinition",
      params: {
        updateDefinition: obj
      }
    },
    add: {
      url: url + "/addToDefinition",
      params: {
        addToDefinition: obj
      }
    },
    refresh: {
      url: url + "/refresh",
      params: {
        f: "json"
      }
    }
  };

  return {
    url: ops[type].url,
    params: ops[type].params,
    args: args
  };
}

/**
 * Add additional options to a layers definition
 *
 * @param update will contain either add, update, or delete from service definition call
 * @return A promise that will resolve when service definition call has completed
 * @protected
 */
export function getRequest(update: IUpdate): Promise<void> {
  return new Promise((resolveFn, rejectFn) => {
    const options: any = {
      params: update.params,
      ...update.args.requestOptions
    };
    request(update.url, options).then(
      () => {
        update.args.progressTickCallback &&
          update.args.progressTickCallback({
            processId: update.args.itemTemplate.key,
            status: update.args.message
          });
        resolveFn();
      },
      (e: any) => rejectFn(e)
    );
  });
}

/**
 * Add relationships to all layers in one call to retain fully functioning composite relationships
 *
 * @param args The IPostProcessArgs for the request(s)
 * @return Any relationships that should be updated for the service
 * @protected
 */
export function _getRelationshipUpdates(args: IPostProcessArgs): any {
  const rels: any = {
    layers: []
  };
  Object.keys(args.objects).forEach((k: any) => {
    const obj: any = args.objects[k];
    if (obj.relationships && obj.relationships.length > 0) {
      rels.layers.push({
        id: obj.id,
        relationships: obj.relationships
      });
    }
    generalHelpers.deleteProp(obj, "relationships");
  });
  return rels;
}
