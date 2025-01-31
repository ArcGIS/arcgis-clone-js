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
 * Provides tests for functions involving the creation of a Solution item.
 */

import * as common from "@esri/solution-common";
import * as creator from "../src/creator";
const fetchMock = require("fetch-mock");
import * as hubCommon from "@esri/hub-common";
import * as mockItems from "../../common/test/mocks/agolItems";
import * as staticRelatedItemsMocks from "../../common/test/mocks/staticRelatedItemsMocks";
import * as utils from "../../common/test/mocks/utils";

// Set up a UserSession to use in all these tests
const MOCK_USER_SESSION = utils.createRuntimeMockUserSession();

const noDataResponse: any = {};
const noResourcesResponse: any = {
  total: 0,
  start: 1,
  num: 0,
  nextStart: -1,
  resources: [],
};
const noMetadataResponse: any = {
  error: {
    code: 400,
    messageCode: "CONT_0036",
    message: "Item info file does not exist or is inaccessible.",
    details: ["Error getting Item Info from DataStore"],
  },
};

afterEach(() => {
  fetchMock.restore();
});

// ------------------------------------------------------------------------------------------------------------------ //

describe("Module `creator`", () => {
  describe("createSolution", () => {
    it("createSolution fails to get group or item", async () => {
      const solutionGroupId: string = "grp1234567890";
      const authentication: common.UserSession = MOCK_USER_SESSION;

      const options: common.ICreateSolutionOptions = {
        progressCallback: utils.SOLUTION_PROGRESS_CALLBACK,
      };

      fetchMock
        .get(
          utils.PORTAL_SUBSET.restUrl + "/portals/self/subscriptioninfo?f=json&token=fake-token",
          mockItems.getAGOLSubscriptionInfo(false),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/addItem",
          utils.getSuccessResponse({ id: "sln1234567890", folder: null }),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890?f=json&token=fake-token",
          mockItems.get400Failure(),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/groups/grp1234567890?f=json&start=1&num=100&token=fake-token",
          mockItems.get400Failure(),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/items/grp1234567890?f=json&token=fake-token",
          mockItems.get400Failure(),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/update",
          utils.getSuccessResponse({ itemId: "sln1234567890" }),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/delete",
          utils.getSuccessResponse({ itemId: "sln1234567890" }),
        );
      spyOn(console, "error").and.callFake(() => {});

      return creator.createSolution(solutionGroupId, authentication, authentication, options).then(
        () => fail(),
        (response) => {
          expect(response.success).toBeFalsy();
          return Promise.resolve();
        },
      );
    });

    it("createSolution skips missing item from group", async () => {
      const solutionGroupId: string = "grp1234567890";
      const authentication: common.UserSession = MOCK_USER_SESSION;
      const expectedSolutionId = "sln1234567890";
      const expectedImage = utils.getSampleImageAsBlob();

      fetchMock
        .get(utils.PORTAL_SUBSET.restUrl + "/community/self?f=json&token=fake-token", utils.getUserResponse())
        .get(utils.PORTAL_SUBSET.restUrl + "/portals/self?f=json&token=fake-token", utils.getPortalsSelfResponse())
        .get(
          utils.PORTAL_SUBSET.restUrl + "/portals/self/subscriptioninfo?f=json&token=fake-token",
          mockItems.getAGOLSubscriptionInfo(false),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/addItem",
          utils.getSuccessResponse({ id: expectedSolutionId, folder: null }),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890?f=json&token=fake-token",
          mockItems.getAGOLItem("Group"),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/groups/grp1234567890?f=json&start=1&num=100&token=fake-token",
          mockItems.getAGOLGroupContentsList(1, "Web Map"),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890/info/ROWPermitManager.png",
          utils.getSampleImageAsFile(),
          { sendAsJson: false },
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678900?f=json&token=fake-token",
          mockItems.get400Failure(),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/map12345678900?f=json&token=fake-token",
          mockItems.get400Failure(),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890/info/ROWPermitManager.png?w=400",
          expectedImage,
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/delete",
          utils.getSuccessResponse({ itemId: expectedSolutionId }),
        )
        .post(
          // for missing item's placeholder
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/update",
          utils.getSuccessResponse({ id: expectedSolutionId }),
        );

      spyOn(console, "error").and.callFake(() => {});
      spyOn(common, "createShortId").and.callFake(() => "xfakeidx");

      return creator.createSolution(solutionGroupId, authentication, authentication);
    });

    it("createSolution skips failure to update solution item", async () => {
      const solutionGroupId: string = "grp1234567890";
      const authentication: common.UserSession = MOCK_USER_SESSION;
      const expectedSolutionId = "sln1234567890";

      fetchMock
        .get(utils.PORTAL_SUBSET.restUrl + "/community/self?f=json&token=fake-token", utils.getUserResponse())
        .get(utils.PORTAL_SUBSET.restUrl + "/portals/self?f=json&token=fake-token", utils.getPortalsSelfResponse())
        .get(
          utils.PORTAL_SUBSET.restUrl + "/portals/self/subscriptioninfo?f=json&token=fake-token",
          mockItems.getAGOLSubscriptionInfo(false),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/addItem",
          utils.getSuccessResponse({ id: expectedSolutionId, folder: null }),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890?f=json&token=fake-token",
          mockItems.getAGOLItem("Group"),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/groups/grp1234567890?f=json&start=1&num=100&token=fake-token",
          mockItems.getAGOLGroupContentsList(1, "Web Map"),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890/info/ROWPermitManager.png",
          utils.getSampleImageAsFile(),
          { sendAsJson: false },
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678900?f=json&token=fake-token",
          mockItems.get400Failure(),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/map12345678900?f=json&token=fake-token",
          mockItems.get400Failure(),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890/info/ROWPermitManager.png?w=400",
          utils.getSampleImageAsBlob(),
        )
        .post(utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/delete", {
          success: true,
          itemId: expectedSolutionId,
        })
        .post(
          // for missing item's placeholder
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/update",
          utils.getSuccessResponse({ id: expectedSolutionId }),
        );

      spyOn(console, "error").and.callFake(() => {});
      spyOn(common, "createShortId").and.callFake(() => "xfakeidx");

      return creator.createSolution(solutionGroupId, authentication, authentication);
    });

    it("createSolution with default name", async () => {
      const solutionGroupId: string = "grp1234567890";
      const authentication: common.UserSession = MOCK_USER_SESSION;

      const expectedSolutionId = "sln1234567890";
      const expectedImage = utils.getSampleImageAsBlob();

      fetchMock
        .get(utils.PORTAL_SUBSET.restUrl + "/community/self?f=json&token=fake-token", utils.getUserResponse())
        .get(
          utils.PORTAL_SUBSET.restUrl + "/portals/self/subscriptioninfo?f=json&token=fake-token",
          mockItems.getAGOLSubscriptionInfo(true),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890?f=json&token=fake-token",
          mockItems.getAGOLItem("Group"),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/groups/grp1234567890?f=json&start=1&num=100&token=fake-token",
          mockItems.getAGOLGroupContentsList(2, "Web Map"),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890/info/ROWPermitManager.png",
          utils.getSampleImageAsFile(),
          { sendAsJson: false },
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/addItem",
          utils.getSuccessResponse({ id: expectedSolutionId, folder: null }),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678900?f=json&token=fake-token",
          mockItems.getAGOLItemWithId("Web Map", 0),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678900/info/thumbnail/ago_downloaded.png?w=400",
          utils.getSampleImageAsBlob(),
        )
        .post(utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678900/data", noDataResponse)
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678900/info/metadata/metadata.xml",
          noMetadataResponse,
        )
        .post(utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678900/resources", noResourcesResponse)
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678901?f=json&token=fake-token",
          mockItems.getAGOLItemWithId("Web Map", 1),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678901/info/thumbnail/ago_downloaded.png?w=400",
          utils.getSampleImageAsBlob(),
        )
        .post(utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678901/data", noDataResponse)
        .post(utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678901/resources", noResourcesResponse)
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678901/info/metadata/metadata.xml",
          noMetadataResponse,
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890/info/ROWPermitManager.png?w=400",
          expectedImage,
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/update",
          utils.getSuccessResponse({ id: expectedSolutionId }),
        )
        .post(utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/addResources", {
          success: true,
          id: expectedSolutionId,
        })
        .get(utils.PORTAL_SUBSET.restUrl + "/portals/self?f=json&token=fake-token", {
          customBaseUrl: "maps.arcgis.com",
          urlKey: "myorg",
        });
      staticRelatedItemsMocks.fetchMockRelatedItems("map12345678900", {
        total: 0,
        relatedItems: [],
      });
      staticRelatedItemsMocks.fetchMockRelatedItems("map12345678901", {
        total: 0,
        relatedItems: [],
      });

      const solutionId = await creator.createSolution(solutionGroupId, authentication, authentication);
      expect(solutionId).toEqual(expectedSolutionId);

      const addSolnCall = fetchMock.calls(utils.PORTAL_SUBSET.restUrl + "/content/users/casey/addItem");
      expect((addSolnCall[0][1]["body"] as FormData).get("title")).toEqual(mockItems.getAGOLItem("Group").title);
    });

    it("createSolution with specified name", async () => {
      const solutionName: string = "scratch_" + common.getUTCTimestamp();
      const solutionGroupId: string = "grp1234567890";
      const authentication: common.UserSession = MOCK_USER_SESSION;

      const expectedSolutionId = "sln1234567890";

      const expectedImage = utils.getSampleImageAsBlob();

      fetchMock
        .get(utils.PORTAL_SUBSET.restUrl + "/community/self?f=json&token=fake-token", utils.getUserResponse())
        .get(
          utils.PORTAL_SUBSET.restUrl + "/portals/self/subscriptioninfo?f=json&token=fake-token",
          mockItems.getAGOLSubscriptionInfo(true),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890?f=json&token=fake-token",
          mockItems.getAGOLItem("Group"),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/groups/grp1234567890?f=json&start=1&num=100&token=fake-token",
          mockItems.getAGOLGroupContentsList(2, "Web Map"),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/addItem",
          utils.getSuccessResponse({ id: expectedSolutionId, folder: null }),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678900?f=json&token=fake-token",
          mockItems.getAGOLItemWithId("Web Map", 0),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890/info/ROWPermitManager.png",
          utils.getSampleImageAsFile(),
          { sendAsJson: false },
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678900/info/thumbnail/ago_downloaded.png?w=400",
          utils.getSampleImageAsBlob(),
        )
        .post(utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678900/data", noDataResponse)
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678900/info/metadata/metadata.xml",
          noMetadataResponse,
        )
        .post(utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678900/resources", noResourcesResponse)
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678901?f=json&token=fake-token",
          mockItems.getAGOLItemWithId("Web Map", 1),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678901/info/thumbnail/ago_downloaded.png?w=400",
          utils.getSampleImageAsBlob(),
        )
        .post(utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678901/data", noDataResponse)
        .post(utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678901/resources", noResourcesResponse)
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678901/info/metadata/metadata.xml",
          noMetadataResponse,
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890/info/ROWPermitManager.png?w=400",
          expectedImage,
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/update",
          utils.getSuccessResponse({ id: expectedSolutionId }),
        )
        .post(utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/addResources", {
          success: true,
          id: expectedSolutionId,
        })
        .get(utils.PORTAL_SUBSET.restUrl + "/portals/self?f=json&token=fake-token", {
          customBaseUrl: "maps.arcgis.com",
          urlKey: "myorg",
        });
      staticRelatedItemsMocks.fetchMockRelatedItems("map12345678900", {
        total: 0,
        relatedItems: [],
      });
      staticRelatedItemsMocks.fetchMockRelatedItems("map12345678901", {
        total: 0,
        relatedItems: [],
      });

      const options: common.ICreateSolutionOptions = {
        title: solutionName,
        snippet: "createOptions.snippet",
        description: "createOptions.description",
        tags: ["createOptions.tags"],
        templatizeFields: true,
        templateDictionary: {
          wma1234567890: {
            itemId: "wma1234567890",
            url: utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/wma1234567890",
            name: "a map",
          },
        },
        progressCallback: () => {},
      };

      const solutionId = await creator.createSolution(solutionGroupId, authentication, authentication, options);
      expect(solutionId).toEqual(expectedSolutionId);

      const addSolnCall = fetchMock.calls(utils.PORTAL_SUBSET.restUrl + "/content/users/casey/addItem");
      expect((addSolnCall[0][1]["body"] as FormData).get("title")).toEqual(solutionName);
    });

    it("createSolution with empty group with defaults without progress callback", async () => {
      const solutionGroupId: string = "grp1234567890";
      const authentication: common.UserSession = MOCK_USER_SESSION;

      const expectedSolutionId = "sln1234567890";
      const expectedImage = utils.getSampleImageAsBlob();

      fetchMock
        .get(utils.PORTAL_SUBSET.restUrl + "/community/self?f=json&token=fake-token", utils.getUserResponse())
        .get(utils.PORTAL_SUBSET.restUrl + "/portals/self?f=json&token=fake-token", utils.getPortalsSelfResponse())
        .get(
          utils.PORTAL_SUBSET.restUrl + "/portals/self/subscriptioninfo?f=json&token=fake-token",
          mockItems.getAGOLSubscriptionInfo(false),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890?f=json&token=fake-token",
          mockItems.getAGOLItem("Group"),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890/info/ROWPermitManager.png",
          utils.getSampleImageAsFile(),
          { sendAsJson: false },
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/groups/grp1234567890?f=json&start=1&num=100&token=fake-token",
          mockItems.getAGOLGroupContentsList(0),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/addItem",
          utils.getSuccessResponse({ id: expectedSolutionId, folder: null }),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678901/info/metadata/metadata.xml",
          noMetadataResponse,
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890/info/ROWPermitManager.png?w=400",
          expectedImage,
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/update",
          utils.getSuccessResponse({ id: expectedSolutionId }),
        )
        .post(utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/addResources", {
          success: true,
          id: expectedSolutionId,
        });

      const solutionId = await creator.createSolution(solutionGroupId, authentication, authentication);
      expect(solutionId).toEqual(expectedSolutionId);

      const addSolnCall = fetchMock.calls(utils.PORTAL_SUBSET.restUrl + "/content/users/casey/addItem");
      expect((addSolnCall[0][1]["body"] as FormData).get("title")).toEqual(mockItems.getAGOLItem("Group").title);
    });

    it("createSolution with empty group without progress callback", async () => {
      const solutionName: string = "scratch_" + common.getUTCTimestamp();
      const solutionGroupId: string = "grp1234567890";
      const authentication: common.UserSession = MOCK_USER_SESSION;

      const expectedSolutionId = "sln1234567890";

      const expectedImage = utils.getSampleImageAsBlob();

      fetchMock
        .get(utils.PORTAL_SUBSET.restUrl + "/community/self?f=json&token=fake-token", utils.getUserResponse())
        .get(utils.PORTAL_SUBSET.restUrl + "/portals/self?f=json&token=fake-token", utils.getPortalsSelfResponse())
        .get(
          utils.PORTAL_SUBSET.restUrl + "/portals/self/subscriptioninfo?f=json&token=fake-token",
          mockItems.getAGOLSubscriptionInfo(false),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890?f=json&token=fake-token",
          mockItems.getAGOLItem("Group"),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890/info/ROWPermitManager.png",
          utils.getSampleImageAsFile(),
          { sendAsJson: false },
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/groups/grp1234567890?f=json&start=1&num=100&token=fake-token",
          mockItems.getAGOLGroupContentsList(0),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/addItem",
          utils.getSuccessResponse({ id: expectedSolutionId, folder: null }),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678901/info/metadata/metadata.xml",
          noMetadataResponse,
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890/info/ROWPermitManager.png?w=400",
          expectedImage,
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/update",
          utils.getSuccessResponse({ id: expectedSolutionId }),
        )
        .post(utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/addResources", {
          success: true,
          id: expectedSolutionId,
        });

      const options: common.ICreateSolutionOptions = {
        title: solutionName,
        templatizeFields: true,
      };

      const solutionId = await creator.createSolution(solutionGroupId, authentication, authentication, options);
      expect(solutionId).toEqual(expectedSolutionId);

      const addSolnCall = fetchMock.calls(utils.PORTAL_SUBSET.restUrl + "/content/users/casey/addItem");
      expect((addSolnCall[0][1]["body"] as FormData).get("title")).toEqual(solutionName);
    });

    it("createSolution with empty group and progress callback", async () => {
      const solutionName: string = "scratch_" + common.getUTCTimestamp();
      const solutionGroupId: string = "grp1234567890";
      const authentication: common.UserSession = MOCK_USER_SESSION;

      const expectedSolutionId = "sln1234567890";

      const expectedImage = utils.getSampleImageAsBlob();

      fetchMock
        .get(utils.PORTAL_SUBSET.restUrl + "/community/self?f=json&token=fake-token", utils.getUserResponse())
        .get(utils.PORTAL_SUBSET.restUrl + "/portals/self?f=json&token=fake-token", utils.getPortalsSelfResponse())
        .get(
          utils.PORTAL_SUBSET.restUrl + "/portals/self/subscriptioninfo?f=json&token=fake-token",
          mockItems.getAGOLSubscriptionInfo(false),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890?f=json&token=fake-token",
          mockItems.getAGOLItem("Group"),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890/info/ROWPermitManager.png",
          utils.getSampleImageAsFile(),
          { sendAsJson: false },
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/groups/grp1234567890?f=json&start=1&num=100&token=fake-token",
          mockItems.getAGOLGroupContentsList(0),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/addItem",
          utils.getSuccessResponse({ id: expectedSolutionId, folder: null }),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/items/map12345678901/info/metadata/metadata.xml",
          noMetadataResponse,
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890/info/ROWPermitManager.png?w=400",
          expectedImage,
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/update",
          utils.getSuccessResponse({ id: expectedSolutionId }),
        )
        .post(utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/addResources", {
          success: true,
          id: expectedSolutionId,
        });

      spyOn(console, "error").and.callFake(() => {});

      const options: common.ICreateSolutionOptions = {
        title: solutionName,
        templatizeFields: true,
        progressCallback: () => {},
      };

      const solutionId = await creator.createSolution(solutionGroupId, authentication, authentication, options);
      expect(solutionId).toEqual(expectedSolutionId);

      const addSolnCall = fetchMock.calls(utils.PORTAL_SUBSET.restUrl + "/content/users/casey/addItem");
      expect((addSolnCall[0][1]["body"] as FormData).get("title")).toEqual(solutionName);
    });

    it("createSolution fails to get item or group", async () => {
      const itemIds: string = "itm1234567890";
      const authentication: common.UserSession = MOCK_USER_SESSION;
      const expectedSolutionId = "sln1234567890";
      const expectedImage = utils.getSampleImageAsBlob();

      fetchMock
        .get(utils.PORTAL_SUBSET.restUrl + "/community/self?f=json&token=fake-token", utils.getUserResponse())
        .get(utils.PORTAL_SUBSET.restUrl + "/portals/self?f=json&token=fake-token", utils.getPortalsSelfResponse())
        .get(
          utils.PORTAL_SUBSET.restUrl + "/portals/self/subscriptioninfo?f=json&token=fake-token",
          mockItems.getAGOLSubscriptionInfo(false),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/addItem",
          utils.getSuccessResponse({ id: expectedSolutionId, folder: null }),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/items/itm1234567890?f=json&token=fake-token",
          mockItems.get400Failure(),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/itm1234567890?f=json&token=fake-token",
          mockItems.get400Failure(),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/groups/itm1234567890?f=json&start=1&num=100&token=fake-token",
          mockItems.get400Failure(),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890/info/ROWPermitManager.png?w=400",
          expectedImage,
        )
        .post(utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/delete", {
          success: true,
          itemId: expectedSolutionId,
        })
        .post(
          // for missing item's placeholder
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/update",
          utils.getSuccessResponse({ id: expectedSolutionId }),
        );

      spyOn(console, "error").and.callFake(() => {});
      spyOn(common, "createShortId").and.callFake(() => "xfakeidx");

      return creator.createSolution(itemIds, authentication, authentication).then(
        () => fail(),
        () => Promise.resolve(),
      );
    });

    it("createSolution fails to add items to solution item", async () => {
      MOCK_USER_SESSION.getPortal = function () {
        return (this as any).isEnterprise
          ? Promise.resolve({ portalHostname: "myOrg.ags.esri.com/portal" })
          : Promise.resolve({ portalHostname: "myPortalHostname" });
      };

      const itemIds: string = "itm1234567890";
      const authentication: common.UserSession = MOCK_USER_SESSION;
      const expectedSolutionId = "sln1234567890";
      const expectedItem = mockItems.getAGOLItem("Web Map");

      fetchMock
        .get(utils.PORTAL_SUBSET.restUrl + "/community/self?f=json&token=fake-token", utils.getUserResponse())
        .get(
          utils.PORTAL_SUBSET.restUrl + "/portals/self/subscriptioninfo?f=json&token=fake-token",
          mockItems.getAGOLSubscriptionInfo(true),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/addItem",
          utils.getSuccessResponse({ id: expectedSolutionId, folder: null }),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/itm1234567890?f=json&token=fake-token",
          mockItems.get400Failure(),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/groups/itm1234567890?f=json&start=1&num=100&token=fake-token",
          mockItems.get400Failure(),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/items/itm1234567890?f=json&token=fake-token",
          JSON.stringify(expectedItem),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/items/map1234567890/info/thumbnail/ago_downloaded.png",
          utils.getSampleImageAsFile(),
          { sendAsJson: false },
        )
        .post(utils.PORTAL_SUBSET.restUrl + "/content/items/map1234567890/data", noDataResponse)
        .post(utils.PORTAL_SUBSET.restUrl + "/content/items/map1234567890/resources", noResourcesResponse)
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/items/map1234567890/info/metadata/metadata.xml",
          noMetadataResponse,
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/items/map1234567890/info/thumbnail/ago_downloaded.png?w=400",
          utils.getSampleImageAsBlob(),
          { sendAsJson: false },
        )
        .post(utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/addResources", {
          success: true,
          id: expectedSolutionId,
        })
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/update",
          utils.getFailureResponse({ id: "sln1234567890" }),
        )
        .post(utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/delete", {
          success: true,
          itemId: expectedSolutionId,
        })
        .get(utils.PORTAL_SUBSET.restUrl + "/portals/self?f=json&token=fake-token", {
          customBaseUrl: "maps.arcgis.com",
          urlKey: "myorg",
        });
      staticRelatedItemsMocks.fetchMockRelatedItems("map1234567890", {
        total: 0,
        relatedItems: [],
      });

      spyOn(console, "error").and.callFake(() => {});

      spyOn(common, "createShortId").and.callFake(() => "xfakeidx");

      return creator.createSolution(itemIds, authentication, authentication).then(
        () => fail(),
        (error) => {
          expect(error.success).toBeFalsy();
          return Promise.resolve();
        },
      );
    });
  });

  describe("_addThumbnailFileToCreateOptions", () => {
    it("doesn't modify creation options if there's no thumbnailurl", async () => {
      const createOptions: common.ICreateSolutionOptions = {};
      const expectedUpdatedCreateOptions: common.ICreateSolutionOptions = {};

      const updatedCreateOptions: common.ICreateSolutionOptions = await creator._addThumbnailFileToCreateOptions(
        createOptions,
        MOCK_USER_SESSION,
      );
      expect(updatedCreateOptions).toEqual(expectedUpdatedCreateOptions);
    });

    it("fetches a thumbnail", async () => {
      const createOptions: common.ICreateSolutionOptions = {
        thumbnailurl:
          utils.PORTAL_SUBSET.restUrl + "/content/items/itm1234567890/folder/sampelImage?f=json&token=fake-token",
      };
      const expectedUpdatedCreateOptions: common.ICreateSolutionOptions = {
        thumbnail: utils.getSampleImageAsFile(),
      };

      fetchMock.post(
        utils.PORTAL_SUBSET.restUrl + "/content/items/itm1234567890/folder/sampelImage?f=json&token=fake-token&w=400",
        utils.getSampleImageAsFile(),
        { sendAsJson: false },
      );

      const updatedCreateOptions: common.ICreateSolutionOptions = await creator._addThumbnailFileToCreateOptions(
        createOptions,
        MOCK_USER_SESSION,
      );
      expect(updatedCreateOptions).toEqual(expectedUpdatedCreateOptions);
    });

    it("has a fallback filename", async () => {
      const createOptions: common.ICreateSolutionOptions = {
        thumbnailurl: utils.PORTAL_SUBSET.restUrl + "/content/items/itm1234567890/folder/?f=json&token=fake-token",
      };
      const expectedUpdatedCreateOptions: common.ICreateSolutionOptions = {
        thumbnail: utils.getSampleImageAsFile("thumbnail"),
      };

      fetchMock.post(
        utils.PORTAL_SUBSET.restUrl + "/content/items/itm1234567890/folder/?f=json&token=fake-token&w=400",
        utils.getSampleImageAsFile(),
        { sendAsJson: false },
      );

      const updatedCreateOptions: common.ICreateSolutionOptions = await creator._addThumbnailFileToCreateOptions(
        createOptions,
        MOCK_USER_SESSION,
      );
      expect(updatedCreateOptions).toEqual(expectedUpdatedCreateOptions);
    });

    it("handles a failure to fetch a thumbnail", async () => {
      const createOptions: common.ICreateSolutionOptions = {
        thumbnailurl:
          utils.PORTAL_SUBSET.restUrl + "/content/items/itm1234567890/folder/sampleImage?f=json&token=fake-token",
      };
      const expectedUpdatedCreateOptions: common.ICreateSolutionOptions = {};

      fetchMock.post(
        utils.PORTAL_SUBSET.restUrl + "/content/items/itm1234567890/folder/sampleImage?f=json&token=fake-token&w=400",
        mockItems.get400Failure(),
      );

      const updatedCreateOptions: common.ICreateSolutionOptions = await creator._addThumbnailFileToCreateOptions(
        createOptions,
        MOCK_USER_SESSION,
      );
      expect(updatedCreateOptions).toEqual(expectedUpdatedCreateOptions);
    });
  });

  describe("_createSolutionFromItemIds", () => {
    it("handles failure to create the solution", async () => {
      const options: common.ICreateSolutionOptions = {
        itemIds: ["map1234567890", "wma1234567890"],
      };

      spyOn(common, "createItemWithData").and.returnValue(Promise.reject(utils.getFailureResponse()));

      return creator._createSolutionFromItemIds(options, MOCK_USER_SESSION, MOCK_USER_SESSION).then(
        () => fail(),
        () => Promise.resolve(),
      );
    });

    it("handles failure to delete the solution if items can't be added to it", async () => {
      const solutionId = "sln1234567890";
      const options: common.ICreateSolutionOptions = {
        itemIds: ["wma1234567890"],
      };

      fetchMock
        .get(utils.PORTAL_SUBSET.restUrl + "/portals/self?f=json&token=fake-token", utils.getPortalsSelfResponse())
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/addItem",
          utils.getSuccessResponse({ id: solutionId, folder: null }),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/items/wma1234567890?f=json&token=fake-token",
          mockItems.get400Failure(),
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/wma1234567890?f=json&token=fake-token",
          mockItems.get400Failure(),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/update",
          utils.getSuccessResponse({ id: solutionId }),
        )
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/delete",
          utils.getFailureResponse({ itemId: solutionId }),
        );
      spyOn(console, "error").and.callFake(() => {});

      return creator._createSolutionFromItemIds(options, MOCK_USER_SESSION, MOCK_USER_SESSION).then(
        () => Promise.resolve(),
        () => fail(),
      );
    });
  });

  describe("_createSolutionItem", () => {
    it("creates a solution item with defaults", async () => {
      const authentication: common.UserSession = MOCK_USER_SESSION;
      const url = utils.PORTAL_SUBSET.restUrl + "/content/users/casey/addItem";
      const expectedSolutionId = "sln1234567890";
      const expectedFetchBody =
        "f=json&title=xfakeidx&type=Solution&accessInformation=&snippet=&description=&properties=" +
        encodeURIComponent(JSON.stringify({ schemaVersion: common.CURRENT_SCHEMA_VERSION })) +
        "&tags=&typeKeywords=Solution%2CTemplate%2Csolutionid-guid%2Csolutionversion-1.0" +
        "&categories=&licenseInfo=" +
        "&text=%7B%22metadata%22%3A%7B%7D%2C%22templates%22%3A%5B%5D%7D&token=fake-token";

      fetchMock.post(url, utils.getSuccessResponse({ id: expectedSolutionId, folder: null }));
      spyOn(common, "createShortId").and.callFake(() => "xfakeidx");
      spyOn(common, "createLongId").and.callFake(() => "guid");

      const solutionId = await creator._createSolutionItem(authentication);
      expect(solutionId).toEqual(expectedSolutionId);
      const options: any = fetchMock.lastOptions(url);
      const fetchBody = options.body;
      expect(fetchBody).toEqual(expectedFetchBody);
    });

    it("creates a solution item with options", async () => {
      const options: common.ICreateSolutionOptions = {
        title: "Solution Name",
        snippet: "Solution's snippet",
        description: "Solution's description",
        tags: ["Test", "a tag"],
        thumbnailurl: utils.PORTAL_SUBSET.portalUrl + "/logo.png",
        templatizeFields: true,
        additionalTypeKeywords: ["Esri", "Government Solutions"],
      };
      const authentication: common.UserSession = MOCK_USER_SESSION;
      const url = utils.PORTAL_SUBSET.restUrl + "/content/users/casey/addItem";
      const expectedSolutionId = "sln1234567890";

      const blob = new Blob(["fake-blob"], { type: "text/plain" });

      fetchMock
        .post(url, utils.getSuccessResponse({ id: expectedSolutionId, folder: null }))
        .post(utils.PORTAL_SUBSET.portalUrl + "/logo.png?w=400", blob, {
          sendAsJson: false,
        })
        .post(
          utils.PORTAL_SUBSET.restUrl + "/content/users/casey/items/sln1234567890/update",
          utils.getSuccessResponse({ id: expectedSolutionId }),
        );
      spyOn(common, "createShortId").and.callFake(() => "xfakeidx");
      spyOn(common, "createLongId").and.callFake(() => "guid");

      const solutionId = await creator._createSolutionItem(authentication, options);
      expect(solutionId).toEqual(expectedSolutionId);
      const fetchOptions: any = fetchMock.lastOptions(url);
      const fetchBody = fetchOptions.body;
      expect(fetchBody).toEqual(
        "f=json&title=" +
          encodeURIComponent(options.title as any) +
          "&type=Solution" +
          "&accessInformation=" +
          "&snippet=" +
          encodeURIComponent(options.snippet as any) +
          "&description=" +
          encodeURIComponent(options.description as any) +
          "&properties=" +
          encodeURIComponent(
            JSON.stringify({
              schemaVersion: common.CURRENT_SCHEMA_VERSION,
            }),
          ) +
          "&tags=" +
          options.tags?.map(encodeURIComponent).join("%2C") +
          "&typeKeywords=" +
          ["Solution", "Template", "solutionid-guid", "solutionversion-1.0"]
            .concat(options.additionalTypeKeywords as any)
            .map(encodeURIComponent)
            .join("%2C") +
          "&categories=&licenseInfo=" +
          "&text=%7B%22metadata%22%3A%7B%7D%2C%22templates%22%3A%5B%5D%7D&token=fake-token",
      );
    });

    it("handles failure to create the solution item", async () => {
      const authentication: common.UserSession = MOCK_USER_SESSION;
      const url = utils.PORTAL_SUBSET.restUrl + "/content/users/casey/addItem";
      const expectedFetchBody =
        "f=json&title=xfakeidx&type=Solution&accessInformation=&snippet=&description=&properties=" +
        encodeURIComponent(JSON.stringify({ schemaVersion: common.CURRENT_SCHEMA_VERSION })) +
        "&tags=&typeKeywords=Solution%2CTemplate%2Csolutionid-guid%2Csolutionversion-1.0" +
        "&categories=&licenseInfo=" +
        "&text=%7B%22metadata%22%3A%7B%7D%2C%22templates%22%3A%5B%5D%7D&token=fake-token";

      fetchMock.post(url, utils.getFailureResponse());
      spyOn(common, "createShortId").and.callFake(() => "xfakeidx");
      spyOn(common, "createLongId").and.callFake(() => "guid");

      return creator._createSolutionItem(authentication).then(
        () => fail(),
        (error) => {
          expect(error.success).toBeFalsy();
          const options: any = fetchMock.lastOptions(url);
          const fetchBody = options.body;
          expect(fetchBody).toEqual(expectedFetchBody);
          return Promise.resolve();
        },
      );
    });
  });

  describe("_createSolutionItemModel", () => {
    it("returns a model, with options applied", () => {
      const opts = {
        title: "The Title",
        snippet: "The Snippet",
        description: "The Desc",
        thumbnailurl: "https://some.com/thumbnail.jpg",
        additionalTypeKeywords: ["foo"],
        tags: ["deploy.id.3ef"],
      };
      const chk = creator._createSolutionItemModel(opts);
      expect(chk).toEqual({
        item: {
          type: "Solution",
          title: opts.title,
          snippet: opts.snippet,
          description: opts.description,
          properties: {
            schemaVersion: common.CURRENT_SCHEMA_VERSION,
          },
          thumbnailurl: opts.thumbnailurl,
          tags: [],
          typeKeywords: ["Solution", "Template", "solutionid-3ef", "solutionversion-1.0", "foo"],
          accessInformation: "",
          categories: [],
          licenseInfo: ""
        } as any,
        data: {
          metadata: {},
          templates: [],
        },
      } as hubCommon.IModel);
    });

    it("returns defaults if options is empty", () => {
      const opts = {};
      const chk = creator._createSolutionItemModel(opts);
      expect(chk.item.title).toBeDefined();
      expect(chk.item.typeKeywords?.length).toBe(4);
      // remove things that are random
      delete chk.item.typeKeywords;

      expect(chk).toEqual({
        item: {
          title: chk.item.title,
          type: "Solution",
          snippet: "",
          description: "",
          properties: {
            schemaVersion: common.CURRENT_SCHEMA_VERSION,
          },
          thumbnailurl: "",
          tags: [],
          accessInformation: "",
          categories: [],
          licenseInfo: ""
        } as any,
        data: {
          metadata: {},
          templates: [],
        },
      } as hubCommon.IModel);
    });

    it("sanitizes the item", () => {
      spyOn(console, "warn").and.callFake(() => {});
      const opts = {
        title: "The Title",
        snippet: "The Snippet",
        description: "Desc <script>alert('Nefarious');</script>",
        thumbnailurl: "https://some.com/thumbnail.jpg",
        additionalTypeKeywords: ["bar"],
        tags: ["deploy.id.3ef"],
      };
      const chk = creator._createSolutionItemModel(opts);
      expect(chk).toEqual({
        item: {
          type: "Solution",
          title: opts.title,
          snippet: opts.snippet,
          description: "Desc &lt;script&gt;alert('Nefarious');&lt;/script&gt;",
          properties: {
            schemaVersion: common.CURRENT_SCHEMA_VERSION,
          },
          thumbnailurl: opts.thumbnailurl,
          tags: [],
          typeKeywords: ["Solution", "Template", "solutionid-3ef", "solutionversion-1.0", "bar"],
          accessInformation: "",
          categories: [],
          licenseInfo: ""
        } as any,
        data: {
          metadata: {},
          templates: [],
        },
      } as hubCommon.IModel);
    });
  });

  describe("_applySourceToCreateOptions", () => {
    it("copies properties and thumbnail for a group", () => {
      const opts = {};

      const grp = {
        id: "3ef",
        title: "the group title",
        snippet: "the group snippet",
        description: "the group desc",
        tags: ["the group tags"],
        thumbnail: "smile.png",
      } as common.IGroup;

      const chk = creator._applySourceToCreateOptions(opts, grp, MOCK_USER_SESSION, true);
      expect(chk).toEqual({
        title: "the group title",
        snippet: "the group snippet",
        description: "the group desc",
        tags: ["the group tags"],
        itemIds: [],
        thumbnailurl: "https://myorg.maps.arcgis.com/sharing/rest/community/groups/3ef/info/smile.png",
      });
    });

    it("copies properties and thumbnail for an item", () => {
      const opts = {};

      const itm = {
        id: "3ef",
        title: "the item title",
        snippet: "the item snippet",
        description: "the item desc",
        tags: ["the item tags"],
        thumbnail: "smile.png",
        type: "Web Map",
        owner: "Fred",
        created: 1,
        modified: 2,
        numViews: 3,
        size: 4,
      } as common.IItem;

      const chk = creator._applySourceToCreateOptions(opts, itm, MOCK_USER_SESSION);
      expect(chk).toEqual({
        title: "the item title",
        snippet: "the item snippet",
        description: "the item desc",
        tags: ["the item tags"],
        thumbnailurl: "https://myorg.maps.arcgis.com/sharing/rest/content/items/3ef/info/smile.png",
      });
    });

    it("uses passed title and thumbnailurl", () => {
      const opts = {
        title: "Opts Title",
        thumbnailurl: "https://hub.com/th.png",
      };

      const grp = {
        id: "3ef",
        snippet: "the group snippet",
        description: "the group desc",
        tags: ["the group tags"],
        thumbnail: "smile.png",
      } as common.IGroup;

      const chk = creator._applySourceToCreateOptions(opts, grp, MOCK_USER_SESSION, true);
      expect(chk).toEqual({
        title: "Opts Title",
        snippet: "the group snippet",
        description: "the group desc",
        tags: ["the group tags"],
        itemIds: [],
        thumbnailurl: "https://hub.com/th.png",
      });
    });

    it("skips thumbnail if group does not have one", () => {
      const opts = {};

      const grp = {
        id: "3ef",
        title: "the group title",
        snippet: "the group snippet",
        description: "the group desc",
        tags: ["the group tags"],
        thumbnail: "",
      } as common.IGroup;

      const chk = creator._applySourceToCreateOptions(opts, grp, MOCK_USER_SESSION, true);
      expect(chk).toEqual({
        title: "the group title",
        snippet: "the group snippet",
        description: "the group desc",
        tags: ["the group tags"],
        itemIds: [],
      });
    });
  });

  describe("_getDeploymentProperties", () => {
    it("finds both deployment properties", () => {
      const tags = ["a_tag", "deploy.id.abc", "another_tag", "deploy.version.12.3"];
      const typeKeywords: string[] = creator._getDeploymentProperties(tags);
      expect(typeKeywords).toEqual(["solutionid-abc", "solutionversion-12.3"]);
    });

    it("finds only version deployment property", () => {
      const tags = ["a_tag", "another_tag", "deploy.version.12.3"];
      spyOn(common, "createLongId").and.callFake(() => "guid");
      const typeKeywords: string[] = creator._getDeploymentProperties(tags);
      expect(typeKeywords).toEqual(["solutionid-guid", "solutionversion-12.3"]);
    });

    it("finds only id deployment property", () => {
      const tags = ["a_tag", "deploy.id.abc", "another_tag"];
      const typeKeywords: string[] = creator._getDeploymentProperties(tags);
      expect(typeKeywords).toEqual(["solutionid-abc", "solutionversion-1.0"]);
    });

    it("doesn't find either deployment property", () => {
      const tags = ["a_tag", "another_tag"];
      spyOn(common, "createLongId").and.callFake(() => "guid");
      const typeKeywords: string[] = creator._getDeploymentProperties(tags);
      expect(typeKeywords).toEqual(["solutionid-guid", "solutionversion-1.0"]);
    });
  });

  describe("_getDeploymentProperty", () => {
    it("finds a desired prefix", () => {
      const desiredTagPrefix = "aPrefix";
      const tags = ["abcdef", "aprefixNotValue", "aPrefixValue"];
      const value: string | null = creator._getDeploymentProperty(desiredTagPrefix, tags);
      expect(value).toEqual("Value");
    });

    it("doesn't finds a desired prefix", () => {
      const desiredTagPrefix = "aPrefix";
      const tags = ["abcdef", "aprefixNotValue"];
      const value: string | null = creator._getDeploymentProperty(desiredTagPrefix, tags);
      expect(value).toBeNull();
    });
  });
});
