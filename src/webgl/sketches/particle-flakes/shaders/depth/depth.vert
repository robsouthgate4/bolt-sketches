#version 300 es

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec3 aOffset;
layout(location = 3) in vec2 aUv;
layout(location = 4) in float aLifeTime;
layout(location = 5) in float aInitLifeTime;
layout(location = 6) in vec3 aVelocity;

out vec3 Normal;
out vec2 Uv;

uniform mat4 projection;
uniform mat4 lightSpaceMatrix;
uniform mat4 model;
uniform float particleScale;

#define PI 3.14159265359

//  Function from Iñigo Quiles
//  www.iquilezles.org/www/articles/functions/functions.htm
float parabola( float x, float k ){
    return pow( 4.0*x*(1.0-x), k );
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

mat3 calcLookAtMatrix(vec3 vector, float roll) {

  vec3 rr = vec3(sin(roll), cos(roll), 0.0);

  vec3 ww = normalize(vector);
  vec3 uu = normalize(cross(ww, rr));
  vec3 vv = normalize(cross(uu, ww));

  return mat3(uu, ww, vv);

}


void main() {

    Normal = aNormal;

    Uv = aUv;

    vec3 pos = aPosition * particleScale;

    float lifeNormalised = aLifeTime / aInitLifeTime;

    pos = mat3( rotation3d( vec3( 1.0, 0.0, 0.0 ), PI * 0.5) ) * pos;

    pos *= parabola( lifeNormalised, 1.0 );

    mat4 lookAt = mat4( calcLookAtMatrix( aVelocity, 0.0 ) );

    vec3 rotatedPos = ( lookAt * vec4( pos, 1.0 ) ).xyz;

    vec3 transformed = rotatedPos + ( aOffset );

    gl_Position = lightSpaceMatrix * model * vec4( transformed, 1.0 );

}