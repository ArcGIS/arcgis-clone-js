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
 * Provides tests for functions involving the creation and deployment of Webmap item types.
 */

import * as common from "@esri/solution-common";
import * as webmap from "../src/webmap";
import * as fetchMock from "fetch-mock";
import * as mockItems from "../../common/test/mocks/agolItems";
import * as utils from "../../common/test/mocks/utils";

const SERVER_INFO = {
  currentVersion: 10.1,
  fullVersion: "10.1",
  soapUrl: "http://server/arcgis/services",
  secureSoapUrl: "https://server/arcgis/services",
  owningSystemUrl: "https://myorg.maps.arcgis.com",
  authInfo: {},
};

// ------------------------------------------------------------------------------------------------------------------ //

describe("Module `webmap`: manages the creation and deployment of web map item types", () => {
  let MOCK_USER_SESSION: common.UserSession;

  beforeEach(() => {
    MOCK_USER_SESSION = utils.createRuntimeMockUserSession();
  });

  afterEach(() => {
    fetchMock.restore();
  });

  describe("convertItemToTemplate", () => {
    it("converts without data", async () => {
      const model = {
        itemId: "itm1234567890",
        type: "Web Map",
        key: "abcdefgh",
        item: {
          id: "{{itm1234567890.itemId}}",
          title: "Voting Centers",
        } as any,
        data: null as any,
        resources: [] as any[],
        dependencies: [] as string[],
        groups: [] as string[],
        properties: {} as any,
        estimatedDeploymentCostFactor: 0,
      };
      const expected = {
        itemId: "itm1234567890",
        type: "Web Map",
        key: "abcdefgh",
        item: {
          id: "{{itm1234567890.itemId}}",
          title: "Voting Centers",
          url: undefined,
        } as any,
        data: null as any,
        resources: [] as any[],
        dependencies: [] as string[],
        groups: [] as string[],
        properties: {} as any,
        estimatedDeploymentCostFactor: 0,
      };

      const actual = await webmap.convertItemToTemplate(model, MOCK_USER_SESSION, MOCK_USER_SESSION, {});
      expect(actual).toEqual(expected);
    });

    it("converts with empty data", async () => {
      const model = {
        itemId: "itm1234567890",
        type: "Web Map",
        key: "abcdefgh",
        item: {
          id: "{{itm1234567890.itemId}}",
          title: "Voting Centers",
        } as any,
        data: {} as any,
        resources: [] as any[],
        dependencies: [] as string[],
        groups: [] as string[],
        properties: {} as any,
        estimatedDeploymentCostFactor: 0,
      };
      const expected = {
        itemId: "itm1234567890",
        type: "Web Map",
        key: "abcdefgh",
        item: {
          id: "{{itm1234567890.itemId}}",
          title: "Voting Centers",
          url: undefined,
        } as any,
        data: {} as any,
        resources: [] as any[],
        dependencies: [] as string[],
        groups: [] as string[],
        properties: {} as any,
        estimatedDeploymentCostFactor: 0,
      };

      const actual = await webmap.convertItemToTemplate(model, MOCK_USER_SESSION, MOCK_USER_SESSION, {});
      expect(actual).toEqual(expected);
    });

    it("converts with layer data", async () => {
      const model = {
        itemId: "A14a9ef8efa7448fa8ddf7b13cef0240",
        type: "Web Map",
        key: "abcdefgh",
        item: {
          id: "{{A14a9ef8efa7448fa8ddf7b13cef0240.itemId}}",
          title: "Voting Centers",
          url: null,
        } as any,
        data: {
          baseMap: {
            baseMapLayers: [
              {
                id: "World_Hillshade_3805",
                opacity: 1,
                title: "World Hillshade",
                url: "https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer",
                visibility: true,
                layerType: "ArcGISTiledMapServiceLayer",
              },
              {
                id: "187dd95bb45-layer-4",
                title: "Nova (German)",
                itemId: "vts01234567890",
                layerType: "VectorTileLayer",
                styleUrl:
                  "https://www.arcgis.com/sharing/rest/content/items/4da7ae171a83428/resources/styles/root.json",
              },
            ],
          },
          operationalLayers: [
            {
              itemId: "bada9ef8efa7448fa8ddf7b13cef0240",
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/1",
            },
            {
              itemId: "badb9ef8efa7448fa8ddf7b13cef0240",
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService1/FeatureServer/2",
            },
            {
              itemId: null,
            },
            {
              itemId: "badc9ef8efa7448fa8ddf7b13cef0240",
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService2/FeatureServer/4",
            },
          ],
          tables: [],
        } as any,
        resources: [] as any[],
        dependencies: [] as string[],
        groups: [] as string[],
        properties: {} as any,
        estimatedDeploymentCostFactor: 0,
      };
      const expected = {
        itemId: "A14a9ef8efa7448fa8ddf7b13cef0240",
        type: "Web Map",
        key: "abcdefgh",
        item: {
          id: "{{A14a9ef8efa7448fa8ddf7b13cef0240.itemId}}",
          title: "Voting Centers",
          url: null,
        } as any,
        data: {
          baseMap: {
            baseMapLayers: [
              {
                id: "World_Hillshade_3805",
                opacity: 1,
                title: "World Hillshade",
                url: "https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer",
                visibility: true,
                layerType: "ArcGISTiledMapServiceLayer",
              },
              {
                id: "187dd95bb45-layer-4",
                title: "Nova (German)",
                itemId: "vts01234567890",
                layerType: "VectorTileLayer",
                styleUrl:
                  "https://www.arcgis.com/sharing/rest/content/items/4da7ae171a83428/resources/styles/root.json",
              },
            ],
          },
          operationalLayers: [
            {
              itemId: "{{abca9ef8efa7448fa8ddf7b13cef0240.layer1.itemId}}",
              url: "{{abca9ef8efa7448fa8ddf7b13cef0240.layer1.url}}",
            },
            {
              itemId: "{{abcb9ef8efa7448fa8ddf7b13cef0240.layer2.itemId}}",
              url: "{{abcb9ef8efa7448fa8ddf7b13cef0240.layer2.url}}",
            },
            {
              itemId: null,
            },
            {
              itemId: "{{abcc9ef8efa7448fa8ddf7b13cef0240.layer4.itemId}}",
              url: "{{abcc9ef8efa7448fa8ddf7b13cef0240.layer4.url}}",
            },
          ],
          tables: [],
        } as any,
        resources: [] as any[],
        dependencies: [
          "abca9ef8efa7448fa8ddf7b13cef0240",
          "abcb9ef8efa7448fa8ddf7b13cef0240",
          "abcc9ef8efa7448fa8ddf7b13cef0240",
        ],
        groups: [] as string[],
        properties: {} as any,
        estimatedDeploymentCostFactor: 0,
      };

      fetchMock
        .get("https://myorg.maps.arcgis.com/sharing/rest/content/items/vts01234567890?f=json&token=fake-token", {})
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/1", {
          serviceItemId: "abca9ef8efa7448fa8ddf7b13cef0240",
        })
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService1/FeatureServer/2", {
          serviceItemId: "abcb9ef8efa7448fa8ddf7b13cef0240",
        })
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService2/FeatureServer/4", {
          serviceItemId: "abcc9ef8efa7448fa8ddf7b13cef0240",
        });

      const actual = await webmap.convertItemToTemplate(model, MOCK_USER_SESSION, MOCK_USER_SESSION, {});
      expect(actual).toEqual(expected);
    });

    it("converts with table data", async () => {
      const model = {
        itemId: "A14a9ef8efa7448fa8ddf7b13cef0240",
        type: "Web Map",
        key: "abcdefgh",
        item: {
          id: "{{A14a9ef8efa7448fa8ddf7b13cef0240.itemId}}",
          title: "Voting Centers",
          url: "https://myorg.arcgis.com/home/webmap/viewer.html?webmap=A14a9ef8efa7448fa8ddf7b13cef0240",
        } as any,
        data: {
          operationalLayers: [],
          tables: [
            {
              itemId: "table1",
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/1",
            },
            {
              itemId: "abc29ef8efa7448fa8ddf7b13cef0240",
            },
            {
              itemId: "table3",
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService1/FeatureServer/3",
            },
            {
              itemId: null,
            },
          ],
        } as any,
        resources: [] as any[],
        dependencies: [] as string[],
        groups: [] as string[],
        properties: {} as any,
        estimatedDeploymentCostFactor: 0,
      };
      const expected = {
        itemId: "A14a9ef8efa7448fa8ddf7b13cef0240",
        type: "Web Map",
        key: "abcdefgh",
        item: {
          id: "{{A14a9ef8efa7448fa8ddf7b13cef0240.itemId}}",
          title: "Voting Centers",
          url: "{{portalBaseUrl}}/home/webmap/viewer.html?webmap={{A14a9ef8efa7448fa8ddf7b13cef0240.itemId}}",
        } as any,
        data: {
          operationalLayers: [],
          tables: [
            {
              itemId: "{{abc19ef8efa7448fa8ddf7b13cef0240.layer1.itemId}}",
              url: "{{abc19ef8efa7448fa8ddf7b13cef0240.layer1.url}}",
            },
            {
              itemId: "abc29ef8efa7448fa8ddf7b13cef0240",
            },
            {
              itemId: "{{abc39ef8efa7448fa8ddf7b13cef0240.layer3.itemId}}",
              url: "{{abc39ef8efa7448fa8ddf7b13cef0240.layer3.url}}",
            },
            {
              itemId: null,
            },
          ],
        } as any,
        resources: [] as any[],
        dependencies: ["abc19ef8efa7448fa8ddf7b13cef0240", "abc39ef8efa7448fa8ddf7b13cef0240"],
        groups: [] as string[],
        properties: {} as any,
        estimatedDeploymentCostFactor: 0,
      };

      fetchMock
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/1", {
          serviceItemId: "abc19ef8efa7448fa8ddf7b13cef0240",
        })
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService1/FeatureServer/3", {
          serviceItemId: "abc39ef8efa7448fa8ddf7b13cef0240",
        });

      const actual = await webmap.convertItemToTemplate(model, MOCK_USER_SESSION, MOCK_USER_SESSION, {});
      expect(actual).toEqual(expected);
    });

    it("converts with layer and table data", async () => {
      const model = {
        itemId: "A14a9ef8efa7448fa8ddf7b13cef0240",
        type: "Web Map",
        key: "abcdefgh",
        item: {
          id: "{{A14a9ef8efa7448fa8ddf7b13cef0240.itemId}}",
          title: "Voting Centers",
          url: null,
        } as any,
        data: {
          operationalLayers: [
            {
              itemId: null,
            },
            {
              itemId: "layer2",
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService2/FeatureServer/2",
            },
            {
              itemId: null,
            },
            {
              itemId: "layer4",
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService4/FeatureServer/4",
            },
          ],
          tables: [
            {
              itemId: "table1",
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService1/FeatureServer/1",
            },
            {
              itemId: null,
            },
            {
              itemId: "table3",
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService3/FeatureServer/3",
            },
            {
              itemId: null,
            },
          ],
        } as any,
        resources: [] as any[],
        dependencies: [] as string[],
        groups: [] as string[],
        properties: {} as any,
        estimatedDeploymentCostFactor: 0,
      };
      const expected = {
        itemId: "A14a9ef8efa7448fa8ddf7b13cef0240",
        type: "Web Map",
        key: "abcdefgh",
        item: {
          id: "{{A14a9ef8efa7448fa8ddf7b13cef0240.itemId}}",
          title: "Voting Centers",
          url: null,
        } as any,
        data: {
          operationalLayers: [
            {
              itemId: null,
            },
            {
              itemId: "{{abc29ef8efa7448fa8ddf7b13cef0240.layer2.itemId}}",
              url: "{{abc29ef8efa7448fa8ddf7b13cef0240.layer2.url}}",
            },
            {
              itemId: null,
            },
            {
              itemId: "{{abc49ef8efa7448fa8ddf7b13cef0240.layer4.itemId}}",
              url: "{{abc49ef8efa7448fa8ddf7b13cef0240.layer4.url}}",
            },
          ],
          tables: [
            {
              itemId: "{{abc19ef8efa7448fa8ddf7b13cef0240.layer1.itemId}}",
              url: "{{abc19ef8efa7448fa8ddf7b13cef0240.layer1.url}}",
            },
            {
              itemId: null,
            },
            {
              itemId: "{{abc39ef8efa7448fa8ddf7b13cef0240.layer3.itemId}}",
              url: "{{abc39ef8efa7448fa8ddf7b13cef0240.layer3.url}}",
            },
            {
              itemId: null,
            },
          ],
        } as any,
        resources: [] as any[],
        dependencies: [
          "abc29ef8efa7448fa8ddf7b13cef0240",
          "abc49ef8efa7448fa8ddf7b13cef0240",
          "abc19ef8efa7448fa8ddf7b13cef0240",
          "abc39ef8efa7448fa8ddf7b13cef0240",
        ],
        groups: [] as string[],
        properties: {} as any,
        estimatedDeploymentCostFactor: 0,
      };

      fetchMock
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService1/FeatureServer/1", {
          serviceItemId: "abc19ef8efa7448fa8ddf7b13cef0240",
        })
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService2/FeatureServer/2", {
          serviceItemId: "abc29ef8efa7448fa8ddf7b13cef0240",
        })
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService3/FeatureServer/3", {
          serviceItemId: "abc39ef8efa7448fa8ddf7b13cef0240",
        })
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService4/FeatureServer/4", {
          serviceItemId: "abc49ef8efa7448fa8ddf7b13cef0240",
        });

      const actual = await webmap.convertItemToTemplate(model, MOCK_USER_SESSION, MOCK_USER_SESSION, {});
      expect(actual).toEqual(expected);
    });

    it("handles error with fetching layer", async () => {
      const model = {
        itemId: "A14a9ef8efa7448fa8ddf7b13cef0240",
        type: "Web Map",
        key: "abcdefgh",
        item: {
          id: "{{A14a9ef8efa7448fa8ddf7b13cef0240.itemId}}",
          title: "Voting Centers",
        } as any,
        data: {
          operationalLayers: [
            {
              itemId: "layer1",
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/1",
            },
            {
              itemId: "layer2",
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/2",
            },
            {
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/3",
            },
            {
              itemId: "layer4",
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/4",
            },
          ],
          tables: [],
        } as any,
        resources: [] as any[],
        dependencies: [] as string[],
        groups: [] as string[],
        properties: {} as any,
        estimatedDeploymentCostFactor: 0,
      };
      fetchMock
        .post(
          "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/1",
          mockItems.get400Failure(),
        )
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/2", {
          serviceItemId: "abc29ef8efa7448fa8ddf7b13cef0240",
        })
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/3", {
          serviceItemId: "abc39ef8efa7448fa8ddf7b13cef0240",
        })
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/4", {
          serviceItemId: "abc49ef8efa7448fa8ddf7b13cef0240",
        });

      return webmap.convertItemToTemplate(model, MOCK_USER_SESSION, MOCK_USER_SESSION, {}).then(
        () => fail(),
        () => Promise.resolve(),
      );
    });

    it("will update layers itemId if missing", async () => {
      const model = {
        itemId: "A14a9ef8efa7448fa8ddf7b13cef0240",
        type: "Web Map",
        key: "abcdefgh",
        item: {
          id: "{{A14a9ef8efa7448fa8ddf7b13cef0240.itemId}}",
          title: "Voting Centers",
          url: "https://myorg.arcgis.com/home/webmap/viewer.html?webmap=A14a9ef8efa7448fa8ddf7b13cef0240",
        } as any,
        data: {
          operationalLayers: [
            {
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService1/FeatureServer/1",
            },
            {
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService2/FeatureServer/2",
            },
            {
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService3/FeatureServer/3",
            },
            {
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService4/FeatureServer/4",
            },
          ],
          tables: [],
        } as any,
        resources: [] as any[],
        dependencies: [] as string[],
        groups: [] as string[],
        properties: {} as any,
        estimatedDeploymentCostFactor: 0,
      };
      const expected = {
        itemId: "A14a9ef8efa7448fa8ddf7b13cef0240",
        type: "Web Map",
        key: "abcdefgh",
        item: {
          id: "{{A14a9ef8efa7448fa8ddf7b13cef0240.itemId}}",
          title: "Voting Centers",
          url: "{{portalBaseUrl}}/home/webmap/viewer.html?webmap={{A14a9ef8efa7448fa8ddf7b13cef0240.itemId}}",
        } as any,
        data: {
          operationalLayers: [
            {
              itemId: "{{abc19ef8efa7448fa8ddf7b13cef0240.layer1.itemId}}",
              url: "{{abc19ef8efa7448fa8ddf7b13cef0240.layer1.url}}",
            },
            {
              itemId: "{{abc29ef8efa7448fa8ddf7b13cef0240.layer2.itemId}}",
              url: "{{abc29ef8efa7448fa8ddf7b13cef0240.layer2.url}}",
            },
            {
              itemId: "{{abc39ef8efa7448fa8ddf7b13cef0240.layer3.itemId}}",
              url: "{{abc39ef8efa7448fa8ddf7b13cef0240.layer3.url}}",
            },
            {
              itemId: "{{abc49ef8efa7448fa8ddf7b13cef0240.layer4.itemId}}",
              url: "{{abc49ef8efa7448fa8ddf7b13cef0240.layer4.url}}",
            },
          ],
          tables: [],
        } as any,
        resources: [] as any[],
        dependencies: [
          "abc19ef8efa7448fa8ddf7b13cef0240",
          "abc29ef8efa7448fa8ddf7b13cef0240",
          "abc39ef8efa7448fa8ddf7b13cef0240",
          "abc49ef8efa7448fa8ddf7b13cef0240",
        ],
        groups: [] as string[],
        properties: {} as any,
        estimatedDeploymentCostFactor: 0,
      };

      fetchMock
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService1/FeatureServer/1", {
          serviceItemId: "abc19ef8efa7448fa8ddf7b13cef0240",
        })
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService2/FeatureServer/2", {
          serviceItemId: "abc29ef8efa7448fa8ddf7b13cef0240",
        })
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService3/FeatureServer/3", {
          serviceItemId: "abc39ef8efa7448fa8ddf7b13cef0240",
        })
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService4/FeatureServer/4", {
          serviceItemId: "abc49ef8efa7448fa8ddf7b13cef0240",
        });

      const actual = await webmap.convertItemToTemplate(model, MOCK_USER_SESSION, MOCK_USER_SESSION, {});
      expect(actual).toEqual(expected);
    });

    it("will avoid fetching layer without itemId if it exists elsewhere in the map", async () => {
      const model = {
        itemId: "A14a9ef8efa7448fa8ddf7b13cef0240",
        type: "Web Map",
        key: "abcdefgh",
        item: {
          id: "{{A14a9ef8efa7448fa8ddf7b13cef0240.itemId}}",
          title: "Voting Centers",
          url: null,
        } as any,
        data: {
          operationalLayers: [
            {
              itemId: "layer1",
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService1/FeatureServer/1",
            },
            {
              itemId: "layer2",
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService2/FeatureServer/2",
            },
            {
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService2/FeatureServer/2",
            },
            {
              itemId: "layer3",
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService3/FeatureServer/3",
            },
          ],
          tables: [],
        } as any,
        resources: [] as any[],
        dependencies: [] as string[],
        groups: [] as string[],
        properties: {} as any,
        estimatedDeploymentCostFactor: 0,
      };
      const expected = {
        itemId: "A14a9ef8efa7448fa8ddf7b13cef0240",
        type: "Web Map",
        key: "abcdefgh",
        item: {
          id: "{{A14a9ef8efa7448fa8ddf7b13cef0240.itemId}}",
          title: "Voting Centers",
          url: null,
        } as any,
        data: {
          operationalLayers: [
            {
              itemId: "{{abc19ef8efa7448fa8ddf7b13cef0240.layer1.itemId}}",
              url: "{{abc19ef8efa7448fa8ddf7b13cef0240.layer1.url}}",
            },
            {
              itemId: "{{abc29ef8efa7448fa8ddf7b13cef0240.layer2.itemId}}",
              url: "{{abc29ef8efa7448fa8ddf7b13cef0240.layer2.url}}",
            },
            {
              itemId: "{{abc29ef8efa7448fa8ddf7b13cef0240.layer2.itemId}}",
              url: "{{abc29ef8efa7448fa8ddf7b13cef0240.layer2.url}}",
            },
            {
              itemId: "{{abc39ef8efa7448fa8ddf7b13cef0240.layer3.itemId}}",
              url: "{{abc39ef8efa7448fa8ddf7b13cef0240.layer3.url}}",
            },
          ],
          tables: [],
        } as any,
        resources: [] as any[],
        dependencies: [
          "abc19ef8efa7448fa8ddf7b13cef0240",
          "abc29ef8efa7448fa8ddf7b13cef0240",
          "abc39ef8efa7448fa8ddf7b13cef0240",
        ],
        groups: [] as string[],
        properties: {} as any,
        estimatedDeploymentCostFactor: 0,
      };

      fetchMock
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService1/FeatureServer/1", {
          serviceItemId: "abc19ef8efa7448fa8ddf7b13cef0240",
        })
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService2/FeatureServer/2", {
          serviceItemId: "abc29ef8efa7448fa8ddf7b13cef0240",
        })
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService3/FeatureServer/3", {
          serviceItemId: "abc39ef8efa7448fa8ddf7b13cef0240",
        });

      const actual = await webmap.convertItemToTemplate(model, MOCK_USER_SESSION, MOCK_USER_SESSION, {});
      expect(actual).toEqual(expected);
    });

    it("will not add layer as dependency if missing serviceItemId", async () => {
      const model = {
        itemId: "A14a9ef8efa7448fa8ddf7b13cef0240",
        type: "Web Map",
        key: "abcdefgh",
        item: {
          id: "{{A14a9ef8efa7448fa8ddf7b13cef0240.itemId}}",
          title: "Voting Centers",
          url: "https://myorg.arcgis.com/home/webmap/viewer.html?webmap=map1234567890",
        } as any,
        data: {
          operationalLayers: [
            {
              itemId: "layer1",
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService1/FeatureServer/1",
            },
            {
              itemId: "layer2",
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService2/FeatureServer/2",
            },
            {
              itemId: "layer3",
              url: "http://myserver/arcgis/services/myService3/FeatureServer/3",
            },
            {
              itemId: "layer4",
              url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService4/FeatureServer/4",
            },
          ],
          tables: [],
        } as any,
        resources: [] as any[],
        dependencies: [] as string[],
        groups: [] as string[],
        properties: {} as any,
        estimatedDeploymentCostFactor: 0,
      };
      const expected = {
        itemId: "A14a9ef8efa7448fa8ddf7b13cef0240",
        type: "Web Map",
        key: "abcdefgh",
        item: {
          id: "{{A14a9ef8efa7448fa8ddf7b13cef0240.itemId}}",
          title: "Voting Centers",
          url: "{{portalBaseUrl}}/home/webmap/viewer.html?webmap={{A14a9ef8efa7448fa8ddf7b13cef0240.itemId}}",
        } as any,
        data: {
          operationalLayers: [
            {
              itemId: "{{abc19ef8efa7448fa8ddf7b13cef0240.layer1.itemId}}",
              url: "{{abc19ef8efa7448fa8ddf7b13cef0240.layer1.url}}",
            },
            {
              itemId: "{{abc29ef8efa7448fa8ddf7b13cef0240.layer2.itemId}}",
              url: "{{abc29ef8efa7448fa8ddf7b13cef0240.layer2.url}}",
            },
            {
              itemId: "layer3",
              url: "http://myserver/arcgis/services/myService3/FeatureServer/3",
            },
            {
              itemId: "{{abc49ef8efa7448fa8ddf7b13cef0240.layer4.itemId}}",
              url: "{{abc49ef8efa7448fa8ddf7b13cef0240.layer4.url}}",
            },
          ],
          tables: [],
        } as any,
        resources: [] as any[],
        dependencies: [
          "abc19ef8efa7448fa8ddf7b13cef0240",
          "abc29ef8efa7448fa8ddf7b13cef0240",
          "abc49ef8efa7448fa8ddf7b13cef0240",
        ],
        groups: [] as string[],
        properties: {} as any,
        estimatedDeploymentCostFactor: 0,
      };

      fetchMock
        .get(
          "https://myorg.maps.arcgis.com/sharing/rest/portals/self?f=json&token=fake-token",
          utils.getPortalsSelfResponse(),
        )
        .post(utils.PORTAL_SUBSET.restUrl + "/info", SERVER_INFO)
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService1/FeatureServer/1", {
          serviceItemId: "abc19ef8efa7448fa8ddf7b13cef0240",
        })
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService2/FeatureServer/2", {
          serviceItemId: "abc29ef8efa7448fa8ddf7b13cef0240",
        })
        .post("http://myserver/arcgis/services/myService3/FeatureServer/3/rest/info", SERVER_INFO)
        .post("http://myserver/arcgis/services/myService3/FeatureServer/3", {})
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService4/FeatureServer/4", {
          serviceItemId: "abc49ef8efa7448fa8ddf7b13cef0240",
        });

      const actual = await webmap.convertItemToTemplate(model, MOCK_USER_SESSION, MOCK_USER_SESSION, {});
      expect(actual).toEqual(expected);
    });
  });

  describe("_getLayerIds", () => {
    it("will get layer ids with url and construct url/id hash", async () => {
      const layerList = [
        {
          id: "layer0",
          itemId: "vts01234567890",
          layerType: "VectorTileLayer",
          styleUrl: utils.PORTAL_SUBSET.restUrl + "/content/items/vts01234567890/resources/styles/root.json",
        },
        {
          itemId: "layer1",
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService1/FeatureServer/1",
        },
        {
          itemId: "layer2",
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService2/FeatureServer/2",
        },
        {
          itemId: "layer4",
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService4/FeatureServer/4",
        },
        {
          url: "http://myServer/ArcGIS/services/myService4/MapServer/4",
        },
      ];
      const dependencies: string[] = [];

      fetchMock
        .get("https://myorg.maps.arcgis.com/sharing/rest/content/items/vts01234567890?f=json&token=fake-token", {
          id: "vts01234567890",
          typeKeywords: ["Vector Tile Style Editor"],
        })
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService1/FeatureServer/1", {
          serviceItemId: "abc19ef8efa7448fa8ddf7b13cef0240",
          id: 1,
        })
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService2/FeatureServer/2", {
          serviceItemId: "abc29ef8efa7448fa8ddf7b13cef0240",
          id: 2,
        })
        .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService4/FeatureServer/4", {
          serviceItemId: "abc49ef8efa7448fa8ddf7b13cef0240",
          id: 4,
        });

      const expected = {
        dependencies: [
          "vts01234567890",
          "abc19ef8efa7448fa8ddf7b13cef0240",
          "abc29ef8efa7448fa8ddf7b13cef0240",
          "abc49ef8efa7448fa8ddf7b13cef0240",
        ],
        urlHash: {
          "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService1/FeatureServer/1":
            "abc19ef8efa7448fa8ddf7b13cef0240",
          "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService2/FeatureServer/2":
            "abc29ef8efa7448fa8ddf7b13cef0240",
          "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService4/FeatureServer/4":
            "abc49ef8efa7448fa8ddf7b13cef0240",
        },
      };

      const actual = await webmap._getLayerIds(layerList, dependencies, MOCK_USER_SESSION);
      expect(actual).toEqual(expected);
      expect(layerList[0].styleUrl).toEqual("{{vts01234567890.itemUrl}}/resources/styles/root.json");
    });
  });

  it("will get layer ids with url and construct url/id hash; VectorTileLayer doesn't contain 'Vector Tile Style Editor' typeKeyword", async () => {
    const layerList = [
      {
        id: "layer0",
        itemId: "vts01234567890",
        layerType: "VectorTileLayer",
        styleUrl: utils.PORTAL_SUBSET.restUrl + "/content/items/vts01234567890/resources/styles/root.json",
      },
      {
        itemId: "layer1",
        url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService1/FeatureServer/1",
      },
      {
        itemId: "layer2",
        url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService2/FeatureServer/2",
      },
      {
        itemId: "layer4",
        url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService4/FeatureServer/4",
      },
      {
        url: "http://myServer/ArcGIS/services/myService4/MapServer/4",
      },
    ];
    const dependencies: string[] = [];

    fetchMock
      .get("https://myorg.maps.arcgis.com/sharing/rest/content/items/vts01234567890?f=json&token=fake-token", {
        id: "vts01234567890",
      })
      .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService1/FeatureServer/1", {
        serviceItemId: "abc19ef8efa7448fa8ddf7b13cef0240",
        id: 1,
      })
      .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService2/FeatureServer/2", {
        serviceItemId: "abc29ef8efa7448fa8ddf7b13cef0240",
        id: 2,
      })
      .post("http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService4/FeatureServer/4", {
        serviceItemId: "abc49ef8efa7448fa8ddf7b13cef0240",
        id: 4,
      });

    const expected = {
      dependencies: [
        "abc19ef8efa7448fa8ddf7b13cef0240",
        "abc29ef8efa7448fa8ddf7b13cef0240",
        "abc49ef8efa7448fa8ddf7b13cef0240",
      ],
      urlHash: {
        "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService1/FeatureServer/1":
          "abc19ef8efa7448fa8ddf7b13cef0240",
        "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService2/FeatureServer/2":
          "abc29ef8efa7448fa8ddf7b13cef0240",
        "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService4/FeatureServer/4":
          "abc49ef8efa7448fa8ddf7b13cef0240",
      },
    };

    const actual = await webmap._getLayerIds(layerList, dependencies, MOCK_USER_SESSION);
    expect(actual).toEqual(expected);
    expect(layerList[0].styleUrl).toEqual(
      utils.PORTAL_SUBSET.restUrl + "/content/items/vts01234567890/resources/styles/root.json",
    );
  });

  describe("_templatizeWebmapLayerIdsAndUrls", () => {
    it("handles no layers", () => {
      let layerList;
      const urlHash = {};

      webmap._templatizeWebmapLayerIdsAndUrls(undefined, urlHash, {});

      expect(layerList).toBeUndefined();
    });

    it("handles no analysis layers", () => {
      const layerList = [
        {
          id: "layer0",
          itemId: "vts01234567890",
          layerType: "VectorTileLayer",
          styleUrl: utils.PORTAL_SUBSET.restUrl + "/content/items/vts01234567890/resources/styles/root.json",
        },
        {
          itemId: "layer1",
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/1",
        },
        {
          itemId: "layer2",
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/2",
        },
        {
          itemId: "layer4",
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/4",
        },
      ];
      const urlHash = {};

      webmap._templatizeWebmapLayerIdsAndUrls(layerList, urlHash, {});

      const expectedLayerListTemplate = [
        {
          id: "layer0",
          itemId: "vts01234567890",
          layerType: "VectorTileLayer",
          styleUrl: utils.PORTAL_SUBSET.restUrl + "/content/items/vts01234567890/resources/styles/root.json",
        },
        {
          itemId: "layer1",
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/1",
        },
        {
          itemId: "layer2",
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/2",
        },
        {
          itemId: "layer4",
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/4",
        },
      ];
      expect(layerList).toEqual(expectedLayerListTemplate);
    });

    it("handles an analysis layer amidst other layers", () => {
      const layerList = [
        {
          itemId: "layer1",
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/1",
        },
        {
          itemId: "layer2",
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/2",
        },
        {
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/3",
        },
        {
          itemId: "layer4",
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/4",
        },
      ];

      const urlHash = {
        "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/3": "layer3hash",
      };

      webmap._templatizeWebmapLayerIdsAndUrls(layerList, urlHash, {});

      const expectedLayerListTemplate = [
        {
          itemId: "layer1",
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/1",
        },
        {
          itemId: "layer2",
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/2",
        },
        {
          itemId: "{{layer3hash.layer3.itemId}}",
          url: "{{layer3hash.layer3.url}}",
        },
        {
          itemId: "layer4",
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/4",
        },
      ];
      expect(layerList).toEqual(expectedLayerListTemplate);
    });

    it("handles an analysis layer without a serviceItemId", () => {
      const layerList = [
        {
          itemId: "layer1",
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/1",
        },
        {
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/3",
        },
      ];
      const urlHash = {};

      webmap._templatizeWebmapLayerIdsAndUrls(layerList, urlHash, {});

      const expectedLayerListTemplate = [
        {
          itemId: "layer1",
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/1",
        },
        {
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/3",
        },
      ];
      expect(layerList).toEqual(expectedLayerListTemplate);
    });

    it("handles an a VectorTileLayer that should have its item id templatized", () => {
      const layerList = [
        {
          itemId: "layer1",
          layerType: "VectorTileLayer",
          templatizeId: true,
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/1",
        },
        {
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/3",
        },
      ];
      const urlHash = {};

      webmap._templatizeWebmapLayerIdsAndUrls(layerList, urlHash, {});

      const expectedLayerListTemplate = [
        {
          itemId: "{{layer1.itemId}}",
          layerType: "VectorTileLayer",
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/1",
        },
        {
          url: "http://services.arcgis.com/myOrg/ArcGIS/rest/services/myService/FeatureServer/3",
        },
      ];
      expect(layerList).toEqual(expectedLayerListTemplate as any);
    });
  });

  describe("_templatize", () => {
    it("can templatize drawingInfo", () => {
      const drawingInfo: any = {
        renderer: {
          visualVariables: [
            {
              field: "A",
            },
          ],
          authoringInfo: {},
          type: "uniqueValue",
          field1: "A",
          defaultSymbol: {},
          uniqueValueInfos: [],
        },
      };

      const objs: any[] = [
        {
          id: "TestLayerForDashBoardMap_632",
          layerDefinition: {
            drawingInfo: drawingInfo,
          },
          field: {
            name: "A",
          },
        },
      ];
      const datasourceInfos: common.IDatasourceInfo[] = [
        {
          fields: [
            {
              name: "A",
            },
          ],
          ids: ["TestLayerForDashBoardMap_632"],
          adminLayerInfo: {},
          relationships: [],
          layerId: 0,
          itemId: "934a9ef8efa7448fa8ddf7b13cef0240",
          basePath: "934a9ef8efa7448fa8ddf7b13cef0240.layer0.fields",
          url: "{{934a9ef8efa7448fa8ddf7b13cef0240.url}}",
        },
      ];

      const expectedDrawingInfo: any = {
        renderer: {
          visualVariables: [
            {
              field: "{{934a9ef8efa7448fa8ddf7b13cef0240.layer0.fields.a.name}}",
            },
          ],
          authoringInfo: {},
          type: "uniqueValue",
          field1: "{{934a9ef8efa7448fa8ddf7b13cef0240.layer0.fields.a.name}}",
          defaultSymbol: {},
          uniqueValueInfos: [],
        },
      };

      const expected: any[] = [
        {
          id: "TestLayerForDashBoardMap_632",
          layerDefinition: {
            drawingInfo: expectedDrawingInfo,
          },
          field: {
            name: "{{934a9ef8efa7448fa8ddf7b13cef0240.layer0.fields.a.name}}",
          },
        },
      ];

      const actual: any[] = webmap._templatize(objs, datasourceInfos);
      expect(actual).toEqual(expected);
    });

    it("can handle missing drawingInfo", () => {
      const drawingInfo: any = {
        renderer: {
          visualVariables: [
            {
              field: "A",
            },
          ],
          authoringInfo: {},
          type: "uniqueValue",
          field1: "A",
          defaultSymbol: {},
          uniqueValueInfos: [],
        },
      };

      const objs: any[] = [
        {
          id: "TestLayerForDashBoardMap_632",
          layerDefinition: {
            drawingInfo: drawingInfo,
          },
          field: {
            name: "A",
          },
        },
      ];

      const datasourceInfos: common.IDatasourceInfo[] = [
        {
          fields: [
            {
              name: "A",
            },
          ],
          ids: ["TestLayerForDashBoardMap_123"],
          adminLayerInfo: {},
          relationships: [],
          layerId: 0,
          itemId: "934a9ef8efa7448fa8ddf7b13cef0240",
          basePath: "934a9ef8efa7448fa8ddf7b13cef0240.layer0.fields",
          url: "{{934a9ef8efa7448fa8ddf7b13cef0240.url}}",
        },
      ];

      const expectedObjs: any = common.cloneObject(objs);

      const actualTemplatizedObs: any[] = webmap._templatize(objs, datasourceInfos);
      expect(actualTemplatizedObs).toEqual(expectedObjs);
    });
  });
});
