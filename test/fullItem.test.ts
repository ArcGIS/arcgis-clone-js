/*
 | Copyright 2018 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */

import * as fetchMock from "fetch-mock";

import { IFullItem, getFullItem } from "../src/fullItem";

import { ItemFailResponse, ItemDataOrResourceFailResponse,
  ItemResourcesSuccessResponseNone, ItemResourcesSuccessResponseOne,
  ItemSuccessResponseDashboard, ItemDataSuccessResponseDashboard,
  ItemSuccessResponseWebmap, ItemDataSuccessResponseWebmap,
  ItemSuccessResponseWMA, ItemDataSuccessResponseWMA,
  ItemSuccessResponseService, ItemDataSuccessResponseService
} from "./mocks/fullItemQueries";

import { UserSession } from "@esri/arcgis-rest-auth";
import { IUserRequestOptions } from "@esri/arcgis-rest-auth";
import { TOMORROW } from "./lib/utils";

//--------------------------------------------------------------------------------------------------------------------//

describe("Module `fullItem`: fetches the item, data, and resources of an AGOL item", () => {

  jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;  // default is 5000 ms

  // Set up a UserSession to use in all these tests
  const MOCK_USER_SESSION = new UserSession({
    clientId: "clientId",
    redirectUri: "https://example-app.com/redirect-uri",
    token: "fake-token",
    tokenExpires: TOMORROW,
    refreshToken: "refreshToken",
    refreshTokenExpires: TOMORROW,
    refreshTokenTTL: 1440,
    username: "casey",
    password: "123456",
    portal: "https://myorg.maps.arcgis.com/sharing/rest"
  });

  const MOCK_USER_REQOPTS:IUserRequestOptions = {
    authentication: MOCK_USER_SESSION
  };

  afterEach(() => {
    fetchMock.restore();
  });

  describe("catch bad input", () => {

    it("throws an error if the item to be created fails: missing id", done => {
      fetchMock.mock("*", ItemFailResponse);
      getFullItem(null, MOCK_USER_REQOPTS)
      .then(
        fail,
        error => {
          expect(error.message).toEqual("Item or group does not exist or is inaccessible: null");
          done();
        }
      );
    });

    it("throws an error if the item to be created fails: inaccessible", done => {
      fetchMock
      .mock("path:/sharing/rest/content/items/fail1234567890", ItemFailResponse, {})
      .mock("path:/sharing/rest/community/groups/fail1234567890", ItemFailResponse, {});
      getFullItem("fail1234567890", MOCK_USER_REQOPTS)
      .then(
        fail,
        error => {
          expect(error.message).toEqual("Item or group does not exist or is inaccessible: fail1234567890");
          done();
        }
      );
    });

  });

  describe("fetch different item types", () => {
    [
      {
        id: "dash1234657890", type: "Dashboard", item: ItemSuccessResponseDashboard,
        data: ItemDataSuccessResponseDashboard, resources: ItemResourcesSuccessResponseNone
      },
      {
        id: "map1234657890", type: "Web Map", item: ItemSuccessResponseWebmap,
        data: ItemDataSuccessResponseWebmap, resources: ItemResourcesSuccessResponseNone
      },
      {
        id: "wma1234657890", type: "Web Mapping Application", item: ItemSuccessResponseWMA,
        data: ItemDataSuccessResponseWMA, resources: ItemResourcesSuccessResponseNone
      }
    ].forEach(({id, type, item, data, resources}) => {
      it("should create a " + type + " based on the AGOL response", done => {
        fetchMock
        .mock("path:/sharing/rest/content/items/" + id, item, {})
        .mock("path:/sharing/rest/content/items/" + id + "/data", data, {})
        .mock("path:/sharing/rest/content/items/" + id + "/resources", resources, {});

        getFullItem(id, MOCK_USER_REQOPTS)
        .then(response => {
          expect(fetchMock.called("path:/sharing/rest/content/items/" + id)).toEqual(true);
          expect(fetchMock.called("path:/sharing/rest/content/items/" + id + "/data")).toEqual(true);
          expect(fetchMock.called("path:/sharing/rest/content/items/" + id + "/resources")).toEqual(true);

          expect(response.type).toEqual(type);

          expect(response.item).toEqual(jasmine.anything());
          expect(Object.keys(response.item).length).toEqual(42);

          expect(response.data).toEqual(jasmine.anything());
          done();
        })
        .catch(e => fail(e));
      });
    });

    it("should create a Feature Service based on the AGOL response", done => {
      let baseSvcURL = "https://services123.arcgis.com/org1234567890/arcgis/rest/services/ROWPermits_publiccomment/";
      fetchMock
      .mock("path:/sharing/rest/content/items/svc1234567890", ItemSuccessResponseService, {})
      .mock("path:/sharing/rest/content/items/svc1234567890/data", ItemDataSuccessResponseService, {})
      .mock("path:/sharing/rest/content/items/svc1234567890/resources", ItemResourcesSuccessResponseNone, {});

      getFullItem("svc1234567890", MOCK_USER_REQOPTS)
      .then(response => {
        expect(fetchMock.called("path:/sharing/rest/content/items/svc1234567890")).toEqual(true);
        expect(fetchMock.called("path:/sharing/rest/content/items/svc1234567890/data")).toEqual(true);
        expect(fetchMock.called("path:/sharing/rest/content/items/svc1234567890/resources")).toEqual(true);

        expect(response.type).toEqual("Feature Service");

        expect(response.item).toEqual(jasmine.anything());
        expect(Object.keys(response.item).length).toEqual(42);

        expect(response.data).toEqual(jasmine.anything());
        done();
      })
      .catch(e => fail(e));
    });

    it("should return WMA details for a valid AGOL id", done => {
      fetchMock
      .mock("path:/sharing/rest/content/items/wma1234567890", ItemSuccessResponseWMA, {})
      .mock("path:/sharing/rest/content/items/wma1234567890/data", ItemDataSuccessResponseWMA, {})
      .mock("path:/sharing/rest/content/items/wma1234567890/resources", ItemResourcesSuccessResponseOne, {});
      getFullItem("wma1234567890")
      .then(
        response => {
          expect(response.type).toEqual("Web Mapping Application");
          expect(response.item.title).toEqual("ROW Permit Public Comment");
          expect(response.data.source).toEqual("template1234567890");
          expect(response.resources).toEqual([{ "value": "abc"}]);
          done();
        },
        done.fail
      );
    });

    it("should handle an item without a data or a resource section", done => {
      fetchMock
      .mock("path:/sharing/rest/content/items/wma1234567890", ItemSuccessResponseWMA, {})
      .mock("path:/sharing/rest/content/items/wma1234567890/data", ItemDataOrResourceFailResponse, {})
      .mock("path:/sharing/rest/content/items/wma1234567890/resources", ItemDataOrResourceFailResponse, {});
      getFullItem("wma1234567890")
      .then(
        response => {
          expect(response.type).toEqual("Web Mapping Application");
          expect(response.item.title).toEqual("ROW Permit Public Comment");
          done();
        },
        done.fail
      );
    });

  });

});
