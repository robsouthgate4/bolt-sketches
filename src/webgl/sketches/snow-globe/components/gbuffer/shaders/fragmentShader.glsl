#version 300 es

precision highp float;

in vec3 Normal;
in vec4 Position;
in vec3 NormalEyeSpace;
in vec2 Uv;
in vec3 WorldPosition;

layout(location = 0) out vec4 scene;
layout(location = 1) out vec4 normal;

uniform vec2 cameraPlanes;
uniform vec4 baseColor;

void main() {

    vec3 ambient = vec3(1.0); //baseColor.rgb;

    vec3 lightPosition = vec3(0.0, 10.0, 5.0);
    vec3 norm = normalize(Normal);
    vec3 lightDirection = normalize(lightPosition - WorldPosition);

    float diffuse = step(0.5, max(dot(Normal, lightDirection), 0.0));

    scene = vec4(mix(ambient, ambient * 1.1, diffuse), 1.0);
    normal = vec4(norm, 0.0);

}