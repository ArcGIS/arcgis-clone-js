/** @license
 * Copyright 2024 Esri
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
 * Manages the creation and deployment of web-experience item types.
 *
 * @module solution-web-tool
 */

import * as common from "@esri/solution-common";
import { simpleTypes } from "@esri/solution-simple-types";

/**
 * Creates a template from a Web Tool Geoprocessing item
 *
 * @param {any} itemInfo: The base item info
 * @param {UserSession} destAuthentication Credentials for requests to the destination organization
 * @param {UserSession} srcAuthentication Credentials for requests to source items
 * @param {any} templateDictionary Hash of facts: folder id, org URL, adlib replacements
 * @returns {Promise<IItemTemplate>}
 */
export function convertItemToTemplate(
  itemInfo: any,
  destAuthentication: common.UserSession,
  srcAuthentication: common.UserSession,
  templateDictionary: any,
): Promise<common.IItemTemplate> {
  // Delegate to simple types
  return simpleTypes.convertItemToTemplate(itemInfo, destAuthentication, srcAuthentication, templateDictionary);
}

/**
 * Creates a Web Tool Geoprocessing item from a template
 *
 * @param {IItemTemplate} template The template
 * @param {any} templateDictionary The template dictionary
 * @param {UserSession} destinationAuthentication The destination user session info
 * @param itemProgressCallback An item progress callback
 * @returns {Promise<ICreateItemFromTemplateResponse>}
 */
export function createItemFromTemplate(
  template: common.IItemTemplate,
  templateDictionary: any,
  destinationAuthentication: common.UserSession,
  itemProgressCallback: common.IItemProgressCallback,
): Promise<common.ICreateItemFromTemplateResponse> {
  return new Promise<common.ICreateItemFromTemplateResponse>((resolve) => {
    // Interrupt process if progress callback returns `false`
    if (!itemProgressCallback(template.itemId, common.EItemProgressStatus.Started, 0)) {
      itemProgressCallback(template.itemId, common.EItemProgressStatus.Ignored, 0);
      resolve(common.generateEmptyCreationResponse(template.type));
    } else {
      // Replace the templatized symbols in a copy of the template
      let newItemTemplate: common.IItemTemplate = common.cloneObject(template);
      newItemTemplate = common.replaceInTemplate(newItemTemplate, templateDictionary);

      if (template.item.thumbnail) {
        newItemTemplate.item.thumbnail = template.item.thumbnail;
      }

      createWebTool(newItemTemplate, templateDictionary, destinationAuthentication).then(
        (createResponse) => {
          // Interrupt process if progress callback returns `false`
          if (
            !itemProgressCallback(
              template.itemId,
              common.EItemProgressStatus.Created,
              template.estimatedDeploymentCostFactor / 2,
              createResponse.itemId,
            )
          ) {
            itemProgressCallback(template.itemId, common.EItemProgressStatus.Cancelled, 0);
            common.removeItem(createResponse.itemId, destinationAuthentication).then(
              () => resolve(common.generateEmptyCreationResponse(template.type)),
              () => resolve(common.generateEmptyCreationResponse(template.type)),
            );
          } else {
            // Add the new item to the settings
            templateDictionary[template.itemId] = {
              itemId: createResponse.itemId,
              itemUrl:
                (templateDictionary["portalBaseUrl"] as string) +
                "/sharing/rest/content/items/" +
                createResponse.itemId,
            };
            newItemTemplate.itemId = createResponse.itemId;
            newItemTemplate.item.id = createResponse.itemId;
            newItemTemplate.data = {};
            delete newItemTemplate.item.thumbnail;

            // get the GPServer url from the webtoolService.json resource
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            common.getItemResourcesFiles(createResponse.itemId, destinationAuthentication).then((resourcesResponse) => {
              let webtoolServicePromise = Promise.resolve();
              resourcesResponse.some((v) => {
                if (v.name === "webtoolService.json") {
                  webtoolServicePromise = common.blobToJson(v);
                  return true;
                }
              });

              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              webtoolServicePromise.then((webtoolServiceResponse: any) => {
                templateDictionary[template.itemId].url = webtoolServiceResponse?.serviceUrl;

                // Update the template again now that we have the new item id
                newItemTemplate = common.replaceInTemplate(newItemTemplate, templateDictionary);

                // Update the item with snippet, description, popupInfo, etc.
                common
                  .updateItemExtended(
                    {
                      ...newItemTemplate.item,
                    },
                    newItemTemplate.data,
                    destinationAuthentication,
                    template.item.thumbnail,
                    undefined,
                    templateDictionary,
                  )
                  .then(
                    () => {
                      // Interrupt process if progress callback returns `false`
                      if (
                        !itemProgressCallback(
                          template.itemId,
                          common.EItemProgressStatus.Finished,
                          template.estimatedDeploymentCostFactor / 2,
                          createResponse.itemId,
                        )
                      ) {
                        itemProgressCallback(template.itemId, common.EItemProgressStatus.Cancelled, 0);
                        common.removeItem(createResponse.itemId, destinationAuthentication).then(
                          () => resolve(common.generateEmptyCreationResponse(template.type)),
                          () => resolve(common.generateEmptyCreationResponse(template.type)),
                        );
                      } else {
                        // Update the template to match what we've stored in AGO
                        common.getItemBase(newItemTemplate.itemId, destinationAuthentication).then(
                          (updatedItem) => {
                            newItemTemplate.item = updatedItem;

                            resolve({
                              item: newItemTemplate,
                              id: createResponse.itemId,
                              type: newItemTemplate.type,
                              postProcess: false,
                            });
                          },
                          () => {
                            itemProgressCallback(template.itemId, common.EItemProgressStatus.Failed, 0);
                            common.removeItem(createResponse.itemId, destinationAuthentication).then(
                              () => resolve(common.generateEmptyCreationResponse(template.type)),
                              () => resolve(common.generateEmptyCreationResponse(template.type)),
                            );
                          }, // fails to update item
                        );
                      }
                    },
                    () => {
                      itemProgressCallback(template.itemId, common.EItemProgressStatus.Failed, 0);
                      common.removeItem(createResponse.itemId, destinationAuthentication).then(
                        () => resolve(common.generateEmptyCreationResponse(template.type)),
                        () => resolve(common.generateEmptyCreationResponse(template.type)),
                      );
                    }, // fails to update item
                  );
              });
            });
          }
        },
        () => {
          itemProgressCallback(template.itemId, common.EItemProgressStatus.Failed, 0);
          resolve(common.generateEmptyCreationResponse(template.type)); // fails to create item
        },
      );
    }
  });
}

