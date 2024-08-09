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

import { simpleTypes } from "@esri/solution-simple-types";
import * as common from "@esri/solution-common";
import * as convertProcessor from "../src/convert-item-to-template";
import * as utils from "../../common/test/mocks/utils";
import * as mockItems from "../../common/test/mocks/agolItems";
import * as templates from "../../common/test/mocks/templates";

describe("convertItemToTemplate", () => {
  let MOCK_USER_SESSION: common.UserSession;
  let template: common.IItemTemplate;

  beforeEach(() => {
    MOCK_USER_SESSION = utils.createRuntimeMockUserSession();
    template = templates.getItemTemplate("Form");
  });
  it("should delegate to simple types template creation", async () => {
    const simpleTypesSpy = spyOn(simpleTypes, "convertItemToTemplate").and.resolveTo(template);
    const formBase = mockItems.getAGOLItem("Form");
    const results = await convertProcessor.convertItemToTemplate(formBase, MOCK_USER_SESSION, MOCK_USER_SESSION, {});
    expect(simpleTypesSpy.calls.count()).toBe(1);
    expect(simpleTypesSpy.calls.first().args).toEqual([formBase, MOCK_USER_SESSION, MOCK_USER_SESSION, {}]);
    expect(results).toEqual(template);
  });
});
