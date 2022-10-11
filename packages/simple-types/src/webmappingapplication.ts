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

import * as common from "@esri/solution-common";

// ------------------------------------------------------------------------------------------------------------------ //

/**
 * Converts a web mapping application item into a template.
 *
 * @param itemInfo Info about the item
 * @param destAuthentication Credentials for requests to the destination organization
 * @param srcAuthentication Credentials for requests to source items
 * @param templateDictionary Hash of key details used for variable replacement
 * @returns A promise that will resolve when the template has been created
 */
export function convertItemToTemplate(
  itemTemplate: common.IItemTemplate,
  destAuthentication: common.UserSession,
  srcAuthentication: common.UserSession,
  templateDictionary: any
): Promise<common.IItemTemplate> {
  return new Promise<common.IItemTemplate>((resolve, reject) => {
    // Remove org base URL and app id, e.g.,
    //   http://anOrg.maps.arcgis.com/apps/CrowdsourcePolling/index.html?appid=6fc5992522d34a6b5ce80d17835eea21
    // to
    //   <placeholder(SERVER_NAME)>/apps/CrowdsourcePolling/index.html?appid={{<itemId>.id}}
    // Need to add placeholder server name because otherwise AGOL makes URL null
    let portalUrl: string = "";
    if (itemTemplate.item.url) {
      const templatizedUrl = itemTemplate.item.url;
      const iSep = templatizedUrl.indexOf("//");
      itemTemplate.item.url =
        common.placeholder(common.SERVER_NAME) + // add placeholder server name
        templatizedUrl.substring(
          templatizedUrl.indexOf("/", iSep + 2),
          templatizedUrl.lastIndexOf("=") + 1
        ) +
        itemTemplate.item.id; // templatized id

      portalUrl = templatizedUrl.replace(
        templatizedUrl.substring(templatizedUrl.indexOf("/", iSep + 2)),
        ""
      );
    }

    // Extract dependencies
    itemTemplate.dependencies = _extractDependencies(itemTemplate);

    // Set the folder
    common.setProp(itemTemplate, "data.folderId", "{{folderId}}");
    // Set the map or group after we've extracted them as dependencies
    _templatizeIdPaths(itemTemplate, [
      "data.map.itemId",
      "data.map.appProxy.mapItemId",
      "data.values.webmap",
      "data.values.group"
    ]);

    // force the appItemId to be pulled directly from the template item
    // this is to address solution.js #124
    _templatizeIdPath(itemTemplate, "data.appItemId", itemTemplate.itemId);

    setValues(
      itemTemplate,
      [
        "data.logo",
        "data.map.portalUrl",
        "data.portalUrl",
        "data.httpProxy.url"
      ],
      common.placeholder(common.SERVER_NAME)
    );

    common.setProp(
      itemTemplate,
      "data.geometryService",
      common.placeholder(common.GEOMETRY_SERVER_NAME)
    );

    templatizeDatasources(itemTemplate, srcAuthentication, portalUrl, templateDictionary).then(
      () => {
        templatizeWidgets(
          itemTemplate,
          srcAuthentication,
          portalUrl,
          "data.widgetPool.widgets"
        ).then(
          _itemTemplate => {
            templatizeWidgets(
              _itemTemplate,
              srcAuthentication,
              portalUrl,
              "data.widgetOnScreen.widgets",
              true
            ).then(
              updatedItemTemplate => {
                templatizeValues(
                  updatedItemTemplate,
                  srcAuthentication,
                  portalUrl,
                  "data.values"
                ).then(
                  _updatedItemTemplate => {
                    resolve(_updatedItemTemplate);
                  },
                  e => reject(common.fail(e))
                );
              },
              e => reject(common.fail(e))
            );
          },
          e => reject(common.fail(e))
        );
      },
      e => reject(common.fail(e))
    );
  });
}

/**
 * Converts web mapping application datasources to variables for deployment
 *
 * @param itemTemplate The solution item template
 * @param authentication Credentials for requests
 * @param portalUrl Rest Url of the portal to perform the search
 * @param templateDictionary Hash of key details used for variable replacement
 * @returns A promise that will resolve with the created template
 */
