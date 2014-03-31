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