#!/usr/bin/env node

/* 
Author: Gabriel Montalvo
Desc: A NodeJS implementation of the shodan-runner shell script by jfer-bah 
*/

'use strict';

const dns = require('dns');
const program = require('commander');
const request = require('request');
const version = require('./package.json').version;

const shodanApiServer = 'https://api.shodan.io';

const errors = [
  'Missing required API key.',
  'Please check your internet connection.',
  'Wrong number of filter files used. Only two (2) are allowed.',
  'The Shodan API is unresponsive at the moment, please try again later.'
];

// Check network communication
(function () {
  dns.lookup('shodan.io', function (err) {
    if (err && err.code === 'ENOTFOUND') {
      console.error('\n' + errors[1] + '\n');
      process.exit(1);
    }
  });
} ());

// Extract query filter from filter files
const getQueryFilters = function (file, cb) {
  let queryFilterList = [];

  const reader = require('readline').createInterface({
    input: require('fs').createReadStream(file)
  });

  reader.on('line', function (queryFilter) {
    queryFilterList.push(queryFilter);
  }).on('close', function () {
    return cb(queryFilterList);
  });
};

program
  .version(version)
  .option('-K, --apiKey <key>', 'Shodan API key')
  .option('-l, --limit <int>', 'the number of results you want to download');

program
  .arguments('<outputfile> [files...]')
  .action(function (outputfile, files) {
    const apiKey = program.apiKey;

    if (files.length !== 2) {
      console.log(errors[2]);
      process.exit(1);
    }
    else if (!apiKey) {
      console.log(errors[0]);
      process.exit(1);
    }

    const filterFile1 = files[0];
    const filterFile2 = files[1];
    const limit = program.limit || 1000;

    getQueryFilters(filterFile1, function (queryFilters1) {
      getQueryFilters(filterFile2, function (queryFilters2) {
        let page = limit / 10; // Shodan only allows to fetch 10 items per request/page

        if (page % 1 !== 0) {
          page = Math.trunc(page) + 1;
        }

        for (let f1 of queryFilters1) {
          for (let f2 of queryFilters2) {
            let query = f1 + ' ' + f2;

            request.get(shodanApiServer + '/shodan/query/search?key=' +
              apiKey +
              '&query=' + query +
              '&page=' + page,
              function (err, res) {
                if (err) {
                  return console.log(errors[3]);
                }

                console.log(res.body);

                // TODO: Finish this after I get some credits.
              });
          }
        }
      });
    });
  });

// Overwrites the default outputhelp function 
program.outputHelp = function (cb) {
  if (!cb) {
    cb = function (passthru) {
      return passthru;
    };
  }

  process.stdout.write(cb(
    '███████╗██╗  ██╗ ██████╗ ██████╗  █████╗ ███╗   ██╗██████╗ ██╗   ██╗███╗   ██╗███╗   ██╗███████╗██████╗\n' +
    '██╔════╝██║  ██║██╔═══██╗██╔══██╗██╔══██╗████╗  ██║██╔══██╗██║   ██║████╗  ██║████╗  ██║██╔════╝██╔══██╗\n' +
    '███████╗███████║██║   ██║██║  ██║███████║██╔██╗ ██║██████╔╝██║   ██║██╔██╗ ██║██╔██╗ ██║█████╗  ██████╔╝\n' +
    '╚════██║██╔══██║██║   ██║██║  ██║██╔══██║██║╚██╗██║██╔══██╗██║   ██║██║╚██╗██║██║╚██╗██║██╔══╝  ██╔══██╗\n' +
    '███████║██║  ██║╚██████╔╝██████╔╝██║  ██║██║ ╚████║██║  ██║╚██████╔╝██║ ╚████║██║ ╚████║███████╗██║  ██║\n' +
    '╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ Version: ' + version + '\n' +
    'https://github.com/gmontalvoriv/shodan-runner-node\n' +
    'License: MIT\n\n' + this.helpInformation()) +
    '\n*No safety checks here for bad syntax or bad search filters, pay attention or lose search queries tokens*\n');
  this.emit('--help');
};

program.parse(process.argv);
if (!process.argv.slice(2).length) {
  program.outputHelp();
}