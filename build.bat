rem Builds the repository and its demos

call node --version
call npm --version

rem install the demos first because the overall install will perform symlinking of the solution.js libraries into the demos
pushd demos\compareJSON
call npm install
popd

pushd demos\copyItemInfo
call npm install
popd

pushd demos\copySolutions
call npm install
popd

pushd demos\createSolution
call npm install
popd

pushd demos\deleteSolution
call npm install
popd

pushd demos\deploySolution
call npm install
popd

pushd demos\getItemInfo
call npm install
popd

pushd demos\implementedTypes
call npm install
popd

pushd demos\verifySolution
call npm install
popd

rem install and build the packages
rmdir/s/q packages\common\dist 2>nul
rmdir/s/q packages\creator\dist 2>nul
rmdir/s/q packages\deployer\dist 2>nul
rmdir/s/q packages\feature-layer\dist 2>nul
rmdir/s/q packages\file\dist 2>nul
rmdir/s/q packages\form\dist 2>nul
rmdir/s/q packages\group\dist 2>nul
rmdir/s/q packages\hub-types\dist 2>nul
rmdir/s/q packages\simple-types\dist 2>nul
rmdir/s/q packages\storymap\dist 2>nul
rmdir/s/q packages\velocity\dist 2>nul
rmdir/s/q packages\viewer\dist 2>nul
rmdir/s/q packages\web-experience\dist 2>nul

call npm install
call npm run build

del/q packages\common\dist\cjs\package.json 2>nul
del/q packages\common\dist\esm\package.json 2>nul
del/q packages\creator\dist\cjs\package.json 2>nul
del/q packages\creator\dist\esm\package.json 2>nul
del/q packages\deployer\dist\cjs\package.json 2>nul
del/q packages\deployer\dist\esm\package.json 2>nul
del/q packages\feature-layer\dist\cjs\package.json 2>nul
del/q packages\feature-layer\dist\esm\package.json 2>nul
del/q packages\file\dist\cjs\package.json 2>nul
del/q packages\file\dist\esm\package.json 2>nul
del/q packages\form\dist\cjs\package.json 2>nul
del/q packages\form\dist\esm\package.json 2>nul
del/q packages\group\dist\cjs\package.json 2>nul
del/q packages\group\dist\esm\package.json 2>nul
del/q packages\hub-types\dist\cjs\package.json 2>nul
del/q packages\hub-types\dist\esm\package.json 2>nul
del/q packages\simple-types\dist\cjs\package.json 2>nul
del/q packages\simple-types\dist\esm\package.json 2>nul
del/q packages\storymap\dist\cjs\package.json 2>nul
del/q packages\storymap\dist\esm\package.json 2>nul
del/q packages\velocity\dist\cjs\package.json 2>nul
del/q packages\velocity\dist\esm\package.json 2>nul
del/q packages\viewer\dist\cjs\package.json 2>nul
del/q packages\viewer\dist\esm\package.json 2>nul
del/q packages\web-experience\dist\cjs\package.json 2>nul
del/q packages\web-experience\dist\esm\package.json 2>nul

rem build the demos
pushd demos\compareJSON
call npm run build
popd

pushd demos\copyItemInfo
call npm run build
popd

pushd demos\copySolutions
call npm run build
popd

pushd demos\createSolution
call npm run build
popd

pushd demos\deleteSolution
call npm run build
popd

pushd demos\deploySolution
call npm run build
popd

pushd demos\getItemInfo
call npm run build
popd

pushd demos\implementedTypes
call npm run build
popd

pushd demos\verifySolution
call npm run build
popd

call rmdir/q/s coverage
call npm run test:chrome:ci