export function templatizeDatasources(
  itemTemplate: common.IItemTemplate,
  authentication: common.UserSession,
  portalUrl: string,
  templateDictionary: any
): Promise<common.IItemTemplate> {
  return new Promise<common.IItemTemplate>((resolve, reject) => {
    const dataSources: any = common.getProp(
      itemTemplate,
      "data.dataSource.dataSources"
    );
    if (dataSources && Object.keys(dataSources).length > 0) {
      const pendingRequests = new Array<Promise<void>>();
      Object.keys(dataSources).forEach(k => {
        const ds: any = dataSources[k];
        common.setProp(ds, "portalUrl", common.placeholder(common.SERVER_NAME));
        const itemId: any = common.getProp(ds, "itemId");
        if (common.getProp(ds, "url")) {
          if (itemId) {
            const layerId = ds.url.substr(
              (ds.url as string).lastIndexOf("/") + 1
            );
            common.cacheLayerInfo(layerId.toString(), itemId, ds.url, templateDictionary);
            ds.itemId = common.templatizeTerm(
              itemId,
              itemId,
              ".layer" + layerId + ".itemId"
            );
          }
          const urlResults: any = findUrls(
            ds.url,
            portalUrl,
            [],
            [],
            authentication
          );
          pendingRequests.push(
            new Promise<void>((resolveReq, rejectReq) => {
              handleServiceRequests(
                urlResults.serviceRequests,
                urlResults.requestUrls,
                urlResults.testString
              ).then(
                response => {
                  ds.url = response;
                  resolveReq();
                },
                e => rejectReq(common.fail(e))
              );
            })
          );
        } else {
          if (itemId) {
            ds.itemId = common.templatizeTerm(itemId, itemId, ".itemId");
          }
        }
      });
      Promise.all(pendingRequests).then(
        () => resolve(itemTemplate),
        e => reject(common.fail(e))
      );
    } else {
      resolve(itemTemplate);
    }
  });
}

export function templatizeWidgets(
  itemTemplate: common.IItemTemplate,
  authentication: common.UserSession,
  portalUrl: string,
  widgetPath: string,
  isOnScreen = false
): Promise<common.IItemTemplate> {
  return new Promise<common.IItemTemplate>((resolve, reject) => {
    // update widgets
    const widgets: any[] = common.getProp(itemTemplate, widgetPath) || [];
    let serviceRequests: any[] = [];
    let requestUrls: string[] = [];

    widgets.forEach(widget => {
      /* istanbul ignore else */
      if (!isOnScreen && common.getProp(widget, "icon")) {
        setValues(widget, ["icon"], common.placeholder(common.SERVER_NAME));
      }
      const config: any = widget.config;
      if (config) {
        const sConfig: string = JSON.stringify(config);
        const urlResults: any = findUrls(
          sConfig,
          portalUrl,
          requestUrls,
          serviceRequests,
          authentication
        );

        widget.config = JSON.parse(urlResults.testString);
        serviceRequests = urlResults.serviceRequests;
        requestUrls = urlResults.requestUrls;
      }
    });

    if (serviceRequests.length > 0) {
      const sWidgets: string = JSON.stringify(widgets);
      handleServiceRequests(serviceRequests, requestUrls, sWidgets).then(
        response => {
          common.setProp(itemTemplate, widgetPath, JSON.parse(response));
          resolve(itemTemplate);
        },
        e => reject(common.fail(e))
      );
    } else {
      resolve(itemTemplate);
    }
  });
}

