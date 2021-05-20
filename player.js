/*
------------------------------------------------------------
player
------------------------------------------------------------
this file contains player data + interaction code
*/
// globals
var player

class Player {
	constructor(x = 0.0, y = 0.0, z = 0.0) {
		Object.assign(this, {x, y, z})
		// this.position = { x: x, y: y, z: z }
		this.heading  = { x: 0, y: 0 }
		this.velocity = Vector3(0, 0, 0)
	}

	update(elapsed) { // to do: pass in delta
		// temp mapping
	    var move_rate = 0.0005 * elapsed;
		var key_mapping = [65, 83, 68, 87, 32, 16]
		var heading_key_mapping = [39, 40, 37, 38]
	    if (key_pressed[key_mapping[0]]) {
	        // this.heading.x += 0.01;
	        this.velocity.y -= move_rate * Math.cos(this.heading.x)
	        this.velocity.x += move_rate * Math.sin(this.heading.x)
	    }
	    if (key_pressed[key_mapping[2]]) {
	        // this.heading.x -= 0.01;
	        this.velocity.y += move_rate * Math.cos(this.heading.x)
	        this.velocity.x -= move_rate * Math.sin(this.heading.x)
	    }

	    if (key_pressed[key_mapping[3]]) {
	        this.velocity.x -= move_rate * Math.cos(this.heading.x)
	        this.velocity.y -= move_rate * Math.sin(this.heading.x)
	    }
	    if (key_pressed[key_mapping[1]]) {
	        this.velocity.x += move_rate * Math.cos(this.heading.x)
	        this.velocity.y += move_rate * Math.sin(this.heading.x)
	    }
	    if (key_pressed[key_mapping[4]]) {
	        this.velocity.z += move_rate;
	    }
	    if (key_pressed[key_mapping[5]]) {
	        this.velocity.z -= move_rate;
	    }

	    let proposed = sum(this, this.velocity)
	    // test for contact + do a simple rejection
	    let d = f(Vector3(proposed.x, proposed.y, proposed.z))
	    if (d < 0)
	    	debugger;
		if (d < player_radius) {
			this.resolve_overlap(d, proposed);
		}
		else
			set(this, proposed)

		this.velocity.z += -0.001 * elapsed; // gravity
		// friction
		add(this.velocity, make_scaled(this.velocity, -0.003 * elapsed));

		// probably always do the point straight down

	    // arrows for heading only control, with up and down
	    if (key_pressed[heading_key_mapping[0]]) {
	        this.heading.x -= 0.02;
	    }
	    if (key_pressed[heading_key_mapping[2]]) {
	        this.heading.x += 0.02;
	    }
	    if (key_pressed[heading_key_mapping[1]]) {
	        this.heading.y += 0.02;
	    }
	    if (key_pressed[heading_key_mapping[3]]) {
	        this.heading.y -= 0.02;
	    }
	}

	resolve_overlap(d, proposed) {
		// note that we will get the same normal facing for above / below the surface, but the distance itself will have a sign flip. 
		// we don't want to invert our offsets, look out for the sign of d
		// contact response goes here
		let normal = get_normal(proposed)
		// walk down the direction suggested
		// one step? or incremental, in case slope changes?
		let sample_point = sum(proposed, make_scaled(normal, -d))
		normal = get_normal(sample_point)

		// for testing, show the point in the shader
		test_point[0] = sample_point
		test_point[1] = sum(sample_point, make_scaled(normal, 0.5))

		// this isn't always unambiguous. there can be multiple approximately equidistant points on surfaces which are relevant here. just doing one contact point will not behave the same in some situations.
		let normal_magnitude = dot(this.velocity, normal)

		// if in contact and moving toward the surface
		if (normal_magnitude < 0) { 
			if (normal_magnitude < 0.01)
				normal_magnitude *= -1.0 // inelastic
			else
				normal_magnitude *= -1.25 // a bit of bounce
			let normal_component = make_scaled(normal, normal_magnitude)
			// then subtract it out, or apply repulsion along this vector
			add(this.velocity, normal_component)
	    	proposed = sum(this, this.velocity)
	    }

	    // extra step to nudge position out without affecting velocity
	    for (let a = 0; a < 4; a ++) {
		    d = f(proposed)
		    let overlap = player_radius - d
		    if (overlap > 0) {
		    	normal = get_normal(proposed)
		    	scale(normal, overlap)
		    	add(proposed, normal)
		    }
		}

	    // this seemed to be causing issues, but it's not actually a bad idea
		
		set(this, proposed)

		// if (magnitude > 0.05) // speed limit
			// scale(this.velocity, 0.05 / magnitude)


		// set(this, sum(this, this.velocity))

		// add(this, make_scaled(normal, (player_radius - d)));
	}


	resolve_overlap_repulsion(d, proposed) {
		// note that we will get the same normal facing for above / below the surface, but the distance itself will have a sign flip. 
		// we don't want to invert our offsets, so ignore d.
		// console.log("contact: " + d)
		// contact response goes here
		let normal = get_normal(proposed)
		// walk down the direction suggested
		// one step? or incremental, in case slope changes?
		let test_point = sum(proposed, make_scaled(normal, -d))
		normal = get_normal(test_point)
		// this isn't always unambiguous. there can be multiple approximately equidistant points on surfaces which are relevant here. just doing one contact point will not behave the same in some situations.
		let normal_magnitude = dot(this.velocity, normal)
		if (normal_magnitude < 0.01)
			normal_magnitude *= 1.0 // inelastic
		else
			normal_magnitude *= 1.25 // a bit of bounce
		let normal_component = make_scaled(normal, normal_magnitude)
		// then subtract it out, or apply repulsion along this vector
		// sub(this.velocity, normal_component)
    	
		// mushy simple approach
		add(this.velocity, make_scaled(normal, 0.04 * Math.abs(d)))
		let magnitude = length(this.velocity)
		scale(this.velocity, 0.9)
		// if (magnitude > 0.05) // speed limit
			// scale(this.velocity, 0.05 / magnitude)

    	// proposed = sum(this, this.velocity)

		// set(this, sum(this, this.velocity))

		// add(this, make_scaled(normal, (player_radius - d)));
	}
}


var player_height = 159.5 / 100
var player_radius = 0.5 * player_height
var eye_level = 144.78 / 100

function initialize_player() {
	player = new Player(0, -20, 1)
	player.heading.x = -Math.PI / 2;
	// player.heading.y = 2 * Math.PI / 12;
}