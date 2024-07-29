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
import { createHubRequestOptions } from "../src/create-hub-request-options";
import * as utils from "./mocks/utils";
import * as portalModule from "@esri/arcgis-rest-portal";
const MOCK_USER_SESSION = utils.createRuntimeMockUserSession();

describe("createHubRequestOptions", () => {
  it("returns portal from templateDict", async () => {
    const td = {
      organization: {
        id: "somePortalId",
        portalHostname: "www.arcgis.com",
      },
      user: {
        username: "rando",
      },
    };

    spyOn(portalModule, "getUser").and.resolveTo({
      username: MOCK_USER_SESSION.username,
    });

    const hubRo = await createHubRequestOptions(MOCK_USER_SESSION, td);
    expect(hubRo.portalSelf?.id).withContext("should copy organization to portalSelf").toBe("somePortalId");
    expect(hubRo.portalSelf?.user?.username)
      .withContext("use return user from getUser not templateDict")
      .toBe(MOCK_USER_SESSION.username);
    expect(hubRo.authentication).toBe(MOCK_USER_SESSION, "should pass thru the auth");
  });

  it("fetches org and user info", async () => {
    const portal = {
      id: "bc23",
      portalHostname: "www.arcgis.com",
      name: "somePortal",
      isPortal: false,
    } as portalModule.IPortal;
    const getSelfSpy = spyOn(portalModule, "getSelf").and.resolveTo(portal);
    const getUserSpy = spyOn(portalModule, "getUser").and.resolveTo({
      username: MOCK_USER_SESSION.username,
    });

    const ro = await createHubRequestOptions(MOCK_USER_SESSION);
    expect(ro.hubApiUrl).toBe("https://hub.arcgis.com", "should map up hub url");
    expect(getSelfSpy.calls.count()).toBe(1, "should get self");
    expect(getUserSpy.calls.count()).toBe(1, "should get user");
  });

  it("does not set hubApiUrl if portal", async () => {
    const portal = {
      id: "bc23",
      portalHostname: "www.arcgis.com",
      name: "somePortal",
      isPortal: true,
    } as portalModule.IPortal;
    const getSelfSpy = spyOn(portalModule, "getSelf").and.resolveTo(portal);
    const getUserSpy = spyOn(portalModule, "getUser").and.resolveTo({
      username: MOCK_USER_SESSION.username,
    });

    const ro = await createHubRequestOptions(MOCK_USER_SESSION);
    expect(ro.hubApiUrl).not.toBeDefined("should not return hubApiUrl for portal");
    expect(getSelfSpy.calls.count()).toBe(1, "should get self");
    expect(getUserSpy.calls.count()).toBe(1, "should get user");
  });
});
