// created by Weinan Lin

var config = {
    x_max : 200,
    y_max : 100,
    axis_text_sep_screen : 30,
    bullets_tilt_angle : (window.hasOwnProperty("bullets_tilt_angle_deg") ? bullets_tilt_angle_deg : 30) / 180 * Math.PI,
    bullets_radius_world : 3.0 / 60,
    bullets_sep_world : 9.0 / 60, /* distance between the centers */
    bullets_group_length_world : 1.1,
    camera_unit_screen : 60,
    camera_unit_screen_min : 2,
    camera_unit_screen_max : 200,
    camera_zoom_rate : 1.3,
    color_grid_line : "#909090",
    color_arrow : "#a0a0a0",
    color_normal : "#000000",
    margin_bottom : 100,
    margin_left : 40,
    rainbow_step : 5 / 23,
};

/*******************************
 * Bullets: x, y, label, color
 * Lines: bullet_index1, bullet_index2,  
*******************************/
var spec = {
    bullets : data_bullets,
    lines : data_lines,
    arrows : data_arrows,
    cache_deg_bullets : new Map(),
    cache_bullets_wp : [],
    load_cache : function() {
        for (let i = 0; i < this.bullets.length; ++i) {
            let deg = this.bullets[i][0] + this.bullets[i][1] * 10000;
            if (this.cache_deg_bullets.has(deg)) {
                this.cache_deg_bullets.get(deg).push(i);
            }
            else {
                this.cache_deg_bullets.set(deg, [i]);
            }
        }
        for (const [deg, bullets] of this.cache_deg_bullets.entries()) {
            deg_x = deg % 10000;
            deg_y = Math.floor(deg / 10000);
            let length_world = (bullets.length - 1) * config.bullets_sep_world;
            if (length_world > config.bullets_group_length_world) {
                length_world = config.bullets_group_length_world;
            }
            let sep_world = bullets.length === 1 ? 0 : length_world / (bullets.length - 1);
            let top_left_x = deg_x - length_world / 2 * Math.cos(config.bullets_tilt_angle);
            let top_left_y = deg_y + length_world / 2 * Math.sin(config.bullets_tilt_angle);
            for (let i = 0; i < bullets.length; ++i) {
                this.cache_bullets_wp[bullets[i]] = new Vector(
                    top_left_x + i * sep_world * Math.cos(config.bullets_tilt_angle),
                    top_left_y - i * sep_world * Math.sin(config.bullets_tilt_angle));
            }
        }
    }
};

/* Generate colors */
/* 0<= h, s, v <= 1 */
function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}
function getMyColor(i, s, v) {
    let hue = (config.rainbow_step * i) % 1
    return HSVtoRGB(hue, s, v);
}

/* 2d Vector */
class Vector {
    constructor(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }
    add(v) {
        return new Vector(this.x + v.x, this.y + v.y);
    }
    sub(v) {
        return new Vector(this.x - v.x, this.y - v.y);
    }
    mul(r) {
        return new Vector(this.x * r, this.y * r);
    }
    dist(v) {
        return Math.sqrt((this.x - v.x) * (this.x - v.x) + (this.y - v.y) * (this.y - v.y));
    }
    interpolate(v, t) {
        return new Vector(this.x * (1 - t) + v.x * t, this.y * (1 - t) + v.y * t);
    }
};

// The canvas is always as big as the window
var canvas = document.getElementById("canvas");
canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;
function windowResize()
{
	canvas.width  = window.innerWidth;
	canvas.height = window.innerHeight;
	pen.render();
}
window.addEventListener('resize', windowResize);

// Clip value `x` by [min_, max_].
function clip(x, min_, max_) {
    if (x < min_) { return min_; } else if (x > max_){ return max_; } else { return x; }
}

