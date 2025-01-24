# Builds the repository and its demos

node --version
npm --version

# install the demos first because the overall install will perform symlinking of the solution.js libraries into the demos
cd demos/compareJSON && npm install ; cd ../..
cd demos/compareSolutions && npm install ; cd ../..
cd demos/copyItemInfo && npm install ; cd ../..
cd demos/copySolutions && npm install ; cd ../..
cd demos/createSolution && npm install ; cd ../..
cd demos/recreateSolution && npm install ; cd ../..
cd demos/deleteSolution && npm install ; cd ../..
cd demos/deploySolution && npm install ; cd ../..
cd demos/getItemInfo && npm install ; cd ../..
cd demos/implementedTypes && npm install ; cd ../..
cd demos/reuseDeployedItems && npm install ; cd ../..
cd demos/verifySolution && npm install ; cd ../..

# install and build the packages
npm install
npm run prettify
npm run lint:fix
npm run build
./commit-stamp.sh

# remove package.json files in distributions to keep lerna happy
rm ./packages/common/dist/cjs/package.json
rm ./packages/common/dist/esm/package.json
rm ./packages/creator/dist/cjs/package.json
rm ./packages/creator/dist/esm/package.json
rm ./packages/deployer/dist/cjs/package.json
rm ./packages/deployer/dist/esm/package.json
rm ./packages/feature-layer/dist/cjs/package.json
rm ./packages/feature-layer/dist/esm/package.json
rm ./packages/file/dist/cjs/package.json
rm ./packages/file/dist/esm/package.json
rm ./packages/form/dist/cjs/package.json
rm ./packages/form/dist/esm/package.json
rm ./packages/group/dist/cjs/package.json
rm ./packages/group/dist/esm/package.json
rm ./packages/hub-types/dist/cjs/package.json
rm ./packages/hub-types/dist/esm/package.json
rm ./packages/simple-types/dist/cjs/package.json
rm ./packages/simple-types/dist/esm/package.json
rm ./packages/storymap/dist/cjs/package.json
rm ./packages/storymap/dist/esm/package.json
rm ./packages/velocity/dist/cjs/package.json
rm ./packages/velocity/dist/esm/package.json
rm ./packages/viewer/dist/cjs/package.json
rm ./packages/viewer/dist/esm/package.json
rm ./packages/web-experience/dist/cjs/package.json
rm ./packages/web-experience/dist/esm/package.json
rm ./packages/web-tool/dist/cjs/package.json
rm ./packages/web-tool/dist/esm/package.json
rm ./packages/workflow/dist/cjs/package.json
rm ./packages/workflow/dist/esm/package.json

# build the demos
cd demos/compareJSON && npm run build ; cd ../..
cd demos/compareSolutions && npm run build ; cd ../..
cd demos/copyItemInfo && npm run build ; cd ../..
cd demos/copySolutions && npm run build ; cd ../..
cd demos/createSolution && npm run build ; cd ../..
cd demos/recreateSolution && npm run build ; cd ../..
cd demos/deleteSolution && npm run build ; cd ../..
cd demos/deploySolution && npm run build ; cd ../..
cd demos/getItemInfo && npm run build ; cd ../..
cd demos/implementedTypes && npm run build ; cd ../..
cd demos/reuseDeployedItems && npm run build ; cd ../..
cd demos/verifySolution && npm run build ; cd ../..

npm run test
