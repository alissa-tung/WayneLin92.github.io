// Global vars to cache event state
const pointerCache = new Array();
var prevPtsDist = null;
var prevPt = null;

function getDistPts() {
	let p1Screen = new Vector(pointerCache[0].offsetX, pointerCache[0].offsetY);
	let p2Screen = new Vector(pointerCache[1].offsetX, pointerCache[1].offsetY);
	return p1Screen.dist(p2Screen);
}

function on_pointerdown(event) {
	// This event is cached to support 2-finger gestures
	pointerCache.push(event);

	if (pointerCache.length == 1) {
		prevPt = new Vector(event.offsetX, event.offsetY);
	}
	else if (pointerCache.length == 2) {
		prevPtsDist = getDistPts();
	}
}

// This function implements a 2-pointer horizontal pinch/zoom gesture.
function on_pointermove(event) {
	// Check if this event is in the cache and update it
	let index = 0;
	for (; index < pointerCache.length; index++) {
		if (event.pointerId === pointerCache[index].pointerId) {
			pointerCache[index] = event;
			break;
		}
	}

	// Move only when the only one down pointer moves
	if (pointerCache.length == 1 && index < pointerCache.length) {
		let curPt = new Vector(event.offsetX, event.offsetY);
		let deltaScreen = curPt.sub(prevPt);
		camera.translate(new Vector(deltaScreen.x, -deltaScreen.y));
		prevPt = curPt;
	}

	// If two pointers are down, check for pinch gestures
	if (pointerCache.length == 2 && index < pointerCache.length) {
		let p1Svg = camera.flip(new Vector(pointerCache[0].offsetX, pointerCache[0].offsetY));
		let p2Svg = camera.flip(new Vector(pointerCache[1].offsetX, pointerCache[1].offsetY));
		let curDist = p1Svg.dist(p2Svg);
		camera.zoom(index === 0 ? p2Svg : p1Svg, curDist / prevPtsDist);
		prevPtsDist = curDist;
	}
}

/**
 * Return if at least one event is removed
 */
function removeEvent(event) {
	// Remove this event from the target's cache
	for (let i = 0; i < pointerCache.length; i++) {
		if (pointerCache[i].pointerId == event.pointerId) {
			pointerCache.splice(i, 1);
			return true;
		}
	}
	return false;
}

function on_pointerup(event) {
	// Remove this pointer from the cache
	if (removeEvent(event)) {
		if (pointerCache.length == 0) {
			prevPt = null;
		}
		else if (pointerCache.length == 1) {
			prevPt = new Vector(pointerCache[0].offsetX, pointerCache[0].offsetY);
		}
		else if (pointerCache.length == 2) {
			prevPtsDist = getDistPts();
		}
	}
}

function on_wheel(event) {
	if (event.deltaY < 0) {
		let pivotScreen = new Vector(event.offsetX, event.offsetY);
		let pivotSvg = camera.flip(pivotScreen);
		camera.zoom(pivotSvg, config.camera_zoom_rate);
		g_plot.setAttribute("transform", camera.getTransform());
	} else {
		let pivotScreen = new Vector(event.offsetX, event.offsetY);
		let pivotSvg = camera.flip(pivotScreen);
		camera.zoom(pivotSvg, 1 / config.camera_zoom_rate);
		g_plot.setAttribute("transform", camera.getTransform());
	}
	plotAxisLabels();
}

const circle_mouseon = document.getElementById("circle_mouseon");
const circle_selected = document.getElementById("circle_selected");
const circle_fixed_factor = document.getElementById("circle_fixed_factor");
const rect_selected = document.getElementById("rect_selected");
const rect_fixed_factor = document.getElementById("rect_fixed_factor");
function on_pointerenter_bullet(event) {
	let tgt = event.target;
	circle_mouseon.setAttribute("cx", tgt.getAttribute("cx"));
	circle_mouseon.setAttribute("cy", tgt.getAttribute("cy"));
	circle_mouseon.setAttribute("r", Number(tgt.getAttribute("r")) * 1.3);
	circle_mouseon.dataset.id = tgt.id;
}
function on_pointerleave_bullet(event) {
	let tgt = event.target;
	circle_mouseon.setAttribute("cx", "-1000");
}

function on_click_bullet(event) {
	let tgt = event.target;
	circle_selected.setAttribute("cx", tgt.getAttribute("cx"));
	circle_selected.setAttribute("cy", tgt.getAttribute("cy"));
	circle_selected.setAttribute("r", tgt.getAttribute("r"));
	circle_selected.innerHTML = tgt.innerHTML;
	circle_selected.dataset.id = tgt.id;

	rect_selected.setAttribute("x", Math.round(tgt.getAttribute("cx")) - 0.5);
	rect_selected.setAttribute("y", Math.round(tgt.getAttribute("cy")) - 0.5);
}

/************************************
 * Context menu events handlers 
 ************************************/
const div_menu_style = document.getElementById("div_menu").style;
const a_menu_bullet_style = document.getElementById("a_menu_bullet").style;

function showMenu(event) {
	if (event.target.getAttribute("class") == "b") {
		a_menu_bullet_style.display = "block";
	}
	else {
		a_menu_bullet_style.display = "none"
	}

	let posX = event.clientX;
	let posY = event.clientY;

	div_menu_style.left = posX + "px";
	div_menu_style.top = posY + "px";
	div_menu_style.visibility = "visible";
	div_menu_style.opacity = "1";

	event.preventDefault();
}

function hideMenu(event) {
	div_menu_style.visibility = "hidden";
	div_menu_style.opacity = "0";
}

function on_click_fixed_factor() {
	let tgt = document.getElementById(circle_mouseon.dataset.id);
	console.log("tgt =", tgt);
	circle_fixed_factor.setAttribute("cx", tgt.getAttribute("cx"));
	circle_fixed_factor.setAttribute("cy", tgt.getAttribute("cy"));
	circle_fixed_factor.setAttribute("r", Number(tgt.getAttribute("r")) * 1.5);
	
	rect_fixed_factor.setAttribute("x", Math.round(tgt.getAttribute("cx")) - 0.5);
	rect_fixed_factor.setAttribute("y", Math.round(tgt.getAttribute("cy")) - 0.5);
}

function initHandlers() {
	svg_ss.onwheel = on_wheel;
	svg_ss.onpointerdown = on_pointerdown;
	svg_ss.onpointermove = on_pointermove;
	svg_ss.onpointerup = on_pointerup;
	svg_ss.onpointerleave = on_pointerup;

	document.addEventListener("contextmenu", showMenu);
	document.addEventListener("click", hideMenu);
	let bullets = document.getElementsByClassName("b");
	for (const b of bullets) {
		b.onpointerenter = on_pointerenter_bullet;
		b.onpointerleave = on_pointerleave_bullet;
		b.onclick = on_click_bullet;
	}
}