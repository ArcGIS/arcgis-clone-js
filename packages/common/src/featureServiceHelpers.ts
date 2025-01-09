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
 * Provides general helper functions.
 *
 * @module featureServiceHelpers
 */

// ------------------------------------------------------------------------------------------------------------------ //

//#region Imports -------------------------------------------------------------------------------------------------------//

import {
  IDefaultSpatialReferenceAndExtent,
  IDependency,
  IFeatureServiceProperties,
  IItemTemplate,
  INumberValuePair,
  IPostProcessArgs,
  IStringValuePair,
  IUpdate,
  UNREACHABLE,
} from "./interfaces";
import {
  checkUrlPathTermination,
  deleteProp,
  deleteProps,
  fail,
  generateGUID,
  getProp,
  setCreateProp,
  setProp,
} from "./generalHelpers";
import { replaceInTemplate, templatizeTerm, templatizeIds } from "./templatization";
import { addToServiceDefinition, getLayerUpdates, getRequest } from "./restHelpers";
import { isTrackingViewTemplate, templatizeTracker } from "./trackingHelpers";
import {
  IExtent,
  IQueryRelatedOptions,
  IQueryRelatedResponse,
  ISpatialReference,
  queryRelated,
  request,
  UserSession,
} from "./arcgisRestJS";

//#endregion ------------------------------------------------------------------------------------------------------------//

//#region Public functions ----------------------------------------------------------------------------------------------//

/**
 * Get the related records for a feature service.
 *
 * @param url Feature service's URL, e.g., layer.url
 * @param relationshipId Id of relationship
 * @param objectIds Objects in the feature service whose related records are sought
 */
export function getFeatureServiceRelatedRecords(
  url: string,
  relationshipId: number,
  objectIds?: number[],
): Promise<IQueryRelatedResponse> {
  const options: IQueryRelatedOptions = {
    url: url + `/${relationshipId}`,
    relationshipId,
    objectIds,
  };

  return queryRelated(options);
}

/**
 * Templatize the ID, url, field references ect
 *
 * @param itemTemplate Template for feature service item
 * @param dependencies Array of IDependency for name mapping
 * @param templatizeFieldReferences Templatize all field references within a layer
 * @param templateDictionary Hash mapping property names to replacement values
 * @returns A promise that will resolve when template has been updated
 * @private
 */
export function templatize(
  itemTemplate: IItemTemplate,
  dependencies: IDependency[],
  templatizeFieldReferences: boolean,
  templateDictionary?: any,
): IItemTemplate {
  templateDictionary = templateDictionary || {};

  // Common templatizations
  const id: string = itemTemplate.item.id;
  const fsUrl = itemTemplate.item.url;

  itemTemplate.item = {
    ...itemTemplate.item,
    id: templatizeTerm(id, id, ".itemId"),
    url: _templatize(id, "url"),
    typeKeywords: templatizeIds(itemTemplate.item.typeKeywords),
  };

  // special handeling if we are dealing with a tracker view
  templatizeTracker(itemTemplate);

  // added for issue #928
  deleteProp(itemTemplate, "properties.service.size");

  const jsonLayers: any[] = itemTemplate.properties.layers || [];
  const jsonTables: any[] = itemTemplate.properties.tables || [];
  const jsonItems: any[] = jsonLayers.concat(jsonTables);

  const data: any = itemTemplate.data || {};
  const layers: any[] = data.layers || [];
  const tables: any[] = data.tables || [];
  const _items: any[] = layers.concat(tables);

  // Set up symbols for the URL of the feature service and its layers and tables
  templateDictionary[fsUrl] = itemTemplate.item.url; // map FS URL to its templatized form
  jsonItems.concat(_items).forEach((layer) => {
    templateDictionary[fsUrl + "/" + layer.id] = _templatize(id, "layer" + layer.id + ".url");
  });

  // templatize the service references serviceItemId
  itemTemplate.properties.service.serviceItemId = templatizeTerm(
    itemTemplate.properties.service.serviceItemId,
    itemTemplate.properties.service.serviceItemId,
    ".itemId",
  );

  const initialExtent: any = getProp(itemTemplate, "properties.service.initialExtent");
  /* istanbul ignore else */
  if (initialExtent) {
    itemTemplate.properties.service.initialExtent = templatizeTerm(id, id, ".solutionExtent");
  }

  const fullExtent: any = getProp(itemTemplate, "properties.service.fullExtent");
  /* istanbul ignore else */
  if (fullExtent) {
    itemTemplate.properties.service.fullExtent = templatizeTerm(id, id, ".solutionExtent");
  }

  // this default extent will be used in cases where it does not make sense to apply the orgs
  // extent to a service with a local spatial reference
  itemTemplate.properties.defaultExtent = initialExtent || fullExtent;

  // in some cases a service does not have a spatial reference defined
  // added for issue #699
  if (
    !getProp(itemTemplate, "properties.service.spatialReference") &&
    getProp(itemTemplate, "properties.defaultExtent.spatialReference")
  ) {
    setCreateProp(
      itemTemplate,
      "properties.service.spatialReference",
      itemTemplate.properties.defaultExtent.spatialReference,
    );
  }

  // if any layer hasZ enabled then we need to set
  // enableZDefaults and zDefault to deploy to enterprise
  let hasZ: boolean = false;

  jsonItems.forEach((jsonItem: any) => {
    // get the source service json for the given data item
    const matchingItems = _items.filter((item) => {
      return jsonItem.id === item.id;
    });

    // templatize the source service json
    const _item: any = matchingItems.length === 1 ? matchingItems[0] : undefined;
    _templatizeLayer(_item, jsonItem, itemTemplate, dependencies, templatizeFieldReferences, templateDictionary);

    hasZ = jsonItem.hasZ || (_item && _item.hasZ) ? true : hasZ;
  });

  if (hasZ) {
    itemTemplate.properties.service.enableZDefaults = true;
    itemTemplate.properties.service.zDefault = 0;
  }

  return itemTemplate;
}

/**
 * Delete key properties that are system managed
 *
 * @param layer The data layer instance with field name references within
 */
export function deleteViewProps(layer: any) {
  const props: string[] = ["definitionQuery"];

  props.forEach((prop) => {
    deleteProp(layer, prop);
  });
}

/**
 * Cache properties that contain field references
 *
 * removeProp added for issue #644
 * setting all props on add for online now
 * investigating if we can also just allow them to be set during add for portal
 *
 * @param layer The data layer instance with field name references within
 * @param fieldInfos the object that stores the cached field infos
 * @param isView When true the current layer is a view and does not need to cache subtype details
 * @returns An updated instance of the fieldInfos
 */
export function cacheFieldInfos(layer: any, fieldInfos: any, isView: boolean, isPortal: boolean): any {
  // cache the source fields as they are in the original source
  if (layer && layer.fields) {
    fieldInfos[layer.id] = {
      sourceFields: JSON.parse(JSON.stringify(layer.fields)),
      type: layer.type,
      id: layer.id,
    };
    /* istanbul ignore else */
    if (!isView && isPortal) {
      fieldInfos[layer.id].subtypes = layer.subtypes;
      fieldInfos[layer.id].subtypeField = layer.subtypeField;
      fieldInfos[layer.id].defaultSubtypeCode = layer.defaultSubtypeCode;
    }
  }

  // cache each of these properties as they each can contain field references
  // and will have associated updateDefinition calls when deploying to portal
  // as well as online for relationships...as relationships added with addToDef will cause failure
  // https://devtopia.esri.com/WebGIS/solutions-development-support/issues/299
  // subtypes, subtypeField, and defaultSubtypeCode should not exist in initial addToDef call and
  // should be added with subsequent add and update calls in a specific order
  const props = {
    editFieldsInfo: false,
    types: false,
    templates: false,
    relationships: true,
    drawingInfo: false,
    timeInfo: false,
    viewDefinitionQuery: false,
  };

  /* istanbul ignore else */
  if (!isView && isPortal) {
    props["subtypes"] = true;
    props["subtypeField"] = true;
    props["defaultSubtypeCode"] = true;
  }

  Object.keys(props).forEach((k) => {
    _cacheFieldInfo(layer, k, fieldInfos, props[k]);
  });

  return fieldInfos;
}

/**
 * Cache the stored contingent values so we can add them in subsequent addToDef calls
 *
 * @param id The layer id for the associated values to be stored with
 * @param fieldInfos The object that stores the cached field infos
 * @param itemTemplate The current itemTemplate being processed
 * @returns An updated instance of the fieldInfos
 */
export function cacheContingentValues(id: string, fieldInfos: any, itemTemplate: IItemTemplate): any {
  const contingentValues = getProp(itemTemplate, "properties.contingentValues");
  if (contingentValues && contingentValues[id]) {
    fieldInfos[id]["contingentValues"] = contingentValues[id];
  }
  return fieldInfos;
}

/**
 * Cache the stored contingent values so we can add them in subsequent addToDef calls
 *
 * @param layer The current layer to check indexes on
 * @param fieldInfos The object that stores the cached field infos
 * @returns An updated instance of the fieldInfos
 */
export function cacheIndexes(layer: any, fieldInfos: any): any {
  /* istanbul ignore else */
  if (Array.isArray(layer.indexes)) {
    const oidField = layer.objectIdField;
    const guidField = layer.globalIdField;
    fieldInfos[layer.id].indexes = layer.indexes.filter((i) => {
      if ((i.isUnique && i.fields !== oidField && i.fields !== guidField) || i.indexType === "FullText") {
        if (i.name) {
          i.name = i.name.replaceAll(" ", "");
        }
        return i;
      }
    });
    delete layer.indexes;
  }
  return fieldInfos;
}

/**
 * Helper function to cache a single property into the fieldInfos object
 * This property will be removed from the layer instance.
 *
 * @param layer the data layer being cloned
 * @param prop the property name used to cache
 * @param fieldInfos the object that will store the cached property
 * @param removeProp when true relationships prop will be set to null and subtype props will be deleted
 * @private
 */
export function _cacheFieldInfo(layer: any, prop: string, fieldInfos: any, removeProp: boolean): void {
  /* istanbul ignore else */
  if (layer && layer.hasOwnProperty(prop) && fieldInfos && fieldInfos.hasOwnProperty(layer.id)) {
    fieldInfos[layer.id][prop] = layer[prop];
    // editFieldsInfo does not come through unless its with the layer
    // when it's being added
    /* istanbul ignore else */
    if (removeProp && prop === "relationships") {
      layer[prop] = null;
    } else if (removeProp) {
      delete layer[prop];
    }
  }
}

/**
 * Cache popup info that can contain field references
 *
 * @param data The items data property
 * @returns An updated instance of the popupInfos
 */
export function cachePopupInfos(data: any): any {
  // store any popupInfo so we can update after any potential name changes
  const popupInfos: IPopupInfos = {
    layers: {},
    tables: {},
  };

  if (data && data.layers && data.layers.length > 0) {
    _cachePopupInfo(popupInfos, "layers", data.layers);
  }

  if (data && data.tables && data.tables.length > 0) {
    _cachePopupInfo(popupInfos, "tables", data.tables);
  }
  return popupInfos;
}

/**
 * Helper function to cache a single popupInfo
 * This property will be reset on the layer
 *
 * @param popupInfos object to store the cahced popupInfo
 * @param type is it a layer or table
 * @param _items list or either layers or tables
 * @private
 */
export function _cachePopupInfo(popupInfos: IPopupInfos, type: "layers" | "tables", _items: any): void {
  _items.forEach((item: any) => {
    if (item && item.hasOwnProperty("popupInfo")) {
      popupInfos[type][item.id] = item.popupInfo;
      item.popupInfo = {};
    }
  });
}

/**
 * Store basic layer information for potential replacement if we are unable to access a given service
 * added for issue #859
 *
 * @param layerId the id for the layer
 * @param itemId the id for the item
 * @param url the url for the layer
 * @param templateDictionary Hash of key details used for variable replacement
 * @returns templatized itemTemplate
 */
