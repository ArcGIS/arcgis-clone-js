/** @license
 * Copyright 2021 Esri
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

import { IItemTemplate, getProp, setProp } from "@esri/solution-common";

/**
 * Updates the template by adding variables for key properties that will
 * need to be swapped when deploying
 *
 * @param template velocity item info that should be templatized
 *
 * @returns void
 *
 */
export function templatizeVelocity(template: IItemTemplate): void {
  _templatize(template, "data.sources", _templatizeDatasources);
  _templatize(template, "data.feeds", _templatizeFeeds);
  _templatize(template, "data.feed", _templatizeFeed);
}

/**
 * Generic wrapper for the templatize functions that
 * will get and set the key properties
 *
 * @param template velocity item info that should be templatized
 * @param prop the prop path to evaluate and set with a templatized variable
 * @param fn the templatize function that should be called for this prop
 *
 * @returns void
 *
 * @private
 */
export function _templatize(template: IItemTemplate, prop: string, fn: (arg: any) => void): void {
  const obj: any = getProp(template, prop);
  /* istanbul ignore else */
  if (obj) {
    setProp(template, prop, fn(obj));
  }
}

/**
 * Updates the template by adding variables for the itemId and the label
 * The label controls the name and must be unique for the org.
 *
 * @param feeds array of velocity feeds that should be templatized
 *
 * @returns The updated list of feed objects with templatized id and label
 *
 * @private
 */
export function _templatizeFeeds(feeds: any[]): any {
  return feeds.map((feed: any) => {
    feed.label = feed.label && feed.id ? `{{${feed.id}.label}}` : feed.label;
    feed.id = feed.id ? `{{${feed.id}.itemId}}` : feed.id;
    return feed;
  });
}

/**
 * Updates the portal item id and feature layer id variables for the feed properties.
 *
 * @param feed the feed object from the item
 *
 * @returns the updated feed object with templatized portalItemId and layer id
 *
 * @private
 */
export function _templatizeFeed(feed: any): any {
  let id = getProp(feed, "properties.feature-layer.portalItemId");
  /* istanbul ignore else */
  if (feed.properties) {
    /* istanbul ignore else */
    if (feed.properties["feature-layer.portalItemId"]) {
      id = feed.properties["feature-layer.portalItemId"];
      feed.properties["feature-layer.portalItemId"] = `{{${id}.itemId}}`;
    }
    /* istanbul ignore else */
    if (id && feed.properties.hasOwnProperty("feature-layer.layerId")) {
      const flId = feed.properties["feature-layer.layerId"];
      feed.properties["feature-layer.layerId"] = `{{${id}.layer${flId}.layerId}}`;
    }
  }
  return feed;
}

/**
 * Velocity datasources share the same props as feeds so they can leverage
 * the same templatize function
 *
 * @param dataSources array of data sources from the item
 *
 * @returns the updated dataSources object with templatized ids and labels
 *
 * @private
 */
export function _templatizeDatasources(dataSources: any[]): any {
  return dataSources.map((ds: any) => _templatizeFeed(ds));
}
