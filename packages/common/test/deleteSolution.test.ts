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

/**
 * Provides tests for functions for deleting a deployed Solution item and all of the items that were created
 * as part of that deployment.
 */

import * as createHRO from "../src/create-hub-request-options";
import * as deleteEmptyGroups from "../src/deleteHelpers/deleteEmptyGroups";
import * as deleteGroupIfEmpty from "../src/deleteHelpers/deleteGroupIfEmpty";
import * as deleteSolution from "../src/deleteSolution";
import * as deleteSolutionContents from "../src/deleteHelpers/deleteSolutionContents";
import * as hubSites from "@esri/hub-sites";
import * as interfaces from "../src/interfaces";
import * as mockItems from "../../common/test/mocks/agolItems";
import * as portal from "@esri/arcgis-rest-portal";
import * as restHelpers from "../src/restHelpers";
import * as restHelpersGet from "../src/restHelpersGet";
import * as utils from "./mocks/utils";
import * as getDeletableSolutionInfo from "../src/getDeletableSolutionInfo";
import * as getSolutionSummary from "../src/getSolutionSummary";
import * as deleteSolutionFolder from "../src/deleteHelpers/deleteSolutionFolder";
import * as removeItems from "../src/deleteHelpers/removeItems";
import * as reportProgress from "../src/deleteHelpers/reportProgress";
import * as reconstructBuildOrderIds from "../src/deleteHelpers/reconstructBuildOrderIds";

let MOCK_USER_SESSION: interfaces.UserSession;

beforeEach(() => {
  MOCK_USER_SESSION = utils.createRuntimeMockUserSession();
});

// ------------------------------------------------------------------------------------------------------------------ //