export function cacheLayerInfo(layerId: string, itemId: string, url: string, templateDictionary: any): void {
  if (layerId) {
    const layerIdVar = `layer${layerId}`;

    // need to structure these differently so they are not used for standard replacement calls
    // this now adds additional vars that are not needing replacement unless we fail to fetch the service
    const newVars = getProp(templateDictionary, `${UNREACHABLE}.${itemId}`) || {
      itemId,
    };
    newVars[layerIdVar] = getProp(newVars, layerIdVar) || {
      layerId,
      itemId,
    };

    if (url !== "") {
      newVars[layerIdVar]["url"] = url;
    }

    const unreachableVars = {};
    unreachableVars[itemId] = newVars;

    templateDictionary[UNREACHABLE] = {
      ...templateDictionary[UNREACHABLE],
      ...unreachableVars,
    };
  }
}

/**
 * Creates an item in a specified folder (except for Group item type).
 *
 * @param itemTemplate Item to be created; n.b.: this item is modified
 * @param templateDictionary Hash mapping property names to replacement values
 * @param createResponse Response from create service
 * @returns An updated instance of the template
 * @private
 */
export function updateTemplate(
  itemTemplate: IItemTemplate,
  templateDictionary: any,
  createResponse: any,
): IItemTemplate {
  // Update the item with any typeKeywords that were added on create
  _updateTypeKeywords(itemTemplate, createResponse);

  // Add the new item to the template dictionary
  templateDictionary[itemTemplate.itemId] = Object.assign(templateDictionary[itemTemplate.itemId] || {}, {
    itemId: createResponse.serviceItemId,
    url: checkUrlPathTermination(createResponse.serviceurl),
    name: createResponse.name,
  });

  // Update the item template now that the new service has been created
  itemTemplate.itemId = createResponse.serviceItemId;
  return replaceInTemplate(itemTemplate, templateDictionary);
}

/**
 * Updates the items typeKeywords to include any typeKeywords that
 * were added by the create service request
 *
 * @param itemTemplate Item to be created; n.b.: this item is modified
 * @param createResponse Response from create service
 * @returns An updated instance of the template
 * @private
 */
export function _updateTypeKeywords(itemTemplate: IItemTemplate, createResponse: any): IItemTemplate {
  // https://github.com/Esri/solution.js/issues/589

  const iKwords: string[] = getProp(itemTemplate, "item.typeKeywords");
  const cKwords: string[] = getProp(createResponse, "typeKeywords");

  if (iKwords && cKwords) {
    setProp(itemTemplate, "item.typeKeywords", iKwords.concat(cKwords.filter((k) => iKwords.indexOf(k) < 0)));
  }

  return itemTemplate;
}

/**
 * Add layer urls from tracking views to the templateDictionary to be used for adlib replacements
 *
 * @param itemTemplate Item to be created; n.b.: this item is modified
 * @param templateDictionary Hash mapping property names to replacement values
 * @returns void
 * @private
 */
export function _setTrackingViewLayerSettings(itemTemplate: IItemTemplate, templateDictionary: any): void {
  const url = itemTemplate.item.url;
  const newId = itemTemplate.itemId;
  let k;
  Object.keys(templateDictionary).some((_k) => {
    if (newId === templateDictionary[_k].itemId) {
      k = _k;
      return true;
    }
  });

  itemTemplate.properties.layers.forEach((l) => {
    const id = l.id.toString();
    templateDictionary[k][`layer${id}`] = {
      url: checkUrlPathTermination(url) + id,
    };
  });
}

/**
 * Create the name mapping object that will allow for all templatized field
 * references to be de-templatized.
 * This also removes the stored sourceFields and newFields arrays from fieldInfos.
 *
 * @example
 * \{ layer0: \{ fields: \{ lowerCaseSourceFieldName: newFieldNameAfterDeployment \} \} \}
 *
 * @param layerInfos The object that stores the cached layer properties and name mapping
 * @returns The settings object that will be used to de-templatize the field references.
 */
export function getLayerSettings(layerInfos: any, url: string, itemId: string, enterpriseIDMapping?: any): any {
  const settings: any = {};
  const ids = Object.keys(layerInfos);
  ids.forEach((id: any) => {
    const _layerId = getProp(layerInfos[id], "item.id");
    const isNum: boolean = parseInt(_layerId, 10) > -1;
    const layerId: number = isNum && enterpriseIDMapping ? enterpriseIDMapping[_layerId] : isNum ? _layerId : id;
    settings[`layer${isNum ? _layerId : id}`] = {
      fields: _getNameMapping(layerInfos, id),
      url: checkUrlPathTermination(url) + layerId,
      layerId,
      itemId,
    };
    deleteProp(layerInfos[id], "newFields");
    deleteProp(layerInfos[id], "sourceFields");
  });
  return settings;
}

/**
 * Set the names and titles for all feature services.
 *
 * This function will ensure that we have unique feature service names.
 * The feature service name will have a generated GUID appended.
 *
 * @param templates A collection of AGO item templates.
 * @returns An updated collection of AGO templates with unique feature service names.
 */
export function setNamesAndTitles(templates: IItemTemplate[]): IItemTemplate[] {
  const guid: string = generateGUID();
  const names: string[] = [];
  return templates.map((t) => {
    /* istanbul ignore else */
    if (t.item.type === "Feature Service") {
      // Retain the existing title but swap with name if it's missing
      t.item.title = t.item.title || t.item.name;

      /* istanbul ignore else */
      if (!isTrackingViewTemplate(t)) {
        // Need to set the service name: name + "_" + newItemId
        let baseName: string = t.item.name || t.item.title;

        // If the name already contains a GUID remove it
        baseName = baseName.replace(/_[0-9A-F]{32}/gi, "");

        // The name length limit is 98
        // Limit the baseName to 50 characters before the _<guid>
        const name: string = baseName.substring(0, 50) + "_" + guid;

        // If the name + GUID already exists then append "_occurrenceCount"
        t.item.name = names.indexOf(name) === -1 ? name : `${name}_${names.filter((n) => n === name).length}`;

        names.push(name);
      }
    }
    return t;
  });
}

/**
 * This is used when deploying views.
 * We need to update fields referenced in adminLayerInfo for relationships prior to deploying the view.
 * This moves the fieldInfos for the views source layers from the item settings for the source layer
 * to the item settings for the view.
 *
 * @param itemTemplate The current itemTemplate being processed.
 * @param settings The settings object used to de-templatize the various templates within the item.
 */
export function updateSettingsFieldInfos(itemTemplate: IItemTemplate, settings: any): void {
  const dependencies = itemTemplate.dependencies;
  const id = itemTemplate.itemId;
  const settingsKeys = Object.keys(settings);
  settingsKeys.forEach((k: any) => {
    if (id === settings[k].itemId) {
      dependencies.forEach((d: any) => {
        settingsKeys.forEach((_k: any) => {
          /* istanbul ignore else */
          if (d === _k) {
            // combine for multi-source views
            const fieldInfos = {};
            fieldInfos[d] = getProp(settings[_k], "fieldInfos");
            settings[k]["sourceServiceFields"] = settings[k]["sourceServiceFields"]
              ? { ...settings[k]["sourceServiceFields"], ...fieldInfos }
              : fieldInfos;
            const layerKeys = Object.keys(settings[_k]);
            layerKeys.forEach((layerKey) => {
              /* istanbul ignore else */
              if (layerKey.startsWith("layer")) {
                settings[k][layerKey] = settings[_k][layerKey];
              }
            });
          }
        });
      });
    }
  });
}

/**
 * Add flag to indicate item should be ignored.
 * Construct template dictionary to detemplatize any references to this item by other items.
 *
 * @param template Template for feature service item
 * @param authentication Credentials for the request
 * @returns A promise that will resolve when template has been updated
 * @private
 */
export function updateTemplateForInvalidDesignations(
  template: IItemTemplate,
  authentication: UserSession,
): Promise<IItemTemplate> {
  return new Promise<IItemTemplate>((resolve, reject) => {
    template.properties.hasInvalidDesignations = true;
    if (template.item.url) {
      // get the admin URL
      const url: string = template.item.url;
      request(url + "?f=json", {
        authentication: authentication,
      }).then(
        (serviceData) => {
          const layerInfos: any = {};
          const layersAndTables: any[] = (serviceData.layers || []).concat(serviceData.tables || []);
          layersAndTables.forEach((l: any) => {
            /* istanbul ignore else */
            if (l && l.hasOwnProperty("id")) {
              layerInfos[l.id] = l;
            }
          });

          template.data[template.itemId] = Object.assign(
            {
              itemId: template.itemId,
            },
            getLayerSettings(layerInfos, url, template.itemId),
          );
          resolve(template);
        },
        (e) => reject(fail(e)),
      );
    } else {
      resolve(template);
    }
  });
}

/**
 * Get the contingent values for each layer in the service.
 * Remove key props that cannot be included with the addToDef call on deploy.
 * Store the values alongside other key feature service properties in the template
 *
 * @param properties the current feature services properties
 * @param adminUrl the current feature service url
 * @param authentication Credentials for the request to AGOL
 * @returns A promise that will resolve when the contingent values have been fetched.
 * This function will update the provided properties argument when contingent values are found.
 */
export function processContingentValues(
  properties: IFeatureServiceProperties,
  adminUrl: string,
  authentication: UserSession,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (getProp(properties, "service.isView")) {
      // views will inherit from the source service
      resolve();
    } else {
      const layersAndTables: any[] = (properties.layers || []).concat(properties.tables || []);
      const layerIds = [];
      const contingentValuePromises: Array<Promise<any>> = layersAndTables.reduce((prev, cur) => {
        /* istanbul ignore else */
        if (cur.hasContingentValuesDefinition) {
          prev.push(
            request(`${adminUrl}/${cur["id"]}/contingentValues?f=json`, {
              authentication,
            }),
          );
          layerIds.push(cur["id"]);
        }
        return prev;
      }, []);

      if (contingentValuePromises.length > 0) {
        Promise.all(contingentValuePromises).then((results) => {
          const contingentValues = {};
          results.forEach((r, i) => {
            deleteProp(r, "typeCodes");
            /* istanbul ignore else */
            if (getProp(r, "stringDicts") && getProp(r, "contingentValuesDefinition")) {
              r.contingentValuesDefinition["stringDicts"] = r.stringDicts;
              deleteProp(r, "stringDicts");
            }
            deleteProps(getProp(r, "contingentValuesDefinition"), [
              "layerID",
              "layerName",
              "geometryType",
              "hasSubType",
            ]);
            contingentValues[layerIds[i]] = r;
          });
          properties.contingentValues = contingentValues;
          resolve();
        }, reject);
      } else {
        resolve();
      }
    }
  });
}

/**
 * Replace the field name reference templates with the new field names after deployment.
 *
 * @param fieldInfos The object that stores the cached layer properties and name mapping
 * @param popupInfos The object from the popupInfo property for the layer
 * @param adminLayerInfos The object from the adminLayerInfo property for the layer
 * @param settings The settings object that has all of the mappings for de-templatizing.
 * @returns An object that contains updated instances of popupInfos, fieldInfos, and adminLayerInfos
 */
export function deTemplatizeFieldInfos(fieldInfos: any, popupInfos: any, adminLayerInfos: any, settings: any): any {
  const fieldInfoKeys = Object.keys(fieldInfos);
  fieldInfoKeys.forEach((id) => {
    if (fieldInfos[id].hasOwnProperty("templates")) {
      fieldInfos[id].templates = JSON.parse(replaceInTemplate(JSON.stringify(fieldInfos[id].templates), settings));
    }

    if (fieldInfos[id].hasOwnProperty("adminLayerInfo")) {
      adminLayerInfos[id].viewLayerDefinition.table.relatedTables = fieldInfos[id].adminLayerInfo;
      deleteProp(fieldInfos[id], "adminLayerInfo");
    }

    if (fieldInfos[id].hasOwnProperty("types")) {
      fieldInfos[id].types = JSON.parse(replaceInTemplate(JSON.stringify(fieldInfos[id].types), settings));
    }
  });

  return {
    popupInfos: replaceInTemplate(popupInfos, settings),
    fieldInfos: replaceInTemplate(fieldInfos, settings),
    adminLayerInfos: replaceInTemplate(adminLayerInfos, settings),
  };
}

