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
 * Provides tests for functions involving the creation and deployment of feature layers and services.
 */

import {
  cacheIndexes,
  getFeatureServiceRelatedRecords,
  templatize,
  deleteViewProps,
  cacheContingentValues,
  cacheFieldInfos,
  cacheLayerInfo,
  cachePopupInfos,
  updateTemplate,
  getLayerSettings,
  setNamesAndTitles,
  updateSettingsFieldInfos,
  deTemplatizeFieldInfos,
  getLayersAndTables,
  getExistingLayersAndTables,
  addFeatureServiceDefinition,
  addFeatureServiceLayersAndTables,
  updateLayerFieldReferences,
  postProcessFields,
  processContingentValues,
  removeLayerOptimization,
  updatePopupInfo,
  _templatize,
  _templatizeProperty,
  _templatizeAdminLayerInfo,
  _processAdminObject,
  _templatizeSourceServiceName,
  _templatizeAdminLayerInfoFields,
  _getDependantItemId,
  _templatizeTopFilter,
  _templatizeRelationshipFields,
  _templatizePopupInfo,
  _templatizeName,
  _templatizeMediaInfos,
  _templatizeDefinitionEditor,
  _templatizeDefinitionExpression,
  _templatizeSimpleName,
  _templatizeDrawingInfo,
  _templatizeArcadeExpressions,
  _templatizeLabelingInfo,
  _templatizeTemplates,
  _templatizeTypeTemplates,
  _templatizeTimeInfo,
  _templatizeDefinitionQuery,
  _getNameMapping,
  _updateOrder,
  _updateAddOptions,
  _isSelfReferential,
  _updateForPortal,
  _getFieldNames,
  _getDynamicFieldNames,
  _updateItemFields,
  _updateGeomFieldName,
  _updateTemplateDictionaryFields,
  _updateTypeKeywords,
  _validateFields,
  _validateDisplayField,
  _validateIndexes,
  validateSpatialReferenceAndExtent,
  _validateTemplatesFields,
  _validateTypesTemplates,
  _validateEditFieldsInfo,
  IPopupInfos,
} from "../src/featureServiceHelpers";

import * as generalHelpers from "../../common/src/generalHelpers";
import * as restHelpers from "../../common/src/restHelpers";

import * as arcGISRestJS from "../src/arcgisRestJS";
import { IItemTemplate, IDependency, IFeatureServiceProperties, IUpdate } from "../src/interfaces";
import * as utils from "../../common/test/mocks/utils";

const fetchMock = require("fetch-mock");
import * as mockItems from "../../common/test/mocks/agolItems";
import * as templates from "../../common/test/mocks/templates";
import { setCreateProp } from "../src/generalHelpers";

let itemTemplate: IItemTemplate;
const itemId: string = "cd766cba0dd44ec080420acc10990282";
const basePath: string = itemId + ".layer0.fields";

const _organization: any = {
  defaultExtent: {
    xmin: 0,
    ymin: 0,
    xmax: 1,
    ymax: 1,
    spatialReference: {
      wkid: 102100,
    },
  },
  spatialReference: {
    wkid: 102100,
  },
};

let MOCK_USER_SESSION: arcGISRestJS.UserSession;

beforeEach(() => {
  MOCK_USER_SESSION = utils.createRuntimeMockUserSession();

  itemTemplate = {
    itemId: "",
    key: "",
    properties: {
      service: {
        fullExtent: {},
        initialExtent: {
          xmin: -1,
          xmax: 1,
          ymin: -1,
          ymax: 1,
          spatialReference: { wkid: 123456 },
        },
      },
      layers: [
        {
          fields: [],
        },
      ],
      tables: [],
    },
    type: "",
    item: {
      id: "",
      type: "",
      typeKeywords: [],
    },
    data: {},
    resources: [],
    dependencies: [],
    groups: [],
    estimatedDeploymentCostFactor: 0,
  };
});

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000; // default is 5000 ms

afterEach(() => {
  fetchMock.restore();
});

