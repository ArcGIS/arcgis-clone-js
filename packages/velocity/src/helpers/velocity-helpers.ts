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

import {
  IItemTemplate,
  IVelocityTitle,
  getVelocityUrlBase,
  replaceInTemplate,
  ArcGISIdentityManager,
  getProp,
  fail,
  BASE_NAMES,
  PROP_NAMES
} from "@esri/solution-common";

/**
 * Common function to build urls for reading and interacting with the velocity api
 *
 *
 * @param authentication Credentials for the requests
 * @param templateDictionary Hash of facts: folder id, org URL, adlib replacements
 * @param type The type of velocity item we are constructing a url for
 * @param id Optional The id of the velocity item we are constructing a url for
 * @param isDeploy Optional Is this being constructed as a part of deployment
 * @param urlPrefix Optional prefix args necessary for some url construction
 * @param urlSuffix Optional suffix args necessary for some url construction
 *
 * @returns a promise that will resolve the constructed url
 *
 */
export function getVelocityUrl(
  authentication: ArcGISIdentityManager,
  templateDictionary: any,
  type: string,
  id: string = "",
  isDeploy: boolean = false,
  urlPrefix: string = "",
  urlSuffix: string = ""
): Promise<string> {
  return getVelocityUrlBase(authentication, templateDictionary).then(url => {
    if (url) {
      const _type: string =
        type === "Real Time Analytic"
          ? "analytics/realtime"
          : type === "Big Data Analytic"
          ? "analytics/bigdata"
          : type.toLowerCase();

      const suffix: string = urlSuffix ? `/${urlSuffix}` : "";
      const prefix: string = urlPrefix ? `/${urlPrefix}` : "";

      return Promise.resolve(
        isDeploy
          ? `${url}/iot/${_type}${prefix}${suffix}`
          : id
          ? `${url}/iot/${_type}${prefix}/${id}${suffix}/?f=json&token=${authentication.token}`
          : `${url}/iot/${_type}${prefix}${suffix}/?f=json&token=${authentication.token}`
      );
    } else {
      return Promise.resolve(url);
    }
  });
}

/**
 * Handles the creation of velocity items.
 *
 * @param authentication Credentials for the requests
 * @param template The current itemTemplate that is being used for deployment
 * @param data The velocity item data used to create the items.
 * @param templateDictionary Hash of facts: folder id, org URL, adlib replacements
 * @param autoStart This can be leveraged to start certain velocity items after they are created.
 *
 * @returns a promise that will resolve an object containing the item, id, type, and post process flag
 *
 */
export function postVelocityData(
  authentication: ArcGISIdentityManager,
  template: IItemTemplate,
  data: any,
  templateDictionary: any,
  autoStart: boolean = false
): Promise<any> {
  return getVelocityUrl(
    authentication,
    templateDictionary,
    template.type,
    undefined,
    true
  ).then(url => {
    if (url) {
      return getTitle(authentication, data.label, url).then((titleInfo: IVelocityTitle) => {
        const titles: any[] = titleInfo.titles;
        data.label = titleInfo.label;
        data.id = "";
        const body: any = replaceInTemplate(data, templateDictionary);

        const dataOutputs: any[] = (data.outputs ? data.outputs : data.output ? [data.output] : []).map((o: any) => {
          return {
            id: o.id,
            name: o.properties[`${o.name}.name`]
          };
        });

        const feeds = (body.feeds ? body.feeds : body.feed ? [body.feed] : []).map((o:any) => {
          return {
            id: o.id ? o.id : o.properties[`${o.name}.portalItemId`] || "",
            name: o.label ? o.label : data.label
          };
        });

        return _validateOutputs(
          authentication,
          templateDictionary,
          template.type,
          body,
          titles,
          dataOutputs,
          feeds
        ).then(updatedBody => {
          return _fetch(authentication, url, "POST", updatedBody).then(rr => {
            template.item.url = `${url}/${rr.id}`;
            template.item.title = data.label;

            // Update the template dictionary
            templateDictionary[template.itemId]["url"] = template.item.url;
            templateDictionary[template.itemId]["label"] = data.label;
            templateDictionary[template.itemId]["itemId"] = rr.id;

            const finalResult = {
              item: replaceInTemplate(template.item, templateDictionary),
              id: rr.id,
              type: template.type,
              postProcess: false
            };

            if (autoStart) {
              return _validateAndStart(
                authentication,
                templateDictionary,
                template,
                rr.id
              ).then(() => {
                return Promise.resolve(finalResult);
              });
            } else {
              return Promise.resolve(finalResult);
            }
          });
        });
      });
    } else {
      return Promise.reject(fail("Velocity NOT Supported by Organization"));
    }
  });
}

