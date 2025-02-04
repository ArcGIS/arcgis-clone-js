/** @license
 * Copyright 2024 Esri
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
 * Provides tests for the creation and deployment of item types that contain files.
 */

import * as WebToolProcessor from "../src/web-tool-processor";
import * as mockAGO from "../../common/test/mocks/agolItems";
import * as utils from "../../common/test/mocks/utils";
import * as common from "@esri/solution-common";
import { simpleTypes } from "@esri/solution-simple-types";

let MOCK_USER_SESSION: common.UserSession;

beforeEach(() => {
  MOCK_USER_SESSION = utils.createRuntimeMockUserSession();
});

// ------------------------------------------------------------------------------------------------------------------ //

describe("Module `web-tool-processor`: ", () => {
  describe("convertItemToTemplate :: ", () => {
    it("should delegate to simple types convertToTemplate", async () => {
      const tpl = {
        id: "bc3",
        type: "Geoprocessing Service",
        item: {
          typeKeywords: ["Web Tool"],
          id: "",
          type: "",
        },
        itemId: "",
        key: "",
        data: {},
        resources: [],
        dependencies: [],
        properties: {},
        groups: [],
        estimatedDeploymentCostFactor: 0,
      };
      const convertSpy = spyOn(simpleTypes, "convertItemToTemplate").and.resolveTo(tpl);

      await WebToolProcessor.convertItemToTemplate(
        { id: "bc3", type: "Geoprocessing Service", item: { typeKeywords: ["Web Tool"] } },
        MOCK_USER_SESSION,
        MOCK_USER_SESSION,
        {},
      );
      expect(convertSpy.calls.count()).withContext("delegate to simple types").toBe(1);
    });
  });

  describe("createItemFromTemplate", () => {
    it("it exists", () => {
      expect(WebToolProcessor.createItemFromTemplate)
        .withContext("Should have createItemFromTemplate method")
        .toBeDefined();
    });

    const tmpl = {
      itemId: "bc8",
      type: "Geoprocessing Service",
      item: {},
    } as common.IItemTemplate;
    const td = {
      organization: {
        id: "somePortalId",
        portalHostname: "www.arcgis.com",
      },
      user: {
        username: "vader",
      },
      solutionItemExtent: "10,10,20,20",
      solution: {
        title: "Some Title",
      },
    };
    const cb = () => true;

    it("early-exits correctly", async () => {
      const cbFalse = () => false;

      const result = await WebToolProcessor.createItemFromTemplate(tmpl, td, MOCK_USER_SESSION, cbFalse);

      expect(result.id).withContext("should return empty result").toBe("");
      expect(result.postProcess).withContext("should return postProcess false").toBe(false);
    });

    it("can create Web Tool Geoprocessing Service", async () => {
      const requestSpy = spyOn(common, "request").and.resolveTo({
        itemId: "newgs0123456789",
      });
      const updateItemExtendedSpy = spyOn(common, "updateItemExtended").and.resolveTo(
        mockAGO.get200Success("newgs0123456789"),
      );
      const getItemBaseSpy = spyOn(common, "getItemBase").and.resolveTo(mockAGO.getAGOLItem("Geoprocessing Service"));

      const getItemResourcesFilesSpy = spyOn(common, "getItemResourcesFiles").and.resolveTo([
        {
          name: "webtoolService.json",
        } as any,
      ]);

      const serviceUrl = "http://localname/GPServer";

      const blobToJsonSpy = spyOn(common, "blobToJson").and.resolveTo({
        serviceUrl,
      });

      const result = await WebToolProcessor.createItemFromTemplate(
        {
          id: "bc3",
          type: "Geoprocessing Service",
          item: {
            typeKeywords: ["Web Tool"],
            thumbnail: "thumb",
          },
          data: {
            notebookId: "123",
            name: "NotebookName",
          },
        } as any,
        {
          portalUrls: {
            notebooks: {
              https: ["notebookservice"],
            },
          },
        },
        MOCK_USER_SESSION,
        cb,
      );

      expect(requestSpy.calls.count()).toBe(1);
      expect(updateItemExtendedSpy.calls.count()).toBe(1);
      expect(getItemBaseSpy.calls.count()).toBe(1);
      expect(result.item?.data).toEqual({});
      expect(getItemResourcesFilesSpy.calls.count()).toBe(1);
      expect(blobToJsonSpy.calls.count()).toBe(1);
    });

    it("can handle error on getEnterpriseServers", async () => {
      const getEnterpriseServersSpy = spyOn(common, "getEnterpriseServers").and.throwError("error")

      await WebToolProcessor.createItemFromTemplate(
        {
          id: "bc3",
          type: "Geoprocessing Service",
          item: {
            typeKeywords: ["Web Tool"],
            thumbnail: "thumb",
          },
          data: {
            notebookId: "123",
            name: "NotebookName",
          },
        } as any,
        {
          isPortal: true
        },
        MOCK_USER_SESSION,
        cb,
      );

      expect(getEnterpriseServersSpy.calls.count()).toBe(1);
      expect(getEnterpriseServersSpy).toThrowError();
    });

    it("Web Tool Geoprocessing Service handles cancel with item removal", async () => {
      const createCb2 = () => {
        let calls = 0;
        return () => {
          calls = calls + 1;
          return calls < 2;
        };
      };
      const requestSpy = spyOn(common, "request").and.resolveTo({
        itemId: "newgs0123456789",
      });
      const removeItemSpy = spyOn(common, "removeItem").and.resolveTo(mockAGO.get200Success("newgs0123456789"));

      await WebToolProcessor.createItemFromTemplate(
        {
          id: "bc3",
          type: "Geoprocessing Service",
          item: {
            typeKeywords: ["Web Tool"],
            thumbnail: "thumb",
          },
          data: {
            notebookId: "123",
            name: "NotebookName",
          },
        } as any,
        {
          portalUrls: {
            notebooks: {
              https: ["notebookservice"],
            },
          },
        },
        MOCK_USER_SESSION,
        createCb2(),
      );

      expect(requestSpy.calls.count()).toBe(1);
      expect(removeItemSpy.calls.count()).toBe(1);
    });

    it("Web Tool Geoprocessing Service handles cancel with failure to remove item", async () => {
      const createCb2 = () => {
        let calls = 0;
        return () => {
          calls = calls + 1;
          return calls < 2;
        };
      };
      const requestSpy = spyOn(common, "request").and.resolveTo({
        itemId: "newgs0123456789",
      });
      const removeItemSpy = spyOn(common, "removeItem").and.rejectWith("error");

      await WebToolProcessor.createItemFromTemplate(
        {
          id: "bc3",
          type: "Geoprocessing Service",
          item: {
            typeKeywords: ["Web Tool"],
            thumbnail: "thumb",
          },
          data: {
            notebookId: "123",
            name: "NotebookName",
          },
        } as any,
        {
          portalUrls: {
            notebooks: {
              https: ["notebookservice"],
            },
          },
        },
        MOCK_USER_SESSION,
        createCb2(),
      );

      expect(requestSpy.calls.count()).toBe(1);
      expect(removeItemSpy.calls.count()).toBe(1);
    });

    it("handles cancel during updateItemExtended with item removal", async () => {
      const createCb2 = () => {
        let calls = 0;
        return () => {
          calls = calls + 1;
          return calls < 3;
        };
      };
      const requestSpy = spyOn(common, "request").and.resolveTo({
        itemId: "newgs0123456789",
      });
      const updateItemExtendedSpy = spyOn(common, "updateItemExtended").and.resolveTo(
        mockAGO.get200Success("newgs0123456789"),
      );
      const removeItemSpy = spyOn(common, "removeItem").and.resolveTo(mockAGO.get200Success("3ef"));

      const getItemResourcesFilesSpy = spyOn(common, "getItemResourcesFiles").and.resolveTo([
        {
          name: "webtoolService.json",
        } as any,
      ]);

      const serviceUrl = "http://localname/GPServer";

      const blobToJsonSpy = spyOn(common, "blobToJson").and.resolveTo({
        serviceUrl,
      });

      const templateDictionary = {
        portalUrls: {
          notebooks: {
            https: ["notebookservice"],
          },
        },
      };

      const id = "bc3";

      await WebToolProcessor.createItemFromTemplate(
        {
          id,
          type: "Geoprocessing Service",
          item: {
            typeKeywords: ["Web Tool"],
            thumbnail: "thumb",
          },
          data: {
            notebookId: "123",
            name: "NotebookName",
          },
          itemId: id,
        } as any,
        templateDictionary,
        MOCK_USER_SESSION,
        createCb2(),
      );

      expect(requestSpy.calls.count()).toBe(1);
      expect(updateItemExtendedSpy.calls.count()).toBe(1);
      expect(removeItemSpy.calls.count()).toBe(1);
      expect(getItemResourcesFilesSpy.calls.count()).toBe(1);
      expect(blobToJsonSpy.calls.count()).toBe(1);
      expect(templateDictionary[id].url).toBe(serviceUrl);
    });

    it("handles cancel during updateItemExtended with failure to remove item", async () => {
      const createCb2 = () => {
        let calls = 0;
        return () => {
          calls = calls + 1;
          return calls < 3;
        };
      };
      const requestSpy = spyOn(common, "request").and.resolveTo({
        itemId: "newgs0123456789",
      });
      const updateItemExtendedSpy = spyOn(common, "updateItemExtended").and.resolveTo(
        mockAGO.get200Success("newgs0123456789"),
      );
      const removeItemSpy = spyOn(common, "removeItem").and.rejectWith("error");

      const getItemResourcesFilesSpy = spyOn(common, "getItemResourcesFiles").and.resolveTo([
        {
          name: "webtoolService.json",
        } as any,
      ]);

      const serviceUrl = "http://localname/GPServer";

      const blobToJsonSpy = spyOn(common, "blobToJson").and.resolveTo({
        serviceUrl,
      });

      await WebToolProcessor.createItemFromTemplate(
        {
          id: "bc3",
          type: "Geoprocessing Service",
          item: {
            typeKeywords: ["Web Tool"],
            thumbnail: "thumb",
          },
          data: {
            notebookId: "123",
            name: "NotebookName",
          },
        } as any,
        {
          portalUrls: {
            notebooks: {
              https: ["notebookservice"],
            },
          },
        },
        MOCK_USER_SESSION,
        createCb2(),
      );

      expect(requestSpy.calls.count()).toBe(1);
      expect(updateItemExtendedSpy.calls.count()).toBe(1);
      expect(removeItemSpy.calls.count()).toBe(1);
      expect(getItemResourcesFilesSpy.calls.count()).toBe(1);
      expect(blobToJsonSpy.calls.count()).toBe(1);
    });

    it("handles reject during updateItemExtended and removes item", async () => {
      const createCb2 = () => {
        let calls = 0;
        return () => {
          calls = calls + 1;
          return calls < 3;
        };
      };
      const requestSpy = spyOn(common, "request").and.resolveTo({
        itemId: "newgs0123456789",
      });
      const updateItemExtendedSpy = spyOn(common, "updateItemExtended").and.rejectWith("error");
      const removeItemSpy = spyOn(common, "removeItem").and.resolveTo(mockAGO.get200Success("3ef"));

      const getItemResourcesFilesSpy = spyOn(common, "getItemResourcesFiles").and.resolveTo([
        {
          name: "webtoolService.json",
        } as any,
      ]);

      const serviceUrl = "http://localname/GPServer";

      const blobToJsonSpy = spyOn(common, "blobToJson").and.resolveTo({
        serviceUrl,
      });

      await WebToolProcessor.createItemFromTemplate(
        {
          id: "bc3",
          type: "Geoprocessing Service",
          item: {
            typeKeywords: ["Web Tool"],
            thumbnail: "thumb",
          },
          data: {
            notebookId: "123",
            name: "NotebookName",
          },
        } as any,
        {
          portalUrls: {
            notebooks: {
              https: ["notebookservice"],
            },
          },
        },
        MOCK_USER_SESSION,
        createCb2(),
      );

      expect(requestSpy.calls.count()).toBe(1);
      expect(updateItemExtendedSpy.calls.count()).toBe(1);
      expect(removeItemSpy.calls.count()).toBe(1);
      expect(getItemResourcesFilesSpy.calls.count()).toBe(1);
      expect(blobToJsonSpy.calls.count()).toBe(1);
    });

    it("handles reject during updateItemExtended and reject during remove item", async () => {
      const createCb2 = () => {
        let calls = 0;
        return () => {
          calls = calls + 1;
          return calls < 3;
        };
      };
      const requestSpy = spyOn(common, "request").and.resolveTo({
        itemId: "newgs0123456789",
      });
      const updateItemExtendedSpy = spyOn(common, "updateItemExtended").and.rejectWith("error");
      const removeItemSpy = spyOn(common, "removeItem").and.rejectWith("error");

      const getItemResourcesFilesSpy = spyOn(common, "getItemResourcesFiles").and.resolveTo([
        {
          name: "webtoolService.json",
        } as any,
      ]);

      const serviceUrl = "http://localname/GPServer";

      const blobToJsonSpy = spyOn(common, "blobToJson").and.resolveTo({
        serviceUrl,
      });

      await WebToolProcessor.createItemFromTemplate(
        {
          id: "bc3",
          type: "Geoprocessing Service",
          item: {
            typeKeywords: ["Web Tool"],
            thumbnail: "thumb",
          },
          data: {
            notebookId: "123",
            name: "NotebookName",
          },
        } as any,
        {
          portalUrls: {
            notebooks: {
              https: ["notebookservice"],
            },
          },
        },
        MOCK_USER_SESSION,
        createCb2(),
      );

      expect(requestSpy.calls.count()).toBe(1);
      expect(updateItemExtendedSpy.calls.count()).toBe(1);
      expect(removeItemSpy.calls.count()).toBe(1);
      expect(getItemResourcesFilesSpy.calls.count()).toBe(1);
      expect(blobToJsonSpy.calls.count()).toBe(1);
    });

    it("getItemBase", async () => {
      const createCb2 = () => {
        let calls = 0;
        return () => {
          calls = calls + 1;
          return calls < 4;
        };
      };
      const requestSpy = spyOn(common, "request").and.resolveTo({
        itemId: "newgs0123456789",
      });
      const updateItemExtendedSpy = spyOn(common, "updateItemExtended").and.resolveTo(
        mockAGO.get200Success("newgs0123456789"),
      );
      const getItemBaseSpy = spyOn(common, "getItemBase").and.rejectWith("error");
      const removeItemSpy = spyOn(common, "removeItem").and.resolveTo(mockAGO.get200Success("3ef"));

      const getItemResourcesFilesSpy = spyOn(common, "getItemResourcesFiles").and.resolveTo([
        {
          name: "webtoolService.json",
        } as any,
      ]);

      const serviceUrl = "http://localname/GPServer";

      const blobToJsonSpy = spyOn(common, "blobToJson").and.resolveTo({
        serviceUrl,
      });

      await WebToolProcessor.createItemFromTemplate(
        {
          id: "bc3",
          type: "Geoprocessing Service",
          item: {
            typeKeywords: ["Web Tool"],
            thumbnail: "thumb",
          },
          data: {
            notebookId: "123",
            name: "NotebookName",
          },
        } as any,
        {
          portalUrls: {
            notebooks: {
              https: ["notebookservice"],
            },
          },
        },
        MOCK_USER_SESSION,
        createCb2(),
      );

      expect(requestSpy.calls.count()).toBe(1);
      expect(updateItemExtendedSpy.calls.count()).toBe(1);
      expect(getItemBaseSpy.calls.count()).toBe(1);
      expect(removeItemSpy.calls.count()).toBe(1);
      expect(getItemResourcesFilesSpy.calls.count()).toBe(1);
      expect(blobToJsonSpy.calls.count()).toBe(1);
    });

    it("getItemBase removeItem can handle reject", async () => {
      const createCb2 = () => {
        let calls = 0;
        return () => {
          calls = calls + 1;
          return calls < 4;
        };
      };
      const requestSpy = spyOn(common, "request").and.resolveTo({
        itemId: "newgs0123456789",
      });
      const updateItemExtendedSpy = spyOn(common, "updateItemExtended").and.resolveTo(
        mockAGO.get200Success("newgs0123456789"),
      );
      const getItemBaseSpy = spyOn(common, "getItemBase").and.rejectWith("error");
      const removeItemSpy = spyOn(common, "removeItem").and.rejectWith("error");

      const getItemResourcesFilesSpy = spyOn(common, "getItemResourcesFiles").and.resolveTo([{} as any]);

      await WebToolProcessor.createItemFromTemplate(
        {
          id: "bc3",
          type: "Geoprocessing Service",
          item: {
            typeKeywords: ["Web Tool"],
            thumbnail: "thumb",
          },
          data: {
            notebookId: "123",
            name: "NotebookName",
          },
        } as any,
        {
          portalUrls: {
            notebooks: {
              https: ["notebookservice"],
            },
          },
        },
        MOCK_USER_SESSION,
        createCb2(),
      );

      expect(requestSpy.calls.count()).toBe(1);
      expect(updateItemExtendedSpy.calls.count()).toBe(1);
      expect(getItemBaseSpy.calls.count()).toBe(1);
      expect(removeItemSpy.calls.count()).toBe(1);
      expect(getItemResourcesFilesSpy.calls.count()).toBe(1);
    });

    it("can handle failure to create Web Tool Geoprocessing Service", async () => {
      const requestSpy = spyOn(common, "request").and.rejectWith("error");

      await WebToolProcessor.createItemFromTemplate(
        {
          id: "bc3",
          type: "Geoprocessing Service",
          item: {
            typeKeywords: ["Web Tool"],
            thumbnail: "thumb",
          },
          data: {
            notebookId: "123",
            name: "NotebookName",
          },
        } as any,
        {
          portalUrls: {
            notebooks: {
              https: ["notebookservice"],
            },
          },
        },
        MOCK_USER_SESSION,
        cb,
      );

      expect(requestSpy.calls.count()).toBe(1);
    });
  });

  describe("createWebTool", () => {
    it("should reject if missing notebooks url", async () => {
      return WebToolProcessor.createWebTool(
        {
          id: "bc3",
          type: "Geoprocessing Service",
          item: { typeKeywords: ["Web Tool"] },
        } as any,
        {},
        MOCK_USER_SESSION,
      ).then(
        () => fail(),
        (e) => expect(e).toBeUndefined(),
      );
    });

    it("should reject if missing portalUrls", async () => {
      return WebToolProcessor.createWebTool(
        {
          id: "bc3",
          type: "Geoprocessing Service",
          item: { typeKeywords: ["Web Tool"] },
        } as any,
        {},
        MOCK_USER_SESSION,
      ).then(
        () => fail(),
        (e) => expect(e).toBeUndefined(),
      );
    });
  });

  describe("getNotebookServerCreateServiceURL", () => {
    it("should fetch servers for Enterprise", async () => {
      const notebookBaseUrl = "https://RQALnxBI01NB.esri.com/gis";
      const getEnterpriseServersSpy = spyOn(common, "getEnterpriseServers").and.resolveTo([
        {
          "id": "e0d0rP32Fai4ToC3",
          "name": "RQALnxBI01Sv.esri.com:6443",
          "adminUrl": "https://RQALnxBI01Sv.esri.com:6443/arcgis",
          "url": "https://RQALnxBI01Sv.esri.com/gis",
          "isHosted": true,
          "serverType": "ArcGIS",
          "serverRole": "HOSTING_SERVER",
          "serverFunction": "KnowledgeServer,WorkflowManager"
        },
        {
          "id": "U5yshUHhJkWINozX",
          "name": "RQALnxBI01NB.esri.com:11443",
          "adminUrl": "https://RQALnxBI01NB.esri.com:11443/arcgis",
          "url": notebookBaseUrl,
          "isHosted": false,
          "serverType": "ARCGIS_NOTEBOOK_SERVER",
          "serverRole": "FEDERATED_SERVER",
          "serverFunction": "NotebookServer"
        }
      ]);

      return WebToolProcessor.getNotebookServerCreateServiceURL(
        "https://gisserver.domain.com/server",
        MOCK_USER_SESSION,
        {
          isPortal: true
        }
      ).then(
        (url) => {
          expect(getEnterpriseServersSpy.calls.count()).toBe(1);
          expect(url.startsWith(
            `${notebookBaseUrl}/admin/services/createService?f=json&request.preventCache=`
          )).toBe(true);
        },
        () => fail(),
      );
    });


    it("should handle missing Enterprise server", async () => {
      const getEnterpriseServersSpy = spyOn(common, "getEnterpriseServers").and.resolveTo([
        {
          "id": "e0d0rP32Fai4ToC3",
          "name": "RQALnxBI01Sv.esri.com:6443",
          "adminUrl": "https://RQALnxBI01Sv.esri.com:6443/arcgis",
          "url": "https://RQALnxBI01Sv.esri.com/gis",
          "isHosted": true,
          "serverType": "ArcGIS",
          "serverRole": "HOSTING_SERVER",
          "serverFunction": "KnowledgeServer,WorkflowManager"
        }
      ]);

      return WebToolProcessor.getNotebookServerCreateServiceURL(
        "https://gisserver.domain.com/server",
        MOCK_USER_SESSION,
        {
          isPortal: true
        }
      ).then(
        (url) => {
          expect(getEnterpriseServersSpy.calls.count()).toBe(1);
          expect(url).toBe("");
        },
        () => fail(),
      );
    });

    it("should handle missing portalUrls", async () => {
      return WebToolProcessor.getNotebookServerCreateServiceURL(
        "https://gisserver.domain.com/server",
        MOCK_USER_SESSION,
        {}
      ).then(
        (url) => {
          expect(url).toBe("");
        },
        () => fail(),
      );
    });

  });
});
