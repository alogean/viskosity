/*jslint vars: true, white: true */
/*global jQuery, d3, VISKOSITY */

VISKOSITY.graph = (function($) {

"use strict";

var prop       = VISKOSITY.getProp,
	setContext = VISKOSITY.setContext,
	collide;

var PRESENTER = {}; // TODO: move elsewhere

PRESENTER.nodeShape = function(node) {
	var shapes = {}; // TODO: move elsewhere
	var shape = shapes[node.type] || "circle";
	var size = (node.degree || 1) * 10 + 100;
	node.size = Math.sqrt(size); // shape size is in px²
	return d3.svg.symbol().type(shape).size(size)();
};

PRESENTER.nodeColor = (function(fn) {
	return function(node) {
		var index = {
			"unknown": 0,
			"collection": 2
		}[node.type] || 1;
		return fn(index);
	};
}(d3.scale.category20()));

PRESENTER.edgePath = {
	"default": drawLine,
	broader: drawLine,
	narrower: drawLine
};

PRESENTER.edgeStrength = function(edge) {
	var strengths = { // TODO: move elsewhere
		"default": 0,
		broader: 2,
		narrower: 1
	};
	var strength = strengths[edge.type];
	if(strength === undefined) {
		throw "unknown edge type: " + edge.type;
	}
	return Math.sqrt(strength * 3);
};

var graph = {
	charge: -500,
	linkDistance: 100,
	linkStrength: 0.5,
	identity: prop("id")
};

// `container` may be a DOM node, selector or jQuery object
// `data` is the initial data set, an object with arrays for `nodes` and `edges`
// `settings` is an optional set of key-value pairs for width and height
// each node is an object with an `id` property and optional properties `name`,
// `type` and `degree`
// each edge is an object with `source` and `target` properties, referencing
// node objects, and an optional property `value`
graph.init = function(container, data, settings) {
	settings = settings || {};

	this.store = Object.create(VISKOSITY.graphStore);
	this.store.init(data.nodes, data.edges);

	container = container.jquery ? container : $(container);
	container.addClass("viz");
	this.width = settings.width || container.width();
	this.height = settings.height || container.height();

	this.root = d3.select(container[0]).append("svg").
			attr("width", this.width).attr("height", this.height);
	this.graph = d3.layout.force(). // TODO: (re)calculate settings dynamically to account for graph size
			charge(this.charge).
			linkDistance(this.linkDistance).
			linkStrength(this.linkStrength).
			size([this.width, this.height]);

	// NB: intentionally retaining object identity for nodes and links/edges
	this.graph.nodes(this.store.nodes).links(this.store.edges);

	this.graph.on("tick", $.proxy(this, "onTick"));
};

graph.onTick = function(ev) {
	// collision detection
	var nodes = this.graph.nodes();
	var q = d3.geom.quadtree(nodes);
	var i = 0;
	var l = nodes.length;
	while(++i < l) {
		q.visit(collide(nodes[i]));
	}

	this.root.selectAll("path.link").attr("d", function(edge) {
		var src = edge.source,
			tgt = edge.target,
			fn = PRESENTER.edgePath[edge.type];
		return fn(src, tgt);
	});

	this.root.selectAll("g.node").attr("transform", function(node) {
		return "translate(" + node.x + "," + node.y + ")";
	});
};

graph.render = function() { // TODO: rename?
	var edges = this.root.selectAll("line.link").
			data(this.graph.links());
	edges.exit().remove(); // TODO: animate
	edges.enter().
			append("path"). // TODO: customizable appearance
				attr("class", "edge link").
				style("stroke-width", PRESENTER.edgeStrength);

	var nodes = this.root.selectAll("g.node").
			data(this.graph.nodes(), this.identity);
	nodes.exit().remove(); // TODO: animate
	var newNodes = nodes.enter().
			append("g").attr("class", "node").
			call(this.graph.drag); // XXX: unnecessary!?
	newNodes.append("path").
			attr("d", PRESENTER.nodeShape).
			style("fill", PRESENTER.nodeColor);
	newNodes.append("a").attr("xlink:href", prop("url")).
			append("text").text(prop("name"));
	nodes.select("text").text(prop("name")); // update existing nodes
	if(this.onClick) {
		newNodes.on("click", setContext(this.onClick, { graph: this }));
	}

	this.graph.start();

	this.root.selectAll("g.node").classed("extensible", function(node) { // XXX: obsolete? undocumented!
		return node.weight < node.degree;
	});
};

// adapted from http://mbostock.github.com/d3/talk/20110921/collision.html
collide = function(node) {
	var s = node.size + 16, // TODO: use `getBBox` for actual dimensions
		nx1 = node.x - s,
		nx2 = node.x + s,
		ny1 = node.y - s,
		ny2 = node.y + s;
	return function(quad, x1, y1, x2, y2) {
		if(quad.point && (quad.point !== node)) {
			var x = node.x - quad.point.x,
				y = node.y - quad.point.y,
				l = Math.sqrt(x * x + y * y),
				s = node.size + quad.point.size;
			if(l < s) {
				l = (l - s) / l * 0.5;
				node.x -= x *= l;
				node.y -= y *= l;
				quad.point.x += x;
				quad.point.y += y;
			}
		}
		return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
	};
};

function drawLine(src, tgt) {
	return "M" + src.x + "," + src.y + "L" + tgt.x + "," + tgt.y;
}

function drawArc(src, tgt) {
	var dx = tgt.x - src.x,
		dy = tgt.y - src.y,
		dr = Math.sqrt(dx * dx + dy * dy);
	return "M" + src.x + "," + src.y + "A" + dr + "," + dr +
			" 0 0,1 " + tgt.x + "," + tgt.y;
}

return graph;

}(jQuery));
