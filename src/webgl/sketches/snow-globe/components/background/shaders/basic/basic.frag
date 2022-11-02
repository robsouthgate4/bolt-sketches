#version 300 es

precision highp float;

uniform sampler2D map;
in vec2 Uv;

out vec4 FragColor;


void main() {

    vec3 color = texture( map, Uv ).rgb;

	FragColor = vec4( color, 1.0 );

}