/**
 * This is used when deploying views.
 * We need to update fields referenced in adminLayerInfo for relationships prior to deploying the view.
 * This moves the fieldInfos for the views source layers from the item settings for the source layer
 * to the item settings for the view.
 *
 * @param itemTemplate The current itemTemplate being processed.
 * @returns array of layers and tables
 */
export function getLayersAndTables(itemTemplate: IItemTemplate): any[] {
  const properties: any = itemTemplate.properties;
  const layersAndTables: any[] = [];
  (properties.layers || []).forEach(function (layer: any) {
    layersAndTables.push({
      item: layer,
      type: "layer",
    });
  });
  (properties.tables || []).forEach(function (table: any) {
    layersAndTables.push({
      item: table,
      type: "table",
    });
  });
  return layersAndTables;
}

/**
 * Fetch each layer and table from service so we can determine what fields they have.
 * This is leveraged when we are using existing services so we can determine if we need to
 * remove any fields from views that depend on these layers and tables.
 *
 * @param url Feature service endpoint
 * @param ids layer and table ids
 * @param authentication Credentials for the request
 * @returns A promise that will resolve an array of promises with either a failure or the data
 * @private
 */
export function getExistingLayersAndTables(url: string, ids: number[], authentication: UserSession): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  return new Promise((resolve) => {
    const defs: Array<Promise<any>> = ids.map((id) => {
      return request(checkUrlPathTermination(url) + id, {
        authentication,
      });
    });
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    Promise.all(defs.map((p) => p.catch((e) => e))).then(resolve);
  });
}

/**
 * Adds the layers and tables of a feature service to it and restores their relationships.
 *
 * @param itemTemplate Feature service
 * @param templateDictionary Hash mapping Solution source id to id of its clone (and name & URL for feature
 *            service)
 * @param popupInfos the cached popup info from the layers
 * @param authentication Credentials for the request
 * @returns A promise that will resolve when all layers and tables have been added
 * @private
 */
export function addFeatureServiceLayersAndTables(
  itemTemplate: IItemTemplate,
  templateDictionary: any,
  popupInfos: IPopupInfos,
  authentication: UserSession,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isTrackingViewTemplate(itemTemplate)) {
      _setTrackingViewLayerSettings(itemTemplate, templateDictionary);
      resolve(null);
    } else {
      // Create a hash of various properties that contain field references
      const fieldInfos: any = {};
      const adminLayerInfos: any = {};
      // Add the service's layers and tables to it
      const layersAndTables: any[] = getLayersAndTables(itemTemplate);
      if (layersAndTables.length > 0) {
        addFeatureServiceDefinition(
          itemTemplate.item.url || "",
          layersAndTables,
          templateDictionary,
          authentication,
          itemTemplate.key,
          adminLayerInfos,
          fieldInfos,
          itemTemplate,
        ).then(
          () => {
            // Detemplatize field references and update the layer properties
            // Only failure path is handled by addFeatureServiceDefinition
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            updateLayerFieldReferences(itemTemplate, fieldInfos, popupInfos, adminLayerInfos, templateDictionary).then(
              (r) => {
                // Update relationships and layer definitions
                const updates: IUpdate[] = getLayerUpdates(
                  {
                    message: "updated layer definition",
                    objects: r.layerInfos.fieldInfos,
                    itemTemplate: r.itemTemplate,
                    authentication,
                  } as IPostProcessArgs,
                  templateDictionary.isPortal,
                );
                // Process the updates sequentially
                updates
                  .reduce((prev, update) => {
                    return prev.then(() => {
                      return getRequest(update, false, false, templateDictionary.isPortal);
                    });
                  }, Promise.resolve(null))
                  .then(
                    () => resolve(null),
                    (e: any) => reject(fail(e)), // getRequest
                  );
              },
            );
          },
          (e) => reject(fail(e)), // addFeatureServiceDefinition
        );
      } else {
        resolve(null);
      }
    }
  });
}

/**
 * Updates a feature service with a list of layers and/or tables.
 *
 * @param serviceUrl URL of feature service
 * @param listToAdd List of layers and/or tables to add
 * @param templateDictionary Hash mapping Solution source id to id of its clone (and name & URL for feature
 *            service)
 * @param authentication Credentials for the request
 * @param key
 * @param adminLayerInfos Hash map of a layers adminLayerInfo
 * @param fieldInfos Hash map of properties that contain field references
 * @param itemTemplate
 * @returns A promise that will resolve when the feature service has been updated
 * @private
 */
export function addFeatureServiceDefinition(
  serviceUrl: string,
  listToAdd: any[],
  templateDictionary: any,
  authentication: UserSession,
  key: string,
  adminLayerInfos: any,
  fieldInfos: any,
  itemTemplate: IItemTemplate,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isTrackingViewTemplate(itemTemplate)) {
      resolve(null);
    } else {
      let options: any = {
        layers: [],
        tables: [],
        authentication,
      };

      // if the service has veiws keep track of the fields so we can use them to
      // compare with the view fields
      /* istanbul ignore else */
      if (getProp(itemTemplate, "properties.service.hasViews")) {
        _updateTemplateDictionaryFields(itemTemplate, templateDictionary);
      }

      const isSelfReferential = _isSelfReferential(listToAdd);
      listToAdd = _updateOrder(listToAdd, isSelfReferential, itemTemplate);

      const chunkSize: number = _getLayerChunkSize();
      const layerChunks: any[] = [];
      listToAdd.forEach((toAdd, i) => {
        let item = toAdd.item;
        const originalId = item.id;
        const isView = itemTemplate.properties.service.isView;
        const isPortal = templateDictionary.isPortal;
        fieldInfos = cacheFieldInfos(item, fieldInfos, isView, isPortal);

        // cache the values to be added in seperate addToDef calls
        fieldInfos = cacheContingentValues(item.id, fieldInfos, itemTemplate);

        // cache specific field indexes when deploying to ArcGIS Enterprise portal
        if (isPortal) {
          fieldInfos = cacheIndexes(item, fieldInfos);
        }

        /* istanbul ignore else */
        if (item.isView) {
          deleteViewProps(item);
        }
        // when the item is a view we need to grab the supporting fieldInfos
        /* istanbul ignore else */
        if (isView) {
          _updateGeomFieldName(item.adminLayerInfo, templateDictionary);

          adminLayerInfos[originalId] = item.adminLayerInfo;
          // need to update adminLayerInfo before adding to the service def
          // bring over the fieldInfos from the source layer
          updateSettingsFieldInfos(itemTemplate, templateDictionary);
          // update adminLayerInfo before add to definition with view source fieldInfo settings
          item.adminLayerInfo = replaceInTemplate(item.adminLayerInfo, templateDictionary);

          /* istanbul ignore else */
          if (fieldInfos && fieldInfos.hasOwnProperty(item.id)) {
            Object.keys(templateDictionary).some((k) => {
              if (templateDictionary[k].itemId === itemTemplate.itemId) {
                fieldInfos[item.id]["sourceServiceFields"] = templateDictionary[k].sourceServiceFields;
                return true;
              } else {
                return false;
              }
            });
          }
        }
        /* istanbul ignore else */
        if (isPortal) {
          item = _updateForPortal(item, itemTemplate, templateDictionary);
        }

        removeLayerOptimization(item);

        // this can still chunk layers
        options = _updateAddOptions(itemTemplate, options, layerChunks, isSelfReferential, authentication);

        if (item.type === "Feature Layer") {
          options.layers.push(item);
        } else {
          options.tables.push(item);
        }

        // In general we are switching to not use chunking. Rather if we exceed the defined chunk size
        // we will use an async request.
        // Currently the only case that should chunk the requests is when we have a multisource view
        //  handled in _updateAddOptions above
        /* istanbul ignore else */
        if (i + 1 === listToAdd.length) {
          layerChunks.push(Object.assign({}, options));
          options = {
            layers: [],
            tables: [],
            authentication,
          };
        }
      });

      // will use async by default rather than chunk the layer requests when we have more layers
      // than the defined chunk size
      const useAsync: boolean = listToAdd.length > chunkSize;

      layerChunks
        .reduce(
          (prev, curr) => prev.then(() => addToServiceDefinition(serviceUrl, curr, false, useAsync)),
          Promise.resolve(null),
        )
        .then(
          () => resolve(null),
          (e: any) => reject(fail(e)),
        );
    }
  });
}

/**
 * When a view is a multi service view sort based on the id
 * https://github.com/Esri/solution.js/issues/1048
 *
 * @param layersAndTables The list of layers and tables for the current template
 * @param isSelfReferential Indicates if any layers or tables have relationships with other layers or tables in the same service
 * @param itemTemplate The current itemTemplate being processed
 *
 * @returns Sorted list of layers and tables when using a multi-service view
 * @private
 */
export function _updateOrder(layersAndTables: any[], isSelfReferential: boolean, itemTemplate: IItemTemplate): any[] {
  const isMsView: boolean = getProp(itemTemplate, "properties.service.isMultiServicesView") || false;
  return isSelfReferential || isMsView ? layersAndTables.sort((a, b) => a.item.id - b.item.id) : layersAndTables;
}

/**
 * When a view is a multi service view add each layer separately
 * https://github.com/Esri/solution.js/issues/871
 *
 * @param itemTemplate The current itemTemplate being processed
 * @param options Add to service definition options
 * @param layerChunks Groups of layers or tables to add to the service
 * @param isSelfReferential Indicates if any layers or tables have relationships with other layers or tables in the same service
 * @param authentication Credentials for the request
 *
 * @returns Add to service definition options
 * @private
 */
export function _updateAddOptions(
  itemTemplate: IItemTemplate,
  options: any,
  layerChunks: any[],
  isSelfReferential: boolean,
  authentication: UserSession,
): any {
  const isMsView: boolean = getProp(itemTemplate, "properties.service.isMultiServicesView") || false;
  /* istanbul ignore else */
  if (isMsView || isSelfReferential) {
    // if we already have some layers or tables add them first
    /* istanbul ignore else */
    if (options.layers.length > 0 || options.tables.length > 0) {
      layerChunks.push(Object.assign({}, options));
      options = {
        layers: [],
        tables: [],
        authentication,
      };
    }
  }
  return options;
}

/**
 * Determine if any layer or table within the service references
 * other layers or tables within the same service
 *
 * @param layersAndTables the list of layers and tables from the service
 *
 * @returns true when valid internal references are found
 * @private
 */
export function _isSelfReferential(layersAndTables: any[]): boolean {
  const names = layersAndTables.map((l) => l.item.name);
  const srcTables = {};
  return layersAndTables.some((l) => {
    const table = l.item.adminLayerInfo?.viewLayerDefinition?.table;
    if (table) {
      const name = table.sourceServiceName;
      const id = table.sourceLayerId;
      if (name && id > -1) {
        if (Object.keys(srcTables).indexOf(name) > -1) {
          if (srcTables[name].indexOf(id) > -1) {
            return true;
          } else {
            srcTables[name].push(id);
          }
        } else {
          srcTables[name] = [id];
        }
      }
      return (table.relatedTables || []).some((r) => names.indexOf(r.name) > -1);
    }
  });
}

/**
 * Remove "multiScaleGeometryInfo" for issue #526 to prevent invalid enablement of layer optimization
 *
 * @param layer the layer to evaluate
 * @private
 */
export function removeLayerOptimization(layer: any): void {
  /* istanbul ignore else */
  if (layer.multiScaleGeometryInfo) {
    deleteProp(layer, "multiScaleGeometryInfo");
  }
}

