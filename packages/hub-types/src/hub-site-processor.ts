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

/**
 * Manages the creation and deployment of Hub Site item types.
 *
 * @module hub-site-processor
 */

import {
  IItemTemplate,
  IItemProgressCallback,
  ICreateItemFromTemplateResponse,
  EItemProgressStatus,
  ArcGISIdentityManager,
  createHubRequestOptions,
  dedupe,
  generateEmptyCreationResponse,
  getProp
} from "@esri/solution-common";
import { IUpdateItemOptions, updateItem } from "@esri/arcgis-rest-portal";
import {
  createSiteModelFromTemplate,
  createSite,
  getSiteById,
  removeSite,
  convertSiteToTemplate
} from "@esri/hub-sites";

import {
  IModel,
  failSafe,
  IHubUserRequestOptions,
  without
} from "@esri/hub-common";

import { moveModelToFolder } from "./helpers/move-model-to-folder";
import { _postProcessSite } from "./helpers/_post-process-site";
import { replaceItemIds } from "./helpers/replace-item-ids";

/**
 * Converts a Site item into a template.
 *
 * @param solutionItemId The solution to contain the template
 * @param itemInfo Info about the item
 * @param destAuthentication Credentials for requests to the destination organization
 * @param srcAuthentication Credentials for requests to source items (placeholder--not used)
 * @returns A promise that will resolve when the template has been created
 */
export function convertItemToTemplate(
  solutionItemId: string,
  itemInfo: any,
  destAuthentication: ArcGISIdentityManager,
  srcAuthentication: ArcGISIdentityManager = null // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<IItemTemplate> {
  let created: number = 0;
  let modified: number = 0;

  let hubRo: IHubUserRequestOptions;
  // get hubRequestOptions
  return createHubRequestOptions(destAuthentication)
    .then(ro => {
      hubRo = ro;
      return getSiteById(itemInfo.id, hubRo);
    })
    .then(siteModel => {
      // We need to save these properties in order to restore them after hub.js deletes them
      created = siteModel.item.created;
      modified = siteModel.item.modified;
      return convertSiteToTemplate(siteModel, hubRo);
    })
    .then(tmpl => {
      // add in some stuff Hub.js does not yet add
      tmpl.item.created = created;
      tmpl.item.modified = modified;
      tmpl.item.typeKeywords = without(tmpl.item.typeKeywords, "doNotDelete");
      tmpl.groups = [];
      tmpl.estimatedDeploymentCostFactor = 2;
      tmpl.resources = [];
      if (!getProp(tmpl, "properties")) {
        tmpl.properties = {};
      }
      // swap out dependency id's to {{<depid>.itemId}}
      // so it will be re-interpolated
      tmpl.dependencies = dedupe(tmpl.dependencies);
      tmpl = replaceItemIds(tmpl);

      // and return it
      return tmpl as IItemTemplate;
    });
}

/**
 * Handle deployment of Site item templates
 *
 * @export
 * @param {IItemTemplate} template
 * @param {*} templateDictionary
 * @param {ArcGISIdentityManager} destinationAuthentication
 * @param {IItemProgressCallback} itemProgressCallback
 * @returns {Promise<ICreateItemFromTemplateResponse>}
 */
