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
// @esri/solution-creator createSolution example

import * as common from "@esri/solution-common";
import * as creator from "@esri/solution-creator";
import * as getFormattedItemInfo from "./getFormattedItemInfo";

export function createSolution(
  sourceId: string,
  srcAuthentication: common.UserSession,
  destAuthentication: common.UserSession,
  progressCallback: common.ISolutionProgressCallback,
  subgroupIds: string[]
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (!sourceId) {
      reject("The group or item ID is not defined");
      return;
    }

    // Create a solution from the supplied id
    const options: common.ICreateSolutionOptions = {
      progressCallback: progressCallback,
      subgroupIds
    };
    creator.createSolution(sourceId.trim(), srcAuthentication, destAuthentication, options).then(
      createdSolutionId => {
        getFormattedItemInfo.getFormattedItemInfo(createdSolutionId, destAuthentication).then(
          itemInfoHtml => resolve(itemInfoHtml),
          error => reject(error.error)
        );
      },
      error => reject(error)
    );
  });
}