describe("Module `featureServiceHelpers`: utility functions for feature-service items", () => {
  describe("getFeatureServiceRelatedRecords", () => {
    it("asks for all objects", () => {
      const url = "http://test/FeatureServer";
      const relationshipId = 0;

      const queryRelatedSpy = spyOn(arcGISRestJS, "queryRelated").and.resolveTo(undefined);
      const requestOptions = {
        url: url + "/0",
        relationshipId,
        objectIds: undefined,
      };

      return getFeatureServiceRelatedRecords(url, relationshipId).then((response) => {
        expect(queryRelatedSpy.calls.argsFor(0)[0]).toEqual(requestOptions);
        return Promise.resolve(response);
      });
    });

    it("asks for specific objects", () => {
      const url = "http://test/FeatureServer";
      const relationshipId = 0;
      const objectIds = [1, 2, 3];

      const queryRelatedSpy = spyOn(arcGISRestJS, "queryRelated").and.resolveTo(undefined);
      const requestOptions = {
        url: url + "/0",
        relationshipId,
        objectIds,
      };

      return getFeatureServiceRelatedRecords(url, relationshipId, objectIds).then((response) => {
        expect(queryRelatedSpy.calls.argsFor(0)[0]).toEqual(requestOptions);
        return Promise.resolve(response);
      });
    });
  });

  describe("templatize", () => {
    it("should handle empty dependency array", () => {
      const dependencies: IDependency[] = [];

      itemTemplate.item.id = "ABC123";
      itemTemplate.properties.service.serviceItemId = "DEF456";

      const expected: IItemTemplate = {
        itemId: "",
        key: "",
        properties: {
          service: {
            serviceItemId: "{{DEF456.itemId}}",
            fullExtent: "{{ABC123.solutionExtent}}",
            initialExtent: "{{ABC123.solutionExtent}}",
            spatialReference: { wkid: 123456 },
          },
          layers: [
            {
              fields: [],
            },
          ],
          tables: [],
          defaultExtent: {
            xmin: -1,
            xmax: 1,
            ymin: -1,
            ymax: 1,
            spatialReference: { wkid: 123456 },
          },
        },
        type: "",
        item: {
          id: "{{ABC123.itemId}}",
          type: "",
          url: "{{ABC123.url}}",
          typeKeywords: [],
        },
        data: {},
        resources: [],
        dependencies: [],
        groups: [],
        estimatedDeploymentCostFactor: 0,
      };
      const templateDictionary = {};
      templatize(itemTemplate, dependencies, true, templateDictionary);
      expect(itemTemplate).toEqual(expected);
      expect(dependencies).toEqual([]);
    });

    it("should handle common itemTemplate properties", () => {
      const dependencies: IDependency[] = [];
      itemTemplate = {
        itemId: "ab766cba0dd44ec080420acc10990282",
        key: "ABC123",
        properties: {
          service: {
            serviceItemId: "ab766cba0dd44ec080420acc10990282",
            size: 1009,
            fullExtent: {},
            initialExtent: {},
            layers: [
              {
                id: 0,
                prop: "A",
              },
            ],
            tables: [
              {
                id: 1,
                prop: "B",
              },
            ],
          },
          layers: [
            {
              id: "0",
              serviceItemId: "ab766cba0dd44ec080420acc10990282",
              adminLayerInfo: {
                xssTrustedFields: [],
                tableName: "ABC",
              },
              displayField: "A",
              fields: [
                {
                  name: "A",
                },
              ],
              hasZ: true,
            },
          ],
          tables: [
            {
              id: "1",
              serviceItemId: "ab766cba0dd44ec080420acc10990282",
              fields: [
                {
                  name: "B",
                },
              ],
            },
          ],
          defaultExtent: {},
        },
        type: "",
        item: {
          extent: "",
          id: "ab766cba0dd44ec080420acc10990282",
          type: "",
          typeKeywords: ["ab766cba0dd44ec080420acc10990282", "typeKeyword2"],
        },
        data: {
          layers: [
            {
              id: "0",
              displayField: "A",
              fields: [
                {
                  name: "A",
                },
              ],
            },
          ],
          tables: [
            {
              id: "1",
              fields: [
                {
                  name: "B",
                },
              ],
            },
          ],
        },
        resources: [],
        dependencies: [],
        groups: [],
        estimatedDeploymentCostFactor: 0,
      };
      const expected: any = {
        itemId: "ab766cba0dd44ec080420acc10990282",
        key: "ABC123",
        properties: {
          service: {
            serviceItemId: "{{ab766cba0dd44ec080420acc10990282.itemId}}",
            fullExtent: "{{ab766cba0dd44ec080420acc10990282.solutionExtent}}",
            initialExtent: "{{ab766cba0dd44ec080420acc10990282.solutionExtent}}",
            layers: [
              {
                id: 0,
                prop: "A",
              },
            ],
            tables: [
              {
                id: 1,
                prop: "B",
              },
            ],
            enableZDefaults: true,
            zDefault: 0,
          },
          layers: [
            {
              id: "0",
              serviceItemId: "{{ab766cba0dd44ec080420acc10990282.itemId}}",
              adminLayerInfo: {},
              displayField: "A",
              fields: [
                {
                  name: "A",
                },
              ],
              hasZ: true,
            },
          ],
          tables: [
            {
              id: "1",
              serviceItemId: "{{ab766cba0dd44ec080420acc10990282.itemId}}",
              displayField: "B",
              fields: [
                {
                  name: "B",
                },
              ],
            },
          ],
          defaultExtent: {},
        },
        type: "",
        item: {
          extent: "", // only set through createItemTemplate
          id: "{{ab766cba0dd44ec080420acc10990282.itemId}}",
          type: "",
          url: "{{ab766cba0dd44ec080420acc10990282.url}}",
          typeKeywords: ["{{ab766cba0dd44ec080420acc10990282.itemId}}", "typeKeyword2"],
        },
        data: {
          layers: [
            {
              id: "0",
              displayField: "A",
              fields: [
                {
                  name: "A",
                },
              ],
            },
          ],
          tables: [
            {
              id: "1",
              fields: [
                {
                  name: "B",
                },
              ],
            },
          ],
        },
        resources: [],
        dependencies: [],
        groups: [],
        estimatedDeploymentCostFactor: 0,
      };
      const templateDictionary = {};
      templatize(itemTemplate, dependencies, true, templateDictionary);
      expect(itemTemplate).toEqual(expected);
    });

    it("should handle absence of layers and tables itemTemplate properties", () => {
      const dependencies: IDependency[] = [];
      itemTemplate = {
        itemId: "ab766cba0dd44ec080420acc10990282",
        key: "ABC123",
        properties: {
          service: {
            serviceItemId: "ab766cba0dd44ec080420acc10990282",
            fullExtent: {},
            initialExtent: {},
          },
          defaultExtent: {},
        },
        type: "",
        item: {
          extent: "",
          id: "ab766cba0dd44ec080420acc10990282",
          type: "",
          typeKeywords: ["ab766cba0dd44ec080420acc10990282", "two"],
        },
        data: {},
        resources: [],
        dependencies: [],
        groups: [],
        estimatedDeploymentCostFactor: 0,
      };
      const expected: any = {
        itemId: "ab766cba0dd44ec080420acc10990282",
        key: "ABC123",
        properties: {
          service: {
            serviceItemId: "{{ab766cba0dd44ec080420acc10990282.itemId}}",
            fullExtent: "{{ab766cba0dd44ec080420acc10990282.solutionExtent}}",
            initialExtent: "{{ab766cba0dd44ec080420acc10990282.solutionExtent}}",
          },
          defaultExtent: {},
        },
        type: "",
        item: {
          extent: "", // only set through createItemTemplate
          id: "{{ab766cba0dd44ec080420acc10990282.itemId}}",
          type: "",
          url: "{{ab766cba0dd44ec080420acc10990282.url}}",
          typeKeywords: ["{{ab766cba0dd44ec080420acc10990282.itemId}}", "two"],
        },
        data: {},
        resources: [],
        dependencies: [],
        groups: [],
        estimatedDeploymentCostFactor: 0,
      };
      const templateDictionary = {};
      templatize(itemTemplate, dependencies, true, templateDictionary);
      expect(itemTemplate).toEqual(expected);
    });

    it("should use fullExtent for defaultExtent if initialExtent is undefined", () => {
      const dependencies: IDependency[] = [];
      itemTemplate = {
        itemId: "ab766cba0dd44ec080420acc10990282",
        key: "ABC123",
        properties: {
          service: {
            serviceItemId: "ab766cba0dd44ec080420acc10990282",
            fullExtent: {
              xmin: -10,
              xmax: 10,
              ymin: -10,
              ymax: 10,
              spatialReference: { wkid: 123456 },
            },
          },
        },
        type: "",
        item: {
          extent: "",
          id: "ab766cba0dd44ec080420acc10990282",
          type: "",
          typeKeywords: ["ab766cba0dd44ec080420acc10990282", "two"],
        },
        data: {},
        resources: [],
        dependencies: [],
        groups: [],
        estimatedDeploymentCostFactor: 0,
      };
      const expected: any = {
        itemId: "ab766cba0dd44ec080420acc10990282",
        key: "ABC123",
        properties: {
          service: {
            serviceItemId: "{{ab766cba0dd44ec080420acc10990282.itemId}}",
            fullExtent: "{{ab766cba0dd44ec080420acc10990282.solutionExtent}}",
            spatialReference: { wkid: 123456 },
          },
          defaultExtent: {
            xmin: -10,
            xmax: 10,
            ymin: -10,
            ymax: 10,
            spatialReference: { wkid: 123456 },
          },
        },
        type: "",
        item: {
          extent: "", // only set through createItemTemplate
          id: "{{ab766cba0dd44ec080420acc10990282.itemId}}",
          type: "",
          url: "{{ab766cba0dd44ec080420acc10990282.url}}",
          typeKeywords: ["{{ab766cba0dd44ec080420acc10990282.itemId}}", "two"],
        },
        data: {},
        resources: [],
        dependencies: [],
        groups: [],
        estimatedDeploymentCostFactor: 0,
      };
      const templateDictionary = {};
      templatize(itemTemplate, dependencies, true, templateDictionary);
      expect(itemTemplate).toEqual(expected);
    });
  });

  describe("cacheFieldInfos", () => {
    it("should not fail with undefined", () => {
      let fieldInfos: any = {};
      const layer: any = undefined;
      fieldInfos = cacheFieldInfos(layer, fieldInfos, true, false);
      expect(layer).toBeUndefined();
      expect(fieldInfos).toEqual({});
    });

    it("should not fail without key properties on the layer", () => {
      let fieldInfos: any = {};
      const layer: any = {};
      fieldInfos = cacheFieldInfos(layer, fieldInfos, false, false);
      expect(layer).toEqual({});
      expect(fieldInfos).toEqual({});
    });

    it("should cache the key properties for fieldInfos", () => {
      let fieldInfos: any = {};
      const layer: any = {
        defaultSubtypeCode: "0",
        id: "23",
        fields: [
          {
            name: "A",
            type: "string",
          },
          {
            name: "B",
            type: "string",
          },
        ],
        displayField: "DisplayField",
        editFieldsInfo: ["CreateDate"],
        subtypeField: "SubtypeField",
        subtypes: [{ a: "A" }],
        templates: [
          {
            A: null,
            B: null,
          },
        ],
        relationships: [
          {
            relatedId: 0,
          },
        ],
        drawingInfo: {
          renderer: {
            type: "simple",
          },
        },
        type: "layer",
        viewDefinitionQuery: "viewDefinitionQuery",
      };

      const expectedLayer: any = {
        id: "23",
        fields: [
          {
            name: "A",
            type: "string",
          },
          {
            name: "B",
            type: "string",
          },
        ],
        displayField: "DisplayField",
        editFieldsInfo: ["CreateDate"],
        templates: [
          {
            A: null,
            B: null,
          },
        ],
        relationships: null,
        drawingInfo: {
          renderer: {
            type: "simple",
          },
        },
        type: "layer",
        viewDefinitionQuery: "viewDefinitionQuery",
      };

      const expectedFieldInfos: any = {
        "23": {
          defaultSubtypeCode: "0",
          id: "23",
          sourceFields: [
            {
              name: "A",
              type: "string",
            },
            {
              name: "B",
              type: "string",
            },
          ],
          editFieldsInfo: ["CreateDate"],
          subtypeField: "SubtypeField",
          subtypes: [{ a: "A" }],
          templates: [
            {
              A: null,
              B: null,
            },
          ],
          relationships: [
            {
              relatedId: 0,
            },
          ],
          drawingInfo: {
            renderer: {
              type: "simple",
            },
          },
          type: "layer",
          viewDefinitionQuery: "viewDefinitionQuery",
        },
      };

      fieldInfos = cacheFieldInfos(layer, fieldInfos, false, true);
      expect(layer).toEqual(expectedLayer);
      expect(fieldInfos).toEqual(expectedFieldInfos);
    });
  });

  describe("cacheIndexes", () => {
    it("should cache specific indexes and remove them from the layer", () => {
      const layer = {
        id: "0",
        objectIdField: "objectid",
        globalIdField: "globalid",
        indexes: [
          {
            isUnique: true,
            fields: "B",
            indexType: "",
            name: "B_Unique",
          },
          {
            isUnique: true,
            fields: "objectid",
            indexType: "",
            name: "C_objectid",
          },
          {
            isUnique: false,
            fields: "A",
            indexType: "FullText",
            name: "A _ FullText",
          },
        ],
      } as any;

      const id = "0";
      let fieldInfos: any = {};
      fieldInfos[id] = {};
      fieldInfos = cacheIndexes(layer, fieldInfos);

      const expectedLayer = {
        id: "0",
        objectIdField: "objectid",
        globalIdField: "globalid",
      };
      expect(layer).toEqual(expectedLayer);
      expect(fieldInfos["0"].indexes.length).toEqual(2);
      expect(fieldInfos["0"].indexes[1].name).toEqual("A_FullText");
    });
  });

  describe("cacheContingentValues", () => {
    it("should get contingent values from feature service properties", () => {
      const id = "0";
      let fieldInfos: any = {};
      fieldInfos[id] = {};
      itemTemplate.properties.contingentValues = {};
      itemTemplate.properties.contingentValues[id] = {
        contingentValuesDefinition: {
          fieldGroups: [],
        },
      };
      fieldInfos = cacheContingentValues(id, fieldInfos, itemTemplate);
      expect(fieldInfos[id].contingentValues).toEqual(itemTemplate.properties.contingentValues[id]);
    });
  });

  describe("cacheLayerInfo", () => {
    it("should skip id layer id is missing", () => {
      const itemId = "dd59d3b4a8c44100914458dd722f054f";
      const url =
        "https://myserver.arcgis.com/abc123/arcgis/rest/services/NOAA_METAR_current_wind_speed_direction_v1/FeatureServer";
      const templateDictionary = {};

      cacheLayerInfo("", itemId, url, templateDictionary);
      expect(templateDictionary).toEqual({});
    });

    it("should not overwrite with missing url", () => {
      const layerId = "0";
      const itemId = "dd59d3b4a8c44100914458dd722f054f";
      const url =
        "https://myserver.arcgis.com/abc123/arcgis/rest/services/NOAA_METAR_current_wind_speed_direction_v1/FeatureServer/0";
      const templateDictionary = {
        unreachable: {
          dd59d3b4a8c44100914458dd722f054f: {
            itemId: "dd59d3b4a8c44100914458dd722f054f",
            layer0: {
              itemId,
              layerId,
              url,
            },
          },
        },
      };
      const _templateDictionary = {
        unreachable: {
          dd59d3b4a8c44100914458dd722f054f: {
            itemId: "dd59d3b4a8c44100914458dd722f054f",
            layer0: {
              itemId,
              layerId,
              url,
            },
          },
        },
      };

      cacheLayerInfo("0", itemId, "", templateDictionary);
      expect(templateDictionary).toEqual(_templateDictionary);
    });

    it("should not overwrite existing unreachable", () => {
      const layerId = "0";
      const itemId = "dd59d3b4a8c44100914458dd722f054f";
      const url =
        "https://myserver.arcgis.com/abc123/arcgis/rest/services/NOAA_METAR_current_wind_speed_direction_v1/FeatureServer/0";
      const url2 =
        "https://myserver.arcgis.com/abc123/arcgis/rest/services/NOAA_METAR_current_wind_speed_direction_v2/FeatureServer/0";
      const templateDictionary = {
        unreachable: {
          cc59d3b4a8c44100914458dd722f054f: {
            itemId: "cc59d3b4a8c44100914458dd722f054f",
            layer0: {
              itemId,
              layerId,
              url2,
            },
          },
        },
      };
      const _templateDictionary = {
        unreachable: {
          dd59d3b4a8c44100914458dd722f054f: {
            itemId: "dd59d3b4a8c44100914458dd722f054f",
            layer0: {
              itemId,
              layerId,
              url,
            },
          },
          cc59d3b4a8c44100914458dd722f054f: {
            itemId: "cc59d3b4a8c44100914458dd722f054f",
            layer0: {
              itemId,
              layerId,
              url2,
            },
          },
        },
      };

      cacheLayerInfo("0", itemId, url, templateDictionary);
      expect(templateDictionary).toEqual(_templateDictionary);
    });
  });

  describe("cachePopupInfos", () => {
    it("should not fail when empty", () => {
      const popupInfos: IPopupInfos = cachePopupInfos(itemTemplate);
      const expected: any = {
        layers: {},
        tables: {},
      };
      expect(popupInfos).toEqual(expected);
    });

    it("should handle common popup", () => {
      itemTemplate = {
        itemId: "",
        key: "",
        properties: {
          service: {},
          layers: [
            {
              fields: [],
            },
          ],
          tables: [],
        },
        type: "",
        item: {
          id: "",
          type: "",
        },
        data: {
          layers: [
            {
              id: 0,
            },
            {
              id: 1,
              popupInfo: {
                property: {},
              },
            },
          ],
          tables: [
            {
              id: 2,
            },
            {
              id: 637,
              popupInfo: {
                property: {},
              },
            },
          ],
        },
        resources: [],
        dependencies: [],
        groups: [],
        estimatedDeploymentCostFactor: 0,
      };

      const popupInfos: IPopupInfos = cachePopupInfos(itemTemplate.data);
      const expectedPopupInfos: any = {
        layers: {
          1: {
            property: {},
          },
        },
        tables: {
          637: {
            property: {},
          },
        },
      };

      const expectedData: any = {
        layers: [
          {
            id: 0,
          },
          {
            id: 1,
            popupInfo: {},
          },
        ],
        tables: [
          {
            id: 2,
          },
          {
            id: 637,
            popupInfo: {},
          },
        ],
      };
      // popupInfos should be hydrated for layers with popupInfo
      expect(popupInfos).toEqual(expectedPopupInfos);
      // popupInfop should be set to {}
      expect(itemTemplate.data).toEqual(expectedData);
    });
  });

  describe("updateTemplate", () => {
    it("should handle error when updating a template", () => {
      const settings: any = {};
      const createResponse: any = {
        serviceItemId: "DDDEEEFFF456",
        serviceurl: "http://test/FeatureServer",
        name: "TheService",
      };
      itemTemplate.itemId = "AAABBBCCC123";
      itemTemplate.item = {
        id: "{{AAABBBCCC123.itemId}}",
        type: "",
        url: "{{AAABBBCCC123.url}}",
      };

      const updatedTemplate: any = updateTemplate(itemTemplate, settings, createResponse);

      const expectedTemplate: any = {
        itemId: "DDDEEEFFF456",
        key: "",
        properties: {
          service: {
            fullExtent: {},
            initialExtent: {
              xmin: -1,
              ymin: -1,
              xmax: 1,
              ymax: 1,
              spatialReference: {
                wkid: 123456,
              },
            },
          },
          layers: [
            {
              fields: [],
            },
          ],
          tables: [],
        },
        type: "",
        item: {
          id: "DDDEEEFFF456",
          type: "",
          url: "http://test/FeatureServer/",
        },
        data: {},
        resources: [],
        dependencies: [],
        groups: [],
        estimatedDeploymentCostFactor: 0,
      };

      const expectedSettings: any = {
        AAABBBCCC123: {
          itemId: "DDDEEEFFF456",
          url: "http://test/FeatureServer/",
          name: "TheService",
        },
      };

      expect(updatedTemplate).toEqual(expectedTemplate);
      expect(settings).toEqual(expectedSettings);
    });
  });

  describe("_updateTypeKeywords", () => {
    it("should update typeKeywords when some have been added on create", () => {
      itemTemplate.item.typeKeywords = ["A", "B"];

      const createResponse: any = {
        typeKeywords: ["C"],
      };

      const expecetd: string[] = ["A", "B", "C"];

      const template = _updateTypeKeywords(itemTemplate, createResponse);

      expect(template.item.typeKeywords).toEqual(expecetd);
    });

    it("should NOT update typeKeywords when no new keyWords exist", () => {
      itemTemplate.item.typeKeywords = ["A", "B"];

      const createResponse: any = {
        typeKeywords: [],
      };

      const expecetd: string[] = ["A", "B"];

      const template = _updateTypeKeywords(itemTemplate, createResponse);

      expect(template.item.typeKeywords).toEqual(expecetd);
    });
  });

  describe("getFieldSettings", () => {
    it("should handle fields NOT changed", () => {
      const serviceUrl: string = "https://services/serviceName/FeatureServer";
      const fieldInfos: any = {
        "0": {
          newFields: [
            {
              name: "A",
              alias: "A",
              type: "fieldTypeA",
            },
            {
              name: "B",
              alias: "B",
              type: "fieldTypeB",
            },
            {
              name: "CreateDate",
              alias: "CreateDate",
              type: "fieldTypeDate",
            },
          ],
          sourceFields: [
            {
              name: "A",
              alias: "A",
              type: "fieldTypeA",
            },
            {
              name: "B",
              alias: "B",
              type: "fieldTypeB",
            },
            {
              name: "CreateDate",
              alias: "CreateDate",
              type: "fieldTypeDate",
            },
          ],
          otherProperty: {
            test: "test",
          },
          editFieldsInfo: {
            createDateField: "CreateDate",
          },
          newEditFieldsInfo: {
            createDateField: "CreateDate",
          },
          sourceSchemaChangesAllowed: true,
        },
        "1": {
          newFields: [
            {
              name: "C",
              alias: "C",
              type: "fieldTypeC",
            },
            {
              name: "D",
              alias: "D",
              type: "fieldTypeD",
            },
            {
              name: "CreateDate",
              alias: "CreateDate",
              type: "fieldTypeDate",
            },
          ],
          sourceFields: [
            {
              name: "C",
              alias: "C",
              type: "fieldTypeC",
            },
            {
              name: "D",
              alias: "D",
              type: "fieldTypeD",
            },
            {
              name: "CreateDate",
              alias: "CreateDate",
              type: "fieldTypeDate",
            },
          ],
          otherProperty: {
            test: "test",
          },
          editFieldsInfo: {
            createDateField: "CreateDate",
          },
          newEditFieldsInfo: {
            createDateField: "CreateDate",
          },
          sourceSchemaChangesAllowed: true,
        },
      };
      const expectedSettings: any = {
        layer0: {
          itemId: "33298a2612ba4899adc41180c435425f",
          url: serviceUrl + "/" + 0,
          layerId: "0",
          fields: {
            a: {
              name: "A",
              alias: "A",
              type: "fieldTypeA",
            },
            b: {
              name: "B",
              alias: "B",
              type: "fieldTypeB",
            },
            createdate: {
              name: "CreateDate",
              alias: "CreateDate",
              type: "fieldTypeDate",
            },
          },
        },
        layer1: {
          itemId: "33298a2612ba4899adc41180c435425f",
          url: serviceUrl + "/" + 1,
          layerId: "1",
          fields: {
            c: {
              name: "C",
              alias: "C",
              type: "fieldTypeC",
            },
            d: {
              name: "D",
              alias: "D",
              type: "fieldTypeD",
            },
            createdate: {
              name: "CreateDate",
              alias: "CreateDate",
              type: "fieldTypeDate",
            },
          },
        },
      };
      const expectedFieldInfos: any = {
        "0": {
          otherProperty: {
            test: "test",
          },
        },
        "1": {
          otherProperty: {
            test: "test",
          },
        },
      };
      const settings = getLayerSettings(fieldInfos, serviceUrl, "33298a2612ba4899adc41180c435425f");
      expect(fieldInfos).toEqual(expectedFieldInfos);
      expect(settings).toEqual(expectedSettings);
    });

    it("should use enterpriseIDMapping when it exists", () => {
      const serviceUrl: string = "https://services/serviceName/FeatureServer";
      const fieldInfos: any = {};
      fieldInfos["0"] = {
        item: {
          id: 0,
          newFields: [
            {
              name: "A",
              alias: "A",
              type: "fieldTypeA",
            },
            {
              name: "B",
              alias: "B",
              type: "fieldTypeB",
            },
            {
              name: "CreateDate",
              alias: "CreateDate",
              type: "fieldTypeDate",
            },
          ],
          sourceFields: [
            {
              name: "A",
              alias: "A",
              type: "fieldTypeA",
            },
            {
              name: "B",
              alias: "B",
              type: "fieldTypeB",
            },
            {
              name: "CreateDate",
              alias: "CreateDate",
              type: "fieldTypeDate",
            },
          ],
          otherProperty: {
            test: "test",
          },
          editFieldsInfo: {
            createDateField: "CreateDate",
          },
          newEditFieldsInfo: {
            createDateField: "CreateDate",
          },
          sourceSchemaChangesAllowed: true,
        },
      };
      fieldInfos["1"] = {
        item: {
          id: 1,
          newFields: [
            {
              name: "C",
              alias: "C",
              type: "fieldTypeC",
            },
            {
              name: "D",
              alias: "D",
              type: "fieldTypeD",
            },
            {
              name: "CreateDate",
              alias: "CreateDate",
              type: "fieldTypeDate",
            },
          ],
          sourceFields: [
            {
              name: "C",
              alias: "C",
              type: "fieldTypeC",
            },
            {
              name: "D",
              alias: "D",
              type: "fieldTypeD",
            },
            {
              name: "CreateDate",
              alias: "CreateDate",
              type: "fieldTypeDate",
            },
          ],
          otherProperty: {
            test: "test",
          },
          editFieldsInfo: {
            createDateField: "CreateDate",
          },
          newEditFieldsInfo: {
            createDateField: "CreateDate",
          },
          sourceSchemaChangesAllowed: true,
        },
      };

      const enterpriseIDMapping = {
        "0": "0001",
        "1": "1000",
      };
      const expectedSettings: any = {
        layer0: {
          itemId: "33298a2612ba4899adc41180c435425f",
          url: serviceUrl + "/" + "0001",
          layerId: "0001",
          fields: {},
        },
        layer1: {
          itemId: "33298a2612ba4899adc41180c435425f",
          url: serviceUrl + "/" + 1000,
          layerId: "1000",
          fields: {},
        },
      };

      const settings = getLayerSettings(
        fieldInfos,
        serviceUrl,
        "33298a2612ba4899adc41180c435425f",
        enterpriseIDMapping,
      );
      expect(settings).toEqual(expectedSettings);
    });

    it("should handle fields changed", () => {
      const serviceUrl: string = "https://services/serviceName/FeatureServer";
      const fieldInfos: any = {
        "0": {
          newFields: [
            {
              name: "a0",
              alias: "A_a",
              type: "fieldTypeA",
            },
            {
              name: "b",
              alias: "B",
              type: "fieldTypeB",
            },
            {
              name: "createdate",
              alias: "Create Date",
              type: "fieldTypeDate",
            },
            {
              name: "create_date",
              alias: "Create Date",
              type: "fieldTypeDate",
            },
            {
              name: "editdate",
              alias: "EditDate",
              type: "fieldTypeDate",
            },
          ],
          sourceFields: [
            {
              name: "A",
              alias: "A_a",
              type: "fieldTypeA",
            },
            {
              name: "B",
              alias: "B",
              type: "fieldTypeB",
            },
            {
              name: "CreateDate",
              alias: "Create Date",
              type: "fieldTypeDate",
            },
            {
              name: "EditDate",
              alias: "EditDate",
              type: "fieldTypeDate",
            },
          ],
          otherProperty: {
            test: "test",
          },
          editFieldsInfo: {
            createDateField: "CreateDate",
            editDateField: "EditDate",
          },
          newEditFieldsInfo: {
            createDateField: "create_date",
            editDateField: "editdate",
          },
          sourceSchemaChangesAllowed: true,
        },
        "1": {
          newFields: [
            {
              name: "c",
              alias: "C",
              type: "fieldTypeC",
            },
            {
              name: "d",
              alias: "D",
              type: "fieldTypeD",
            },
            {
              name: "createdate",
              alias: "Create Date",
              type: "fieldTypeDate",
            },
            {
              name: "create_date",
              alias: "Create Date",
              type: "fieldTypeDate",
            },
            {
              name: "editdate",
              alias: "EditDate",
              type: "fieldTypeDate",
            },
          ],
          sourceFields: [
            {
              name: "C",
              alias: "C",
              type: "fieldTypeC",
            },
            {
              name: "D",
              alias: "D",
              type: "fieldTypeD",
            },
            {
              name: "CreateDate",
              alias: "Create Date",
              type: "fieldTypeDate",
            },
            {
              name: "EditDate",
              alias: "EditDate",
              type: "fieldTypeDate",
            },
          ],
          otherProperty: {
            test: "test",
          },
          editFieldsInfo: {
            createDateField: "CreateDate",
          },
          newEditFieldsInfo: {
            createDateField: "create_date",
            editDateField: "editdate",
          },
          sourceSchemaChangesAllowed: true,
        },
      };
      const expectedSettings: any = {
        layer0: {
          itemId: "33298a2612ba4899adc41180c435425f",
          url: serviceUrl + "/" + 0,
          layerId: "0",
          fields: {
            a: {
              name: "a0",
              alias: "A_a",
              type: "fieldTypeA",
            },
            b: {
              name: "b",
              alias: "B",
              type: "fieldTypeB",
            },
            createdate: {
              name: "create_date",
              alias: "Create Date",
              type: "fieldTypeDate",
            },
            editdate: {
              name: "editdate",
              alias: "EditDate",
              type: "fieldTypeDate",
            },
          },
        },
        layer1: {
          itemId: "33298a2612ba4899adc41180c435425f",
          url: serviceUrl + "/" + 1,
          layerId: "1",
          fields: {
            c: {
              name: "c",
              alias: "C",
              type: "fieldTypeC",
            },
            d: {
              name: "d",
              alias: "D",
              type: "fieldTypeD",
            },
            createdate: {
              name: "create_date",
              alias: "Create Date",
              type: "fieldTypeDate",
            },
            editdate: {
              name: "editdate",
              alias: "EditDate",
              type: "fieldTypeDate",
            },
          },
        },
      };
      const expectedFieldInfos = {
        "0": {
          otherProperty: {
            test: "test",
          },
          deleteFields: ["createdate"],
        },
        "1": {
          otherProperty: {
            test: "test",
          },
          deleteFields: ["createdate"],
        },
      };
      const settings: any = getLayerSettings(fieldInfos, serviceUrl, "33298a2612ba4899adc41180c435425f");
      expect(fieldInfos).toEqual(expectedFieldInfos);
      expect(settings).toEqual(expectedSettings);
    });

    it("should not delete view fields", () => {
      const serviceUrl: string = "https://services/serviceName/FeatureServer";
      const fieldInfos: any = {
        "0": {
          newFields: [
            {
              name: "a0",
              alias: "A_a",
              type: "fieldTypeA",
            },
            {
              name: "b",
              alias: "B",
              type: "fieldTypeB",
            },
            {
              name: "createdate",
              alias: "Create Date",
              type: "fieldTypeDate",
            },
            {
              name: "create_date",
              alias: "Create Date",
              type: "fieldTypeDate",
            },
            {
              name: "editdate",
              alias: "EditDate",
              type: "fieldTypeDate",
            },
          ],
          sourceFields: [
            {
              name: "A",
              alias: "A_a",
              type: "fieldTypeA",
            },
            {
              name: "B",
              alias: "B",
              type: "fieldTypeB",
            },
            {
              name: "CreateDate",
              alias: "Create Date",
              type: "fieldTypeDate",
            },
            {
              name: "EditDate",
              alias: "EditDate",
              type: "fieldTypeDate",
            },
          ],
          otherProperty: {
            test: "test",
          },
          editFieldsInfo: {
            createDateField: "CreateDate",
            editDateField: "EditDate",
          },
          newEditFieldsInfo: {
            createDateField: "create_date",
            editDateField: "editdate",
          },
          sourceSchemaChangesAllowed: true,
          isView: true,
        },
        "1": {
          newFields: [
            {
              name: "c",
              alias: "C",
              type: "fieldTypeC",
            },
            {
              name: "d",
              alias: "D",
              type: "fieldTypeD",
            },
            {
              name: "createdate",
              alias: "Create Date",
              type: "fieldTypeDate",
            },
            {
              name: "create_date",
              alias: "Create Date",
              type: "fieldTypeDate",
            },
            {
              name: "editdate",
              alias: "EditDate",
              type: "fieldTypeDate",
            },
          ],
          sourceFields: [
            {
              name: "C",
              alias: "C",
              type: "fieldTypeC",
            },
            {
              name: "D",
              alias: "D",
              type: "fieldTypeD",
            },
            {
              name: "CreateDate",
              alias: "Create Date",
              type: "fieldTypeDate",
            },
            {
              name: "EditDate",
              alias: "EditDate",
              type: "fieldTypeDate",
            },
          ],
          otherProperty: {
            test: "test",
          },
          editFieldsInfo: {
            createDateField: "CreateDate",
          },
          newEditFieldsInfo: {
            createDateField: "create_date",
            editDateField: "editdate",
          },
          sourceSchemaChangesAllowed: true,
          isView: true,
        },
      };
      const expectedSettings: any = {
        layer0: {
          itemId: "33298a2612ba4899adc41180c435425f",
          url: serviceUrl + "/" + 0,
          layerId: "0",
          fields: {
            a: {
              name: "a0",
              alias: "A_a",
              type: "fieldTypeA",
            },
            b: {
              name: "b",
              alias: "B",
              type: "fieldTypeB",
            },
            createdate: {
              name: "create_date",
              alias: "Create Date",
              type: "fieldTypeDate",
            },
            editdate: {
              name: "editdate",
              alias: "EditDate",
              type: "fieldTypeDate",
            },
          },
        },
        layer1: {
          itemId: "33298a2612ba4899adc41180c435425f",
          url: serviceUrl + "/" + 1,
          layerId: "1",
          fields: {
            c: {
              name: "c",
              alias: "C",
              type: "fieldTypeC",
            },
            d: {
              name: "d",
              alias: "D",
              type: "fieldTypeD",
            },
            createdate: {
              name: "create_date",
              alias: "Create Date",
              type: "fieldTypeDate",
            },
            editdate: {
              name: "editdate",
              alias: "EditDate",
              type: "fieldTypeDate",
            },
          },
        },
      };
      const expectedFieldInfos = {
        "0": {
          otherProperty: {
            test: "test",
          },
        },
        "1": {
          otherProperty: {
            test: "test",
          },
        },
      };
      const settings: any = getLayerSettings(fieldInfos, serviceUrl, "33298a2612ba4899adc41180c435425f");
      expect(fieldInfos).toEqual(expectedFieldInfos);
      expect(settings).toEqual(expectedSettings);
    });
  });

  describe("setNamesAndTitles", () => {
    it("should use title as name if name is undefined", () => {
      const t: IItemTemplate = templates.getItemTemplateSkeleton();
      t.item.type = "Feature Service";
      t.item.name = undefined;
      t.item.title = "TheName";
      const _templates: IItemTemplate[] = [t];

      spyOn(generalHelpers, "generateGUID").and.returnValue("212dbc19b03943008fdfaf8d6adca00e");

      const expectedTemplate: IItemTemplate = templates.getItemTemplateSkeleton();
      expectedTemplate.item.type = "Feature Service";
      expectedTemplate.item.name = `TheName_212dbc19b03943008fdfaf8d6adca00e`;
      expectedTemplate.item.title = "TheName";
      const expected: IItemTemplate[] = [expectedTemplate];

      const actual: IItemTemplate[] = setNamesAndTitles(_templates);
      expect(actual).toEqual(expected);
    });

    it("should not allow duplicate names", () => {
      const t: IItemTemplate = templates.getItemTemplateSkeleton();
      t.item.type = "Feature Service";
      t.item.name = "TheName_99ac87b220fd45038fc92ba10843886d";
      t.item.title = undefined;
      const t2: IItemTemplate = templates.getItemTemplateSkeleton();
      t2.item.type = "Feature Service";
      t2.item.name = "TheName_88ac87b220fd45038fc92ba10843886d";
      t2.item.title = undefined;
      const _templates: IItemTemplate[] = [t, t2];

      spyOn(generalHelpers, "generateGUID").and.returnValue("212dbc19b03943008fdfaf8d6adca00e");

      const expectedTemplate: IItemTemplate = templates.getItemTemplateSkeleton();
      expectedTemplate.item.type = "Feature Service";
      expectedTemplate.item.name = `TheName_212dbc19b03943008fdfaf8d6adca00e`;
      expectedTemplate.item.title = "TheName_99ac87b220fd45038fc92ba10843886d";
      const expectedTemplate2: IItemTemplate = templates.getItemTemplateSkeleton();
      expectedTemplate2.item.type = "Feature Service";
      expectedTemplate2.item.name = `TheName_212dbc19b03943008fdfaf8d6adca00e_1`;
      expectedTemplate2.item.title = "TheName_88ac87b220fd45038fc92ba10843886d";
      const expected: IItemTemplate[] = [expectedTemplate, expectedTemplate2];

      const actual: IItemTemplate[] = setNamesAndTitles(_templates);
      expect(actual).toEqual(expected);
    });

    it("should limit the base name to 50 chars", () => {
      const t: IItemTemplate = templates.getItemTemplateSkeleton();
      t.item.type = "Feature Service";
      t.item.name = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab";
      t.item.title = "TheName";
      const _templates: IItemTemplate[] = [t];

      spyOn(generalHelpers, "generateGUID").and.returnValue("212dbc19b03943008fdfaf8d6adca00e");

      const expectedTemplate: IItemTemplate = templates.getItemTemplateSkeleton();
      expectedTemplate.item.type = "Feature Service";
      expectedTemplate.item.name = `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa_212dbc19b03943008fdfaf8d6adca00e`;
      expectedTemplate.item.title = "TheName";
      const expected: IItemTemplate[] = [expectedTemplate];

      const actual: IItemTemplate[] = setNamesAndTitles(_templates);
      expect(actual).toEqual(expected);
    });

    it("should limit the base name to 50 chars and handle existing guid in the name", () => {
      const t: IItemTemplate = templates.getItemTemplateSkeleton();
      t.item.type = "Feature Service";
      t.item.name = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab_aa766cba0dd44ec080420acc10990282";
      t.item.title = "TheName";
      const _templates: IItemTemplate[] = [t];

      spyOn(generalHelpers, "generateGUID").and.returnValue("212dbc19b03943008fdfaf8d6adca00e");

      const expectedTemplate: IItemTemplate = templates.getItemTemplateSkeleton();
      expectedTemplate.item.type = "Feature Service";
      expectedTemplate.item.name = `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa_212dbc19b03943008fdfaf8d6adca00e`;
      expectedTemplate.item.title = "TheName";
      const expected: IItemTemplate[] = [expectedTemplate];

      const actual: IItemTemplate[] = setNamesAndTitles(_templates);
      expect(actual).toEqual(expected);
    });
  });

  describe("updateSettingsFieldInfos", () => {
    it("should transfer settings when dependencies exist", () => {
      const layer0 = {
        fields: {
          objectid: {
            name: "OBJECTID",
          },
          jurisdictionname: {
            name: "jurisdictionname",
          },
          jurisdictiontype: {
            name: "jurisdictiontype",
          },
          regvoters: {
            name: "regvoters",
          },
          ballotscast: {
            name: "ballotscast",
          },
          ballotsnotcast: {
            name: "ballotsnotcast",
          },
          globalid: {
            name: "GlobalID",
          },
          creationdate: {
            name: "CreationDate",
          },
          creator: {
            name: "Creator",
          },
          editdate: {
            name: "EditDate",
          },
          editor: {
            name: "Editor",
          },
        },
      };
      const layer1 = {
        fields: {
          objectid: {
            name: "OBJECTID",
          },
          contest: {
            name: "contest",
          },
          category: {
            name: "category",
          },
          jurisdictionname: {
            name: "jurisdictionname",
          },
          candidate: {
            name: "candidate",
          },
          party: {
            name: "party",
          },
          numvotes: {
            name: "numvotes",
          },
          percvote: {
            name: "percvote",
          },
          globalid: {
            name: "GlobalID",
          },
          creationdate: {
            name: "CreationDate",
          },
          creator: {
            name: "Creator",
          },
          editdate: {
            name: "EditDate",
          },
          editor: {
            name: "Editor",
          },
        },
      };

      const item0 = {
        itemId: "svc0123456789",
        url: "",
        name: "ElectionResults_20190425_2018_51947",
      };

      const item1 = {
        itemId: "svc987654321",
        url: "",
        name: "ElectionResults_join_20190425_2019_12456",
        layer0: layer0,
        layer1: layer1,
        fieldInfos: {
          "0": layer0.fields,
          "1": layer1.fields,
        },
      };

      const expectedItem0 = {
        itemId: "svc0123456789",
        url: "",
        name: "ElectionResults_20190425_2018_51947",
        layer0: layer0,
        layer1: layer1,
        sourceServiceFields: {
          svc9876543210_org: item1.fieldInfos,
        },
      };

      const settings: any = {
        solutionName: "test",
        folderId: "fdr0123456789",
        organization: {},
        isPortal: false,
        svc0123456789_org: item0,
        svc9876543210_org: item1,
      };

      itemTemplate = {
        itemId: "svc0123456789",
        type: "Feature Service",
        key: "ixxi7v97b",
        item: {
          id: "svc0123456789",
          type: "Feature Service",
        },
        dependencies: ["svc9876543210_org"],
        groups: [],
        estimatedDeploymentCostFactor: 5,
        data: {},
        resources: [],
        properties: {},
      };

      const expectedSettings: any = {
        solutionName: "test",
        folderId: "fdr0123456789",
        organization: {},
        isPortal: false,
        svc0123456789_org: expectedItem0,
        svc9876543210_org: item1,
      };

      // test that the settings transfer
      updateSettingsFieldInfos(itemTemplate, settings);
      expect(settings).toEqual(expectedSettings);
    });

    it("should NOT transfer settings when dependencies DO NOT exist", () => {
      const layer0 = {
        fields: {
          objectid: {
            name: "OBJECTID",
          },
          jurisdictionname: {
            name: "jurisdictionname",
          },
          jurisdictiontype: {
            name: "jurisdictiontype",
          },
          regvoters: {
            name: "regvoters",
          },
          ballotscast: {
            name: "ballotscast",
          },
          ballotsnotcast: {
            name: "ballotsnotcast",
          },
          globalid: {
            name: "GlobalID",
          },
          creationdate: {
            name: "CreationDate",
          },
          creator: {
            name: "Creator",
          },
          editdate: {
            name: "EditDate",
          },
          editor: {
            name: "Editor",
          },
        },
      };
      const layer1 = {
        fields: {
          objectid: {
            name: "OBJECTID",
          },
          contest: {
            name: "contest",
          },
          category: {
            name: "category",
          },
          jurisdictionname: {
            name: "jurisdictionname",
          },
          candidate: {
            name: "candidate",
          },
          party: {
            name: "party",
          },
          numvotes: {
            name: "numvotes",
          },
          percvote: {
            name: "percvote",
          },
          globalid: {
            name: "GlobalID",
          },
          creationdate: {
            name: "CreationDate",
          },
          creator: {
            name: "Creator",
          },
          editdate: {
            name: "EditDate",
          },
          editor: {
            name: "Editor",
          },
        },
      };

      const settings: any = {
        "solutionName": "test",
        "folderId": "4437cab3aa154f5f85fa35dca36ddccb",
        "organization": {},
        "isPortal": false,
        "0998341a7a2a4e9c86c553287a1f3e94": {
          id: "166657ce19f34c32846cd12022e2c33a",
          url: "",
          name: "ElectionResults_20190425_2018_51947",
          layer0: layer0,
          layer1: layer1,
        },
        "ab766cba0dd44ec080420acc10990282": {
          id: "ebe7e53cc218423c9225ceb783d412b5",
          url: "",
          name: "ElectionResults_join_20190425_2019_12456",
        },
      };

      itemTemplate = {
        itemId: "ebe7e53cc218423c9225ceb783d412b5",
        type: "Feature Service",
        key: "ixxi7v97b",
        item: {
          id: "ebe7e53cc218423c9225ceb783d412b5",
          type: "Feature Service",
        },
        dependencies: [],
        groups: [],
        estimatedDeploymentCostFactor: 5,
        data: {},
        resources: [],
        properties: {},
      };

      const expectedSettings: any = {
        "solutionName": "test",
        "folderId": "4437cab3aa154f5f85fa35dca36ddccb",
        "organization": {},
        "isPortal": false,
        "0998341a7a2a4e9c86c553287a1f3e94": {
          id: "166657ce19f34c32846cd12022e2c33a",
          url: "",
          name: "ElectionResults_20190425_2018_51947",
          layer0: layer0,
          layer1: layer1,
        },
        "ab766cba0dd44ec080420acc10990282": {
          id: "ebe7e53cc218423c9225ceb783d412b5",
          url: "",
          name: "ElectionResults_join_20190425_2019_12456",
        },
      };

      updateSettingsFieldInfos(itemTemplate, settings);
      expect(settings).toEqual(expectedSettings);
    });

    it("should transfer combine sourceServiceFields", () => {
      const layer0 = {
        fields: {
          objectid: {
            name: "OBJECTID",
          },
          jurisdictionname: {
            name: "jurisdictionname",
          },
          jurisdictiontype: {
            name: "jurisdictiontype",
          },
          regvoters: {
            name: "regvoters",
          },
          ballotscast: {
            name: "ballotscast",
          },
          ballotsnotcast: {
            name: "ballotsnotcast",
          },
          globalid: {
            name: "GlobalID",
          },
          creationdate: {
            name: "CreationDate",
          },
          creator: {
            name: "Creator",
          },
          editdate: {
            name: "EditDate",
          },
          editor: {
            name: "Editor",
          },
        },
      };
      const layer1 = {
        fields: {
          objectid: {
            name: "OBJECTID",
          },
          contest: {
            name: "contest",
          },
          category: {
            name: "category",
          },
          jurisdictionname: {
            name: "jurisdictionname",
          },
          candidate: {
            name: "candidate",
          },
          party: {
            name: "party",
          },
          numvotes: {
            name: "numvotes",
          },
          percvote: {
            name: "percvote",
          },
          globalid: {
            name: "GlobalID",
          },
          creationdate: {
            name: "CreationDate",
          },
          creator: {
            name: "Creator",
          },
          editdate: {
            name: "EditDate",
          },
          editor: {
            name: "Editor",
          },
        },
      };

      const item0 = {
        itemId: "svc0123456789",
        url: "",
        name: "ElectionResults_20190425_2018_51947",
        sourceServiceFields: {
          svc9876543210_org1: {
            "2": [{ name: "A" }],
          },
        },
      };

      const item1 = {
        itemId: "svc987654321",
        url: "",
        name: "ElectionResults_join_20190425_2019_12456",
        layer0: layer0,
        layer1: layer1,
        fieldInfos: {
          "0": layer0.fields,
          "1": layer1.fields,
        },
      };

      const expectedItem0 = {
        itemId: "svc0123456789",
        url: "",
        name: "ElectionResults_20190425_2018_51947",
        layer0: layer0,
        layer1: layer1,
        sourceServiceFields: {
          svc9876543210_org: item1.fieldInfos,
          svc9876543210_org1: {
            "2": [{ name: "A" }],
          },
        },
      };

      const settings: any = {
        solutionName: "test",
        folderId: "fdr0123456789",
        organization: {},
        isPortal: false,
        svc0123456789_org: item0,
        svc9876543210_org: item1,
      };

      itemTemplate = {
        itemId: "svc0123456789",
        type: "Feature Service",
        key: "ixxi7v97b",
        item: {
          id: "svc0123456789",
          type: "Feature Service",
        },
        dependencies: ["svc9876543210_org"],
        groups: [],
        estimatedDeploymentCostFactor: 5,
        data: {},
        resources: [],
        properties: {},
      };

      const expectedSettings: any = {
        solutionName: "test",
        folderId: "fdr0123456789",
        organization: {},
        isPortal: false,
        svc0123456789_org: expectedItem0,
        svc9876543210_org: item1,
      };

      // test that the settings transfer
      updateSettingsFieldInfos(itemTemplate, settings);
      expect(settings).toEqual(expectedSettings);
    });
  });

  describe("deTemplatizeFieldInfos", () => {
    it("should detemplatize field references", () => {
      const fieldInfos: any = {
        "0": {
          displayField: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.jurisdictionname.name}}",
          templates: [
            {
              prototype: {
                attributes: {
                  "{{ab766cba0dd44ec080420acc10990282.layer0.fields.jurisdictionname.name}}": null,
                  "{{ab766cba0dd44ec080420acc10990282.layer0.fields.jurisdictiontype.name}}": null,
                  "{{ab766cba0dd44ec080420acc10990282.layer0.fields.regvoters.name}}": null,
                  "{{ab766cba0dd44ec080420acc10990282.layer0.fields.ballotscast.name}}": null,
                  "{{ab766cba0dd44ec080420acc10990282.layer0.fields.ballotsnotcast.name}}": null,
                },
              },
            },
          ],
          relationships: [],
          drawingInfo: {
            renderer: {
              visualVariables: [
                {
                  field: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.percvote.name}}",
                },
              ],
              authoringInfo: {},
              type: "uniqueValue",
              field1: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.party.name}}",
              defaultSymbol: {},
              uniqueValueInfos: [],
            },
          },
          types: [
            {
              id: "-",
              name: "-",
              domains: {
                "{{ab766cba0dd44ec080420acc10990282.layer0.fields.jurisdictionname.name}}": {
                  type: "inherited",
                },
                "{{ab766cba0dd44ec080420acc10990282.layer0.fields.jurisdictiontype.name}}": {
                  type: "inherited",
                },
              },
              templates: [
                {
                  name: "-",
                  description: "",
                  drawingTool: "esriFeatureEditToolPoint",
                  prototype: {
                    attributes: {
                      "{{ab766cba0dd44ec080420acc10990282.layer0.fields.jurisdictionname.name}}": null,
                      "{{ab766cba0dd44ec080420acc10990282.layer0.fields.jurisdictiontype.name}}": null,
                    },
                  },
                },
              ],
            },
          ],
          adminLayerInfo: [
            {
              name: "ElectionResults_1552494094382_join",
              sourceServiceName: "ElectionResults_20190425_2115_55512",
              sourceLayerId: 1,
              topFilter: {
                orderByFields: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.numvotes.name}} DESC",
                groupByFields:
                  "{{ab766cba0dd44ec080420acc10990282.layer1.fields.jurisdictionname.name}},{{ab766cba0dd44ec080420acc10990282.layer1.fields.contest.name}}",
              },
              sourceLayerFields: [
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.contest.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.category.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.jurisdictionname.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.candidate.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.party.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.numvotes.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.percvote.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.globalid.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.creationdate.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.creator.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.editdate.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.editor.name}}",
                },
              ],
              parentKeyFields: ["{{ab766cba0dd44ec080420acc10990282.layer0.fields.jurisdictionname.name}}"],
              keyFields: ["{{ab766cba0dd44ec080420acc10990282.layer1.fields.jurisdictionname.name}}"],
            },
          ],
        },
        "1": {
          displayField: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.jurisdictionname.name}}",
          templates: [],
          relationships: [],
        },
      };

      const popupInfos: any = {
        layers: {
          "0": {
            title: "",
            fieldInfos: [
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.objectid.name}}",
              },
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.contest.name}}",
              },
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.category.name}}",
              },
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.jurisdictionname.name}}",
              },
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.jurisdictiontype.name}}",
              },
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.candidate.name}}",
              },
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.party.name}}",
              },
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.numvotes.name}}",
              },
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.percvote.name}}",
              },
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.regvoters.name}}",
              },
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.ballotscast.name}}",
              },
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.ballotsnotcast.name}}",
              },
              {
                fieldName: "expression/expr0",
              },
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.globalid.name}}",
              },
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.creationdate.name}}",
              },
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.creator.name}}",
              },
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.editdate.name}}",
              },
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.editor.name}}",
              },
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.jurisdictionname_1552494094382.name}}",
              },
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.globalid_1552494094382.name}}",
              },
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.creationdate_1552494094382.name}}",
              },
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.creator_1552494094382.name}}",
              },
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.editdate_1552494094382.name}}",
              },
              {
                fieldName: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.editor_1552494094382.name}}",
              },
            ],
            description:
              "<table cellpadding='0' style='text-align: center; border-collapse: collapse; border-spacing: 0px; width: 100%; table-layout: fixed; margin: 0px -1px'>\n\t<tbody>\n\t\t<tr>\n\t\t\t<td style='background-color: {expression/expr0}; color: #FFFFFF; min-width:0%; max-width:100%; width:initial; text-align:center; vertical-align: middle; font-weight: normal; padding: 5px 0px; font-size:14px'>{{ab766cba0dd44ec080420acc10990282.layer0.fields.contest.name}}\n\t\t\t</td>\n\t\t</tr>\n\t\t<tr>\n\t\t\t<td style='text-align: center; width: 50%; max-width: 100%; padding-left: 0px;'>\n\t\t\t<br /><b>{{ab766cba0dd44ec080420acc10990282.layer0.fields.candidate.name}}</b> received the most votes in {{ab766cba0dd44ec080420acc10990282.layer0.fields.jurisdictionname.name}}.<br />\n\t\t\t</td>\n\t\t</tr>\n\t</tbody>\n\t</table>\n\t\n\t<table style='font-weight: normal; width: 100%; margin: 8px 0px; border-collapse: separate; border-spacing: 0px 8px; table-layout: fixed;'>\n\t<tbody>\n\t\t<tr>\n\t\t\t<td style='text-align: center; width: 100%; max-width: 100%; padding-left: 0px; padding-bottom: 10px'><b>Votes:</b><br /><font>{{ab766cba0dd44ec080420acc10990282.layer0.fields.numvotes.name}}<br /></font></td>\n\t\t\t\n\t\t\t<td style='text-align: center; width: 100%; max-width: 100%; padding-left: 0px; padding-bottom: 10px'><font><b>Percent:</b><br />{{ab766cba0dd44ec080420acc10990282.layer0.fields.percvote.name}}%\n\t\t\t</font></td>\n\t\t</tr>\n\t</tbody>\n</table>",
            expressionInfos: [
              {
                name: "expr0",
                title: "Banner Color",
                expression:
                  "if ($feature.{{ab766cba0dd44ec080420acc10990282.layer0.fields.party.name}} == 'Constitution'){\n    return '#A900E6';\n}\nelse if ($feature.{{ab766cba0dd44ec080420acc10990282.layer0.fields.party.name}} == 'Democratic'){\n    return '#244078';\n}\n    \nelse if ($feature.{{ab766cba0dd44ec080420acc10990282.layer0.fields.party.name}} == 'Green'){\n    return '#17AA5C';\n}\n\nelse if ($feature.{{ab766cba0dd44ec080420acc10990282.layer0.fields.party.name}} == 'Libertarian'){\n    return '#F9D334';\n}\n\nelse if ($feature.{{ab766cba0dd44ec080420acc10990282.layer0.fields.party.name}} == 'Republican'){\n    return '#B0301C';\n}\n \nelse if ($feature.{{ab766cba0dd44ec080420acc10990282.layer0.fields.party.name}} == 'Write In'){\n    return '#FFAA00';\n}\n    \nreturn '#D6D6D6';\n",
                returnType: "string",
              },
            ],
          },
        },
        tables: {},
      };

      const adminLayerInfos: any = {
        "0": {
          geometryField: {
            name: "ElectionResults_20190425_2115_55512.Shape",
          },
          viewLayerDefinition: {
            table: {
              sourceLayerId: 0,
              sourceLayerFields: [
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.jurisdictionname.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.jurisdictiontype.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.regvoters.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.ballotscast.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.ballotsnotcast.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.globalid.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.creationdate.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.creator.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.editdate.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.editor.name}}",
                },
              ],
              relatedTables: [],
            },
          },
        },
        "1": {
          geometryField: null,
          viewLayerDefinition: {
            table: {
              name: "ElectionResults_1552493773603_target",
              sourceServiceName: "ElectionResults_20190425_2115_55512",
              sourceLayerId: 1,
              sourceLayerFields: [
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.contest.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.category.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.jurisdictionname.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.candidate.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.party.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.numvotes.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.percvote.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.globalid.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.creationdate.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.creator.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.editdate.name}}",
                },
                {
                  source: "{{ab766cba0dd44ec080420acc10990282.layer1.fields.editor.name}}",
                },
              ],
              relatedTables: [
                {
                  name: "ElectionResults_1552493773603_join",
                  sourceServiceName: "ElectionResults_20190425_2115_55512",
                  sourceLayerId: 0,
                  sourceLayerFields: [
                    {
                      source: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.jurisdictionname.name}}",
                    },
                    {
                      source: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.jurisdictiontype.name}}",
                    },
                    {
                      source: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.regvoters.name}}",
                    },
                    {
                      source: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.ballotscast.name}}",
                    },
                    {
                      source: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.ballotsnotcast.name}}",
                    },
                    {
                      source: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.globalid.name}}",
                    },
                    {
                      source: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.creationdate.name}}",
                    },
                    {
                      source: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.creator.name}}",
                    },
                    {
                      source: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.editdate.name}}",
                    },
                    {
                      source: "{{ab766cba0dd44ec080420acc10990282.layer0.fields.editor.name}}",
                    },
                  ],
                  type: "INNER",
                  parentKeyFields: ["{{ab766cba0dd44ec080420acc10990282.layer1.fields.jurisdictionname.name}}"],
                  keyFields: ["{{ab766cba0dd44ec080420acc10990282.layer0.fields.jurisdictionname.name}}"],
                },
              ],
            },
          },
        },
      };

      const layerZero0 = {
        fields: {
          objectid: {
            name: "OBJECTID",
          },
          jurisdictionname: {
            name: "jurisdictionname",
          },
          jurisdictiontype: {
            name: "jurisdictiontype",
          },
          regvoters: {
            name: "regvoters",
          },
          ballotscast: {
            name: "ballotscast",
          },
          ballotsnotcast: {
            name: "ballotsnotcast",
          },
          globalid: {
            name: "GlobalID",
          },
          creationdate: {
            name: "CreationDate",
          },
          creator: {
            name: "Creator",
          },
          editdate: {
            name: "EditDate",
          },
          editor: {
            name: "Editor",
          },
        },
      };
      const layerOne0 = {
        fields: {
          objectid: {
            name: "OBJECTID",
          },
          contest: {
            name: "contest",
          },
          category: {
            name: "category",
          },
          jurisdictionname: {
            name: "jurisdictionname",
          },
          candidate: {
            name: "candidate",
          },
          party: {
            name: "party",
          },
          numvotes: {
            name: "numvotes",
          },
          percvote: {
            name: "percvote",
          },
          globalid: {
            name: "GlobalID",
          },
          creationdate: {
            name: "CreationDate",
          },
          creator: {
            name: "Creator",
          },
          editdate: {
            name: "EditDate",
          },
          editor: {
            name: "Editor",
          },
        },
      };

      const layerZero1 = {
        fields: {
          jurisdictionname: {
            name: "jurisdictionname",
          },
          jurisdictiontype: {
            name: "jurisdictiontype",
          },
          regvoters: {
            name: "regvoters",
          },
          ballotscast: {
            name: "ballotscast",
          },
          ballotsnotcast: {
            name: "ballotsnotcast",
          },
          globalid: {
            name: "GlobalID",
          },
          creationdate: {
            name: "CreationDate",
          },
          creator: {
            name: "Creator",
          },
          editdate: {
            name: "EditDate",
          },
          editor: {
            name: "Editor",
          },
          contest: {
            name: "contest",
          },
          category: {
            name: "category",
          },
          jurisdictionname_1552494094382: {
            name: "jurisdictionname_1552494094382",
          },
          candidate: {
            name: "candidate",
          },
          party: {
            name: "party",
          },
          numvotes: {
            name: "numvotes",
          },
          percvote: {
            name: "percvote",
          },
          globalid_1552494094382: {
            name: "GlobalID_1552494094382",
          },
          creationdate_1552494094382: {
            name: "CreationDate_1552494094382",
          },
          creator_1552494094382: {
            name: "Creator_1552494094382",
          },
          editdate_1552494094382: {
            name: "EditDate_1552494094382",
          },
          editor_1552494094382: {
            name: "Editor_1552494094382",
          },
          objectid: {
            name: "ObjectId",
          },
        },
      };
      const layerOne1 = {
        fields: {
          contest: {
            name: "contest",
          },
          category: {
            name: "category",
          },
          jurisdictionname: {
            name: "jurisdictionname",
          },
          candidate: {
            name: "candidate",
          },
          party: {
            name: "party",
          },
          numvotes: {
            name: "numvotes",
          },
          percvote: {
            name: "percvote",
          },
          globalid: {
            name: "GlobalID",
          },
          creationdate: {
            name: "CreationDate",
          },
          creator: {
            name: "Creator",
          },
          editdate: {
            name: "EditDate",
          },
          editor: {
            name: "Editor",
          },
          jurisdictionname_1552493773603: {
            name: "jurisdictionname_1552493773603",
          },
          jurisdictiontype: {
            name: "jurisdictiontype",
          },
          regvoters: {
            name: "regvoters",
          },
          ballotscast: {
            name: "ballotscast",
          },
          ballotsnotcast: {
            name: "ballotsnotcast",
          },
          globalid_1552493773603: {
            name: "GlobalID_1552493773603",
          },
          creationdate_1552493773603: {
            name: "CreationDate_1552493773603",
          },
          creator_1552493773603: {
            name: "Creator_1552493773603",
          },
          editdate_1552493773603: {
            name: "EditDate_1552493773603",
          },
          editor_1552493773603: {
            name: "Editor_1552493773603",
          },
          objectid: {
            name: "ObjectId",
          },
        },
      };

      const settings: any = {
        "solutionName": "test",
        "isPortal": false,
        "0998341a7a2a4e9c86c553287a1f3e94": {
          id: "82ed3b6c2236429d885c872b3e188ead",
          name: "ElectionResults_20190425_2115_55512",
          layer0: layerZero0,
          layer1: layerOne0,
        },
        "ab766cba0dd44ec080420acc10990282": {
          id: "b3c3021ef3e5409dbb2a35c8f111d1de",
          layer0: layerZero1,
          layer1: layerOne1,
        },
      };

      const expectedFieldInfos: any = {
        "0": {
          displayField: "jurisdictionname",
          templates: [
            {
              prototype: {
                attributes: {
                  jurisdictionname: null,
                  jurisdictiontype: null,
                  regvoters: null,
                  ballotscast: null,
                  ballotsnotcast: null,
                },
              },
            },
          ],
          relationships: [],
          drawingInfo: {
            renderer: {
              visualVariables: [
                {
                  field: "percvote",
                },
              ],
              authoringInfo: {},
              type: "uniqueValue",
              field1: "party",
              defaultSymbol: {},
              uniqueValueInfos: [],
            },
          },
          types: [
            {
              id: "-",
              name: "-",
              domains: {
                jurisdictionname: {
                  type: "inherited",
                },
                jurisdictiontype: {
                  type: "inherited",
                },
              },
              templates: [
                {
                  name: "-",
                  description: "",
                  drawingTool: "esriFeatureEditToolPoint",
                  prototype: {
                    attributes: {
                      jurisdictionname: null,
                      jurisdictiontype: null,
                    },
                  },
                },
              ],
            },
          ],
        },
        "1": {
          displayField: "jurisdictionname",
          templates: [],
          relationships: [],
        },
      };

      const expectedPopup: any = {
        layers: {
          "0": {
            title: "",
            fieldInfos: [
              {
                fieldName: "ObjectId",
              },
              {
                fieldName: "contest",
              },
              {
                fieldName: "category",
              },
              {
                fieldName: "jurisdictionname",
              },
              {
                fieldName: "jurisdictiontype",
              },
              {
                fieldName: "candidate",
              },
              {
                fieldName: "party",
              },
              {
                fieldName: "numvotes",
              },
              {
                fieldName: "percvote",
              },
              {
                fieldName: "regvoters",
              },
              {
                fieldName: "ballotscast",
              },
              {
                fieldName: "ballotsnotcast",
              },
              {
                fieldName: "expression/expr0",
              },
              {
                fieldName: "GlobalID",
              },
              {
                fieldName: "CreationDate",
              },
              {
                fieldName: "Creator",
              },
              {
                fieldName: "EditDate",
              },
              {
                fieldName: "Editor",
              },
              {
                fieldName: "jurisdictionname_1552494094382",
              },
              {
                fieldName: "GlobalID_1552494094382",
              },
              {
                fieldName: "CreationDate_1552494094382",
              },
              {
                fieldName: "Creator_1552494094382",
              },
              {
                fieldName: "EditDate_1552494094382",
              },
              {
                fieldName: "Editor_1552494094382",
              },
            ],
            description:
              "<table cellpadding='0' style='text-align: center; border-collapse: collapse; border-spacing: 0px; width: 100%; table-layout: fixed; margin: 0px -1px'>\n\t<tbody>\n\t\t<tr>\n\t\t\t<td style='background-color: {expression/expr0}; color: #FFFFFF; min-width:0%; max-width:100%; width:initial; text-align:center; vertical-align: middle; font-weight: normal; padding: 5px 0px; font-size:14px'>contest\n\t\t\t</td>\n\t\t</tr>\n\t\t<tr>\n\t\t\t<td style='text-align: center; width: 50%; max-width: 100%; padding-left: 0px;'>\n\t\t\t<br /><b>candidate</b> received the most votes in jurisdictionname.<br />\n\t\t\t</td>\n\t\t</tr>\n\t</tbody>\n\t</table>\n\t\n\t<table style='font-weight: normal; width: 100%; margin: 8px 0px; border-collapse: separate; border-spacing: 0px 8px; table-layout: fixed;'>\n\t<tbody>\n\t\t<tr>\n\t\t\t<td style='text-align: center; width: 100%; max-width: 100%; padding-left: 0px; padding-bottom: 10px'><b>Votes:</b><br /><font>numvotes<br /></font></td>\n\t\t\t\n\t\t\t<td style='text-align: center; width: 100%; max-width: 100%; padding-left: 0px; padding-bottom: 10px'><font><b>Percent:</b><br />percvote%\n\t\t\t</font></td>\n\t\t</tr>\n\t</tbody>\n</table>",
            expressionInfos: [
              {
                name: "expr0",
                title: "Banner Color",
                expression:
                  "if ($feature.party == 'Constitution'){\n    return '#A900E6';\n}\nelse if ($feature.party == 'Democratic'){\n    return '#244078';\n}\n    \nelse if ($feature.party == 'Green'){\n    return '#17AA5C';\n}\n\nelse if ($feature.party == 'Libertarian'){\n    return '#F9D334';\n}\n\nelse if ($feature.party == 'Republican'){\n    return '#B0301C';\n}\n \nelse if ($feature.party == 'Write In'){\n    return '#FFAA00';\n}\n    \nreturn '#D6D6D6';\n",
                returnType: "string",
              },
            ],
          },
        },
        tables: {},
      };

      const expectedAdminLayerInfos: any = {
        "0": {
          geometryField: {
            name: "ElectionResults_20190425_2115_55512.Shape",
          },
          viewLayerDefinition: {
            table: {
              sourceLayerId: 0,
              sourceLayerFields: [
                {
                  source: "jurisdictionname",
                },
                {
                  source: "jurisdictiontype",
                },
                {
                  source: "regvoters",
                },
                {
                  source: "ballotscast",
                },
                {
                  source: "ballotsnotcast",
                },
                {
                  source: "GlobalID",
                },
                {
                  source: "CreationDate",
                },
                {
                  source: "Creator",
                },
                {
                  source: "EditDate",
                },
                {
                  source: "Editor",
                },
              ],
              relatedTables: [
                {
                  name: "ElectionResults_1552494094382_join",
                  sourceServiceName: "ElectionResults_20190425_2115_55512",
                  sourceLayerId: 1,
                  topFilter: {
                    orderByFields: "numvotes DESC",
                    groupByFields: "jurisdictionname,contest",
                  },
                  sourceLayerFields: [
                    {
                      source: "contest",
                    },
                    {
                      source: "category",
                    },
                    {
                      source: "jurisdictionname",
                    },
                    {
                      source: "candidate",
                    },
                    {
                      source: "party",
                    },
                    {
                      source: "numvotes",
                    },
                    {
                      source: "percvote",
                    },
                    {
                      source: "GlobalID",
                    },
                    {
                      source: "CreationDate",
                    },
                    {
                      source: "Creator",
                    },
                    {
                      source: "EditDate",
                    },
                    {
                      source: "Editor",
                    },
                  ],
                  parentKeyFields: ["jurisdictionname"],
                  keyFields: ["jurisdictionname"],
                },
              ],
            },
          },
        },
        "1": {
          geometryField: null,
          viewLayerDefinition: {
            table: {
              name: "ElectionResults_1552493773603_target",
              sourceServiceName: "ElectionResults_20190425_2115_55512",
              sourceLayerId: 1,
              sourceLayerFields: [
                {
                  source: "contest",
                },
                {
                  source: "category",
                },
                {
                  source: "jurisdictionname",
                },
                {
                  source: "candidate",
                },
                {
                  source: "party",
                },
                {
                  source: "numvotes",
                },
                {
                  source: "percvote",
                },
                {
                  source: "GlobalID",
                },
                {
                  source: "CreationDate",
                },
                {
                  source: "Creator",
                },
                {
                  source: "EditDate",
                },
                {
                  source: "Editor",
                },
              ],
              relatedTables: [
                {
                  name: "ElectionResults_1552493773603_join",
                  sourceServiceName: "ElectionResults_20190425_2115_55512",
                  sourceLayerId: 0,
                  sourceLayerFields: [
                    {
                      source: "jurisdictionname",
                    },
                    {
                      source: "jurisdictiontype",
                    },
                    {
                      source: "regvoters",
                    },
                    {
                      source: "ballotscast",
                    },
                    {
                      source: "ballotsnotcast",
                    },
                    {
                      source: "GlobalID",
                    },
                    {
                      source: "CreationDate",
                    },
                    {
                      source: "Creator",
                    },
                    {
                      source: "EditDate",
                    },
                    {
                      source: "Editor",
                    },
                  ],
                  type: "INNER",
                  parentKeyFields: ["jurisdictionname"],
                  keyFields: ["jurisdictionname"],
                },
              ],
            },
          },
        },
      };

      const results: any = deTemplatizeFieldInfos(fieldInfos, popupInfos, adminLayerInfos, settings);
      expect(results.fieldInfos).toEqual(expectedFieldInfos);
      expect(results.popupInfos).toEqual(expectedPopup);
      expect(results.adminLayerInfos).toEqual(expectedAdminLayerInfos);
    });
  });

  describe("getLayersAndTables", () => {
    it("should handle only layers", () => {
      itemTemplate.properties.layers = [
        {
          id: 0,
        },
      ];
      const layersAndTables: any = getLayersAndTables(itemTemplate);
      const expecetd: any[] = [
        {
          item: {
            id: 0,
          },
          type: "layer",
        },
      ];
      expect(layersAndTables).toEqual(expecetd);
    });

    it("should handle only tables", () => {
      itemTemplate.properties.layers = [];
      itemTemplate.properties.tables = [
        {
          id: 1,
        },
      ];
      const layersAndTables: any = getLayersAndTables(itemTemplate);
      const expected: any[] = [
        {
          item: {
            id: 1,
          },
          type: "table",
        },
      ];
      expect(layersAndTables).toEqual(expected);
    });

    it("should handle layers and tables", () => {
      itemTemplate.properties.layers = [
        {
          id: 0,
        },
      ];
      itemTemplate.properties.tables = [
        {
          id: 1,
        },
      ];
      const layersAndTables: any = getLayersAndTables(itemTemplate);
      const expected: any[] = [
        {
          item: {
            id: 0,
          },
          type: "layer",
        },
        {
          item: {
            id: 1,
          },
          type: "table",
        },
      ];
      expect(layersAndTables).toEqual(expected);
    });

    it("should handle absence of layers and tables", () => {
      itemTemplate.properties.layers = null;
      itemTemplate.properties.tables = null;
      const layersAndTables: any = getLayersAndTables(itemTemplate);
      const expected: any[] = [];
      expect(layersAndTables).toEqual(expected);
    });
  });

  describe("getExistingLayersAndTables", () => {
    it("will fetch each existing layer and table", async () => {
      const url: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/ROWPermits_publiccomment/FeatureServer";
      const ids: number[] = [0, 1];

      fetchMock
        .post(url + "/0", mockItems.getAGOLLayerOrTable(0, "test0", "layer"))
        .post(url + "/1", mockItems.getAGOLLayerOrTable(1, "test1", "layer"));

      const results = await getExistingLayersAndTables(url, ids, MOCK_USER_SESSION);
      expect(results.length === 2);
    });

    it("suppresses and resolves errors", async () => {
      const url: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/ROWPermits_publiccomment/FeatureServer";
      const ids: number[] = [0, 1];
      const layer0Result = mockItems.getAGOLLayerOrTable(0, "test0", "layer");
      const layer1Error = new Error("some error");

      fetchMock.post(url + "/0", layer0Result).post(url + "/1", { throws: layer1Error });

      const results = await getExistingLayersAndTables(url, ids, MOCK_USER_SESSION);
      expect(results.length === 2);
      expect(results).toEqual([layer0Result, layer1Error]);
    });
  });

  describe("addFeatureServiceLayersAndTables", () => {
    it("should handle error when adding layers and/or tables", async () => {
      const expectedId: string = "svc1234567890";
      const id: string = "{{" + expectedId + ".itemId}}";

      const expectedUrl: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/ROWPermits_publiccomment/FeatureServer";
      const url: string = "{{" + expectedId + ".url}}";

      const adminUrl: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/admin/services/ROWPermits_publiccomment/FeatureServer";

      const layerKeyField: string = "{{" + expectedId + ".layer0.fields.globalid.name}}";
      const tableKeyField: string = "{{" + expectedId + ".layer1.fields.globalid.name}}";
      const layerDefQuery: string = "status = '{{" + expectedId + ".layer0.fields.boardreview.name}}'";
      const tableDefQuery: string = "status = '{{" + expectedId + ".layer1.fields.boardreview.name}}'";

      itemTemplate = templates.getItemTemplate("Feature Service", [], expectedUrl);
      itemTemplate.itemId = expectedId;
      itemTemplate.item.id = id;
      itemTemplate.estimatedDeploymentCostFactor = 0;
      itemTemplate.properties.service.serviceItemId = id;
      itemTemplate.properties.service.spatialReference = {
        wkid: 102100,
      };

      itemTemplate.properties.layers[0].serviceItemId = id;
      itemTemplate.properties.layers[0].relationships[0].keyField = layerKeyField;
      itemTemplate.properties.layers[0].definitionQuery = layerDefQuery;
      itemTemplate.properties.layers[0].viewDefinitionQuery = layerDefQuery;

      itemTemplate.properties.tables[0].serviceItemId = id;
      itemTemplate.properties.tables[0].relationships[0].keyField = tableKeyField;
      itemTemplate.properties.tables[0].definitionQuery = tableDefQuery;
      itemTemplate.properties.tables[0].viewDefinitionQuery = tableDefQuery;
      delete itemTemplate.item.item;

      const settings = utils.createMockSettings();
      settings.folderId = "fld1234567890";
      settings[expectedId] = {
        id: expectedId,
        url: expectedUrl,
        organization: _organization,
      };

      const createResponse: any = mockItems.getAGOLService([], [], true);
      createResponse.success = true;

      fetchMock
        .post(adminUrl + "?f=json", itemTemplate.properties.service)
        .post(url + "/sources?f=json", mockItems.getAGOLServiceSources())
        .post(utils.PORTAL_SUBSET.restUrl + "/content/users/casey/createService", createResponse)
        .post(
          "https://services123.arcgis.com/org1234567890/arcgis/rest/admin/services/ROWPermits_publiccomment/FeatureServer/addToDefinition",
          mockItems.get400Failure(),
        );

      await expectAsync(
        addFeatureServiceLayersAndTables(
          itemTemplate,
          settings,
          {
            layers: [],
            tables: [],
          },
          MOCK_USER_SESSION,
        ),
      ).toBeRejected();
    });

    it("should handle error on getLayersAndTables", async () => {
      const expectedId: string = "svc1234567890";
      const id: string = "{{" + expectedId + ".itemId}}";

      const expectedUrl: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/ROWPermits_publiccomment/FeatureServer";

      itemTemplate = templates.getItemTemplate("Feature Service", [], expectedUrl);
      itemTemplate.itemId = expectedId;
      itemTemplate.item.id = id;
      itemTemplate.estimatedDeploymentCostFactor = 0;
      itemTemplate.properties.service.serviceItemId = id;
      itemTemplate.properties.service.spatialReference = {
        wkid: 102100,
      };

      itemTemplate.properties.layers = [];
      itemTemplate.properties.tables = [];
      delete itemTemplate.item.item;

      const settings = utils.createMockSettings();
      settings.folderId = "fld1234567890";
      settings[expectedId] = {
        id: expectedId,
        url: expectedUrl,
        organization: _organization,
      };

      await addFeatureServiceLayersAndTables(
        itemTemplate,
        settings,
        {
          layers: [],
          tables: [],
        },
        MOCK_USER_SESSION,
      );
    });

    it("should handle error on layer updates", async () => {
      const expectedId: string = "svc1234567890";
      const id: string = "{{" + expectedId + ".itemId}}";

      const expectedUrl: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/ROWPermits_publiccomment/FeatureServer";

      const adminUrl: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/admin/services/ROWPermits_publiccomment/FeatureServer";

      const layerKeyField: string = "{{" + expectedId + ".layer0.fields.globalid.name}}";
      const tableKeyField: string = "{{" + expectedId + ".layer1.fields.globalid.name}}";
      const layerDefQuery: string = "status = '{{" + expectedId + ".layer0.fields.boardreview.name}}'";
      const tableDefQuery: string = "status = '{{" + expectedId + ".layer1.fields.boardreview.name}}'";

      itemTemplate = templates.getItemTemplate("Feature Service", [], expectedUrl);
      itemTemplate.itemId = expectedId;
      itemTemplate.item.id = id;
      itemTemplate.estimatedDeploymentCostFactor = 0;
      itemTemplate.properties.service.serviceItemId = id;
      itemTemplate.properties.service.spatialReference = {
        wkid: 102100,
      };

      itemTemplate.properties.layers[0].serviceItemId = id;
      itemTemplate.properties.layers[0].relationships[0].keyField = layerKeyField;
      itemTemplate.properties.layers[0].definitionQuery = layerDefQuery;
      itemTemplate.properties.layers[0].viewDefinitionQuery = layerDefQuery;

      itemTemplate.properties.tables[0].serviceItemId = id;
      itemTemplate.properties.tables[0].relationships[0].keyField = tableKeyField;
      itemTemplate.properties.tables[0].definitionQuery = tableDefQuery;
      itemTemplate.properties.tables[0].viewDefinitionQuery = tableDefQuery;
      delete itemTemplate.item.item;

      const settings = utils.createMockSettings();
      settings.folderId = "fld1234567890";
      settings[expectedId] = {
        id: expectedId,
        url: expectedUrl,
        organization: _organization,
      };

      const createResponse: any = mockItems.getAGOLService([], [], true);
      createResponse.success = true;

      fetchMock
        .post(adminUrl + "/0?f=json", itemTemplate.properties.layers[0])
        .post(adminUrl + "/1?f=json", itemTemplate.properties.tables[0])
        .post(adminUrl + "/deleteFromDefinition", mockItems.get400Failure())
        .post(
          "https://services123.arcgis.com/org1234567890/arcgis/rest/admin/services/ROWPermits_publiccomment/FeatureServer/addToDefinition",
          '{"success": "true"}',
        );

      spyOn(restHelpers, "getLayerUpdates").and.returnValue([
        { url: adminUrl + "/deleteFromDefinition", params: {}, args: {} },
      ] as IUpdate[]);

      await expectAsync(
        addFeatureServiceLayersAndTables(
          itemTemplate,
          settings,
          {
            layers: [],
            tables: [],
          },
          MOCK_USER_SESSION,
        ),
      ).toBeRejected();
    });

    it("should handle absence of item url", async () => {
      const expectedId: string = "svc1234567890";
      const id: string = "{{" + expectedId + ".itemId}}";

      const adminUrl: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/admin/services/ROWPermits_publiccomment/FeatureServer";

      const layerKeyField: string = "{{" + expectedId + ".layer0.fields.globalid.name}}";
      const tableKeyField: string = "{{" + expectedId + ".layer1.fields.globalid.name}}";
      const layerDefQuery: string = "status = '{{" + expectedId + ".layer0.fields.boardreview.name}}'";
      const tableDefQuery: string = "status = '{{" + expectedId + ".layer1.fields.boardreview.name}}'";

      itemTemplate = templates.getItemTemplate("Feature Service");
      itemTemplate.itemId = expectedId;
      itemTemplate.item.id = id;
      itemTemplate.estimatedDeploymentCostFactor = 0;
      itemTemplate.properties.service.serviceItemId = id;
      itemTemplate.properties.service.spatialReference = {
        wkid: 102100,
      };
      itemTemplate.properties.service.hasViews = true;

      itemTemplate.properties.layers[0].serviceItemId = id;
      itemTemplate.properties.layers[0].relationships[0].keyField = layerKeyField;
      itemTemplate.properties.layers[0].definitionQuery = layerDefQuery;
      itemTemplate.properties.layers[0].viewDefinitionQuery = layerDefQuery;

      itemTemplate.properties.tables[0].serviceItemId = id;
      itemTemplate.properties.tables[0].relationships[0].keyField = tableKeyField;
      itemTemplate.properties.tables[0].definitionQuery = tableDefQuery;
      itemTemplate.properties.tables[0].viewDefinitionQuery = tableDefQuery;
      delete itemTemplate.item.item;
      itemTemplate.item.url = undefined;

      const settings = utils.createMockSettings();
      settings.folderId = "fld1234567890";
      settings[expectedId] = {
        id: expectedId,
        organization: _organization,
      };

      const createResponse: any = mockItems.getAGOLService([], [], true);
      createResponse.success = true;

      fetchMock
        .post(adminUrl + "/0?f=json", itemTemplate.properties.layers[0])
        .post(adminUrl + "/1?f=json", itemTemplate.properties.tables[0])
        .post(adminUrl + "/refresh", mockItems.get400Failure())
        .post(
          "https://services123.arcgis.com/org1234567890/arcgis/rest/admin/services/ROWPermits_publiccomment/FeatureServer/addToDefinition",
          '{"success": "true"}',
        );

      await expectAsync(
        addFeatureServiceLayersAndTables(
          itemTemplate,
          settings,
          {
            layers: [],
            tables: [],
          },
          MOCK_USER_SESSION,
        ),
      ).toBeRejected();
    });

    it("should skip tracking view and collect replacement details", async () => {
      const expectedUrl: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/ROWPermits_publiccomment/FeatureServer";
      const itemId = "aaaaf0ffbdf042adb4ad24124b378d20";
      const sourceItemId = "bbbaf0ffbdf042adb4ad24124b378d20";

      itemTemplate = templates.getItemTemplate("Feature Service", [], expectedUrl);
      itemTemplate.item.typeKeywords = ["Location Tracking View"];
      itemTemplate.item.properties = {
        trackViewGroup: "grp123",
      };
      itemTemplate.itemId = itemId;

      const templateDictionary = {};
      templateDictionary[sourceItemId] = {
        itemId,
      };

      await addFeatureServiceLayersAndTables(
        itemTemplate,
        templateDictionary,
        {
          layers: [],
          tables: [],
        },
        MOCK_USER_SESSION,
      );

      const expectedTemplateDictionary = {
        itemId,
        layer0: {
          url: `${expectedUrl}/0`,
        },
      };

      expect(expectedTemplateDictionary).toEqual(templateDictionary[sourceItemId] as any);
    });
  });

  describe("addFeatureServiceDefinition", () => {
    it("should skip tracking view", async () => {
      const expectedUrl: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/ROWPermits_publiccomment/FeatureServer";

      itemTemplate = templates.getItemTemplate("Feature Service", [], expectedUrl);
      itemTemplate.item.typeKeywords = ["Location Tracking View"];
      itemTemplate.item.properties = {
        trackViewGroup: "grp123",
      };

      await addFeatureServiceDefinition(expectedUrl, [], {}, MOCK_USER_SESSION, "", {}, {}, itemTemplate);
    });
  });

  describe("updateLayerFieldReferences", () => {
    it("should handle error from postProcessFields", async () => {
      itemTemplate = templates.getItemTemplate("Feature Service");
      itemTemplate.item.url = undefined;

      await expectAsync(updateLayerFieldReferences(itemTemplate, null, null as any, null, null)).toBeRejected();
    });
  });

  describe("postProcessFields", () => {
    it("should update fieldInfos, settings, and layerInfos", async () => {
      const url: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/ROWPermits_publiccomment/FeatureServer";
      const adminUrl: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/admin/services/ROWPermits_publiccomment/FeatureServer";

      itemTemplate = templates.getItemTemplate("Feature Service");
      itemTemplate.item.url = url;

      const settings = utils.createMockSettings();
      settings.folderId = "fld1234567890";
      settings[itemTemplate.itemId] = {
        itemId: itemTemplate.itemId,
        url: url,
      };

      expect(settings[itemTemplate.itemId]).toBeDefined();
      expect(settings[itemTemplate.itemId].fieldInfos).toBeUndefined();

      const layer0 = mockItems.getAGOLLayerOrTable(0, "ROW Permits", "Feature Layer", [
        mockItems.createAGOLRelationship(0, 1, "esriRelRoleOrigin"),
      ]);

      const layer1 = mockItems.getAGOLLayerOrTable(1, "ROW Permit Comment", "Table", [
        mockItems.createAGOLRelationship(0, 1, "esriRelRoleDestination"),
      ]);
      const fieldInfos = cacheFieldInfos(layer1, cacheFieldInfos(layer0, {}, false, false), false, false);

      Object.keys(fieldInfos).forEach((k) => {
        fieldInfos[k].sourceFields[1].visible = false;
        fieldInfos[k].sourceFields[2].visible = false;
      });

      // modify the popupInfo with something to detemplatize
      const layer0Popup: any = itemTemplate.data.layers[0];
      layer0Popup.popupInfo.title =
        "{{" + itemTemplate.itemId + ".layer" + layer0Popup.id + ".fields." + layer0.fields[0].name + ".name}}";

      const layer1Popup: any = itemTemplate.data.tables[0];
      layer1Popup.popupInfo.title =
        "{{" + itemTemplate.itemId + ".layer" + layer1Popup.id + ".fields." + layer1.fields[0].name + ".name}}";

      const popupInfos: IPopupInfos = cachePopupInfos(itemTemplate.data);
      const adminLayerInfos: any = {};

      fetchMock.post(adminUrl + "/0?f=json", layer0).post(adminUrl + "/1?f=json", layer1);

      const layerInfos: any = await postProcessFields(itemTemplate, fieldInfos, popupInfos, adminLayerInfos, settings);
      // verify that fieldInfos are set
      expect(layerInfos).toBeDefined();
      expect(layerInfos.fieldInfos).toBeDefined();

      // verify the field info have been added to settings
      expect(settings[itemTemplate.itemId].layer0).toBeDefined();
      expect(settings[itemTemplate.itemId].layer1).toBeDefined();

      // verify popup infos
      expect(layerInfos.popupInfos).toBeDefined();
      expect(layerInfos.popupInfos.layers[layer0.id].title).toBeDefined();
      expect(layerInfos.popupInfos.layers[layer0.id].title).toEqual(layer0.fields[0].name);

      expect(layerInfos.popupInfos.tables[layer1.id].title).toBeDefined();
      expect(layerInfos.popupInfos.tables[layer1.id].title).toEqual(layer1.fields[0].name);

      expect(layerInfos.adminLayerInfos).toBeDefined();
    });

    it("should handle missing url", async () => {
      itemTemplate = templates.getItemTemplate("Feature Service");
      itemTemplate.item.url = undefined;

      await expectAsync(postProcessFields(itemTemplate, null, null, null, null)).toBeRejectedWith(
        utils.getFailureResponse({
          error: "Feature layer " + itemTemplate.itemId + " does not have a URL",
        }),
      );
    });

    it("should handle missing layers and tables", async () => {
      const url: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/ROWPermits_publiccomment/FeatureServer";

      itemTemplate = templates.getItemTemplate("Feature Service", undefined, url);
      itemTemplate.data = {
        tables: [],
        layers: [],
      };
      itemTemplate.properties.layers = [];
      itemTemplate.properties.tables = [];

      const layerInfos = await postProcessFields(itemTemplate, {}, cachePopupInfos(itemTemplate.data), {}, {});
      expect(layerInfos).toEqual({
        popupInfos: {
          layers: {},
          tables: {},
        },
        fieldInfos: {},
        adminLayerInfos: {},
      });
    });
  });

  describe("processContingentValues", () => {
    it("restructure and store fetched contingent values", async () => {
      const contingentValues = {
        typeCodes: ["Unknown", "Any", "Null", "Code", "Range"],
        stringDicts: [
          {
            domain: "CommonName",
            entries: ["Norway Maple"],
          },
        ],
        contingentValuesDefinition: {
          layerID: 0,
          layerName: "Trees",
          geometryType: "esriGeometryPoint",
          hasSubType: false,
          fieldGroups: [
            {
              name: "Tree Type",
              restrictive: false,
              fields: [
                {
                  id: 0,
                  name: "commonname",
                  fieldType: "esriFieldTypeString",
                },
              ],
              domains: {
                commonname: "CommonName",
                genus: "Genus",
                species: "Species",
              },
              contingentValues: [
                {
                  id: 1,
                  types: [3, 3, 3],
                  values: [0, 0, 0],
                },
              ],
            },
            {
              name: "Space Info",
              restrictive: false,
              fields: [
                {
                  id: 0,
                  name: "spacestatus",
                  fieldType: "esriFieldTypeString",
                },
              ],
              domains: {
                spacestatus: "SpaceStatus",
                spacetype: "SpaceType",
              },
              contingentValues: [
                {
                  id: 9,
                  types: [3, 3, 3],
                  values: [0, 0, 0],
                },
              ],
            },
          ],
        },
      };
      const properties: IFeatureServiceProperties = {
        service: {},
        layers: [
          {
            id: "0",
            hasContingentValuesDefinition: true,
          },
        ],
        tables: [
          {
            id: "1",
            hasContingentValuesDefinition: true,
          },
          {
            id: "2",
            hasContingentValuesDefinition: false,
          },
        ],
      };
      const adminUrl = "https://test.arcgis.com/org1234567890/arcgis/rest/admin/services/R/FeatureServer";
      const authentication = MOCK_USER_SESSION;

      const expectedContingentValues = {
        contingentValuesDefinition: {
          fieldGroups: [
            {
              name: "Tree Type",
              restrictive: false,
              fields: [
                {
                  id: 0,
                  name: "commonname",
                  fieldType: "esriFieldTypeString",
                },
              ],
              domains: {
                commonname: "CommonName",
                genus: "Genus",
                species: "Species",
              },
              contingentValues: [
                {
                  id: 1,
                  types: [3, 3, 3],
                  values: [0, 0, 0],
                },
              ],
            },
            {
              name: "Space Info",
              restrictive: false,
              fields: [
                {
                  id: 0,
                  name: "spacestatus",
                  fieldType: "esriFieldTypeString",
                },
              ],
              domains: {
                spacestatus: "SpaceStatus",
                spacetype: "SpaceType",
              },
              contingentValues: [
                {
                  id: 9,
                  types: [3, 3, 3],
                  values: [0, 0, 0],
                },
              ],
            },
          ],
          stringDicts: [
            {
              domain: "CommonName",
              entries: ["Norway Maple"],
            },
          ],
        },
      };

      const expected = {
        "0": expectedContingentValues,
        "1": expectedContingentValues,
      };

      fetchMock
        .post(adminUrl + "/0/contingentValues?f=json", contingentValues)
        .post(adminUrl + "/1/contingentValues?f=json", contingentValues);

      await processContingentValues(properties, adminUrl, authentication);
      expect(properties.contingentValues).toEqual(expected);
    });

    it("handles error fetching contingent values", async () => {
      const properties: IFeatureServiceProperties = {
        service: {},
        layers: [
          {
            id: "0",
            hasContingentValuesDefinition: true,
          },
        ],
        tables: [],
      };
      const adminUrl = "https://test.arcgis.com/org1234567890/arcgis/rest/admin/services/R/FeatureServer";
      const authentication = MOCK_USER_SESSION;

      fetchMock.post(adminUrl + "/0/contingentValues?f=json", mockItems.get400Failure());

      await expectAsync(processContingentValues(properties, adminUrl, authentication)).toBeRejected();
    });

    it("handles undefined layers and tables", async () => {
      const properties = {
        service: {},
        layers: undefined,
        tables: undefined,
      };
      const adminUrl = "https://test.arcgis.com/org1234567890/arcgis/rest/admin/services/R/FeatureServer";
      const authentication = MOCK_USER_SESSION;

      await processContingentValues(properties as any, adminUrl, authentication);
    });
  });

  describe("removeLayerOptimization", () => {
    it("will remove multiScaleGeometryInfo", () => {
      const actual: any = {
        a: "A",
        multiScaleGeometryInfo: [],
      };

      const expected: any = {
        a: "A",
      };

      removeLayerOptimization(actual);
      expect(actual).toEqual(expected);
    });
  });

  describe("updatePopupInfo", () => {
    it("should update popup with cached info", () => {
      const dataWithProp: any = {
        layers: [
          {
            id: 0,
          },
          {
            id: 1,
            popupInfo: {
              someProperty: {},
            },
          },
        ],
        tables: [
          {
            id: 2,
          },
          {
            id: 637,
            popupInfo: {
              someProperty: {},
            },
          },
        ],
      };
      // Test with popups
      itemTemplate = {
        itemId: "",
        key: "",
        properties: {
          service: {},
          layers: [
            {
              fields: [],
            },
          ],
          tables: [],
        },
        type: "",
        item: {
          id: "",
          type: "",
          text: {},
        },
        data: dataWithProp,
        resources: [],
        dependencies: [],
        groups: [],
        estimatedDeploymentCostFactor: 0,
      };

      const popupInfos = cachePopupInfos(itemTemplate.data);

      const expected: any = {
        layers: [
          {
            id: 0,
            popupInfo: {},
          },
          {
            id: 1,
            popupInfo: {
              someProperty: {},
            },
          },
        ],
        tables: [
          {
            id: 2,
            popupInfo: {},
          },
          {
            id: 637,
            popupInfo: {
              someProperty: {},
            },
          },
        ],
      };

      updatePopupInfo(itemTemplate, popupInfos);
      expect(itemTemplate.data).toEqual(expected);
    });
  });

  describe("_templatize", () => {
    it("should return a well formed template for a field reference", () => {
      const path: string = "fields.layer";
      let value: string = "name";
      let expectedV: string = "{{fields.layer.name}}";
      let v: string = _templatize(path, value);
      expect(v).toEqual(expectedV);

      value = "NAME"; // should be changed to all lowercase
      v = _templatize(path, value);
      expect(v).toEqual(expectedV);

      // should return the template if already templatized
      expectedV = v;
      value = v;
      v = _templatize(path, value);
      expect(v).toEqual(expectedV);
    });
  });

  describe("_templatizeProperty", () => {
    it("should templatize an object property", () => {
      const propName = "someProp";

      // eslint-disable-next-line prefer-const
      let obj: any;
      _templatizeProperty(obj, propName, basePath, "name");
      expect(obj).toBeUndefined();

      obj = {};
      _templatizeProperty(obj, propName, basePath, "name");
      expect(obj).toEqual({});

      obj[propName] = "NaMe123";
      _templatizeProperty(obj, propName, basePath, "name");
      expect(obj).toEqual({
        someProp: "{{" + basePath + ".name123.name}}",
      });
    });
  });

  describe("_templatizeAdminLayerInfo", () => {
    it("should not fail without adminLayerInfo", () => {
      const layer: any = {};
      const dependencies: IDependency[] = [];
      const templateDictionary: any = {};

      const adminLayerInfo = _templatizeAdminLayerInfo(layer, dependencies, templateDictionary);
      expect(adminLayerInfo).toEqual({});
    });

    it("should handle common adminLayerInfo", () => {
      const layer: any = {
        adminLayerInfo: {
          geometryField: {
            name: "Shape",
          },
          xssTrustedFields: [],
          tableName: "ABC",
          viewLayerDefinition: {
            sourceId: "4818",
            sourceServiceName: "SomeName",
            table: {
              sourceId: "4818_2",
              sourceServiceName: "SomeName",
              relatedTables: [
                {
                  sourceId: "4818_3",
                  sourceServiceName: "SomeName_3",
                },
              ],
            },
          },
        },
      };
      const dependencies: IDependency[] = [
        {
          id: "ab766cba0dd44ec080420acc10990282",
          name: "SomeName",
        },
        {
          id: "bc766cba0dd44ec080420acc10990282",
          name: "SomeName_3",
        },
      ];
      const expected: any = {
        geometryField: {
          name: "Shape",
        },
        viewLayerDefinition: {
          sourceServiceName: "{{ab766cba0dd44ec080420acc10990282.name}}",
          table: {
            sourceServiceName: "{{ab766cba0dd44ec080420acc10990282.name}}",
            relatedTables: [
              {
                sourceServiceName: "{{bc766cba0dd44ec080420acc10990282.name}}",
              },
            ],
          },
        },
      };

      const templateDictionary: any = {};
      const adminLayerInfo = _templatizeAdminLayerInfo(layer, dependencies, templateDictionary);
      expect(adminLayerInfo).toEqual(expected);
    });

    it("should handle common adminLayerInfo with multiServiceView", () => {
      const layer: any = {
        isMultiServicesView: true,
        adminLayerInfo: {
          geometryField: {
            name: "Shape",
          },
          xssTrustedFields: [],
          tableName: "ABC",
          viewLayerDefinition: {
            sourceId: "4818",
            sourceServiceName: "SomeName",
            table: {
              sourceId: "4818_2",
              sourceServiceName: "SomeName",
              relatedTables: [
                {
                  sourceId: "4818_3",
                  sourceServiceName: "SomeName_3",
                },
              ],
            },
          },
        },
      };
      const dependencies: IDependency[] = [
        {
          id: "ab766cba0dd44ec080420acc10990282",
          name: "SomeName",
        },
        {
          id: "bc766cba0dd44ec080420acc10990282",
          name: "SomeName_3",
        },
      ];
      const expected: any = {
        geometryField: {
          name: "Shape",
        },
        viewLayerDefinition: {
          sourceServiceName: "{{ab766cba0dd44ec080420acc10990282.name}}",
          table: {
            sourceServiceName: "{{ab766cba0dd44ec080420acc10990282.name}}",
            relatedTables: [
              {
                sourceServiceName: "{{bc766cba0dd44ec080420acc10990282.name}}",
              },
            ],
          },
        },
      };

      const templateDictionary: any = {};
      const adminLayerInfo = _templatizeAdminLayerInfo(layer, dependencies, templateDictionary);
      expect(adminLayerInfo).toEqual(expected);
    });
  });

  describe("_processAdminObject", () => {
    it("should not fail when empty", () => {
      const object: any = {};
      const dependencies: IDependency[] = [];
      _processAdminObject(object, dependencies);
      expect(object).toEqual({});
      expect(dependencies).toEqual([]);
    });

    it("should handle sourceId", () => {
      const object: any = {
        sourceId: "4818",
      };
      const dependencies: any[] = [];
      _processAdminObject(object, dependencies);
      expect(object).toEqual({});
      expect(dependencies).toEqual([]);
    });

    it("should handle sourceServiceName and extra prop", () => {
      const object: any = {
        sourceId: "4818",
        otherProp: {},
        sourceServiceName: "SomeName",
      };
      const dependencies: any[] = [
        {
          id: "ab766cba0dd44ec080420acc10990282",
          name: "SomeName",
        },
      ];

      const expectedObject: any = {
        otherProp: {},
        sourceServiceName: "{{ab766cba0dd44ec080420acc10990282.name}}",
      };
      const expectedDependencies: any[] = [
        {
          id: "ab766cba0dd44ec080420acc10990282",
          name: "SomeName",
        },
      ];

      _processAdminObject(object, dependencies);
      expect(object).toEqual(expectedObject);
      expect(dependencies).toEqual(expectedDependencies);
    });
  });

  describe("_templatizeSourceServiceName", () => {
    it("returns undefined when no dependencies remain after filtering by lookup name", () => {
      const lookupName = "abc";
      const dependencies: IDependency[] = [];
      const actual = _templatizeSourceServiceName(lookupName, dependencies);
      expect(actual).toBeUndefined();
    });
  });

  describe("_templatizeAdminLayerInfoFields", () => {
    it("should not fail with empty layer", () => {
      const layer: any = {};
      const dependencies: any[] = [];
      _templatizeAdminLayerInfoFields(layer, dependencies);
      expect(layer).toEqual({});
    });

    it("should handle empty properties", () => {
      const layer = {
        adminLayerInfo: {
          viewLayerDefinition: {
            table: {
              sourceServiceName: "Table",
              sourceLayerId: 0,
              relatedTables: [
                {
                  sourceServiceName: "Table",
                  sourceLayerId: 1,
                },
              ],
            },
          },
        },
      };
      const dependencies = [
        {
          name: "Table",
          id: "cd766cba0dd44ec080420acc10990282",
        },
      ];

      const expected: any = {
        adminLayerInfo: {
          viewLayerDefinition: {
            table: {
              sourceServiceName: "Table",
              sourceLayerId: 0,
              relatedTables: [
                {
                  sourceServiceName: "Table",
                  sourceLayerId: 1,
                  parentKeyFields: [],
                  keyFields: [],
                },
              ],
            },
          },
        },
      };

      _templatizeAdminLayerInfoFields(layer, dependencies);
      expect(layer).toEqual(expected);
    });

    it("should templatize field source references and leave the name", () => {
      const layer = {
        adminLayerInfo: {
          viewLayerDefinition: {
            table: {
              sourceServiceName: "Table",
              sourceLayerId: 0,
              sourceLayerFields: [
                {
                  name: "A",
                  source: "A",
                },
                {
                  name: "B",
                  source: "B",
                },
              ],
            },
          },
        },
      };
      const dependencies = [
        {
          name: "Table",
          id: "cd766cba0dd44ec080420acc10990282",
        },
      ];

      const expected: any = {
        adminLayerInfo: {
          viewLayerDefinition: {
            table: {
              sourceServiceName: "Table",
              sourceLayerId: 0,
              sourceLayerFields: [
                {
                  name: "A",
                  source: "{{" + basePath + ".a.name}}",
                },
                {
                  name: "B",
                  source: "{{" + basePath + ".b.name}}",
                },
              ],
            },
          },
        },
      };

      _templatizeAdminLayerInfoFields(layer, dependencies);
      expect(layer).toEqual(expected);
    });

    it("should handle field in related tables", () => {
      const relatedBasePath: string = itemId + ".layer1.fields";
      const layer = {
        adminLayerInfo: {
          viewLayerDefinition: {
            table: {
              sourceServiceName: "Table",
              sourceLayerId: 0,
              sourceLayerFields: [
                {
                  name: "A",
                  source: "A",
                },
                {
                  name: "B",
                  source: "B",
                },
              ],
              relatedTables: [
                {
                  sourceServiceName: "Table",
                  sourceLayerId: 1,
                  topFilter: {
                    orderByFields: "AA DESC",
                    groupByFields: "BB",
                  },
                  sourceLayerFields: [
                    {
                      name: "AA",
                      source: "AA",
                    },
                    {
                      name: "BB",
                      source: "BB",
                    },
                  ],
                  parentKeyFields: ["A"],
                  keyFields: ["AA"],
                },
              ],
            },
          },
        },
      };
      const dependencies = [
        {
          name: "Table",
          id: "cd766cba0dd44ec080420acc10990282",
        },
      ];

      const expected: any = {
        adminLayerInfo: {
          viewLayerDefinition: {
            table: {
              sourceServiceName: "Table",
              sourceLayerId: 0,
              sourceLayerFields: [
                {
                  name: "A",
                  source: "{{" + basePath + ".a.name}}",
                },
                {
                  name: "B",
                  source: "{{" + basePath + ".b.name}}",
                },
              ],
              relatedTables: [
                {
                  sourceServiceName: "Table",
                  sourceLayerId: 1,
                  topFilter: {
                    orderByFields: "{{" + relatedBasePath + ".aa.name}} DESC",
                    groupByFields: "{{" + relatedBasePath + ".bb.name}}",
                  },
                  sourceLayerFields: [
                    {
                      name: "AA",
                      source: "{{" + relatedBasePath + ".aa.name}}",
                    },
                    {
                      name: "BB",
                      source: "{{" + relatedBasePath + ".bb.name}}",
                    },
                  ],
                  parentKeyFields: ["{{" + basePath + ".a.name}}"],
                  keyFields: ["{{" + relatedBasePath + ".aa.name}}"],
                },
              ],
            },
          },
        },
      };

      _templatizeAdminLayerInfoFields(layer, dependencies);
      expect(layer).toEqual(expected);
    });
  });

  describe("_getDependantItemId", () => {
    it("returns an empty string when no dependencies remain after filtering by lookup name", () => {
      const lookupName = "abc";
      const dependencies: IDependency[] = [];
      const actual = _getDependantItemId(lookupName, dependencies);
      expect(actual).toEqual("");
    });
  });

  describe("_templatizeTopFilter", () => {
    it("handles missing topFilter fields via no-ops", () => {
      const topFilter: any = {};
      _templatizeTopFilter(topFilter, basePath);
      expect(topFilter).toEqual({});
    });
  });

  describe("_templatizeRelationshipFields", () => {
    it("should not fail with undefined layer", () => {
      const layer: any = undefined;
      _templatizeRelationshipFields(layer, itemId);
      expect(layer).toBeUndefined();
    });

    it("should not fail with no relationships", () => {
      const layer: any = {
        relationships: [],
      };

      const expected: any = {
        relationships: [],
      };

      _templatizeRelationshipFields(layer, itemId);
      expect(layer).toEqual(expected);
    });

    it("should templatize field references within relationships", () => {
      const id: string = "1";
      const layer: any = {
        id: "0",
        relationships: [
          {
            relatedTableId: id,
            keyField: "AA",
          },
        ],
      };
      const expected: any = {
        id: "0",
        relationships: [
          {
            relatedTableId: id,
            keyField: "{{" + itemId + ".layer0.fields.aa.name}}",
          },
        ],
      };

      _templatizeRelationshipFields(layer, itemId);
      expect(layer).toEqual(expected);
    });
  });

  describe("_templatizePopupInfo", () => {
    it("should not fail with undefined", () => {
      const layerDefinition: any = undefined;
      const layer: any = undefined;
      const fieldNames: any = undefined;
      _templatizePopupInfo(layerDefinition, layer, basePath, itemId, fieldNames);
      expect(layerDefinition).toBeUndefined();
      expect(layer).toBeUndefined();
      expect(fieldNames).toBeUndefined();
    });

    it("should not fail without popup", () => {
      const layerDefinition: any = {};
      const layer: any = {};
      const fieldNames: any = ["A", "B", "AA", "BB", "name"];
      _templatizePopupInfo(layerDefinition, layer, basePath, itemId, fieldNames);
      expect(layerDefinition).toEqual({});
      expect(layer).toEqual({});
    });

    it("should not fail with empty popup", () => {
      const layerDefinition: any = { popupInfo: {} };
      const layer: any = {};
      const fieldNames: any = ["A", "B", "AA", "BB", "name"];
      _templatizePopupInfo(layerDefinition, layer, basePath, itemId, fieldNames);
      expect(layerDefinition).toEqual({ popupInfo: {} });
      expect(layer).toEqual({});
    });

    it("should handle popup in view layer", () => {
      const layerDefinition: any = {
        popupInfo: {
          title: "{A}",
          description: "",
          fieldInfos: [
            {
              fieldName: "relationships/0/AA",
              label: "AA",
              isEditable: false,
              visible: false,
              statisticType: "count",
              stringFieldOption: "textbox",
            },
            {
              fieldName: "A",
              label: "A",
              isEditable: false,
              visible: false,
              statisticType: "count",
              stringFieldOption: "textbox",
            },
            {
              fieldName: "expression/expr2",
              label: "A",
              isEditable: false,
              visible: false,
              statisticType: "count",
              stringFieldOption: "textbox",
            },
          ],
          expressionInfos: [
            {
              name: "expr1",
              title: "Population (Expr)",
              expression: "$feature.A",
              returnType: "number",
            },
            {
              name: "expr2",
              title: "Name (Abbr) (Expr)",
              expression: "$feature.A + ' (' + $feature.B + ')'",
              returnType: "string",
            },
          ],
          popupElements: [
            {
              type: "text",
              text: "Some descriptive text describing the popup.",
            },
            {
              type: "fields",
              fieldInfos: [
                {
                  fieldName: "relationships/0/BB",
                  label: "Postcode",
                  isEditable: false,
                  visible: false,
                  statisticType: "count",
                  stringFieldOption: "textbox",
                },
              ],
            },
            {
              type: "media",
              mediaInfos: [
                {
                  title: "Chart stats",
                  type: "barchart",
                  caption: "For a better idea...",
                  value: {
                    fields: ["relationships/0/AA"],
                    tooltipField: "relationships/0/AA",
                    normalizeField: "AA",
                  },
                },
              ],
            },
            {
              type: "attachments",
              displayType: "list",
            },
          ],
          mediaInfos: [
            {
              title: "Chart stats",
              type: "barchart",
              caption: "For a better idea...",
              value: {
                fields: ["relationships/0/BB", "A"],
                tooltipField: "relationships/0/AA",
                normalizeField: "AA",
              },
            },
          ],
        },
      };

      const relatedTableId: string = "1";

      const layer: any = {
        isView: true,
        adminLayerInfo: {
          viewLayerDefinition: {
            table: {
              relatedTables: [
                {
                  sourceLayerId: relatedTableId,
                },
              ],
            },
          },
        },
      };

      const fieldNames: string[] = ["A", "B", "name"];

      const relatedBasePath = itemId + ".layer" + relatedTableId + ".fields";

      const expectedLayerDef: any = {
        popupInfo: {
          title: "{{{" + basePath + ".a.name}}}",
          description: "",
          fieldInfos: [
            {
              fieldName: "relationships/0/{{" + relatedBasePath + ".aa.name}}",
              label: "AA",
              isEditable: false,
              visible: false,
              statisticType: "count",
              stringFieldOption: "textbox",
            },
            {
              fieldName: "{{" + basePath + ".a.name}}",
              label: "A",
              isEditable: false,
              visible: false,
              statisticType: "count",
              stringFieldOption: "textbox",
            },
            {
              fieldName: "expression/expr2",
              label: "A",
              isEditable: false,
              visible: false,
              statisticType: "count",
              stringFieldOption: "textbox",
            },
          ],
          expressionInfos: [
            {
              name: "expr1",
              title: "Population (Expr)",
              expression: "$feature.{{" + basePath + ".a.name}}",
              returnType: "number",
            },
            {
              name: "expr2",
              title: "Name (Abbr) (Expr)",
              expression: "$feature.{{" + basePath + ".a.name}} + ' (' + $feature.{{" + basePath + ".b.name}} + ')'",
              returnType: "string",
            },
          ],
          popupElements: [
            {
              type: "text",
              text: "Some descriptive text describing the popup.",
            },
            {
              type: "fields",
              fieldInfos: [
                {
                  fieldName: "relationships/0/{{" + relatedBasePath + ".bb.name}}",
                  label: "Postcode",
                  isEditable: false,
                  visible: false,
                  statisticType: "count",
                  stringFieldOption: "textbox",
                },
              ],
            },
            {
              type: "media",
              mediaInfos: [
                {
                  title: "Chart stats",
                  type: "barchart",
                  caption: "For a better idea...",
                  value: {
                    fields: ["relationships/0/{{" + relatedBasePath + ".aa.name}}"],
                    tooltipField: "relationships/0/{{" + relatedBasePath + ".aa.name}}",
                    normalizeField: "{{" + basePath + ".aa.name}}",
                  },
                },
              ],
            },
            {
              type: "attachments",
              displayType: "list",
            },
          ],
          mediaInfos: [
            {
              title: "Chart stats",
              type: "barchart",
              caption: "For a better idea...",
              value: {
                fields: ["relationships/0/{{" + relatedBasePath + ".bb.name}}", "{{" + basePath + ".a.name}}"],
                tooltipField: "relationships/0/{{" + relatedBasePath + ".aa.name}}",
                normalizeField: "{{" + basePath + ".aa.name}}",
              },
            },
          ],
        },
      };

      const expectedLayer: any = {
        isView: true,
        adminLayerInfo: {
          viewLayerDefinition: {
            table: {
              relatedTables: [
                {
                  sourceLayerId: relatedTableId,
                },
              ],
            },
          },
        },
      };

      const expectedFieldNames: string[] = ["A", "B", "name"];

      _templatizePopupInfo(layerDefinition, layer, basePath, itemId, fieldNames);
      expect(layerDefinition).toEqual(expectedLayerDef);
      // should be untouched
      expect(layer).toEqual(expectedLayer);
      // should be untouched
      expect(fieldNames).toEqual(expectedFieldNames);
    });

    it("should handle popup when not a view", () => {
      const relatedTableId: string = "1";

      const relatedBasePath = itemId + ".layer" + relatedTableId + ".fields";

      const layerDefinition: any = {
        popupInfo: {
          title: "{A}",
          description: "",
          fieldInfos: [
            {
              fieldName: "relationships/0/AA",
              label: "AA",
              isEditable: false,
              visible: false,
              statisticType: "count",
              stringFieldOption: "textbox",
            },
            {
              fieldName: "A",
              label: "A",
              isEditable: false,
              visible: false,
              statisticType: "count",
              stringFieldOption: "textbox",
            },
          ],
          expressionInfos: [
            {
              name: "expr1",
              title: "Population (Expr)",
              expression: "$feature.A",
              returnType: "number",
            },
            {
              name: "expr2",
              title: "Name (Abbr) (Expr)",
              expression: "$feature.A + ' (' + $feature.B + ')'",
              returnType: "string",
            },
          ],
          popupElements: [
            {
              type: "text",
              text: "Some descriptive text describing the popup.",
            },
            {
              type: "fields",
              fieldInfos: [
                {
                  fieldName: "relationships/0/BB",
                  label: "Postcode",
                  isEditable: false,
                  visible: false,
                  statisticType: "count",
                  stringFieldOption: "textbox",
                },
              ],
            },
            {
              type: "media",
              mediaInfos: [
                {
                  title: "Chart stats",
                  type: "barchart",
                  caption: "For a better idea...",
                  value: {
                    fields: ["relationships/0/AA"],
                    tooltipField: "relationships/0/AA",
                  },
                },
              ],
            },
            {
              type: "attachments",
              displayType: "list",
            },
          ],
          mediaInfos: [
            {
              title: "Chart stats",
              type: "barchart",
              caption: "For a better idea...",
              value: {
                fields: ["relationships/0/BB", "A"],
                tooltipField: "relationships/0/AA",
              },
            },
          ],
        },
      };

      const layer: any = {
        isView: false,
        relationships: [
          {
            relatedTableId: relatedTableId,
          },
        ],
      };

      const fieldNames: string[] = ["A", "B", "name"];

      const expectedLayerDef: any = {
        popupInfo: {
          title: "{{{" + basePath + ".a.name}}}",
          description: "",
          fieldInfos: [
            {
              fieldName: "relationships/0/{{" + relatedBasePath + ".aa.name}}",
              label: "AA",
              isEditable: false,
              visible: false,
              statisticType: "count",
              stringFieldOption: "textbox",
            },
            {
              fieldName: "{{" + basePath + ".a.name}}",
              label: "A",
              isEditable: false,
              visible: false,
              statisticType: "count",
              stringFieldOption: "textbox",
            },
          ],
          expressionInfos: [
            {
              name: "expr1",
              title: "Population (Expr)",
              expression: "$feature.{{" + basePath + ".a.name}}",
              returnType: "number",
            },
            {
              name: "expr2",
              title: "Name (Abbr) (Expr)",
              expression: "$feature.{{" + basePath + ".a.name}} + ' (' + $feature.{{" + basePath + ".b.name}} + ')'",
              returnType: "string",
            },
          ],
          popupElements: [
            {
              type: "text",
              text: "Some descriptive text describing the popup.",
            },
            {
              type: "fields",
              fieldInfos: [
                {
                  fieldName: "relationships/0/{{" + relatedBasePath + ".bb.name}}",
                  label: "Postcode",
                  isEditable: false,
                  visible: false,
                  statisticType: "count",
                  stringFieldOption: "textbox",
                },
              ],
            },
            {
              type: "media",
              mediaInfos: [
                {
                  title: "Chart stats",
                  type: "barchart",
                  caption: "For a better idea...",
                  value: {
                    fields: ["relationships/0/{{" + relatedBasePath + ".aa.name}}"],
                    tooltipField: "relationships/0/{{" + relatedBasePath + ".aa.name}}",
                  },
                },
              ],
            },
            {
              type: "attachments",
              displayType: "list",
            },
          ],
          mediaInfos: [
            {
              title: "Chart stats",
              type: "barchart",
              caption: "For a better idea...",
              value: {
                fields: ["relationships/0/{{" + relatedBasePath + ".bb.name}}", "{{" + basePath + ".a.name}}"],
                tooltipField: "relationships/0/{{" + relatedBasePath + ".aa.name}}",
              },
            },
          ],
        },
      };

      const expectedLayer: any = {
        isView: false,
        relationships: [
          {
            relatedTableId: relatedTableId,
          },
        ],
      };

      _templatizePopupInfo(layerDefinition, layer, basePath, itemId, fieldNames);
      expect(layerDefinition).toEqual(expectedLayerDef);
      // should be untouched
      expect(layer).toEqual(expectedLayer);
    });
  });

  describe("_templatizeName", () => {
    it("should not fail when empty", () => {
      const obj: any = {};
      const prop: string = "";
      const fieldNames: string[] = ["A", "B", "C", "name"];
      _templatizeName(obj, prop, fieldNames, basePath);
      expect(obj).toEqual({});
    });

    it("should handle value", () => {
      const obj: any = {
        propName: "SomeAwords and SomeBwords and A and B and C and stuff",
      };
      const prop: string = "propName";
      const fieldNames: string[] = ["A", "B", "C", "name"];
      const expected: any = {
        propName:
          "SomeAwords and SomeBwords and {{" +
          basePath +
          ".a.name}} and {{" +
          basePath +
          ".b.name}} and {{" +
          basePath +
          ".c.name}} and stuff",
      };
      _templatizeName(obj, prop, fieldNames, basePath);
      expect(obj).toEqual(expected);
    });
  });

  describe("_templatizeMediaInfos", () => {
    it("should not fail when a mediaInfo value doesn't have fields", () => {
      const mediaInfos: any = [
        {
          value: {},
        },
      ];
      const fieldNames: string[] = [];
      const layer: any = null;
      _templatizeMediaInfos(mediaInfos, fieldNames, basePath, layer, itemId);
    });
  });

  describe("_templatizeDefinitionEditor", () => {
    it("should not fail with undefined layer", () => {
      const fieldNames: string[] = ["A", "B", "C", "name"];
      const layer: any = undefined;
      _templatizeDefinitionEditor(layer, basePath, fieldNames);
      expect(layer).toBeUndefined();
    });

    it("should not fail without definitionEditor", () => {
      const fieldNames: string[] = ["A", "B", "C", "name"];
      const layer: any = {};
      _templatizeDefinitionEditor(layer, basePath, fieldNames);
      expect(layer).toEqual({});
    });

    it("should not fail with empty definitionEditor", () => {
      const fieldNames: string[] = ["A", "B", "C", "name"];
      const layer: any = {
        definitionEditor: {},
      };
      const expected: any = {
        definitionEditor: {},
      };
      _templatizeDefinitionEditor(layer, basePath, fieldNames);
      expect(layer).toEqual(expected);
    });

    it("should not fail without parameterizedExpression", () => {
      const fieldNames: string[] = ["A", "B", "C", "name"];
      const layer: any = {
        definitionEditor: {
          parameterizedExpression: undefined,
        },
      };
      const expected: any = {
        definitionEditor: {
          parameterizedExpression: "",
        },
      };
      _templatizeDefinitionEditor(layer, basePath, fieldNames);
      expect(layer).toEqual(expected);
    });

    it("should templatize field references in definitionEditor", () => {
      const fieldNames: string[] = ["A", "B", "C", "name"];
      const layer: any = {
        definitionEditor: {
          parameterizedExpression: "A BETWEEN {0} AND {1} or B = 23 or C LIKE '{2}%'",
          inputs: [
            {
              hint: "Enter square miles.",
              prompt: "Area between",
              parameters: [
                {
                  type: "esriFieldTypeInteger",
                  fieldName: "A",
                  parameterId: 0,
                  defaultValue: 10,
                },
                {
                  type: "esriFieldTypeInteger",
                  fieldName: "B",
                  parameterId: 1,
                  defaultValue: 100,
                },
              ],
            },
            {
              hint: "Enter your name.",
              prompt: "Name starts with",
              parameters: [
                {
                  type: "esriFieldTypeString",
                  fieldName: "C",
                  parameterId: 2,
                  defaultValue: "Jack",
                },
              ],
            },
          ],
        },
      };

      const expected: any = {
        definitionEditor: {
          parameterizedExpression:
            "{{" +
            basePath +
            ".a.name}} BETWEEN {0} AND {1} or {{" +
            basePath +
            ".b.name}} = 23 or {{" +
            basePath +
            ".c.name}} LIKE '{2}%'",
          inputs: [
            {
              hint: "Enter square miles.",
              prompt: "Area between",
              parameters: [
                {
                  type: "esriFieldTypeInteger",
                  fieldName: "{{" + basePath + ".a.name}}",
                  parameterId: 0,
                  defaultValue: 10,
                },
                {
                  type: "esriFieldTypeInteger",
                  fieldName: "{{" + basePath + ".b.name}}",
                  parameterId: 1,
                  defaultValue: 100,
                },
              ],
            },
            {
              hint: "Enter your name.",
              prompt: "Name starts with",
              parameters: [
                {
                  type: "esriFieldTypeString",
                  fieldName: "{{" + basePath + ".c.name}}",
                  parameterId: 2,
                  defaultValue: "Jack",
                },
              ],
            },
          ],
        },
      };

      _templatizeDefinitionEditor(layer, basePath, fieldNames);
      expect(layer).toEqual(expected);
    });
  });

  describe("_templatizeDefinitionExpression", () => {
    it("should not fail with undefined", () => {
      const fieldNames: any[] = ["A", "B", "C", "name"];
      const layer: any = undefined;
      _templatizeDefinitionExpression(layer, basePath, fieldNames);
      expect(layer).toBeUndefined();
    });

    it("should not fail without definitionExpression", () => {
      const fieldNames: any[] = ["A", "B", "C", "name"];
      const layer: any = {};
      const expected: any = {};
      _templatizeDefinitionExpression(layer, basePath, fieldNames);
      expect(layer).toEqual(expected);
    });

    it("should not fail with empty definitionExpression", () => {
      const fieldNames: any[] = ["A", "B", "C", "name"];
      const layer: any = {
        definitionExpression: "",
      };
      const expected: any = {
        definitionExpression: "",
      };

      _templatizeDefinitionExpression(layer, basePath, fieldNames);
      expect(layer).toEqual(expected);
    });

    it("should templatize field references within definitionExpression", () => {
      const fieldNames: any[] = ["A", "B", "C", "name"];
      const layer: any = {
        definitionExpression: "A IS ABC AND B LIKE C",
      };
      const expected: any = {
        definitionExpression:
          "{{" + basePath + ".a.name}} IS ABC AND {{" + basePath + ".b.name}} LIKE {{" + basePath + ".c.name}}",
      };
      _templatizeDefinitionExpression(layer, basePath, fieldNames);
      expect(layer).toEqual(expected);
    });
  });

  describe("_templatizeSimpleName", () => {
    it("should not fail with undefined", () => {
      const fieldNames: any[] = ["A", "B", "C", "D", "name"];
      let expression;
      // eslint-disable-next-line prefer-const
      expression = _templatizeSimpleName(expression, basePath, fieldNames, "name");
      expect(expression).toBeUndefined();
    });

    it("should not fail with empty expression", () => {
      const fieldNames: any[] = ["A", "B", "C", "D", "name"];
      let expression: string = "";
      expression = _templatizeSimpleName(expression, basePath, fieldNames, "name");
      expect(expression).toEqual("");
    });

    it("should templatize field references in an expression", () => {
      const fieldNames: any[] = ["A", "B", "C", "D", "name"];

      // test case in expression
      let expression = "(a LIKE b AND c LIKE d) AND (A LIKE B AND C LIKE D SOMEOTHERABC)";
      expression = _templatizeSimpleName(expression, basePath, fieldNames, "name");
      expect(expression).toEqual(
        "(a LIKE b AND c LIKE d) AND ({{" +
          basePath +
          ".a.name}} LIKE {{" +
          basePath +
          ".b.name}} AND {{" +
          basePath +
          ".c.name}} LIKE {{" +
          basePath +
          ".d.name}} SOMEOTHERABC)",
      );
    });

    it("should not templatize .name}} when we have a field called name", () => {
      const fieldNames: any[] = ["A", "B", "name", "C", "D"];
      const expression: string = "(A = N'{0}') AND (B = N'{1}') AND (C = N'{2}') AND (D = N'{3}')";
      const actual: string = _templatizeSimpleName(expression, basePath, fieldNames, "name");

      const expected: string =
        "({{" +
        basePath +
        ".a.name}} = N'{0}') AND ({{" +
        basePath +
        ".b.name}} = N'{1}') AND ({{" +
        basePath +
        ".c.name}} = N'{2}') AND ({{" +
        basePath +
        ".d.name}} = N'{3}')";
      expect(actual).toEqual(expected);
    });
  });

  describe("_templatizeDrawingInfo", () => {
    it("should not fail with undefined", () => {
      const fieldNames: any[] = [
        "POPULATION",
        "TEST",
        "POP10_CY",
        "POP20_CY",
        "POP30_CY",
        "POP40_CY",
        "POP50_CY",
        "POP60_CY",
        "Inclination",
        "name",
      ];

      const layer: any = undefined;
      _templatizeDrawingInfo(layer, basePath, fieldNames);
      expect(layer).toBeUndefined();
    });

    it("should not fail with empty drawingInfo", () => {
      const fieldNames: any[] = [
        "POPULATION",
        "TEST",
        "POP10_CY",
        "POP20_CY",
        "POP30_CY",
        "POP40_CY",
        "POP50_CY",
        "POP60_CY",
        "Inclination",
        "name",
      ];
      const layer: any = { drawingInfo: {} };
      const expected: any = { drawingInfo: {} };
      _templatizeDrawingInfo(layer, basePath, fieldNames);
      expect(layer).toEqual(expected);
    });

    it("should handle classBreaks", () => {
      const fieldNames: any[] = [
        "POPULATION",
        "TEST",
        "POP10_CY",
        "POP20_CY",
        "POP30_CY",
        "POP40_CY",
        "POP50_CY",
        "POP60_CY",
        "Inclination",
        "name",
      ];

      const layer: any = {
        drawingInfo: {
          renderer: {
            visualVariables: [
              {
                type: "colorInfo",
                field: "POPULATION",
                stops: [],
              },
            ],
            type: "classBreaks",
            field: "POPULATION",
            minValue: -9007199254740991,
            classBreakInfos: [],
          },
        },
      };

      const expected: any = {
        drawingInfo: {
          renderer: {
            visualVariables: [
              {
                type: "colorInfo",
                field: "{{" + basePath + ".population.name}}",
                stops: [],
              },
            ],
            type: "classBreaks",
            field: "{{" + basePath + ".population.name}}",
            minValue: -9007199254740991,
            classBreakInfos: [],
          },
        },
      };

      _templatizeDrawingInfo(layer, basePath, fieldNames);
      expect(layer).toEqual(expected);
    });

    it("should handle heatMap", () => {
      const fieldNames: any[] = [
        "POPULATION",
        "TEST",
        "POP10_CY",
        "POP20_CY",
        "POP30_CY",
        "POP40_CY",
        "POP50_CY",
        "POP60_CY",
        "Inclination",
        "name",
      ];

      const layer: any = {
        drawingInfo: {
          renderer: {
            type: "heatmap",
            blurRadius: 10,
            colorStops: [],
            field: "TEST",
            maxPixelIntensity: 1249.2897582229123,
            minPixelIntensity: 0,
          },
        },
      };

      const expected: any = {
        drawingInfo: {
          renderer: {
            type: "heatmap",
            blurRadius: 10,
            colorStops: [],
            field: "{{" + basePath + ".test.name}}",
            maxPixelIntensity: 1249.2897582229123,
            minPixelIntensity: 0,
          },
        },
      };

      _templatizeDrawingInfo(layer, basePath, fieldNames);
      expect(layer).toEqual(expected);
    });

    it("should handle predominance", () => {
      const fieldNames: any[] = [
        "POPULATION",
        "TEST",
        "POP10_CY",
        "POP20_CY",
        "POP30_CY",
        "POP40_CY",
        "POP50_CY",
        "POP60_CY",
        "Inclination",
        "name",
      ];

      const layer: any = {
        drawingInfo: {
          renderer: {
            visualVariables: [
              {
                type: "transparencyInfo",
                valueExpression:
                  'var fieldNames = ["POP10_CY", "POP40_CY", "POP60_CY", "POP20_CY", "POP30_CY"];\nvar numFields = 5;\nvar maxValueField = null;\nvar maxValue = -Infinity;\nvar value, i, totalValue = null;\nfor(i = 0; i < numFields; i++) {\nvalue = $feature[fieldNames[i]];\nif(value > 0) {\nif(value > maxValue) {\nmaxValue = value;\nmaxValueField = fieldNames[i];\n}\nelse if (value == maxValue) {\nmaxValueField = null;\n}\n}\nif(value != null && value >= 0) {\nif (totalValue == null) { totalValue = 0; }\ntotalValue = totalValue + value;\n}\n}\nvar strength = null;\nif (maxValueField != null && totalValue > 0) {\nstrength = (maxValue / totalValue) * 100;\n}\nreturn strength;',
                stops: [],
                legendOptions: {},
              },
              {
                type: "sizeInfo",
                target: "outline",
                expression: "view.scale",
                stops: [],
              },
            ],
            authoringInfo: {
              type: "predominance",
              fields: ["POP10_CY", "POP40_CY", "POP60_CY", "POP20_CY", "POP30_CY"],
              visualVariables: { endTime: "POP30_CY" },
            },
            type: "uniqueValue",
            valueExpression:
              'var fieldNames = ["POP10_CY", "POP40_CY", "POP60_CY", "POP20_CY", "POP30_CY"];\nvar numFields = 5;\nvar maxValueField = null;\nvar maxValue = -Infinity;\nvar value, i, totalValue = null;\nfor(i = 0; i < numFields; i++) {\nvalue = $feature[fieldNames[i]];\nif(value > 0) {\nif(value > maxValue) {\nmaxValue = value;\nmaxValueField = fieldNames[i];\n}\nelse if (value == maxValue) {\nmaxValueField = null;\n}\n}\n}\nreturn maxValueField;',
            uniqueValueInfos: [],
          },
        },
      };

      const expected: any = {
        drawingInfo: {
          renderer: {
            visualVariables: [
              {
                type: "transparencyInfo",
                valueExpression:
                  'var fieldNames = ["{{' +
                  basePath +
                  '.pop10_cy.name}}", "{{' +
                  basePath +
                  '.pop40_cy.name}}", "{{' +
                  basePath +
                  '.pop60_cy.name}}", "{{' +
                  basePath +
                  '.pop20_cy.name}}", "{{' +
                  basePath +
                  '.pop30_cy.name}}"];\nvar numFields = 5;\nvar maxValueField = null;\nvar maxValue = -Infinity;\nvar value, i, totalValue = null;\nfor(i = 0; i < numFields; i++) {\nvalue = $feature[fieldNames[i]];\nif(value > 0) {\nif(value > maxValue) {\nmaxValue = value;\nmaxValueField = fieldNames[i];\n}\nelse if (value == maxValue) {\nmaxValueField = null;\n}\n}\nif(value != null && value >= 0) {\nif (totalValue == null) { totalValue = 0; }\ntotalValue = totalValue + value;\n}\n}\nvar strength = null;\nif (maxValueField != null && totalValue > 0) {\nstrength = (maxValue / totalValue) * 100;\n}\nreturn strength;',
                stops: [],
                legendOptions: {},
              },
              {
                type: "sizeInfo",
                target: "outline",
                expression: "view.scale",
                stops: [],
              },
            ],
            authoringInfo: {
              type: "predominance",
              fields: [
                "{{" + basePath + ".pop10_cy.name}}",
                "{{" + basePath + ".pop40_cy.name}}",
                "{{" + basePath + ".pop60_cy.name}}",
                "{{" + basePath + ".pop20_cy.name}}",
                "{{" + basePath + ".pop30_cy.name}}",
              ],
              visualVariables: {
                endTime: "{{" + basePath + ".pop30_cy.name}}",
              },
            },
            type: "uniqueValue",
            valueExpression:
              'var fieldNames = ["{{' +
              basePath +
              '.pop10_cy.name}}", "{{' +
              basePath +
              '.pop40_cy.name}}", "{{' +
              basePath +
              '.pop60_cy.name}}", "{{' +
              basePath +
              '.pop20_cy.name}}", "{{' +
              basePath +
              '.pop30_cy.name}}"];\nvar numFields = 5;\nvar maxValueField = null;\nvar maxValue = -Infinity;\nvar value, i, totalValue = null;\nfor(i = 0; i < numFields; i++) {\nvalue = $feature[fieldNames[i]];\nif(value > 0) {\nif(value > maxValue) {\nmaxValue = value;\nmaxValueField = fieldNames[i];\n}\nelse if (value == maxValue) {\nmaxValueField = null;\n}\n}\n}\nreturn maxValueField;',
            uniqueValueInfos: [],
          },
        },
      };

      _templatizeDrawingInfo(layer, basePath, fieldNames);
      expect(layer).toEqual(expected);
    });

    it("should handle simple", () => {
      const fieldNames: any[] = [
        "POPULATION",
        "TEST",
        "POP10_CY",
        "POP20_CY",
        "POP30_CY",
        "POP40_CY",
        "POP50_CY",
        "POP60_CY",
        "Inclination",
        "name",
      ];

      const layer: any = {
        drawingInfo: {
          renderer: {
            type: "simple",
            rotationExpression: "[TEST]",
            symbol: {},
          },
        },
      };

      const expected: any = {
        drawingInfo: {
          renderer: {
            type: "simple",
            rotationExpression: "[{{" + basePath + ".test.name}}]",
            symbol: {},
          },
        },
      };

      _templatizeDrawingInfo(layer, basePath, fieldNames);
      expect(layer).toEqual(expected);
    });

    it("should handle temporal", () => {
      const fieldNames: any[] = [
        "POPULATION",
        "TEST",
        "POP10_CY",
        "POP20_CY",
        "POP30_CY",
        "POP40_CY",
        "POP50_CY",
        "POP60_CY",
        "Inclination",
        "name",
      ];

      const layer: any = {
        drawingInfo: {
          renderer: {
            type: "temporal",
            observationRenderer: {
              visualVariables: [
                {
                  field: "Inclination",
                  rotationType: "geographic",
                  type: "rotationInfo",
                },
              ],
              type: "simple",
              symbol: {},
            },
            latestObservationRenderer: {
              visualVariables: [
                {
                  field: "Inclination",
                  rotationType: "geographic",
                  type: "rotationInfo",
                },
              ],
              type: "simple",
              symbol: {},
            },
            trackRenderer: {
              type: "simple",
              symbol: {},
            },
          },
        },
      };

      const expected: any = {
        drawingInfo: {
          renderer: {
            type: "temporal",
            observationRenderer: {
              visualVariables: [
                {
                  field: "{{" + basePath + ".inclination.name}}",
                  rotationType: "geographic",
                  type: "rotationInfo",
                },
              ],
              type: "simple",
              symbol: {},
            },
            latestObservationRenderer: {
              visualVariables: [
                {
                  field: "{{" + basePath + ".inclination.name}}",
                  rotationType: "geographic",
                  type: "rotationInfo",
                },
              ],
              type: "simple",
              symbol: {},
            },
            trackRenderer: {
              type: "simple",
              symbol: {},
            },
          },
        },
      };

      _templatizeDrawingInfo(layer, basePath, fieldNames);
      expect(layer).toEqual(expected);
    });

    it("should handle uniqueValue", () => {
      const fieldNames: any[] = [
        "POPULATION",
        "TEST",
        "POP10_CY",
        "POP20_CY",
        "POP30_CY",
        "POP40_CY",
        "POP50_CY",
        "POP60_CY",
        "Inclination",
        "name",
      ];

      const layer: any = {
        drawingInfo: {
          renderer: {
            type: "uniqueValue",
            field1: "COUNTRY",
            uniqueValueInfos: [],
          },
        },
      };

      const expected: any = {
        drawingInfo: {
          renderer: {
            type: "uniqueValue",
            field1: "{{" + basePath + ".country.name}}",
            uniqueValueInfos: [],
          },
        },
      };

      _templatizeDrawingInfo(layer, basePath, fieldNames);
      expect(layer).toEqual(expected);
    });
  });

  describe("_templatizeArcadeExpressions", () => {
    it("should not fail with undefined text", () => {
      // eslint-disable-next-line no-undef-init
      let text: any = undefined;
      // eslint-disable-next-line prefer-const
      text = _templatizeArcadeExpressions(text, "", basePath);
      expect(text).toBeUndefined();
    });

    it("should not fail with empty text", () => {
      let text = "";
      text = _templatizeArcadeExpressions(text, "", basePath);
      expect(text).toEqual("");
    });

    it("should handle $feature. notation", () => {
      const fieldNames: string[] = ["POP_16UP", "EMP_CY", "POP_16UP", "name"];
      let text: string = "Round((($feature.POP_16UP - $feature.EMP_CY)/$feature.POP_16UP)*100,2) + '%'";
      let expected: string =
        "Round((($feature.{{" +
        basePath +
        ".pop_16up.name}} - $feature.{{" +
        basePath +
        ".emp_cy.name}})/$feature.{{" +
        basePath +
        ".pop_16up.name}})*100,2) + '%'";

      fieldNames.forEach((name: string) => {
        text = _templatizeArcadeExpressions(text, name, basePath);
      });
      expect(text).toEqual(expected);

      // when already templatized nothing else should happen
      text =
        "Round((($feature.{{" +
        basePath +
        ".pop_16up.name}} - $feature.{{" +
        basePath +
        ".emp_cy.name}})/$feature.{{" +
        basePath +
        ".pop_16up.name}})*100,2) + '%'";

      expected =
        "Round((($feature.{{" +
        basePath +
        ".pop_16up.name}} - $feature.{{" +
        basePath +
        ".emp_cy.name}})/$feature.{{" +
        basePath +
        ".pop_16up.name}})*100,2) + '%'";

      fieldNames.forEach((name: string) => {
        text = _templatizeArcadeExpressions(text, name, basePath);
      });
      expect(text).toEqual(expected);
    });

    it("should handle $feature[] notation", () => {
      const fieldNames: string[] = ["POP_16UP", "EMP_CY", "POP_16UP", "name"];
      let text: string = '$feature["EMP_CY"]';
      fieldNames.forEach((name: string) => {
        text = _templatizeArcadeExpressions(text, name, basePath);
      });
      expect(text).toEqual('$feature["{{' + basePath + '.emp_cy.name}}"]');

      text = "$feature['EMP_CY']";
      fieldNames.forEach((name: string) => {
        text = _templatizeArcadeExpressions(text, name, basePath);
      });
      expect(text).toEqual("$feature['{{" + basePath + ".emp_cy.name}}']");
    });

    it("should handle $feature[] notation with join", () => {
      const fieldNames: string[] = ["POP_16UP", "EMP_CY", "POP_16UP", "name"];
      let text: string = '$feature["COUNTY_ID.EMP_CY"]';
      fieldNames.forEach((name: string) => {
        text = _templatizeArcadeExpressions(text, name, basePath);
      });
      expect(text).toEqual('$feature["COUNTY_ID.{{' + basePath + '.emp_cy.name}}"]');

      text = "$feature['COUNTY_ID.EMP_CY']";
      fieldNames.forEach((name: string) => {
        text = _templatizeArcadeExpressions(text, name, basePath);
      });
      expect(text).toEqual("$feature['COUNTY_ID.{{" + basePath + ".emp_cy.name}}']");
    });

    it('should handle "fieldName" notation', () => {
      const fieldNames: string[] = ["POP_16UP", "EMP_CY", "POP_16UP", "name"];
      let text: any = 'var names = ["EMP_CY"]';
      fieldNames.forEach((name: string) => {
        text = _templatizeArcadeExpressions(text, name, basePath);
      });
      expect(text).toEqual('var names = ["{{' + basePath + '.emp_cy.name}}"]');

      text = "var names = ['EMP_CY']";
      fieldNames.forEach((name: string) => {
        text = _templatizeArcadeExpressions(text, name, basePath);
      });
      expect(text).toEqual("var names = ['{{" + basePath + ".emp_cy.name}}']");

      text = 'var names = [ "EMP_CY", "POP_16UP" ]';
      fieldNames.forEach((name: string) => {
        text = _templatizeArcadeExpressions(text, name, basePath);
      });
      expect(text).toEqual('var names = [ "{{' + basePath + '.emp_cy.name}}", "{{' + basePath + '.pop_16up.name}}" ]');

      text = "var names = [ 'EMP_CY', 'POP_16UP' ]";
      fieldNames.forEach((name: string) => {
        text = _templatizeArcadeExpressions(text, name, basePath);
      });
      expect(text).toEqual("var names = [ '{{" + basePath + ".emp_cy.name}}', '{{" + basePath + ".pop_16up.name}}' ]");
    });
  });

  describe("_templatizeLabelingInfo", () => {
    it("should not fail without labelingInfo", () => {
      const fieldNames: any[] = ["Description", "STATE_NAME", "ACRES", "name"];

      // test without
      const labelingInfo: any[] = [];
      _templatizeLabelingInfo(labelingInfo, basePath, fieldNames);
      expect(labelingInfo).toEqual([]);
    });

    it("should not fail with missing information in labelingInfo", () => {
      const fieldNames: any[] = ["Description", "STATE_NAME", "ACRES", "name"];
      const labelingInfo: any[] = [
        {
          labelExpression: null,
          labelExpressionInfo: null,
          fieldInfos: null,
          useCodedValues: false,
          maxScale: 0,
          minScale: 0,
          labelPlacement: "esriServerPointLabelPlacementAboveLeft",
          symbol: {},
        },
      ];
      const expected: any[] = [
        {
          labelExpression: null,
          labelExpressionInfo: null,
          fieldInfos: null,
          useCodedValues: false,
          maxScale: 0,
          minScale: 0,
          labelPlacement: "esriServerPointLabelPlacementAboveLeft",
          symbol: {},
        },
      ];

      _templatizeLabelingInfo(labelingInfo, basePath, fieldNames);
      expect(labelingInfo).toEqual(expected);
    });

    it("should templatize field references in labelingInfo: braces", () => {
      const fieldNames: any[] = ["Description", "STATE_NAME", "ACRES", "name"];
      const labelingInfo: any[] = [
        {
          labelExpression: null,
          labelExpressionInfo: {
            value: 'return $feature["{STATE_NAME}"] + $feature["{ACRES}"] + " (arcade)";',
          },
          fieldInfos: [],
          useCodedValues: false,
          maxScale: 0,
          minScale: 0,
          labelPlacement: "esriServerPointLabelPlacementAboveLeft",
          symbol: {},
        },
      ];

      const expected: any[] = [
        {
          labelExpression: null,
          labelExpressionInfo: {
            value:
              'return $feature["{{{' +
              basePath +
              '.state_name.name}}}"] + $feature["{{{' +
              basePath +
              '.acres.name}}}"] + " (arcade)";',
          },
          fieldInfos: [],
          useCodedValues: false,
          maxScale: 0,
          minScale: 0,
          labelPlacement: "esriServerPointLabelPlacementAboveLeft",
          symbol: {},
        },
      ];

      _templatizeLabelingInfo(labelingInfo, basePath, fieldNames);
      expect(labelingInfo).toEqual(expected);
    });

    it("should templatize field references in labelingInfo: brackets", () => {
      const fieldNames: any[] = ["Description", "STATE_NAME", "ACRES", "name"];
      const labelingInfo: any[] = [
        {
          labelExpression: "[Description]",
          labelExpressionInfo: {
            value: 'return $feature["STATE_NAME"] + " (arcade)";',
            expression: 'return $feature["STATE_NAME"] + " (arcade)";',
          },
          fieldInfos: [
            {
              fieldName: "ACRES",
              format: {
                places: 2,
                digitSeparator: true,
              },
            },
          ],
          useCodedValues: false,
          maxScale: 0,
          minScale: 0,
          labelPlacement: "esriServerPointLabelPlacementAboveLeft",
          symbol: {},
        },
      ];

      const expected: any[] = [
        {
          labelExpression: "[{{" + basePath + ".description.name}}]",
          labelExpressionInfo: {
            value: 'return $feature["{{' + basePath + '.state_name.name}}"] + " (arcade)";',
            expression: 'return $feature["{{' + basePath + '.state_name.name}}"] + " (arcade)";',
          },
          fieldInfos: [
            {
              fieldName: "{{" + basePath + ".acres.name}}",
              format: {
                places: 2,
                digitSeparator: true,
              },
            },
          ],
          useCodedValues: false,
          maxScale: 0,
          minScale: 0,
          labelPlacement: "esriServerPointLabelPlacementAboveLeft",
          symbol: {},
        },
      ];

      _templatizeLabelingInfo(labelingInfo, basePath, fieldNames);
      expect(labelingInfo).toEqual(expected);
    });
  });

  describe("_templatizeTemplates", () => {
    it("should not fail with undefined templates", () => {
      const layer: any = {};
      _templatizeTemplates(layer, basePath);
      expect(layer).toEqual({});
    });

    it("should templatize object keys in templates", () => {
      const layer: any = {
        templates: [
          {
            prototype: {
              attributes: {
                A: null,
                B: null,
              },
            },
          },
        ],
      };

      const expected: any = {
        templates: [
          {
            prototype: {
              attributes: {},
            },
          },
        ],
      };
      expected.templates[0].prototype.attributes["{{" + basePath + ".a.name}}"] = null;
      expected.templates[0].prototype.attributes["{{" + basePath + ".b.name}}"] = null;

      _templatizeTemplates(layer, basePath);
      expect(layer).toEqual(expected);
    });
  });

  describe("_templatizeTypeTemplates", () => {
    it("should not fail without typeTemplates", () => {
      const path: string = "fields.layer";
      const layer: any = {};
      const expectedLayer: any = {};
      _templatizeTypeTemplates(layer, path);
      expect(layer).toEqual(expectedLayer);
    });

    it("should templatize field references in typeTemplates", () => {
      const path: string = "fields.layer";

      const layer: any = {
        types: [
          {
            domains: {
              A: "A",
              B: "B",
            },
            templates: [
              {
                prototype: {
                  attributes: {
                    A: "A",
                    B: "B",
                  },
                },
              },
            ],
          },
        ],
      };
      const expectedDomains: any = {};
      expectedDomains["{{" + path + ".a.name}}"] = "A";
      expectedDomains["{{" + path + ".b.name}}"] = "B";
      const expectedTemplates: any = {};
      expectedTemplates["{{" + path + ".a.name}}"] = "A";
      expectedTemplates["{{" + path + ".b.name}}"] = "B";
      const expectedLayer: any = {
        types: [
          {
            domains: expectedDomains,
            templates: [
              {
                prototype: {
                  attributes: expectedTemplates,
                },
              },
            ],
          },
        ],
      };
      _templatizeTypeTemplates(layer, path);
      expect(layer).toEqual(expectedLayer);
    });
  });

  describe("_templatizeTimeInfo", () => {
    it("should not fail without timeInfo", () => {
      const path: string = "fields.layer";
      const layer: any = {};
      const expected: any = {};
      _templatizeTimeInfo(layer, path);
      expect(layer).toEqual(expected);
    });

    it("should not fail without field references", () => {
      const path: string = "fields.layer";
      const layer: any = {
        timeInfo: {
          endTimeField: "",
          startTimeField: "",
          trackIdField: "",
        },
      };
      const expected: any = {
        timeInfo: {
          endTimeField: null,
          startTimeField: null,
          trackIdField: null,
        },
      };
      _templatizeTimeInfo(layer, path);
      expect(layer).toEqual(expected);
    });

    it("should templatize field references within timeInfo", () => {
      const path: string = "fields.layer";
      const layer: any = {
        timeInfo: {
          endTimeField: "A",
          startTimeField: "B",
          trackIdField: "C",
        },
      };
      const expected: any = {
        timeInfo: {
          endTimeField: "{{" + path + ".a.name}}",
          startTimeField: "{{" + path + ".b.name}}",
          trackIdField: "{{" + path + ".c.name}}",
        },
      };
      _templatizeTimeInfo(layer, path);
      expect(layer).toEqual(expected);
    });
  });

  describe("_templatizeDefinitionQuery", () => {
    it("should not fail with undefined", () => {
      const layer: any = undefined;
      const fieldNames: any = undefined;
      _templatizeDefinitionQuery(layer, basePath, fieldNames);
      expect(layer).toBeUndefined();
    });

    it("should not fail with empty viewDefinitionQuery", () => {
      const layer: any = {
        viewDefinitionQuery: "",
      };
      const fieldNames: any = [];
      const expected: any = {
        viewDefinitionQuery: "",
      };
      _templatizeDefinitionQuery(layer, basePath, fieldNames);
      expect(layer).toEqual(expected);

      layer.viewDefinitionQuery = undefined;
      _templatizeDefinitionQuery(layer, basePath, fieldNames);
      expect(layer).toEqual(expected);
    });

    it("should not fail with empty definitionQuery", () => {
      const layer: any = {
        definitionQuery: "",
      };
      const fieldNames: any = [];
      const expected: any = {
        definitionQuery: "",
      };
      _templatizeDefinitionQuery(layer, basePath, fieldNames);
      expect(layer).toEqual(expected);

      layer.definitionQuery = undefined;
      _templatizeDefinitionQuery(layer, basePath, fieldNames);
      expect(layer).toEqual(expected);
    });

    it("should templatize field references in viewDefinitionQuery", () => {
      const layer: any = {
        viewDefinitionQuery: "a is not A is B isNot but BB is and CCC",
      };
      const fieldNames: any = ["A", "BB", "CCC", "name"];
      const expected: any = {
        viewDefinitionQuery:
          "a is not {{" +
          basePath +
          ".a.name}} is B isNot but {{" +
          basePath +
          ".bb.name}} is and {{" +
          basePath +
          ".ccc.name}}",
      };
      _templatizeDefinitionQuery(layer, basePath, fieldNames);
      expect(layer).toEqual(expected);
    });
  });

  describe("_updateOrder", () => {
    it("will sort when self referential", () => {
      const layersAndTables = [
        {
          item: {
            id: 4,
          },
        },
        {
          item: {
            id: 3,
          },
        },
        {
          item: {
            id: 1,
          },
        },
        {
          item: {
            id: 2,
          },
        },
        {
          item: {
            id: 0,
          },
        },
      ];

      const expected = [
        {
          item: {
            id: 0,
          },
        },
        {
          item: {
            id: 1,
          },
        },
        {
          item: {
            id: 2,
          },
        },
        {
          item: {
            id: 3,
          },
        },
        {
          item: {
            id: 4,
          },
        },
      ];
      const _itemTemplate: IItemTemplate = templates.getItemTemplateSkeleton();
      const actual = _updateOrder(layersAndTables, true, _itemTemplate);
      expect(actual).toEqual(expected);
    });

    it("will sort multisource", () => {
      const layersAndTables = [
        {
          item: {
            id: 4,
          },
        },
        {
          item: {
            id: 3,
          },
        },
        {
          item: {
            id: 1,
          },
        },
        {
          item: {
            id: 2,
          },
        },
        {
          item: {
            id: 0,
          },
        },
      ];

      const expected = [
        {
          item: {
            id: 0,
          },
        },
        {
          item: {
            id: 1,
          },
        },
        {
          item: {
            id: 2,
          },
        },
        {
          item: {
            id: 3,
          },
        },
        {
          item: {
            id: 4,
          },
        },
      ];

      const _itemTemplate: IItemTemplate = templates.getItemTemplateSkeleton();
      setCreateProp(_itemTemplate, "properties.service.isMultiServicesView", true);
      const actual = _updateOrder(layersAndTables, false, _itemTemplate);
      expect(actual).toEqual(expected);
    });
  });

  describe("_updateAddOptions", () => {
    it("will not create new array when isMultiServicesView is false", () => {
      const startOptions: any = {
        layers: [
          {
            props: [],
          },
        ],
        tables: [
          {
            props: [],
          },
        ],
        MOCK_USER_SESSION,
      };

      itemTemplate.properties.service = {
        isMultiServicesView: false,
      };

      const layerChunks: any[] = [];

      const actual: any = _updateAddOptions(itemTemplate, startOptions, layerChunks, false, MOCK_USER_SESSION);
      expect(actual.layers).toEqual(startOptions.layers);
      expect(actual.tables).toEqual(startOptions.tables);
      expect(layerChunks).toEqual([]);
    });

    it("will create new layers array when isMultiServicesView is true", () => {
      const startOptions: any = {
        layers: [
          {
            props: [],
          },
        ],
        tables: [],
        MOCK_USER_SESSION,
      };

      itemTemplate.properties.service = {
        isMultiServicesView: true,
      };

      const layerChunks: any[] = [];

      const actual: any = _updateAddOptions(itemTemplate, startOptions, layerChunks, false, MOCK_USER_SESSION);

      expect(actual.layers).toEqual([]);
      expect(actual.tables).toEqual([]);
      expect(layerChunks).toEqual([startOptions]);
    });

    it("will create new tables array when isMultiServicesView is true", () => {
      const startOptions: any = {
        layers: [],
        tables: [
          {
            props: [],
          },
        ],
        MOCK_USER_SESSION,
      };

      itemTemplate.properties.service = {
        isMultiServicesView: true,
      };

      const layerChunks: any[] = [];

      const actual: any = _updateAddOptions(itemTemplate, startOptions, layerChunks, false, MOCK_USER_SESSION);

      expect(actual.layers).toEqual([]);
      expect(actual.tables).toEqual([]);
      expect(layerChunks).toEqual([startOptions]);
    });
  });

  describe("_isSelfReferential", () => {
    it("will return true when a layer references another layer from the same service", () => {
      const layersAndTables = [
        {
          item: {
            adminLayerInfo: {
              viewLayerDefinition: {
                table: {
                  relatedTables: [
                    {
                      name: "A",
                    },
                  ],
                },
              },
            },
            name: "B",
          },
        },
        {
          item: {
            name: "A",
          },
        },
      ];

      const expected = true;
      const actual = _isSelfReferential(layersAndTables);
      expect(actual).toEqual(expected);
    });

    it("will return false when a layer does not reference another layer from the same service", () => {
      const layersAndTables = [
        {
          item: {
            adminLayerInfo: {
              viewLayerDefinition: {
                table: {
                  relatedTables: [
                    {
                      name: "C",
                    },
                  ],
                },
              },
            },
            name: "B",
          },
        },
        {
          item: {
            name: "A",
          },
        },
      ];

      const expected = false;
      const actual = _isSelfReferential(layersAndTables);
      expect(actual).toEqual(expected);
    });

    it("will return true when items have multiple references to the same layer", () => {
      const layersAndTables = [
        {
          item: {
            adminLayerInfo: {
              viewLayerDefinition: {
                table: {
                  name: "C_1",
                  sourceServiceName: "C",
                  sourceLayerId: 0,
                },
              },
            },
            name: "B",
          },
        },
        {
          item: {
            adminLayerInfo: {
              viewLayerDefinition: {
                table: {
                  name: "C_3",
                  sourceServiceName: "C",
                  sourceLayerId: 1,
                },
              },
            },
            name: "C",
          },
        },
        {
          item: {
            adminLayerInfo: {
              viewLayerDefinition: {
                table: {
                  name: "C_2",
                  sourceServiceName: "C",
                  sourceLayerId: 0,
                },
              },
            },
            name: "A",
          },
        },
      ];

      const expected = true;
      const actual = _isSelfReferential(layersAndTables);
      expect(actual).toEqual(expected);
    });
  });

  describe("_updateForPortal", () => {
    it("will remove props", () => {
      const item = {
        id: "",
        type: "",
        isView: true,
        sourceSchemaChangesAllowed: true,
      };
      const expected = {
        id: "",
        type: "",
        sourceSchemaChangesAllowed: true,
      };
      const _itemTemplate: IItemTemplate = templates.getItemTemplateSkeleton();
      const actual = _updateForPortal(item, _itemTemplate, {});

      expect(actual).toEqual(expected);
    });

    it("will remove viewLayerDefinition fields that are not in the service", () => {
      const item = {
        id: "",
        type: "",
        isView: true,
        sourceSchemaChangesAllowed: true,
        adminLayerInfo: {
          viewLayerDefinition: {
            table: {
              sourceServiceName: "Snowmass",
              sourceLayerId: 0,
              sourceLayerFields: [
                {
                  name: "a",
                  source: "aa",
                },
                {
                  name: "b",
                  source: "bb",
                },
              ],
              relatedTables: [
                {
                  sourceServiceName: "Hagerman",
                  sourceLayerId: 4,
                  sourceLayerFields: [
                    {
                      name: "a1",
                      source: "aa1",
                    },
                    {
                      name: "b1",
                      source: "bb1",
                    },
                  ],
                },
              ],
            },
          },
        },
      };
      const expected = {
        id: "",
        type: "",
        sourceSchemaChangesAllowed: true,
        adminLayerInfo: {
          viewLayerDefinition: {
            table: {
              sourceServiceName: "Snowmass",
              sourceLayerId: 0,
              sourceLayerFields: [
                {
                  name: "a",
                  source: "aa",
                },
              ],
              relatedTables: [
                {
                  sourceServiceName: "Hagerman",
                  sourceLayerId: 4,
                  sourceLayerFields: [
                    {
                      name: "b1",
                      source: "bb1",
                    },
                  ],
                },
              ],
            },
          },
        },
      };
      const _itemTemplate: IItemTemplate = templates.getItemTemplateSkeleton();
      _itemTemplate.dependencies = ["44507dff46f54656a74032ac12acd977", "54507dff46f54656a74032ac12acd977"];

      const templateDictionary: any = {
        "44507dff46f54656a74032ac12acd977": {
          name: "Snowmass",
          layer0: {
            fields: {
              aa: { name: "aa" },
            },
          },
        },
        "54507dff46f54656a74032ac12acd977": {
          name: "Hagerman",
          layer4: {
            fields: {
              bb1: { name: "bb1" },
            },
          },
        },
      };
      const actual = _updateForPortal(item, _itemTemplate, templateDictionary);

      expect(actual).toEqual(expected);
    });

    it("will remove item fields that are not in the service", () => {
      const item = {
        id: 0,
        type: "",
        isView: true,
        sourceSchemaChangesAllowed: true,
        adminLayerInfo: {},
        serviceItemId: "55507dff46f54656a74032ac12acd977",
        fields: [
          {
            name: "aa",
          },
          {
            name: "bb",
          },
        ],
      };
      const expected = {
        id: 0,
        type: "",
        sourceSchemaChangesAllowed: true,
        adminLayerInfo: {},
        serviceItemId: "55507dff46f54656a74032ac12acd977",
        fields: [
          {
            name: "aa",
          },
        ],
      };
      const _itemTemplate: IItemTemplate = templates.getItemTemplateSkeleton();
      _itemTemplate.dependencies = ["44507dff46f54656a74032ac12acd977", "54507dff46f54656a74032ac12acd977"];

      const templateDictionary: any = {
        "44507dff46f54656a74032ac12acd977": {
          name: "Snowmass",
          itemId: "55507dff46f54656a74032ac12acd977",
          layer0: {
            fields: [
              {
                name: "aa",
              },
            ],
          },
        },
      };
      const actual = _updateForPortal(item, _itemTemplate, templateDictionary);

      expect(actual).toEqual(expected);
    });

    it("will remove item fields that are not in the service", () => {
      const item = {
        id: 0,
        type: "",
        isView: true,
        sourceSchemaChangesAllowed: true,
        adminLayerInfo: {},
        serviceItemId: "55507dff46f54656a74032ac12acd977",
        fields: [
          {
            name: "aa",
          },
          {
            name: "bb",
          },
        ],
      };
      const expected = {
        id: 0,
        type: "",
        sourceSchemaChangesAllowed: true,
        adminLayerInfo: {},
        serviceItemId: "55507dff46f54656a74032ac12acd977",
        fields: [
          {
            name: "aa",
          },
        ],
      };
      const _itemTemplate: IItemTemplate = templates.getItemTemplateSkeleton();

      const templateDictionary: any = {
        "44507dff46f54656a74032ac12acd977": {
          name: "Snowmass",
          itemId: "55507dff46f54656a74032ac12acd977",
          layer0: {
            fields: {
              aa: {
                name: "aa",
              },
            },
          },
        },
      };
      const actual = _updateForPortal(item, _itemTemplate, templateDictionary);

      expect(actual).toEqual(expected);
    });
  });

  describe("_getFieldNames", () => {
    it("cen get field names from array", () => {
      const table: any = {
        sourceLayerId: 0,
        sourceServiceName: "ABC123",
      };
      const template: IItemTemplate = templates.getItemTemplateSkeleton();
      template.dependencies = ["ab766cba0dd44ec080420acc10990282"];
      const templateDictionary: any = {
        ab766cba0dd44ec080420acc10990282: {
          name: "ABC123",
          layer0: {
            fields: [
              {
                name: "A",
              },
            ],
          },
        },
      };

      const expected: string[] = ["A"];
      const actual: string[] = _getFieldNames(table, template, templateDictionary);
      expect(actual).toEqual(expected);
    });

    it("cen get field names from object", () => {
      const table: any = {
        sourceLayerId: 0,
        sourceServiceName: "ABC123",
      };
      const template: IItemTemplate = templates.getItemTemplateSkeleton();
      template.dependencies = ["ab766cba0dd44ec080420acc10990282"];
      const templateDictionary: any = {
        ab766cba0dd44ec080420acc10990282: {
          name: "ABC123",
          layer0: {
            fields: {
              a: {
                name: "A",
              },
            },
          },
        },
      };

      const expected: string[] = ["a"];
      const actual: string[] = _getFieldNames(table, template, templateDictionary);
      expect(actual).toEqual(expected);
    });
  });

  describe("_getDynamicFieldNames", () => {
    it("will keep expression fields", () => {
      const table = {
        name: "Cemeteries_1678394615385_StatsTable",
        sourceServiceName: "Cemeteries_9eb657cfc34545038ee388071b3f730f",
        sourceLayerId: 5,
        sourceLayerFields: [
          {
            name: "burialcount",
            alias: "Burial Count",
            source: "parentglobalid",
            statisticType: "COUNT",
          },
          {
            name: "fullname1",
            alias: "Full Name 1",
            source: "fullname",
            statisticType: "MIN",
          },
          {
            name: "fullname2",
            alias: "Full Name 2",
            source: "fullname",
            statisticType: "MAX",
          },
          {
            name: "population",
            alias: "Population",
            source: "population",
          },
          {
            name: "area",
            alias: "Area",
            source: "area",
          },
          {
            name: "density",
            alias: "Density",
            expression: "population / area",
            type: "esriFieldTypeDouble",
            source: "population",
          },
        ],
        groupBy: "parentglobalid",
        materialized: false,
      };

      const actual = _getDynamicFieldNames(table);

      const expected = ["burialcount", "fullname1", "fullname2"];
      expect(actual).toEqual(expected);
    });
  });

  describe("_updateItemFields", () => {
    it("will remove field references that don't exist in the source service", () => {
      const item: any = {
        serviceItemId: "AA",
        id: 0,
        fields: [
          {
            name: "field1",
          },
          {
            name: "field2",
          },
          {
            name: "field3",
          },
        ],
        indexes: [
          {
            fields: "field1",
          },
          {
            fields: "field2",
          },
          {
            fields: "field3",
          },
        ],
      };

      const fieldNames: string[] = ["field1", "field3"];

      const expected: any = {
        serviceItemId: "AA",
        id: 0,
        fields: [
          {
            name: "field1",
          },
          {
            name: "field3",
          },
        ],
        indexes: [
          {
            fields: "field1",
          },
          {
            fields: "field3",
          },
        ],
      };

      const actual: any = _updateItemFields(item, fieldNames);
      expect(actual).toEqual(expected);
    });
  });

  describe("_updateGeomFieldName", () => {
    it("should use the view layer def table name (Portal)", () => {
      const item: any = {
        adminLayerInfo: {
          geometryField: {
            name: "Shape",
          },
          viewLayerDefinition: {
            table: {
              name: "ABC_123",
            },
          },
        },
      };

      const templateDictionary: any = {
        isPortal: true,
      };
      _updateGeomFieldName(item.adminLayerInfo, templateDictionary);

      const expecetd: string = "ABC_123.shape";
      expect(item.adminLayerInfo.geometryField.name).toEqual(expecetd);
    });

    it("should use the view layer def table name (AGOL)", () => {
      const item: any = {
        adminLayerInfo: {
          geometryField: {
            name: "Shape",
          },
          viewLayerDefinition: {
            table: {
              name: "ABC_123",
            },
          },
        },
      };

      const templateDictionary: any = {
        isPortal: false,
      };
      _updateGeomFieldName(item.adminLayerInfo, templateDictionary);

      const expecetd: string = "ABC_123.Shape";
      expect(item.adminLayerInfo.geometryField.name).toEqual(expecetd);
    });

    it("should handle templatized value", () => {
      const item: any = {
        adminLayerInfo: {
          geometryField: {
            name: "ABC_123.Shape",
          },
          viewLayerDefinition: {
            table: {
              name: "ABC_123",
            },
          },
        },
      };

      const templateDictionary: any = {
        isPortal: false,
      };
      _updateGeomFieldName(item.adminLayerInfo, templateDictionary);

      const expecetd: string = "ABC_123.Shape";
      expect(item.adminLayerInfo.geometryField.name).toEqual(expecetd);
    });
  });

  describe("_updateTemplateDictionaryFields", () => {
    it("should update the template dictionary with field info", () => {
      const template: IItemTemplate = templates.getItemTemplateSkeleton();
      template.itemId = "svc987654321";
      template.properties.layers = [mockItems.getAGOLLayerOrTable(0, "A", "Feature Layer", [{}])];
      template.properties.tables = [];
      const templateDictionary = {
        svc0123456789: {
          itemId: "svc987654321",
        },
      };
      _updateTemplateDictionaryFields(template, templateDictionary);

      const expected = {
        svc0123456789: {
          itemId: "svc987654321",
          fieldInfos: {
            "0": template.properties.layers[0].fields,
          },
        },
      };

      expect(templateDictionary).toEqual(expected);
    });

    it("should update the template dictionary with field info for existing", () => {
      const template: IItemTemplate = templates.getItemTemplateSkeleton();
      template.itemId = "svc0123456789";
      template.properties.layers = [mockItems.getAGOLLayerOrTable(0, "A", "Feature Layer", [{}])];
      template.properties.tables = [];
      const templateDictionary = {
        svc0123456789: {
          itemId: "svc987654321",
        },
      };
      _updateTemplateDictionaryFields(template, templateDictionary, false);

      const expected = {
        svc0123456789: {
          itemId: "svc987654321",
          fieldInfos: {
            "0": template.properties.layers[0].fields,
          },
        },
      };

      expect(templateDictionary).toEqual(expected);
    });
  });

  describe("_validateFields", () => {
    it("should not add props if no fields exist on item", () => {
      const actual: any = {};
      const expected: any = {};
      _validateFields(actual);

      expect(actual).toEqual(expected);
    });
  });

  describe("_validateDisplayField", () => {
    it("should update primary display field if casing doesn't match", () => {
      const actual: any = {
        displayField: "A",
      };
      const fieldNames: string[] = ["a"];

      const expected: any = {
        displayField: "a",
      };
      _validateDisplayField(actual, fieldNames);

      expect(actual).toEqual(expected);
    });

    it("should update primary display field to the first non OID or GlobalId if the field isn't in the layer", () => {
      const actual: any = {
        displayField: "doesnotexist",
        uniqueIdField: {
          name: "OID",
        },
        globalIdField: "GLOBALID",
      };
      const fieldNames: string[] = ["OID", "GLOBALID", "A", "B"];

      const expected: any = {
        displayField: "A",
        uniqueIdField: {
          name: "OID",
        },
        globalIdField: "GLOBALID",
      };
      _validateDisplayField(actual, fieldNames);

      expect(actual).toEqual(expected);
    });
  });

  describe("_validateIndexes", () => {
    it("should remove indexes on fields that don't exist in the layer", () => {
      const actual: any = {
        indexes: [
          {
            fields: "a",
          },
          {
            fields: "b",
          },
        ],
      };
      const fieldNames: string[] = ["a"];

      const expected: any = {
        indexes: [
          {
            fields: "a",
          },
        ],
      };
      _validateIndexes(actual, fieldNames);

      expect(actual).toEqual(expected);
    });

    it("should remove duplicate indexes on the same field", () => {
      const actual: any = {
        indexes: [
          {
            fields: "a",
            name: "a",
          },
          {
            fields: "a",
            name: "a1",
          },
          {
            fields: "b",
          },
        ],
      };
      const fieldNames: string[] = ["a", "b"];

      const expected: any = {
        indexes: [
          {
            fields: "a",
            name: "a",
          },
          {
            fields: "b",
          },
        ],
      };
      _validateIndexes(actual, fieldNames);

      expect(actual).toEqual(expected);
    });
  });

  describe("_validateTemplatesFields", () => {
    it("should nremove field references from when the field does not exist", () => {
      const actual: any = {
        templates: [
          {
            prototype: {
              attributes: {
                a: null,
                b: null,
              },
            },
          },
        ],
      };
      const expected: any = {
        templates: [
          {
            prototype: {
              attributes: {
                a: null,
              },
            },
          },
        ],
      };
      const fieldNames: string[] = ["a"];
      _validateTemplatesFields(actual, fieldNames);

      expect(actual).toEqual(expected);
    });
  });

  describe("_validateTypesTemplates", () => {
    it("should nremove field references from when the field does not exist", () => {
      const actual: any = {
        types: [
          {
            templates: [
              {
                prototype: {
                  attributes: {
                    a: null,
                    b: null,
                  },
                },
              },
            ],
          },
        ],
      };

      const expected: any = {
        types: [
          {
            templates: [
              {
                prototype: {
                  attributes: {
                    a: null,
                  },
                },
              },
            ],
          },
        ],
      };
      const fieldNames: string[] = ["a"];
      _validateTypesTemplates(actual, fieldNames);

      expect(actual).toEqual(expected);
    });
  });

  describe("_validateEditFieldsInfo", () => {
    it("should swap edit field if field with same name but different case exists", () => {
      const actual: any = {
        editFieldsInfo: {
          editField: "A",
          otherEditField: "b",
        },
      };

      const expected: any = {
        editFieldsInfo: {
          editField: "a",
          otherEditField: "b",
        },
      };
      const fieldNames: string[] = ["a", "b"];
      _validateEditFieldsInfo(actual, fieldNames);

      expect(actual).toEqual(expected);
    });
  });

  describe("validateSpatialReferenceAndExtent", () => {
    it("can check for dependant source spatial reference and extent", () => {
      const serviceInfo: any = {
        service: {
          isView: true,
          spatialReference: {
            wkid: 4326,
          },
          fullExtent: {
            xmin: 1,
          },
        },
      };

      itemTemplate.dependencies = ["aaec7d5e113e4252bf1dcdfbcd8400f9"];

      const templateDictionary: any = {
        aaec7d5e113e4252bf1dcdfbcd8400f9: {
          defaultSpatialReference: {
            wkid: 102100,
          },
          defaultExtent: {
            xmin: 0,
          },
        },
      };

      validateSpatialReferenceAndExtent(serviceInfo, itemTemplate, templateDictionary);
      expect(serviceInfo.service.spatialReference.wkid).toEqual(102100);
      expect(serviceInfo.defaultExtent.xmin).toEqual(0);
    });

    it("can check for geom in dependant source spatial reference and extent", () => {
      const serviceInfo: any = {
        service: {
          isView: true,
          spatialReference: {
            wkid: 4326,
          },
          fullExtent: {
            xmin: 1,
          },
        },
        layers: [
          {
            name: "A",
            adminLayerInfo: {
              viewLayerDefinition: {
                table: {
                  sourceServiceName: "source_A",
                },
              },
            },
          },
          {
            name: "B",
            adminLayerInfo: {
              viewLayerDefinition: {
                table: {
                  sourceServiceName: "source_B",
                },
              },
            },
            geometryType: "point",
          },
        ],
      };

      itemTemplate.dependencies = ["aaec7d5e113e4252bf1dcdfbcd8400f9", "bbec7d5e113e4252bf1dcdfbcd8400f9"];

      const templateDictionary: any = {
        aaec7d5e113e4252bf1dcdfbcd8400f9: {
          defaultSpatialReference: {
            wkid: 4326,
          },
          defaultExtent: {
            xmin: 0,
          },
          name: "source_A",
        },
        bbec7d5e113e4252bf1dcdfbcd8400f9: {
          defaultSpatialReference: {
            wkid: 102100,
          },
          defaultExtent: {
            xmin: 2,
          },
          name: "source_B",
        },
      };

      validateSpatialReferenceAndExtent(serviceInfo, itemTemplate, templateDictionary);
      expect(serviceInfo.service.spatialReference.wkid).toEqual(102100);
      expect(serviceInfo.defaultExtent.xmin).toEqual(2);
    });
  });

  describe("deleteViewProps", () => {
    it("should remove key props from view layer", () => {
      const layer: any = {
        someProp: "A",
        definitionQuery: "definitionQuery",
      };
      const expected: any = {
        someProp: "A",
      };
      deleteViewProps(layer);

      expect(layer).toEqual(expected);
    });

    it("should not fail when view does not contain key props", () => {
      const layer: any = {
        someProp: "A",
      };
      const expected: any = {
        someProp: "A",
      };
      deleteViewProps(layer);

      expect(layer).toEqual(expected);
    });
  });

  describe("_getNameMapping", () => {
    it("should not fail when an edit fields info object doesn't have a source alias or type", () => {
      const fieldInfos: any = {
        cd766cba0dd44ec080420acc10990282: {
          newFields: [
            {
              name: "a0",
              alias: "A",
            },
            {
              name: "b",
            },
            {
              name: "createdate",
            },
            {
              name: "create_date",
            },
            {
              name: "editdate",
            },
          ],
          sourceFields: [
            {
              name: "A",
              alias: "A",
            },
            {
              name: "B",
            },
            {
              name: "CreateDate",
            },
            {
              name: "EditDate",
            },
          ],
          otherProperty: {
            test: "test",
          },
          editFieldsInfo: {
            createDateField: "CreateDate",
            editDateField: "EditDate",
          },
          newEditFieldsInfo: {
            createDateField: "create_date",
            editDateField: "editdate",
          },
          sourceSchemaChangesAllowed: true,
        },
      };

      const expected = {
        a: {
          name: "a0",
          alias: "A",
          type: "",
        },
        b: {
          name: "b",
          alias: "",
          type: "",
        },
        createdate: {
          name: "create_date",
          alias: "",
          type: "",
        },
        editdate: {
          name: "editdate",
          alias: "",
          type: "",
        },
      };

      const actual = _getNameMapping(fieldInfos, itemId);
      expect(actual).toEqual(expected);
    });
  });
});