/**
 * Handle portal specific updates to the item
 *
 * @param item the item to update
 * @param itemTemplate the item template
 * @param templateDictionary Hash mapping Solution source id to id of its clone
 *
 * @returns the updated item
 * @private
 */
export function _updateForPortal(item: any, itemTemplate: IItemTemplate, templateDictionary: any): any {
  // When deploying to portal we need to adjust the uniquie ID field up front
  /* istanbul ignore else */
  if (item.uniqueIdField && item.uniqueIdField.name) {
    item.uniqueIdField.name = String(item.uniqueIdField.name).toLocaleLowerCase();
  }

  // Portal will fail if the geometryField is null
  if (item.type === "Table" && item.adminLayerInfo) {
    deleteProp(item.adminLayerInfo, "geometryField");
  }

  // Portal will fail if the sourceFields in the viewLayerDef contain fields that are not in the source service
  /* istanbul ignore else */
  if (item.isView) {
    const viewLayerDefTable: any = getProp(item, "adminLayerInfo.viewLayerDefinition.table");

    let fieldNames: string[] = [];
    if (viewLayerDefTable) {
      const tableFieldNames: string[] = _getFieldNames(viewLayerDefTable, itemTemplate, templateDictionary);
      fieldNames = fieldNames.concat(tableFieldNames);

      const dynamicFieldNames = _getDynamicFieldNames(viewLayerDefTable);
      fieldNames = fieldNames.concat(dynamicFieldNames);

      setProp(
        item,
        "adminLayerInfo.viewLayerDefinition.table",
        _updateSourceLayerFields(viewLayerDefTable, fieldNames),
      );

      // Handle related also
      /* istanbul ignore else */
      if (Array.isArray(viewLayerDefTable.relatedTables)) {
        viewLayerDefTable.relatedTables.map((relatedTable: any) => {
          const relatedTableFieldNames: string[] = _getFieldNames(relatedTable, itemTemplate, templateDictionary);
          fieldNames = fieldNames.concat(relatedTableFieldNames);

          const dynamicRelatedFieldNames = _getDynamicFieldNames(relatedTable);
          fieldNames = fieldNames.concat(dynamicRelatedFieldNames);

          return _updateSourceLayerFields(relatedTable, [...relatedTableFieldNames, ...dynamicRelatedFieldNames]);
        });
      }
    } else {
      Object.keys(templateDictionary).some((k) => {
        /* istanbul ignore else */
        if (templateDictionary[k].itemId === item.serviceItemId) {
          const layerInfo: any = templateDictionary[k][`layer${item.id}`];
          /* istanbul ignore else */
          if (layerInfo && layerInfo.fields) {
            if (Array.isArray(layerInfo.fields)) {
              fieldNames = layerInfo.fields.map((f: any) => f.name);
            } else {
              fieldNames = Object.keys(layerInfo.fields);
            }
          }
          return true;
        }
      });
    }

    item = _updateItemFields(item, fieldNames);
  }

  // not allowed to set sourceSchemaChangesAllowed or isView for portal
  // these are set when you create the service
  deleteProp(item, "isView");
  return item;
}

/**
 * Get a list of the source layer field names
 *
 * @param table the table instance to compare
 * @param itemTemplate the item template
 * @param templateDictionary Hash mapping Solution source id to id of its clone
 *
 * @returns an array of the source layers fields
 * @private
 */
export function _getFieldNames(table: any, itemTemplate: IItemTemplate, templateDictionary: any): string[] {
  let sourceLayerFields: any[] = [];
  const viewSourceLayerId: number = table.sourceLayerId;

  /* istanbul ignore else */
  if (typeof viewSourceLayerId === "number") {
    // need to make sure these actually exist in the source..
    itemTemplate.dependencies.forEach((d) => {
      const layerInfo: any = templateDictionary[d][`layer${viewSourceLayerId}`];
      /* istanbul ignore else */
      if (layerInfo && layerInfo.fields && templateDictionary[d].name === table.sourceServiceName) {
        if (Array.isArray(layerInfo.fields)) {
          sourceLayerFields = sourceLayerFields.concat(layerInfo.fields.map((f: any) => f.name));
        } else {
          sourceLayerFields = sourceLayerFields.concat(Object.keys(layerInfo.fields));
        }
      }
    });
    return sourceLayerFields;
  }
}

/**
 * Get a list of any dynamically calculated fields
 * These fields are still valid but will not exist in the source service
 *
 * @param table the table instance to compare
 *
 * @returns an array of field names
 * @private
 */
export function _getDynamicFieldNames(table: any): string[] {
  const fieldNames: string[] = table.sourceLayerFields.reduce((prev, cur) => {
    if (cur.statisticType) {
      prev.push(cur.name);
    }
    return prev;
  }, []);
  return [...new Set(fieldNames)];
}

/**
 * Remove fields references from fields and indexes that do not exist in the source service
 *
 * @param item Layer or table
 * @param templateDictionary Hash mapping Solution source id to id of its clone
 *
 * @returns updated layer or table
 * @private
 */
export function _updateItemFields(item: any, fieldNames: string[]): any {
  /* istanbul ignore else */
  if (fieldNames.length > 0) {
    /* istanbul ignore else */
    if (item.fields) {
      item.fields = item.fields.filter((f: any) => fieldNames.indexOf(f.name) > -1);
    }
    /* istanbul ignore else */
    if (item.indexes) {
      item.indexes = item.indexes.filter((f: any) => fieldNames.indexOf(f.fields) > -1);
    }
  }
  return item;
}

/**
 *  Filter the sourceLayerFields for the table
 *
 * @param table the table instance to evaluate
 * @param sourceLayerFields array of fields from the source service
 * @returns Updated instance of the table
 * @private
 */
export function _updateSourceLayerFields(table: any, sourceLayerFields: string[]): any {
  /* istanbul ignore else */
  if (Array.isArray(table.sourceLayerFields) && table.sourceLayerFields.length > 0) {
    // need to make sure these actually exist in the source..
    /* istanbul ignore else */
    if (sourceLayerFields.length > 0) {
      setProp(
        table,
        "sourceLayerFields",
        table.sourceLayerFields.filter((f: any) => sourceLayerFields.indexOf(f.source.toLowerCase()) > -1),
      );
    }
  }
  return table;
}

/**
 * When the itemm is a view with a geometry field update the value to
 * use the table name from the view layer def
 *
 * @param item the item details from the current template
 * @param templateDictionary Hash mapping property names to replacement values
 * @private
 */
export function _updateGeomFieldName(adminLayerInfo: any, templateDictionary: any): void {
  // issue #471
  const tableName: string = getProp(adminLayerInfo, "viewLayerDefinition.table.name");
  const fieldName: string = getProp(adminLayerInfo, "geometryField.name");
  /* istanbul ignore else */
  if (fieldName && tableName) {
    const geomName: string = templateDictionary.isPortal ? `${tableName}.shape` : `${tableName}.Shape`;
    setProp(adminLayerInfo, "geometryField.name", geomName);
  } else if (!fieldName && getProp(adminLayerInfo, "geometryField")) {
    // null geom field will cause failure to deploy in portal
    // this is also checked and removed on deploy for older solutions
    deleteProp(adminLayerInfo, "geometryField");
  }
}

/**
 * Add the fields to the templateDictionary when a service has views
 * these are used to compare with fields from the view when domains are involved
 * when a view field has a domain that differs from that of the source service
 * the definition needs to be modified in an update call rather than when it is first added.
 * This should only happen when the domain differs.
 *
 * @param itemTemplate
 * @param templateDictionary Hash mapping Solution source id to id of its clone (and name & URL for feature service)
 * @private
 */
export function _updateTemplateDictionaryFields(
  itemTemplate: IItemTemplate,
  templateDictionary: any,
  compareItemId: boolean = true,
): void {
  const layers: any[] = itemTemplate.properties.layers;
  const tables: any[] = itemTemplate.properties.tables;
  const layersAndTables: any[] = layers.concat(tables);
  const fieldInfos: any = {};
  layersAndTables.forEach((layerOrTable) => {
    fieldInfos[layerOrTable.id] = layerOrTable.fields;
  });
  Object.keys(templateDictionary).some((k) => {
    if (compareItemId ? templateDictionary[k].itemId === itemTemplate.itemId : k === itemTemplate.itemId) {
      templateDictionary[k].fieldInfos = fieldInfos;
      return true;
    } else {
      return false;
    }
  });
}

/**
 * Set the defaultSpatialReference variable with the services spatial reference.
 * If this item is a Feature Service that has child views then we will use this value
 * if one or more of the child views spatial reference differs from that of its parent.
 *
 * @param templateDictionary Hash mapping Solution source id to id of its clone (and name & URL for feature service)
 * @param itemId The source id for the item
 * @param spatialReference \{ wkid: 102100 \} for example
 * @private
 */
export function setDefaultSpatialReference(templateDictionary: any, itemId: string, spatialReference: any): void {
  /* istanbul ignore else */
  if (spatialReference) {
    setCreateProp(templateDictionary, `${itemId}.defaultSpatialReference`, spatialReference);
  }
}

/**
 * Compare the spatial reference of the current item against its dependencies.
 * The spatial reference of a view cannot differ from its source service.
 * If the view has a different spatial reference from its source use the source spatial reference.
 *
 * @param serviceInfo Basic service information
 * @param itemTemplate The current template to process
 * @param templateDictionary Hash mapping Solution source id to id of its clone (and name & URL for feature service)
 * @private
 */
export function validateSpatialReferenceAndExtent(
  serviceInfo: any,
  itemTemplate: IItemTemplate,
  templateDictionary: any,
): void {
  /* istanbul ignore else */
  if (getProp(serviceInfo, "service.isView")) {
    // first pass ensure we have a geometry type before getting the spatial reference or extent
    // issue: #1368
    const geomCheckResults = _getSourceSpatialReferenceAndExtent(serviceInfo, itemTemplate, templateDictionary, true);

    // if not found with first pass just check for the first service that has the key values defined
    // as we did before the above handeling
    const results = _getSourceSpatialReferenceAndExtent(serviceInfo, itemTemplate, templateDictionary, false);

    const sourceSR = geomCheckResults.spatialReference || results.spatialReference;
    const sourceExt = geomCheckResults.extent || results.extent;

    const sourceWkid: number = getProp(sourceSR, "wkid");

    const viewWkid: number = getProp(serviceInfo, "service.spatialReference.wkid");
    /* istanbul ignore else */
    if (sourceWkid && viewWkid && sourceWkid !== viewWkid) {
      setCreateProp(serviceInfo, "service.spatialReference", sourceSR);
    }

    const viewExt: number = getProp(serviceInfo, "service.fullExtent");
    /* istanbul ignore else */
    if (sourceExt && viewExt && JSON.stringify(sourceExt) !== JSON.stringify(viewExt)) {
      setCreateProp(serviceInfo, "defaultExtent", sourceExt);
    }
  }
}

/**
 * Get the spatial reference from a views source.
 * Optionally ensure that the source has a valid geometry type prior to using its values.
 *
 * @param serviceInfo Basic service information
 * @param itemTemplate The current template to process
 * @param templateDictionary Hash mapping Solution source id to id of its clone (and name & URL for feature service)
 * @param validateGeom When true the source must contain a geometryType for values to be returned
 *
 * @returns An object that contains the default spatial reference and extent value
 * @private
 */