/**
 * Get the urls available on the portal self.
 *
 * @param {IItemTemplate} template The template
 * @param {any} templateDictionary The template dictionary
 * @param {UserSession} destinationAuthentication The destination user session info
 * @returns List of http and https helper urls
 */
export function createWebTool(
  template: common.IItemTemplate,
  templateDictionary: any,
  destinationAuthentication: common.UserSession,
): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    getNotebookServerCreateServiceURL(
      templateDictionary.portalBaseUrl,
      destinationAuthentication,
      templateDictionary,
    ).then(
      (url) => {
        if (url) {
          const params = {
            serviceProperties: {
              description: template.item.description,
              provider: "notebooks",
              type: "GPServer",
              jsonProperties: {
                timeoutInMinutes: template.data.timeoutInMinutes,
                title: template.item.title,
                notebookId: template.data.notebookId,
                tasks: [
                  {
                    type: "notebook",
                    name: template.data.name,
                  },
                ],
              },
            },
          };

          const requestOptions = {
            httpMethod: "POST",
            authentication: destinationAuthentication,
            params,
            headers: {
              "Accept": "application/json",
              "Authorization": `Bearer ${destinationAuthentication.token}`,
              "Content-Type": "application/json",
              "X-Esri-Authorization": `Bearer ${destinationAuthentication.token}`,
            },
          } as common.IRequestOptions;

          common.request(url, requestOptions).then(
            (response) => {
              resolve(response);
            },
            (e) => {
              reject(e);
            },
          );
        } else {
          reject();
        }
      },
      (e) => {
        reject(e);
      },
    );
  });
}

/**
 * Get the URL for the Notebook server in Enterprise.
 *
 * @param portalBaseUrl URL of the portal endpoint, e.g., "https://gisserver.domain.com/server"
 * @param authentication Credentials for the request to AGO
 * @returns URL for the Notebook server Enterprise application (e.g., "https://abc123.esri.com:6443/gis"),
 * or an empty string if Notebook server is not installed
 */
export async function getNotebookServerCreateServiceURL(
  portalBaseUrl: string,
  authentication: common.UserSession,
  templateDictionary: any,
): Promise<string> {
  const notebookUrl = templateDictionary.isPortal
    ? await getNotebookEnterpriseServerRootURL(portalBaseUrl, authentication)
    : templateDictionary.portalUrls?.notebooks.https.length > 0
      ? templateDictionary.portalUrls.notebooks.https[0]
      : "";

  return notebookUrl && templateDictionary.isPortal
    ? `${notebookUrl}/admin/services/createService?f=json&request.preventCache=${Date.now()}`
    : notebookUrl
      ? `https://${notebookUrl}/admin/services/createService?f=json&request.preventCache=${Date.now()}`
      : "";
}

/**
 * Get the URL for the Notebook server in Enterprise.
 *
 * @param portalBaseUrl URL of the portal endpoint, e.g., "https://gisserver.domain.com/server"
 * @param authentication Credentials for the request to AGO
 * @returns URL for the Notebook server Enterprise application (e.g., "https://abc123.esri.com:6443/gis"),
 * or an empty string if Notebook server is not installed
 */
export async function getNotebookEnterpriseServerRootURL(
  portalBaseUrl: string,
  authentication: common.UserSession,
): Promise<string> {
  // Get the servers
  const servers = await common.getEnterpriseServers(`${portalBaseUrl}/sharing/rest`, authentication);

  // Find the Notebook server
  const notebookServer = servers.find((s: any) => s.serverFunction.indexOf("NotebookServer") > -1);
  if (!notebookServer) {
    return "";
  }
  return notebookServer.url as string;
}