/**
 * Velocity item titles must be unique across the organization.
 * Check and ensure we set a unique title
 *
 * @param authentication Credentials for the requests
 * @param label The current label of the item from the solution template
 * @param url The base velocity url for checking status
 *
 * @returns a promise that will resolve a unique title
 *
 */
export function getTitle(
  authentication: ArcGISIdentityManager,
  label: string,
  url: string
): Promise<IVelocityTitle> {
  return _fetch(authentication, `${url}StatusList?view=admin`, "GET").then(
    items => {
      const titles: any[] =
        items && Array.isArray(items)
          ? items.map(item => {
              return { title: item.label };
            })
          : [];
      return Promise.resolve({label: getUniqueTitle(label, { titles }, "titles"), titles: titles.map(t => t.title)});
    }
  );
}

/**
 * Validate the data that will be used and handle any reported issues with the outputs.
 * The output names must be unique across the organization.
 *
 * This function will update the data arg that is passed in with a unique name.
 *
 * @param authentication Credentials for the requests
 * @param templateDictionary Hash of facts: folder id, org URL, adlib replacements
 * @param type The type of velocity item
 * @param data The data used to construct the velocity item
 * @param titles The list of know titles that exist in the org
 * @param dataOutputs The velocity items output objects
 * @param feeds The velocity items feed objects
 *
 * @returns a promise that will resolve the data object passed in with any necessary changes.
 *
 * @private
 */
export function _validateOutputs(
  authentication: ArcGISIdentityManager,
  templateDictionary: any,
  type: string,
  data: any,
  titles: any[],
  dataOutputs: any[] = [],
  feeds: any[] = []
): Promise<any> {
  if (dataOutputs.length > 0 || feeds.length > 0) {
    return validate(authentication, templateDictionary, type, "", data).then(
      (validateResults: any) => {
        const names: string[] = _validateMessages(validateResults);
        if (names.length > 0) {
          /* istanbul ignore else */
          if (dataOutputs.length > 0) {
            _updateDataOutput(dataOutputs, data, names);
          }
          /* istanbul ignore else */
          if (feeds.length > 0) {
            _updateFeed(feeds, data, names.concat(titles));
          }
          return _validateOutputs(
            authentication,
            templateDictionary,
            type,
            data,
            titles,
            dataOutputs,
            feeds
          );
        } else {
          return Promise.resolve(data);
        }
      }
    );
  } else {
    return Promise.resolve(data);
  }
}

/**
 * Check the validate results for any name conflicts and store the conflicting names.
 *
 * @param validateResults The results object to check for name conflict errors
 *
 * @returns a list of names that already exist in the org
 *
 * @private
 */
