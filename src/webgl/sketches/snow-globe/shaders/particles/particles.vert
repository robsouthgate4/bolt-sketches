#version 300 es

precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec3 aOffset;
layout(location = 3) in vec2 aUv;
layout(location = 4) in float aLifeTime;
layout(location = 5) in float aInitLifeTime;
layout(location = 6) in vec3 aVelocity;
layout(location = 7) in float aScale;
layout(location = 8) in vec3 aRandom;
layout(location = 9) in float aGroup;

out vec3 Normal;
out vec2 Uv;
out vec4 ShadowCoord;
out vec3 FragPosition;
out vec3 Eye;
out vec3 Random;
out float Fog;
out float Group;

uniform mat4 projection;
uniform mat4 model;
uniform mat4 view;
uniform mat4 lightSpaceMatrix;
uniform float particleScale;
uniform float time;


#define PI 3.14159265359

//  Function from Iñigo Quiles
//  www.iquilezles.org/www/articles/functions/functions.htm
float parabola( float x, float k ){
    return pow( 4.0*x*(1.0-x), k );
}

float fogFactorLinear(
    const float dist,
    const float start,
    const float end
) {
    return 1.0 - clamp((end - dist) / (end - start), 0.0, 1.0);
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

    vec3 pos = aOffset; //* particleScale;

    //if(pos.x > 0.0) pos *= 0.0;
    // if(pos.y > 0.0) pos *= 0.0;
    // if(pos.z > 0.0) pos *= 0.0;

    float lifeNormalised = aLifeTime / aInitLifeTime;

    //pos = mat3( rotation3d( vec3( 1.0, 0.0, 0.0 ), PI * 0.5) ) * pos;

    //pos *= parabola( lifeNormalised, 1.0 );

    mat4 lookAt        = mat4( calcLookAtMatrix( aVelocity, 0.0 ) );

    vec3 transformed  = pos;

    mat4 modelView = view * model;
    mat4 mvp = projection * modelView;

    vec4 mvPosition = modelView * vec4( transformed, 1.0 );

    //FragPosition = worldPosition.xyz;

    //ShadowCoord = lightSpaceMatrix * worldPosition;

    gl_Position = projection * view * model * vec4( transformed, 1.0 );

    float scale = 3.0;

    gl_PointSize = scale;

    gl_PointSize *= ( scale / - mvPosition.z );

    //gl_PointSize *= parabola( lifeNormalised, 1.0 );

    vec3 rotatedNormal = aNormal;
    rotatedNormal = mat3( rotation3d( vec3( 1.0, 0.0, 0.0 ), PI * 0.5) ) * rotatedNormal;

    Normal = ( model * ( lookAt * vec4( rotatedNormal, 0.0 ) ) ).xyz;

    Random = aRandom;

    Group = aGroup;

    Eye = normalize( mvp * vec4( transformed, 1.0 ) ).xyz;

}