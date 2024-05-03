#!/bin/bash

# Make sure user is logged in to npm
npm whoami || exit 1

# Extract the version from lerna.json (this was updated by `npm run release:prepare`)
VERSION=$(node --eval "console.log(require('./lerna.json').version);")

# generate `docs/src/srihashes.json` after release and before committing
npm run docs:srihash

# commit the changes from `npm run release:prepare`
echo Commit the changes from npm run release:prepare
git add --all
git commit -am "v$VERSION" --no-verify

# increment the package.json version to the lerna version so gh-release works
npm version $VERSION --allow-same-version --no-git-tag-version

# amend the changes from `npm version` to the release commit
echo Amend the changes from npm version to the release commit
git add --all
git commit -am "v$VERSION" --no-verify --amend

# tag this version
git tag v$VERSION

# push everything up to this point
branch=$(git branch --show-current)
echo Push everything up to this point
git push https://github.com/Esri/solution.js.git $branch

# push the new tag, not the old tags
echo Push the new tag, not the old tags
git push https://github.com/Esri/solution.js.git v$VERSION

# create a ZIP archive of the dist files
TEMP_FOLDER=solution.js-v$VERSION;
mkdir $TEMP_FOLDER

mkdir $TEMP_FOLDER/common
cp -r packages/common/dist/esm/* $TEMP_FOLDER/common/
mkdir $TEMP_FOLDER/creator
cp -r packages/creator/dist/esm/* $TEMP_FOLDER/creator/
mkdir $TEMP_FOLDER/deployer
cp -r packages/deployer/dist/esm/* $TEMP_FOLDER/deployer/
mkdir $TEMP_FOLDER/feature-layer
cp -r packages/feature-layer/dist/esm/* $TEMP_FOLDER/feature-layer/
mkdir $TEMP_FOLDER/file
cp -r packages/file/dist/esm/* $TEMP_FOLDER/file/
mkdir $TEMP_FOLDER/form
cp -r packages/form/dist/esm/* $TEMP_FOLDER/form/
mkdir $TEMP_FOLDER/group
cp -r packages/group/dist/esm/* $TEMP_FOLDER/group/
mkdir $TEMP_FOLDER/hub-types
cp -r packages/hub-types/dist/esm/* $TEMP_FOLDER/hub-types/
mkdir $TEMP_FOLDER/simple-types
cp -r packages/simple-types/dist/esm/* $TEMP_FOLDER/simple-types/
mkdir $TEMP_FOLDER/storymap
cp -r packages/storymap/dist/esm/* $TEMP_FOLDER/storymap/
mkdir $TEMP_FOLDER/velocity
cp -r packages/velocity/dist/esm/* $TEMP_FOLDER/velocity/
mkdir $TEMP_FOLDER/viewer
cp -r packages/viewer/dist/esm/* $TEMP_FOLDER/viewer/
mkdir $TEMP_FOLDER/web-experience
cp -r packages/web-experience/dist/esm/* $TEMP_FOLDER/web-experience/
mkdir $TEMP_FOLDER/web-tool
cp -r packages/web-tool/dist/esm/* $TEMP_FOLDER/web-tool/
mkdir $TEMP_FOLDER/workflow
cp -r packages/workflow/dist/esm/* $TEMP_FOLDER/workflow/

zip -r $TEMP_FOLDER.zip $TEMP_FOLDER
rm -rf $TEMP_FOLDER

# Run gh-release to create a new release with our changelog changes and ZIP archive
echo npx gh-release -t v$VERSION -b v$VERSION -r solution.js -o Esri -a $TEMP_FOLDER.zip
npx gh-release -t v$VERSION -b v$VERSION -r solution.js -o Esri -a $TEMP_FOLDER.zip

# Delete the ZIP archive
rm $TEMP_FOLDER.zip
