/*
 | Copyright 2018 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */

import * as common from "@esri/solution-common";

/**
 * The portion of a Webmap URL between the server and the map id.
 * @protected
 */
const WEBMAP_APP_URL_PART: string = "/home/webmap/viewer.html?webmap=";

// ------------------------------------------------------------------------------------------------------------------ //

export function convertItemToTemplate(
  itemTemplate: common.IItemTemplate
): common.IItemTemplate {
  // Templatize the app URL
  itemTemplate.item.url =
    common.PLACEHOLDER_SERVER_NAME + WEBMAP_APP_URL_PART + itemTemplate.item.id; // templatized id

  // Extract dependencies
  itemTemplate.dependencies = extractDependencies(itemTemplate);

  // Templatize the map layer ids after we've extracted them as dependencies
  if (itemTemplate.data) {
    templatizeWebmapLayerIdsAndUrls(itemTemplate.data.operationalLayers);
    templatizeWebmapLayerIdsAndUrls(itemTemplate.data.tables);
  }

  return itemTemplate;
}

// ------------------------------------------------------------------------------------------------------------------ //

/**
 * Gets the ids of the dependencies of an AGOL webmap item.
 *
 * @param fullItem A webmap item whose dependencies are sought
 * @return List of dependencies
 * @protected
 */
function extractDependencies(itemTemplate: common.IItemTemplate): string[] {
  let dependencies: string[] = [];

  if (itemTemplate.data) {
    dependencies = [
      ...getWebmapLayerIds(itemTemplate.data.operationalLayers),
      ...getWebmapLayerIds(itemTemplate.data.tables)
    ];
  }

  return dependencies;
}

/**
 * Extracts the AGOL id or URL for each layer or table object in a list.
 *
 * @param layerList List of map layers or tables
 * @return List containing id of each layer or table that has an itemId
 * @protected
 */
function getWebmapLayerIds(layerList = [] as any[]): string[] {
  return layerList.reduce(
    (ids: string[], layer: any) => {
      const itemId = layer.itemId as string;
      if (itemId) {
        ids.push(itemId);
      }
      return ids;
    },
    [] as string[]
  );
}

function templatizeWebmapLayerIdsAndUrls(layerList = [] as any[]): void {
  layerList
    .filter((layer: any) => !!layer.itemId)
    .forEach((layer: any) => {
      const layerId = layer.url.substr((layer.url as string).lastIndexOf("/"));
      layer.url =
        common.templatizeTerm(layer.itemId, layer.itemId, ".url") + layerId;
      layer.itemId = common.templatizeTerm(layer.itemId, layer.itemId, ".id");
    });
}
