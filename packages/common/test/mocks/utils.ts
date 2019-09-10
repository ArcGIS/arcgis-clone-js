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

import { UserSession } from "@esri/arcgis-rest-auth";

import * as mInterfaces from "../../src/interfaces";
import * as mObjHelpers from "../../src/generalHelpers";

// -------------------------------------------------------------------------------------------------------------------//

const orgUrl = "https://myorg.maps.arcgis.com";
const portalUrl = "https://www.arcgis.com";

export const TOMORROW = (function() {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  return now;
})();

export const YESTERDAY = (function() {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return now;
})();

export const ArcgisRestSuccessFailSimple = {
  success: false
};

export const ArcgisRestSuccessFailStruct = {
  success: false,
  error: {
    success: false
  }
};

export const SERVER_INFO = {
  currentVersion: 10.71,
  fullVersion: "10.7.1",
  soapUrl: "http://server/arcgis/services",
  secureSoapUrl: "https://server/arcgis/services",
  owningSystemUrl: "https://www.arcgis.com",
  authInfo: {}
};

export const UTILITY_SERVER_INFO = {
  currentVersion: 10.71,
  fullVersion: "10.7.1",
  soapUrl: "https://utility.arcgisonline.com/arcgis/services",
  secureSoapUrl: "https://utility.arcgisonline.com/arcgis/services",
  authInfo: {
    isTokenBasedSecurity: true,
    tokenServicesUrl: "https://utility.arcgisonline.com/arcgis/tokens/",
    shortLivedTokenValidity: 60
  }
};

export const PORTAL_SUBSET = {
  name: "Deployment Test",
  id: "abCDefG123456",
  restUrl: orgUrl + "/sharing/rest",
  portalUrl: orgUrl,
  urlKey: "deploymentTest"
};

export const PROGRESS_CALLBACK = function(): void {
  const tick = "tok";
};

export function getTokenResponse(token: string = "fake-token") {
  return { token: token };
}

export function getTransformationsResponse(hasTransformation: boolean = false) {
  return hasTransformation
    ? '{"transformations":[{wkid: 4326}]}'
    : '{"transformations":[]}';
}

export function getProjectResponse() {
  return {
    geometries: [
      {
        rings: [
          [
            [-88.009, 41.708], // xmax, ymin
            [-88.226, 41.708], // xmin, ymin
            [-88.226, 41.844], // xmin, ymax
            [-88.009, 41.844], // xmax, ymax
            [-88.009, 41.708] // xmax, ymin
          ]
        ]
      }
    ]
  };
}

export function getCreateFolderResponse(
  folderId: string = "a4468da125a64526b359b70d8ba4a9dd"
) {
  return getSuccessResponse({
    folder: {
      username: "casey",
      id: folderId,
      title: "Test Deployment"
    }
  });
}

export function getSuccessResponse(args?: any) {
  const response = { success: true };
  return Object.assign(response, args || {});
}

export function checkForArcgisRestSuccessRequestError(error: any): boolean {
  return (
    (error &&
      typeof error.success === "boolean" &&
      error.success === false &&
      typeof error.error === "object" &&
      error.error.name === "ArcGISRequestError") ||
    (error && typeof error.success === "boolean" && error.success === false)
  );
}

export function create404Error(errorMessage = "404 error"): any {
  return () => {
    throw new Error(errorMessage);
  };
}

export function createMockSettings(
  solutionName = "",
  folderId = null as string,
  access = "private"
): any {
  const settings: any = {
    organization: {
      orgUrl,
      portalBaseUrl: portalUrl
    },
    solutionName,
    folderId,
    access
  };

  return settings;
}

export function createRuntimeMockUserSession(now: number): UserSession {
  const tomorrow = new Date(now + 86400000);
  return new UserSession({
    clientId: "clientId",
    redirectUri: "https://example-app.com/redirect-uri",
    token: "fake-token",
    tokenExpires: tomorrow,
    refreshToken: "refreshToken",
    refreshTokenExpires: tomorrow,
    refreshTokenTTL: 1440,
    username: "casey",
    password: "123456",
    portal: orgUrl + "/sharing/rest"
  });
}

