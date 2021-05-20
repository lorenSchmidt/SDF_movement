/*
--------------------------------------------------------------------------------
3d vector
--------------------------------------------------------------------------------
*/

function Vector3(x = 0, y = 0, z = 0) {
	return { x: x, y: y, z: z }
}

// adds b to a. modifies a in place
function add(a, b) {
	a.x += b.x; a.y += b.y; a.z += b.z;
}

// same, but returns new instead of modifying
function sum(a, b) {
	return new Vector3( b.x + a.x,
						b.y + a.y,
						b.z + a.z);	
}

function sub(a, b) {
	a.x -= b.x; a.y -= b.y; a.z -= b.z;
}

// same, but returns new instead of modifying
function difference(a, b) {
	return new Vector3( b.x - a.x,
						b.y - a.y,
						b.z - a.z );
}

// scale (modifies in place)
function scale(a, scale) {
	a.x *= scale; a.y *= scale; a.z *= scale;
	return a; // so we can also use it for nested operators
}

// scale (makes new)
function make_scaled(b, scale) {
	return new Vector3( scale * b.x, 
						scale * b.y, 
						scale * b.z );
}

function length(v) {
	return Math.sqrt(v.x**2 + v.y**2 + v.z**2);
}

function distance(a, b) {
	return Math.sqrt((b.x - a.x)**2 + (b.y - a.y)**2 + (b.z - a.z)**2);
}

function distance_squared(a, b) {
	return (b.x - a.x)**2 + (b.y - a.y)**2 + (b.z - a.z)**2;
}

function normalize(v) {
	let length = Math.sqrt(v.x**2 + v.y**2 + v.z**2);
	if (length != 0) {
		v.x /= length;
		v.y /= length;
		v.z /= length;
	}
	return v;
}

/*------------------------------------------------------------------------------
dot and cross products
------------------------------------------------------------------------------*/

// cross product
function cross(a, b) {
	return new Vector3(
		a.y * b.z - a.z * b.y,
		-a.x * b.z + a.z * b.x,
		a.x * b.y - a.y * b.x);
		// a.x * b. y - a.y * b.x); for posterity: this was somehow running and mostly working with a space in "b.y"
}

// dot product
function dot(a, b) {
	return a.x * b.x + a.y * b.y + a.z * b.z;
}

/*------------------------------------------------------------------------------
copy and interpolate
------------------------------------------------------------------------------*/

function copy_vector(b) {
	return new Vector3(b.x, b.y, b.z);
}

// similar but sets x, y, z for vector a instead of making a new one
function set(a, b) {
	a.x = b.x; a.y = b.y; a.z = b.z
}

// outputs a new vector3 based on a weighted blend of two inputs
function blend_vector3(a, b, t) {
	return new Vector3( a.x * (1 - t) + b.x * t,
						a.y * (1 - t) + b.y * t,
						a.z * (1 - t) + b.z * t );
}

/*------------------------------------------------------------------------------
randomization functions
------------------------------------------------------------------------------*/

// a random unit length 3d vector
// this has uniform distribution without artifacts at poles, corners, etc.
// the math is the same as that used in area-equal map projections
function random_sphere_surface() {
	let z = random_float_in(-1, 1);
	let angle = random_float(TWO_PI);
	return new Vector3( Math.sqrt(1 - z**2) * Math.cos(angle), 
						Math.sqrt(1 - z**2) * Math.sin(angle),
						z );
}

// returns a point within the sphere
function random_sphere_volume() {
	let z = 2 * Math.random() -1
	let angle = TWO_PI * Math.random()
	let p = { x: Math.sqrt(1 - z**2) * Math.cos(angle), 
			  y: Math.sqrt(1 - z**2) * Math.sin(angle),
			  z: z }
	// this is in the surface, but evenly distributed
	let radius = Math.cbrt(Math.random())
	p.x *= radius; p.y *= radius; p.z *= radius
	// the cube root compensates for the compression
	return p
}

function random_sphere_guess_and_check() {
	let x, y, z
	let working = true;
	while (working) {
		x = 2 * Math.random() - 1
		y = 2 * Math.random() - 1
		z = 2 * Math.random() - 1
		if (x**2 + y**2 + z**2 < 1)
			working = false;
	}
	return { x: x, y: y, z: z };
}

// returns a point within a circle, with nonuniform distribution
function random_circle_area() {
	let angle = TWO_PI * Math.random()
	return { x: Math.cos(angle), y: Math.sin(angle) }
}

// similar, but uniform distribution
function random_circle_area_uniform() {
	let angle = TWO_PI * Math.random() // heading
	let radius = Math.random()
	radius = Math.sqrt(radius)
	// radius = Math.random() would be center weighted
	// what this does is compensate for the compression
	return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) }
}                                             

// reflect the ray off of a surface with this normal
function reflection(ray, normal) {             // flip normal component
	let parallel_magnitude = dot(ray, normal) //      |
	let reflected = copy_vector(ray)         //       |
	add(reflected, make_scaled(normal, -2 * parallel_magnitude));
	return reflected;
}
