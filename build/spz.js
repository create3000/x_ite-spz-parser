#!/usr/bin/env node
"use strict";

const { sh, systemSync } = require ("shell-tools");

function main ()
{
   const cwd = process .cwd ();

   systemSync ("mkdir build-spz");
   process .chdir ("build-spz");
   systemSync ("git clone --depth 1 --single-branch https://github.com/nianticlabs/spz.git");
   process .chdir ("spz");
   systemSync ("emcmake cmake -B build-wasm .");
   systemSync ("cmake --build build-wasm");
   process .chdir (cwd);
   systemSync ("cp -r build-spz/spz/dist src/spz");
   systemSync ("rm -r -f build-spz");
}

main ();
