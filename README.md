# lunr.autocomplete.js

This is an early implementation of an autocomplete extension for [lunr.js](https://github.com/olivernn/lunr.js).

## Build

You can build it with `browserify`: `browserify lib/lunr.autocomplete.js -o lunr.autocomplete.js`

## TODO

* Check for caller inside the pipeline function in `nGramFilter.js` because `lunr` calls the indexing pipeline during search
* Extend results with lunr Tf/idf score
* Tests
