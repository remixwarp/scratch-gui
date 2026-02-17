#!/bin/bash
# A all-in-one script to install dependencies and run the project.

set -e

rm -rf node_modules
rm -rf dist
rm -rf build
rm -rf translations
rm package-lock.json

npm i --legacy-peer-deps
npm start