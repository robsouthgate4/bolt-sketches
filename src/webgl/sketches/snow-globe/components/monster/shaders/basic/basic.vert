#version 300 es

precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;

out vec3 Normal;
out vec3 FragPosition;
out vec2 Uv;
out vec3 ViewVector;
out vec3 Pos;

uniform mat4 projection;
uniform mat4 model;
uniform mat4 view;

uniform vec3 cameraPosition;
uniform float depthPower;
uniform float depthOffset;
uniform sampler2D mapDepth;

void main() {

  vec3 pos = aPosition;

  float d = texture(mapDepth, aUv).r;

  d = pow( d, depthPower );

  pos.z += (d  * depthOffset);

  vec3 worldPos = ( model * vec4(pos, 1.0) ).xyz;

  gl_Position = projection * view * model * vec4(pos, 1.0);

  Normal = aNormal;

  Pos = pos;

  ViewVector = worldPos - cameraPosition;

  Uv = aUv;

}
