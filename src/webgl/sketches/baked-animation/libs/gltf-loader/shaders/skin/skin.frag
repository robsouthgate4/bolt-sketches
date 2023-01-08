#version 300 es

precision highp float;

uniform sampler2D mapAlbedo;
//uniform sampler2D jointTexture;
uniform mat4 jointTransforms[128];

in vec3 Normal;
in vec2 Uv;

out vec4 FragColor;
void main() {

   vec3 color = texture(mapAlbedo, Uv).rgb;

   FragColor = vec4( Normal, 1.0);

}