export function templatizeValues(
  itemTemplate: common.IItemTemplate,
  authentication: common.UserSession,
  portalUrl: string,
  widgetPath: string
): Promise<common.IItemTemplate> {
  return new Promise<common.IItemTemplate>((resolve, reject) => {
    // update properties of values collection for web app templates
    let values: any = common.getProp(itemTemplate, widgetPath);
    let serviceRequests: any[] = [];
    let requestUrls: string[] = [];

    if (values) {
      if (common.getProp(values, "icon")) {
        setValues(values, ["icon"], common.placeholder(common.SERVER_NAME));
      }

      const sConfig: string = JSON.stringify(values);
      const urlResults: any = findUrls(
        sConfig,
        portalUrl,
        requestUrls,
        serviceRequests,
        authentication
      );

      values = JSON.parse(urlResults.testString);
      serviceRequests = urlResults.serviceRequests;
      requestUrls = urlResults.requestUrls;
    }

    if (serviceRequests.length > 0) {
      const sWidgets: string = JSON.stringify(values);
      handleServiceRequests(serviceRequests, requestUrls, sWidgets).then(
        response => {
          common.setProp(itemTemplate, widgetPath, JSON.parse(response));
          resolve(itemTemplate);
        },
        e => reject(common.fail(e))
      );
    } else {
      resolve(itemTemplate);
    }
  });
}

export function handleServiceRequests(
  serviceRequests: any[],
  requestUrls: string[],
  objString: string
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (serviceRequests && serviceRequests.length > 0) {
      let i: number = 0;
      Promise.all(serviceRequests).then(
        serviceResponses => {
          serviceResponses.forEach(serviceResponse => {
            if (common.getProp(serviceResponse, "serviceItemId")) {
              const serviceTemplate: string =
                "{{" +
                serviceResponse.serviceItemId +
                (serviceResponse.hasOwnProperty("id")
                  ? ".layer" + serviceResponse.id
                  : "") +
                ".url}}";
              objString = replaceUrl(
                objString,
                requestUrls[i],
                serviceTemplate,
                true
              );
            }
            i++;
          });
          resolve(objString);
        },
        e => reject(common.fail(e))
      );
    } else {
      resolve(objString);
    }
  });
}

export function findUrls(
  testString: string,
  portalUrl: string,
  requestUrls: string[],
  serviceRequests: any[],
  authentication: common.UserSession
) {
  const options: any = {
    f: "json",
    authentication: authentication
  };
  // test for URLs
  const results = testString.match(/(\bhttps?:\/\/[-A-Z0-9/._]*)/gim);
  if (results && results.length) {
    results.forEach((url: string) => {
      if (url.indexOf("NAServer") > -1) {
        testString = replaceUrl(
          testString,
          url,
          common.placeholder(common.NA_SERVER_NAME)
        );
      } else if (url.indexOf("GeocodeServer") > -1) {
        testString = replaceUrl(
          testString,
          url,
          common.placeholder(common.GEOCODE_SERVER_NAME)
        );
      } else if (portalUrl && url.indexOf(portalUrl) > -1) {
        testString = replaceUrl(
          testString,
          portalUrl,
          common.placeholder(common.SERVER_NAME)
        );
      } else if (url.indexOf("FeatureServer") > -1) {
        if (requestUrls.indexOf(url) === -1) {
          requestUrls.push(url);
          serviceRequests.push(common.rest_request(url, options));
        }
      }
    });
  }
  return {
    testString,
    requestUrls,
    serviceRequests
  };
}

/**
 * Replace url with templatized url value
 *
 * @param obj can be a single url string or a stringified JSON object
 * @param url the current url we are testing for
 * @param newUrl the templatized url
 * @param validateFullUrl should only replace url when we have a full match.
 * This property is only relevant when the obj is a stringified JSON object.
 *
 * @returns the obj with any instances of the url replaced
 */
export function replaceUrl(
  obj: string,
  url: string,
  newUrl: string,
  validateFullUrl: boolean = false
) {
  const enforceFullUrl: boolean = validateFullUrl && obj.indexOf('"') > -1;
  const re = new RegExp(enforceFullUrl ? '"' + url + '"' : url, "gmi");
  return obj.replace(re, enforceFullUrl ? '"' + newUrl + '"' : newUrl);
}

