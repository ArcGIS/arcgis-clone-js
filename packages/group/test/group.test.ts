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
 * Provides tests for common functions involving the creation and deployment of group item types.
 */

import * as group from "../src/group";
import * as utils from "../../common/test/mocks/utils";
const fetchMock = require('fetch-mock');
import * as mockItems from "../../common/test/mocks/agolItems";
import * as templates from "../../common/test/mocks/templates";
import * as common from "@esri/solution-common";

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000; // default is 5000 ms

const resourcesResponse: any = {
  total: 0,
  start: 1,
  num: 0,
  nextStart: -1,
  resources: [],
};

let MOCK_USER_SESSION: common.UserSession;

beforeEach(() => {
  MOCK_USER_SESSION = utils.createRuntimeMockUserSession();
});

afterEach(() => {
  fetchMock.restore();
  resourcesResponse.resources = [];
});

// ------------------------------------------------------------------------------------------------------------------ //

describe("Module `group`: manages the creation and deployment of groups", () => {
  describe("convertItemToTemplate", () => {
    it("should handle error on getGroupBase", async () => {
      const itemTemplate: common.IItemTemplate = templates.getItemTemplateSkeleton();
      itemTemplate.itemId = "abc0cab401af4828a25cc6eaeb59fb69";
      itemTemplate.item = mockItems.getAGOLItem("Group", undefined);
      itemTemplate.item.tags = [];

      const groupResource: any = mockItems.get400Failure();

      const expectedTemplate: any = {
        itemId: "grp1234567890",
        type: "",
        item: {
          id: "{{grp1234567890.itemId}}",
          type: "",
          description: "Description of an AGOL group",
          snippet: "Snippet of an AGOL group",
          title: "An AGOL group",
          tags: [],
          thumbnail: "ROWPermitManager.png",
          typeKeywords: [],
        },
        data: {},
        resources: [],
        dependencies: [],
        groups: [],
        properties: {},
        estimatedDeploymentCostFactor: 2,
      };

      fetchMock
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/groups/grp1234567890?f=json&start=1&num=100&token=fake-token",
          groupResource,
        )
        .get(utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890?f=json&token=fake-token", groupResource)
        .post(utils.PORTAL_SUBSET.restUrl + "/content/items/grp1234567890/resources", resourcesResponse);

      const newItemTemplate = await group.convertItemToTemplate(
        itemTemplate.item,
        MOCK_USER_SESSION,
        MOCK_USER_SESSION,
      );
      delete (newItemTemplate as any).key;
      expect(newItemTemplate).toEqual(expectedTemplate);
    });

    it("should handle error on portal getGroupBase", async () => {
      const itemTemplate: common.IItemTemplate = templates.getItemTemplateSkeleton();
      itemTemplate.itemId = "abc0cab401af4828a25cc6eaeb59fb69";
      itemTemplate.item = mockItems.getAGOLItem("Group", undefined);
      itemTemplate.item.tags = [];

      const groupResource: any = {
        total: 7,
        start: 1,
        num: 7,
        nextStart: -1,
        items: [
          {
            id: "156bf2715e9e4098961c4a2a6848fa20",
            owner: "LocalGovDeployment",
            created: 1550876176000,
            isOrgItem: true,
            modified: 1553045028000,
            guid: null,
            name: "location_9402a6f176f54415ad4b8cb07598f42d",
            title: "Location Tracking",
            type: "Feature Service",
            typeKeywords: [
              "ArcGIS Server",
              "Collector",
              "Data",
              "Feature Access",
              "Feature Service",
              "Feature Service Template",
              "Layer",
              "Layer Template",
              "Location Tracking",
              "Platform",
              "Service",
              "Service template",
              "Template",
              "Hosted Service",
            ],
            description:
              "A feature layer used in the Dam Inspection Assignments Workforce for ArcGIS project to store a record for each point location logged while location tracking is enabled.",
            tags: ["Dam Safety", "Environment", "Natural Resources"],
            snippet:
              "A feature layer used in the Dam Inspection Assignments Workforce for ArcGIS project to store a record for each point location logged while location tracking is enabled.",
            thumbnail: "thumbnail/thumbnail1552925274760.png",
            documentation: null,
            extent: [
              [-131.82999999999555, 16.22999999999945],
              [-57.11999999999807, 58.49999999999802],
            ],
            categories: [],
            spatialReference: null,
            accessInformation: "Esri",
            licenseInfo: null,
            culture: "",
            properties: null,
            url: "https://services7.arcgis.com/org1234567890/arcgis/rest/services/location_9402a6f176f54415ad4b8cb07598f42d/FeatureServer",
            proxyFilter: null,
            access: "public",
            size: 0,
            appCategories: [],
            industries: [],
            languages: [],
            largeThumbnail: null,
            banner: null,
            screenshots: [],
            listed: false,
            numComments: 0,
            numRatings: 0,
            avgRating: 0,
            numViews: 106,
            groupCategories: [],
            scoreCompleteness: 78,
            groupDesignations: null,
          },
        ],
      };

      const expectedTemplate: any = {
        itemId: "grp1234567890",
        type: "Group",
        item: {
          id: "{{grp1234567890.itemId}}",
          type: "",
          description: "Description of an AGOL group",
          snippet: "Snippet of an AGOL group",
          title: "An AGOL group",
          tags: [],
          thumbnail: "ROWPermitManager.png",
          typeKeywords: [],
        },
        data: {},
        resources: [],
        dependencies: [],
        groups: [],
        properties: {},
        estimatedDeploymentCostFactor: 2,
      };

      fetchMock
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/groups/grp1234567890?f=json&start=1&num=100&token=fake-token",
          groupResource,
        )
        .get(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890?f=json&token=fake-token",
          mockItems.get400Failure(),
        )
        .post(utils.PORTAL_SUBSET.restUrl + "/content/items/grp1234567890/resources", resourcesResponse);

      const newItemTemplate = await group.convertItemToTemplate(
        itemTemplate.item,
        MOCK_USER_SESSION,
        MOCK_USER_SESSION,
      );
      delete (newItemTemplate as any).key;
      expect(newItemTemplate).toEqual(expectedTemplate);
    });

    it("should handle a group", async () => {
      const itemTemplate: common.IItemTemplate = templates.getItemTemplateSkeleton();
      itemTemplate.itemId = "abc0cab401af4828a25cc6eaeb59fb69";
      itemTemplate.item = mockItems.getAGOLItem("Group", undefined);

      const groupResource: any = {
        total: 7,
        start: 1,
        num: 7,
        nextStart: -1,
        items: [
          {
            id: "156bf2715e9e4098961c4a2a6848fa20",
            owner: "LocalGovDeployment",
            created: 1550876176000,
            isOrgItem: true,
            modified: 1553045028000,
            guid: null,
            name: "location_9402a6f176f54415ad4b8cb07598f42d",
            title: "Location Tracking",
            type: "Feature Service",
            typeKeywords: [
              "ArcGIS Server",
              "Collector",
              "Data",
              "Feature Access",
              "Feature Service",
              "Feature Service Template",
              "Layer",
              "Layer Template",
              "Location Tracking",
              "Platform",
              "Service",
              "Service template",
              "Template",
              "Hosted Service",
            ],
            description:
              "A feature layer used in the Dam Inspection Assignments Workforce for ArcGIS project to store a record for each point location logged while location tracking is enabled.",
            tags: ["Dam Safety", "Environment", "Natural Resources"],
            snippet:
              "A feature layer used in the Dam Inspection Assignments Workforce for ArcGIS project to store a record for each point location logged while location tracking is enabled.",
            thumbnail: "thumbnail/thumbnail1552925274760.png",
            documentation: null,
            extent: [
              [-131.82999999999555, 16.22999999999945],
              [-57.11999999999807, 58.49999999999802],
            ],
            categories: [],
            spatialReference: null,
            accessInformation: "Esri",
            licenseInfo: null,
            culture: "",
            properties: null,
            url: "https://services7.arcgis.com/org1234567890/arcgis/rest/services/location_9402a6f176f54415ad4b8cb07598f42d/FeatureServer",
            proxyFilter: null,
            access: "public",
            size: 0,
            appCategories: [],
            industries: [],
            languages: [],
            largeThumbnail: null,
            banner: null,
            screenshots: [],
            listed: false,
            numComments: 0,
            numRatings: 0,
            avgRating: 0,
            numViews: 106,
            groupCategories: [],
            scoreCompleteness: 78,
            groupDesignations: null,
          },
        ],
      };

      resourcesResponse.resources.push({ resource: "name.png" });

      const expectedTemplate: any = {
        itemId: "grp1234567890",
        type: "Group",
        item: {
          type: "Group",
          total: 7,
          start: 1,
          num: 7,
          nextStart: -1,
          items: [
            {
              id: "156bf2715e9e4098961c4a2a6848fa20",
              owner: "LocalGovDeployment",
              created: 1550876176000,
              isOrgItem: true,
              modified: 1553045028000,
              guid: null,
              name: "location_9402a6f176f54415ad4b8cb07598f42d",
              title: "Location Tracking",
              type: "Feature Service",
              typeKeywords: [
                "ArcGIS Server",
                "Collector",
                "Data",
                "Feature Access",
                "Feature Service",
                "Feature Service Template",
                "Layer",
                "Layer Template",
                "Location Tracking",
                "Platform",
                "Service",
                "Service template",
                "Template",
                "Hosted Service",
              ],
              description:
                "A feature layer used in the Dam Inspection Assignments Workforce for ArcGIS project to store a record for each point location logged while location tracking is enabled.",
              tags: ["Dam Safety", "Environment", "Natural Resources"],
              snippet:
                "A feature layer used in the Dam Inspection Assignments Workforce for ArcGIS project to store a record for each point location logged while location tracking is enabled.",
              thumbnail: "thumbnail/thumbnail1552925274760.png",
              documentation: null,
              extent: [
                [-131.82999999999555, 16.22999999999945],
                [-57.11999999999807, 58.49999999999802],
              ],
              categories: [],
              spatialReference: null,
              accessInformation: "Esri",
              licenseInfo: null,
              culture: "",
              properties: null,
              url: "https://services7.arcgis.com/org1234567890/arcgis/rest/services/location_9402a6f176f54415ad4b8cb07598f42d/FeatureServer",
              proxyFilter: null,
              access: "public",
              size: 0,
              appCategories: [],
              industries: [],
              languages: [],
              largeThumbnail: null,
              banner: null,
              screenshots: [],
              listed: false,
              numComments: 0,
              numRatings: 0,
              avgRating: 0,
              numViews: 106,
              groupCategories: [],
              scoreCompleteness: 78,
              groupDesignations: null,
            },
          ],
          id: "{{grp1234567890.itemId}}",
        },
        data: {},
        resources: [],
        dependencies: ["156bf2715e9e4098961c4a2a6848fa20"],
        groups: [],
        properties: {},
        estimatedDeploymentCostFactor: 2,
      };

      const blob = new Blob(["fake-blob"], { type: "text/plain" });

      fetchMock
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/groups/grp1234567890?f=json&start=1&num=100&token=fake-token",
          groupResource,
        )
        .get(utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890?f=json&token=fake-token", groupResource)
        .post(utils.PORTAL_SUBSET.restUrl + "/content/items/grp1234567890/resources", resourcesResponse)
        .post(utils.PORTAL_SUBSET.restUrl + "/content/items/grp1234567890/resources/name.png", blob, {
          sendAsJson: false,
        })
        .post(utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890/info/metadata/metadata.xml", blob, {
          sendAsJson: false,
        });

      const actual = await group.convertItemToTemplate(itemTemplate.item, MOCK_USER_SESSION, MOCK_USER_SESSION);
      delete (actual as any).key; // key is randomly generated, and so is not testable
      expect(actual).toEqual(expectedTemplate);
    });

    it("should handle error on getItemResources", async () => {
      const itemTemplate: common.IItemTemplate = templates.getItemTemplateSkeleton();
      itemTemplate.itemId = "abc0cab401af4828a25cc6eaeb59fb69";
      itemTemplate.item = mockItems.getAGOLItem("Group", undefined);

      const groupResource: any = {
        type: "Group",
        total: 7,
        start: 1,
        num: 7,
        nextStart: -1,
        items: [
          {
            id: "156bf2715e9e4098961c4a2a6848fa20",
            owner: "LocalGovDeployment",
            created: 1550876176000,
            isOrgItem: true,
            modified: 1553045028000,
            guid: null,
            name: "location_9402a6f176f54415ad4b8cb07598f42d",
            title: "Location Tracking",
            type: "Feature Service",
            typeKeywords: [
              "ArcGIS Server",
              "Collector",
              "Data",
              "Feature Access",
              "Feature Service",
              "Feature Service Template",
              "Layer",
              "Layer Template",
              "Location Tracking",
              "Platform",
              "Service",
              "Service template",
              "Template",
              "Hosted Service",
            ],
            description:
              "A feature layer used in the Dam Inspection Assignments Workforce for ArcGIS project to store a record for each point location logged while location tracking is enabled.",
            tags: ["Dam Safety", "Environment", "Natural Resources"],
            snippet:
              "A feature layer used in the Dam Inspection Assignments Workforce for ArcGIS project to store a record for each point location logged while location tracking is enabled.",
            thumbnail: "thumbnail/thumbnail1552925274760.png",
            documentation: null,
            extent: [
              [-131.82999999999555, 16.22999999999945],
              [-57.11999999999807, 58.49999999999802],
            ],
            categories: [],
            spatialReference: null,
            accessInformation: "Esri",
            licenseInfo: null,
            culture: "",
            properties: null,
            url: "https://services7.arcgis.com/org1234567890/arcgis/rest/services/location_9402a6f176f54415ad4b8cb07598f42d/FeatureServer",
            proxyFilter: null,
            access: "public",
            size: 0,
            appCategories: [],
            industries: [],
            languages: [],
            largeThumbnail: null,
            banner: null,
            screenshots: [],
            listed: false,
            numComments: 0,
            numRatings: 0,
            avgRating: 0,
            numViews: 106,
            groupCategories: [],
            scoreCompleteness: 78,
            groupDesignations: null,
          },
        ],
      };

      resourcesResponse.resources.push({ resource: "name.png" });

      const expectedTemplate: any = {
        itemId: "grp1234567890",
        type: "Group",
        item: {
          type: "Group",
          total: 7,
          start: 1,
          num: 7,
          nextStart: -1,
          items: [
            {
              id: "156bf2715e9e4098961c4a2a6848fa20",
              owner: "LocalGovDeployment",
              created: 1550876176000,
              isOrgItem: true,
              modified: 1553045028000,
              guid: null,
              name: "location_9402a6f176f54415ad4b8cb07598f42d",
              title: "Location Tracking",
              type: "Feature Service",
              typeKeywords: [
                "ArcGIS Server",
                "Collector",
                "Data",
                "Feature Access",
                "Feature Service",
                "Feature Service Template",
                "Layer",
                "Layer Template",
                "Location Tracking",
                "Platform",
                "Service",
                "Service template",
                "Template",
                "Hosted Service",
              ],
              description:
                "A feature layer used in the Dam Inspection Assignments Workforce for ArcGIS project to store a record for each point location logged while location tracking is enabled.",
              tags: ["Dam Safety", "Environment", "Natural Resources"],
              snippet:
                "A feature layer used in the Dam Inspection Assignments Workforce for ArcGIS project to store a record for each point location logged while location tracking is enabled.",
              thumbnail: "thumbnail/thumbnail1552925274760.png",
              documentation: null,
              extent: [
                [-131.82999999999555, 16.22999999999945],
                [-57.11999999999807, 58.49999999999802],
              ],
              categories: [],
              spatialReference: null,
              accessInformation: "Esri",
              licenseInfo: null,
              culture: "",
              properties: null,
              url: "https://services7.arcgis.com/org1234567890/arcgis/rest/services/location_9402a6f176f54415ad4b8cb07598f42d/FeatureServer",
              proxyFilter: null,
              access: "public",
              size: 0,
              appCategories: [],
              industries: [],
              languages: [],
              largeThumbnail: null,
              banner: null,
              screenshots: [],
              listed: false,
              numComments: 0,
              numRatings: 0,
              avgRating: 0,
              numViews: 106,
              groupCategories: [],
              scoreCompleteness: 78,
              groupDesignations: null,
            },
          ],
          id: "{{grp1234567890.itemId}}",
        },
        data: {},
        resources: [],
        dependencies: ["156bf2715e9e4098961c4a2a6848fa20"],
        groups: [],
        properties: {},
        estimatedDeploymentCostFactor: 2,
      };

      fetchMock
        .get(
          utils.PORTAL_SUBSET.restUrl + "/content/groups/grp1234567890?f=json&start=1&num=100&token=fake-token",
          groupResource,
        )
        .get(utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890?f=json&token=fake-token", groupResource);

      spyOn(common, "getItemResources").and.callFake(() => Promise.reject());

      const actual = await group.convertItemToTemplate(itemTemplate.item, MOCK_USER_SESSION, MOCK_USER_SESSION);
      delete (actual as any).key; // key is randomly generated, and so is not testable
      expect(actual).toEqual(expectedTemplate);
    });
  });

  describe("createItemFromTemplate", () => {
    it("should create group", async () => {
      const itemId: string = "abc9cab401af4828a25cc6eaeb59fb69";
      const newItemID: string = "abc8cab401af4828a25cc6eaeb59fb69";
      const user: any = {
        groups: [],
      };
      const templateDictionary: any = { user };

      const itemTemplate: common.IItemTemplate = templates.getItemTemplateSkeleton();
      itemTemplate.itemId = itemId;
      itemTemplate.type = "Group";
      itemTemplate.item.title = "Dam Inspection Assignments";

      const expected: any = { user, allGroups: [] };
      expected[itemId] = {
        itemId: newItemID,
      };

      fetchMock.post(utils.PORTAL_SUBSET.restUrl + "/community/createGroup", {
        success: true,
        group: { id: newItemID },
      });

      const expectedClone: common.IItemTemplate = common.cloneObject(itemTemplate);
      expectedClone.itemId = newItemID;
      expectedClone.item.thumbnail = undefined;

      const response = await group.createItemFromTemplate(
        itemTemplate,
        templateDictionary,
        MOCK_USER_SESSION,
        utils.ITEM_PROGRESS_CALLBACK,
      );
      expect(response).toEqual({
        item: expectedClone,
        id: newItemID,
        type: itemTemplate.type,
        postProcess: false,
      });
      expect(templateDictionary).toEqual(expected);
    });

    it("should create tracker group", async () => {
      const itemId: string = "abc9cab401af4828a25cc6eaeb59fb69";
      const newItemID: string = "abc8cab401af4828a25cc6eaeb59fb69";
      const user: any = {
        groups: [],
      };
      const owner: string = "TrackingServiceOwner";
      const locationTracking: any = { owner };
      const organization: any = {
        id: "orgid",
      };
      const templateDictionary: any = { user, locationTracking, organization };

      const itemTemplate: common.IItemTemplate = templates.getItemTemplateSkeleton();
      itemTemplate.itemId = itemId;
      itemTemplate.type = "Group";
      itemTemplate.item.title = "Dam Inspection Assignments123";
      itemTemplate.item.tags = ["Location Tracking Group"];

      const expected: any = { user, allGroups: [], locationTracking, organization };
      expected[itemId] = {
        itemId: newItemID,
      };

      fetchMock
        .post(utils.PORTAL_SUBSET.restUrl + "/community/createGroup", {
          success: true,
          group: { id: newItemID },
        })
        .get(
          `${utils.PORTAL_SUBSET.restUrl}/community/groups?f=json&sortField=title&sortOrder=asc&start=1&num=24&q=(owner%3A${owner})%20orgid%3A${organization.id}&token=fake-token`,
          { results: [], nextStart: -1 },
        )
        .post("https://myorg.maps.arcgis.com/sharing/rest/community/groups/abc8cab401af4828a25cc6eaeb59fb69/reassign", {
          success: true,
        })
        .post(
          "https://myorg.maps.arcgis.com/sharing/rest/community/groups/abc8cab401af4828a25cc6eaeb59fb69/removeUsers",
          { notRemoved: [] },
        );

      const expectedClone: common.IItemTemplate = common.cloneObject(itemTemplate);
      expectedClone.itemId = newItemID;
      expectedClone.item.thumbnail = undefined;

      const response = await group.createItemFromTemplate(
        itemTemplate,
        templateDictionary,
        MOCK_USER_SESSION,
        utils.ITEM_PROGRESS_CALLBACK,
      );
      expect(response).toEqual({
        item: expectedClone,
        id: newItemID,
        type: itemTemplate.type,
        postProcess: false,
      });
      expect(templateDictionary).toEqual(expected);
    });

    it("should handle error checking user groups", async () => {
      const itemId: string = "abc9cab401af4828a25cc6eaeb59fb69";
      const newItemID: string = "abc8cab401af4828a25cc6eaeb59fb69";
      const user: any = {
        groups: [],
      };
      const owner: string = "TrackingServiceOwner";
      const locationTracking: any = { owner };
      const organization: any = {
        id: "orgid",
      };
      const templateDictionary: any = { user, locationTracking, organization };

      const itemTemplate: common.IItemTemplate = templates.getItemTemplateSkeleton();
      itemTemplate.itemId = itemId;
      itemTemplate.type = "Group";
      itemTemplate.item.title = "Dam Inspection Assignments123";
      itemTemplate.item.tags = ["Location Tracking Group"];

      const expected: any = { user, allGroups: [], locationTracking, organization };
      expected[itemId] = {
        itemId: newItemID,
      };

      fetchMock
        .post(utils.PORTAL_SUBSET.restUrl + "/community/createGroup", {
          success: true,
          group: { id: newItemID },
        })
        .get(
          `${utils.PORTAL_SUBSET.restUrl}/community/groups?f=json&sortField=title&sortOrder=asc&start=1&num=24&q=(owner%3A${owner})%20orgid%3A${organization.id}&token=fake-token`,
          mockItems.get400Failure(),
        )
        .post("https://myorg.maps.arcgis.com/sharing/rest/community/groups/abc8cab401af4828a25cc6eaeb59fb69/reassign", {
          success: true,
        })
        .post(
          "https://myorg.maps.arcgis.com/sharing/rest/community/groups/abc8cab401af4828a25cc6eaeb59fb69/removeUsers",
          { notRemoved: [] },
        );

      const expectedClone: common.IItemTemplate = common.cloneObject(itemTemplate);
      expectedClone.itemId = newItemID;
      expectedClone.item.thumbnail = undefined;

      return group.createItemFromTemplate(
        itemTemplate,
        templateDictionary,
        MOCK_USER_SESSION,
        utils.ITEM_PROGRESS_CALLBACK,
      );
    });

    it("should handle reassign failure on create tracker group", async () => {
      const itemId: string = "abc9cab401af4828a25cc6eaeb59fb69";
      const newItemID: string = "abc8cab401af4828a25cc6eaeb59fb69";
      const user: any = {
        groups: [],
      };
      const owner: string = "TrackingServiceOwner";
      const locationTracking: any = { owner };
      const organization: any = {
        id: "orgid",
      };
      const templateDictionary: any = { user, locationTracking, organization };

      const itemTemplate: common.IItemTemplate = templates.getItemTemplateSkeleton();
      itemTemplate.itemId = itemId;
      itemTemplate.type = "Group";
      itemTemplate.item.title = "Dam Inspection Assignments123";
      itemTemplate.item.tags = ["Location Tracking Group"];

      const expected: any = { user, allGroups: [], locationTracking, organization };
      expected[itemId] = {
        itemId: newItemID,
      };

      fetchMock
        .post(utils.PORTAL_SUBSET.restUrl + "/community/createGroup", {
          success: true,
          group: { id: newItemID },
        })
        .get(
          `${utils.PORTAL_SUBSET.restUrl}/community/groups?f=json&sortField=title&sortOrder=asc&start=1&num=24&q=(owner%3A${owner})%20orgid%3A${organization.id}&token=fake-token`,
          { results: [], nextStart: 0 },
        )
        .post("https://myorg.maps.arcgis.com/sharing/rest/community/groups/abc8cab401af4828a25cc6eaeb59fb69/reassign", {
          success: false,
        });

      const expectedClone: common.IItemTemplate = common.cloneObject(itemTemplate);
      expectedClone.itemId = newItemID;
      expectedClone.item.thumbnail = undefined;

      const response = await group.createItemFromTemplate(
        itemTemplate,
        templateDictionary,
        MOCK_USER_SESSION,
        utils.ITEM_PROGRESS_CALLBACK,
      );
      expect(response).toEqual(templates.getFailedItem("Group"));
    });

    it("should handle cancellation after reassign on create tracker group", async () => {
      const itemId: string = "abc9cab401af4828a25cc6eaeb59fb69";
      const newItemID: string = "abc8cab401af4828a25cc6eaeb59fb69";
      const user: any = {
        groups: [],
      };
      const owner: string = "TrackingServiceOwner";
      const locationTracking: any = { owner };
      const organization: any = {
        id: "orgid",
      };
      const templateDictionary: any = { user, locationTracking, organization };

      const itemTemplate: common.IItemTemplate = templates.getItemTemplateSkeleton();
      itemTemplate.itemId = itemId;
      itemTemplate.type = "Group";
      itemTemplate.item.title = "Dam Inspection Assignments123";
      itemTemplate.item.tags = ["Location Tracking Group"];

      const expected: any = { user, allGroups: [], locationTracking, organization };
      expected[itemId] = {
        itemId: newItemID,
      };

      fetchMock
        .post(utils.PORTAL_SUBSET.restUrl + "/community/createGroup", {
          success: true,
          group: { id: newItemID },
        })
        .get(
          `${utils.PORTAL_SUBSET.restUrl}/community/groups?f=json&sortField=title&sortOrder=asc&start=1&num=24&q=(owner%3A${owner})%20orgid%3A${organization.id}&token=fake-token`,
          { results: [], nextStart: 0 },
        )
        .post("https://myorg.maps.arcgis.com/sharing/rest/community/groups/abc8cab401af4828a25cc6eaeb59fb69/reassign", {
          success: true,
        })
        .post("https://myorg.maps.arcgis.com/sharing/rest/community/groups/abc8cab401af4828a25cc6eaeb59fb69/delete", {
          success: true,
        });

      const expectedClone: common.IItemTemplate = common.cloneObject(itemTemplate);
      expectedClone.itemId = newItemID;
      expectedClone.item.thumbnail = undefined;

      const response = await group.createItemFromTemplate(
        itemTemplate,
        templateDictionary,
        MOCK_USER_SESSION,
        utils.createFailingItemProgressCallbackOnNthCall(4),
      );
      expect(response).toEqual(templates.getFailedItem("Group"));
    });

    it("should handle cancellation failure after reassign on create tracker group", async () => {
      const itemId: string = "abc9cab401af4828a25cc6eaeb59fb69";
      const newItemID: string = "abc8cab401af4828a25cc6eaeb59fb69";
      const user: any = {
        groups: [],
      };
      const owner: string = "TrackingServiceOwner";
      const locationTracking: any = { owner };
      const organization: any = {
        id: "orgid",
      };
      const templateDictionary: any = { user, locationTracking, organization };

      const itemTemplate: common.IItemTemplate = templates.getItemTemplateSkeleton();
      itemTemplate.itemId = itemId;
      itemTemplate.type = "Group";
      itemTemplate.item.title = "Dam Inspection Assignments123";
      itemTemplate.item.tags = ["Location Tracking Group"];

      const expected: any = { user, allGroups: [], locationTracking, organization };
      expected[itemId] = {
        itemId: newItemID,
      };

      fetchMock
        .post(utils.PORTAL_SUBSET.restUrl + "/community/createGroup", {
          success: true,
          group: { id: newItemID },
        })
        .get(
          `${utils.PORTAL_SUBSET.restUrl}/community/groups?f=json&sortField=title&sortOrder=asc&start=1&num=24&q=(owner%3A${owner})%20orgid%3A${organization.id}&token=fake-token`,
          { results: [], nextStart: 0 },
        )
        .post("https://myorg.maps.arcgis.com/sharing/rest/community/groups/abc8cab401af4828a25cc6eaeb59fb69/reassign", {
          success: true,
        })
        .post(
          "https://myorg.maps.arcgis.com/sharing/rest/community/groups/abc8cab401af4828a25cc6eaeb59fb69/delete",
          utils.getFailureResponse({ groupId: itemTemplate.itemId }),
        );

      const expectedClone: common.IItemTemplate = common.cloneObject(itemTemplate);
      expectedClone.itemId = newItemID;
      expectedClone.item.thumbnail = undefined;

      const response = await group.createItemFromTemplate(
        itemTemplate,
        templateDictionary,
        MOCK_USER_SESSION,
        utils.createFailingItemProgressCallbackOnNthCall(4),
      );
      expect(response).toEqual(templates.getFailedItem("Group"));
    });

    it("should handle failure to remove users on create tracker group", async () => {
      const itemId: string = "abc9cab401af4828a25cc6eaeb59fb69";
      const newItemID: string = "abc8cab401af4828a25cc6eaeb59fb69";
      const user: any = {
        groups: [],
      };
      const owner: string = "TrackingServiceOwner";
      const locationTracking: any = { owner };
      const organization: any = {
        id: "orgid",
      };
      const templateDictionary: any = { user, locationTracking, organization };

      const itemTemplate: common.IItemTemplate = templates.getItemTemplateSkeleton();
      itemTemplate.itemId = itemId;
      itemTemplate.type = "Group";
      itemTemplate.item.title = "Dam Inspection Assignments123";
      itemTemplate.item.tags = ["Location Tracking Group"];

      const expected: any = { user, allGroups: [], locationTracking, organization };
      expected[itemId] = {
        itemId: newItemID,
      };

      fetchMock
        .post(utils.PORTAL_SUBSET.restUrl + "/community/createGroup", {
          success: true,
          group: { id: newItemID },
        })
        .get(
          `${utils.PORTAL_SUBSET.restUrl}/community/groups?f=json&sortField=title&sortOrder=asc&start=1&num=24&q=(owner%3A${owner})%20orgid%3A${organization.id}&token=fake-token`,
          { results: [], nextStart: 0 },
        )
        .post("https://myorg.maps.arcgis.com/sharing/rest/community/groups/abc8cab401af4828a25cc6eaeb59fb69/reassign", {
          success: true,
        })
        .post(
          "https://myorg.maps.arcgis.com/sharing/rest/community/groups/abc8cab401af4828a25cc6eaeb59fb69/removeUsers",
          { notRemoved: [itemId] },
        );

      const expectedClone: common.IItemTemplate = common.cloneObject(itemTemplate);
      expectedClone.itemId = newItemID;
      expectedClone.item.thumbnail = undefined;

      const response = await group.createItemFromTemplate(
        itemTemplate,
        templateDictionary,
        MOCK_USER_SESSION,
        utils.ITEM_PROGRESS_CALLBACK,
      );
      expect(response).toEqual(templates.getFailedItem("Group"));
    });

    it("should handle cancellation after remove users on create tracker group", async () => {
      const itemId: string = "abc9cab401af4828a25cc6eaeb59fb69";
      const newItemID: string = "abc8cab401af4828a25cc6eaeb59fb69";
      const user: any = {
        groups: [],
      };
      const owner: string = "TrackingServiceOwner";
      const locationTracking: any = { owner };
      const organization: any = {
        id: "orgid",
      };
      const templateDictionary: any = { user, locationTracking, organization };

      const itemTemplate: common.IItemTemplate = templates.getItemTemplateSkeleton();
      itemTemplate.itemId = itemId;
      itemTemplate.type = "Group";
      itemTemplate.item.title = "Dam Inspection Assignments123";
      itemTemplate.item.tags = ["Location Tracking Group"];

      const expected: any = { user, allGroups: [], locationTracking, organization };
      expected[itemId] = {
        itemId: newItemID,
      };

      fetchMock
        .post(utils.PORTAL_SUBSET.restUrl + "/community/createGroup", {
          success: true,
          group: { id: newItemID },
        })
        .get(
          `${utils.PORTAL_SUBSET.restUrl}/community/groups?f=json&sortField=title&sortOrder=asc&start=1&num=24&q=(owner%3A${owner})%20orgid%3A${organization.id}&token=fake-token`,
          { results: [], nextStart: 0 },
        )
        .post("https://myorg.maps.arcgis.com/sharing/rest/community/groups/abc8cab401af4828a25cc6eaeb59fb69/reassign", {
          success: true,
        })
        .post(
          "https://myorg.maps.arcgis.com/sharing/rest/community/groups/abc8cab401af4828a25cc6eaeb59fb69/removeUsers",
          { notRemoved: [] },
        )
        .post("https://myorg.maps.arcgis.com/sharing/rest/community/groups/abc8cab401af4828a25cc6eaeb59fb69/delete", {
          success: true,
        });

      const expectedClone: common.IItemTemplate = common.cloneObject(itemTemplate);
      expectedClone.itemId = newItemID;
      expectedClone.item.thumbnail = undefined;

      const response = await group.createItemFromTemplate(
        itemTemplate,
        templateDictionary,
        MOCK_USER_SESSION,
        utils.createFailingItemProgressCallbackOnNthCall(5),
      );
      expect(response).toEqual(templates.getFailedItem("Group"));
    });

    it("should handle cancellation failure after remove users on create tracker group", async () => {
      const itemId: string = "abc9cab401af4828a25cc6eaeb59fb69";
      const newItemID: string = "abc8cab401af4828a25cc6eaeb59fb69";
      const user: any = {
        groups: [],
      };
      const owner: string = "TrackingServiceOwner";
      const locationTracking: any = { owner };
      const organization: any = {
        id: "orgid",
      };
      const templateDictionary: any = { user, locationTracking, organization };

      const itemTemplate: common.IItemTemplate = templates.getItemTemplateSkeleton();
      itemTemplate.itemId = itemId;
      itemTemplate.type = "Group";
      itemTemplate.item.title = "Dam Inspection Assignments123";
      itemTemplate.item.tags = ["Location Tracking Group"];

      const expected: any = { user, allGroups: [], locationTracking, organization };
      expected[itemId] = {
        itemId: newItemID,
      };

      fetchMock
        .post(utils.PORTAL_SUBSET.restUrl + "/community/createGroup", {
          success: true,
          group: { id: newItemID },
        })
        .get(
          `${utils.PORTAL_SUBSET.restUrl}/community/groups?f=json&sortField=title&sortOrder=asc&start=1&num=24&q=(owner%3A${owner})%20orgid%3A${organization.id}&token=fake-token`,
          { results: [], nextStart: 0 },
        )
        .post("https://myorg.maps.arcgis.com/sharing/rest/community/groups/abc8cab401af4828a25cc6eaeb59fb69/reassign", {
          success: true,
        })
        .post(
          "https://myorg.maps.arcgis.com/sharing/rest/community/groups/abc8cab401af4828a25cc6eaeb59fb69/removeUsers",
          { notRemoved: [] },
        )
        .post(
          "https://myorg.maps.arcgis.com/sharing/rest/community/groups/abc8cab401af4828a25cc6eaeb59fb69/delete",
          utils.getFailureResponse({ groupId: itemTemplate.itemId }),
        );

      const expectedClone: common.IItemTemplate = common.cloneObject(itemTemplate);
      expectedClone.itemId = newItemID;
      expectedClone.item.thumbnail = undefined;

      const response = await group.createItemFromTemplate(
        itemTemplate,
        templateDictionary,
        MOCK_USER_SESSION,
        utils.createFailingItemProgressCallbackOnNthCall(5),
      );
      expect(response).toEqual(templates.getFailedItem("Group"));
    });

    it("should create group with thumbnail", async () => {
      const itemId: string = "abc9cab401af4828a25cc6eaeb59fb69";
      const newItemID: string = "abc8cab401af4828a25cc6eaeb59fb69";
      const user: any = {
        groups: [],
      };
      const templateDictionary: any = { user };

      const itemTemplate: common.IItemTemplate = templates.getItemTemplateSkeleton();
      itemTemplate.itemId = itemId;
      itemTemplate.type = "Group";
      itemTemplate.item.title = "Dam Inspection Assignments";
      itemTemplate.item.thumbnailurl = "abc9cab401af4828a25cc6eaeb59fb69_info_thumbnail/ago_downloaded.png";

      const expected: any = { user, allGroups: [] };
      expected[itemId] = {
        itemId: newItemID,
      };

      fetchMock
        .get(
          utils.PORTAL_SUBSET.restUrl +
            "/content/items/abc9cab401af4828a25cc6eaeb59fb69/resources/" +
            itemTemplate.item.thumbnail,
          utils.getSampleImageAsBlob(),
        )
        .post(utils.PORTAL_SUBSET.restUrl + "/community/createGroup", {
          success: true,
          group: { id: newItemID },
        });

      const expectedClone: common.IItemTemplate = common.cloneObject(itemTemplate);
      expectedClone.itemId = newItemID;
      expectedClone.item.thumbnail = undefined;

      const response = await group.createItemFromTemplate(
        itemTemplate,
        templateDictionary,
        MOCK_USER_SESSION,
        utils.ITEM_PROGRESS_CALLBACK,
      );
      expect(response).toEqual({
        item: expectedClone,
        id: newItemID,
        type: itemTemplate.type,
        postProcess: false,
      });
      expect(templateDictionary).toEqual(expected);
    });

    it("should handle success === false on create group", async () => {
      const itemId: string = "abc9cab401af4828a25cc6eaeb59fb69";
      const user: any = {
        groups: [],
      };
      const templateDictionary: any = { user };

      const itemTemplate: common.IItemTemplate = templates.getItemTemplateSkeleton();
      itemTemplate.itemId = itemId;
      itemTemplate.type = "Group";
      itemTemplate.item.title = undefined;

      fetchMock.post(utils.PORTAL_SUBSET.restUrl + "/community/createGroup", {
        success: false,
      });

      const response = await group.createItemFromTemplate(
        itemTemplate,
        templateDictionary,
        MOCK_USER_SESSION,
        utils.ITEM_PROGRESS_CALLBACK,
      );
      expect(response).toEqual(templates.getFailedItem("Group"));
    });

    it("should handle error on create group", async () => {
      const itemId: string = "abc9cab401af4828a25cc6eaeb59fb69";
      const user: any = {
        groups: [],
      };
      const templateDictionary: any = { user };

      const itemTemplate: common.IItemTemplate = templates.getItemTemplateSkeleton();
      itemTemplate.itemId = itemId;
      itemTemplate.type = "Group";
      itemTemplate.item.title = "Dam Inspection Assignments";

      fetchMock.post(utils.PORTAL_SUBSET.restUrl + "/community/createGroup", mockItems.get400Failure());

      const response = await group.createItemFromTemplate(
        itemTemplate,
        templateDictionary,
        MOCK_USER_SESSION,
        utils.ITEM_PROGRESS_CALLBACK,
      );
      expect(response).toEqual(templates.getFailedItem("Group"));
    });

    it("should handle cancellation before deployment of group starts", async () => {
      const itemTemplate: common.IItemTemplate = templates.getGroupTemplatePart();
      const templateDictionary: any = {};

      const response = await group.createItemFromTemplate(
        itemTemplate,
        templateDictionary,
        MOCK_USER_SESSION,
        utils.createFailingItemProgressCallbackOnNthCall(1),
      );
      expect(response).toEqual(templates.getFailedItem(itemTemplate.type));
    });

    it("should handle cancellation after deployed group is created", async () => {
      const itemTemplate: common.IItemTemplate = templates.getGroupTemplatePart();
      const templateDictionary: any = {
        user: {
          groups: [],
        },
      };

      fetchMock
        .post(utils.PORTAL_SUBSET.restUrl + "/community/createGroup", {
          success: true,
          group: { id: itemTemplate.itemId },
        })
        .post(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890/delete",
          utils.getSuccessResponse({ groupId: itemTemplate.itemId }),
        );

      const response = await group.createItemFromTemplate(
        itemTemplate,
        templateDictionary,
        MOCK_USER_SESSION,
        utils.createFailingItemProgressCallbackOnNthCall(2),
      );
      expect(response).toEqual(templates.getFailedItem(itemTemplate.type));
    });

    it("should handle cancellation failure after deployed group is created", async () => {
      const itemTemplate: common.IItemTemplate = templates.getGroupTemplatePart();
      const templateDictionary: any = {
        user: {
          groups: [],
        },
      };

      fetchMock
        .post(utils.PORTAL_SUBSET.restUrl + "/community/createGroup", {
          success: true,
          group: { id: itemTemplate.itemId },
        })
        .post(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890/delete",
          utils.getFailureResponse({ groupId: itemTemplate.itemId }),
        );

      const response = await group.createItemFromTemplate(
        itemTemplate,
        templateDictionary,
        MOCK_USER_SESSION,
        utils.createFailingItemProgressCallbackOnNthCall(2),
      );
      expect(response).toEqual(templates.getFailedItem(itemTemplate.type));
    });

    it("should handle cancellation after deployed group is finished", async () => {
      const itemTemplate: common.IItemTemplate = templates.getGroupTemplatePart();
      const templateDictionary: any = {
        user: {
          groups: [],
        },
      };

      fetchMock
        .post(utils.PORTAL_SUBSET.restUrl + "/community/createGroup", {
          success: true,
          group: { id: itemTemplate.itemId },
        })
        .post(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890/delete",
          utils.getSuccessResponse({ groupId: itemTemplate.itemId }),
        );

      const response = await group.createItemFromTemplate(
        itemTemplate,
        templateDictionary,
        MOCK_USER_SESSION,
        utils.createFailingItemProgressCallbackOnNthCall(3),
      );
      expect(response).toEqual(templates.getFailedItem(itemTemplate.type));
    });

    it("should handle cancellation after deployed group is finished", async () => {
      const itemTemplate: common.IItemTemplate = templates.getGroupTemplatePart();
      const templateDictionary: any = {
        user: {
          groups: [],
        },
      };

      fetchMock
        .post(utils.PORTAL_SUBSET.restUrl + "/community/createGroup", {
          success: true,
          group: { id: itemTemplate.itemId },
        })
        .post(
          utils.PORTAL_SUBSET.restUrl + "/community/groups/grp1234567890/delete",
          utils.getFailureResponse({ groupId: itemTemplate.itemId }),
        );

      const response = await group.createItemFromTemplate(
        itemTemplate,
        templateDictionary,
        MOCK_USER_SESSION,
        utils.createFailingItemProgressCallbackOnNthCall(3),
      );
      expect(response).toEqual(templates.getFailedItem(itemTemplate.type));
    });

    it("should handle post process of group", async () => {
      const itemId: string = "abc9cab401af4828a25cc6eaeb59fb69";
      const templateDictionary: any = { bbb9cab401af4828a25cc6eaeb59fb69: { url: "http://correct" } };

      const itemTemplate: common.IItemTemplate = templates.getItemTemplateSkeleton();
      itemTemplate.itemId = itemId;
      itemTemplate.type = "Group";
      itemTemplate.item.title = "Dam Inspection Assignments";
      itemTemplate.item.description = "A path {{bbb9cab401af4828a25cc6eaeb59fb69.url}}";
      itemTemplate.item.id = itemId;
      const itemInfos = [{ id: itemId, item: itemTemplate }];

      fetchMock.post(`${utils.PORTAL_SUBSET.restUrl}/community/groups/${itemId}/update`, {
        success: true,
        group: { id: itemId },
      });

      return group.postProcess(
        itemId,
        "Group",
        itemInfos,
        itemTemplate,
        [itemTemplate],
        templateDictionary,
        MOCK_USER_SESSION,
      );
    });

    it("should handle failure to post process group", async () => {
      const itemId: string = "abc9cab401af4828a25cc6eaeb59fb69";
      const templateDictionary: any = { bbb9cab401af4828a25cc6eaeb59fb69: { url: "http://correct" } };

      const itemTemplate: common.IItemTemplate = templates.getItemTemplateSkeleton();
      itemTemplate.itemId = itemId;
      itemTemplate.type = "Group";
      itemTemplate.item.title = "Dam Inspection Assignments";
      itemTemplate.item.description = "A path {{bbb9cab401af4828a25cc6eaeb59fb69.url}}";
      itemTemplate.item.id = itemId;
      const itemInfos = [{ id: itemId, item: itemTemplate }];

      fetchMock.post(`${utils.PORTAL_SUBSET.restUrl}/community/groups/${itemId}/update`, {
        success: false,
        groupId: itemId,
      });

      return group
        .postProcess(itemId, "Group", itemInfos, itemTemplate, [itemTemplate], templateDictionary, MOCK_USER_SESSION)
        .then(
          () => fail(),
          (e) => {
            expect(e.success).toEqual(false);
            return Promise.resolve();
          },
        );
    });
  });

  describe("_initializeNewGroup", () => {
    it("copies required properties", () => {
      const sourceGroup: common.IItemGeneralized = {
        id: "grp1234567890",
        type: "Group",

        access: "private",
        title: "title property",
      };

      const newGroup = group._initializeNewGroup(sourceGroup);

      const expectedNewGroup: common.IGroupAdd = {
        access: "private",
        description: undefined,
        owner: undefined,
        snippet: undefined,
        tags: undefined,
        thumbnail: undefined,
        title: "title property",
        typeKeywords: undefined,
      };
      expect(newGroup).toEqual(expectedNewGroup);
    });

    it("copies properties that we always want to copy", () => {
      const sourceGroup: common.IItemGeneralized = {
        id: "grp1234567890",
        type: "Group",

        access: "private",
        description: "description property",
        owner: "owner property",
        snippet: "snippet property",
        tags: ["tags property 1", "tags property 2"],
        thumbnail: "thumbnail property",
        title: "title property",
        typeKeywords: ["typeKeywords property 1", "typeKeywords property 2"],
      };

      const newGroup = group._initializeNewGroup(sourceGroup);

      const expectedNewGroup: common.IGroupAdd = {
        access: "private",
        description: "description property",
        owner: "owner property",
        snippet: "snippet property",
        tags: ["tags property 1", "tags property 2"],
        thumbnail: "thumbnail property",
        title: "title property",
        typeKeywords: ["typeKeywords property 1", "typeKeywords property 2"],
      };
      expect(newGroup).toEqual(expectedNewGroup);
    });

    it("handles nulls in properties that we always want to copy", () => {
      const sourceGroup: common.IItemGeneralized = {
        id: "grp1234567890",
        type: "Group",

        access: "org",
        description: undefined,
        owner: undefined,
        snippet: undefined,
        tags: undefined,
        thumbnail: undefined,
        title: "title property",
        typeKeywords: undefined,
      };

      const newGroup = group._initializeNewGroup(sourceGroup);

      const expectedNewGroup: common.IGroupAdd = {
        access: "private",
        description: undefined,
        owner: undefined,
        snippet: undefined,
        tags: undefined,
        thumbnail: undefined,
        title: "title property",
        typeKeywords: undefined,
      };
      expect(newGroup).toEqual(expectedNewGroup);
    });

    it("copies optional properties", () => {
      const sourceGroup: common.IItemGeneralized = {
        id: "grp1234567890",
        type: "Group",

        access: "public",
        description: undefined,
        owner: undefined,
        snippet: undefined,
        tags: undefined,
        thumbnail: undefined,
        title: "title property",
        typeKeywords: ["typeKeywords property 1", "typeKeywords property 2"],

        autoJoin: true,
        displaySettings: true,
        isInvitationOnly: true,
        isOpenData: true,
        isViewOnly: true,
        membershipAccess: "membershipAccess property",
        properties: {
          featuredItemIds: [
            "{{312f7d21b9024e8cb977709541ae6a16.itemId}}",
            "{{f35c3102c054414c81760958b726be3a.itemId}}",
            "{{d8e86c5937da4691a09a050eefc65bb6.itemId}}",
            "{{e0eccb81ee0c47eb8fd9189a3edb1fae.itemId}}",
          ],
          isFeatured: true,
        },
        sortField: "modified",
        sortOrder: "asc",
      };

      const newGroup = group._initializeNewGroup(sourceGroup);

      const expectedNewGroup: common.IGroupAdd = {
        access: "private",
        description: undefined,
        owner: undefined,
        snippet: undefined,
        tags: undefined,
        thumbnail: undefined,
        title: "title property",
        typeKeywords: ["typeKeywords property 1", "typeKeywords property 2"],

        autoJoin: true,
        displaySettings: true,
        isInvitationOnly: true,
        isOpenData: true,
        isViewOnly: true,
        membershipAccess: "membershipAccess property",
        properties: {
          featuredItemIds: [
            "{{312f7d21b9024e8cb977709541ae6a16.itemId}}",
            "{{f35c3102c054414c81760958b726be3a.itemId}}",
            "{{d8e86c5937da4691a09a050eefc65bb6.itemId}}",
            "{{e0eccb81ee0c47eb8fd9189a3edb1fae.itemId}}",
          ],
          isFeatured: true,
        },
        sortField: "modified",
        sortOrder: "asc",
      };
      expect(newGroup).toEqual(expectedNewGroup);
    });

    it("copies ignores optional properties that aren't wanted", () => {
      const sourceGroup: common.IItemGeneralized = {
        id: "grp1234567890",
        type: "Group",

        access: "public",
        description: undefined,
        owner: undefined,
        snippet: undefined,
        tags: undefined,
        thumbnail: undefined,
        title: "title property",
        typeKeywords: ["typeKeywords property 1", "typeKeywords property 2"],

        autoJoin: true,
        displaySettings: true,
        isInvitationOnly: true,

        unwanted1: "unwanted property 1",
        unwanted2: "unwanted property 2",
        unwanted3: "unwanted property 3",
      };

      const newGroup = group._initializeNewGroup(sourceGroup);

      const expectedNewGroup: common.IGroupAdd = {
        access: "private",
        description: undefined,
        owner: undefined,
        snippet: undefined,
        tags: undefined,
        thumbnail: undefined,
        title: "title property",
        typeKeywords: ["typeKeywords property 1", "typeKeywords property 2"],

        autoJoin: true,
        displaySettings: true,
        isInvitationOnly: true,
      };
      expect(newGroup).toEqual(expectedNewGroup);
    });
  });
});
