/*jslint vars: true, white: true */
/*global jQuery, d3 */

var VISKOSITY = VISKOSITY || {};

VISKOSITY.Graph = (function($) {

"use strict";

var prop;

// `container` may be a DOM node, selector or jQuery object
// `data` is the initial data set, an object with arrays for nodes and edges
// `settings` is an optional set of key-value pairs
function Graph(container, data, settings) {
	settings = settings || {};

	// XXX: unnecessary jQuery dependency?
	container = container.jquery ? container : $(container);
	this.width = settings.width || container.width();
	this.height = settings.height || container.height();

	this.data = data;
	this.root = d3.select(container[0]).append("svg").
			attr("width", this.width).attr("height", this.height);
	this.graph = d3.layout.force().
			charge(this.charge).linkDistance(this.linkDistance). // TODO: (re)calculate dynamically to account for graph size
			size([this.width, this.height]);

	this.graph.nodes(this.data.nodes).links(this.data.edges);
	this.render();

	this.graph.on("tick", $.proxy(this.onTick, this));
}
Graph.prototype = {
	charge: -120,
	linkDistance: 30,
	colorize: (function(fn) { // TODO: rename
		return function(item) { return fn(item.group); };
	}(d3.scale.category20())) // XXX: bad default?
};
Graph.prototype.onTick = function() {
	this.root.selectAll("line.link").
			attr("x1", prop("source", "x")).
			attr("y1", prop("source", "y")).
			attr("x2", prop("target", "x")).
			attr("y2", prop("target", "y"));
	this.root.selectAll("circle.node").
			attr("cx", prop("x")).
			attr("cy", prop("y"));
};
Graph.prototype.render = function() { // TODO: rename?
	this.root.selectAll("line.link").
			data(this.data.edges).
			enter().
			append("line").attr("class", "edge link").style("stroke-width",
					function(item) { return Math.sqrt(item.value * 3); });

	var nodes = this.root.selectAll("circle.node").
			data(this.data.nodes).
			enter().
			append("circle").attr("class", "node").attr("r", 15).
					style("fill", this.colorize).
			call(this.graph.drag); // XXX: ?
	nodes.append("title").text(prop("name")); // XXX: when is this executed; why not chained above?

	this.graph.start();
};

// convenience wrapper
// returns a property getter for arbitrary objects
// if multiple arguments are supplied, the respective sub-property is returned
prop = function() { // TODO: memoize
	var args = arguments;
	return function(obj) {
		var res = obj;
		var i, prop;
		for(i = 0; i < args.length; i++) { // TODO: use `reduce`
			prop = args[i];
			res = res[prop];
		}
		return res;
	};
};

return Graph;

}(jQuery));


/*
XXX: DEBUG
*/

var data = {
	nodes: [
		{ name: "FND", group: 1 },
		{ name: "cdent", group: 2 },
		{ name: "imexil", group: 1 },
		{ name: "jdlrobson", group: 3 },
		{ name: "zac", group: 3 },
		{ name: "tillsc", group: 1 }
	],
	edges: [
		{ source: 0, target: 1, value: 4 },
		{ source: 0, target: 2, value: 2 },
		{ source: 0, target: 3, value: 1 },
		{ source: 0, target: 5, value: 2 },
		{ source: 1, target: 4, value: 3 }
	]
};

var graph = new VISKOSITY.Graph("#viz", data, { height: 500 });