// camera is responsible for converting the coordinates
var camera = {
    origin_sp : new Vector(config.margin_left, canvas.height - config.margin_bottom),
    unit_screen : config.camera_unit_screen,
    flip : function(world_pos /* Vector */) {
        return new Vector(world_pos.x, -world_pos.y);
    },
    zoom : function(pivotSp /* Vector */, rate) {
        let unit_screen1 = clip(this.unit_screen * rate, config.camera_unit_screen_min, config.camera_unit_screen_max);
        let rate1 = unit_screen1 / this.unit_screen;
        this.unit_screen = unit_screen1;
        let origin_sp1 = pivotSp.add(this.origin_sp.sub(pivotSp).mul(rate1));
        let x_min = canvas.width / 2 - config.x_max * this.unit_screen;
        let x_max =  canvas.width / 2;
        let y_min = canvas.height / 2;
        let y_max =  canvas.height / 2 + config.y_max * this.unit_screen;
        let x1 = clip(origin_sp1.x, x_min, x_max);
        let y1 = clip(origin_sp1.y, y_min, y_max);
        this.origin_sp = new Vector(x1, y1);
    },
    translation : function(rel /* Vector */) {
        origin_sp1 = this.origin_sp.add(rel);
        x_min = canvas.width / 2 - config.x_max * this.unit_screen;
        x_max = canvas.width / 2;
        y_min = canvas.height / 2;
        y_max = canvas.height / 2 + config.y_max * this.unit_screen;
        x1 = clip(origin_sp1.x, x_min, x_max);
        y1 = clip(origin_sp1.y, y_min, y_max);
        this.origin_sp = new Vector(x1, y1);
    },
    wp2sp : function(world_pos /* Vector */){
        return this.origin_sp.add(this.flip(world_pos).mul(this.unit_screen));
    },
    sp2wp : function(screen_pos /* Vector */) {
        return this.flip(screen_pos.sub(this.origin_sp).mul(1 / this.unit_screen));
    },
    wp2sp_v2 : function(wpx, wpy){
        let world_pos = new Vector(wpx, wpy);
        return this.origin_sp.add(this.flip(world_pos).mul(this.unit_screen));
    },
    sp2wp_v2 : function(spx, spy) {
        let screen_pos = new Vector(spx, spy);
        return this.flip(screen_pos.sub(this.origin_sp).mul(1 / this.unit_screen));
    },
};

// This function draws an arrow on canvas which can be dashed and curved
function draw_arrow(context, x1, y1, x2, y2, arrow_type, curve)
{
    context.setLineDash([]);
	let angle = Math.atan2(y2 - y1, x2 - x1);
    let curve_len = 12;
	let norm = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    
    let xm = (x1 + x2) / 2;
    let ym = (y1 + y2) / 2;
    let x_quad = xm + curve * curve_len * Math.cos(angle - Math.PI / 2);
    let y_quad = ym + curve * curve_len * Math.sin(angle - Math.PI / 2);
	if (arrow_type === '->' || arrow_type === '-'){
		context.moveTo(x1, y1);
		context.quadraticCurveTo(x_quad, y_quad, x2, y2);
	}
	else if (arrow_type === '-->'){
        context.setLineDash([10, 10]);
		context.moveTo(x1, y1);
		context.quadraticCurveTo(x_quad, y_quad, x2, y2);
	}
	// arrow tip
	if (arrow_type != '-'){
		let len_head = 0.15 * camera.unit_screen;   // length of head in pixels
		let angle = 0;
        if (arrow_type === '->' || arrow_type === '-->'){
            angle = Math.atan2(y2-y_quad,x2-x_quad);
        }
		context.moveTo(x2, y2);
		context.lineTo(x2 - len_head * Math.cos(angle - Math.PI / 6), y2 - len_head * Math.sin(angle - Math.PI / 6));
		context.moveTo(x2, y2);
		context.lineTo(x2 - len_head * Math.cos(angle + Math.PI / 6), y2 - len_head * Math.sin(angle + Math.PI / 6));
	}
}