export function jsonClone(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Removes item-specific functions from templates.
 *
 * @param solutionTemplateItem Solution template
 */
export function removeItemFcns(
  solutionTemplateItem: mInterfaces.ISolutionItem
): void {
  const templates = mObjHelpers.getProp(solutionTemplateItem, "data.templates");
  if (templates) {
    if (Array.isArray(templates)) {
      templates.forEach(template => {
        delete template.fcns;
      });
    } else {
      delete templates.fcns;
    }
  }
}

export function removeNameField(layerOrTable: any): any {
  layerOrTable.name = null;
  return layerOrTable;
}

/**
 * Replaces the browser clock with a mock clock.
 *
 * @param now Time to use to set Jasmine clock
 * @note Be sure to call `jasmine.clock().uninstall()` after using this function in a test
 */
export function setMockDateTime(now: number): number {
  jasmine.clock().install();
  jasmine.clock().mockDate(new Date(now));
  return now;
}

export function getPortalResponse() {
  return {
    access: "public",
    allSSL: true,
    allowedRedirectUris: [] as string[],
    analysisLayersGroupQuery:
      'title:"Living Atlas Analysis Layers" AND owner:esri',
    authorizedCrossOriginDomains: [
      "https://ec2-18-219-57-96.us-east-2.compute.amazonaws.com"
    ],
    backgroundImage: "images/arcgis_background.jpg",
    basemapGalleryGroupQuery:
      'title:"United States Basemaps" AND owner:Esri_cy_US',
    bingKey: "AmMpS0SyUPJSy2uXeMLn5aAEdhqKNSwWyBLsKEqF4Sb_knUpLbvjny8z1b2SoxXz",
    colorSetsGroupQuery: 'title:"Esri Colors" AND owner:esri_en',
    commentsEnabled: false,
    contentCategorySetsGroupQuery:
      'title:"ArcGIS Online Content Category Sets" AND owner:esri_en',
    culture: "en",
    cultureFormat: "us",
    customBaseUrl: "maps.arcgis.com",
    defaultBasemap: {
      baseMapLayers: [
        {
          url:
            "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer",
          layerType: "ArcGISTiledMapServiceLayer",
          resourceInfo: {
            currentVersion: 10.3,
            mapName: "Layers",
            supportsDynamicLayers: false,
            layers: [
              {
                id: 0,
                name: "Citations",
                parentLayerId: -1,
                defaultVisibility: false,
                subLayerIds: undefined as string,
                minScale: 0,
                maxScale: 0
              }
            ],
            tables: [] as any[],
            spatialReference: {
              wkid: 102100,
              latestWkid: 3857
            },
            singleFusedMapCache: true,
            tileInfo: {
              rows: 256,
              cols: 256,
              dpi: 96,
              format: "JPEG",
              compressionQuality: 90,
              origin: {
                x: -20037508.342787,
                y: 20037508.342787
              },
              spatialReference: {
                wkid: 102100,
                latestWkid: 3857
              },
              lods: [
                {
                  level: 0,
                  resolution: 156543.03392800014,
                  scale: 591657527.591555
                },
                {
                  level: 1,
                  resolution: 78271.51696399994,
                  scale: 295828763.795777
                },
                {
                  level: 2,
                  resolution: 39135.75848200009,
                  scale: 147914381.897889
                },
                {
                  level: 3,
                  resolution: 19567.87924099992,
                  scale: 73957190.948944
                },
                {
                  level: 4,
                  resolution: 9783.93962049996,
                  scale: 36978595.474472
                },
                {
                  level: 5,
                  resolution: 4891.96981024998,
                  scale: 18489297.737236
                },
                {
                  level: 6,
                  resolution: 2445.98490512499,
                  scale: 9244648.868618
                },
                {
                  level: 7,
                  resolution: 1222.992452562495,
                  scale: 4622324.434309
                },
                {
                  level: 8,
                  resolution: 611.4962262813797,
                  scale: 2311162.217155
                },
                {
                  level: 9,
                  resolution: 305.74811314055756,
                  scale: 1155581.108577
                },
                {
                  level: 10,
                  resolution: 152.87405657041106,
                  scale: 577790.554289
                },
                {
                  level: 11,
                  resolution: 76.43702828507324,
                  scale: 288895.277144
                },
                {
                  level: 12,
                  resolution: 38.21851414253662,
                  scale: 144447.638572
                },
                {
                  level: 13,
                  resolution: 19.10925707126831,
                  scale: 72223.819286
                },
                {
                  level: 14,
                  resolution: 9.554628535634155,
                  scale: 36111.909643
                },
                {
                  level: 15,
                  resolution: 4.77731426794937,
                  scale: 18055.954822
                },
                {
                  level: 16,
                  resolution: 2.388657133974685,
                  scale: 9027.977411
                },
                {
                  level: 17,
                  resolution: 1.1943285668550503,
                  scale: 4513.988705
                },
                {
                  level: 18,
                  resolution: 0.5971642835598172,
                  scale: 2256.994353
                },
                {
                  level: 19,
                  resolution: 0.29858214164761665,
                  scale: 1128.497176
                },
                {
                  level: 20,
                  resolution: 0.14929107082380833,
                  scale: 564.248588
                },
                {
                  level: 21,
                  resolution: 0.07464553541190416,
                  scale: 282.124294
                },
                {
                  level: 22,
                  resolution: 0.03732276770595208,
                  scale: 141.062147
                },
                {
                  level: 23,
                  resolution: 0.01866138385297604,
                  scale: 70.5310735
                }
              ]
            },
            initialExtent: {
              xmin: -28848255.049479112,
              ymin: -2077452.082122866,
              xmax: 28848255.049479112,
              ymax: 16430757.376790084,
              spatialReference: {
                wkid: 102100,
                latestWkid: 3857
              }
            },
            fullExtent: {
              xmin: -20037507.067161843,
              ymin: -19971868.880408604,
              xmax: 20037507.067161843,
              ymax: 19971868.88040863,
              spatialReference: {
                wkid: 102100,
                latestWkid: 3857
              }
            },
            minScale: 591657527.591555,
            maxScale: 70.5310735,
            units: "esriMeters",
            supportedImageFormatTypes:
              "PNG32,PNG24,PNG,JPG,DIB,TIFF,EMF,PS,PDF,GIF,SVG,SVGZ,BMP",
            capabilities: "Map,Tilemap,Query,Data",
            supportedQueryFormats: "JSON, AMF",
            exportTilesAllowed: false,
            maxRecordCount: 100,
            maxImageHeight: 4096,
            maxImageWidth: 4096,
            supportedExtensions: "KmlServer"
          }
        }
      ],
      title: "Topographic"
    },
    defaultExtent: {
      xmin: -9821384.714217981,
      ymin: 5117339.123090005,
      xmax: -9797228.384715842,
      ymax: 5137789.39951188,
      spatialReference: {
        wkid: 102100
      }
    },
    defaultVectorBasemap: {
      baseMapLayers: [
        {
          id: "World_Hillshade_3805",
          layerType: "ArcGISTiledMapServiceLayer",
          url:
            "https://services.arcgisonline.com/arcgis/rest/services/Elevation/World_Hillshade/MapServer",
          visibility: true,
          opacity: 1,
          title: "World Hillshade"
        },
        {
          id: "VectorTile_2333",
          type: "VectorTileLayer",
          layerType: "VectorTileLayer",
          title: "World Topographic Map",
          styleUrl:
            "https://cdn.arcgis.com/sharing/rest/content/items/7dc6cea0b1764a1f9af2e679f642f0f5/resources/styles/root.json",
          visibility: true,
          opacity: 1
        }
      ],
      title: "Topographic"
    },
    description: "<br>",
    eueiEnabled: false,
    featuredGroups: [
      {
        title: "Community Basemaps",
        owner: "esri"
      },
      {
        title: "ArcGIS for Local Government",
        owner: "ArcGISTeamLocalGov"
      },
      {
        title: "ArcGIS for Local Government Try It Live Services",
        owner: "lind5149_lg",
        id: "72b563693f6f402c9bcfb94d1be38916"
      },
      {
        title: "Vector Basemap",
        owner: "chri4849_lg",
        id: "09a0c2935b6841f381db54e0566a2aaa"
      }
    ],
    featuredGroupsId: "",
    featuredItemsGroupQuery: "",
    galleryTemplatesGroupQuery: 'title:"Gallery Templates" AND owner:esri_en',
    hasCategorySchema: true,
    helpBase: "https://doc.arcgis.com/en/arcgis-online/",
    helperServices: {
      asyncClosestFacility: {
        url:
          "https://logistics.arcgis.com/arcgis/rest/services/World/ClosestFacility/GPServer/FindClosestFacilities",
        defaultTravelMode: "FEgifRtFndKNcJMJ"
      },
      asyncLocationAllocation: {
        url:
          "https://logistics.arcgis.com/arcgis/rest/services/World/LocationAllocation/GPServer",
        defaultTravelMode: "FEgifRtFndKNcJMJ"
      },
      asyncODCostMatrix: {
        url:
          "https://logistics.arcgis.com/arcgis/rest/services/World/OriginDestinationCostMatrix/GPServer",
        defaultTravelMode: "FEgifRtFndKNcJMJ"
      },
      asyncRoute: {
        url:
          "https://logistics.arcgis.com/arcgis/rest/services/World/Route/GPServer",
        defaultTravelMode: "FEgifRtFndKNcJMJ"
      },
      asyncServiceArea: {
        url:
          "https://logistics.arcgis.com/arcgis/rest/services/World/ServiceAreas/GPServer/GenerateServiceAreas",
        defaultTravelMode: "FEgifRtFndKNcJMJ"
      },
      asyncVRP: {
        url:
          "https://logistics.arcgis.com/arcgis/rest/services/World/VehicleRoutingProblem/GPServer/SolveVehicleRoutingProblem",
        defaultTravelMode: "FEgifRtFndKNcJMJ"
      },
      closestFacility: {
        url:
          "https://route.arcgis.com/arcgis/rest/services/World/ClosestFacility/NAServer/ClosestFacility_World",
        defaultTravelMode: "FEgifRtFndKNcJMJ"
      },
      defaultElevationLayers: [
        {
          url:
            "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer",
          id: "globalElevation",
          layerType: "ArcGISTiledElevationServiceLayer"
        }
      ],
      elevation: {
        url:
          "https://elevation.arcgis.com/arcgis/rest/services/Tools/Elevation/GPServer"
      },
      elevationSync: {
        url:
          "https://elevation.arcgis.com/arcgis/rest/services/Tools/ElevationSync/GPServer"
      },
      geocode: [
        {
          url:
            "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer",
          northLat: "Ymax",
          southLat: "Ymin",
          eastLon: "Xmax",
          westLon: "Xmin",
          name: "ArcGIS World Geocoding Service",
          zoomScale: 10000,
          suggest: true,
          placefinding: true,
          batch: true
        }
      ],
      geometry: {
        url:
          "https://utility.arcgisonline.com/arcgis/rest/services/Geometry/GeometryServer"
      },
      hydrology: {
        url:
          "https://hydro.arcgis.com/arcgis/rest/services/Tools/Hydrology/GPServer"
      },
      orthomappingElevation: {
        url:
          "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer"
      },
      packaging: {
        url:
          "https://packaging.arcgis.com/arcgis/rest/services/OfflinePackaging/GPServer"
      },
      printTask: {
        url:
          "https://utility.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task"
      },
      route: {
        url:
          "https://route.arcgis.com/arcgis/rest/services/World/Route/NAServer/Route_World",
        defaultTravelMode: "FEgifRtFndKNcJMJ"
      },
      routingUtilities: {
        url:
          "https://logistics.arcgis.com/arcgis/rest/services/World/Utilities/GPServer"
      },
      serviceArea: {
        url:
          "https://route.arcgis.com/arcgis/rest/services/World/ServiceAreas/NAServer/ServiceArea_World",
        defaultTravelMode: "FEgifRtFndKNcJMJ"
      },
      syncVRP: {
        url:
          "https://logistics.arcgis.com/arcgis/rest/services/World/VehicleRoutingProblemSync/GPServer/EditVehicleRoutingProblem",
        defaultTravelMode: "FEgifRtFndKNcJMJ"
      },
      traffic: {
        url:
          "https://traffic.arcgis.com/arcgis/rest/services/World/Traffic/MapServer"
      },
      trafficData: {
        url:
          "https://traffic.arcgis.com/arcgis/rest/services/World/TrafficFeeds/GPServer"
      },
      analysis: {
        url: "https://analysis.arcgis.com/arcgis/rest/services/tasks/GPServer"
      },
      geoenrichment: {
        url:
          "https://geoenrich.arcgis.com/arcgis/rest/services/World/GeoenrichmentServer"
      },
      asyncGeocode: {
        url: "https://analysis.arcgis.com/arcgis/rest/services/tasks/GPServer"
      },
      creditEstimation: {
        url:
          "https://analysis.arcgis.com/arcgis/rest/services/Estimate/GPServer"
      }
    },
    homePageFeaturedContent: "id:f292c6105dc243a2ad1377245722e312",
    homePageFeaturedContentCount: 12,
    id: "org1234567890",
    isPortal: false,
    layerTemplatesGroupQuery: 'title:"Esri Layer Templates" AND owner:esri_en',
    livingAtlasGroupQuery: 'title:"LAW Search" AND owner:Esri_LivingAtlas',
    metadataEditable: true,
    metadataFormats: ["iso19139"],
    name: "ArcGIS Team Local Gov",
    portalHostname: "www.arcgis.com",
    portalMode: "multitenant",
    portalName: "ArcGIS Online",
    portalProperties: {
      openData: {
        enabled: true,
        settings: {
          groupId: "0472bb819e9741809373812a6400dade",
          migrations: {
            siteToItems: true
          },
          appVersion: "2.1"
        }
      },
      sharedTheme: {
        logo: {
          small: undefined as string
        },
        button: {
          background: "#ebebeb",
          text: "#1a1a1a"
        },
        body: {
          link: "#004da8",
          background: "#ebebeb",
          text: "#474747"
        },
        header: {
          background: "#999999",
          text: "#242424"
        }
      },
      links: {
        contactUs: {
          url: "mailto:arcgisteamlocalgov@esri.com",
          visible: false
        }
      },
      showSocialMediaLinks: true,
      hub: {
        enabled: true,
        settings: {
          orgType: "enterprise",
          communityOrg: {
            orgId: "hcOb9dpllCwWSJAh",
            portalHostname: "gov-solutions.maps.arcgis.com"
          }
        }
      },
      revertStdSqlEndDate: 1554993043785,
      revertHttpsEndDate: 1558907781119
    },
    portalThumbnail: undefined as string,
    rasterFunctionTemplatesGroupQuery:
      'title:"Raster Function Templates" AND owner:esri_en',
    region: "WO",
    rotatorPanels: [
      {
        id: "banner-3",
        innerHTML:
          "<img src='images/banner-3.jpg' style='-webkit-border-radius:0 0 10px 10px; -moz-border-radius:0 0 10px 10px; -o-border-radius:0 0 10px 10px; border-radius:0 0 10px 10px; margin-top:0; width:960px; height:180px;'/><div style='position:absolute; bottom:80px; left:80px; max-height:65px; width:660px; margin:0;'><span style='position:absolute; bottom:0; margin-bottom:0; line-height:normal; font-family:HelveticaNeue,Verdana; font-weight:600; font-size:32px; color:#fff;'>ArcGIS Team Local Gov</span></div>"
      }
    ],
    showHomePageDescription: true,
    staticImagesUrl: "https://static.arcgis.com/images",
    stylesGroupQuery: 'title:"Esri Styles" AND owner:esri_en',
    supportsHostedServices: true,
    symbolSetsGroupQuery: 'title:"Esri Symbols" AND owner:esri_en',
    templatesGroupQuery: 'title:"Web Application Templates" AND owner:esri_en',
    thumbnail: "",
    units: "english",
    urlKey: "arcgis4localgov2",
    useVectorBasemaps: true,
    vectorBasemapGalleryGroupQuery:
      'title:"United States Vector Basemaps" AND owner:Esri_cy_US',
    publicSubscriptionInfo: {
      companionOrganizations: [
        {
          type: "Community",
          organizationUrl: "gov-solutions.maps.arcgis.com"
        }
      ]
    },
    ipCntryCode: "US",
    httpPort: 80,
    httpsPort: 443,
    supportsOAuth: true,
    currentVersion: "7.2",
    allowedOrigins: [] as any[]
  };
}

export function getCreateServiceResponse(
  url: string = "https://services123.arcgis.com/org1234567890/arcgis/rest/services/ROWPermits_publiccomment/FeatureServer",
  id: string = "svc1234567890",
  isView: boolean = false
) {
  const name: string = url
    .replace(/.+services[\/]/, "")
    .replace("/FeatureServer", "");
  return getSuccessResponse({
    encodedServiceURL: url,
    itemId: id,
    name: name,
    serviceItemId: id,
    serviceurl: url,
    size: -1,
    type: "Feature Service",
    isView: isView
  });
}
