#version 300 es

precision highp float;


uniform float time;
uniform float delta;
uniform vec3 offset;
uniform vec3 vortexAxis;
uniform float turbulence;
uniform vec3 gravity;
uniform vec3 force;
uniform vec2 resolution;

uniform sampler2D position;
uniform sampler2D velocity;

#pragma glslify: snoise3 = require(../../../../partials/snoise3)

vec3 curlNoise(vec3 p) {

  const float e = .1;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);

  vec3 p_x0 = snoise3(p - dx);
  vec3 p_x1 = snoise3(p + dx);
  vec3 p_y0 = snoise3(p - dy);
  vec3 p_y1 = snoise3(p + dy);
  vec3 p_z0 = snoise3(p - dz);
  vec3 p_z1 = snoise3(p + dz);

  float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
  float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
  float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;

  const float divisor = 1.0 / (2.0 * e);
  return normalize(vec3(x, y, z) * divisor);

}

float sdSphere( vec3 p, float s )
{
  return length(p)-s;
}

float map( vec3 pos ) {

  return sdSphere(pos, 10.0);

}

vec3 calcNormalSDF(vec3 p, float eps) {

	return normalize(vec3(
		map(p + vec3(eps, 0, 0)) - map(p + vec3(-eps, 0, 0)),
		map(p + vec3(0, eps, 0)) - map(p + vec3(0, -eps, 0)),
		map(p + vec3(0, 0, eps)) - map(p + vec3(0, 0, -eps))
	));

}

mat3 rotateAroundAxis(vec3 axis, float angle) {

  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;

  return mat3(
    oc * axis.x * axis.x + c,
    oc * axis.x * axis.y - axis.z * s,
    oc * axis.z * axis.x + axis.y * s,
    oc * axis.x * axis.y + axis.z * s,
    oc * axis.y * axis.y + c,
    oc * axis.y * axis.z - axis.x * s,
    oc * axis.z * axis.x - axis.y * s,
    oc * axis.y * axis.z + axis.x * s,
    oc * axis.z * axis.z + c
  );

}

out vec4 FragColor;

void main() {

  vec3 currentGravity = gravity;

  vec2 uv = gl_FragCoord.xy / resolution.xy;

  vec4 pos = texture(position, uv).xyzw; // xyz = position, w = mass
  vec3 vel = texture(velocity, uv).xyz;

  vec3 currentForce = force;

  float mass = pos.w * 3.0;

  vec3 c = curlNoise( pos.xyz * 6. + ( time * 1.0 ) ) * 0.005;
  vec3 cLarge = curlNoise( pos.xyz * 2. + ( time * 0.1 ) ) * 0.005;

  float sdfScale = 1.0;

  vec3 p = (pos.xyz - vec3( 0.0, 1.5, 0.0 )) / sdfScale;

  float sdfGlobe  = sdSphere( p, 1.0 );
  vec3 sdfNormal = calcNormalSDF( p, 0.001 );


  vec3 sdfForce = vec3( 0.0 );

  float sdfForceIn = 2.0;
  float sdfForceOut = 0.0001;

  if(sdfGlobe > -0.015) {

    sdfForce -= sdfNormal * sdfForceIn * sdfGlobe; // pull from outside

    sdfForce += c * 0.05 * turbulence;

  } else {

    sdfForce -= sdfNormal * sdfForceOut * sdfGlobe; // pull from outside

  }

  vel += (gravity / mass) * 0.015;

  vel += sdfForce * delta;

  vel += c * 0.05 * turbulence;

  vel += currentForce / mass;

  vel += cLarge * 0.02 * turbulence;

  vel *= 0.96;

  FragColor = vec4( vel, 1.0 );

}