export function _getSourceSpatialReferenceAndExtent(
  serviceInfo: any,
  itemTemplate: IItemTemplate,
  templateDictionary: any,
  validateGeom: boolean,
): IDefaultSpatialReferenceAndExtent {
  const layersAndTables = [...(serviceInfo.layers || []), ...(serviceInfo.tables || [])];

  let spatialReference: ISpatialReference;
  let extent: IExtent;

  itemTemplate.dependencies.some((id) => {
    const source: any = templateDictionary[id];

    const hasGeom = validateGeom
      ? layersAndTables.some((layerOrTable) => {
          const name = getProp(layerOrTable, "adminLayerInfo.viewLayerDefinition.table.sourceServiceName");
          return name && source.name && name === source.name && layerOrTable.geometryType;
        })
      : true;

    const sr: any = getProp(source, "defaultSpatialReference");
    /* istanbul ignore else */
    if (!spatialReference && sr && hasGeom) {
      spatialReference = sr;
    }

    const ext: any = getProp(source, "defaultExtent");
    /* istanbul ignore else */
    if (!extent && ext && hasGeom) {
      extent = ext;
    }

    return spatialReference && extent;
  });
  return {
    spatialReference,
    extent,
  };
}

/**
 * Updates a feature service with a list of layers and/or tables.
 *
 * @param itemTemplate
 * @param fieldInfos Hash map of properties that contain field references
 * @param popupInfos Hash map of a layers popupInfo
 * @param adminLayerInfos Hash map of a layers adminLayerInfo
 * @param templateDictionary Hash mapping Solution source id to id of its clone (and name & URL for feature service)
 * @param authentication Credentials for the request
 * @returns A promise that will resolve when the feature service has been updated
 * @private
 */
export function updateLayerFieldReferences(
  itemTemplate: IItemTemplate,
  fieldInfos: any,
  popupInfos: IPopupInfos,
  adminLayerInfos: any,
  templateDictionary: any,
): Promise<any> {
  return new Promise((resolveFn, rejectFn) => {
    // Will need to do some post processing for fields
    // to handle any potential field name changes when deploying to portal
    postProcessFields(itemTemplate, fieldInfos, popupInfos, adminLayerInfos, templateDictionary).then(
      (layerInfos: any) => {
        // Update the items text with detemplatized popupInfo
        updatePopupInfo(itemTemplate, layerInfos.popupInfos);
        resolveFn({
          itemTemplate,
          layerInfos,
        });
      },
      (e) => rejectFn(fail(e)),
    );
  });
}

/**
 * Update the names of fields for each layer or table after it has been
 * added to the definition
 *
 * @param itemTemplate Item to be created
 * @param layerInfos Hash map of properties that contain field references and various layer info
 * @param popupInfos Hash map of a layers popupInfo
 * @param adminLayerInfos Hash map of a layers adminLayerInfo
 * @param templateDictionary
 * @param authentication Credentials for the request
 * @returns An object with detemplatized field references
 * @private
 */
export function postProcessFields(
  itemTemplate: IItemTemplate,
  layerInfos: any,
  popupInfos: any,
  adminLayerInfos: any,
  templateDictionary: any,
): Promise<any> {
  return new Promise((resolveFn, rejectFn) => {
    if (!itemTemplate.item.url) {
      rejectFn(fail("Feature layer " + itemTemplate.itemId + " does not have a URL"));
    } else {
      const id = itemTemplate.itemId;
      const settingsKeys = Object.keys(templateDictionary);

      let templateInfo: any;
      settingsKeys.some((k) => {
        if (templateDictionary[k].itemId === id) {
          templateInfo = templateDictionary[k];
          return true;
        } else {
          return false;
        }
      });

      // concat any layers and tables to process
      const layers: any[] = itemTemplate.properties.layers;
      const tables: any[] = itemTemplate.properties.tables;
      const layersAndTables: any[] = layers.concat(tables);

      // Set the newFields property for the layerInfos...this will contain all fields
      // as they are after being added to the definition.
      // This allows us to handle any potential field name changes after deploy to portal
      layersAndTables.forEach((item: any) => {
        // when deploying to portal "isView" is only set for create service and will fail when
        // present on addToDef so this property is removed from item and we should check the templates service info
        const isView = item.isView || itemTemplate.properties.service.isView;
        /* istanbul ignore else */
        if (layerInfos && layerInfos.hasOwnProperty(item.id)) {
          const layerInfo: any = layerInfos[item.id];
          layerInfo["isView"] = item.isView;
          layerInfo["newFields"] = item.fields;
          layerInfo["sourceSchemaChangesAllowed"] = item.sourceSchemaChangesAllowed;

          /* istanbul ignore else */
          if (item.editFieldsInfo) {
            // more than case change when deployed to protal so keep track of the new names
            layerInfo["newEditFieldsInfo"] = JSON.parse(JSON.stringify(item.editFieldsInfo));
          }

          /* istanbul ignore else */
          if (isView && templateInfo && templateDictionary.isPortal) {
            // when the item is a view bring over the source service fields so we can compare the domains
            layerInfo["sourceServiceFields"] = templateInfo.sourceServiceFields;
          }
        }
      });

      // Add the layerInfos to the settings object to be used while detemplatizing
      settingsKeys.forEach((k: any) => {
        if (id === templateDictionary[k].itemId) {
          templateDictionary[k] = Object.assign(
            templateDictionary[k],
            getLayerSettings(layerInfos, templateDictionary[k].url, id),
          );
        }
      });

      // update the layerInfos object with current field names
      resolveFn(deTemplatizeFieldInfos(layerInfos, popupInfos, adminLayerInfos, templateDictionary));
    }
  });
}

/**
 * Add popup info back to the layer item
 *
 * @param itemTemplate
 * @param popupInfos popup info to be added back to the layer
 * @private
 */
export function updatePopupInfo(itemTemplate: IItemTemplate, popupInfos: any): void {
  ["layers", "tables"].forEach((type) => {
    const _items: any[] = getProp(itemTemplate, "data." + type);
    /* istanbul ignore else */
    if (_items && Array.isArray(_items)) {
      _items.forEach((item: any) => {
        item.popupInfo = getProp(popupInfos, type + "." + item.id) || {};
      });
    }
  });
}

//#endregion

//#region Private helper functions --------------------------------------------------//

/**
 * Helper function to templatize value and make sure its converted to lowercase
 *
 * @param basePath path used to de-templatize while deploying
 * @param value to be converted to lower case for lookup while deploying
 * @private
 */
export function _templatize(basePath: string, value: string, suffix?: string): string {
  if (value.startsWith("{{")) {
    return value;
  } else {
    return String(templatizeTerm(basePath, basePath, "." + String(value).toLowerCase() + (suffix ? "." + suffix : "")));
  }
}

/**
 * templatize an objects property
 *
 * @param object the object with the property to templatize
 * @param property the property of the object to templatize
 * @param basePath path used to de-templatize while deploying
 * @private
 */
export function _templatizeProperty(object: any, property: string, basePath: string, suffix: string): void {
  if (object && object.hasOwnProperty(property) && object[property]) {
    object[property] = _templatize(basePath, object[property], suffix);
  }
}

/**
 * Templatize field references, serviceItemId, and adminLayerInfo for a layer
 *
 * @param dataItem from the items data property
 * @param adminItem from the services admin api
 * @param itemTemplate Template for feature service item
 * @param dependencies Array of IDependency for name mapping
 * @param templatizeFieldReferences Templatize all field references within a layer
 * @returns A promise that will resolve when template has been updated
 * @private
 */
export function _templatizeLayer(
  dataItem: any,
  adminItem: any,
  itemTemplate: IItemTemplate,
  dependencies: IDependency[],
  templatizeFieldReferences: boolean,
  templateDictionary: any,
): void {
  // check for and repair common field issues
  _validateFields(adminItem);

  // Templatize all properties that contain field references
  /* istanbul ignore else */
  if (templatizeFieldReferences) {
    _templatizeLayerFieldReferences(dataItem, itemTemplate.itemId, adminItem, dependencies);
  }

  const updates: any[] = [adminItem];
  if (dataItem) {
    updates.push(dataItem);
  }

  updates.forEach((update) => {
    if (update.hasOwnProperty("name")) {
      // templatize the name but leave the current name as the optional default
      update.name = templatizeTerm(
        update["serviceItemId"] + ".layer" + update.id,
        update["serviceItemId"] + ".layer" + update.id,
        ".name||" + update.name,
      );
    }
    if (update.hasOwnProperty("extent")) {
      update.extent = templatizeTerm(update["serviceItemId"], update["serviceItemId"], ".solutionExtent");
    }

    if (update.hasOwnProperty("serviceItemId")) {
      update["serviceItemId"] = templatizeTerm(update["serviceItemId"], update["serviceItemId"], ".itemId");
    }

    if (update.hasOwnProperty("adminLayerInfo")) {
      update.adminLayerInfo = _templatizeAdminLayerInfo(update, dependencies, templateDictionary);
    }
  });
}

/**
 * Repair common issues that can occur with feature service field references.
 * This function will mutate the input item if any of the common issues have occured.
 *
 * @param adminItem layer or table from the service
 */
export function _validateFields(adminItem: any): void {
  const fieldNames: string[] = (adminItem.fields || []).map((f: any) => f.name);

  // Update primary display field if field isn't in the layer.
  _validateDisplayField(adminItem, fieldNames);

  // Remove indexes on fields that don't exist in the layer.
  // Remove duplicate indexes on the same field.
  _validateIndexes(adminItem, fieldNames);

  // Remove field references in templates when field doesn't exist in the layer.
  _validateTemplatesFields(adminItem, fieldNames);
  _validateTypesTemplates(adminItem, fieldNames);

  // Repair editFieldsInfo if field referenced doesn't exist in the layer
  _validateEditFieldsInfo(adminItem, fieldNames);
}

/**
 * Update primary display field if casing doesn't match.
 * Update primary display field to the first non OID or GlobalId if the field isn't in the layer.
 *
 * @param adminItem layer or table from the service
 * @param fieldNames string list of fields names
 * @private
 */
export function _validateDisplayField(adminItem: any, fieldNames: string[]): void {
  const displayField: string = adminItem.displayField || "";
  let i: number = -1;
  if (
    fieldNames.some((name) => {
      i += 1;
      return name === displayField || name === displayField.toLowerCase();
    })
  ) {
    adminItem.displayField = fieldNames[i];
  } else {
    // use the first non-OID non-globalId field we find
    const skipFields: string[] = [];
    const oidField: any = getProp(adminItem, "uniqueIdField.name");
    /* istanbul ignore else */
    if (oidField) {
      skipFields.push(oidField);
    }

    const globalIdField: any = getProp(adminItem, "globalIdField");
    /* istanbul ignore else */
    if (globalIdField) {
      skipFields.push(globalIdField);
    }

    fieldNames.some((name) => {
      if (skipFields.indexOf(name) === -1) {
        adminItem.displayField = name;
        return true;
      } else {
        return false;
      }
    });
  }
}

/**
 * Remove indexes on fields that don't exist in the layer.
 * Remove duplicate indexes on the same field.
 *
 * @param adminItem layer or table from the service
 * @param fieldNames string list of fields names
 * @private
 */
export function _validateIndexes(adminItem: any, fieldNames: string[]): void {
  const indexes: any[] = adminItem.indexes;
  /* istanbul ignore else */
  if (indexes) {
    const indexedFields: any[] = [];
    adminItem.indexes = indexes.reduce((filtered, index) => {
      const indexFields: any[] = index.fields.split(",");
      const verifiedFields: string[] = [];
      indexFields.forEach((indexField) => {
        /* istanbul ignore else */
        if (indexedFields.indexOf(indexField) === -1) {
          indexedFields.push(indexField);
          // this is the first index with this field and it should be added if the field exists
          /* istanbul ignore else */
          if (fieldNames.indexOf(indexField) > -1) {
            verifiedFields.push(indexField);
          }
        }
        // else the field has more than one index associated and should not be returned
      });
      /* istanbul ignore else */
      if (verifiedFields.length > 0) {
        index.fields = verifiedFields.join(",");
        filtered.push(index);
      }
      return filtered;
    }, []);
  }
}

/**
 * Remove field references from templates that no longer exist.
 *
 * @param adminItem layer or table from the service
 * @param fieldNames string list of fields names
 * @private
 */