export function setValues(
  itemTemplate: common.IItemTemplate,
  paths: string[],
  base: string
) {
  paths.forEach(path => {
    const url: string = common.getProp(itemTemplate, path);
    if (url) {
      const subString: string = url.substring(
        url.indexOf("/", url.indexOf("//") + 2)
      );
      common.setProp(
        itemTemplate,
        path,
        subString !== url ? base + subString : base
      );
    }
  });
}

export function fineTuneCreatedItem(
  originalTemplate: common.IItemTemplate,
  newlyCreatedItem: common.IItemTemplate,
  templateDictionary: any,
  destinationAuthentication: common.UserSession
): Promise<void> {
  return new Promise<void>(resolve => {
    // If this is a Web AppBuilder application, we will create a Code Attachment for downloading
    if (
      common.hasAnyKeyword(originalTemplate, [
        "WAB2D",
        "WAB3D",
        "Web AppBuilder"
      ])
    ) {
      // Update item so properties like appItemId can now be set now that we know the new apps ID
      const updateOptions: common.IItemUpdate = {
        id: newlyCreatedItem.itemId,
        url: newlyCreatedItem.item.url,
        data: newlyCreatedItem.data
      };
      const updateDef = common.updateItem(
        updateOptions,
        destinationAuthentication
      );

      const itemInfo = {
        tags: originalTemplate.item.tags,
        title: originalTemplate.item.title,
        type: "Code Attachment",
        typeKeywords: ["Code", "Javascript", "Web Mapping Application"],
        relationshipType: "WMA2Code",
        originItemId: newlyCreatedItem.itemId,
        url:
          common.checkUrlPathTermination(
            common.replaceInTemplate(
              common.placeholder(common.SERVER_NAME),
              templateDictionary
            )
          ) +
          "sharing/rest/content/items/" +
          newlyCreatedItem.itemId +
          "/package"
      };

      const createItemWithDataDef = common.createItemWithData(
        itemInfo,
        {},
        destinationAuthentication,
        templateDictionary.folderId
      );

      Promise.all([updateDef, createItemWithDataDef]).then(
        () => resolve(null),
        () => resolve(null)
      );
    } else {
      // Otherwise, nothing extra needed
      resolve(null);
    }
  });
}

// ------------------------------------------------------------------------------------------------------------------ //

/**
 * Gets the ids of the dependencies of an AGOL webapp item.
 *
 * @param fullItem A webapp item whose dependencies are sought
 * @returns A promise that will resolve with list of dependent ids
 * @private
 */
export function _extractDependencies(model: any): string[] {
  let processor = _getGenericWebAppDependencies;

  /*
  if (common.hasTypeKeyword(model, "Story Map")) {
    processor = getStoryMapDependencies;
  }
  */

  if (common.hasAnyKeyword(model, ["WAB2D", "WAB3D", "Web AppBuilder"])) {
    processor = _getWABDependencies;
  }

  return processor(model);
}

/**
 * Generic Web App Dependencies
 *
 * @private
 */
export function _getGenericWebAppDependencies(model: any): any {
  const props = ["data.values.webmap", "data.values.group"];
  return common.getProps(model, props);
}

//???
export function _getWABDependencies(model: any): string[] {
  const deps = [] as string[];
  const v = common.getProp(model, "data.map.itemId");
  if (v) {
    deps.push(v);
  }
  const dataSources = common.getProp(model, "data.dataSource.dataSources");
  if (dataSources) {
    Object.keys(dataSources).forEach(k => {
      const ds: any = dataSources[k];
      if (ds.itemId) {
        deps.push(ds.itemId);
      }
    });
  }
  return deps;
}

/**
 * Templatizes id properties for the paths provided
 *
 * @param itemTemplate The solution item template
 * @param paths A list of property paths that contain ids
 * @private
 */
export function _templatizeIdPaths(
  itemTemplate: common.IItemTemplate,
  paths: string[]
) {
  paths.forEach(path => {
    const id: any = common.getProp(itemTemplate, path);
    _templatizeIdPath(itemTemplate, path, id);
  });
}

