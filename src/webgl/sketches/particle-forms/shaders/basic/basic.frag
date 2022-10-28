#version 300 es

precision highp float;

uniform sampler2D map;

in vec2 Uv;

out vec4 FragColor;

void main() {


	vec4 m = texture(map, Uv);

	FragColor = vec4( vec3( m.rgb ), 1.0 );

}