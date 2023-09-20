/** @license
 * Copyright 2019 Esri
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
 * Manages the creation and deployment of groups.
 *
 * @module group
 */

import * as common from "@esri/solution-common";

// ------------------------------------------------------------------------------------------------------------------ //

/**
 * Converts a group item into a template.
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
    const itemTemplate: common.IItemTemplate = common.createInitializedGroupTemplate(
      itemInfo
    );

    // Templatize item info property values
    itemTemplate.item.id = common.templatizeTerm(
      itemTemplate.item.id,
      itemTemplate.item.id,
      ".itemId"
    );

    // Get the group's items--its dependencies
    common.getGroupContents(itemInfo.id, srcAuthentication).then(
      groupContents => {
        itemTemplate.type = "Group";
        itemTemplate.dependencies = groupContents;
        common.getGroupBase(itemInfo.id, srcAuthentication).then(
          groupResponse => {
            groupResponse.id = itemTemplate.item.id;
            itemTemplate.item = {
              ...groupResponse,
              type: "Group"
            };

            // Does the group contain groups?
            if (groupResponse.tags) {
              const containedGroupPrefix = "group.";
              const containedGroupIds = groupResponse.tags
                .filter(tag => tag.startsWith(containedGroupPrefix))
                .map(tag => tag.substring(containedGroupPrefix.length));
              if (containedGroupIds.length > 0) {
                itemTemplate.dependencies = itemTemplate.dependencies.concat(containedGroupIds);
              }
            }

            resolve(itemTemplate);
          },
          () => resolve(itemTemplate)
        );
      },
      () => resolve(itemTemplate)
    );
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
    // Need to manually reset thumbnail because adlib in replaceInTemplate breaks it
    newItemTemplate.item.thumbnail = template.item.thumbnail;

    // Set up properties needed to create group
    const newGroup: common.IGroupAdd = {
      title: newItemTemplate.item.title || "",
      access: "private",
      owner: newItemTemplate.item.owner,
      tags: newItemTemplate.item.tags,
      typeKeywords: newItemTemplate.item.typeKeywords,
      description: newItemTemplate.item.description,
      thumbnail: newItemTemplate.item.thumbnail,
      snippet: newItemTemplate.item.snippet
    };

    const props: string[] = [
      "isInvitationOnly", "autoJoin", "membershipAccess", "isViewOnly", "sortField", "sortOrder", "isOpenData", "displaySettings"
    ];
    props.forEach(p => {
      /* istanbul ignore else */
      if (newItemTemplate.item.hasOwnProperty(p)) {
        newGroup[p] = newItemTemplate.item[p];
      }
    })

    // Create a group, appending a sequential suffix to its name if the group exists, e.g.,
    //  * Manage Right of Way Activities
    //  * Manage Right of Way Activities 1
    //  * Manage Right of Way Activities 2
    common
      .createUniqueGroup(
        newGroup.title,
        newGroup,
        templateDictionary,
        destinationAuthentication,
        common.isTrackingViewGroup(newItemTemplate) ? templateDictionary.locationTracking.owner : undefined
      )
      .then(
        (createResponse: common.IAddGroupResponse) => {
          if (createResponse.success) {
            // Interrupt process if progress callback returns `false`
            if (
              !itemProgressCallback(
                template.itemId,
                common.EItemProgressStatus.Created,
                template.estimatedDeploymentCostFactor / 2,
                createResponse.group.id
              )
            ) {
              itemProgressCallback(
                template.itemId,
                common.EItemProgressStatus.Cancelled,
                0
              );
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              common
                .removeGroup(createResponse.group.id, destinationAuthentication)
                .then(
                  () =>
                    resolve(
                      common.generateEmptyCreationResponse(template.type)
                    ),
                  () =>
                    resolve(common.generateEmptyCreationResponse(template.type))
                );
            } else {
              newItemTemplate.itemId = createResponse.group.id;
              templateDictionary[template.itemId] = {
                itemId: createResponse.group.id
              };

              // Update the template again now that we have the new item id
              newItemTemplate = common.replaceInTemplate(
                newItemTemplate,
                templateDictionary
              );

              // Update the template dictionary with the new id
              templateDictionary[template.itemId].itemId =
                createResponse.group.id;

              // Interrupt process if progress callback returns `false`
              if (
                !itemProgressCallback(
                  template.itemId,
                  common.EItemProgressStatus.Finished,
                  template.estimatedDeploymentCostFactor / 2,
                  createResponse.group.id
                )
              ) {
                itemProgressCallback(
                  template.itemId,
                  common.EItemProgressStatus.Cancelled,
                  0
                );
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                common
                  .removeGroup(
                    createResponse.group.id,
                    destinationAuthentication
                  )
                  .then(
                    () =>
                      resolve(
                        common.generateEmptyCreationResponse(template.type)
                      ),
                    () =>
                      resolve(
                        common.generateEmptyCreationResponse(template.type)
                      )
                  );
              } else {
                if (common.isTrackingViewGroup(newItemTemplate)) {
                  const owner: string = templateDictionary.locationTracking.owner;
                  // eslint-disable-next-line @typescript-eslint/no-floating-promises
                  common.reassignGroup(
                    createResponse.group.id,
                    owner,
                    destinationAuthentication
                  ).then(assignResults => {
                    if (assignResults.success) {
                      if (
                        !itemProgressCallback(
                          template.itemId,
                          common.EItemProgressStatus.Created,
                          template.estimatedDeploymentCostFactor / 2,
                          createResponse.group.id
                        )
                      ) {
                        itemProgressCallback(
                          template.itemId,
                          common.EItemProgressStatus.Cancelled,
                          0
                        );
                        // eslint-disable-next-line @typescript-eslint/no-floating-promises
                        common
                          .removeGroup(createResponse.group.id, destinationAuthentication)
                          .then(
                            () =>
                              resolve(
                                common.generateEmptyCreationResponse(template.type)
                              ),
                            () =>
                              resolve(common.generateEmptyCreationResponse(template.type))
                          );
                      } else {
                        // eslint-disable-next-line @typescript-eslint/no-floating-promises
                        common.removeUsers(
                          createResponse.group.id,
                          [destinationAuthentication.username],
                          destinationAuthentication
                        ).then(removeResults => {
                          if (Array.isArray(removeResults.notRemoved) && removeResults.notRemoved.length === 0) {
                            if (
                              !itemProgressCallback(
                                template.itemId,
                                common.EItemProgressStatus.Created,
                                template.estimatedDeploymentCostFactor / 2,
                                createResponse.group.id
                              )
                            ) {
                              itemProgressCallback(
                                template.itemId,
                                common.EItemProgressStatus.Cancelled,
                                0
                              );
                              // eslint-disable-next-line @typescript-eslint/no-floating-promises
                              common
                                .removeGroup(createResponse.group.id, destinationAuthentication)
                                .then(
                                  () =>
                                    resolve(
                                      common.generateEmptyCreationResponse(template.type)
                                    ),
                                  () =>
                                    resolve(common.generateEmptyCreationResponse(template.type))
                                );
                            } else {
                              resolve({
                                item: newItemTemplate,
                                id: createResponse.group.id,
                                type: newItemTemplate.type,
                                postProcess: common.hasUnresolvedVariables(
                                  newItemTemplate
                                )
                              });
                            }
                          } else {
                            itemProgressCallback(
                              template.itemId,
                              common.EItemProgressStatus.Failed,
                              0
                            );
                            resolve(common.generateEmptyCreationResponse(template.type)); // fails to create item
                          }
                        });
                      }
                    } else {
                      itemProgressCallback(
                        template.itemId,
                        common.EItemProgressStatus.Failed,
                        0
                      );
                      resolve(common.generateEmptyCreationResponse(template.type)); // fails to create item
                    }
                  })
                } else {
                  resolve({
                    item: newItemTemplate,
                    id: createResponse.group.id,
                    type: newItemTemplate.type,
                    postProcess: common.hasUnresolvedVariables(
                      newItemTemplate
                    )
                  });
                }
              }
            }
          } else {
            itemProgressCallback(
              template.itemId,
              common.EItemProgressStatus.Failed,
              0
            );
            resolve(common.generateEmptyCreationResponse(template.type)); // fails to create item
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

/**
 * Group post-processing actions
 *
 * @param {string} id The item ID
 * @param {string} type The template type
 * @param {any[]} itemInfos Array of \{id: 'ef3', type: 'Web Map'\} objects
 * @param {common.IItemTemplate} template The original template
 * @param {common.IItemTemplate[]} templates The original templates
 * @param {any} templateDictionary The template dictionary
 * @param {UserSession} authentication The destination session info
 * @returns Promise resolving to successfulness of update
 */
export function postProcess(
  id: string,
  type: string,
  itemInfos: any[],
  template: common.IItemTemplate,
  templates: common.IItemTemplate[],
  templateDictionary: any,
  authentication: any
): Promise<any> {
  let promise = Promise.resolve({success: true});
  itemInfos.some(t => {
    /* istanbul ignore else */
    if (t.id === id) {
      let group = t.item.item;
      /* istanbul ignore else */
      if (common.hasUnresolvedVariables(group)) {
        group = common.replaceInTemplate(group, templateDictionary);
        // update the group
        promise = common.updateGroup(group, authentication);
      }
      return true;
    }
  });
  return promise;
}
