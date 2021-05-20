var vs_string = `#version 300 es
// simple vertex shader

in vec4 a_position; // will receive data from a buffer CPU-side

uniform vec2 u_resolution;

// vertex shaders, like fragment shaders, have a main
void main() {
	gl_Position = a_position;
}
`


var fs_string = `#version 300 es
precision mediump float;

struct marker {
    vec3 position;
    vec3 facing;
};

out vec4 fragColor;


uniform float u_time;
uniform vec2 uf_resolution;
uniform vec2 camera_heading;
uniform vec3 camera_position;
uniform float tuning_a;
uniform float tuning_b;


// for testing
uniform vec3 test_point[2];

#define PI 3.141592653589793
#define TWO_PI 6.283185307179586
#define e 2.718281828459045
#define SQRT2 1.4142135
#define PHI 0.6180339887498949

#define MAX_STEPS 64
#define EPS 0.001953125
#define FOG_RATE 0.004296875
#define LIGHT_FALLOFF 0.00048828125
#define SHADOW_HARDNESS 1.0742187550000004

// from https://www.iquilezles.org
// --------------------------------------
// oldschool rand() from Visual Studio
// --------------------------------------
int   seed = 1;
void  srand(int s ) { seed = s; }
int   rand(void) { seed=seed*0x343fd+0x269ec3; return (seed>>16)&32767; }
float frand(void) { return float(rand())/32767.0; }
// --------------------------------------
// hash to initialize the random seed (copied from Hugo Elias)
// --------------------------------------
int hash( int n ) { n=(n<<13)^n; return n*(n*n*15731+789221)+1376312589; }

vec3 spherical() {
    float z = frand() * 2.0 - 1.0;
    float angle = TWO_PI * frand();
    return vec3( sqrt(1.0 - z*z) * cos(angle), 
                 sqrt(1.0 - z*z) * sin(angle),
                 z );
}


float opSmoothUnion( float d1, float d2, float k )
{
    float h = max(k-abs(d1-d2),0.0);
    return min(d1, d2) - h*h*0.25/k;
}


float opSmoothSubtraction( float d1, float d2, float k )
{
    float h = max(k-abs(-d1-d2),0.0);
    return max(-d1, d2) + h*h*0.25/k;
    //float h = clamp( 0.5 - 0.5*(d2+d1)/k, 0.0, 1.0 );
    //return mix( d2, -d1, h ) + k*h*(1.0-h);
}


// polynomial smooth min (k = 0.1);
float smin( float a, float b, float k )
{
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix( b, a, h ) - k*h*(1.0-h);
}


// rotational modulus
// p is input point, a is period of modulus (can be noninteger)
// c is axis to rotate around (only xy are used because it's an axis)
vec3 rmod(in vec3 p, in float a, in vec2 c, float angle_offset) {
    vec2 offset = p.xy - c;
    float current_angle = atan(offset.y, offset.x); // current angle
    float m = length(offset);
    float adjusted_angle = mod(current_angle + angle_offset, a) - angle_offset;
    return vec3( c.x + m * cos(adjusted_angle),
                 c.y + m * sin(adjusted_angle),
                 p.z );
}


// rotates around z axis by r radians
vec2 rotz(in vec2 v, in float a) {
    float s = sin(a);
    float c = cos(a);
    mat2 m = mat2(c, -s, s, c);
    return m * v;
}

// from https://www.iquilezles.org/www/articles/distfunctions/distfunctions.htm
float box(in vec3 p, in vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}


// from https://iquilezles.org/www/articles/distfunctions/distfunctions.htm
float sdCapsule( vec3 p, vec3 a, vec3 b, float r )
{
  vec3 pa = p - a, ba = b - a;
  float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
  return length( pa - ba*h ) - r;
}


float sphere(vec3 p, float r) {
    return length(p) - r;
}


// Dan Harpole underground cistern in Port Townsend, Washington
float f(in vec3 p) {
    // ---------------------
    // geometry
    // ---------------------
    float d = 999999.0;
    d = min(d, p.z - 0.0); // ground plane

    // box
    d = min(d, box(p - vec3(0, 0, 1), vec3(1, 1, 1)));

    // short box
    d = min(d, box(p - vec3(3, 0, 0.5), vec3(1, 1, 0.5)));

    // ceiling test box
    d = min(d, box(p - vec3(6, 0, 1.5), vec3(1, 1, 0.5)));

    // arch
    float a = box(p - vec3(-4, -5, 1), vec3(2, 2, 1));
    float c = distance(vec2(-5, 2), p.yz) - 2.0;
    c = max(c, -(-2.0 - p.x));
    c = max(c, (-6.0 - p.x));
    a = min(a, c);
    a = max(a, -(distance(vec2(-5, 2), p.yz) - 1.0));
    a = max(a, -box(p - vec3(-5, -5, 1), vec3(3.01, 1, 1)));
    a = max(a, -box(p - vec3(-4, -5, 1), vec3(1, 3.01, 1)));
    d = min(d, a);

    // cylindrical hole test
    a = box(p - vec3(-3, -10, 2), vec3(1, 2, 2));
    a = max(a, -(distance(vec2(-10, 2), p.yz) - 1.0));
    d = min(d, a);

    // large ramp
    a = box(p - vec3(-3, -14, 2), vec3(4, 1, 2));
    float core = distance(vec2(-7, -20), p.xy);
    c = core - 7.0;
    c = max(c, -(core - 5.0));
    c = max(c, (p.x - -7.0));
    a = min(a, c); 
    a = max(a, p.z - 2.0);
    a = max(a, p.z - -0.375 * p.x);
    a = min(a, core - 3.0);
    a = max(a, p.z - 4.0);
    d = min(a, d);

    // floating box and sphere
    d = min(d, box(p - vec3(4, -7, 7), vec3(2, 2, 2)));
    d = min(d, sphere(p - vec3(4, -15, 7), 2.0));


    // test points
    d = min(d, sdCapsule(p, test_point[0], test_point[1], 1.0 / 16.0));
    // d = min(d, sphere(p - vec3(test_point[0]), 0.25));
    // d = min(d, sphere(p - vec3(test_point[1]), 0.25));

    return d;
}


// tetrahedral gradient lookup
vec3 get_normal( in vec3 p ) {  // sample along 3 axes to get a normal  
    const float o = 0.00390625;
    const vec2 h = vec2(o, -o); // transpose instead of making new per axis
    return normalize( h.xxx * f(p + h.xxx)
                    + h.yyx * f(p + h.yyx)
                    + h.xyy * f(p + h.xyy)
                    + h.yxy * f(p + h.yxy) );
}


float cast_ray(inout vec3 p, in vec3 h, out float depth) {
    float d;
    for (int a = 0; a < MAX_STEPS; a ++) {
        d = f(p);     // test distance
        p += d * h;   // step the point
        depth += d;
        if (d < EPS) {
            break;
        }
    }
    return d;
}


void sdf_tester() {
// void main() {
	vec2 p = 1.0 * (gl_FragCoord.xy - 0.5 * uf_resolution.xy) / uf_resolution.y; 
	vec3 pos = vec3(p.xy * 32.0, 2.0);// + u_time / 1000.0); 
   	float d = f(pos);
   	vec3 normal = get_normal(pos);

   	float b = 6.0 - d;
   	fragColor = vec4( b * (0.5 + 0.5 * normal.x), 
                      0.25 * b,// * (0.5 + 0.5 * normal.y), 
                      0.5 * b,// * (0.5 + 0.5 * normal.z),
                      1.0);
    fragColor *= 0.5 + 0.5 * sin(d * 4.0 * TWO_PI);
    if (d < 0.0) {
    	fragColor = vec4( -d * (0.5 + 0.5 * normal.x), 
	                      -0.25 * d * (0.5 + 0.5 * normal.y), 
	                      0.0,
	                      1.0);
    }
}


void main() {
// void raymarcher() {

    // convert to 1:1 coordinates. the first number controls grid scale.
    vec2 p = 1.0 * (gl_FragCoord.xy - 0.5 * uf_resolution.xy) / uf_resolution.y; 
    // now convert to a radially angle equal projection instead of planar
    
    // convert our camera plane values to a radially angle equal projection
    // (this will stretch out angular diameter in other directions)
    float PLANE_SCALE = 1.0;
    float CAMERA_DISTANCE = 11.0;
    float lp = length(p);
    float theta = 1.0 * PLANE_SCALE * lp; // theta is linearly related to length of p
    p = 1.0 * lp / sin(theta) * p / PLANE_SCALE;
  
    // camera plane
    float heading = camera_heading.x;
    float pitch   = camera_heading.y;
    vec3 h = vec3( cos(heading) * cos(pitch),  // this is unit length polar, 
                   sin(heading) * cos(pitch),  // but not camera oriented yet
                   sin(pitch));
    vec3 pos = vec3(camera_position); 
    vec3 ref = vec3(0.0, 0.0, 1.0);   // z axis
    h = -normalize(h);         // ray heading
    vec3 i = cross(h, ref);    // corresponds to x in screen space
    vec3 j = cross(i, h);      // corresponds to y in screen space
    
    h += i * p.x; h += j * p.y; // heading offsets, from screenspace pixel x, y
    h = normalize(h);


    // light
    vec3 light = vec3(  11.25 + 0.5 * sin(u_time * 0.00013671), 
                        6.5 * sin(u_time * 0.00013671), 
                        53.51 + 1.0 * sin(u_time * 0.0001));
    // normalize(light);
    

    // ---------------cast ray----------------
    float depth = 0.0; // this is an out and will be set in the cast
    float d = cast_ray(pos, h, depth); // this updates pos
    vec3 normal = get_normal(pos);

    // -----------ambient occlusion-----------
    // ambient occlusion
    float ao = 0.0;
    float AO_STEP = 2.0;
    for (float i = 1.0 / 32.0; i < 1.0; i *= 2.0) {
        float weight = 1.0; //1.0 / i; //1.0 - i;
        ao += weight * ( (AO_STEP * i + d) - f(pos + AO_STEP * i * normal) ); 
        // difference between linear falloff and current situation
    }
    ao = clamp(1.0 - 0.25 * ao, 0.0, 1.0);

    
    vec3 lvector = light - pos;
    float ld = length(lvector);
    lvector = normalize(lvector);
   
    // ----------------shadow----------------
    vec3 sp = vec3(pos);
    float shadow = 1.0;
    sp += 0.03 * normal; // nudge upward so we get outside EPS threshold
    float limit = min(32.0, ld);
    for (float t = 0.0; t < limit;) {
        float sd = f(sp + lvector * t); // step the point
        if (sd < 0.001) {
            shadow = 0.0;
            break;
        }
        // what we're doing here is storing the nearest we get to a solid en route
        shadow = min(shadow, SHADOW_HARDNESS * sd / t); // the division by t makes values near the ray origin very bright. this influence falls off asymptotically
        t += sd;
        // note: possibly negative sd values caused infinite recursion?
    }
    shadow = max(0.0, shadow);

    // ----------------light-----------------
    ld *= LIGHT_FALLOFF;
    // float value = dot(lvector, normal) / (1.0 + ld * ld);
    // this function is cheap but doesn't spike as hard as a real light at 0 distance. it has a plateau at 1 instead
    float value = max(0.0, dot(lvector, normal)) * pow(e, -ld);
    // this one is also asymptotic. it has spikes harder at 0 than the previous, but is well behaved (not an asymptote)

    // -----------------fog-----------------
    // base function is 1 / (depth + 1), the rest is offsets + tunability
    // starts at 0, rises, asymptotically approaches 1.0
    value = min(value, shadow);
    float fog = max(0.0, 2.0 - 2.0 / (FOG_RATE * depth + 1.0));

    // random seed, for noise (after the ray cast, which can have seeding in it)
    ivec2 q = ivec2(gl_FragCoord); 
    srand(hash(q.x + hash(q.y + hash(int(u_time * 1000.0)))));
    // value += 1.0 / 8.0 * (frand() - 0.5); 
    // the noise is part of the diffuse light, so it's dimmed by ambient occlusion

    // this compositing function decreases directional light as fog increases 
    value = 1.0 * fog + (1.0 - fog) * clamp(value * ao, 0.0, 1.0);
    // value = clamp(value * ao, 0.25, 0.5);

    float spacing = 1.0;
    vec3 trunc = floor(pos);
    value *= max(0.25, mod(trunc.x + trunc.y + trunc.z, 2.0));

    value *= 1.5;

    fragColor = vec4( value, value, value,
                      1.0 );    
    // fragColor = sqrt(fragColor);

    // fragColor = vec4( normal.x * 0.5 + 0.5, 
    //                   normal.y * 0.5 + 0.5, 
    //                   normal.z * 0.5 + 0.5, 
    //                   1.0);
}
`