export function _validateTemplatesFields(adminItem: any, fieldNames: string[]): void {
  const templates: any[] = adminItem.templates;
  /* istanbul ignore else */
  if (templates) {
    adminItem.templates = templates.map((template) => {
      const attributes: any = getProp(template, "prototype.attributes");
      /* istanbul ignore else */
      if (attributes) {
        Object.keys(attributes).forEach((k) => {
          /* istanbul ignore else */
          if (fieldNames.indexOf(k) === -1) {
            delete attributes[k];
          }
        });
        setProp(template, "prototype.attributes", attributes);
      }
      return template;
    });
  }
}

/**
 * Remove field references from templates that no longer exist.
 *
 * @param adminItem layer or table from the service
 * @param fieldNames string list of fields names
 * @private
 */
export function _validateTypesTemplates(adminItem: any, fieldNames: string[]): void {
  const types: any[] = adminItem.types;
  /* istanbul ignore else */
  if (types) {
    adminItem.types = types.map((t) => {
      _validateTemplatesFields(t, fieldNames);
      return t;
    });
  }
}

/**
 *  Check if edit feilds exist but with lower case
 *
 * @param adminItem layer or table from the service
 * @param fieldNames string list of fields names
 * @private
 */
export function _validateEditFieldsInfo(adminItem: any, fieldNames: string[]): void {
  const editFieldsInfo: any = adminItem.editFieldsInfo;
  /* istanbul ignore else */
  if (editFieldsInfo) {
    const editFieldsInfoKeys: string[] = Object.keys(editFieldsInfo);
    editFieldsInfoKeys.forEach((k) => {
      const editFieldName: string = editFieldsInfo[k];
      /* istanbul ignore else */
      if (editFieldName) {
        fieldNames.some((name) => {
          if (name === editFieldName) {
            return true;
          } else if (name === editFieldName.toLowerCase()) {
            editFieldsInfo[k] = name;
            return true;
          } else {
            return false;
          }
        });
      }
    });
  }
}

/**
 *
 * Templatize all field references within a layer
 * This is necessary to support potential field name changes when deploying to portal
 * Portal will force all field names to be lower case
 *
 * @param dataItem The data layer instance with field name references within
 * @param itemID The id for the item that contains this layer.
 * @param layer JSON return from the layer being templatized.
 * @param dependencies
 * @returns An updated instance of the layer
 * @private
 */
export function _templatizeLayerFieldReferences(
  dataItem: any,
  itemID: string,
  layer: any,
  dependencies: IDependency[],
): void {
  // This is the value that will be used as the template for adlib replacement
  const path: string = itemID + ".layer" + layer.id + ".fields";

  // Get the field names for various tests
  const fieldNames: string[] = layer.fields.map((f: any) => f.name);

  // Update the layer from the items data property
  if (dataItem) {
    _templatizeAdminLayerInfoFields(dataItem, dependencies);
    _templatizePopupInfo(dataItem, layer, path, itemID, fieldNames);
  }

  // Update the layer
  _templatizeAdminLayerInfoFields(layer, dependencies);
  _templatizeRelationshipFields(layer, itemID);
  _templatizeDefinitionEditor(layer, path, fieldNames);
  _templatizeDefinitionExpression(layer, path, fieldNames);
  _templatizeDrawingInfo(layer, path, fieldNames);
  _templatizeTemplates(layer, path);
  _templatizeTypeTemplates(layer, path);
  _templatizeTimeInfo(layer, path);
  _templatizeDefinitionQuery(layer, path, fieldNames);
}

/**
 * Templatize a layers adminLayerInfo by removing properties that will case issues with clone.
 * Also templatizes the source service name when we are dealing with a view.
 *
 * @param layer The layer to be modified
 * @param dependencies Array of service dependencies
 * @returns A new copy of the modified adminLayerInfo for the given layer
 * @private
 */
export function _templatizeAdminLayerInfo(layer: any, dependencies: IDependency[], templateDictionary: any): any {
  // Create new instance of adminLayerInfo to update for clone
  const adminLayerInfo = Object.assign({}, layer.adminLayerInfo);
  _updateGeomFieldName(adminLayerInfo, templateDictionary);

  deleteProp(adminLayerInfo, "xssTrustedFields");
  deleteProp(adminLayerInfo, "tableName");

  // Remove unnecessary properties and templatize key properties from viewLayerDefinition
  /* istanbul ignore else */
  if (adminLayerInfo.viewLayerDefinition) {
    const viewDef = Object.assign({}, adminLayerInfo.viewLayerDefinition);

    _processAdminObject(viewDef, dependencies);

    // Remove unnecessary properties and templatize key properties from viewLayerDefinition.table
    /* istanbul ignore else */
    if (viewDef.table) {
      _processAdminObject(viewDef.table, dependencies);
      /* istanbul ignore else */
      if (viewDef.table.relatedTables) {
        viewDef.table.relatedTables.forEach((table: any) => {
          _processAdminObject(table, dependencies);
        });
      }
    }

    adminLayerInfo.viewLayerDefinition = viewDef;
  }
  return adminLayerInfo;
}

/**
 * Remove sourceId and templatize the sourceServiceName
 *
 * @param object The layer to be modified
 * @param dependencies Array of service dependencies
 * @private
 */
export function _processAdminObject(object: any, dependencies: IDependency[]): void {
  deleteProp(object, "sourceId");
  if (object.hasOwnProperty("sourceServiceName")) {
    object.sourceServiceName = _templatizeSourceServiceName(object.sourceServiceName, dependencies);
  }
}

/**
 * Templatize the name based on the given dependencies
 *
 * @param lookupName The current name from the source service
 * @param dependencies Array of IDependency for name mapping
 * @returns The templatized name || undefined when no matching dependency is found
 * @private
 */
export function _templatizeSourceServiceName(
  lookupName: string,
  dependencies: IDependency[],
): string | string[] | undefined {
  const deps = dependencies.filter((dependency) => dependency.name === lookupName);
  return deps.length === 1 ? _templatize(deps[0].id, "name") : undefined;
}

/**
 * templatize the fields referenced in adminLayerInfo
 *
 * @param layer the layer object with the adminLayerInfo property to templatize
 * @param basePath path used to de-templatize while deploying
 * @param itemID the id for the item that contains this layer
 * @private
 */
export function _templatizeAdminLayerInfoFields(layer: any, dependencies: IDependency[]): void {
  // templatize the source layer fields
  const table = getProp(layer, "adminLayerInfo.viewLayerDefinition.table");

  if (table) {
    let id: string = _getDependantItemId(table.sourceServiceName, dependencies);
    const path: string = id + ".layer" + table.sourceLayerId + ".fields";

    _templatizeAdminSourceLayerFields(table.sourceLayerFields || [], path);

    // templatize the releated table fields
    const relatedTables = getProp(layer, "adminLayerInfo.viewLayerDefinition.table.relatedTables") || [];

    if (relatedTables.length > 0) {
      relatedTables.forEach((t: any) => {
        id = _getDependantItemId(t.sourceServiceName, dependencies);
        const relatedPath: string = id + ".layer" + t.sourceLayerId + ".fields";

        _templatizeTopFilter(t.topFilter || {}, relatedPath);

        _templatizeAdminSourceLayerFields(t.sourceLayerFields || [], relatedPath);

        const parentKeyFields: any[] = t.parentKeyFields || [];
        t.parentKeyFields = parentKeyFields.map((f: any) => {
          return _templatize(path, f, "name");
        });

        const keyFields: any[] = t.keyFields || [];
        t.keyFields = keyFields.map((f: any) => {
          return _templatize(relatedPath, f, "name");
        });
      });
    }
  }
}

/**
 * find id based on dependency name
 *
 * @param lookupName name of dependency we want to find the id of
 * @param dependencies array of item dependencies
 * @private
 */
export function _getDependantItemId(lookupName: string, dependencies: IDependency[]): string {
  const deps = dependencies.filter((dependency) => dependency.name === lookupName);
  return deps.length === 1 ? deps[0].id : "";
}

/**
 * templatize the sourceLayerFields referenced in adminLayerInfo
 *
 * @param fields array of sourceLayerFields to templatize
 * @param basePath path used to de-templatize while deploying
 * @private
 */
export function _templatizeAdminSourceLayerFields(fields: any[], basePath: string): void {
  fields.forEach((f) => _templatizeProperty(f, "source", basePath, "name"));
}

/**
 * templatize the topFilter property from adminLayerInfo related tables
 *
 * @param topFilter the topFilter object to templatize
 * @param basePath path used to de-templatize while deploying
 * @private
 */
export function _templatizeTopFilter(topFilter: any, basePath: string): void {
  /* istanbul ignore else */
  if (topFilter) {
    // templatize the orderByFields prop
    const orderByFields: string = topFilter["orderByFields"] || "";
    /* istanbul ignore else */
    if (orderByFields !== "") {
      const orderByField = orderByFields.split(" ")[0];
      topFilter.orderByFields = topFilter.orderByFields.replace(
        orderByField,
        _templatize(basePath, orderByField, "name"),
      );
    }

    const groupByFields = topFilter["groupByFields"] || "";
    /* istanbul ignore else */
    if (groupByFields !== "") {
      const _groupByFields = groupByFields.split(",");
      /* istanbul ignore else */
      if (_groupByFields.length > 0) {
        const mappedFields = _groupByFields.map((f: any) => {
          return _templatize(basePath, f, "name");
        });
        topFilter.groupByFields = mappedFields.join(",");
      }
    }
  }
}

/**
 * templatize the relationships key fields using the related table id in the basePath
 *
 * @param layer the layer that has the relationships to templatize
 * @param itemID the id of the item that contains the related table
 * @private
 */
export function _templatizeRelationshipFields(layer: any, itemID: string): void {
  if (layer && layer.relationships) {
    const relationships: any[] = layer.relationships;
    relationships.forEach((r) => {
      /* istanbul ignore else */
      if (r.keyField) {
        const basePath: string = itemID + ".layer" + layer.id + ".fields";
        _templatizeProperty(r, "keyField", basePath, "name");
      }
    });
  }
}

/**
 * templatize the popupInfo
 *
 * @param layerDefinition the layerDefinition that has the popupInfo to templatize
 * @param layer the JSON for the layer being templatized
 * @param basePath path used to de-templatize while deploying
 * @param itemID the id for the item that contains this layer
 * @param fieldNames array of fieldNames
 * @private
 */
export function _templatizePopupInfo(
  layerDefinition: any,
  layer: any,
  basePath: string,
  itemID: any,
  fieldNames: string[],
): void {
  // the data layer does not have the fields...will need to get those
  // from the associated layer json
  if (fieldNames && layerDefinition.popupInfo) {
    const popupInfo: any = layerDefinition.popupInfo;
    _templatizeName(popupInfo, "title", fieldNames, basePath);
    _templatizeName(popupInfo, "description", fieldNames, basePath);

    const fieldInfos: any[] = popupInfo.fieldInfos || [];
    _templatizePopupInfoFieldInfos(fieldInfos, layer, itemID, basePath);

    const expressionInfos: any[] = popupInfo.expressionInfos || [];
    _templatizeExpressionInfos(expressionInfos, fieldNames, basePath);

    const popupElements: any[] = popupInfo.popupElements || [];
    _templatizePopupElements(popupElements, basePath, layer, itemID, fieldNames);

    const mediaInfos: any = popupInfo.mediaInfos || [];
    _templatizeMediaInfos(mediaInfos, fieldNames, basePath, layer, itemID);
  }
}

/**
 * templatize field name when referenced like this: \{\{fieldName\}\}
 * checks each field name from the layer
 *
 * @param object with the property to test for a field name
 * @param property that could have a field name referenced
 * @param fieldNames array for field names for the layer
 * @param basePath path used to de-templatize while deploying
 * @private
 */
