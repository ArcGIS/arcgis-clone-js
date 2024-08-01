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
 * Provides tests for functions involving the creation and deployment of Workforce item types.
 */

import * as common from "@esri/solution-common";
import * as workforce from "../src/workforce";
import * as mockItems from "../../common/test/mocks/agolItems";
const fetchMock = require('fetch-mock');
import * as utils from "../../common/test/mocks/utils";

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000; // default is 5000 ms

let MOCK_USER_SESSION: common.UserSession;

beforeEach(() => {
  MOCK_USER_SESSION = utils.createRuntimeMockUserSession();
});

afterEach(() => {
  fetchMock.restore();
});

// ------------------------------------------------------------------------------------------------------------------ //

describe("Module `workforce`: manages the creation and deployment of workforce project item types", () => {
  describe("convertItemToTemplate", () => {
    it("should extract dependencies 1", async () => {
      const itemTemplate: common.IItemTemplate = mockItems.getAGOLItem("Workforce Project", undefined);
      itemTemplate.data = mockItems.getAGOLItemData("Workforce Project");

      const expectedDependencies: string[] = [
        "abc116555b16437f8435e079033128d0",
        "abc26a244163430590151395821fb845",
        "abc302ec12b74d2f9f2b3cc549420086",
        "abc4494043c3459faabcfd0e1ab557fc",
        "abc5dd4bdd18437f8d5ff1aa2d25fd7c",
        "abc64329e69144c59f69f3f3e0d45269",
        "abc715c2df2b466da05577776e82d044",
        "cad3483e025c47338d43df308c117308",
        "bad3483e025c47338d43df308c117308",
      ];

      const newItemTemplate = await workforce.convertItemToTemplate(
        itemTemplate,
        MOCK_USER_SESSION,
        MOCK_USER_SESSION,
        {},
      );
      const newDependencies: string[] = newItemTemplate.dependencies;
      expect(newDependencies.length).toEqual(expectedDependencies.length);

      expectedDependencies.forEach((d) => {
        expect(newDependencies.indexOf(d)).toBeGreaterThan(-1);
      });
    });

    it("should extract dependencies 2", async () => {
      const itemTemplate: common.IItemTemplate = mockItems.getAGOLItem("Workforce Project", undefined);
      itemTemplate.data = mockItems.getAGOLItemData("Workforce Project");

      const expectedDependencies: string[] = [
        "abc116555b16437f8435e079033128d0",
        "abc26a244163430590151395821fb845",
        "abc302ec12b74d2f9f2b3cc549420086",
        "abc4494043c3459faabcfd0e1ab557fc",
        "abc5dd4bdd18437f8d5ff1aa2d25fd7c",
        "abc64329e69144c59f69f3f3e0d45269",
        "abc715c2df2b466da05577776e82d044",
        "cad3483e025c47338d43df308c117308",
        "bad3483e025c47338d43df308c117308",
      ];

      const newItemTemplate = await workforce.convertItemToTemplate(
        itemTemplate,
        MOCK_USER_SESSION,
        MOCK_USER_SESSION,
        {},
      );
      const newDependencies: string[] = newItemTemplate.dependencies;
      expect(newDependencies.length).toEqual(expectedDependencies.length);

      expectedDependencies.forEach((d) => {
        expect(newDependencies.indexOf(d)).toBeGreaterThan(-1);
      });
    });

    it("should templatize key properties in the template", async () => {
      const itemTemplate: common.IItemTemplate = mockItems.getAGOLItem("Workforce Project", undefined);
      itemTemplate.data = mockItems.getAGOLItemData("Workforce Project");
      itemTemplate.data.assignmentIntegrations = [
        {
          id: "default-navigator",
          prompt: "Navigate to Assignment",
          urlTemplate:
            "arcgis-navigator://?stop=${assignment.latitude},${assignment.longitude}&stopname=${assignment.location}&callback=arcgis-workforce://&callbackprompt=Workforce",
        },
        {
          id: "default-collector",
          prompt: "Collect at Assignment",
          assignmentTypes: {
            "1": {
              urlTemplate:
                "arcgis-collector://?itemID=b5142b618da74f92af9e84f7459b64a8&center=${assignment.latitude},${assignment.longitude}",
            },
            "2": {
              urlTemplate:
                "arcgis-collector://?itemID=b5142b618da74f92af9e84f7459b64a8&center=${assignment.latitude},${assignment.longitude}&featureSourceURL=https://services123.arcgis.com/org1234567890/arcgis/rest/services/ProposedSiteAddress_field/FeatureServer/0&featureAttributes=%7B%22placename%22:%22${assignment.location}%22%7D",
            },
          },
        },
      ];

      itemTemplate.item = {
        id: "abc0cab401af4828a25cc6eaeb59fb69",
        type: "Workforce Project",
      };

      const expectedTemplateData: any = {
        workerWebMapId: "{{abc116555b16437f8435e079033128d0.itemId}}",
        dispatcherWebMapId: "{{abc26a244163430590151395821fb845.itemId}}",
        dispatchers: {
          serviceItemId: "{{abc302ec12b74d2f9f2b3cc549420086.layer0.itemId}}",
          url: "{{abc302ec12b74d2f9f2b3cc549420086.layer0.url}}",
        },
        assignments: {
          serviceItemId: "{{abc4494043c3459faabcfd0e1ab557fc.layer0.itemId}}",
          url: "{{abc4494043c3459faabcfd0e1ab557fc.layer0.url}}",
        },
        workers: {
          serviceItemId: "{{abc5dd4bdd18437f8d5ff1aa2d25fd7c.layer0.itemId}}",
          url: "{{abc5dd4bdd18437f8d5ff1aa2d25fd7c.layer0.url}}",
        },
        tracks: {
          serviceItemId: "{{abc64329e69144c59f69f3f3e0d45269.layer0.itemId}}",
          url: "{{abc64329e69144c59f69f3f3e0d45269.layer0.url}}",
          enabled: true,
          updateInterval: 300,
        },
        version: "1.2.0",
        groupId: "{{abc715c2df2b466da05577776e82d044.itemId}}",
        folderId: "{{folderId}}",
        assignmentIntegrations: [
          {
            id: "default-navigator",
            prompt: "Navigate to Assignment",
            urlTemplate:
              "arcgis-navigator://?stop=${assignment.latitude},${assignment.longitude}&stopname=${assignment.location}&callback=arcgis-workforce://&callbackprompt=Workforce",
          },
          {
            id: "default-collector",
            prompt: "Collect at Assignment",
            assignmentTypes: {
              "1": {
                urlTemplate:
                  "arcgis-collector://?itemID={{b5142b618da74f92af9e84f7459b64a8.itemId}}&center=${assignment.latitude},${assignment.longitude}",
              },
              "2": {
                urlTemplate:
                  "arcgis-collector://?itemID={{b5142b618da74f92af9e84f7459b64a8.itemId}}&center=${assignment.latitude},${assignment.longitude}&featureSourceURL={{bb142b618da74f92af9e84f7459b64a8.layer0.url}}&featureAttributes=%7B%22placename%22:%22${assignment.location}%22%7D",
              },
            },
          },
        ],
      };

      fetchMock.post(
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/ProposedSiteAddress_field/FeatureServer/0",
        {
          serviceItemId: "bb142b618da74f92af9e84f7459b64a8",
        },
      );

      const newItemTemplate = await workforce.convertItemToTemplate(
        itemTemplate,
        MOCK_USER_SESSION,
        MOCK_USER_SESSION,
        {},
      );
      expect(newItemTemplate.data).toEqual(expectedTemplateData);
    });

    it("should handle workforce projects without data", async () => {
      const itemTemplate: common.IItemTemplate = mockItems.getAGOLItem("Workforce Project");

      const newItemTemplate = await workforce.convertItemToTemplate(
        itemTemplate,
        MOCK_USER_SESSION,
        MOCK_USER_SESSION,
        {},
      );
      expect(newItemTemplate.data).not.toBeDefined();
    });

    it("should handle error on extract dependencies", async () => {
      const itemTemplate: common.IItemTemplate = mockItems.getAGOLItem("Workforce Project", undefined);
      itemTemplate.data = mockItems.getAGOLItemData("Workforce Project");
      itemTemplate.data.assignmentIntegrations = [
        {
          id: "default-collector",
          prompt: "Collect at Assignment",
          assignmentTypes: {
            "1": {
              urlTemplate:
                "arcgis-collector://?itemID=b5142b618da74f92af9e84f7459b64a8&center=${assignment.latitude},${assignment.longitude}&featureSourceURL=https://services123.arcgis.com/org1234567890/arcgis/rest/services/ProposedSiteAddress_field/FeatureServer&featureAttributes=%7B%22placename%22:%22${assignment.location}%22%7D",
            },
          },
        },
      ];

      itemTemplate.item = {
        id: "abc0cab401af4828a25cc6eaeb59fb69",
        type: "Workforce Project",
      };

      fetchMock.post(
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/ProposedSiteAddress_field/FeatureServer",
        mockItems.get400Failure(),
      );

      return workforce.convertItemToTemplate(itemTemplate, MOCK_USER_SESSION, MOCK_USER_SESSION, {}).then(
        () => fail(),
        () => Promise.resolve(),
      );
    });

    it("should handle url without layer id", async () => {
      const itemTemplate: common.IItemTemplate = mockItems.getAGOLItem("Workforce Project", undefined);
      itemTemplate.data = mockItems.getAGOLItemData("Workforce Project");
      itemTemplate.data.assignmentIntegrations = [
        {
          id: "default-collector",
          prompt: "Collect at Assignment",
          assignmentTypes: {
            "1": {
              urlTemplate:
                "arcgis-collector://?itemID=b5142b618da74f92af9e84f7459b64a8&center=${assignment.latitude},${assignment.longitude}&featureSourceURL=https://services123.arcgis.com/org1234567890/arcgis/rest/services/ProposedSiteAddress_field/FeatureServer&featureAttributes=%7B%22placename%22:%22${assignment.location}%22%7D",
            },
          },
        },
      ];

      itemTemplate.item = {
        id: "abc0cab401af4828a25cc6eaeb59fb69",
        type: "Workforce Project",
      };

      const expectedTemplateData: any = {
        workerWebMapId: "{{abc116555b16437f8435e079033128d0.itemId}}",
        dispatcherWebMapId: "{{abc26a244163430590151395821fb845.itemId}}",
        dispatchers: {
          serviceItemId: "{{abc302ec12b74d2f9f2b3cc549420086.layer0.itemId}}",
          url: "{{abc302ec12b74d2f9f2b3cc549420086.layer0.url}}",
        },
        assignments: {
          serviceItemId: "{{abc4494043c3459faabcfd0e1ab557fc.layer0.itemId}}",
          url: "{{abc4494043c3459faabcfd0e1ab557fc.layer0.url}}",
        },
        workers: {
          serviceItemId: "{{abc5dd4bdd18437f8d5ff1aa2d25fd7c.layer0.itemId}}",
          url: "{{abc5dd4bdd18437f8d5ff1aa2d25fd7c.layer0.url}}",
        },
        tracks: {
          serviceItemId: "{{abc64329e69144c59f69f3f3e0d45269.layer0.itemId}}",
          url: "{{abc64329e69144c59f69f3f3e0d45269.layer0.url}}",
          enabled: true,
          updateInterval: 300,
        },
        version: "1.2.0",
        groupId: "{{abc715c2df2b466da05577776e82d044.itemId}}",
        folderId: "{{folderId}}",
        assignmentIntegrations: [
          {
            id: "default-collector",
            prompt: "Collect at Assignment",
            assignmentTypes: {
              "1": {
                urlTemplate:
                  "arcgis-collector://?itemID={{b5142b618da74f92af9e84f7459b64a8.itemId}}&center=${assignment.latitude},${assignment.longitude}&featureSourceURL={{bb142b618da74f92af9e84f7459b64a8.url}}&featureAttributes=%7B%22placename%22:%22${assignment.location}%22%7D",
              },
            },
          },
        ],
      };

      fetchMock.post(
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/ProposedSiteAddress_field/FeatureServer",
        {
          serviceItemId: "bb142b618da74f92af9e84f7459b64a8",
        },
      );

      const newItemTemplate = await workforce.convertItemToTemplate(
        itemTemplate,
        MOCK_USER_SESSION,
        MOCK_USER_SESSION,
        {},
      );
      expect(newItemTemplate.data).toEqual(expectedTemplateData);
    });
  });

  describe("fineTuneCreatedItem", () => {
    it("should update dispatchers service", async () => {
      const communitySelfResponse: any = utils.getUserResponse();
      const itemTemplate: common.IItemTemplate = mockItems.getAGOLItem("Workforce Project", undefined);
      itemTemplate.data = mockItems.getAGOLItemData("Workforce Project");

      const queryUrl: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/dispatchers_47bb15c2df2b466da05577776e82d044/FeatureServer/0/query?f=json&where=userId%20%3D%20%27LocalGovDeployCasey%27&outFields=*&token=fake-token";
      const addUrl: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/dispatchers_47bb15c2df2b466da05577776e82d044/FeatureServer/0/applyEdits";

      fetchMock
        .get(utils.PORTAL_SUBSET.restUrl + "/community/self?f=json&token=fake-token", communitySelfResponse)
        .get(queryUrl, {
          features: [],
        })
        .post(addUrl, {
          addResults: [{}],
        });

      const r = await workforce.fineTuneCreatedItem(itemTemplate, MOCK_USER_SESSION, false);
      expect(r).toEqual({ success: true });
    });

    it("should update dispatchers service even with default names", async () => {
      const itemTemplate: common.IItemTemplate = mockItems.getAGOLItem("Workforce Project", undefined);
      itemTemplate.data = mockItems.getAGOLItemData("Workforce Project");

      const queryUrl: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/dispatchers_47bb15c2df2b466da05577776e82d044/FeatureServer/0/query?f=json&where=userId%20%3D%20%27%27&outFields=*&token=fake-token";
      const addUrl: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/dispatchers_47bb15c2df2b466da05577776e82d044/FeatureServer/0/applyEdits";

      fetchMock
        .get(utils.PORTAL_SUBSET.restUrl + "/community/self?f=json&token=fake-token", {})
        .get(queryUrl, {
          features: [],
        })
        .post(addUrl, {
          addResults: [{}],
        });

      const r = await workforce.fineTuneCreatedItem(itemTemplate, MOCK_USER_SESSION, false);
      expect(r).toEqual({ success: true });
    });

    it("should handle error on update dispatchers", async () => {
      const communitySelfResponse: any = utils.getUserResponse();
      const itemTemplate: common.IItemTemplate = mockItems.getAGOLItem("Workforce Project", undefined);
      itemTemplate.data = mockItems.getAGOLItemData("Workforce Project");

      const queryUrl: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/dispatchers_47bb15c2df2b466da05577776e82d044/FeatureServer/0/query?f=json&where=userId%20%3D%20%27LocalGovDeployCasey%27&outFields=*&token=fake-token";

      fetchMock
        .get(utils.PORTAL_SUBSET.restUrl + "/community/self?f=json&token=fake-token", communitySelfResponse)
        .get(queryUrl, mockItems.get400Failure());

      return workforce.fineTuneCreatedItem(itemTemplate, MOCK_USER_SESSION, {}).then(
        () => fail(),
        () => Promise.resolve(),
      );
    });

    it("should handle error on getUser", async () => {
      const itemTemplate: common.IItemTemplate = mockItems.getAGOLItem("Workforce Project", undefined);
      itemTemplate.data = mockItems.getAGOLItemData("Workforce Project");

      fetchMock.get(utils.PORTAL_SUBSET.restUrl + "/community/self?f=json&token=fake-token", mockItems.get400Failure());

      return workforce.fineTuneCreatedItem(itemTemplate, MOCK_USER_SESSION, {}).then(
        () => fail(),
        () => Promise.resolve(),
      );
    });

    it("should not update dispatchers service if it contains records", async () => {
      const communitySelfResponse: any = utils.getUserResponse();
      const itemTemplate: common.IItemTemplate = mockItems.getAGOLItem("Workforce Project", undefined);
      itemTemplate.data = mockItems.getAGOLItemData("Workforce Project");

      const queryUrl: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/dispatchers_47bb15c2df2b466da05577776e82d044/FeatureServer/0/query?f=json&where=userid%20%3D%20%27LocalGovDeployCasey%27&outFields=*&token=fake-token";

      fetchMock
        .get(utils.PORTAL_SUBSET.restUrl + "/community/self?f=json&token=fake-token", communitySelfResponse)
        .get(queryUrl, {
          features: [{}],
        });

      const r = await workforce.fineTuneCreatedItem(itemTemplate, MOCK_USER_SESSION, {
        isPortal: true,
      });
      expect(r).toEqual({
        success: true,
      });
    });

    it("should handle failure to add features", async () => {
      const communitySelfResponse: any = utils.getUserResponse();
      const itemTemplate: common.IItemTemplate = mockItems.getAGOLItem("Workforce Project", undefined);
      itemTemplate.data = mockItems.getAGOLItemData("Workforce Project");

      const queryUrl: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/dispatchers_47bb15c2df2b466da05577776e82d044/FeatureServer/0/query?f=json&where=userid%20%3D%20%27LocalGovDeployCasey%27&outFields=*&token=fake-token";
      const addUrl: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/dispatchers_47bb15c2df2b466da05577776e82d044/FeatureServer/0/applyEdits";

      fetchMock
        .get(utils.PORTAL_SUBSET.restUrl + "/community/self?f=json&token=fake-token", communitySelfResponse)
        .get(queryUrl, {
          features: [],
        })
        .post(addUrl, {});

      return workforce
        .fineTuneCreatedItem(itemTemplate, MOCK_USER_SESSION, {
          isPortal: true,
        })
        .then(fail, (e) => {
          expect(e).toEqual({
            success: false,
            error: { success: false, message: "Failed to add dispatch record." },
          });
          return Promise.resolve();
        });
    });

    it("should handle error on add dispatcher features", async () => {
      const communitySelfResponse: any = utils.getUserResponse();
      const itemTemplate: common.IItemTemplate = mockItems.getAGOLItem("Workforce Project", undefined);
      itemTemplate.data = mockItems.getAGOLItemData("Workforce Project");

      const queryUrl: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/dispatchers_47bb15c2df2b466da05577776e82d044/FeatureServer/0/query?f=json&where=userId%20%3D%20%27LocalGovDeployCasey%27&outFields=*&token=fake-token";
      const addUrl: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/dispatchers_47bb15c2df2b466da05577776e82d044/FeatureServer/0/applyEdits";

      fetchMock
        .get(utils.PORTAL_SUBSET.restUrl + "/community/self?f=json&token=fake-token", communitySelfResponse)
        .get(queryUrl, {
          features: [],
        })
        .post(addUrl, mockItems.get400Failure());

      return workforce.fineTuneCreatedItem(itemTemplate, MOCK_USER_SESSION, {}).then(
        () => fail(),
        () => Promise.resolve(),
      );
    });

    it("should have success === false when query does not return a features property", async () => {
      const communitySelfResponse: any = utils.getUserResponse();
      const itemTemplate: common.IItemTemplate = mockItems.getAGOLItem("Workforce Project", undefined);
      itemTemplate.data = mockItems.getAGOLItemData("Workforce Project");

      const queryUrl: string =
        "https://services123.arcgis.com/org1234567890/arcgis/rest/services/dispatchers_47bb15c2df2b466da05577776e82d044/FeatureServer/0/query?f=json&where=userId%20%3D%20%27LocalGovDeployCasey%27&outFields=*&token=fake-token";

      fetchMock
        .get(utils.PORTAL_SUBSET.restUrl + "/community/self?f=json&token=fake-token", communitySelfResponse)
        .get(queryUrl, {});

      const r = await workforce.fineTuneCreatedItem(itemTemplate, MOCK_USER_SESSION, {});
      expect(r).toEqual({
        success: false,
      });
    });

    // it("should have success === false when dispatchers does not have url", Promise.resolve => {
    //   const communitySelfResponse: any = utils.getUserResponse();
    //   const itemTemplate: common.IItemTemplate = mockItems.getAGOLItem(
    //     "Workforce Project",
    //     null
    //   );
    //   itemTemplate.data = mockItems.getAGOLItemData("Workforce Project");

    //   const userUrl: string =
    //     utils.PORTAL_SUBSET.restUrl +
    //     "/community/users/casey?f=json&token=fake-token";
    //   const queryUrl: string =
    //     "https://services123.arcgis.com/org1234567890/arcgis/rest/services/dispatchers_47bb15c2df2b466da05577776e82d044/FeatureServer/0/query?f=json&where=userId%20%3D%20%27MrClaypool%27&outFields=*&token=fake-token";

    //   fetchMock
    //     .get(
    //       utils.PORTAL_SUBSET.restUrl +
    //         "/community/self?f=json&token=fake-token",
    //       communitySelfResponse
    //     )
    //     .get(userUrl, {
    //       username: "MrClaypool",
    //       fullName: "Mr Claypool"
    //     })
    //     .get(queryUrl, {});

    //   delete itemTemplate.data.dispatchers.url;

    //   workforce.fineTuneCreatedItem(itemTemplate, MOCK_USER_SESSION).then(r => {
    //     expect(r).toEqual({
    //       success: false
    //     });
    //     Promise.resolve();
    //   }, fail);
    // });
  });
});
