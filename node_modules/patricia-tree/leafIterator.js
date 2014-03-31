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