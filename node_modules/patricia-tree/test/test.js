var PatriciaTree = require('../patricia');
var assert = require('assert').ok;

describe('PatriciaTree', function(){
	describe('Basic operations', function() {
		describe('#insert()', function() {
			it('should increase the number of elements', function () {
				var tree = new PatriciaTree();
				tree.insert('Newton');
				tree.insert('Pascal');
				tree.insert('Leibniz');
				assert(tree.count === 3);
			});

			it('should increase the frequency when inserting the same element multiple times', function () {
				var tree = new PatriciaTree();
				tree.insert('Newton');
				tree.insert('Newton');
				assert(tree.count === 2);
				assert(tree.frequency('Newton') === 2);
			});

			it('should *not* insert empty string', function() {
				var tree = new PatriciaTree();
				tree.insert('');
				assert(tree.count === 0);
			});
		});

		describe('#contains()', function(){
			it('should find the item when there is only one item', function() {
				var tree = new PatriciaTree();
				tree.insert('Newton');
				assert(tree.contains('Newton'));
			});

			it('should find all items when there are multiple', function() {
				var tree = new PatriciaTree();
				tree.insert('Newton');
				tree.insert('Pascal');
				assert(tree.contains('Newton'));
				assert(tree.contains('Pascal'));
			});

			it('should find all items when there are multiple overlapping', function() {
				var tree = new PatriciaTree();
				tree.insert('Newark');
				tree.insert('New Hampshire');
				tree.insert('New Hamp');
				tree.insert('Newcomb');
				tree.insert('Budapest');
				tree.insert('Bukarest');
				tree.insert('Bu');
				assert(tree.contains('Newark'));
				assert(tree.contains('New Hampshire'));
				assert(tree.contains('New Hamp'));
				assert(tree.contains('Newcomb'));
				assert(tree.contains('Budapest'));
				assert(tree.contains('Bukarest'));
				assert(tree.contains('Bu'));
			});

			it('should *not* find empty string', function() {
				var tree = new PatriciaTree();
				assert(!tree.contains(''));
			});

			it('should *not* find not existing items', function() {
				var tree = new PatriciaTree();
				tree.insert('New');
				tree.insert('Budapest');
				tree.insert('Bukarest');
				assert(!tree.contains('New Hampshire'));
				assert(!tree.contains('Ne'));
				assert(!tree.contains('New '));
				assert(!tree.contains('Bu'));
			});
		});

		describe('#frequency()', function() {
			it('should be 0 for not existing items', function () {
				var tree = new PatriciaTree();
				tree.insert('New');
				assert(!tree.contains('Budapest'));
				assert(!tree.contains('Neu'));
			});
		});
	});

	describe('Autocomplete', function() {
		var tree;

		beforeEach(function(){
			tree = new PatriciaTree();
			tree.insert('romane');
			tree.insert('romanus');
			tree.insert('romulus');
			tree.insert('rubens');
			tree.insert('ruber');
			tree.insert('rubicon');
			tree.insert('rubicundus');
		});

		describe('#getCompletions()', function() {
			it('should return the completions for a given prefix #1', function () {
				var completions = tree.getCompletions('rube');
				assert(completions.indexOf('ns') !== -1);
				assert(completions.indexOf('r')  !== -1);
				assert(completions.length === 2);
			});

			it('should return the completions for a given prefix #2', function () {
				var completions = tree.getCompletions('rubicun');
				assert(completions.indexOf('dus') !== -1);
				assert(completions.length === 1);
			});

			it('should return the completions for a given prefix #3', function () {
				// case 'mismatch'
				var completions = tree.getCompletions('rubicuk');
				assert(completions.length === 0);
			});

			it('should return the completions for a given prefix #4', function () {
				// case undefined: mismatch directly from root
				var completions = tree.getCompletions('mubicuk');
				assert(completions.length === 0);
			});

			it('should return an empty array for the uncompletable prefixes', function () {
				var completions = tree.getCompletions('rubel');
				assert(completions.length === 0);
			});

			it('should return an array with an empty string item for the exact matches', function () {
				var completions = tree.getCompletions('rubens');
				assert(completions.length === 1);
				assert(completions[0] === '');
			});
		});

		describe('#complete()', function() {
			it('should return the completed strings for the given prefix #1', function () {
				// case 'fullMatch'
				var completions = tree.complete('rube');
				assert(completions.indexOf('rubens') !== -1);
				assert(completions.indexOf('ruber')  !== -1);
				assert(completions.length === 2);
			});

			it('should return the completed strings for a given prefix #2', function () {
				// case 'endOfStream'
				var completions = tree.complete('rubicun');
				assert(completions.indexOf('rubicundus') !== -1);
				assert(completions.length === 1);
			});

			it('should return the completed strings for a given prefix #3', function () {
				// case 'mismatch'
				var completions = tree.complete('rubicuk');
				assert(completions.length === 0);
			});

			it('should return the completed strings for a given prefix #4', function () {
				// case undefined: mismatch directly from root
				var completions = tree.complete('mubicuk');
				assert(completions.length === 0);
			});

			it('should return an empty array for the uncompletable prefixes', function () {
				var completions = tree.complete('rubel');
				assert(completions.length === 0);
			});

			it('should return an array with the full string for the exact matches', function () {
				var completions = tree.complete('rubens');
				assert(completions.length === 1);
				assert(completions[0] === 'rubens');
			});
		});
	});
});
