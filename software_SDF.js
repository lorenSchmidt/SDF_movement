/*
------------------------------------------------------------
CPU sdf
------------------------------------------------------------
here is a js implementation of the signed distance field for this scene. i'm testing using this for contact response, interaction, etc.
*/


function Vector2(x = 0, y = 0) {
    return { x: x, y: y }
}

function distance2d(a, b) {
    return Math.sqrt((b.x - a.x)**2 + (b.y - a.y)**2);
}

// Dan Harpole underground cistern in Port Townsend, Washington
// p is a Vector3
function f(p) {
    // ---------------------
    // geometry
    // ---------------------
    let d = 999999.0;
    d = Math.min(d, p.z - 0.0); // ground plane

    // box
    d = Math.min(d, box(difference(Vector3(0, 0, 1), p), Vector3(1, 1, 1)));

    // short box
    d = Math.min(d, box(difference(Vector3(3, 0, 0.5), p), Vector3(1, 1, 0.5)));

    // ceiling test box
    d = Math.min(d, box(difference(Vector3(6, 0, 1.5), p), Vector3(1, 1, 0.5)));

    // arch
    let a = box(difference(Vector3(-4, -5, 1), p), Vector3(2, 2, 1));
    let c = distance2d(Vector2(-5, 2), Vector2(p.y, p.z)) - 2.0;
    c = Math.max(c, -(-2.0 - p.x));
    c = Math.max(c, (-6.0 - p.x));
    a = Math.min(a, c);
    a = Math.max(a, -(distance2d(Vector2(-5, 2), Vector2(p.y, p.z)) - 1.0));
    a = Math.max(a, -box(difference(Vector3(-5, -5, 1), p), Vector3(3.01, 1, 1)));
    a = Math.max(a, -box(difference(Vector3(-4, -5, 1), p), Vector3(1, 3.01, 1)));
    d = Math.min(d, a);

    // // cylindrical hole test
    a = box(difference(Vector3(-3, -10, 2), p), Vector3(1, 2, 2));
    a = Math.max(a, -(distance2d(Vector2(-10, 2), Vector2(p.y, p.z)) - 1.0));
    d = Math.min(d, a);

    // // large ramp
    a = box(difference(Vector3(-3, -14, 2), p), Vector3(4, 1, 2));
    let core = distance2d(Vector2(-7, -20), Vector2(p.x, p.y));
    c = core - 7.0;
    c = Math.max(c, -(core - 5.0));
    c = Math.max(c, (p.x - -7.0));
    a = Math.min(a, c); 
    a = Math.max(a, p.z - 2.0);
    a = Math.max(a, p.z - -0.375 * p.x);
    a = Math.min(a, core - 3.0);
    a = Math.max(a, p.z - 4.0);
    d = Math.min(a, d);    

    // floating box and sphere
    d = Math.min(d, box(difference(Vector3(4, -7, 7), p), Vector3(2, 2, 2)));
    d = Math.min(d, sphere(difference(Vector3(4, -15, 7), p), 2));

    return d;
}


// support

// tetrahedral gradient lookup
const o = 0.00390625
function get_normal(p) {  // sample along 3 axes to get a normal  
    let offset = [ Vector3( o, o, o ),	// offset vectors (relative)
    			   Vector3(-o,-o, o ),
    			   Vector3( o,-o,-o ),
    			   Vector3(-o, o,-o ) ]
    let output = Vector3()
 	for (let current of offset) {		
    	let lookup = sum(p, current)	// actual lookup points (absolute)
    	let d = f(lookup)
    	add(output, make_scaled(current, d)) // add all these together to get local slope (approximate)
    }
    return normalize(output);
}

// note: how does this differ from glsl mod in terms of dealing with negatives?
// this might cause issues
function mod(a, b) {
	return (a % b + b) % b
}


// from https://www.iquilezles.org/www/articles/distfunctions/distfunctions.htm
// ported to js by me
// p is current point. b is a vector3 containing size along x, y, z respectively
function box(p, b) {
    let q = Vector3( Math.abs(p.x) - b.x,
                     Math.abs(p.y) - b.y,
                     Math.abs(p.z) - b.z )
    let qmax = Vector3( Math.max(q.x, 0.0),
                        Math.max(q.y, 0.0),
                        Math.max(q.z, 0.0) )
    return length(qmax) + Math.min(Math.max(q.x, Math.max(q.y, q.z)), 0.0);
}



function sphere(p, r) {
    return length(p) - r;
}