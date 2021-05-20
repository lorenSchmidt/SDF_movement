// globals
var canvas, gl
var camera_position, camera_heading


// a temp float value, for testing. 
// this is hooked up to a uniform (also "tuning_a") so you can attach it to thing you're tuning and alter it on the fly, then record desirable values and replace it with a constant
var tuning_a = 21.25;
var tuning_b = 10.511718755;
var tuning_variable = 0; // which one are we editing?

// for testing
var test_point

window.onload = initialize

function initialize(time) {
	test_point = [Vector3(), Vector3(0, 0, 5)]

	initialize_input()
	initialize_player()
	initialize_world()
	initialize_webGL()
	initialize_test_input()
	requestAnimationFrame(loop)
}

function loop(time) {
	update(time)
	render(time)
	requestAnimationFrame(loop)
}

var prev_time = 0
function update(time) {
	elapsed = time - prev_time; 
	// elapsed = Math.min(elapsed, 4/60) // cap in case of large deltas when tabbed away, debugging, etc.
	prev_time = time

	// update input, player
	// interaction,
	// contact response etc.
	player.update(elapsed)
	// player.update(1/60)
}


function render(time) {
	resizeCanvasToDisplaySize(gl.canvas)
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
	
	gl.useProgram(program)

	// set uniforms after useProgram()
	gl.uniform2f(resolution_uniform, gl.canvas.width, gl.canvas.height)
	gl.uniform2f(resolution_fragment_uniform, gl.canvas.width, gl.canvas.height)
	gl.uniform3f( camera_position_uniform, player.x, player.y, 
				  player.z + 0.01 * Math.sin(0.0005 * time))
				  // player.z + eye_level - 0.5 * player_radius + 0.01 * Math.sin(0.0005 * time))
    gl.uniform2f(camera_heading_uniform, player.heading.x, player.heading.y)	
    gl.uniform1f(time_uniform, time)	
    gl.uniform1f(tuning_a_uniform, tuning_a)	
    gl.uniform1f(tuning_b_uniform, tuning_b)	
    gl.uniform1f(tuning_b_uniform, tuning_b)	

    // test points
    var float_array = [ test_point[0].x, test_point[0].y, test_point[0].z, 
    					test_point[1].x, test_point[1].y, test_point[1].z ];
    gl.uniform3fv(test_point_uniform, float_array)

	// similar to the earlier binary data read
	offset = 0
	let count = position.length
	gl.drawArrays( gl.TRIANGLES, 
		 		   offset, count )
}


function initialize_world() {
	camera_position = { x: 0, y: 0, z: 0 }
	camera_heading = { x: 0, y: 0 }
}


// global render variables
var vs_compiled, fs_compiled, program
var resolution_uniform, camera_position_uniform, camera_heading_uniform, time_uniform, tuning_a_uniform, tuning_b_uniform
var position

// for testing
var test_point_uniform

function initialize_webGL() {
	canvas = document.getElementById("canvas")
	if (canvas == undefined) {
		console.log("error: no canvas found")
		return
	}

	gl = canvas.getContext("webgl2");
	if (!gl) {
		console.log("error: webGL 2 not supported")
		return
	}

	// shaders can be any string: from an external file, from a template literal with whitespace, from a script tag in the html, generated at runtime, etc.
	// compile the vertex and fragment shaders
	vs_compiled = create_shader(gl, gl.VERTEX_SHADER, vs_string)
	fs_compiled = create_shader(gl, gl.FRAGMENT_SHADER, fs_string)

	// these are connected into a program
	program = create_program(gl, vs_compiled, fs_compiled)

	

	// now we have a usable GLSL program! we need to supply it with some data.
	position_attribute = gl.getAttribLocation(program, "a_position")
	resolution_uniform = gl.getUniformLocation(program, "u_resolution")
	resolution_fragment_uniform = gl.getUniformLocation(program, "uf_resolution");
	camera_position_uniform = gl.getUniformLocation(program, "camera_position")
	camera_heading_uniform = gl.getUniformLocation(program, "camera_heading")
	time_uniform = gl.getUniformLocation(program, "u_time")
	tuning_a_uniform = gl.getUniformLocation(program, "tuning_a")
	tuning_b_uniform = gl.getUniformLocation(program, "tuning_b")

	test_point_uniform = gl.getUniformLocation(program, "test_point")


	let position_buffer = gl.createBuffer();          // set up a bind point
	gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer);  // for our attribute
	
	// this is a collection of our attribute state which we can interface with
	let vao = gl.createVertexArray()
	gl.bindVertexArray(vao) // make this the current vertex array
	// i suppose if we were rendering a set of entities, passes etc. we could swap between those at runtime this way?
	gl.enableVertexAttribArray(position_attribute);
	// enabling an attribute tells webGL we're getting data out of the buffer.
	// apparently if it's not enabled, we can still read, but it's constant. 

	// this is raw binary data, so we need to specify how we're reading
	let size = 2
	let type = gl.FLOAT
	let normalize = false
	let stride = 0
	let offset = 0
	gl.vertexAttribPointer( position_attribute,
							size, type, normalize, stride, offset )

	// now we can use the bind point to put data into the buffer
	position = [ -1, -1,		// converts a js array to typed, then puts
				  1, -1,		// it into the gl context's 
				 -1,  1,
				  1, -1,
				  1,  1,
				 -1,  1 ]
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(position), gl.STATIC_DRAW)
}


