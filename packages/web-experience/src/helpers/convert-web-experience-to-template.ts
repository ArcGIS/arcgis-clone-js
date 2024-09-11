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

import { IModel, normalizeSolutionTemplateItem, cloneObject, propifyString, createId } from "@esri/hub-common";

import { IItem, IItemTemplate, createPlaceholderTemplate } from "@esri/solution-common";
import { getWebExperienceDependencies } from "./get-web-experience-dependencies";

/**
 * Convert an Experience item into a template
 *
 * Pretty simpler conversion - remove extra item props, extract out
 * items from the data.dataSources hash.
 *
 * @param model
 * @param authentication
 */
export function convertWebExperienceToTemplate(model: IModel): Promise<IItemTemplate> {
  const tmpl = createPlaceholderTemplate(model.item.id, model.item.type);
  tmpl.key = `${propifyString(model.item.title)}_${createId("i")}`;

  const clone = cloneObject(model);
  tmpl.data = clone.data;

  // We need to save these properties in order to restore them after hub.js deletes them
  const created = clone.item.created;
  const modified = clone.item.modified;
  tmpl.item = normalizeSolutionTemplateItem(clone.item) as IItem;
  tmpl.item.created = created;
  tmpl.item.modified = modified;

  // templatize the url. This is updated during the createModelFromTemplate phase
  // of the deployment process
  tmpl.item.url = "{{experienceUrlTemplate}}";

  // use typeKeyword to mark item as published (we decided to discard unpublished drafts)
  const typeKeywords = tmpl.item.typeKeywords;
  if (typeKeywords.indexOf(changedTypeKW) !== -1) {
    tmpl.item.typeKeywords = [publishedTypeKW].concat(tmpl.item.typeKeywords.filter((word) => word !== changedTypeKW));
  }

  tmpl.dependencies = getWebExperienceDependencies(model);

  return Promise.resolve(tmpl);
  // TODO: For now, we let the generic process handle item resources
  // However, many newer item types have complex type-specific resource handling
  // requirements so this code may be useful in the future
  // ------------------------------------------------------
  // return getItemResources(tmpl.itemId, authentication)
  //   .then((response) => {
  //     tmpl.resources = response.resources.map(e => e.resource)
  //       // Discard draft version
  //       .filter(filename => filename !== 'config.json');
  //     return tmpl;
  //   });
}

const publishedTypeKW = "status: Published";
const changedTypeKW = "status: Changed";
