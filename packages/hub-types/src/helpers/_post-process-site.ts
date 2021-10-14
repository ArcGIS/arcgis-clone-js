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
import { IModel, IHubUserRequestOptions, IGetSurveyModelsResponse } from "@esri/hub-common";

import { _shareItemsToSiteGroups, updateSite, interpolateSite } from "@esri/hub-sites";

import { getSurveyModels } from '@esri/hub-surveys';

import { _updateSitePages } from "./_update-site-pages";

function getFormAndFormDependencyIds (itemInfos: any[], hubRequestOptions: IHubUserRequestOptions) {
  // fetch all form & form dependencies by relationship
  const formCompositePromises: Array<Promise<IGetSurveyModelsResponse>> = itemInfos.reduce(
    (acc, info) => info.type === 'Form' ? [...acc, getSurveyModels(info.id, hubRequestOptions)] : acc,
    []
  );

  return Promise.all(formCompositePromises)
    // reduce to a flattened collection of form and form dependency ids
    .then(formComposites =>
      formComposites.reduce(
        (acc, formComposite) => [
          ...acc,
          ...Object.values(formComposite).reduce(
            (memo, model: IModel) => model ? [...memo, model.item.id] : memo,
            []
          )
        ],
        []
      ))
}

/**
 * Post Process a Site
 * - share all items to the Hub teams created as part of the site
 * - link any created page to the site item
 * - re-interpolate any remaining item ids that were not direct deps of the site
 *
 * @param siteModel
 * @param itemInfos
 * @param templateDictionary
 * @param hubRequestOptions
 */
export function _postProcessSite(
  siteModel: IModel,
  itemInfos: any[],
  templateDictionary: any,
  hubRequestOptions: IHubUserRequestOptions
): Promise<boolean> {
  const infosWithoutSite = itemInfos.filter(
    info => info.id !== siteModel.item.id
  );

  return getFormAndFormDependencyIds(infosWithoutSite, hubRequestOptions)
    .then((formAndDependencyIds) => {
      // convert the itemInfo's into things that look enough like a model
      // that we can call _shareItemsToSiteGroups, excluding forms and any
      // of their feature services
      const pseudoModels = infosWithoutSite.reduce(
        (acc, itemInfo) => formAndDependencyIds.includes(itemInfo.id)
          ? acc
          : [
              ...acc,
              {
                item: {
                  id: itemInfo.id,
                  type: itemInfo.type
                }
              }
            ],
        []
      );

      let secondPassPromises: Array<Promise<any>> = [];

      secondPassPromises = secondPassPromises.concat(
        _shareItemsToSiteGroups(
          siteModel,
          (pseudoModels as unknown) as IModel[],
          hubRequestOptions
        )
      );

      // we can't use that same trick w/ the page sharing
      // because we really need the models themselves
      // so we delegate to a local function
      secondPassPromises = secondPassPromises.concat(
        _updateSitePages(siteModel, infosWithoutSite, hubRequestOptions)
      );
      // need to get all the child items and add into site.item.properties.children
      const childItemIds = infosWithoutSite.map(i => i.id);

      siteModel.item.properties.children = childItemIds;

      // re-interpolate the siteModel using the itemInfos
      siteModel = interpolateSite(siteModel, templateDictionary, {});
      // and update the model
      secondPassPromises.push(
        updateSite(siteModel, {
          ...hubRequestOptions,
          allowList: null
        })
      );

      return Promise.all(secondPassPromises).then(() => {
        return true;
      });
    });
}
