(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var NGramFilter = require('./nGramFilter');

lunr.autocomplete = function (idx, n) {
	var ngramFilter = new NGramFilter(n);
	this.indexPipeline.before(lunr.stemmer, ngramFilter.process);
	this.autocomplete = ngramFilter.autocomplete;
};

},{"./nGramFilter":2}],2:[function(require,module,exports){
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
			//TODO: check for caller because lunr calls the indexing pipeline during search
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

},{"patricia-tree":4}],3:[function(require,module,exports){
function PropertyIterator (object) {
	var current = 0;
	// returns a function which iterates over the given object's properties
	return function() {
		return object[Object.keys(object)[current++]];
	};
}

function PathItem (node, getChildren) {
	this.node = node;
	this.nextChild = new PropertyIterator(getChildren(node));
}

module.exports = function LeafIterator (startNode, getChildren) {
	var currentPath = [new PathItem(startNode, getChildren)];

	var hasChild = function hasChild (node) {
		return Object.keys(getChildren(node)).length !== 0;
	};

	return function() {
		while(currentPath.length !== 0) {
			var activePathItem = currentPath[currentPath.length -1];
			var activeNode = activePathItem.node;
			var nextNode = activePathItem.nextChild();
			if(nextNode === undefined) {
				// we have to make a copy of the returned path, because of pop
				var pathNodes = currentPath.map(function(pathItem) {
					return pathItem.node;
				});
				currentPath.pop();
				if(!hasChild(activeNode)) {  // it has no children -> it's a leaf
					return {
						node: activeNode,
						path: pathNodes
					};
				}
			} else {
				currentPath.push(new PathItem(nextNode, getChildren));
			}
		}
		return undefined;
	};
};
},{}],4:[function(require,module,exports){
var StringMatcher = require('./stringMatcher');
var LeafIterator = require('./leafIterator');

function Node (options) {
	options = options || {};

	this.isTerminal = options.isTerminal;
	if(typeof this.isTerminal === typeof undefined)
		this.isTerminal = true;

	this.frequency = options.frequency;
	if(typeof this.frequency !== 'number')
		this.frequency = 1;

	this.label = options.label || '';
	this.children = {};
}

Node.prototype.increaseFrequency = function() {
	if(this.isTerminal) {
		this.frequency++;
	} else {
		this.isTerminal = true;
		this.frequency = 1;
	}
};

Node.prototype.split = function(hash, index) {
	var childNode = this.routeByHash(hash);
	var firstPart = childNode.label.substring(0, index);
	childNode.label = childNode.label.substring(index);
	this.children[hash] = new Node({ label: firstPart, isTerminal: false, frequency: 0 });
	this.children[hash].insertChild(childNode);
};

Node.prototype.insertChild = function(childNode) {
	var hash = childNode.label[0];
	this.children[hash] = childNode;
};

Node.prototype.routeByHash = function(prefix) {
	return this.children[prefix[0]];
};

function PatriciaTree () {
	this.root = new Node();
	this.count = 0;
}

var progressFrom = function(startNode, itemString, callback) {
	var itemMatcher = new StringMatcher(itemString);	
	var targetNode = startNode.routeByHash(itemMatcher.peek());
	var lastNode = startNode;

	while (targetNode && itemMatcher.thenMatch(targetNode.label) && 
		   itemMatcher.lastMatch.type == 'endOfPattern') {
		lastNode = targetNode;
		targetNode = targetNode.routeByHash(itemMatcher.peek());
	}
	return callback.call(this, itemMatcher, targetNode, lastNode);
};

PatriciaTree.prototype.insert = function(itemString) {
	if(!itemString)
		return;

	this.count++;
	return progressFrom.call(this, this.root, itemString, function(itemMatcher, targetNode, lastNode) {
		switch(itemMatcher.lastMatch.type) {
			case 'fullMatch': 
				// when the given string matches to the targetNode's label completely
				targetNode.increaseFrequency();
				break;
			case 'mismatch': 
				// when the given string doesn't match with the tree
				// we can't even reach the targetNode => split the lastNode, then insert there!
				var childNode = new Node({
					label: itemMatcher.remaining()
				});
				var hash = itemMatcher.getCharAt(itemMatcher.lastMatch.start);
				lastNode.split(hash, itemMatcher.lastMatch.length);
				lastNode.children[hash].insertChild(childNode);
				break;
			case 'endOfPattern': 
				// when we reached the end of a path in the tree, but we have remaining string to insert
				// in this case, targetNode points to nowhere => insert to lastNode!
				var node = new Node({
					label: itemMatcher.remaining()
				});
				lastNode.insertChild(node);
				break;
			case 'endOfStream': 
				// when we ran out of the given string in the middle of an edge
				// split the edge then insert there!
				var hash = itemMatcher.getCharAt(itemMatcher.lastMatch.start);
				lastNode.split(hash, itemMatcher.lastMatch.length);
				lastNode.children[hash].increaseFrequency();
				break;
			case undefined:
				// when nothing matches from the root, insert under root
				var childNode = new Node({label: itemString});
				this.root.insertChild(childNode);
				break;
		}
	});
};

PatriciaTree.prototype.frequency = function(itemString) {
	if(!itemString)
		return 0;

	return progressFrom.call(this, this.root, itemString, function(itemMatcher, targetNode) {
		switch(itemMatcher.lastMatch.type) {
			case 'fullMatch':    return targetNode.isTerminal ? targetNode.frequency : 0;
			case 'mismatch':     return 0;
			case 'endOfPattern': return 0;
			case 'endOfStream':  return 0;
			case undefined:      return 0;
		}
	});
};

PatriciaTree.prototype.contains = function(itemString) {
	return this.frequency(itemString) !== 0;
};

var _getCompletions = function (fromNode, remainingPart) {
	var getNextLeaf = new LeafIterator(fromNode, function getChildren (node) {
		return node.children;
	});
	var leaf;
	var completions = [];
	while(leaf = getNextLeaf()) {
		var completionString = remainingPart;
		for (var i = 1; i < leaf.path.length; i++) {
			completionString += leaf.path[i].label;
		};
		completions.push(completionString);
	}
	return completions;
};

PatriciaTree.prototype.getCompletions = function(prefix) {
	return progressFrom.call(this, this.root, prefix, function(itemMatcher, targetNode, lastNode) {
		switch(itemMatcher.lastMatch.type) {
			case 'fullMatch':
				return targetNode.isTerminal ? [''] : _getCompletions(targetNode, '');
			case 'endOfStream':
				var matchedPart = targetNode.label.substring(0, itemMatcher.lastMatch.length);
				var remainingPart = targetNode.label.substring(itemMatcher.lastMatch.length);
				var fromNode = lastNode.routeByHash(matchedPart);
				return _getCompletions(fromNode, remainingPart);
			case 'mismatch':     return []; // -> in a mismatch case, we can't make an autocomplete
			case 'endOfPattern': return []; // -> in this case the tree doesn't contain the prefix
			case undefined:      return [];
		}
	});
};

PatriciaTree.prototype.complete = function(prefix) {
	return this.getCompletions(prefix).map(function(completion) {
		return prefix + completion;
	});
};

module.exports = PatriciaTree;
},{"./leafIterator":3,"./stringMatcher":5}],5:[function(require,module,exports){
function StringMatcher(inputString) {
	this.inputString = inputString;
	this.nextCharIndex = 0;
	this.lastMatch = {start: -1, length: -1};
	return this;
}

StringMatcher.prototype.read = function () {
	return this.inputString[this.nextCharIndex++];
};

StringMatcher.prototype.peek = function () {
	return this.inputString[this.nextCharIndex];
};

StringMatcher.prototype.end = function () {
	return this.nextCharIndex >= this.inputString.length;
};

StringMatcher.prototype.remaining = function () {
	return this.inputString.substring(this.nextCharIndex);
};

StringMatcher.prototype.getCharAt = function (index) {
	return this.inputString[index];
};

StringMatcher.prototype.thenMatch = function (patternString) {
	this.lastMatch.start = this.nextCharIndex;
	this.lastMatch.length = 0;

	var pattern = new StringMatcher(patternString);

	while(!this.end() && !pattern.end() && this.peek() === pattern.peek()) {
		this.lastMatch.length++;
		this.read();
		pattern.read();
	}

	if(pattern.end() && this.end()) {
		this.lastMatch.type = 'fullMatch';
	}
	if(pattern.end() && !this.end()) {
		this.lastMatch.type = 'endOfPattern';
	}
	if(!pattern.end() && this.end()) {
		this.lastMatch.type = 'endOfStream';
	}
	if(!pattern.end() && !this.end()) {
		this.lastMatch.type = 'mismatch';
	}
	return this;
};

module.exports = StringMatcher;
},{}]},{},[1])