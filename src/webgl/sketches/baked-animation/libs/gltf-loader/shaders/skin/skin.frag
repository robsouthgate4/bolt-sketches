#version 300 es

precision highp float;

uniform sampler2D jointTexture;
// uniform sampler2D mapAlbedo;
// uniform sampler2D mapMetallicRoughness;
// uniform sampler2D mapNormal;
uniform vec4 baseColorFactor;

in vec3 Normal;
in vec2 Uv;

out vec4 FragColor;
void main() {

   vec3 color = baseColorFactor.rgb;

   FragColor = vec4( texture( jointTexture, Uv ).rgb, 1.0 );

}