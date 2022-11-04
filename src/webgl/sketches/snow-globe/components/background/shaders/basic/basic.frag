#version 300 es

precision highp float;

layout(location = 0) out vec4 defaultColor;
layout(location = 1) out vec4 scene;
layout(location = 2) out vec4 normal;

uniform sampler2D map;
in vec2 Uv;

//out vec4 FragColor;


void main() {

    vec3 color = vec3( 0.8 );

	scene = vec4( color, 1.0 );
	normal = vec4( 0.0 );
	defaultColor = scene;

}