/**
 * Templatizes id property for the path provided
 *
 * @param itemTemplate The solution item template
 * @param path A path to an id property
 * @param id The base id to use when templatizing
 * @private
 */
export function _templatizeIdPath(
  itemTemplate: common.IItemTemplate,
  path: string,
  id: string
) {
  common.setProp(itemTemplate, path, common.templatizeTerm(id, id, ".itemId"));
}

/**
 * Templatize field references for datasources and widgets.
 *
 * @param solutionTemplate The solution item template
 * @param datasourceInfos A list of datasource info objects that contain key values to templatize field references
 * @returns The solutionTemplate with templatized field references
 */
export function postProcessFieldReferences(
  solutionTemplate: common.IItemTemplate,
  datasourceInfos: common.IDatasourceInfo[]
): common.IItemTemplate {
  // handle datasources common for WAB apps
  const dataSources: any = common.getProp(
    solutionTemplate,
    "data.dataSource.dataSources"
  );
  if (dataSources && Object.keys(dataSources).length > 0) {
    Object.keys(dataSources).forEach(k => {
      const ds: any = dataSources[k];
      dataSources[k] = _templatizeObject(ds, datasourceInfos);
    });
    common.setProp(
      solutionTemplate,
      "data.dataSource.dataSources",
      dataSources
    );
  }

  // handle widgets common for WAB apps
  const paths: string[] = [
    "data.widgetPool.widgets",
    "data.widgetOnScreen.widgets"
  ];
  paths.forEach(path => {
    const widgets = common.getProp(solutionTemplate, path);
    if (widgets) {
      common.setProp(
        solutionTemplate,
        path,
        _templatizeObjectArray(widgets, datasourceInfos)
      );
    }
  });

  // handle values common for web app templates
  const values: any = common.getProp(solutionTemplate, "data.values");
  if (values) {
    common.setProp(
      solutionTemplate,
      "data.values",
      _templatizeObject(values, datasourceInfos)
    );
  }

  return solutionTemplate;
}

/**
 * Templatize field references for given dataSource from the web application.
 *
 * @param obj The dataSource or widget object from the web application.
 * @param datasourceInfos A list of datasource info objects that contain key values to templatize field references
 * @returns The dataSource with templatized field references
 * @private
 */
export function _templatizeObject(
  obj: any,
  datasourceInfos: common.IDatasourceInfo[],
  templatizeKeys: boolean = false
): any {
  obj = _prioritizedTests(obj, datasourceInfos, templatizeKeys);
  const replaceOrder: common.IDatasourceInfo[] = _getReplaceOrder(
    obj,
    datasourceInfos
  );
  replaceOrder.forEach(ds => {
    obj = common.templatizeFieldReferences(
      obj,
      ds.fields,
      ds.basePath,
      templatizeKeys
    );
  });
  return obj;
}

/**
 * Templatize field references from an array of various objects from the web application.
 *
 * @param objects A list of widgets or objects from the web application that may contain field references.
 * @param datasourceInfos A list of datasource info objects that contain key values to templatize field references
 * @returns The widgets with templatized field references
 * @private
 */
export function _templatizeObjectArray(
  objects: any[],
  datasourceInfos: common.IDatasourceInfo[]
): any {
  const updateKeyObjects: string[] = ["SmartEditor", "Screening"];
  return objects.map(obj => {
    // only templatize the config and lower
    if (obj.config) {
      const templatizeKeys: boolean = updateKeyObjects.indexOf(obj.name) > -1;
      obj.config = _templatizeObject(
        obj.config,
        datasourceInfos,
        templatizeKeys
      );
    }
    return obj;
  });
}

/**
 * Gets an order for testing wit the various datasource info objects against the widget or dataSource.
 * A widget or dataSource that contain a layers url or webmap layer id are more likely
 * to have field references from that layer.
 *
 * @param obj The dataSource or widget object from the web application.
 * @param datasourceInfos A list of datasource info objects that contain key values to templatize field references
 * @returns A list of datasourceInfo objects sorted based on the presence of a layers url or id
 * @private
 */
