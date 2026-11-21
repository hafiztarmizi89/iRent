#!/bin/bash
cd "$(dirname "$0")"
npm install && npm run dist:mac && open dist