export function _validateMessages(
  validateResults: any
): string[] {
  let messages: any[] = getProp(validateResults, "validation.messages");

  const nodes: any[] = getProp(validateResults, "nodes");
  /* istanbul ignore else */
  if (nodes && Array.isArray(nodes)) {
    nodes.forEach(node => {
      messages = messages.concat(
        getProp(node, "validation.messages") || []
      );
    });
  }

  let names: string[] = [];
  /* istanbul ignore else */
  if (messages && Array.isArray(messages)) {
    messages.forEach(message => {
      // I don't see a way to ask for all output names that exist
      // velocityUrl + /outputs/ just gives you generic defaults not what currently exists
      const nameErrors = [
        "VALIDATION_ANALYTICS__MULTIPLE_CREATE_FEATURE_LAYER_OUTPUTS_REFERENCE_SAME_LAYER_NAME",
        "VALIDATION_ANALYTICS__MULTIPLE_CREATE_STREAM_LAYER_OUTPUTS_REFERENCE_SAME_LAYER_NAME",
        "ITEM_MANAGER__CREATE_ANALYTIC_FAILED_DUPLICATE_OUTPUT_NAMES_IN_ORGANIZATION_NOT_ALLOWED",
        "ITEM_MANAGER__CREATE_BIG_DATA_ANALYTIC_FAILED_DUPLICATE_NAMES_NOT_ALLOWED",
        "ITEM_MANAGER__CREATE_REAL_TIME_ANALYTIC_FAILED_DUPLICATE_NAMES_NOT_ALLOWED",
        "ITEM_MANAGER__CREATE_FEED_FAILED_DUPLICATE_NAME"
      ];
      // The names returned here seem to replace " " with "_" so they do not match exactly
      /* istanbul ignore else */
      if (nameErrors.indexOf(message.key) > -1) {
        names = names.concat(message.args);
      }
    });
  }
  return names;
}

/**
 * Updates the feed object with a new name when validation fails.
 *
 * @param feeds The feed objects from the velocity item.
 * @param data The full data object used for deploying the velocity item.
 * @param names The names that failed due to duplicate error in validation.
 *
 * @private
 */
export function _updateFeed(
  feeds: any[],
  data: any,
  names: string[]
): void {
  feeds.forEach(f => {
    const update = _getOutputLabel(names, f);
    /* istanbul ignore else */
    if (update) {
      data.label = update.label;
      f.name = update.label;
    }
  });
}

/**
 * Updates the data object with a new name when validation fails.
 *
 * @param dataOutputs The data output objects from the velocity item.
 * @param data The full data object used for deploying the velocity item.
 * @param names The names that failed due to duplicate error in validation.
 *
 * @private
 */
export function _updateDataOutput(
  dataOutputs: any[],
  data: any,
  names: string[]
): void {
  dataOutputs.forEach(dataOutput => {
    const update = _getOutputLabel(names, dataOutput);
    /* istanbul ignore else */
    if (update) {
      const _outputs = (data.outputs ? data.outputs : data.output ? [data.output] : []).map((_dataOutput: any) => {
        /* istanbul ignore else */
        if (_dataOutput.id === update.id) {
          /* istanbul ignore else */
          if (_dataOutput.properties) {
            const nameProp: string = `${_dataOutput.name}.name`;
            /* istanbul ignore else */
            if (Object.keys(_dataOutput.properties).indexOf(nameProp) > -1) {
              _dataOutput.properties[nameProp] = update.label;
            }
          }
        }
        return _dataOutput;
      });
      /* istanbul ignore else */
      if (data.outputs) {
        data.outputs = _outputs;
      }
      /* istanbul ignore else */
      if (data.output) {
        data.output = _outputs[0];
      }
    }
  });
}

/**
 * Get a unique label for the item.
 *
 * @param names The names that failed due to duplicate error in validation.
 * @param dataOutput The current data output that is being evaluated.
 *
 * @returns an object with a unique label and the outputs id when a name
 * conflict is found...otherwise returns undefined
 *
 * @private
 */
export function _getOutputLabel(names: any[], dataOutput: any): any {
  const titles: any[] = names.map((name: any) => {
    return { title: name };
  });

  const label = getUniqueTitle(dataOutput.name, { titles }, "titles");

  return label !== dataOutput.name
    ? {
        label,
        id: dataOutput.id
      }
    : undefined;
}

/**
 * Will return the provided title if it does not exist as a property
 * in one of the objects at the defined path. Otherwise the title will
 * have a numerical value attached.
 *
 * This is based on "getUniqueTitle" from common but adds the "_" replacement check for velocity names.
 * Could switch to using common if Velocity has a way to get a list of all names that are already used.
 *
 * @param title The root title to test
 * @param templateDictionary Hash of the facts
 * @param path to the objects to evaluate for potantial name clashes
 *
 * @returns string The unique title to use
 *
 */