export function _getReplaceOrder(
  obj: any,
  datasourceInfos: common.IDatasourceInfo[]
) {
  const objString: string = JSON.stringify(obj);

  // If we don't find any layer url, web map layer id, service url, agol itemId then remove the datasource.
  const _datasourceInfos: common.IDatasourceInfo[] = datasourceInfos.filter(
    ds => _getSortOrder(ds, objString) < 4
  );
  return _datasourceInfos.sort((a, b) => {
    return _getSortOrder(a, objString) - _getSortOrder(b, objString);
  });
}

/**
 * Determine an order for checking field names against a dataSource or widget.
 * Sort order preference is set in this order: layer url, web map layer id, service url, agol itemId
 *
 * @param datasourceInfo The datasource object with key properties about the service.
 * @param testString A stringified version of a widget or dataSource
 * @returns The prioritized order for testing
 * @private
 */
export function _getSortOrder(
  datasourceInfo: common.IDatasourceInfo,
  testString: string
): number {
  const url = datasourceInfo.url;
  const itemId = datasourceInfo.itemId;
  const layerId = datasourceInfo.layerId;

  // if we have the url and the layerID and its found prioritize it first
  // else if we find the maps layer id prioritze it first
  let layerUrlTest: any;
  if (url && !isNaN(layerId)) {
    layerUrlTest = new RegExp(
      url.replace(/[.]/, ".layer" + layerId + "."),
      "gm"
    );
  }
  if (layerUrlTest && layerUrlTest.test(testString)) {
    return 1;
  } else if (datasourceInfo.ids.length > 0) {
    if (
      datasourceInfo.ids.some(id => {
        const layerMapIdTest: any = new RegExp(id, "gm");
        return layerMapIdTest.test(testString);
      })
    ) {
      return 1;
    }
  }

  // if neither full layer url or map layer id are found...check to see if we can
  // find the base service url
  if (url) {
    const serviceUrlTest: any = new RegExp(url, "gm");
    if (serviceUrlTest.test(testString)) {
      return 2;
    }
  }
  // if none of the above see if we can find an AGOL item id reference
  if (itemId) {
    const itemIdTest: any = new RegExp(itemId, "gm");
    if (itemIdTest.test(testString)) {
      return 3;
    }
  }
  return 4;
}

/**
 * These tests will run prior to the tests associated with the higher level tests based on sort order.
 * The tests work more like cloning an object where we go through and review each individual property.
 * If we find a url or webmap layer id we will templatize the parent object that contains this property.
 * Many widgets will store one of these two properties in an object that will also contain various field references.
 *
 * @param obj The dataSource or widget object from the application
 * @param datasourceInfos A list of datasource info objects that contain key values to templatize field references
 * @returns An updated instance of the dataSource or widget with as many field references templatized as possible.
 * @private
 */
export function _prioritizedTests(
  obj: any,
  datasourceInfos: common.IDatasourceInfo[],
  templatizeKeys: boolean
): any {
  const objString: string = JSON.stringify(obj);
  const hasDatasources = datasourceInfos.filter(ds => {
    let urlTest: any;
    if (ds.url && !isNaN(ds.layerId)) {
      urlTest = new RegExp(
        ds.url.replace(/[.]/, ".layer" + ds.layerId + "."),
        "gm"
      );
    }

    let hasMapLayerId: boolean = false;
    if (ds.ids.length > 0) {
      hasMapLayerId = ds.ids.some(id => {
        const idTest: any = new RegExp(id, "gm");
        return idTest.test(objString);
      });
    }

    if (hasMapLayerId || (urlTest && urlTest.test(objString))) {
      return ds;
    }
  });
  if (hasDatasources.length > 0) {
    hasDatasources.forEach(ds => {
      // specific url reference is the most common
      obj = _templatizeParentByURL(obj, ds, templatizeKeys);
      if (ds.ids.length > 0) {
        // the second most common is to use the layerId from the webmap
        ds.ids.forEach(id => {
          obj = _templatizeParentByWebMapLayerId(obj, ds, id, templatizeKeys);
        });
      }
    });
  }
  return obj;
}