function shut_down_webGL() {
	// do we have to do anything to tidily shut down the context, dispose of shaders etc.? or is it all automatic?
}


// compiles a string into a GLSL shader vertex or fragment shader 
// type examples: gl.VERTEX_SHADER, gl.FRAGMENT_SHADER
function create_shader(gl, type, string) {
	let shader = gl.createShader(type)
	gl.shaderSource(shader, string)
	gl.compileShader(shader)
	let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
	
	if (success) {
		return shader
	}

	if (!success) { // log errors
		console.log(gl.getShaderInfoLog(shader))
		gl.deleteShader(shader) // clean up
	}
}


// combines a compiled vertex shader and fragment shader into a program which can be run by the API
function create_program(gl, vertex_shader, fragment_shader) {
	let program = gl.createProgram()
	gl.attachShader(program, vertex_shader)
	gl.attachShader(program, fragment_shader)
	gl.linkProgram(program)
	let success = gl.getProgramParameter(program, gl.LINK_STATUS)

	if (success)
		return program;

	if (!success) { // log errors
		console.log(gl.getProgramInfoLog(program))
		gl.deleteProgram(program) // clean up
	}
}


 /**
   * Resize a canvas to match the size its displayed.
   * @param {HTMLCanvasElement} canvas The canvas to resize.
   * @param {number} [multiplier] amount to multiply by.
   *    Pass in window.devicePixelRatio for native pixels.
   * @return {boolean} true if the canvas was resized.
   * @memberOf module:webgl-utils
   */
function resizeCanvasToDisplaySize(canvas, multiplier = 1) {
	// multiplier = multiplier || 1; // ?? why not default 1? pre-es6?
	const width  = canvas.clientWidth  * multiplier | 0
	const height = canvas.clientHeight * multiplier | 0
	if (canvas.width !== width ||  canvas.height !== height) {
		canvas.width  = width
		canvas.height = height
		return true
	}
	return false
}



function initialize_test_input() {
	canvas.addEventListener("wheel", (event) => {
		event.preventDefault()
		let rate = 0.01
		if (key_pressed[17]) // ctrl to slow
			rate *= 0.0625
		if (key_pressed[18]) // alt to slow also (stacks)
			rate *= 0.0625
		if (tuning_variable == 0) {
			tuning_a += event.deltaY * rate
			console.log("tuning a: " + tuning_a)
		}
		if (tuning_variable == 1) {
			tuning_b += event.deltaY * rate
			console.log("tuning b: " + tuning_b)
		}
	})
}



/*---------------------
input
---------------------*/

function initialize_input() {
	player = new Player(0, -20, 0)
	player.heading.x = -Math.PI / 2;
	// player.heading.y = 2 * Math.PI / 12;

	// for now, this input code goes here
	// i might do a dedicated input file later
 	key_pressed = Array(1000)
    window.addEventListener("keydown", (event) => {
    	hotkey_press(event);
        key_pressed[event.keyCode] = true;
    } )
    window.addEventListener("keyup", (event) => {
        key_pressed[event.keyCode] = false;
    } )
}


function hotkey_press(event) {
	if (event.key == "r"){
		shut_down_webGL();
		initialize_webGL();	
	}

	if (event.key == "Tab") {
		tuning_variable = (tuning_variable + 1) % 2;
		let string = (tuning_variable == 0) ? "a" : "b";
		string = "now tuning " + string + " (" + ((tuning_variable == 0) ? a : b) + ")";
		console.log(string);
	}

	if (event.key == "p") {
		let d = f(Vector3(player.x, player.y, player.z + 0.5 * player_height))
		if (d < player_radius)
			console.log("contact: " + d)
		else
			console.log("current SDF value is " + d)
	}

	if (event.code == "Space")
		player.velocity.z = 0.5
}