export function getUniqueTitle(
  title: string,
  templateDictionary: any,
  path: string
): string {
  title = title ? title.trim() : "_";
  const objs: any[] = getProp(templateDictionary, path) || [];
  const titles: string[] = objs.map(obj => {
    return obj.title;
  });
  let newTitle: string = title;
  let i: number = 0;
  // replace added for velocitcy
  // validation seems to add "_" to names listed in outputs..so  no way to compare without hacking the name
  while (
    titles.indexOf(newTitle) > -1 ||
    titles.indexOf(newTitle.replace(/ /g, "_")) > -1
  ) {
    i++;
    newTitle = title + " " + i;
  }
  return newTitle;
}

/**
 * Start the item if validation passes and the item is executable.
 *
 * @param authentication Credentials for the requests
 * @param templateDictionary Hash of facts: folder id, org URL, adlib replacements
 * @param template the item template that has the details for deployment
 * @param id the new id for the velocity item that was deployed
 *
 * @returns a promise that will resolve with the validation results
 * or the start results when validation indicates the item is executable
 *
 * @private
 */
export function _validateAndStart(
  authentication: ArcGISIdentityManager,
  templateDictionary: any,
  template: IItemTemplate,
  id: string
): Promise<any> {
  return validate(authentication, templateDictionary, template.type, id).then(
    validateResult => {
      if (validateResult.executable) {
        return start(authentication, templateDictionary, template.type, id);
      } else {
        return Promise.resolve(validateResult);
      }
    }
  );
}

/**
 * Validate the velocity item.
 * Used to help find and handle duplicate name errors.
 *
 * @param authentication Credentials for the requests
 * @param templateDictionary Hash of facts: folder id, org URL, adlib replacements
 * @param type The type of velocity item we are constructing a url for
 * @param id? Optional The id of the velocity item we are constructing a url for
 * @param body? Optional the request body to validate.
 *
 * @returns a promise that will resolve with an object containing messages
 * indicating any issues found when validating such as name conflict errors
 *
 */
export function validate(
  authentication: ArcGISIdentityManager,
  templateDictionary: any,
  type: string,
  id?: string,
  body?: any
): Promise<any> {
  // /iot/feed/validate/{id}/
  // /iot/analytics/realtime/validate/{id}/
  return getVelocityUrl(
    authentication,
    templateDictionary,
    type,
    id,
    false,
    "validate",
    ""
  ).then(url => {
    return _fetch(authentication, url, "POST", body).then(result => {
      return Promise.resolve(result);
    });
  });
}

/**
 * Start the given velocity item that has been deployed.
 *
 * @param authentication Credentials for the requests
 * @param templateDictionary Hash of facts: folder id, org URL, adlib replacements
 * @param type The type of velocity item we are constructing a url for
 * @param id? Optional The id of the velocity item we are constructing a url for
 *
 * @returns a promise that will resolve with the result of the start call
 *
 */
export function start(
  authentication: ArcGISIdentityManager,
  templateDictionary: any,
  type: string,
  id?: string
): Promise<any> {
  // /iot/feed/{id}/start/
  // /iot/analytics/realtime/{id}/start/
  return getVelocityUrl(
    authentication,
    templateDictionary,
    type,
    id,
    false,
    "",
    "start"
  ).then(url => {
    return _fetch(authentication, url, "GET").then(result => {
      return Promise.resolve(result);
    });
  });
}

/**
 * Gets the required request options for requests to the velocity API.
 *
 * @param authentication Credentials for the requests
 * @param method Indicate if "GET" or "POST"
 *
 * @returns generic request options used for various calls to velocity api
 *
 * @private
 */
export function _getRequestOpts(
  authentication: ArcGISIdentityManager,
  method: string
): RequestInit {
  return {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "token=" + authentication.token
    },
    method
  };
}

/**
 * Generic fetch function for making calls to the velocity API.
 *
 * @param authentication Credentials for the requests
 * @param url The url from the velocity API to handle reading and writing
 * @param method The method for the request "GET" or "POST"
 * @param body The body for POST requests
 *
 * @returns a promise that will resolve with the result of the fetch call
 *
 * @private
 */
