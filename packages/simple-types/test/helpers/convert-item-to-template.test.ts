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
import * as fetchMock from "fetch-mock";
import * as formHelpers from "../../../form/src/formUtils";
import * as mockItems from "../../../common/test/mocks/agolItems";
import * as simpleTypeHelpers from "../../src/helpers/convert-item-to-template";
import * as simpleTypes from "../../src/simple-types";
import * as staticRelatedItemsMocks from "../../../common/test/mocks/staticRelatedItemsMocks";
import * as templates from "../../../common/test/mocks/templates";
import * as utils from "../../../common/test/mocks/utils";
import * as zipHelpers from "../../../common/test/mocks/zipHelpers";

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000; // default is 5000 ms

const noResourcesResponse: any = {
  total: 0,
  start: 1,
  num: 0,
  nextStart: -1,
  resources: []
};

let MOCK_USER_SESSION: common.UserSession;

beforeEach(() => {
  MOCK_USER_SESSION = utils.createRuntimeMockUserSession();
});

afterEach(() => {
  fetchMock.restore();
});

// ------------------------------------------------------------------------------------------------------------------ //

describe("simpleTypeConvertItemToTemplate", () => {

  describe("dashboard", () => {
    it("should handle dashboard et al. item types", done => {
      const solutionItemId = "sln1234567890";
      const itemTemplate: common.IItemTemplate = templates.getItemTemplateSkeleton();
      itemTemplate.itemId = "dsh1234567890";
      itemTemplate.item = mockItems.getAGOLItem("Dashboard", undefined);
      itemTemplate.item.thumbnail = null;

      const expectedTemplate: any = {
        itemId: "dsh1234567890",
        type: "Dashboard",
        item: {
          id: "{{dsh1234567890.itemId}}",
          type: "Dashboard",
          accessInformation: "Esri, Inc.",
          categories: [],
          contentStatus: null,
          culture: "en-us",
          description: "Description of an AGOL item",
          extent: [],
          spatialReference: undefined,
          licenseInfo: null,
          name: "Name of an AGOL item",
          origUrl: undefined,
          properties: null,
          snippet: "Snippet of an AGOL item",
          tags: ["test"],
          thumbnail: null,
          title: "An AGOL item",
          typeKeywords: ["JavaScript"],
          url: "",
          created: 1520968147000,
          modified: 1522178539000
        },
        data: ["abc", "def", "ghi"],
        resources: [],
        dependencies: [],
        relatedItems: [],
        groups: [],
        properties: {},
        estimatedDeploymentCostFactor: 2
      };

      fetchMock
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/" +
            itemTemplate.itemId +
            "/data",
          ["abc", "def", "ghi"]
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/" +
            itemTemplate.itemId +
            "/resources",
          noResourcesResponse
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/" +
            itemTemplate.itemId +
            "/info/metadata/metadata.xml",
          mockItems.get400Failure()
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/users/casey/items/sln1234567890/addResources",
          utils.getSuccessResponse()
        );
      staticRelatedItemsMocks.fetchMockRelatedItems("dsh1234567890", {
        total: 0,
        relatedItems: []
      });

      simpleTypes
        .convertItemToTemplate(
          itemTemplate.item,
          MOCK_USER_SESSION,
          MOCK_USER_SESSION,
          {}
        )
        .then(newItemTemplate => {
          delete (newItemTemplate as any).key; // key is randomly generated, and so is not testable
          expect(newItemTemplate).toEqual(expectedTemplate);
          done();
        }, done.fail);
    });
  });

  describe("data pipeline", () => {
    it("should handle data pipeline item type", done => {
      const solutionItemId = "sln1234567890";
      const itemTemplate: common.IItemTemplate = templates.getItemTemplateSkeleton();
      itemTemplate.itemId = "dpl1234567890";
      itemTemplate.item = mockItems.getAGOLItem("Data Pipeline", undefined, itemTemplate.itemId);
      itemTemplate.item.thumbnail = null;

      const expectedTemplate: any = {
        itemId: "dpl1234567890",
        type: "Data Pipeline",
        item: {
          id: "{{dpl1234567890.itemId}}",
          type: "Data Pipeline",
          accessInformation: "Esri, Inc.",
          categories: [],
          contentStatus: null,
          culture: "en-us",
          description: "Description of an AGOL item",
          extent: [],
          spatialReference: undefined,
          licenseInfo: null,
          name: "Name of an AGOL item",
          origUrl: undefined,
          properties: null,
          snippet: "Snippet of an AGOL item",
          tags: ["test"],
          thumbnail: null,
          title: "An AGOL item",
          typeKeywords: ["JavaScript"],
          url: "",
          created: 1520968147000,
          modified: 1522178539000
        },
        data: ["abc", "def", "ghi"],
        resources: [],
        dependencies: [],
        relatedItems: [],
        groups: [],
        properties: {},
        estimatedDeploymentCostFactor: 2
      };

      fetchMock
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/" +
            itemTemplate.itemId +
            "/data",
          ["abc", "def", "ghi"]
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/" +
            itemTemplate.itemId +
            "/resources",
          noResourcesResponse
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/" +
            itemTemplate.itemId +
            "/info/metadata/metadata.xml",
          mockItems.get400Failure()
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/users/casey/items/sln1234567890/addResources",
          utils.getSuccessResponse()
        );
      staticRelatedItemsMocks.fetchMockRelatedItems("dpl1234567890", {
        total: 0,
        relatedItems: []
      });

      simpleTypes
        .convertItemToTemplate(
          itemTemplate.item,
          MOCK_USER_SESSION,
          MOCK_USER_SESSION,
          {}
        )
        .then(newItemTemplate => {
          delete (newItemTemplate as any).key; // key is randomly generated, and so is not testable
          expect(newItemTemplate).toEqual(expectedTemplate);
          done();
        }, done.fail);
    });

    describe("form", () => {
      let solutionItemId: string;
      let itemTemplate: common.IItemTemplate;
      let expectedTemplate: any;

      beforeEach(async () => {
        solutionItemId = "sln1234567890";
        itemTemplate = templates.getItemTemplateSkeleton();
        itemTemplate.itemId = "frm1234567890";
        itemTemplate.item = mockItems.getAGOLItem("Form", undefined);
        itemTemplate.item.thumbnail = null;

        expectedTemplate = {
          itemId: "frm1234567890",
          type: "Form",
          item: {
            id: "{{frm1234567890.itemId}}",
            type: "Form",
            accessInformation: "Esri, Inc.",
            categories: [],
            contentStatus: null,
            culture: "en-us",
            description: "Description of an AGOL item",
            extent: [],
            spatialReference: undefined,
            licenseInfo: null,
            name: null,
            origUrl: undefined,
            properties: null,
            snippet: "Snippet of an AGOL item",
            tags: ["test"],
            thumbnail: null,
            title: "An AGOL item",
            typeKeywords: ["JavaScript"],
            url: "",
            created: 1520968147000,
            modified: 1522178539000
          },
          data: await zipHelpers.getSampleFormZipFile("frm1234567890", "frm1234567890.zip"),
          resources: [],
          relatedItems: [
            {
              relationshipType: "Survey2Data",
              relatedItemIds: ["srv1234567890", "abc1234567890"]
            },
            {
              relationshipType: "Survey2Service",
              relatedItemIds: ["srv1234567890"]
            }
          ],
          dependencies: ["srv1234567890", "abc1234567890"],
          groups: [],
          properties: {},
          estimatedDeploymentCostFactor: 2
        };

        fetchMock
          .post(
            utils.PORTAL_SUBSET.restUrl +
              "/content/items/" +
              itemTemplate.itemId +
              "/data",
            ["abc", "def", "ghi"]
          )
          .post(
            utils.PORTAL_SUBSET.restUrl +
              "/content/items/" +
              itemTemplate.itemId +
              "/resources",
            noResourcesResponse
          )
          .post(
            utils.PORTAL_SUBSET.restUrl +
              "/content/items/" +
              itemTemplate.itemId +
              "/info/metadata/metadata.xml",
            mockItems.get400Failure()
          )
          .post(
            utils.PORTAL_SUBSET.restUrl +
              "/content/users/" +
              MOCK_USER_SESSION.username +
              "/items/" +
              solutionItemId +
              "/addResources",
            {
              success: true,
              itemId: itemTemplate.itemId,
              owner: MOCK_USER_SESSION.username,
              folder: null
            }
          );
        staticRelatedItemsMocks.fetchMockRelatedItems(
          itemTemplate.itemId,
          { total: 0, relatedItems: [] },
          ["Survey2Data", "Survey2Service"]
        );
        fetchMock.get(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/" +
            itemTemplate.itemId +
            "/relatedItems?f=json&direction=forward&relationshipType=Survey2Data&token=fake-token",
          {
            total: 2,
            relatedItems: [
              {
                id: "srv1234567890"
              },
              {
                id: "abc1234567890"
              }
            ]
          }
        );
        fetchMock.get(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/" +
            itemTemplate.itemId +
            "/relatedItems?f=json&direction=forward&relationshipType=Survey2Service&token=fake-token",
          {
            total: 1,
            relatedItems: [
              {
                id: "srv1234567890"
              }
            ]
          }
        );
      });

      it("should handle form item type with default filename for falsy item name", async () => {
        const formId = "frm1234567890";
        itemTemplate.item.name = null;

        spyOn(common, "getItemRelatedItemsInSameDirection").and.resolveTo([
          { relationshipType: "Survey2Data", relatedItemIds: ["srv1234567890", "abc1234567890"] },
          { relationshipType: "Survey2Service", relatedItemIds: ["srv1234567890"] }
        ] as common.IRelatedItems[]);
        spyOn(common, "getItemDataAsFile")
          .and.resolveTo(await zipHelpers.getSampleFormZipFile(formId, "frm1234567890.zip"));
        spyOn(formHelpers, "templatizeFormData").and.callFake((zipObject: any) => Promise.resolve(zipObject));

        const template = await simpleTypes.convertItemToTemplate(
          itemTemplate.item,
          MOCK_USER_SESSION,
          MOCK_USER_SESSION,
          {}
        );

        delete (template as any).key; // key is randomly generated, and so is not testable
        expect(template).toEqual(expectedTemplate);
      });

      it('should handle form item type with default filename for "undefined" string literal item name', async () => {
        const formId = "frm1234567890";
        itemTemplate.item.name = "undefined";

        spyOn(common, "getItemRelatedItemsInSameDirection").and.resolveTo([
          { relationshipType: "Survey2Data", relatedItemIds: ["srv1234567890", "abc1234567890"] },
          { relationshipType: "Survey2Service", relatedItemIds: ["srv1234567890"] }
        ] as common.IRelatedItems[]);
        spyOn(common, "getItemDataAsFile")
          .and.resolveTo(await zipHelpers.getSampleFormZipFile(formId, "frm1234567890.zip"));
        spyOn(formHelpers, "templatizeFormData").and.callFake((zipObject: any) => Promise.resolve(zipObject));

        const template = await simpleTypes.convertItemToTemplate(
          itemTemplate.item,
          MOCK_USER_SESSION,
          MOCK_USER_SESSION,
          {}
        );

        delete (template as any).key; // key is randomly generated, and so is not testable
        expectedTemplate.item.name = "undefined";
        expect(template).toEqual(expectedTemplate);
      });

      it("should handle an Enterprise portal", async () => {
        let MOCK_USER_ENTERPRISE_SESSION: common.UserSession = utils.createRuntimeMockUserSession(
          undefined, undefined, true
        );

        const formId = "frm1234567890";
        itemTemplate.item.name = "undefined";

        spyOn(common, "getItemRelatedItemsInSameDirection").and.resolveTo([
          { relationshipType: "Survey2Data", relatedItemIds: ["srv1234567890", "abc1234567890"] },
          { relationshipType: "Survey2Service", relatedItemIds: ["srv1234567890"] }
        ] as common.IRelatedItems[]);
        spyOn(common, "getItemDataAsFile")
          .and.resolveTo(await zipHelpers.getSampleFormZipFile(formId, "frm1234567890.zip"));
        spyOn(formHelpers, "templatizeFormData").and.callFake((zipObject: any) => Promise.resolve(zipObject));

        const template = await simpleTypes.convertItemToTemplate(
          itemTemplate.item,
          MOCK_USER_ENTERPRISE_SESSION,
          MOCK_USER_ENTERPRISE_SESSION,
          {}
        );

        delete (template as any).key; // key is randomly generated, and so is not testable
        expectedTemplate.item.name = "undefined";
        expect(template).toEqual(expectedTemplate);
      });

    });

    describe("_getDataPipelineSourcesAndSinks", () => {
      const itemData = {
        "inputs": [{
          "id": "1878f651b131",
          "type": "FeatureServiceSource",
          "parameters": {
            "layer": {
              "value": {
                "itemId": "fe713ca8996a4db988b8b4f2e5949616",
                "layerId": 0,
                "uiTitle": "Requests"
              }
            }
          }
        }],
        "tools": [{
          "id": "1878f811c692",
          "type": "FilterByAttributeTool",
          "parameters": {
            "uiLanguage": {
              "value": "arcade"
            },
            "arcadeExpression": {
              "value": "$record.reqcategory == 'Blight'"
            },
            "input": {
              "fromId": "1878f651b131"
            }
          }
        }, {
          "id": "1878f81da253",
          "type": "RemoveDuplicatesTool",
          "parameters": {
            "keyFields": {
              "value": ["OBJECTID"]
            },
            "input": {
              "fromId": "1878f811c692"
            }
          }
        }],
        "outputs": [{
          "id": "1878f828e1c4",
          "type": "FeatureServiceSink",
          "parameters": {
            "outputMethod": {
              "value": "replace"
            },
            "layer": {
              "value": {
                "itemId": "5fe495577b434f0e865d3b288b9fcb73",
                "layerId": 0,
                "uiTitle": "New Layer"
              }
            },
            "replaceMethod": {
              "value": "truncateAppend"
            },
            "geometryField": {
              "value": "shape"
            },
            "input": {
              "fromId": "1878f81da253"
            }
          }
        }]
      };

      it("should extract source and sink feature layer ids", () => {
        const sourcesAndSinks = simpleTypeHelpers._getDataPipelineSourcesAndSinks(itemData);
        expect(sourcesAndSinks).toEqual(["fe713ca8996a4db988b8b4f2e5949616", "5fe495577b434f0e865d3b288b9fcb73"]);
      });

      it("should handle absence of sources", () => {
        const itemDataPartial = {
          outputs: itemData.outputs,
          tools: itemData.tools,
          misc: "something else"
        }
        const sourcesAndSinks = simpleTypeHelpers._getDataPipelineSourcesAndSinks(itemDataPartial);
        expect(sourcesAndSinks).toEqual(["5fe495577b434f0e865d3b288b9fcb73"]);
      });

      it("should handle absence of sinks", () => {
        const itemDataPartial = {
          misc: "something else",
          inputs: itemData.inputs,
          tools: itemData.tools
        }
        const sourcesAndSinks = simpleTypeHelpers._getDataPipelineSourcesAndSinks(itemDataPartial);
        expect(sourcesAndSinks).toEqual(["fe713ca8996a4db988b8b4f2e5949616"]);
      });

      it("should handle absence of sources and sinks", () => {
        const itemDataPartial = {
          misc: "something else",
          tools: itemData.tools,
          json: {
            a: "a",
            b: 2
          }
        }
        const sourcesAndSinks = simpleTypeHelpers._getDataPipelineSourcesAndSinks(itemDataPartial);
        expect(sourcesAndSinks).toEqual([]);
      });

      it("should handle absence of item data", () => {
        const sourcesAndSinks = simpleTypeHelpers._getDataPipelineSourcesAndSinks(undefined);
        expect(sourcesAndSinks).toEqual([]);
      });
    });
  });

  describe("notebook", () => {
    it("should handle python notebook", done => {
      const solutionItemId = "sln1234567890";
      const item = {
        id: "abc0cab401af4828a25cc6eaeb59fb69",
        type: "Notebook",
        title: "Simple Notebook"
      };

      const dataResponse: any = mockItems.getAGOLItemData("Notebook");
      const id = "3b927de78a784a5aa3981469d85cf45d";

      fetchMock
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/abc0cab401af4828a25cc6eaeb59fb69/resources",
          noResourcesResponse
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/abc0cab401af4828a25cc6eaeb59fb69/info/metadata/metadata.xml",
          mockItems.get500Failure()
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/abc0cab401af4828a25cc6eaeb59fb69/data",
          dataResponse
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/users/casey/items/sln1234567890/addResources",
          utils.getSuccessResponse()
        )
        .get(
          utils.PORTAL_SUBSET.restUrl +
          `/content/items/${id}?f=json&token=fake-token`,
          utils.getSuccessResponse({ id })
        )
        .get(
          utils.PORTAL_SUBSET.restUrl +
          `/community/groups/${id}?f=json&token=fake-token`,
          utils.getSuccessResponse({ id })
        );

      staticRelatedItemsMocks.fetchMockRelatedItems(
        "abc0cab401af4828a25cc6eaeb59fb69",
        { total: 0, relatedItems: [] }
      );

      simpleTypes
        .convertItemToTemplate(item, MOCK_USER_SESSION, MOCK_USER_SESSION, {})
        .then(newItemTemplate => {
          expect(newItemTemplate.data).toEqual(
            templates.getItemTemplateData("Notebook")
          );
          done();
        }, done.fail);
    });
  });

  describe("oic", () => {
    it("should handle OIC (Oriented Imagery Catalog)", done => {
      const item: any = mockItems.getAGOLItem("Oriented Imagery Catalog", undefined);
      const data: any = mockItems.getAGOLItemData("Oriented Imagery Catalog");
      const service: any = mockItems.getAGOLService();

      fetchMock
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/items/oic1234567890/data",
          data
        )
        .post(
          "https://services.arcgis.com/64491f8c348a51cf/arcgis/rest/services/OIC_FL_002/FeatureServer/0",
          service
        );
      staticRelatedItemsMocks.fetchMockRelatedItems("oic1234567890", {
        total: 0,
        relatedItems: []
      });

      simpleTypes
        .convertItemToTemplate(item, MOCK_USER_SESSION, MOCK_USER_SESSION, {})
        .then(newItemTemplate => {
          const expectedTemplate = templates.getItemTemplate(
            "Oriented Imagery Catalog",
            ["svc1234567890"]
          );
          expectedTemplate.item.extent = [];
          expectedTemplate.item.thumbnail = "thumbnail/ago_downloaded.png";
          newItemTemplate.key = expectedTemplate.key;

          expect(newItemTemplate).toEqual(expectedTemplate);
          done();
        }, done.fail);
    });
  });

  describe("quick capture", () => {
    it("should handle quick capture project", done => {
      const solutionItemId = "ee67658b2a98450cba051fd001463df0";
      const resources: any = {
        total: 1,
        start: 1,
        num: 1,
        nextStart: -1,
        resources: [
          {
            resource: "qc.project.json",
            created: 1579127879000,
            size: 29882,
            access: "inherit",
            type: "application/json"
          }
        ]
      };

      fetchMock
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/qck1234567890/data",
          utils.getSampleQCJsonData()
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/qck1234567890/resources",
          resources
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/qck1234567890/info/metadata/metadata.xml",
          mockItems.get500Failure()
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/qck1234567890/info/thumbnail/ago_downloaded.png",
          utils.getSampleImageAsBlob(),
          { sendAsJson: false }
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/qck1234567890/resources/qc.project.json",
          utils.getSampleQCProjectJsonFile(),
          { sendAsJson: false }
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/users/casey/items/" +
            solutionItemId +
            "/addResources",
          { success: true, id: solutionItemId }
        );
      staticRelatedItemsMocks.fetchMockRelatedItems("qck1234567890", {
        total: 0,
        relatedItems: []
      });

      const itemInfo: common.IItemTemplate = mockItems.getAGOLItem(
        "QuickCapture Project",
        undefined
      );

      const expected: common.IItemTemplate = {
        itemId: "qck1234567890",
        key: "vx3ubyx3",
        data: utils.getSampleQCJsonData(),
        resources: [],
        dependencies: ["map1234567890"],
        relatedItems: [],
        groups: [],
        type: "QuickCapture Project",
        item: {
          id: "{{qck1234567890.itemId}}",
          type: "QuickCapture Project",
          accessInformation: "Esri, Inc.",
          categories: [],
          contentStatus: null,
          culture: "en-us",
          description: "Description of an AGOL item",
          extent: [],
          spatialReference: undefined,
          licenseInfo: null,
          name: "Name of an AGOL item",
          origUrl: undefined,
          properties: null,
          snippet: "Snippet of an AGOL item",
          tags: ["test"],
          thumbnail: "thumbnail/ago_downloaded.png",
          title: "An AGOL item",
          typeKeywords: ["JavaScript"],
          url: "",
          created: 1520968147000,
          modified: 1522178539000
        },
        properties: {},
        estimatedDeploymentCostFactor: 2
      };

      simpleTypes
        .convertItemToTemplate(itemInfo, MOCK_USER_SESSION, MOCK_USER_SESSION, {})
        .then(actual => {
          actual.key = expected.key;
          expect(actual).toEqual(expected);
          done();
        }, done.fail);
    });


    it("should handle quick capture project without a data section", done => {
      const solutionItemId = "ee67658b2a98450cba051fd001463df0";
      const resources: any = {
        total: 1,
        start: 1,
        num: 1,
        nextStart: -1,
        resources: [
          {
            resource: "qc.project.json",
            created: 1579127879000,
            size: 29882,
            access: "inherit",
            type: "application/json"
          }
        ]
      };

      fetchMock
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/qck1234567890/data",
          mockItems.get400Failure()
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/qck1234567890/resources",
          resources
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/qck1234567890/info/metadata/metadata.xml",
          mockItems.get500Failure()
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/qck1234567890/info/thumbnail/ago_downloaded.png",
          utils.getSampleImageAsBlob(),
          { sendAsJson: false }
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/qck1234567890/resources/qc.project.json",
          utils.getSampleQCProjectJsonFile(),
          { sendAsJson: false }
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/users/casey/items/" +
            solutionItemId +
            "/addResources",
          { success: true, id: solutionItemId }
        );
      staticRelatedItemsMocks.fetchMockRelatedItems("qck1234567890", {
        total: 0,
        relatedItems: []
      });

      const itemInfo: common.IItemTemplate = mockItems.getAGOLItem(
        "QuickCapture Project",
        undefined
      );

      const expected: common.IItemTemplate = {
        itemId: "qck1234567890",
        key: "vx3ubyx3",
        data: utils.getSampleQCJsonData(),
        resources: [],
        dependencies: ["map1234567890"],
        relatedItems: [],
        groups: [],
        type: "QuickCapture Project",
        item: {
          id: "{{qck1234567890.itemId}}",
          type: "QuickCapture Project",
          accessInformation: "Esri, Inc.",
          categories: [],
          contentStatus: null,
          culture: "en-us",
          description: "Description of an AGOL item",
          extent: [],
          spatialReference: undefined,
          licenseInfo: null,
          name: "Name of an AGOL item",
          origUrl: undefined,
          properties: null,
          snippet: "Snippet of an AGOL item",
          tags: ["test"],
          thumbnail: "thumbnail/ago_downloaded.png",
          title: "An AGOL item",
          typeKeywords: ["JavaScript"],
          url: "",
          created: 1520968147000,
          modified: 1522178539000
        },
        properties: {},
        estimatedDeploymentCostFactor: 2
      };

      simpleTypes
        .convertItemToTemplate(itemInfo, MOCK_USER_SESSION, MOCK_USER_SESSION, {})
        .then(actual => {
          actual.key = expected.key;
          expect(actual).toEqual(expected);
          done();
        }, done.fail);
    });

    it("should handle quick capture project without a basemap", done => {
      const solutionItemId = "ee67658b2a98450cba051fd001463df0";
      const resources: any = {
        total: 1,
        start: 1,
        num: 1,
        nextStart: -1,
        resources: [
          {
            resource: "qc.project.json",
            created: 1579127879000,
            size: 29882,
            access: "inherit",
            type: "application/json"
          }
        ]
      };
      const qcProjectJson = new File([utils.jsonToBlob({})],
        "qc.project.json", { type: "application/json" });

      fetchMock
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/qck1234567890/data",
          Object({
            application: {},
            name: "qc.project.json"
          })
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/qck1234567890/resources",
          resources
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/qck1234567890/info/metadata/metadata.xml",
          mockItems.get500Failure()
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/qck1234567890/info/thumbnail/ago_downloaded.png",
          utils.getSampleImageAsBlob(),
          { sendAsJson: false }
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/qck1234567890/resources/qc.project.json",
          qcProjectJson,
          { sendAsJson: false }
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/users/casey/items/" +
            solutionItemId +
            "/addResources",
          { success: true, id: solutionItemId }
        );
      staticRelatedItemsMocks.fetchMockRelatedItems("qck1234567890", {
        total: 0,
        relatedItems: []
      });

      const itemInfo: common.IItemTemplate = mockItems.getAGOLItem(
        "QuickCapture Project",
        undefined
      );

      const expected: common.IItemTemplate = {
        itemId: "qck1234567890",
        key: "vx3ubyx3",
        data: {
          application: {},
          name: "qc.project.json"
        },
        resources: [],
        dependencies: [],
        relatedItems: [],
        groups: [],
        type: "QuickCapture Project",
        item: {
          id: "{{qck1234567890.itemId}}",
          type: "QuickCapture Project",
          accessInformation: "Esri, Inc.",
          categories: [],
          contentStatus: null,
          culture: "en-us",
          description: "Description of an AGOL item",
          extent: [],
          spatialReference: undefined,
          licenseInfo: null,
          name: "Name of an AGOL item",
          origUrl: undefined,
          properties: null,
          snippet: "Snippet of an AGOL item",
          tags: ["test"],
          thumbnail: "thumbnail/ago_downloaded.png",
          title: "An AGOL item",
          typeKeywords: ["JavaScript"],
          url: "",
          created: 1520968147000,
          modified: 1522178539000
        },
        properties: {},
        estimatedDeploymentCostFactor: 2
      };

      simpleTypes
        .convertItemToTemplate(itemInfo, MOCK_USER_SESSION, MOCK_USER_SESSION, {})
        .then(actual => {
          actual.key = expected.key;
          expect(actual).toEqual(expected);
          done();
        }, done.fail);
    });
  });

  describe("vector tile service", () => {
    it("should handle vector tile service", done => {
      const solutionItemId = "sln1234567890";
      const itemTemplate: common.IItemTemplate = mockItems.getAGOLItem(
        "Vector Tile Service",
        "https://myOrg.arcgis.com/home/item.html?id=vts1234567890",
        "vts1234567890"
      );

      itemTemplate.item = {
        id: "vts1234567890",
        type: "Vector Tile Service",
        title: "VTS",
        url: "https://myOrg.arcgis.com/home/item.html?id=vts1234567890",
        created: 1520968147000,
        modified: 1522178539000
      };

      const expected = {
        itemId: "vts1234567890",
        type: "Vector Tile Service",
        key: "abcdefgh",
        item: {
          id: "{{vts1234567890.itemId}}",
          type: "Vector Tile Service",
          created: 1520968147000,
          extent: "{{solutionItemExtent}}",
          modified: 1522178539000,
          title: "VTS",
          url: "https://myOrg.arcgis.com/home/item.html?id=vts1234567890",
          accessInformation: undefined,
          categories: undefined,
          contentStatus: undefined,
          culture: undefined,
          description: undefined,
          licenseInfo: undefined,
          name: undefined,
          origUrl: undefined,
          properties: undefined,
          snippet: undefined,
          spatialReference: undefined,
          tags: undefined,
          thumbnail: undefined,
          typeKeywords: undefined
        } as any,
        data: {},
        resources: [] as any[],
        dependencies: [],
        relatedItems: [] as common.IRelatedItems[],
        groups: [] as string[],
        properties: {} as any,
        estimatedDeploymentCostFactor: 2
      };

      fetchMock
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/items/vts1234567890/resources",
          []
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/items/vts1234567890/data",
          new Blob([JSON.stringify(itemTemplate.data)], {
            type: "application/json"
          }),
          { sendAsJson: false }
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/addResources",
          utils.getSuccessResponse()
        );
      staticRelatedItemsMocks.fetchMockRelatedItems(
        "vts1234567890",
        { total: 0, relatedItems: [] }
      );

      simpleTypes
        .convertItemToTemplate(
          itemTemplate.item,
          MOCK_USER_SESSION,
          MOCK_USER_SESSION,
          {}
        )
        .then(
          actual => {
            actual.key = "abcdefgh";
            expect(actual).toEqual(expected);
            done();
          },
          e => done.fail(e)
        );
    });
  });

  describe("web mapping application", () => {
    it("should handle web mapping application", done => {
      const solutionItemId = "sln1234567890";
      const itemTemplate: common.IItemTemplate = mockItems.getAGOLItem(
        "Web Mapping Application",
        undefined
      );

      itemTemplate.item = {
        id: "abc0cab401af4828a25cc6eaeb59fb69",
        type: "Web Mapping Application",
        title: "Voting Centers",
        contentStatus: null,
        url:
          "https://myOrg.arcgis.com/home/item.html?id=abc123da3c304dd0bf46dee75ac31aae",
        created: 1520968147000,
        modified: 1522178539000
      };
      itemTemplate.itemId = "abc0cab401af4828a25cc6eaeb59fb69";
      itemTemplate.data = {
        appItemId: "myAppItemId",
        values: {
          webmap: "myMapId"
        },
        map: {
          appProxy: {
            mapItemId: "mapItemId"
          },
          itemId: "mapItemId"
        },
        folderId: "folderId"
      };
      const expected = {
        itemId: "abc0cab401af4828a25cc6eaeb59fb69",
        type: "Web Mapping Application",
        key: "abcdefgh",
        item: {
          title: "Voting Centers",
          id: "{{abc0cab401af4828a25cc6eaeb59fb69.itemId}}",
          type: "Web Mapping Application",
          accessInformation: undefined,
          categories: undefined,
          contentStatus: null,
          culture: undefined,
          description: undefined,
          extent: "{{solutionItemExtent}}",
          spatialReference: undefined,
          tags: undefined,
          thumbnail: undefined,
          typeKeywords: undefined,
          url:
            "{{portalBaseUrl}}/home/item.html?id={{abc0cab401af4828a25cc6eaeb59fb69.itemId}}",
          created: 1520968147000,
          modified: 1522178539000,
          licenseInfo: undefined,
          origUrl: undefined,
          properties: undefined,
          name: undefined,
          snippet: undefined
        } as any,
        data: {
          appItemId: "{{abc0cab401af4828a25cc6eaeb59fb69.itemId}}",
          values: {
            webmap: "{{myMapId.itemId}}"
          },
          map: {
            appProxy: {
              mapItemId: "{{mapItemId.itemId}}"
            },
            itemId: "{{mapItemId.itemId}}"
          },
          folderId: "{{folderId}}"
        },
        resources: [] as any[],
        dependencies: ["myMapId"],
        relatedItems: [] as common.IRelatedItems[],
        groups: [] as string[],
        properties: {} as any,
        estimatedDeploymentCostFactor: 2
      };

      fetchMock
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/abc0cab401af4828a25cc6eaeb59fb69/resources",
          []
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/abc0cab401af4828a25cc6eaeb59fb69/data",
          new Blob([JSON.stringify(itemTemplate.data)], {
            type: "application/json"
          }),
          { sendAsJson: false }
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/users/casey/items/sln1234567890/addResources",
          utils.getSuccessResponse()
        );
      staticRelatedItemsMocks.fetchMockRelatedItems(
        "abc0cab401af4828a25cc6eaeb59fb69",
        { total: 0, relatedItems: [] }
      );

      simpleTypes
        .convertItemToTemplate(
          itemTemplate.item,
          MOCK_USER_SESSION,
          MOCK_USER_SESSION,
          {}
        )
        .then(
          actual => {
            actual.key = "abcdefgh";
            expect(actual).toEqual(expected);
            done();
          },
          e => done.fail(e)
        );
    });

    it("should handle error on web mapping application: data section", done => {
      const solutionItemId = "sln1234567890";
      const itemTemplate: common.IItemTemplate = mockItems.getAGOLItem(
        "Web Mapping Application",
        undefined
      );

      itemTemplate.item = {
        id: "abc0cab401af4828a25cc6eaeb59fb69",
        type: "Web Mapping Application",
        title: "Voting Centers",
        url:
          "https://myOrg.arcgis.com/home/item.html?id=abc123da3c304dd0bf46dee75ac31aae",
        created: 1520968147000,
        modified: 1522178539000
      };
      itemTemplate.itemId = "abc0cab401af4828a25cc6eaeb59fb69";

      fetchMock
        .post("https://fake.com/arcgis/rest/info", {})
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/abc0cab401af4828a25cc6eaeb59fb69/resources",
          []
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/abc0cab401af4828a25cc6eaeb59fb69/data",
          mockItems.get400FailureResponse()
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/users/casey/items/sln1234567890/addResources",
          utils.getSuccessResponse()
        );
      staticRelatedItemsMocks.fetchMockRelatedItems(
        "abc0cab401af4828a25cc6eaeb59fb69",
        { total: 0, relatedItems: [] }
      );

      simpleTypes
        .convertItemToTemplate(
          itemTemplate.item,
          MOCK_USER_SESSION,
          MOCK_USER_SESSION,
          {}
        )
        .then(() => done());
    });

    it("should handle error on web mapping application: feature layer", done => {
      const solutionItemId = "sln1234567890";
      const itemTemplate: common.IItemTemplate = mockItems.getAGOLItem(
        "Web Mapping Application",
        undefined
      );

      itemTemplate.item = {
        id: "abc0cab401af4828a25cc6eaeb59fb69",
        type: "Web Mapping Application",
        title: "Voting Centers",
        url:
          "https://myOrg.arcgis.com/home/item.html?id=abc123da3c304dd0bf46dee75ac31aae",
        created: 1520968147000,
        modified: 1522178539000
      };
      itemTemplate.itemId = "abc0cab401af4828a25cc6eaeb59fb69";

      const data: any = {
        appItemId: "myAppItemId",
        values: {
          webmap: "myMapId"
        },
        map: {
          appProxy: {
            mapItemId: "mapItemId"
          },
          itemId: "mapItemId"
        },
        folderId: "folderId",
        dataSource: {
          dataSources: {
            external_123456789: {
              type: "source type",
              portalUrl: "https://fake.maps.arcgis.com/",
              itemId: "2ea59a64b34646f8972a71c7d536e4a3",
              isDynamic: false,
              label: "Point layer",
              url: "https://fake.com/arcgis/rest/services/test/FeatureServer/0"
            }
          },
          settings: {}
        }
      };
      fetchMock
        .get(
          "https://myorg.maps.arcgis.com/sharing/rest/portals/self?f=json&token=fake-token",
          utils.getPortalsSelfResponse()
        )
        .post("https://fake.com/arcgis/rest/info", {})
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/abc0cab401af4828a25cc6eaeb59fb69/resources",
          []
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/abc0cab401af4828a25cc6eaeb59fb69/data",
          data
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/users/casey/items/sln1234567890/addResources",
          utils.getSuccessResponse()
        )
        .post(
          "https://fake.com/arcgis/rest/services/test/FeatureServer/0",
          mockItems.get400FailureResponse()
        );
      staticRelatedItemsMocks.fetchMockRelatedItems(
        "abc0cab401af4828a25cc6eaeb59fb69",
        { total: 0, relatedItems: [] }
      );

      simpleTypes
        .convertItemToTemplate(
          itemTemplate.item,
          MOCK_USER_SESSION,
          MOCK_USER_SESSION,
          {}
        )
        .then(
          () => done.fail(),
          () => done()
        );
    });

    it("should handle web mapping application with missing data section and source URL", done => {
      const solutionItemId = "sln1234567890";
      // Related to issue: #56
      // To add support for simple apps such as those that we create for "Getting to Know"
      // A new app should be created in the users org but we will retain the source URL
      const itemTemplate: common.IItemTemplate = templates.getItemTemplateSkeleton();
      itemTemplate.item = mockItems.getAGOLItem(
        "Web Mapping Application",
        undefined
      );
      itemTemplate.itemId = itemTemplate.item.id;
      itemTemplate.item.thumbnail = null;

      const expectedTemplate: any = {
        itemId: "wma1234567890",
        type: "Web Mapping Application",
        item: {
          id: "{{wma1234567890.itemId}}",
          type: "Web Mapping Application",
          accessInformation: "Esri, Inc.",
          categories: [],
          contentStatus: null,
          culture: "en-us",
          description: "Description of an AGOL item",
          extent: [],
          origUrl: undefined,
          properties: null,
          spatialReference: undefined,
          licenseInfo: null,
          name: "Name of an AGOL item",
          snippet: "Snippet of an AGOL item",
          tags: ["test"],
          thumbnail: null,
          title: "An AGOL item",
          typeKeywords: ["JavaScript"],
          url:
            "http://statelocaltryit.maps.arcgis.com/apps/CrowdsourcePolling/index.html?appid=wma1234567890",
          created: 1520968147000,
          modified: 1522178539000
        },
        data: null,
        resources: [],
        dependencies: [],
        relatedItems: [],
        groups: [],
        properties: {},
        estimatedDeploymentCostFactor: 2
      };

      fetchMock
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/" +
            itemTemplate.itemId +
            "/data",
          200
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/" +
            itemTemplate.itemId +
            "/resources",
          noResourcesResponse
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/" +
            itemTemplate.itemId +
            "/info/metadata/metadata.xml",
          mockItems.get400Failure()
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/users/casey/items/" +
            solutionItemId +
            "/addResources",
          { success: true, id: solutionItemId }
        );
      staticRelatedItemsMocks.fetchMockRelatedItems("wma1234567890", {
        total: 0,
        relatedItems: []
      });

      simpleTypes
        .convertItemToTemplate(
          itemTemplate.item,
          MOCK_USER_SESSION,
          MOCK_USER_SESSION,
          {}
        )
        .then(newItemTemplate => {
          delete (newItemTemplate as any).key; // key is randomly generated, and so is not testable
          expect(newItemTemplate).toEqual(expectedTemplate);
          done();
        }, done.fail);
    });
  });

  describe("workforce", () => {
    it("should handle workforce project", done => {
      const solutionItemId = "sln1234567890";
      const item = {
        id: "abc0cab401af4828a25cc6eaeb59fb69",
        type: "Workforce Project",
        title: "Dam Inspection Assignments"
      };

      const expectedTemplateData: any = {
        workerWebMapId: "{{abc116555b16437f8435e079033128d0.itemId}}",
        dispatcherWebMapId: "{{abc26a244163430590151395821fb845.itemId}}",
        dispatchers: {
          serviceItemId: "{{abc302ec12b74d2f9f2b3cc549420086.layer0.itemId}}",
          url: "{{abc302ec12b74d2f9f2b3cc549420086.layer0.url}}"
        },
        assignments: {
          serviceItemId: "{{abc4494043c3459faabcfd0e1ab557fc.layer0.itemId}}",
          url: "{{abc4494043c3459faabcfd0e1ab557fc.layer0.url}}"
        },
        workers: {
          serviceItemId: "{{abc5dd4bdd18437f8d5ff1aa2d25fd7c.layer0.itemId}}",
          url: "{{abc5dd4bdd18437f8d5ff1aa2d25fd7c.layer0.url}}"
        },
        tracks: {
          serviceItemId: "{{abc64329e69144c59f69f3f3e0d45269.layer0.itemId}}",
          url: "{{abc64329e69144c59f69f3f3e0d45269.layer0.url}}",
          enabled: true,
          updateInterval: 300
        },
        version: "1.2.0",
        groupId: "{{abc715c2df2b466da05577776e82d044.itemId}}",
        folderId: "{{folderId}}",
        assignmentIntegrations: [
          {
            id: "default-navigator",
            prompt: "Navigate to Assignment",
            urlTemplate:
              "arcgis-navigator://?stop=${assignment.latitude},{itemID={{cad3483e025c47338d43df308c117308.itemId}}},${assignment.longitude}&stopname=${assignment.location}&callback=arcgis-workforce://&callbackprompt={itemID={{bad3483e025c47338d43df308c117308.itemId}}}://Workforce",
            assignmentTypes: [
              {
                urlTemplate:
                  "arcgis-navigator://?stop=${assignment.latitude},{itemID={{cad3483e025c47338d43df308c117308.itemId}}},${assignment.longitude}&stopname=${assignment.location}&callback=arcgis-workforce://&callbackprompt={itemID={{bad3483e025c47338d43df308c117308.itemId}}}://Workforce"
              }
            ]
          }
        ]
      };

      const dataResponse: any = mockItems.getAGOLItemData("Workforce Project");

      fetchMock
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/abc0cab401af4828a25cc6eaeb59fb69/resources",
          noResourcesResponse
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/abc0cab401af4828a25cc6eaeb59fb69/info/metadata/metadata.xml",
          mockItems.get500Failure()
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/users/casey/items/" +
            solutionItemId +
            "/addResources",
          { success: true, id: solutionItemId }
        )
        .post(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/abc0cab401af4828a25cc6eaeb59fb69/data",
          dataResponse
        )
        .get(
          utils.PORTAL_SUBSET.restUrl +
            "/community/groups/grp1234567890?f=json&token=fake-token",
          {}
        );
      staticRelatedItemsMocks.fetchMockRelatedItems(
        "abc0cab401af4828a25cc6eaeb59fb69",
        { total: 0, relatedItems: [] }
      );

      simpleTypes
        .convertItemToTemplate(item, MOCK_USER_SESSION, MOCK_USER_SESSION, {})
        .then(newItemTemplate => {
          expect(newItemTemplate.data).toEqual(expectedTemplateData);
          done();
        }, done.fail);
    });
  });
});
