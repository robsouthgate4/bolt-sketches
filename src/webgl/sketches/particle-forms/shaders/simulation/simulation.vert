#version 300 es

precision highp float;

layout(location = 0) in vec3 oldPosition;
layout(location = 1) in vec3 oldVelocity;
layout(location = 2) in float oldLifeTime;

layout(location = 3) in vec3 initPosition;
layout(location = 4) in float initLife;
layout(location = 5) in vec3 random;
layout(location = 6) in float groupID;
layout(location = 7) in float particleID;

out vec3 newPosition;
out vec3 newVelocity;
out float newLifeTime;

uniform float time;
uniform float delta;
uniform vec2 resolution;
uniform vec3 repellorPosition;
uniform float repellorScale;
uniform float repellorStrength;
uniform float particleLifeRate;
uniform float particleSpeed;
uniform float curlStrength;
// uniform sampler2D mapNormalVolume;
uniform sampler2D mapDistanceVolume;



#define PI 3.1415

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x * 34.0) + 1.0) * x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  //   x0 = x0 - 0.0 + 0.0 * C.xxx;
  //   x1 = x0 - i1  + 1.0 * C.xxx;
  //   x2 = x0 - i2  + 2.0 * C.xxx;
  //   x3 = x0 - 1.0 + 3.0 * C.xxx;
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

// Permutations
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));

// Gradients: 7x7 points over a square, mapped onto an octahedron.
// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);    // mod(j,N)

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

vec3 snoiseVec3(vec3 x) {

  float s = snoise(vec3(x));
  float s1 = snoise(vec3(x.y - 19.1, x.z + 33.4, x.x + 47.2));
  float s2 = snoise(vec3(x.z + 74.2, x.x - 124.5, x.y + 99.4));
  vec3 c = vec3(s, s1, s2);
  return c;

}

vec3 curlNoise(vec3 p) {

  const float e = .1;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);

  vec3 p_x0 = snoiseVec3(p - dx);
  vec3 p_x1 = snoiseVec3(p + dx);
  vec3 p_y0 = snoiseVec3(p - dy);
  vec3 p_y1 = snoiseVec3(p + dy);
  vec3 p_z0 = snoiseVec3(p - dz);
  vec3 p_z1 = snoiseVec3(p + dz);

  float x = p_y1.z - p_y0.z - p_z1.y + p_z0.y;
  float y = p_z1.x - p_z0.x - p_x1.z + p_x0.z;
  float z = p_x1.y - p_x0.y - p_y1.x + p_y0.x;

  const float divisor = 1.0 / (2.0 * e);
  return normalize(vec3(x, y, z) * divisor);

}

vec2 computeSliceOffset(float slice, float slicesPerRow, vec2 sliceSize) {
  return sliceSize * vec2(mod(slice, slicesPerRow), floor(slice / slicesPerRow));
}

vec4 sampleAs3DTexture(sampler2D tex, vec3 texCoord, float size, float numRows, float slicesPerRow) {
  float slice = texCoord.z * size;
  float sliceZ = floor(slice);                         // slice we need
  float zOffset = fract(slice);                         // dist between slices

  vec2 sliceSize = vec2(1.0 / slicesPerRow,             // u space of 1 slice
  1.0 / numRows);                 // v space of 1 slice

  vec2 slice0Offset = computeSliceOffset(sliceZ, slicesPerRow, sliceSize);
  vec2 slice1Offset = computeSliceOffset(sliceZ + 1.0, slicesPerRow, sliceSize);

  vec2 slicePixelSize = sliceSize / size;               // space of 1 pixel
  vec2 sliceInnerSize = slicePixelSize * (size - 1.0);  // space of size pixels

  vec2 uv = slicePixelSize * 0.5 + texCoord.xy * sliceInnerSize;
  vec4 slice0Color = texture(tex, slice0Offset + uv);
  vec4 slice1Color = texture(tex, slice1Offset + uv);
  return mix(slice0Color, slice1Color, zOffset);
  return slice0Color;
}

mat4 rotation3d(vec3 axis, float angle) {

  axis = normalize(axis);

  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;

  return mat4(
    oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
    oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
    oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
    0.0,                                0.0,                                0.0,                                1.0
  );

}

float sdSphere( vec3 p, float s )
{
  return length(p)-s;
}

float map( vec3 pos ) {

  return sdSphere(pos, 10.0);

}

float sdTorus( vec3 p, vec2 t )
{
  vec2 q = vec2(length(p.xz)-t.x,p.y);
  return length(q)-t.y;
}

vec3 calcNormalSDF(vec3 p, float eps) {

	return normalize(vec3(
		map(p + vec3(eps, 0, 0)) - map(p + vec3(-eps, 0, 0)),
		map(p + vec3(0, eps, 0)) - map(p + vec3(0, -eps, 0)),
		map(p + vec3(0, 0, eps)) - map(p + vec3(0, 0, -eps))
	));

}

vec3 sampleWithOffset(sampler2D map, vec3 pos, vec3 offset) {

  return sampleAs3DTexture(map, pos, 256., 10., 10.).rgb * 2.0 - 1.0;

}

vec3 calcNormalTexture( vec3 p, float eps, sampler2D map ) {

  return normalize(vec3(
    sampleWithOffset(map, p, vec3(eps, 0, 0)).r - sampleWithOffset(map, p, vec3(-eps, 0, 0)).r,
    sampleWithOffset(map, p, vec3(0, eps, 0)).r - sampleWithOffset(map, p, vec3(0, -eps, 0)).r,
    sampleWithOffset(map, p, vec3(0, 0, eps)).r - sampleWithOffset(map, p, vec3(0, 0, -eps)).r
	));

}


void main() {

  vec3 pos = oldPosition;
  vec3 vel = oldVelocity;

  // vec3 boxMin = vec3( -0.49923, -0.407849, -0.448861 );
  // vec3 boxMax = vec3( 0.499752, 0.407821, 0.449532 );

  // vec3 expand = boxMax - boxMin;

  // pos *= expand;
  // pos += vec3( boxMin );

  //pos -= 0.5;

  // float closest = 10000.;

  // // set initial points to be far away to avoid initial glitches
  //vec3 closestPoint = vec3( 1000.0 );

  vec3 wind = vec3(0.0, 0.0, 0.001);



  vec3 c = curlNoise( pos * 5. + ( time * 1. ) ) * 0.0001;

  vel += c;

  //vec4 sdfNormal = sampleAs3DTexture( mapNormalVolume, pos + vec3( 0.5 ), 128., 8., 8. ) * 2.0 - 1.0;
  vec4 sdfDistance = sampleAs3DTexture( mapDistanceVolume, pos + vec3( 0.5 ), 128., 8., 16. ) * 2.0 - 1.0;

  float dist = sdfDistance.a;
  vec3 norm = sdfDistance.rgb;


  vec3 force = vec3( 0.0 );

  float forceIn = 3.;
  float forceOut = 5.;

  if(dist < 0.0) {

    force -= norm * forceIn * dist; // pull from outside


  } else {

    force -= norm * forceOut * dist; // pull from outside

  }

  vel += c;

  vel += force * (1./ 60.);

  vel *= 0.95;


  pos += vel;


  float life = oldLifeTime;

  life -= particleLifeRate;

  if(life < 0.0) {

    pos = initPosition;
    life = initLife;

  }

  newPosition = pos;
  newVelocity = vel;
  newLifeTime = life;

}