// pen is responsible for drawing on the canvas
var pen = {
    renderGridLines : function() {
        let ctx = this.context;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.beginPath();
        ctx.strokeStyle = config.color_grid_line;
        ctx.setLineDash([]);
        for (let i = 0; i <= config.y_max; i += 1) {
            let left = new Vector(0, i);
            let right = new Vector(config.x_max, i);
            let left_sp = self.camera.wp2sp(left);
            let right_sp = self.camera.wp2sp(right);
            ctx.moveTo(left_sp.x, left_sp.y);
            ctx.lineTo(right_sp.x, right_sp.y);
        }
        for (let i = 0; i <= config.x_max; i += 1) {
            let bottom = new Vector(i, 0);
            let top = new Vector(i, config.y_max);
            let bottom_sp = self.camera.wp2sp(bottom);
            let top_sp = self.camera.wp2sp(top);
            ctx.moveTo(bottom_sp.x, bottom_sp.y);
            ctx.lineTo(top_sp.x, top_sp.y);
        }
        ctx.stroke();
    },
    renderGridNumbers : function() {
        let ctx = this.context;

        ctx.beginPath();
        ctx.fillStyle = config.color_normal;

        ctx.font = "15px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        let n_label_step = Math.ceil(config.axis_text_sep_screen / camera.unit_screen);
        for (let i = 0; i <= config.y_max; i += n_label_step) {
            let left = camera.wp2sp_v2(0, i);
            let text_pos = left.sub(new Vector(config.axis_text_sep_screen, 0));
            if (text_pos.x < 16) {
                text_pos.x = 16;
            }
            ctx.fillText(i, text_pos.x, text_pos.y);
        }
        for (let i = 0; i <= config.x_max; i += n_label_step) {
            let bottom = camera.wp2sp_v2(i, 0);
            let text_pos = bottom.add(new Vector(0, config.axis_text_sep_screen));
            if (text_pos.y > canvas.height - 16) {
                text_pos.y = canvas.height - 16
            }
            ctx.fillText(i, text_pos.x, text_pos.y);
        }
        ctx.stroke();
    },
    render : function() {
        this.renderGridLines();

        let ctx = this.context;

        /* Draw lines */
        ctx.beginPath();
        ctx.strokeStyle=config.color_normal;
        for (let i =0; i < spec.lines.length; ++i) {
            let sp1 = camera.wp2sp(spec.cache_bullets_wp[spec.lines[i][0]]);
            let sp2 = camera.wp2sp(spec.cache_bullets_wp[spec.lines[i][1]]);
            draw_arrow(ctx, sp1.x, sp1.y, sp2.x, sp2.y, "-", 0);
        }
        ctx.stroke();

        /* Draw arrows */
        for (let i =0; i < spec.arrows.length; ++i) {
            ctx.beginPath();
            let wp1 = spec.cache_bullets_wp[spec.arrows[i][0]];
            let wp2 = spec.cache_bullets_wp[spec.arrows[i][1]];
            let radius = clip(config.bullets_radius_world * camera.unit_screen, 2, 5);
            let t = 1 - radius / wp1.dist(wp2) / camera.unit_screen;
            let wp3 = wp1.interpolate(wp2, t);
            let sp1 = camera.wp2sp(wp1);
            let sp3 = camera.wp2sp(wp3);
            ctx.strokeStyle=getMyColor(wp1.y - wp2.y, 0.3, 0.7);
            draw_arrow(ctx, sp1.x, sp1.y, sp3.x, sp3.y, "->", 0);
            ctx.stroke();
        }

        /* Draw bullets */
        for (let i = 0; i < spec.bullets.length; ++i) {
            ctx.beginPath();
            ctx.strokeStyle = getMyColor(spec.bullets[i][3], 1.0, 0.65);
            ctx.fillStyle = ctx.strokeStyle;
            let sp = camera.wp2sp(spec.cache_bullets_wp[i]);
            let radius = clip(config.bullets_radius_world * camera.unit_screen, 2, 5);
            ctx.arc(sp.x, sp.y, radius, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.stroke();
        }

        this.renderGridNumbers();
    },
    status : "start",
    mouseSp : null,
};

// Clip Screen position of the mouse
function getMouseSp(event)
{
    return new Vector(event.pageX - canvas.offsetLeft, event.pageY - canvas.offsetTop);
}

function getMouseWp(event)
{
    return camera.wp2sp(getMouseSp(event));
}

/* return the world pos of the closest grid point */
function closestGridPt(x, y)
{
    let sp = new Vector(x, y);
    let wp = camera.sp2wp(sp);
    wp.x = Math.round(wp.x);
    wp.y = Math.round(wp.y);
    return wp;
}

function onMouseDown(event)
{
    if (pen.status === "start") {
        pen.status = "on_canvas";
        pen.mouseSp = getMouseSp(event);
    }
}

function onMouseMove(event)
{
    if (pen.status === "on_canvas" || pen.status === "on_canvas_moving") {
        pen.status = "on_canvas_moving";
        let mouseSp = getMouseSp(event);
        let delta = mouseSp.sub(pen.mouseSp);
        pen.mouseSp = mouseSp;
        // console.log(event);
        camera.translation(delta);
        pen.render();
    }
}

function onMouseUp(event)
{
	if (pen.status === "on_canvas") {
        pen.status = "start";
    }
    else if (pen.status === "on_canvas_moving") {
        pen.status = "start";
        pen.render();
    }
}

function onMouseWheel(event)
{
	if(event.deltaY < 0) {
        mousePos = getMouseSp(event);
        camera.zoom(mousePos, config.camera_zoom_rate);
    }
	else {
        mousePos = getMouseSp(event);
        camera.zoom(mousePos, 1 / config.camera_zoom_rate);
    }
    pen.render();
}

/* init */
function startDiagram()
{
    /* initializing the main object */
    spec.load_cache();
    pen.context = canvas.getContext("2d");
    pen.render();

    /* Add event handlers */
    let html = document.documentElement;
    // canvas.setAttribute('onmousedown', "onMouseDown(event);");
    // canvas.setAttribute('onmousemove', "onMouseMove(event);");
    // canvas.setAttribute('onmouseup', "onMouseUp(event);");
    canvas.setAttribute('onwheel', "onMouseWheel(event);");

    init1();
}


