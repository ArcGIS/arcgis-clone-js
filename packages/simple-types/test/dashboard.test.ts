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
 * Provides tests for functions involving the creation and deployment of Dashboard item types.
 */

import * as dashboard from "../src/dashboard";
import * as common from "@esri/solution-common";
import * as staticMocks from "../../common/test/mocks/staticDashboardMocks";
import * as utils from "../../common/test/mocks/utils";
import * as templates from "../../common/test/mocks/templates";

const date = new Date(Date.UTC(2019, 2, 4, 5, 6, 7)); // 0-based month
const now = date.getTime();

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000; // default is 5000 ms

let initialDashboardTemplate: any;
let expectedTemplate: any;
let datasourceInfos: common.IDatasourceInfo[];

let MOCK_USER_SESSION: common.ArcGISIdentityManager;

beforeEach(() => {
  MOCK_USER_SESSION = utils.createRuntimeMockUserSession();

  initialDashboardTemplate = common.cloneObject(
    staticMocks._initialDashboardTemplate
  );
  expectedTemplate = common.cloneObject(staticMocks.expectedTemplate);
  datasourceInfos = common.cloneObject(staticMocks.datasourceInfos);
});

// ------------------------------------------------------------------------------------------------------------------ //

describe("Module `dashboard`: manages the creation and deployment of dashboard item type", () => {
  describe("convertItemToTemplate", () => {
    it("should templatize webmap ids and external datasource ids", () => {
      const actualTemplate = dashboard.convertItemToTemplate(
        initialDashboardTemplate
      );

      const actualHS: any = common.getProp(
        actualTemplate,
        "data.headerPanel.selectors"
      );
      const expectedHS: any = common.getProp(
        expectedTemplate,
        "data.headerPanel.selectors"
      );
      expect(actualHS[4].datasets[0].dataSource.itemId).toEqual(
        expectedHS[4].datasets[0].dataSource.itemId
      );

      const actualLPS: any = common.getProp(
        actualTemplate,
        "data.leftPanel.selectors"
      );
      const expectedLPS: any = common.getProp(
        expectedTemplate,
        "data.leftPanel.selectors"
      );
      expect(actualLPS[0].datasets[0].dataSource.itemId).toEqual(
        expectedLPS[0].datasets[0].dataSource.itemId
      );
      expect(actualLPS[4].datasets[0].dataSource.itemId).toEqual(
        expectedLPS[4].datasets[0].dataSource.itemId
      );

      const actualW: any = common.getProp(actualTemplate, "data.widgets");
      const expectedW: any = common.getProp(expectedTemplate, "data.widgets");
      expect(actualW[0].itemId).toEqual(expectedW[0].itemId);
      expect(actualW[3].datasets[1].dataSource.itemId).toEqual(
        expectedW[3].datasets[1].dataSource.itemId
      );
      expect(actualW[3].datasets[2].dataSource.itemId).toEqual(
        expectedW[3].datasets[2].dataSource.itemId
      );
      expect(actualW[4].datasets[0].dataSource.itemId).toEqual(
        expectedW[4].datasets[0].dataSource.itemId
      );
      expect(actualW[6].datasets[0].dataSource.itemId).toEqual(
        expectedW[6].datasets[0].dataSource.itemId
      );
      expect(actualW[8].datasets[0].dataSource.itemId).toEqual(
        expectedW[8].datasets[0].dataSource.itemId
      );

      const actualP: any = common.getProp(actualTemplate, "data.urlParameters");
      const expectedP: any = common.getProp(
        expectedTemplate,
        "data.urlParameters"
      );
      expect(actualP[4].datasets[0].dataSource.itemId).toEqual(
        expectedP[4].datasets[0].dataSource.itemId
      );
    });
  });

  describe("_extractDependencies", () => {
    it("should extract dependencies", () => {
      const actual = dashboard._extractDependencies(initialDashboardTemplate);
      expect(actual.dependencies).toEqual(expectedTemplate.dependencies);
    });
  });

  describe("_getDatasourceDependencies", () => {
    it("handles defaulting to .itemId", () => {
      const obj: any = {
        dataSource: {
          itemId: "{{934a9ef8efa7448fa8ddf7b13cef0240.layer0.itemId}}"
        },
        datasets: [
          {
            dataSource: {
              itemId: "AAABBBCCC123"
            },
            type: "serviceDataset"
          },
          {
            dataSource: {
              itemId: "AAABBBCCC123"
            },
            type: "serviceDataset"
          }
        ]
      };

      const itemTemplate: common.IItemTemplate = templates.getItemTemplate(
        "Dashboard"
      );

      expect(itemTemplate.dependencies).toEqual([]);
      dashboard._getDatasourceDependencies(obj, itemTemplate);
      expect(itemTemplate.dependencies).toEqual(["AAABBBCCC123"]);
    });
  });

  describe("postProcessFieldReferences", () => {
    it("should templatize field references", () => {
      // need to the dependencies
      const actual = dashboard.convertItemToTemplate(initialDashboardTemplate);
      const actualTemplate: common.IItemTemplate = dashboard.postProcessFieldReferences(
        actual,
        datasourceInfos
      );
      expect(actualTemplate).toEqual(expectedTemplate);
    });
  });

  describe("_updateDatasourceReferences", () => {
    it("_updateDatasourceReferences", () => {
      const objs: any[] = [
        {
          id: "map0",
          datasets: [
            {
              dataSource: {
                itemId: "AAABBBCCC123",
                layerId: 1
              },
              type: "serviceDataset"
            },
            {
              dataSource: {
                itemId: "AAABBBCCC123",
                layerId: 0
              },
              type: "serviceDataset"
            }
          ]
        }
      ];

      const dsInfos: common.IDatasourceInfo[] = [
        {
          basePath: "",
          itemId: "AAABBBCCC123",
          ids: [],
          layerId: 0,
          fields: [],
          relationships: [],
          adminLayerInfo: {}
        },
        {
          basePath: "",
          itemId: "AAABBBCCC123",
          ids: [],
          layerId: 1,
          fields: [],
          relationships: [],
          adminLayerInfo: {}
        }
      ];

      dashboard._updateDatasourceReferences(objs, dsInfos);

      expect(dsInfos[0].references.length).toEqual(1);
      expect(dsInfos[0].references[0]).toEqual("map0");

      expect(dsInfos[1].references.length).toEqual(1);
      expect(dsInfos[1].references[0]).toEqual("map0");
    });
  });

  describe("_templatizeByDatasource", () => {
    it("ignores supplied objs if it is not defined", () => {
      const updatedList = dashboard._templatizeByDatasource(null, null);
      expect(updatedList).toBeNull();
    });
  });

  describe("_getDatasourceInfo", () => {
    it("handles dataSource.id", () => {
      const obj: any = {
        dataSource: {
          id: "widget#id"
        }
      };

      const dsInfos: common.IDatasourceInfo[] = [
        {
          basePath: "",
          itemId: "AAABBBCCC123",
          ids: ["id"],
          layerId: 0,
          fields: [],
          relationships: [],
          adminLayerInfo: {}
        },
        {
          basePath: "",
          itemId: "AAABBBCCC123",
          ids: [],
          layerId: 1,
          fields: [],
          relationships: [],
          adminLayerInfo: {}
        }
      ];

      const info = dashboard._getDatasourceInfo(obj, dsInfos);
      expect(info).toEqual(dsInfos[0]);
    });

    it("handles dataSource.id without match in datasourceInfos", () => {
      const obj: any = {
        dataSource: {
          id: "widget#id"
        }
      };

      const dsInfos: common.IDatasourceInfo[] = [
        {
          basePath: "",
          itemId: "AAABBBCCC123",
          ids: [],
          layerId: 0,
          fields: [],
          relationships: [],
          adminLayerInfo: {}
        },
        {
          basePath: "",
          itemId: "AAABBBCCC123",
          ids: [],
          layerId: 1,
          fields: [],
          relationships: [],
          adminLayerInfo: {}
        }
      ];

      const info = dashboard._getDatasourceInfo(obj, dsInfos);
      expect(info).toBeUndefined();
    });

    it("handles dataSource.itemId", () => {
      const obj: any = {
        dataSource: {
          itemId: "{{934a9ef8efa7448fa8ddf7b13cef0240.layer0.itemId}}",
          layerId: "{{934a9ef8efa7448fa8ddf7b13cef0240.layer0.layerId}}"
        }
      };

      const dsInfos: common.IDatasourceInfo[] = [
        {
          basePath: "",
          itemId: "AAABBBCCC123",
          ids: [],
          layerId: 0,
          fields: [],
          relationships: [],
          adminLayerInfo: {}
        },
        {
          basePath: "",
          itemId: "AAABBBCCC123",
          ids: [],
          layerId: 1,
          fields: [],
          relationships: [],
          adminLayerInfo: {}
        }
      ];

      const info = dashboard._getDatasourceInfo(obj, dsInfos);
    });
  });
});