/**
 * This is very close to common.cloneObject but will test if an object
 * has one of the datasource urls as a property. If it finds one it will
 * templatize it's parent based on the fields from that datasource
 *
 * @param obj The dataSource or widget object from the application
 * @param ds A datasourceInfo object to use for testing against the current dataSource or widget
 * @returns The updated instance of the object with as many field references templatized as possible
 * @private
 */
export function _templatizeParentByURL(
  obj: { [index: string]: any },
  ds: common.IDatasourceInfo,
  templatizeKeys: boolean
): any {
  let clone: { [index: string]: any } = {};
  const url = ds.url;
  const layerId = ds.layerId;

  let urlTest: any;
  if (url && !isNaN(layerId)) {
    urlTest = new RegExp(url.replace(/[.]/, ".layer" + layerId + "."), "gm");
  }

  if (Array.isArray(obj)) {
    clone = obj.map(c => {
      return _templatizeParentByURL(c, ds, templatizeKeys);
    });
  } else if (typeof obj === "object") {
    for (const i in obj) {
      if (obj[i] != null && typeof obj[i] === "object") {
        clone[i] = _templatizeParentByURL(obj[i], ds, templatizeKeys);
      } else {
        if (urlTest && urlTest.test(obj[i])) {
          obj = common.templatizeFieldReferences(
            obj,
            ds.fields,
            ds.basePath,
            templatizeKeys
          );
        }
        clone[i] = obj[i];
      }
    }
  } else {
    clone = obj;
  }
  return clone;
}

/**
 * This is very close to common.cloneObject but will test if an object
 * has one of the datasource webmap layer ids as a property. If it finds one it will
 * templatize it's parent based on the fields from that datasource.
 *
 * @param obj The dataSource or widget object from the application
 * @param ds A datasourceInfo object to use for testing against the current dataSource or widget
 * @param id A webmap layer id to test with.
 * @returns The updated instance of the object with as many field references templatized as possible
 * @private
 */
export function _templatizeParentByWebMapLayerId(
  obj: { [index: string]: any },
  ds: common.IDatasourceInfo,
  id: string,
  templatizeKeys: boolean
): any {
  let clone: { [index: string]: any } = {};
  const idTest: any = new RegExp(id, "gm");
  if (Array.isArray(obj)) {
    clone = obj.map(c => {
      return _templatizeParentByWebMapLayerId(c, ds, id, templatizeKeys);
    });
  } else if (typeof obj === "object") {
    for (const i in obj) {
      if (obj[i] !== null) {
        // In some web application templates they store a stringified version of an object that can
        // contain multiple layer references at a very high level on the main values collection.
        // This was causing many other more typical layer references to be set incorrectly as the first
        // layerId found in this high level string would be used against the main object.
        let parsedProp: any;
        try {
          parsedProp = JSON.parse(obj[i]);
        } catch (error) {
          parsedProp = undefined;
        }
        if (parsedProp && typeof parsedProp === "object") {
          clone[i] = JSON.stringify(
            _templatizeParentByWebMapLayerId(parsedProp, ds, id, templatizeKeys)
          );
        } else if (typeof obj[i] === "object") {
          // some widgets store the layerId as a key to a collection of details that contain field references
          if (idTest.test(i) && templatizeKeys) {
            obj[i] = common.templatizeFieldReferences(
              obj[i],
              ds.fields,
              ds.basePath,
              templatizeKeys
            );
          }
          clone[i] = _templatizeParentByWebMapLayerId(
            obj[i],
            ds,
            id,
            templatizeKeys
          );
        } else {
          if (idTest.test(obj[i])) {
            obj = common.templatizeFieldReferences(
              obj,
              ds.fields,
              ds.basePath,
              templatizeKeys
            );
          }
          clone[i] = obj[i];
        }
      } else {
        clone[i] = obj[i];
      }
    }
  } else {
    clone = obj;
  }
  return clone;
}
