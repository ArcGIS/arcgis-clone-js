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
 * @module deleteSolution
 */

import {
  DeployedSolutionFormatVersion,
  IItemGeneralized,
  IItemTemplate,
  ISolutionItemData,
  ISolutionPrecis,
  UserSession,
} from "./interfaces";
import * as reconstructBuildOrderIds from "./deleteHelpers/reconstructBuildOrderIds";
import * as portal from "@esri/arcgis-rest-portal";
import * as restHelpersGet from "./restHelpersGet";
import * as templatization from "./templatization";

// ------------------------------------------------------------------------------------------------------------------ //

/**
 * Creates a summary of a deployed Solution.
 *
 * @param solutionItemId Id of a deployed Solution
 * @param authentication Credentials for the request
 * @returns Promise resolving to a summary of the deployed Solution
 */
export async function getSolutionSummary(solutionItemId: string, authentication: UserSession): Promise<ISolutionPrecis> {
  const solutionSummary: ISolutionPrecis = {
    id: solutionItemId,
    title: "",
    folder: "",
    items: [],
    groups: [],
  };
  let templates: IItemTemplate[] = [];
  let deployedSolutionVersion = DeployedSolutionFormatVersion;

  const completeItem: any = await Promise.all([
    restHelpersGet.getItemBase(solutionItemId, authentication),
    restHelpersGet.getItemDataAsJson(solutionItemId, authentication),
  ]);

  const itemBase: IItemGeneralized = completeItem[0];
  const itemData: ISolutionItemData = completeItem[1];

  // Make sure that the item is a deployed Solution
  if (
    itemBase.type !== "Solution" ||
    !(itemBase.typeKeywords.includes("Solution") && itemBase.typeKeywords.includes("Deployed"))
  ) {
    throw new Error("Item " + solutionItemId + " is not a deployed Solution");
  }

  solutionSummary.title = itemBase.title;
  solutionSummary.folder = itemBase.ownerFolder || "";
  deployedSolutionVersion = templatization.extractSolutionVersion(itemData);
  templates = itemData.templates;

  // Get the forward Solution2Item relationships
  const relatedItems: portal.IItem[] = await restHelpersGet.getItemsRelatedToASolution(solutionItemId, authentication);

  solutionSummary.items = relatedItems.map((relatedItem) => {
    return {
      id: relatedItem.id,
      type: relatedItem.type,
      title: relatedItem.title,
      modified: relatedItem.modified,
      owner: relatedItem.owner,
    };
  });

  // Get the build order
  let buildOrderIds = [] as string[];
  if (deployedSolutionVersion < 1) {
    // Version 0
    buildOrderIds = reconstructBuildOrderIds.reconstructBuildOrderIds(templates);
  } else {
    // Version ≥ 1
    buildOrderIds = templates.map((template: any) => template.itemId);
  }

  // Get the dependent groups in the items to be deleted; use a Set to de-duplicate
  let dependentGroups = new Set<string>();
  itemData.templates.forEach((item) => {
    if (item.type === "Group") {
      dependentGroups.add(item.itemId);
    } else if (item.groups) {
      item.groups.forEach((groupId) => {
        dependentGroups = dependentGroups.add(groupId);
      });
    }
  });
  solutionSummary.groups = [];
  dependentGroups.forEach((value: string) => solutionSummary.groups.push(value));

  // Sort the related items into build order
  solutionSummary.items.sort((first, second) => buildOrderIds.indexOf(first.id) - buildOrderIds.indexOf(second.id));

  return solutionSummary;
}
