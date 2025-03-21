#!/usr/bin/env bash
cd "$(dirname "$0")"
go run main.go

npm run build
