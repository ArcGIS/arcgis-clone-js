---
title: Using Solution.js in AMD with Require.js or Dojo
navTitle: AMD (Require.js or Dojo)
description: Learn how to integrate the Solution.js library into project using AMD with Require.js or Dojo.
order: 40
group: 1-get-started
---

# Get Started with Solution.js and AMD

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Using Solution.js in AMD with Require.js or Dojo</title>
</head>
<body>
  Open your console to see the demo.
</body>
  <!-- require polyfills for fetch and Promise from https://polyfill.io -->
  <script src="https://polyfill.io/v3/polyfill.min.js?features=es5%2Cfetch%2CPromise"></script>

  <script>
    dojoConfig = {
      paths: {
        "@esri/arcgis-rest-auth": "https://unpkg.com/@esri/arcgis-rest-auth/dist/umd/auth.umd.min",
        "@esri/arcgis-rest-feature-layer": "https://unpkg.com/@esri/arcgis-rest-feature-layer/dist/umd/feature-layer.umd.min",
        "@esri/arcgis-rest-portal": "https://unpkg.com/@esri/arcgis-rest-portal/dist/umd/portal.umd.min",
        "@esri/arcgis-rest-request": "https://unpkg.com/@esri/arcgis-rest-request/dist/umd/request.umd.min",
        "@esri/arcgis-rest-service-admin": "https://unpkg.com/@esri/arcgis-rest-service-admin/dist/umd/service-admin.umd.min",
        "@esri/hub-common": "https://unpkg.com/@esri/hub-common/dist/umd/common.umd",
        "@esri/hub-sites": "https://unpkg.com/@esri/hub-sites/dist/umd/sites.umd",
        "@esri/hub-initiatives": "https://unpkg.com/@esri/hub-initiatives/dist/umd/initiatives.umd",
        "@esri/solution-common": "https://unpkg.com/@esri/solution-common/dist/umd/common.umd.min"
      }
    };
  </script>
  <script src="https:////ajax.googleapis.com/ajax/libs/dojo/1.10.4/dojo/dojo.js"></script>

  <script>
    require(["@esri/solution-common"], function(solutionCommon) {
      var originalExtent = {
        xmin: -9821384,
        ymin: 5117339,
        xmax: -9797228,
        ymax: 5137789,
        spatialReference: { wkid: 102100 }
      };
      var desiredSpatialRef = { wkid: 4326 };

      solutionCommon.convertExtent(
        originalExtent,
        desiredSpatialRef,
        "http://sampleserver6.arcgisonline.com/arcgis/rest/services/Utilities/Geometry/GeometryServer"
      ).then(
        response => console.log(JSON.stringify(response, null, 2)),
        response => console.error(JSON.stringify(response, null, 2))
      );
    });
  </script>
</html>
```