export function _fetch(
  authentication: ArcGISIdentityManager,
  url: string,
  method: string, // GET or POST
  body?: any
): Promise<any> {
  const requestOpts: any = _getRequestOpts(authentication, method);
  /* istanbul ignore else */
  if (body) {
    requestOpts.body = JSON.stringify(body);
  }
  return fetch(url, requestOpts).then(r => Promise.resolve(r.json()));
}

/**
 * Remove key properties if the dependency was removed due to having the "IoTFeatureLayer" typeKeyword
 * This function will update the input template.
 *
 * @param template The template that for the velocity item
 *
 */
export function cleanDataSourcesAndFeeds(
  template: IItemTemplate,
  velocityUrl: string
): void {
  const dependencies: string[] = template.dependencies;

  [
    getProp(template, "data.sources") ? template.data.sources : [],
    getProp(template, "data.source") ? [template.data.source] : [],
    getProp(template, "data.feeds") ? template.data.feeds : [],
    getProp(template, "data.feed") ? [template.data.feed] : []
  ].forEach(d => _removeIdProps(d, dependencies, velocityUrl));

  [
    getProp(template, "data.outputs") ? template.data.outputs : [],
    getProp(template, "data.output") ? [template.data.output] : []
  ].forEach(outputs => _removeIdPropsAndSetName(outputs, dependencies));
}

/**
 * Remove key properties from the input source or feed
 *
 * @param sourcesOrFeeds The list of dataSources or feeds
 * @param dependencies The list of dependencies
 *
 * @private
 */
export function _removeIdProps(
  sourcesOrFeeds: any[],
  dependencies: string[],
  velocityUrl: string
): void {
  sourcesOrFeeds.forEach(dataSource => {
    const idProp: string = "feature-layer.portalItemId";
    const layerIdProp: string = "feature-layer.layerId"
    /* istanbul ignore else */
    if (dataSource.properties) {
      /* istanbul ignore else */
      if (dataSource.properties[idProp]) {
        const id: string = dataSource.properties[idProp];
        /* istanbul ignore else */
        if (id && dependencies.indexOf(id) < 0) {
          delete dataSource.properties[idProp];
          delete dataSource.properties[layerIdProp];
        }
      }

      const urlProp: string = "simulator.url";
      const url: any = dataSource.properties[urlProp];
      // only remove velocity based simulator urls
      // otherwise we will leave as is with no templatization
      /* istanbul ignore else */
      if (url && url.indexOf(velocityUrl) > -1) {
        delete dataSource.properties[urlProp]
      }
    }
  });
}

/**
 * Remove key properties from the outputs.
 *
 * @param outputs The list of outputs
 * @param dependencies The list of dependencies
 *
 * @private
 */
export function _removeIdPropsAndSetName(
  outputs: any[],
  dependencies: string[]
): void {
  outputs.forEach(output => {
    /* istanbul ignore else */
    if (output.properties) {
      const names: string[] = getProp(output, "name") ? [output.name] : BASE_NAMES;
      names.forEach(n => {
        PROP_NAMES.forEach(p => _removeProp(output.properties, n + p, dependencies));
      });

      _updateName(output.properties);
    }
  });
}

/**
 * Generic helper function to remove key properties .
 *
 * @param props the list of props to update
 * @param prop the individual prop to remove
 * @param dependencies The list of dependencies
 *
 * @private
 */
export function _removeProp(
  props: any,
  prop: string,
  dependencies: string[]
): void {
  const id: string = props[prop];
  /* istanbul ignore else */
  if (id && dependencies.indexOf(id) < 0) {
    delete props[prop];
  }
}

/**
 * Update the feature layer name to include the solution item id.
 *
 * @param props the list of props to update
 *
 * @private
 */
export function _updateName(props: any): void {
  [
    "feat-lyr-new.name",
    "stream-lyr-new.name",
    "feat-lyr-existing.name"
  ].forEach(n => {
    const name: string = props[n];
    /* istanbul ignore else */
    if (name && name.indexOf("{{solutionItemId}}") < 0) {
      props[n] = `${name}_{{solutionItemId}}`;
    }
  });
}