describe("Module `deleteSolution`: functions for deleting a deployed Solution item and all of its items", () => {
  describe("deleteEmptyGroups", () => {
    it("handles an empty list", async () => {
      const deleteGroupIfEmptySpy = spyOn(deleteGroupIfEmpty, "deleteGroupIfEmpty").and.resolveTo(true);

      const result = await deleteEmptyGroups.deleteEmptyGroups([], MOCK_USER_SESSION);
      expect(result).toEqual([]);
      expect(deleteGroupIfEmptySpy.calls.count()).toEqual(0);
    });

    it("handles a single item", async () => {
      const deleteGroupIfEmptySpy = spyOn(deleteGroupIfEmpty, "deleteGroupIfEmpty").and.resolveTo(true);

      const result = await deleteEmptyGroups.deleteEmptyGroups(["grp1234567890"], MOCK_USER_SESSION);
      expect(result).toEqual(["grp1234567890"]);
      expect(deleteGroupIfEmptySpy.calls.count()).toEqual(1);
    });

    it("handles multiple items", async () => {
      const deleteGroupIfEmptySpy = spyOn(deleteGroupIfEmpty, "deleteGroupIfEmpty").and.resolveTo(true);

      const result = await deleteEmptyGroups.deleteEmptyGroups(["grp1234567890", "grp1234567891"], MOCK_USER_SESSION);
      expect(result).toEqual(["grp1234567890", "grp1234567891"]);
      expect(deleteGroupIfEmptySpy.calls.count()).toEqual(2);
    });

    it("handles failure", async () => {
      const deleteGroupIfEmptySpy = spyOn(deleteGroupIfEmpty, "deleteGroupIfEmpty").and.returnValues(
        Promise.resolve(true),
        Promise.resolve(false),
        Promise.resolve(true),
      );

      const result = await deleteEmptyGroups.deleteEmptyGroups(
        ["grp1234567890", "grp1234567891", "grp1234567892"],
        MOCK_USER_SESSION,
      );
      expect(result).toEqual(["grp1234567890", "grp1234567892"]);
      expect(deleteGroupIfEmptySpy.calls.count()).toEqual(3);
    });
  });

  describe("deleteGroupIfEmpty", () => {
    it("deletes an empty protected group that we own", async () => {
      const group = mockItems.getAGOLGroup("grp1234567890", "casey");
      group.protected = true;

      const getGroupSpy = spyOn(portal, "getGroup").and.resolveTo(group);
      const getGroupContentSpy = spyOn(portal, "getGroupContent").and.resolveTo(mockItems.getAGOLGroupContentsList(0));
      const unprotectGroupSpy = spyOn(portal, "unprotectGroup").and.resolveTo({
        success: true,
      });
      const removeGroupSpy = spyOn(portal, "removeGroup").and.resolveTo({
        success: true,
      });

      const result = await deleteGroupIfEmpty.deleteGroupIfEmpty("grp1234567890", MOCK_USER_SESSION);
      expect(result).toBeTruthy();
      expect(getGroupSpy.calls.count()).withContext("getGroupSpy").toEqual(1);
      expect(getGroupContentSpy.calls.count()).withContext("getGroupContentSpy").toEqual(1);
      expect(unprotectGroupSpy.calls.count()).withContext("unprotectGroupSpy").toEqual(1);
      expect(removeGroupSpy.calls.count()).withContext("removeGroupSpy").toEqual(1);
    });

    it("deletes an empty unprotected group that we own", async () => {
      const getGroupSpy = spyOn(portal, "getGroup").and.resolveTo(mockItems.getAGOLGroup("grp1234567890", "casey"));
      const getGroupContentSpy = spyOn(portal, "getGroupContent").and.resolveTo(mockItems.getAGOLGroupContentsList(0));
      const unprotectGroupSpy = spyOn(portal, "unprotectGroup").and.resolveTo({
        success: true,
      });
      const removeGroupSpy = spyOn(portal, "removeGroup").and.resolveTo({
        success: true,
      });

      const result = await deleteGroupIfEmpty.deleteGroupIfEmpty("grp1234567890", MOCK_USER_SESSION);
      expect(result).toBeTruthy();
      expect(getGroupSpy.calls.count()).withContext("getGroupSpy").toEqual(1);
      expect(getGroupContentSpy.calls.count()).withContext("getGroupContentSpy").toEqual(1);
      expect(unprotectGroupSpy.calls.count()).withContext("unprotectGroupSpy").toEqual(0);
      expect(removeGroupSpy.calls.count()).withContext("removeGroupSpy").toEqual(1);
    });

    it("does not delete an empty group that we don't own", async () => {
      const getGroupSpy = spyOn(portal, "getGroup").and.resolveTo(mockItems.getAGOLGroup());
      const getGroupContentSpy = spyOn(portal, "getGroupContent").and.resolveTo(mockItems.getAGOLGroupContentsList(0));
      const unprotectGroupSpy = spyOn(portal, "unprotectGroup").and.resolveTo({
        success: true,
      });
      const removeGroupSpy = spyOn(portal, "removeGroup").and.resolveTo({
        success: true,
      });

      const result = await deleteGroupIfEmpty.deleteGroupIfEmpty("grp1234567890", MOCK_USER_SESSION);
      expect(result).toBeFalsy();
      expect(getGroupSpy.calls.count()).withContext("getGroupSpy").toEqual(1);
      expect(getGroupContentSpy.calls.count()).withContext("getGroupContentSpy").toEqual(0);
      expect(unprotectGroupSpy.calls.count()).withContext("unprotectGroupSpy").toEqual(0);
      expect(removeGroupSpy.calls.count()).withContext("removeGroupSpy").toEqual(0);
    });

    it("does not delete a non-empty group that we own", async () => {
      const getGroupSpy = spyOn(portal, "getGroup").and.resolveTo(mockItems.getAGOLGroup("grp1234567890", "casey"));
      const getGroupContentSpy = spyOn(portal, "getGroupContent").and.resolveTo(mockItems.getAGOLGroupContentsList(1));
      const unprotectGroupSpy = spyOn(portal, "unprotectGroup").and.resolveTo({
        success: true,
      });
      const removeGroupSpy = spyOn(portal, "removeGroup").and.resolveTo({
        success: true,
      });

      const result = await deleteGroupIfEmpty.deleteGroupIfEmpty("grp1234567890", MOCK_USER_SESSION);
      expect(result).toBeFalsy();
      expect(getGroupSpy.calls.count()).withContext("getGroupSpy").toEqual(1);
      expect(getGroupContentSpy.calls.count()).withContext("getGroupContentSpy").toEqual(1);
      expect(unprotectGroupSpy.calls.count()).withContext("unprotectGroupSpy").toEqual(0);
      expect(removeGroupSpy.calls.count()).withContext("removeGroupSpy").toEqual(0);
    });

    it("does not delete group if we fail to get the group info", async () => {
      const getGroupSpy = spyOn(portal, "getGroup").and.rejectWith(mockItems.get400Failure());
      const getGroupContentSpy = spyOn(portal, "getGroupContent").and.resolveTo(mockItems.getAGOLGroupContentsList(0));
      const unprotectGroupSpy = spyOn(portal, "unprotectGroup").and.resolveTo({
        success: true,
      });
      const removeGroupSpy = spyOn(portal, "removeGroup").and.resolveTo({
        success: true,
      });

      const result = await deleteGroupIfEmpty.deleteGroupIfEmpty("grp1234567890", MOCK_USER_SESSION);
      expect(result).toBeFalsy();
      expect(getGroupSpy.calls.count()).withContext("getGroupSpy").toEqual(1);
      expect(getGroupContentSpy.calls.count()).withContext("getGroupContentSpy").toEqual(0);
      expect(unprotectGroupSpy.calls.count()).withContext("unprotectGroupSpy").toEqual(0);
      expect(removeGroupSpy.calls.count()).withContext("removeGroupSpy").toEqual(0);
    });

    it("does not delete group if we fail to get the group contents", async () => {
      const getGroupSpy = spyOn(portal, "getGroup").and.resolveTo(mockItems.getAGOLGroup("grp1234567890", "casey"));
      const getGroupContentSpy = spyOn(portal, "getGroupContent").and.rejectWith(mockItems.get400Failure());
      const unprotectGroupSpy = spyOn(portal, "unprotectGroup").and.resolveTo({
        success: true,
      });
      const removeGroupSpy = spyOn(portal, "removeGroup").and.resolveTo({
        success: true,
      });

      const result = await deleteGroupIfEmpty.deleteGroupIfEmpty("grp1234567890", MOCK_USER_SESSION);
      expect(result).toBeFalsy();
      expect(getGroupSpy.calls.count()).withContext("getGroupSpy").toEqual(1);
      expect(getGroupContentSpy.calls.count()).withContext("getGroupContentSpy").toEqual(1);
      expect(unprotectGroupSpy.calls.count()).withContext("unprotectGroupSpy").toEqual(0);
      expect(removeGroupSpy.calls.count()).withContext("removeGroupSpy").toEqual(0);
    });

    it("does not delete group if we cannot unprotect it", async () => {
      const group = mockItems.getAGOLGroup("grp1234567890", "casey");
      group.protected = true;

      const getGroupSpy = spyOn(portal, "getGroup").and.resolveTo(group);
      const getGroupContentSpy = spyOn(portal, "getGroupContent").and.resolveTo(mockItems.getAGOLGroupContentsList(0));
      const unprotectGroupSpy = spyOn(portal, "unprotectGroup").and.resolveTo({
        success: false,
      });
      const removeGroupSpy = spyOn(portal, "removeGroup").and.resolveTo({
        success: true,
      });

      const result = await deleteGroupIfEmpty.deleteGroupIfEmpty("grp1234567890", MOCK_USER_SESSION);
      expect(result).toBeFalsy();
      expect(getGroupSpy.calls.count()).withContext("getGroupSpy").toEqual(1);
      expect(getGroupContentSpy.calls.count()).withContext("getGroupContentSpy").toEqual(1);
      expect(unprotectGroupSpy.calls.count()).withContext("unprotectGroupSpy").toEqual(1);
      expect(removeGroupSpy.calls.count()).withContext("removeGroupSpy").toEqual(0);
    });

    it("handles failure to delete group", async () => {
      const getGroupSpy = spyOn(portal, "getGroup").and.resolveTo(mockItems.getAGOLGroup("grp1234567890", "casey"));
      const getGroupContentSpy = spyOn(portal, "getGroupContent").and.resolveTo(mockItems.getAGOLGroupContentsList(0));
      const unprotectGroupSpy = spyOn(portal, "unprotectGroup").and.resolveTo({
        success: true,
      });
      const removeGroupSpy = spyOn(portal, "removeGroup").and.resolveTo({
        success: false,
      });

      const result = await deleteGroupIfEmpty.deleteGroupIfEmpty("grp1234567890", MOCK_USER_SESSION);
      expect(result).toBeFalsy();
      expect(getGroupSpy.calls.count()).withContext("getGroupSpy").toEqual(1);
      expect(getGroupContentSpy.calls.count()).withContext("getGroupContentSpy").toEqual(1);
      expect(unprotectGroupSpy.calls.count()).withContext("unprotectGroupSpy").toEqual(0);
      expect(removeGroupSpy.calls.count()).withContext("removeGroupSpy").toEqual(1);
    });
  });

  describe("deleteSolution", () => {
    it("rejects a Solution template", async () => {
      const testItem = "sol1234567890";
      spyOn(getDeletableSolutionInfo, "getDeletableSolutionInfo").and.rejectWith(
        new Error("Item " + testItem + " is not a deployed Solution"),
      );

      const response: interfaces.ISolutionPrecis[] = await deleteSolution.deleteSolution(testItem, MOCK_USER_SESSION);
      expect(response).toEqual([undefined as any, undefined as any]);
    });

    it("deletes a Solution", async () => {
      spyOn(getDeletableSolutionInfo, "getDeletableSolutionInfo").and.resolveTo(
        mockItems.getSolutionPrecis([
          mockItems.getAGOLItemPrecis("Web Map"),
          mockItems.getAGOLItemPrecis("Web Mapping Application"),
        ]),
      );
      spyOn(removeItems, "removeItems").and.resolveTo([
        mockItems.getSolutionPrecis([
          mockItems.getAGOLItemPrecis("Web Map"),
          mockItems.getAGOLItemPrecis("Web Mapping Application"),
        ]),
        mockItems.getSolutionPrecis(),
      ]);
      const unprotectItemSpy = spyOn(portal, "unprotectItem").and.resolveTo(utils.getSuccessResponse());
      const _removeItemSpy = spyOn(restHelpers, "removeItem").and.resolveTo({
        success: true,
        itemId: "sol1234567890",
      });
      spyOn(reportProgress, "reportProgress");
      const _deleteSolutionFolderSpy = spyOn(deleteSolutionFolder, "deleteSolutionFolder").and.resolveTo(true);

      const response: interfaces.ISolutionPrecis[] = await deleteSolution.deleteSolution(
        "sol1234567890",
        MOCK_USER_SESSION,
      );
      expect(response).toEqual([
        mockItems.getSolutionPrecis([
          mockItems.getAGOLItemPrecis("Web Map"),
          mockItems.getAGOLItemPrecis("Web Mapping Application"),
        ]),
        mockItems.getSolutionPrecis(),
      ]);
      expect(unprotectItemSpy.calls.count()).withContext("should unprotect Solution item").toBe(1);
      expect(_removeItemSpy.calls.count()).withContext("should remove Solution item").toBe(1);
      expect(_deleteSolutionFolderSpy.calls.count()).withContext("should remove Solution folder").toBe(1);
    });

    it("deletes a Solution that doesn't contain items", async () => {
      spyOn(getDeletableSolutionInfo, "getDeletableSolutionInfo").and.resolveTo(mockItems.getSolutionPrecis());
      const unprotectItemSpy = spyOn(portal, "unprotectItem").and.resolveTo(utils.getSuccessResponse());
      const _removeItemSpy = spyOn(restHelpers, "removeItem").and.resolveTo({
        success: true,
        itemId: "sol1234567890",
      });
      spyOn(reportProgress, "reportProgress");
      const _deleteSolutionFolderSpy = spyOn(deleteSolutionFolder, "deleteSolutionFolder").and.resolveTo(true);

      const response: interfaces.ISolutionPrecis[] = await deleteSolution.deleteSolution(
        "sol1234567890",
        MOCK_USER_SESSION,
      );
      expect(response).toEqual([mockItems.getSolutionPrecis(), mockItems.getSolutionPrecis()]);
      expect(unprotectItemSpy.calls.count()).withContext("should unprotect Solution item").toBe(1);
      expect(_removeItemSpy.calls.count()).withContext("should remove Solution item").toBe(1);
      expect(_deleteSolutionFolderSpy.calls.count()).withContext("should remove Solution folder").toBe(1);
    });

    it("deletes a Solution containing a Hub Site Application", async () => {
      spyOn(getDeletableSolutionInfo, "getDeletableSolutionInfo").and.resolveTo(
        mockItems.getSolutionPrecis([
          mockItems.getAGOLItemPrecis("Web Map"),
          mockItems.getAGOLItemPrecis("Hub Site Application"),
        ]),
      );
      spyOn(removeItems, "removeItems").and.resolveTo([
        mockItems.getSolutionPrecis([
          mockItems.getAGOLItemPrecis("Web Map"),
          mockItems.getAGOLItemPrecis("Hub Site Application"),
        ]),
        mockItems.getSolutionPrecis(),
      ]);
      const unprotectItemSpy = spyOn(portal, "unprotectItem").and.resolveTo(utils.getSuccessResponse());
      const _removeItemSpy = spyOn(restHelpers, "removeItem").and.resolveTo({
        success: true,
        itemId: "sol1234567890",
      });
      spyOn(createHRO, "createHubRequestOptions").and.resolveTo(
        utils.getSuccessResponse({
          authentication: MOCK_USER_SESSION,
          hubApiUrl: "https://hub.arcgis.com",
          isPortal: false,
        }),
      );
      spyOn(reportProgress, "reportProgress");
      const _deleteSolutionFolderSpy = spyOn(deleteSolutionFolder, "deleteSolutionFolder").and.resolveTo(true);

      const response: interfaces.ISolutionPrecis[] = await deleteSolution.deleteSolution(
        "sol1234567890",
        MOCK_USER_SESSION,
      );
      expect(response).toEqual([
        mockItems.getSolutionPrecis([
          mockItems.getAGOLItemPrecis("Web Map"),
          mockItems.getAGOLItemPrecis("Hub Site Application"),
        ]),
        mockItems.getSolutionPrecis(),
      ]);
      expect(unprotectItemSpy.calls.count()).withContext("should unprotect Solution item").toBe(1);
      expect(_removeItemSpy.calls.count()).withContext("should remove Solution item").toBe(1);
      expect(_deleteSolutionFolderSpy.calls.count()).withContext("should remove Solution folder").toBe(1);
    });

    it("doesn't delete all of the items of a Solution", async () => {
      spyOn(getDeletableSolutionInfo, "getDeletableSolutionInfo").and.resolveTo(
        mockItems.getSolutionPrecis([
          mockItems.getAGOLItemPrecis("Web Map"),
          mockItems.getAGOLItemPrecis("Web Mapping Application"),
        ]),
      );
      spyOn(removeItems, "removeItems").and.resolveTo([
        mockItems.getSolutionPrecis([mockItems.getAGOLItemPrecis("Web Mapping Application")]),
        mockItems.getSolutionPrecis([mockItems.getAGOLItemPrecis("Web Map")]),
      ]);
      const unprotectItemSpy = spyOn(portal, "unprotectItem").and.resolveTo(utils.getSuccessResponse());
      const _removeItemSpy = spyOn(restHelpers, "removeItem").and.resolveTo({
        success: true,
        itemId: "sol1234567890",
      });
      spyOn(reportProgress, "reportProgress");
      const _deleteSolutionFolderSpy = spyOn(deleteSolutionFolder, "deleteSolutionFolder").and.resolveTo(true);

      const response: interfaces.ISolutionPrecis[] = await deleteSolution.deleteSolution(
        "sol1234567890",
        MOCK_USER_SESSION,
      );
      expect(response).toEqual([
        mockItems.getSolutionPrecis([mockItems.getAGOLItemPrecis("Web Mapping Application")]),
        mockItems.getSolutionPrecis([mockItems.getAGOLItemPrecis("Web Map")]),
      ]);
      expect(unprotectItemSpy.calls.count()).withContext("should not unprotect Solution item").toBe(0);
      expect(_removeItemSpy.calls.count()).withContext("should not remove Solution item").toBe(0);
      expect(_deleteSolutionFolderSpy.calls.count()).withContext("should not remove Solution folder").toBe(0);
    });

    it("deletes the items of a Solution, but unprotecting the Solution fails", async () => {
      spyOn(getDeletableSolutionInfo, "getDeletableSolutionInfo").and.resolveTo(
        mockItems.getSolutionPrecis([
          mockItems.getAGOLItemPrecis("Web Map"),
          mockItems.getAGOLItemPrecis("Web Mapping Application"),
        ]),
      );
      spyOn(removeItems, "removeItems").and.resolveTo([
        mockItems.getSolutionPrecis([
          mockItems.getAGOLItemPrecis("Web Map"),
          mockItems.getAGOLItemPrecis("Web Mapping Application"),
        ]),
        mockItems.getSolutionPrecis(),
      ]);
      const unprotectItemSpy = spyOn(portal, "unprotectItem").and.resolveTo(utils.getFailureResponse());
      const _removeItemSpy = spyOn(restHelpers, "removeItem").and.resolveTo({
        success: false,
        itemId: "sol1234567890",
      });
      const _deleteSolutionFolderSpy = spyOn(deleteSolutionFolder, "deleteSolutionFolder").and.resolveTo(true);
      spyOn(reportProgress, "reportProgress");

      const response: interfaces.ISolutionPrecis[] = await deleteSolution.deleteSolution(
        "sol1234567890",
        MOCK_USER_SESSION,
      );
      expect(response).toEqual([
        mockItems.getSolutionPrecis([
          mockItems.getAGOLItemPrecis("Web Map"),
          mockItems.getAGOLItemPrecis("Web Mapping Application"),
        ]),
        mockItems.getSolutionPrecis(),
      ]);
      expect(unprotectItemSpy.calls.count()).withContext("should unprotect Solution item").toBe(1);
      expect(_removeItemSpy.calls.count()).withContext("should not remove Solution item").toBe(0);
      expect(_deleteSolutionFolderSpy.calls.count()).withContext("should not remove Solution folder").toBe(0);
    });

    it("deletes the items of a Solution, but deleting the Solution itself fails", async () => {
      spyOn(getDeletableSolutionInfo, "getDeletableSolutionInfo").and.resolveTo(
        mockItems.getSolutionPrecis([
          mockItems.getAGOLItemPrecis("Web Map"),
          mockItems.getAGOLItemPrecis("Web Mapping Application"),
        ]),
      );
      spyOn(removeItems, "removeItems").and.resolveTo([
        mockItems.getSolutionPrecis([
          mockItems.getAGOLItemPrecis("Web Map"),
          mockItems.getAGOLItemPrecis("Web Mapping Application"),
        ]),
        mockItems.getSolutionPrecis(),
      ]);
      const unprotectItemSpy = spyOn(portal, "unprotectItem").and.resolveTo(utils.getSuccessResponse());
      const _removeItemSpy = spyOn(restHelpers, "removeItem").and.resolveTo({
        success: false,
        itemId: "sol1234567890",
      });
      const _deleteSolutionFolderSpy = spyOn(deleteSolutionFolder, "deleteSolutionFolder").and.resolveTo(true);
      spyOn(reportProgress, "reportProgress");

      const response: interfaces.ISolutionPrecis[] = await deleteSolution.deleteSolution(
        "sol1234567890",
        MOCK_USER_SESSION,
      );
      expect(response).toEqual([
        mockItems.getSolutionPrecis([
          mockItems.getAGOLItemPrecis("Web Map"),
          mockItems.getAGOLItemPrecis("Web Mapping Application"),
        ]),
        mockItems.getSolutionPrecis(),
      ]);
      expect(unprotectItemSpy.calls.count()).withContext("should unprotect Solution item").toBe(1);
      expect(_removeItemSpy.calls.count()).withContext("should remove Solution item").toBe(1);
      expect(_deleteSolutionFolderSpy.calls.count()).withContext("should not remove Solution folder").toBe(0);
    });

    it("deletes a Solution, but deleting its folder fails", async () => {
      spyOn(getDeletableSolutionInfo, "getDeletableSolutionInfo").and.resolveTo(
        mockItems.getSolutionPrecis([
          mockItems.getAGOLItemPrecis("Web Map"),
          mockItems.getAGOLItemPrecis("Web Mapping Application"),
        ]),
      );
      spyOn(removeItems, "removeItems").and.resolveTo([
        mockItems.getSolutionPrecis([
          mockItems.getAGOLItemPrecis("Web Map"),
          mockItems.getAGOLItemPrecis("Web Mapping Application"),
        ]),
        mockItems.getSolutionPrecis(),
      ]);
      const unprotectItemSpy = spyOn(portal, "unprotectItem").and.resolveTo(utils.getSuccessResponse());
      const _removeItemSpy = spyOn(restHelpers, "removeItem").and.resolveTo({
        success: true,
        itemId: "sol1234567890",
      });
      spyOn(reportProgress, "reportProgress");
      const _deleteSolutionFolderSpy = spyOn(deleteSolutionFolder, "deleteSolutionFolder").and.resolveTo(false);

      const response: interfaces.ISolutionPrecis[] = await deleteSolution.deleteSolution(
        "sol1234567890",
        MOCK_USER_SESSION,
      );
      expect(response).toEqual([
        mockItems.getSolutionPrecis([
          mockItems.getAGOLItemPrecis("Web Map"),
          mockItems.getAGOLItemPrecis("Web Mapping Application"),
        ]),
        mockItems.getSolutionPrecis(),
      ]);
      expect(unprotectItemSpy.calls.count()).withContext("should unprotect Solution item").toBe(1);
      expect(_removeItemSpy.calls.count()).withContext("should remove Solution item").toBe(1);
      expect(_deleteSolutionFolderSpy.calls.count()).withContext("should remove Solution folder").toBe(1);
    });
  });

  describe("deleteSolutionByComponents", () => {
    function _createTemplate(itemId: string, type: string): interfaces.IItemTemplate {
      return {
        itemId,
        type,
        item: {
          title: "title",
        },
      } as unknown as interfaces.IItemTemplate;
    }

    function _createItemPrecis(id: string, type: string): interfaces.ISolutionItemPrecis {
      return {
        id,
        type,
        title: "title",
        modified: 0,
        owner: "",
      } as interfaces.ISolutionItemPrecis;
    }

    it("sorts by itemIds and by item vs. group", async () => {
      const solutionItemId: string = "sln123";
      const itemIds: string[] = ["grp456", "itm789", "itm123", "itm456", "grp123"];
      const templates: interfaces.IItemTemplate[] = [
        _createTemplate("tmpgrp123", "Group"),
        _createTemplate("tmpgrp456", "Group"),
        _createTemplate("tmpgrp789", "Group"),
        _createTemplate("tmpitm123", "Web Map"),
        _createTemplate("tmpitm456", "Web Map"),
        _createTemplate("tmpitm789", "Web Map"),
      ];
      const templateDictionary: any = {
        tmpgrp123: { itemId: "grp123" },
        tmpgrp456: { itemId: "grp456" },
        tmpgrp789: { itemId: "grp789" },
        tmpitm123: { itemId: "itm123" },
        tmpitm456: { itemId: "itm456" },
        tmpitm789: { itemId: "itm789" },
        folderId: "fld123",
      };

      const deleteSolutionContentsSpy = spyOn(deleteSolutionContents, "deleteSolutionContents").and.resolveTo([
        {
          id: solutionItemId,
          title: "",
          folder: "fld123",
          items: [
            _createItemPrecis("itm789", "Web Map"),
            _createItemPrecis("itm123", "Web Map"),
            _createItemPrecis("itm456", "Web Map"),
          ],
          groups: ["grp456", "grp123"],
        },
        {
          id: solutionItemId,
          title: "",
          folder: "fld123",
          items: [] as interfaces.ISolutionItemPrecis[],
          groups: [] as string[],
        },
      ] as interfaces.ISolutionPrecis[]);

      await deleteSolution.deleteSolutionByComponents(
        solutionItemId,
        itemIds,
        templates,
        templateDictionary,
        MOCK_USER_SESSION,
      );
      expect(deleteSolutionContentsSpy.calls.count()).withContext("call count").toEqual(1);
      expect(deleteSolutionContentsSpy.calls.argsFor(0)[0]).withContext("arg 0").toEqual(solutionItemId);
      expect(deleteSolutionContentsSpy.calls.argsFor(0)[1])
        .withContext("arg 1")
        .toEqual({
          id: solutionItemId,
          title: "",
          folder: "fld123",
          items: [
            _createItemPrecis("itm789", "Web Map"),
            _createItemPrecis("itm123", "Web Map"),
            _createItemPrecis("itm456", "Web Map"),
          ],
          groups: ["grp456", "grp123"],
        });
    });
  });

  describe("getDeletableSolutionInfo", () => {
    it("passes through each item related to one solution", async () => {
      const solutionSummary = mockItems.getSolutionPrecis([
        mockItems.getAGOLItemPrecis("Web Map"),
        mockItems.getAGOLItemPrecis("Web Mapping Application"),
      ]);

      spyOn(getSolutionSummary, "getSolutionSummary").and.resolveTo(solutionSummary);
      spyOn(restHelpersGet, "getSolutionsRelatedToAnItem").and.resolveTo(["sol1234567890"]);

      const result: interfaces.ISolutionPrecis = await getDeletableSolutionInfo.getDeletableSolutionInfo(
        "sol1234567890",
        MOCK_USER_SESSION,
      );
      expect(result).toEqual(solutionSummary);
    });

    it("it filters out an item that is related to more than one solution", async () => {
      const solutionSummary = mockItems.getSolutionPrecis([
        mockItems.getAGOLItemPrecis("Web Map"),
        mockItems.getAGOLItemPrecis("Web Mapping Application"),
      ]);

      spyOn(getSolutionSummary, "getSolutionSummary").and.resolveTo(solutionSummary);
      spyOn(restHelpersGet, "getSolutionsRelatedToAnItem").and.returnValues(
        Promise.resolve(["sol1234567890"]),
        Promise.resolve(["sol1234567890", "sol1234567891"]),
      );

      const result: interfaces.ISolutionPrecis = await getDeletableSolutionInfo.getDeletableSolutionInfo(
        "sol1234567890",
        MOCK_USER_SESSION,
      );
      const expectedSolutionSummary = mockItems.getSolutionPrecis([mockItems.getAGOLItemPrecis("Web Map")]);
      expect(result).toEqual(expectedSolutionSummary);
    });
  });

  describe("getSolutionSummary", () => {
    it("rejects a non-Solution item", async () => {
      spyOn(restHelpersGet, "getItemBase").and.resolveTo(mockItems.getAGOLItem("Web Map"));
      spyOn(restHelpersGet, "getItemDataAsJson").and.resolveTo({});

      await expectAsync(getSolutionSummary.getSolutionSummary("sol1234567890", MOCK_USER_SESSION)).toBeRejected();
    });

    it("rejects a Solution template", async () => {
      const solutionItem = mockItems.getCompleteDeployedSolutionItemVersioned();
      solutionItem.base.typeKeywords = solutionItem.base.typeKeywords.filter(
        (keyword: string) => keyword !== "Deployed",
      );
      solutionItem.base.typeKeywords.push("Template");

      spyOn(restHelpersGet, "getItemBase").and.resolveTo(solutionItem.base);
      spyOn(restHelpersGet, "getItemDataAsJson").and.resolveTo(solutionItem.data);

      await expectAsync(getSolutionSummary.getSolutionSummary("sol1234567890", MOCK_USER_SESSION)).toBeRejected();
    });

    it("handles case with no forward relationships from solution", async () => {
      const solutionItem = mockItems.getCompleteDeployedSolutionItemVersioned();
      spyOn(restHelpersGet, "getItemBase").and.resolveTo(solutionItem.base);
      spyOn(restHelpersGet, "getItemDataAsJson").and.resolveTo(solutionItem.data);
      spyOn(restHelpersGet, "getItemsRelatedToASolution").and.resolveTo([]);

      const result = await getSolutionSummary.getSolutionSummary(solutionItem.base.id, MOCK_USER_SESSION);
      expect(result).toEqual(mockItems.getSolutionPrecis());
    });

    it("gets a version 0 Solution summary", async () => {
      const solutionItem = mockItems.getCompleteDeployedSolutionItemVersioned(0);
      spyOn(restHelpersGet, "getItemBase").and.resolveTo(solutionItem.base);
      spyOn(restHelpersGet, "getItemDataAsJson").and.resolveTo(solutionItem.data);
      spyOn(restHelpersGet, "getItemsRelatedToASolution").and.resolveTo([
        mockItems.getAGOLItem("Web Map"),
        mockItems.getAGOLItem("Web Mapping Application"),
      ]);
      const _reconstructBuildOrderIdsSpy = spyOn(
        reconstructBuildOrderIds,
        "reconstructBuildOrderIds",
      ).and.callThrough();

      const result = await getSolutionSummary.getSolutionSummary(solutionItem.base.id, MOCK_USER_SESSION);
      expect(result).toEqual(
        mockItems.getSolutionPrecis([
          mockItems.getAGOLItemPrecis("Web Map"),
          mockItems.getAGOLItemPrecis("Web Mapping Application"),
        ]),
      );
      expect(_reconstructBuildOrderIdsSpy.calls.count()).toEqual(1);
    });

    it("gets a version 1 Solution summary", async () => {
      const solutionItem = mockItems.getCompleteDeployedSolutionItemVersioned(1);
      solutionItem.data.templates[0].groups = ["grp1234567890", "grp1234567891"];
      spyOn(restHelpersGet, "getItemBase").and.resolveTo(solutionItem.base);
      spyOn(restHelpersGet, "getItemDataAsJson").and.resolveTo(solutionItem.data);
      spyOn(restHelpersGet, "getItemsRelatedToASolution").and.resolveTo([
        mockItems.getAGOLItem("Web Map"),
        mockItems.getAGOLItem("Web Mapping Application"),
      ]);
      const _reconstructBuildOrderIdsSpy = spyOn(
        reconstructBuildOrderIds,
        "reconstructBuildOrderIds",
      ).and.callThrough();

      const result = await getSolutionSummary.getSolutionSummary(solutionItem.base.id, MOCK_USER_SESSION);
      expect(result).toEqual(
        mockItems.getSolutionPrecis(
          [mockItems.getAGOLItemPrecis("Web Map"), mockItems.getAGOLItemPrecis("Web Mapping Application")],
          ["grp1234567890", "grp1234567891"],
        ),
      );
      expect(_reconstructBuildOrderIdsSpy.calls.count()).toEqual(0);
    });

    it("gets a solution that has items and groups", async () => {
      const solutionId = "abc123";

      const solutionBase = mockItems.getAGOLItem("Solution", solutionId, "Solution 1");
      solutionBase.typeKeywords = ["Solution", "Deployed"];
      spyOn(restHelpersGet, "getItemBase").and.resolveTo(solutionBase);

      const solutionData = {
        metadata: {},
        parameters: {},
        templates: [{
          itemId: "wm1",
          type: "Web Map",
          groups: [],
        }, {
          itemId: "wma1",
          type: "Web Mapping Application",
          groups: [],
        }, {
          itemId: "fs1",
          type: "Feature Service",
          groups: [],
        }, {
          itemId: "group1",
          type: "Group",
        }],
      };
      spyOn(restHelpersGet, "getItemDataAsJson").and.resolveTo(solutionData);

      const relatedItems: any[] = [{
        id: "wm1",
        modified: 1234567890,
        owner: "owner1",
        title: "Web Map 1",
        type: "Web Map",
      }, {
        id: "wma1",
        modified: 1234567890,
        owner: "owner1",
        title: "Web Mapping Application 1",
        type: "Web Mapping Application",
      }, {
        id: "fs1",
        modified: 1234567890,
        owner: "owner1",
        title: "Feature Service 1",
        type: "Feature Service",
      }];
      spyOn(restHelpersGet, "getItemsRelatedToASolution").and.resolveTo(relatedItems);

      const response = await getSolutionSummary.getSolutionSummary(solutionId, MOCK_USER_SESSION);

      expect(response).toEqual({
        id: solutionId,
        title: "An AGOL item",
        folder: "",
        items: [{
          id: "fs1",
          modified: 1234567890,
          owner: "owner1",
          title: "Feature Service 1",
          type: "Feature Service",
        }, {
          id: "wm1",
          modified: 1234567890,
          owner: "owner1",
          title: "Web Map 1",
          type: "Web Map",
        }, {
          id: "wma1",
          modified: 1234567890,
          owner: "owner1",
          title: "Web Mapping Application 1",
          type: "Web Mapping Application",
        }],
        groups: ["group1"],
      });
    });
  });

  describe("deleteSolutionFolder", () => {
    it("empty folder", async () => {
      spyOn(MOCK_USER_SESSION, "getUser").and.resolveTo({
        orgId: "orgABC",
      });
      spyOn(portal, "searchItems").and.resolveTo({
        total: 0,
        results: [],
      } as any);
      const removeFolderSpy = spyOn(portal, "removeFolder").and.resolveTo({
        success: true,
      } as any);

      const result = await deleteSolutionFolder.deleteSolutionFolder([], "fld1234567890", MOCK_USER_SESSION);
      expect(result).toBeTruthy();
      expect(removeFolderSpy.calls.count()).toEqual(1);
    });

    it("deletes a folder with only solution items remaining", async () => {
      spyOn(MOCK_USER_SESSION, "getUser").and.resolveTo({
        orgId: "orgABC",
      });
      spyOn(portal, "searchItems").and.resolveTo({
        total: 1,
        results: [
          {
            id: "map1234567890",
          },
        ],
      } as any);
      const removeFolderSpy = spyOn(portal, "removeFolder").and.resolveTo({
        success: true,
      } as any);

      const result = await deleteSolutionFolder.deleteSolutionFolder(
        ["map1234567890"],
        "fld1234567890",
        MOCK_USER_SESSION,
      );
      expect(result).toBeTruthy();
      expect(removeFolderSpy.calls.count()).toEqual(1);
    });

    it("does not delete a folder with non-solution items remaining", async () => {
      spyOn(MOCK_USER_SESSION, "getUser").and.resolveTo({
        orgId: "orgABC",
      });
      spyOn(portal, "searchItems").and.resolveTo({
        total: 2,
        results: [
          {
            id: "map1234567890",
          },
          {
            id: "svc1234567890",
          },
        ],
      } as any);
      const removeFolderSpy = spyOn(portal, "removeFolder").and.resolveTo({
        success: true,
      } as any);

      const result = await deleteSolutionFolder.deleteSolutionFolder(
        ["map1234567890"],
        "fld1234567890",
        MOCK_USER_SESSION,
      );
      expect(result).toBeTruthy();
      expect(removeFolderSpy.calls.count()).toEqual(0);
    });

    it("fails to delete folder", async () => {
      spyOn(MOCK_USER_SESSION, "getUser").and.resolveTo({
        orgId: "orgABC",
      });
      spyOn(portal, "searchItems").and.resolveTo({
        total: 1,
        results: [
          {
            id: "map1234567890",
          },
        ],
      } as any);
      const removeFolderSpy = spyOn(portal, "removeFolder").and.resolveTo({
        success: false,
      } as any);

      const result = await deleteSolutionFolder.deleteSolutionFolder(
        ["map1234567890"],
        "fld1234567890",
        MOCK_USER_SESSION,
      );
      expect(result).toBeFalsy();
      expect(removeFolderSpy.calls.count()).toEqual(1);
    });
  });

  describe("reconstructBuildOrderIds", () => {
    it("handles an empty list", () => {
      const templates: interfaces.IItemTemplate[] = [];
      const buildOrderIds = reconstructBuildOrderIds.reconstructBuildOrderIds(templates);
      expect(buildOrderIds).toEqual([]);
    });
  });

  describe("removeItems", () => {
    afterEach(() => {
      const clock = jasmine.clock();
      if (clock) {
        clock.uninstall();
      }
    });

    it("handles an empty list of item ids with all items so far successful", async () => {
      const solutionSummary: interfaces.ISolutionPrecis = mockItems.getSolutionPrecis();
      const hubSiteItemIds: string[] = [];
      const percentDone: number = 50.4;
      const progressPercentStep: number = 10.4;

      const results: interfaces.ISolutionPrecis[] = await removeItems.removeItems(
        solutionSummary,
        hubSiteItemIds,
        MOCK_USER_SESSION,
        percentDone,
        progressPercentStep,
      );
      const [solutionDeletedSummary, solutionFailureSummary] = results;
      expect(solutionDeletedSummary.items.length).toEqual(0);
      expect(solutionFailureSummary.items.length).toEqual(0);
    });

    it("deletes a list of item ids", async () => {
      const firstItemId = "map1234567890";
      const secondItemId = "svc1234567890";
      const solutionSummary: interfaces.ISolutionPrecis = mockItems.getSolutionPrecis([
        mockItems.getAGOLItemPrecis("Web Map"),
        mockItems.getAGOLItemPrecis("Feature Service"),
      ]);
      const hubSiteItemIds: string[] = [];
      const percentDone: number = 50.4;
      const progressPercentStep: number = 10.4;

      spyOn(portal, "unprotectItem").and.resolveTo(utils.getSuccessResponse());

      const removeItemSpy = spyOn(restHelpers, "removeItem").and.returnValues(
        Promise.resolve(utils.getSuccessResponse({ id: firstItemId })),
        Promise.resolve(utils.getSuccessResponse({ id: secondItemId })),
      );

      const date = new Date(Date.UTC(2019, 2, 4, 5, 6, 7)); // 0-based month
      const now = date.getTime();
      utils.setMockDateTime(now);
      const consoleSpy = spyOn(console, "log");

      const results: interfaces.ISolutionPrecis[] = await removeItems.removeItems(
        solutionSummary,
        hubSiteItemIds,
        MOCK_USER_SESSION,
        percentDone,
        progressPercentStep,
        { consoleProgress: true },
      );
      const [solutionDeletedSummary, solutionFailureSummary] = results;
      expect(solutionDeletedSummary.items.length).toEqual(2);
      expect(solutionFailureSummary.items.length).toEqual(0);

      expect(removeItemSpy.calls.count()).withContext("should call removeItem twice").toBe(2);
      expect(removeItemSpy.calls.argsFor(0)[0]).toEqual(secondItemId);
      expect(removeItemSpy.calls.argsFor(0)[1]).toEqual(MOCK_USER_SESSION);
      expect(removeItemSpy.calls.argsFor(1)[0]).toEqual(firstItemId);
      expect(removeItemSpy.calls.argsFor(1)[1]).toEqual(MOCK_USER_SESSION);

      expect(consoleSpy.calls.count()).withContext("should call console.log twice").toBe(2);
      expect(consoleSpy.calls.argsFor(0)[0]).toBe(now);
      expect(consoleSpy.calls.argsFor(0)[1]).toBe(secondItemId);
      expect(consoleSpy.calls.argsFor(0)[2]).toBe("");
      expect(consoleSpy.calls.argsFor(0)[3]).toBe("3 Finished");
      expect(consoleSpy.calls.argsFor(0)[4]).toBe(Math.round(percentDone + progressPercentStep) + "%");
      expect(consoleSpy.calls.argsFor(1)[0]).toBe(now);
      expect(consoleSpy.calls.argsFor(1)[1]).toBe(firstItemId);
      expect(consoleSpy.calls.argsFor(1)[2]).toBe("");
      expect(consoleSpy.calls.argsFor(1)[3]).toBe("3 Finished");
      expect(consoleSpy.calls.argsFor(1)[4]).toBe(Math.round(percentDone + 2 * progressPercentStep) + "%");
    });

    it("deletes a list of item ids, with the first one failing", async () => {
      const firstItemId = "map1234567890";
      const secondItemId = "svc1234567890";
      const solutionSummary: interfaces.ISolutionPrecis = mockItems.getSolutionPrecis([
        mockItems.getAGOLItemPrecis("Web Map"),
        mockItems.getAGOLItemPrecis("Feature Service"),
      ]);
      const hubSiteItemIds: string[] = [];
      const percentDone: number = 50.4;
      const progressPercentStep: number = 10.4;

      const unprotectItemSpy = spyOn(portal, "unprotectItem").and.resolveTo(utils.getSuccessResponse());

      const removeItemSpy = spyOn(restHelpers, "removeItem").and.returnValues(
        Promise.resolve(utils.getSuccessResponse({ id: secondItemId })),
        Promise.reject(utils.getFailureResponse({ id: firstItemId })),
      );

      const date = new Date(Date.UTC(2019, 2, 4, 5, 6, 7)); // 0-based month
      const now = date.getTime();
      utils.setMockDateTime(now);
      const consoleSpy = spyOn(console, "log");

      const results: interfaces.ISolutionPrecis[] = await removeItems.removeItems(
        solutionSummary,
        hubSiteItemIds,
        MOCK_USER_SESSION,
        percentDone,
        progressPercentStep,
        { consoleProgress: true },
      );
      const [solutionDeletedSummary, solutionFailureSummary] = results;

      expect(unprotectItemSpy.calls.count()).withContext("should call unprotectItemSpy twice").toBe(2);
      expect(unprotectItemSpy.calls.argsFor(0)[0]).toEqual({
        id: secondItemId,
        authentication: MOCK_USER_SESSION,
      });
      expect(unprotectItemSpy.calls.argsFor(1)[0]).toEqual({
        id: firstItemId,
        authentication: MOCK_USER_SESSION,
      });

      expect(removeItemSpy.calls.count()).withContext("should call removeItem twice").toBe(2);
      expect(removeItemSpy.calls.argsFor(0)[0]).toEqual(secondItemId);
      expect(removeItemSpy.calls.argsFor(0)[1]).toEqual(MOCK_USER_SESSION);
      expect(removeItemSpy.calls.argsFor(1)[0]).toEqual(firstItemId);
      expect(removeItemSpy.calls.argsFor(1)[1]).toEqual(MOCK_USER_SESSION);

      expect(consoleSpy.calls.count()).withContext("should call console.log twice").toBe(2);

      expect(consoleSpy.calls.argsFor(0)[0]).toBe(now);
      expect(consoleSpy.calls.argsFor(0)[1]).toBe(secondItemId);
      expect(consoleSpy.calls.argsFor(0)[2]).toBe("");
      expect(consoleSpy.calls.argsFor(0)[3]).toBe("3 Finished");
      expect(consoleSpy.calls.argsFor(0)[4]).toBe(Math.round(percentDone + progressPercentStep) + "%");
      expect(solutionDeletedSummary.items.length).toEqual(1);
      expect(solutionDeletedSummary.items[0].id).toEqual(secondItemId);

      expect(consoleSpy.calls.argsFor(1)[0]).toBe(now);
      expect(consoleSpy.calls.argsFor(1)[1]).toBe(firstItemId);
      expect(consoleSpy.calls.argsFor(1)[2]).toBe("");
      expect(consoleSpy.calls.argsFor(1)[3]).toBe("3 Failed");
      expect(consoleSpy.calls.argsFor(1)[4]).toBe(Math.round(percentDone + 2 * progressPercentStep) + "%");
      expect(solutionFailureSummary.items.length).toEqual(1);
      expect(solutionFailureSummary.items[0].id).toEqual(firstItemId);
    });

    it("deletes a list of item ids, skipping a missing one", async () => {
      const firstItemId = "map1234567890";
      const secondItemId = "svc1234567890";
      const solutionSummary: interfaces.ISolutionPrecis = mockItems.getSolutionPrecis([
        mockItems.getAGOLItemPrecis("Web Map"),
        mockItems.getAGOLItemPrecis("Feature Service"),
      ]);
      const hubSiteItemIds: string[] = [];
      const percentDone: number = 50.4;
      const progressPercentStep: number = 10.4;

      const unprotectItemSpy = spyOn(portal, "unprotectItem").and.returnValues(
        Promise.resolve(utils.getSuccessResponse({ id: secondItemId })),
        Promise.reject(mockItems.get400Failure()),
      );

      const removeItemSpy = spyOn(restHelpers, "removeItem").and.resolveTo(
        utils.getSuccessResponse({ id: secondItemId }),
      );

      const date = new Date(Date.UTC(2019, 2, 4, 5, 6, 7)); // 0-based month
      const now = date.getTime();
      utils.setMockDateTime(now);
      const consoleSpy = spyOn(console, "log");

      const results: interfaces.ISolutionPrecis[] = await removeItems.removeItems(
        solutionSummary,
        hubSiteItemIds,
        MOCK_USER_SESSION,
        percentDone,
        progressPercentStep,
        { consoleProgress: true },
      );
      const [solutionDeletedSummary, solutionFailureSummary] = results;
      expect(solutionDeletedSummary.items.length).toEqual(1);
      expect(solutionFailureSummary.items.length).toEqual(0);

      expect(unprotectItemSpy.calls.count()).withContext("should call unprotectItemSpy twice").toBe(2);
      expect(unprotectItemSpy.calls.argsFor(0)[0]).toEqual({
        id: secondItemId,
        authentication: MOCK_USER_SESSION,
      });
      expect(unprotectItemSpy.calls.argsFor(1)[0]).toEqual({
        id: firstItemId,
        authentication: MOCK_USER_SESSION,
      });

      expect(removeItemSpy.calls.count()).withContext("should call removeItem once").toBe(1);
      expect(removeItemSpy.calls.argsFor(0)[0]).toEqual(secondItemId);
      expect(removeItemSpy.calls.argsFor(0)[1]).toEqual(MOCK_USER_SESSION);

      expect(consoleSpy.calls.count()).withContext("should call console.log twice").toBe(2);
      expect(consoleSpy.calls.argsFor(0)[0]).toBe(now);
      expect(consoleSpy.calls.argsFor(0)[1]).toBe(secondItemId);
      expect(consoleSpy.calls.argsFor(0)[2]).toBe("");
      expect(consoleSpy.calls.argsFor(0)[3]).toBe("3 Finished");
      expect(consoleSpy.calls.argsFor(0)[4]).toBe(Math.round(percentDone + progressPercentStep) + "%");
      expect(consoleSpy.calls.argsFor(1)[0]).toBe(now);
      expect(consoleSpy.calls.argsFor(1)[1]).toBe(firstItemId);
      expect(consoleSpy.calls.argsFor(1)[2]).toBe("");
      expect(consoleSpy.calls.argsFor(1)[3]).toBe("3 Ignored");
      expect(consoleSpy.calls.argsFor(1)[4]).toBe(Math.round(percentDone + 2 * progressPercentStep) + "%");
    });

    it("deletes hub site applications via hub.js", async () => {
      const itemId = "hsa1234567890";
      const solutionSummary: interfaces.ISolutionPrecis = mockItems.getSolutionPrecis([
        mockItems.getAGOLItemPrecis("Hub Site Application"),
      ]);
      const hubSiteItemIds: string[] = [itemId];
      const percentDone: number = 50.4;
      const progressPercentStep: number = 10.4;

      spyOn(portal, "unprotectItem").and.resolveTo(utils.getSuccessResponse());

      spyOn(createHRO, "createHubRequestOptions").and.resolveTo(
        utils.getSuccessResponse({
          authentication: MOCK_USER_SESSION,
          hubApiUrl: "https://hub.arcgis.com",
          isPortal: false,
        }),
      );

      const removeItemSpy = spyOn(hubSites, "removeSite").and.returnValues(
        Promise.resolve(utils.getSuccessResponse({ id: itemId })),
      );

      const results: interfaces.ISolutionPrecis[] = await removeItems.removeItems(
        solutionSummary,
        hubSiteItemIds,
        MOCK_USER_SESSION,
        percentDone,
        progressPercentStep,
      );
      const [solutionDeletedSummary, solutionFailureSummary] = results;
      expect(solutionDeletedSummary.items.length).toEqual(1);
      expect(solutionFailureSummary.items.length).toEqual(0);

      expect(removeItemSpy.calls.count()).withContext("should call removeItem once").toBe(1);
      expect(removeItemSpy.calls.argsFor(0)[0]).toEqual(itemId);
      expect(removeItemSpy.calls.argsFor(0)[1].authentication).toEqual(MOCK_USER_SESSION);
      expect(removeItemSpy.calls.argsFor(0)[1].hubApiUrl).toEqual("https://hub.arcgis.com");
      expect(removeItemSpy.calls.argsFor(0)[1].isPortal).toBeFalsy();
    });
  });

  describe("reportProgress", () => {
    afterEach(() => {
      const clock = jasmine.clock();
      if (clock) {
        clock.uninstall();
      }
    });

    it("uses progressCallback with just defaults", () => {
      const percentDone: number = 50.4;
      const deleteOptions: interfaces.IDeleteSolutionOptions = {
        progressCallback: (iPercentDone, jobId, data) => {
          expect(iPercentDone).toEqual(Math.round(percentDone));
          expect(jobId).toBeUndefined();
          expect(data).toBeDefined();
          expect(data?.event).toEqual("");
          expect(data?.data).toEqual("");
        },
      };

      reportProgress.reportProgress(percentDone, deleteOptions);
    });

    it("uses progressCallback with item id, job id, and status", () => {
      const deletedItemId = "sln1234567890";
      const percentDone: number = 50.4;
      const status = interfaces.EItemProgressStatus.Finished;
      const deleteOptions: interfaces.IDeleteSolutionOptions = {
        jobId: "Ginger",
        progressCallback: (iPercentDone, jobId, data) => {
          expect(iPercentDone).toEqual(Math.round(percentDone));
          expect(jobId).toEqual(deleteOptions.jobId);
          expect(data).toBeDefined();
          expect(data?.event).toEqual("");
          expect(data?.data).toEqual(deletedItemId);
        },
      };

      reportProgress.reportProgress(percentDone, deleteOptions, deletedItemId, status);
    });

    it("uses consoleProgress with just defaults", () => {
      const percentDone: number = 50.4;
      const deleteOptions: interfaces.IDeleteSolutionOptions = {
        consoleProgress: true,
      };

      const date = new Date(Date.UTC(2019, 2, 4, 5, 6, 7)); // 0-based month
      const now = date.getTime();
      utils.setMockDateTime(now);
      const consoleSpy = spyOn(console, "log");

      reportProgress.reportProgress(percentDone, deleteOptions);

      expect(consoleSpy.calls.count()).withContext("should call console.log once").toBe(1);
      expect(consoleSpy.calls.argsFor(0)[0]).toBe(now);
      expect(consoleSpy.calls.argsFor(0)[1]).toBe("");
      expect(consoleSpy.calls.argsFor(0)[2]).toBe("");
      expect(consoleSpy.calls.argsFor(0)[3]).toBe("1 Started");
      expect(consoleSpy.calls.argsFor(0)[4]).toBe("50%");
    });

    it("uses consoleProgress with item id, job id, and status", () => {
      const deletedItemId = "sln1234567890";
      const percentDone: number = 50.4;
      const status = interfaces.EItemProgressStatus.Finished;
      const deleteOptions: interfaces.IDeleteSolutionOptions = {
        jobId: "Ginger",
        consoleProgress: true,
      };

      const date = new Date(Date.UTC(2019, 2, 4, 5, 6, 7)); // 0-based month
      const now = date.getTime();
      utils.setMockDateTime(now);
      const consoleSpy = spyOn(console, "log");

      reportProgress.reportProgress(percentDone, deleteOptions, deletedItemId, status);

      expect(consoleSpy.calls.count()).withContext("should call console.log once").toBe(1);
      expect(consoleSpy.calls.argsFor(0)[0]).toBe(now);
      expect(consoleSpy.calls.argsFor(0)[1]).toBe(deletedItemId);
      expect(consoleSpy.calls.argsFor(0)[2]).toBe("Ginger");
      expect(consoleSpy.calls.argsFor(0)[3]).toBe("3 Finished");
      expect(consoleSpy.calls.argsFor(0)[4]).toBe("50%");
    });
  });
});
