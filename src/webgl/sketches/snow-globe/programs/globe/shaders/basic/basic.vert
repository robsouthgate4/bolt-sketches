#version 300 es

precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;

out vec3 Normal;
out vec3 VNormal;
out vec3 FragPosition;
out vec2 Uv;
out vec3 ViewVector;
out vec3 ViewVectorCenter;
out vec3 Eye;

uniform mat4 projection;
uniform mat4 model;
uniform mat4 view;
uniform mat4 normal;

uniform vec3 cameraPosition;

void main() {

  FragPosition = ( model * vec4( aPosition, 1.0 ) ).xyz;

  mat4 mvp = projection * view * model;

  Eye = normalize( mvp * vec4( aPosition, 1.0 ) ).xyz;

  gl_Position = projection * view * model * vec4(aPosition, 1.0);

  Normal = ( model * vec4( aNormal, 0.0 ) ).xyz;

  VNormal = normalize(normal * vec4(aNormal, 0.0)).xyz;

  ViewVector = normalize( FragPosition - cameraPosition );

  ViewVectorCenter = normalize( FragPosition - vec3( 0.0, 0.0, 5.0 ) );

  Uv = aUv;

}
