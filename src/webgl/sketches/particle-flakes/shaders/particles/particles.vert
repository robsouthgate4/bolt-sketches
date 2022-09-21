#version 300 es

precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec3 aOffset;
layout(location = 3) in vec2 aUv;

out vec3 Normal;
out vec2 Uv;
out vec4 ShadowCoord;
out vec3 FragPosition;

uniform mat4 projection;
uniform mat4 model;
uniform mat4 view;
uniform mat4 lightSpaceMatrix;


void main() {

    Normal = aNormal;

    Uv = aUv;

    vec3 pos = aPosition;

    vec3 transformed = pos + ( aOffset );

    vec4 worldPosition = model * vec4( transformed, 1.0 );

    FragPosition = worldPosition.xyz;

    ShadowCoord = lightSpaceMatrix * worldPosition;

    gl_Position = projection * view * worldPosition;
}