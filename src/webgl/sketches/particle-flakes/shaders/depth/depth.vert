#version 300 es

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec3 aOffset;
layout(location = 3) in vec2 aUv;

out vec3 Normal;
out vec2 Uv;

uniform mat4 projection;
uniform mat4 lightSpaceMatrix;
uniform mat4 model;

void main() {

    Normal = aNormal;

    Uv = aUv;

    vec3 pos = aPosition;

    gl_Position = lightSpaceMatrix * model * vec4( pos + ( aOffset ), 1.0 );

}