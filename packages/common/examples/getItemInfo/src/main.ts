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
// @esri/solution-common getItemInfo TypeScript example

import * as common from "@esri/solution-common";

interface IRelatedItems {
  relationshipType: string;
  relatedItemIds: string[];
}

export function getItemInfo(
  itemId: string,
  authentication: common.UserSession
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (!itemId) {
      reject("Item's ID is not defined");
      return;
    }

    // Get the item information
    const itemFwdRelatedItemsDef = getItemRelatedItems(
      itemId,
      "forward",
      authentication
    );
    const itemRevRelatedItemsDef = getItemRelatedItems(
      itemId,
      "reverse",
      authentication
    );

    const itemBaseDef = common.getItemBase(itemId, authentication);
    const itemDataDef = new Promise<Blob>((resolve2, reject2) => {
      // tslint:disable-next-line: no-floating-promises
      itemBaseDef.then(
        // any error fetching item base will be handled via Promise.all later
        (itemBase: any) => {
          common
            .getItemDataAsFile(itemId, itemBase.name, authentication)
            .then(resolve2, (error: any) => reject2(JSON.stringify(error)));
        }
      );
    });
    const itemThumbnailDef = new Promise<Blob>((resolve3, reject3) => {
      // tslint:disable-next-line: no-floating-promises
      itemBaseDef.then(
        // any error fetching item base will be handled via Promise.all later
        (itemBase: any) => {
          common
            .getItemThumbnail(itemId, itemBase.thumbnail, false, authentication)
            .then(resolve3, (error: any) => reject3(JSON.stringify(error)));
        }
      );
    });
    const itemMetadataDef = common.getItemMetadataBlob(itemId, authentication);
    const itemResourcesDef = common.getItemResourcesFiles(
      itemId,
      authentication
    );

    Promise.all([
      itemBaseDef,
      itemDataDef,
      itemThumbnailDef,
      itemMetadataDef,
      itemResourcesDef,
      itemFwdRelatedItemsDef,
      itemRevRelatedItemsDef
    ]).then(
      async responses => {
        const [
          itemBase,
          itemDataFile,
          itemThumbnail,
          itemMetadataBlob,
          itemResourceFiles,
          itemFwdRelatedItems,
          itemRevRelatedItems
        ] = responses;
        // Summarize what we have
        // ----------------------
        // (itemBase: any)  text/plain JSON
        // (itemData: File)  */*
        // (itemThumbnail: Blob)  image/*
        // (itemMetadata: Blob)  application/xml
        // (itemResources: File[])  list of */*
        // (itemFwdRelatedItems: IRelatedItems[])  list of forward relationshipType/relatedItems[] pairs
        // (itemRevRelatedItems: IRelatedItems[])  list of reverse relationshipType/relatedItems[] pairs
        console.log("itemBase", itemBase);
        console.log("itemData", itemDataFile);
        console.log("itemThumbnail", itemThumbnail);
        console.log("itemMetadata", itemMetadataBlob);
        console.log("itemResources", JSON.stringify(itemResourceFiles));
        console.log("itemFwdRelatedItems", JSON.stringify(itemFwdRelatedItems));
        console.log("itemRevRelatedItems", JSON.stringify(itemRevRelatedItems));

        const portalUrl = common.getPortalUrlFromAuth(authentication);

        // Show item and data sections
        let html =
          "<h3>" +
          itemBase.type +
          ' "' +
          itemBase.title +
          '" (<a href="' +
          portalUrl +
          "/home/item.html?id=" +
          itemBase.id +
          '" target="_blank">' +
          itemBase.id +
          "</a>)</h3>";

        html +=
          '<div style="width:48%;display:inline-block;">Item</div>' +
          '<div style="width:2%;display:inline-block;"></div>' +
          '<div style="width:48%;display:inline-block;">Data</div>' +
          '<div style="width:48%;display:inline-block;"><textarea rows="10" style="width:99%;font-size:x-small">' +
          JSON.stringify(itemBase, null, 2) +
          "</textarea></div>" +
          '<div style="width:2%;display:inline-block;"></div>' +
          '<div id="dataSection" style="width:48%;display:inline-block;vertical-align: top;">';
        html += await showBlob(itemDataFile, "dataSection");
        html += "</div>";

        // Show thumbnail section
        html += '<p>Thumbnail<br/><div id="thumbnailOutput">';
        html += await showBlob(itemThumbnail, "thumbnailOutput");
        html += "</div></p>";

        // Show metadata section
        html += '<p>Metadata<br/><div id="metadataOutput">';
        html += await showBlob(itemMetadataBlob, "metadataOutput");
        html += "</div></p>";

        // Show resources section
        html += "<p>Resources<br/>";
        if (itemResourceFiles.length === 0) {
          html += "<p><i>none</i>";
        } else {
          html += "<ol>";
          for (let i: number = 0; i < itemResourceFiles.length; ++i) {
            const containerId = "resourceOutput" + i;
            html += '<li><div id="' + containerId + '">';
            html += await showBlob(itemResourceFiles[i], containerId);
            html += "</div></li>";
          }
          html += "</ol>";
        }
        html += "</p>";

        // Show related items section
        html += "<p>Related Items<br/>";
        if (
          itemFwdRelatedItems.length === 0 &&
          itemRevRelatedItems.length === 0
        ) {
          html += "<p><i>none</i>";
        } else {
          html +=
            "<ul style='margin-left:-36px;list-style-type:none;font-size:smaller;'>";
          for (const relatedItem of itemFwdRelatedItems) {
            html +=
              "<li>&rarr; " +
              relatedItem.relationshipType +
              " " +
              JSON.stringify(relatedItem.relatedItemIds) +
              "</li>";
          }
          for (const relatedItem of itemRevRelatedItems) {
            html +=
              "<li>&larr; " +
              relatedItem.relationshipType +
              " " +
              JSON.stringify(relatedItem.relatedItemIds) +
              "</li>";
          }
          html += "</ul>";
        }
        html += "</p>";

        // Show sections custom to item types
        if (itemBase.type === "Feature Service") {
          if (authentication.token) {
            // These queries require authentication
            // Show resources section
            common
              .getFeatureServiceProperties(itemBase.url, authentication)
              .then(
                (properties: common.IFeatureServiceProperties) => {
                  html += "<p>Feature Service Properties<br/>";

                  html +=
                    "<p><i>Service description</i><br/>" +
                    textAreaHtml(JSON.stringify(properties.service, null, 2)) +
                    "</p>";

                  html += "<p><i>Layers</i>";
                  properties.layers.forEach(
                    layer =>
                      (html += textAreaHtml(JSON.stringify(layer, null, 2)))
                  );
                  html += "</p>";

                  html += "<p><i>Tables</i>";
                  properties.tables.forEach(
                    layer =>
                      (html += textAreaHtml(JSON.stringify(layer, null, 2)))
                  );
                  html += "</p>";

                  html += "</p>";
                  resolve(html);
                },
                (error: any) => reject(JSON.stringify(error))
              );
          } else {
            resolve(html);
          }
        } else {
          resolve(html);
        }
      },
      (error: any) => reject(JSON.stringify(error))
    );
  });
}

