#version 300 es

precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;

out vec3 Normal;
out vec3 FragPosition;
out vec2 Uv;
out vec3 ViewVector;

uniform mat4 projection;
uniform mat4 model;
uniform mat4 view;

uniform vec3 cameraPosition;

void main() {

  vec3 worldPos = ( model * vec4(aPosition, 1.0) ).xyz;

  gl_Position = projection * view * model * vec4(aPosition, 1.0);

  Normal = aNormal;

  ViewVector = worldPos - cameraPosition;

  Uv = aUv;

}