export function _templatizeName(object: any, property: string, fieldNames: string[], basePath: string): void {
  if (object.hasOwnProperty(property)) {
    fieldNames.forEach((name) => {
      // Only test and replace instance of the name so any enclosing characters
      // will be retained
      const regEx = new RegExp("(\\b" + name + "\\b(?![}]{2}))", "gm");
      if (regEx.test(object[property])) {
        object[property] = object[property].replace(regEx, _templatize(basePath, name, "name"));
      }
    });
  }
}

/**
 * templatize field name when referenced like this: \{\{fieldName\}\}
 * checks each field name from the layer
 *
 * @param fieldInfos object that contains the popups fieldInfos
 * @param layer json of layer being cloned
 * @param itemID id of the item that contains the current layer
 * @param basePath path used to de-templatize while deploying
 * @private
 */
export function _templatizePopupInfoFieldInfos(fieldInfos: any[], layer: any, itemID: any, basePath: string): void {
  fieldInfos.forEach((f: any) => {
    f.fieldName = _templatizeFieldName(f.fieldName, layer, itemID, basePath);
  });
}

/**
 * templatize field name when referenced like this: \{\{fieldName\}\}
 * checks each field name from the layer
 *
 * @param name the field name to templatize
 * @param layer json of layer being cloned
 * @param itemID id of the item that contains the current layer
 * @param basePath path used to de-templatize while deploying
 * @private
 */
export function _templatizeFieldName(name: string, layer: any, itemID: string, basePath: string): string {
  if (name.indexOf("relationships/") > -1) {
    const rels = name.split("/");
    const relationshipId: any = rels[1];

    const adminRelatedTables: any = getProp(layer, "adminLayerInfo.viewLayerDefinition.table.relatedTables");

    const relatedTables: any[] = layer.relationships || adminRelatedTables;
    /* istanbul ignore else */

    if (relatedTables && relatedTables.length > parseInt(relationshipId, 10)) {
      const relatedTable: any = relatedTables[relationshipId];
      // the layers relationships stores the property as relatedTableId
      // the layers adminLayerInfo relatedTables stores the property as sourceLayerId
      const prop: string = getProp(relatedTable, "relatedTableId") ? "relatedTableId" : "sourceLayerId";
      const _basePath: string = itemID + ".layer" + relatedTable[prop] + ".fields";
      rels[2] = _templatize(_basePath, rels[2], "name");
      name = rels.join("/");
    }
  } else {
    // do not need to templatize expression references as the expression
    // itself will be templatized
    if (name.indexOf("expression/") === -1) {
      name = _templatize(basePath, name, "name");
    }
  }
  return name;
}

/**
 * templatize field name when referenced in expressionInfos
 *
 * @param expressionInfos the popups expressionInfos to check
 * @param fieldNames array of the layers field names
 * @param basePath path used to de-templatize while deploying
 * @private
 */
export function _templatizeExpressionInfos(expressionInfos: any[], fieldNames: string[], basePath: string): any[] {
  return expressionInfos.map((i: any) => {
    fieldNames.forEach((name) => {
      i.expression = _templatizeArcadeExpressions(i.expression, name, basePath);
    });
    return i;
  });
}

/**
 * templatize field name when referenced in popupElelments
 *
 * @param popupElelments the popups popupElelments to check
 * @param basePath path used to de-templatize while deploying
 * @param layer json of layer being cloned
 * @param itemID id of the item that contains the current layer
 * @param fieldNames array of field names
 * @private
 */
export function _templatizePopupElements(
  popupElelments: any[],
  basePath: string,
  layer: any,
  itemID: string,
  fieldNames: any,
): void {
  popupElelments.forEach((pe: any) => {
    if (pe.hasOwnProperty("fieldInfos")) {
      _templatizePopupInfoFieldInfos(pe.fieldInfos, layer, itemID, basePath);
    }

    if (pe.hasOwnProperty("mediaInfos")) {
      _templatizeMediaInfos(pe.mediaInfos, fieldNames, basePath, layer, itemID);
    }
  });
}

/**
 * templatize field name when referenced in mediaInfos
 *
 * @param mediaInfos the popups mediaInfos to check
 * @param fieldNames array of the layers field names
 * @param basePath path used to de-templatize while deploying
 * @param layer json of layer being cloned
 * @param itemID id of the item that contains the current layer
 * @private
 */
export function _templatizeMediaInfos(
  mediaInfos: any,
  fieldNames: string[],
  basePath: string,
  layer: any,
  itemId: string,
): void {
  // templatize various properties of mediaInfos
  const props: string[] = ["title", "caption"];
  props.forEach((p) => _templatizeName(mediaInfos, p, fieldNames, basePath));

  mediaInfos.forEach((mi: any) => {
    /* istanbul ignore else */
    if (mi.hasOwnProperty("value")) {
      const v: any = mi.value;

      const vfields: any[] = v.fields || [];
      v.fields = vfields.map((f) => _templatizeFieldName(f, layer, itemId, basePath));

      if (v.hasOwnProperty("normalizeField")) {
        _templatizeProperty(v, "normalizeField", basePath, "name");
      }

      /* istanbul ignore else */
      if (v.hasOwnProperty("tooltipField")) {
        v.tooltipField = _templatizeFieldName(v.tooltipField, layer, itemId, basePath);
      }
    }
  });
}

/**
 * templatize field names when referenced in definitionEditor
 *
 * @param layer the layer with the definition editor
 * @param basePath path used to de-templatize while deploying
 * @param fieldNames json of layer being cloned
 * @private
 */
export function _templatizeDefinitionEditor(layer: any, basePath: string, fieldNames: string[]): void {
  if (layer) {
    const defEditor: any = layer.definitionEditor || {};
    /* istanbul ignore else */
    if (defEditor) {
      const inputs: any[] = defEditor.inputs;
      if (inputs) {
        inputs.forEach((i) => {
          /* istanbul ignore else */
          if (i.parameters) {
            i.parameters.forEach((p: any) => {
              _templatizeProperty(p, "fieldName", basePath, "name");
            });
          }
        });
      }

      if (defEditor.hasOwnProperty("parameterizedExpression")) {
        defEditor.parameterizedExpression = _templatizeSimpleName(
          defEditor.parameterizedExpression || "",
          basePath,
          fieldNames,
          "name",
        );
      }
    }
  }
}

/**
 * templatize field names when referenced in definitionExpression
 *
 * @param layer the layer with the definition editor
 * @param basePath path used to de-templatize while deploying
 * @param fieldNames array of field names
 * @private
 */
export function _templatizeDefinitionExpression(layer: any, basePath: string, fieldNames: string[]): void {
  if (layer && layer.hasOwnProperty("definitionExpression")) {
    layer.definitionExpression = _templatizeSimpleName(layer.definitionExpression || "", basePath, fieldNames, "name");
  }
}

/**
 * Case sensitive test for field names that appear anywhere within a string
 *
 * @param expression the expression to test for field name references
 * @param basePath path used to de-templatize while deploying
 * @param fieldNames array of the layers field names
 * @private
 */
export function _templatizeSimpleName(
  expression: string,
  basePath: string,
  fieldNames: string[],
  suffix: string,
): string {
  fieldNames.forEach((name) => {
    // look for the name but not if its followed by }}
    const regEx = new RegExp("\\b" + name + "\\b(?![}]{2})", "gm");
    if (expression && regEx.test(expression)) {
      expression = expression.replace(regEx, _templatize(basePath, name, suffix));
    }
  });
  return expression;
}

/**
 * Templatize field references within a layers drawingInfo
 *
 * @param layer the data layer
 * @param basePath path used to de-templatize while deploying
 * @param fieldNames array of the layers field names
 * @private
 */
export function _templatizeDrawingInfo(layer: any, basePath: string, fieldNames: string[]): void {
  if (layer) {
    const drawingInfo: any = layer.drawingInfo;

    if (drawingInfo) {
      // templatize the renderer fields
      const renderer: any = drawingInfo.renderer || {};
      _templatizeRenderer(renderer, basePath, fieldNames);

      // templatize the labelingInfo
      const labelingInfo: any = drawingInfo.labelingInfo || [];
      _templatizeLabelingInfo(labelingInfo, basePath, fieldNames);
    }
  }
}

/**
 * Templatize field references within a layers drawingInfo
 *
 * @param renderer the layers renderer
 * @param basePath path used to de-templatize while deploying
 * @param fieldNames array of the layers field names
 * @private
 */
export function _templatizeRenderer(renderer: any, basePath: string, fieldNames: string[]): void {
  switch (renderer.type) {
    case "classBreaks":
    case "uniqueValue":
    case "predominance":
    case "simple":
    case "heatmap":
      _templatizeGenRenderer(renderer, basePath, fieldNames);
      break;
    case "temporal":
      _templatizeTemporalRenderer(renderer, basePath, fieldNames);
      break;
    default:
      break;
  }
}

/**
 * Templatize field references within a layers renderer
 *
 * @param renderer the renderer object to check for field references
 * @param basePath path used to de-templatize while deploying
 * @param fieldNames array of field names that will be used to search expressions
 * @private
 */
export function _templatizeGenRenderer(renderer: any, basePath: string, fieldNames: string[]): void {
  /* istanbul ignore else */
  if (renderer) {
    // update authoringInfo
    const authoringInfo: any = renderer.authoringInfo;
    if (authoringInfo) {
      _templatizeAuthoringInfo(authoringInfo, basePath, fieldNames);
    }

    const props: string[] = ["field", "normalizationField"];
    props.forEach((p) => _templatizeProperty(renderer, p, basePath, "name"));

    const fieldNameProps: string[] = ["field1", "field2", "field3"];
    fieldNameProps.forEach((fnP) => _templatizeProperty(renderer, fnP, basePath, "name"));

    // When an attribute name is specified, it's enclosed in square brackets
    const rExp: string = renderer.rotationExpression;
    if (rExp) {
      fieldNames.forEach((name) => {
        const regEx = new RegExp("(\\[" + name + "\\])", "gm");
        if (regEx.test(rExp)) {
          renderer.rotationExpression = rExp.replace(regEx, "[" + _templatize(basePath, name, "name") + "]");
        }
      });
    }

    // update valueExpression
    if (renderer.valueExpression) {
      fieldNames.forEach((name) => {
        renderer.valueExpression = _templatizeArcadeExpressions(renderer.valueExpression, name, basePath);
      });
    }

    // update visualVariables
    const visualVariables: any[] = renderer.visualVariables;
    if (visualVariables) {
      visualVariables.forEach((v) => {
        props.forEach((p) => _templatizeProperty(v, p, basePath, "name"));
        if (v.valueExpression) {
          fieldNames.forEach((name) => {
            v.valueExpression = _templatizeArcadeExpressions(v.valueExpression, name, basePath);
          });
        }
      });
    }
  }
}

/**
 * Templatize field references within a layers renderer
 *
 * @param renderer the renderer object to check for field references
 * @param basePath path used to de-templatize while deploying
 * @param fieldNames array of field names that will be used to search expressions
 * @private
 */
export function _templatizeTemporalRenderer(renderer: any, basePath: string, fieldNames: string[]): void {
  const renderers: any[] = [renderer.latestObservationRenderer, renderer.observationRenderer, renderer.trackRenderer];

  renderers.forEach((r) => {
    _templatizeRenderer(r, basePath, fieldNames);
  });
}

/**
 * Templatize renderers authoringInfo
 *
 * @param authoringInfo  object containing metadata about the authoring process
 * @param basePath path used to de-templatize while deploying
 * @param fieldNames the name of fields from the layer
 * @private
 */