function getItemRelatedItems(
  itemId: string,
  direction: "forward" | "reverse",
  authentication: common.UserSession
): Promise<IRelatedItems[]> {
  return new Promise<IRelatedItems[]>(resolve => {
    const relationshipTypes = [
      // from common.ItemRelationshipType
      "Map2Service",
      "WMA2Code",
      "Map2FeatureCollection",
      "MobileApp2Code",
      "Service2Data",
      "Service2Service",
      "Map2AppConfig",
      "Item2Attachment",
      "Item2Report",
      "Listed2Provisioned",
      "Style2Style",
      "Service2Style",
      "Survey2Service",
      "Survey2Data",
      "Service2Route",
      "Area2Package",
      "Map2Area",
      "Service2Layer",
      "Area2CustomPackage",
      "TrackView2Map",
      "SurveyAddIn2Data"
    ];

    const relatedItemDefs: Array<Promise<
      common.IGetRelatedItemsResponse
    >> = relationshipTypes.map(relationshipType =>
      common.getItemRelatedItems(
        itemId,
        relationshipType as common.ItemRelationshipType,
        direction,
        authentication
      )
    );
    // tslint:disable-next-line: no-floating-promises
    Promise.all(relatedItemDefs).then(
      (relationshipResponses: common.IGetRelatedItemsResponse[]) => {
        const relatedItems: IRelatedItems[] = [];

        for (let i: number = 0; i < relationshipTypes.length; ++i) {
          if (relationshipResponses[i].total > 0) {
            relatedItems.push({
              relationshipType: relationshipTypes[i],
              relatedItemIds: relationshipResponses[i].relatedItems.map(
                item => item.id
              )
            });
          }
        }

        resolve(relatedItems);
      }
    );
  });
}

/**
 * Creates the HTML for a textarea using the supplied text.
 *
 * @param text Text to insert into textarea
 * @return textarea HTML
 */
function textAreaHtml(text: any): string {
  return (
    '<textarea rows="10" style="width:99%;font-size:x-small">' +
    text +
    "</textarea>"
  );
}

/**
 * Creates the HTML for a blob and adds it to the innerHTML of the supplied DOM container.
 *
 * @param blob Blob or File to display
 * @param domContainerId Id of DOM container to receive created HTML
 */
function showBlob(blob: Blob, domContainerId: string): Promise<string> {
  return new Promise<string>(resolve => {
    if (!blob || blob.size === 0) {
      resolve("<i>none</i>");
      return;
    }
    const file = blob as File;

    if (blob.type === "application/json") {
      common.blobToJson(blob).then(
        text => resolve(textAreaHtml(JSON.stringify(text, null, 2))),
        error => resolve("<i>problem extracting JSON: " + error + "</i>")
      );
    } else if (
      blob.type.startsWith("text/plain") ||
      blob.type === "text/xml" ||
      blob.type === "application/xml"
    ) {
      common.blobToText(blob).then(
        text => resolve(textAreaHtml(text)),
        error => resolve("<i>problem extracting text: " + error + "</i>")
      );
    } else if (blob.type.startsWith("image/")) {
      let html =
        '<img src="' +
        window.URL.createObjectURL(blob) +
        '" style="max-width:256px;border:1px solid lightgray;"/>';
      if (file.name) {
        html +=
          '&nbsp;&nbsp;&nbsp;&nbsp;<a href="' +
          window.URL.createObjectURL(file) +
          '" download="' +
          file.name +
          '">' +
          file.name +
          "</a>";
      }
      html += "</p>";
      resolve(html);
    } else {
      if (file.name) {
        resolve(
          '<a href="' +
            window.URL.createObjectURL(file) +
            '" download="' +
            file.name +
            '">' +
            file.name +
            "</a>"
        );
      } else {
        resolve(
          '<a href="' +
            window.URL.createObjectURL(blob) +
            '">' +
            blob.type +
            "</a>"
        );
      }
    }
  });
}
