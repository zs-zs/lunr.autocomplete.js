var NGramFilter = require('./nGramFilter');

lunr.autocomplete = function (idx, n) {
	var ngramFilter = new NGramFilter(n);
	this.indexPipeline.before(lunr.stemmer, ngramFilter.process);
	this.autocomplete = ngramFilter.autocomplete;
};