export function _templatizeAuthoringInfo(authoringInfo: any, basePath: string, fieldNames: string[]): void {
  /* istanbul ignore else */
  if (authoringInfo) {
    const props: string[] = ["field", "normalizationField"];

    const field1: any = authoringInfo.field1;
    props.forEach((p) => _templatizeProperty(field1, p, basePath, "name"));

    const field2: any = authoringInfo.field2;
    props.forEach((p) => _templatizeProperty(field2, p, basePath, "name"));

    const fields: any[] = authoringInfo.fields;
    if (fields) {
      authoringInfo.fields = fields.map((f) => _templatize(basePath, f, "name"));
    }

    const vProps: string[] = ["endTime", "field", "startTime"];
    const vVars: any = authoringInfo.visualVariables;
    if (vVars) {
      vProps.forEach((p) => {
        // endTime and startTime may or may not be a field name
        if (fieldNames.indexOf(vVars[p]) > -1) {
          _templatizeProperty(vVars, p, basePath, "name");
        }
      });
    }
  }
}

/**
 * Templatize field references within an arcade expression
 *
 * @param text the text that contains the expression
 * @param fieldName name of the field to test for
 * @param basePath path used to de-templatize while deploying
 * @private
 */
export function _templatizeArcadeExpressions(text: string, fieldName: string, basePath: string): string {
  const t = _templatize(basePath, fieldName, "name");

  if (text) {
    // test for $feature. notation
    // captures VOTED_DEM_2012 from $feature.VOTED_DEM_2012
    let exp: string = "(?:\\$feature\\.)(" + fieldName + ")\\b";
    let regEx = new RegExp(exp, "gm");
    text = regEx.test(text) ? text.replace(regEx, "$feature." + t) : text;

    // test for $feature[] notation
    // captures VOTED_DEM_2012 from $feature["VOTED_DEM_2012"]
    // captures VOTED_DEM_2012 from $feature['VOTED_DEM_2012']
    // captures VOTED_DEM_2012 from $feature[VOTED_DEM_2012]
    exp = "(?:[$]feature)(\\[\\\"?\\'?)" + fieldName + "(\\\"?\\'?\\])";
    regEx = new RegExp(exp, "gm");
    let result = regEx.exec(text);
    if (result) {
      text = text.replace(regEx, "$feature" + result[1] + t + result[2]);
    }

    // test for $feature[] with join case
    // captures VOTED_DEM_2016 from $feature["COUNTY_ID.VOTED_DEM_2016"]
    exp = "(?:[$]feature)(\\[\\\"?\\'?)(\\w+)[.]" + fieldName + "(\\\"?\\'?\\])";
    regEx = new RegExp(exp, "gm");
    result = regEx.exec(text);
    if (result && result.length > 3) {
      // TODO result[2] is the table name...this needs to be templatized as well
      text = text.replace(regEx, "$feature" + result[1] + result[2] + "." + t + result[3]);
    }

    // test for "fieldName"
    // captures fieldName from "var names = ["fieldName", "fieldName2"]..."
    // captures fieldName from "var names = ['fieldName', 'fieldName2']..."
    exp = "(\\\"|\\')+" + fieldName + "(\\\"|\\')+";
    regEx = new RegExp(exp, "gm");
    result = regEx.exec(text);
    if (result) {
      text = text.replace(regEx, result[1] + t + result[2]);
    }
  }
  return text;
}

/**
 * templatize field names when referenced in the layers labelingInfo
 *
 * @param labelingInfo the object that contains the labelingInfo
 * @param basePath path used to de-templatize while deploying
 * @param fieldNames array of the layers field names
 * @private
 */
export function _templatizeLabelingInfo(labelingInfo: any, basePath: string, fieldNames: string[]): void {
  labelingInfo.forEach((li: any) => {
    /* istanbul ignore else */
    if (li.hasOwnProperty("fieldInfos")) {
      const fieldInfos: any[] = li.fieldInfos || [];
      fieldInfos.forEach((fi) => _templatizeProperty(fi, "fieldName", basePath, "name"));
    }

    const labelExp: string = li.labelExpression || "";
    const labelExpInfo: any = li.labelExpressionInfo || {};
    fieldNames.forEach((n) => {
      const t: string = _templatize(basePath, n, "name");

      // check for [fieldName] or ["fieldName"]
      const regExBracket = new RegExp('(\\[\\"*)+(' + n + ')(\\"*\\])+', "gm");
      let result = regExBracket.exec(labelExp);
      if (result) {
        li.labelExpression = labelExp.replace(regExBracket, result[1] + t + result[3]);
      }
      /* istanbul ignore else */
      if (labelExpInfo.value) {
        let v = labelExpInfo.value;
        // check for {fieldName}
        const regExCurly = new RegExp("(\\{" + n + "\\})", "gm");
        v = regExCurly.test(v) ? v.replace(regExCurly, "{" + t + "}") : v;

        // check for [fieldName] or ["fieldName"]
        result = regExBracket.exec(v);
        v = result ? v.replace(regExBracket, result[1] + t + result[3]) : v;

        li.labelExpressionInfo.value = v;
      }
      /* istanbul ignore else */
      if (labelExpInfo.expression) {
        li.labelExpressionInfo.expression = _templatizeArcadeExpressions(labelExpInfo.expression, n, basePath);
      }
    });
  });
}

/**
 * templatize the layers editing templates
 *
 * @param layer the data layer being cloned
 * @param basePath path used to de-templatize while deploying
 * @private
 */
export function _templatizeTemplates(layer: any, basePath: string): void {
  const templates: any[] = layer.templates || [];
  templates.forEach((t) => {
    const attributes: any = getProp(t, "prototype.attributes");
    const _attributes: any = _templatizeKeys(attributes, basePath, "name");
    /* istanbul ignore else */
    if (_attributes) {
      t.prototype.attributes = _attributes;
    }
  });
}

/**
 * templatize the layer types and templates
 *
 * @param layer the data layer being cloned
 * @param basePath path used to de-templatize while deploying
 * @private
 */
export function _templatizeTypeTemplates(layer: any, basePath: string): void {
  const types: any[] = layer.types;
  if (types && Array.isArray(types) && types.length > 0) {
    types.forEach((type: any) => {
      const domains: any = _templatizeKeys(type.domains, basePath, "name");
      /* istanbul ignore else */
      if (domains) {
        type.domains = domains;
      }

      const templates: any[] = type.templates;
      /* istanbul ignore else */
      if (templates && templates.length > 0) {
        templates.forEach((t: any) => {
          const attributes = getProp(t, "prototype.attributes");
          const _attributes: any = _templatizeKeys(attributes, basePath, "name");
          /* istanbul ignore else */
          if (_attributes) {
            t.prototype.attributes = _attributes;
          }
        });
      }
    });
  }
}

/**
 * templatize object keys
 *
 * @param obj the object to templatize
 * @param basePath path used to de-templatize while deploying
 * @param suffix expected suffix for template variable
 * @private
 */
export function _templatizeKeys(obj: any, basePath: string, suffix: string): any {
  let _obj: any;
  /* istanbul ignore else */
  if (obj) {
    _obj = {};
    const objKeys: string[] = Object.keys(obj);
    /* istanbul ignore else */
    if (objKeys && objKeys.length > 0) {
      objKeys.forEach((k) => {
        _obj[_templatize(basePath, k, suffix)] = obj[k];
      });
    }
  }

  return _obj;
}

/**
 * templatize fields referenced in the layers time info
 *
 * @param layer the data layer being cloned
 * @param basePath path used to de-templatize while deploying
 * @private
 */
export function _templatizeTimeInfo(layer: any, basePath: string): void {
  if (layer.timeInfo) {
    const timeInfo: any = layer.timeInfo;
    const timeProps: string[] = ["endTimeField", "startTimeField", "trackIdField"];
    timeProps.forEach((t) => {
      if (timeInfo[t] !== "") {
        _templatizeProperty(timeInfo, t, basePath, "name");
      } else {
        timeInfo[t] = null;
      }
    });
  }
}

/**
 * templatize the layers definition query
 *
 * @param layer the data layer being cloned
 * @param basePath path used to de-templatize while deploying
 * @param fieldNames array of the layers field names
 * @private
 */
export function _templatizeDefinitionQuery(layer: any, basePath: string, fieldNames: string[]): void {
  // templatize view definition query
  if (layer && layer.hasOwnProperty("viewDefinitionQuery")) {
    layer.viewDefinitionQuery = _templatizeSimpleName(layer.viewDefinitionQuery || "", basePath, fieldNames, "name");
  }
  if (layer && layer.hasOwnProperty("definitionQuery")) {
    layer.definitionQuery = _templatizeSimpleName(layer.definitionQuery || "", basePath, fieldNames, "name");
  }
}

/**
 * Helper function to create the name mapping used to
 * de-templatize the field reference
 *
 * @param fieldInfos the object that stores the cached information
 * @param id the id for the current layer being processed
 * @private
 */
export function _getNameMapping(fieldInfos: any, id: string): any {
  // create name mapping
  const fInfo: any = fieldInfos[id];
  const nameMapping: IStringValuePair = {};
  const newFields = fInfo.newFields;
  const newFieldNames: string[] = newFields ? newFields.map((f: any) => f.name) : [];
  const sourceFields: any[] = fInfo.sourceFields || [];
  sourceFields.forEach((field: any) => {
    const lName = String(field.name).toLowerCase();
    newFields.forEach((f: any) => {
      // Names can change more than case
      if (newFieldNames.indexOf(field.name) === -1 && newFieldNames.indexOf(lName) === -1) {
        // If both new (f) and source (field) aliases are defined and are equal, map the source name to the new name
        if (f.alias && f.alias === field.alias) {
          nameMapping[lName] = {
            name: f.name,
            alias: f.alias,
            type: f.type ? f.type : "",
          };
        }
      }
      if (String(f.name).toLowerCase() === lName) {
        nameMapping[lName] = {
          name: f.name,
          alias: f.alias ? f.alias : "",
          type: f.type ? f.type : "",
        };
      }
    });
  });

  // update for editFieldsInfo
  if (fInfo.editFieldsInfo && fInfo.newEditFieldsInfo) {
    const efi: any = JSON.parse(JSON.stringify(fInfo.editFieldsInfo));
    const newEfi: any = JSON.parse(JSON.stringify(fInfo.newEditFieldsInfo));
    const nameMappingKeys: string[] = Object.keys(nameMapping);
    Object.keys(efi).forEach((k) => {
      const lowerEfi: string = String(efi[k]).toLowerCase();
      if (
        (nameMappingKeys.indexOf(lowerEfi) === -1 || nameMapping[lowerEfi].name !== newEfi[k]) &&
        newFieldNames.indexOf(lowerEfi) > -1
      ) {
        // Only add delete fields if source schema changes allowed
        /* istanbul ignore else */
        if (fInfo.sourceSchemaChangesAllowed && !fInfo.isView) {
          /* istanbul ignore else */
          if (!fInfo.hasOwnProperty("deleteFields")) {
            fInfo.deleteFields = [];
          }
          // This issue only occurs on portal so we
          // need to delete the lcase version of the field
          fInfo.deleteFields.push(lowerEfi);
        }

        // editFieldsInfo only has the name and not the alias and type
        let sourceEfiField: any;
        fInfo.sourceFields.some((sf: any) => {
          if (sf.name === efi[k]) {
            sourceEfiField = sf;
          }
          return sf.name === efi[k];
        });
        nameMapping[lowerEfi] = {
          name: newEfi[k],
          alias: sourceEfiField && sourceEfiField.alias ? sourceEfiField.alias : "",
          type: sourceEfiField && sourceEfiField.type ? sourceEfiField.type : "",
        };
      }
    });

    deleteProp(fInfo, "sourceSchemaChangesAllowed");
    deleteProp(fInfo, "editFieldsInfo");
    deleteProp(fInfo, "newEditFieldsInfo");
    deleteProp(fInfo, "isView");
  }
  return nameMapping;
}

//#endregion

export interface IPopupInfos {
  layers: INumberValuePair;
  tables: INumberValuePair;
}

/**
 * Helper function to ensure same chunk size value is used in multiple locations
 *
 * @returns a number that represents how many layers should be included per addToDef call
 * @private
 */
export function _getLayerChunkSize() {
  return 20;
}