export function createItemFromTemplate(
  template: IItemTemplate,
  templateDictionary: any,
  destinationAuthentication: ArcGISIdentityManager,
  itemProgressCallback: IItemProgressCallback
): Promise<ICreateItemFromTemplateResponse> {
  // let the progress system know we've started...
  const startStatus = itemProgressCallback(
    template.itemId,
    EItemProgressStatus.Started,
    0
  );
  // if it returned false, just resolve out
  if (!startStatus) {
    return Promise.resolve(generateEmptyCreationResponse(template.type));
  }

  // TODO: Reassess with resource unification
  if (template.assets && template.resources) {
    delete template.assets;
  }

  // ensure we have a solution object in the templateDictionary hash
  if (!templateDictionary.solution) {
    templateDictionary.solution = {};
  }
  // .title should always be set on the templateDictionary
  templateDictionary.solution.title = templateDictionary.title;

  // TODO: Determine if we need any transforms in this new env
  const transforms = {};

  // create an object to hold the created site through
  // subsequent promise calls
  let siteModel: IModel;

  // Create the "siteModel" from the template. Does not save the site item yet
  // Note: depending on licensing and user privs, will also create the team groups
  // and initiative item.
  let hubRo: IHubUserRequestOptions;
  const thumbnail: File = template.item.thumbnail; // createSiteModelFromTemplate trashes thumbnail
  return createHubRequestOptions(destinationAuthentication, templateDictionary)
    .then(ro => {
      hubRo = ro;
      return createSiteModelFromTemplate(
        template,
        templateDictionary,
        transforms,
        hubRo
      );
    })
    .then(interpolated => {
      const options = {
        assets: interpolated.assets || []
      };
      // Now create the item, register for oAuth, register domain etc
      return createSite(interpolated, options, hubRo);
    })
    .then(site => {
      // hold onto the site
      siteModel = site;
      // Move the site and initiative to the solution folder
      // this is essentially fire and forget. We fail-safe the actual moveItem
      // call since it's not critical to the outcome
      return moveModelToFolder(
        site,
        templateDictionary.folderId,
        destinationAuthentication
      );
    })
    .then(() => {
      // Fix the thumbnail
      const updateOptions: IUpdateItemOptions = {
        item: {
          id: siteModel.item.id
        },
        params: {
          // Pass thumbnail in via params because item property is serialized, which discards a blob
          thumbnail
        },
        authentication: destinationAuthentication
      };
      return updateItem(updateOptions);
    })
    .then(() => {
      // Update the template dictionary
      // TODO: This should be done in whatever recieves
      // the outcome of this promise chain
      templateDictionary[template.itemId] = {
        itemId: siteModel.item.id
      };
      // call the progress callback, which also mutates templateDictionary
      const finalStatus = itemProgressCallback(
        template.itemId,
        EItemProgressStatus.Finished,
        template.estimatedDeploymentCostFactor || 2,
        siteModel.item.id
      );
      if (!finalStatus) {
        // clean up the site we just created
        const failSafeRemove = failSafe(removeSite, { success: true });
        return failSafeRemove(siteModel, hubRo).then(() => {
          return Promise.resolve(generateEmptyCreationResponse(template.type));
        });
      } else {
        // finally, return ICreateItemFromTemplateResponse
        const response: ICreateItemFromTemplateResponse = {
          item: {
            ...template,
            ...siteModel
          },
          id: siteModel.item.id,
          type: template.type,
          postProcess: true
        };
        response.item.itemId = siteModel.item.id;
        return response;
      }
    })
    .catch(ex => {
      itemProgressCallback(template.itemId, EItemProgressStatus.Failed, 0);
      throw ex;
    });
}

/**
 * Deployer life-cycle hook allowing the Site Processor
 * a chance to apply final processes to all the items that
 * were created as part of the solution.
 * Specifically this will:
 * - share all items to the content team, and (if created)
 *   the core team (depends on user privs)
 * - link all Page items that were created, to the Site
 *
 * @param model
 * @param items
 * @param authentication
 * @param templateDictionary
 */
export function postProcess(
  id: string,
  type: string,
  itemInfos: any[],
  template: any,
  templates: IItemTemplate[],
  templateDictionary: any,
  authentication: ArcGISIdentityManager
): Promise<boolean> {
  let hubRo: IHubUserRequestOptions;
  return createHubRequestOptions(authentication, templateDictionary)
    .then(ro => {
      hubRo = ro;
      // get the site model
      return getSiteById(id, hubRo);
    })
    .then(siteModel => {
      // Hub.js does not expect the same structures, so we delegat to a local fn
      return _postProcessSite(siteModel, itemInfos, templateDictionary, hubRo);
    })
    .then(() => {
      // resolve w/ a boolean
      return Promise.resolve(true);
    });
}

/**
 * Check of an item type is a Site
 * Hub Site Application is for ArcGIS Online
 * Site Application is for ArcGIS Enterprise
 *
 * @param itemType
 */
export function isASite(itemType: string): boolean {
  let result = false;
  if (itemType === "Hub Site Application" || itemType === "Site Application") {
    result = true;
  }
  return result;
}
