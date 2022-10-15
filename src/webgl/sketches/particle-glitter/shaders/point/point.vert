#version 300 es

precision highp float;

layout(location = 0) in vec3 aPosition;
out vec3 Normal;

uniform mat4 projection;
uniform mat4 model;
uniform mat4 view;

void main() {

  gl_Position = projection * view * model * vec4(aPosition, 1.0);

  gl_PointSize = 10.0;
}