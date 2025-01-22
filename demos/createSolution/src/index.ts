/** @license
 * Copyright 2023 Esri
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

import "./style.css";
import * as common from "@esri/solution-common";
import * as htmlUtil from "./htmlUtil";
import * as main from "./create-solution-main";

declare var goFcn: any;

//--------------------------------------------------------------------------------------------------------------------//

/**
 * Runs the solution creation.
 */
function go () {
  document.getElementById("input").style.display = "none";
  document.getElementById("output").style.display = "block";
  var startTime = Date.now();

  // Use the manually entered value
  var id = htmlUtil.getHTMLValue("itemOrGroupId");

  // Are we embedding groups?
  let subgroupIds: string[] = [];
  if (htmlUtil.getHTMLChecked("includeSubgroups")) {
    const subgroupIdsList = htmlUtil.getHTMLValue("subgroupIds") as string;
    if (subgroupIdsList) {
      subgroupIds = subgroupIdsList.split(",")
        .map(id => id.trim());
    }
  }

  // Source credentials
  const srcHtmlValue = htmlUtil.getHTMLValue("srcPortal");
  const srcPortalStr = srcHtmlValue.endsWith('/') ? srcHtmlValue.slice(0, -1) : srcHtmlValue;
  const srcPortal = (srcPortalStr || "https://www.arcgis.com") + "/sharing/rest";
  const srcCreds = new common.UserSession({
    username: htmlUtil.getHTMLValue("srcUsername"),
    password: htmlUtil.getHTMLValue("srcPassword"),
    portal: srcPortal
  });

  // Dest credentials  (same as Source to keep demo app working and beahvior similiar to Creation app)
  const destHtmlValue = htmlUtil.getHTMLValue("srcPortal");
  const destPortalStr = destHtmlValue.endsWith('/') ? destHtmlValue.slice(0, -1) : destHtmlValue;
  const destPortal = (destPortalStr || "https://www.arcgis.com") + "/sharing/rest";
  const destCreds = new common.UserSession({
    username: htmlUtil.getHTMLValue("srcUsername"),
    password: htmlUtil.getHTMLValue("srcPassword"),
    portal: destPortal
  });

  /*
    // Dest credentials  (uncomment this and html if you want to target different org for test purproses)
    const destHtmlValue = htmlUtil.getHTMLValue("destPortal");
    const destPortalStr = destHtmlValue.endsWith('/') ? destHtmlValue.slice(0, -1) : destHtmlValue;
    const destPortal = (destPortalStr || "https://www.arcgis.com") + "/sharing/rest";
    const destCreds = new common.UserSession({
      username: htmlUtil.getHTMLValue("destUsername"),
      password: htmlUtil.getHTMLValue("destPassword"),
      portal: destPortal
    });
  */

  // Create!
  main.createSolution(
    id,
    srcCreds,
    destCreds,
    percentDone => {
      document.getElementById("output").innerHTML = "Creating..." + percentDone.toFixed().toString() + "%";
    },
    subgroupIds
  ).then(function(html) {
    reportElapsedTime(startTime);
    document.getElementById("output").innerHTML = html;
  },
    error => {
      var message = error?.error || JSON.stringify(error) || "Unspecified error";
      if (error.itemIds) {
        message += "<ul>";
        error.itemIds.forEach(
          (itemId: string) => {
            message += "<li>" + itemId + "</li>";
          }
        );
        message += "</ul>";
      }
      reportElapsedTime(startTime);
      document.getElementById("output").innerHTML = "<span style=\"color:red\">" + message + "</span>";
    }
  );
}

/**
 * Reports an elapsed time to the console log.
 *
 * @param startTime `Date` to use as a start time
 */
function reportElapsedTime (startTime: number) {
  var endTime = Date.now();
  console.log("Elapsed time: " + ((endTime - startTime) / 1000).toFixed(1) + " seconds");
}

//--------------------------------------------------------------------------------------------------------------------//

goFcn = go;

document.getElementById("container").style.display = "block";
