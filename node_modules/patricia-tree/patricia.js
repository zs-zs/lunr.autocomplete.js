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