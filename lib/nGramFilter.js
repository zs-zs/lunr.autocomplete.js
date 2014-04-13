var PatriciaTree = require('patricia-tree');

var insertPendingNGrams = function insertPendingNGrams (ngramList, tree, n) {
	if (ngramList.length != n) {
		tree.insert(ngramList.join(' '));
	}
	for (var j = 1; j <= ngramList.length - 2; j++) {
		tree.insert(ngramList.slice(j).join(' '));
	}
};

var NGramFilter = function NGramFilter (n) {
	var self = this;
	var ngram = [];
	var lastTokenList = null;
	self.ngramAutocompleteTree = new PatriciaTree();

	return {
		process: function (token, tokenIndex, tokenList) {
			if (tokenList !== lastTokenList) {
				/* new token list means a new document */
				ngram = [];
				for (var i = 0; i < tokenList.length; i++) {
					var currentToken = tokenList[i];
					if (ngram.length === n) {
						ngram.splice(0, 1);
					}
					ngram.push(currentToken);
					if (ngram.length === n || i === tokenList.length - 1) {
						self.ngramAutocompleteTree.insert(ngram.join(' '));
					}
				}
				insertPendingNGrams(ngram, self.ngramAutocompleteTree, n);
				lastTokenList = tokenList;
			}
			return token;
		},
		autocomplete: function (prefix) {
			return self.ngramAutocompleteTree.complete(prefix);
		}
	}
};

module.exports = NGramFilter;
